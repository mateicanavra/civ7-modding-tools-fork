# Section 1: Canonical Architecture

According to a document from the v7 divergence review (no date metadata is embedded in these drafts), the canonical convergence direction is: **the recipe builder owns compilation into plan-truth**, mod authors always author via **`createMap(...)` against a public schema** that defaults to the internal schema, and **public↔internal transforms live at the stage level**.

This section locks a single “how it works now and going forward” architecture by synthesizing the full lineage (v3→v5→v6→v7; alt1 + alt2; decision ledgers; reviews; repomix snapshot). It keeps the forward improvements (v7 stage-view + recipe-owned compilation + knobs model), reintroduces valuable older ideas (out-of-line strategy inference fix; dependency catalogs), and explicitly discards/defers items that are either contradictory to the north star or explicitly declared “not resolved yet”.

The design-goals synthesis is the controlling rationale for mod-author safety and contract-first structure: mod authors should not need to understand internal mechanics like strategy envelopes, and public schemas must be guard-railed accordingly.

---

## Canonical mental model

### Three planes (single-track, no “advanced mode”)

1. **Public config (mod authoring)**
   Authored only via `createMap({ recipe, config })`. It is strictly validated, defaults applied, and **must not leak internal constructs**. This is aligned with the “createMap-only” and “no public leakage” decisions.

2. **Internal config (composition plane)**
   Produced by (optional) **stage-level view transforms** from public config. Internal config is the shape that the **recipe compiler** consumes.

3. **Plan truth (execution plane)**
   Produced by the **recipe compiler** by mechanically compiling internal config into **plan-truth step configs** (resolved/defaulted/validated) and an **execution plan**.

This is intentionally “single-track”: mod authors have one contract (public schema); transforms are part of the same pipeline, not a parallel “advanced escape hatch” story. (This explicitly supersedes prior “advanced mode” exploration in alt2; see decision status below.)

### Contract-first chain (end-to-end)

**Domains → Ops → Strategies → Steps → Stages → Recipes → createMap**

* **Domains** declare *knobs* (tuning controls) and host ops.
* **Ops** are contract-first and strategy-capable; compilation produces plan-truth configs; runtime runs plan-truth configs.
* **Steps** compose ops mechanically (no repetitive forwarding boilerplate).
* **Stages** own public schema/views/transforms.
* **Recipe** owns compilation and returns plan truth.
* `createMap` is the sole mod entrypoint.

This architecture is explicitly intended to eliminate the current boilerplate pattern visible in the compiled codebase where step schemas and `resolveConfig` manually forward to multiple ops.

### Dependency/scheduling stance (explicitly deferred, adapter-friendly)

The current engine uses a **TagRegistry** with “is dependency tag satisfied?” checks and a pipeline executor that validates dependency satisfaction before/around step execution.

Per current direction, the dependency primitive + scheduling semantics + canonical ID home are **intentionally not resolved yet** (D/E/H), so this canonical architecture:

* **keeps step `requires/provides` in contracts** (stable and essential),
* standardizes on **dependency catalogs** (reintroduced from alt1 because it’s valuable regardless of primitive),
* and isolates the dependency primitive behind types that can later flip from string keys to typed `ResourceRef` without rewriting authoring contracts.

---

## Canonical file set (locked core)

Below are the canonical “framework” files. File names are canonical; paths are intentionally omitted per instruction.

### 1) `S.ts`

```ts
import { Type, type TProperties, type TObject, type TSchema } from "typebox";

/**
 * Strict schema helpers:
 * - additionalProperties: false by default
 * - default: {} for objects by default
 *
 * This matches the v7 push for strictness + defaults as a baseline authoring guarantee.
 */
export const S = {
  obj<P extends TProperties>(
    properties: P,
    options?: Omit<Parameters<typeof Type.Object>[1], "additionalProperties" | "default">
  ): TObject {
    return Type.Object(properties, {
      additionalProperties: false,
      default: {},
      ...(options ?? {}),
    });
  },

  // Primitives
  str: (options?: Parameters<typeof Type.String>[0]) => Type.String(options),
  num: (options?: Parameters<typeof Type.Number>[0]) => Type.Number(options),
  int: (options?: Parameters<typeof Type.Integer>[0]) => Type.Integer(options),
  bool: (options?: Parameters<typeof Type.Boolean>[0]) => Type.Boolean(options),
  lit: <T extends string | number | boolean>(value: T) => Type.Literal(value),

  // Combinators
  arr: <T extends TSchema>(items: T, options?: Parameters<typeof Type.Array>[1]) =>
    Type.Array(items, options),
  union: <T extends readonly TSchema[]>(items: T, options?: Parameters<typeof Type.Union>[1]) =>
    Type.Union(items as any, options),

  opt: <T extends TSchema>(schema: T, opts?: { default?: any }) =>
    Type.Optional(schema, opts?.default !== undefined ? { default: opts.default } : undefined),
} as const;
```

**Role:** Centralizes strict schema construction and default behavior to make “strict + defaulted” the norm. This is a direct response to recurring authoring/validation issues across proposals and is consistent with v7 alt2’s emphasis on strict schemas and defaults.

**Design goals satisfied:** type safety, authoring DX, simplicity (one helper).
**In tension with:** none materially.

---

### 2) `schema.ts`

```ts
import { type Static, type TSchema } from "typebox";
import { Value } from "typebox/value";

export function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Convert + clean + default + validate.
 * Intended for compile-time use (recipe compilation), not hot runtime paths.
 */
export function normalizeWithSchema<T extends TSchema>(schema: T, input: unknown): Static<T> {
  const converted = Value.Convert(schema, input);
  const cleaned = Value.Clean(schema, converted);
  const defaulted = Value.Default(schema, cleaned);

  if (!Value.Check(schema, defaulted)) {
    throw new Error(`Schema validation failed`);
  }
  return defaulted as Static<T>;
}
```

**Role:** Single canonical normalization pipeline used by stage views and recipe compilation.

**Design goals satisfied:** correctness, contract-first, mod-author safety (strict validation).
**In tension with:** none; performance acceptable because compile-time.

---

### 3) `dependency-keys.ts`

