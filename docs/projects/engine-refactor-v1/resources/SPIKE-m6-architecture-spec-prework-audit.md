# SPIKE — M6 Target Architecture SPEC Prework Audit

This doc is a **scratch/workbook** for tightening the final target architecture SPEC.
It is **not canonical**: use it to make decisions and then promote the settled declarations into `SPEC-target-architecture-draft.md`.

## Hard decisions locked (treat as final)

These are now **directives** for the next phase and must be reflected in the final SPEC (no branching, no compatibility story), except where explicitly marked “open”.

1) **Config SSOT (final):** recipe config is composed + validated (step → stage → recipe). No `MapGenConfig`-shaped “global overrides” and no official `ctx.config` bag access.
2) **Run settings access (final):** settings are a run-level input, and steps access them via **context-carried settings** (e.g. `context.settings`) without changing the step `run(context, config)` signature.
3) **Tag ownership (open):** explore a “domain-owned tag language / contract modules” design; do not lock this in SPEC until explicitly confirmed.
4) **Domain boundary (final):** domain modules are pure; steps own engine semantics (adapter/context/artifact publication).
5) **Step module standard (final):** single-file step modules; ban `steps/index.ts` barrels; prefer decomposition into more steps over per-step directory forests.
6) **Core public surface (final):** mod-facing API is authoring-first; mods must not import from `@swooper/mapgen-core/engine` (treat as a leak to clean up). Explicitly sanctioned `lib/*` imports must be listed in SPEC.

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

### Target (final): composed + validated recipe config is the only config model

Directive: the final SPEC must describe **only** this model.

- Each step owns a TypeBox config schema and derived TS type.
- Each stage config is a composition of its steps’ configs.
- Each recipe config is a composition of its stages’ configs.
- A map file authors **one config surface** for a chosen recipe: `RecipeConfigOf<typeof stages>` (strongly typed) which is validated/defaulted at compile time.
- `ExtendedMapContext.config` is not part of the target authoring/runtime model; any remaining reads are remediation targets.

Concrete grounding for the “validated/defaulted” claim:

- Step config validation/defaulting already happens during plan compile via TypeBox, per step schema:
  - `packages/mapgen-core/src/engine/execution-plan.ts` (`normalizeStepConfig`, `buildNodeConfig`)

Explicit remediation targets implied by this decision:

- Delete the “MapGenConfig overrides → recipe config mapping” mechanism:
  - `mods/mod-swooper-maps/src/maps/_runtime/standard-config.ts` (`StandardRecipeOverrides`, `buildStandardRecipeConfig`)
- Eliminate the remaining “monolithic config bag” reads:
  - `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-post/steps/climateRefine.ts`
  - `mods/mod-swooper-maps/src/domain/narrative/tagging/rifts.ts`

Note: `mods/mod-swooper-maps/src/config/AGENTS.md` currently encodes a centralization rule for config ownership. The target architecture intentionally revises that rule to match composed SSOT; this must be explicit in the final SPEC when promoted.

## Run settings vs context vs config (ADR intent + minimal wiring)

### ADR intent (in plain language)

ADR-ER1-019 exists because “directionality” is:

- cross-cutting (many steps want it),
- semantically run-level (a policy/knob),
- and becomes ambiguous if stored as “someone’s config” (forces duplication or hidden “read another step’s config” dependencies).

So the decision is: **directionality is a `RunRequest.settings` concern** and steps consume it from **settings** (not from `ctx.config.foundation.*` and not from other steps’ config).

- `docs/projects/engine-refactor-v1/ADR.md` (ADR-ER1-019)
- The review record explicitly calls out the current drift and recommends `context.settings`:
  - `docs/projects/engine-refactor-v1/reviews/REVIEW-M5-proposal-clean-architecture-finalization.md` (m5-u09-def-016 review)

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

### Why this is still a real question even though “context holds the world”

Today, “settings” exists as a validated run input and as part of plan identity, but it is **not attached to the runtime context**, so step code can’t read it even though it is conceptually “global for the run.” That gap is exactly why `ctx.config` reads survived (and why directionality was duplicated into step configs).

