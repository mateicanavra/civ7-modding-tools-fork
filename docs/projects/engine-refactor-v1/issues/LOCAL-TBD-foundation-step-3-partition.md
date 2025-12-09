---
id: LOCAL-TBD-3
title: Implement Plate Partitioning Strategy
state: planned
priority: 2
estimate: 3
project: engine-refactor-v1
milestone: milestone-1-foundation
assignees: [codex]
labels: [Feature, Architecture]
parent: LOCAL-TBD
children: []
blocked_by: [LOCAL-TBD-2]
blocked: [LOCAL-TBD-4]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Implement the `PlatePartitioner` strategy to group mesh cells into "Major" and "Minor" plates using a weighted multi-source flood fill algorithm.

## Deliverables
- `packages/mapgen-core/src/world/partitioner.ts` implementing the `MapGenStep` interface.
- Logic to select seed locations based on "Major" (continental) vs "Minor" (island) configuration.
- A priority-queue based flood fill that allows major plates to expand more aggressively.
- Unit tests verifying plate size distribution matches configuration.

## Acceptance Criteria
- [ ] `PlatePartitioner` implements `MapGenStep` with ID `core.plates.weighted`.
- [ ] `run()` populates `context.graph` with `cellToPlate` mapping and `PlateRegion` definitions.
- [ ] Major plates occupy significantly more area than minor plates (approx matching `majorPlateStrength`).
- [ ] All mesh cells are assigned to a plate (no holes).

## Testing / Verification
- `pnpm test:mapgen`
- Check that `context.graph.plates` contains the expected number of plates.
- Verify that `cellToPlate` array has no `-1` values.

## Dependencies / Notes
- Depends on `RegionMesh` from LOCAL-TBD-2.
- Reference [Plate Generation PRD](../resources/PRD-plate-generation.md#42-step-2-plate-partitioning-platepartitioner).
- **Note:** WrapX (horizontal map wrapping) is not needed for initial implementation. The mesh neighbors already define connectivity - if we later add WrapX support to the mesh, partitioning will automatically respect it.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Algorithm Overview
1. **Seed Selection:** Pick `majorPlates` seeds with distance buffers, then `minorPlates` seeds in gaps.
2. **Priority Queue Init:** Major plates start with lower cost (higher expansion priority).
3. **Flood Fill:** Pop lowest-cost cell, claim it, push unclaimed neighbors with perturbed cost.
4. **Cleanup:** Absorb tiny orphan cells into neighboring plates.

### Priority Queue
- Can use a simple binary heap or even a sorted array for small N (4000 cells).
- Cost function: `baseCost + randomPerturbation * cellArea` (perturbation creates organic shapes).

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