```ts
export type DependencyKind = "artifact" | "field" | "effect";
export type DependencyKey<K extends DependencyKind = DependencyKind, Id extends string = string> =
  `${K}:${Id}`;

export function defineDependencyCatalog<
  K extends DependencyKind,
  const T extends Record<string, string>,
>(kind: K, defs: T): { readonly [P in keyof T]: DependencyKey<K, T[P]> } {
  const out: Record<string, string> = {};
  for (const [name, id] of Object.entries(defs)) out[name] = `${kind}:${id}`;
  return out as any;
}

export function defineDeps<const C extends {
  artifact?: Record<string, string>;
  field?: Record<string, string>;
  effect?: Record<string, string>;
}>(catalog: C) {
  return {
    artifact: (catalog.artifact ? defineDependencyCatalog("artifact", catalog.artifact) : {}) as any,
    field: (catalog.field ? defineDependencyCatalog("field", catalog.field) : {}) as any,
    effect: (catalog.effect ? defineDependencyCatalog("effect", catalog.effect) : {}) as any,
  } as const;
}
```

**Role:** Reintroduces the alt1 “catalog” pattern for IDs (valuable, low-risk, independent of dependency primitive). It also matches the current engine’s tag-prefix naming style (artifact/field/effect), which will ease incremental migration.

**Design goals satisfied:** DX (discoverable keys), evolvability (decouples from stringly usage), contract-first.
**In tension with:** dependency primitive not yet chosen; this is intentionally “string-compatible now”.

---

### 4) `knobs.ts`

```ts
import { type Static, type TObject, type TSchema } from "typebox";
import { S } from "./S";
import { normalizeWithSchema } from "./schema";

/**
 * Knobs are tuning controls (global-ish), distinct from per-op config and runtime parameters.
 * This file supports stage-level knob derivation from domain schemas.
 */

export function mergeObjectSchemas(title: string, schemas: readonly TObject[]): TObject {
  const merged: Record<string, TSchema> = {};
  for (const schema of schemas) {
    const props: Record<string, TSchema> = (schema as any).properties ?? {};
    for (const [key, propSchema] of Object.entries(props)) {
      if (merged[key]) throw new Error(`Knob key collision while composing ${title}: '${key}'`);
      merged[key] = propSchema;
    }
  }
  return S.obj(merged as any, { title });
}

export function extractAndNormalizeKnobs<S extends TObject>(schema: S, stageConfig: unknown): Static<S> {
  const keys = Object.keys(((schema as any).properties ?? {}) as Record<string, unknown>);
  const obj = (typeof stageConfig === "object" && stageConfig !== null ? stageConfig : {}) as Record<
    string,
    unknown
  >;

  const picked: Record<string, unknown> = {};
  for (const k of keys) picked[k] = obj[k];

  return normalizeWithSchema(schema, picked);
}
```

**Role:** Implements the **knobs schema/model** that v7 alt2 converged on (domain/op-declared, composed upward) without baking a legacy “RunSettings” type into op typing. This is consistent with the clarified knobs direction (F/G).

**Design goals satisfied:** type safety, mod DX (knobs are explicit), evolvability.
**In tension with:** final knobs object shape (root vs stage) can evolve; the key is the schema composition model.

---

### 5) `domain.ts`

```ts
import { type TObject } from "typebox";
import { mergeObjectSchemas } from "./knobs";
import { type Op } from "./op";

export type Domain<
  Id extends string,
  Knobs extends TObject,
  Ops extends Record<string, Op<any>>,
> = Readonly<{
  id: Id;
  knobsSchema: Knobs;
  ops: Ops;
  __kind: "Domain";
}>;

function assertOpKnobsSubset(domainId: string, domainKnobsSchema: TObject, op: Op<any>) {
  const domainKeys = new Set(Object.keys(((domainKnobsSchema as any).properties ?? {}) as object));
  const opKeys = Object.keys(((op.contract.knobsSchema as any).properties ?? {}) as object);

  for (const k of opKeys) {
    if (!domainKeys.has(k)) {
      throw new Error(
        `Op '${op.contract.id}' declares knob '${k}' not present in domain '${domainId}' knobs schema.`
      );
    }
  }
}

export function defineDomain<
  const Id extends string,
  Knobs extends TObject,
  Ops extends Record<string, Op<any>>,
>(def: { id: Id; knobsSchema: Knobs; ops: Ops }): Domain<Id, Knobs, Ops> {
  for (const op of Object.values(def.ops)) {
    assertOpKnobsSubset(def.id, def.knobsSchema, op);
    (op as any).__domainId = def.id;
  }
  return { ...def, __kind: "Domain" } as const;
}

export function deriveStageKnobsSchema(stageTitle: string, domains: readonly Domain<any, any, any>[]) {
  return mergeObjectSchemas(`${stageTitle}.StageKnobs`, domains.map((d) => d.knobsSchema));
}
```

**Role:** Domain-level ownership of knobs and ops (a valuable alt1 principle: domains own tuning; engine does not).

**Design goals satisfied:** developer DX (clear ownership), mod safety (knobs are schema-driven), evolvability.
**In tension with:** none.

---

### 6) `op.ts`

