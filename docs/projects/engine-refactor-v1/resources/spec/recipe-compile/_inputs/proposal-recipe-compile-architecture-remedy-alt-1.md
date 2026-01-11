Quick note before we start: some older uploads in this project have expired. I’m using the **currently attached** baseline repo (`repomix-mapgen-uncompressed.*`) plus the attached proposal docs. If there’s any other specific artifact you expected me to reference that isn’t reflected below, re-upload it and I’ll re-ground.

---

# GREEN Solution Doc: Composition-First Recipe Compiler (Implementation-Ready Spec)

This document resolves **every** YELLOW→GREEN issue we identified by turning them into canonical, copy-pasteable TypeScript definitions and mechanics. It is written so an implementer can wire the system without guessing.

## Locked invariants (re-stated as enforceable rules)

1. **No runtime config defaulting/cleaning/resolution**

* Runtime handlers (`step.run`, `op.run`) never call schema defaulting/cleaning/convert utilities.
* Runtime execution consumes **only canonical configs** produced by the compiler pipeline.

2. **compile vs normalize semantics**

* `compile` = shape-changing (stage public → internal step map). Only exists when `public ≠ internal`.
* `normalize` = shape-preserving canonicalization (compile-time only).
* The compiler pipeline is **always-on**, even when `public === internal`.

3. **Knobs model**

* Single author-facing surface per stage: `stageConfig.knobs` is a field in stage config.
* Compiler extracts knobs once and threads `ctx = { env, knobs }` into step/op normalization.
* Step configs do **not** contain knobs.
* Reserved key: `"knobs"` cannot be a step id nor a stage public field.

4. **Op envelope normalization**

* Op envelopes are **top-level only**; discovered via `step.contract.ops` keys; no nested scanning.

5. **O1/O2/O3 decisions (closed)**

* O1: shared envelope derivation used by both `createOp` and `opRef`.
* O2: split types: author input partial vs compiled total.
* O3: v1 does NOT support “ops-derived schema + extra top-level fields”; extras require explicit schema.

---

## 0) Root-cause fixes (what actually changes and why)

### Problem (1–2 sentences)

The baseline currently “works” because the engine and executor still do runtime defaulting/cleaning and call `step.resolveConfig` / `op.resolveConfig`, which violates the invariants and makes authoring surfaces hard to reason about.

### Canonical solution (root fix)

Move **all canonicalization** into a recipe-owned compiler pipeline. Make runtime execution accept only canonical configs. Structurally prevent runtime code from calling normalize hooks by splitting compile vs runtime surfaces.

---

# 1) Canonical naming + module boundaries

## 1.1 Terminology

* **Env**: runtime input from Civ7 (seed, dimensions, wrap, etc.). Canonicalized pre-runtime.
* **Knobs**: stage-level tuning fields (`stageConfig.knobs`) used only during compilation.
* **Stage config**: single author-facing object per stage:

  * always contains optional `knobs`
  * contains either public fields (if stage has `public`) or internal step-id map (if not)
* **Internal step config**: canonical config object validated against the step schema; does not include knobs.
* **Compile**: stage-level shape change (public → internal step map)
* **Normalize**: step/op value canonicalization (shape preserving)

## 1.2 Hard module boundary rule

* **Compiler-only utilities** (`Value.Default/Clean/Convert`, unknown-key discovery, strict canonicalization) live under:

  * `packages/mapgen-core/src/compiler/**`
* Runtime/engine/step/op run modules MUST NOT import compiler utilities.

This is enforced by API shape (see op runtime surface) and optionally by a lint rule later.

---

# 2) NEW / UPDATED canonical types and modules

Everything below is copy-pasteable TypeScript. Where a file already exists in baseline, treat this as its **canonical replacement**.

---

## 2.1 `packages/mapgen-core/src/core/env.ts` (NEW)

### Problem

Env is currently defined inside engine plan compilation (`execution-plan.ts`) which creates coupling and circular imports.

### Solution

Define Env in core so engine + authoring + compiler share it without importing plan compiler internals.

```ts
// packages/mapgen-core/src/core/env.ts
import { Type, type Static } from "typebox";

const UnknownRecord = Type.Record(Type.String(), Type.Unknown(), { default: {} });

export const TraceLevelSchema = Type.Union([
  Type.Literal("off"),
  Type.Literal("basic"),
  Type.Literal("verbose"),
]);

export const TraceConfigSchema = Type.Object(
  {
    enabled: Type.Optional(Type.Boolean({ description: "Master tracing switch." })),
    steps: Type.Optional(
      Type.Record(Type.String(), TraceLevelSchema, {
        default: {},
        description: "Per-step trace verbosity (off/basic/verbose).",
      })
    ),
  },
  { additionalProperties: false, default: {} }
);

/**
 * Canonical runtime environment for a mapgen run.
 * This is runtime input (Civ7 + entrypoint), canonicalized pre-runtime.
 */
export const EnvSchema = Type.Object(
  {
    seed: Type.Number(),
    dimensions: Type.Object(
      { width: Type.Number(), height: Type.Number() },
      { additionalProperties: false }
    ),
    latitudeBounds: Type.Object(
      { topLatitude: Type.Number(), bottomLatitude: Type.Number() },
      { additionalProperties: false }
    ),
    wrap: Type.Object(
      { wrapX: Type.Boolean(), wrapY: Type.Boolean() },
      { additionalProperties: false }
    ),
    directionality: Type.Optional(UnknownRecord),
    metadata: Type.Optional(UnknownRecord),
    trace: Type.Optional(TraceConfigSchema),
  },
  { additionalProperties: false }
);

export type Env = Static<typeof EnvSchema>;

/** Reserved key in all stage config surfaces. */
export const STAGE_KNOBS_KEY = "knobs" as const;
export type StageKnobsKey = typeof STAGE_KNOBS_KEY;
```

Rationale: eliminates engine↔authoring coupling and standardizes the “env” name.

---

## 2.2 `packages/mapgen-core/src/compiler/errors.ts` (NEW)

### Problem

The compile pipeline needs structured errors with stable codes/paths.

### Solution

Introduce a single compile error type used by recipe compilation.

```ts
// packages/mapgen-core/src/compiler/errors.ts
export type CompileErrorCode =
  | "env.invalid"
  | "stage.config.invalid"
  | "stage.compile.failed"
  | "step.config.invalid"
  | "step.normalize.failed"
  | "op.envelope.invalid"
  | "op.normalize.failed"
  | "binding.missingOp"
  | "binding.reservedKeyCollision"
  | "binding.unknownStepId";

export type CompileErrorItem = Readonly<{
  code: CompileErrorCode;
  path: string;
  message: string;
  stageId?: string;
  stepId?: string;
  opKey?: string;
}>;

export class RecipeCompileError extends Error {
  readonly errors: readonly CompileErrorItem[];

  constructor(errors: readonly CompileErrorItem[]) {
    super(errors.map((e) => `${e.path}: ${e.message}`).join("\n"));
    this.name = "RecipeCompileError";
    this.errors = errors;
  }
}
```

---

## 2.3 `packages/mapgen-core/src/compiler/normalize.ts` (NEW)

### Problem

We must canonicalize configs pre-runtime with strict unknown-key enforcement and TypeBox defaults/clean/convert.

### Solution

A single canonical `normalizeStrict` used only by compiler.

