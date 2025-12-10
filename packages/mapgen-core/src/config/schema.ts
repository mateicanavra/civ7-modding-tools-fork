import { Type, type Static } from "@sinclair/typebox";

const UnknownRecord = Type.Record(Type.String(), Type.Unknown(), { default: {} });

export const ContinentBoundsSchema = Type.Object(
  {
    west: Type.Number(),
    east: Type.Number(),
    south: Type.Number(),
    north: Type.Number(),
    continent: Type.Optional(Type.Number()),
  },
  { additionalProperties: true, default: {} }
);

export const StageConfigSchema = Type.Record(Type.String(), Type.Boolean(), {
  default: {},
});

export const StageDescriptorSchema = Type.Object(
  {
    enabled: Type.Optional(Type.Boolean()),
    requires: Type.Optional(Type.Array(Type.String(), { default: [] })),
    provides: Type.Optional(Type.Array(Type.String(), { default: [] })),
    legacyToggles: Type.Optional(Type.Array(Type.String(), { default: [] })),
    blockedBy: Type.Optional(Type.String()),
  },
  { additionalProperties: true, default: {} }
);

export const StageManifestSchema = Type.Object(
  {
    order: Type.Array(Type.String(), { default: [] }),
    stages: Type.Record(Type.String(), StageDescriptorSchema, { default: {} }),
  },
  { default: {} }
);

export const TogglesSchema = Type.Object(
  {
    STORY_ENABLE_HOTSPOTS: Type.Optional(Type.Boolean({ default: true })),
    STORY_ENABLE_RIFTS: Type.Optional(Type.Boolean({ default: true })),
    STORY_ENABLE_OROGENY: Type.Optional(Type.Boolean({ default: true })),
    STORY_ENABLE_SWATCHES: Type.Optional(Type.Boolean({ default: true })),
    STORY_ENABLE_PALEO: Type.Optional(Type.Boolean({ default: true })),
    STORY_ENABLE_CORRIDORS: Type.Optional(Type.Boolean({ default: true })),
  },
  { additionalProperties: true, default: {} }
);

export const LandmassTectonicsConfigSchema = Type.Object(
  {
    interiorNoiseWeight: Type.Optional(Type.Number()),
    boundaryArcWeight: Type.Optional(Type.Number()),
    boundaryArcNoiseWeight: Type.Optional(Type.Number()),
    fractalGrain: Type.Optional(Type.Number()),
  },
  { additionalProperties: true, default: {} }
);

export const LandmassGeometryPostSchema = Type.Object(
  {
    expandTiles: Type.Optional(Type.Number()),
    expandWestTiles: Type.Optional(Type.Number()),
    expandEastTiles: Type.Optional(Type.Number()),
    clampWestMin: Type.Optional(Type.Number()),
    clampEastMax: Type.Optional(Type.Number()),
    overrideSouth: Type.Optional(Type.Number()),
    overrideNorth: Type.Optional(Type.Number()),
    minWidthTiles: Type.Optional(Type.Number()),
  },
  { additionalProperties: true, default: {} }
);

export const LandmassGeometrySchema = Type.Object(
  {
    post: Type.Optional(LandmassGeometryPostSchema),
  },
  { additionalProperties: true, default: {} }
);

export const LandmassConfigSchema = Type.Object(
  {
    crustMode: Type.Optional(Type.Union([Type.Literal("legacy"), Type.Literal("area")])),
    baseWaterPercent: Type.Optional(Type.Number()),
    waterScalar: Type.Optional(Type.Number()),
    boundaryBias: Type.Optional(Type.Number()),
    boundaryShareTarget: Type.Optional(Type.Number()),
    continentalFraction: Type.Optional(Type.Number()),
    crustContinentalFraction: Type.Optional(Type.Number()),
    crustClusteringBias: Type.Optional(Type.Number()),
    microcontinentChance: Type.Optional(Type.Number()),
    crustEdgeBlend: Type.Optional(Type.Number()),
    crustNoiseAmplitude: Type.Optional(Type.Number()),
    continentalHeight: Type.Optional(Type.Number()),
    oceanicHeight: Type.Optional(Type.Number()),
    tectonics: Type.Optional(LandmassTectonicsConfigSchema),
    geometry: Type.Optional(LandmassGeometrySchema),
  },
  { additionalProperties: true, default: {} }
);

export const FoundationSeedConfigSchema = Type.Object(
  {
    mode: Type.Optional(Type.Union([Type.Literal("engine"), Type.Literal("fixed")])),
    fixedSeed: Type.Optional(Type.Number()),
    offset: Type.Optional(Type.Number()),
  },
  { additionalProperties: true, default: {} }
);

