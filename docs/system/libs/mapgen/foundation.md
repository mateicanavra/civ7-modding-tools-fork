# Foundation

> **Status:** Canonical (domain-only causality + contract spec)
>
> **This doc is:** what Foundation *means* in the pipeline: responsibilities, inputs, outputs, and first-principles causal model.
>
> **This doc is not:** SDK wiring guidance (step/stage file layout, authoring mechanics, adapters).

## Overview

The Foundation layer constructs the physical "board" used by downstream shaping: surface geometry (mesh), geological material (crust), tectonic plates (kinematics), and the tectonic forces that drive landform evolution.

Unlike grid-based noise and nearest-neighbor heuristics, this approach uses a graph-based physics model that explicitly decouples **kinematics** (plate motion) from **material** (crust type/age).

### Modeling posture: mesh-first (not tile-first)

- The canonical Foundation substrate is a **mesh/graph** (Delaunay → Voronoi), not a tile grid.
- Any tile-indexed representation is a **projection/derivation** for consumers; it must not drive the Foundation model.
- Legacy “tile-first” Foundation behavior is treated as baseline/legacy and must not be re-enshrined as the target model.

### Buffers vs artifacts (contract nuance)

Foundation mostly produces **publish-once products** that downstream domains treat as immutable inputs (mesh, crust, plate graph, force fields).

If Foundation runs multi-pass history (eras) and accumulates long-term signals (e.g., `cumulativeUplift`), treat those accumulators as **buffers** (mutable working layers) with a publish-once contract surface (an “artifact handle”) for gating/typed access.

### Core responsibilities

1. **Mesh generation:** Create a regularized Voronoi graph to represent the world surface.
2. **Crust generation:** Define material properties (continental vs oceanic) independent of plate boundaries.
3. **Partitioning:** Group mesh cells into tectonic plates with distinct kinematic properties (velocity, rotation).
4. **Tectonics:** Derive forces (subduction, orogeny, rifting, transform shear) by intersecting plate motion with the crust mask.

## Key data products

### Region mesh

The underlying geometry of the world surface. A Voronoi diagram derived from a Lloyd-relaxed Delaunay triangulation.

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

### Crust mask

The material definition of the lithosphere, generated *before* plates are defined. This allows landmasses to exist in the middle of plates (passive margins) or span across boundaries.

```typescript
interface CrustData {
  /** 0=Oceanic (Basalt), 1=Continental (Granite) */
  type: Uint8Array;
  /** 0=New (Active), 255=Ancient (Craton) */
  age: Uint8Array;
}
```

### Plate graph

The logical grouping of mesh cells into plates with distinct kinematic properties.

```typescript
interface PlateGraph {
  /** Maps Mesh Cell Index -> Plate ID */
  cellToPlate: Int16Array;
  /** The definition of each plate */
  plates: PlateRegion[];
}

interface PlateRegion {
  id: number;
  type: "major" | "minor"; // Kinematic scale, NOT material type
  seedLocation: Point2D;
  velocity: Vector2D; // Movement direction & speed
  rotation: number; // Angular velocity
}
```

### Tectonic force fields

Physical forces derived at plate boundaries. These drive uplift, rifting, fracture, volcanism, and can accumulate across eras.

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

## Conceptual algorithm

### Mesh generation

Goal: create a uniform, organic cellular surface.

- Algorithm: Lloyd's relaxation on a Voronoi diagram.
- Sketch:
  1. Generate $N$ random points.
  2. Compute the Voronoi diagram.
  3. Move each point to the centroid of its cell.
  4. Repeat $K$ times (relaxation steps).

### Crust generation

Goal: define the material "anvil" that receives tectonic forces.

- Algorithm: craton seeding + distance/noise growth.
- Rationale:
  - Defining material before plates enables passive margins where continents sit safely in the middle of plates.
  - Crust age can represent deep-time stability (cratons) vs young active margins.

### Plate partitioning

Goal: divide the mesh into realistic tectonic plates (kinematic domains).

- Algorithm: multi-source weighted flood fill.
- Rationale:
  - A travel-cost heuristic can bias boundaries to form in oceans or wrap around continents (cratons resist splitting) while still allowing rifting when geometry demands it.

### Tectonic physics

Goal: calculate forces by intersecting kinematics (plates) with material (crust).

- Sketch:
  1. Identify boundary edges.
  2. Compute relative velocity across each boundary.
  3. Resolve interaction based on crust types (ocean/ocean, ocean/continent, continent/continent).
  4. Inject hotspots (non-boundary volcanism/uplift).
  5. Accumulate into long-term buffers (e.g., `cumulativeUplift`).

## Iterative simulation (eras)

To support geologic history, Foundation can run in multiple passes ("eras") where crust persists while plate kinematics change.

1. **Paleo era:** compute mesh/crust/plates/tectonics; accumulate ancient mountain ranges.
2. **Meso/Ceno era:** re-run plate+tectonic interaction against the same crust; accumulate new forces.
3. **Interpretation hints:** high cumulative uplift + ancient crust suggests older hills/coal; high uplift + young crust suggests young mountains/geothermal.

## Tuning parameters (conceptual)

```typescript
interface PlateGenerationConfig {
  mesh: {
    cellCount: number;
    relaxationSteps: number;
  };
  crust: {
    continentalRatio: number; // % of world that is continental crust
    cratonCount: number; // Number of stable cores
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
