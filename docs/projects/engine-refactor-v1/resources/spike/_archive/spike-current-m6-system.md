# Spike (Current): M6 System Ground Truth

This file is a curated extraction of **ground truth** (current behavior / current system) from:
- SPIKE-m6-architecture-spec-prework-audit (archived)

It intentionally omits target directives/design decisions and drift analysis.

---

## Key ground truth (M6 as shipped)

### Authoring/runtime surfaces (core)

- `createStep` requires an explicit `schema` (TypeBox) at authoring time.
  - `packages/mapgen-core/src/authoring/step.ts`
- `createRecipe`:
  - derives full step IDs as `${namespace?}.${recipeId}.${stageId}.${stepId}`,
  - builds `TagRegistry` + `StepRegistry` internally,
  - **infers tag definitions** from step `requires`/`provides` and merges explicit overrides.
  - `packages/mapgen-core/src/authoring/recipe.ts`
- `ExecutionPlan` includes `settings`, but `PipelineExecutor.executePlan()` currently passes only `(context, node.config)` into steps.
  - `packages/mapgen-core/src/engine/execution-plan.ts`
  - `packages/mapgen-core/src/engine/PipelineExecutor.ts`
- `ExtendedMapContext` carries `config: MapConfig` (a run-global “bag” today).
  - `packages/mapgen-core/src/core/types.ts`

### Standard content package (mod)

- Standard recipe is a “mini-package” at `mods/mod-swooper-maps/src/recipes/standard/**`:
  - `recipe.ts` composes stage modules and passes `tagDefinitions`.
  - Stage modules live under `stages/<stageId>/**`.
- Steps are currently **single-file step modules** exporting `default createStep({ id, phase, requires, provides, schema, run })`.
  - Example: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts`
- There is meaningful indirection overhead from per-stage `steps/index.ts` barrels (one-liners).
  - Example: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/index.ts`
- Recipe-scoped catalogs exist today:
  - `recipes/standard/tags.ts` (IDs + `STANDARD_TAG_DEFINITIONS` with `satisfies` / `demo` / owners)
  - `recipes/standard/artifacts.ts` (publish/get helpers for artifacts stored in `ctx.artifacts`)



## Config model (what “run-global config” means today)

### What exists in M6

M6 effectively has **three “inputs”** in play:

1) **Run settings** (seed/dimensions/etc), compiled into `ExecutionPlan.settings`:
   - Built in mod runtime: `mods/mod-swooper-maps/src/maps/_runtime/standard-config.ts` (`buildStandardRunSettings`)
2) **Per-step config** (validated by step TypeBox schema during plan compile):
   - Built in mod runtime: `mods/mod-swooper-maps/src/maps/_runtime/standard-config.ts` (`buildStandardRecipeConfig`)
   - Typed as `StandardRecipeConfig = RecipeConfigOf<typeof stages>`:
     - `mods/mod-swooper-maps/src/recipes/standard/recipe.ts`
3) **Run-global context config bag** (`ExtendedMapContext.config`), currently used as a fallback escape hatch:
   - Set from map overrides in `runStandardRecipe()`:
     - `mods/mod-swooper-maps/src/maps/_runtime/run-standard.ts`



## Run settings vs context vs config (ADR intent + minimal wiring)
### What `RunSettings` does today (real code)

- It is part of the run input boundary (`RunRequest = { recipe, settings }`) and is validated via TypeBox:
  - `packages/mapgen-core/src/engine/execution-plan.ts` (`RunRequestSchema`, `RunSettingsSchema`)
- It is embedded in the compiled plan for observability/fingerprinting:
  - `packages/mapgen-core/src/engine/observability.ts` (`computePlanFingerprint` strips trace-only settings)
- It is used to compile an `ExecutionPlan` in authoring (`recipe.compile(settings, config)`), but it is not available to steps at runtime:
  - `packages/mapgen-core/src/authoring/recipe.ts` (`compile` + `run`)
  - `packages/mapgen-core/src/engine/PipelineExecutor.ts` (`step.run(context, node.config)` only)

### What `ExtendedMapContext` does today (real code)

`ExtendedMapContext` is the mutable “world state” object passed through the pipeline:

- carries dimensions, adapter, buffers/fields, artifacts store, overlays, metrics, trace scope, and a legacy `config` bag:
  - `packages/mapgen-core/src/core/types.ts` (`ExtendedMapContext`, `createExtendedMapContext`)



## Tag definition composability (what the runtime actually needs)

### Runtime contract

- The registry needs **one unique** `DependencyTagDefinition` per tag ID used by steps.
  - `packages/mapgen-core/src/engine/tags.ts` (`TagRegistry.registerTags`)
  - Duplicate IDs are hard errors.
- `createRecipe` currently:
  - infers tag IDs from step `requires`/`provides`,
  - registers inferred `{ id, kind }` definitions,
  - overlays explicit definitions for tags that need `satisfies`, `owner`, `demo`, etc.
  - `packages/mapgen-core/src/authoring/recipe.ts`

