# SPIKE — M6 Target Architecture SPEC Prework Audit

This doc is a **scratch/workbook** for tightening the final target architecture SPEC.
It is **not canonical**: use it to make decisions and then promote the settled declarations into `SPEC-target-architecture-draft.md`.

## Why this exists

M6 landed the major wiring refactor (authoring SDK + plan compiler + executor + mod-owned content package), but the canonical SPEC drifted vs. what shipped. Before editing the SPEC, this SPIKE captures:

- what M6 **actually does** (code-grounded),
- earlier **decisions already recorded** in ADR/issues,
- the remaining **choice points** (config model, tag composition, domain vs step boundary, step module standard, core import surface),
- concrete **options** with tradeoffs.

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

## Prior decisions already captured (don’t reinvent)

### Pipeline boundary and config intent (project ADRs)

- **Boundary input is** `RunRequest = { recipe, settings }` (not a monolithic `MapGenConfig`).
  - `docs/projects/engine-refactor-v1/ADR.md` (ADR-ER1-003)
- **Cross-cutting directionality belongs in `settings`**, not in `ctx.config.foundation.*` or duplicated across step configs.
  - `docs/projects/engine-refactor-v1/ADR.md` (ADR-ER1-019)

### Authoring decisions (issue decision records)

- **Authoring enforces schemas** (`createStep` requires a schema); engine runtime remains permissive (for legacy call sites).
  - `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M6-U02-1-define-authoring-pojos-and-schema-requirements.md`
- **`instanceId` intended to be recipe-occurrence-only** (validate uniqueness in authoring).
  - `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M6-U02-1-define-authoring-pojos-and-schema-requirements.md`
- **Tag definitions are inferred from step usage with explicit overrides** (instead of requiring fully explicit catalogs for every tag).
  - `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M6-U02-2-implement-createrecipe-registry-plumbing-and-api-surface.md`

### Standard recipe tag catalog decision (M6 issue record)

- Standard recipe owns a recipe-local `tags.ts` and passes it into `createRecipe({ tagDefinitions })`.
  - `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M6-U05-2-compose-standard-recipe-and-tag-definitions-via-authoring-sdk.md`

### Notable drift worth calling out

- ADR intent says “settings, not `ctx.config`” for cross-cutting directionality, but M6 still reads `ctx.config` in 2 places:
  - `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-post/steps/climateRefine.ts`
  - `mods/mod-swooper-maps/src/domain/narrative/tagging/rifts.ts`

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

### Implications of the current shape

- Map authoring (today) is primarily “**MapGenConfig-shaped overrides**” (`StandardRecipeOverrides = DeepPartial<MapGenConfig>`), not recipe config.
  - `mods/mod-swooper-maps/src/maps/_runtime/standard-config.ts`
  - Example maps: `mods/mod-swooper-maps/src/maps/*.ts`
- The recipe config is **hand-mapped** from `MapGenConfig` into stage/step configs (`buildStandardRecipeConfig`).
- `ExtendedMapContext.config` is **not validated/defaulted** on the standard runtime path; it’s just the overrides object cast to `MapGenConfig`.
  - This is called out as triage:
    - `docs/projects/engine-refactor-v1/triage.md` (“Map overrides mapped directly to recipe config … pass overrides into ExtendedMapContext.config”)

### Your desired model (“composed config, no hand-maintained global shape”)

Restated as a concrete target:

- Each step owns a config schema (TypeBox) and its derived TS type.
- Stage config is a composition of step configs.
- Recipe config is a composition of stage configs.
- A map file authors **one config surface** for a chosen recipe (ideally validated and strongly typed).
- There is no parallel, hand-maintained “global” config object that then gets mapped into step configs.

### Is this compatible with M6?

Mostly yes, with two important gaps:

1) **Cross-cutting settings are not available to step `run()`** today even though plans contain `settings`.
   - If directionality (and similar “settings”) must be accessed by steps/domain logic, we need a strategy:
     - (a) pass `settings` via context (e.g., `context.settings`), or
     - (b) thread needed settings into step configs (duplication), or
     - (c) change the step `run` signature to accept settings (bigger surface change).
