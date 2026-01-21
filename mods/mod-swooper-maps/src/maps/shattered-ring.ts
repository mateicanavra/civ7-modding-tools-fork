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

import { createMap } from "@swooper/mapgen-core/authoring/maps";
import standardRecipe from "../recipes/standard/recipe.js";

export default createMap({
  id: "shattered-ring",
  name: "The Shattered Ring",
  recipe: standardRecipe,
  config: {
  foundation: {
    mesh: {
      computeMesh: {
        strategy: "default",
        config: {
          plateCount: 28,
          cellsPerPlate: 2,
          relaxationSteps: 6,
          referenceArea: 4000,
          plateScalePower: 0.5,
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
          plateCount: 28,
          referenceArea: 4000,
          plateScalePower: 0.5,
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
          // Sharp continental edges from impact scarring
          clusteringBias: 0.15,
          crustEdgeBlend: 0.18,
          crustNoiseAmplitude: 0.18,
          continentalHeight: 0.5,
          oceanicHeight: -0.85,
          // Strong plate-driven coasts for ring structure
          boundaryBias: 0.6,
          tectonics: {
            // Strong coastal arcs for ring formation
            boundaryArcWeight: 0.7,
            boundaryArcNoiseWeight: 0.55,
            interiorNoiseWeight: 0.4,
            fractalGrain: 5,
          },
        },
      },
      seaLevel: {
        strategy: "default",
        config: {
          // Central crater sea with ring continent
          targetWaterPercent: 60,
          targetScalar: 1,
          variance: 0,
          boundaryShareTarget: 0.45,
          continentalFraction: 0.3,
        },
      },
      landmask: {
        strategy: "default",
        config: {
          basinSeparation: {
            enabled: false,
            bandPairs: [],
            baseSeparationTiles: 0,
            boundaryClosenessMultiplier: 1.0,
            maxPerRowDelta: 4,
            minChannelWidth: 5,
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
        // High active fraction for ring volcanism
        activeFraction: 0.45,
        passiveFraction: 0.15,
        minSegmentLength: 10,
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
          volcanicBias: 2,
          volcanicPeakChance: 0.4,
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
          beltMinLength: 36,
          windwardBoost: 6,
          leeDrynessAmplifier: 1.4,
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
            fractalThresholdPercent: 92,
            minDistFromLandRadius: 2,
            baseIslandDenNearActive: 4,
            baseIslandDenElse: 5,
            hotspotSeedDenom: 2,
            clusterMax: 3,
            microcontinentChance: 0.1,
          },
          hotspot: {
            paradiseBias: 2,
            volcanicBias: 2.4,
            volcanicPeakChance: 0.45,
          },
          seaLaneAvoidRadius: 2,
        },
      },
    },
    mountains: {
      mountains: {
        strategy: "default",
        config: {
          // High intensity for ring mountain formation
          tectonicIntensity: 0.85,
          mountainThreshold: 0.5,
          hillThreshold: 0.3,
          upliftWeight: 0.45,
          fractalWeight: 0.3,
          riftDepth: 0.3,
          // Strong emphasis on plate boundaries for the ring
          boundaryWeight: 1.35,
          boundaryGate: 0.1,
          boundaryExponent: 2.0,
          interiorPenaltyWeight: 0.1,
          convergenceBonus: 0.95,
          transformPenalty: 0.5,
          riftPenalty: 0.7,
          hillBoundaryWeight: 0.45,
          hillRiftBonus: 0.35,
          hillConvergentFoothill: 0.5,
          hillInteriorFalloff: 0.2,
          hillUpliftWeight: 0.3,
        },
      },
    },
    volcanoes: {
      volcanoes: {
        strategy: "default",
        config: {
          enabled: true,
          // High volcanic activity in crater sea
          baseDensity: 1 / 120,
          minSpacing: 3,
          boundaryThreshold: 0.22,
          boundaryWeight: 1.5,
          convergentMultiplier: 3.0,
          transformMultiplier: 1.1,
          divergentMultiplier: 0.45,
          // Strong hotspot activity for crater islands
          hotspotWeight: 0.55,
          shieldPenalty: 0.35,
          randomJitter: 0.14,
          minVolcanoes: 10,
          maxVolcanoes: 45,
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
  "hydrology-climate-baseline": {
    knobs: {
      dryness: "mix",
      temperature: "temperate",
      seasonality: "high",
      oceanCoupling: "simple",
      lakeiness: "normal",
    },
  },
  "hydrology-hydrography": {
    knobs: {
      riverDensity: "normal",
    },
  },
  "hydrology-climate-refine": {
    knobs: {
      dryness: "mix",
      temperature: "temperate",
      cryosphere: "on",
    },
  },
  ecology: {
    // New ecology steps with strategy selections for volcanic ring world
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
      },  // Volcanic terrain soils
    },
    resourceBasins: {
      plan: { strategy: "default", config: { resources: [] } },
      score: { strategy: "default", config: { minConfidence: 0.3, maxPerResource: 12 } },
    },
    biomeEdgeRefine: {
      refine: { strategy: "default", config: { radius: 1, iterations: 1 } },
    },
    featuresPlan: {
      vegetation: {
        strategy: "clustered",
        config: {
          baseDensity: 0.32,
          fertilityWeight: 0.4,
          moistureWeight: 0.55,
          moistureNormalization: 230,
          coldCutoff: -10,
        },
      },     // Volcanic forest clusters
      wetlands: {
        strategy: "delta-focused",
        config: {
          moistureThreshold: 0.8,
          fertilityThreshold: 0.35,
          moistureNormalization: 230,
          maxElevation: 1200,
        },
      },   // Volcanic valley wetlands
      reefs: {
        strategy: "default",
        config: {
          warmThreshold: 12,
          density: 0.4,
        },
      },
      ice: {
        strategy: "default",
        config: {
          seaIceThreshold: -6,
          alpineThreshold: 2800,
        },
      },
    },
    biomes: {
      classify: {
        strategy: "default",
        config: {
          temperature: {
            equator: 29,
            pole: -10,
            lapseRate: 7.0,
            seaLevel: 0,
            bias: 1.2,
            polarCutoff: -5,
            tundraCutoff: 2,
            midLatitude: 11,
            tropicalThreshold: 23,
          },
          moisture: {
            thresholds: [70, 100, 135, 180] as [number, number, number, number],
            bias: 0.05,
            humidityWeight: 0.35,
          },
          aridity: {
            temperatureMin: 0,
            temperatureMax: 35,
            petBase: 20,
            petTemperatureWeight: 78,
            humidityDampening: 0.48,
            rainfallWeight: 1,
            bias: 4,
            normalization: 110,
            moistureShiftThresholds: [0.42, 0.68] as [number, number],
            vegetationPenalty: 0.18,
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
          riparian: {
            adjacencyRadius: 1,
            minorRiverMoistureBonus: 4,
            majorRiverMoistureBonus: 8,
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
