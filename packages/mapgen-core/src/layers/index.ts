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
} from "./landmass-utils.js";

export {
  createPlateDrivenLandmasses,
  type LandmassConfig,
  type TectonicsConfig,
  type CreateLandmassesOptions,
  type LandmassGenerationResult,
} from "./landmass-plate.js";

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
} from "./coastlines.js";

// ============================================================================
// Islands Layer
// ============================================================================

export {
  addIslandChains,
  type IslandsConfig,
  type HotspotTunables,
  type CorridorsConfig,
} from "./islands.js";

// ============================================================================
// Mountains Layer
// ============================================================================

export { layerAddMountainsPhysics, addMountainsCompat, type MountainsConfig } from "./mountains.js";

// ============================================================================
// Volcanoes Layer
// ============================================================================

export { layerAddVolcanoesPlateAware, type VolcanoesConfig } from "./volcanoes.js";

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
} from "./climate-engine.js";

// ============================================================================
// Biomes Layer
// ============================================================================

export { designateEnhancedBiomes, type BiomeConfig } from "./biomes.js";

// ============================================================================
// Features Layer
// ============================================================================

export { addDiverseFeatures, type FeaturesConfig, type FeaturesDensityConfig } from "./features.js";

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
} from "./placement.js";

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
