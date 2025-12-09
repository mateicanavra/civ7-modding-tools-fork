---
id: LOCAL-TBD-4
title: Implement Tectonic Physics Strategy
state: planned
priority: 2
estimate: 3
project: engine-refactor-v1
milestone: milestone-1-foundation
assignees: [codex]
labels: [Feature, Architecture]
parent: LOCAL-TBD
children: []
blocked_by: [LOCAL-TBD-3]
blocked: [LOCAL-TBD-5]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Implement the `TectonicEngine` strategy to simulate physical forces (convergence, divergence, shear) along plate boundaries and generate the `FoundationContext` tensors.

## Deliverables
- `packages/mapgen-core/src/world/tectonics.ts` implementing the `MapGenStep` interface.
- Logic to identify boundary edges in the `PlateGraph`.
- Vector math to calculate relative plate motion and resolve it into stress/uplift components.
- Rasterization logic to interpolate graph edge data onto the hex grid (`FoundationContext`).

## Acceptance Criteria
- [ ] `TectonicEngine` implements `MapGenStep` with ID `core.tectonics.standard`.
- [ ] `run()` populates `context.foundation` with valid tensors (`upliftPotential`, `tectonicStress`, etc.).
- [ ] Convergent boundaries show high `upliftPotential`.
- [ ] Divergent boundaries show high `riftPotential`.
- [ ] Transform boundaries show high `tectonicStress` but low uplift/rift.

## Testing / Verification
- `pnpm test:mapgen`
- Inspect the output tensors: `upliftPotential` should form lines corresponding to plate boundaries.

## Dependencies / Notes
- Depends on `PlateGraph` from LOCAL-TBD-3.
- Reference [Plate Generation PRD](../resources/PRD-plate-generation.md#43-step-3-tectonics-tectonicengine).
- **Physics runs on graph edges (O(N)) instead of grid tiles (O(N²))** for significant performance gains.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Algorithm Overview
1. **Identify Boundary Edges:** Iterate over all mesh edges. If `plateA != plateB`, it's a boundary edge.
2. **Calculate Plate Velocities:** Compute velocity vectors for both plates at the edge midpoint.
3. **Resolve Forces:**
   - Dot product of relative velocity and edge normal → convergence/divergence
   - Cross product → shear (transform faults)
4. **Rasterize to Grid:** Interpolate from graph edges to the hex grid for `FoundationContext`.

### Vector Math Reference
```typescript
// Convergence (positive = collision, negative = divergence)
const convergence = dot(relativeVelocity, edgeNormal);

// Shear (transform fault intensity)
const shear = cross2D(relativeVelocity, edgeNormal);
```

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
