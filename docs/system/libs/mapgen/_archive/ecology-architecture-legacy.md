> **Historical / legacy system architecture doc.**
> For reference only. Do **not** treat this as current target architecture or contract.
> Superseded by Engine Refactor v1 target-architecture SPEC + M4 plan:
> - `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md`
> - `docs/projects/engine-refactor-v1/milestones/M4-target-architecture-cutover-legacy-cleanup.md`

# Ecology Stage Architecture

> **Status:** Target (post‑M3). M3 is wrap‑first: legacy/engine behavior is wrapped to preserve map quality; the algorithms described here are not required for M3.

> **Config note:** Some sections still reference legacy `MapGenConfig` slices. The current target drafts supersede that: boundary input is `RunRequest = { recipe, settings }`, and step-local knobs are validated per step (no global config mega-object). See `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md`.

## 1. Overview

The **Ecology Stage** follows Hydrology. Its responsibility is to interpret the physical world (Geology + Climate) into gameplay concepts: **Soils**, **Biomes**, **Resources**, and **Features**.

We separate **Pedology** (Soil Science) from **Biogeography** (Biomes). Soil is the bridge between the dead rock (Foundation/Morphology) and the living world (Biomes).

### Core Responsibilities
1.  **Pedology:** Classify soil types and fertility based on bedrock, sediment, and climate.
2.  **Resources:** Place strategic and luxury resources based on geologic and climatic rules (not just random scatter).
3.  **Biomes:** Classify vegetation zones using Temperature and Moisture (Whittaker/Holdridge).
4.  **Features:** Place forests, marshes, reefs, and ice based on local conditions.

---

## 2. Data Model

The Ecology stage consumes artifacts from all previous stages.

### 2.1. Inputs (Read-Only)
*   `context.artifacts.foundation`: Crust type/age (Parent Material).
*   `context.artifacts.morphology`: Sediment depth, Slope.
*   `context.artifacts.climate`: Temperature, Moisture/Rainfall.
*   `context.artifacts.hydrology`: River graph, Lake mask.

### 2.2. Artifacts (`context.artifacts.pedology` & `ecology`)
Intermediate data used for placement and scoring.

```typescript
interface PedologyArtifacts {
  /**
   * Soil classification (e.g., 0=Sand, 1=Loam, 2=Clay, 3=Rocky).
   * Derived from Parent Material + Climate.
   */
  soilType: Uint8Array;

  /**
   * 0.0 - 1.0 scalar representing agricultural potential.
   * Used for Start Bias and Farm yields.
   */
  fertility: Float32Array;

  /**
   * Bitmask or probability map for potential resources.
   * e.g., "High probability of Coal here".
   */
  resourceCandidates: Map<string, Float32Array>;
}

interface EcologyArtifacts {
  /**
   * 0.0 - 1.0 scalar for vegetation density.
   * Used to place Forests/Jungles within valid biomes.
   */
  vegetationDensity: Float32Array;
}
```

### 2.3. Outputs (Mutable Fields)
*   `context.fields.biomes`: The gameplay biome ID (Desert, Tundra, Plains, etc.).
*   `context.fields.features`: The gameplay feature ID (Forest, Marsh, Reef, Ice).
*   `context.fields.resources`: The placed resource ID.

---

## 3. The Pipeline

### 3.1. Step 1: Soil Classification (`ecology.soil.classify`)
**Goal:** Determine the ground composition.
*   **Logic:** **CLORPT** approximation (Climate, Organisms, Relief, Parent Material, Time).
    *   **Parent Material:** `crust.type` + `morphology.sedimentDepth`.
    *   **Climate:** `climate.moisture` + `climate.temperature`.
    *   **Relief:** `morphology.slope`.
*   **Result:** Populates `soilType` and `fertility`.
    *   *Example:* Deep Sediment + Moderate Rain = **Loam (High Fertility)**.
    *   *Example:* Steep Slope + No Sediment = **Rocky (Low Fertility)**.

### 3.2. Step 2: Resource Generation (`ecology.resources.generate`)
**Goal:** Place resources logically.
*   **Logic:**
    1.  **Candidate Mapping:** Calculate probability for each resource type based on rules.
        *   *Coal:* Low Elevation + High Moisture + Sedimentary Basin.
        *   *Iron:* Ancient Craton (Old Crust) or Hills.
        *   *Oil:* Continental Shelf or Lowland Marsh.
    2.  **Clustering:** Use Cellular Automata or noise to group candidates into "Basins" (e.g., "The Ruhr Valley") rather than single-tile speckles.
    3.  **Culling:** Enforce map-wide counts (Balance).

### 3.3. Step 3: Biome Classification (`ecology.biomes.classify`)
**Goal:** Assign the base terrain type.
*   **Algorithm:** **Whittaker Diagram** or **Holdridge Life Zones**.
*   **Inputs:** `climate.temperature` (Annual Mean) and `climate.rainfall` (Annual Total).
*   **Logic:** Look up (Temp, Rain) in a 2D table.
    *   High Temp + High Rain = Tropical Rainforest.
    *   Low Temp + Low Rain = Tundra.
    *   High Temp + Low Rain = Desert.

### 3.4. Step 4: Feature Placement (`ecology.features.place`)
**Goal:** Add vegetation and terrain features.
*   **Logic:**
    *   **Forest/Jungle:** `vegetationDensity` > Threshold (within valid biomes).
    *   **Marsh:** Low Elevation + High Moisture + Near Water.
    *   **Reef:** Shallow Water + Warm Temp.
    *   **Ice:** Very Low Temp (Water) or High Altitude (Land).

---

## 4. Configuration

Controlled by the `ecology` slice of `MapGenConfig`.

```typescript
interface EcologyConfig {
  /** Resource abundance settings */
  resources: {
    strategicDensity: number; // Global multiplier
    luxuryDensity: number;
    clustering: number; // How clumped resources are
  };

  /** Biome tuning */
  biomes: {
    /** Shift boundaries (e.g., make world drier) */
    moistureBias: number;
    temperatureBias: number;
  };
}
```
