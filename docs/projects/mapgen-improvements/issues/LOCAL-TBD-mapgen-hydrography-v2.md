---
id: LOCAL-TBD-mapgen-hydrography-v2
title: "Derive lakes + navigable rivers from physics (Hydrology V2)"
state: planned
priority: 2
estimate: 0
project: mapgen-improvements
milestone: null
assignees: [codex]
labels: [mapgen, hydrology, lakes, rivers, algorithms]
parent: null
children: []
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Replace outcome-driven lake/river projection knobs with a physics-driven Hydrography V2 model: seasonal lakes from basin water balance + rivers/navigability from discharge + slope + valley confinement.

## Deliverables
- Algorithm spec + implementation plan for Hydrography V2 (lakes + rivers) suitable to paste into a Linear issue.
- Inventory of existing pipeline inputs and any new inputs/artifacts required.
- Test plan focused on determinism + monotonicity (physics invariants), not quotas.

## Acceptance Criteria
- No authored/outcome-style knobs for hydrography (e.g. no “target lake count”, “tiles per lake”, “min/max river length” as author-facing intent).
- Lakes are fully derivative of topography + climate (seasonal wet/dry supported without multiple downstream “map states”).
- Navigable rivers are fully derivative of discharge + slope + confinement (and are not “projected” by engine-only length knobs).
- Tests assert determinism + monotonic responses to physics-parameter changes.

## Testing / Verification
- Add unit/integration tests that validate:
  - Determinism given same seed + configs.
  - Monotonicity: wetter climate / lower PET ⇒ more/larger lakes + stronger river network (distribution-based assertions).
  - Navigability classification responds monotonically to discharge and confinement.

## Dependencies / Notes
- This issue is intentionally algorithm-first; integration details (adapter stamping vs truth artifacts) follow from the model, not vice versa.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Decision: seasonal lakes representation
- Prefer a single canonical “permanence” field (fraction flooded) plus derived wet/dry masks for testing and optional downstream consumption.
- Engine stamping uses a single chosen view (e.g. permanent or mean) to avoid multiple map states.

