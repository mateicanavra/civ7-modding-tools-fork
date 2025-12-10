/**
 * Layers module - Terrain generation stages
 *
 * This module contains all layer implementations for map generation:
 * - Landmass: Plate-driven landmass generation and utilities
 * - Coastlines: Rugged coast carving
 * - Islands: Island chain placement
 * - Mountains: Physics-based mountain placement
 * - Volcanoes: Plate-aware volcano placement
 */

export const LAYERS_MODULE_VERSION = "0.2.0";

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

export {
  layerAddMountainsPhysics,
  addMountainsCompat,
  type MountainsConfig,
} from "./mountains.js";

// ============================================================================
// Volcanoes Layer
// ============================================================================

export {
  layerAddVolcanoesPlateAware,
  type VolcanoesConfig,
} from "./volcanoes.js";

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
