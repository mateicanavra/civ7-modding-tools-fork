Understood. I’m going to restate the full proposal end‑to‑end (canonical spec + the core variations, fully illustrated), but with your two updates applied:

1. **Runtime channel is `env`** (not `runtime`). I also checked the current baseline: there is **no existing `runtime` property** on the core execution context; the runtime-ish object you have today is called **`settings`** (and it is overloaded). So switching our design vocabulary to `env` is clean and removes ambiguity.
2. **We proceed with my recommended direction**: keep config shapes stable; move all “resolution” to compile-time composition; treat “public→internal” as an explicit *facade transform* (not “resolution”); and keep runtime “normalization” limited to value derivation (never shape-changing).

I’m also grounding this in the compiled code representation you provided. 

---

# Decision log

### D1 — Runtime becomes `env`

**Decision:** Standardize on **`env`** for all runtime/game-provided parameters (seed, map size, player/civ info, wrap, etc.).
**Why:** The current name `settings` is overloaded and makes it too easy to conflate “player/runtime params” with “author knobs”. `env` is clearer and composes better.

### D2 — “Knobs/settings” are compile-time authoring inputs, not runtime

**Decision:** Introduce **`knobs`** as the compile-time “settings surface” that can affect multiple ops/steps.
**Why:** This creates a strict boundary: **author knobs** are part of map authoring config; **env** is runtime.

### D3 — No config shape resolution at runtime

**Decision:** Internal config shapes are stable. The only permitted shape transformation is **public→internal facade translation**, which is explicit and deterministic in the authoring compiler.
**Why:** This preserves composability and avoids the “mysterious resolved config” anti-pattern.

### D4 — Move config compilation out of the engine

**Decision:** Engine does **not** call step/op “resolveConfig”. The recipe compiler produces a compiled run payload containing validated, defaulted, normalized **internal step configs**.
**Why:** Removes engine↔domain coupling; makes authoring composition the source of truth.

### D5 — Mechanical op normalization (no per-step forwarding boilerplate)

**Decision:** Steps declare the ops they embed, and the compiler applies op-level normalization automatically.
**Why:** Removes repetitive step `resolveConfig` plumbing.

### D6 — Rename semantics: “resolveConfig” → “normalizeConfig”

**Decision:** Treat “resolution” as misleading; normalization is value defaulting/derivation *within the same schema*.
**Why:** Aligns with your “single shape for composability” principle.

---

# Canonical architecture proposal (standalone target spec)

This is the target architecture “as if it already existed”, with explicit boundaries, types, and compilation/execution flow.

## 1) Core model: four channels, each with a distinct job

There are exactly four “inputs” that influence behavior:

1. **`env` (runtime)**
   Game/player-provided parameters known only at run time.
   Examples: map dimensions, map size id, player count, civ selections, seed, wrap flags, etc.

2. **`knobs` (authoring / compile-time)**
   Cross-cutting tunables that affect multiple operations and/or steps.
   These are *authored* (modder/recipe author) and are part of the public map config schema.

3. **`config` (per-step / per-op static config)**
   Strategy selection and its specific config payload. Stable shape.

4. **`inputs` (runtime data dependencies)**
   The actual data a step/op consumes (artifacts/resources) produced by prior steps.

### Critical invariants

* **No runtime “config resolution”**. Runtime may compute *values* from `{env, inputs, config}`, but it must not reshape config.
* **All schema defaulting and knob-driven derivation happens in the authoring compiler.**
* **The engine never imports domains or contracts.** The engine executes compiled steps and validates dependencies.

---

## 2) Layers and dependency direction

### Layer A — Domain (pure contract + pure implementation; no engine imports)

**Domain exports two routers:**

* `domain/contracts` (pure, no runtime code):

  * domain id
  * domain knobs schema (the *compile-time* settings surface)
  * op contracts (input/output/config schemas and metadata)
* `domain/ops` (runtime implementations):

  * `createOp(contract, strategies)` results

**Domain MUST NOT:**

* import the pipeline/engine plan,
* import engine `RunSettings`,
* know about recipes/stages.

---

### Layer B — Operations and strategies (contract-first)

**Op contract** defines schemas and identifiers.
**Strategy** provides:

* `normalizeConfig(config, knobsSlice)` (compile-time value normalization, optional)
* `run(input, config)` (runtime algorithm; config assumed already normalized)

**Key semantic change:** strategy normalization no longer takes `settings`/`RunSettings`; it takes a **domain knob slice** (or an op-specific knob slice if you later decide to subset).

---

### Layer C — Steps (runtime nodes; config compilation is mechanical)

A step module has:

* `contract` (schemas + requires/provides + embedded op bindings)
* `compileConfig(publicStepConfig, compileCtx)`
  Produces **internal step config**:

  * apply defaults to public
  * optional public→internal facade transform
  * apply defaults to internal
  * mechanically call op.normalizeConfig for each bound op (using knob slices)
