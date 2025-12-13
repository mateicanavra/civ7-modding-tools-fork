---
id: LOCAL-M3-HYDROLOGY-PRODUCTS
title: "[M3] Hydrology Productization (ClimateField + River Data Products)"
state: planned
priority: 2
estimate: 3
project: engine-refactor-v1
milestone: M3-core-engine-refactor-config-evolution
assignees: []
labels: [Improvement, Hydrology, Architecture]
parent: null
children: []
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Make hydrology/climate outputs consumable as **canonical data products**: `ClimateField` becomes the authoritative rainfall source for downstream logic, and a minimal “river data product” is published for overlays/biomes/placement, without changing the underlying river generation behavior.

## Deliverables

- [ ] **Canonicalize `ClimateField` for consumers**
  - Downstream stages (story overlays, biomes/features, placement) consume rainfall/moisture via `ClimateField` rather than `GameplayMap` reads.
  - Any legacy reads are treated as compatibility-only and are gated behind the wrapper boundary.
- [ ] **Publish a minimal river data product**
  - Define and publish a stable product for “surface river flow / summary data” suitable for consumers (overlays, biome heuristics, placement constraints).
  - Clarify where it lives (e.g., `MapGenContext.products.hydrology` vs `MapGenContext.artifacts.hydrology`) and its mutation rules.
- [ ] **Wrap-first hydrology step boundary**
  - Document/encode that “hydrology” in M3 is a wrapper over:
    - Engine river modeling (Civ7 adapter), and
    - Existing TS climate layers (baseline/refine).
  - Ensure the wrapper publishes the canonical products even if internals remain legacy/engine-owned.

## Acceptance Criteria

- [ ] No new/modernized consumer reads rainfall directly from `GameplayMap` once the step pipeline is in place.
- [ ] River summary data is available as an explicit product and can be required by steps via `requires`/`provides`.
- [ ] The map quality and overall river behavior remains consistent (wrap-first; no algorithm swap in M3).

## Out of Scope

- Replacing Civ7 river generation or implementing new hydrology algorithms (stream power erosion, ocean currents, cryosphere feedback, pedology).
- Retuning rainfall/rivers beyond parity checks needed to validate product consumers.

## Links

- Project snapshot: `../status.md`
- Milestone: `../milestones/M3-core-engine-refactor-config-evolution.md`
- Pipeline PRD: `../resources/PRD-pipeline-refactor.md`
- Target system docs: `../../system/libs/mapgen/hydrology.md`, `../../system/libs/mapgen/ecology.md`

