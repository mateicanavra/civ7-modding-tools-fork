/**
 * Swooper Desert Mountains — Hyper-arid, plate-driven world (TypeScript)
 *
 * REFACTORED CONFIGURATION:
 * This version uses a completely standard, balanced configuration to eliminate
 * extreme mountain generation and start failures.
 *
 * It uses the RunRequest → ExecutionPlan pipeline from @swooper/mapgen-core.
 */

/// <reference types="@civ7/types" />

import "@swooper/mapgen-core/polyfills/text-encoder";
import standardRecipe from "../recipes/standard/recipe.js";
import type { StandardRecipeConfig } from "../recipes/standard/recipe.js";
import type { MapRuntimeOptions } from "./_runtime/types.js";
import { wireStandardMapEntry } from "./_runtime/standard-entry.js";

const directionality = {
  cohesion: 0.2,
  primaryAxes: {
    plateAxisDeg: 127,
    windBiasDeg: 0,
    currentBiasDeg: 67,
  },
  interplay: {
    windsFollowPlates: 0.4,
    currentsFollowWinds: 0.6,
  },
  hemispheres: {
    southernFlip: true,
  },
  variability: {
    angleJitterDeg: 15,
    magnitudeVariance: 0.5,
  },
};

const landmassConfig = {
  baseWaterPercent: 53, // More ocean for distinct continents
  waterScalar: 1,
};

const marginsConfig = {
  activeFraction: 0.35,
  passiveFraction: 0.2,
  minSegmentLength: 13,
};

const coastlinesConfig = {
  plateBias: {
    threshold: 0.15,
    power: 1.3,
    convergent: 3.0,
    transform: 0.2,
    divergent: 0.5,
    interior: 0.35,
    bayWeight: 0.75,
    bayNoiseBonus: 0.1,
    fjordWeight: 0.8,
  },
};

const mountainsConfig = {
  // Balanced physics settings for plate-driven terrain
  tectonicIntensity: 0.65, // Reduced intensity to preserve playable basins
  mountainThreshold: 0.7, // Raise threshold to avoid over-mountainizing small maps
  hillThreshold: 0.35, // Slightly raise hills threshold to preserve flats for starts
  upliftWeight: 0.37, // Standard uplift contribution
  fractalWeight: 0.37, // Keep fractal contribution subtle (avoid blanket ruggedness)
  riftDepth: 0.75,
  boundaryWeight: 0.8, // Standard boundary weight
  boundaryGate: 0,
  boundaryExponent: 1.77, // Standard falloff
  interiorPenaltyWeight: 0.0, // Disabled as per mountains.ts defaults
  convergenceBonus: 0.4,
  transformPenalty: 0.6,
  riftPenalty: 1.0,
  hillBoundaryWeight: 0.35,
  hillRiftBonus: 0.67,
  hillConvergentFoothill: 0.35,
  hillInteriorFalloff: 0.1,
  hillUpliftWeight: 0.2,
};

const volcanoesConfig = {
  baseDensity: 0.008,
  minSpacing: 4,
  boundaryThreshold: 0.3,
  boundaryWeight: 1.2,
  convergentMultiplier: 1.47,
  transformMultiplier: 0.8,
  divergentMultiplier: 0.3,
  hotspotWeight: 0.4,
  shieldPenalty: 0.2,
  randomJitter: 0.1,
  minVolcanoes: 5,
  maxVolcanoes: 25,
};

const foundationConfig = {
  plates: {
    count: 13,
    convergenceMix: 0.65,
    relaxationSteps: 4, // Smoother cells
    plateRotationMultiple: 1.77,
  },
  dynamics: {
    wind: {
      jetStreaks: 3,
      jetStrength: 1.0,
      variance: 0.5,
    },
    mantle: {
      bumps: 3,
      amplitude: 1.0,
      scale: 1,
    },
    directionality,
  },
};

const oceanSeparationConfig = {
  enabled: false, // Ensure oceans separate continents
  baseSeparationTiles: 3,
  boundaryClosenessMultiplier: 0.9,
  maxPerRowDelta: 10,
  minChannelWidth: 3,
  respectSeaLanes: true,
  edgeWest: {
    enabled: false,
    baseTiles: 3,
    boundaryClosenessMultiplier: 0.5,
    maxPerRowDelta: 1,
  },
  edgeEast: {
    enabled: false,
    baseTiles: 3,
    boundaryClosenessMultiplier: 0.5,
    maxPerRowDelta: 1,
  },
};

