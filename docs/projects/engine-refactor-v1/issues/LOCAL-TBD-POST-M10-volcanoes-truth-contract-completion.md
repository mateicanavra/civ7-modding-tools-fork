---
id: LOCAL-TBD
title: "[POST-M10] Volcano truth contract completion (+ optional `artifact:map.volcanoes`)"
state: planned
priority: 2
estimate: 2
project: engine-refactor-v1
milestone: TBD
assignees: []
labels: [morphology, gameplay, contracts]
parent: null
children: []
blocked_by: [M10-U05]
blocked: []
related_to: [LOCAL-TBD]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Make `artifact:morphology.volcanoes` match the Phase 2 contract shape (mask + list with kind/strength) and decide whether to also publish a Gameplay debug/annotation artifact `artifact:map.volcanoes`.

## Deliverables
- Update Morphology volcano truth artifact schema + publisher:
  - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/artifacts.ts`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/volcanoes.ts`
- Ensure truth shape matches Phase 2:
  - `volcanoMask: Uint8Array`
  - `volcanoes: Array<{ tileIndex, kind, strength01 }>`
- Decide on `artifact:map.volcanoes`:
  - If adopted: define schema + publish it in `plot-volcanoes` (Gameplay), and document in Phase 2 map projections spec.
  - If not adopted: delete/adjust any docs/examples that imply it is canonical/required.

## Acceptance Criteria
- Volcano vents are land-only and ordering is deterministic (`tileIndex` ascending).
- `volcanoMask` and `volcanoes[]` are consistent.
- `kind` and `strength01` are derived deterministically from Foundation driver fields per Phase 2 semantics.

## Testing / Verification
- Add a contract test that validates:
  - land-only invariant (fails if any vent is on water),
  - ordering by `tileIndex`,
  - mask/list consistency.

## Dependencies / Notes
- Phase 2 authority: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CONTRACTS.md` (`artifact:morphology.volcanoes`).
- Example/doc drift candidate: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/examples/VOLCANO.md`.