* `run(ctx, internalConfig)`
  Uses:

  * `ctx.env` (runtime)
  * `ctx.artifacts/resources` (inputs)
  * `internalConfig` (stable shape)

Steps do not “resolve config” at runtime.

---

### Layer D — Stages and recipes (routers/composers; own schema)

**Stage** is an optional composition unit:

* groups steps
* optionally defines **public views** (facades) and transforms
* optionally defines stage knobs (recipe-owned knobs namespaces)

**Recipe** is the owner of the **public map config schema** and the compiler:

* composes domains + stages/steps into one public schema
* compiles public config → internal per-step config
* produces a **CompiledRun** payload for the engine
* the engine builds the execution plan and runs it

---

## 3) Canonical type surfaces

Below are full shapes (not “minimal”), with the updated `env` naming.

### 3.1 Schema normalization helper (single canonical utility)

```ts
import { Value } from "typebox/value";
import type { Static, TSchema } from "typebox";

/**
 * Canonical, deterministic schema normalization:
 * Convert → Clean → Default
 *
 * This is the only place "defaulting" happens.
 */
export function normalizeBySchema<T extends TSchema>(schema: T, input: unknown): Static<T> {
  const converted = Value.Convert(schema, input);
  const cleaned = Value.Clean(schema, converted);
  const defaulted = Value.Default(schema, cleaned);
  return defaulted as Static<T>;
}
```

---

### 3.2 Runtime env contract (engine/game-facing)

This is intentionally “engine‑agnostic Civ7 runtime env”, even if populated by the Civ7 adapter.

```ts
import { Type, type Static } from "typebox";

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

    // Optional / expandable runtime context
    players: Type.Optional(Type.Array(Type.Object({ id: Type.Number(), civId: Type.String() }))),
    mapSizeId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
    metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown(), { default: {} })),

    // Observability controls are runtime options; ok on env or as separate exec options
    trace: Type.Optional(
      Type.Object(
        {
          enabled: Type.Optional(Type.Boolean()),
          steps: Type.Optional(Type.Record(Type.String(), Type.Union([
            Type.Literal("off"),
            Type.Literal("basic"),
            Type.Literal("verbose"),
          ]), { default: {} })),
        },
        { additionalProperties: false, default: {} }
      )
    ),
  },
  { additionalProperties: false }
);

export type Env = Static<typeof EnvSchema>;
```

**Important:** `EnvSchema` is the place where “Civ7 official runtime shapes/settings” land, *normalized once*, and then passed down as `ctx.env`.

---

### 3.3 Knobs (authoring settings) contract model

Knobs are *recipe-owned*, but **domain-owned knob schemas** compose into it.

Canonical shape (explicit namespacing):

```ts
/**
 * A recipe-defined knobs object.
 * - global: cross-cutting knobs (rare; optional)
 * - domains: domainId → domain knobs
 * - recipe: recipe-specific knobs
 */
export type KnobsShape = Readonly<{
  global: Record<string, unknown>;
  domains: Record<string, unknown>;
  recipe: Record<string, unknown>;
}>;
```

A given recipe will define a concrete schema and type for knobs:

```ts
import { Type, type Static, type TObject } from "typebox";

export function defineKnobsSchema(args: {
  global: TObject;
  domains: Record<string, TObject>;
  recipe: TObject;
}) {
  return Type.Object(
    {
      global: args.global,
      domains: Type.Object(args.domains, { additionalProperties: false, default: {} }),
      recipe: args.recipe,
    },
    { additionalProperties: false, default: {} }
  );
}

export type KnobsOf<TKnobsSchema extends TObject> = Static<TKnobsSchema>;
```

---

### 3.4 Op contracts and strategy normalization (compile-time knobs, not env)

#### Strategy type

```ts
import type { Static, TSchema } from "typebox";

type NoInfer<T> = [T][T extends any ? 0 : never];

export type OpStrategy<ConfigSchema extends TSchema, Input, Output, Knobs = unknown> = Readonly<{
  config: ConfigSchema;

  /**
   * Compile-time value normalization ONLY.
   * Must return the same schema type (shape stable).
   */
  normalizeConfig?: (
    config: Static<NoInfer<ConfigSchema>>,
    knobs: Knobs
  ) => Static<NoInfer<ConfigSchema>>;

  /** Runtime execution. Config is assumed normalized already. */
  run: (input: Input, config: Static<NoInfer<ConfigSchema>>) => Output;
}>;
```

#### Op implementation surface

```ts
export type StrategySelection<Strategies extends Record<string, { config: TSchema }>> = {
  [K in keyof Strategies & string]: Readonly<{
    strategy: K;
    config: Static<Strategies[K]["config"]>;
  }>;
}[keyof Strategies & string];

export type DomainOp<InputSchema extends TSchema, OutputSchema extends TSchema, Strategies extends Record<string, any>, Knobs> =
  Readonly<{
    id: string;
    kind: string;
    input: InputSchema;
    output: OutputSchema;
    strategies: Strategies;
    config: TSchema;        // envelope union schema
    defaultConfig: unknown; // envelope default value
    normalizeConfig: (cfg: StrategySelection<Strategies>, knobs: Knobs) => StrategySelection<Strategies>;
    run: (input: Static<InputSchema>, cfg: StrategySelection<Strategies>) => Static<OutputSchema>;
  }>;
```

