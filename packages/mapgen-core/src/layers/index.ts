/**
 * Layers module - Terrain generation stages
 *
 * This module contains all layer implementations for map generation:
 * - Landmass: Plate-driven landmass generation and utilities
 * - Coastlines: Rugged coast carving
 * - Islands: Island chain placement
 * - Mountains: Physics-based mountain placement
 * - Volcanoes: Plate-aware volcano placement
 * - Climate: Rainfall and humidity modeling
 * - Biomes: Climate-aware biome designation
 * - Features: Feature placement with climate awareness
 */

export const LAYERS_MODULE_VERSION = "0.3.0";

export { registerStandardLibrary, type StandardLibraryRuntime } from "./standard-library.js";
export { registerFoundationLayer, type FoundationLayerRuntime } from "./foundation/index.js";
export { registerMorphologyLayer, type MorphologyLayerRuntime } from "./morphology/index.js";
export { registerHydrologyLayer, type HydrologyLayerRuntime } from "./hydrology/index.js";
export { registerNarrativeLayer, type NarrativeLayerRuntime } from "./narrative/index.js";
export { registerEcologyLayer, type EcologyLayerRuntime } from "./ecology/index.js";
export { registerPlacementLayer, type PlacementLayerRuntime } from "./placement/index.js";

// ============================================================================
// Landmass Layers
// ============================================================================

export {
  applyLandmassPostAdjustments,
  applyPlateAwareOceanSeparation,
  type LandmassWindow,
  type GeometryPostConfig,
  type GeometryConfig,
  type OceanSeparationPolicy,
  type OceanSeparationEdgePolicy,
  type PlateAwareOceanSeparationParams,
  type PlateAwareOceanSeparationResult,
} from "./morphology/landmass-utils.js";

export {
  createPlateDrivenLandmasses,
  type LandmassConfig,
  type TectonicsConfig,
  type CreateLandmassesOptions,
  type LandmassGenerationResult,
} from "./morphology/landmass-plate.js";

// ============================================================================
// Coastlines Layer
// ============================================================================

export {
  addRuggedCoasts,
  type CoastlinesConfig,
  type CoastlinePlateBiasConfig,
  type CoastlineBayConfig,
  type CoastlineFjordConfig,
  type CorridorPolicy,
  type SeaCorridorPolicy,
} from "./morphology/coastlines.js";

// ============================================================================
// Islands Layer
// ============================================================================

export {
  addIslandChains,
  type IslandsConfig,
  type HotspotTunables,
  type CorridorsConfig,
} from "./morphology/islands.js";

// ============================================================================
// Mountains Layer
// ============================================================================

export {
  layerAddMountainsPhysics,
  addMountainsCompat,
  type MountainsConfig,
} from "./morphology/mountains.js";

// ============================================================================
// Volcanoes Layer
// ============================================================================

export { layerAddVolcanoesPlateAware, type VolcanoesConfig } from "./morphology/volcanoes.js";

// ============================================================================
// Climate Layer
// ============================================================================

export {
  applyClimateBaseline,
  applyClimateSwatches,
  refineClimateEarthlike,
  type ClimateConfig,
  type ClimateRuntime,
  type ClimateAdapter,
  type OrogenyCache,
  type ClimateSwatchResult,
} from "./hydrology/climate.js";

// ============================================================================
// Biomes Layer
// ============================================================================

export { designateEnhancedBiomes, type BiomeConfig } from "./ecology/biomes.js";

// ============================================================================
// Features Layer
// ============================================================================

export {
  addDiverseFeatures,
  type FeaturesConfig,
  type FeaturesDensityConfig,
} from "./ecology/features.js";

// ============================================================================
// Placement Layer
// ============================================================================

export {
  runPlacement,
  type PlacementConfig,
  type FloodplainsConfig,
  type ContinentBounds,
  type StartsConfig,
  type PlacementOptions,
} from "./placement/placement.js";

// ============================================================================
// Layer Stage Types
// ============================================================================

/**
 * Layer stage manifest type
 */
export interface LayerStage {
  name: string;
  requires?: string[];
  provides?: string[];
  execute: () => void;
}
