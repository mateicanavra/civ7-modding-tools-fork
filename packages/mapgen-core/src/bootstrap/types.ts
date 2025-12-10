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

export interface TunablesSnapshot {
  STAGE_MANIFEST: Readonly<StageManifest>;
  STORY_ENABLE_HOTSPOTS: boolean;
  STORY_ENABLE_RIFTS: boolean;
  STORY_ENABLE_OROGENY: boolean;
  STORY_ENABLE_SWATCHES: boolean;
  STORY_ENABLE_PALEO: boolean;
  STORY_ENABLE_CORRIDORS: boolean;
  LANDMASS_CFG: Readonly<LandmassConfig>;
  FOUNDATION_CFG: Readonly<FoundationConfig>;
  FOUNDATION_PLATES: Readonly<FoundationPlatesConfig>;
  FOUNDATION_DYNAMICS: Readonly<FoundationDynamicsConfig>;
  FOUNDATION_DIRECTIONALITY: Readonly<FoundationDirectionalityConfig>;
  CLIMATE_CFG: Readonly<ClimateConfig>;
  [key: string]: unknown;
}