```ts
import { Type, type Static, type TObject, type TSchema } from "typebox";
import { S } from "./S";
import { normalizeWithSchema, isObjectLike } from "./schema";

export type StrategyId = string;

export type StrategyContract<
  ConfigSchema extends TSchema,
  PlanSchema extends TSchema = ConfigSchema,
> = Readonly<{
  configSchema: ConfigSchema;
  planSchema?: PlanSchema; // defaults to configSchema when omitted
}>;

export type OpContract<
  Id extends string,
  InputSchema extends TSchema,
  OutputSchema extends TSchema,
  KnobsSchema extends TObject,
  Strategies extends Record<string, StrategyContract<any, any>>,
> = Readonly<{
  id: Id;
  inputSchema: InputSchema;
  outputSchema: OutputSchema;
  knobsSchema: KnobsSchema;
  strategies: Strategies; // must include "default"
  __kind: "OpContract";
}>;

export function defineOpContract<
  const Id extends string,
  InputSchema extends TSchema,
  OutputSchema extends TSchema,
  KnobsSchema extends TObject,
  Strategies extends Record<string, StrategyContract<any, any>> & { default: StrategyContract<any, any> },
>(def: {
  id: Id;
  inputSchema: InputSchema;
  outputSchema: OutputSchema;
  knobsSchema: KnobsSchema;
  strategies: Strategies;
}): OpContract<Id, InputSchema, OutputSchema, KnobsSchema, Strategies> {
  return { ...def, __kind: "OpContract" } as const;
}

export type OpStrategyIds<C extends OpContract<any, any, any, any, any>> = keyof C["strategies"] & string;

export type OpConfigOf<C extends OpContract<any, any, any, any, any>, K extends OpStrategyIds<C>> =
  Static<C["strategies"][K]["configSchema"]>;

export type OpPlanConfigOf<C extends OpContract<any, any, any, any, any>, K extends OpStrategyIds<C>> =
  C["strategies"][K]["planSchema"] extends TSchema
    ? Static<C["strategies"][K]["planSchema"]>
    : Static<C["strategies"][K]["configSchema"]>;

export type OpPlanEnvelopeOf<C extends OpContract<any, any, any, any, any>> = {
  [K in OpStrategyIds<C>]: Readonly<{ strategy: K; config: OpPlanConfigOf<C, K> }>;
}[OpStrategyIds<C>];

/** Internal compilation input: default config shorthand OR explicit envelope. */
export type OpCompileInputOf<C extends OpContract<any, any, any, any, any>> =
  | OpConfigOf<C, "default">
  | Readonly<{ strategy: OpStrategyIds<C>; config: unknown }>;

export type StrategyImpl<
  C extends OpContract<any, any, any, any, any>,
  K extends OpStrategyIds<C>,
> = Readonly<{
  id: K;
  resolveConfig?: (config: OpConfigOf<C, K>, knobs: Static<C["knobsSchema"]>) => OpPlanConfigOf<C, K>;
  run: (
    input: Static<C["inputSchema"]>,
    config: OpPlanConfigOf<C, K>
  ) => Static<C["outputSchema"]> | Promise<Static<C["outputSchema"]>>;
}>;

/**
 * Out-of-line strategy inference helper (reintroduced from earlier proposals).
 * This directly addresses the contextual typing/inference failure mode.
 */
export function createStrategy<
  C extends OpContract<any, any, any, any, any>,
  const K extends OpStrategyIds<C>,
>(contract: C, id: K, impl: Omit<StrategyImpl<C, K>, "id">): StrategyImpl<C, K> {
  return { id, ...impl } as const;
}

export type Op<C extends OpContract<any, any, any, any, any>> = Readonly<{
  contract: C;

  defaultConfig: OpConfigOf<C, "default">;

  /** Envelope schema used ONLY on the internal plane (pre-compile). */
  compileEnvelopeSchema: TSchema;

  /** Plan-truth envelope schema (post-compile). */
  planEnvelopeSchema: TSchema;

  compileConfig: (input: OpCompileInputOf<C>, knobs: Static<C["knobsSchema"]>) => OpPlanEnvelopeOf<C>;

  run: (
    input: Static<C["inputSchema"]>,
    plan: OpPlanEnvelopeOf<C>
  ) => Static<C["outputSchema"]> | Promise<Static<C["outputSchema"]>>;

  __kind: "Op";
  __domainId?: string;
}>;

function looksLikeEnvelope(value: unknown): value is { strategy: string; config: unknown } {
  return isObjectLike(value) && typeof value["strategy"] === "string" && "config" in value;
}

export function createOp<
  C extends OpContract<any, any, any, any, any>,
  Impl extends { [K in OpStrategyIds<C>]: StrategyImpl<C, K> },
>(contract: C, impl: Impl): Op<C> {
  const defaultConfig = normalizeWithSchema(contract.strategies.default.configSchema, {});

  const compileVariants = Object.entries(contract.strategies).map(([id, strat]) =>
    S.obj({ strategy: S.lit(id), config: strat.configSchema as any }, { title: `${contract.id}.${id}.CompileEnv` })
  );
  const planVariants = Object.entries(contract.strategies).map(([id, strat]) =>
    S.obj(
      { strategy: S.lit(id), config: (strat.planSchema ?? strat.configSchema) as any },
      { title: `${contract.id}.${id}.PlanEnv` }
    )
  );

  const compileEnvelopeSchema = Type.Union(compileVariants as any, { title: `${contract.id}.CompileEnvelope` });
  const planEnvelopeSchema = Type.Union(planVariants as any, { title: `${contract.id}.PlanEnvelope` });

  function compileConfig(input: OpCompileInputOf<C>, knobs: Static<C["knobsSchema"]>): OpPlanEnvelopeOf<C> {
    const env = looksLikeEnvelope(input)
      ? (input as { strategy: OpStrategyIds<C>; config: unknown })
      : ({ strategy: "default", config: input } as const);

    const strategyId = env.strategy as OpStrategyIds<C>;
    const stratContract = contract.strategies[strategyId] as StrategyContract<any, any>;
    const stratImpl = impl[strategyId] as StrategyImpl<C, any>;

    const configNorm = normalizeWithSchema(stratContract.configSchema, env.config) as any;
    const planConfig = stratImpl.resolveConfig ? stratImpl.resolveConfig(configNorm, knobs) : configNorm;

    if (stratContract.planSchema) {
      const validated = normalizeWithSchema(stratContract.planSchema as any, planConfig);
      return { strategy: strategyId, config: validated } as any;
    }

    return { strategy: strategyId, config: planConfig } as any;
  }

  async function run(input: Static<C["inputSchema"]>, plan: OpPlanEnvelopeOf<C>) {
    const strat = impl[plan.strategy as any] as StrategyImpl<C, any>;
    return strat.run(input, plan.config as any);
  }

  return {
    contract,
    defaultConfig,
    compileEnvelopeSchema,
    planEnvelopeSchema,
    compileConfig,
    run,
    __kind: "Op",
  } as const;
}
```

**Role:** Locks in contract-first ops + strategies with:

