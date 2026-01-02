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
import { applyMapInitData, resolveMapInitData } from "./_runtime/map-init.js";
import { runStandardRecipe } from "./_runtime/run-standard.js";
import type { MapInitResolution } from "./_runtime/map-init.js";
import type { MapRuntimeOptions } from "./_runtime/types.js";
import type { StandardRecipeOverrides } from "./_runtime/standard-config.js";

/**
 * Build the map overrides.
 * Uses standard, balanced defaults to ensure playability.
 */
function buildConfig(): StandardRecipeOverrides {
  return {
      landmass: {
        baseWaterPercent: 53, // More ocean for distinct continents
        waterScalar: 1,
      },
      margins: {
        activeFraction: 0.35,
        passiveFraction: 0.2,
        minSegmentLength: 13,
      },
      coastlines: {
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
      },
      mountains: {
        // Balanced physics settings for plate-driven terrain
        tectonicIntensity: 0.5, // Reduced intensity to preserve playable basins
        mountainThreshold: 0.7, // Raise threshold to avoid over-mountainizing small maps
        hillThreshold: 0.35, // Slightly raise hills threshold to preserve flats for starts
        upliftWeight: 0.37, // Standard uplift contribution
        fractalWeight: 0.18, // Keep fractal contribution subtle (avoid blanket ruggedness)
        riftDepth: 0.25,
        boundaryWeight: 1.0, // Standard boundary weight
        boundaryExponent: 1.77, // Standard falloff
        interiorPenaltyWeight: 0.0, // Disabled as per mountains.ts defaults
        convergenceBonus: 0.4,
        transformPenalty: 0.6,
        riftPenalty: 1.0,
        hillBoundaryWeight: 0.35,
        hillRiftBonus: 0.25,
        hillConvergentFoothill: 0.35,
        hillInteriorFalloff: 0.1,
        hillUpliftWeight: 0.2,
      },
      volcanoes: {
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
      },
      foundation: {
        plates: {
          count: 15,
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
          directionality: {
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
          },
        },
      },
      oceanSeparation: {
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
      },
      climate: {
	        baseline: {
	          blend: {
	            baseWeight: 0,
	            bandWeight: 1,
	          },
        bands: {
          // Standard Earth-like distribution
          deg0to10: 70,
          deg10to20: 45,
          deg20to35: 15,
          deg35to55: 50,
          deg55to70: 35,
          deg70plus: 20,
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
      },
      story: {
        hotspot: {
          paradiseBias: 1,
          volcanicBias: 1,
          volcanicPeakChance: 0.3,
        },
        features: {
          paradiseReefChance: 25,
          volcanicForestChance: 20,
          volcanicTaigaChance: 15,
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
          thresholds: [80, 110, 150, 195],
          bias: 0,
          humidityWeight: 0.35,
        },
        vegetation: {
          base: 0.15,
          moistureWeight: 0.5,
          humidityWeight: 0.2,
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
        rainforestExtraChance: 10,
        forestExtraChance: 10,
        taigaExtraChance: 5,
        shelfReefMultiplier: 0.6,
      },
      featuresPlacement: {
        mode: "owned",
        groups: {
          vegetated: { multiplier: 0.7 },
          wet: { multiplier: 0.35 },
          aquatic: { multiplier: 0.8 },
          ice: { multiplier: 0.9 },
        },
        chances: {
          FEATURE_OASIS: 70,
          FEATURE_WATERING_HOLE: 45,
          FEATURE_MARSH: 15,
          FEATURE_TUNDRA_BOG: 15,
          FEATURE_MANGROVE: 10,
        },
      },
  };
}

const runtimeOptions: MapRuntimeOptions = { logPrefix: "[SWOOPER_MOD]" };
let mapInitData: MapInitResolution | null = null;

// Wire engine events to runtime helpers
// RequestMapInitData: apply map dimensions before generation
engine.on("RequestMapInitData", (initParams) => {
  mapInitData = applyMapInitData(runtimeOptions, initParams);
});

// GenerateMap: build recipe config + execute through the engine contract
engine.on("GenerateMap", () => {
  const overrides = buildConfig();
  const init = mapInitData ?? resolveMapInitData(runtimeOptions);
  runStandardRecipe({ recipe: standardRecipe, init, overrides, options: runtimeOptions });
});

// TypeScript build marker
console.log("[SWOOPER_MOD] ========================================");
console.log("[SWOOPER_MOD] Swooper Desert Mountains (TypeScript Build) Loaded");
console.log("[SWOOPER_MOD] Using RunRequest → ExecutionPlan pipeline");
console.log("[SWOOPER_MOD] ========================================");
