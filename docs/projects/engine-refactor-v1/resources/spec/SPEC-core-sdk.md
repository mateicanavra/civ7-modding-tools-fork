# SPEC: Target Architecture (Canonical)

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
- `src/engine/**` is kept cohesive as the orchestration runtime: plan compilation, registries, and execution live together.
- Canonical orchestration modules (flat, discoverable):
  - `ExecutionPlan.ts` — structural schemas + plan compilation (`compileExecutionPlan`)
  - `PipelineExecutor.ts` — plan/recipe execution
  - `StepRegistry.ts` — step registration and lookup
  - `TagRegistry.ts` — dependency tag registry + satisfaction checks
  - `errors.ts`, `types.ts`, `Observability.ts`, `index.ts`

### 4.3 Naming and organization conventions (core)

- `src/engine/**` and `src/core/**` use consistent, intention-revealing names:
  - `PascalCase.ts` for primary runtime primitives/modules (classes and named orchestration objects)
  - `lowerCamelCase.ts` for factories/helpers (e.g., `createExtendedMapContext.ts`)
  - `index.ts` for barrels; `types.ts` / `errors.ts` for type/error-only modules
- Do not introduce new kebab-case filenames within the orchestration/runtime surfaces.
- Existing mixed naming (e.g., `execution-plan.ts` alongside `PipelineExecutor.ts`) is legacy; normalize only when it adds clarity or as a dedicated cleanup step.
- `index.ts` files are thin, explicit re-export barrels only.

### 4.4 Core runtime contracts (`src/core/**`)

- `src/core/context/**` owns `ExtendedMapContext` and includes:
  - `adapter: EngineAdapter`
  - `dimensions: MapDimensions`
  - `settings: RunSettings`
  - `buffers` (engine-facing typed arrays)
  - `artifacts` (artifact store keyed by `artifact:*`)
  - `trace` (trace scope)
  - optional engine-owned metrics/diagnostics buffers (not content contracts)
- `ExtendedMapContext` does not include:
  - a monolithic `config`/`MapGenConfig` mega-object
  - domain artifacts (foundation/narrative/placement payload types)
  - narrative registries/caches (those are mod-owned and/or artifacts)
- `src/core/platform/**` owns Civ/platform-facing helper contracts (terrain constants, plot tagging helpers). These are engine-owned and content-agnostic.

### 4.5 Engine structural schemas (co-located)

- Engine-owned schemas are limited to structural validation and live with the orchestration module that consumes them:
  - `src/engine/ExecutionPlan.ts` owns:
    - `RunSettingsSchema` / `RunSettings`
    - `RunRequestSchema` / `RunRequest`
    - recipe structural schemas (`RecipeV2Schema`, `RecipeStepV2Schema`)
  - `src/engine/StepConfig.ts` owns `EmptyStepConfigSchema` for explicit “no config” steps
- Content package step schemas live with steps; the engine does not ship content schemas.

### 4.6 Core SDK entrypoint (`src/index.ts`)

- `src/index.ts` is a compatibility entrypoint only:
  - it may re-export `engine/**`, `core/**`, `authoring/**`, `lib/**`, `trace/**`, and `dev/**`
  - it must not re-export any legacy “core content” surfaces

---

