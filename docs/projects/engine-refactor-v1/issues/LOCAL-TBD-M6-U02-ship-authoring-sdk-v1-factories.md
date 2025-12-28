---
id: LOCAL-TBD-M6-U02
title: "[M6] Ship authoring SDK v1 factories"
state: planned
priority: 2
estimate: 16
project: engine-refactor-v1
milestone: M6
assignees: []
labels: []
parent: null
children: [LOCAL-TBD-M6-U02-1, LOCAL-TBD-M6-U02-2]
blocked_by: [LOCAL-TBD-M6-U01]
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Ship the authoring SDK v1 surface by completing the sequenced child issues.

## Deliverables
- Authoring SDK v1 is available under `packages/mapgen-core/src/authoring/**`.
- `createStep`, `createStage`, and `createRecipe` are the primary authoring entrypoints.
- Registry plumbing is internal to the authoring SDK.

## Acceptance Criteria
- Child issues are complete and the authoring SDK v1 contract is available.
- Steps require a config schema and recipes require tag definitions (even if empty).
- Recipes can compile and execute without exposing registry internals.

## Testing / Verification
- `pnpm -C packages/mapgen-core test`

## Dependencies / Notes
- Blocked by: [LOCAL-TBD-M6-U01](./LOCAL-TBD-M6-U01-promote-runtime-pipeline-as-engine-sdk-surface.md)
- Sub-issues:
  - [LOCAL-TBD-M6-U02-1](./LOCAL-TBD-M6-U02-1-define-authoring-pojos-and-schema-requirements.md)
  - [LOCAL-TBD-M6-U02-2](./LOCAL-TBD-M6-U02-2-implement-createrecipe-registry-plumbing-and-api-surface.md)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
- Sequencing: complete `LOCAL-TBD-M6-U02-1` before `LOCAL-TBD-M6-U02-2` to lock in the authored module shapes.
- Child issue docs carry the detailed implementation steps.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

### Prework Prompts (run before implementation)

#### P1) Confirm consumer cutover surface (who will import authoring)
- **Goal:** Establish the full set of call sites that will be migrated to import `@swooper/mapgen-core/authoring` so we can keep the authoring surface minimal and avoid accidental “engine leaks”.
- **Commands:**
  - `rg -n "runTaskGraphGeneration|baseMod|PipelineModV1|@swooper/mapgen-core/base" -S mods packages`
  - `rg -n "compileExecutionPlan|PipelineExecutor|StepRegistry|TagRegistry" -S mods packages`
- **Output to capture:**
  - A short list of “authoring consumers” by package (maps, tests, any CLI/runner glue).
  - A short list of “engine consumers” that must remain internal (should end up only in authoring SDK + tests).

### Prework Findings (Pending)
#### P1) Confirm consumer cutover surface (who will import authoring)
- Authoring consumers (external call sites that should migrate to `@swooper/mapgen-core/authoring`):
  - `mods/mod-swooper-maps/src/sundered-archipelago.ts` (uses `runTaskGraphGeneration`)
  - `mods/mod-swooper-maps/src/swooper-desert-mountains.ts` (uses `runTaskGraphGeneration`, `baseMod`)
  - `mods/mod-swooper-maps/src/swooper-earthlike.ts` (uses `runTaskGraphGeneration`, `baseMod`)
  - `mods/mod-swooper-maps/src/shattered-ring.ts` (uses `runTaskGraphGeneration`)
  - `packages/mapgen-core/test/orchestrator/task-graph.smoke.test.ts` (uses `runTaskGraphGeneration`, `baseMod`)
  - `packages/mapgen-core/test/orchestrator/generateMap.integration.test.ts` (uses `runTaskGraphGeneration`, `baseMod`)
  - `packages/mapgen-core/test/orchestrator/worldmodel-config-wiring.test.ts` (uses `runTaskGraphGeneration`, `baseMod`)
  - `packages/mapgen-core/test/orchestrator/placement-config-wiring.test.ts` (uses `runTaskGraphGeneration`, `baseMod`)
- Engine consumers (should stay internal to engine/authoring SDK, not surfaced to mods):
  - `packages/mapgen-core/src/orchestrator/task-graph.ts` (direct `compileExecutionPlan`, `PipelineExecutor`, `StepRegistry`)
  - Engine-facing tests under `packages/mapgen-core/test/pipeline/**` and `packages/mapgen-core/test/orchestrator/paleo-ordering.test.ts`
- No other packages/CLI/plugins import these symbols outside `packages/mapgen-core` + `mods`.
