# SPEC: Target Architecture (Canonical)

This document defines the canonical target architecture for MapGen in this repo:

- **Core SDK**: `packages/mapgen-core` (engine runtime + authoring ergonomics only)
- **Standard content package**: `mods/mod-swooper-maps` (mod-owned content: domain libraries, recipes/stages/steps, schemas, tags, artifacts, and Civ7 glue)

---

## 0. Purpose

- Define the runtime contract and ownership boundaries for MapGen.
- Declare the canonical target file structure for the core SDK and the standard content package.

---

## 1. Target Architecture (End-State)

### 1.1 Core principles

- The core SDK is **content-agnostic**: it provides runtime execution + authoring factories, but does not ship privileged pipeline content.
- All pipeline content (steps, tags, artifacts, schema definitions, validators, domain logic) is **mod-owned**.
- Pipeline composition is **recipe-authored** and **explicit** (no implicit stage manifests, no hidden enablement).
- Cross-step dependencies are explicit dependency tags (`artifact:*`, `field:*`, `effect:*`) declared in `requires`/`provides`.
- Step configuration is **validated per step occurrence**; there is no monolithic runtime config object.
- Default authoring is **colocation**:
  - Step-owned: config schemas + config types, dependency tag IDs/definitions, artifact types/validators/publish-get helpers, and any step-local types.
  - Stage-shared: only items shared across multiple steps in the same stage.
  - Domain-shared: only items shared across multiple stages and/or recipes, and only when that sharing is real.
- Centralized “catalog” files are forbidden unless they are **thin, explicit re-export barrels**.

### 1.1.1 Terminology (Schemas, types, tags, artifacts)

- **Config schema**: a runtime validation shape (TypeBox) for user-authored config (JSON-serializable). The engine validates step config against the owning step’s schema during plan compilation.
- **Config type**: the TypeScript type derived from a config schema (`Static<typeof Schema>`). Types are compile-time; schemas are runtime.
- **Dependency tag**: a string ID used for gating (`requires`/`provides`), with a stable prefix:
  - `artifact:*` — declares an intermediate data product
  - `field:*` — declares a mutable engine-facing buffer
  - `effect:*` — declares an externally meaningful engine change/capability guarantee
- **Artifact (value)**: the actual data product stored in `context.artifacts` keyed by an `artifact:*` tag. Tags describe dependency edges; artifacts are the typed values that flow across those edges.
- **Tag definition**: an optional registry entry (`DependencyTagDefinition`) that can attach postconditions (`satisfies`) and demo validation to a tag. Most tags only need an ID and kind; only a minority need custom `satisfies` logic.
- **Step contract module**: a step-owned contract bundle (schema + types + tags + any step-owned artifact helpers) for a single step. Implemented either as a single file or a small colocated module set (inside a step directory or via adjacent `<stepId>.*` files).

### 1.2 Pipeline contract

- Boundary input is `RunRequest = { recipe, settings }`.
- `RunRequest.recipe` is the only ordering/enablement source of truth.
- The runtime compiles a `RunRequest` into an `ExecutionPlan`, then executes the plan against a `StepRegistry`.
- The step contract is `MapGenStep`:
  - `id`: string identifier (globally unique inside a mod registry)
  - `phase`: `GenerationPhase`
  - `requires`: dependency tags
  - `provides`: dependency tags
  - `configSchema`: per-step config schema (TypeBox)
  - `run(context, config)`: side-effecting execution against the run context
- Enablement is recipe-authored and compiled into the plan:
  - Disabled steps do not appear in the `ExecutionPlan`.
  - Steps do not implement “silent skips” (`shouldRun` is not part of the target step contract).
- Validation is fail-fast:
  - Unknown step IDs, unknown tag IDs, and invalid step config are hard errors at compile time.
  - Missing dependencies are hard errors at execution time.

### 1.3 Context shape

- The engine-owned run context is `ExtendedMapContext` (exported from `@swooper/mapgen-core/engine`).
- The context contains only run-global state and runtime surfaces:
  - Adapter I/O surface (`EngineAdapter`)
  - Run settings (the validated `RunSettings` from the `RunRequest`)
  - Mutable buffers/fields (engine-facing typed arrays)
  - Artifact storage (immutable or effectively-immutable intermediates keyed by tag ID)
  - Tracing/observability scope
- Step-local config values do not live on the context; they are carried per node in the `ExecutionPlan`.
- The context must not carry a monolithic `MapGenConfig` (or equivalent “mega-object”).

