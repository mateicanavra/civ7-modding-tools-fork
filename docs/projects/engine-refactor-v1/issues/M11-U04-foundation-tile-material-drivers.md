---
id: M11-U04
title: "[M11/U04] Foundation tile crust/material drivers (mesh → tile projection surface)"
state: done
priority: 2
estimate: 3
project: engine-refactor-v1
milestone: M11
assignees: []
labels: [foundation, morphology, contracts]
parent: null
children: []
blocked_by: [M11-U03]
blocked: []
related_to: [M11-U00]
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

## Implementation Decisions

### Publish canonical tile projection surfaces from Foundation (avoid downstream duplication)
- **Context:** Morphology needs tile-indexed crust/material drivers without duplicating mesh→tile projection logic.
- **Options:** (A) extend `artifact:foundation.plates`, (B) publish `artifact:foundation.crustTiles`, (C) publish `artifact:foundation.tileToCellIndex` and require downstream projection.
- **Choice:** Publish both `artifact:foundation.tileToCellIndex` (canonical mapping) and `artifact:foundation.crustTiles` (tile-indexed crust view) from Foundation.
- **Rationale:** Keeps `artifact:foundation.plates` stable while giving downstream domains one canonical place to fetch tile-level material signals (and a shared mapping for any additional mesh-sampled fields).
- **Risk:** Additional Foundation artifacts increase contract surface area; Phase 2 docs must stay authoritative and updated (done here).
