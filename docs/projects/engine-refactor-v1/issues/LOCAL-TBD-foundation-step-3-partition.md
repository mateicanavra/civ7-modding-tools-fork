---
id: LOCAL-TBD-3
title: Implement Plate Partitioning Strategy
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M3-core-engine-refactor-config-evolution
assignees: [codex]
labels: [Improvement, Architecture]
parent: LOCAL-TBD
children: []
blocked_by: [LOCAL-TBD-2]
blocked: [LOCAL-TBD-4]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Create the "Pieces" (Plates). Implement the `PlatePartitioner` strategy to group mesh cells into "Major" and "Minor" plates using a **Multi-Source Weighted Flood Fill** algorithm. Note: Plate type refers to **kinematic scale**, not material type. A single "Major" plate can contain both ocean and continent (like the African Plate).

## Deliverables
- `packages/mapgen-core/src/strategies/plate-partitioner.ts` implementing the `MapGenStep` interface.
- Logic to select seed locations based on "Major" vs "Minor" plate configuration.
- A priority-queue based flood fill that allows major plates to expand more aggressively.
- `PlateGraph` output with `cellToPlate` mapping and `PlateRegion` definitions (including velocity vectors).
- Unit tests verifying plate size distribution matches configuration.

## Acceptance Criteria
- [ ] `PlatePartitioner` implements `MapGenStep` with ID `core.plates.weighted`.
- [ ] `run()` populates `context.artifacts.plateGraph` with `cellToPlate` mapping and `plates` array.
- [ ] Major plates occupy significantly more area than minor plates (respecting `majorPlateStrength`).
- [ ] All mesh cells are assigned to a plate (no holes - `cellToPlate` has no `-1` values).
- [ ] Each `PlateRegion` has a valid `velocity` vector and `rotation` value for downstream physics.

## Testing / Verification
- `pnpm test:mapgen`
- Check that `context.artifacts.plateGraph.plates` contains the expected number of plates.
- Verify that `cellToPlate` array length equals mesh cell count and has no unassigned cells.
- Verify plate types: correct count of 'major' vs 'minor' plates.

## Dependencies / Notes
- **Blocked by:** LOCAL-TBD-2 (Mesh Generation Strategy) - requires `context.artifacts.mesh`.
- **Blocked:** LOCAL-TBD-4 (Tectonic Physics Strategy)
- **Reference:** [Foundation Stage Architecture - Strategy 2: Plate Partitioning](../../../system/libs/mapgen/foundation.md#32-strategy-2-plate-partitioning)
- **Note:** WrapX (horizontal map wrapping) is not needed for initial implementation. The mesh neighbors already define connectivity.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Algorithm (from Foundation Architecture)
1. Select $M$ seeds for "Major" plates (large kinematic domains).
2. Select $m$ seeds for "Minor" plates (buffer zones).
3. Assign "Strength" (travel cost) to each seed. Major plates have lower cost, allowing them to expand further.
4. Run a Priority Queue flood fill from all seeds simultaneously.
**Result:** A map partitioned into large plates and smaller buffer plates, without the "uniform size" artifact of simple nearest-neighbor Voronoi. Note: A single plate can contain both ocean and continent (material is determined by Crust, not Plate).

### Algorithm Details
1. **Seed Selection:** Pick `majorPlates` seeds with distance buffers, then `minorPlates` seeds in gaps.
2. **Priority Queue Init:** Major plates start with lower cost (higher expansion priority).
3. **Flood Fill:** Pop lowest-cost cell, claim it, push unclaimed neighbors with perturbed cost.
4. **Cleanup:** Absorb tiny orphan cells into neighboring plates.

### Priority Queue
- Can use a simple binary heap or even a sorted array for small N (4000 cells).
- Cost function: `baseCost + randomPerturbation * cellArea` (perturbation creates organic shapes).

### PlateRegion Velocity Assignment
```typescript
interface PlateRegion {
  id: number;
  type: 'major' | 'minor'; // Kinematic scale, NOT material type
  seedLocation: Point2D;
  velocity: Vector2D; // Random direction with magnitude based on plate type
  rotation: number;   // Angular velocity (radians/unit)
}
```
- Major plates: slower velocity (large stable domains)
- Minor plates: faster velocity (small buffer zones)
- Velocity direction: random, seeded
- Note: Material (Continental/Oceanic) is determined by Crust, not Plate type.

### Configuration Schema
```typescript
interface PartitionConfig {
  majorPlates: number;       // Count of large plates (default: 6-8)
  minorPlates: number;       // Count of small plates (default: 8-12)
  majorPlateStrength: number;// 0-1: Expansion bias for majors (default: 0.7)
}
```

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