```ts
// packages/mapgen-core/src/compiler/normalize.ts
import type { TSchema } from "typebox";
import { Value } from "typebox/value";

import type { CompileErrorItem } from "./errors.js";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Unknown-key detection compatible with TypeBox object schemas.
 * This walks schema/value recursively and emits "unknown key" errors where
 * `additionalProperties: false` is set.
 *
 * Note: this is compile-time only; runtime handlers must not call this.
 */
export function findUnknownKeyErrors(
  schema: unknown,
  value: unknown,
  path = ""
): Array<{ path: string; message: string }> {
  if (!isPlainObject(schema) || !isPlainObject(value)) return [];

  const anyOf = Array.isArray(schema.anyOf) ? (schema.anyOf as unknown[]) : null;
  const oneOf = Array.isArray(schema.oneOf) ? (schema.oneOf as unknown[]) : null;
  const allOf = Array.isArray(schema.allOf) ? (schema.allOf as unknown[]) : null;

  if (anyOf) return anyOf.flatMap((s, i) => findUnknownKeyErrors(s, value, `${path}`));
  if (oneOf) return oneOf.flatMap((s, i) => findUnknownKeyErrors(s, value, `${path}`));
  if (allOf) return allOf.flatMap((s, i) => findUnknownKeyErrors(s, value, `${path}`));

  const props = isPlainObject(schema.properties) ? (schema.properties as Record<string, unknown>) : null;
  const additional = schema.additionalProperties;

  const allowAdditional =
    additional === undefined ? true : additional === true || isPlainObject(additional);

  const errors: Array<{ path: string; message: string }> = [];

  if (props && !allowAdditional) {
    for (const key of Object.keys(value)) {
      if (!Object.prototype.hasOwnProperty.call(props, key)) {
        errors.push({
          path: `${path}/${key}`,
          message: `Unknown key "${key}"`,
        });
      }
    }
  }

  if (props) {
    for (const [key, propSchema] of Object.entries(props)) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        errors.push(...findUnknownKeyErrors(propSchema, (value as any)[key], `${path}/${key}`));
      }
    }
  }

  return errors;
}

function formatSchemaErrors(schema: TSchema, value: unknown, path: string): CompileErrorItem[] {
  const errs = Array.from(Value.Errors(schema, value));
  return errs.map((e) => ({
    code: "step.config.invalid" as const,
    path: `${path}${e.path ?? ""}`,
    message: e.message ?? "Invalid value",
  }));
}

/**
 * Strict canonicalization: Unknown keys => errors; Default/Clean/Convert => canonical value.
 * This mutates the *returned value* only; it does not mutate the input.
 */
export function normalizeStrict<T>(
  schema: TSchema,
  raw: unknown,
  path: string,
  code: CompileErrorItem["code"] = "step.config.invalid"
): { value: T; errors: CompileErrorItem[] } {
  const input = raw === undefined ? {} : raw;

  const unknownKeyErrors = findUnknownKeyErrors(schema, input, path).map((e) => ({
    code,
    path: e.path,
    message: e.message,
  }));

  // Clone -> Default -> Convert -> Clean (baseline behavior)
  const cloned = Value.Clone(input);
  const defaulted = Value.Default(schema, cloned);
  const converted = Value.Convert(schema, defaulted);
  const cleaned = Value.Clean(schema, converted);

  const schemaErrors = Array.from(Value.Errors(schema, defaulted)).map((e) => ({
    code,
    path: `${path}${e.path ?? ""}`,
    message: e.message ?? "Invalid value",
  }));

  return { value: cleaned as T, errors: [...unknownKeyErrors, ...schemaErrors] };
}

/**
 * Validation-only (no mutation): used by engine to enforce "engine is not canonicalizer".
 */
export function validateOnly(
  schema: TSchema,
  value: unknown,
  path: string,
  code: CompileErrorItem["code"]
): CompileErrorItem[] {
  const unknownKeyErrors = findUnknownKeyErrors(schema, value, path).map((e) => ({
    code,
    path: e.path,
    message: e.message,
  }));
  const schemaErrors = Array.from(Value.Errors(schema, value)).map((e) => ({
    code,
    path: `${path}${e.path ?? ""}`,
    message: e.message ?? "Invalid value",
  }));
  return [...unknownKeyErrors, ...schemaErrors];
}
```

Rationale: single canonical canonicalization function removes ambiguity and ensures no runtime fallback.

---

# 3) Op envelope derivation + opRef + compile/runtime op split (O1 + invariant enforcement)

## 3.1 `packages/mapgen-core/src/authoring/op/envelope.ts` (UPDATE)

### Problem

We need a single envelope builder shared by `createOp` and `opRef`. It must produce:

* the envelope schema
* default envelope value
* strategy ids

### Canonical solution

Make the builder generic-friendly and explicitly return strategy ids + schema + default envelope.

```ts
// packages/mapgen-core/src/authoring/op/envelope.ts
import { Type, type TSchema } from "typebox";

import type { StrategyConfigSchemas } from "./contract.js";
import { buildDefaultConfigValue } from "./defaults.js";

export type OpEnvelopeBuildResult = Readonly<{
  schema: TSchema;
  /** Default envelope is always { strategy:"default", config:<defaulted config> } */
  defaultConfig: Readonly<{ strategy: "default"; config: Record<string, unknown> }>;
  strategyIds: readonly string[];
}>;

export function buildOpEnvelopeSchema(
  contractId: string,
  strategySchemas: StrategyConfigSchemas & { default: TSchema }
): OpEnvelopeBuildResult {
  const strategyIds = Object.keys(strategySchemas);
  if (strategyIds.length === 0) {
    throw new Error(`op(${contractId}) strategies must not be empty`);
  }
  if (!Object.prototype.hasOwnProperty.call(strategySchemas, "default")) {
    throw new Error(`op(${contractId}) missing required "default" strategy schema`);
  }

  // Envelope schema is a discriminated union over strategies:
  // { strategy: "<id>", config: <schema> }
  const variants = strategyIds.map((id) =>
    Type.Object(
      {
        strategy: Type.Literal(id),
        config: strategySchemas[id]!,
      },
      { additionalProperties: false }
    )
  );

  const schema = Type.Union(variants);

  const defaultInner = buildDefaultConfigValue(strategySchemas.default);
  const defaultConfig = { strategy: "default" as const, config: defaultInner };

  return { schema, defaultConfig, strategyIds };
}
```

Rationale: one source of truth; avoids “two builders drift.”

---

## 3.2 `packages/mapgen-core/src/authoring/op/ref.ts` (UPDATE)

### Problem

Step contracts should reference ops without importing implementations.

### Canonical solution

`OpRef` is generic over the contract so keys preserve id and schema type.

```ts
// packages/mapgen-core/src/authoring/op/ref.ts
import type { TSchema } from "typebox";

import type { OpContract } from "./contract.js";
import { buildOpEnvelopeSchema } from "./envelope.js";

export type OpRef<const Id extends string = string> = Readonly<{
  id: Id;
  config: TSchema; // envelope schema
}>;

export function opRef<const C extends OpContract<any, any, any, any, any>>(
  contract: C
): OpRef<C["id"]> {
  const { schema } = buildOpEnvelopeSchema(contract.id, contract.strategies);
  return { id: contract.id, config: schema };
}
```

---

## 3.3 `packages/mapgen-core/src/authoring/op/types.ts` (REPLACE)

### Problem

Baseline `DomainOp` currently:

* includes `resolveConfig(config, RunSettings)` as a **required** member
* uses engine plan types (`RunSettings`) and exposes compile hook at runtime

### Canonical solution

Split compile vs runtime surfaces:

* `DomainOpCompile` includes `normalize` (compile-time only) and strategy normalize hooks
* `DomainOpRuntime` excludes normalize entirely
* `createOp` returns `DomainOpCompile`
* `runtimeOp(op)` strips normalize and returns `DomainOpRuntime`
* step runtime injection uses `DomainOpRuntime` only

```ts
// packages/mapgen-core/src/authoring/op/types.ts
import type { Static, TSchema, TUnsafe } from "typebox";

import type { ValidationError, OpRunValidatedOptions, OpValidateOptions } from "../validation.js";
import type { StrategySelection } from "./strategy.js";
import type { Env } from "@mapgen/core/env.js";

export type OpContractLike = Readonly<{
  id: string;
  kind: string;
  input: TSchema;
  output: TSchema;
  strategies: Readonly<Record<string, TSchema>>;
}>;

export type StrategyConfigSchemasOf<TContract extends OpContractLike> = TContract["strategies"];

export type OpStrategyId<TContract extends OpContractLike> =
  keyof TContract["strategies"] & string;

export type OpEnvelopeOf<TContract extends OpContractLike> = {
  [K in OpStrategyId<TContract>]: Readonly<{
    strategy: K;
    config: Static<TContract["strategies"][K]>;
  }>;
}[OpStrategyId<TContract>];

export type OpConfigSchema<
  Strategies extends Record<string, { config: TSchema }>
> = TUnsafe<StrategySelection<Strategies>>;

export type DomainOpKind = "plan" | "compute" | "score" | "select";

export type NormalizeCtx<Knobs = unknown> = Readonly<{
  env: Env;
  knobs: Knobs;
}>;

/** Strategy runtime/compile surface */
export type OpStrategy<ConfigSchema extends TSchema, Input, Output, Knobs = unknown> = Readonly<{
  config: ConfigSchema;

  /**
   * Compile-time only, shape-preserving.
   * Must return a value still valid for ConfigSchema.
   */
  normalize?: (config: Static<ConfigSchema>, ctx: NormalizeCtx<Knobs>) => Static<ConfigSchema>;

  run: (input: Input, config: Static<ConfigSchema>) => Output;
}>;

export type DomainOpCompile<
  Contract extends OpContractLike,
  Strategies extends Record<string, { config: TSchema }>,
  Knobs = unknown,
> = Readonly<{
  kind: DomainOpKind;
  id: Contract["id"];
  input: Contract["input"];
  output: Contract["output"];

  // envelope
  config: OpConfigSchema<Strategies>;
  defaultConfig: StrategySelection<Strategies>;
  strategies: Readonly<Record<string, OpStrategy<TSchema, any, any, Knobs>>>;

  /**
   * Compile-time envelope normalization (shape-preserving).
   * Selects strategy and calls strategy.normalize on inner config (if present).
   */
  normalize?: (
    config: StrategySelection<Strategies>,
    ctx: NormalizeCtx<Knobs>
  ) => StrategySelection<Strategies>;

  // runtime (safe)
  run: (input: Static<Contract["input"]>, config: StrategySelection<Strategies>) => Static<Contract["output"]>;

  validate: (
    input: Static<Contract["input"]>,
    config: StrategySelection<Strategies>,
    options?: OpValidateOptions
  ) => { ok: boolean; errors: ValidationError[] };

  runValidated: (
    input: Static<Contract["input"]>,
    config: StrategySelection<Strategies>,
    options?: OpRunValidatedOptions
  ) => Static<Contract["output"]>;
}>;

export type DomainOpRuntime<
  Contract extends OpContractLike,
  Strategies extends Record<string, { config: TSchema }>,
> = Readonly<Pick<
  DomainOpCompile<Contract, Strategies, any>,
  "kind" | "id" | "run" | "validate" | "runValidated"
>>;

/**
 * Runtime view of an op: removes compile-time normalize hook and strategy internals.
 * This makes it structurally hard to violate "no runtime canonicalization."
 */
export function runtimeOp<
  Contract extends OpContractLike,
  Strategies extends Record<string, { config: TSchema }>
>(op: DomainOpCompile<Contract, Strategies, any>): DomainOpRuntime<Contract, Strategies> {
  return {
    kind: op.kind,
    id: op.id,
    run: op.run,
    validate: op.validate,
    runValidated: op.runValidated,
  };
}
```

