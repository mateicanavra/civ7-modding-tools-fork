/**
 * Bootstrap Module Types
 *
 * Type definitions for configuration and bootstrap system.
 */

import type { ContinentBounds } from "@civ7/adapter";
import type {
  BiomeConfig,
  ClimateBaseline,
  ClimateConfig,
  ClimateRefine,
  CoastlineBayConfig,
  CoastlineFjordConfig,
  CoastlinePlateBiasConfig,
  CoastlinesConfig,
  CorridorsConfig,
  DiagnosticsConfig,
  FeaturesConfig,
  FeaturesDensityConfig,
  FloodplainsConfig,
  FoundationConfig,
  FoundationDiagnosticsConfig,
  FoundationDirectionalityConfig,
  FoundationDynamicsConfig,
  FoundationOceanSeparationConfig,
  FoundationPlatesConfig,
  FoundationPolicyConfig,
  FoundationSeedConfig,
  FoundationSurfaceConfig,
  HotspotTunables,
  IslandsConfig,
  LandmassConfig,
  LandmassGeometry,
  LandmassGeometryPost,
  LandmassTectonicsConfig,
  MapGenConfig,
  MountainsConfig,
  OceanSeparationConfig,
  OceanSeparationEdgePolicy,
  PlacementConfig,
  SeaCorridorPolicy,
  StageConfig,
  StageDescriptor,
  StageManifest,
  StartsConfig,
  StoryConfig,
  Toggles,
  VolcanoesConfig,
} from "../config/index.js";

export type MapConfig = MapGenConfig;

export type {
  BiomeConfig,
  ClimateBaseline,
  ClimateConfig,
  ClimateRefine,
  CoastlineBayConfig,
  CoastlineFjordConfig,
  CoastlinePlateBiasConfig,
  CoastlinesConfig,
  CorridorsConfig,
  DiagnosticsConfig,
  FeaturesConfig,
  FeaturesDensityConfig,
  FloodplainsConfig,
  FoundationConfig,
  FoundationDiagnosticsConfig,
  FoundationDirectionalityConfig,
  FoundationDynamicsConfig,
  FoundationOceanSeparationConfig,
  FoundationPlatesConfig,
  FoundationPolicyConfig,
  FoundationSeedConfig,
  FoundationSurfaceConfig,
  HotspotTunables,
  IslandsConfig,
  LandmassConfig,
  LandmassGeometry,
  LandmassGeometryPost,
  LandmassTectonicsConfig,
  MountainsConfig,
  OceanSeparationConfig,
  OceanSeparationEdgePolicy,
  PlacementConfig,
  SeaCorridorPolicy,
  StageConfig,
  StageDescriptor,
  StageManifest,
  StartsConfig,
  StoryConfig,
  Toggles,
  VolcanoesConfig,
};

export type { ContinentBounds };

export type StageName = string;

/**
 * Cached snapshot of the resolved mapgen configuration exposed to legacy layers.
 *
 * Values are frozen in {@link buildTunablesSnapshot} to avoid accidental mutation
 * by consumers. Most fields are forwarders from the TypeBox-derived config and
 * retain the same semantics as their source schemas.
 */
export interface TunablesSnapshot {
  /** Ordered manifest (and metadata) used by the stage resolver. */
  STAGE_MANIFEST: Readonly<StageManifest>;
  /** Story hotspot toggle preserved for layers that gate volcanic/paradise overlays. */
  STORY_ENABLE_HOTSPOTS: boolean;
  /** Story rift toggle used by morphology and narrative overlays to enable rift valleys. */
  STORY_ENABLE_RIFTS: boolean;
  /** Story orogeny toggle enabling long convergent belts in narrative overlays. */
  STORY_ENABLE_OROGENY: boolean;
  /** Swatch toggle controlling macro climate recolors. */
  STORY_ENABLE_SWATCHES: boolean;
  /** Paleo toggle enabling fossil channels, deltas, and other paleo hydrology artifacts. */
  STORY_ENABLE_PALEO: boolean;
  /** Corridor protection toggle used by pathfinding and story overlays. */
  STORY_ENABLE_CORRIDORS: boolean;
  /** Landmass tuning (water share, boundary biasing, tectonics) used during landmask scoring. */
  LANDMASS_CFG: Readonly<LandmassConfig>;
  /** Unified foundation configuration propagated to foundation consumers. */
  FOUNDATION_CFG: Readonly<FoundationConfig>;
  /** Plate layout parameters (count, relaxation, seeds) forwarded to the plate solver. */
  FOUNDATION_PLATES: Readonly<FoundationPlatesConfig>;
  /** Mantle/wind dynamics parameters used by foundation wind and mantle generation. */
  FOUNDATION_DYNAMICS: Readonly<FoundationDynamicsConfig>;
  /** Cross-system alignment controls connecting plates, winds, and currents. */
  FOUNDATION_DIRECTIONALITY: Readonly<FoundationDirectionalityConfig>;
  /** Climate baseline and refinement knobs consumed by the climate engine. */
  CLIMATE_CFG: Readonly<ClimateConfig>;
  [key: string]: unknown;
}
