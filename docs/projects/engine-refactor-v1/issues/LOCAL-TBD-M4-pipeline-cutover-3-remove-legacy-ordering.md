---
id: LOCAL-TBD-M4-PIPELINE-3
title: "[M4] Pipeline cutover (3/3): remove stageManifest/STAGE_ORDER + legacy enablement"
state: planned
priority: 1
estimate: 4
project: engine-refactor-v1
milestone: M4-tests-validation-cleanup
assignees: []
labels: [Architecture, Cleanup]
parent: M4-PIPELINE-CUTOVER
children: []
blocked_by: [LOCAL-TBD-M4-PIPELINE-2]
blocked: []
related_to: [CIV-41, CIV-48, CIV-53]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Delete legacy ordering/enablement inputs (`stageManifest`, `STAGE_ORDER`, `stageFlags`, `shouldRun`) and the bootstrap bridge so runtime ordering is recipe-only.

## Deliverables

- Remove `stageManifest` from runtime inputs and compilation paths.
- Delete `STAGE_ORDER` and any helpers that derive recipe/order from stage config.
- Remove `stageConfig → stageManifest` bootstrap bridge.
- Ensure no runtime path checks `shouldRun` or stage flags for enablement.
- Update deferrals/triage docs to mark DEF-004 resolved.

## Acceptance Criteria

- Runtime entry no longer accepts or constructs `stageManifest`/`stageConfig` for ordering.
- No references to `STAGE_ORDER` remain in compile/execute paths.
- No enablement logic exists outside recipe compilation.
- End-to-end run still succeeds using the standard mod recipe.

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- Run a local mapgen invocation (or the canonical in-repo consumer) to ensure the default recipe still executes.

## Dependencies / Notes

- **Parent:** [M4-PIPELINE-CUTOVER](M4-PIPELINE-CUTOVER.md)
- **Blocked by:** LOCAL-TBD-M4-PIPELINE-2

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

- Expected removals:
  - `packages/mapgen-core/src/orchestrator/task-graph.ts` (`stageManifest` reads)
  - `packages/mapgen-core/src/pipeline/StepRegistry.ts` (`getStandardRecipe` from `STAGE_ORDER`)
  - `packages/mapgen-core/src/bootstrap/entry.ts` (`stageConfig -> stageManifest` bridge)
  - `packages/mapgen-core/src/bootstrap/resolved.ts` (`STAGE_ORDER`, stage enablement helpers)
- Confirm no legacy API callers remain before deleting.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
