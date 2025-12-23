---
id: LOCAL-TBD-M4-PLACEMENT-1
title: "[M4] Placement inputs: define artifact:placementInputs@v1 + derive step"
state: planned
priority: 2
estimate: 4
project: engine-refactor-v1
milestone: LOCAL-TBD-M4-TARGET-ARCH-CUTOVER
assignees: []
labels: [Architecture, Placement]
parent: LOCAL-TBD-M4-PLACEMENT-INPUTS
children: []
blocked_by: []
blocked: [LOCAL-TBD-M4-PLACEMENT-2]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Define `artifact:placementInputs@v1` (demo payload optional) and add a derive step that produces it from explicit prerequisites.

## Deliverables

- Versioned `artifact:placementInputs@v1` schema in the registry; demo payload is optional (validate when present).
- A derive step that produces `placementInputs@v1` from explicit prerequisites and publishes it in context artifacts.
- Standard recipe updated to include the derive step before placement.

## Acceptance Criteria

- `artifact:placementInputs@v1` is registered; if a demo payload is provided, it does not crash downstream placement.
- The derive step runs in the standard pipeline and emits the artifact.
- Downstream placement can read the artifact (without yet removing legacy paths).

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- Smoke test compiles and executes the standard recipe with the derive step present.

## Dependencies / Notes

- **Parent:** [LOCAL-TBD-M4-PLACEMENT-INPUTS](LOCAL-TBD-M4-PLACEMENT-INPUTS.md)
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

## Prework Prompt (Agent Brief)

Goal: define the `artifact:placementInputs@v1` contract so cutover is a wiring change, not a discovery exercise.

Deliverables:
- A schema sketch for `placementInputs@v1` (fields + types) with an optional safe demo payload.
- A source map for each field: which upstream artifact/field/adapter read provides it today.
- A list of any required upstream reification to make inputs TS-canonical.

Where to look:
- SPEC/SPIKE: `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md` (placement artifact),
  `docs/projects/engine-refactor-v1/resources/SPIKE-target-architecture-draft.md` (§2.7).
- Placement: `packages/mapgen-core/src/pipeline/placement/**`.
- Upstream dependencies in ecology/narrative: `packages/mapgen-core/src/pipeline/ecology/**`,
  `packages/mapgen-core/src/pipeline/narrative/**`.

Constraints/notes:
- Keep this additive; no removal of legacy inputs in this issue.
- Placement inputs must be explicit and TS-canonical; avoid DEF-010 scope creep.
- Do not implement code; return the schema and mapping as markdown tables/lists.
