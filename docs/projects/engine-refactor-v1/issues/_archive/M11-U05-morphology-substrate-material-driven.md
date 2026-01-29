---
id: M11-U05
title: "[M11/U05] Morphology substrate material-driven rewrite (`erodibilityK` from crust/material)"
state: done
priority: 2
estimate: 3
project: engine-refactor-v1
milestone: M11
assignees: []
labels: [morphology, physics, contracts]
parent: null
children: []
blocked_by: [M11-U04]
blocked: []
related_to: [M11-U00]
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
- `bun run --cwd mods/mod-swooper-maps test -- <new-or-existing-morphology-test>`

## Dependencies / Notes
- Blocked by whichever issue provides tile crust/material drivers (Foundation projection surface).

## Implementation Decisions

### Use `artifact:foundation.crustTiles` as the canonical material baseline for substrate
- **Context:** Phase 2 posture calls for substrate to be material-driven (no overlays), but baseline code used uplift/rift alone as a proxy.
- **Options:** (A) keep uplift/rift proxy, (B) derive substrate primarily from `foundation.crustTiles` with tectonic adjustments.
- **Choice:** B.
- **Rationale:** Makes substrate semantics align with the “physics-first” posture while keeping signals deterministic and sourced only from Foundation truths.
- **Risk:** Coefficients are heuristic; later milestones may want re-tuning once erosion/cryosphere systems land.
