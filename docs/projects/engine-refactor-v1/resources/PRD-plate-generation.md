# Revised Plate & Landmass Generation Pipeline

## 1. Overview

This document outlines the architectural refactor for the map generation pipeline, shifting from a "nearest-neighbor" pixel-based approach to a robust **Mesh -> Partition -> Physics** model.

**Key Goals:**
1.  **Ownership:** Remove reliance on game engine "fallbacks" or opaque utilities. We own the mesh generation using standard libraries (`d3-delaunay`).
2.  **Stability:** Ensure Lloyd relaxation is mathematically correct and reproducible.
3.  **Control:** Expose explicit levers for "Major" vs "Minor" plates to create realistic continents vs island chains.
4.  **Performance:** Run physics on graph edges (O(N)) instead of grid tiles (O(N²)).

---

## 2. Library Selection: `d3-delaunay`

We use **d3-delaunay** (built on Mapbox's **Delaunator**) for Voronoi mesh generation.

### 2.1. Why d3-delaunay?

| Criteria | d3-delaunay | TypeScript-Voronoi (Civ7's choice) |
|----------|-------------|-------------------------------------|
| **Performance** | 5-10x faster (Delaunator: 95ms/100k points) | Slower (Fortune's sweep-line) |
| **Maintenance** | Active, 267k dependent projects | Abandoned since Feb 2021 |
| **Output** | Identical (Delaunay/Voronoi are mathematical duals) | Identical |
| **Bundle** | Pure JS, tree-shakeable | Pure JS |

### 2.2. Algorithm Note

Both Fortune's algorithm (what Civ7 uses) and Delaunator produce the **same Voronoi diagram** - they're just different computational paths to the same mathematical result. Delaunator computes the Delaunay triangulation first, then derives the Voronoi by connecting triangle circumcenters.

### 2.3. Civ7 Precedent

Civ7's official voronoi-based map scripts (e.g., `continents-voronoi.js`, `pangaea-voronoi.js`) use `TypeScript-Voronoi` with Lloyd relaxation via `VoronoiUtils.computeVoronoi()`. This validates that:
- Voronoi-based plate generation works well for Civ maps
- Lloyd relaxation produces good cell regularity

### 2.4. What We Need to Build

d3-delaunay provides the core Voronoi computation but not all utilities. We need ~35 lines of straightforward geometry:

| Utility | d3-delaunay | TypeScript-Voronoi + Civ7's VoronoiUtils |
|---------|-------------|------------------------------------------|
| Centroid calculation | Write ~15 lines | Already in VoronoiUtils |
| Cell area calculation | Write ~10 lines | Already in VoronoiUtils |
| Lloyd relaxation | Write ~10 lines (or use built-in `update()`) | Already in VoronoiUtils |
| Neighbors | Built-in (`voronoi.neighbors(i)`) | Built-in (`cell.getNeighborIds()`) |
| Point-in-cell | Built-in (`voronoi.contains(i, x, y)`) | Built-in (`cell.pointIntersection()`) |
| Find nearest | Built-in (`delaunay.find(x, y)`) | Requires kdTree |

This is basic polygon math, not rebuilding a library.

### 2.5. WrapX Support (Future)

Civ7's `VoronoiUtils.computeVoronoi()` includes ~60 lines of **WrapX** logic for horizontal map wrapping (cylindrical maps where east wraps to west). However:

- **WrapX is optional** - Civ7's voronoi maps default to `wrapX: 0` (off)
- **We don't need it initially** - standard bounded maps work fine without wrapping
- **We can add it later** - Civ7's implementation in `VoronoiUtils` (`kd-tree.js:377-438`) shows exactly how to:
  1. Duplicate sites near edges as "ghost" cells
  2. Compute Voronoi on expanded bounds
  3. Filter cells back and rewire edges across the wrap boundary

When we need WrapX, we can reference Civ7's approach or consult genius-level Gemini 3 Pro.

---

## 3. Configuration Schema

We replace the ambiguous `PlateConfig` with a structured `PlateGenerationConfig` that clearly separates the three phases.

```typescript
export interface PlateGenerationConfig {
  /** Mesh generation settings */
  mesh: {
    /** Target number of cells in the underlying Voronoi graph */
    cellCount: number;
    /** Number of Lloyd relaxation iterations (0 = random, 3+ = regular) */
    relaxationSteps: number;
  };

  /** Plate partitioning settings */
  partition: {
    /** Number of large, continental plates */
    majorPlates: number;
    /** Number of small, gap-filling plates */
    minorPlates: number;
    /** 0-1: How much larger major plates are vs minor plates (approx) */
    majorPlateStrength: number; // e.g., 0.8
    /** 0-1: Probability of merging tiny orphan cells */
    mergeThreshold: number;
  };

  /** Tectonic physics settings */
  tectonics: {
    /** 0-1: Global collision intensity */
    collisionScale: number;
    /** 0-1: How much plates rotate vs move linearly */
    rotationInfluence: number;
    /** Directionality biases (e.g., for specific map scripts) */
    directionality?: DirectionalityConfig;
  };
}
```

---

## 4. Implementation Details

The Foundation Stage is implemented as a pipeline of three atomic strategies, following the [Map Generation Architecture](../../system/libs/mapgen/architecture.md).

### 4.1. Step 1: Mesh Generation (`MeshBuilder`)

**Role:** Create the "Board" upon which the simulation runs.
**Algorithm:** Voronoi Diagram with Lloyd Relaxation.
**Library:** `d3-delaunay` (bundled via tsup).

```typescript
// packages/mapgen-core/src/core/mesh.ts

import { Delaunay } from "d3-delaunay";

export interface RegionMesh {
  sites: Point2D[];
  neighbors: Int32Array[]; // Adjacency graph
  areas: Float32Array;
  centroids: Point2D[];
}

/** Compute the centroid of a polygon (array of [x, y] points) */
function computeCentroid(polygon: ArrayLike<number>[]): Point2D {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0, n = polygon.length; i < n; i++) {
    const [x0, y0] = polygon[i];
    const [x1, y1] = polygon[(i + 1) % n];
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  area *= 0.5;
  const scale = 1 / (6 * area);
  return { x: cx * scale, y: cy * scale };
}

export class MeshBuilder implements MapGenStep {
  id = "core.mesh.voronoi";

  run(context: MapContext, config: MeshConfig) {
    const { width, height } = context.bounds;
    const bounds: [number, number, number, number] = [0, 0, width, height];

    // 1. Generate Random Points
    let points: [number, number][] = generateRandomPoints(config.cellCount, width, height);

    // 2. Lloyd Relaxation Loop (Regularize the mesh)
    for (let i = 0; i < config.relaxationSteps; i++) {
      const delaunay = Delaunay.from(points);
      const voronoi = delaunay.voronoi(bounds);
      points = points.map((pt, idx) => {
        const polygon = voronoi.cellPolygon(idx);
        if (!polygon) return pt; // Keep original if cell is degenerate
        const centroid = computeCentroid(polygon);
        return [centroid.x, centroid.y];
      });
    }

    // 3. Build Final Graph
    const delaunay = Delaunay.from(points);
    const voronoi = delaunay.voronoi(bounds);
    // ... construct RegionMesh from voronoi ...

    context.mesh = result;
  }
}
```

### 4.2. Step 2: Plate Partitioning (`PlatePartitioner`)

**Role:** Group mesh cells into "Pieces" (Plates).
**Algorithm:** Multi-source weighted flood-fill.

```typescript
// packages/mapgen-core/src/world/partitioner.ts

export class PlatePartitioner implements MapGenStep {
  id = "core.plates.weighted";

  run(context: MapContext, config: PartitionConfig) {
    const mesh = context.mesh;

    // 1. Select Seeds
    // Pick 'majorPlates' seeds with high strength
    // Pick 'minorPlates' seeds in the gaps with low strength

    // 2. Flood Fill (Priority Queue)
    // Expand from seeds. Major plates have lower "cost" to travel,
    // allowing them to claim more territory before meeting a minor plate.

    context.graph = { cellToPlate, plates };
  }
}
```

### 4.3. Step 3: Tectonics (`TectonicEngine`)

**Role:** Simulate forces at the boundaries of plates.
**Algorithm:** Vector analysis on graph edges.

```typescript
// packages/mapgen-core/src/world/tectonics.ts

export class TectonicEngine implements MapGenStep {
  id = "core.tectonics.standard";

  run(context: MapContext, config: TectonicConfig) {
    // 1. Identify Boundary Edges
    const boundaryEdges = findBoundaryEdges(context.mesh, context.graph);

    // 2. Calculate Physics per Edge
    for (const edge of boundaryEdges) {
      const convergence = calculateConvergence(edge);
      const shear = calculateShear(edge);

      // Store stress/uplift data
    }

    // 3. Rasterize
    // Interpolate from graph edges to the hex grid
    context.foundation = { ... };
  }
}
```

---

## 5. Migration Strategy

1.  **Dependencies:** Add `d3-delaunay` and `@types/d3-delaunay` to `packages/mapgen-core`.
    ```bash
    pnpm add d3-delaunay
    pnpm add -D @types/d3-delaunay
    ```
2.  **Scaffold:** Create the `core/mesh.ts` and `world/partitioner.ts` files.
3.  **Refactor:** Replace the contents of `plates.ts` with the new pipeline orchestration.
4.  **Verify:** Use the CLI to generate a JSON dump of the `foundation` context and visualize the new plate shapes.

---

## 6. Risks & Mitigations

*   **Performance:** High cell counts (>10k) can be slow in JS.
    *   *Mitigation:* Default to 4000 cells (sufficient for Large maps). Delaunator benchmarks at ~1.15s for 1M points, so 4k is negligible.
*   **Engine Compatibility:** `d3-delaunay` uses modern JS features (ES modules, typed arrays).
    *   *Mitigation:* The build process (`tsup`) transpiles to a compatible target. Civ7 already runs similar Voronoi code successfully.
*   **Edge Cases:** Degenerate cells (e.g., at boundaries) may return `null` from `cellPolygon()`.
    *   *Mitigation:* Always null-check polygon results and fall back to original point position.
*   **WrapX Not Included:** Horizontal map wrapping is not supported out-of-the-box with d3-delaunay.
    *   *Mitigation:* WrapX is optional (Civ7 defaults to off). When needed, reference Civ7's `VoronoiUtils` implementation.
