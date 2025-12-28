---
id: LOCAL-TBD-M6-U07
title: "[M6] Delete legacy base/bootstrap/config/orchestrator"
state: planned
priority: 2
estimate: 8
project: engine-refactor-v1
milestone: M6
assignees: []
labels: []
parent: null
children: []
blocked_by: [LOCAL-TBD-M6-U06, LOCAL-TBD-M6-U08]
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Remove legacy base/bootstrap/config/orchestrator surfaces after the new pipeline is live.

## Deliverables
- Delete `packages/mapgen-core/src/base/**`.
- Delete `packages/mapgen-core/src/bootstrap/**` and `packages/mapgen-core/src/config/**`.
- Delete `packages/mapgen-core/src/orchestrator/task-graph.ts` and `PipelineModV1`.
- Remove `@swooper/mapgen-core/base` export surface and legacy re-exports.

## Acceptance Criteria
- Legacy modules are removed and no longer exported from `packages/mapgen-core/src/index.ts`.
- `runTaskGraphGeneration` and base mod contracts are no longer referenced.
- Engine and mod tests pass without legacy paths.

## Testing / Verification
- `pnpm -C packages/mapgen-core test`
- `pnpm -C mods/mod-swooper-maps test`

## Dependencies / Notes
- Blocked by: [LOCAL-TBD-M6-U06](./LOCAL-TBD-M6-U06-rewrite-maps-as-recipe-instances.md), [LOCAL-TBD-M6-U08](./LOCAL-TBD-M6-U08-realign-tests-and-ci-gates-to-ownership.md)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
- Remove base/bootstrap/config/orchestrator modules only after map entrypoints and tests have cut over.
- Ensure `packages/mapgen-core/src/index.ts` and package exports drop legacy surfaces.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