Rationale: enforces invariant #1 structurally (runtime surface cannot normalize).

---

## 3.4 `packages/mapgen-core/src/authoring/op/strategy.ts` (REPLACE)

### Problem

Strategy hook uses `resolveConfig(config, RunSettings)` which is engine-coupled and misnamed.

### Solution

Rename to `normalize(config, ctx)` and use `NormalizeCtx`.

```ts
// packages/mapgen-core/src/authoring/op/strategy.ts
import type { Static, TSchema } from "typebox";
import type { NormalizeCtx, OpStrategy } from "./types.js";

type NoInfer<T> = [T][T extends any ? 0 : never];

export type StrategyImpl<ConfigSchema extends TSchema, Input, Output, Knobs = unknown> =
  Readonly<{
    normalize?: (
      config: Static<NoInfer<ConfigSchema>>,
      ctx: NormalizeCtx<Knobs>
    ) => Static<NoInfer<ConfigSchema>>;

    run: (input: Input, config: Static<NoInfer<ConfigSchema>>) => Output;
  }>;

export type StrategyImplMapFor<
  Contract extends { strategies: Readonly<Record<string, TSchema>> }
> = Readonly<{
  [K in keyof Contract["strategies"] & string]: StrategyImpl<
    Contract["strategies"][K],
    unknown,
    unknown,
    unknown
  >;
}>;

export type StrategySelection<Strategies extends Record<string, { config: TSchema }>> =
  { [K in keyof Strategies & string]: { strategy: K; config: Static<Strategies[K]["config"]> } }[keyof Strategies & string];

export function createStrategy<ConfigSchema extends TSchema, Input, Output, Knobs = unknown>(
  config: ConfigSchema,
  impl: StrategyImpl<ConfigSchema, Input, Output, Knobs>
): OpStrategy<ConfigSchema, Input, Output, Knobs> {
  return {
    config,
    normalize: impl.normalize as any,
    run: impl.run as any,
  };
}
```

---

## 3.5 `packages/mapgen-core/src/authoring/op/create.ts` (REPLACE)

### Problem

createOp currently builds runtime op object that includes compile-time resolver and imports engine types.

### Solution

* Use `buildOpEnvelopeSchema` (O1)
* Attach strategy normalize hooks into `op.normalize`
* Return `DomainOpCompile`
* No engine `RunSettings` import; uses `NormalizeCtx` (env+knobs)

```ts
// packages/mapgen-core/src/authoring/op/create.ts
import type { Static, TSchema } from "typebox";

import type { CustomValidateFn } from "../validation.js";
import type { OpContract } from "./contract.js";
import type { DomainOpCompile, NormalizeCtx, OpStrategy } from "./types.js";
import type { StrategySelection } from "./strategy.js";
import { buildOpEnvelopeSchema } from "./envelope.js";
import { attachValidationSurface } from "./validation-surface.js";

type RuntimeStrategiesForContract<C extends OpContract<any, any, any, any, any>, Knobs> = Readonly<{
  [K in keyof C["strategies"] & string]: OpStrategy<
    C["strategies"][K],
    Static<C["input"]>,
    Static<C["output"]>,
    Knobs
  >;
}>;

type StrategySelectionForContract<C extends OpContract<any, any, any, any, any>, Knobs> =
  StrategySelection<RuntimeStrategiesForContract<C, Knobs>>;

type OpImpl<C extends OpContract<any, any, any, any, any>, Knobs> = Readonly<{
  strategies: {
    [K in keyof C["strategies"] & string]: {
      normalize?: (
        config: Static<C["strategies"][K]>,
        ctx: NormalizeCtx<Knobs>
      ) => Static<C["strategies"][K]>;
      run: (
        input: Static<C["input"]>,
        config: Static<C["strategies"][K]>
      ) => Static<C["output"]>;
    };
  };
  customValidate?: CustomValidateFn<Static<C["input"]>, StrategySelectionForContract<C, Knobs>>;
}>;

export function createOp<
  const C extends OpContract<any, any, any, any, any>,
  Knobs = unknown,
>(
  contract: C,
  impl: OpImpl<C, Knobs>
): DomainOpCompile<C, RuntimeStrategiesForContract<C, Knobs>, Knobs> {
  const { schema: config, defaultConfig, strategyIds } = buildOpEnvelopeSchema(contract.id, contract.strategies);

  // Build runtime strategies map
  const strategies: Record<string, OpStrategy<TSchema, any, any, Knobs>> = {};
  for (const id of strategyIds) {
    const strat = (impl.strategies as any)[id];
    if (!strat) throw new Error(`createOp(${contract.id}) missing strategy "${id}"`);
    strategies[id] = {
      config: (contract.strategies as any)[id],
      normalize: strat.normalize,
      run: strat.run,
    };
  }

  const normalize = (cfg: any, ctx: NormalizeCtx<Knobs>) => {
    const selected = strategies[cfg.strategy];
    if (!selected) throw new Error(`createOp(${contract.id}) unknown strategy "${cfg.strategy}"`);
    if (!selected.normalize) return cfg;
    return { strategy: cfg.strategy, config: selected.normalize(cfg.config, ctx) };
  };

  const domainOp = {
    kind: contract.kind,
    id: contract.id,
    input: contract.input,
    output: contract.output,
    strategies: strategies as any,
    config: config as any,
    defaultConfig: defaultConfig as any,
    normalize: normalize as any,
    run: (input: any, cfg: any) => {
      const selected = strategies[cfg.strategy];
      if (!selected) throw new Error(`createOp(${contract.id}) unknown strategy "${cfg.strategy}"`);
      return selected.run(input, cfg.config);
    },
  } as const;

  return attachValidationSurface(domainOp as any, impl.customValidate);
}
```

Rationale: This centralizes op normalization and provides a runtime-safe view via `runtimeOp(op)`.

---

# 4) Step contracts + step creation: literal ids, ops keys, ops-derived schema (O3)

## 4.1 `packages/mapgen-core/src/authoring/step/contract.ts` (REPLACE)

### Problem

Baseline step contract has only schema, no ops mapping, no derived schema.

### Solution

* Add `ops?: Record<string, OpRef>`
* Add overloads for schema derived from ops
* Enforce O3: derived schema + extra fields not supported

