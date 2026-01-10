# SPEC: Target Architecture (Canonical)

## 0. Purpose

- Define the runtime contract and ownership boundaries for MapGen.
- Declare the canonical target file structure for the core SDK and the standard content package.

---

## 1. Target Architecture (End-State)

### 1.1 Core principles

- The core SDK is **content-agnostic**: it provides runtime execution + authoring factories, but does not ship privileged pipeline content.
- All pipeline content (steps, tags, artifacts, schema definitions, validators, domain logic) is **mod-owned**.
- Pipeline composition is **recipe-authored** and **explicit** (no implicit stage manifests, no hidden enablement).
- Cross-step dependencies are explicit dependency tags (`artifact:*`, `buffer:*`, `effect:*`) declared in `requires`/`provides`.
- Step configuration is **validated per step occurrence**; there is no monolithic runtime config object.
- Operations are **contract-first** and strategy selection is an op-local config concern; steps call ops but do not bind or declare op graphs.
- Operation types are derived from the contract and exported only from each op’s `types.ts`; rules never export types and never import `contract.ts`.
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
  - `buffer:*` — declares a mutable engine-facing buffer
  - `effect:*` — declares an externally meaningful engine change/capability guarantee
- **Artifact (value)**: an immutable snapshot stored in `context.artifacts` keyed by an `artifact:*` tag. Tags describe dependency edges; artifacts are the typed values that flow across those edges.
- **Tag definition**: an optional registry entry (`DependencyTagDefinition`) that can attach postconditions (`satisfies`) and demo validation to a tag. Most tags only need an ID and kind; only a minority need custom `satisfies` logic.
- **Step contract module**: a step-owned contract bundle for a single step (schema + derived config type + tag IDs/arrays + optional step-owned artifact helpers/validators). The default shape is `steps/<stepId>/contract.ts` colocated next to the step implementation.

### 1.2 Pipeline contract

- Boundary input is `RunRequest = { recipe, settings }`.
- `RunRequest.recipe` is the only ordering/enablement source of truth.
- The runtime compiles a `RunRequest` into an `ExecutionPlan`, then executes the plan against a `StepRegistry`.
- The step contract is metadata-only (`MapGenStepContract`):
  - `id`: string identifier (globally unique inside a mod registry)
  - `phase`: `GenerationPhase`
  - `requires`: dependency tags
  - `provides`: dependency tags
  - `schema`: per-step config schema (TypeBox)
- The runtime step (`MapGenStep`) is created by `createStepFor<TContext>()` and attaches:
  - `resolveConfig?`: optional compile-time config resolver
  - `run(context, config)`: side-effecting execution against the run context
- Enablement is recipe-authored and compiled into the plan:
  - Disabled steps do not appear in the `ExecutionPlan`.
  - Steps do not implement “silent skips” (`shouldRun` is not part of the target step contract).
- Validation is fail-fast:
  - Unknown step IDs, unknown tag IDs, and invalid step config are hard errors at compile time.
  - Missing dependencies are hard errors at execution time.

### 1.3 Context shape

- The engine-owned run context is `ExtendedMapContext` (exported from `@swooper/mapgen-core/core`).
- The context contains only run-global state and runtime surfaces:
  - Adapter I/O surface (`EngineAdapter`)
  - Run settings (the validated `RunSettings` from the `RunRequest`)
  - Mutable buffers (engine-facing typed arrays)
  - Artifact storage (immutable snapshots keyed by dependency ID; immutability is enforced)
  - Tracing/observability scope
- Step-local config values do not live on the context; they are carried per node in the `ExecutionPlan`.
- The context must not carry a monolithic `MapGenConfig` (or equivalent “mega-object”).

### 1.4 Dependency tags

- Tags are strings with stable prefixes:
  - `artifact:*` — intermediate products (immutable snapshots)
  - `buffer:*` — mutable engine-facing buffers
  - `effect:*` — externally meaningful engine changes/capability guarantees
- A mod instantiates a `TagRegistry` and registers all tags used by its steps.
- Satisfaction is explicit:
  - A tag is satisfied only if it is in the satisfied set (initially empty by default) or was provided by a completed step.
  - Optional `satisfies(context, state)` functions may add postconditions (e.g., “buffer is allocated and has correct length”).

### 1.5 Phase ownership (target surfaces)

**Core SDK (`CORE_SDK_ROOT`) owns:**
- Runtime execution (`StepRegistry`, `TagRegistry`, `ExecutionPlan` compile, `PipelineExecutor`)
- Engine-owned context surface (adapter I/O + buffers + artifact store + tracing)
- Authoring ergonomics (`defineStep`, `createStepFor`, `createStage`, `createRecipe`)
- Neutral utilities (`lib/**`) and optional diagnostics (`dev/**`)

**Content packages (mods) own:**
- Domain libraries (pure logic)
- Recipe packages (stages/steps wiring + schemas + tags + artifacts)
- Civ7-facing glue to instantiate and run recipes

### 1.6 Narrative / playability model

- Narrative/playability is expressed as **typed, versioned story entries** published into the artifact store.
- Each story entry is classified under a **motif** (e.g. corridors/regions/hotspots), and consumers query story entries by motif.
- Narrative **views** (including overlay snapshots) are **derived on demand** from story entries (and, where relevant, current buffers); views are not published dependency surfaces.
- There is no canonical `StoryTags` global surface; any map-surface convenience remains **derived** and context-scoped.
- Narrative correctness must not depend on module-level caches or registries.

### 1.7 Observability

- Compile-time validation produces structured, actionable errors (unknown step, invalid config).
- Runtime validates dependencies before each step and validates `provides` postconditions after each step.
- Optional tracing is configured via `RunRequest.settings.trace` and implemented via `TraceSession` + per-step scopes; the default sink is console and tracing is not required for correctness.

---
