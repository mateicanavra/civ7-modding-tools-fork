import { describe, expect, it } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import { HILL_TERRAIN, MOUNTAIN_TERRAIN, VOLCANO_FEATURE, createExtendedMapContext, sha256Hex, stableStringify } from "@swooper/mapgen-core";
import { createLabelRng } from "@swooper/mapgen-core/lib/rng";

import standardRecipe from "../src/recipes/standard/recipe.js";
import type { StandardRecipeConfig } from "../src/recipes/standard/recipe.js";
import { initializeStandardRuntime } from "../src/recipes/standard/runtime.js";
import { foundationArtifacts } from "../src/recipes/standard/stages/foundation/artifacts.js";
import { hydrologyHydrographyArtifacts } from "../src/recipes/standard/stages/hydrology-hydrography/artifacts.js";
import { computeRiverAdjacencyMaskFromRiverClass } from "../src/recipes/standard/stages/hydrology-hydrography/river-adjacency.js";
import { hydrologyClimateBaselineArtifacts } from "../src/recipes/standard/stages/hydrology-climate-baseline/artifacts.js";
import { hydrologyClimateRefineArtifacts } from "../src/recipes/standard/stages/hydrology-climate-refine/artifacts.js";
import { placementArtifacts } from "../src/recipes/standard/stages/placement/artifacts.js";

const reliefConfig = {
  crustEdgeBlend: 0.35,
  crustNoiseAmplitude: 0.1,
  continentalHeight: 0.4,
  oceanicHeight: -0.75,
  boundaryBias: 0.2,
  tectonics: {
    boundaryArcWeight: 0.37,
    boundaryArcNoiseWeight: 0.35,
    interiorNoiseWeight: 0.75,
    fractalGrain: 5,
  },
};

const hypsometryConfig = {
  targetWaterPercent: 68,
  targetScalar: 1,
  boundaryShareTarget: 0.2,
};

const coastConfig = {
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
  bay: {},
  fjord: {},
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
  mesh: {
    computeMesh: {
      strategy: "default",
      config: { plateCount: 23, cellsPerPlate: 2, relaxationSteps: 4 },
    },
  },
  "plate-graph": {
    computePlateGraph: {
      strategy: "default",
      config: { plateCount: 23 },
    },
  },
};

