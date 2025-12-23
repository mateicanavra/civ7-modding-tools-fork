# Morphology

## Overview

Morphology transforms tectonic potential and geologic history into a realistic, playable landscape.

Unlike approaches that simply add noise to a heightmap, Morphology follows a **geomorphic erosion cycle**: water cuts valleys (incision), gravity smooths slopes (diffusion), and rivers transport sediment to low-energy basins and coasts (deposition).

### Core responsibilities

1. **Uplift integration:** Convert tectonic forces and history into an initial elevation field.
2. **Erosion:** Carve valleys using the stream power law.
3. **Diffusion:** Smooth rugged slopes into hills (thermal erosion / slope diffusion).
4. **Sedimentation:** Deposit eroded material to form plains and deltas.
5. **Land definition:** Apply sea level to determine the land/ocean mask.

### Design philosophy: field-based vs particle-based

Prefer **field-based geomorphology** (solving on the graph) over **particle-based erosion** (simulating many droplets).

- Field-based methods are faster, deterministic, and yield predictable large-scale features (valleys, basins) suitable for a strategy map.
- Use a snapshot approach: 1–3 "eras" (e.g., paleo/meso/modern) to establish the look of old vs young mountains rather than a continuous simulation.

## Key data products

### Inputs

- Region mesh / neighbor graph.
- Crust type/age and tectonic force fields (uplift, volcanism, cumulative uplift).

### Intermediate products

Data used to drive simulation and downstream Ecology.

```typescript
interface MorphologyArtifacts {
  /**
   * Per-cell coefficient K representing resistance to erosion.
   * Derived from crust type/age (granite is hard, sandstone is soft).
   */
  erodibility: Float32Array;

  /**
   * Depth of loose sediment on top of bedrock.
   * Critical for soil fertility in Ecology.
   */
  sedimentDepth: Float32Array;

  /**
   * Index of the neighbor receiving flow (steepest descent).
   * Used for river routing.
   */
  flowDir: Int32Array;

  /**
   * Total drainage area flowing into this cell.
   * Drives stream power calculation.
   */
  flowAccum: Float32Array;

  /**
   * Optional: a graph of ancient rivers used to seed modern rivers.
   */
  paleoRiverGraph?: RiverGraph;
}
```

### Outputs

- Elevation field (scaled meters).
- Land/ocean mask.

## Conceptual steps

### Uplift integration

Create the "raw block" of terrain.

- Sketch: `elevation = base + (cumulativeUplift * timeScale)`.

### Lithology mapping (erodibility)

Map crust type/age into an erodibility coefficient $K$.

- Young volcanic arcs: low $K$ (hard).
- Ancient cratons: very low $K$ (very hard).
- Sedimentary basins: high $K$ (soft).

### Flow routing

Determine where water flows.

- Algorithm: steepest descent on the current elevation field.
- Outputs: `flowDir` and `flowAccum` (drainage area).

### Fluvial incision

Carve valleys.

- Algorithm: stream power law.
  - $E = K \cdot A^m \cdot S^n$ where $A$ is flow accumulation and $S$ is slope.
- Effect: lowers elevation in channels, creating branching valley networks.

### Hillslope diffusion

Soften jagged spikes into hills.

- Algorithm: Laplacian smoothing gated by a talus angle (avoid smoothing cliffs that are too steep).
- Effect: rounds terrain, especially in older crust regions.

### Sediment deposition

Create flat, fertile plains.

- Sketch: conservation of mass; sediment eroded upstream is deposited in low-energy areas (low slope) and coastal depressions.
- Effect: fills valleys and builds deltas; populates `sedimentDepth`.

### Volcanism

Add specific volcanic forms.

- Sketch: add conical height where volcanism potential is high.
- Examples: shield volcanoes (hotspots) and stratovolcanoes (arcs).

### Sea level

Define the coastline.

- Sketch: `land = elevation > seaLevel`.
- Sea level can be a global constant or a curve (planet types).

## Tuning parameters (conceptual)

```typescript
interface MorphologyConfig {
  /** Global sea level (meters relative to datum) */
  seaLevel: number;

  /** Erosion parameters */
  erosion: {
    /** Global erosion rate multiplier */
    rate: number;
    /** Stream power exponent m (area influence) */
    m: number;
    /** Stream power exponent n (slope influence) */
    n: number;
  };

  /** Time simulation */
  history: {
    /** Number of erosion passes */
    erosionSteps: number;
    /** Strength of diffusion (hill rounding) */
    diffusionScale: number;
  };
}
```
