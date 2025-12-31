# SPEC: Target Architecture (Canonical)

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
│  ├─ engine/                        # orchestration runtime (compile + execute + registries)
│  ├─ core/                          # engine-owned context + platform contracts
│  ├─ authoring/                     # authoring ergonomics (factories)
│  ├─ lib/                           # neutral utilities (engine-owned)
│  ├─ trace/                         # tracing primitives
│  ├─ dev/                           # diagnostics (not part of runtime contract)
│  ├─ polyfills/
│  ├─ shims/
│  └─ index.ts                       # package entrypoint
└─ test/
   ├─ engine/
   └─ authoring/
```

**Forbidden in the target core SDK:**
- `packages/mapgen-core/src/config/**`
- `packages/mapgen-core/src/bootstrap/**`
- `packages/mapgen-core/src/base/**`
- any imports from `mods/**`

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
│  │           ├─ steps/             # step modules (standardized contract + implementation pairing)
│  │           │  ├─ index.ts
│  │           │  ├─ <stepId>.model.ts
│  │           │  └─ <stepId>.ts
│  │           └─ *.ts               # stage-scoped helpers/contracts (optional)
│  └─ domain/
│     ├─ config/
│     │  └─ schema/**                # shared schema fragments only
│     └─ **/**                       # domain logic + shared contracts (artifacts, tags, validators)
└─ test/
   └─ **/**
```

**Forbidden in the target standard content package:**
- `mods/mod-swooper-maps/src/config/**` (central config module)
- Any recipe-root “catalog” modules that aggregate unrelated domains (e.g. `recipes/standard/tags.ts`, `recipes/standard/artifacts.ts`)

### 2.4 Colocation and export rules (avoid centralized aggregators)

**Step modules (`stages/<stageId>/steps/<stepId>.*`)**
- Steps are standardized as a 2-file module pair:
  - `<stepId>.model.ts` — step-owned contract model: config schema + derived config type, step-local tag IDs/arrays, and step-owned artifact helpers/validators (only when the artifact is not domain-shared).
  - `<stepId>.ts` — step definition: `createStep({ ... })` + `run` implementation, importing the contract model and domain logic.
- The `.model.ts` file is the ownership surface for step contracts. The `.ts` file is orchestration only.
- If a step’s contract is very large, it may split into additional colocated files (e.g., `<stepId>.schema.ts`, `<stepId>.tags.ts`, `<stepId>.artifacts.ts`) but must remain step-owned under `stages/<stageId>/steps/**` (no repo-wide catalogs).

**Stage scope (`stages/<stageId>/**`)**
- Stage-scoped helpers and contracts shared across multiple steps live at the stage root as explicit modules (e.g., `producer.ts`, `placement-inputs.ts`, `shared.model.ts`).
- Stage files must remain stage-scoped and must not accumulate cross-stage contracts.

**Domain scope (`src/domain/**`)**
- Domain is the home for:
  - domain algorithms
  - domain data contracts (artifact value types + validators, shared tag IDs/definitions)
  - shared config schema fragments (`domain/config/schema/**`) when used by more than one step
- Domain modules may be used by a single step; reuse is not the criterion for domain placement. The criterion is recipe-independence and a clean separation between step orchestration and content logic.
- Domain must not import from `recipes/**` or `maps/**`.

**Barrels (`index.ts`)**
- Barrels must be explicit, thin re-exports only (no side-effect registration, no hidden aggregation).
- Recipe-level assembly (`recipe.ts` + `runtime.ts`) composes stages; it does not define cross-domain catalogs.

**Schemas**
- Step config schemas are step-owned (`<stepId>.model.ts`).
- Shared config schema fragments live with the *closest* real owner:
  - stage scope when shared within a stage (`stages/<stageId>/shared/**`)
  - domain scope when shared across stages/recipes (prefer `src/domain/config/schema/**` when the shared surface is config-oriented)
- Step schemas must not import from a centralized `@mapgen/config` module.

---