### 1.4 Dependency tags

- Tags are strings with stable prefixes:
  - `artifact:*` — intermediate products (typically immutable snapshots)
  - `field:*` — mutable engine-facing buffers
  - `effect:*` — externally meaningful engine changes/capability guarantees
- A mod instantiates a `TagRegistry` and registers all tags used by its steps.
- Satisfaction is explicit:
  - A tag is satisfied only if it is in the satisfied set (initially empty by default) or was provided by a completed step.
  - Optional `satisfies(context, state)` functions may add postconditions (e.g., “buffer is allocated and has correct length”).

### 1.5 Phase ownership (target surfaces)

**Core SDK (`packages/mapgen-core`) owns:**
- Runtime execution (`StepRegistry`, `TagRegistry`, `ExecutionPlan` compile, `PipelineExecutor`)
- Engine-owned context surface (adapter I/O + buffers + artifact store + tracing)
- Authoring ergonomics (`createStep`, `createStage`, `createRecipe`)
- Neutral utilities (`lib/**`) and optional diagnostics (`dev/**`)

**Content packages (mods) own:**
- Domain libraries (pure logic)
- Recipe packages (stages/steps wiring + schemas + tags + artifacts)
- Civ7-facing glue to instantiate and run recipes

### 1.6 Narrative / playability model

- Narrative/playability is expressed as **typed, versioned artifacts** published into the artifact store.
- There is no canonical “StoryTags” global surface; any tag-like convenience is derived from artifacts and remains context-scoped.
- Narrative state is context-scoped; there are no module-level narrative registries or caches.

### 1.7 Observability

- Compile-time validation produces structured, actionable errors (unknown step, invalid config).
- Runtime validates dependencies before each step and validates `provides` postconditions after each step.
- Optional tracing is supported via `TraceSession` and step scopes; tracing is not required for correctness.

---

## 2. Target Packaging & File Structure (Core SDK + Standard Content Package)

### 2.1 Package boundaries and import rules

- `packages/mapgen-core` must not import from `mods/**`.
- `mods/mod-swooper-maps/src/domain/**` is a recipe-independent library:
  - It may be imported by `recipes/**` and `maps/**`.
  - It must not import from `recipes/**` or `maps/**`.
- `mods/mod-swooper-maps/src/recipes/**` owns content wiring:
  - It may import from `domain/**` and `@swooper/mapgen-core/*`.
  - It must not import from `maps/**`.
- `mods/mod-swooper-maps/src/maps/**` owns map/preset entrypoints and Civ7 runner glue:
  - Maps may import recipes and domain libs.

### 2.2 Core SDK (`packages/mapgen-core`) target layout (collapsed)

```text
packages/mapgen-core/
├─ src/
│  ├─ engine/                        # runtime-only SDK (content-agnostic)
│  ├─ authoring/                     # ergonomics-only SDK (factories)
│  ├─ lib/                           # neutral utilities (engine-owned)
│  ├─ trace/                         # tracing primitives
│  ├─ dev/                           # diagnostics (not part of runtime contract)
│  ├─ polyfills/
│  ├─ shims/
│  └─ index.ts                       # thin compatibility entrypoint
└─ test/
   ├─ engine/
   └─ authoring/
```

**Forbidden in the target core SDK:**
- `packages/mapgen-core/src/core/**`
- `packages/mapgen-core/src/config/**`
- `packages/mapgen-core/src/bootstrap/**`
- `packages/mapgen-core/src/base/**`
- `packages/mapgen-core/src/pipeline/mod.ts`

### 2.3 Standard content package (`mods/mod-swooper-maps`) target layout (collapsed)

```text
mods/mod-swooper-maps/
├─ src/
│  ├─ mod.ts                         # exports recipes; no global step catalog
│  ├─ maps/                          # map/preset entrypoints (config instances live here)
│  │  ├─ *.ts
│  │  └─ _runtime/                   # Civ7 runner glue (mod-owned)
│  ├─ recipes/
│  │  └─ standard/
│  │     ├─ recipe.ts
│  │     ├─ runtime.ts
│  │     └─ stages/
│  │        └─ <stageId>/
│  │           ├─ index.ts
│  │           ├─ shared/            # stage-scoped shared contracts (only when truly shared)
│  │           └─ steps/             # step modules (each step owns its contract + implementation)
│  └─ domain/
│     └─ **/**                       # pure logic + shared contracts (including shared config schemas when truly shared)
└─ test/
   └─ **/**
```

