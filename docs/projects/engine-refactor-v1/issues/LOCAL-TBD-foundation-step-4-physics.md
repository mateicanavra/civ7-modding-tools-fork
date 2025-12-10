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
blocked_by: [LOCAL-TBD-2.5, LOCAL-TBD-3]
blocked: [LOCAL-TBD-5]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Simulate the "Dynamics" (Forces via Intersection Model). Implement the `TectonicEngine` strategy to calculate geological forces by **intersecting Kinematics (Plates) with Material (Crust)**. This produces material-aware `TectonicData` tensors including `volcanism` and `cumulativeUplift` that drive mountains, rift valleys, and volcanic chains.

## Deliverables
- `packages/mapgen-core/src/strategies/tectonic-engine.ts` implementing the `MapGenStep` interface.
- Logic to identify boundary edges in the `PlateGraph`.
- Vector math to calculate relative plate motion and resolve it into stress/uplift components.
- **Material-aware interaction resolution:** Different physics based on Crust type at boundary (Cont-Cont, Ocean-Cont, Ocean-Ocean).
- Rasterization logic to interpolate graph edge data onto the hex grid.
- `TectonicData` output with `upliftPotential`, `riftPotential`, `shearStress`, `volcanism`, `fracture`, and `cumulativeUplift`.
- Unit tests verifying boundary detection, force calculations, and material-aware interactions.

## Acceptance Criteria
- [ ] `TectonicEngine` implements `MapGenStep` with ID `core.tectonics.standard`.
- [ ] `run()` populates `context.artifacts.tectonics` with valid tensors (including `volcanism`, `fracture`, `cumulativeUplift`).
- [ ] **Cont-Cont Convergence:** High `upliftPotential`, low `volcanism` (Himalayas-style).
- [ ] **Ocean-Cont Convergence:** Medium `upliftPotential`, high `volcanism` (Andes-style subduction).
- [ ] **Ocean-Ocean Convergence:** Low `upliftPotential`, moderate `volcanism` (Island arcs).
- [ ] Divergent boundaries (separations) show high `riftPotential`.
- [ ] Transform boundaries (sliding) show high `shearStress` and `fracture` but low uplift/rift.
- [ ] `cumulativeUplift` accumulates correctly for multi-era simulation (if enabled).

## Testing / Verification
- `pnpm test:mapgen`
- Inspect the output tensors: `upliftPotential` should form lines corresponding to plate boundaries.
- Verify material-aware physics: Continental collisions produce high uplift, oceanic subduction produces volcanism.
- Verify `volcanism` and `cumulativeUplift` tensors are populated.

## Dependencies / Notes
- **Blocked by:** LOCAL-TBD-2.5 (Crust Generation) - requires `context.artifacts.crust` for material-aware interactions.
- **Blocked by:** LOCAL-TBD-3 (Plate Partitioning Strategy) - requires `context.artifacts.plateGraph`.
- **Blocked:** LOCAL-TBD-5 (Orchestrator Integration)
- **Reference:** [Foundation Stage Architecture - Strategy 4: Tectonic Physics](../../../system/libs/mapgen/foundation.md#34-strategy-4-tectonic-physics)
- **Key Insight:** Physics resolves forces by intersecting Kinematics (Plates) with Material (Crust). The same collision force produces different results on Continental vs. Oceanic crust.
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
3. **Resolve Interaction based on Crust Type:**
   - Look up `crust.type` for both cells at the boundary.
   - **Cont-Cont Convergence:** High Uplift, Low Volcanism (Himalayas).
   - **Ocean-Cont Convergence:** Medium Uplift, High Volcanism (Andes/Subduction).
   - **Ocean-Ocean Convergence:** Low Uplift, Island Arcs (Japan).
   - **Divergence:** Rift Valley (Land) or Mid-Ocean Ridge (Sea).
4. **Inject Hotspots:** Add uplift/volcanism at random non-boundary points (optional).
5. **Accumulate:** Add results to `cumulativeUplift` for multi-era support.
6. **Rasterization:** Interpolate these edge values onto the hex grid to populate the tensors.

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
  /** 0-255: Intensity of collision (Convergent) - drives mountain formation */
  upliftPotential: Uint8Array;
  /** 0-255: Intensity of separation (Divergent) - drives rift valleys */
  riftPotential: Uint8Array;
  /** 0-255: Intensity of shearing (Transform) - drives earthquake zones */
  shearStress: Uint8Array;
  /** 0-255: Derived from Subduction + Hotspots - drives volcanoes */
  volcanism: Uint8Array;
  /** 0-255: Derived from Shear + Rifting - drives fracture zones */
  fracture: Uint8Array;
  /** Accumulation buffer for multi-era simulation */
  cumulativeUplift: Uint8Array;
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
  volcanismScale: number;     // Global multiplier for volcanism (default: 1.0)
  rotationInfluence: number;  // How much plate rotation contributes to velocity (default: 0.3)
  hotspotCount: number;       // Random hotspots to inject (default: 3-5)
}
```

### Material-Aware Interaction Table
| Crust A | Crust B | Convergence Result | Divergence Result |
|---------|---------|-------------------|-------------------|
| Continental | Continental | High Uplift (Orogeny) | Rift Valley |
| Oceanic | Continental | Subduction → Volcanism | Passive Margin |
| Oceanic | Oceanic | Island Arc | Mid-Ocean Ridge |

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
