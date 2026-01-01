/**
 * Gate A Continents - TypeScript Pipeline Validation
 *
 * This minimal map entry proves the TypeScript build pipeline works.
 *
 * Once Gate A passes (game loads without errors), the real swooper maps
 * will be migrated to TypeScript in Gate B/C.
 */

/// <reference types="@civ7/types" />

// Ensure Civ7's V8 runtime has a TextEncoder implementation before dependencies initialize.
import "@swooper/mapgen-core/polyfills/text-encoder";
import { VERSION } from "@swooper/mapgen-core";

import standardRecipe from "../recipes/standard/recipe.js";
import { applyMapInitData, resolveMapInitData } from "./_runtime/map-init.js";
import { runStandardRecipe } from "./_runtime/run-standard.js";
import type { MapInitResolution } from "./_runtime/map-init.js";
import type { MapRuntimeOptions } from "./_runtime/types.js";
import type { StandardRecipeOverrides } from "./_runtime/standard-config.js";

function buildConfig(): StandardRecipeOverrides {
  return {
    climate: {
      baseline: {
        blend: {
          baseWeight: 0,
          bandWeight: 1,
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
          transitionWidth: 6,
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
    },
    story: {
      features: {
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
      },
    },
    biomes: {
      temperature: {
        equator: 28,
        pole: -8,
        lapseRate: 6.5,
        seaLevel: 0,
        bias: 0,
        polarCutoff: -5,
        tundraCutoff: 2,
        midLatitude: 12,
        tropicalThreshold: 24,
      },
      moisture: {
        thresholds: [80, 100, 150, 200],
        bias: 0,
        humidityWeight: 0.35,
      },
      vegetation: {
        base: 0.2,
        moistureWeight: 0.55,
        humidityWeight: 0.25,
        moistureNormalizationPadding: 40,
        biomeModifiers: {
          snow: { multiplier: 0.05, bonus: 0 },
          tundra: { multiplier: 0.35, bonus: 0 },
          boreal: { multiplier: 0.75, bonus: 0 },
          temperateDry: { multiplier: 0.75, bonus: 0 },
          temperateHumid: { multiplier: 1, bonus: 0 },
          tropicalSeasonal: { multiplier: 1, bonus: 0 },
          tropicalRainforest: { multiplier: 1, bonus: 0.25 },
          desert: { multiplier: 0.1, bonus: 0 },
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
    },
    biomeBindings: {
      snow: "BIOME_TUNDRA",
      tundra: "BIOME_TUNDRA",
      boreal: "BIOME_TUNDRA",
      temperateDry: "BIOME_PLAINS",
      temperateHumid: "BIOME_GRASSLAND",
      tropicalSeasonal: "BIOME_GRASSLAND",
      tropicalRainforest: "BIOME_TROPICAL",
      desert: "BIOME_DESERT",
      marine: "BIOME_MARINE",
    },
    featuresDensity: {
      rainforestExtraChance: 50,
      forestExtraChance: 40,
      taigaExtraChance: 20,
      shelfReefMultiplier: 0.8,
      shelfReefRadius: 1,
      rainforestVegetationScale: 50,
      forestVegetationScale: 30,
      taigaVegetationScale: 20,
      rainforestMinRainfall: 130,
      forestMinRainfall: 100,
      taigaMaxElevation: 300,
      minVegetationForBonus: 0.01,
    },
    featuresPlacement: {
      strategy: "owned",
      config: {
        groups: {
          vegetated: { multiplier: 1 },
          wet: { multiplier: 0.95 },
          aquatic: { multiplier: 0.85 },
          ice: { multiplier: 1 },
        },
        chances: {
          FEATURE_FOREST: 50,
          FEATURE_RAINFOREST: 65,
          FEATURE_TAIGA: 50,
          FEATURE_SAVANNA_WOODLAND: 30,
          FEATURE_SAGEBRUSH_STEPPE: 30,
          FEATURE_MARSH: 30,
          FEATURE_TUNDRA_BOG: 30,
          FEATURE_MANGROVE: 30,
          FEATURE_OASIS: 50,
          FEATURE_WATERING_HOLE: 30,
          FEATURE_REEF: 30,
          FEATURE_COLD_REEF: 30,
          FEATURE_ATOLL: 8,
          FEATURE_LOTUS: 15,
          FEATURE_ICE: 90,
        },
        vegetated: {
          minVegetation: 0.05,
          vegetationChanceScalar: 1,
          desertSagebrushMinVegetation: 0.2,
          tundraTaigaMinVegetation: 0.25,
          tundraTaigaMinTemperature: -2,
          temperateDryForestMoisture: 120,
          temperateDryForestVegetation: 0.45,
          tropicalSeasonalRainforestMoisture: 140,
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
    },
  };
}

const runtimeOptions: MapRuntimeOptions = { logPrefix: "[SWOOPER_MOD]" };
let mapInitData: MapInitResolution | null = null;

engine.on("RequestMapInitData", (initParams) => {
  mapInitData = applyMapInitData(runtimeOptions, initParams);
});

engine.on("GenerateMap", () => {
  const overrides = buildConfig();
  const init = mapInitData ?? resolveMapInitData(runtimeOptions);
  runStandardRecipe({ recipe: standardRecipe, init, overrides, options: runtimeOptions });
});

// Gate A marker - proves TypeScript pipeline is working
console.log(`[Swooper] Gate A Wrapper Loaded - TypeScript Build Pipeline Working`);
console.log(`[Swooper] mapgen-core version: ${VERSION}`);
