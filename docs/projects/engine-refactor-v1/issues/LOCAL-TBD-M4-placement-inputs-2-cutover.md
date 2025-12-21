---
id: LOCAL-TBD-M4-PLACEMENT-2
title: "[M4] Placement inputs (2/2): cut placement over to artifact + verified effect"
state: planned
priority: 2
estimate: 2
project: engine-refactor-v1
milestone: M4-tests-validation-cleanup
assignees: []
labels: [Architecture, Placement]
parent: M4-PLACEMENT-INPUTS
children: []
blocked_by: [LOCAL-TBD-M4-PLACEMENT-1]
blocked: []
related_to: [M4-EFFECTS-VERIFICATION]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Update placement to consume `artifact:placementInputs@v1` exclusively and provide a verified `effect:*` tag instead of relying on implicit engine reads.

## Deliverables

- Placement requires `artifact:placementInputs@v1` and stops assembling inputs internally.
- Placement provides `effect:engine.placementApplied` with adapter-backed postcondition checks.
- DEF-006 updated to “resolved” once the new contract is in place.

## Acceptance Criteria

- Placement no longer reads implicit inputs from engine state; it consumes the artifact.
- Placement provides a verified effect tag and fails fast on postcondition failures.
- DEF-006 marked resolved with a brief pointer to the new artifact contract.

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- A stub-adapter placement run passes using the new artifact inputs.

## Dependencies / Notes

- **Parent:** [M4-PLACEMENT-INPUTS](M4-PLACEMENT-INPUTS.md)
- **Blocked by:** LOCAL-TBD-M4-PLACEMENT-1
- **Related:** M4-EFFECTS-VERIFICATION (placement effect verification)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

- Keep behavior stable; focus on contract and wiring.
- If any temporary compatibility shims exist, remove them here once placement is fully cut over.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

## Prework Prompt (Agent Brief)

Goal: produce the placement cutover checklist so the refactor is mechanical and verifiable.

Deliverables:
- A list of all placement input assembly sites and implicit engine reads that must be replaced by `placementInputs@v1`.
- A mapping from each old input source to the new artifact field.
- A plan for `effect:engine.placementApplied` verification (which adapter postcondition to call).
- A list of tests to update/add for stub-adapter placement runs.

Where to look:
- Placement code: `packages/mapgen-core/src/pipeline/placement/**`.
- Pipeline and effects: `packages/mapgen-core/src/pipeline/standard.ts`, `packages/mapgen-core/src/pipeline/PipelineExecutor.ts`.
- Tests: `packages/mapgen-core/test/**`.

Constraints/notes:
- Keep behavior stable; this is contract/wiring only.
- Remove any temporary compatibility shims once placement fully uses the artifact.
- Do not implement code; return the checklist and mappings as markdown tables/lists.