export const FoundationPlatesConfigSchema = Type.Object(
  {
    count: Type.Optional(Type.Number()),
    relaxationSteps: Type.Optional(Type.Number()),
    convergenceMix: Type.Optional(Type.Number()),
    plateRotationMultiple: Type.Optional(Type.Number()),
    seedMode: Type.Optional(Type.Union([Type.Literal("engine"), Type.Literal("fixed")])),
    fixedSeed: Type.Optional(Type.Number()),
    seedOffset: Type.Optional(Type.Number()),
  },
  { additionalProperties: true, default: {} }
);

export const FoundationDirectionalityConfigSchema = Type.Object(
  {
    cohesion: Type.Optional(Type.Number()),
    primaryAxes: Type.Optional(
      Type.Object(
        {
          plateAxisDeg: Type.Optional(Type.Number()),
          windBiasDeg: Type.Optional(Type.Number()),
          currentBiasDeg: Type.Optional(Type.Number()),
        },
        { additionalProperties: true, default: {} }
      )
    ),
    variability: Type.Optional(
      Type.Object(
        {
          angleJitterDeg: Type.Optional(Type.Number()),
          magnitudeVariance: Type.Optional(Type.Number()),
        },
        { additionalProperties: true, default: {} }
      )
    ),
    hemispheres: Type.Optional(
      Type.Object(
        {
          southernFlip: Type.Optional(Type.Boolean()),
        },
        { additionalProperties: true, default: {} }
      )
    ),
    interplay: Type.Optional(
      Type.Object(
        {
          windsFollowPlates: Type.Optional(Type.Number()),
          currentsFollowWinds: Type.Optional(Type.Number()),
        },
        { additionalProperties: true, default: {} }
      )
    ),
  },
  { additionalProperties: true, default: {} }
);

export const FoundationDynamicsConfigSchema = Type.Object(
  {
    mantle: Type.Optional(
      Type.Object(
        {
          bumps: Type.Optional(Type.Number()),
          amplitude: Type.Optional(Type.Number()),
          scale: Type.Optional(Type.Number()),
        },
        { additionalProperties: true, default: {} }
      )
    ),
    wind: Type.Optional(
      Type.Object(
        {
          jetStreaks: Type.Optional(Type.Number()),
          jetStrength: Type.Optional(Type.Number()),
          variance: Type.Optional(Type.Number()),
        },
        { additionalProperties: true, default: {} }
      )
    ),
    directionality: Type.Optional(FoundationDirectionalityConfigSchema),
  },
  { additionalProperties: true, default: {} }
);

export const FoundationOceanSeparationConfigSchema = Type.Object(
  {},
  { additionalProperties: true, default: {} }
);

export const FoundationSurfaceConfigSchema = Type.Object(
  {
    landmass: Type.Optional(LandmassConfigSchema),
    oceanSeparation: Type.Optional(FoundationOceanSeparationConfigSchema),
    crustMode: Type.Optional(Type.Union([Type.Literal("legacy"), Type.Literal("area")])),
  },
  { additionalProperties: true, default: {} }
);

export const FoundationPolicyConfigSchema = Type.Object(
  {
    oceanSeparation: Type.Optional(FoundationOceanSeparationConfigSchema),
  },
  { additionalProperties: true, default: {} }
);

export const FoundationDiagnosticsConfigSchema = Type.Object(
  {},
  { additionalProperties: true, default: {} }
);

export const OceanSeparationEdgePolicySchema = Type.Object(
  {
    enabled: Type.Optional(Type.Boolean()),
    baseTiles: Type.Optional(Type.Number()),
    boundaryClosenessMultiplier: Type.Optional(Type.Number()),
    maxPerRowDelta: Type.Optional(Type.Number()),
  },
  { additionalProperties: true, default: {} }
);

export const OceanSeparationConfigSchema = Type.Object(
  {
    enabled: Type.Optional(Type.Boolean()),
    bandPairs: Type.Optional(Type.Array(Type.Tuple([Type.Number(), Type.Number()]), { default: [] })),
    baseSeparationTiles: Type.Optional(Type.Number()),
    boundaryClosenessMultiplier: Type.Optional(Type.Number()),
    maxPerRowDelta: Type.Optional(Type.Number()),
    minChannelWidth: Type.Optional(Type.Number()),
    channelJitter: Type.Optional(Type.Number()),
    respectSeaLanes: Type.Optional(Type.Boolean()),
    edgeWest: Type.Optional(OceanSeparationEdgePolicySchema),
    edgeEast: Type.Optional(OceanSeparationEdgePolicySchema),
  },
  { additionalProperties: true, default: {} }
);

