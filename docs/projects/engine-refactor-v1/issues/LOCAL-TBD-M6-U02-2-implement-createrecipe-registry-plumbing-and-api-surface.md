---
id: LOCAL-TBD-M6-U02-2
title: "[M6] Implement createRecipe registry plumbing and API surface"
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M6
assignees: []
labels: []
parent: LOCAL-TBD-M6-U02
children: []
blocked_by: [LOCAL-TBD-M6-U01, LOCAL-TBD-M6-U02-1]
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Implement `createRecipe` to build the registry internally and expose a registry-free API for compiling and running recipes.

## Deliverables
- `createRecipe` derives full step ids from recipe/stage/step nesting.
- `createRecipe` builds `StepRegistry` and `TagRegistry` internally.
- Recipe API exposes instantiate/compile/run without exposing registry internals.

## Acceptance Criteria
- Step ids are deterministic and follow `recipeId.stageId.stepId` conventions.
- Tag definitions are registered with the internal `TagRegistry`.
- Call sites can compile and execute via the recipe API without using registry types directly.

## Testing / Verification
- `pnpm -C packages/mapgen-core test`
- Add focused authoring tests:
  - `createRecipe` registers tag definitions before steps; missing tags cause a clear compile error.
  - Derived step IDs are deterministic (`recipeId.stageId.stepId`) and stable across runs.
  - Compiled plan config uses schema defaults and rejects unknown keys (no executor-time re-defaulting).

## Dependencies / Notes
- Parent: [LOCAL-TBD-M6-U02](./LOCAL-TBD-M6-U02-ship-authoring-sdk-v1-factories.md)
- Blocked by: [LOCAL-TBD-M6-U01](./LOCAL-TBD-M6-U01-promote-runtime-pipeline-as-engine-sdk-surface.md), [LOCAL-TBD-M6-U02-1](./LOCAL-TBD-M6-U02-1-define-authoring-pojos-and-schema-requirements.md)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
- Build the registry inside `createRecipe` using `StepRegistry` and `TagRegistry`.
- Derive full step ids from nesting (recipe id + stage id + step id).
- Expose a recipe API that can instantiate, compile, and run via `compileExecutionPlan` and `PipelineExecutor` without leaking registry details.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

### Prework Findings (Pending)
#### P1) Registry assembly order + invariants
- `StepRegistry.register` validates `requires`/`provides` tags immediately via `validateDependencyTags`, so tags must exist before step registration (`packages/mapgen-core/src/pipeline/StepRegistry.ts`).
- `TagRegistry.registerTag` enforces `kind` prefix compatibility and validates `demo` payloads (`packages/mapgen-core/src/pipeline/tags.ts`).
- Tag satisfaction is two-phase: a tag must be in the satisfied set (provided by a step), and if `DependencyTagDefinition.satisfies` exists it must return true to be treated as satisfied.
- Required order in `createRecipe`:
  1) Build `TagRegistry`.
  2) Register `tagDefinitions` (all of them).
  3) Build `StepRegistry` with that `TagRegistry`.
  4) Register all steps.

#### P2) Compile/executor config path audit (avoid dual sources of config)
- Config validation happens in `compileExecutionPlan` only; it uses `Value.Default` + `Value.Clean` and reports unknown keys (`packages/mapgen-core/src/pipeline/execution-plan.ts`).
- `PipelineExecutor.executePlan` consumes the plan config as-is; it does not reapply defaults or validate.
- `PipelineExecutor.execute` only uses `resolveStepConfig` when you bypass compile and run a raw recipe directly.
- Recommended SSOT: `createRecipe` should always compile into an `ExecutionPlan` and treat plan node config as final (no executor-side defaulting/merging).

#### P3) Step ID derivation plan (deterministic + auditable)
- Current base recipe steps are un-namespaced (e.g. `foundation`, `landmassPlates`, `coastlines`, `rivers`, `placement`) in `packages/mapgen-core/src/base/recipes/default.ts`.
- Deterministic authoring format to avoid collisions: `recipeId.stageId.stepId` where:
  - `recipeId` is required and globally unique (e.g., `core.base`).
  - `stageId` + `stepId` are required and must not contain dots (to preserve parsing).
  - Full ID uniqueness is enforced across all steps in the recipe.
- Collision risk: re-authoring the base recipe will change step IDs from their legacy single-segment names; downstream tag ownership and tests must be updated in U05.

## Implementation Decisions

### Standardize authored step IDs to `recipeId.stageId.stepId`
- **Context:** `createRecipe` must derive deterministic step IDs; current base recipe uses single-segment step IDs.
- **Options:** (A) keep legacy single-segment IDs for compatibility, (B) always derive `recipeId.stageId.stepId`.
- **Choice:** Option B — always derive `recipeId.stageId.stepId` for authored recipes.
- **Rationale:** Guarantees deterministic, collision-free IDs and keeps authored modules self-describing.
- **Risk:** Base recipe re-authoring will require coordinated updates to tags/tests and any downstream tooling that assumes legacy IDs.