### Target (final): context-carried settings, no step signature change

Minimal, concrete wiring to make ADR intent real (Option A):

1) Add `settings: RunSettings` onto the runtime context type (e.g. `ExtendedMapContext.settings: RunSettings`).
2) Attach the plan’s settings to the context once per run.
   - Options (choose one in implementation):
     - in `RecipeModule.run` before calling `executor.executePlan(context, plan, ...)`, or
     - in `PipelineExecutor.executePlan` by setting `context.settings = plan.settings` before iterating steps.
3) Steps read settings via `context.settings.*` (e.g. `context.settings.directionality`).

This keeps `run(context, stepConfig)` intact and does not create a second “hidden” settings surface: the context field is simply the runtime attachment of the already-validated `RunRequest.settings`.

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

### Proposed “tags live in domain (contract)” variants (open; bring back options)

This idea already shows up implicitly today: several domain modules import `M3_DEPENDENCY_TAGS` via `@mapgen/domain/tags.js`, which is currently a recipe re-export:

- `mods/mod-swooper-maps/src/domain/tags.ts` re-exports from `recipes/standard/tags.ts`

If domain is “pure” in the target architecture, that shim must be removed. A domain-owned tag language module is a plausible replacement — but we must keep engine semantics (e.g. `satisfies(ctx)`) out of pure domain.

Two code-shaped options to consider:

**Option T1: Pure domain owns tag IDs + artifact payload schemas; recipe owns tag verifiers**

- `domain/contracts/tags.ts` exports IDs (no context usage):

  ```ts
  export const TAG = {
    artifact: { heightfield: "artifact:heightfield" },
    effect: { landmassApplied: "effect:engine.landmassApplied" },
  } as const;
  ```

- `recipes/standard/tags.ts` becomes “explicit definition overrides only” (owners/demos/satisfies), composed from per-stage modules if desired.

**Option T2: A dedicated mod “contracts” layer owns both IDs and `DependencyTagDefinition`s (not `domain/`)**

- Create `mods/mod-swooper-maps/src/contracts/tags/**` (or similar) for the pipeline contract language.
- Keep `domain/**` pure operations only.
- Steps import IDs from `contracts/tags` and declare `requires/provides` with those IDs.
- Recipe imports the definition arrays from `contracts/tags` and passes them to `createRecipe({ tagDefinitions })`.

Recommendation to validate next: **T1** if we want to keep “domain” strictly pure; **T2** if we want a first-class “contract” layer that is allowed to know about engine satisfaction (`satisfies`) and demo payloads.

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

### Target (final): “Domain is pure; steps own engine + pipeline semantics.”

- Domain:
  - no `ExtendedMapContext`, no `ctx.adapter`, no `ctx.artifacts`, no `ctx.overlays`.
  - accepts plain data and returns plain data.
  - may define operation-level TypeBox schemas and TS types for inputs/outputs.
- Steps:
  - are the only place that mutates adapter state and publishes artifacts.
- Consequence: refactors are required for current domain modules that read/publish artifacts or call adapter directly.

Concrete “likely move/split” candidates under either rule set:

- Move/split engine-glue placement into the placement step/stage:
  - `mods/mod-swooper-maps/src/domain/placement/**`
- Move artifact publication out of domain narrative modules into their steps:
  - `mods/mod-swooper-maps/src/domain/narrative/**` (listed above where `ctx.artifacts.set` occurs)
- Re-evaluate recipe-coupled shims:
  - `mods/mod-swooper-maps/src/domain/tags.ts`
  - `mods/mod-swooper-maps/src/domain/artifacts.ts`

### Artifacts vs tags vs “just results” (clarify the semantics)

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

Target alignment with the pure-domain boundary:

- Domain operations return results (plain data) and never publish artifacts/tags.
- Steps decide which returned results become artifacts (store them in `context.artifacts`) and which dependency tags they provide.

## Step module standard (what exists + options)

### Current pattern (M6)

- **Single-file step modules** with schema + derived types + `run`:
  - Example: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts`
- Stage modules import steps via `steps/index.ts` re-export barrels (overhead with low value):
  - Example: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/index.ts`

