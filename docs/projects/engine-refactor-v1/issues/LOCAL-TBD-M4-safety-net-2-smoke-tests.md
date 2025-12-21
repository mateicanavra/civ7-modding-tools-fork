---
id: LOCAL-TBD-M4-SAFETY-2
title: "[M4] Safety net (2/2): CI smoke tests + CIV-23 re-scope"
state: planned
priority: 2
estimate: 2
project: engine-refactor-v1
milestone: M4-tests-validation-cleanup
assignees: []
labels: [Testing]
parent: M4-SAFETY-NET
children: []
blocked_by: [LOCAL-TBD-M4-SAFETY-1]
blocked: []
related_to: [CIV-23]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Add compile/execute smoke tests against the standard recipe using a stub adapter, and re-scope CIV-23 to the new boundary.

## Deliverables

- CI smoke tests that compile the standard recipe into an `ExecutionPlan`.
- CI smoke tests that execute the plan with a stub adapter and assert basic invariants.
- CIV-23 updated to align with `RunRequest`/`ExecutionPlan` and remove legacy orchestration references.

## Acceptance Criteria

- CI runs both compile and execute smoke tests on the default pipeline.
- Tests do not depend on the game engine.
- CIV-23 no longer references WorldModel or `stageConfig`/`stageManifest` inputs.

## Testing / Verification

- `pnpm -C packages/mapgen-core test`
- CI confirms the smoke tests run in the default pipeline.

## Dependencies / Notes

- **Parent:** [M4-SAFETY-NET](M4-SAFETY-NET.md)
- **Blocked by:** LOCAL-TBD-M4-SAFETY-1
- **Related:** CIV-23

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

- Keep smoke tests light and deterministic; prefer stub adapter fixtures over real engine calls.
- If CIV-23 becomes redundant, mark as superseded instead of duplicating work.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
