# Canonical architecture proposal: Composition-first recipe compiler with `env` + `knobs`, and zero engine-time config resolution

This document is the reconciled, canonical architecture proposal, rebuilt to be simultaneously:

* **Faithful to the original architectural intent**: composition-first, contract-first, single canonical internal config shape, no derived/resolved schemas, strong domain↔pipeline boundaries.
* **Grounded in the actual current codebase** (paths, types, runtime flow) as represented in the uploaded repository snapshot.
* **Corrected against the edited proposal** where it drifted in naming, or where it still implied engine-time config resolution or ambiguous “settings” semantics.

Two explicit updates you requested are fully applied throughout:

1. **Rename runtime “settings” → `env`** (and rename `RunSettings` → `Env`), because this object is runtime-provided/decided-at-runtime and not “config.” The code today uses `settings` on `RunRequest`, `ExecutionPlan`, and `ExtendedMapContext` (and there is no pre-existing `runtime` property to conflict with).  
2. **Shorten schema/contract property names** where unambiguous:

   * `publicSchema` → `public`
   * `internalSchema` → `schema` (already canonical in current step contracts)
   * `normalizeConfig` → `normalize`

---

## Decision log

These are the canonical decisions this proposal locks in.

### D1 — The engine must not resolve or mutate step/op config at runtime

**Canonical:** `compileExecutionPlan(...)` must become a *planner/validator only*, not a config compiler. Today it defaults/cleans configs and calls `step.resolveConfig(...)` during plan compilation, which is engine-time config mutation. 

### D2 — “Runtime settings” are renamed and treated as `env`

**Canonical:** rename `RunSettings` → `Env`, and the runtime object field `settings` → `env` throughout `RunRequest`, `ExecutionPlan`, and `ExtendedMapContext`. The current runtime envelope includes fields like `seed`, `dimensions`, `wrap`, plus optional `directionality`, `metadata`, and `trace`. 

### D3 — Introduce `knobs` as compile-time cross-cutting tuning (distinct from `env`)

**Canonical:** `knobs` is authored/tuned outside the engine runtime envelope. It may affect how configs are normalized/validated *before* the engine executes steps, but it is not runtime-provided CIV settings.

### D4 — Ops do not resolve config; they may only `normalize` values without changing the config shape

This is consistent with the existing ADR direction: schema defaults and normalization should happen in compilation, and “op-local Value.Default inside run” is a migration smell. 
Concretely, we eliminate:

* `op.resolveConfig(config, settings)` (currently exists and couples ops to engine `RunSettings`). 

and replace it with:

* `op.normalize(config, knobs)` (compile-time only; same envelope shape in/out)

### D5 — Steps do not have `resolveConfig` in runtime modules

Today many steps implement `resolveConfig` that just forwards into `op.resolveConfig(...)` (example: `biome-edge-refine`). 
Canonical: remove step-level `resolveConfig` from runtime execution; step compilation happens in the recipe compiler.

### D6 — One canonical internal config shape; no “resolved config schema” stored alongside author config

This is explicitly aligned to existing internal guidance: do not introduce a distinct “resolved schema” and do not store derived fields into the canonical config. 

---

## 1) Ground truth: what the code does today (and why it violates the intent)

### 1.1 Engine plan compilation currently mutates config

`packages/mapgen-core/src/engine/execution-plan.ts` does all of the following during `compileExecutionPlan(...)`:

* Validates and defaults the runtime object (`RunSettingsSchema`) and places it onto the plan (today as `settings`). 
* For each recipe step:

  * Defaults/cleans the step config via schema (`Value.Default`, `Value.Clean`). 
  * Calls `step.resolveConfig(...)` and then re-validates. 

That is the precise “engine-time config resolution” we are eliminating.

### 1.2 Ops are coupled to engine runtime types via `resolveConfig(config, settings)`

In `packages/mapgen-core/src/authoring/op/create.ts` and `.../op/strategy.ts`:

* Strategy implementations can define `resolveConfig` that takes `RunSettings`. 
* `createOp(...)` returns `op.resolveConfig(cfg, settings)` which selects the strategy and calls that hook. 

This pulls engine runtime semantics into domain ops, violating the intended boundary.

### 1.3 Some strategies still default config inside `run(...)`

Example: `mods/mod-swooper-maps/src/domain/ecology/ops/features-plan-reefs/strategies/default.ts` applies schema defaults inside `run`. 
This is exactly the “runtime defaulting smell” the canonical architecture removes.

### 1.4 Runtime envelope (`settings`) is already used as “global run env,” including domain-derived values

Example: `climateRefine` reads `context.settings.directionality` and asserts it exists. 
And the standard entry wiring constructs `settings` from CIV init params plus `directionality`. 
So, the code already treats “settings” as the runtime envelope. Renaming it to `env` is the correct semantic move.

---

## 2) Canonical mental model: four channels, one compiler

The architecture becomes clean once we enforce four distinct channels:

### 2.1 `env` — runtime envelope (CIV7 + runner supplied)

* Provided at runtime (seed, map dimensions, wrap, lat bounds, trace flags, and optionally extra run-scoped objects like `directionality`). 
* Read-only to domain logic (steps may read it; ops do not implicitly access it).
* May be extended with “opaque” records (current code already uses `UnknownRecord` for `directionality` and `metadata`). 

### 2.2 `knobs` — compile-time cross-cutting tuning

* Authored/tuned as part of the recipe configuration surface, not the runtime envelope.
* Used only during **recipe compilation** to normalize internal configs.
* Never depends on `env`.

### 2.3 `config` — canonical internal config (stable shape)

* The only config shape steps/ops ever see at runtime.
* Fully defaulted and normalized by the recipe compiler.
* No engine-time mutation.

### 2.4 `inputs` — runtime data passed into ops (explicit, not implicit)

Ops remain pure functions of `(input, config)` (this is already how `runValidated` works today). 
If an op needs a runtime param (e.g., map size), the step passes it explicitly inside `input`.

---

## 3) Canonical API changes

This is the reconciled API surface. It is intentionally aligned with current file locations and current patterns (`define*Contract`, `create*`, `runValidated`, etc.), with only the minimal additions needed.

---

### 3.1 `Env` (rename of `RunSettings`) and `env` field (rename of `settings`)

**Current reality:** the engine defines `RunSettingsSchema` and `RunRequestSchema` with `settings`. 
**Canonical change:**

* `RunSettingsSchema` → `EnvSchema`
* `RunSettings` → `Env`
* `RunRequest.settings` → `RunRequest.env`
* `ExecutionPlan.settings` → `ExecutionPlan.env`
* `ExtendedMapContext.settings` → `ExtendedMapContext.env`

**Canonical `Env` shape (based on today’s schema):**

```ts
type Env = {
  seed: number
  dimensions: { width: number; height: number }
  latitudeBounds: { min: number; max: number }
  wrap: boolean

  // optional extensions already supported today
  directionality?: Record<string, unknown>
  metadata?: Record<string, unknown>
  trace?: { isVerbose?: boolean; isTiming?: boolean /* ... */ }
}
```

(These fields exist today in `RunSettingsSchema` / `RunRequestSchema`.) 

**Why this is canonical:** it matches how `settings` is actually used in steps already (seed, dimensions, directionality). 

---

### 3.2 `knobs` (new) and the `CompileCtx`

We introduce a compile-only context passed into normalization functions:

```ts
type CompileCtx<TKnobs> = {
  knobs: TKnobs
}
```

* Domain ops/strategies can accept a *domain-local knob slice* typed by domain code.
* Steps/recipe compose the full knobs object and pass slices to each op normalize.

This preserves the domain↔recipe boundary: domain defines its own knob types, recipe chooses how to compose/route them.

---

### 3.3 Ops: `resolveConfig` becomes `normalize` and loses dependency on `Env`

