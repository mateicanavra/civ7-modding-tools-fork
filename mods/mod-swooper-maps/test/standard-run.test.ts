import { describe, expect, it } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import { createExtendedMapContext } from "@swooper/mapgen-core";
import { applySchemaDefaults } from "@swooper/mapgen-core/authoring";
import { FoundationDirectionalityConfigSchema } from "@mapgen/config";

import standardRecipe from "../src/recipes/standard/recipe.js";
import type { StandardRecipeConfig } from "../src/recipes/standard/recipe.js";
import { initializeStandardRuntime } from "../src/recipes/standard/runtime.js";
import { M3_DEPENDENCY_TAGS } from "../src/recipes/standard/tags.js";

const directionality = applySchemaDefaults(FoundationDirectionalityConfigSchema, {
  cohesion: 0.15,
  primaryAxes: {
    plateAxisDeg: 12,
    windBiasDeg: 12,
    currentBiasDeg: 12,
  },
  interplay: {
    windsFollowPlates: 0.3,
    currentsFollowWinds: 0.6,
  },
  hemispheres: {
    southernFlip: true,
    monsoonBias: 0.82,
    equatorBandDeg: 18,
  },
  variability: {
    angleJitterDeg: 15,
    magnitudeVariance: 0.4,
  },
});

const landmassConfig = {
  baseWaterPercent: 68,
  waterScalar: 1,
  crustEdgeBlend: 0.35,
  crustNoiseAmplitude: 0.1,
  continentalHeight: 0.4,
  oceanicHeight: -0.75,
  boundaryBias: 0.2,
  boundaryShareTarget: 0.2,
  tectonics: {
    boundaryArcWeight: 0.37,
    boundaryArcNoiseWeight: 0.35,
    interiorNoiseWeight: 0.75,
    fractalGrain: 5,
  },
};

const marginsConfig = {
  activeFraction: 0.33,
  passiveFraction: 0.22,
  minSegmentLength: 12,
};

const coastlinesConfig = {
  plateBias: {
    threshold: 0.45,
    power: 1.25,
    convergent: 1.4,
    transform: 0.4,
    divergent: -0.4,
    interior: 0.4,
    bayWeight: 0.8,
    bayNoiseBonus: 0.5,
    fjordWeight: 0.8,
  },
};

const mountainsConfig = {
  tectonicIntensity: 0.65,
  mountainThreshold: 0.62,
  hillThreshold: 0.32,
  upliftWeight: 0.4,
  fractalWeight: 0.45,
  riftDepth: 0.25,
  boundaryWeight: 0.55,
  boundaryGate: 0,
  boundaryExponent: 1.15,
  interiorPenaltyWeight: 0.15,
  convergenceBonus: 0.6,
  transformPenalty: 0.6,
  riftPenalty: 0.76,
  hillBoundaryWeight: 0.32,
  hillRiftBonus: 0.65,
  hillConvergentFoothill: 0.32,
  hillInteriorFalloff: 0.05,
  hillUpliftWeight: 0.22,
};

const volcanoesConfig = {
  baseDensity: 5 / 190,
  minSpacing: 3,
  boundaryThreshold: 0.35,
  boundaryWeight: 1.2,
  convergentMultiplier: 2.5,
  transformMultiplier: 1.0,
  divergentMultiplier: 0.4,
  hotspotWeight: 0.18,
  shieldPenalty: 0.6,
  randomJitter: 0.08,
  minVolcanoes: 5,
  maxVolcanoes: 30,
};

const foundationConfig = {
  plates: {
    count: 23,
    convergenceMix: 0.55,
    relaxationSteps: 4,
    plateRotationMultiple: 1.77,
  },
  dynamics: {
    wind: {
      jetStreaks: 3,
      jetStrength: 1.0,
      variance: 0.6,
    },
    mantle: {
      bumps: 4,
      amplitude: 0.7,
      scale: 0.45,
    },
    directionality,
  },
};

