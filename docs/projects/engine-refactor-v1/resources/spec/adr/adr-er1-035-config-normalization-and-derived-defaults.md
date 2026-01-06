---
id: ADR-ER1-035
title: "Config normalization and derived defaults (beyond schema defaults)"
status: accepted
date: 2026-01-02
project: engine-refactor-v1
risk: stable
system: mapgen
component: authoring-sdk
concern: config-normalization
supersedes: []
superseded_by: null
sources:
  - "SPEC-architecture-overview"
  - "SPEC-step-domain-operation-modules"
---

# ADR-ER1-035: Config normalization and derived defaults (beyond schema defaults)

## Context

Schema defaults are necessary but often insufficient: some defaults are derived (e.g., a strategy-specific default that depends on other config values or on run settings). Without a consistent normalization model, defaults and “fixups” drift into runtime code paths and become hard to observe and validate.

## Config pipeline inventory (A–I)

This section captures the *current* sources of “normalization” and config shaping in the codebase, grouped by intent. The goal is to separate:
- legacy/compat shims that add noise,
- intentional target-architecture boundaries that should remain,
- and ambiguous patterns that need a decision (this ADR).

### Legacy-driven (compat / shims / organic complexity)

#### A) `StandardRecipeOverrides` + translation into per-step config

- **Where:**
  - `mods/mod-swooper-maps/src/maps/_runtime/standard-config.ts`
    - `type DeepPartial<T>`
    - `export type StandardRecipeOverrides = DeepPartial<MapGenConfig>`
    - `export function buildStandardRecipeConfig(...)`
- **What it does:** uses a global-ish, deep-partial “overrides” object as the author surface and then *constructs* a `StandardRecipeConfig` by mapping override fragments into per-stage/per-step config objects.
- **Why it exists:** compatibility with legacy “global overrides” authoring that predates the target “direct recipe config” model.
- **Classification:** legacy/transient (target architecture expects direct `RecipeConfigOf<typeof stages>` authoring; translation layers create drift risk).

#### B) Spread/merge + `{}` shells as a config assembly mechanism

- **Where:** `mods/mod-swooper-maps/src/maps/_runtime/standard-config.ts` (throughout `buildStandardRecipeConfig(...)`)
- **What it does:** uses `?? {}` and object spreads to synthesize nested config shapes (and to “ensure presence” of intermediate objects) during translation.
- **Why it exists:** it is the mechanical implementation of (A) in a file that is constructing a large nested object graph.
- **Classification:** legacy/transient (goes away when (A) is removed).

#### C) Casts over schema/config mismatches (or defensive “it might be undefined” coding)

- **Where:**
  - `mods/mod-swooper-maps/src/maps/_runtime/standard-config.ts` (e.g., `as FoundationConfig`)
  - step implementations in `mods/mod-swooper-maps/src/recipes/standard/stages/**/steps/*.ts` (e.g., `as LandmassConfig`, `as VolcanoesConfig`, etc.)
- **What it does:** coerces values at call sites instead of letting step schemas/types be the single source of truth.
- **Why it exists:** a mix of (A) translation, incremental refactors, and “defensive” patterns that assume `config.<field>` might be missing even when the step schema defaults make it present.
- **Classification:** mostly legacy/transient and drift/cleanup (should reduce as config authoring moves to direct recipe config and step schemas become canonical).

#### D) (Removed) Mod config loader parsing unknown inputs into a config object

- **Where:** (previously) `mods/mod-swooper-maps/src/config/loader.ts` (`parseConfig`, `safe-parse helper`, `default-config helper`, `json-schema helper`, `public-schema helper`)
- **What it did:** took `unknown` input, applied schema defaults/conversion/cleaning, and returned a typed config object (or structured errors).
- **Why it existed:** untyped config ingestion (JSON-like inputs) and schema export for tooling; not required for strictly-typed TS recipe authoring.
- **Current status:** removed from the baseline to avoid maintaining an unused ingestion surface.
- **Classification:** optional/boundary-only; if reintroduced, keep it explicitly as a boundary/tooling concern (not as a hidden dependency of runtime compilation).

