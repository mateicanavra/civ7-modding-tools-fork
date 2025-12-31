# SPEC: Target Architecture (Canonical)

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
  - `stages/<stageId>/steps/` contains step modules (standardized contract + implementation pairing):
    - `steps/index.ts` is the only barrel; it re-exports step modules explicitly.
    - Each step is defined by `steps/<stepId>.model.ts` + `steps/<stepId>.ts`.
  - Stage-scoped helpers/contracts (when shared across multiple steps) live at the stage root as explicit modules (e.g., `producer.ts`, `shared.model.ts`).
- Step module invariants:
  - `<stepId>.model.ts` is the step’s contract surface (schema + types + tags + step-owned artifact helpers).
  - `<stepId>.ts` is the step definition and `run` orchestration; it imports the model and domain logic.
  - Steps do not introduce recipe-wide catalogs; shared contracts live at the closest real owner (stage root or domain).

### 5.4 Config ownership (no centralized config package)

- Config values are owned by maps (`src/maps/**`).
- Step config schemas are owned by steps (`src/recipes/**/stages/**/steps/*.model.ts`).
- Shared config schema fragments live with the closest owner:
  - stage scope (`stages/<stageId>/*.model.ts`) when stage-local
  - domain scope (`src/domain/config/schema/**` and other domain modules) when cross-stage/cross-recipe
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

