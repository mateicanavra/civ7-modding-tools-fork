# Ecology

## Overview

Ecology interprets the physical world (geology + climate) into gameplay concepts: **soils**, **biomes**, **resources**, and **features**.

Separate **pedology** (soil science) from **biogeography** (biomes). Soil is the bridge between dead rock (foundation/morphology) and the living world (biomes), and a useful intermediate for placement bias and resource rules.

### Core responsibilities

1. **Pedology:** Classify soil types and fertility based on bedrock, sediment, relief, and climate.
2. **Resources:** Place strategic and luxury resources based on geologic and climatic rules (not random scatter).
3. **Biomes:** Classify vegetation zones using temperature and moisture (Whittaker/Holdridge).
4. **Features:** Place forests, marshes, reefs, and ice based on local conditions.

## Key products

### Inputs

- Parent material and age (crust/bedrock signals).
- Relief and sediment (slope, sediment depth, erosion-derived basins).
- Temperature and moisture/rainfall.
- Rivers/lakes (where available) as modifiers for fertility and feature gating.

### Intermediate products

```typescript
interface PedologyArtifacts {
  /**
   * Soil classification (e.g., 0=Sand, 1=Loam, 2=Clay, 3=Rocky).
   * Derived from parent material + climate + relief + time.
   */
  soilType: Uint8Array;

  /**
   * 0.0 - 1.0 scalar representing agricultural potential.
   * Used for placement bias and yield-related systems.
   */
  fertility: Float32Array;

  /**
   * Bitmask or probability maps for potential resources.
   * Example: “high probability of coal here”.
   */
  resourceCandidates: Map<string, Float32Array>;
}

interface EcologyArtifacts {
  /**
   * 0.0 - 1.0 scalar for vegetation density.
   * Used to place forests/jungles within valid biomes.
   */
  vegetationDensity: Float32Array;
}
```

### Outputs

- Biome classification (desert, tundra, plains, etc.).
- Features (forest, marsh, reef, ice).
- Resources (placed IDs or placements).

## Conceptual steps

### Soil classification

Goal: determine ground composition and fertility.

- Sketch: CLORPT-style approximation (Climate, Organisms, Relief, Parent material, Time).
  - Parent material: crust type + sediment depth.
  - Climate: moisture + temperature.
  - Relief: slope/curvature.
- Example outcomes:
  - Deep sediment + moderate rain → loam (high fertility).
  - Steep slope + little sediment → rocky (low fertility).

### Resource generation

Goal: place resources logically and legibly.

1. **Candidate mapping:** assign per-resource probabilities from rules.
   - Coal: low elevation + high moisture + sedimentary basin.
   - Iron: ancient craton (old crust) or hills.
   - Oil: continental shelf or lowland marsh.
2. **Clustering:** group candidates into basins/fields rather than single-tile speckles.
3. **Culling:** enforce map-wide counts and spacing (balance).

### Biome classification

Goal: assign the base biome regime.

- Use a Whittaker diagram or Holdridge life zones: look up (temperature, rainfall) in a 2D table.
  - High temp + high rain → tropical rainforest.
  - Low temp + low rain → tundra.
  - High temp + low rain → desert.

### Feature placement

Goal: add vegetation and terrain features.

- Forest/jungle: vegetation density above threshold (within valid biomes).
- Marsh: low elevation + high moisture + near water.
- Reef: shallow water + warm temperature.
- Ice: very low temperature (water) or high altitude (land).

## Tuning parameters (conceptual)

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
