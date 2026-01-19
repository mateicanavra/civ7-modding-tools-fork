# Issue: LandmassRegionId projection (Homelands vs Distant Lands)

This document defines a **Gameplay-owned** projection required for Civ7 interop and start/resource systems.

It is a projection derived from authoritative Morphology landmass geometry; it must not become a Morphology-owned surface.

---

## Ownership rationale

- This is a **player-facing gameplay partition** (“primary vs secondary landmass”) consumed by start/resource logic.
- It is an engine-facing **labeling step** (`LandmassRegionId`) derived from authoritative landmass decomposition.
- It must occur at the **apply boundary** (before `generateResources` and `assignStartPositions`), which is Gameplay/Placement territory.

---

## Contract posture (inputs / outputs)

Inputs:
- `artifact:morphology.landmasses` (authoritative landmass decomposition snapshot)
- Policy inputs (selection strategy, e.g. “largest landmass = homelands”)

Outputs:
- Engine labeling via `adapter.setLandmassRegionId(...)`
- Downstream-only “continent bounds” projections needed by `adapter.assignStartPositions(...)` (if still required)
  - This is an explicitly deprecated shim and must not be upstreamed into Morphology contracts.

---

## Civ7 constraints (official resources audit)

- Treat `LandmassRegionId` as a **two-slot partition** (“homelands vs distant lands”) in shipped scripts.
- Do not invent numeric ids:
  - Region ids must come from engine constants (e.g. via `adapter.getLandmassId("WEST"|"EAST"|...)` or equivalent stable adapter surface).

---

## Placement in the pipeline

- Ownership is Gameplay.
- Physical location:
  - Until the Gameplay absorption/refactor lands, the implementation may live adjacent to the existing `placement` apply boundary (or be integrated into `placement/apply`) to keep wiring minimal.
- Ordering:
  - Must run before `adapter.generateResources(...)` and `adapter.assignStartPositions(...)`.

---

## Guardrails (must ship with the projection)

- Test that the projection step runs before Gameplay calls `adapter.generateResources(...)` and `adapter.assignStartPositions(...)`.
- Ban numeric LandmassRegionId literals in projection code (only allow ids returned from adapter constants).
- Assert Morphology never references `LandmassRegionId`, `westContinent`, or `eastContinent` surfaces (enforced by Morphology contract guards).

---

## Cross-links

- Gameplay domain overview: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/gameplay/GAMEPLAY.md`
- Morphology plan index: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/MORPHOLOGY.md`
