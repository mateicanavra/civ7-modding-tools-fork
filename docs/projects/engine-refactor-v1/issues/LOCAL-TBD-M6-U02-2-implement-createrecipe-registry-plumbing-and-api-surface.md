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

### Prework Prompts (run before implementation)

#### P1) Registry assembly order + invariants
- **Goal:** Confirm the precise build order to avoid subtle runtime validation failures (tags must exist before steps validate `requires/provides`).
- **Commands:**
  - `sed -n '1,220p' packages/mapgen-core/src/pipeline/StepRegistry.ts`
  - `sed -n '1,220p' packages/mapgen-core/src/pipeline/tags.ts`
- **Output to capture:**
  - The required initialization sequence (`TagRegistry.registerTags` → `StepRegistry.register(step)`).
  - Any behavior that depends on `satisfies` functions vs “provided implies satisfied”.

#### P2) Compile/executor config path audit (avoid dual sources of config)
- **Goal:** Ensure `createRecipe` composes config *values* into `RunRequest.recipe.steps[].config` in exactly one way that the engine compiler validates.
- **Commands:**
  - `rg -n "RecipeStepV1Schema|config: Type\\.Optional" packages/mapgen-core/src/pipeline/execution-plan.ts -S`
  - `rg -n "step\\.configSchema" packages/mapgen-core/src/pipeline -S`
  - `sed -n '1,120p' packages/mapgen-core/src/pipeline/PipelineExecutor.ts`
- **Output to capture:**
  - Where unknown config key validation happens today (compile vs executor).
  - Whether executor has any fallback defaulting path that could conflict with plan configs.
  - A recommended single source of truth: config values live only in compiled plan nodes (preferred).

#### P3) Step ID derivation plan (deterministic + auditable)
- **Goal:** Verify the exact full-step-id format and how it maps to stage/step folder nesting without creating collisions.
- **Commands:**
  - `rg -n "id:\\s*\\\"" packages/mapgen-core/src/base/pipeline -S`
  - `sed -n '1,120p' packages/mapgen-core/src/base/recipes/default.ts`
- **Output to capture:**
  - Existing step IDs and ordering so we can define a deterministic derived ID format that won’t accidentally collide.
  - Any constraints on `recipeId.stageId.stepId` vs namespacing (e.g., `standard.<recipe>.<stage>.<step>`).

### Prework Findings (Pending)
_TODO (agent): append findings here, including the final deterministic ID format and any collision-risk callouts._