**Key change from baseline:** `normalizeConfig` takes **knobs**, not engine `RunSettings` / runtime.

---

### 3.5 Step contracts (declarative) and step modules (compile + run)

#### Step contract

A step contract declares:

* public schema (author-facing)
* internal schema (runtime-facing)
* op bindings list (for mechanical normalization)

```ts
import type { Static, TObject } from "typebox";
import type { OpContract } from "./op-contract"; // pure contract type

export type StepOpBinding<C extends OpContract<any, any, any, any, any>> = Readonly<{
  key: string;             // key under internalConfig.ops.<key>
  contract: C;             // op contract (pure)
  knobsDomain: string;     // which domain knob slice to pass
}>;

export type StepContract<
  StepId extends string,
  Phase extends string,
  PublicSchema extends TObject,
  InternalSchema extends TObject,
  Ops extends ReadonlyArray<StepOpBinding<any>>,
> = Readonly<{
  id: StepId;
  phase: Phase;
  requires: readonly string[];
  provides: readonly string[];

  publicSchema: PublicSchema;
  internalSchema: InternalSchema;
  ops: Ops;

  meta?: Readonly<{ title?: string; description?: string }>;
}>;

export type StepPublicConfigOf<C extends StepContract<any, any, any, any, any>> = Static<C["publicSchema"]>;
export type StepInternalConfigOf<C extends StepContract<any, any, any, any, any>> = Static<C["internalSchema"]>;
```

#### Step contract helper

```ts
export function defineStep<
  const StepId extends string,
  const Phase extends string,
  const PublicSchema extends TObject,
  const InternalSchema extends TObject = PublicSchema,
  const Ops extends ReadonlyArray<StepOpBinding<any>> = readonly [],
>(def: {
  id: StepId;
  phase: Phase;
  requires: readonly string[];
  provides: readonly string[];
  publicSchema: PublicSchema;
  internalSchema?: InternalSchema;
  ops?: Ops;
  meta?: StepContract<StepId, Phase, PublicSchema, InternalSchema, Ops>["meta"];
}): StepContract<StepId, Phase, PublicSchema, InternalSchema, Ops> {
  return {
    ...def,
    internalSchema: (def.internalSchema ?? def.publicSchema) as InternalSchema,
    ops: (def.ops ?? ([] as unknown as Ops)) as Ops,
  };
}
```

#### Step module (compile + run)

```ts
import type { Env } from "./env";
import type { KnobsShape } from "./knobs";
import { normalizeBySchema } from "./schema-normalize";

export type StepContext<TArtifacts> = Readonly<{
  env: Env;                 // runtime, game-provided
  artifacts: TArtifacts;    // resource store / artifact store
  trace: unknown;           // whatever tracing type you have
  adapter: unknown;         // civ7 adapter surface (if steps need it)
}>;

export type StepModule<
  C extends StepContract<any, any, any, any, any>,
  TArtifacts,
  TDomainOps extends Record<string, any>,
> = Readonly<{
  contract: C;

  /**
   * Runtime op implementations keyed by binding key.
   * Used for compile-time normalizeConfig and runtime run.
   */
  ops: TDomainOps;

  /**
   * Optional facade translation: public config -> internal config.
   * This is the ONLY allowed place for config shape transformation.
   */
  expandConfig?: (publicCfg: StepPublicConfigOf<C>, knobs: KnobsShape) => unknown;

  /**
   * Compile-time step compilation:
   * - normalize defaults on public schema
   * - (optional) expand public -> internal
   * - normalize defaults on internal schema
   * - mechanically apply op.normalizeConfig for each bound op
   */
  compileConfig: (publicCfg: StepPublicConfigOf<C>, knobs: KnobsShape) => StepInternalConfigOf<C>;

  /** Runtime execution */
  run: (ctx: StepContext<TArtifacts>, cfg: StepInternalConfigOf<C>) => void | Promise<void>;
}>;

export function createStep<
  C extends StepContract<any, any, any, any, any>,
  TArtifacts,
  TDomainOps extends Record<string, { normalizeConfig: Function }>,
>(
  contract: C,
  impl: {
    ops: TDomainOps;
    run: StepModule<C, TArtifacts, TDomainOps>["run"];
    expandConfig?: StepModule<C, TArtifacts, TDomainOps>["expandConfig"];
  }
): StepModule<C, TArtifacts, TDomainOps> {
  function compileConfig(publicCfg: StepPublicConfigOf<C>, knobs: KnobsShape): StepInternalConfigOf<C> {
    const publicNorm = normalizeBySchema(contract.publicSchema, publicCfg);

    const internalCandidate = impl.expandConfig ? impl.expandConfig(publicNorm, knobs) : publicNorm;

    const internalNorm = normalizeBySchema(contract.internalSchema, internalCandidate) as any;

    // Mechanical op normalization (no per-step forwarding)
    if (contract.ops?.length) {
      internalNorm.ops = internalNorm.ops ?? {};
      for (const binding of contract.ops) {
        const opImpl = impl.ops[binding.key];
        if (!opImpl) throw new Error(`Step ${contract.id} missing op impl for '${binding.key}'`);

        const domainKnobs = knobs.domains[binding.knobsDomain] ?? {};
        internalNorm.ops[binding.key] = opImpl.normalizeConfig(internalNorm.ops[binding.key], domainKnobs);
      }
    }

    return internalNorm as StepInternalConfigOf<C>;
  }

  return { contract, ops: impl.ops, expandConfig: impl.expandConfig, compileConfig, run: impl.run };
}
```