* explicit config vs plan-truth typing (`configSchema` vs `planSchema`),
* mechanical compilation via `compileConfig`,
* out-of-line strategy inference fixes from earlier baseline proposals.

This also reconciles the strategy-envelope tension: envelopes exist **internally** (compile plane and plan truth), while public authoring can still default to the “default config shorthand” unless a stage view intentionally exposes strategy selection.

**Design goals satisfied:** strong type safety, contract-first, DX.
**In tension with:** how much to expose strategy selection to modders (handled by stage views; not forced).

---

### 7) `step.ts`

```ts
import { type Static, type TObject, type TSchema } from "typebox";
import { S } from "./S";
import { normalizeWithSchema } from "./schema";
import { type DependencyKey } from "./dependency-keys";
import { type Op } from "./op";

export type StepPhase = string;

export type StepContext<TRuntime, TArtifacts> = Readonly<{
  runtime: TRuntime;
  artifacts: TArtifacts;
}>;

export type OpBinding = Readonly<{
  op: Op<any>;
  /**
   * Internal config input shape for this binding:
   * - "default": safe default-config-only shape
   * - "envelope": internal-only strategy envelope shape (still not public)
   */
  input?: "default" | "envelope";
}>;

export type StepContract<
  Id extends string,
  Phase extends StepPhase,
  InternalSchema extends TObject,
  PlanSchema extends TObject,
  Ops extends Record<string, OpBinding>,
> = Readonly<{
  id: Id;
  phase: Phase;
  requires: readonly DependencyKey[];
  provides: readonly DependencyKey[];

  /** Internal (pre-compile) schema. */
  internalSchema: InternalSchema;

  /** Plan-truth (post-compile) schema; what run() receives. */
  planSchema: PlanSchema;

  ops: Ops;
  __kind: "StepContract";
}>;

export type StepPlanConfigOf<C extends StepContract<any, any, any, any, any>> = Static<C["planSchema"]>;

export type StepModule<C extends StepContract<any, any, any, any, any>, TRuntime, TArtifacts> = Readonly<{
  contract: C;
  compileConfig: (internal: unknown, stageKnobs: Record<string, unknown>) => StepPlanConfigOf<C>;
  run: (ctx: StepContext<TRuntime, TArtifacts>, config: StepPlanConfigOf<C>) => void | Promise<void>;
}>;

export function defineStepContract<
  const Id extends string,
  const Phase extends StepPhase,
  Ops extends Record<string, Op<any> | OpBinding>,
  Extra extends Record<string, TSchema> = {},
>(def: {
  id: Id;
  phase: Phase;
  requires?: readonly DependencyKey[];
  provides?: readonly DependencyKey[];
  ops: Ops;
  extra?: Extra;
}): StepContract<Id, Phase, TObject, TObject, Record<string, OpBinding>> {
  const requires = def.requires ?? [];
  const provides = def.provides ?? [];

  const bindings: Record<string, OpBinding> = {};
  for (const [key, v] of Object.entries(def.ops)) {
    bindings[key] = (v as any).__kind === "Op" ? ({ op: v as any, input: "default" } as OpBinding) : (v as OpBinding);
  }

  // Internal schema: op default configs or internal envelopes + extra fields
  const internalProps: Record<string, TSchema> = { ...(def.extra ?? {}) };
  for (const [key, b] of Object.entries(bindings)) {
    internalProps[key] =
      (b.input ?? "default") === "envelope"
        ? (b.op.compileEnvelopeSchema as any)
        : (b.op.contract.strategies.default.configSchema as any);
  }
  const internalSchema = S.obj(internalProps as any, { title: `${def.id}.InternalConfig` });

  // Plan schema: op plan envelopes + extra fields
  const planProps: Record<string, TSchema> = { ...(def.extra ?? {}) };
  for (const [key, b] of Object.entries(bindings)) planProps[key] = b.op.planEnvelopeSchema;
  const planSchema = S.obj(planProps as any, { title: `${def.id}.PlanConfig` });

  return {
    id: def.id,
    phase: def.phase,
    requires,
    provides,
    internalSchema,
    planSchema,
    ops: bindings,
    __kind: "StepContract",
  } as const;
}

export function createStep<
  C extends StepContract<any, any, any, any, any>,
  TRuntime,
  TArtifacts,
>(contract: C, impl: { run: StepModule<C, TRuntime, TArtifacts>["run"] }): StepModule<C, TRuntime, TArtifacts> {
  function compileConfig(internal: unknown, stageKnobs: Record<string, unknown>): StepPlanConfigOf<C> {
    const internalNorm = normalizeWithSchema(contract.internalSchema, internal) as Record<string, unknown>;

    const plan: Record<string, unknown> = { ...internalNorm };
    for (const [key, b] of Object.entries(contract.ops)) {
      const opKnobs = normalizeWithSchema(b.op.contract.knobsSchema, stageKnobs);
      plan[key] = b.op.compileConfig(internalNorm[key] as any, opKnobs);
    }

    return normalizeWithSchema(contract.planSchema, plan) as any;
  }

  return { contract, compileConfig, run: impl.run } as const;
}
```

**Role:** Makes “steps composing ops” a **framework-provided mechanical compile** rather than manual forwarding. This directly addresses the current boilerplate visible in repomix (explicit per-op forwarding in `resolveConfig`).

**Design goals satisfied:** type safety (plan configs typed), authoring DX (less boilerplate), simplicity.
**In tension with:** steps that do highly custom compilation can still exist, but they should be exceptional.

---

### 8) `stage.ts`

