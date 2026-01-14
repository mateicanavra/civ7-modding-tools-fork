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
    mesh: {
      computeMesh: {
        strategy: "default",
        config: {
          plateCount: 28,             // Reduced: Earth has ~15 major + minor plates
          cellsPerPlate: 3,           // Increased: more detail per plate
          relaxationSteps: 6,         // Smoother plate boundaries
          referenceArea: 4000,        // Standard reference
          plateScalePower: 0.5,       // Standard scaling
        },
      },
    },
    crust: {
      computeCrust: {
        strategy: "default",
        config: {
          continentalRatio: 0.29,     // Earth: ~29% continental crust
        },
      },
    },
    "plate-graph": {
      computePlateGraph: {
        strategy: "default",
        config: {
          plateCount: 28,             // Match mesh plateCount
          referenceArea: 4000,
          plateScalePower: 0.5,
        },
      },
    },
  },
  "morphology-pre": {
    "landmass-plates": {
      landmass: {
        // Earth-like ocean dominance (~70% water).
        baseWaterPercent: 71,           // True Earth ratio
        waterScalar: 1,
        // Continental distribution (Earth-like)
        continentalFraction: 0.29,      // Match crust ratio
        clusteringBias: 0.35,           // Balanced: some clustering, not Pangaea
        microcontinentChance: 0.12,     // Occasional Zealandia/Madagascar-like shards
        // Crust-first height tuning to preserve water even with broken boundary fields.
        crustEdgeBlend: 0.38,           // Wider continental shelves (Earth-like)
        crustNoiseAmplitude: 0.12,      // Slight variation in continental thickness
        continentalHeight: 0.38,        // Slightly reduced for realistic hypsometry
        oceanicHeight: -0.72,           // Slightly shallower ocean basins
        // Moderate margin bias: enough active coasts, plenty of passive shelves.
        boundaryBias: 0.22,             // Slightly higher for plate-driven coastlines
        boundaryShareTarget: 0.18,      // ~18% land at plate boundaries
        tectonics: {
          // Favor coastal arcs (Andes/Ring of Fire) but keep thick interiors.
          boundaryArcWeight: 0.40,      // Slightly stronger coastal arcs
          boundaryArcNoiseWeight: 0.32, // Less noise for cleaner arcs
          interiorNoiseWeight: 0.52,    // Smoother continental interiors
          fractalGrain: 4,              // Slightly coarser for larger landmass shapes
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
    "story-seed": {
      margins: {
        activeFraction: 0.33,
        passiveFraction: 0.22,
        minSegmentLength: 12,
      },
    },
    "story-hotspots": {
      story: {
        hotspot: {
          paradiseBias: 2,
          volcanicBias: 1,
          volcanicPeakChance: 0.33,
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
        // Earth-like coastal features
        bay: {
          noiseGateAdd: 0.05,           // Slight noise gate for natural variation
          rollDenActive: 5,             // Moderate bays on active margins
          rollDenDefault: 6,            // Fewer bays on passive margins
        },
        fjord: {
          baseDenom: 14,                // Less frequent fjords (Earth average)
          activeBonus: 2,               // More fjords at convergent margins
          passiveBonus: 1,              // Rare fjords on passive margins
        },
        minSeaLaneWidth: 3,             // Preserve navigable straits
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
      islands: {
        // Earth-like island distribution
        fractalThresholdPercent: 88,    // Moderate island density
        minDistFromLandRadius: 3,       // Keep islands separate from continents
        baseIslandDenNearActive: 4,     // More islands near subduction (Japan, Indonesia)
        baseIslandDenElse: 8,           // Fewer islands in passive regions
        hotspotSeedDenom: 2,            // Hawaii-style hotspot chains
        clusterMax: 4,                  // Moderate archipelago sizes
      },
      story: {
        hotspot: {
          paradiseBias: 2.2,            // Slight paradise preference
          volcanicBias: 1.3,            // Moderate volcanic activity
          volcanicPeakChance: 0.35,     // Some volcanic peaks
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
        // Boundary-dominant volcanism with a modest hotspot tail (Earth-like).
        enabled: true,
        baseDensity: 6 / 190,           // Slightly lower for Earth-like distribution
        minSpacing: 5,                  // Good spacing between volcanoes
        boundaryThreshold: 0.32,        // Slightly lower for more boundary influence
        boundaryWeight: 1.15,           // Moderate boundary emphasis
        convergentMultiplier: 2.8,      // Strong Ring of Fire emphasis
        transformMultiplier: 0.9,       // Less transform volcanism
        divergentMultiplier: 0.35,      // Low divergent volcanism (mostly underwater)
        hotspotWeight: 0.20,            // Moderate hotspot chains (Hawaii, Iceland)
        shieldPenalty: 0.45,            // Cratons suppress volcanism
        randomJitter: 0.06,             // Less random, more plate-driven
        minVolcanoes: 8,                // Ensure some volcanic activity
        maxVolcanoes: 35,               // Cap total for Earth-like feel
      },
    },
  },
  "hydrology-pre": {
    lakes: {},
    "climate-baseline": {
      computeWindFields: {
        strategy: "default",
        config: {
          windJetStreaks: 3,
          windJetStrength: 1.0,
          windVariance: 0.6,
        },
      },
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
    "story-swatches": {
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
          enabled: false,
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
          enabled: false,
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
    // New ecology steps with strategy selections
    pedology: {
      classify: { strategy: "default", config: {} },
    },
    resourceBasins: {
      plan: { strategy: "mixed", config: {} },  // Variety in resource distribution
      score: { strategy: "default", config: {} },
    },
    biomeEdgeRefine: {
      refine: { strategy: "gaussian", config: {} },  // Smoother Earth-like biome transitions
    },
    featuresPlan: {
      vegetation: { strategy: "clustered", config: {} },  // Natural forest grouping
      wetlands: { strategy: "delta-focused", config: {} },  // River-mouth wetlands
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
            chance: 18,            // Increased for more visible deserts
            minAridity: 0.55,      // Lowered to catch more desert tiles
            minTemperature: 16,    // Lowered for cooler desert edges
            maxFreeze: 0.25,
            maxVegetation: 0.18,
            maxMoisture: 85,
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
