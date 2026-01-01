import { Type, type Static } from "typebox";

export { INTERNAL_METADATA_KEY } from "@mapgen/config/schema/common.js";

import { UnknownRecord } from "@mapgen/config/schema/common.js";
export { UnknownRecord } from "@mapgen/config/schema/common.js";

export * from "@mapgen/config/schema/landmass.js";
export * from "@mapgen/config/schema/foundation.js";
export * from "@mapgen/config/schema/morphology.js";
export * from "@mapgen/config/schema/narrative.js";
export * from "@mapgen/config/schema/hydrology.js";
export * from "@mapgen/config/schema/ecology.js";
export * from "@mapgen/config/schema/placement.js";

import {
  LandmassConfigSchema,
  ContinentBoundsSchema,
  LandmassTectonicsConfigSchema,
  LandmassGeometryPostSchema,
  LandmassGeometrySchema,
} from "@mapgen/config/schema/landmass.js";
import {
  FoundationSeedConfigSchema,
  FoundationPlatesConfigSchema,
  FoundationDirectionalityConfigSchema,
  FoundationDynamicsConfigSchema,
  FoundationSurfaceConfigSchema,
  FoundationPolicyConfigSchema,
  FoundationDiagnosticsConfigSchema,
  FoundationOceanSeparationConfigSchema,
} from "@mapgen/config/schema/foundation.js";
import {
  OceanSeparationEdgePolicySchema,
  OceanSeparationConfigSchema,
  CoastlinePlateBiasConfigSchema,
  CoastlineBayConfigSchema,
  CoastlineFjordConfigSchema,
  CoastlinesConfigSchema,
  IslandsConfigSchema,
  MountainsConfigSchema,
  VolcanoesConfigSchema,
} from "@mapgen/config/schema/morphology.js";
import {
  HotspotTunablesSchema,
  RiftTunablesSchema,
  OrogenyTunablesSchema,
  ContinentalMarginsConfigSchema,
  FeaturesConfigSchema,
  StoryConfigSchema,
  SeaCorridorPolicySchema,
  LandCorridorConfigSchema,
  RiverCorridorConfigSchema,
  IslandHopCorridorConfigSchema,
  CorridorsConfigSchema,
} from "@mapgen/config/schema/narrative.js";
import {
  ClimateBaselineBandEdgesSchema,
  ClimateBaselineBandsSchema,
  ClimateBaselineBlendSchema,
  ClimateBaselineSeedSchema,
  ClimateBaselineOrographicSchema,
  ClimateBaselineCoastalSchema,
  ClimateBaselineNoiseSchema,
  ClimateBaselineSizeScalingSchema,
  ClimateBaselineSchema,
  ClimateRefineWaterGradientSchema,
  ClimateRefineOrographicSchema,
  ClimateRefineRiverCorridorSchema,
  ClimateRefineLowBasinSchema,
  ClimateRefineSchema,
  ClimateStoryPaleoSizeScalingSchema,
  ClimateStoryPaleoElevationCarvingSchema,
  ClimateStoryPaleoSchema,
  ClimateConfigSchema,
} from "@mapgen/config/schema/hydrology.js";
import {
  BiomeBindingsSchema,
  BiomeConfigSchema,
  FeaturesDensityConfigSchema,
  FeaturesPlacementConfigSchema,
  PlotEffectsConfigSchema,
} from "@mapgen/config/schema/ecology.js";
import {
  FloodplainsConfigSchema,
  StartsConfigSchema,
  PlacementConfigSchema,
} from "@mapgen/config/schema/placement.js";

/**
 * Consolidated foundation configuration replacing the legacy worldModel split.
 */
export const FoundationConfigSchema = Type.Object(
  {
    /** Random seed configuration for reproducible generation. */
    seed: Type.Optional(FoundationSeedConfigSchema),
    /** Tectonic plate count and behavior settings. */
    plates: Type.Optional(FoundationPlatesConfigSchema),
    /** Wind, mantle convection, and directional coherence settings. */
    dynamics: FoundationDynamicsConfigSchema,
    /** @internal Surface mode configuration (engine plumbing). */
    surface: Type.Optional(FoundationSurfaceConfigSchema),
    /** @internal Policy flags for foundation stage (engine plumbing). */
    policy: Type.Optional(FoundationPolicyConfigSchema),
    /** Diagnostics toggles for stable-slice debugging (M2-supported). */
    diagnostics: Type.Optional(FoundationDiagnosticsConfigSchema),
  },
  { additionalProperties: false, default: {} }
);