```ts
import { type Static, type TObject } from "typebox";
import { S } from "./S";
import { isObjectLike, normalizeWithSchema } from "./schema";
import { extractAndNormalizeKnobs } from "./knobs";
import { type Domain, deriveStageKnobsSchema } from "./domain";
import { type StepModule } from "./step";

export type StageView<PublicSchema extends TObject> = Readonly<{
  publicSchema: PublicSchema;
  toInternal: (publicConfig: Static<PublicSchema>, stageKnobs: Record<string, unknown>) => unknown;
}>;

export type StageModule<
  Id extends string,
  Domains extends readonly Domain<any, any, any>[],
  Steps extends Record<string, StepModule<any, any, any>>,
  Views extends Partial<{ [K in keyof Steps]: StageView<TObject> }>,
> = Readonly<{
  id: Id;
  domains: Domains;
  steps: Steps;
  views: Views;

  stageKnobsSchema: TObject;
  publicSchema: TObject;

  __kind: "Stage";
}>;

const BANNED_PUBLIC_PROP_NAMES = new Set(["pipeline", "ops", "strategy"]);

/**
 * Guardrail: public schemas must not leak internal constructs.
 * (No “advanced mode”; the only public surface is stage-owned views.)
 */
function assertPublicSchemaSafe(schema: unknown, path: string[] = []) {
  if (!isObjectLike(schema)) return;

  // Ban any literal tag-like strings in schema (artifact:/field:/effect:).
  if (typeof schema["const"] === "string" && /^(artifact|field|effect):/.test(schema["const"])) {
    throw new Error(`Public schema leaks internal dependency key literal at ${path.join(".")}`);
  }
  if (Array.isArray(schema["enum"])) {
    for (const v of schema["enum"]) {
      if (typeof v === "string" && /^(artifact|field|effect):/.test(v)) {
        throw new Error(`Public schema leaks internal dependency key enum at ${path.join(".")}`);
      }
    }
  }

  // Walk object properties
  if (schema["type"] === "object" && isObjectLike(schema["properties"])) {
    for (const [k, v] of Object.entries(schema["properties"] as Record<string, unknown>)) {
      if (k.includes(":")) throw new Error(`Public schema key '${k}' contains ':' at ${path.join(".")}`);
      if (BANNED_PUBLIC_PROP_NAMES.has(k)) throw new Error(`Public schema key '${k}' is banned at ${path.join(".")}`);

      // Ban the classic envelope shape on the public plane (strategy+config).
      if (isObjectLike(v) && v["type"] === "object" && isObjectLike(v["properties"])) {
        const props = v["properties"] as Record<string, unknown>;
        if ("strategy" in props && "config" in props) {
          throw new Error(`Public schema exposes a strategy envelope at ${[...path, k].join(".")}`);
        }
      }

      assertPublicSchemaSafe(v, [...path, k]);
    }
  }

  // Recurse on common schema containers
  for (const key of ["items", "anyOf", "oneOf", "allOf"]) {
    const child = schema[key];
    if (Array.isArray(child)) child.forEach((c, i) => assertPublicSchemaSafe(c, [...path, `${key}[${i}]`]));
    else if (child) assertPublicSchemaSafe(child, [...path, key]);
  }
}

function assertNoColonInKey(kind: string, key: string) {
  if (key.includes(":")) throw new Error(`${kind} key '${key}' must not contain ':'`);
}

export function defineStage<
  const Id extends string,
  const Domains extends readonly Domain<any, any, any>[],
  Steps extends Record<string, StepModule<any, any, any>>,
  Views extends Partial<{ [K in keyof Steps]: StageView<TObject> }>,
>(def: { id: Id; domains: Domains; steps: Steps; views?: Views }): StageModule<Id, Domains, Steps, Views> {
  assertNoColonInKey("Stage", def.id);
  for (const stepKey of Object.keys(def.steps)) assertNoColonInKey("Step", stepKey);

  const stageKnobsSchema = deriveStageKnobsSchema(def.id, def.domains);

  const stageProps: Record<string, any> = {
    ...(((stageKnobsSchema as any).properties ?? {}) as object),
  };

  for (const [stepKey, step] of Object.entries(def.steps)) {
    const view = def.views?.[stepKey as keyof Steps];
    stageProps[stepKey] = view ? view.publicSchema : step.contract.internalSchema;
  }

  const publicSchema = S.obj(stageProps as any, { title: `${def.id}.PublicStageConfig` });
  assertPublicSchemaSafe(publicSchema);

  return {
    id: def.id,
    domains: def.domains,
    steps: def.steps,
    views: (def.views ?? {}) as Views,
    stageKnobsSchema,
    publicSchema,
    __kind: "Stage",
  } as const;
}

export function compileStageConfig<S extends StageModule<any, any, any, any>>(stage: S, publicStageConfig: unknown) {
  const stageNorm = normalizeWithSchema(stage.publicSchema, publicStageConfig) as Record<string, unknown>;
  const stageKnobs = extractAndNormalizeKnobs(stage.stageKnobsSchema, stageNorm);

  const internalSteps: Record<string, unknown> = {};
  for (const [stepKey] of Object.entries(stage.steps)) {
    const view = stage.views[stepKey as keyof typeof stage.views] as any;
    const publicStepConfig = stageNorm[stepKey];
    internalSteps[stepKey] = view ? view.toInternal(publicStepConfig, stageKnobs) : publicStepConfig;
  }

  return { stageKnobs, internalSteps };
}
```

**Role:** Stage-level ownership of public schema/views/transforms is locked-in (this is the key convergence from v7).
This also canonically encodes the alt2 “public leakage guardrails” stance (no pipeline/ops/envelopes/tags on public plane).

**Design goals satisfied:** mod-author safety, simplicity (single transform locus), evolvability.
**In tension with:** future “fractal” view ownership (step+stage+recipe) is explicitly deferred.

---

### 9) `recipe.ts`

