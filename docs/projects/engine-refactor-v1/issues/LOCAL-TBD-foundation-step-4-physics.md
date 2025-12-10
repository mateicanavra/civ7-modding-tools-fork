---
id: LOCAL-TBD-4
title: Implement Tectonic Physics Strategy
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: milestone-1-foundation
assignees: [codex]
labels: [Improvement, Architecture]
parent: LOCAL-TBD
children: []
blocked_by: [LOCAL-TBD-3]
blocked: [LOCAL-TBD-5]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Simulate the "Dynamics" (Forces). Implement the `TectonicEngine` strategy to calculate geological forces (Convergence, Divergence, Shear) at plate boundaries using **Vector Analysis on Graph Edges**, producing the `TectonicData` tensors that drive mountain uplift and rift valleys.

## Deliverables
- `packages/mapgen-core/src/strategies/tectonic-engine.ts` implementing the `MapGenStep` interface.
- Logic to identify boundary edges in the `PlateGraph`.
- Vector math to calculate relative plate motion and resolve it into stress/uplift components.
- Rasterization logic to interpolate graph edge data onto the hex grid.
- `TectonicData` output with `upliftPotential`, `riftPotential`, `shearStress`, and `boundaryCloseness`.
- Unit tests verifying boundary detection and force calculations.

## Acceptance Criteria
- [ ] `TectonicEngine` implements `MapGenStep` with ID `core.tectonics.standard`.
- [ ] `run()` populates `context.artifacts.tectonics` with valid tensors.
- [ ] Convergent boundaries (collisions) show high `upliftPotential`.
- [ ] Divergent boundaries (separations) show high `riftPotential`.
- [ ] Transform boundaries (sliding) show high `shearStress` but low uplift/rift.
- [ ] `boundaryCloseness` correctly represents distance to nearest plate boundary (inverted: 1.0 at boundary, 0.0 far away).

## Testing / Verification
- `pnpm test:mapgen`
- Inspect the output tensors: `upliftPotential` should form lines corresponding to plate boundaries.
- Verify convergent plates produce uplift, divergent plates produce rift, sliding plates produce shear.

## Dependencies / Notes
- **Blocked by:** LOCAL-TBD-3 (Plate Partitioning Strategy) - requires `context.artifacts.plateGraph`.
- **Blocked:** LOCAL-TBD-5 (Orchestrator Integration)
- **Reference:** [Foundation Stage Architecture - Strategy 3: Tectonic Physics](../../../system/libs/mapgen/foundation.md#33-strategy-3-tectonic-physics)
- **Performance:** Physics runs on graph edges (O(N)) instead of grid tiles (O(N^2)) for significant performance gains.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Algorithm (from Foundation Architecture)
1. Identify **Boundary Edges** (edges where `Cell A` and `Cell B` belong to different plates).
2. For each boundary edge:
   - Calculate the **Relative Velocity** vector: $V_{rel} = V_{plateA} - V_{plateB}$.
   - Calculate the **Edge Normal** vector $N$ (perpendicular to the boundary).
   - **Convergence:** $C = -(V_{rel} \cdot N)$. Positive = Collision, Negative = Separation.
   - **Shear:** $S = |V_{rel} \times N|$. Sliding motion.
3. **Rasterization:** Interpolate these edge values onto the hex grid to populate the tensors.

### Vector Math Reference
```typescript
// Relative velocity between two plates at boundary
const relVel = subtract(plateA.velocity, plateB.velocity);

// Edge normal (perpendicular to boundary line)
const edgeNormal = normalize(perpendicular(edgeVector));

// Convergence (positive = collision, negative = divergence)
const convergence = -dot(relVel, edgeNormal);

// Shear (transform fault intensity)
const shear = Math.abs(cross2D(relVel, edgeNormal));
```

### TectonicData Output
```typescript
interface TectonicData {
  /** 0-1: Intensity of collision (Convergent) - drives mountain formation */
  upliftPotential: Uint8Array;
  /** 0-1: Intensity of separation (Divergent) - drives rift valleys */
  riftPotential: Uint8Array;
  /** 0-1: Intensity of shearing (Transform) - drives earthquake zones */
  shearStress: Uint8Array;
  /** 0-1: Distance to nearest boundary (inverted) - falloff from boundary */
  boundaryCloseness: Uint8Array;
}
```

### Rasterization Strategy
- For each hex cell, find the nearest mesh cell(s).
- Interpolate boundary edge values to hex cells based on distance.
- Normalize all values to 0-1 range and store as Uint8 (0-255).

### Configuration Schema
```typescript
interface TectonicsConfig {
  collisionScale: number;     // Global multiplier for uplift (default: 1.0)
  rotationInfluence: number;  // How much plate rotation contributes to velocity (default: 0.3)
}
```

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
