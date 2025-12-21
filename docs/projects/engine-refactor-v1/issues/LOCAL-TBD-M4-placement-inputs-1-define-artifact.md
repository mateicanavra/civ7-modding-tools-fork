---
id: LOCAL-TBD-M4-PLACEMENT-1
title: "[M4] Placement inputs (1/2): define artifact:placementInputs@v1 + derive step"
state: planned
priority: 2
estimate: 2
project: engine-refactor-v1
milestone: M4-tests-validation-cleanup
assignees: []
labels: [Architecture, Placement]
parent: M4-PLACEMENT-INPUTS
children: []
blocked_by: []
blocked: [LOCAL-TBD-M4-PLACEMENT-2]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Define `artifact:placementInputs@v1` with a safe demo payload and add a derive step that produces it from explicit prerequisites.

## Deliverables

- Versioned `artifact:placementInputs@v1` schema in the registry with a safe demo payload.
- A derive step that produces `placementInputs@v1` from explicit prerequisites and publishes it in context artifacts.
- Standard recipe updated to include the derive step before placement.

## Acceptance Criteria

- `artifact:placementInputs@v1` is registered with a demo payload that does not crash downstream placement.
- The derive step runs in the standard pipeline and emits the artifact.
- Downstream placement can read the artifact (without yet removing legacy paths).

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- Smoke test compiles and executes the standard recipe with the derive step present.

## Dependencies / Notes

- **Parent:** [M4-PLACEMENT-INPUTS](M4-PLACEMENT-INPUTS.md)
- **Blocks:** LOCAL-TBD-M4-PLACEMENT-2

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

- Keep this additive; do not remove legacy placement inputs here.
- Use existing TypeBox patterns for the artifact schema.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