const climateConfig = {
  baseline: {
    blend: {
      baseWeight: 0.15,
      bandWeight: 0.85,
    },
    seed: {
      baseRainfall: 22,
      coastalExponent: 1.4,
    },
    bands: {
      // Desert-leaning bands with dry subtropics.
      deg0to10: 70,
      deg10to20: 45,
      deg20to35: 15,
      deg35to55: 50,
      deg55to70: 35,
      deg70plus: 20,
      edges: {
        deg0to10: 10,
        deg10to20: 20,
        deg20to35: 35,
        deg35to55: 55,
        deg55to70: 70,
      },
      transitionWidth: 6,
    },
    sizeScaling: {
      baseArea: 10000,
      minScale: 0.6,
      maxScale: 2.0,
      equatorBoostScale: 10,
      equatorBoostTaper: 0.5,
    },
    orographic: {
      hi1Threshold: 200,
      hi1Bonus: 10,
      hi2Threshold: 400,
      hi2Bonus: 20,
    },
    coastal: {
      coastalLandBonus: 30,
      spread: 3,
    },
    noise: {
      baseSpanSmall: 5,
      spanLargeScaleFactor: 1.25,
      scale: 0.15,
    },
  },
  swatches: { enabled: false },
  refine: {
    waterGradient: {
      radius: 4,
      perRingBonus: 2,
      lowlandBonus: 4,
    },
    orographic: {
      steps: 4,
      reductionBase: 22,
      reductionPerStep: 12,
    },
    riverCorridor: {
      lowlandAdjacencyBonus: 15,
      highlandAdjacencyBonus: 5,
    },
    lowBasin: {
      radius: 3,
      delta: 10,
    },
  },
  story: {
    rainfall: {
      riftBoost: 10,
      riftRadius: 2,
      paradiseDelta: 10,
      volcanicDelta: 10,
    },
  },
};

const storyHotspotConfig = {
  paradiseBias: 1,
  volcanicBias: 1,
  volcanicPeakChance: 0.3,
};

const storyFeaturesConfig = {
  paradiseReefChance: 25,
  paradiseReefRadius: 2,
  volcanicForestChance: 20,
  volcanicForestBonus: 4,
  volcanicForestMinRainfall: 105,
  volcanicTaigaChance: 15,
  volcanicTaigaBonus: 3,
  volcanicRadius: 1,
  volcanicTaigaMinLatitude: 58,
  volcanicTaigaMaxElevation: 380,
  volcanicTaigaMinRainfall: 55,
};

const biomesConfig = {
  temperature: {
    equator: 32,
    pole: -8,
    lapseRate: 20,
    seaLevel: 0,
    bias: 0,
    polarCutoff: -5,
    tundraCutoff: 2,
    midLatitude: 12,
    tropicalThreshold: 24,
  },
  moisture: {
    thresholds: [80, 110, 150, 195] as [number, number, number, number],
    bias: 0,
    humidityWeight: 0.35,
  },
  aridity: {
    temperatureMin: 2,
    temperatureMax: 40,
    petBase: 28,
    petTemperatureWeight: 110,
    humidityDampening: 0.35,
    rainfallWeight: 1,
    bias: 15,
    normalization: 85,
    moistureShiftThresholds: [0.4, 0.65] as [number, number],
    vegetationPenalty: 0.22,
  },
  freeze: {
    minTemperature: -6,
    maxTemperature: 5,
  },
  vegetation: {
    base: 0.15,
    moistureWeight: 0.5,
    humidityWeight: 0.2,
    moistureNormalizationPadding: 45,
    biomeModifiers: {
      snow: { multiplier: 0.05, bonus: 0 },
      tundra: { multiplier: 0.3, bonus: 0 },
      boreal: { multiplier: 0.7, bonus: 0 },
      temperateDry: { multiplier: 0.6, bonus: 0 },
      temperateHumid: { multiplier: 0.9, bonus: 0 },
      tropicalSeasonal: { multiplier: 0.9, bonus: 0 },
      tropicalRainforest: { multiplier: 1, bonus: 0.2 },
      desert: { multiplier: 0.05, bonus: 0 },
    },
  },
  noise: {
    amplitude: 0.03,
    seed: 1337,
  },
  overlays: {
    corridorMoistureBonus: 8,
    riftShoulderMoistureBonus: 5,
  },
};

