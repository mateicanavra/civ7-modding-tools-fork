# Comprehensive Refactoring Plan

This plan aligns our codebase with the target architecture phases (**Foundation, Morphology, Hydrology, Ecology, Narrative**) and eliminates the "God Class" Orchestrator.

We will execute this by creating 6 Domain Modules.

## 1. Foundation Domain (`src/layers/foundation/`)

**Responsible for the physical board (Mesh, Plates, Physics).**

- **Create Directory:** `src/layers/foundation/`
- **Create Step:** `FoundationStep.ts` (Wraps `initializeFoundation` logic from Orchestrator)
- **Create Entry:** `index.ts` (Exports `registerFoundationLayer`)

## 2. Morphology Domain (`src/layers/morphology/`)

**Responsible for the shape of the land (Landmass, Mountains, Coastlines).**

- **Create Directory:** `src/layers/morphology/`

### Landmass

- **Move:** `src/layers/landmass-plate.ts` → `landmass-plate.ts`
- **Move:** `src/layers/landmass-utils.ts` → `landmass-utils.ts`
- **Create Step:** `LandmassStep.ts` (Wraps `createPlateDrivenLandmasses`)

### Coastlines

- **Move:** `src/layers/coastlines.ts` → `coastlines.ts`
- **Create Step:** `CoastlinesStep.ts` (Wraps `addRuggedCoasts`)

### Islands

- **Move:** `src/layers/islands.ts` → `islands.ts`
- **Create Step:** `IslandsStep.ts` (Wraps `addIslandChains`)

### Mountains

- **Move:** `src/layers/mountains.ts` → `mountains.ts`
- **Create Step:** `MountainsStep.ts` (Wraps `layerAddMountainsPhysics`)

### Volcanoes

- **Move:** `src/layers/volcanoes.ts` → `volcanoes.ts`
- **Create Step:** `VolcanoesStep.ts` (Wraps `layerAddVolcanoesPlateAware`)

### Entry Point

- **Create Entry:** `index.ts` (Exports `registerMorphologyLayer`)

## 3. Hydrology Domain (`src/layers/hydrology/`)

**Responsible for water and climate (Rivers, Lakes, Rainfall).**

- **Create Directory:** `src/layers/hydrology/`

### Climate

- **Move:** `src/layers/climate-engine.ts` → `climate.ts`
- **Create Step:** `ClimateBaselineStep.ts` (Wraps `applyClimateBaseline`)
- **Create Step:** `ClimateRefineStep.ts` (Wraps `refineClimateEarthlike`)

### Rivers

- **Create Step:** `RiversStep.ts` (Extracts inline logic from Orchestrator: `modelRivers` + stats + adjacency)

### Lakes

- **Create Step:** `LakesStep.ts` (Extracts inline logic from Orchestrator: `generateLakes`)

### Entry Point

- **Create Entry:** `index.ts` (Exports `registerHydrologyLayer`)

## 4. Ecology Domain (`src/layers/ecology/`)

**Responsible for life (Biomes, Features).**

- **Create Directory:** `src/layers/ecology/`

### Biomes

- **Move:** `src/layers/biomes.ts` → `biomes.ts`
- **Create Step:** `BiomesStep.ts` (Wraps `designateEnhancedBiomes`)

### Features

- **Move:** `src/layers/features.ts` → `features.ts`
- **Create Step:** `FeaturesStep.ts` (Wraps `addDiverseFeatures`)

### Entry Point

- **Create Entry:** `index.ts` (Exports `registerEcologyLayer`)

## 5. Narrative Domain (`src/layers/narrative/`)

**Responsible for story overlays and strategic tagging.**

- **Create Directory:** `src/layers/narrative/`

### Move Logic

- `src/story/tagging.ts` → `tagging.ts`
- `src/story/orogeny.ts` → `orogeny.ts`
- `src/story/corridors.ts` → `corridors.ts`
- `src/story/swatches.ts` → `swatches.ts`
- `src/story/overlays.ts` → `overlays.ts`
- `src/story/tags.ts` → `tags.ts`

### Create Steps

- `StorySeedStep.ts`
- `StoryHotspotsStep.ts`
- `StoryRiftsStep.ts`
- `StoryOrogenyStep.ts`
- `StoryCorridorsStep.ts` (Handles both Pre/Post phases)
- `StorySwatchesStep.ts`

### Entry Point

- **Create Entry:** `index.ts` (Exports `registerNarrativeLayer`)

## 6. Placement Domain (`src/layers/placement/`)

**Responsible for start positions and units.**

- **Create Directory:** `src/layers/placement/`
- **Move:** `src/layers/placement.ts` → `placement.ts`
- **Create Step:** `PlacementStep.ts` (Wraps `runPlacement`)
- **Create Entry:** `index.ts` (Exports `registerPlacementLayer`)

## 7. The Standard Library (`src/layers/index.ts`)

**The Aggregator.**

- **Create:** `src/layers/index.ts`
- **Content:** Imports all 6 Domain Modules and exports `registerStandardLibrary(registry, config)`

## 8. The Cleanup (`MapOrchestrator.ts`)

**The Final Switch.**

- **Refactor:** Remove all 1000+ lines of inline step definitions
- **Implement:** Call `registerStandardLibrary(registry, config)` and then execute the recipe
