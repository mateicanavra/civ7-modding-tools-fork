import type { StandardRecipeConfig } from "../../recipes/standard/recipe.js";

/**
 * Swooper Earthlike — Ecology posture overrides.
 *
 * This file intentionally concentrates “earthlike” ecology tuning in one place so the top-level map
 * config can stay knobs-first and compact.
 */
export const swooperEarthlikeEcologyConfig = {
  ecology: {
    pedology: {
      classify: {
        strategy: "default",
        config: {
          climateWeight: 1.3,
          reliefWeight: 0.9,
          sedimentWeight: 1.0,
          bedrockWeight: 0.7,
          fertilityCeiling: 0.96,
        },
      },
    },
    resourceBasins: {
      plan: { strategy: "mixed", config: { resources: [] } },
      score: { strategy: "default", config: { minConfidence: 0.32, maxPerResource: 14 } },
    },
    biomeEdgeRefine: {
      refine: { strategy: "gaussian", config: { radius: 1, iterations: 1 } },
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
      },
      wetlands: {
        strategy: "delta-focused",
        config: {
          moistureThreshold: 0.93,
          fertilityThreshold: 0.35,
          moistureNormalization: 230,
          maxElevation: 1200,
        },
      },
      wetFeaturePlacements: {
        strategy: "default",
        config: {
          multiplier: 0.35,
          chances: {
            FEATURE_MARSH: 0,
            FEATURE_TUNDRA_BOG: 20,
            FEATURE_MANGROVE: 30,
            FEATURE_OASIS: 40,
            FEATURE_WATERING_HOLE: 20,
          },
          rules: {
            nearRiverRadius: 2,
            coldTemperatureMax: 2,
            coldBiomeSymbols: ["snow", "tundra", "boreal"],
            mangroveWarmTemperatureMin: 20,
            mangroveWarmBiomeSymbols: ["tropicalRainforest"],
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
          seaIceThreshold: -16,
          alpineThreshold: 2600,
          featherC: 4,
          jitterC: 2.5,
          densityScale: 0.25,
        },
      },
    },
    biomes: {
      classify: {
        strategy: "default",
        config: {
          temperature: {
            equator: 34,
            pole: -22,
            lapseRate: 7.5,
            seaLevel: 0,
            bias: 0.5,
            polarCutoff: -6,
            tundraCutoff: -1,
            midLatitude: 10,
            tropicalThreshold: 18,
          },
          moisture: {
            thresholds: [100, 130, 150, 180] as [number, number, number, number],
            bias: -15,
            humidityWeight: 0.42,
          },
          aridity: {
            temperatureMin: 0,
            temperatureMax: 37,
            petBase: 19,
            petTemperatureWeight: 180,
            humidityDampening: 0.18,
            rainfallWeight: 1.8,
            bias: 1,
            normalization: 80,
            moistureShiftThresholds: [0.38, 0.40] as [number, number],
            vegetationPenalty: 0.0,
          },
          freeze: {
            minTemperature: -10,
            maxTemperature: 3,
          },
          vegetation: {
            base: 0.72,
            moistureWeight: 0.88,
            humidityWeight: 0.32,
            moistureNormalizationPadding: 45,
            biomeModifiers: {
              snow: { multiplier: 3.2, bonus: 0.3 },
              tundra: { multiplier: 0.55, bonus: 0 },
              boreal: { multiplier: 0.9, bonus: 0 },
              temperateDry: { multiplier: 0.75, bonus: 0 },
              temperateHumid: { multiplier: 1, bonus: 0 },
              tropicalSeasonal: { multiplier: 1, bonus: 0 },
              tropicalRainforest: { multiplier: 5, bonus: 1.2 },
              desert: { multiplier: 5, bonus: 0.25 },
            },
          },
          noise: {
            amplitude: 0.028,
            seed: 53337,
          },
          riparian: {
            adjacencyRadius: 1,
            minorRiverMoistureBonus: 4,
            majorRiverMoistureBonus: 8,
          },
        },
      },
    },
  },
} satisfies Pick<StandardRecipeConfig, "ecology">;

export const swooperEarthlikeMapEcologyConfig = {
  "map-ecology": {
    biomes: {
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
            coverageChance: 65,
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
            elevationPercentileMin: 0.68,
            elevationPercentileMax: 0.98,
            moistureMin: 50,
            moistureMax: 170,
            maxTemperature: 3,
            maxAridity: 0.85,
          },
          sand: {
            enabled: true,
            selector: {
              typeName: "PLOTEFFECT_SAND",
            },
            chance: 32,
            minAridity: 0.48,
            minTemperature: 14,
            maxFreeze: 0.3,
            maxVegetation: 0.2,
            maxMoisture: 85,
            allowedBiomes: ["desert", "temperateDry"] as ["desert", "temperateDry"],
          },
          burned: {
            enabled: true,
            selector: {
              typeName: "PLOTEFFECT_BURNED",
            },
            chance: 5,
            minAridity: 0.48,
            minTemperature: 21,
            maxFreeze: 0.22,
            maxVegetation: 0.27,
            maxMoisture: 100,
            allowedBiomes: ["temperateDry", "tropicalSeasonal"] as ["temperateDry", "tropicalSeasonal"],
          },
        },
      },
    },
  },
} satisfies Pick<StandardRecipeConfig, "map-ecology">;

