### File-level reconciliation (what lives where)

This section maps the canonical “recipe compile” concepts to their current locations in the repo.

---

## Compiler (compile-time canonicalization)

- `packages/mapgen-core/src/compiler/recipe-compile.ts`
  - `compileRecipeConfig(...)`
  - `RecipeCompileError` + compiler error item shape/codes
- `packages/mapgen-core/src/compiler/normalize.ts`
  - `normalizeStrict(...)` (default + clean + unknown key errors)
  - `prefillOpDefaults(...)` and `normalizeOpsTopLevel(...)` (compiler-owned wiring helpers)

---

## Authoring (contracts + factories)

- `packages/mapgen-core/src/authoring/step/contract.ts`
  - `defineStep(...)` (kebab-case step id enforcement, schema conventions)
- `packages/mapgen-core/src/authoring/step/create.ts`
  - `createStep(...)` / `createStepFor<TContext>()`
- `packages/mapgen-core/src/authoring/stage.ts`
  - `createStage(...)` (computed stage surface schema; reserved key enforcement)
- `packages/mapgen-core/src/authoring/op/*`
  - `defineOp(...)` / `createStrategy(...)` / `createOp(...)`
  - `opRef(...)` (derive op envelope schema from an op contract)
- `packages/mapgen-core/src/authoring/bindings.ts`
  - `createDomainOpsSurface(...)`
  - `collectCompileOps(...)`

---

## Engine (plan + executor)

- `packages/mapgen-core/src/engine/execution-plan.ts`
  - `compileExecutionPlan(...)` builds plan nodes from an already-instantiated recipe v2 and a step registry
  - no schema defaulting/cleaning; no step/op normalization hooks invoked here
- `packages/mapgen-core/src/engine/PipelineExecutor.ts`
  - executes plan nodes; no config defaulting/cleaning/validation

---

## Mods (canonical downstream usage)

### Domain modules

- `mods/mod-swooper-maps/src/domain/<domain>/index.ts`
  - exports `contracts` + `ops` (router surface) and re-exports contract symbols

### Recipes/stages/steps

- `mods/mod-swooper-maps/src/recipes/<recipe>/recipe.ts`
  - assembles `compileOpsById` via `collectCompileOps(...)`
  - `createRecipe(...)` is the entrypoint that calls the compiler before engine plan compilation
- `mods/mod-swooper-maps/src/recipes/**/stages/<stage>/index.ts`
  - defines stage `public` schema (optional) + `compile` mapping + `steps` list
- `mods/mod-swooper-maps/src/recipes/**/stages/**/steps/<step>/contract.ts`
  - `defineStep(...)` + explicit schema
- `mods/mod-swooper-maps/src/recipes/**/stages/**/steps/<step>/index.ts`
  - `createStep(contract, { normalize?, run })`
  - binds ops via `domain.ops.bind({ ...contracts })`