**This is the central win:** step authors stop writing `resolveConfig` forwarding glue.

---

## 4) Engine boundary: compiled runs only

### 4.1 What the recipe compiler hands the engine

The engine should receive a “compiled run payload” where:

* step configs are already internal + normalized,
* the engine only schedules and executes.

```ts
export type CompiledRun = Readonly<{
  recipeId: string;
  env: Env;                     // runtime
  steps: ReadonlyArray<{
    id: string;
    phase: string;
    requires: readonly string[];
    provides: readonly string[];
    config: unknown;            // internal, already compiled
  }>;
}>;
```

### 4.2 What the engine does with it

* Build execution plan graph / ordering policy
* Execute steps in chosen order
* Validate requires/provides

No config compilation. No calling step normalization hooks.

---

## 5) Recipe compiler: owns composition and compilation

A recipe is a router over:

* knobs schema
* pipeline schema (stages/steps)
* compilation transforms (public→internal + op normalization)
* step list

### 5.1 Public map config shape

Canonical (explicit, composable):

```ts
type PublicMapConfig = {
  knobs: {
    global: { ... };
    domains: { ecology: { ... }, morphology: { ... } };
    recipe: { ... };
  };

  pipeline: {
    // stage namespace
    ecology: {
      biomes: { ... public schema ... };
      featuresPlan: { ... public schema ... };
    };
    foundation: {
      plates: { ... };
    };
  };
};
```

### 5.2 Recipe compile algorithm

1. Normalize `PublicMapConfig` using recipe’s `publicSchema`
2. Normalize knobs once (domain knobs via domain schemas)
3. For each step module:

   * read its public config from `pipeline.stage.step`
   * call `step.compileConfig(publicStepCfg, normalizedKnobs)`
4. Emit `CompiledRun` with internal step configs

### 5.3 Why this satisfies “composition is resolution”

* The recipe’s schema and config object are authored compositionally.
* The compilation phase is deterministic and “pure” (defaults + transforms + normalizeConfig).
* The runtime engine never resolves config.

---

# Core variations (fully specified)

You asked to “show all core variations in full”. These are the ones that materially change the architecture, not cosmetic differences.

## Variation A — Internal-only authoring (advanced mode)

**Public schema == internal schema.**
No facade translation. Modders author op envelopes directly.

* Step contract: `publicSchema` == `internalSchema`
* Step module: no `expandConfig`
* Recipe: no stage view transforms

**Pros:** simplest; least code; easiest to migrate
**Cons:** exposes `{strategy, config}` envelopes and internal wiring

This is acceptable for *internal recipe authors*, not ideal for external modders.

---

## Variation B — Step-owned facade (canonical “minimal clean-cut”)

**Public schema differs from internal schema**, but translation is local to the step.

* Step contract declares both `publicSchema` and `internalSchema`
* Step module implements `expandConfig(public, knobs)`
  (and then mechanical op normalization occurs)

**Pros:**

* hides envelopes cleanly per step
* minimal structural change beyond config compilation relocation
* easy incremental adoption step-by-step, but still a clean cut if you migrate all steps at once

**Cons:**

* facade logic distributed across steps (but explicit)

This is the best “progressive enhancement” without a broader stage/view system.

---

## Variation C — Stage-owned public views (modder-first, more centralized)

Public schema is defined by stage/recipe; steps define internal schema only.

* Step contract has **only internal schema**
* Stage defines:

  * `publicSchema` for each step config
  * `toInternal(publicStepCfg, knobs)` transform
* Recipe composes stage public schemas into the public map config

**Pros:**

* strongest boundary: steps are purely internal runtime nodes
* public UX can be curated holistically
* easier to enforce “no internal ids/envelopes leak”

**Cons:**

* more machinery up front (view registry + transforms)
* more work to migrate in one shot

If your top priority is “modder config must never mention envelopes/internal ids”, this becomes the canonical endpoint. If your top priority is “fix config compilation and engine/domain decoupling now”, Variation B is the right first landing.

