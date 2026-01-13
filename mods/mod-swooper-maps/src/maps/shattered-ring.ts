/**
 * The Shattered Ring — Post-impact crater world (TypeScript)
 *
 * A world forever changed by an ancient asteroid impact:
 * - Central crater sea (~62% water) with volcanic islands
 * - Ring mountains from impact shockwave upheaval
 * - Radial geography with diverse climate zones
 * - Three theaters: inner sea (naval), ring (defensive), outer lands (expansive)
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
    mesh: {
      computeMesh: {
        strategy: "default",
        config: { plateCount: 28, cellsPerPlate: 2, relaxationSteps: 6 },
      },
    },
    "plate-graph": {
      computePlateGraph: {
        strategy: "default",
        config: { plateCount: 28 },
      },
    },
  },
  "morphology-pre": {
    "landmass-plates": {
      landmass: {
        // Central crater sea with ring continent
        baseWaterPercent: 62,
        waterScalar: 1,
        // Sharp continental edges from impact scarring
        crustEdgeBlend: 0.15,
        crustNoiseAmplitude: 0.12,
        continentalHeight: 0.45,
        oceanicHeight: -0.8,
        // Strong plate-driven coasts for ring structure
        boundaryBias: 0.45,
        boundaryShareTarget: 0.35,
        tectonics: {
          // Strong coastal arcs for ring formation
          boundaryArcWeight: 0.55,
          boundaryArcNoiseWeight: 0.4,
          interiorNoiseWeight: 0.6,
          fractalGrain: 6,
        },
      },
      oceanSeparation: {
        enabled: false,
        baseSeparationTiles: 0,
        boundaryClosenessMultiplier: 1.0,
        maxPerRowDelta: 4,
        minChannelWidth: 5,
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
        // High active fraction for ring volcanism
        activeFraction: 0.45,
        passiveFraction: 0.15,
        minSegmentLength: 10,
      },
    },
    "story-hotspots": {
      story: {
        hotspot: {
          paradiseBias: 2,
          volcanicBias: 2,
          volcanicPeakChance: 0.4,
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
          threshold: 0.4,
          power: 1.4,
          // Strong convergent coasts for ring mountains
          convergent: 2.2,
          transform: 0.3,
          divergent: -0.3,
          interior: 0.5,
          // Complex coastlines from fracturing
          bayWeight: 0.9,
          bayNoiseBonus: 0.6,
          fjordWeight: 0.7,
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
          paradiseBias: 2,
          volcanicBias: 2,
          volcanicPeakChance: 0.4,
        },
      },
      corridors: { sea: {} },
    },
    mountains: {
      mountains: {
        // High intensity for ring mountain formation
        tectonicIntensity: 0.85,
        mountainThreshold: 0.5,
        hillThreshold: 0.3,
        upliftWeight: 0.45,
        fractalWeight: 0.25,
        riftDepth: 0.35,
        // Strong emphasis on plate boundaries for the ring
        boundaryWeight: 1.2,
        boundaryGate: 0.05,
        boundaryExponent: 1.8,
        interiorPenaltyWeight: 0.0,
        convergenceBonus: 0.85,
        transformPenalty: 0.5,
        riftPenalty: 0.8,
        hillBoundaryWeight: 0.4,
        hillRiftBonus: 0.3,
        hillConvergentFoothill: 0.45,
        hillInteriorFalloff: 0.15,
        hillUpliftWeight: 0.25,
      },
    },
    volcanoes: {
      volcanoes: {
        // High volcanic activity in crater sea
        baseDensity: 1 / 140,
        minSpacing: 3,
        boundaryThreshold: 0.25,
        boundaryWeight: 1.4,
        convergentMultiplier: 2.8,
        transformMultiplier: 1.2,
        divergentMultiplier: 0.5,
        // Strong hotspot activity for crater islands
        hotspotWeight: 0.45,
        shieldPenalty: 0.4,
        randomJitter: 0.12,
        minVolcanoes: 8,
        maxVolcanoes: 40,
      },
    },
  },
  "hydrology-pre": {
    lakes: {},
    "climate-baseline": {
      climate: {
        baseline: {
          blend: {
            baseWeight: 0.2,
            bandWeight: 0.8,
          },
          seed: {
            baseRainfall: 35,
            coastalExponent: 1.3,
          },
          bands: {
            // Moderate tropical due to ring disruption
            deg0to10: 108,
            deg10to20: 90,
            // Strong ring mountain rain shadow
            deg20to35: 40,
            deg35to55: 78,
            deg55to70: 55,
            deg70plus: 35,
            edges: {
              deg0to10: 10,
              deg10to20: 20,
              deg20to35: 35,
              deg35to55: 55,
              deg55to70: 70,
            },
            transitionWidth: 7,
          },
          sizeScaling: {
            baseArea: 10000,
            minScale: 0.7,
            maxScale: 2.0,
            equatorBoostScale: 8,
            equatorBoostTaper: 0.5,
          },
          orographic: {
            hi1Threshold: 300,
            hi1Bonus: 9,
            hi2Threshold: 550,
            hi2Bonus: 10,
          },
          coastal: {
            coastalLandBonus: 24,
            spread: 4,
          },
          noise: {
            baseSpanSmall: 4,
            spanLargeScaleFactor: 1.1,
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
            baseWeight: 0.2,
            bandWeight: 0.8,
          },
          seed: {
            baseRainfall: 35,
            coastalExponent: 1.3,
          },
          bands: {
            // Moderate tropical due to ring disruption
            deg0to10: 108,
            deg10to20: 90,
            // Strong ring mountain rain shadow
            deg20to35: 40,
            deg35to55: 78,
            deg55to70: 55,
            deg70plus: 35,
            edges: {
              deg0to10: 10,
              deg10to20: 20,
              deg20to35: 35,
              deg35to55: 55,
              deg55to70: 70,
            },
            transitionWidth: 7,
          },
          sizeScaling: {
            baseArea: 10000,
            minScale: 0.7,
            maxScale: 2.0,
            equatorBoostScale: 8,
            equatorBoostTaper: 0.5,
          },
          orographic: {
            hi1Threshold: 300,
            hi1Bonus: 9,
            hi2Threshold: 550,
            hi2Bonus: 10,
          },
          coastal: {
            coastalLandBonus: 24,
            spread: 4,
          },
          noise: {
            baseSpanSmall: 4,
            spanLargeScaleFactor: 1.1,
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
            radius: 5,
            perRingBonus: 3,
            lowlandBonus: 4,
          },
          orographic: {
            steps: 4,
            reductionBase: 12,
            reductionPerStep: 7,
          },
          riverCorridor: {
            lowlandAdjacencyBonus: 15,
            highlandAdjacencyBonus: 6,
          },
          lowBasin: {
            radius: 3,
            delta: 8,
          },
        },
        story: {
          rainfall: {
            riftBoost: 9,
            riftRadius: 2,
            paradiseDelta: 7,
            volcanicDelta: 9,
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
            baseWeight: 0.2,
            bandWeight: 0.8,
          },
          seed: {
            baseRainfall: 35,
            coastalExponent: 1.3,
          },
          bands: {
            // Moderate tropical due to ring disruption
            deg0to10: 108,
            deg10to20: 90,
            // Strong ring mountain rain shadow
            deg20to35: 40,
            deg35to55: 78,
            deg55to70: 55,
            deg70plus: 35,
            edges: {
              deg0to10: 10,
              deg10to20: 20,
              deg20to35: 35,
              deg35to55: 55,
              deg55to70: 70,
            },
            transitionWidth: 7,
          },
          sizeScaling: {
            baseArea: 10000,
            minScale: 0.7,
            maxScale: 2.0,
            equatorBoostScale: 8,
            equatorBoostTaper: 0.5,
          },
          orographic: {
            hi1Threshold: 300,
            hi1Bonus: 9,
            hi2Threshold: 550,
            hi2Bonus: 10,
          },
          coastal: {
            coastalLandBonus: 24,
            spread: 4,
          },
          noise: {
            baseSpanSmall: 4,
            spanLargeScaleFactor: 1.1,
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
            radius: 5,
            perRingBonus: 3,
            lowlandBonus: 4,
          },
          orographic: {
            steps: 4,
            reductionBase: 12,
            reductionPerStep: 7,
          },
          riverCorridor: {
            lowlandAdjacencyBonus: 15,
            highlandAdjacencyBonus: 6,
          },
          lowBasin: {
            radius: 3,
            delta: 8,
          },
        },
        story: {
          rainfall: {
            riftBoost: 9,
            riftRadius: 2,
            paradiseDelta: 7,
            volcanicDelta: 9,
          },
        },
      },
      story: { orogeny: {} },
    },
  },
  ecology: {
    // New ecology steps with strategy selections for volcanic ring world
    pedology: {
      classify: { strategy: "orogeny-boosted", config: {} },  // Volcanic terrain soils
    },
    resourceBasins: {
      plan: { strategy: "default", config: {} },
      score: { strategy: "default", config: {} },
    },
    biomeEdgeRefine: {
      refine: { strategy: "default", config: {} },
    },
    featuresPlan: {
      vegetation: { strategy: "clustered", config: {} },     // Volcanic forest clusters
      wetlands: { strategy: "delta-focused", config: {} },   // Volcanic valley wetlands
      reefs: { strategy: "default", config: {} },
      ice: { strategy: "default", config: {} },
    },
    biomes: {
      classify: {
        strategy: "default",
        config: {
          temperature: {
            equator: 30,
            pole: -8,
            lapseRate: 7.5,
            seaLevel: 0,
            bias: 1.5,
            polarCutoff: -5,
            tundraCutoff: 2,
            midLatitude: 12,
            tropicalThreshold: 24,
          },
          moisture: {
            thresholds: [75, 105, 140, 185] as [number, number, number, number],
            bias: 0.1,
            humidityWeight: 0.35,
          },
          aridity: {
            temperatureMin: 0,
            temperatureMax: 35,
            petBase: 20,
            petTemperatureWeight: 80,
            humidityDampening: 0.5,
            rainfallWeight: 1,
            bias: 3,
            normalization: 115,
            moistureShiftThresholds: [0.42, 0.68] as [number, number],
            vegetationPenalty: 0.16,
          },
          freeze: {
            minTemperature: -10,
            maxTemperature: 3,
          },
          vegetation: {
            base: 0.28,
            moistureWeight: 0.6,
            humidityWeight: 0.3,
            moistureNormalizationPadding: 55,
            biomeModifiers: {
              snow: { multiplier: 0.4, bonus: 0 },
              tundra: { multiplier: 0.5, bonus: 0 },
              boreal: { multiplier: 0.8, bonus: 0 },
              temperateDry: { multiplier: 0.7, bonus: 0 },
              temperateHumid: { multiplier: 0.95, bonus: 0 },
              tropicalSeasonal: { multiplier: 0.95, bonus: 0 },
              tropicalRainforest: { multiplier: 1, bonus: 0.2 },
              desert: { multiplier: 0.1, bonus: 0 },
            },
          },
          noise: {
            amplitude: 0.03,
            seed: 1337,
          },
          overlays: {
            corridorMoistureBonus: 8,
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
            coverageChance: 55,
            freezeWeight: 1.0,
            elevationWeight: 1.0,
            moistureWeight: 0.6,
            scoreNormalization: 2.7,
            scoreBias: 0,
            lightThreshold: 0.4,
            mediumThreshold: 0.65,
            heavyThreshold: 0.82,
            elevationStrategy: "percentile" as const,
            elevationMin: 250,
            elevationMax: 3000,
            elevationPercentileMin: 0.78,
            elevationPercentileMax: 0.98,
            moistureMin: 40,
            moistureMax: 150,
            maxTemperature: 4,
            maxAridity: 0.85,
          },
          sand: {
            enabled: true,
            selector: {
              typeName: "PLOTEFFECT_SAND",
            },
            chance: 10,
            minAridity: 0.65,
            minTemperature: 22,
            maxFreeze: 0.25,
            maxVegetation: 0.15,
            maxMoisture: 85,
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
            chance: 16,            // More volcanic scorched earth
            minAridity: 0.42,      // Capture more volcanic tiles
            minTemperature: 18,
            maxFreeze: 0.25,
            maxVegetation: 0.35,   // Allow more in volcanic areas
            maxMoisture: 120,
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

wireStandardMapEntry({
  engine,
  recipe: standardRecipe,
  config,
  options: runtimeOptions,
});
