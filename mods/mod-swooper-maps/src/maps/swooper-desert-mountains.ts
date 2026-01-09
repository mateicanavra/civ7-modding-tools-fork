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

const config = {
  foundation: {
    foundation: {
      foundation: {
        plates: {
          count: 13,
          convergenceMix: 0.65,
          relaxationSteps: 4,
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
              riftsFollowPlates: 0.75,
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
    },
  },
  "morphology-pre": {
    "landmass-plates": {
      landmass: {
        baseWaterPercent: 53,
        waterScalar: 1,
      },
      oceanSeparation: {
        enabled: false,
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
    },
    coastlines: {},
  },
  "narrative-pre": {
    "story-seed": {
      margins: {
        activeFraction: 0.35,
        passiveFraction: 0.2,
        minSegmentLength: 13,
      },
    },
    "story-hotspots": {
      story: {
        hotspot: {
          paradiseBias: 1,
          volcanicBias: 1,
          volcanicPeakChance: 0.3,
        },
      },
    },
    "story-rifts": { story: { rift: {} } },
  },
  "morphology-mid": {
    "rugged-coasts": {
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
      corridors: {
        sea: {},
        land: {},
        river: {},
        islandHop: {},
      },
    },
  },
  "narrative-mid": {
    "story-orogeny": { story: { orogeny: {} } },
    "story-corridors-pre": {
      corridors: {
        sea: {},
        land: {},
        river: {},
        islandHop: {},
      },
    },
  },
  "morphology-post": {
    islands: {
      islands: {},
      story: {
        hotspot: {
          paradiseBias: 1,
          volcanicBias: 1,
          volcanicPeakChance: 0.3,
        },
      },
      corridors: { sea: {} },
    },
    mountains: {
      mountains: {
        // Balanced physics settings for plate-driven terrain
        tectonicIntensity: 0.65,
        mountainThreshold: 0.7,
        hillThreshold: 0.35,
        upliftWeight: 0.37,
        fractalWeight: 0.37,
        riftDepth: 0.75,
        boundaryWeight: 0.8,
        boundaryGate: 0,
        boundaryExponent: 1.77,
        interiorPenaltyWeight: 0.0,
        convergenceBonus: 0.4,
        transformPenalty: 0.6,
        riftPenalty: 1.0,
        hillBoundaryWeight: 0.35,
        hillRiftBonus: 0.67,
        hillConvergentFoothill: 0.35,
        hillInteriorFalloff: 0.1,
        hillUpliftWeight: 0.2,
      },
    },
    volcanoes: {
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
    },
  },
  "hydrology-pre": {
    lakes: {},
    "climate-baseline": {
      climate: {
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
      },
    },
  },
  "narrative-swatches": {
    "story-swatches": {
      climate: {
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
      },
    },
  },
  "hydrology-core": {
    rivers: { climate: { story: { paleo: {} } } },
  },
  "narrative-post": {
    "story-corridors-post": {
      corridors: {
        sea: {},
        land: {},
        river: {},
        islandHop: {},
      },
    },
  },
  "hydrology-post": {
    "climate-refine": {
      climate: {
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
      },
      story: { orogeny: {} },
    },
  },
  ecology: {
    // New ecology steps with strategy selections for arid mountain world
    pedology: {
      classify: { strategy: "orogeny-boosted", config: {} },  // Dramatic mountain soils
    },
    "resource-basins": {
      plan: { strategy: "default", config: {} },
      score: { strategy: "default", config: {} },
    },
    "biome-edge-refine": {
      refine: { strategy: "default", config: {} },  // Sharp desert/mountain transitions
    },
    "features-plan": {
      vegetation: { strategy: "default", config: {} },  // Sparse desert vegetation
      wetlands: { strategy: "default", config: {} },    // Minimal wetlands
      reefs: { strategy: "default", config: {} },
      ice: { strategy: "continentality", config: {} },  // Continental interior ice
    },
    biomes: {
      classify: {
        strategy: "default",
        config: {
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
        },
      },
      bindings: {
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
    },
    "plot-effects": {
      plotEffects: {
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
            chance: 38,            // Aggressive for desert world
            minAridity: 0.48,      // Capture more arid tiles
            minTemperature: 18,    // Include cooler desert edges
            maxFreeze: 0.2,
            maxVegetation: 0.15,
            maxMoisture: 75,
            allowedBiomes: ["desert", "temperateDry"] as [
              "desert",
              "temperateDry",
            ],
          },
          burned: {
            enabled: true,
            selector: {
              typeName: "PLOTEFFECT_BURNED",
            },
            chance: 14,            // More scorched earth
            minAridity: 0.55,      // Capture more tiles
            minTemperature: 22,
            maxFreeze: 0.15,
            maxVegetation: 0.25,
            maxMoisture: 95,
            allowedBiomes: ["desert", "temperateDry", "tropicalSeasonal"] as [
              "desert",
              "temperateDry",
              "tropicalSeasonal",
            ],
          },
        },
      },
    },
  },
  placement: {
    "derive-placement-inputs": {
      wonders: { strategy: "default", config: { wondersPlusOne: true } },
      floodplains: { strategy: "default", config: { minLength: 4, maxLength: 10 } },
      starts: { strategy: "default", config: {} },
    },
    placement: {},
  },
} satisfies StandardRecipeConfig;

const runtimeOptions: MapRuntimeOptions = { logPrefix: "[SWOOPER_MOD]" };
const directionality =
  config.foundation.foundation.foundation.dynamics.directionality;

wireStandardMapEntry({
  engine,
  recipe: standardRecipe,
  config,
  directionality,
  options: runtimeOptions,
});