Given your latest “go with your rec sure”, the canonical path I’m recommending remains:
**Variation B now, with a clean path to Variation C later if needed.**

---

# Illustrative examples (end-to-end)

Two examples:

1. **Simple**: single op, single strategy, no facade
2. **Full**: multiple ops + multiple strategies + shared domain knobs + facade + env influence at runtime (value derivation only)

## Example 1 — Simple end-to-end (single op, no facade)

### A) Domain: `noise` operation

#### `domain/noise/contracts.ts` (pure)

```ts
import { Type } from "typebox";
import { defineOpContract } from "@mapgen/authoring/op";

export const NoiseKnobsSchema = Type.Object(
  {
    amplitudeScale: Type.Optional(Type.Number({ default: 1.0 })),
  },
  { additionalProperties: false, default: {} }
);

const NoiseConfigSchema = Type.Object(
  {
    frequency: Type.Optional(Type.Number({ default: 0.01 })),
    octaves: Type.Optional(Type.Number({ default: 4 })),
  },
  { additionalProperties: false, default: {} }
);

export const NoiseOpContract = defineOpContract({
  kind: "compute",
  id: "noise/generate",
  input: Type.Object(
    {
      width: Type.Number(),
      height: Type.Number(),
    },
    { additionalProperties: false }
  ),
  output: Type.Object(
    {
      field: Type.Any(), // pretend TypedArray schema
    },
    { additionalProperties: false }
  ),
  strategies: {
    default: NoiseConfigSchema,
  },
});

export const noiseContracts = {
  id: "noise",
  knobsSchema: NoiseKnobsSchema,
  ops: {
    generate: NoiseOpContract,
  },
} as const;
```

#### `domain/noise/ops.ts` (runtime)

```ts
import { createOp, createStrategy, normalizeBySchema } from "@mapgen/authoring/op-runtime";
import { NoiseOpContract } from "./contracts";

export const noiseOps = {
  generate: createOp(NoiseOpContract, {
    strategies: {
      default: createStrategy(NoiseOpContract, "default", {
        normalizeConfig: (cfg, knobs) => {
          // normalize values, shape stable
          const base = normalizeBySchema(NoiseOpContract.strategies.default, cfg);
          // apply knob scaling into config values if you want
          // (or keep knobs only for runtime use; your choice)
          return { ...base, frequency: base.frequency * ((knobs as any).amplitudeScale ?? 1.0) };
        },
        run: (input, config) => {
          // config assumed normalized (no resolve here)
          return { field: new Float32Array(input.width * input.height) };
        },
      }),
    },
  }),
} as const;
```

### B) Step: `foundation:noiseField`

#### `steps/foundation/noiseField/contract.ts`

```ts
import { Type } from "typebox";
import { defineStep } from "@mapgen/authoring/step";
import { opConfigFieldFromContract } from "@mapgen/authoring/step/op-fields";
import { noiseContracts } from "@mapgen/domain/noise/contracts";

export const NoiseFieldStepContract = defineStep({
  id: "foundation:noiseField",
  phase: "foundation",
  requires: [],
  provides: ["artifact:noiseField"],

  ops: [{ key: "noise", contract: noiseContracts.ops.generate, knobsDomain: noiseContracts.id }] as const,

  publicSchema: Type.Object(
    {
      ops: Type.Object(
        {
          noise: opConfigFieldFromContract(noiseContracts.ops.generate),
        },
        { additionalProperties: false, default: {} }
      ),
    },
    { additionalProperties: false, default: {} }
  ),
});
```

#### `steps/foundation/noiseField/index.ts`

```ts
import { createStep } from "@mapgen/authoring/step";
import { NoiseFieldStepContract } from "./contract";
import { noiseOps } from "@mapgen/domain/noise/ops";

export const noiseFieldStep = createStep(NoiseFieldStepContract, {
  ops: { noise: noiseOps.generate },

  run: (ctx, cfg) => {
    const { width, height } = ctx.env.dimensions;
    const out = noiseOps.generate.run({ width, height }, cfg.ops.noise);
    ctx.artifacts.set("artifact:noiseField", out.field);
  },
});
```

### C) Recipe: composes knobs + pipeline + compiles to `CompiledRun`

