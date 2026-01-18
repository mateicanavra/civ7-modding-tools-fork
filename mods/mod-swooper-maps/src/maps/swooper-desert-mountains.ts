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

import { createMap } from "@swooper/mapgen-core/authoring/maps";
import standardRecipe from "../recipes/standard/recipe.js";

export default createMap({
  id: "swooper-desert-mountains",
  name: "Swooper Desert Mountains",
  recipe: standardRecipe,
  latitudeBounds: {
    topLatitude: 40,
    bottomLatitude: -40,
  },
  config: {
  foundation: {
    mesh: {
      computeMesh: {
        strategy: "default",
        config: {
          plateCount: 9,
          cellsPerPlate: 5,
          relaxationSteps: 5,
          referenceArea: 4000,
          plateScalePower: 0.6,
        },
      },
    },
    crust: {
      computeCrust: {
        strategy: "default",
        config: {
          continentalRatio: 0.3,
        },
      },
    },
    "plate-graph": {
      computePlateGraph: {
        strategy: "default",
        config: {
          plateCount: 11,
          referenceArea: 4000,
          plateScalePower: 0.6,
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
          boundaryInfluenceDistance: 5,
          boundaryDecay: 0.55,
          movementScale: 100,
          rotationScale: 100,
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
          upliftErodibilityBoost: 0.3,
          riftSedimentBoost: 0.2,
        },
      },
      baseTopography: {
        strategy: "default",
        config: {
          boundaryBias: 0.18,
          clusteringBias: 0.35,
          crustEdgeBlend: 0.35,
          crustNoiseAmplitude: 0.14,
          continentalHeight: 0.52,
          oceanicHeight: -0.6,
          tectonics: {
            interiorNoiseWeight: 0.45,
            boundaryArcWeight: 0.5,
            boundaryArcNoiseWeight: 0.35,
            fractalGrain: 5,
          },
        },
      },
      seaLevel: {
        strategy: "default",
        config: {
          targetWaterPercent: 48,
          targetScalar: 1,
          variance: 0,
          boundaryShareTarget: 0.22,
          continentalFraction: 0.3,
        },
      },
      landmask: {
        strategy: "default",
        config: {
          basinSeparation: {
            enabled: false,
            bandPairs: [],
            baseSeparationTiles: 3,
            boundaryClosenessMultiplier: 0.9,
            maxPerRowDelta: 10,
            minChannelWidth: 3,
            channelJitter: 0,
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
          maxTrails: 12,
          steps: 15,
          stepLen: 2,
          minDistFromLand: 5,
          minTrailSeparation: 12,
          paradiseBias: 1,
          volcanicBias: 1,
          volcanicPeakChance: 0.3,
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
          maxChains: 3,
          maxSteps: 120,
          preferLowlandBelow: 420,
          coastSeedRadius: 3,
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
            bay: {
              noiseGateAdd: 0,
              rollDenActive: 4,
              rollDenDefault: 5,
            },
            fjord: {
              baseDenom: 12,
              activeBonus: 1,
              passiveBonus: 2,
            },
            minSeaLaneWidth: 3,
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
              rate: 0.08,
              m: 0.5,
              n: 1.0,
            },
            diffusion: {
              rate: 0.12,
              talus: 0.45,
            },
            deposition: {
              rate: 0.07,
            },
            eras: 3,
          },
          worldAge: "old",
        },
      },
    },
  },
  "narrative-mid": {
    "story-orogeny": {
      story: {
        orogeny: {
          radius: 2,
          beltMinLength: 34,
          windwardBoost: 5,
          leeDrynessAmplifier: 1.6,
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
            fractalThresholdPercent: 96,
            minDistFromLandRadius: 4,
            baseIslandDenNearActive: 2,
            baseIslandDenElse: 2,
            hotspotSeedDenom: 6,
            clusterMax: 1,
            microcontinentChance: 0,
          },
          hotspot: {
            paradiseBias: 1,
            volcanicBias: 1,
            volcanicPeakChance: 0.3,
          },
          seaLaneAvoidRadius: 2,
        },
      },
    },
    mountains: {
      mountains: {
        strategy: "default",
        config: {
          // Desert mountains: frequent peaks, strong rift relief, reduced erosion
          tectonicIntensity: 0.63,
          mountainThreshold: 0.64,
          hillThreshold: 0.36,
          upliftWeight: 0.20,
          fractalWeight: 0.90,
          riftDepth: 0.45,
          boundaryWeight: 0.38,
          boundaryGate: 0.14,
          boundaryExponent: 1.1,
          interiorPenaltyWeight: 0.16,
          convergenceBonus: 0.6,
          transformPenalty: 0.55,
          riftPenalty: 0.65,
          hillBoundaryWeight: 0.22,
          hillRiftBonus: 0.5,
          hillConvergentFoothill: 0.36,
          hillInteriorFalloff: 0.2,
          hillUpliftWeight: 0.2,
        },
      },
    },
    volcanoes: {
      volcanoes: {
        strategy: "default",
        config: {
          enabled: true,
          baseDensity: 0.006,
          minSpacing: 5,
          boundaryThreshold: 0.32,
          boundaryWeight: 1.4,
          convergentMultiplier: 2.2,
          transformMultiplier: 0.7,
          divergentMultiplier: 0.2,
          hotspotWeight: 0.15,
          shieldPenalty: 0.3,
          randomJitter: 0.08,
          minVolcanoes: 6,
          maxVolcanoes: 18,
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
          windVariance: 0.5,
        },
      },
      climate: {
        baseline: {
          blend: {
            baseWeight: 0.15,
            bandWeight: 0.85,
          },
          seed: {
            baseRainfall: 8,
            coastalExponent: 1.6,
          },
          bands: {
            // Desert-leaning bands with dry subtropics.
            deg0to10: 16,
            deg10to20: 12,
            deg20to35: 7,
            deg35to55: 14,
            deg55to70: 12,
            deg70plus: 10,
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
            minScale: 0.5,
            maxScale: 1.8,
            equatorBoostScale: 4,
            equatorBoostTaper: 0.35,
          },
          orographic: {
            hi1Threshold: 220,
            hi1Bonus: 14,
            hi2Threshold: 420,
            hi2Bonus: 28,
          },
	          coastal: {
	            coastalLandBonus: 16,
	            spread: 3,
	          },
          noise: {
            baseSpanSmall: 4,
            spanLargeScaleFactor: 1.35,
            scale: 0.26,
          },
        },
      },
    },
  },
  "hydrology-core": {
    rivers: {},
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
          biomesBiasStrength: 0.75,
          useRiftShoulders: true,
          maxCorridors: 5,
          minRunLength: 24,
          spacing: 0,
        },
        river: {
          biomesBiasStrength: 0.5,
          maxChains: 6,
          maxSteps: 120,
          preferLowlandBelow: 420,
          coastSeedRadius: 3,
          minTiles: 0,
          mustEndNearCoast: false,
        },
        islandHop: {
          useHotspots: true,
          maxArcs: 6,
        },
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
            baseRainfall: 15,
            coastalExponent: 1.3,
          },
          bands: {
            // Desert-leaning bands with dry subtropics.
            deg0to10: 26,
            deg10to20: 19,
            deg20to35: 9,
            deg35to55: 20,
            deg55to70: 18,
            deg70plus: 14,
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
            equatorBoostScale: 5,
            equatorBoostTaper: 0.35,
          },
          orographic: {
            hi1Threshold: 200,
            hi1Bonus: 16,
            hi2Threshold: 380,
            hi2Bonus: 32,
          },
	          coastal: {
	            coastalLandBonus: 24,
	            spread: 3,
	          },
	          noise: {
	            baseSpanSmall: 4,
	            spanLargeScaleFactor: 1.2,
	            scale: 0.22,
	          },
	        },
	        refine: {
	          waterGradient: {
	            radius: 5,
	            perRingBonus: 3,
	            lowlandBonus: 6,
          },
          orographic: {
            steps: 4,
            reductionBase: 22,
            reductionPerStep: 12,
          },
	          riverCorridor: {
	            adjacencyRadius: 2,
	            lowlandAdjacencyBonus: 26,
	            highlandAdjacencyBonus: 12,
	          },
	          lowBasin: {
	            radius: 4,
	            delta: 24,
	          },
	        },
	      },
	    },
	  },
  ecology: {
    // New ecology steps with strategy selections for arid mountain world
    pedology: {
      classify: {
        strategy: "orogeny-boosted",
        config: {
          climateWeight: 1.2,
          reliefWeight: 0.8,
          sedimentWeight: 1.1,
          bedrockWeight: 0.6,
          fertilityCeiling: 0.95,
        },
      },  // Dramatic mountain soils
    },
    resourceBasins: {
      plan: { strategy: "default", config: { resources: [] } },
      score: { strategy: "default", config: { minConfidence: 0.3, maxPerResource: 12 } },
    },
    biomeEdgeRefine: {
      refine: { strategy: "default", config: { radius: 1, iterations: 1 } },  // Sharp desert/mountain transitions
    },
    featuresPlan: {
      vegetation: {
        strategy: "default",
        config: {
          baseDensity: 0.25,
          fertilityWeight: 0.4,
          moistureWeight: 0.5,
          moistureNormalization: 200,
          coldCutoff: -10,
        },
      },  // Sparse desert vegetation
      vegetatedFeaturePlacements: {
        strategy: "default",
        config: {
          multiplier: 1.2,
          chances: {
            FEATURE_FOREST: 10,
            FEATURE_RAINFOREST: 8,
            FEATURE_TAIGA: 0,
            FEATURE_SAVANNA_WOODLAND: 12,
            FEATURE_SAGEBRUSH_STEPPE: 55,
          },
          rules: {
            minVegetationByBiome: {
              snow: 0.06,
              tundra: 0.05,
              boreal: 0.06,
              temperateDry: 0.04,
              temperateHumid: 0.05,
              tropicalSeasonal: 0.05,
              tropicalRainforest: 0.04,
              desert: 0.01,
            },
            vegetationChanceScalar: 1.4,
            desertSagebrushMinVegetation: 0.05,
            desertSagebrushMaxAridity: 0.98,
            tundraTaigaMinVegetation: 0.12,
            tundraTaigaMinTemperature: -2,
            tundraTaigaMaxFreeze: 0.95,
            temperateDryForestMoisture: 150,
            temperateDryForestMaxAridity: 0.5,
            temperateDryForestVegetation: 0.55,
            tropicalSeasonalRainforestMoisture: 150,
            tropicalSeasonalRainforestMaxAridity: 0.55,
          },
        },
      },
      wetlands: {
        strategy: "default",
        config: {
          moistureThreshold: 0.75,
          fertilityThreshold: 0.35,
          moistureNormalization: 230,
          maxElevation: 1200,
        },
      },    // Minimal wetlands
      wetFeaturePlacements: {
        strategy: "default",
        config: {
          multiplier: 1,
          chances: {
            FEATURE_MARSH: 0,
            FEATURE_TUNDRA_BOG: 0,
            FEATURE_MANGROVE: 0,
            FEATURE_OASIS: 14,
            FEATURE_WATERING_HOLE: 10,
          },
          rules: {
            nearRiverRadius: 2,
            coldTemperatureMax: 2,
            coldBiomeSymbols: ["snow", "tundra", "boreal"],
            mangroveWarmTemperatureMin: 18,
            mangroveWarmBiomeSymbols: ["tropicalRainforest", "tropicalSeasonal"],
            coastalAdjacencyRadius: 1,
            isolatedRiverRadius: 1,
            isolatedSpacingRadius: 2,
            oasisBiomeSymbols: ["desert", "temperateDry"],
          },
        },
      },
      reefs: {
        strategy: "default",
        config: {
          warmThreshold: 12,
          density: 0.35,
        },
      },
      ice: {
        strategy: "continentality",
        config: {
          seaIceThreshold: -8,
          alpineThreshold: 2800,
        },
      },  // Continental interior ice
    },
    biomes: {
      classify: {
        strategy: "default",
        config: {
          temperature: {
            equator: 34,
            pole: 12,
            lapseRate: 7.5,
            seaLevel: 0,
            bias: 2,
            polarCutoff: -5,
            tundraCutoff: 0,
            midLatitude: 12,
            tropicalThreshold: 24,
          },
          moisture: {
            thresholds: [55, 85, 120, 170] as [number, number, number, number],
            bias: 6,
            humidityWeight: 0.35,
          },
          aridity: {
            temperatureMin: 2,
            temperatureMax: 40,
            petBase: 28,
            petTemperatureWeight: 110,
            humidityDampening: 0.35,
            rainfallWeight: 1,
            bias: 20,
            normalization: 80,
            moistureShiftThresholds: [0.4, 0.65] as [number, number],
            vegetationPenalty: 0.28,
          },
          freeze: {
            minTemperature: -6,
            maxTemperature: 5,
          },
          vegetation: {
            base: 0.12,
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
              desert: { multiplier: 0.18, bonus: 0.02 },
            },
          },
          noise: {
            amplitude: 0.03,
            seed: 1337,
          },
          overlays: {
            corridorMoistureBonus: 16,
            riftShoulderMoistureBonus: 12,
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
  },
});
