---
id: LOCAL-TBD-2
title: Implement Mesh Generation Strategy
state: planned
priority: 2
estimate: 3
project: engine-refactor-v1
milestone: milestone-1-foundation
assignees: [codex]
labels: [Feature, Architecture]
parent: LOCAL-TBD
children: []
blocked_by: [LOCAL-TBD-1]
blocked: [LOCAL-TBD-3]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Implement the `MeshBuilder` strategy using `d3-delaunay` to generate a Lloyd-relaxed Voronoi mesh, replacing the legacy random point generation.

## Deliverables
- `d3-delaunay` and `@types/d3-delaunay` added as dependencies to `packages/mapgen-core`.
- `packages/mapgen-core/src/core/mesh.ts` implementing the `MapGenStep` interface.
- Utility functions: `computeCentroid()` (~15 lines) and `calculateCellArea()` (~10 lines).
- Logic to generate random points, run Lloyd relaxation, and build the adjacency graph.
- Unit tests verifying mesh properties (centroid convergence, neighbor connectivity).

## Acceptance Criteria
- [ ] `MeshBuilder` implements `MapGenStep` with ID `core.mesh.voronoi`.
- [ ] `run()` populates `context.mesh` with `sites`, `neighbors`, `areas`, and `centroids`.
- [ ] Lloyd relaxation correctly regularizes the cell shapes over N iterations.
- [ ] `d3-delaunay` is correctly bundled in the build process (via tsup).
- [ ] All degenerate cells (null polygons at boundaries) are handled gracefully.

## Testing / Verification
- `pnpm test:mapgen`
- Verify that `context.mesh.neighbors` is a valid adjacency list (symmetric, no out-of-bounds indices).
- Test centroid convergence: after 3+ relaxation steps, cell shapes should be more regular.

## Dependencies / Notes
- Requires `d3-delaunay` (install: `pnpm add d3-delaunay && pnpm add -D @types/d3-delaunay`).
- Reference [Plate Generation PRD](../resources/PRD-plate-generation.md#41-step-1-mesh-generation-meshbuilder).
- **Library Decision:** We chose `d3-delaunay` over Civ7's `TypeScript-Voronoi` for 5-10x performance gains and active maintenance. Both produce identical Voronoi diagrams (mathematical duals). See spec Section 2 for rationale.
- **Utilities to implement:** d3-delaunay provides core Voronoi but not centroid/area helpers. We write ~35 lines of basic polygon math (see spec Section 2.4).
- **WrapX:** Not needed initially. Civ7's voronoi maps default to `wrapX: 0`. When needed, reference Civ7's `VoronoiUtils` implementation in `kd-tree.js:377-438`.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

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

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
