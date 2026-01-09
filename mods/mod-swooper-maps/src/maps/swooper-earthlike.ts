/**
 * Swooper Earthlike — Realistic, plate-driven Earth analogue (TypeScript)
 *
 * Goals:
 * - Ocean-dominant world (~70% water)
 * - Few large continents with a mix of active (Pacific-like) and passive (Atlantic-like) margins
 * - Earth-like latitude rainfall bands, with subtropical deserts and wet tropics
 * - Moderate coastal moisture spread and low-frequency rainfall noise
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
          directionality: {
            cohesion: 0.15,
            primaryAxes: {
              plateAxisDeg: 12,
              windBiasDeg: 12,
              currentBiasDeg: 12,
            },
            interplay: {
              windsFollowPlates: 0.3,
              currentsFollowWinds: 0.6,
              riftsFollowPlates: 0.75,
            },
            hemispheres: {
              southernFlip: true,
              // Enable monsoon pass in climate swatches/refine.
              monsoonBias: 0.82,
              equatorBandDeg: 18,
            },
            variability: {
              angleJitterDeg: 15,
              magnitudeVariance: 0.4,
            },
          },
        },
      },
    },
  },
  "morphology-pre": {
    landmassPlates: {
      landmass: {
        // Earth-like ocean dominance (~70% water).
        baseWaterPercent: 68,
        waterScalar: 1,
        // Crust-first height tuning to preserve water even with broken boundary fields.
        crustEdgeBlend: 0.35,
        crustNoiseAmplitude: 0.1,
        continentalHeight: 0.4,
        oceanicHeight: -0.75,
        // Moderate margin bias: enough active coasts, plenty of passive shelves.
        boundaryBias: 0.2,
        boundaryShareTarget: 0.2,
        tectonics: {
          // Favor coastal arcs (Andes/Ring of Fire) but keep thick interiors.
          boundaryArcWeight: 0.37,
          boundaryArcNoiseWeight: 0.35,
          interiorNoiseWeight: 0.55,  // Reduced: smoother continental interiors
          fractalGrain: 5,
        },
      },
      oceanSeparation: {
        // Leave separation off; keep defaults earthlike if enabled later.
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
      },
    },
    coastlines: {},
  },
  "narrative-pre": {
    storySeed: {
      margins: {
        activeFraction: 0.33,
        passiveFraction: 0.22,
        minSegmentLength: 12,
      },
    },
    storyHotspots: {
      story: {
        hotspot: {
          paradiseBias: 2,
          volcanicBias: 1,
          volcanicPeakChance: 0.33,
        },
      },
    },
    storyRifts: { story: { rift: {} } },
  },
  "morphology-mid": {
    ruggedCoasts: {
      coastlines: {
        plateBias: {
          // Close to crust-first defaults with a gentle nudge for Earth coasts.
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
    storyOrogeny: { story: { orogeny: {} } },
    storyCorridorsPre: {
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
          paradiseBias: 2,
          volcanicBias: 1,
          volcanicPeakChance: 0.33,
        },
      },
      corridors: { sea: {} },
    },
    mountains: {
      mountains: {
        // Earth-like prevalence: a few major ranges, not wall-to-wall mountains.
        tectonicIntensity: 0.65,
        mountainThreshold: 0.62,
        hillThreshold: 0.36,           // Raised: fewer hills overall
        upliftWeight: 0.25,
        fractalWeight: 0.62,           // Reduced: less noisy elevation → fewer scattered hills
        riftDepth: 0.25,
        boundaryWeight: 0.55,
        boundaryGate: 0,
        boundaryExponent: 1.15,
        interiorPenaltyWeight: 0.15,
        convergenceBonus: 0.6,
        transformPenalty: 0.6,
        riftPenalty: 0.76,
        hillBoundaryWeight: 0.28,      // Reduced: fewer hills at boundaries
        hillRiftBonus: 0.45,           // Reduced: fewer hills along rifts
        hillConvergentFoothill: 0.28,  // Reduced: narrower foothills
        hillInteriorFalloff: 0.14,     // KEY FIX: hills decay faster into interiors → more plains
        hillUpliftWeight: 0.18,        // Slightly reduced
      },
    },
    volcanoes: {
      volcanoes: {
        // Boundary-dominant volcanism with a modest hotspot tail.
        baseDensity: 7 / 190,
        minSpacing: 5,
        boundaryThreshold: 0.35,
        boundaryWeight: 1.2,
        convergentMultiplier: 2.5,
        transformMultiplier: 1.0,
        divergentMultiplier: 0.4,
        hotspotWeight: 0.18,
        shieldPenalty: 0.4,
        randomJitter: 0.08
      },
    },
  },
  "hydrology-pre": {
    lakes: {},
    climateBaseline: {
      climate: {
        baseline: {
          blend: {
            baseWeight: 0.45,
            bandWeight: 0.65,
          },
          seed: {
            baseRainfall: 18,       // REDUCED from 30: interior continents are naturally dry
            coastalExponent: 1.4,   // Steeper falloff: sharper coast/interior contrast
          },
          bands: {
            deg0to10: 125,
            deg10to20: 100,
            deg20to35: 45,         // Raised from 25: less extreme deserts, more grassland/steppe transition
            deg35to55: 88,
            deg55to70: 75,
            deg70plus: 40,         // Slightly raised: more tundra variation
            edges: {
              deg0to10: 10,
              deg10to20: 20,
              deg20to35: 35,
              deg35to55: 55,
              deg55to70: 70,
            },
            transitionWidth: 12,
          },
          sizeScaling: {
            baseArea: 10000,
            minScale: 0.6,
            maxScale: 2.0,
            equatorBoostScale: 12,
            equatorBoostTaper: 0.75,
          },
          orographic: {
            hi1Threshold: 300,     // Lower threshold: more tiles get uplift rainfall
            hi1Bonus: 10,          // Increased: mountains wetter on windward side
            hi2Threshold: 550,
            hi2Bonus: 9,
          },
          coastal: {
            coastalLandBonus: 32,  // Moderate coastal moisture
            spread: 6,             // Moderate penetration inland
          },
          noise: {
            baseSpanSmall: 4,
            spanLargeScaleFactor: 1.0,
            scale: 0.13,
          },
        },
      },
    },
  },
  "narrative-swatches": {
    storySwatches: {
      climate: {
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
            deg10to20: 100,
            deg20to35: 55,         // Moderate subtropical band
            deg35to55: 82,
            deg55to70: 68,
            deg70plus: 45,
            edges: {
              deg0to10: 10,
              deg10to20: 20,
              deg20to35: 35,
              deg35to55: 55,
              deg55to70: 70,
            },
            transitionWidth: 10,   // Slightly wider: smoother biome transitions
          },
          sizeScaling: {
            baseArea: 10000,
            minScale: 0.6,
            maxScale: 2.0,
            equatorBoostScale: 12,
            equatorBoostTaper: 0.6,
          },
          orographic: {
            hi1Threshold: 300,     // Lower threshold: more tiles get uplift rainfall
            hi1Bonus: 10,          // Increased: mountains wetter on windward side
            hi2Threshold: 550,
            hi2Bonus: 9,
          },
          coastal: {
            coastalLandBonus: 32,  // Moderate coastal moisture
            spread: 6,             // Moderate penetration inland
          },
          noise: {
            baseSpanSmall: 4,
            spanLargeScaleFactor: 1.0,
            scale: 0.13,
          },
        },
        swatches: {
          enabled: true,
          types: {
            // Desert band - balanced
            macroDesertBelt: {
              weight: 28,
              latitudeCenterDeg: 26,
              halfWidthDeg: 10,
              drynessDelta: 20,
            },
            // Continental interior drying
            greatPlains: {
              weight: 22,
              latitudeCenterDeg: 42,
              halfWidthDeg: 8,
              dryDelta: 12,
              lowlandMaxElevation: 320,
            },
            // Wet mountains for contrast
            mountainForests: {
              weight: 25,
              elevationThreshold: 280,
              wetBonus: 14,
            },
            // Tropical rain variety
            equatorialRainbelt: {
              weight: 25,
              latitudeCenterDeg: 5,
              halfWidthDeg: 10,
              wetnessDelta: 16,
            },
          },
          sizeScaling: {
            widthMulSqrt: 0.3,
          },
        },
        refine: {
          waterGradient: {
            radius: 6,
            perRingBonus: 4,
            lowlandBonus: 5,
          },
          orographic: {
            steps: 5,
            reductionBase: 14,
            reductionPerStep: 6,
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
    },
  },
  "hydrology-core": {
    rivers: { climate: { story: { paleo: {} } } },
  },
  "narrative-post": {
    storyCorridorsPost: {
      corridors: {
        sea: {},
        land: {},
        river: {},
        islandHop: {},
      },
    },
  },
  "hydrology-post": {
    climateRefine: {
      climate: {
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
            deg10to20: 100,
            deg20to35: 55,         // Moderate subtropical band
            deg35to55: 82,
            deg55to70: 68,
            deg70plus: 45,
            edges: {
              deg0to10: 10,
              deg10to20: 20,
              deg20to35: 35,
              deg35to55: 55,
              deg55to70: 70,
            },
            transitionWidth: 10,   // Slightly wider: smoother biome transitions
          },
          sizeScaling: {
            baseArea: 10000,
            minScale: 0.6,
            maxScale: 2.0,
            equatorBoostScale: 12,
            equatorBoostTaper: 0.6,
          },
          orographic: {
            hi1Threshold: 300,     // Lower threshold: more tiles get uplift rainfall
            hi1Bonus: 10,          // Increased: mountains wetter on windward side
            hi2Threshold: 550,
            hi2Bonus: 9,
          },
          coastal: {
            coastalLandBonus: 32,  // Moderate coastal moisture
            spread: 6,             // Moderate penetration inland
          },
          noise: {
            baseSpanSmall: 4,
            spanLargeScaleFactor: 1.0,
            scale: 0.13,
          },
        },
        swatches: {
          enabled: true,
          types: {
            // Desert band - balanced
            macroDesertBelt: {
              weight: 28,
              latitudeCenterDeg: 26,
              halfWidthDeg: 10,
              drynessDelta: 20,
            },
            // Continental interior drying
            greatPlains: {
              weight: 22,
              latitudeCenterDeg: 42,
              halfWidthDeg: 8,
              dryDelta: 12,
              lowlandMaxElevation: 320,
            },
            // Wet mountains for contrast
            mountainForests: {
              weight: 25,
              elevationThreshold: 280,
              wetBonus: 14,
            },
            // Tropical rain variety
            equatorialRainbelt: {
              weight: 25,
              latitudeCenterDeg: 5,
              halfWidthDeg: 10,
              wetnessDelta: 16,
            },
          },
          sizeScaling: {
            widthMulSqrt: 0.3,
          },
        },
        refine: {
          waterGradient: {
            radius: 6,
            perRingBonus: 4,
            lowlandBonus: 5,
          },
          orographic: {
            steps: 5,
            reductionBase: 14,
            reductionPerStep: 6,
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
      story: { orogeny: {} },
    },
  },
  ecology: {
    biomes: {
      classify: {
        strategy: "default",
        config: {
          temperature: {
            equator: 30,
            pole: -8,
            lapseRate: 6.5,
            seaLevel: 0,
            bias: 0.5,             // Reduced from 2.5: allows more cold biomes (tundra, boreal)
            polarCutoff: -5,
            tundraCutoff: 2,
            midLatitude: 12,
            tropicalThreshold: 24,
          },
          moisture: {
            thresholds: [50, 95, 140, 190] as [number, number, number, number],  // Widened: more graduated biome transitions
            bias: 0,               // Neutral: let rainfall bands drive distribution
            humidityWeight: 0.35,
          },
          aridity: {
            temperatureMin: 0,
            temperatureMax: 35,
            petBase: 20,           // Moderate evaporation demand
            petTemperatureWeight: 78,  // Moderate temperature effect
            humidityDampening: 0.52,   // Humidity provides some protection
            rainfallWeight: 0.95,  // Rainfall offsets aridity reasonably
            bias: 3,               // Slight push toward aridity (was 8, too aggressive)
            normalization: 118,    // More reasonable normalization
            moistureShiftThresholds: [0.42, 0.65] as [number, number],  // Less aggressive thresholds
            vegetationPenalty: 0.14,  // Moderate sparse vegetation in arid areas
          },
          freeze: {
            minTemperature: -12,
            maxTemperature: 2,
          },
          vegetation: {
            base: 0.22,            // Reduced from 0.35: more contrast between lush and sparse areas
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
    features: {
      featuresPlacement: {
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
                tundra: 0.08,
                boreal: 0.14,
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
              tundraTaigaMinTemperature: -6,
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
              nearRiverRadius: 2.2,
              coldTemperatureMax: 2.2,
              coldBiomeSymbols: ["snow", "tundra", "boreal"],
              mangroveWarmTemperatureMin: 14,
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
                clusterRadius: 2,
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
      },
      reefEmbellishments: {
        strategy: "default",
        config: {
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
          featuresDensity: {
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
          },
        },
      },
      vegetationEmbellishments: {
        strategy: "default",
        config: {
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
          featuresDensity: {
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
          },
        },
      },
    },
    plotEffects: {
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
            allowedBiomes: ["desert", "temperateDry"] as [
              "desert",
              "temperateDry",
            ],
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
      },
    },
  },
  placement: {
    derivePlacementInputs: {
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