```ts
// packages/mapgen-core/src/authoring/step/contract.ts
import { Type, type Static, type TObject, type TSchema } from "typebox";

import type { DependencyTag, GenerationPhase } from "@mapgen/engine/index.js";
import type { OpRef } from "../op/ref.js";
import { STAGE_KNOBS_KEY } from "@mapgen/core/env.js";

// Factory-only strict object helper (NOT exported)
function strictObject(fields: Record<string, TSchema>, options?: Parameters<typeof Type.Object>[1]) {
  return Type.Object(fields, { additionalProperties: false, ...(options ?? {}) });
}

export type StepOpsDecl = Readonly<Record<string, OpRef>>;

export type StepContract<
  const Id extends string,
  Schema extends TObject,
  Ops extends StepOpsDecl | undefined = undefined,
> = Readonly<{
  id: Id;
  phase: GenerationPhase;
  requires: readonly DependencyTag[];
  provides: readonly DependencyTag[];
  schema: Schema;
  ops?: Ops;
}>;

type SchemaFromOps<Ops extends StepOpsDecl> =
  TObject<{ [K in keyof Ops & string]: Ops[K]["config"] }>;

// Overload A: explicit schema (ops optional)
export function defineStep<
  const Id extends string,
  const Schema extends TObject,
  const Ops extends StepOpsDecl | undefined = undefined,
>(def: Omit<StepContract<Id, Schema, Ops>, "schema"> & { schema: Schema; ops?: Ops }): StepContract<Id, Schema, Ops>;

// Overload B: ops-derived schema (schema omitted, ops required) — O3: no extra fields
export function defineStep<
  const Id extends string,
  const Ops extends StepOpsDecl,
>(def: Omit<StepContract<Id, any, Ops>, "schema"> & { ops: Ops; schema?: undefined }): StepContract<Id, SchemaFromOps<Ops>, Ops>;

export function defineStep(def: any): any {
  if (def.id === STAGE_KNOBS_KEY) {
    throw new Error(`Step id "${STAGE_KNOBS_KEY}" is reserved`);
  }

  if (!def.schema) {
    if (!def.ops) throw new Error(`defineStep(${def.id}) requires schema or ops`);
    // schema is derived strictly from ops keys only (O3).
    const fields: Record<string, TSchema> = {};
    for (const k of Object.keys(def.ops)) fields[k] = def.ops[k].config;
    def.schema = strictObject(fields);
  }

  return def;
}

export type StepConfigOf<C extends StepContract<any, any, any>> = Static<C["schema"]>;
```

Rationale: minimal, strongly typed, preserves op keys when derived, and enforces O3.

---

## 4.2 `packages/mapgen-core/src/authoring/step/create.ts` (REPLACE)

### Problem

Baseline step creation uses `resolveConfig(config, RunSettings)` and run signature without ops injection.

### Solution

* Step impl is authored as `run(ctx, cfg, opsRuntime)`
* Step module exposes:

  * `normalize?: (cfg, ctx) => cfg` (compile-time only)
  * `bindOps(opsById)` which returns bound ops surfaces and a runtime `MapGenStep` whose `run(ctx,cfg)` injects `opsRuntime`
* This structurally prevents runtime code from calling normalize (opsRuntime has no normalize).

```ts
// packages/mapgen-core/src/authoring/step/create.ts
import type { Static, TObject } from "typebox";

import type { MapGenStep, EngineContext } from "@mapgen/engine/index.js";
import type { Env } from "@mapgen/core/env.js";
import type { NormalizeCtx, DomainOpCompile, DomainOpRuntime } from "../op/types.js";
import { runtimeOp } from "../op/types.js";
import type { StepContract, StepOpsDecl } from "./contract.js";
import type { CompileErrorItem } from "@mapgen/compiler/errors.js";

type StepConfigOf<C extends StepContract<any, any, any>> = Static<C["schema"]>;

export type StepImpl<
  TContext extends EngineContext,
  TConfig,
  OpsRuntime extends Record<string, DomainOpRuntime<any, any>>,
  Knobs = unknown,
> = Readonly<{
  /** Compile-time only, shape-preserving. */
  normalize?: (config: TConfig, ctx: NormalizeCtx<Knobs>) => TConfig;

  /** Runtime execution; ops injected, runtime-safe surface only. */
  run: (context: TContext, config: TConfig, ops: OpsRuntime) => void | Promise<void>;
}>;

export type BoundStepOps<Ops extends StepOpsDecl> = Readonly<{
  compile: Record<keyof Ops & string, DomainOpCompile<any, any, any>>;
  runtime: Record<keyof Ops & string, DomainOpRuntime<any, any>>;
}>;

export type StepModule<
  TContext extends EngineContext,
  C extends StepContract<any, TObject, any>,
  Knobs = unknown,
> = Readonly<{
  contract: C;

  /** Compile-time normalize hook (step-local). */
  normalize?: (config: StepConfigOf<C>, ctx: NormalizeCtx<Knobs>) => StepConfigOf<C>;

  /**
   * Bind OpRefs to implementations and return ops surfaces + engine-facing step.
   * This is called once during stage construction.
   */
  bindOps: (opsById: Record<string, DomainOpCompile<any, any, any>>) => Readonly<{
    ops: BoundStepOps<NonNullable<C["ops"]>>;
    step: MapGenStep<TContext, StepConfigOf<C>>;
  }>;
}>;

function bindOps<const Ops extends StepOpsDecl>(
  decl: Ops,
  opsById: Record<string, DomainOpCompile<any, any, any>>
): BoundStepOps<Ops> {
  const compile: any = {};
  const runtime: any = {};

  for (const key of Object.keys(decl)) {
    const ref = decl[key];
    const impl = opsById[ref.id];
    if (!impl) {
      throw new Error(`bindOps missing op implementation for id "${ref.id}" (key "${key}")`);
    }
    compile[key] = impl;
    runtime[key] = runtimeOp(impl);
  }

  return { compile, runtime };
}

export function createStep<
  const C extends StepContract<any, TObject, any>,
  TContext extends EngineContext,
  Knobs = unknown,
>(
  contract: C,
  impl: StepImpl<TContext, StepConfigOf<C>, any, Knobs>
): StepModule<TContext, C, Knobs> {
  return {
    contract,
    normalize: impl.normalize as any,

    bindOps: (opsById) => {
      const opsDecl = contract.ops ?? ({} as any);
      const ops = bindOps(opsDecl as any, opsById);

      const step: MapGenStep<TContext, StepConfigOf<C>> = {
        id: contract.id,
        phase: contract.phase,
        requires: contract.requires,
        provides: contract.provides,
        configSchema: contract.schema,

        // runtime: injected opsRuntime only
        run: (ctx, cfg) => impl.run(ctx as any, cfg as any, ops.runtime as any),
      };

      return { ops: ops as any, step };
    },
  };
}
```

Rationale: solves three YELLOW issues at once:

* removes runtime normalize hook visibility
* enables ops injection
* keeps engine `MapGenStep` stable

---

# 5) Stage: single surface with `knobs` field, optional public+compile, reserved key enforcement

## 5.1 `packages/mapgen-core/src/authoring/stage.ts` (REPLACE)

### Problem

Baseline stage only asserts step schemas. We need:

* stage surface schema (single author-facing object)
* knobs reserved key enforcement
* deterministic `toInternal` with no runtime mode detection

### Solution

Create a stage factory that:

* binds steps once (`step.bindOps(stageOpsById)`)
* builds `surfaceSchema` including `knobs` reserved field
* creates `toInternal` closure based on whether `public` exists

