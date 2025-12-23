---
id: LOCAL-TBD-M4-PIPELINE-6
title: "[M4] Pipeline cutover: remove dual orchestration path (MapOrchestrator vs executor)"
state: planned
priority: 1
estimate: 0
project: engine-refactor-v1
milestone: LOCAL-TBD-M4-TARGET-ARCH-CUTOVER
assignees: []
labels: [Architecture, Cleanup]
parent: LOCAL-TBD-M4-PIPELINE-CUTOVER
children: []
blocked_by: [LOCAL-TBD-M4-PIPELINE-4]
blocked: []
related_to: [CIV-41, CIV-48]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Remove the dual orchestration path so the only supported runtime execution is `RunRequest → ExecutionPlan → executor` (no `MapOrchestrator` fallback).

## Deliverables

- Remove or fence legacy `MapOrchestrator` entrypoints so they cannot be used by default.
- Update any CLI/scripts/tests that still call the old orchestration path to use `RunRequest → ExecutionPlan`.
- Ensure runtime errors are explicit if a legacy path is invoked.

## Acceptance Criteria

- The repo has a single runtime execution path (compiled plan → executor).
- No default/test path can invoke `MapOrchestrator` or legacy orchestration entrypoints.
- Any remaining compatibility hooks are explicit and non-default (dev/test-only with clear errors).

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- Run the standard recipe via the new boundary and confirm no legacy entrypoints are exercised.

## Dependencies / Notes

- **Parent:** [LOCAL-TBD-M4-PIPELINE-CUTOVER](LOCAL-TBD-M4-PIPELINE-CUTOVER.md)
- **Blocked by:** LOCAL-TBD-M4-PIPELINE-4
- **Sequencing:** Land in Phase D alongside legacy ordering deletion (LOCAL-TBD-M4-PIPELINE-5).
- **Estimate:** TBD; use prework to refine.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

- Treat this as cleanup; the runtime cutover should already be in place.
- Prefer deleting old entrypoints over leaving shims; if any shims remain, fence them explicitly.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

## Prework Prompt (Agent Brief)

Goal: enumerate every dual-path orchestration entrypoint so removal is mechanical and complete.

Deliverables:
- A list of all `MapOrchestrator` entrypoints and legacy orchestration calls (CLI, scripts, tests, bootstrap helpers).
- A mapping from each legacy entrypoint to the new `RunRequest → ExecutionPlan → executor` path.
- A cleanup checklist for removing or fencing the old entrypoints, including any docs or tests to update.

Where to look:
- Orchestration code: `packages/mapgen-core/src/MapOrchestrator.ts`, `packages/mapgen-core/src/orchestrator/**`, `packages/mapgen-core/src/bootstrap/**`.
- Consumers: `packages/cli/**`, `scripts/**`, `packages/mapgen-core/test/**`.
- Milestone notes: `docs/projects/engine-refactor-v1/milestones/M4-target-architecture-cutover-legacy-cleanup.md`.

Constraints/notes:
- No new compatibility shims; deletion or explicit fencing only.
- Keep behavior stable; this is a routing cleanup.
- Do not implement code; return the inventory and checklist as markdown tables/lists.
