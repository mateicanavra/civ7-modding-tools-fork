# Foundation Stage Architecture

## 1. Overview

The **Foundation Stage** is the first major phase of the map generation pipeline. Its responsibility is to construct the physical "board" (Mesh), the geological material (Crust), and the tectonic "pieces" (Plates) that drive all downstream morphology.

Unlike legacy approaches that rely on grid-based noise or nearest-neighbor heuristics, the Foundation stage uses a **Graph-Based Physics Model** that explicitly decouples **Kinematics** (Plate Movement) from **Material** (Crust Type).

### Core Responsibilities
1.  **Mesh Generation:** Create a regularized Voronoi graph to represent the world surface.
2.  **Crust Generation:** Define the material properties of the world (Continental vs. Oceanic) independent of plate boundaries.
3.  **Partitioning:** Group mesh cells into tectonic plates with distinct kinematic properties (Velocity, Rotation).
4.  **Tectonics:** Simulate physical interactions (Subduction, Orogeny, Rifting) by intersecting the Plate Graph with the Crust Mask.

---

## 2. Data Model

The Foundation stage operates on graph structures stored in the `MapGenContext.artifacts` container. These structures are immutable once created, though the `TectonicData` can accumulate history across eras.

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

### 2.2. Crust Mask (`context.artifacts.crust`)
The material definition of the lithosphere. This is generated *before* plates are defined, ensuring that landmasses can exist in the middle of plates (Passive Margins) or span across boundaries.

```typescript
interface CrustData {
  /** 0=Oceanic (Basalt), 1=Continental (Granite) */
  type: Uint8Array;
  /** 0=New (Active), 255=Ancient (Craton) */
  age: Uint8Array;
}
```