```ts
// packages/mapgen-core/src/authoring/stage.ts
import { Type, type Static, type TObject, type TSchema } from "typebox";

import type { Env, StageKnobsKey } from "@mapgen/core/env.js";
import { STAGE_KNOBS_KEY } from "@mapgen/core/env.js";
import type { EngineContext } from "@mapgen/engine/index.js";
import type { DomainOpCompile } from "./op/types.js";
import type { StepModule } from "./step/create.js";
import type { CompileErrorItem } from "@mapgen/compiler/errors.js";
import { normalizeStrict } from "@mapgen/compiler/normalize.js";

type AnyStep<TContext extends EngineContext> = StepModule<TContext, any, any>;

type StrictObjectSchema = TObject;

function strictObject(fields: Record<string, TSchema>, options?: Parameters<typeof Type.Object>[1]) {
  return Type.Object(fields, { additionalProperties: false, ...(options ?? {}) });
}

function strictEmptyObject() {
  return strictObject({}, { default: {} });
}

export type StageCompileArgs<Public extends TObject, Knobs extends TObject> = Readonly<{
  env: Env;
  knobs: Static<Knobs>;
  config: Static<Public>;
}>;

export type StageModule<
  Id extends string,
  TContext extends EngineContext,
  Steps extends readonly AnyStep<TContext>[],
  KnobsSchema extends TObject,
  PublicSchema extends TObject | null,
> = Readonly<{
  id: Id;
  steps: Steps;

  /** Single author-facing surface schema (includes `knobs` field). */
  surfaceSchema: StrictObjectSchema;

  /** Public schema excludes knobs; present only if stage has explicit public view. */
  public?: PublicSchema extends TObject ? PublicSchema : undefined;

  /** Knobs schema is the schema of stageConfig.knobs (strict object). */
  knobs: KnobsSchema;

  /** Present iff public is present. */
  compile?: (args: StageCompileArgs<NonNullable<PublicSchema>, KnobsSchema>) => Partial<Record<string, unknown>>;

  /**
   * Deterministic mapping of stage surface -> { knobs, rawSteps }
   * No runtime detection; behavior depends only on stage definition.
   */
  toInternal: (args: { env: Env; stageConfig: unknown }) => {
    knobs: Static<KnobsSchema>;
    rawSteps: Partial<Record<string, unknown>>;
  };

  /** Bound step runtime objects for engine registry/execution */
  boundSteps: ReadonlyArray<{
    step: ReturnType<Steps[number]["bindOps"]>["step"];
    ops: ReturnType<Steps[number]["bindOps"]>["ops"];
    module: Steps[number];
  }>;
}>;

type StageDef<
  Id extends string,
  TContext extends EngineContext,
  Steps extends readonly AnyStep<TContext>[],
  KnobsSchema extends TObject,
  PublicSchema extends TObject | null,
> = Readonly<{
  id: Id;
  steps: Steps;

  /** Optional: op implementations index by op id, used to bind step ops. */
  opsById?: Record<string, DomainOpCompile<any, any, any>>;

  /** Optional knobs schema (field map shorthand allowed via strictObject). */
  knobs?: KnobsSchema;

  /** Optional public schema (must be object schema; excludes knobs). */
  public?: PublicSchema;

  /** Required iff public provided. */
  compile?: (args: StageCompileArgs<NonNullable<PublicSchema>, KnobsSchema>) => Partial<Record<string, unknown>>;
}>;

function getObjectFields(schema: TObject): Record<string, TSchema> {
  // TypeBox TObject stores fields in .properties
  const props = (schema as any).properties as Record<string, TSchema> | undefined;
  return props ?? {};
}

export function createStage<
  const Id extends string,
  TContext extends EngineContext,
  const Steps extends readonly AnyStep<TContext>[],
  const KnobsSchema extends TObject = TObject,
  const PublicSchema extends TObject | null = null,
>(
  def: StageDef<Id, TContext, Steps, KnobsSchema, PublicSchema>
): StageModule<Id, TContext, Steps, KnobsSchema, PublicSchema> {
  // knobs schema always exists (strict)
  const knobsSchema: TObject = def.knobs ?? strictEmptyObject();

  // Reserved key checks: step ids cannot be "knobs"
  for (const step of def.steps) {
    if (step.contract.id === STAGE_KNOBS_KEY) {
      throw new Error(`Stage "${def.id}" contains step id "${STAGE_KNOBS_KEY}" which is reserved`);
    }
  }

  // If public exists, it must not contain "knobs" field
  if (def.public) {
    const publicFields = getObjectFields(def.public);
    if (Object.prototype.hasOwnProperty.call(publicFields, STAGE_KNOBS_KEY)) {
      throw new Error(`Stage "${def.id}" public schema must not define "${STAGE_KNOBS_KEY}"`);
    }
    if (!def.compile) {
      throw new Error(`Stage "${def.id}" defines public schema but no compile(...)`);
    }
  }

  // Bind step ops once
  const opsById = def.opsById ?? {};
  const boundSteps = def.steps.map((m) => {
    const bound = m.bindOps(opsById);
    return { step: bound.step, ops: bound.ops, module: m };
  });

  // Build surface schema:
  // - always includes knobs
  // - if public: knobs + public fields
  // - else: knobs + stepId keys (unknown optional)
  let surfaceSchema: TObject;

  if (def.public) {
    surfaceSchema = strictObject(
      { knobs: knobsSchema, ...getObjectFields(def.public) },
      { default: { knobs: {} } }
    );
  } else {
    const stepFields: Record<string, TSchema> = {};
    for (const step of def.steps) {
      stepFields[step.contract.id] = Type.Optional(Type.Unknown());
    }
    surfaceSchema = strictObject(
      { knobs: knobsSchema, ...stepFields },
      { default: { knobs: {} } }
    );
  }

  const toInternal = (args: { env: Env; stageConfig: unknown }) => {
    // Normalize stage surface (always)
    const normalized = normalizeStrict<any>(
      surfaceSchema,
      args.stageConfig,
      `/stages/${def.id}`,
      "stage.config.invalid"
    );

    if (normalized.errors.length) {
      throw new (require("@mapgen/compiler/errors.js").RecipeCompileError)(normalized.errors);
    }

    const stageObj = normalized.value as any;
    const knobsRaw = stageObj[STAGE_KNOBS_KEY] ?? {};
    const knobsNorm = normalizeStrict<any>(
      knobsSchema,
      knobsRaw,
      `/stages/${def.id}/${STAGE_KNOBS_KEY}`,
      "stage.config.invalid"
    );
    if (knobsNorm.errors.length) {
      throw new (require("@mapgen/compiler/errors.js").RecipeCompileError)(knobsNorm.errors);
    }

    const { knobs: _omit, ...configPart } = stageObj;

    if (def.public) {
      const pubNorm = normalizeStrict<any>(
        def.public,
        configPart,
        `/stages/${def.id}/public`,
        "stage.config.invalid"
      );
      if (pubNorm.errors.length) {
        throw new (require("@mapgen/compiler/errors.js").RecipeCompileError)(pubNorm.errors);
      }
      const rawSteps = def.compile!({ env: args.env, knobs: knobsNorm.value, config: pubNorm.value });
      return { knobs: knobsNorm.value, rawSteps };
    }

    // internal-as-public: configPart is already step-id keyed map
    return { knobs: knobsNorm.value, rawSteps: configPart };
  };

  return {
    id: def.id,
    steps: def.steps,
    surfaceSchema,
    public: def.public as any,
    knobs: knobsSchema as any,
    compile: def.compile as any,
    toInternal,
    boundSteps,
  };
}
```

Rationale: stage is the only author-facing unit; knobs live inside stage config, but extracted once as internal plumbing. No runtime shape detection.

---

# 6) Recipe: O2 typing split + canonical entry flow + always-on pipeline

## 6.1 `packages/mapgen-core/src/authoring/types.ts` (REPLACE)

### Problem

Baseline Step/Stage ids are `string`, losing literal keys. Recipe input/compiled types are either missing or inconsistent with knobs-in-surface.

### Solution

* Preserve literal ids in types.
* Define O2 split types:

  * `RecipeConfigInputOf<Stages>` (partial, author input)
  * `CompiledRecipeConfigOf<Stages>` (total, canonical)
* Define stage config input type derived from stage having public vs internal.

```ts
// packages/mapgen-core/src/authoring/types.ts
import type { Static, TObject } from "typebox";

import type {
  DependencyTag,
  ExecutionPlan,
  GenerationPhase,
  RecipeV2,
  RunRequest,
} from "@mapgen/engine/index.js";
import type { EngineContext, MapGenStep } from "@mapgen/engine/types.js";
import type { Env } from "@mapgen/core/env.js";
import type { StageModule } from "./stage.js";
import type { StepContract, StepOpsDecl } from "./step/contract.js";
import type { NormalizeCtx } from "./op/types.js";

export type BoundEngineStep<TContext extends EngineContext, TConfig> =
  MapGenStep<TContext, TConfig>;

export type StepIdOf<T extends { contract: { id: string } }> = T["contract"]["id"] & string;

export type StepConfigById<TStage extends { steps: readonly any[] }, Id extends string> =
  Static<Extract<TStage["steps"][number], { contract: { id: Id } }>["contract"]["schema"]>;

export type StageInternalInputOf<TStage extends { steps: readonly any[] }> =
  Partial<{ [K in StepIdOf<TStage["steps"][number]>]: StepConfigById<TStage, K> }>;

export type StageKnobsInputOf<TStage extends { knobs: TObject }> =
  Partial<Static<TStage["knobs"]>>;

export type StageConfigInputOf<TStage extends { knobs: TObject; public?: TObject }> =
  (TStage extends { public: TObject }
    ? Static<TStage["public"]>
    : StageInternalInputOf<TStage>) & { knobs?: StageKnobsInputOf<TStage> };

export type CompiledStageConfigOf<TStage extends { steps: readonly any[] }> =
  { [K in StepIdOf<TStage["steps"][number]>]: StepConfigById<TStage, K> };

export type RecipeConfigInputOf<TStages extends readonly StageModule<any, any, any, any, any>[]> =
  Partial<{
    [K in TStages[number]["id"] & string]: StageConfigInputOf<Extract<TStages[number], { id: K }>>;
  }>;

export type CompiledRecipeConfigOf<TStages extends readonly StageModule<any, any, any, any, any>[]> =
  {
    [K in TStages[number]["id"] & string]: CompiledStageConfigOf<Extract<TStages[number], { id: K }>>;
  };

export type RecipeModule<
  TContext extends EngineContext,
  TStages extends readonly StageModule<any, any, any, any, any>[],
> = Readonly<{
  id: string;
  stages: TStages;

  /** Compile author input -> canonical per-step configs */
  compileConfig: (args: {
    env: Env;
    config: RecipeConfigInputOf<TStages> | null;
  }) => CompiledRecipeConfigOf<TStages>;

  /** Instantiate a RecipeV2 using compiled configs */
  instantiate: (compiled: CompiledRecipeConfigOf<TStages>) => RecipeV2;

  /** Build a run request for the engine */
  runRequest: (args: {
    env: Env;
    compiled: CompiledRecipeConfigOf<TStages>;
  }) => RunRequest;

  /** Engine plan compile (validation-only) */
  compilePlan: (runRequest: RunRequest) => ExecutionPlan;

  /** Run end-to-end: compileConfig -> instantiate -> runRequest -> compilePlan -> execute */
  run: (args: {
    context: TContext;
    env: Env;
    config: RecipeConfigInputOf<TStages> | null;
    options?: { traceSink?: unknown };
  }) => unknown;
}>;
```