/**
 * Canonical MapGen configuration schema exported by mapgen-core.
 */
export const MapGenConfigSchema = Type.Object(
  {
    /** Landmass geometry: water percent, tectonic bias, and post-processing. */
    landmass: Type.Optional(LandmassConfigSchema),
    /** Foundation stage config: plates, dynamics, and internal policy/diagnostics. */
    foundation: FoundationConfigSchema,
    /** Climate baseline and refinement settings for humidity. */
    climate: Type.Optional(ClimateConfigSchema),
    /** Mountain generation thresholds and tectonic weights. */
    mountains: Type.Optional(MountainsConfigSchema),
    /** Volcano placement density and boundary multipliers. */
    volcanoes: Type.Optional(VolcanoesConfigSchema),
    /** Coastline shaping, bays, and fjords. */
    coastlines: Type.Optional(CoastlinesConfigSchema),
    /** Island and archipelago generation. */
    islands: Type.Optional(IslandsConfigSchema),
    /** Biome classification thresholds and tunables. */
    biomes: Type.Optional(BiomeConfigSchema),
    /** Optional bindings from biome symbols to engine biome globals. */
    biomeBindings: Type.Optional(BiomeBindingsSchema),
    /** Vegetation and reef density multipliers. */
    featuresDensity: Type.Optional(FeaturesDensityConfigSchema),
    /** Baseline feature placement ownership and tuning. */
    featuresPlacement: Type.Optional(FeaturesPlacementConfigSchema),
    /** Plot effects driven by ecology/climate (snow, sand, burned). */
    plotEffects: Type.Optional(PlotEffectsConfigSchema),
    /** Continental margin tagging parameters (active/passive coastline fractions). */
    margins: Type.Optional(ContinentalMarginsConfigSchema),
    /** Story seed overlays: hotspots, rifts, orogeny. */
    story: Type.Optional(StoryConfigSchema),
    /** Sea corridor policy for navigable channels. */
    corridors: Type.Optional(CorridorsConfigSchema),
    /** Ocean separation ensuring water channels between continents. */
    oceanSeparation: Type.Optional(OceanSeparationConfigSchema),
    /** Late-stage placement: wonders, floodplains, starts. */
    placement: Type.Optional(PlacementConfigSchema),
    /**
     * Escape hatch for experimental or plugin-owned knobs that are not yet
     * modeled in the public schema.
     *
     * Core mapgen steps should not read this directly; plugin steps may.
     */
    extensions: Type.Optional(UnknownRecord),
  },
  { additionalProperties: false, default: {} }
);