### 2.3. Plate Graph (`context.artifacts.plateGraph`)
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
  type: 'major' | 'minor'; // Kinematic scale, NOT material type
  seedLocation: Point2D;
  velocity: Vector2D; // Movement direction & speed
  rotation: number;   // Angular velocity
}
```

### 2.4. Tectonic Data (`context.artifacts.tectonics`)
The physical forces calculated at plate boundaries. These tensors drive mountain uplift, rift valleys, and earthquake zones.

```typescript
interface TectonicData {
  /** 0-255: Intensity of collision (Convergent) */
  upliftPotential: Uint8Array;
  /** 0-255: Intensity of separation (Divergent) */
  riftPotential: Uint8Array;
  /** 0-255: Intensity of shearing (Transform) */
  shearStress: Uint8Array;
  /** 0-255: Derived from Subduction + Hotspots */
  volcanism: Uint8Array;
  /** 0-255: Derived from Shear + Rifting */
  fracture: Uint8Array;
  /** Accumulation buffer for multi-era simulation */
  cumulativeUplift: Uint8Array;
}
```

---

## 3. The Pipeline

The Foundation stage is implemented as a sub-pipeline of four atomic strategies.

### 3.1. Strategy 1: Mesh Generation
**Goal:** Create a uniform, organic grid.

*   **Algorithm:** **Lloyd's Relaxation** on a Voronoi Diagram.
*   **Process:**
    1.  Generate $N$ random points.
    2.  Compute Voronoi diagram (using `d3-delaunay`).
    3.  Move each point to the centroid of its cell.
    4.  Repeat $K$ times (Config: `relaxationSteps`).
*   **Result:** A "relaxed" mesh where cells are roughly hexagonal but organic.

### 3.2. Strategy 2: Crust Generation
**Goal:** Define the material "Anvil" that receives tectonic forces.

*   **Algorithm:** **Craton Seeding & Noise**.
*   **Process:**
    1.  Seed "Craton" centers (Ancient stable cores).
    2.  Grow Continental Crust around Cratons using noise/distance fields.
    3.  Remaining area is defined as Oceanic Crust.
*   **Design Rationale:**
    *   **Why before Plates?** By defining material first, we allow for "Passive Margins" (e.g., the US East Coast) where a continent sits safely in the middle of a plate. If we generated plates first, every coastline would be a plate boundary (like the Andes), which is geologically incorrect.
    *   **Independence:** This step is largely independent of plate kinematics, mimicking the deep-time stability of cratons.
*   **Result:** A `CrustData` mask defining where the "Land" is, independent of where the plates will be.

### 3.3. Strategy 3: Plate Partitioning
**Goal:** Divide the mesh into realistic tectonic plates (The "Engine").

*   **Algorithm:** **Multi-Source Weighted Flood Fill**.
*   **Process:**
    1.  Select $M$ seeds for "Major" plates (Large kinematic domains).
    2.  Select $m$ seeds for "Minor" plates (Buffer zones).
    3.  Run a Priority Queue flood fill from all seeds simultaneously.
*   **Design Rationale:**
    *   **Cost Heuristic:** While plates are seeded randomly, the flood fill uses a "Travel Cost" that is higher for Continental Crust than Oceanic Crust. This biases plate boundaries to form in oceans or wrap *around* continents, simulating the strength of cratons. However, it *can* still split a continent (Rifting) if the geometry demands it.
*   **Result:** A map partitioned into plates. Note that a single Major Plate might contain both a Continent and an Ocean (e.g., African Plate).

### 3.4. Strategy 4: Tectonic Physics
**Goal:** Calculate geological forces by intersecting Kinematics (Plates) with Material (Crust).

*   **Algorithm:** **Vector Analysis + Material Lookup**.
*   **Process:**
    1.  Identify **Boundary Edges**.
    2.  For each boundary edge, calculate **Relative Velocity** ($V_{rel}$).
    3.  **Resolve Interaction based on Crust Type:**
        *   **Cont-Cont Convergence:** High Uplift, Low Volcanism (Himalayas).
        *   **Ocean-Cont Convergence:** Medium Uplift, High Volcanism (Andes/Subduction).
        *   **Ocean-Ocean Convergence:** Low Uplift, Island Arcs (Japan).
        *   **Divergence:** Rift Valley (Land) or Mid-Ocean Ridge (Sea).
    4.  **Inject Hotspots:** Add uplift/volcanism at random non-boundary points.
    5.  **Accumulate:** Add results to `cumulativeUplift`.

---

## 4. Iterative Simulation (Eras)

To support "Geologic History," the Foundation stage can be run in multiple passes (Eras).

1.  **Paleo Era:**
    *   Run Steps 1-4.
    *   Result: `cumulativeUplift` contains ancient mountain ranges.
2.  **Meso/Ceno Era:**
    *   Re-run Steps 3-4 (New Plates, same Crust).
    *   Result: New forces are added to `cumulativeUplift`.
3.  **Morphology Interpretation:**
    *   High `cumulativeUplift` + Ancient `crustAge` = **Hills/Coal**.
    *   High `cumulativeUplift` + Young `crustAge` = **Mountains/Geothermal**.

---

## 5. Configuration

The behavior of the Foundation stage is controlled by a configuration slice within the global `MapGenConfig` schema (see `docs/system/libs/mapgen/architecture.md` and `PRD-config-refactor.md`).

Conceptually, the Foundation needs parameters in four clusters:

```typescript
interface PlateGenerationConfig {
  mesh: {
    cellCount: number;
    relaxationSteps: number;
  };
  crust: {
    continentalRatio: number; // % of world that is continental crust
    cratonCount: number;      // Number of stable cores
  };
  partition: {
    majorPlates: number;
    minorPlates: number;
  };
  tectonics: {
    collisionScale: number;
    volcanismScale: number;
    hotspotCount: number;
  };
}
```

In the implementation, these fields are realized as part of `MapGenConfig` (for example under `config.foundation` or related sub‑objects) and are:

- Defined and validated via the shared configuration schema.
- Injected into the pipeline as part of `MapGenContext.config`.
- Consumed by the Foundation sub‑pipeline steps (Mesh, Crust, Partition, Physics) via that context.

## 6. Dependencies

*   **Requires:** `d3-delaunay` (for Voronoi/Delaunay computation).
*   **Provides:** `FoundationContext` (Legacy Bridge) and `context.artifacts` (Modern Pipeline).