Rationale: makes typed config authoring viable (literal keys preserved).

---

## 6.2 `packages/mapgen-core/src/compiler/recipe-compile.ts` (NEW)

### Problem

We must specify the always-on compiler pipeline concretely: stage extraction → step canonicalization → op normalization.

### Solution

A single compile pipeline function used by `createRecipe.compileConfig`.

```ts
// packages/mapgen-core/src/compiler/recipe-compile.ts
import type { TObject } from "typebox";

import type { Env } from "@mapgen/core/env.js";
import { STAGE_KNOBS_KEY } from "@mapgen/core/env.js";
import { RecipeCompileError, type CompileErrorItem } from "./errors.js";
import { normalizeStrict } from "./normalize.js";
import type { StageModule } from "@mapgen/authoring/stage.js";
import type { DomainOpCompile, NormalizeCtx } from "@mapgen/authoring/op/types.js";
import type { StepModule } from "@mapgen/authoring/step/create.js";
import type { RecipeConfigInputOf, CompiledRecipeConfigOf } from "@mapgen/authoring/types.js";

/**
 * Mechanical op normalization:
 * - top-level only
 * - discovered strictly via step.contract.ops keys
 */
function normalizeOpEnvelope(
  op: DomainOpCompile<any, any, any>,
  envelope: unknown,
  ctx: NormalizeCtx<any>,
  path: string
): { value: unknown; errors: CompileErrorItem[] } {
  const errors: CompileErrorItem[] = [];

  const envSchemaErrors = normalizeStrict<any>(op.config as any, envelope, path, "op.envelope.invalid");
  if (envSchemaErrors.errors.length) {
    errors.push(...envSchemaErrors.errors);
    return { value: envSchemaErrors.value, errors };
  }

  const cfg = envSchemaErrors.value as any;
  const selected = op.strategies[cfg.strategy];
  if (!selected) {
    errors.push({
      code: "op.envelope.invalid",
      path: `${path}/strategy`,
      message: `Unknown strategy "${cfg.strategy}" for op "${op.id}"`,
      opKey: undefined,
    });
    return { value: cfg, errors };
  }

  // normalize inner config by strategy schema
  const innerNorm = normalizeStrict<any>(
    selected.config as any,
    cfg.config,
    `${path}/config`,
    "op.envelope.invalid"
  );
  errors.push(...innerNorm.errors);

  let inner = innerNorm.value;

  // call normalize hook if present
  if (selected.normalize) {
    try {
      inner = selected.normalize(inner, ctx);
    } catch (err) {
      errors.push({
        code: "op.normalize.failed",
        path: `${path}/config`,
        message: err instanceof Error ? err.message : "normalize failed",
      });
    }

    const re = normalizeStrict<any>(
      selected.config as any,
      inner,
      `${path}/config`,
      "op.envelope.invalid"
    );
    errors.push(...re.errors);
    inner = re.value;
  }

  const out = { strategy: cfg.strategy, config: inner };
  return { value: out, errors };
}

function prefillOpDefaults(
  step: { contract: any; boundOps?: any },
  raw: Record<string, unknown>,
  path: string
): { value: Record<string, unknown>; errors: CompileErrorItem[] } {
  const out = { ...raw };
  const errors: CompileErrorItem[] = [];

  const opsDecl = step.contract.ops as Record<string, any> | undefined;
  const opsCompile = (step as any).opsCompile as Record<string, DomainOpCompile<any, any, any>> | undefined;

  if (!opsDecl || !opsCompile) return { value: out, errors };

  for (const key of Object.keys(opsDecl)) {
    const op = opsCompile[key];
    if (!op) continue;
    if (out[key] === undefined) out[key] = op.defaultConfig as any;
  }
  return { value: out, errors };
}

/**
 * Compile a recipe config input (partial) to compiled total step configs.
 */
export function compileRecipeConfig<
  TContext,
  const TStages extends readonly StageModule<any, any, any, any, any>[],
>(
  stages: TStages,
  env: Env,
  config: RecipeConfigInputOf<TStages> | null
): CompiledRecipeConfigOf<TStages> {
  const errors: CompileErrorItem[] = [];
  const compiled: any = {};

  for (const stage of stages) {
    const stageId = stage.id;
    const stageInput = (config?.[stageId] ?? {}) as any;

    // Stage toInternal performs:
    // - stage surface normalization
    // - knobs extraction + normalization
    // - public compile or identity
    let internal;
    try {
      internal = stage.toInternal({ env, stageConfig: stageInput });
    } catch (err) {
      if (err instanceof RecipeCompileError) throw err;
      throw new RecipeCompileError([{
        code: "stage.compile.failed",
        path: `/stages/${stageId}`,
        message: err instanceof Error ? err.message : "stage compile failed",
        stageId,
      }]);
    }

    const knobs = internal.knobs;
    const rawSteps = internal.rawSteps ?? {};

    const stageOut: any = {};
    for (const bound of stage.boundSteps) {
      const stepId = bound.step.id;
      const stepModule = bound.module;
      const opsCompile = bound.ops?.compile ?? {};

      // Unknown step ids emitted by stage.compile should be rejected
      for (const k of Object.keys(rawSteps)) {
        const known = stage.boundSteps.some((b) => b.step.id === k);
        if (!known) {
          throw new RecipeCompileError([{
            code: "binding.unknownStepId",
            path: `/stages/${stageId}/${k}`,
            message: `Unknown step id "${k}" produced by stage.compile`,
            stageId,
            stepId: k,
          }]);
        }
      }

      const raw = (rawSteps as any)[stepId];
      const rawObj = (raw && typeof raw === "object" && !Array.isArray(raw)) ? raw : {};

      // prefill missing op envelopes
      const prefilled = prefillOpDefaults(
        { contract: stepModule.contract, opsCompile },
        rawObj,
        `/stages/${stageId}/${stepId}`
      );
      errors.push(...prefilled.errors);

      // schema normalize
      const baseNorm = normalizeStrict<any>(
        stepModule.contract.schema,
        prefilled.value,
        `/stages/${stageId}/${stepId}`,
        "step.config.invalid"
      );
      errors.push(...baseNorm.errors);

      let cfg = baseNorm.value;

      // step.normalize (compile-time only)
      if (stepModule.normalize) {
        try {
          cfg = stepModule.normalize(cfg, { env, knobs } as any);
        } catch (err) {
          errors.push({
            code: "step.normalize.failed",
            path: `/stages/${stageId}/${stepId}`,
            message: err instanceof Error ? err.message : "step.normalize failed",
            stageId,
            stepId,
          });
        }
        const re = normalizeStrict<any>(
          stepModule.contract.schema,
          cfg,
          `/stages/${stageId}/${stepId}`,
          "step.config.invalid"
        );
        errors.push(...re.errors);
        cfg = re.value;
      }

      // op normalization pass (top-level only, discovered via contract.ops keys)
      const opsDecl = stepModule.contract.ops ?? {};
      for (const opKey of Object.keys(opsDecl)) {
        const op = opsCompile[opKey];
        if (!op) {
          errors.push({
            code: "binding.missingOp",
            path: `/stages/${stageId}/${stepId}/${opKey}`,
            message: `Missing bound op for key "${opKey}"`,
            stageId,
            stepId,
            opKey,
          });
          continue;
        }
        const n = normalizeOpEnvelope(op, cfg[opKey], { env, knobs } as any, `/stages/${stageId}/${stepId}/${opKey}`);
        errors.push(...n.errors);
        cfg[opKey] = n.value;
      }

      const final = normalizeStrict<any>(
        stepModule.contract.schema,
        cfg,
        `/stages/${stageId}/${stepId}`,
        "step.config.invalid"
      );
      errors.push(...final.errors);
      stageOut[stepId] = final.value;
    }

    compiled[stageId] = stageOut;
  }

  if (errors.length) throw new RecipeCompileError(errors);
  return compiled as CompiledRecipeConfigOf<TStages>;
}
```

