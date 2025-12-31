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
        volcanicForestChance: 22,
        volcanicTaigaChance: 25,
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