#### 3.3.1 Current shape (must change)

* `StrategyImpl.resolveConfig(config, settings)` in `packages/mapgen-core/src/authoring/op/strategy.ts`. 
* `op.resolveConfig(cfg, settings)` in `.../op/create.ts`. 

#### 3.3.2 Canonical shape

**Operation contract stays contract-first** (no change to `defineOpContract` fields: input/output/strategies). Example contract exists today. 

**Strategy:**

```ts
type StrategyImpl<TConfig, TInput, TOutput, TKnobs> = {
  // compile-time only
  normalize?: (config: TConfig, ctx: CompileCtx<TKnobs>) => TConfig

  // runtime
  run: (input: TInput, config: TConfig) => TOutput
}
```

**Op:**

```ts
type Op<TEnvelope, TKnobs> = {
  config: TSchema              // existing envelope schema
  defaultConfig: TEnvelope     // existing default envelope

  // compile-time only
  normalize?: (cfg: TEnvelope, ctx: CompileCtx<TKnobs>) => TEnvelope

  // runtime (existing)
  validate: (input: unknown, cfg: unknown) => asserts ...
  runValidated: (input: TInput, cfg: TEnvelope) => TOutput
}
```

**Key invariants:**

* `normalize` must return the **same envelope shape** it receives (no structural transformation).
* `normalize` must not read `env`.
* If map-size scaling is needed, do it at runtime as derived values inside `run(...)` or the step’s input builder.

This directly eliminates the current coupling where ops accept `RunSettings` in resolve hooks. 

---

### 3.4 Steps: contracts stay as-is (`schema`), but compilation becomes explicit and centralized

#### 3.4.1 Current step pattern (must change)

Example (`biome-edge-refine`):

* Contract defines `schema` (internal config). 
* Implementation defines `resolveConfig` forwarding to `ecology.ops.refineBiomeEdges.resolveConfig(...)`. 

This is the exact pattern we remove.

#### 3.4.2 Canonical step contract shape

We extend `defineStepContract` minimally:

```ts
type StepContract<TSchema, TPublicSchema = undefined, TBindings = undefined> = {
  id: string
  phase: string
  requires: readonly string[]
  provides: readonly string[]

  // canonical internal schema (already exists today)
  schema: TSchema

  // optional author-facing schema (new; named `public`)
  public?: TPublicSchema

  // optional op bindings (new; used by default compiler)
  ops?: TBindings
}
```

* `schema` stays canonical (matches current codebase naming). 
* `public` is optional; many steps will not need it initially.
* `ops` is optional but strongly recommended, because it allows a **mechanical compiler** to normalize op sub-configs without step boilerplate.

#### 3.4.3 Canonical step module shape

```ts
type StepModule<TContext, TInternalConfig, TPublicConfig, TKnobs> = {
  // existing runtime step execution
  run: (context: TContext, config: TInternalConfig) => void

  // optional step-owned compilation (only when needed)
  compile?: (publicOrInternal: TPublicConfig | TInternalConfig | undefined, ctx: CompileCtx<TKnobs>) => TInternalConfig
}
```

**Default rule:** if a step does not provide `compile`, the recipe compiler performs:

1. public→internal mapping (only if `contract.public` exists and step provides a mapping helper; otherwise treat input as internal)
2. `applySchemaDefaults(contract.schema, cfg ?? {})`
3. for each bound op envelope in `contract.ops`, call `op.normalize` (if present) with the correct knob slice
4. validate final internal config against `contract.schema`

This removes `resolveConfig` from runtime entirely.

---

## 4) Recipe compiler: the canonical place where normalization happens

### 4.1 Current recipe module behavior (must change)

`createRecipe` currently builds a run request and uses `compileExecutionPlan` which calls `resolveConfig`.  
`createRecipe.run(...)` also assigns `context.settings = plan.settings` today. 

### 4.2 Canonical recipe module behavior