### Target (final): single-file steps, no step barrels

- Keep step modules as-is.
- Delete `stages/<stageId>/steps/index.ts`; import step modules directly from stage `index.ts`.
- Primary win: remove pointless indirection without changing the step standard.

### Largest-step survey (evidence for “single file + decomposition”)

Top step module sizes in the standard recipe are modest today (largest is ~127 LOC), which supports a blanket “single-file steps” rule without an escape-valve directory standard:

- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts` (~127)
- `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-core/steps/rivers.ts` (~99)
- `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-pre/steps/climateBaseline.ts` (~70)

## Core SDK “public surface” audit (mod → core)

Observed import paths used by `mods/mod-swooper-maps/src/**`:

- `@swooper/mapgen-core` (dominant; types + utilities)
- `@swooper/mapgen-core/authoring` (createStep/createStage/createRecipe + types)
- `@swooper/mapgen-core/lib/{math,grid,noise,plates,heightfield,collections}` (algorithm utilities)
- `@swooper/mapgen-core/engine` (rare; used for `RunSettings` and tag definition types)

### Target (final): authoring-first mod API; ban `/engine` imports

Observed import paths used by `mods/mod-swooper-maps/src/**` (counts from `rg`):

- `@swooper/mapgen-core` (118)
- `@swooper/mapgen-core/authoring` (38)
- `@swooper/mapgen-core/lib/math` (16), `@swooper/mapgen-core/lib/grid` (11), plus a small set of other `lib/*` subpaths
- `@swooper/mapgen-core/engine` (2) — **leaks** (`RunSettings`, `DependencyTagDefinition`, `TagOwner`)

Concrete target contract work implied by this decision:

1) Re-export the minimal authoring-needed engine types from `@swooper/mapgen-core/authoring` so mods never need `/engine`:
   - `RunSettings`
   - `DependencyTagDefinition`
   - `TagOwner`
2) Explicitly list sanctioned `lib/*` imports in the SPEC (based on actual usage today):
   - `@swooper/mapgen-core/lib/math`
   - `@swooper/mapgen-core/lib/grid`
   - `@swooper/mapgen-core/lib/noise`
   - `@swooper/mapgen-core/lib/plates`
   - `@swooper/mapgen-core/lib/heightfield`
   - `@swooper/mapgen-core/lib/collections`

Note: `packages/mapgen-core/src/index.ts` currently re-exports `@mapgen/engine/index.js` from the root package. The target import story should avoid making engine internals reachable via the root entrypoint; this is a core SDK layout/publishing decision to capture in the final SPEC.

## Runtime-ish code living in the mod (Civ7 integration)

Current standard mod runtime glue:

- `mods/mod-swooper-maps/src/maps/_runtime/map-init.ts` (resolve/apply init data; uses Civ7 adapter creation)
- `mods/mod-swooper-maps/src/maps/_runtime/helpers.ts` (adapter creation + default continent bounds helper)
- `mods/mod-swooper-maps/src/maps/_runtime/types.ts` (options + init types)
- `mods/mod-swooper-maps/src/maps/_runtime/run-standard.ts` (standard recipe runner)
- `mods/mod-swooper-maps/src/maps/_runtime/standard-config.ts` (settings builder + legacy overrides→config mapping)

Initial classification (for SPEC promotion later):

- `map-init.ts`, `helpers.ts`, `types.ts`: look like **reusable, canonical Civ7 runtime integration** and should move out of the mod into a shared runtime surface (core SDK or a dedicated runtime package).
- `standard-config.ts`: conflicts with the “composed config SSOT” decision; should be removed/rewritten as part of remediation (no legacy mapping).
- `run-standard.ts`: likely remains mod-owned but should become a thin wrapper around shared runtime helpers + the mod’s own recipe/runtime initialization.

## Remaining open decisions before editing the canonical SPEC

1) **Tag definition ownership + composition standard (open)**
   - Decide whether tag IDs + contracts live under pure `domain/contracts/*` (T1) or a dedicated `contracts/*` layer (T2),
     and whether recipe aggregates per-stage modules or uses a single recipe-wide contract module.