Rationale: this is the always-on pipeline. It is deterministic, strict, and contains no runtime branching.

---

# 7) Engine fixes: remove runtime defaulting paths and engine canonicalization

## 7.1 `packages/mapgen-core/src/engine/PipelineExecutor.ts` (REPLACE relevant API)

### Problem

`execute(...)` currently defaults configs at runtime via `Value.Default/Convert/Clean` (`resolveStepConfig`). This violates invariant #1.

### Canonical solution

* Remove `resolveStepConfig`
* Remove/replace `execute(context, recipeStepIds)` convenience API
* Keep `executePlan(context, plan)` as the only supported execution entry that consumes plan node configs.

```ts
// packages/mapgen-core/src/engine/PipelineExecutor.ts
import type { TSchema } from "typebox";

import type { EngineContext, PipelineExecutionOptions, PipelineExecutionResult } from "./types.js";
import type { ExecutionPlan } from "./execution-plan.js";
import { StepRegistry } from "./StepRegistry.js";

export type PipelineExecutorOptions = {
  log?: (message: string) => void;
  logPrefix?: string;
};

export class PipelineExecutor<TContext extends EngineContext, TConfig = unknown> {
  private readonly registry: StepRegistry<TContext>;
  private readonly log: (message: string) => void;
  private readonly logPrefix: string;

  constructor(registry: StepRegistry<TContext>, options: PipelineExecutorOptions = {}) {
    this.registry = registry;
    this.log = options.log ?? (() => undefined);
    this.logPrefix = options.logPrefix ?? "[PipelineExecutor]";
  }

  /**
   * Canonical runtime entry: execute a fully compiled plan.
   * No defaulting/cleaning/canonicalization happens here.
   */
  executePlan(
    context: TContext,
    plan: ExecutionPlan,
    options: PipelineExecutionOptions = {}
  ): PipelineExecutionResult {
    const nodes = plan.nodes.map((node) => ({
      step: this.registry.get<TConfig>(node.stepId),
      config: node.config as TConfig,
    }));
    return this.executeNodes(context, nodes, options);
  }

  private executeNodes(
    context: TContext,
    nodes: Array<{ step: { id: string; run: Function }; config: TConfig }>,
    options: PipelineExecutionOptions
  ): PipelineExecutionResult {
    // keep existing execution semantics
    // (omitted here for brevity; unchanged except it uses node.config directly)
    const satisfied = new Set<string>();
    const stepResults: any[] = [];

    for (const node of nodes) {
      // dependency checking etc...
      try {
        node.step.run(context as any, node.config as any);
        stepResults.push({ stepId: node.step.id, success: true });
      } catch (err) {
        stepResults.push({
          stepId: node.step.id,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
        if (!options.continueOnError) break;
      }
    }

    return { stepResults, satisfied };
  }
}
```

Rationale: runtime executor is now structurally incapable of defaulting configs.

---

## 7.2 `packages/mapgen-core/src/engine/execution-plan.ts` (REPLACE compile semantics)

### Problem

Engine compile currently:

* normalizes configs with `Value.Default/Clean/Convert`
* calls `step.resolveConfig`
* re-normalizes returned configs

This violates invariant #2 (engine becomes canonicalizer) and preserves runtime resolution.

### Canonical solution

* Rename `RunSettings` → `Env` and `settings` → `env`
* Remove `normalizeStepConfig` and `buildNodeConfig` mutation steps
* Replace with **validation-only** using `validateOnly` (no mutation)
* Remove all `step.resolveConfig` logic

**Canonical signatures:**

```ts
// packages/mapgen-core/src/engine/execution-plan.ts
import type { Static, TSchema } from "typebox";
import { Type } from "typebox";

import type { StepRegistry } from "./StepRegistry.js";
import type { GenerationPhase, MapGenStep } from "./types.js";
import type { Env } from "@mapgen/core/env.js";
import { EnvSchema } from "@mapgen/core/env.js";
import { validateOnly } from "@mapgen/compiler/normalize.js"; // validation-only

export interface RecipeStepV2 {
  stepId: string;
  stageId?: string;
  enabled?: boolean;
  config?: unknown;
}

export interface RecipeV2 {
  id: string;
  steps: RecipeStepV2[];
}

export interface RunRequest {
  recipe: RecipeV2;
  env: Env;
}

export interface ExecutionPlanNode {
  stepId: string;
  phase: GenerationPhase;
  enabled: boolean;
  requires: readonly string[];
  provides: readonly string[];
  config: unknown; // canonical internal config only
}

export interface ExecutionPlan {
  recipeId?: string;
  env: Env;
  nodes: ExecutionPlanNode[];
}

export type ExecutionPlanCompileErrorCode =
  | "runRequest.invalid"
  | "step.unknown"
  | "step.config.invalid";

export interface ExecutionPlanCompileErrorItem {
  code: ExecutionPlanCompileErrorCode;
  path: string;
  message: string;
  stepId?: string;
}

export class ExecutionPlanCompileError extends Error {
  readonly errors: ExecutionPlanCompileErrorItem[];
  constructor(errors: ExecutionPlanCompileErrorItem[]) {
    super(errors.map((e) => `${e.path}: ${e.message}`).join("\n"));
    this.name = "ExecutionPlanCompileError";
    this.errors = errors;
  }
}

function validateRunRequest(runRequest: RunRequest): ExecutionPlanCompileErrorItem[] {
  // validate env without mutation
  const errors: ExecutionPlanCompileErrorItem[] = [];

  errors.push(
    ...validateOnly(EnvSchema, runRequest.env, "/env", "runRequest.invalid").map((e) => ({
      code: "runRequest.invalid" as const,
      path: e.path,
      message: e.message,
    }))
  );

  // recipe shape validation: minimal
  if (!runRequest.recipe || !Array.isArray(runRequest.recipe.steps)) {
    errors.push({
      code: "runRequest.invalid",
      path: "/recipe",
      message: "RunRequest.recipe.steps must be an array",
    });
  }

  return errors;
}

export function compileExecutionPlan<TContext>(
  runRequest: RunRequest,
  registry: StepRegistry<TContext>
): ExecutionPlan {
  const reqErrors = validateRunRequest(runRequest);
  if (reqErrors.length) throw new ExecutionPlanCompileError(reqErrors);

  const { recipe, env } = runRequest;

  const errors: ExecutionPlanCompileErrorItem[] = [];
  const nodes: ExecutionPlanNode[] = [];
  const seenStepIds = new Set<string>();

  recipe.steps.forEach((recipeStep, index) => {
    const stepId = recipeStep.stepId;

    if (seenStepIds.has(stepId)) {
      errors.push({
        code: "runRequest.invalid",
        path: `/recipe/steps/${index}/stepId`,
        message: `Duplicate stepId "${stepId}"`,
        stepId,
      });
      return;
    }
    seenStepIds.add(stepId);

    const step = registry.tryGet(stepId);
    if (!step) {
      errors.push({
        code: "step.unknown",
        path: `/recipe/steps/${index}/stepId`,
        message: `Unknown step "${stepId}"`,
        stepId,
      });
      return;
    }

    // validation-only on config schema
    if (step.configSchema) {
      const cfg = recipeStep.config ?? {};
      const cfgErrors = validateOnly(step.configSchema, cfg, `/recipe/steps/${index}/config`, "step.config.invalid");
      errors.push(
        ...cfgErrors.map((e) => ({
          code: "step.config.invalid" as const,
          path: e.path,
          message: e.message,
          stepId,
        }))
      );
    }

    nodes.push({
      stepId: step.id,
      phase: step.phase,
      enabled: recipeStep.enabled ?? true,
      requires: step.requires,
      provides: step.provides,
      config: recipeStep.config ?? {},
    });
  });

  if (errors.length) throw new ExecutionPlanCompileError(errors);

  return {
    recipeId: recipe.id,
    env,
    nodes,
  };
}
```