```ts
import { type TObject } from "typebox";
import { S } from "./S";
import { normalizeWithSchema } from "./schema";
import { type DependencyKey } from "./dependency-keys";
import { type StageModule, compileStageConfig } from "./stage";
import { type StepContext } from "./step";

export type ExecutionPlanStep<TRuntime, TArtifacts> = Readonly<{
  id: string;
  phase: string;
  requires: readonly DependencyKey[];
  provides: readonly DependencyKey[];
  config: unknown;
  run: (ctx: StepContext<TRuntime, TArtifacts>) => void | Promise<void>;
}>;

export type ExecutionPlan<TRuntime, TArtifacts> = Readonly<{
  id: string;
  steps: readonly ExecutionPlanStep<TRuntime, TArtifacts>[];
}>;

export type RecipeModule<
  Id extends string,
  Stages extends Record<string, StageModule<any, any, any, any>>,
  TRuntime,
  TArtifacts,
> = Readonly<{
  id: Id;
  stages: Stages;
  publicSchema: TObject;
  compilePlan: (publicConfig: unknown) => ExecutionPlan<TRuntime, TArtifacts>;
  __kind: "Recipe";
}>;

function deriveStepId(stageKey: string, stepKey: string) {
  return `${stageKey}.${stepKey}`;
}

/**
 * NOTE: Scheduling semantics + dependency primitive are intentionally open.
 * This scheduler is a placeholder; it can be swapped with engine scheduling.
 */
function scheduleSteps<TRuntime, TArtifacts>(
  steps: ExecutionPlanStep<TRuntime, TArtifacts>[]
): ExecutionPlanStep<TRuntime, TArtifacts>[] {
  const byId = new Map(steps.map((s) => [s.id, s] as const));

  const providers = new Map<string, string>();
  for (const s of steps) {
    for (const k of s.provides) {
      if (providers.has(k)) throw new Error(`Multiple steps provide '${k}'`);
      providers.set(k, s.id);
    }
  }

  const deps = new Map<string, Set<string>>();
  for (const s of steps) {
    const d = new Set<string>();
    for (const req of s.requires) {
      const p = providers.get(req);
      if (p) d.add(p); // external deps are not edges
    }
    deps.set(s.id, d);
  }

  const out: ExecutionPlanStep<TRuntime, TArtifacts>[] = [];
  const ready: string[] = steps.filter((s) => (deps.get(s.id)?.size ?? 0) === 0).map((s) => s.id);
  const remaining = new Set(steps.map((s) => s.id));

  while (ready.length) {
    const id = ready.pop()!;
    if (!remaining.has(id)) continue;
    remaining.delete(id);
    out.push(byId.get(id)!);

    for (const [sid, d] of deps.entries()) {
      if (!remaining.has(sid)) continue;
      d.delete(id);
      if (d.size === 0) ready.push(sid);
    }
  }

  if (remaining.size) throw new Error(`Dependency cycle: ${[...remaining].join(", ")}`);
  return out;
}

export function defineRecipe<
  const Id extends string,
  Stages extends Record<string, StageModule<any, any, any, any>>,
  TRuntime,
  TArtifacts,
>(def: { id: Id; stages: Stages; knobsSchema?: TObject }): RecipeModule<Id, Stages, TRuntime, TArtifacts> {
  const rootProps: Record<string, any> = {};
  if (def.knobsSchema) rootProps["knobs"] = def.knobsSchema;

  for (const [stageKey, stage] of Object.entries(def.stages)) rootProps[stageKey] = stage.publicSchema;

  const publicSchema = S.obj(rootProps as any, { title: `${def.id}.PublicRecipeConfig` });

  function compilePlan(publicConfig: unknown): ExecutionPlan<TRuntime, TArtifacts> {
    // Recipe builder is the canonical compiler (avoid “dual compiler” world).
    const recipeNorm = normalizeWithSchema(publicSchema, publicConfig) as Record<string, unknown>;

    const steps: ExecutionPlanStep<TRuntime, TArtifacts>[] = [];

    for (const [stageKey, stage] of Object.entries(def.stages)) {
      const { stageKnobs, internalSteps } = compileStageConfig(stage, recipeNorm[stageKey]);

      for (const [stepKey, step] of Object.entries(stage.steps)) {
        const planConfig = step.compileConfig(internalSteps[stepKey], stageKnobs);
        const stepId = deriveStepId(stageKey, stepKey);

        steps.push({
          id: stepId,
          phase: step.contract.phase,
          requires: step.contract.requires,
          provides: step.contract.provides,
          config: planConfig,
          run: (ctx) => step.run(ctx as any, planConfig as any),
        });
      }
    }

    return { id: def.id, steps: scheduleSteps(steps) } as const;
  }

  return { id: def.id, stages: def.stages, publicSchema, compilePlan, __kind: "Recipe" } as const;
}
```

**Role:** This is the architectural “heart”:

* **recipe-owned compilation** (locked-in),
* avoids the “dual compiler” trap called out in v6 review (engine compiler + recipe compiler divergence).

**Design goals satisfied:** contract-first, simplicity, evolvability, DX.
**In tension with:** dependency/scheduler semantics are deliberately not locked (adapter point).

---

### 10) `create-map.ts`

```ts
import { type Static } from "typebox";
import { type RecipeModule } from "./recipe";

/** Only mod-facing entrypoint: createMap(...) */
export type MapDefinition<R extends RecipeModule<any, any, any, any>> = Readonly<{
  id: string;
  recipe: R;
  config: Static<R["publicSchema"]>;
}>;

export function createMap<const R extends RecipeModule<any, any, any, any>>(def: MapDefinition<R>): MapDefinition<R> {
  return def;
}
```

**Role:** Locks in “createMap-only” authoring.

---

## How the canonical system works (end-to-end)

```mermaid
flowchart TB
  A[createMap(config)] --> B[Recipe.publicSchema validate+defaults]
  B --> C[Stage views: public -> internal]
  C --> D[Recipe compiler: internal -> plan truth]
  D --> E[ExecutionPlan: steps + resolved configs]
  E --> F[Engine executor runs steps]
  F --> G[Step.run(ctx, planConfig)]
  G --> H[Op.run(input, planEnvelope)]
```

Key points:

* **Compilation is centralized** in recipe builder (Cluster 1 locked).
* **Stage views are the only public↔internal transform locus** (Cluster 1 locked).
* **Plan-truth config is typed and schema-validated** (op plan schemas, step plan schemas).
* **Knobs are schema-derived** from domains and sliced per op by declared subsets (Cluster 3 locked in principle).

---

## Decision status

### Locked in now

