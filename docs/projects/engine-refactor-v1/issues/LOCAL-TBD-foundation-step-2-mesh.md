---
id: LOCAL-TBD-2
title: Implement Mesh Generation Strategy
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M3-core-engine-refactor-config-evolution
assignees: [codex]
labels: [Improvement, Architecture]
parent: LOCAL-TBD
children: []
blocked_by: [LOCAL-TBD-1]
blocked: [LOCAL-TBD-2.5, LOCAL-TBD-3]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Build the "Board" (Voronoi Mesh). Implement the `MeshBuilder` strategy using `d3-delaunay` to generate a Lloyd-relaxed Voronoi mesh as the foundation for all downstream plate generation.

## Deliverables
- `d3-delaunay` and `@types/d3-delaunay` added as dependencies to `packages/mapgen-core`.
- `packages/mapgen-core/src/strategies/mesh-builder.ts` implementing the `MapGenStep` interface.
- Utility functions: `computeCentroid()` and `calculateCellArea()` for polygon math.
- Logic to generate random points, run Lloyd relaxation, and build the `RegionMesh` (sites, neighbors, areas, centroids).
- Unit tests verifying mesh properties (centroid convergence, neighbor connectivity).

## Acceptance Criteria
- [ ] `MeshBuilder` implements `MapGenStep` with ID `core.mesh.voronoi`.
- [ ] `run()` populates `context.artifacts.mesh` with `sites`, `neighbors`, `areas`, and `centroids`.
- [ ] Lloyd relaxation correctly regularizes the cell shapes over N iterations (Config: `relaxationSteps`).
- [ ] `d3-delaunay` is correctly bundled in the build process (via tsup).
- [ ] All degenerate cells (null polygons at boundaries) are handled gracefully.
- [ ] Mesh generation for 4000 cells completes in under 100ms.

## Testing / Verification
- `pnpm test:mapgen`
- Verify that `context.artifacts.mesh.neighbors` is a valid adjacency list (symmetric, no out-of-bounds indices).
- Test centroid convergence: after 3+ relaxation steps, cell shapes should be more regular.

## Dependencies / Notes
- **Blocked by:** LOCAL-TBD-1 (Core Pipeline Infrastructure)
- **Blocked:** LOCAL-TBD-3 (Plate Partitioning Strategy)
- **Requires:** `d3-delaunay` (install: `pnpm add d3-delaunay && pnpm add -D @types/d3-delaunay`).
- **Reference:** [Foundation Stage Architecture - Strategy 1: Mesh Generation](../../../system/libs/mapgen/foundation.md#31-strategy-1-mesh-generation)
- **Library Decision:** We chose `d3-delaunay` over Civ7's `TypeScript-Voronoi` for 5-10x performance gains and active maintenance.
- **WrapX:** Not needed initially. Civ7 defaults to `wrapX: 0`. Wrapping logic can be added later.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Algorithm (from Foundation Architecture)
1. Generate $N$ random points.
2. Compute Voronoi diagram (using `d3-delaunay`).
3. Move each point to the centroid of its cell.
4. Repeat $K$ times (Config: `relaxationSteps`).
**Result:** A "relaxed" mesh where cells are roughly hexagonal but organic.

### d3-delaunay API Summary
```typescript
import { Delaunay } from "d3-delaunay";

const delaunay = Delaunay.from(points); // points: [number, number][]
const voronoi = delaunay.voronoi([0, 0, width, height]);

voronoi.cellPolygon(i);   // Returns [[x,y],...] or null
voronoi.neighbors(i);     // Returns iterator of neighbor indices
voronoi.contains(i, x, y); // Point-in-cell test
delaunay.find(x, y);      // Find nearest point index
```

### Centroid Calculation (implement this)
```typescript
function computeCentroid(polygon: [number, number][]): [number, number] {
  let area = 0, cx = 0, cy = 0;
  for (let i = 0; i < polygon.length; i++) {
    const [x0, y0] = polygon[i];
    const [x1, y1] = polygon[(i + 1) % polygon.length];
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  area *= 0.5;
  return [cx / (6 * area), cy / (6 * area)];
}
```

### Configuration Schema
```typescript
interface MeshConfig {
  cellCount: number;      // Resolution of the physics board (default: 4000)
  relaxationSteps: number;// Regularity of the mesh (0=Chaos, 5=Hex-like)
}
```

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
