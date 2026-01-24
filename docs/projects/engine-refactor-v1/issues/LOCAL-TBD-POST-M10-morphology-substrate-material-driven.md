---
id: LOCAL-TBD
title: "[POST-M10] Morphology substrate material-driven rewrite (`erodibilityK` from crust/material)"
state: planned
priority: 2
estimate: 3
project: engine-refactor-v1
milestone: TBD
assignees: []
labels: [morphology, physics, contracts]
parent: null
children: []
blocked_by: [LOCAL-TBD]
blocked: []
related_to: [LOCAL-TBD]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Update `morphology/compute-substrate` so `erodibilityK` and `sedimentDepth` are derived from crust/material drivers (and regime signals) per Phase 2 contract semantics, rather than using uplift/rift alone as proxies.

## Deliverables
- Contract + implementation updates:
  - `mods/mod-swooper-maps/src/domain/morphology/ops/compute-substrate/contract.ts`
  - `mods/mod-swooper-maps/src/domain/morphology/ops/compute-substrate/strategies/default.ts`
- Inputs include a canonical tile crust/material signal (from the chosen Foundation surface).
- Rules encode a clear, documented mapping:
  - crust type/age → baseline erodibility,
  - boundary regime/closeness → adjustments,
  - rift potential → sediment template (if retained).
- Update Phase 2 docs if needed to reflect the final, unambiguous posture.

## Acceptance Criteria
- For a fixed seed/fixture, substrate output is deterministic.
- Changing crust/material inputs changes `erodibilityK` in a predictable way (semantic smoke test).
- No story overlays or engine-derived surfaces are used to derive substrate.

## Testing / Verification
- Add a focused test fixture:
  - two tiles with identical uplift/rift but different crust/material → different `erodibilityK`.
- `pnpm -C mods/mod-swooper-maps test -- <new-or-existing-morphology-test>`

## Dependencies / Notes
- Blocked by whichever issue provides tile crust/material drivers (Foundation projection surface).
