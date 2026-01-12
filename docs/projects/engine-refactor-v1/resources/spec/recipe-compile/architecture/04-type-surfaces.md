# Type Surfaces

This document summarizes the canonical TypeScript surfaces that make the recipe compiler architecture mechanically enforceable. The codebase is the source of truth.

---

## Core surfaces (source of truth)

### Runtime envelope (`Env`)

- `packages/mapgen-core/src/core/env.ts`
  - `EnvSchema`
  - `Env`

### Ops (contracts + strategies + implementations)

- `packages/mapgen-core/src/authoring/op/contract.ts`
  - `OpContract`
  - `defineOp(...)`
- `packages/mapgen-core/src/authoring/op/strategy.ts`
  - `createStrategy(...)`
  - `StrategySelection<...>` (the strategy envelope union)
- `packages/mapgen-core/src/authoring/op/create.ts`
  - `createOp(...)` → `DomainOp` (exposes `op.config`, `op.defaultConfig`, `op.normalize`, `op.run`)
- `packages/mapgen-core/src/authoring/op/ref.ts`
  - `opRef(contract)` → `{ id, config }` (derives the envelope schema from an op contract)

### Domain ops router (compile/runtime binding)

- `packages/mapgen-core/src/authoring/bindings.ts`
  - `createDomainOpsSurface(...)` (domain entrypoint helper)
  - `collectCompileOps(...)` (recipe boundary helper)
  - `DomainOpsRouter` / `DomainOpsSurface`

### Steps (contracts + modules)

- `packages/mapgen-core/src/authoring/step/contract.ts`
  - `StepContract`
  - `defineStep(...)`
- `packages/mapgen-core/src/authoring/step/create.ts`
  - `createStep(...)`
  - `createStepFor<TContext>()` (mod-local binding of step context types)
- `packages/mapgen-core/src/authoring/types.ts`
  - `Step` / `Stage` / `RecipeConfigInputOf` / `CompiledRecipeConfigOf`

### Stages (single author-facing surface)

- `packages/mapgen-core/src/authoring/stage.ts`
  - `createStage(...)` (computes `surfaceSchema`, provides `toInternal`, enforces reserved keys and kebab-case step ids)

### Recipe compiler (compile-time canonicalization)

- `packages/mapgen-core/src/compiler/recipe-compile.ts`
  - `compileRecipeConfig(...)`
  - `RecipeCompileError`
- `packages/mapgen-core/src/compiler/normalize.ts`
  - `normalizeStrict(...)`
  - `NormalizeCtx`

### Engine (execution plan + executor)

- `packages/mapgen-core/src/engine/execution-plan.ts`
  - `compileExecutionPlan(...)` (plan nodes; validate-only / no config mutation)
- `packages/mapgen-core/src/engine/PipelineExecutor.ts`
  - `PipelineExecutor` (executes an already-compiled plan/config; no config defaulting/cleaning)

---

## Key semantic contracts (pinned)

### `compile` vs `normalize`

- `stage.compile` is **shape-changing**: it maps a stage’s public view to an internal step-id keyed map.
- `step.normalize` and `strategy.normalize` are **shape-preserving**: they may change values but must still validate against the same schema shape.

### Strategy selection shape (op config)

All op config values are strategy envelopes:

```ts
{ strategy: "<strategyId>", config: <strategyConfig> }
```

Steps reuse `op.config` (or `opRef(contract).config`) inside their own step config schemas.

