# Comprehensive Refactoring Plan

This plan aligns our codebase with the target architecture phases (**Foundation, Morphology, Hydrology, Ecology, Narrative**) and eliminates the "God Class" Orchestrator.

We will execute this by creating 6 Domain Modules.

## 1. Foundation Domain (`packages/mapgen-core/src/layers/foundation/`)

**Responsible for the physical board (Mesh, Plates, Physics).**

- [x] **Create Directory:** `packages/mapgen-core/src/layers/foundation/`
- **Create Step:** `FoundationStep.ts` (Wraps `initializeFoundation` logic from Orchestrator)
- [x] **Create Entry:** `index.ts` (Exports `registerFoundationLayer`)

## 2. Morphology Domain (`packages/mapgen-core/src/layers/morphology/`)

**Responsible for the shape of the land (Landmass, Mountains, Coastlines).**

- [x] **Create Directory:** `packages/mapgen-core/src/layers/morphology/`

### Landmass

- [x] **Move:** `packages/mapgen-core/src/layers/landmass-plate.ts` → `packages/mapgen-core/src/layers/morphology/landmass-plate.ts`
- [x] **Move:** `packages/mapgen-core/src/layers/landmass-utils.ts` → `packages/mapgen-core/src/layers/morphology/landmass-utils.ts`
- **Create Step:** `LandmassStep.ts` (Wraps `createPlateDrivenLandmasses`)

### Coastlines

- [x] **Move:** `packages/mapgen-core/src/layers/coastlines.ts` → `packages/mapgen-core/src/layers/morphology/coastlines.ts`
- **Create Step:** `CoastlinesStep.ts` (Wraps `addRuggedCoasts`)

### Islands

- [x] **Move:** `packages/mapgen-core/src/layers/islands.ts` → `packages/mapgen-core/src/layers/morphology/islands.ts`
- **Create Step:** `IslandsStep.ts` (Wraps `addIslandChains`)

### Mountains

- [x] **Move:** `packages/mapgen-core/src/layers/mountains.ts` → `packages/mapgen-core/src/layers/morphology/mountains.ts`
- **Create Step:** `MountainsStep.ts` (Wraps `layerAddMountainsPhysics`)

### Volcanoes

- [x] **Move:** `packages/mapgen-core/src/layers/volcanoes.ts` → `packages/mapgen-core/src/layers/morphology/volcanoes.ts`
- **Create Step:** `VolcanoesStep.ts` (Wraps `layerAddVolcanoesPlateAware`)

### Entry Point

- [x] **Create Entry:** `index.ts` (Exports `registerMorphologyLayer`)

## 3. Hydrology Domain (`packages/mapgen-core/src/layers/hydrology/`)

**Responsible for water and climate (Rivers, Lakes, Rainfall).**

- [x] **Create Directory:** `packages/mapgen-core/src/layers/hydrology/`

### Climate

- [x] **Move:** `packages/mapgen-core/src/layers/climate-engine.ts` → `packages/mapgen-core/src/layers/hydrology/climate.ts`
- **Create Step:** `ClimateBaselineStep.ts` (Wraps `applyClimateBaseline`)
- **Create Step:** `ClimateRefineStep.ts` (Wraps `refineClimateEarthlike`)

### Rivers

- **Create Step:** `RiversStep.ts` (Extracts inline logic from Orchestrator: `modelRivers` + stats + adjacency)

### Lakes

- **Create Step:** `LakesStep.ts` (Extracts inline logic from Orchestrator: `generateLakes`)

### Entry Point

- [x] **Create Entry:** `index.ts` (Exports `registerHydrologyLayer`)

## 4. Ecology Domain (`packages/mapgen-core/src/layers/ecology/`)

**Responsible for life (Biomes, Features).**

- [x] **Create Directory:** `packages/mapgen-core/src/layers/ecology/`

### Biomes

- [x] **Move:** `packages/mapgen-core/src/layers/biomes.ts` → `packages/mapgen-core/src/layers/ecology/biomes.ts`
- **Create Step:** `BiomesStep.ts` (Wraps `designateEnhancedBiomes`)

### Features

- [x] **Move:** `packages/mapgen-core/src/layers/features.ts` → `packages/mapgen-core/src/layers/ecology/features.ts`
- **Create Step:** `FeaturesStep.ts` (Wraps `addDiverseFeatures`)

### Entry Point

- [x] **Create Entry:** `index.ts` (Exports `registerEcologyLayer`)

## 5. Narrative Domain (`packages/mapgen-core/src/layers/narrative/`)

**Responsible for story overlays and strategic tagging.**

- [x] **Create Directory:** `packages/mapgen-core/src/layers/narrative/`

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

- [x] **Create Entry:** `index.ts` (Exports `registerNarrativeLayer`)

## 6. Placement Domain (`packages/mapgen-core/src/layers/placement/`)

**Responsible for start positions and units.**

- [x] **Create Directory:** `packages/mapgen-core/src/layers/placement/`
- [x] **Move:** `packages/mapgen-core/src/layers/placement.ts` → `packages/mapgen-core/src/layers/placement/placement.ts`
- **Create Step:** `PlacementStep.ts` (Wraps `runPlacement`)
- [x] **Create Entry:** `index.ts` (Exports `registerPlacementLayer`)

## 7. The Standard Library (`packages/mapgen-core/src/layers/index.ts`)

**The Aggregator.**

- [x] **Implement:** `packages/mapgen-core/src/layers/standard-library.ts` + export from `packages/mapgen-core/src/layers/index.ts`
- [x] **Content:** Imports domain modules and exports `registerStandardLibrary(registry, config, runtime)`

## 8. The Cleanup (`MapOrchestrator.ts`)

**The Final Switch.**

- [x] **Refactor:** `packages/mapgen-core/src/MapOrchestrator.ts` TaskGraph path calls `registerStandardLibrary(...)`