const biomeBindingsConfig = {
  snow: "BIOME_TUNDRA",
  tundra: "BIOME_TUNDRA",
  boreal: "BIOME_TUNDRA",
  temperateDry: "BIOME_PLAINS",
  temperateHumid: "BIOME_GRASSLAND",
  tropicalSeasonal: "BIOME_GRASSLAND",
  tropicalRainforest: "BIOME_TROPICAL",
  desert: "BIOME_DESERT",
  marine: "BIOME_MARINE",
};

const featuresDensityConfig = {
  shelfReefMultiplier: 0.6,
  shelfReefRadius: 1,
  rainforestExtraChance: 10,
  forestExtraChance: 10,
  taigaExtraChance: 5,
  rainforestVegetationScale: 20,
  forestVegetationScale: 15,
  taigaVegetationScale: 10,
  rainforestMinRainfall: 145,
  forestMinRainfall: 115,
  taigaMaxElevation: 280,
  minVegetationForBonus: 0.05,
};

const featuresPlacementConfig = {
  groups: {
    vegetated: { multiplier: 0.7 },
    wet: { multiplier: 0.35 },
    aquatic: { multiplier: 0.8 },
    ice: { multiplier: 0.9 },
  },
  chances: {
    FEATURE_FOREST: 35,
    FEATURE_RAINFOREST: 15,
    FEATURE_TAIGA: 25,
    FEATURE_SAVANNA_WOODLAND: 25,
    FEATURE_SAGEBRUSH_STEPPE: 45,
    FEATURE_MARSH: 15,
    FEATURE_TUNDRA_BOG: 15,
    FEATURE_MANGROVE: 10,
    FEATURE_OASIS: 70,
    FEATURE_WATERING_HOLE: 45,
    FEATURE_REEF: 28,
    FEATURE_COLD_REEF: 25,
    FEATURE_ATOLL: 6,
    FEATURE_LOTUS: 8,
    FEATURE_ICE: 80,
  },
  vegetated: {
    minVegetationByBiome: {
      snow: 0.1,
      tundra: 0.05,
      boreal: 0.06,
      temperateDry: 0.04,
      temperateHumid: 0.05,
      tropicalSeasonal: 0.05,
      tropicalRainforest: 0.05,
      desert: 0.01,
    },
    vegetationChanceScalar: 0.85,
    desertSagebrushMinVegetation: 0.12,
    desertSagebrushMaxAridity: 0.95,
    tundraTaigaMinVegetation: 0.25,
    tundraTaigaMinTemperature: -1,
    tundraTaigaMaxFreeze: 0.85,
    temperateDryForestMoisture: 135,
    temperateDryForestMaxAridity: 0.5,
    temperateDryForestVegetation: 0.5,
    tropicalSeasonalRainforestMoisture: 165,
    tropicalSeasonalRainforestMaxAridity: 0.5,
  },
  wet: {
    nearRiverRadius: 1,
    coldTemperatureMax: 1,
    coldBiomeSymbols: ["snow", "tundra", "boreal"],
    mangroveWarmTemperatureMin: 20,
    mangroveWarmBiomeSymbols: ["tropicalRainforest", "tropicalSeasonal"],
    coastalAdjacencyRadius: 1,
    isolatedRiverRadius: 1,
    isolatedSpacingRadius: 2,
    oasisBiomeSymbols: ["desert", "temperateDry"],
  },
  aquatic: {
    reefLatitudeSplit: 55,
    atoll: {
      enableClustering: true,
      clusterRadius: 1,
      equatorialBandMaxAbsLatitude: 23,
      shallowWaterAdjacencyGateChance: 40,
      shallowWaterAdjacencyRadius: 1,
      growthChanceEquatorial: 10,
      growthChanceNonEquatorial: 3,
    },
  },
  ice: {
    minAbsLatitude: 80,
    forbidAdjacentToLand: true,
    landAdjacencyRadius: 1,
    forbidAdjacentToNaturalWonders: true,
    naturalWonderAdjacencyRadius: 1,
  },
};