2) **Map authoring would need to shift away from `MapGenConfig` overrides**.
   - Today maps author `StandardRecipeOverrides` and rely on `buildStandardRecipeConfig` mapping.

Minimal changes to make “composed config” viable without changing core surfaces:

- Remove the remaining `ctx.config` reads by plumbing directionality through step config (or by storing settings into context in runtime glue).
  - `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-post/steps/climateRefine.ts`
  - `mods/mod-swooper-maps/src/domain/narrative/tagging/rifts.ts`
- Add a strict validation story for the recipe config surface (unknown stage/step keys), if we expect authored config to be the source of truth.

Important constraint to acknowledge:

- The mod has an explicit router stating config shapes are centralized and step schemas shouldn’t invent parallel schemas:
  - `mods/mod-swooper-maps/src/config/AGENTS.md`
  - Any “step-owned schemas live with steps” direction would intentionally revise this local convention.

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

### Composition patterns to choose from (2–3 viable standards)

**Pattern 1: Single recipe-wide `tags.ts` (today’s shape)**

- Pros: easiest to find “the tag language”, simplest wiring, minimal composition boilerplate.
- Cons: tends to become a “god catalog” as tags grow; weak ownership signals.

**Pattern 2: Per-stage `tags.ts` composed at recipe root**

- Idea: `stages/<stageId>/tags.ts` exports:
  - tag IDs introduced/owned by the stage, and
  - `DependencyTagDefinition[]` for those tags (especially `satisfies` for artifacts/effects it provides).
- `recipes/standard/recipe.ts` composes `tagDefinitions: [...foundationTags, ...morphologyTags, ...]`.
- Pros: ownership + colocation improves (“who owns this artifact/effect?”); reduces god-file pressure.
- Cons: cross-stage artifacts (provided in one stage, consumed later) need a clear ownership rule; composition ordering/duplication risk needs discipline.

**Pattern 3: Contract-sliced modules (artifacts/fields/effects)**

- Idea: keep a small ID catalog, but split definitions by kind:
  - `contracts/artifacts.ts`, `contracts/fields.ts`, `contracts/effects.ts`
- Pros: avoids an unstructured mega-file while keeping discoverability.
- Cons: still central; may just re-create a smaller set of “catalog files”.

Open question for the SPEC: do we want tag definition “ownership” to track:

- the producing step/stage,
- the artifact contract module (independent of producers),
- or “the recipe” as the owner of the whole contract language?

## Domain vs step responsibilities (boundary audit)

### What “domain” contains today (in practice)

`mods/mod-swooper-maps/src/domain/**` mixes:

- **Pure, testable logic** (good candidates for long-lived domain libs):
  - `mods/mod-swooper-maps/src/domain/morphology/landmass/water-target.ts`
  - `mods/mod-swooper-maps/src/domain/morphology/landmass/plate-stats.ts`
- **Engine-coupled logic** that calls the Civ adapter or mutates engine state:
  - `mods/mod-swooper-maps/src/domain/placement/index.ts` (+ children)
  - `mods/mod-swooper-maps/src/domain/morphology/landmass/terrain-apply.ts`
  - `mods/mod-swooper-maps/src/domain/ecology/biomes/index.ts`
  - `mods/mod-swooper-maps/src/domain/ecology/features/index.ts`
- **Pipeline-semantics leakage**: domain modules publishing artifacts directly:
  - `mods/mod-swooper-maps/src/domain/narrative/corridors/index.ts`
  - `mods/mod-swooper-maps/src/domain/narrative/orogeny/belts.ts`
  - `mods/mod-swooper-maps/src/domain/narrative/tagging/{margins,hotspots,rifts}.ts`
  - `mods/mod-swooper-maps/src/domain/morphology/islands/placement.ts`
- **Recipe coupling via shims** (domain is not recipe-independent today):
  - `mods/mod-swooper-maps/src/domain/tags.ts` re-exports `recipes/standard/tags.ts`
  - `mods/mod-swooper-maps/src/domain/artifacts.ts` re-exports `recipes/standard/artifacts.ts`

### Boundary rules to consider enshrining (pick one, be consistent)