const oceanSeparationConfig = {
  enabled: false,
  baseSeparationTiles: 0,
  boundaryClosenessMultiplier: 1.0,
  maxPerRowDelta: 3,
  minChannelWidth: 4,
  respectSeaLanes: true,
  edgeWest: {
    enabled: false,
    baseTiles: 0,
    boundaryClosenessMultiplier: 1.0,
    maxPerRowDelta: 2,
  },
  edgeEast: {
    enabled: false,
    baseTiles: 0,
    boundaryClosenessMultiplier: 1.0,
    maxPerRowDelta: 2,
  },
};

const climateConfig = {
  baseline: {
    blend: {
      baseWeight: 0.2,
      bandWeight: 0.8,
    },
    seed: {
      baseRainfall: 40,
      coastalExponent: 1.2,
    },
    bands: {
      deg0to10: 125,
      deg10to20: 105,
      deg20to35: 55,
      deg35to55: 75,
      deg55to70: 60,
      deg70plus: 42,
      edges: {
        deg0to10: 10,
        deg10to20: 20,
        deg20to35: 35,
        deg35to55: 55,
        deg55to70: 70,
      },
      transitionWidth: 8,
    },
    sizeScaling: {
      baseArea: 10000,
      minScale: 0.6,
      maxScale: 2.0,
      equatorBoostScale: 12,
      equatorBoostTaper: 0.6,
    },
    orographic: {
      hi1Threshold: 350,
      hi1Bonus: 8,
      hi2Threshold: 600,
      hi2Bonus: 7,
    },
    coastal: {
      coastalLandBonus: 26,
      spread: 5,
    },
    noise: {
      baseSpanSmall: 4,
      spanLargeScaleFactor: 1.0,
      scale: 0.13,
    },
  },
  swatches: { enabled: false },
  refine: {
    waterGradient: {
      radius: 6,
      perRingBonus: 4,
      lowlandBonus: 5,
    },
    orographic: {
      steps: 4,
      reductionBase: 9,
      reductionPerStep: 5,
    },
    riverCorridor: {
      lowlandAdjacencyBonus: 15,
      highlandAdjacencyBonus: 6,
    },
    lowBasin: {
      radius: 3,
      delta: 7,
    },
  },
  story: {
    rainfall: {
      riftBoost: 8,
      riftRadius: 2,
      paradiseDelta: 6,
      volcanicDelta: 8,
    },
  },
};

const storyHotspotConfig = {
  paradiseBias: 2,
  volcanicBias: 1,
  volcanicPeakChance: 0.33,
};

const storyFeaturesConfig = {
  paradiseReefChance: 18,
  paradiseReefRadius: 2,
  volcanicForestChance: 22,
  volcanicForestBonus: 6,
  volcanicForestMinRainfall: 95,
  volcanicTaigaChance: 25,
  volcanicTaigaBonus: 5,
  volcanicRadius: 1,
  volcanicTaigaMinLatitude: 55,
  volcanicTaigaMaxElevation: 400,
  volcanicTaigaMinRainfall: 60,
};