export const CoastlinePlateBiasConfigSchema = Type.Object(
  {
    threshold: Type.Optional(Type.Number()),
    power: Type.Optional(Type.Number()),
    convergent: Type.Optional(Type.Number()),
    transform: Type.Optional(Type.Number()),
    divergent: Type.Optional(Type.Number()),
    interior: Type.Optional(Type.Number()),
    bayWeight: Type.Optional(Type.Number()),
    bayNoiseBonus: Type.Optional(Type.Number()),
    fjordWeight: Type.Optional(Type.Number()),
  },
  { additionalProperties: true, default: {} }
);

export const CoastlineBayConfigSchema = Type.Object(
  {
    noiseGateAdd: Type.Optional(Type.Number()),
    rollDenActive: Type.Optional(Type.Number()),
    rollDenDefault: Type.Optional(Type.Number()),
  },
  { additionalProperties: true, default: {} }
);

export const CoastlineFjordConfigSchema = Type.Object(
  {
    baseDenom: Type.Optional(Type.Number()),
    activeBonus: Type.Optional(Type.Number()),
    passiveBonus: Type.Optional(Type.Number()),
  },
  { additionalProperties: true, default: {} }
);

export const CoastlinesConfigSchema = Type.Object(
  {
    bay: Type.Optional(CoastlineBayConfigSchema),
    fjord: Type.Optional(CoastlineFjordConfigSchema),
    plateBias: Type.Optional(CoastlinePlateBiasConfigSchema),
    minSeaLaneWidth: Type.Optional(Type.Number()),
  },
  { additionalProperties: true, default: {} }
);

export const IslandsConfigSchema = Type.Object(
  {
    fractalThresholdPercent: Type.Optional(Type.Number()),
    minDistFromLandRadius: Type.Optional(Type.Number()),
    baseIslandDenNearActive: Type.Optional(Type.Number()),
    baseIslandDenElse: Type.Optional(Type.Number()),
    hotspotSeedDenom: Type.Optional(Type.Number()),
    clusterMax: Type.Optional(Type.Number()),
  },
  { additionalProperties: true, default: {} }
);

export const MountainsConfigSchema = Type.Object(
  {
    tectonicIntensity: Type.Optional(Type.Number()),
    mountainThreshold: Type.Optional(Type.Number()),
    hillThreshold: Type.Optional(Type.Number()),
    upliftWeight: Type.Optional(Type.Number()),
    fractalWeight: Type.Optional(Type.Number()),
    riftDepth: Type.Optional(Type.Number()),
    boundaryWeight: Type.Optional(Type.Number()),
    boundaryExponent: Type.Optional(Type.Number()),
    interiorPenaltyWeight: Type.Optional(Type.Number()),
    convergenceBonus: Type.Optional(Type.Number()),
    transformPenalty: Type.Optional(Type.Number()),
    riftPenalty: Type.Optional(Type.Number()),
    hillBoundaryWeight: Type.Optional(Type.Number()),
    hillRiftBonus: Type.Optional(Type.Number()),
    hillConvergentFoothill: Type.Optional(Type.Number()),
    hillInteriorFalloff: Type.Optional(Type.Number()),
    hillUpliftWeight: Type.Optional(Type.Number()),
  },
  { additionalProperties: true, default: {} }
);

export const VolcanoesConfigSchema = Type.Object(
  {
    enabled: Type.Optional(Type.Boolean()),
    baseDensity: Type.Optional(Type.Number()),
    minSpacing: Type.Optional(Type.Number()),
    boundaryThreshold: Type.Optional(Type.Number()),
    boundaryWeight: Type.Optional(Type.Number()),
    convergentMultiplier: Type.Optional(Type.Number()),
    transformMultiplier: Type.Optional(Type.Number()),
    divergentMultiplier: Type.Optional(Type.Number()),
    hotspotWeight: Type.Optional(Type.Number()),
    shieldPenalty: Type.Optional(Type.Number()),
    randomJitter: Type.Optional(Type.Number()),
    minVolcanoes: Type.Optional(Type.Number()),
    maxVolcanoes: Type.Optional(Type.Number()),
  },
  { additionalProperties: true, default: {} }
);