`createRecipe(...)` continues to be the public way to assemble a recipe from stages. Stages are still created exactly as today (`createStage({ id, steps })`). 

**New canonical responsibilities:**

* compile and normalize recipe config (step config) using knobs
* build a run request with **compiled internal configs**
* call engine plan compiler **only for planning and validation**
* execute plan

### 4.3 Canonical recipe module API

Assuming the recipe is generic over `TEnv`, `TConfig`, and `TKnobs`:

```ts
type RecipeModule<TContext, TEnv, TConfig, TKnobs> = {
  // Structural recipe (no env)
  instantiate(config: TConfig | null): Recipe

  // NEW: compile configs (config + knobs -> compiled internal per-step config)
  compileConfig(config: TConfig | null, knobs: TKnobs): CompiledRecipeConfig

  // Build run request (env + compiled config)
  runRequest(env: TEnv, config: TConfig | null, knobs: TKnobs): RunRequest

  // Plan only: no config mutation
  compile(env: TEnv, config: TConfig | null, knobs: TKnobs): ExecutionPlan

  // Run: compileConfig -> runRequest -> compileExecutionPlan -> execute
  run(context: TContext, env: TEnv, config: TConfig | null, knobs: TKnobs, options?): void
}
```

### 4.4 What changes in engine plan compilation

`compileExecutionPlan(...)` becomes:

* Validate `env` shape (`EnvSchema`)
* Validate each step config against its schema
* Build dependency graph and order
* **Never** call any resolver, default applier, or config cleaner for step configs

This removes the config mutation behavior currently in `compileExecutionPlan`. 

---

## 5) Concrete canonical example grounded in the repo

### 5.1 Example A: `biome-edge-refine` step

#### Baseline today

Contract:

* `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biome-edge-refine/contract.ts` defines:

  * `schema: { refine: ecology.ops.refineBiomeEdges.config }`
  * default uses `refineBiomeEdges.defaultConfig` 

Implementation:

* Defines `resolveConfig` forwarding to `ecology.ops.refineBiomeEdges.resolveConfig(config.refine, settings)` 
* Then runs `runValidated(input, config.refine)` 

#### Canonical version (after this proposal)

**Contract (only change: add op binding):**

```ts
export const BiomeEdgeRefineStepContract = defineStepContract({
  id: "biome-edge-refine",
  phase: "ecology",
  requires: [...],
  provides: [...],

  schema: Type.Object(
    { refine: ecology.ops.refineBiomeEdges.config },
    { additionalProperties: false, default: { refine: ecology.ops.refineBiomeEdges.defaultConfig } }
  ),

  // NEW: bindings let the compiler normalize this envelope automatically
  ops: {
    refine: ecology.ops.refineBiomeEdges,
  },
});
```

**Implementation (remove `resolveConfig` entirely):**

```ts
export default createStep(BiomeEdgeRefineStepContract, {
  run: (context, config) => {
    // unchanged runtime logic; config is already canonical
    const refined = ecology.ops.refineBiomeEdges.runValidated(input, config.refine);
    ...
  }
});
```

**What happens now:**

* Recipe compiler applies defaults for `schema`
* Recipe compiler calls `ecology.ops.refineBiomeEdges.normalize(config.refine, ctx)` if implemented
* Engine never mutates this config

This is a direct replacement for the existing forwarding resolver pattern. 

---

### 5.2 Example B: `plot-vegetation` step (step-level normalization stays, but moves to compile-time)

Baseline today:

* `resolveConfig` clamps `densityBias`, rewrites the op envelopes, and then calls op-level resolve for trees/shrubs. 
  This is **step-owned normalization**; it should remain step-owned, but move to `compile(...)` (recipe compiler), not engine-time resolution.

Canonical approach:

```ts
export default createStep(PlotVegetationStepContract, {
  compile: (cfg, ctx) => {
    const internal = applySchemaDefaults(PlotVegetationStepContract.schema, cfg ?? {});
    const bias = clamp01(internal.densityBias);

    const trees = applyDensityBias(internal.trees, bias);
    const shrubs = applyDensityBias(internal.shrubs, bias);

    return {
      densityBias: bias,
      trees: ecology.ops.planTreeVegetation.normalize
        ? ecology.ops.planTreeVegetation.normalize(trees, ctx)
        : trees,
      shrubs: ecology.ops.planShrubVegetation.normalize
        ? ecology.ops.planShrubVegetation.normalize(shrubs, ctx)
        : shrubs,
    };
  },

  run: (context, config) => {
    // runtime is pure; config already canonical
    ...
  }
});
```

This preserves the intent of step-level config shaping while removing any dependence on `env` and removing engine-time resolution. 

---

## 6) How runtime parameters (`env`) reach ops without violating boundaries

You asked explicitly whether ops should declare runtime params they need as input, versus baking runtime into contracts/helpers.

**Canonical answer:** runtime params are passed **explicitly in op input**, always built by the step.

This aligns with how ops already run today: `runValidated(input, config)` with no context parameter. 

Example pattern (already common in the repo):

* Steps build an input object from context (dimensions, fields, buffers, artifacts). 
* If an op also needs `seed`, the step includes it explicitly (today some code derives a seed from `context.settings.seed`). 

After rename, this becomes `context.env.seed`.

This keeps ops domain-pure and avoids smuggling `env` into domain contracts.

---

## 7) Variations (full, explicit) for public vs internal config

You asked that the canonical doc include the full set of variations and be explicit about what is canonical.

### Variant A — Internal-only config (most steps)

* `contract.schema` is the author-facing schema.
* `public` omitted.
* Compiler applies defaults and op normalization.

**When to use:** 90% of steps, especially those composed of op envelopes already.

### Variant B — Step-owned public config (optional; when the public shape differs)

* `contract.public` defines author-facing schema.
* Step provides `compile(publicCfg, ctx) => internalCfg`.
* Internal config still validates against `contract.schema`.

**When to use:** when you want a simplified authoring surface but keep runtime stable.

### Variant C — Recipe-owned public config (advanced; when you want a top-level “map config” facade)

* Recipe defines its own `PublicMapConfigSchema`
* Recipe compiler maps it into the existing stage/step internal config tree (`RecipeConfigOf<typeof stages>`)
* Steps remain unchanged

**When to use:** if you need a UX-friendly config API that isn’t isomorphic to the pipeline structure.

**Canonical stance:** Variant A is the default; Variant B is the escape hatch; Variant C is reserved for front-door UX layers.

This preserves the ADR constraint: the runtime only sees one internal shape; no dual schema stored. 

---

## 8) File-level reconciliation: exactly what changes where

This is the “grounded mapping” section; every file named below exists today.

### 8.1 Core engine changes

1. **`packages/mapgen-core/src/engine/execution-plan.ts`**

   * Rename `RunSettingsSchema` → `EnvSchema`
   * Rename RunRequest `settings` → `env`
   * Remove `normalizeStepConfig(...)` and all `Value.Default/Clean` step-config mutation
   * Remove all calls to `step.resolveConfig(...)`
   * Replace with validation-only behavior
     (Current behavior is visible in this file.) 

2. **`packages/mapgen-core/src/engine/types.ts`**

   * Rename `RunSettings` → `Env`
   * Remove `resolveConfig` from `MapGenStep` interface (it’s currently present). 
   * Rename `settings` → `env` across relevant types

3. **`packages/mapgen-core/src/core/types.ts`**

   * Rename `ExtendedMapContext.settings` → `ExtendedMapContext.env` (today `settings` exists). 

### 8.2 Core authoring changes

4. **`packages/mapgen-core/src/authoring/types.ts`**

   * Remove `Step.resolveConfig(config, settings)` (currently typed and uses `RunSettings`). 
   * Introduce optional `compile(config, ctx)` and/or define StepModule compilation semantics