1. **Recipe builder owns compilation into plan truth** (engine compilation is not the source of truth).
2. **createMap-only mod authoring** (single public entrypoint).
3. **Default public schema == internal schema** (identity) when no transform is needed.
4. **Stage-level ownership of public schema/views/transforms** (no forced step-level public views).
5. **Guardrails**: public plane must not leak pipeline/ops/envelopes/dependency tags (enforced via schema scanning).
6. **Knobs model**: op/domain-declared schemas composed upward; knobs are distinct from op config and runtime parameters.
7. **Dependency catalogs** (alt1 reintroduced): canonical home for dependency IDs in code, regardless of primitive.
8. **Out-of-line strategy inference helper** is canonical (`createStrategy(...)`). This preserves valuable v3/v5-era insight about TS contextual typing failures.

### Open decisions / conflicts to resolve now (blocking)

None. The core architecture can proceed while leaving dependency primitive and scheduler semantics behind an adapter.

### Open decisions that can be safely deferred

1. **Dependency primitive**: string keys + TagRegistry vs typed ResourceRefs/ResourceStore (Cluster 2). Current engine uses TagRegistry semantics today.
2. **Scheduling semantics**: “satisfied” semantics vs “presence in store” semantics; phase ordering vs dependency ordering (Cluster 2).
3. **Canonical home for IDs** beyond catalogs (catalog module layout conventions, naming, versioning).
4. **Knobs surface shape** details (root knobs usage vs stage knobs only). The schema composition model is locked; the exact surface shape is adjustable.
5. **Fractal views** (step-level views, recipe-level views) beyond the stage-level baseline.

---

# Section 2: Illustrative End-to-End Examples

These examples are grounded in the repomix-observed pattern where a step schema references multiple op config schemas and forwards resolveConfig per op.  The canonical architecture refactors that pattern into mechanical compilation while preserving the same conceptual workflow (“step composes multiple ops”).

## Example A — Step → Ops with mechanical compilation (placement “derivePlacementInputs”-style)

### `placement.deps.ts`

```ts
import { defineDeps } from "./dependency-keys";

export const placementDeps = defineDeps({
  artifact: {
    placementInputsV1: "placement.inputs.v1",
  },
  field: {
    plotMap: "engine.plotMap",
  },
  effect: {
    featuresApplied: "engine.featuresApplied",
  },
});
```

### `placement.domain.ts`

```ts
import { Type } from "typebox";
import { S } from "./S";
import { defineDomain } from "./domain";
import { defineOpContract, createOp, createStrategy } from "./op";

const placementKnobs = S.obj({
  wonderDensity: S.int({ default: 3, minimum: 0, maximum: 10 }),
  startDistance: S.int({ default: 8, minimum: 4, maximum: 20 }),
});

const PlanWonders = defineOpContract({
  id: "placement.planWonders",
  inputSchema: Type.Any(),
  outputSchema: Type.Any(),
  knobsSchema: S.obj({
    wonderDensity: S.int(),
  }),
  strategies: {
    default: {
      // What internal config uses (safe)
      configSchema: S.obj({
        enabled: S.bool({ default: true }),
        baseCount: S.int({ default: 4, minimum: 0 }),
      }),
      // What plan truth uses (resolved)
      planSchema: S.obj({
        enabled: S.bool(),
        targetCount: S.int(),
      }),
    },
  },
});

const planWonders = createOp(
  PlanWonders,
  {
    default: createStrategy(PlanWonders, "default", {
      resolveConfig: (cfg, knobs) => ({
        enabled: cfg.enabled,
        targetCount: cfg.enabled ? cfg.baseCount * knobs.wonderDensity : 0,
      }),
      run: async (_input, _planCfg) => {
        return {}; // (placeholder)
      },
    }),
  }
);

export const placement = defineDomain({
  id: "placement",
  knobsSchema: placementKnobs,
  ops: {
    planWonders,
  },
});
```

### `derivePlacementInputs.step.ts`

```ts
import { defineStepContract, createStep } from "./step";
import { placementDeps } from "./placement.deps";
import { placement } from "./placement.domain";

export const derivePlacementInputsContract = defineStepContract({
  id: "derivePlacementInputs",
  phase: "placement",
  requires: [placementDeps.field.plotMap],
  provides: [placementDeps.artifact.placementInputsV1],
  ops: {
    // Internal config shape here is DEFAULT config schema (no envelopes exposed publicly).
    wonders: placement.ops.planWonders,
  },
});

export const derivePlacementInputs = createStep(derivePlacementInputsContract, {
  run: async (ctx, config) => {
    // config.wonders is plan-truth envelope:
    // { strategy: "default", config: { enabled, targetCount } }
    const result = await placement.ops.planWonders.run(ctx.artifacts as any, config.wonders as any);

    // Step writes artifact(s) etc (placeholder)
    void result;
  },
});
```

**What depends on locked-in decisions:** recipe-owned compilation; step mechanical compilation of op configs; stage-level public schema (default identity); knobs slicing.
**What’s illustrative only:** the exact runtime artifact model (because dependency primitive + artifact store shape are deferred).

---

## Example B — Recipe → Stage → Steps → Ops with a stage-level public view transform

This shows how to keep mod authoring simple while still allowing internal complexity. It uses a stage view to present a simplified public config, mapping to the step’s internal config. This is the canonical locus for public↔internal transforms.

### `placement.stage.ts`

```ts
import { Type } from "typebox";
import { S } from "./S";
import { defineStage } from "./stage";
import { placement } from "./placement.domain";
import { derivePlacementInputs } from "./derivePlacementInputs.step";

const derivePlacementInputsPublic = S.obj({
  // Public, modder-friendly: allow boolean shorthand
  wonders: Type.Boolean({ default: true }),
});

export const placementStage = defineStage({
  id: "placement",
  domains: [placement],
  steps: {
    derivePlacementInputs,
  },
  views: {
    derivePlacementInputs: {
      publicSchema: derivePlacementInputsPublic,
      toInternal: (pub, _knobs) => ({
        wonders: {
          enabled: pub.wonders,
          baseCount: 4,
        },
      }),
    },
  },
});
```

### `standard.recipe.ts`

```ts
import { defineRecipe } from "./recipe";
import { placementStage } from "./placement.stage";

export const StandardRecipe = defineRecipe({
  id: "standard",
  stages: {
    placement: placementStage,
  },
});
```

### `StandardMap.ts` (mod author)