**Forbidden in the target standard content package:**
- `mods/mod-swooper-maps/src/config/**` (central config module)
- Any recipe-root “catalog” modules that aggregate unrelated domains (e.g. `recipes/standard/tags.ts`, `recipes/standard/artifacts.ts`)

### 2.4 Colocation and export rules (avoid centralized aggregators)

**Step modules (`stages/<stageId>/steps/<stepId>/**` or `stages/<stageId>/steps/<stepId>.*`)**
- The step module is the unit of ownership. It is responsible for its **contract** (schema + tags + artifacts) and its **implementation** (the `run` body).
- Default shape is **one step = one module** (no forced multi-file split):
  - keep the step contract colocated with the step
  - split into additional files only when it materially improves readability (e.g., very large schemas or multi-variant artifact models)
- If a step is split, it is split *with the step* (never into repo-wide “catalog” modules). Common patterns:
  - Directory-based: `schema.ts`, `artifacts.ts`, `tags.ts`
  - File-based: `<stepId>.schema.ts`, `<stepId>.artifacts.ts`, `<stepId>.tags.ts`

**Stage shared modules (`stages/<stageId>/shared/**`)**
- Stage shared modules exist only for items shared across multiple steps in that stage.
- Prefer a single `shared/index.ts` (and optional `shared/schema.ts` / `shared/tags.ts` / `shared/artifacts.ts` only when necessary).
- Stage-shared contracts must remain stage-scoped (do not accumulate cross-stage contracts).

**Barrels (`index.ts`)**
- Barrels must be explicit, thin re-exports only (no side-effect registration, no hidden aggregation).
- Recipe-level assembly (`recipe.ts`) is the only place that composes stages into a recipe module.

**Schemas**
- Step config schemas are step-owned.
- Shared config schema fragments live with the *closest* real owner:
  - stage scope when shared within a stage (`stages/<stageId>/shared/**`)
  - domain scope when shared across stages/recipes (prefer `src/domain/config/schema/**` when the shared surface is config-oriented)
- Step schemas must not import from a centralized `@mapgen/config` module.

---

## 3. Tag Registry (Artifacts, Fields, Effects)

### 3.1 Registry invariants

- Each mod instantiates its own registry; tags are valid only if registered.
- Duplicate tag IDs and duplicate step IDs are hard errors.
- Unknown tag references in `requires`/`provides` are hard errors.
- Demo payloads are optional; if provided, they must validate.

### 3.2 Canonical dependency tag inventory (standard recipe)

Artifacts:
- `artifact:foundation.plates@v1`
- `artifact:foundation.dynamics@v1`
- `artifact:foundation.seed@v1`
- `artifact:foundation.diagnostics@v1`
- `artifact:foundation.config@v1`
- `artifact:heightfield`
- `artifact:climateField`
- `artifact:riverAdjacency`
- `artifact:storyOverlays`
- `artifact:narrative.corridors@v1`
- `artifact:narrative.motifs.margins@v1`
- `artifact:narrative.motifs.hotspots@v1`
- `artifact:narrative.motifs.rifts@v1`
- `artifact:narrative.motifs.orogeny@v1`
- `artifact:placementInputs@v1`
- `artifact:placementOutputs@v1`

Fields:
- `field:terrainType`
- `field:elevation`
- `field:rainfall`
- `field:biomeId`
- `field:featureType`

Effects:
- `effect:engine.landmassApplied`
- `effect:engine.coastlinesApplied`
- `effect:engine.riversModeled`
- `effect:engine.biomesApplied`
- `effect:engine.featuresApplied`
- `effect:engine.placementApplied`

---

## 4. Core SDK (Runtime + Authoring): `packages/mapgen-core`

### 4.1 Core SDK responsibilities

- Provide **content-agnostic runtime** primitives (compile + execute).
- Provide **authoring ergonomics** (typed recipe/stage/step factories).
- Provide **engine-owned context** types and helpers.
- Provide **neutral utilities** (`lib/**`) and optional diagnostics (`dev/**`).
- Do not define or ship mod content (no recipe steps, no tag catalogs, no content artifacts).

### 4.2 Engine runtime module layout (`src/engine/**`)

- The engine runtime surface is `src/engine/**` and is designed to be imported via:
  - `@swooper/mapgen-core/engine` (public)
  - `@swooper/mapgen-core/engine/*` (public subpaths)
