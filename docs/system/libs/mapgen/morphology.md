# Morphology

> **Status:** Canonical (domain-only causality + contract spec)
>
> **This doc is:** what Morphology *means* in the pipeline: responsibilities, inputs, outputs, and first-principles causal model.
>
> **This doc is not:** SDK wiring guidance (step/stage file layout, authoring mechanics, adapters).

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

### Buffers vs artifacts (contract nuance)

Morphology is fundamentally **buffer-oriented**: it refines shared, mutable world layers over multiple steps and often across domains.

- The canonical example is the **elevation/heightfield**: it is iteratively refined (uplift → erosion → deposition → sea level) and then consumed broadly downstream.
- Under current pipeline constraints, a buffer may be **published once** as an artifact “handle” for gating/typed access, but the buffer itself remains a mutable working layer until the pipeline freezes it.

### Overlays (formation motifs for downstream consumers)

In addition to buffers and published products, Morphology may publish **overlays** to describe motif-like formation stories that downstream domains can consume.

Example: “mountain corridors”
- The base morphology products describe *what exists* (elevation, land mask, erosion proxies).
- A corridor overlay describes *a specific interpretable pattern* (“this is a pass/corridor carved by uplift + erosion history”).
- Downstream usage:
  - Ecology can bias vegetation/biome transitions along corridor overlays.
  - Placement can bias starts/POIs along corridor overlays.

Overlays are append-preferred collections inside a single `overlays` container (e.g., `overlays.corridors`); they are currently routed through artifact contracts for gating/typing but should be modeled as overlays, not as “just artifacts”.

### Inputs

- Region mesh / neighbor graph.
- Crust type/age and tectonic force fields (uplift, volcanism, cumulative uplift).

### Intermediate buffers (mutable working layers)

Data used to drive simulation and downstream Ecology.

```typescript
interface MorphologyBuffers {
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

- Elevation/heightfield and land/ocean mask (canonical shared layers).

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
