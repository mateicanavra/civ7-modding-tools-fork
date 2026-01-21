---
id: LOCAL-TBD
title: "[POST-M10] Foundation tile crust/material drivers (mesh → tile projection surface)"
state: planned
priority: 2
estimate: 3
project: engine-refactor-v1
milestone: TBD
assignees: []
labels: [foundation, morphology, contracts]
parent: null
children: []
blocked_by: []
blocked: []
related_to: [LOCAL-TBD]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Provide a canonical, tile-indexed crust/material driver surface so Morphology can consume crust/material deterministically without duplicating mesh→tile projection logic across domains.

## Deliverables
- Choose one canonical approach:
  - Extend `artifact:foundation.plates` to include projected crust/material fields, OR
  - Publish `artifact:foundation.crustTiles` (tile-indexed), OR
  - Publish a reusable `tileToCellIndex` mapping artifact and project in Morphology.
- Update relevant Phase 2 docs (Contracts) so the chosen approach is explicitly documented.

## Acceptance Criteria
- There is exactly one canonical place downstream domains can fetch tile-level crust/material signals.
- Projection matches the Phase 2 canonical rule (wrapX periodic distance; deterministic tie-breakers).
- No new “almost-the-same” projection helper surfaces appear in downstream domains (avoid duplication).

## Testing / Verification
- Add a deterministic projection test that:
  - constructs a small fixture mesh + tiles,
  - checks `tileToCellIndex` and projected values are stable,
  - exercises wrapX seam behavior and tie-breakers.

## Dependencies / Notes
- Existing plate projection math (evidence pointer): `mods/mod-swooper-maps/src/domain/foundation/lib/project-plates.ts`.
- This issue should be scheduled before “substrate material-driven rewrite”.