- Canonical module groupings:
  - **Contracts** (step + tags): `types.ts`, `dependency-tags.ts`, `errors.ts`
  - **Compilation** (run request → plan): `execution-plan.ts`, `schemas/**`
  - **Execution** (plan → run): `pipeline-executor.ts`, `step-registry.ts`
  - **Context** (engine-owned run context): `context/**`
  - **Platform adapter helpers** (Civ7-facing helpers, not content): `adapter/**`

### 4.3 Naming and organization conventions (core)

- Prefer kebab-case for new files across `src/**`.
- Existing PascalCase entrypoints (e.g., `PipelineExecutor.ts`) are acceptable; normalize mechanically only if it adds clarity.
- `index.ts` files are thin, explicit re-export barrels only.

### 4.4 Engine-owned context contract (`src/engine/context/**`)

- `ExtendedMapContext` is engine-owned and includes:
  - `adapter: EngineAdapter`
  - `dimensions: MapDimensions`
  - `settings: RunSettings`
  - `fields` / `buffers` (engine-facing typed arrays)
  - `artifacts` (artifact store keyed by `artifact:*`)
  - `trace` (trace scope)
  - optional engine-owned metrics/diagnostics buffers (not content contracts)
- `ExtendedMapContext` does not include:
  - a monolithic `config`/`MapGenConfig` mega-object
  - domain artifacts (foundation/narrative/placement payload types)
  - narrative registries/caches (those are mod-owned and/or artifacts)

### 4.5 Engine schema modules (`src/engine/schemas/**`)

- Engine-owned schemas are limited to structural validation:
  - `RunSettingsSchema` / `RunSettings`
  - `RunRequestSchema` / `RunRequest`
  - recipe structural schemas (`RecipeV1Schema`, `RecipeStepV1Schema`)
  - `EmptyStepConfigSchema` for explicit “no config” steps
- Content package step schemas live with steps; the engine does not ship content schemas.

### 4.6 Core SDK entrypoint (`src/index.ts`)

- `src/index.ts` is a compatibility entrypoint only:
  - it may re-export `engine/**`, `authoring/**`, `lib/**`, `trace/**`, and `dev/**`
  - it must not re-export any legacy “core content” surfaces

---

## 5. Standard Content Package (Mod-Owned Content): `mods/mod-swooper-maps`

### 5.1 Content package responsibilities

- Own all content:
  - domain libraries
  - recipe packages (stages + steps)
  - step schemas, tag definitions, artifacts, validators
  - Civ7 runner glue to instantiate context and execute recipes

### 5.2 Recipes are mini-packages (`src/recipes/**`)

- A recipe directory owns:
  - `recipe.ts` (assembly: stages + ordering)
  - `runtime.ts` (runtime glue: tagDefinitions assembly, optional helpers)
  - `stages/**` (stage packages)
- Recipes do not own global catalogs:
  - there is no recipe-root `tags.ts` / `artifacts.ts` / `config.ts` definition source of truth
  - recipe-level aggregation is allowed only as composition (imports + re-exports), not as a grab-bag definition surface

### 5.3 Stages and steps (colocation without forced oversplitting)

- Stage package layout:
  - `stages/<stageId>/index.ts` defines the stage via `createStage({ id, steps })`.
  - `stages/<stageId>/steps/<stepId>/**` defines each step as a step module.
  - `stages/<stageId>/shared/**` exists only for true stage-shared contracts.
- Step module invariants:
  - The step module is the smallest unit that owns its config schema, tags, and artifacts.
  - A step is not required to be split into many files; it may be a single `index.ts`.
  - If split, the split stays within the step module directory (`schema.ts`, `artifacts.ts`, `tags.ts`) and does not create new centralized catalogs elsewhere.

### 5.4 Config ownership (no centralized config package)

- Config values are owned by maps (`src/maps/**`).
- Step config schemas are owned by steps (`src/recipes/**/steps/**`).
- Shared config schema fragments live with the closest owner:
  - stage scope (`stages/<stageId>/shared/**`) when stage-local
  - domain scope (inside the owning `src/domain/**` module) when cross-stage/cross-recipe
- There is no mod-wide `src/config/**` module and no `@mapgen/config` path alias.

### 5.5 Tags, artifacts, and registration

- Steps declare `requires`/`provides` using dependency tag IDs.
- Tags are registered via `TagRegistry` using:
  - auto-derived tag definitions (ID + kind) for most tags, and
  - explicit `DependencyTagDefinition` entries only where custom `satisfies` logic or demo validation is required.