5. **`packages/mapgen-core/src/authoring/op/strategy.ts`** and **`.../op/create.ts`**

   * Rename `resolveConfig` → `normalize`
   * Drop dependency on `RunSettings` in strategy impl signatures
   * Ensure `createOp` exposes `normalize(...)` (compile-time) and leaves runtime `runValidated(...)` unchanged
     (Current signatures exist today.) 

6. **`packages/mapgen-core/src/authoring/recipe.ts`**

   * Add `compileConfig(config, knobs)` and plumb it into `runRequest/compile/run`
   * Rename `settings` parameter to `env`
   * Replace `context.settings = plan.settings` with `context.env = plan.env`
     (Current flow exists today.) 

### 8.3 Mod recipe + runtime wiring changes

7. **`mods/mod-swooper-maps/src/maps/_runtime/standard-entry.ts`**

   * Rename `settings` → `env`
   * Call `runStandardRecipe(context, env, config, knobs, ...)` (or equivalent)
   * Continue setting `directionality` onto env if needed (for now)
     (Current file builds `settings` and passes it.) 

8. **Steps that currently implement `resolveConfig`**

   * Remove step `resolveConfig` blocks like:

     * `biome-edge-refine` 
     * `pedology` 
     * `plot-vegetation` 
   * Either:

     * rely on default compiler + op bindings, or
     * move step-owned normalization into `compile(...)` (Variant B)

9. **Domain strategies that default config inside `run`**

   * Remove `applySchemaDefaults(...)` calls from strategy `run`
   * Rely on compilation to provide canonical config
     (Example exists today.) 

---

## 9) Directionality and other “global settings”: canonical placement under `env` with a clean boundary

You currently store `directionality` on the runtime envelope and steps read it from context (`context.settings.directionality`). 
This is compatible with the canonical architecture if we treat it as:

* **an `env` extension**, not an op/step config field, and
* **derived from knobs/config outside the engine planner** (either in runtime entry, or in recipe compilation).

**Canonical recommendation (cleanest):**

* Treat directionality as a *recipe knob* (`knobs.foundation.directionality`)
* Recipe compilation computes an `env` extension `{ directionality }` and the runtime entry merges it into the base env (from CIV)
* Steps read `context.env.directionality`

This preserves the original motivation (“don’t duplicate across many step configs”) while keeping semantics clean.

---

## 10) Why this resolves your original concerns

### 10.1 “Runtime parameters affect normalization”

They can affect **derived runtime values**, but they must not mutate config shape.

Canonical approach:

* If something needs to scale with map area, keep the config as a stable declarative input (“density per 10k tiles”), and compute the effective count at runtime from `env.dimensions`.

### 10.2 “Ops shouldn’t resolve config”

Correct: ops should not have any `resolveConfig(env)` hook.
They may have `normalize(knobs)` to sanitize values and apply compile-time rules; they should receive runtime params only through explicit `input`.

### 10.3 “How to pass CIV7 runtime shapes down?”

* Keep `env` on `ExtendedMapContext` (renamed from `settings`)
* Steps extract what they need and pass it as part of op input
* Provide helper functions for building inputs (the repo already does this pattern widely). 

---

## 11) Summary of the canonical state after the refactor

After implementing this proposal:

* `compileExecutionPlan` is **pure planning + validation** and never mutates configs. 
* All config defaults and normalization happen in the **recipe compiler**, using **knobs**, never using `env`.
* Runtime envelope is uniformly named `env` everywhere; steps read `context.env.*`.
* Domain ops/strategies are decoupled from engine runtime types; they remain `(input, config)` at runtime and optional `normalize(knobs)` at compile-time.
* No “resolved schema” exists; the internal config schema remains the single source of truth. 

---

If you want, in the next round we can take **one concrete step + op set** (e.g., `plot-vegetation` + `planTreeVegetation/planShrubVegetation`) and walk the full end-to-end migration in detail (contract bindings, compile-time normalization, knob routing, and how the resulting compiled run request looks).