```ts
import { createMap } from "./create-map";
import { StandardRecipe } from "./standard.recipe";

export default createMap({
  id: "MyStandardMap",
  recipe: StandardRecipe,
  config: {
    placement: {
      // Public schema: simple
      wonders: true,
      // plus stage knobs (derived from domains) if exposed at stage scope
      // wonderDensity: 3,
      // startDistance: 8,
    },
  },
});
```

**What depends on locked-in decisions:** stage-level views, createMap-only authoring, recipe compilation.
**Illustrative-only:** whether stage knobs are surfaced inline vs under a `knobs` object (shape is adjustable; composition model is locked).

---

# Section 3: Implementation Plan and Impact Assessment

This plan is explicitly designed to avoid a “boil the ocean” engine rewrite. The compiled codebase shows the current engine primitives: TagRegistry dependency checks and a PipelineExecutor that validates and then runs each step with its resolved config.  We will preserve that execution model while refactoring compilation/composition around it.

We also note that current steps show repeated schema/default wiring and explicit per-op `resolveConfig` forwarding, which this architecture removes via mechanical compilation.

(Repomix snapshot reference: )

---

## Stage 0 — Introduce canonical composition primitives (low risk, parallelizable)

**Deliverables**

* Add the new core files: `S.ts`, `schema.ts`, `dependency-keys.ts`, `knobs.ts`, `domain.ts`, `op.ts`, `step.ts`, `stage.ts`, `recipe.ts`, `create-map.ts`.
* Add unit tests for:

  * schema normalization + defaults + strictness,
  * public-schema guardrails in `stage.ts`,
  * op compile typing (configSchema vs planSchema),
  * step mechanical compilation producing plan configs.

**Rote/mechanical:** file additions + tests scaffolding.
**High-thought:** none; architecture is specified.

**Impact:** no behavior change yet; this is additive.

---

## Stage 1 — Add an engine adapter layer (moderate, contained)

**Goal:** compile with the new recipe builder but still execute with the existing engine executor.

**Deliverables**

* Implement a small adapter that converts `ExecutionPlan` (from `recipe.compilePlan`) into the engine’s expected plan shape (or call engine executor with a compatible wrapper).

  * This should be mostly shape-mapping: step id, phase, requires/provides, config, run.

**Why this is safe:** The current engine already expects a plan of ordered steps, validates dependencies, and calls `step.run(ctx, config)` semantics.

**Rote/mechanical:** plan type conversion.
**High-thought:** ensuring dependency validation semantics are preserved (do not change “what counts as satisfied”).

---

## Stage 2 — Pilot migration: one stage + a handful of steps (high leverage)

**Candidate:** a placement-like step such as `derive-placement-inputs`, because it demonstrates the repeated `resolveConfig` forwarding pattern.

**Deliverables**

* Wrap 1–2 existing ops as `OpContract + createOp`, ensuring:

  * `configSchema` matches existing authored config,
  * `planSchema` matches existing resolved config (or define it explicitly).
* Wrap 1 step as `StepContract + createStep`.
* Create `StageModule` and `RecipeModule`.
* Produce one `createMap` map file and run end-to-end.

**Rote/mechanical:** contract transcription into TypeBox schemas.
**High-thought:** deciding planSchema boundaries for ops that previously returned loosely typed resolved configs.

**DX payoff:** immediate removal of per-op resolveConfig boilerplate for that step.

---

## Stage 3 — Migrate composition “spine” (parallelizable bulk refactor)

Once the adapter and pilot prove out:

**Deliverables**

* Convert remaining steps into `StepContract + createStep`.

  * Mechanical: enumerate ops, define requires/provides, convert schema/defaults.
* Convert stage modules and recipe modules accordingly.
* Replace ad-hoc map entrypoints with `createMap` usage.

**Parallelizable:** yes, by stage/feature area.

**Risk control**

* Keep dependency tags/keys identical initially to avoid scheduler changes.
* Keep runtime behavior identical; focus on compile-time refactor first.

---

## Stage 4 — Knobs composition rollout (moderate, correctness-focused)

**Deliverables**

* Define domain knobs schemas for each domain.
* Ensure ops declare knob subsets and validate subset relationship (already in `defineDomain`).
* Surface stage knobs in schemas and ensure defaults apply.

**Rote/mechanical:** adding knob schema fields.
**High-thought:** collision resolution strategy if two domains want same knob key name (the canonical architecture currently fails fast).

**Why worth it:** aligns with clarified direction: knobs are not run settings, and are domain/op-derived and composed upward.

---

## Stage 5 — Dependency primitive + scheduling decision (explicitly deferred, but planned)

This is Cluster 2. The engine currently uses TagRegistry satisfaction semantics.

**Decision to make later**

* Keep string keys + TagRegistry, but standardize catalogs and tighten typing (likely minimal churn), **or**
* Introduce typed ResourceRefs/ResourceStore and update executor semantics.

**Why defer:** the canonical architecture isolates the decision; the composition refactor can proceed without committing to a full engine rewrite.

---

## Value vs cost summary

**High value / low cost**

* Stage-level view ownership + createMap-only public contract (immediate authoring clarity).
* Recipe-owned compilation (avoids the dual-compiler risk highlighted in v6 review).
* Mechanical step compilation removes repeated `resolveConfig` forwarding boilerplate observed in current steps.

**High value / moderate cost**

* Explicit op planSchema typing (true plan-truth type safety; requires schema work).

**High cost / deferred**

* Dependency primitive + scheduler rewrite (Cluster 2).

---

## Engine vs composition impact

**Composition-layer changes (preferred, most of this plan)**

* New contracts/builders: ops/steps/stages/recipes
* Public schema derivation + stage views
* Central recipe compilation

**Engine semantics (avoid unless necessary)**

* TagRegistry satisfaction semantics and PipelineExecutor ordering/validation should remain unchanged during Stages 1–4.

---

If you want the next iteration, I recommend we immediately “lock the final stance” on two items that materially affect how large the step migration feels (but are still compatible with the above spec as written):

1. whether plan-truth op envelopes are always stored in step plan config vs only for multi-strategy ops, and
2. the exact public surface shape for stage knobs (inline vs nested).
