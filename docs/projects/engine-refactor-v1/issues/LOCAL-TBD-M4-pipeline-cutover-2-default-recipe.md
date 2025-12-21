---
id: LOCAL-TBD-M4-PIPELINE-2
title: "[M4] Pipeline cutover (2/3): standard mod recipe + TaskGraph consumes ExecutionPlan"
state: planned
priority: 1
estimate: 4
project: engine-refactor-v1
milestone: M4-tests-validation-cleanup
assignees: []
labels: [Architecture, Cleanup]
parent: M4-PIPELINE-CUTOVER
children: []
blocked_by: [LOCAL-TBD-M4-PIPELINE-1]
blocked: [LOCAL-TBD-M4-PIPELINE-3]
related_to: [CIV-41, CIV-48]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Introduce the standard mod recipe and switch TaskGraph execution to consume a compiled `ExecutionPlan` from `RunRequest`, while keeping stageManifest as a temporary compatibility filter if needed.

## Deliverables

- A standard mod recipe that reproduces the current default pipeline order.
- `RunRequest` construction in the runtime entry path using the standard recipe by default.
- TaskGraph execution uses `ExecutionPlan` output from the compiler.
- Temporary compatibility: if stageManifest is still required to preserve behavior, it may filter the standard recipe in this step (but ordering is now recipe-driven).

## Acceptance Criteria

- Running the pipeline uses `RunRequest → ExecutionPlan` as the execution path.
- The standard mod recipe is the canonical ordering source for the default run.
- If stageManifest is still referenced, it is only used to filter/disable recipe nodes (no direct STAGE_ORDER derivation).
- End-to-end run still succeeds (local mapgen invocation or the canonical in-repo consumer).

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- Run a local mapgen invocation that previously used the default pipeline (or Swooper maps mod if canonical).

## Dependencies / Notes

- **Parent:** [M4-PIPELINE-CUTOVER](M4-PIPELINE-CUTOVER.md)
- **Blocked by:** LOCAL-TBD-M4-PIPELINE-1
- **Blocks:** LOCAL-TBD-M4-PIPELINE-3

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

- Prefer keeping the standard recipe in a mod-local `recipes/` path per the target spec.
- Any stageManifest usage here is explicitly transitional and must be removed in the next issue.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