export type LandmassTectonicsConfig = Static<typeof LandmassTectonicsConfigSchema>;
export type LandmassGeometryPost = Static<typeof LandmassGeometryPostSchema>;
export type LandmassGeometry = Static<typeof LandmassGeometrySchema>;
export type LandmassConfig = Static<typeof LandmassConfigSchema>;
export type ContinentBoundsConfig = Static<typeof ContinentBoundsSchema>;
export type FoundationSeedConfig = Static<typeof FoundationSeedConfigSchema>;
export type FoundationPlatesConfig = Static<typeof FoundationPlatesConfigSchema>;
export type FoundationDirectionalityConfig = Static<typeof FoundationDirectionalityConfigSchema>;
export type FoundationDynamicsConfig = Static<typeof FoundationDynamicsConfigSchema>;
export type FoundationSurfaceConfig = Static<typeof FoundationSurfaceConfigSchema>;
export type FoundationPolicyConfig = Static<typeof FoundationPolicyConfigSchema>;
export type FoundationDiagnosticsConfig = Static<typeof FoundationDiagnosticsConfigSchema>;
export type FoundationOceanSeparationConfig = Static<typeof FoundationOceanSeparationConfigSchema>;
export type FoundationConfig = Static<typeof FoundationConfigSchema>;
export type OceanSeparationEdgePolicy = Static<typeof OceanSeparationEdgePolicySchema>;
export type OceanSeparationConfig = Static<typeof OceanSeparationConfigSchema>;
export type CoastlinePlateBiasConfig = Static<typeof CoastlinePlateBiasConfigSchema>;
export type CoastlineBayConfig = Static<typeof CoastlineBayConfigSchema>;
export type CoastlineFjordConfig = Static<typeof CoastlineFjordConfigSchema>;
export type CoastlinesConfig = Static<typeof CoastlinesConfigSchema>;
export type IslandsConfig = Static<typeof IslandsConfigSchema>;
export type MountainsConfig = Static<typeof MountainsConfigSchema>;
export type VolcanoesConfig = Static<typeof VolcanoesConfigSchema>;
export type HotspotTunables = Static<typeof HotspotTunablesSchema>;
export type RiftTunables = Static<typeof RiftTunablesSchema>;
export type OrogenyTunables = Static<typeof OrogenyTunablesSchema>;
export type ContinentalMarginsConfig = Static<typeof ContinentalMarginsConfigSchema>;
export type FeaturesConfig = Static<typeof FeaturesConfigSchema>;
export type StoryConfig = Static<typeof StoryConfigSchema>;
export type SeaCorridorPolicy = Static<typeof SeaCorridorPolicySchema>;
export type LandCorridorConfig = Static<typeof LandCorridorConfigSchema>;
export type RiverCorridorConfig = Static<typeof RiverCorridorConfigSchema>;
export type IslandHopCorridorConfig = Static<typeof IslandHopCorridorConfigSchema>;
export type CorridorsConfig = Static<typeof CorridorsConfigSchema>;
export type ClimateBaselineBands = Static<typeof ClimateBaselineBandsSchema>;
export type ClimateBaselineBandEdges = Static<typeof ClimateBaselineBandEdgesSchema>;
export type ClimateBaselineBlend = Static<typeof ClimateBaselineBlendSchema>;
export type ClimateBaselineSeed = Static<typeof ClimateBaselineSeedSchema>;
export type ClimateBaselineOrographic = Static<typeof ClimateBaselineOrographicSchema>;
export type ClimateBaselineCoastal = Static<typeof ClimateBaselineCoastalSchema>;
export type ClimateBaselineNoise = Static<typeof ClimateBaselineNoiseSchema>;
export type ClimateBaselineSizeScaling = Static<typeof ClimateBaselineSizeScalingSchema>;
export type ClimateBaseline = Static<typeof ClimateBaselineSchema>;
export type ClimateRefineWaterGradient = Static<typeof ClimateRefineWaterGradientSchema>;
export type ClimateRefineOrographic = Static<typeof ClimateRefineOrographicSchema>;
export type ClimateRefineRiverCorridor = Static<typeof ClimateRefineRiverCorridorSchema>;
export type ClimateRefineLowBasin = Static<typeof ClimateRefineLowBasinSchema>;
export type ClimateRefine = Static<typeof ClimateRefineSchema>;
export type ClimateStoryPaleoSizeScaling = Static<typeof ClimateStoryPaleoSizeScalingSchema>;
export type ClimateStoryPaleoElevationCarving = Static<typeof ClimateStoryPaleoElevationCarvingSchema>;
export type ClimateStoryPaleo = Static<typeof ClimateStoryPaleoSchema>;
export type ClimateConfig = Static<typeof ClimateConfigSchema>;
export type BiomeConfig = Static<typeof BiomeConfigSchema>;
export type BiomeBindings = Static<typeof BiomeBindingsSchema>;
export type FeaturesDensityConfig = Static<typeof FeaturesDensityConfigSchema>;
export type FeaturesPlacementConfig = Static<typeof FeaturesPlacementConfigSchema>;
export type PlotEffectsConfig = Static<typeof PlotEffectsConfigSchema>;
export type FloodplainsConfig = Static<typeof FloodplainsConfigSchema>;
export type StartsConfig = Static<typeof StartsConfigSchema>;
export type PlacementConfig = Static<typeof PlacementConfigSchema>;
export type MapGenConfig = Static<typeof MapGenConfigSchema>;