- Explicit tag definitions live with their owning step/stage/domain module and are assembled in `recipes/<recipeId>/runtime.ts`.

### 5.6 Maps and runner glue (`src/maps/**`)

- `src/maps/*.ts` are the map/preset entrypoints:
  - select a recipe module
  - construct `RunSettings` and recipe config instances
- `src/maps/_runtime/**` is mod-owned orchestration glue:
  - builds a Civ7 adapter and `ExtendedMapContext`
  - executes the recipe module

---

## 6. Global Architecture Invariants (Diffable)

- Core SDK (`packages/mapgen-core`) does not depend on mod content (`mods/**`) and does not ship recipe content.
- Content packages own all content artifacts and validators (core may store artifacts but does not define their shapes).
- Centralized mega-modules are forbidden:
  - no mod-wide config schema/loader package
  - no recipe-root tag/artifact catalogs
  - no “god files” that define multiple unrelated stages’ contracts
- Colocation is the default:
  - step-owned contracts live with steps
  - stage-shared contracts live in stage shared modules
  - domain-shared contracts live with their owning domain library

---

## 7. Appendix: Canonical Target Trees (Full)

### 7.1 Core SDK: `packages/mapgen-core` (full)

```text
packages/mapgen-core/
├─ AGENTS.md
├─ bunfig.toml
├─ package.json
├─ tsconfig.json
├─ tsconfig.paths.json
├─ tsconfig.tsup.json
├─ tsup.config.ts
├─ src/
│  ├─ AGENTS.md
│  ├─ index.ts
│  ├─ authoring/
│  │  ├─ index.ts
│  │  ├─ recipe.ts
│  │  ├─ stage.ts
│  │  ├─ step.ts
│  │  └─ types.ts
│  ├─ dev/
│  │  ├─ ascii.ts
│  │  ├─ flags.ts
│  │  ├─ histograms.ts
│  │  ├─ index.ts
│  │  ├─ introspection.ts
│  │  ├─ logging.ts
│  │  ├─ summaries.ts
│  │  └─ timing.ts
│  ├─ engine/
│  │  ├─ index.ts
│  │  ├─ dependency-tags.ts
│  │  ├─ errors.ts
│  │  ├─ execution-plan.ts
│  │  ├─ observability.ts
│  │  ├─ pipeline-executor.ts
│  │  ├─ step-registry.ts
│  │  ├─ types.ts
│  │  ├─ adapter/
│  │  │  ├─ index.ts
│  │  │  ├─ plot-tags.ts
│  │  │  └─ terrain-constants.ts
│  │  ├─ context/
│  │  │  ├─ index.ts
│  │  │  ├─ create-context.ts
│  │  │  ├─ rng.ts
│  │  │  ├─ sync.ts
│  │  │  ├─ types.ts
│  │  │  └─ writers.ts
│  │  └─ schemas/
│  │     ├─ index.ts
│  │     ├─ empty-step-config.ts
│  │     ├─ recipe-v1.ts
│  │     ├─ run-request.ts
│  │     ├─ run-settings.ts
│  │     └─ trace.ts
│  ├─ lib/
│  │  ├─ collections/
│  │  │  ├─ freeze-clone.ts
│  │  │  ├─ index.ts
│  │  │  └─ record.ts
│  │  ├─ grid/
│  │  │  ├─ bounds.ts
│  │  │  ├─ distance/
│  │  │  │  └─ bfs.ts
│  │  │  ├─ index.ts
│  │  │  ├─ indexing.ts
│  │  │  ├─ neighborhood/
│  │  │  │  ├─ hex-oddq.ts
│  │  │  │  └─ square-3x3.ts
│  │  │  └─ wrap.ts
│  │  ├─ heightfield/
│  │  │  ├─ base.ts
│  │  │  ├─ index.ts
│  │  │  └─ sea-level.ts
│  │  ├─ math/
│  │  │  ├─ clamp.ts
│  │  │  ├─ index.ts
│  │  │  └─ lerp.ts
│  │  ├─ noise/
│  │  │  ├─ fractal.ts
│  │  │  ├─ index.ts
│  │  │  └─ perlin.ts
│  │  ├─ plates/
│  │  │  ├─ crust.ts
│  │  │  ├─ index.ts
│  │  │  └─ topology.ts
│  │  └─ rng/
│  │     ├─ index.ts
│  │     ├─ pick.ts
│  │     ├─ unit.ts
│  │     └─ weighted-choice.ts
│  ├─ polyfills/
│  │  └─ text-encoder.ts
│  ├─ shims/
│  │  └─ typebox-format.ts
│  └─ trace/
│     └─ index.ts
└─ test/
   ├─ authoring/
   │  └─ authoring.test.ts
   ├─ engine/
   │  ├─ execution-plan.test.ts
   │  ├─ hello-mod.smoke.test.ts
   │  ├─ placement-gating.test.ts
   │  ├─ tag-registry.test.ts
   │  ├─ tracing.test.ts
   │  └─ smoke.test.ts
   └─ setup.ts
```