const basinSeparationConfig = {
  enabled: false,
  baseSeparationTiles: 0,
  boundaryClosenessMultiplier: 1.0,
  maxPerRowDelta: 3,
  minChannelWidth: 4,
  channelJitter: 0,
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


const biomesConfig = {
  strategy: "default",
  config: {
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
    riparian: {
      adjacencyRadius: 1,
      minorRiverMoistureBonus: 4,
      majorRiverMoistureBonus: 8,
    },
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
  vegetated: {
    strategy: "default",
    config: {
      multiplier: 1.5,
      chances: {
        FEATURE_FOREST: 50,
        FEATURE_RAINFOREST: 65,
        FEATURE_TAIGA: 50,
        FEATURE_SAVANNA_WOODLAND: 30,
        FEATURE_SAGEBRUSH_STEPPE: 30,
      },
      rules: {
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
    },
  },
  wet: {
    strategy: "default",
    config: {
      multiplier: 0.65,
      chances: {
        FEATURE_MARSH: 30,
        FEATURE_TUNDRA_BOG: 20,
        FEATURE_MANGROVE: 30,
        FEATURE_OASIS: 25,
        FEATURE_WATERING_HOLE: 30,
      },
      rules: {
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
    },
  },
  aquatic: {
    strategy: "default",
    config: {
      multiplier: 0.65,
      chances: {
        FEATURE_REEF: 30,
        FEATURE_COLD_REEF: 30,
        FEATURE_ATOLL: 10,
        FEATURE_LOTUS: 15,
      },
      rules: {
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
    },
  },
  ice: {
    strategy: "default",
    config: {
      multiplier: 1,
      chances: { FEATURE_ICE: 90 },
      rules: {
        minAbsLatitude: 78,
        forbidAdjacentToLand: true,
        landAdjacencyRadius: 1,
        forbidAdjacentToNaturalWonders: true,
        naturalWonderAdjacencyRadius: 1,
      },
    },
  },
};

const plotEffectsConfig = {
  strategy: "default",
  config: {
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
  },
};

const islandsConfig = {};
const islandsPlanConfig = {
  islands: islandsConfig,
};

const geomorphologyConfig = {
  fluvial: {},
  diffusion: {},
  deposition: {},
  eras: 2,
};
const placementConfig = {
  wonders: { strategy: "default", config: { wondersPlusOne: true } },
  floodplains: { strategy: "default", config: { minLength: 4, maxLength: 10 } },
  starts: { strategy: "default", config: {} },
};
const standardConfig = {
  foundation: { advanced: foundationConfig },
  "morphology-pre": {
    advanced: {
      "landmass-plates": {
        substrate: { strategy: "default", config: {} },
        baseTopography: { strategy: "default", config: reliefConfig },
        seaLevel: { strategy: "default", config: hypsometryConfig },
        landmask: {
          strategy: "default",
          config: { basinSeparation: basinSeparationConfig },
        },
      },
    },
  },
  "morphology-mid": {
    advanced: {
      "rugged-coasts": {
        coastlines: {
          strategy: "default",
          config: {
            coast: coastConfig,
          },
        },
      },
      routing: {
        routing: { strategy: "default", config: {} },
      },
      geomorphology: {
        geomorphology: {
          strategy: "default",
          config: {
            geomorphology: geomorphologyConfig,
            worldAge: "mature",
          },
        },
      },
    },
  },
  "morphology-post": {
    advanced: {
      islands: {
        islands: { strategy: "default", config: islandsPlanConfig },
      },
      volcanoes: { volcanoes: { strategy: "default", config: volcanoesConfig } },
      landmasses: { landmasses: { strategy: "default", config: {} } },
    },
  },
  "map-morphology": {
    mountains: { mountains: { strategy: "default", config: mountainsConfig } },
  },
  "hydrology-climate-baseline": {
    knobs: {
      dryness: "mix",
      temperature: "temperate",
      seasonality: "normal",
      oceanCoupling: "earthlike",
    },
  },
  "hydrology-hydrography": {
    knobs: {
      riverDensity: "normal",
    },
  },
  "hydrology-climate-refine": {
    knobs: {
      dryness: "mix",
      temperature: "temperate",
      cryosphere: "on",
    },
  },
  "map-hydrology": {
    knobs: {
      riverDensity: "normal",
      lakeiness: "normal",
    },
  },
  ecology: {
    biomes: { classify: biomesConfig },
  },
  "map-ecology": {
    biomes: { bindings: biomeBindingsConfig },
    plotEffects: { plotEffects: plotEffectsConfig },
  },
  placement: {
    "derive-placement-inputs": placementConfig,
    placement: {},
  },
} satisfies StandardRecipeConfig;

describe("standard recipe execution", () => {
	  function runAndGetClimateSignature(options: { seed: number; width: number; height: number }): string {
	    const { seed, width, height } = options;
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

    const env = {
      seed,
      dimensions: { width, height },
      latitudeBounds: {
        topLatitude: mapInfo.MaxLatitude,
        bottomLatitude: mapInfo.MinLatitude,
      },
    };

    const adapter = createMockAdapter({ width, height, mapInfo, mapSizeId: 1, rng: createLabelRng(seed) });
    const context = createExtendedMapContext({ width, height }, adapter, env);

	    initializeStandardRuntime(context, { mapInfo, logPrefix: "[test]", storyEnabled: true });
	    standardRecipe.run(context, env, standardConfig, { log: () => {} });

		    const hydrography = context.artifacts.get(hydrologyHydrographyArtifacts.hydrography.id) as
		      | { discharge?: Float32Array; riverClass?: Uint8Array }
		      | undefined;
		    const size = width * height;
		    if (!(hydrography?.discharge instanceof Float32Array) || hydrography.discharge.length !== size) {
		      throw new Error("Missing artifact:hydrology.hydrography discharge buffer.");
		    }
		    if (!(hydrography?.riverClass instanceof Uint8Array) || hydrography.riverClass.length !== size) {
		      throw new Error("Missing artifact:hydrology.hydrography riverClass buffer.");
		    }
		    const riverAdjacency = computeRiverAdjacencyMaskFromRiverClass({
		      width,
		      height,
		      riverClass: hydrography.riverClass,
		      radius: 1,
		    });

	    const climateField = context.artifacts.get(hydrologyClimateBaselineArtifacts.climateField.id) as
	      | { rainfall?: Uint8Array; humidity?: Uint8Array }
	      | undefined;
    const rainfall = climateField?.rainfall;
    const humidity = climateField?.humidity;
    if (!(rainfall instanceof Uint8Array) || !(humidity instanceof Uint8Array)) {
      throw new Error("Missing artifact:climateField rainfall/humidity buffers.");
    }

    const climateIndices = context.artifacts.get(hydrologyClimateRefineArtifacts.climateIndices.id) as
      | { surfaceTemperatureC?: Float32Array; pet?: Float32Array; aridityIndex?: Float32Array; freezeIndex?: Float32Array }
      | undefined;
    const cryosphere = context.artifacts.get(hydrologyClimateRefineArtifacts.cryosphere.id) as
      | { snowCover?: Uint8Array; seaIceCover?: Uint8Array; albedo?: Uint8Array }
      | undefined;
    const diagnostics = context.artifacts.get(hydrologyClimateRefineArtifacts.climateDiagnostics.id) as
      | { rainShadowIndex?: Float32Array; continentalityIndex?: Float32Array; convergenceIndex?: Float32Array }
      | undefined;

		    const rainfallSha = sha256Hex(Buffer.from(rainfall).toString("base64"));
		    const humiditySha = sha256Hex(Buffer.from(humidity).toString("base64"));
		    const dischargeView = hydrography?.discharge ?? new Float32Array();
		    const riverClassView = hydrography?.riverClass ?? new Uint8Array();
		    const riverAdjacencyView = riverAdjacency ?? new Uint8Array();
    const temperatureView = climateIndices?.surfaceTemperatureC ?? new Float32Array();
    const petView = climateIndices?.pet ?? new Float32Array();
    const aridityView = climateIndices?.aridityIndex ?? new Float32Array();
    const freezeView = climateIndices?.freezeIndex ?? new Float32Array();
    const rainShadowView = diagnostics?.rainShadowIndex ?? new Float32Array();
    const continentalityView = diagnostics?.continentalityIndex ?? new Float32Array();
    const convergenceView = diagnostics?.convergenceIndex ?? new Float32Array();

    const temperatureSha = sha256Hex(
      Buffer.from(new Uint8Array(temperatureView.buffer, temperatureView.byteOffset, temperatureView.byteLength)).toString("base64")
    );
    const petSha = sha256Hex(
      Buffer.from(new Uint8Array(petView.buffer, petView.byteOffset, petView.byteLength)).toString("base64")
    );
    const ariditySha = sha256Hex(
      Buffer.from(new Uint8Array(aridityView.buffer, aridityView.byteOffset, aridityView.byteLength)).toString("base64")
    );
    const freezeSha = sha256Hex(
      Buffer.from(new Uint8Array(freezeView.buffer, freezeView.byteOffset, freezeView.byteLength)).toString("base64")
    );
    const snowSha = sha256Hex(
      Buffer.from(cryosphere?.snowCover ?? new Uint8Array()).toString("base64")
    );
    const seaIceSha = sha256Hex(
      Buffer.from(cryosphere?.seaIceCover ?? new Uint8Array()).toString("base64")
    );
    const albedoSha = sha256Hex(
      Buffer.from(cryosphere?.albedo ?? new Uint8Array()).toString("base64")
    );
    const rainShadowSha = sha256Hex(
      Buffer.from(new Uint8Array(rainShadowView.buffer, rainShadowView.byteOffset, rainShadowView.byteLength)).toString("base64")
    );
    const continentalitySha = sha256Hex(
      Buffer.from(new Uint8Array(continentalityView.buffer, continentalityView.byteOffset, continentalityView.byteLength)).toString("base64")
    );
	    const convergenceSha = sha256Hex(
	      Buffer.from(new Uint8Array(convergenceView.buffer, convergenceView.byteOffset, convergenceView.byteLength)).toString("base64")
	    );
	    const dischargeSha = sha256Hex(
	      Buffer.from(new Uint8Array(dischargeView.buffer, dischargeView.byteOffset, dischargeView.byteLength)).toString("base64")
	    );
	    const riverClassSha = sha256Hex(Buffer.from(riverClassView).toString("base64"));
	    const riverAdjacencySha = sha256Hex(Buffer.from(riverAdjacencyView).toString("base64"));
	    return sha256Hex(
	      stableStringify({
	        width,
	        height,
	        seed,
	        rainfallSha,
	        humiditySha,
	        dischargeSha,
	        riverClassSha,
	        riverAdjacencySha,
	        temperatureSha,
	        petSha,
	        ariditySha,
        freezeSha,
        snowSha,
        seaIceSha,
        albedoSha,
        rainShadowSha,
        continentalitySha,
        convergenceSha,
      })
    );
  }

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

    const env = {
      seed: 123,
      dimensions: { width, height },
      latitudeBounds: {
        topLatitude: mapInfo.MaxLatitude,
        bottomLatitude: mapInfo.MinLatitude,
      },
    };

    const adapter = createMockAdapter({ width, height, mapInfo, mapSizeId: 1 });
    const context = createExtendedMapContext({ width, height }, adapter, env);

    initializeStandardRuntime(context, { mapInfo, logPrefix: "[test]", storyEnabled: true });

    const config = standardConfig;
    const plan = standardRecipe.compile(env, config);
    expect(plan.nodes.length).toBeGreaterThan(0);

    expect(() =>
      standardRecipe.run(context, env, config, { log: () => {} })
    ).not.toThrow();

    const climateField = context.artifacts.get(hydrologyClimateBaselineArtifacts.climateField.id) as
      | { humidity?: Uint8Array }
      | undefined;
    const humidity = climateField?.humidity;
    expect(humidity instanceof Uint8Array).toBe(true);
    expect(humidity?.length).toBe(width * height);
    expect(humidity?.some((value) => value > 0)).toBe(true);

    const indices = context.artifacts.get(hydrologyClimateRefineArtifacts.climateIndices.id) as
      | { surfaceTemperatureC?: Float32Array; aridityIndex?: Float32Array; freezeIndex?: Float32Array }
      | undefined;
    expect(indices?.surfaceTemperatureC instanceof Float32Array).toBe(true);
    expect(indices?.surfaceTemperatureC?.length).toBe(width * height);
    expect(indices?.aridityIndex instanceof Float32Array).toBe(true);
    expect(indices?.freezeIndex instanceof Float32Array).toBe(true);

    const cryosphere = context.artifacts.get(hydrologyClimateRefineArtifacts.cryosphere.id) as
      | { snowCover?: Uint8Array; seaIceCover?: Uint8Array }
      | undefined;
    expect(cryosphere?.snowCover instanceof Uint8Array).toBe(true);
    expect(cryosphere?.seaIceCover instanceof Uint8Array).toBe(true);

    // Mountains/hills are a key visible output of the tectonics → morphology pipeline.
    // This is intentionally lightweight (mock adapter) and guards against accidental
    // no-op mountain projection or zeroed tectonic driver surfaces.
    let landTiles = 0;
    let nonVolcanoMountainTiles = 0;
    let hillTiles = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (adapter.isWater(x, y)) continue;
        landTiles++;
        const feature = adapter.getFeatureType(x, y);
        const terrain = adapter.getTerrainType(x, y);
        if (terrain === MOUNTAIN_TERRAIN && feature !== VOLCANO_FEATURE) nonVolcanoMountainTiles++;
        else if (terrain === HILL_TERRAIN) hillTiles++;
      }
    }
    expect(landTiles).toBeGreaterThan(0);
    expect(nonVolcanoMountainTiles + hillTiles).toBeGreaterThan(0);

    expect(context.artifacts.get(foundationArtifacts.plates.id)).toBeTruthy();
    expect(context.artifacts.get(foundationArtifacts.plateTopology.id)).toBeTruthy();
    expect(context.artifacts.get(placementArtifacts.placementOutputs.id)).toBeTruthy();
  });

  it("produces deterministic climate signatures for same seed + config", () => {
    const signatureA = runAndGetClimateSignature({ seed: 123, width: 24, height: 18 });
    const signatureB = runAndGetClimateSignature({ seed: 123, width: 24, height: 18 });
    expect(signatureA).toBe(signatureB);
  });

  it("yields more freeze persistence when temperature is cold vs hot (same seed)", () => {
    const width = 24;
    const height = 18;
    const seed = 123;

    const configCold: StandardRecipeConfig = {
      ...standardConfig,
      "hydrology-climate-baseline": {
        ...standardConfig["hydrology-climate-baseline"],
        knobs: { ...standardConfig["hydrology-climate-baseline"].knobs, temperature: "cold" },
      },
      "hydrology-climate-refine": {
        ...standardConfig["hydrology-climate-refine"],
        knobs: { ...standardConfig["hydrology-climate-refine"].knobs, temperature: "cold" },
      },
    };
    const configHot: StandardRecipeConfig = {
      ...standardConfig,
      "hydrology-climate-baseline": {
        ...standardConfig["hydrology-climate-baseline"],
        knobs: { ...standardConfig["hydrology-climate-baseline"].knobs, temperature: "hot" },
      },
      "hydrology-climate-refine": {
        ...standardConfig["hydrology-climate-refine"],
        knobs: { ...standardConfig["hydrology-climate-refine"].knobs, temperature: "hot" },
      },
    };

    const runAndMeanFreezeIndex = (cfg: StandardRecipeConfig): number => {
      const mapInfo = {
        GridWidth: width,
        GridHeight: height,
        MinLatitude: -85,
        MaxLatitude: 85,
        PlayersLandmass1: 4,
        PlayersLandmass2: 4,
        StartSectorRows: 4,
        StartSectorCols: 4,
      };
      const env = {
        seed,
        dimensions: { width, height },
        latitudeBounds: {
          topLatitude: mapInfo.MaxLatitude,
          bottomLatitude: mapInfo.MinLatitude,
        },
      };
      const adapter = createMockAdapter({ width, height, mapInfo, mapSizeId: 1, rng: createLabelRng(seed) });
      const context = createExtendedMapContext({ width, height }, adapter, env);
      initializeStandardRuntime(context, { mapInfo, logPrefix: "[test]", storyEnabled: true });
      standardRecipe.run(context, env, cfg, { log: () => {} });
      const indices = context.artifacts.get(hydrologyClimateRefineArtifacts.climateIndices.id) as
        | { freezeIndex?: Float32Array }
        | undefined;
      const freeze = indices?.freezeIndex;
      if (!(freeze instanceof Float32Array)) throw new Error("Missing freezeIndex.");
      let sum = 0;
      for (let i = 0; i < freeze.length; i++) sum += freeze[i] ?? 0;
      return sum / Math.max(1, freeze.length);
    };

    const meanCold = runAndMeanFreezeIndex(configCold);
    const meanHot = runAndMeanFreezeIndex(configHot);
    expect(meanCold).toBeGreaterThan(meanHot);
  });

	  it("projects more river tiles when riverDensity is dense vs sparse (same seed)", () => {
	    const width = 24;
	    const height = 18;
	    const seed = 123;

	    const configDense: StandardRecipeConfig = {
	      ...standardConfig,
	      "hydrology-hydrography": {
	        ...standardConfig["hydrology-hydrography"],
	        knobs: { ...standardConfig["hydrology-hydrography"].knobs, riverDensity: "dense" },
	      },
	    };
	    const configSparse: StandardRecipeConfig = {
	      ...standardConfig,
	      "hydrology-hydrography": {
	        ...standardConfig["hydrology-hydrography"],
	        knobs: { ...standardConfig["hydrology-hydrography"].knobs, riverDensity: "sparse" },
	      },
	    };

	    const runAndCountRivers = (cfg: StandardRecipeConfig): number => {
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
	      const env = {
	        seed,
	        dimensions: { width, height },
	        latitudeBounds: {
	          topLatitude: mapInfo.MaxLatitude,
	          bottomLatitude: mapInfo.MinLatitude,
	        },
	      };
	      const adapter = createMockAdapter({ width, height, mapInfo, mapSizeId: 1, rng: createLabelRng(seed) });
	      const context = createExtendedMapContext({ width, height }, adapter, env);
	      initializeStandardRuntime(context, { mapInfo, logPrefix: "[test]", storyEnabled: true });
	      standardRecipe.run(context, env, cfg, { log: () => {} });
	      const hydrography = context.artifacts.get(hydrologyHydrographyArtifacts.hydrography.id) as
	        | { riverClass?: Uint8Array }
	        | undefined;
	      const riverClass = hydrography?.riverClass;
	      if (!(riverClass instanceof Uint8Array)) throw new Error("Missing hydrography riverClass.");
	      let count = 0;
	      for (let i = 0; i < riverClass.length; i++) if ((riverClass[i] ?? 0) > 0) count++;
	      return count;
	    };

	    const denseCount = runAndCountRivers(configDense);
	    const sparseCount = runAndCountRivers(configSparse);
	    expect(denseCount).toBeGreaterThan(sparseCount);
	  });
	});