### What we have today (standard recipe)

- `recipes/standard/tags.ts` is both:
  - a tag ID catalog (`M3_DEPENDENCY_TAGS`, `M4_EFFECT_TAGS`), and
  - a definition catalog (`STANDARD_TAG_DEFINITIONS`) that provides `satisfies` hooks for artifacts/fields/effects.
  - `mods/mod-swooper-maps/src/recipes/standard/tags.ts`



### Audit: M6 dependency key coverage (standard recipe)

This audit is here to de-risk T0/T1/T2 by making sure we’re not missing “implicit” dependency keys or relying on accidental behavior.

**What’s true in M6 (standard recipe)**

- **All step modules reference dependency keys via a single recipe-local catalog**, not via string literals.
  - `mods/mod-swooper-maps/src/recipes/standard/tags.ts` exports `M3_DEPENDENCY_TAGS` + `M4_EFFECT_TAGS`.
  - `mods/mod-swooper-maps/src/recipes/standard/stages/**/steps/*.ts` import those and use `requires`/`provides` with them.
  - There are **no** `"artifact:*"` / `"field:*"` / `"effect:*"` string literals in step modules today (only in `tags.ts`).
- **The runtime does not require a fully explicit definition catalog** for dependency keys.
  - `packages/mapgen-core/src/authoring/recipe.ts` synthesizes a default `DependencyTagDefinition` for every key mentioned in `requires`/`provides` (via prefix-based `inferTagKind(...)`) and then overlays the recipe’s explicit `tagDefinitions` as overrides.
  - Practically: T1/T2 are primarily about “where does the canonical dependency language + metadata live?”, not about satisfying `TagRegistry` registration requirements.
- **Kind inference is strict and prefix-based** (and is enforced twice).
  - `inferTagKind(...)` rejects anything that isn’t `artifact:*` / `field:*` / `effect:*`.
  - `TagRegistry.registerTag(...)` also enforces that the `kind` matches the ID prefix (`isTagKindCompatible(...)`).
  - Effect keys imported from `@civ7/adapter` (`ENGINE_EFFECT_TAGS.*`) are already `effect:*`, so they participate cleanly in this model.
- **Some dependency keys are declared but unused** (god-catalog pressure signal):
  - `field:terrainType`, `field:elevation`, `field:rainfall` exist (and even have explicit definitions) in `mods/mod-swooper-maps/src/recipes/standard/tags.ts`, but are not referenced by any standard step’s `requires`/`provides` today.



Ground truth from core engine:

- A **tag** is a string ID with a kind prefix (`artifact:` / `field:` / `effect:`).
  - `packages/mapgen-core/src/engine/tags.ts`
- A **tag definition** (`DependencyTagDefinition`) optionally provides:
  - `satisfies(context, state)` (runtime verifier),
  - `demo` + `validateDemo` (authoring/demo tooling),
  - `owner` metadata.
- An **artifact** is a *step-published value* stored in `context.artifacts` under an `artifact:*` tag key.
  - `packages/mapgen-core/src/core/types.ts` (“Published data products keyed by dependency tag”)
- “Satisfaction” is tracked separately: a tag becomes satisfied only when a step includes it in `provides` (executor adds it), and optional `satisfies(...)` checks then run.
  - `packages/mapgen-core/src/engine/PipelineExecutor.ts` (adds `provides` to `satisfied`)
  - `packages/mapgen-core/src/engine/tags.ts` (`isDependencyTagSatisfied`)



### Current pattern (M6)

- **Single-file step modules** with schema + derived types + `run`:
  - Example: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts`


Observed import paths used by `mods/mod-swooper-maps/src/**`:

- `@swooper/mapgen-core` (dominant; types + utilities)
- `@swooper/mapgen-core/authoring` (createStep/createStage/createRecipe + types)
- `@swooper/mapgen-core/lib/{math,grid,noise,plates,heightfield,collections}` (algorithm utilities)
- `@swooper/mapgen-core/engine` (rare; used for `RunSettings` and tag definition types)



Observed import paths used by `mods/mod-swooper-maps/src/**` (counts from `rg`):

- `@swooper/mapgen-core` (118)
- `@swooper/mapgen-core/authoring` (38)
- `@swooper/mapgen-core/lib/math` (16), `@swooper/mapgen-core/lib/grid` (11), plus a small set of other `lib/*` subpaths


Current standard mod runtime glue:

- `mods/mod-swooper-maps/src/maps/_runtime/map-init.ts` (resolve/apply init data; uses Civ7 adapter creation)
- `mods/mod-swooper-maps/src/maps/_runtime/helpers.ts` (adapter creation + default continent bounds helper)
- `mods/mod-swooper-maps/src/maps/_runtime/types.ts` (options + init types)
- `mods/mod-swooper-maps/src/maps/_runtime/run-standard.ts` (standard recipe runner)
- `mods/mod-swooper-maps/src/maps/_runtime/standard-config.ts` (settings builder + legacy overrides→config mapping)