### 7.2 Standard content package: `mods/mod-swooper-maps` (full)

```text
mods/mod-swooper-maps/
├─ AGENTS.md
├─ package.json
├─ tsconfig.json
├─ tsconfig.tsup.json
├─ tsup.config.ts
├─ mod/
│  ├─ config/
│  │  └─ config.xml
│  ├─ swooper-maps.modinfo
│  └─ text/
│     └─ en_us/
│        ├─ MapText.xml
│        └─ ModuleText.xml
├─ src/
│  ├─ AGENTS.md
│  ├─ mod.ts
│  ├─ maps/
│  │  ├─ gate-a-continents.ts
│  │  ├─ shattered-ring.ts
│  │  ├─ sundered-archipelago.ts
│  │  ├─ swooper-desert-mountains.ts
│  │  ├─ swooper-earthlike.ts
│  │  └─ _runtime/
│  │     ├─ helpers.ts
│  │     ├─ map-init.ts
│  │     ├─ run-standard.ts
│  │     ├─ standard-config.ts
│  │     └─ types.ts
│  ├─ domain/
│  │  ├─ ecology/
│  │  │  ├─ index.ts
│  │  │  ├─ biomes/
│  │  │  │  ├─ coastal.ts
│  │  │  │  ├─ globals.ts
│  │  │  │  ├─ index.ts
│  │  │  │  ├─ types.ts
│  │  │  │  └─ nudges/
│  │  │  │     ├─ corridor-bias.ts
│  │  │  │     ├─ corridor-edge-hints.ts
│  │  │  │     ├─ rift-shoulder.ts
│  │  │  │     ├─ river-valley.ts
│  │  │  │     ├─ tropical-coast.ts
│  │  │  │     └─ tundra-restraint.ts
│  │  │  └─ features/
│  │  │     ├─ density-tweaks.ts
│  │  │     ├─ index.ts
│  │  │     ├─ indices.ts
│  │  │     ├─ paradise-reefs.ts
│  │  │     ├─ place-feature.ts
│  │  │     ├─ shelf-reefs.ts
│  │  │     ├─ types.ts
│  │  │     └─ volcanic-vegetation.ts
│  │  ├─ foundation/
│  │  │  ├─ constants.ts
│  │  │  ├─ index.ts
│  │  │  ├─ plate-seed.ts
│  │  │  ├─ plates.ts
│  │  │  └─ types.ts
│  │  ├─ hydrology/
│  │  │  ├─ index.ts
│  │  │  └─ climate/
│  │  │     ├─ baseline.ts
│  │  │     ├─ distance-to-water.ts
│  │  │     ├─ index.ts
│  │  │     ├─ orographic-shadow.ts
│  │  │     ├─ runtime.ts
│  │  │     ├─ types.ts
│  │  │     ├─ refine/
│  │  │     │  ├─ hotspot-microclimates.ts
│  │  │     │  ├─ index.ts
│  │  │     │  ├─ orogeny-belts.ts
│  │  │     │  ├─ orographic-shadow.ts
│  │  │     │  ├─ rift-humidity.ts
│  │  │     │  ├─ river-corridor.ts
│  │  │     │  └─ water-gradient.ts
│  │  │     └─ swatches/
│  │  │        ├─ chooser.ts
│  │  │        ├─ equatorial-rainbelt.ts
│  │  │        ├─ great-plains.ts
│  │  │        ├─ index.ts
│  │  │        ├─ macro-desert-belt.ts
│  │  │        ├─ monsoon-bias.ts
│  │  │        ├─ mountain-forests.ts
│  │  │        ├─ rainforest-archipelago.ts
│  │  │        └─ types.ts
│  │  ├─ morphology/
│  │  │  ├─ index.ts
│  │  │  ├─ coastlines/
│  │  │  │  ├─ adjacency.ts
│  │  │  │  ├─ corridor-policy.ts
│  │  │  │  ├─ index.ts
│  │  │  │  ├─ plate-bias.ts
│  │  │  │  ├─ rugged-coasts.ts
│  │  │  │  └─ types.ts
│  │  │  ├─ islands/
│  │  │  │  ├─ adjacency.ts
│  │  │  │  ├─ fractal-threshold.ts
│  │  │  │  ├─ index.ts
│  │  │  │  ├─ placement.ts
│  │  │  │  └─ types.ts
│  │  │  ├─ landmass/
│  │  │  │  ├─ crust-first-landmask.ts
│  │  │  │  ├─ diagnostics.ts
│  │  │  │  ├─ index.ts
│  │  │  │  ├─ plate-stats.ts
│  │  │  │  ├─ post-adjustments.ts
│  │  │  │  ├─ terrain-apply.ts
│  │  │  │  ├─ types.ts
│  │  │  │  ├─ water-target.ts
│  │  │  │  ├─ windows.ts
│  │  │  │  └─ ocean-separation/
│  │  │  │     ├─ apply.ts
│  │  │  │     ├─ carve.ts
│  │  │  │     ├─ fill.ts
│  │  │  │     ├─ index.ts
│  │  │  │     ├─ policy.ts
│  │  │  │     ├─ row-state.ts
│  │  │  │     └─ types.ts
│  │  │  ├─ mountains/
│  │  │  │  ├─ apply.ts
│  │  │  │  ├─ index.ts
│  │  │  │  ├─ scoring.ts
│  │  │  │  ├─ selection.ts
│  │  │  │  └─ types.ts
│  │  │  └─ volcanoes/
│  │  │     ├─ apply.ts
│  │  │     ├─ index.ts
│  │  │     ├─ scoring.ts
│  │  │     ├─ selection.ts
│  │  │     └─ types.ts
│  │  ├─ narrative/
│  │  │  ├─ artifacts.ts
│  │  │  ├─ index.ts
│  │  │  ├─ queries.ts
│  │  │  ├─ swatches.ts
│  │  │  ├─ paleo/
│  │  │  │  ├─ index.ts
│  │  │  │  └─ rainfall-artifacts.ts
│  │  │  ├─ overlays/
│  │  │  │  ├─ index.ts
│  │  │  │  ├─ keys.ts
│  │  │  │  ├─ normalize.ts
│  │  │  │  └─ registry.ts
│  │  │  ├─ corridors/
│  │  │  │  ├─ backfill.ts
│  │  │  │  ├─ index.ts
│  │  │  │  ├─ island-hop.ts
│  │  │  │  ├─ land-corridors.ts
│  │  │  │  ├─ river-chains.ts
│  │  │  │  ├─ runtime.ts
│  │  │  │  ├─ sea-lanes.ts
│  │  │  │  ├─ state.ts
│  │  │  │  ├─ style-cache.ts
│  │  │  │  └─ types.ts
│  │  │  ├─ orogeny/
│  │  │  │  ├─ belts.ts
│  │  │  │  ├─ cache.ts
│  │  │  │  ├─ index.ts
│  │  │  │  └─ wind.ts
│  │  │  ├─ tagging/
│  │  │  │  ├─ hotspots.ts
│  │  │  │  ├─ index.ts
│  │  │  │  ├─ margins.ts
│  │  │  │  ├─ rifts.ts
│  │  │  │  └─ types.ts
│  │  │  └─ utils/
│  │  │     ├─ adjacency.ts
│  │  │     ├─ dims.ts
│  │  │     ├─ latitude.ts
│  │  │     ├─ rng.ts
│  │  │     └─ water.ts
│  │  ├─ placement/
│  │  │  ├─ advanced-start.ts
│  │  │  ├─ areas.ts
│  │  │  ├─ diagnostics.ts
│  │  │  ├─ discoveries.ts
│  │  │  ├─ fertility.ts
│  │  │  ├─ floodplains.ts
│  │  │  ├─ index.ts
│  │  │  ├─ resources.ts
│  │  │  ├─ snow.ts
│  │  │  ├─ starts.ts
│  │  │  ├─ terrain-validation.ts
│  │  │  ├─ types.ts
│  │  │  ├─ water-data.ts
│  │  │  └─ wonders.ts
│  │  └─ index.ts
│  └─ recipes/
│     └─ standard/
│        ├─ recipe.ts
│        ├─ runtime.ts
│        └─ stages/
│           ├─ ecology/
│           │  ├─ index.ts
│           │  ├─ shared/
│           │  │  └─ index.ts
│           │  └─ steps/
│           │     ├─ index.ts
│           │     ├─ biomes/
│           │     │  └─ index.ts
│           │     └─ features/
│           │        └─ index.ts
│           ├─ foundation/
│           │  ├─ index.ts
│           │  ├─ shared/
│           │  │  └─ index.ts
│           │  └─ steps/
│           │     ├─ index.ts
│           │     └─ foundation/
│           │        └─ index.ts
│           ├─ hydrology-core/
│           │  ├─ index.ts
│           │  ├─ shared/
│           │  │  └─ index.ts
│           │  └─ steps/
│           │     ├─ index.ts
│           │     └─ rivers/
│           │        └─ index.ts
│           ├─ hydrology-post/
│           │  ├─ index.ts
│           │  ├─ shared/
│           │  │  └─ index.ts
│           │  └─ steps/
│           │     ├─ index.ts
│           │     └─ climateRefine/
│           │        └─ index.ts
│           ├─ hydrology-pre/
│           │  ├─ index.ts
│           │  ├─ shared/
│           │  │  └─ index.ts
│           │  └─ steps/
│           │     ├─ index.ts
│           │     ├─ climateBaseline/
│           │     │  └─ index.ts
│           │     └─ lakes/
│           │        └─ index.ts
│           ├─ morphology-mid/
│           │  ├─ index.ts
│           │  ├─ shared/
│           │  │  └─ index.ts
│           │  └─ steps/
│           │     ├─ index.ts
│           │     └─ ruggedCoasts/
│           │        └─ index.ts
│           ├─ morphology-post/
│           │  ├─ index.ts
│           │  ├─ shared/
│           │  │  └─ index.ts
│           │  └─ steps/
│           │     ├─ index.ts
│           │     ├─ islands/
│           │     │  └─ index.ts
│           │     ├─ mountains/
│           │     │  └─ index.ts
│           │     └─ volcanoes/
│           │        └─ index.ts
│           ├─ morphology-pre/
│           │  ├─ index.ts
│           │  ├─ shared/
│           │  │  └─ index.ts
│           │  └─ steps/
│           │     ├─ index.ts
│           │     ├─ coastlines/
│           │     │  └─ index.ts
│           │     └─ landmassPlates/
│           │        └─ index.ts
│           ├─ narrative-mid/
│           │  ├─ index.ts
│           │  ├─ shared/
│           │  │  └─ index.ts
│           │  └─ steps/
│           │     ├─ index.ts
│           │     ├─ storyCorridorsPre/
│           │     │  └─ index.ts
│           │     └─ storyOrogeny/
│           │        └─ index.ts
│           ├─ narrative-post/
│           │  ├─ index.ts
│           │  ├─ shared/
│           │  │  └─ index.ts
│           │  └─ steps/
│           │     ├─ index.ts
│           │     └─ storyCorridorsPost/
│           │        └─ index.ts
│           ├─ narrative-pre/
│           │  ├─ index.ts
│           │  ├─ shared/
│           │  │  └─ index.ts
│           │  └─ steps/
│           │     ├─ index.ts
│           │     ├─ storyHotspots/
│           │     │  └─ index.ts
│           │     ├─ storyRifts/
│           │     │  └─ index.ts
│           │     └─ storySeed/
│           │        └─ index.ts
│           ├─ narrative-swatches/
│           │  ├─ index.ts
│           │  ├─ shared/
│           │  │  └─ index.ts
│           │  └─ steps/
│           │     ├─ index.ts
│           │     └─ storySwatches/
│           │        └─ index.ts
│           └─ placement/
│              ├─ index.ts
│              ├─ shared/
│              │  └─ index.ts
│              └─ steps/
│                 ├─ index.ts
│                 ├─ derivePlacementInputs/
│                 │  └─ index.ts
│                 └─ placement/
│                    └─ index.ts
└─ test/
   ├─ dev/
   │  └─ crust-map.test.ts
   ├─ foundation/
   │  ├─ plate-seed.test.ts
   │  ├─ plates.test.ts
   │  └─ voronoi.test.ts
   ├─ layers/
   │  └─ callsite-fixes.test.ts
   ├─ pipeline/
   │  └─ artifacts.test.ts
   ├─ story/
   │  ├─ corridors.test.ts
   │  ├─ orogeny.test.ts
   │  ├─ overlays.test.ts
   │  ├─ paleo.test.ts
   │  └─ tags.test.ts
   ├─ standard-recipe.test.ts
   └─ standard-run.test.ts
```
