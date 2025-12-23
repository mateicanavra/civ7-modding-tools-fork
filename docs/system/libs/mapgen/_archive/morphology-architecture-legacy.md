> **Historical / legacy system architecture doc.**
> For reference only. Do **not** treat this as current target architecture or contract.
> Superseded by Engine Refactor v1 target-architecture SPEC + M4 plan:
> - `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md`
> - `docs/projects/engine-refactor-v1/milestones/M4-target-architecture-cutover-legacy-cleanup.md`

# Morphology Stage Architecture

> **Status:** Target (post‑M3). M3 is wrap‑first: legacy/engine behavior is wrapped to preserve map quality; the algorithms described here are not required for M3.

> **Config note:** Some sections still reference legacy `MapGenConfig` slices. The current target drafts supersede that: boundary input is `RunRequest = { recipe, settings }`, and step-local knobs are validated per step (no global config mega-object). See `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md`.

## 1. Overview

The **Morphology Stage** follows the Foundation phase. Its responsibility is to transform the raw tectonic potential (Uplift, Volcanism) into a realistic, playable landscape.

Unlike legacy approaches that simply add noise to a heightmap, this stage implements a **Geomorphic Erosion Cycle**. It simulates the physical processes that shape the earth: water cutting valleys (incision), gravity smoothing slopes (diffusion), and rivers carrying dirt to the coast (deposition).

### Core Responsibilities
1.  **Uplift Integration:** Convert tectonic forces and geologic history into an initial elevation field.
2.  **Erosion:** Carve river valleys using the Stream Power Law.
3.  **Diffusion:** Smooth rugged peaks into hills using thermal erosion.
4.  **Sedimentation:** Deposit eroded material to form fertile plains and deltas.
5.  **Land Definition:** Apply sea level to determine the final Land/Ocean mask.

### Design Philosophy: Field-Based vs. Particle-Based
We explicitly choose **Field-Based Geomorphology** (solving equations on the graph) over **Particle-Based Erosion** (simulating thousands of droplets).
*   **Why:** Field-based methods are faster, deterministic, and produce predictable large-scale features (valleys, basins) suitable for a strategy game map.
*   **Snapshot Approach:** We do not run a continuous simulation. We run 1-3 "Snapshots" (e.g., Paleo, Meso, Modern) to establish the look of "Old" vs "Young" mountains.

---

## 2. Data Model

The Morphology stage consumes Foundation artifacts and produces the primary Elevation and Terrain fields.

### 2.1. Inputs (Read-Only)
*   `context.artifacts.mesh`: The Voronoi geometry.
*   `context.artifacts.crust`: Material type (Igneous/Sedimentary) and Age.
*   `context.artifacts.tectonics`: Uplift potential, Volcanism, Cumulative Uplift.

### 2.2. Artifacts (`context.artifacts.morphology`)
Intermediate data used to drive the simulation and downstream Ecology.

```typescript
interface MorphologyArtifacts {
  /**
   * Per-cell coefficient K representing resistance to erosion.
   * Derived from Crust Type (Granite is hard, Sandstone is soft).
   */
  erodibility: Float32Array;

  /**
   * Depth of loose sediment on top of bedrock.
   * Critical for Soil Fertility in the Ecology stage.
   */
  sedimentDepth: Float32Array;

  /**
   * Index of the neighbor receiving flow (Steepest Descent).
   * Used for river routing.
   */
  flowDir: Int32Array;

  /**
   * Total drainage area flowing into this cell.
   * Drives Stream Power calculation.
   */
  flowAccum: Float32Array;

  /**
   * Optional: A graph of ancient rivers used to seed modern rivers.
   */
  paleoRiverGraph?: RiverGraph;
}
```

### 2.3. Outputs (Mutable Fields)
*   `context.fields.elevation`: The final heightmap (Int16, scaled meters).
*   `context.fields.terrain`: The Land/Ocean mask (Uint8).

---

## 3. The Pipeline

The Morphology phase is a sub-pipeline of atomic strategies.

### 3.1. Step 1: Uplift Integration (`morphology.uplift.integrate`)
**Goal:** Create the "Raw Block" of terrain.
*   **Logic:** `Elevation = Base + (CumulativeUplift * TimeScale)`.
*   **Inputs:** `tectonics.cumulativeUplift`, `tectonics.upliftPotential`.

### 3.2. Step 2: Lithology Mapping (`morphology.lithology.mapErodibility`)
**Goal:** Define how hard the rock is.
*   **Logic:** Map `crust.type` and `crust.age` to an Erodibility Coefficient ($K$).
    *   Young Volcanic Arc: Low $K$ (Hard).
    *   Ancient Craton: Very Low $K$ (Very Hard).
    *   Sedimentary Basin: High $K$ (Soft).

### 3.3. Step 3: Flow Routing (`morphology.flow.route`)
**Goal:** Determine where water flows.
*   **Algorithm:** Steepest Descent on the current Elevation field.
*   **Output:** `flowDir` and `flowAccum` (Drainage Area).

### 3.4. Step 4: Fluvial Incision (`morphology.erosion.fluvial`)
**Goal:** Carve valleys.
*   **Algorithm:** **Stream Power Law**.
    *   $E = K \cdot A^m \cdot S^n$
    *   Where $A$ is Flow Accumulation, $S$ is Slope.
*   **Result:** Lowers elevation in channels, creating branching valley networks.

### 3.5. Step 5: Hillslope Diffusion (`morphology.erosion.hillslopeDiffuse`)
**Goal:** Soften jagged spikes into hills.
*   **Algorithm:** Laplacian smoothing, gated by a "Talus Angle" (don't smooth cliffs that are too steep).
*   **Result:** Rounds off terrain, especially in "Old" crust regions.

### 3.6. Step 6: Sediment Deposition (`morphology.sediment.deposit`)
**Goal:** Create flat, fertile plains.
*   **Logic:** Conservation of Mass. Material removed by Erosion is transported downstream and deposited in low-energy areas (low slope) or coastal depressions.
*   **Result:** Fills valleys and builds deltas. Populates `sedimentDepth`.

### 3.7. Step 7: Volcanism (`morphology.volcanism.buildForms`)
**Goal:** Add specific volcanic features.
*   **Logic:** Adds conical height to cells with high `tectonics.volcanism`.
*   **Result:** Shield volcanoes (hotspots) and Stratovolcanoes (arcs).

### 3.8. Step 8: Sea Level (`morphology.seaLevel.classify`)
**Goal:** Define the coastline.
*   **Logic:** `Terrain = Elevation > SeaLevel ? Land : Ocean`.
*   **Note:** Sea Level can be a global constant or a curve (to allow for different planet types).

---

## 4. Configuration

Controlled by the `morphology` slice of `MapGenConfig`.

```typescript
interface MorphologyConfig {
  /** Global sea level (meters relative to datum) */
  seaLevel: number;

  /** Erosion parameters */
  erosion: {
    /** Global erosion rate multiplier */
    rate: number;
    /** Stream Power exponent m (Area influence) */
    m: number;
    /** Stream Power exponent n (Slope influence) */
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