const biomesConfig = {
  temperature: {
    equator: 30,
    pole: -8,
    lapseRate: 6.5,
    seaLevel: 0,
    bias: 2.5,
    polarCutoff: -5,
    tundraCutoff: 2,
    midLatitude: 12,
    tropicalThreshold: 24,
  },
  moisture: {
    thresholds: [70, 95, 135, 185] as [number, number, number, number],
    bias: 0.2,
    humidityWeight: 0.35,
  },
  aridity: {
    temperatureMin: 0,
    temperatureMax: 35,
    petBase: 18,
    petTemperatureWeight: 75,
    humidityDampening: 0.55,
    rainfallWeight: 1,
    bias: 0,
    normalization: 125,
    moistureShiftThresholds: [0.45, 0.7] as [number, number],
    vegetationPenalty: 0.12,
  },
  freeze: {
    minTemperature: -12,
    maxTemperature: 2,
  },
  vegetation: {
    base: 0.35,
    moistureWeight: 0.65,
    humidityWeight: 0.35,
    moistureNormalizationPadding: 60,
    biomeModifiers: {
      snow: { multiplier: 0.6, bonus: 0 },
      tundra: { multiplier: 0.5, bonus: 0 },
      boreal: { multiplier: 0.85, bonus: 0 },
      temperateDry: { multiplier: 0.75, bonus: 0 },
      temperateHumid: { multiplier: 1, bonus: 0 },
      tropicalSeasonal: { multiplier: 1, bonus: 0 },
      tropicalRainforest: { multiplier: 1, bonus: 0.25 },
      desert: { multiplier: 0.12, bonus: 0 },
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
  shelfReefMultiplier: 0.8,
  shelfReefRadius: 1,
  rainforestExtraChance: 50,
  forestExtraChance: 40,
  taigaExtraChance: 20,
  rainforestVegetationScale: 50,
  forestVegetationScale: 30,
  taigaVegetationScale: 20,
  rainforestMinRainfall: 130,
  forestMinRainfall: 100,
  taigaMaxElevation: 300,
  minVegetationForBonus: 0.01,
};

const featuresPlacementConfig = {
  strategy: "owned",
  config: {
    groups: {
      vegetated: { multiplier: 1.5 },
      wet: { multiplier: 0.65 },
      aquatic: { multiplier: 0.65 },
      ice: { multiplier: 1 },
    },
    chances: {
      FEATURE_FOREST: 50,
      FEATURE_RAINFOREST: 65,
      FEATURE_TAIGA: 50,
      FEATURE_SAVANNA_WOODLAND: 30,
      FEATURE_SAGEBRUSH_STEPPE: 30,
      FEATURE_MARSH: 30,
      FEATURE_TUNDRA_BOG: 20,
      FEATURE_MANGROVE: 30,
      FEATURE_OASIS: 25,
      FEATURE_WATERING_HOLE: 30,
      FEATURE_REEF: 30,
      FEATURE_COLD_REEF: 30,
      FEATURE_ATOLL: 10,
      FEATURE_LOTUS: 15,
      FEATURE_ICE: 90,
    },
    vegetated: {
      minVegetationByBiome: {
        snow: 0.08,
        tundra: 0.04,
        boreal: 0.06,
        temperateDry: 0.06,
        temperateHumid: 0.05,
        tropicalSeasonal: 0.05,
        tropicalRainforest: 0.04,
        desert: 0.02,
      },
      vegetationChanceScalar: 1,
      desertSagebrushMinVegetation: 0.15,
      desertSagebrushMaxAridity: 0.85,
      tundraTaigaMinVegetation: 0.08,
      tundraTaigaMinTemperature: -2,
      tundraTaigaMaxFreeze: 0.95,
      temperateDryForestMoisture: 120,
      temperateDryForestMaxAridity: 0.6,
      temperateDryForestVegetation: 0.45,
      tropicalSeasonalRainforestMoisture: 140,
      tropicalSeasonalRainforestMaxAridity: 0.55,
    },
    wet: {
      nearRiverRadius: 2,
      coldTemperatureMax: 2,
      coldBiomeSymbols: ["snow", "tundra", "boreal"],
      mangroveWarmTemperatureMin: 18,
      mangroveWarmBiomeSymbols: ["tropicalRainforest", "tropicalSeasonal"],
      coastalAdjacencyRadius: 1,
      isolatedRiverRadius: 1,
      isolatedSpacingRadius: 1,
      oasisBiomeSymbols: ["desert", "temperateDry"],
    },
    aquatic: {
      reefLatitudeSplit: 55,
      atoll: {
        enableClustering: true,
        clusterRadius: 1,
        equatorialBandMaxAbsLatitude: 23,
        shallowWaterAdjacencyGateChance: 30,
        shallowWaterAdjacencyRadius: 1,
        growthChanceEquatorial: 15,
        growthChanceNonEquatorial: 5,
      },
    },
    ice: {
      minAbsLatitude: 78,
      forbidAdjacentToLand: true,
      landAdjacencyRadius: 1,
      forbidAdjacentToNaturalWonders: true,
      naturalWonderAdjacencyRadius: 1,
    },
  },
};

const plotEffectsConfig = {
  snow: {
    enabled: true,
    selectors: {
      light: {
        tags: ["SNOW", "LIGHT", "PERMANENT"],
        typeName: "PLOTEFFECT_SNOW_LIGHT_PERMANENT",
      },
      medium: {
        tags: ["SNOW", "MEDIUM", "PERMANENT"],
        typeName: "PLOTEFFECT_SNOW_MEDIUM_PERMANENT",
      },
      heavy: {
        tags: ["SNOW", "HEAVY", "PERMANENT"],
        typeName: "PLOTEFFECT_SNOW_HEAVY_PERMANENT",
      },
    },
    coverageChance: 70,
    freezeWeight: 1.1,
    elevationWeight: 0.9,
    moistureWeight: 0.7,
    scoreNormalization: 2.7,
    scoreBias: 0,
    lightThreshold: 0.35,
    mediumThreshold: 0.6,
    heavyThreshold: 0.8,
    elevationStrategy: "percentile" as const,
    elevationMin: 200,
    elevationMax: 2800,
    elevationPercentileMin: 0.7,
    elevationPercentileMax: 0.98,
    moistureMin: 50,
    moistureMax: 170,
    maxTemperature: 4,
    maxAridity: 0.85,
  },
  sand: {
    enabled: true,
    selector: {
      tags: ["SAND"],
      typeName: "PLOTEFFECT_SAND",
    },
    chance: 6,
    minAridity: 0.65,
    minTemperature: 20,
    maxFreeze: 0.25,
    maxVegetation: 0.15,
    maxMoisture: 80,
    allowedBiomes: ["desert", "temperateDry"] as ["desert", "temperateDry"],
  },
  burned: {
    enabled: false,
    selector: {
      tags: ["BURNED"],
      typeName: "PLOTEFFECT_BURNED",
    },
    chance: 6,
    minAridity: 0.5,
    minTemperature: 22,
    maxFreeze: 0.2,
    maxVegetation: 0.25,
    maxMoisture: 100,
    allowedBiomes: ["temperateDry", "tropicalSeasonal"] as [
      "temperateDry",
      "tropicalSeasonal",
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

const standardConfig = {
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
      story: { features: storyFeaturesConfig },
      featuresDensity: featuresDensityConfig,
      featuresPlacement: featuresPlacementConfig,
    },
    plotEffects: { plotEffects: plotEffectsConfig },
  },
  placement: {
    derivePlacementInputs: { placement: placementConfig },
    placement: {},
  },
} satisfies StandardRecipeConfig;

describe("standard recipe execution", () => {
  it("compiles and executes with a mock adapter", () => {
    const width = 24;
    const height = 18;
    const mapInfo = {
      GridWidth: width,
      GridHeight: height,
      MinLatitude: -60,
      MaxLatitude: 60,
      PlayersLandmass1: 4,
      PlayersLandmass2: 4,
      StartSectorRows: 4,
      StartSectorCols: 4,
    };

    const settings = {
      seed: 123,
      dimensions: { width, height },
      latitudeBounds: {
        topLatitude: mapInfo.MaxLatitude,
        bottomLatitude: mapInfo.MinLatitude,
      },
      wrap: { wrapX: true, wrapY: false },
      directionality,
    };

    const adapter = createMockAdapter({ width, height, mapInfo, mapSizeId: 1 });
    const context = createExtendedMapContext(
      { width, height },
      adapter,
      settings
    );

    initializeStandardRuntime(context, { mapInfo, logPrefix: "[test]", storyEnabled: true });

    const config = standardConfig;
    const plan = standardRecipe.compile(settings, config);
    expect(plan.nodes.length).toBeGreaterThan(0);

    expect(() =>
      standardRecipe.run(context, settings, config, { log: () => {} })
    ).not.toThrow();

    const climateField = context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.climateField) as
      | { humidity?: Uint8Array }
      | undefined;
    const humidity = climateField?.humidity;
    expect(humidity instanceof Uint8Array).toBe(true);
    expect(humidity?.length).toBe(width * height);
    expect(humidity?.some((value) => value > 0)).toBe(true);

    expect(context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.foundationPlatesV1)).toBeTruthy();
    expect(context.artifacts.get(M3_DEPENDENCY_TAGS.artifact.placementOutputsV1)).toBeTruthy();
  });
});
