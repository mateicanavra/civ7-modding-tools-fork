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
          plateCount: 23,             // Fewer plates to reduce boundary fragmentation
          cellsPerPlate: 5,           // Larger plates with more internal area
          relaxationSteps: 5,         // Smoother plate boundaries
          referenceArea: 4000,        // Standard reference
          plateScalePower: 0.45,       // Standard scaling
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
          plateCount: 23,             // Match mesh plateCount
          referenceArea: 4000,
          plateScalePower: 0.45,
        },
      },
    },
    tectonics: {
      computeTectonics: {
        strategy: "default",
        config: {},
      },
    },
    projection: {
      computePlates: {
        strategy: "default",
        config: {
          boundaryInfluenceDistance: 7,
          boundaryDecay: 0.6,
          movementScale: 80,
          rotationScale: 80,
        },
      },
    },
  },
  "morphology-pre": {
    "landmass-plates": {
      substrate: {
        strategy: "default",
        config: {
          baseErodibility: 0.6,
          baseSediment: 0.2,
          upliftErodibilityBoost: 0.37,
          riftSedimentBoost: 0.37,
        },
      },
      baseTopography: {
        strategy: "default",
        config: {
          // Continental bias for broad landmasses with a few major continents.
          boundaryBias: 0.17,             // Further reduce boundary dominance to avoid arcs
          clusteringBias: 0.70,           // Stronger clustering to favor contiguous continents
          // Crust-first height tuning to avoid island-heavy hypsometry.
          crustEdgeBlend: 0.5,            // Wider continental shelves (Earth-like)
          crustNoiseAmplitude: 0.57,       // Smoother continental thickness
          continentalHeight: 0.6,         // Taller continental surfaces for robust land cores
          oceanicHeight: -0.87,           // Deeper ocean basins to keep coasts stable
          tectonics: {
            // De-emphasize arcs so plate boundaries don't dominate land distribution.
            boundaryArcWeight: 0.2,       // Reduce arc emphasis
            boundaryArcNoiseWeight: 0.18, // Less boundary noise
            interiorNoiseWeight: 0.7,     // Stronger continental interior shaping
            fractalGrain: 3,              // Coarser grain for larger landmass shapes
          },
        },
      },
      seaLevel: {
        strategy: "default",
        config: {
          // Earth-like ocean dominance, tuned to avoid archipelago output.
          targetWaterPercent: 67,         // Dial back to preserve contiguous continents
          targetScalar: 1,
          variance: 0,
          boundaryShareTarget: 0.1,       // Reduce boundary land share
          continentalFraction: 0.29,      // Match crust ratio
        },
      },
      landmask: {
        strategy: "default",
        config: {
          basinSeparation: {
            // Leave separation off; keep defaults earthlike if enabled later.
            enabled: false,
            bandPairs: [],
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
          },
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
          maxTrails: 12,
          steps: 15,
          stepLen: 2,
          minDistFromLand: 5,
          minTrailSeparation: 12,
          paradiseBias: 2,
          volcanicBias: 1,
          volcanicPeakChance: 0.33,
        },
      },
    },
    "story-rifts": {
      story: {
        rift: {
          maxRiftsPerMap: 3,
          lineSteps: 18,
          stepLen: 2,
          shoulderWidth: 1,
        },
      },
    },
    "story-corridors-pre": {
      corridors: {
        sea: {
          protection: "hard",
          softChanceMultiplier: 0.5,
          avoidRadius: 2,
          maxLanes: 3,
          scanStride: 6,
          minLengthFrac: 0.7,
          preferDiagonals: false,
          laneSpacing: 6,
          minChannelWidth: 3,
        },
        land: {
          biomesBiasStrength: 0.6,
          useRiftShoulders: true,
          maxCorridors: 2,
          minRunLength: 24,
          spacing: 0,
        },
        river: {
          biomesBiasStrength: 0.5,
          maxChains: 2,
          maxSteps: 80,
          preferLowlandBelow: 300,
          coastSeedRadius: 2,
          minTiles: 0,
          mustEndNearCoast: false,
        },
        islandHop: {
          useHotspots: true,
          maxArcs: 2,
        },
      },
    },
  },
  "morphology-mid": {
    "rugged-coasts": {
      coastlines: {
        strategy: "default",
        config: {
          coast: {
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
              noiseGateAdd: 0.07,           // Slight noise gate for natural variation
              rollDenActive: 4,             // Moderate bays on active margins
              rollDenDefault: 6,            // Fewer bays on passive margins
            },
            fjord: {
              baseDenom: 14,                // Less frequent fjords (Earth average)
              activeBonus: 2,               // More fjords at convergent margins
              passiveBonus: 1,              // Rare fjords on passive margins
            },
            minSeaLaneWidth: 3,             // Preserve navigable straits
          },
          seaLanes: {
            mode: "soft",
            softChanceMultiplier: 1,
          },
        },
      },
    },
    routing: {
      routing: {
        strategy: "default",
        config: {},
      },
    },
    geomorphology: {
      geomorphology: {
        strategy: "default",
        config: {
          geomorphology: {
            fluvial: {
              rate: 0.15,
              m: 0.5,
              n: 1.0,
            },
            diffusion: {
              rate: 0.2,
              talus: 0.5,
            },
            deposition: {
              rate: 0.1,
            },
            eras: 2,
          },
          worldAge: "mature",
        },
      },
    },
  },
  "narrative-mid": {
    "story-orogeny": {
      story: {
        orogeny: {
          radius: 2,
          beltMinLength: 30,
          windwardBoost: 5,
          leeDrynessAmplifier: 1.2,
        },
      },
    },
  },
  "morphology-post": {
    islands: {
      islands: {
        strategy: "default",
        config: {
          islands: {
            // Earth-like island distribution (reduced for continental dominance)
            fractalThresholdPercent: 96,    // Fewer islands overall
            minDistFromLandRadius: 4,       // Keep islands away from continental shores
            baseIslandDenNearActive: 4,     // Moderate arc islands
            baseIslandDenElse: 6,           // Light passive-margin islands
            hotspotSeedDenom: 5,            // Sparse hotspot chains
            clusterMax: 2,                  // Smaller archipelago clusters
            microcontinentChance: 0.04,     // Rare continental shards
          },
          hotspot: {
            paradiseBias: 2.0,            // Moderate paradise preference
            volcanicBias: 1.1,            // Modest volcanic activity
            volcanicPeakChance: 0.3,      // Some volcanic peaks
          },
          seaLaneAvoidRadius: 3,
        },
      },
    },
    mountains: {
      mountains: {
        strategy: "default",
        config: {
          // Earth-like prevalence: a few major ranges, not wall-to-wall mountains.
          tectonicIntensity: 0.62,
          mountainThreshold: 0.65,       // Slightly more mountains to restore blockage
          hillThreshold: 0.38,           // Modest hill recovery
          upliftWeight: 0.22,
          fractalWeight: 0.55,           // Restore some noise for natural chain breaks
          riftDepth: 0.25,
          boundaryWeight: 0.55,
          boundaryGate: 0.12,            // Allow more margin influence
          boundaryExponent: 1.25,        // Softer decay away from margins
          interiorPenaltyWeight: 0.18,
          convergenceBonus: 0.55,
          transformPenalty: 0.7,
          riftPenalty: 0.8,
          hillBoundaryWeight: 0.26,      // Restore some boundary foothills
          hillRiftBonus: 0.35,
          hillConvergentFoothill: 0.25,  // Slightly wider foothills
          hillInteriorFalloff: 0.18,     // Less aggressive interior decay
          hillUpliftWeight: 0.15,
        },
      },
    },
    volcanoes: {
      volcanoes: {
        strategy: "default",
        config: {
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
    landmasses: {
      landmasses: {
        strategy: "default",
        config: {},
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
            baseRainfall: 21,       // Slightly wetter base for stronger rainforest contrast
            coastalExponent: 1.4,   // Steeper falloff: sharper coast/interior contrast
          },
          bands: {
            deg0to10: 140,
            deg10to20: 100,
            deg20to35: 35,         // Lower: stronger subtropical deserts
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
            baseRainfall: 44,
            coastalExponent: 1.2,
          },
          bands: {
            deg0to10: 140,
            deg10to20: 100,
            deg20to35: 40,         // Lower: stronger subtropical deserts
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
            lengthMulSqrt: 0,
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
    rivers: {
      climate: {
        story: {
          paleo: {
            maxDeltas: 0,
            deltaFanRadius: 0,
            deltaMarshChance: 0.35,
            maxOxbows: 0,
            oxbowElevationMax: 280,
            maxFossilChannels: 0,
            fossilChannelLengthTiles: 6,
            fossilChannelStep: 1,
            fossilChannelHumidity: 0,
            fossilChannelMinDistanceFromCurrentRivers: 0,
            bluffWetReduction: 0,
            sizeScaling: {
              lengthMulSqrt: 0,
            },
            elevationCarving: {
              enableCanyonRim: true,
              rimWidth: 0,
              canyonDryBonus: 0,
            },
          },
        },
      },
    },
  },
  "narrative-post": {
    "story-corridors-post": {
      corridors: {
        sea: {
          protection: "hard",
          softChanceMultiplier: 0.5,
          avoidRadius: 2,
          maxLanes: 3,
          scanStride: 6,
          minLengthFrac: 0.7,
          preferDiagonals: false,
          laneSpacing: 6,
          minChannelWidth: 3,
        },
        land: {
          biomesBiasStrength: 0.6,
          useRiftShoulders: true,
          maxCorridors: 2,
          minRunLength: 24,
          spacing: 0,
        },
        river: {
          biomesBiasStrength: 0.5,
          maxChains: 2,
          maxSteps: 80,
          preferLowlandBelow: 300,
          coastSeedRadius: 2,
          minTiles: 0,
          mustEndNearCoast: false,
        },
        islandHop: {
          useHotspots: true,
          maxArcs: 2,
        },
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
            lengthMulSqrt: 0,
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
      story: {
        orogeny: {
          radius: 2,
          beltMinLength: 30,
          windwardBoost: 5,
          leeDrynessAmplifier: 1.2,
        },
      },
    },
  },
  ecology: {
    // New ecology steps with strategy selections
    pedology: {
      classify: {
        strategy: "default",
        config: {
          climateWeight: 1.2,
          reliefWeight: 0.8,
          sedimentWeight: 1.1,
          bedrockWeight: 0.6,
          fertilityCeiling: 0.95,
        },
      },
    },
    resourceBasins: {
      plan: { strategy: "mixed", config: { resources: [] } },  // Variety in resource distribution
      score: { strategy: "default", config: { minConfidence: 0.3, maxPerResource: 12 } },
    },
    biomeEdgeRefine: {
      refine: { strategy: "gaussian", config: { radius: 1, iterations: 1 } },  // Smoother Earth-like biome transitions
    },
    featuresPlan: {
      vegetation: {
        strategy: "clustered",
        config: {
          baseDensity: 0.35,
          fertilityWeight: 0.55,
          moistureWeight: 0.6,
          moistureNormalization: 230,
          coldCutoff: -10,
        },
      },  // Natural forest grouping
      wetlands: {
        strategy: "delta-focused",
        config: {
          moistureThreshold: 0.75,
          fertilityThreshold: 0.35,
          moistureNormalization: 230,
          maxElevation: 1200,
        },
      },  // River-mouth wetlands
      reefs: {
        strategy: "default",
        config: {
          warmThreshold: 12,
          density: 0.35,
        },
      },
      ice: {
        strategy: "default",
        config: {
          seaIceThreshold: -8,
          alpineThreshold: 2600,
        },
      },
    },
    biomes: {
      classify: {
        strategy: "default",
        config: {
          temperature: {
            equator: 34,
            pole: -12,
            lapseRate: 6.5,
            seaLevel: 0,
            bias: 0.5,             // Reduced from 2.5: allows more cold biomes (tundra, boreal)
            polarCutoff: -5,
            tundraCutoff: 0,
            midLatitude: 12,
            tropicalThreshold: 22,
          },
          moisture: {
            thresholds: [50, 95, 140, 190] as [number, number, number, number],  // Widened: more graduated biome transitions
            bias: 0,               // Neutral: let rainfall bands drive distribution
            humidityWeight: 0.45,
          },
          aridity: {
            temperatureMin: 0,
            temperatureMax: 35,
            petBase: 20,           // Moderate evaporation demand
            petTemperatureWeight: 78,  // Moderate temperature effect
            humidityDampening: 0.5,    // Slightly less humid buffering
            rainfallWeight: 0.9,   // Rainfall offsets aridity reasonably
            bias: 3.3,             // Slight push toward aridity (was 8, too aggressive)
            normalization: 118,    // More reasonable normalization
            moistureShiftThresholds: [0.42, 0.65] as [number, number],  // Less aggressive thresholds
            vegetationPenalty: 0.08,  // Moderate sparse vegetation in arid areas
          },
          freeze: {
            minTemperature: -8,
            maxTemperature: 2,
          },
          vegetation: {
            base: 0.35,            // Reduced from 0.35: more contrast between lush and sparse areas
            moistureWeight: 0.65,
            humidityWeight: 0.35,
            moistureNormalizationPadding: 60,
            biomeModifiers: {
              snow: { multiplier: 0.85, bonus: 1 },
              tundra: { multiplier: 0.5, bonus: 0 },
              boreal: { multiplier: 0.85, bonus: 0 },
              temperateDry: { multiplier: 0.75, bonus: 0 },
              temperateHumid: { multiplier: 1, bonus: 0 },
              tropicalSeasonal: { multiplier: 1, bonus: 0 },
              tropicalRainforest: { multiplier: 1, bonus: 0.5 },
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
            chance: 20,            // Increased for more visible deserts
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
            enabled: true,
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
    featuresApply: {
      apply: { strategy: "default", config: { maxPerTile: 1 } },
    },
  },
  placement: {
    "derive-placement-inputs": {
      wonders: { strategy: "default", config: { wondersPlusOne: true } },
      floodplains: { strategy: "default", config: { minLength: 4, maxLength: 10 } },
      starts: { strategy: "default", config: { overrides: {} } },
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