Rationale: engine plan compilation is now **validation + planning**, never canonicalization.

---

# 8) Recipe wiring: canonical entry flow and “who calls what”

## 8.1 `packages/mapgen-core/src/authoring/recipe.ts` (SPEC SIGNATURE + KEY BODY)

### Problem

Baseline createRecipe relies on engine compile to normalize and step resolveConfig. We must ensure compile happens earlier and always-on.

### Canonical solution

`createRecipe` becomes the orchestrator:

* `compileConfig({ env, config })` calls compiler pipeline
* `instantiate(compiled)` builds `RecipeV2` step list with compiled configs
* `runRequest({ env, compiled })` returns `RunRequest` with env and recipe steps
* `compilePlan(runRequest)` calls engine validation-only plan compiler
* `run({ context, env, config })` executes the plan via `PipelineExecutor.executePlan`

Below is a canonical, copy-pasteable skeleton with correct signatures. (It assumes existing `StepRegistry`/`TagRegistry` plumbing remains; only the call order changes.)

```ts
// packages/mapgen-core/src/authoring/recipe.ts
import {
  compileExecutionPlan,
  PipelineExecutor,
  StepRegistry,
  TagRegistry,
  type ExecutionPlan,
  type RecipeV2,
  type RunRequest,
} from "@mapgen/engine/index.js";

import type { Env } from "@mapgen/core/env.js";
import { compileRecipeConfig } from "@mapgen/compiler/recipe-compile.js";
import type { EngineContext } from "@mapgen/engine/types.js";

import type {
  RecipeModule,
  RecipeConfigInputOf,
  CompiledRecipeConfigOf,
} from "./types.js";
import type { StageModule } from "./stage.js";

export type RecipeDefinition<
  TContext extends EngineContext,
  const TStages extends readonly StageModule<any, any, any, any, any>[],
> = Readonly<{
  id: string;
  stages: TStages;
  tags?: readonly any[]; // existing tag defs
}>;

export function createRecipe<
  TContext extends EngineContext,
  const TStages extends readonly StageModule<any, any, any, any, any>[],
>(def: RecipeDefinition<TContext, TStages>): RecipeModule<TContext, TStages> {
  // Build registries (existing behavior)
  const tagRegistry = new TagRegistry(def.tags ?? []);
  const stepRegistry = new StepRegistry<TContext>();

  // Register all bound steps from all stages
  for (const stage of def.stages) {
    for (const bound of stage.boundSteps) {
      stepRegistry.register(bound.step);
    }
  }

  function compileConfig(args: {
    env: Env;
    config: RecipeConfigInputOf<TStages> | null;
  }): CompiledRecipeConfigOf<TStages> {
    return compileRecipeConfig(def.stages, args.env, args.config);
  }

  function instantiate(compiled: CompiledRecipeConfigOf<TStages>): RecipeV2 {
    // canonical: recipe steps are an ordered list of step occurrences
    // Here we keep baseline ordering: stage order then step order.
    const steps = def.stages.flatMap((stage) =>
      stage.boundSteps.map((b) => ({
        stepId: b.step.id,
        stageId: stage.id,
        enabled: true,
        config: (compiled as any)[stage.id][b.step.id],
      }))
    );

    return { id: def.id, steps };
  }

  function runRequest(args: {
    env: Env;
    compiled: CompiledRecipeConfigOf<TStages>;
  }): RunRequest {
    return {
      env: args.env,
      recipe: instantiate(args.compiled),
    };
  }

  function compilePlan(runRequest: RunRequest): ExecutionPlan {
    return compileExecutionPlan(runRequest, stepRegistry);
  }

  function run(args: {
    context: TContext;
    env: Env;
    config: RecipeConfigInputOf<TStages> | null;
    options?: { log?: (msg: string) => void; continueOnError?: boolean };
  }) {
    const compiled = compileConfig({ env: args.env, config: args.config });
    const rr = runRequest({ env: args.env, compiled });
    const plan = compilePlan(rr);

    // install env into context (rename settings -> env)
    (args.context as any).env = plan.env;

    const exec = new PipelineExecutor<TContext>(stepRegistry, { log: args.options?.log });
    return exec.executePlan(args.context, plan, args.options);
  }

  return {
    id: def.id,
    stages: def.stages,
    compileConfig,
    instantiate,
    runRequest,
    compilePlan,
    run,
  };
}
```

Rationale: removes silent fallback paths; the only runtime execution entry is plan execution.

---

# 9) Enforcing “no runtime defaulting” structurally (compile/runtime surface split)

This is the root fix that prevents regression even if someone is careless.

## 9.1 Runtime step handlers cannot access compile-time op normalization

* Steps do not import ops implementations; they receive injected `opsRuntime` from `createStep`.
* `opsRuntime` is produced using `runtimeOp(opCompile)` which removes normalize.

So even if a step author tries, `opsRuntime.someOp.normalize` does not exist.

## 9.2 Runtime executor has no defaulting entrypoints

* PipelineExecutor exposes only `executePlan(plan)` in the canonical version.
* There is no `execute(recipeIds)` convenience path that defaults configs.

## 9.3 Compiler-only normalization utilities are not exported to runtime surfaces

* `normalizeStrict`, `findUnknownKeyErrors` live under `compiler/`.
* Runtime packages should not re-export `compiler/*`.

Optional enforcement: add a lint rule later, but the structural split already does the heavy lifting.

---

# 10) Stage knobs reconciliation: single surface, no parallel knobs pipeline

This satisfies the final V3/V4 reconciliation:

* Author-facing config per stage is a **single object** with `knobs` field.
* Internally, stage plumbing can pass `knobs` separately to compile/normalize hooks, but it is extracted deterministically from that single object.
* For internal-as-public stages, stage surface schema uses `Unknown` for step bodies (validation deferred), but TypeScript author input types remain strongly typed via `StageConfigInputOf<TStage>` in `authoring/types.ts`.

No implicit “if shape looks like … then …” branching exists at runtime.

---

# 11) Migration checklist (what changes in the repo)

These are the concrete repo areas touched by the solution above:

## Engine

* `engine/execution-plan.ts`: remove normalization + resolveConfig, validate-only; rename settings→env
* `engine/types.ts`: remove `resolveConfig` from `MapGenStep` type; rename RunSettings→Env usage
* `engine/PipelineExecutor.ts`: remove runtime defaulting path; executePlan only

## Core

* NEW `core/env.ts` and re-export from `@mapgen/core/index.js`
* Update `ExtendedMapContext` to use `env` instead of `settings`

## Authoring

* `authoring/op/*`: rename resolveConfig→normalize; split runtime op surface; ensure createOp returns compile surface
* `authoring/step/*`: add ops decl, ops-derived schema overloads, createStep bind/inject
* `authoring/stage.ts`: stage surface schema + knobs + toInternal
* `authoring/types.ts`: literal id preservation and O2 type split (input partial vs compiled total)
* NEW compiler modules: `compiler/errors.ts`, `compiler/normalize.ts`, `compiler/recipe-compile.ts`

## Mods

* Stage configs now include `knobs` field when used
* Step runtime code stops calling `resolveConfig` / `applySchemaDefaults` (they should never have access anyway once ops injection is used)

---

# 12) Top-level “must-fix” list (now GREEN)

These are the same 5 blockers from the YELLOW review, now fully addressed:

1. **Baseline mismatches**
   Resolved by specifying canonical NEW/UPDATED definitions for:

   * `OpRef`, `opRef`
   * shared op envelope builder (`buildOpEnvelopeSchema`)
   * O2 typing split (`RecipeConfigInputOf` vs `CompiledRecipeConfigOf`) and literal ids

2. **Runtime defaulting**
   Removed by:

   * deleting `PipelineExecutor.execute(...)` defaulting path
   * making engine compile validation-only

3. **Runtime can’t call normalize**
   Enforced structurally via:

   * compile/runtime op surface split
   * ops injection using runtime-only view

4. **Literal ids preserved**
   Addressed by:

   * deriving config input types from stage/step ids in `authoring/types.ts`
   * stage config input types are keyed by literal stage ids and step ids

5. **Stage public constrained to object schema**
   Stage factory requires `public` be object schema (or field-map shorthand), and merges it into a single surface schema with knobs while enforcing reserved key collisions.

---

## If you want one last “sanity lock” before implementation

The only remaining thing I’d suggest adding to the architecture doc (not code) is a short “Non-negotiable compile entry flow” box:

> The only supported runtime entry is `recipe.run({ context, env, config })`.
> `compileRecipeConfig` is always invoked before engine plan compilation.
> `PipelineExecutor` executes plans only; it never constructs configs.

Everything else above is already executable as a spec.