export const HotspotTunablesSchema = Type.Object(
  {
    paradiseBias: Type.Optional(Type.Number()),
    volcanicBias: Type.Optional(Type.Number()),
    volcanicPeakChance: Type.Optional(Type.Number()),
  },
  { additionalProperties: true, default: {} }
);

export const FeaturesConfigSchema = Type.Object(
  {
    paradiseReefChance: Type.Optional(Type.Number()),
    volcanicForestChance: Type.Optional(Type.Number()),
    volcanicTaigaChance: Type.Optional(Type.Number()),
  },
  { additionalProperties: true, default: {} }
);

export const StoryConfigSchema = Type.Object(
  {
    hotspot: Type.Optional(HotspotTunablesSchema),
    features: Type.Optional(FeaturesConfigSchema),
  },
  { additionalProperties: true, default: {} }
);

export const SeaCorridorPolicySchema = Type.Object(
  {
    protection: Type.Optional(Type.Union([Type.Literal("hard"), Type.Literal("soft")])),
    softChanceMultiplier: Type.Optional(Type.Number()),
    avoidRadius: Type.Optional(Type.Number()),
  },
  { additionalProperties: true, default: {} }
);

export const CorridorsConfigSchema = Type.Object(
  {
    sea: Type.Optional(SeaCorridorPolicySchema),
  },
  { additionalProperties: true, default: {} }
);

export const ClimateBaselineSchema = Type.Object(
  {
    bands: Type.Optional(UnknownRecord),
    blend: Type.Optional(UnknownRecord),
    orographic: Type.Optional(UnknownRecord),
    coastal: Type.Optional(UnknownRecord),
    noise: Type.Optional(UnknownRecord),
  },
  { additionalProperties: true, default: {} }
);

export const ClimateRefineSchema = Type.Object(
  {
    waterGradient: Type.Optional(UnknownRecord),
    orographic: Type.Optional(UnknownRecord),
    riverCorridor: Type.Optional(UnknownRecord),
    lowBasin: Type.Optional(UnknownRecord),
    pressure: Type.Optional(UnknownRecord),
  },
  { additionalProperties: true, default: {} }
);

export const ClimateConfigSchema = Type.Object(
  {
    baseline: Type.Optional(ClimateBaselineSchema),
    refine: Type.Optional(ClimateRefineSchema),
    swatches: Type.Optional(UnknownRecord),
  },
  { additionalProperties: true, default: {} }
);

export const BiomeConfigSchema = Type.Object(
  {
    tundra: Type.Optional(
      Type.Object(
        {
          latMin: Type.Optional(Type.Number()),
          elevMin: Type.Optional(Type.Number()),
          rainMax: Type.Optional(Type.Number()),
        },
        { additionalProperties: true, default: {} }
      )
    ),
    tropicalCoast: Type.Optional(
      Type.Object(
        {
          latMax: Type.Optional(Type.Number()),
          rainMin: Type.Optional(Type.Number()),
        },
        { additionalProperties: true, default: {} }
      )
    ),
    riverValleyGrassland: Type.Optional(
      Type.Object(
        {
          latMax: Type.Optional(Type.Number()),
          rainMin: Type.Optional(Type.Number()),
        },
        { additionalProperties: true, default: {} }
      )
    ),
    riftShoulder: Type.Optional(
      Type.Object(
        {
          grasslandLatMax: Type.Optional(Type.Number()),
          grasslandRainMin: Type.Optional(Type.Number()),
          tropicalLatMax: Type.Optional(Type.Number()),
          tropicalRainMin: Type.Optional(Type.Number()),
        },
        { additionalProperties: true, default: {} }
      )
    ),
  },
  { additionalProperties: true, default: {} }
);

export const FeaturesDensityConfigSchema = Type.Object(
  {
    shelfReefMultiplier: Type.Optional(Type.Number()),
    rainforestExtraChance: Type.Optional(Type.Number()),
    forestExtraChance: Type.Optional(Type.Number()),
    taigaExtraChance: Type.Optional(Type.Number()),
  },
  { additionalProperties: true, default: {} }
);

export const FloodplainsConfigSchema = Type.Object(
  {
    minLength: Type.Optional(Type.Number()),
    maxLength: Type.Optional(Type.Number()),
  },
  { additionalProperties: true, default: {} }
);

export const StartsConfigSchema = Type.Object(
  {
    playersLandmass1: Type.Number(),
    playersLandmass2: Type.Number(),
    westContinent: ContinentBoundsSchema,
    eastContinent: ContinentBoundsSchema,
    startSectorRows: Type.Number(),
    startSectorCols: Type.Number(),
    startSectors: Type.Array(Type.Unknown(), { default: [] }),
  },
  { additionalProperties: true, default: {} }
);

