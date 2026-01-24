---
id: M11-U09
title: "[M11/U09] Geomorphology upgrade: stream-power erosion + sediment transport (physics-first realism)"
state: done
priority: 1
estimate: 5
project: engine-refactor-v1
milestone: M11
assignees: []
labels: [morphology, hydrology, physics, realism]
parent: null
children: []
blocked_by: [M11-U05]
blocked: []
related_to: [M11-U00]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Replace/upgrade the current “geomorphic cycle” placeholder into a physics-anchored **stream-power erosion + deposition** model that produces believable valleys, drainage divides, and sediment basins without leaning on noise.

## Deliverables
- A spec-grade erosion model (deterministic; bounded; performant):
  - incision term driven by slope + discharge proxy (`flowAccum`) with documented exponents/units
  - diffusion / hillslope transport term
  - deposition term (sediment capacity / settling proxy)
- Explicit coupling surfaces between Morphology and Hydrology:
  - Morphology may compute internal routing for erosion, but must not redefine Hydrology’s canonical routing truth unless explicitly re-scoped.
- Diagnostics and guardrails:
  - erosion/deposition maps (trace artifacts or debug outputs)
  - regression tests for “valleys emerge from physics, not noise”

## Acceptance Criteria
- With noise disabled/minimized, the model still produces:
  - coherent river valleys aligned with steepest descent,
  - widening floodplains in low-slope accumulation zones,
  - plausible sediment basins / deltas near coasts.
- Determinism: fixed seed + fixed inputs yields stable outputs.
- Boundaries: no backfeeding from Gameplay; no `artifact:map.*` / `effect:map.*` inputs.

## Implementation Decisions
- Use `routing.flowDir` + `routing.flowAccum` as the explicit coupling surface for geomorphic transport; do not recompute receivers inside geomorphology.
- Implement stream power as `A^m * S^n` with `A=flowAccum/max(flowAccum)` and `S=dropToReceiver/max(dropToReceiver)`, clamped to `[0,1]`.
- Model sediment transport as a bounded split of local sediment each era: `settles ~ (1-streamPower)` and `transports ~ streamPower` (both scaled by `deposition.rate`), with transport flowing along `flowDir`.
- Add verbose trace ASCII diagnostics for net erosion and net deposition (based on sign/magnitude of `elevationDelta`).

## Testing / Verification
- Add a fixed-seed fixture that asserts:
  - erosion depth correlates with flow accumulation and slope (monotone in expectation)
  - deposition correlates with low slope + high accumulation
- Performance gate: record step runtime and enforce an upper bound for the fixture map size.

## References
- Greenfield intent: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/_archive/v3/spike-morphology-greenfield-gpt.md`
- Research synthesis: `docs/projects/engine-refactor-v1/issues/research/physics-first-gap-research.md`
