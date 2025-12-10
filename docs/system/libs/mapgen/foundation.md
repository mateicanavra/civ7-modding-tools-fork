# Foundation Stage Architecture

## 1. Overview

The **Foundation Stage** is the first major phase of the map generation pipeline. Its responsibility is to construct the physical "board" (Mesh) and the tectonic "pieces" (Plates) that drive all downstream morphology.

Unlike legacy approaches that rely on grid-based noise or nearest-neighbor heuristics, the Foundation stage uses a **Graph-Based Physics Model**.

### Core Responsibilities
1.  **Mesh Generation:** Create a regularized Voronoi graph to represent the world surface.
2.  **Partitioning:** Group mesh cells into tectonic plates with distinct properties (Major vs. Minor).
3.  **Tectonics:** Simulate physical interactions (Convergence, Divergence, Shear) at plate boundaries.

---

## 2. Data Model

The Foundation stage operates on graph structures stored in the `MapGenContext.artifacts` container. These structures are immutable once created.

### 2.1. Region Mesh (`context.artifacts.mesh`)
The underlying geometry of the world. We use a **Voronoi Diagram** derived from a Lloyd-relaxed Delaunay triangulation.

```typescript
interface RegionMesh {
  /** Array of [x, y] coordinates for each cell centroid */
  sites: Point2D[];
  /** Adjacency list: neighbors[i] = [j, k, l...] */
  neighbors: Int32Array[];
  /** Area of each cell (for weighted partitioning) */
  areas: Float32Array;
  /** Centroids for relaxation calculations */
  centroids: Point2D[];
}
```

### 2.2. Plate Graph (`context.artifacts.plateGraph`)
The logical grouping of mesh cells into plates.

```typescript
interface PlateGraph {
  /** Maps Mesh Cell Index -> Plate ID */
  cellToPlate: Int16Array;
  /** The definition of each plate */
  plates: PlateRegion[];
}

interface PlateRegion {
  id: number;
  type: 'major' | 'minor';
  seedLocation: Point2D;
  velocity: Vector2D; // Movement direction & speed
  rotation: number;   // Angular velocity
}
```

### 2.3. Tectonic Data (`context.artifacts.tectonics`)
The physical forces calculated at plate boundaries. These tensors drive mountain uplift, rift valleys, and earthquake zones.

```typescript
interface TectonicData {
  /** 0-1: Intensity of collision (Convergent) */
  upliftPotential: Uint8Array;
  /** 0-1: Intensity of separation (Divergent) */
  riftPotential: Uint8Array;
  /** 0-1: Intensity of shearing (Transform) */
  shearStress: Uint8Array;
  /** 0-1: Distance to nearest boundary (inverted) */
  boundaryCloseness: Uint8Array;
}
```

---

## 3. The Pipeline

The Foundation stage is implemented as a sub-pipeline of three atomic strategies.

### 3.1. Strategy 1: Mesh Generation
**Goal:** Create a uniform, organic grid.

*   **Algorithm:** **Lloyd's Relaxation** on a Voronoi Diagram.
*   **Process:**
    1.  Generate $N$ random points.
    2.  Compute Voronoi diagram (using `d3-delaunay`).
    3.  Move each point to the centroid of its cell.
    4.  Repeat $K$ times (Config: `relaxationSteps`).
*   **Result:** A "relaxed" mesh where cells are roughly hexagonal but organic.

### 3.2. Strategy 2: Plate Partitioning
**Goal:** Divide the mesh into realistic tectonic plates.

*   **Algorithm:** **Multi-Source Weighted Flood Fill**.
*   **Process:**
    1.  Select $M$ seeds for "Major" plates (Continental).
    2.  Select $m$ seeds for "Minor" plates (Oceanic/Island).
    3.  Assign "Strength" (travel cost) to each seed. Major plates have lower cost, allowing them to expand further.
    4.  Run a Priority Queue flood fill from all seeds simultaneously.
*   **Result:** A map partitioned into large continental plates and smaller buffer plates, without the "uniform size" artifact of simple nearest-neighbor Voronoi.

### 3.3. Strategy 3: Tectonic Physics
**Goal:** Calculate geological forces at boundaries.

*   **Algorithm:** **Vector Analysis on Graph Edges**.
*   **Process:**
    1.  Identify **Boundary Edges** (edges where `Cell A` and `Cell B` belong to different plates).
    2.  For each boundary edge:
        *   Calculate the **Relative Velocity** vector: $V_{rel} = V_{plateA} - V_{plateB}$.
        *   Calculate the **Edge Normal** vector $N$ (perpendicular to the boundary).
        *   **Convergence:** $C = -(V_{rel} \cdot N)$. Positive = Collision, Negative = Separation.
        *   **Shear:** $S = |V_{rel} \times N|$. Sliding motion.
    3.  **Rasterization:** Interpolate these edge values onto the hex grid to populate `upliftPotential` and `riftPotential`.

---

## 4. Configuration

The behavior of the Foundation stage is controlled by the `PlateGenerationConfig` schema.

```typescript
interface PlateGenerationConfig {
  mesh: {
    cellCount: number;      // Resolution of the physics board
    relaxationSteps: number;// Regularity of the mesh (0=Chaos, 5=Hex-like)
  };
  partition: {
    majorPlates: number;    // Count of large plates
    minorPlates: number;    // Count of small plates
    majorPlateStrength: number; // 0-1: Expansion bias for majors
  };
  tectonics: {
    collisionScale: number; // Global multiplier for uplift
    rotationInfluence: number; // How much plate rotation contributes to velocity
  };
}
```

## 5. Dependencies

*   **Requires:** `d3-delaunay` (for Voronoi/Delaunay computation).
*   **Provides:** `FoundationContext` (consumed by Morphology and Hydrology).