```ts
import { Type } from "typebox";
import { defineKnobsSchema, normalizeBySchema } from "@mapgen/authoring/recipe";
import { noiseContracts } from "@mapgen/domain/noise/contracts";
import { noiseFieldStep } from "./steps/foundation/noiseField";

const KnobsSchema = defineKnobsSchema({
  global: Type.Object({}, { additionalProperties: false, default: {} }),
  domains: {
    [noiseContracts.id]: noiseContracts.knobsSchema,
  },
  recipe: Type.Object({}, { additionalProperties: false, default: {} }),
});

const PublicSchema = Type.Object(
  {
    knobs: KnobsSchema,
    pipeline: Type.Object(
      {
        foundation: Type.Object(
          {
            noiseField: noiseFieldStep.contract.publicSchema,
          },
          { additionalProperties: false, default: {} }
        ),
      },
      { additionalProperties: false, default: {} }
    ),
  },
  { additionalProperties: false, default: {} }
);

export const demoRecipe = {
  id: "demo",
  publicSchema: PublicSchema,

  steps: [noiseFieldStep],

  compile: (env, publicConfig) => {
    const normalized = normalizeBySchema(PublicSchema, publicConfig);
    const knobs = normalizeBySchema(KnobsSchema, normalized.knobs);

    const internalNoiseCfg = noiseFieldStep.compileConfig(normalized.pipeline.foundation.noiseField, knobs);

    return {
      recipeId: "demo",
      env,
      steps: [
        {
          id: "demo.foundation.foundation:noiseField", // whatever your full id policy is
          phase: "foundation",
          requires: [],
          provides: ["artifact:noiseField"],
          config: internalNoiseCfg,
        },
      ],
    };
  },
} as const;
```

### D) Engine executes `CompiledRun` (no config compilation)

* Engine schedules nodes
* Runs `noiseFieldStep.run(ctx, internalCfg)`
  No resolve hooks. No schema “resolution”.

---

## Example 2 — Full end-to-end (multi-op, strategies, knobs, facade, env-driven value derivation)

We’ll model a realistic ecology stage that:

* uses multiple ops
* exposes a simple public config (“quality” + “density”)
* compiles to internal op envelopes and configs
* at runtime derives values based on env.map size (without changing config shape)

### A) Domain: `ecology`

#### Domain knobs (compile-time settings affecting multiple ops)

```ts
export const EcologyKnobsSchema = Type.Object(
  {
    featureDensityScale: Type.Optional(Type.Number({ default: 1.0, minimum: 0 })),
    reefWarmThresholdBias: Type.Optional(Type.Number({ default: 0.0 })),
  },
  { additionalProperties: false, default: {} }
);
```

#### Op contract: `planReefs` with two strategies

* `default`
* `shippingLanes`

```ts
export const PlanReefsContract = defineOpContract({
  kind: "compute",
  id: "ecology/features/planReefs",
  input: Type.Object(
    {
      width: Type.Number(),
      height: Type.Number(),
      landMask: Type.Any(),
      surfaceTemperature: Type.Any(),
    },
    { additionalProperties: false }
  ),
  output: Type.Object(
    { placements: Type.Array(Type.Object({ x: Type.Number(), y: Type.Number(), feature: Type.String() })) },
    { additionalProperties: false }
  ),
  strategies: {
    default: Type.Object(
      {
        warmThreshold: Type.Optional(Type.Number({ default: 0.6 })),
        density: Type.Optional(Type.Number({ default: 1.0 })),
      },
      { additionalProperties: false, default: {} }
    ),
    shippingLanes: Type.Object(
      {
        warmThreshold: Type.Optional(Type.Number({ default: 0.65 })),
        density: Type.Optional(Type.Number({ default: 0.8 })),
        laneBias: Type.Optional(Type.Number({ default: 0.5 })),
      },
      { additionalProperties: false, default: {} }
    ),
  },
});
```

#### Strategy normalization uses knobs (not env)

```ts
export const reefsDefault = createStrategy(PlanReefsContract, "default", {
  normalizeConfig: (cfg, knobs) => {
    const base = normalizeBySchema(PlanReefsContract.strategies.default, cfg);
    const k = knobs as any;
    return {
      ...base,
      warmThreshold: base.warmThreshold + (k.reefWarmThresholdBias ?? 0),
      density: base.density * (k.featureDensityScale ?? 1.0),
    };
  },
  run: (input, config) => {
    // config already normalized; do not call normalize again
    return { placements: [] };
  },
});
```

### B) Step: `ecology:featuresPlan` with a facade

**Public intent:**

```ts
type Public = {
  quality?: "fast" | "accurate";
  density?: "sparse" | "normal" | "dense";
};
```

**Internal canonical shape:**

```ts
type Internal = {
  ops: {
    reefs: { strategy: "default" | "shippingLanes"; config: { ... } };
    // ... other ops: vegetation, wetlands, ice ...
  };
};
```

#### Contract

```ts
export const FeaturesPlanStepContract = defineStep({
  id: "ecology:featuresPlan",
  phase: "ecology",
  requires: ["artifact:heightfield", "artifact:biomes"],
  provides: ["artifact:featureIntents"],

  ops: [
    { key: "reefs", contract: PlanReefsContract, knobsDomain: "ecology" },
    // plus other ops...
  ] as const,

  // PUBLIC
  publicSchema: Type.Object(
    {
      quality: Type.Optional(Type.Union([Type.Literal("fast"), Type.Literal("accurate")]), { default: "fast" }),
      density: Type.Optional(Type.Union([Type.Literal("sparse"), Type.Literal("normal"), Type.Literal("dense")]), {
        default: "normal",
      }),
    },
    { additionalProperties: false, default: {} }
  ),

  // INTERNAL
  internalSchema: Type.Object(
    {
      ops: Type.Object(
        {
          reefs: opConfigFieldFromContract(PlanReefsContract),
          // ... vegetation, wetlands, etc as opConfigFieldFromContract(...)
        },
        { additionalProperties: false, default: {} }
      ),
    },
    { additionalProperties: false, default: {} }
  ),
});
```