### Intentional (target-architecture boundaries)

#### E) Execution-plan compilation canonicalizes untrusted inputs and produces explicit node configs

- **Where:** `packages/mapgen-core/src/engine/execution-plan.ts`
  - `parseRunRequest(...)` (run request shape validation + defaults/cleaning + unknown-key detection)
  - `normalizeStepConfig(...)` (per-step config defaults/cleaning + unknown-key detection)
  - `compileExecutionPlan(...)` (produces `ExecutionPlan.nodes[].config` for execution)
- **What it does:** turns a runtime-shaped `RunRequest` (`unknown`/untrusted in principle) into a deterministic `ExecutionPlan` whose nodes carry explicit, schema-shaped config values.
- **Why it exists:** runtime must be able to compile and validate non-TS inputs (and must not rely on TS for correctness). The plan is the execution contract and must be canonical and reproducible.
- **Classification:** intentional/staying (this is a core runtime boundary).

#### F) Strategy selection default-friendliness implies a normalization step

- **Where:** `packages/mapgen-core/src/authoring/op/create.ts` (`createOp` strategy union + default handling)
- **What it does:** supports an explicit plan-truth strategy envelope (`{ strategy, config }`) while still selecting a concrete strategy implementation at call time.
- **Why it exists:** authoring ergonomics and type-safe strategy selection require multiple *authored* shapes for “the same” config intent.
- **Classification:** intentional/staying (this is DD-005’s core outcome).

### Accidental/unclear (requires a design decision)

#### G) Op-local defaulting inside `run(...)` (`Value.Default(...)` in ops)

- **Where:** ecology ops commonly default config inside `run(...)` (e.g., `mods/mod-swooper-maps/src/domain/ecology/ops/classify-biomes/index.ts`)
- **What it does:** applies schema defaults at op entry and then uses “resolved config” to compute derived scalars.
- **Why it exists:** callers are not consistently passing fully defaulted/canonical op config; op authors defend against partial configs and normalize locally.
- **Classification:** accidental/unclear (needs an explicit rule about *where* op config is defaulted/canonicalized and whether ops should assume canonical config inputs).

#### H) Explicit resolver helpers that manufacture a “resolved” config shape

- **Where:** `mods/mod-swooper-maps/src/domain/ecology/ops/plot-effects/rules/normalize.ts` (`resolvePlotEffectsConfig(...)`)
- **What it does:** takes an optional/partial config input and returns a fully expanded “resolved” config object with nested defaults applied.
- **Why it exists:** nested config ergonomics; avoids sprinkling defaults throughout algorithm logic.
- **Classification:** ambiguous: this may be the *right* pattern (a pure normalizer) but needs to be placed consistently (compile-time vs op-time) to preserve plan truthfulness and avoid duplicated normalization.

#### I) Step-local op-config construction and/or redundant defaulting

- **Where:** steps sometimes default op configs manually before calling ops (e.g., `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biomes/index.ts`)
- **What it does:** step takes its own step config and then applies another layer of defaulting/casting before calling a domain op.
- **Why it exists:** migration drift between step schema, op schema, and legacy global overrides; inconsistent adoption of canonical op config surfaces.
- **Classification:** accidental/cleanup (should be removed by aligning steps to op schemas and using the validated op entrypoints).

## Decision

- Configuration normalization is a **compile-time concern** (plan truth):
  - `compileExecutionPlan(...)` applies schema defaults/cleaning and produces explicit `ExecutionPlan.nodes[].config` values.
  - Steps and recipes treat `node.config` as **the config** at runtime (no additional meaning-level defaulting/merging in runtime paths).
- Config normalization is **fractal only at step boundaries**:
  - the plan compiler knows about steps (nodes), not about operations directly.
  - composite steps may call multiple ops; each op may have its own normalization logic, but the composition point remains `step.resolveConfig(...)`.
- Introduce an optional **step-level resolver hook** executed by the compiler:
  - `step.resolveConfig(stepConfig, settings) -> stepConfig`
  - This resolver is **pure** and depends only on `(stepConfig, RunRequest.settings)` (no adapters, no runtime buffers, no artifacts, no RNG).
