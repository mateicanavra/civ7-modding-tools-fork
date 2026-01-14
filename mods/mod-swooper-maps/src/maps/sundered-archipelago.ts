/**
 * The Sundered Archipelago — Volcanic island chains and sunken continents (TypeScript)
 *
 * A world where massive tectonic rifting has shattered ancient continents:
 * - Hundreds of islands rather than continents (~82% water)
 * - Volcanic chains from active hotspots and subduction zones
 * - Shallow seas with coral reefs connecting island clusters
 * - Strategic straits and maritime corridors
 *
 * Designed by Claude Code's map-designer agent.
 */

/// <reference types="@civ7/types" />

import "@swooper/mapgen-core/polyfills/text-encoder";
import standardRecipe from "../recipes/standard/recipe.js";
import type { StandardRecipeConfig } from "../recipes/standard/recipe.js";
import type { MapRuntimeOptions } from "./_runtime/types.js";
import { wireStandardMapEntry } from "./_runtime/standard-entry.js";

const config = {
  foundation: {
    computeMesh: {
      strategy: "default",
      config: { plateCount: 32, relaxationSteps: 4 },
    },
    computePlateGraph: {
      strategy: "default",
      config: { plateCount: 32 },
    },
    computePlates: {
      strategy: "default",
      config: {
        plateCount: 32,
        convergenceMix: 0.75,
        relaxationSteps: 4,
        plateRotationMultiple: 1.8,
      },
    },
    computeDynamics: {
      strategy: "default",
      config: {
        windJetStreaks: 5,
        windJetStrength: 0.85,
        windVariance: 0.8,
        mantleBumps: 7,
        mantleAmplitude: 0.9,
        mantleScale: 0.4,
      },
    },
  },
  "morphology-pre": {
    "landmass-plates": {
      landmass: {
        // Less water, but fragmented into islands not continents
        baseWaterPercent: 65,
        waterScalar: 1,
        // Sharp edges to fragment land into islands
        crustEdgeBlend: 0.2,
        crustNoiseAmplitude: 0.25,
        // Normal continental height (was too low before!)
        continentalHeight: 0.45,
        oceanicHeight: -0.7,
        // Maximum boundary influence - all land at plate edges
        boundaryBias: 0.75,
        boundaryShareTarget: 0.65,
        tectonics: {
          // Maximum boundary arc weight - islands form along plate edges only
          boundaryArcWeight: 0.85,
          boundaryArcNoiseWeight: 0.7,
          // Minimal interior weight - no continental cores
          interiorNoiseWeight: 0.15,
          fractalGrain: 8,
        },
      },
      oceanSeparation: {
        enabled: false,
        baseSeparationTiles: 0,
        boundaryClosenessMultiplier: 1.0,
        maxPerRowDelta: 5,
        minChannelWidth: 3,
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
    "story-seed": {
      margins: {
        // Very high active fraction for volcanic arcs
        activeFraction: 0.55,
        passiveFraction: 0.12,
        minSegmentLength: 8,
      },
    },
    "story-hotspots": {
      story: {
        hotspot: {
          paradiseBias: 3,
          volcanicBias: 3,
          volcanicPeakChance: 0.5,
        },
      },
    },
    "story-rifts": { story: { rift: {} } },
    "story-corridors-pre": {
      corridors: {
        sea: {},
        land: {},
        river: {},
        islandHop: {},
      },
    },
  },
  "morphology-mid": {
    "rugged-coasts": {
      coastlines: {
        plateBias: {
          threshold: 0.35,
          power: 1.5,
          // Strong convergent coasts for island arcs
          convergent: 2.0,
          transform: 0.5,
          divergent: -0.2,
          interior: 0.3,
          // Very complex coastlines for island detail
          bayWeight: 1.2,
          bayNoiseBonus: 0.8,
          fjordWeight: 0.9,
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
  },
  "morphology-post": {
    islands: {
      islands: {},
      story: {
        hotspot: {
          paradiseBias: 3,
          volcanicBias: 3,
          volcanicPeakChance: 0.5,
        },
      },
      corridors: { sea: {} },
    },
    mountains: {
      mountains: {
        // Focused volcanic peaks rather than ranges
        tectonicIntensity: 0.7,
        mountainThreshold: 0.55,
        hillThreshold: 0.28,
        upliftWeight: 0.3,
        fractalWeight: 0.35,
        riftDepth: 0.4,
        // Strong boundary influence for arc volcanism
        boundaryWeight: 1.0,
        boundaryGate: 0.05,
        boundaryExponent: 1.5,
        interiorPenaltyWeight: 0.1,
        convergenceBonus: 0.9,
        transformPenalty: 0.4,
        riftPenalty: 0.6,
        hillBoundaryWeight: 0.5,
        hillRiftBonus: 0.35,
        hillConvergentFoothill: 0.4,
        hillInteriorFalloff: 0.2,
        hillUpliftWeight: 0.3,
      },
    },
    volcanoes: {
      volcanoes: {
        // High volcanic density for island chains
        baseDensity: 1 / 100,
        minSpacing: 2,
        boundaryThreshold: 0.2,
        boundaryWeight: 1.5,
        convergentMultiplier: 3.0,
        transformMultiplier: 1.3,
        divergentMultiplier: 0.6,
        // Maximum hotspot activity for volcanic chains
        hotspotWeight: 0.55,
        shieldPenalty: 0.3,
        randomJitter: 0.15,
        minVolcanoes: 12,
        maxVolcanoes: 55,
      },
    },
  },
  "hydrology-pre": {
    lakes: {},
    "climate-baseline": {
      climate: {
        baseline: {
          blend: {
            baseWeight: 0.25,
            bandWeight: 0.75,
          },
          seed: {
            baseRainfall: 65,
            coastalExponent: 1.1,
          },
          bands: {
            // Very wet tropical maritime climate
            deg0to10: 165,
            deg10to20: 145,
            deg20to35: 115,
            deg35to55: 85,
            deg55to70: 65,
            deg70plus: 40,
            edges: {
              deg0to10: 10,
              deg10to20: 20,
              deg20to35: 35,
              deg35to55: 55,
              deg55to70: 70,
            },
            transitionWidth: 9,
          },
          sizeScaling: {
            baseArea: 10000,
            minScale: 0.6,
            maxScale: 2.2,
            equatorBoostScale: 14,
            equatorBoostTaper: 0.7,
          },
          orographic: {
            hi1Threshold: 300,
            hi1Bonus: 8,
            hi2Threshold: 550,
            hi2Bonus: 7,
          },
          coastal: {
            coastalLandBonus: 30,
            spread: 6,
          },
          noise: {
            baseSpanSmall: 4,
            spanLargeScaleFactor: 1.0,
            scale: 0.12,
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
            baseWeight: 0.25,
            bandWeight: 0.75,
          },
          seed: {
            baseRainfall: 65,
            coastalExponent: 1.1,
          },
          bands: {
            // Very wet tropical maritime climate
            deg0to10: 165,
            deg10to20: 145,
            deg20to35: 115,
            deg35to55: 85,
            deg55to70: 65,
            deg70plus: 40,
            edges: {
              deg0to10: 10,
              deg10to20: 20,
              deg20to35: 35,
              deg35to55: 55,
              deg55to70: 70,
            },
            transitionWidth: 9,
          },
          sizeScaling: {
            baseArea: 10000,
            minScale: 0.6,
            maxScale: 2.2,
            equatorBoostScale: 14,
            equatorBoostTaper: 0.7,
          },
          orographic: {
            hi1Threshold: 300,
            hi1Bonus: 8,
            hi2Threshold: 550,
            hi2Bonus: 7,
          },
          coastal: {
            coastalLandBonus: 30,
            spread: 6,
          },
          noise: {
            baseSpanSmall: 4,
            spanLargeScaleFactor: 1.0,
            scale: 0.12,
          },
        },
        swatches: {
          enabled: true,
          sizeScaling: {
            widthMulSqrt: 0.3,
            lengthMulSqrt: 0.4,
          },
          types: {
            macroDesertBelt: {
              weight: 8,
              latitudeCenterDeg: 20,
              halfWidthDeg: 12,
              drynessDelta: 28,
              bleedRadius: 3,
            },
            equatorialRainbelt: {
              weight: 3,
              latitudeCenterDeg: 0,
              halfWidthDeg: 10,
              wetnessDelta: 24,
              bleedRadius: 3,
            },
            rainforestArchipelago: {
              weight: 7,
              islandBias: 2,
              reefBias: 1,
              wetnessDelta: 18,
              bleedRadius: 3,
            },
            mountainForests: {
              weight: 2,
              coupleToOrogeny: true,
              windwardBonus: 6,
              leePenalty: 2,
              bleedRadius: 3,
            },
            greatPlains: {
              weight: 5,
              latitudeCenterDeg: 45,
              halfWidthDeg: 8,
              dryDelta: 12,
              lowlandMaxElevation: 300,
              bleedRadius: 4,
            },
          },
        },
        refine: {
          waterGradient: {
            radius: 6,
            perRingBonus: 5,
            lowlandBonus: 6,
          },
          orographic: {
            steps: 4,
            reductionBase: 8,
            reductionPerStep: 4,
          },
          riverCorridor: {
            lowlandAdjacencyBonus: 18,
            highlandAdjacencyBonus: 7,
          },
          lowBasin: {
            radius: 3,
            delta: 6,
          },
        },
        story: {
          rainfall: {
            riftBoost: 10,
            riftRadius: 2,
            paradiseDelta: 8,
            volcanicDelta: 12,
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
            baseWeight: 0.25,
            bandWeight: 0.75,
          },
          seed: {
            baseRainfall: 65,
            coastalExponent: 1.1,
          },
          bands: {
            // Very wet tropical maritime climate
            deg0to10: 165,
            deg10to20: 145,
            deg20to35: 115,
            deg35to55: 85,
            deg55to70: 65,
            deg70plus: 40,
            edges: {
              deg0to10: 10,
              deg10to20: 20,
              deg20to35: 35,
              deg35to55: 55,
              deg55to70: 70,
            },
            transitionWidth: 9,
          },
          sizeScaling: {
            baseArea: 10000,
            minScale: 0.6,
            maxScale: 2.2,
            equatorBoostScale: 14,
            equatorBoostTaper: 0.7,
          },
          orographic: {
            hi1Threshold: 300,
            hi1Bonus: 8,
            hi2Threshold: 550,
            hi2Bonus: 7,
          },
          coastal: {
            coastalLandBonus: 30,
            spread: 6,
          },
          noise: {
            baseSpanSmall: 4,
            spanLargeScaleFactor: 1.0,
            scale: 0.12,
          },
        },
        swatches: {
          enabled: true,
          sizeScaling: {
            widthMulSqrt: 0.3,
            lengthMulSqrt: 0.4,
          },
          types: {
            macroDesertBelt: {
              weight: 8,
              latitudeCenterDeg: 20,
              halfWidthDeg: 12,
              drynessDelta: 28,
              bleedRadius: 3,
            },
            equatorialRainbelt: {
              weight: 3,
              latitudeCenterDeg: 0,
              halfWidthDeg: 10,
              wetnessDelta: 24,
              bleedRadius: 3,
            },
            rainforestArchipelago: {
              weight: 7,
              islandBias: 2,
              reefBias: 1,
              wetnessDelta: 18,
              bleedRadius: 3,
            },
            mountainForests: {
              weight: 2,
              coupleToOrogeny: true,
              windwardBonus: 6,
              leePenalty: 2,
              bleedRadius: 3,
            },
            greatPlains: {
              weight: 5,
              latitudeCenterDeg: 45,
              halfWidthDeg: 8,
              dryDelta: 12,
              lowlandMaxElevation: 300,
              bleedRadius: 4,
            },
          },
        },
        refine: {
          waterGradient: {
            radius: 6,
            perRingBonus: 5,
            lowlandBonus: 6,
          },
          orographic: {
            steps: 4,
            reductionBase: 8,
            reductionPerStep: 4,
          },
          riverCorridor: {
            lowlandAdjacencyBonus: 18,
            highlandAdjacencyBonus: 7,
          },
          lowBasin: {
            radius: 3,
            delta: 6,
          },
        },
        story: {
          rainfall: {
            riftBoost: 10,
            riftRadius: 2,
            paradiseDelta: 8,
            volcanicDelta: 12,
          },
        },
      },
      story: { orogeny: {} },
    },
  },
  ecology: {
    // New ecology steps with strategy selections for tropical island world
    pedology: {
      classify: { strategy: "coastal-shelf", config: {} },  // Island-focused coastal soils
    },
    resourceBasins: {
      plan: { strategy: "hydro-fluvial", config: {} },      // Water-focused resources
      score: { strategy: "default", config: {} },
    },
    biomeEdgeRefine: {
      refine: { strategy: "gaussian", config: {} },         // Smooth tropical biome blending
    },
    featuresPlan: {
      vegetation: { strategy: "clustered", config: {} },    // Tropical rainforest clusters
      wetlands: { strategy: "delta-focused", config: {} },  // Mangrove deltas
      reefs: { strategy: "shipping-lanes", config: {} },    // Island chain reef patterns
      ice: { strategy: "default", config: {} },             // Minimal polar ice
    },
    biomes: {
      classify: {
        strategy: "default",
        config: {
          temperature: {
            equator: 31,
            pole: -5,
            lapseRate: 6.5,
            seaLevel: 0,
            bias: 2,
            polarCutoff: -4,
            tundraCutoff: 3,
            midLatitude: 14,
            tropicalThreshold: 25,
          },
          moisture: {
            thresholds: [85, 115, 160, 210] as [number, number, number, number],
            bias: 0.15,
            humidityWeight: 0.35,
          },
          aridity: {
            temperatureMin: 2,
            temperatureMax: 36,
            petBase: 22,
            petTemperatureWeight: 85,
            humidityDampening: 0.6,
            rainfallWeight: 1,
            bias: 0,
            normalization: 140,
            moistureShiftThresholds: [0.45, 0.7] as [number, number],
            vegetationPenalty: 0.1,
          },
          freeze: {
            minTemperature: -9,
            maxTemperature: 4,
          },
          vegetation: {
            base: 0.4,
            moistureWeight: 0.7,
            humidityWeight: 0.4,
            moistureNormalizationPadding: 70,
            biomeModifiers: {
              snow: { multiplier: 0.5, bonus: 0 },
              tundra: { multiplier: 0.55, bonus: 0 },
              boreal: { multiplier: 0.9, bonus: 0 },
              temperateDry: { multiplier: 0.8, bonus: 0 },
              temperateHumid: { multiplier: 1, bonus: 0 },
              tropicalSeasonal: { multiplier: 1, bonus: 0 },
              tropicalRainforest: { multiplier: 1, bonus: 0.3 },
              desert: { multiplier: 0.15, bonus: 0 },
            },
          },
          noise: {
            amplitude: 0.03,
            seed: 1337,
          },
          overlays: {
            corridorMoistureBonus: 10,
            riftShoulderMoistureBonus: 6,
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
            coverageChance: 35,           // Reduced for tropical world
            freezeWeight: 0.9,
            elevationWeight: 0.8,
            moistureWeight: 0.7,
            scoreNormalization: 2.6,
            scoreBias: -0.1,              // Bias against snow
            lightThreshold: 0.45,         // Higher threshold
            mediumThreshold: 0.7,
            heavyThreshold: 0.85,
            elevationStrategy: "percentile" as const,
            elevationMin: 300,            // Only high elevations
            elevationMax: 2600,
            elevationPercentileMin: 0.82, // Only very high peaks
            elevationPercentileMax: 0.98,
            moistureMin: 70,
            moistureMax: 180,
            maxTemperature: 3,            // Stricter temperature
            maxAridity: 0.75,
          },
          sand: {
            enabled: false,               // Tropical islands don't have desert sand
            selector: {
              typeName: "PLOTEFFECT_SAND",
            },
            chance: 5,
            minAridity: 0.7,
            minTemperature: 24,
            maxFreeze: 0.2,
            maxVegetation: 0.1,
            maxMoisture: 70,
            allowedBiomes: ["desert", "temperateDry"] as [
              "desert",
              "temperateDry",
            ],
          },
          burned: {
            enabled: false,               // Lush tropical - no scorched earth
            selector: {
              typeName: "PLOTEFFECT_BURNED",
            },
            chance: 4,
            minAridity: 0.65,
            minTemperature: 26,
            maxFreeze: 0.15,
            maxVegetation: 0.15,
            maxMoisture: 90,
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
    "derive-placement-inputs": {
      wonders: { strategy: "default", config: { wondersPlusOne: true } },
      floodplains: { strategy: "default", config: { minLength: 4, maxLength: 10 } },
      starts: { strategy: "default", config: {} },
    },
    placement: {},
  },
} satisfies StandardRecipeConfig;

const runtimeOptions: MapRuntimeOptions = { logPrefix: "[SWOOPER_MOD]" };

wireStandardMapEntry({
  engine,
  recipe: standardRecipe,
  config,
  options: runtimeOptions,
});