#### Implementation (`expandConfig` is the only shape transform)

```ts
export const featuresPlanStep = createStep(FeaturesPlanStepContract, {
  ops: {
    reefs: ecologyOps.planReefs,
    // ...
  },

  expandConfig: (pub, knobs) => {
    // Facade translation: public -> internal
    const density = pub.density ?? "normal";
    const densityScalar = density === "sparse" ? 0.6 : density === "dense" ? 1.4 : 1.0;

    // encode facade choices into internal op envelopes
    return {
      ops: {
        reefs:
          pub.quality === "accurate"
            ? { strategy: "shippingLanes", config: { density: densityScalar } }
            : { strategy: "default", config: { density: densityScalar } },
      },
    };
  },

  run: (ctx, cfg) => {
    const { width, height } = ctx.env.dimensions;

    // ENV-INFLUENCED VALUE DERIVATION (NO SHAPE CHANGE):
    // Example: scale “density” with map size at runtime
    const mapArea = width * height;
    const areaScale = Math.sqrt(mapArea / (80 * 52)); // baseline area constant

    // We do NOT mutate cfg; we derive local values.
    const reefsCfg = cfg.ops.reefs;
    const derivedReefDensity =
      // assume reefsCfg.config has density already normalized w/ knobs in compile step
      ((reefsCfg as any).config.density ?? 1.0) * areaScale;

    const out = ecologyOps.planReefs.run(
      {
        width,
        height,
        landMask: ctx.artifacts.get("artifact:landMask"),
        surfaceTemperature: ctx.artifacts.get("artifact:surfaceTemperature"),
      },
      // pass the same shape; if needed, pass a computed value via input instead
      { ...reefsCfg, config: { ...(reefsCfg as any).config, density: derivedReefDensity } }
    );

    ctx.artifacts.set("artifact:featureIntents", out.placements);
  },
});
```

**Important note about the last line:**
If you want *absolute purity* (“runtime never constructs a config object”), then instead of cloning the config envelope, you pass the derived value via input:

* `planReefs` input adds `densityScale: number`
* op multiplies internally

That is the strictest interpretation of “config shape and values remain unchanged”. Both are valid; choose based on taste. My recommendation for maximum clarity is:

* keep config immutable
* pass runtime-derived scalars via input (since it is, semantically, runtime input)

---

# Addressing your two explicit concerns

## Concern 1 — How do `env` (runtime params) and `knobs` (settings) flow, and what do ops declare?

### Correct framing

* **Ops should not “resolve” config shape.**
* Ops may:

  * normalize *values* at compile-time using `knobs` (same schema in/out)
  * derive runtime values using `env` + `inputs` at runtime

### How do we pass Civ7 runtime shapes down?

**Canonical answer:** the step runtime context includes `ctx.env`.
You can choose how ops consume env:

#### Option A (recommended for explicitness): env-derived values are passed as input fields

* op contract input includes `width`, `height`, etc (already common)
* step reads `ctx.env` and passes them in

**Pros:** explicit, testable, contract-driven
**Cons:** repeated `width/height` fields

#### Option B (DX-first): op `run(input, config, ctx)` and `ctx.env` is standard

* ops can access `ctx.env` without repeating in input schema

**Pros:** fewer repeated fields
**Cons:** more ambient dependency; input schema less explicit

My recommendation remains **Option A** for now, because it aligns with your “operations + contracts” worldview and keeps domain ops pure/testable. If repetition becomes painful, add helpers like:

* `withDimsInput(schema)` to compose `width/height` in a standard way
* `EnvPickSchema(["dimensions", "seed"])` to standardize subsets

### Where should env live in code?

* In your current baseline, runtime stuff is on `context.settings` and `context.dimensions`.
* In the target architecture:

  * **rename** `settings` → `env`
  * optionally fold `dimensions` into `env.dimensions` (you already have that shape in the engine settings schema)
  * keep `ctx.dimensions` as a derived convenience if you want, but canonical should be `ctx.env.dimensions`.

## Concern 2 — Why do we need config “resolution” at all?

We basically don’t.

### What we eliminate

* “Resolve config shape” as a concept.
* Runtime “resolveConfig” calls inside ops/strategies.
* Engine-owned config resolution pipeline.

### What we keep (and rename for honesty)

1. **Schema normalization** (`normalizeBySchema`)
   Convert/Clean/Default — deterministic, stable shape.

2. **Facade translation (public → internal)**
   This is the *only* legitimate shape transform, and it is explicit:

