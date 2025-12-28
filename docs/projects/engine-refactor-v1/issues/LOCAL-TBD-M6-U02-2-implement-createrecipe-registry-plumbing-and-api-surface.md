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