- The resolver output must validate against the step’s existing `schema` (no plan-stored internal/derived fields).
- Operations may provide **op-local normalization helpers** that are composed by steps at compile time:
  - `op.resolveConfig(opConfig, settings) -> opConfig`
  - Op resolvers are invoked by `step.resolveConfig(...)` (for composite steps) and the returned config remains schema-valid.
  - Ops do not receive settings at runtime; op config resolution is a compiler-time phase.

## Options considered

1. **Schema defaults only**
   - Pros: simple
   - Cons: pushes real-world defaults into ad hoc runtime logic and breaks observability
2. **Explicit normalization phase (compile-time)**
   - Pros: deterministic; debuggable; supports richer authoring safely
   - Cons: requires a well-defined normalization hook surface
3. **Runtime-only defaults**
   - Pros: lowest up-front work
   - Cons: highest drift risk; hard to validate and reproduce

## Consequences

- The authoring SDK can expose helpers for normalization, but those helpers must produce explicit config in the plan.
- If a default depends on runtime state, it must be re-framed as:
  - an explicit input/setting, or
  - an explicit runtime-derived artifact/buffer dependency.
- Op-local `Value.Default(...)` inside `run(...)` becomes a migration smell: ops should assume they receive already-canonical config (schema defaults + any step/op resolvers applied) and reserve runtime logic for runtime-only parameter derivation.

## Explicitly not doing (deferred)

- Do not store internal-only/derived coordination fields in `ExecutionPlan.nodes[].config`.
- Do not introduce a separate “resolved schema” distinct from the author-facing config schema.
- Do not introduce dual-shape storage (e.g., `authorConfig` + `resolvedConfig`) in the plan.

If we later need plan-level truth for derived fields (e.g., implicit strategy choice, scale-derived thresholds), that will require a separate decision about:
- a distinct resolved schema, and/or
- a separate plan storage slot for resolved/internal config.

## Canonical projected outcome

### Operation shape (domain-owned)

Operations remain runtime-pure and do not accept adapters/callback “views” as contract inputs/outputs. Config normalization lives alongside the op as a pure helper.

```ts
import type { Static, TSchema } from "typebox";
import type { RunSettings } from "@swooper/mapgen-core/engine/execution-plan.js";
import type { OpContract } from "@swooper/mapgen-core/authoring";
import type { StrategySelection } from "@swooper/mapgen-core/authoring";

export type OpResolveConfig<ConfigSchema extends TSchema> = (
  config: Static<ConfigSchema>,
  settings: RunSettings
) => Static<ConfigSchema>;

type StrategySelectionFor<C extends OpContract<any, any, any, any, any>> = StrategySelection<{
  [K in keyof C["strategies"] & string]: { config: C["strategies"][K] };
}>;

export type DomainOp<C extends OpContract<any, any, any, any, any>> = Readonly<{
  contract: C;
  config: TSchema; // derived envelope schema
  defaultConfig: StrategySelectionFor<C>;
  resolveConfig?: (config: StrategySelectionFor<C>, settings: RunSettings) => StrategySelectionFor<C>;
  runValidated: (
    input: Static<C["input"]>,
    config: StrategySelectionFor<C>
  ) => Static<C["output"]>;
}>;
```

Resolver rule: `resolveConfig` must return a value that still validates against `op.config` (no internal-only fields).

### Step shape (compiler-owned execution node)

Steps are the compilation/execution units. The compiler owns plan construction and runs an optional step resolver hook.

```ts
import type { MapGenStep } from "@swooper/mapgen-core/engine";
import type { RunSettings } from "@swooper/mapgen-core/engine";

export type StepResolveConfig<TConfig> = (config: TConfig, settings: RunSettings) => TConfig;

export type ResolvableStep<TContext, TConfig> = MapGenStep<TContext, TConfig> & {
  resolveConfig?: StepResolveConfig<TConfig>; // compile-time only
};
```