* `expandConfig(publicCfg)` yields internal canonical config
* internal canonical config schema never changes afterward

3. **Value normalization hooks**

* compile-time: `normalizeConfig(cfg, knobsSlice)` returns same schema type
* runtime: derive values from env/inputs/config but do not mutate config (or, if you do clone, treat it as transient and never persist back)

That matches your proposed mental model precisely.

---

# Implementation plan (scoped, with parallelization)

This is framed as “work units” and risk categories, not time.

## Phase 0 — Mechanical inventory (parallel, low risk)

**Goal:** identify every existing place where runtime config resolution occurs.

Parallelizable tasks for agents:

* Locate all `resolveConfig` implementations in:

  * step modules
  * op strategies
  * op creation pipeline
* Locate any runtime calls to `resolveConfig` inside `run(...)` bodies
* Categorize:

  * “forwarding boilerplate” (safe to delete)
  * “real normalization” (needs migration to compile-time normalize)

Deliverable: a checklist per module.

## Phase 1 — Introduce `env` as the runtime channel (mechanical, medium blast radius)

**Goal:** stop overloading the term “settings”.

Steps:

* Introduce `Env` + `EnvSchema` in core.
* Rename:

  * engine `RunSettings` → `Env` (or keep alias temporarily but the clean-cut version is a rename)
  * `RunRequest.settings` → `RunRequest.env`
  * `ExecutionPlan.settings` → `ExecutionPlan.env`
  * `ExtendedMapContext.settings` → `ExtendedMapContext.env`

This is large but mostly mechanical rename/refactor.

**Careful handling:**

* anything relying on `settings.directionality` (ensure it becomes `env.directionality` or is relocated)
* adapter/map-init code that constructs the settings/env object

## Phase 2 — Move compilation out of engine (architectural, high value, medium risk)

**Goal:** engine stops calling `step.resolveConfig`.

Steps:

* Create a recipe-level compiler that:

  * normalizes public map config
  * normalizes knobs
  * compiles internal step configs via step modules
* Engine compile step becomes “graph compilation only”:

  * validates step ids exist
  * validates internal configs against step internal schema (optional but recommended)
  * does not transform configs

**Key cut line:** remove `resolveConfig` from `MapGenStep` entirely (clean cut), or keep but forbid engine usage (less clean). Given your “no shims”, I recommend removing it.

## Phase 3 — Update op/strategy normalization signature (architectural, medium risk)

**Goal:** domain no longer imports engine types.

Steps:

* Change strategy normalization signature:

  * from `(config, settings: RunSettings)`
  * to `(config, knobsSlice)`
* Change op normalize dispatcher similarly.
* Update any strategy that actually used runtime settings (you likely have few or none; most ignore).

Parallelizable: yes, across ops/strategies.

## Phase 4 — Introduce `StepContract` + `createStep` compileConfig (architectural, medium risk)

**Goal:** eliminate per-step resolve forwarding.

Steps:

* Add `StepContract` and `StepModule` as shown.
* Update recipe/stage to reference `step.contract.publicSchema` for composition.
* Step compilation uses mechanical op normalization.

Parallelizable: step-by-step migration.

## Phase 5 — Bulk step migration (highly parallel, mostly mechanical)

For each step:

* delete step-level `resolveConfig` forwarding glue
* ensure public/internal schemas are declared in contract
* ensure embedded op bindings list is correct
* ensure run uses `ctx.env` instead of `ctx.settings`
* ensure op configs are expected to be normalized already

This is where multiple agents help a lot.

**Careful handling (mixed):**

* steps currently relying on runtime `resolveConfig` inside strategy.run; remove those calls and rely on compile normalization
* steps where “public config” today is already internal envelope; decide whether to keep (Variation A) or introduce facade (Variation B)

## Phase 6 — Guardrails + tests (sequential, high leverage)

Add/extend guardrails so regressions are caught:

* Domain modules cannot import engine plan/runtime types
* No `normalizeConfig/resolveConfig` calls inside runtime `run` bodies
* Facade transforms must be deterministic and pure (no reading runtime env)
* Internal config shape must match internal schema and must not be mutated at runtime (optional lint)

Update or add tests:

* recipe compile produces identical internal configs given same public config/knobs
* engine execution does not call any config compilation hook
* config defaults are applied exactly once

---

# Summary of shape and scope

* **One clean-cut progressive enhancement** is achieved by:

  * introducing `env` and `knobs` as distinct channels
  * moving config compilation into the recipe compiler
  * removing engine-driven config resolution hooks
  * making step compilation mechanical (no forwarding boilerplate)
  * keeping config shapes stable, with only explicit facade transforms

* The architecture stays focused on config resolution + boundary enforcement.
  It does not require re-architecting scheduling, dependency semantics, or artifacts beyond what’s necessary.

If you want, in the next turn I can also restate the “canonical public map config schema” for your *standard* recipe as a concrete example tree (recipe → stages → steps → per-step public config), so you can literally see what modders will type into.