const plotEffectsConfig = {
  snow: {
    enabled: true,
    selectors: {
      light: {
        typeName: "PLOTEFFECT_SNOW_LIGHT_PERMANENT",
      },
      medium: {
        typeName: "PLOTEFFECT_SNOW_MEDIUM_PERMANENT",
      },
      heavy: {
        typeName: "PLOTEFFECT_SNOW_HEAVY_PERMANENT",
      },
    },
    coverageChance: 35,
    freezeWeight: 1,
    elevationWeight: 1.2,
    moistureWeight: 0.4,
    scoreNormalization: 2.6,
    scoreBias: 0,
    lightThreshold: 0.5,
    mediumThreshold: 0.7,
    heavyThreshold: 0.85,
    elevationStrategy: "percentile" as const,
    elevationMin: 400,
    elevationMax: 3200,
    elevationPercentileMin: 0.85,
    elevationPercentileMax: 0.99,
    moistureMin: 20,
    moistureMax: 120,
    maxTemperature: 2,
    maxAridity: 0.8,
  },
  sand: {
    enabled: true,
    selector: {
      typeName: "PLOTEFFECT_SAND",
    },
    chance: 28,
    minAridity: 0.65,
    minTemperature: 22,
    maxFreeze: 0.25,
    maxVegetation: 0.12,
    maxMoisture: 70,
    allowedBiomes: ["desert", "temperateDry"] as ["desert", "temperateDry"],
  },
  burned: {
    enabled: true,
    selector: {
      typeName: "PLOTEFFECT_BURNED",
    },
    chance: 10,
    minAridity: 0.6,
    minTemperature: 24,
    maxFreeze: 0.2,
    maxVegetation: 0.2,
    maxMoisture: 90,
    allowedBiomes: ["desert", "temperateDry", "temperateHumid"] as [
      "desert",
      "temperateDry",
      "temperateHumid",
    ],
  },
};

const corridorsConfig = {
  sea: {},
  land: {},
  river: {},
  islandHop: {},
};

const islandsConfig = {};
const placementConfig = {};
const storyRiftConfig = {};
const storyOrogenyConfig = {};
const climatePaleoConfig = {};

const config = {
  foundation: {
    foundation: {
      foundation: foundationConfig,
    },
  },
  "morphology-pre": {
    landmassPlates: {
      landmass: landmassConfig,
      oceanSeparation: oceanSeparationConfig,
    },
    coastlines: {},
  },
  "narrative-pre": {
    storySeed: { margins: marginsConfig },
    storyHotspots: { story: { hotspot: storyHotspotConfig } },
    storyRifts: { story: { rift: storyRiftConfig } },
  },
  "morphology-mid": {
    ruggedCoasts: {
      coastlines: coastlinesConfig,
      corridors: corridorsConfig,
    },
  },
  "narrative-mid": {
    storyOrogeny: { story: { orogeny: storyOrogenyConfig } },
    storyCorridorsPre: { corridors: corridorsConfig },
  },
  "morphology-post": {
    islands: {
      islands: islandsConfig,
      story: { hotspot: storyHotspotConfig },
      corridors: { sea: corridorsConfig.sea },
    },
    mountains: { mountains: mountainsConfig },
    volcanoes: { volcanoes: volcanoesConfig },
  },
  "hydrology-pre": {
    lakes: {},
    climateBaseline: { climate: { baseline: climateConfig.baseline } },
  },
  "narrative-swatches": {
    storySwatches: { climate: climateConfig },
  },
  "hydrology-core": {
    rivers: { climate: { story: { paleo: climatePaleoConfig } } },
  },
  "narrative-post": {
    storyCorridorsPost: { corridors: corridorsConfig },
  },
  "hydrology-post": {
    climateRefine: { climate: climateConfig, story: { orogeny: storyOrogenyConfig } },
  },
  ecology: {
    biomes: { classify: biomesConfig, bindings: biomeBindingsConfig },
    features: {
      featuresPlacement: featuresPlacementConfig,
      reefEmbellishments: {
        story: { features: storyFeaturesConfig },
        featuresDensity: featuresDensityConfig,
      },
      vegetationEmbellishments: {
        story: { features: storyFeaturesConfig },
        featuresDensity: featuresDensityConfig,
      },
    },
    plotEffects: { plotEffects: plotEffectsConfig },
  },
  placement: {
    derivePlacementInputs: { placement: placementConfig },
    placement: {},
  },
} satisfies StandardRecipeConfig;

const runtimeOptions: MapRuntimeOptions = { logPrefix: "[SWOOPER_MOD]" };

wireStandardMapEntry({
  engine,
  recipe: standardRecipe,
  config,
  directionality,
  options: runtimeOptions,
});