export const PlacementConfigSchema = Type.Object(
  {
    wondersPlusOne: Type.Optional(Type.Boolean()),
    floodplains: Type.Optional(FloodplainsConfigSchema),
    starts: Type.Optional(StartsConfigSchema),
  },
  { additionalProperties: true, default: {} }
);

export const FoundationConfigSchema = Type.Object(
  {
    seed: Type.Optional(FoundationSeedConfigSchema),
    plates: Type.Optional(FoundationPlatesConfigSchema),
    dynamics: Type.Optional(FoundationDynamicsConfigSchema),
    surface: Type.Optional(FoundationSurfaceConfigSchema),
    policy: Type.Optional(FoundationPolicyConfigSchema),
    diagnostics: Type.Optional(FoundationDiagnosticsConfigSchema),
    oceanSeparation: Type.Optional(OceanSeparationConfigSchema),
    coastlines: Type.Optional(CoastlinesConfigSchema),
    islands: Type.Optional(IslandsConfigSchema),
    mountains: Type.Optional(MountainsConfigSchema),
    volcanoes: Type.Optional(VolcanoesConfigSchema),
    story: Type.Optional(StoryConfigSchema),
    corridors: Type.Optional(CorridorsConfigSchema),
    biomes: Type.Optional(BiomeConfigSchema),
    featuresDensity: Type.Optional(FeaturesDensityConfigSchema),
    placement: Type.Optional(PlacementConfigSchema),
  },
  { additionalProperties: true, default: {} }
);

export const DiagnosticsConfigSchema = Type.Object(
  {
    logAscii: Type.Optional(Type.Boolean()),
    logHistograms: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: true, default: {} }
);

export const MapGenConfigSchema = Type.Object(
  {
    presets: Type.Optional(Type.Array(Type.String(), { default: [] })),
    stageConfig: Type.Optional(StageConfigSchema),
    stageManifest: Type.Optional(StageManifestSchema),
    toggles: Type.Optional(TogglesSchema),
    landmass: Type.Optional(LandmassConfigSchema),
    foundation: Type.Optional(FoundationConfigSchema),
    climate: Type.Optional(ClimateConfigSchema),
    mountains: Type.Optional(MountainsConfigSchema),
    volcanoes: Type.Optional(VolcanoesConfigSchema),
    coastlines: Type.Optional(CoastlinesConfigSchema),
    islands: Type.Optional(IslandsConfigSchema),
    biomes: Type.Optional(BiomeConfigSchema),
    featuresDensity: Type.Optional(FeaturesDensityConfigSchema),
    story: Type.Optional(StoryConfigSchema),
    corridors: Type.Optional(CorridorsConfigSchema),
    oceanSeparation: Type.Optional(OceanSeparationConfigSchema),
    placement: Type.Optional(PlacementConfigSchema),
    diagnostics: Type.Optional(DiagnosticsConfigSchema),
  },
  { additionalProperties: true, default: {} }
);

export type StageConfig = Static<typeof StageConfigSchema>;
export type StageDescriptor = Static<typeof StageDescriptorSchema>;
export type StageManifest = Static<typeof StageManifestSchema>;
export type Toggles = Static<typeof TogglesSchema>;
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
export type FeaturesConfig = Static<typeof FeaturesConfigSchema>;
export type StoryConfig = Static<typeof StoryConfigSchema>;
export type SeaCorridorPolicy = Static<typeof SeaCorridorPolicySchema>;
export type CorridorsConfig = Static<typeof CorridorsConfigSchema>;
export type ClimateBaseline = Static<typeof ClimateBaselineSchema>;
export type ClimateRefine = Static<typeof ClimateRefineSchema>;
export type ClimateConfig = Static<typeof ClimateConfigSchema>;
export type BiomeConfig = Static<typeof BiomeConfigSchema>;
export type FeaturesDensityConfig = Static<typeof FeaturesDensityConfigSchema>;
export type FloodplainsConfig = Static<typeof FloodplainsConfigSchema>;
export type StartsConfig = Static<typeof StartsConfigSchema>;
export type PlacementConfig = Static<typeof PlacementConfigSchema>;
export type DiagnosticsConfig = Static<typeof DiagnosticsConfigSchema>;
export type MapGenConfig = Static<typeof MapGenConfigSchema> & Record<string, unknown>;