### Composite step example (fan-out → delegate → recombine)

```ts
// domain/<domain>/ops (two ops, each owns scaling semantics)
import { Type, type Static } from "typebox";
import { defineOpContract } from "@swooper/mapgen-core/authoring";
import { createStrategy } from "@swooper/mapgen-core/authoring";
import { createOp } from "@swooper/mapgen-core/authoring";

export const computeSuitabilityContract = defineOpContract({
  kind: "compute",
  id: "ecology/features/computeSuitability",
  input: ComputeSuitabilityInputSchema,
  output: ComputeSuitabilityOutputSchema,
  strategies: {
    default: ComputeSuitabilityConfigSchema,
  },
});

export const computeSuitabilityDefault = createStrategy(
  computeSuitabilityContract,
  "default",
  {
    resolveConfig: (cfg, settings) => {
      // example: default grid-scaled search radius based on map size
      const size = settings.dimensions.width * settings.dimensions.height;
      const autoRadius = size < 20000 ? 3 : 5;
      return { ...cfg, searchRadius: cfg.searchRadius ?? autoRadius };
    },
    run: (input, cfg) => {
      /* ... */
    },
  }
);

export const computeSuitability = createOp(computeSuitabilityContract, {
  strategies: {
    default: computeSuitabilityDefault,
  },
});

export const selectPlacementsContract = defineOpContract({
  kind: "select",
  id: "ecology/features/selectPlacements",
  input: SelectPlacementsInputSchema,
  output: SelectPlacementsOutputSchema,
  strategies: {
    default: SelectPlacementsConfigSchema,
  },
});

export const selectPlacementsDefault = createStrategy(
  selectPlacementsContract,
  "default",
  {
    resolveConfig: (cfg, settings) => {
      const wrap = settings.wrap.wrapX || settings.wrap.wrapY;
      return { ...cfg, allowWrapAdjacency: cfg.allowWrapAdjacency ?? wrap };
    },
    run: (input, cfg) => {
      /* ... */
    },
  }
);

export const selectPlacements = createOp(selectPlacementsContract, {
  strategies: {
    default: selectPlacementsDefault,
  },
});

// composite step schema references op config schemas directly (no separate resolved schema)
export const FeaturesStepConfigSchema = Type.Object(
  {
    computeSuitability: computeSuitability.config,
    selectPlacements: selectPlacements.config,
  },
  { additionalProperties: false }
);
export type FeaturesStepConfig = Static<typeof FeaturesStepConfigSchema>;

export const featuresStep: ResolvableStep<EngineContext, FeaturesStepConfig> = {
  id: "standard.ecology.features",
  phase: "ecology",
  requires: [/* ... */],
  provides: [/* ... */],
  schema: FeaturesStepConfigSchema,

  // compiler-time composition point
  resolveConfig: (cfg, settings) => ({
    computeSuitability: computeSuitability.resolveConfig(cfg.computeSuitability, settings),
    selectPlacements: selectPlacements.resolveConfig(cfg.selectPlacements, settings),
  }),

  run: (context, cfg) => {
    // runtime receives cfg already resolved; no branching on "if resolver exists"
    const inputs1 = buildComputeSuitabilityInputs(context);
    const { suitability } = computeSuitability.runValidated(inputs1, cfg.computeSuitability);

    const inputs2 = buildSelectPlacementsInputs(context, suitability);
    const { placements } = selectPlacements.runValidated(inputs2, cfg.selectPlacements);

    applyPlacementsToEngine(context, placements);
  },
};
```

### Compiler flow (canonical)

When compiling each enabled recipe step:
1) Normalize authored config via schema: `Value.Default + Value.Clean` (plus unknown-key checks).
2) If `step.resolveConfig` exists, call it with `(cleanedConfig, settings)`.
3) Validate the returned config against the step’s existing schema.
4) Store the resolved config into `ExecutionPlan.nodes[].config`.

At runtime:
- `PipelineExecutor` calls `step.run(context, node.config)`.
- The step treats `node.config` as the single source of truth and delegates to ops with no additional meaning-level defaulting/merging.
