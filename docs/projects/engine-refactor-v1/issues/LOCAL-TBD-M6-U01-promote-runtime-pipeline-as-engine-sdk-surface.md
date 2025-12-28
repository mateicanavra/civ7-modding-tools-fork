---
id: LOCAL-TBD-M6-U01
title: "[M6] Promote runtime pipeline as engine SDK surface"
state: planned
priority: 2
estimate: 8
project: engine-refactor-v1
milestone: M6
assignees: []
labels: []
parent: null
children: []
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Move the runtime pipeline into `engine/**` and make it the canonical runtime SDK surface.

## Deliverables
- `packages/mapgen-core/src/engine/**` contains runtime modules and types.
- Public exports point at `engine/**` (no `pipeline/**` surface).
- Engine tests import from the engine SDK.

## Acceptance Criteria
- `StepRegistry`, `TagRegistry`, `compileExecutionPlan`, `PipelineExecutor`, and runtime errors/types/observability live under `engine/**`.
- `packages/mapgen-core/src/index.ts` exports the engine SDK without legacy pipeline re-exports.
- Engine tests pass while importing from `@swooper/mapgen-core/engine`.

## Testing / Verification
- `pnpm -C packages/mapgen-core test`

## Dependencies / Notes
- No blocking dependencies.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
- Move/rename runtime modules from `pipeline/**` to `engine/**` (registry, executor, compiler, types, errors, observability).
- Update internal imports and the package export map to align with the new engine surface.
- Adjust engine tests to use the `engine/**` path.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