**Rule set A (strict): “Domain is pure; steps own engine + pipeline semantics.”**

- Domain:
  - no `ExtendedMapContext`, no `ctx.adapter`, no `ctx.artifacts`, no `ctx.overlays`.
  - accepts plain data and returns plain data.
- Steps:
  - are the only place that mutates adapter state and publishes artifacts.
- Consequence: significant refactors of `domain/ecology/*`, `domain/placement/*`, and narrative taggers.

**Rule set B (pragmatic): “Domain can use adapter/context for algorithms; steps own pipeline semantics.”**

- Domain:
  - can call adapter/context, but must not publish dependency artifacts/tags or encode recipe ordering.
  - returns computed artifacts/overlays so steps publish them.
- Steps:
  - own `requires/provides`, artifact publication, and any recipe-specific runtime glue.
- Consequence: moderate refactors (mainly: stop domain from `ctx.artifacts.set` and remove recipe shims).

Concrete “likely move/split” candidates under either rule set:

- Move/split engine-glue placement into the placement step/stage:
  - `mods/mod-swooper-maps/src/domain/placement/**`
- Move artifact publication out of domain narrative modules into their steps:
  - `mods/mod-swooper-maps/src/domain/narrative/**` (listed above where `ctx.artifacts.set` occurs)
- Re-evaluate recipe-coupled shims:
  - `mods/mod-swooper-maps/src/domain/tags.ts`
  - `mods/mod-swooper-maps/src/domain/artifacts.ts`

## Step module standard (what exists + options)

### Current pattern (M6)

- **Single-file step modules** with schema + derived types + `run`:
  - Example: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts`
- Stage modules import steps via `steps/index.ts` re-export barrels (overhead with low value):
  - Example: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/index.ts`

### Uniform options to choose from

**Option A (closest to current, lowest overhead): single-file steps, no step barrels**

- Keep step modules as-is.
- Delete `stages/<stageId>/steps/index.ts`; import step modules directly from stage `index.ts`.
- Primary win: remove pointless indirection without changing the step standard.

**Option B: stage-owned contracts (schemas/types/tags) + thin step modules**

- Put shared stage contracts in `stages/<stageId>/contracts.ts`.
- Step files import contract items; step files focus on orchestration.
- Primary win: stage-level discoverability; risk: stage-level “catalog” growth.

**Option C: per-step directories (model + impl)**

- `steps/<stepId>/{model.ts, step.ts}` (or similar), uniform across steps.
- Primary win: hard separation between contract vs runtime; risk: directory/barrel overhead and extra navigation cost.

## Core SDK “public surface” audit (mod → core)

Observed import paths used by `mods/mod-swooper-maps/src/**`:

- `@swooper/mapgen-core` (dominant; types + utilities)
- `@swooper/mapgen-core/authoring` (createStep/createStage/createRecipe + types)
- `@swooper/mapgen-core/lib/{math,grid,noise,plates,heightfield,collections}` (algorithm utilities)
- `@swooper/mapgen-core/engine` (rare; used for `RunSettings` and tag definition types)

Likely target import story to consider:

- Mod authoring should mostly depend on `@swooper/mapgen-core/authoring` (+ `@swooper/mapgen-core` for `ExtendedMapContext` + core utilities).
- Avoid direct `@swooper/mapgen-core/engine` imports by re-exporting needed shared types (e.g., `RunSettings`, `DependencyTagDefinition`) from the authoring surface.

## Decisions needed before touching the SPEC

1) **Config model**
   - Keep MapGenConfig-shaped map authoring + mapping into recipe config, or move to authored recipe config as SSOT?
   - If “composed config” wins: where do cross-cutting settings live (context vs step config vs new run signature)?
2) **Tag definition composition**
   - Keep recipe-wide catalog, split per stage, or contract-slice by kind?
3) **Domain vs step boundary**
   - Strict (pure domain) vs pragmatic (domain can use adapter, but not pipeline semantics)?
4) **Step module standard**
   - Confirm Option A (single-file steps; remove barrels) vs a more structured standard.
5) **Core import surface**
   - Do we want to make `authoring` the only “mod-facing” entrypoint (with a few explicitly-allowed lib subpaths)?

