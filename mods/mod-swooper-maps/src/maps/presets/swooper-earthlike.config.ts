import type { StandardRecipeConfig } from "../../recipes/standard/recipe.js";

export const swooperEarthlikeConfig = {
  foundation: {
    mesh: {
      computeMesh: {
        strategy: "default",
        config: {
          plateCount: 17, // Fewer, larger major plates plus some microplates
          cellsPerPlate: 9, // Slightly denser cells per plate for sharper margins
          relaxationSteps: 5, // Extra smoothing for coherent plate footprints
          referenceArea: 16000, // Standard reference
          plateScalePower: 0.86, // Still heavy-tailed but fewer tiny microplates
        },
      },
    },
    crust: {
      computeCrust: {
        strategy: "default",
        config: {
          continentalRatio: 0.31, // Earth-ish crust share while leaving room for shelves
        },
      },
    },
    "plate-graph": {
      computePlateGraph: {
        strategy: "default",
        config: {
          plateCount: 17, // Match mesh plateCount
          referenceArea: 16000,
          plateScalePower: 0.86,
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
          boundaryInfluenceDistance: 12, // Broader active margins for realistic orogeny belts
          boundaryDecay: 0.5, // Softer falloff so margins still dominate relief
          movementScale: 60, // Faster relative drift to energize boundaries
          rotationScale: 88, // More rotational variance for microplates/torques
        },
      },
    },
  },
  "morphology-pre": {
    "landmass-plates": {
      substrate: {
        strategy: "default",
        config: {
          baseErodibility: 0.58, // Slightly tighter cohesion for broader lowlands
          baseSediment: 0.24, // More shelf/alluvial material
          upliftErodibilityBoost: 0.35, // Keep mountains crisp without over-thinning
          riftSedimentBoost: 0.34, // Preserve inland basins without flooding shelves
        },
      },
      baseTopography: {
        strategy: "default",
        config: {
          boundaryBias: 0.24, // Keep margins active but not dominating
          clusteringBias: 0.70, // More stickiness to fuse fragments
          crustEdgeBlend: 0.60, // Slightly smoother shelves to avoid speckle land
          crustNoiseAmplitude: 0.36, // Further cut coast speckle/ghost land
          continentalHeight: 0.62, // Moderate elevation for coastal gradients
          oceanicHeight: -0.75, // Shallower basins -> more shelf diversity
          tectonics: {
            boundaryArcWeight: 0.32, // Strong convergent arcs without overpainting
            boundaryArcNoiseWeight: 0.26, // Natural ragged margins
            interiorNoiseWeight: 0.50, // Calmer interiors to avoid ghost specks
            fractalGrain: 3, // Fine detail for believable coastlines
          },
        },
      },
      seaLevel: {
        strategy: "default",
        config: {
          targetWaterPercent: 63, // Drain a bit more (~+30-50m) to expose shelves/connect fragments
          targetScalar: 1,
          variance: 1.5, // Tighter solve to avoid stray blobs
          boundaryShareTarget: 0.08, // Lower boundary land share to trim edge speckle
          continentalFraction: 0.39, // Match crust ratio while honoring sea-level solve
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
        activeFraction: 0.28,
        passiveFraction: 0.18,
        minSegmentLength: 14,
      },
    },
    "story-hotspots": {
      story: {
        hotspot: {
          maxTrails: 4,
          steps: 8,
          stepLen: 3,
          minDistFromLand: 6,
          minTrailSeparation: 14,
          paradiseBias: 3,
          volcanicBias: 2,
          volcanicPeakChance: 0.35,
        },
      },
    },
    "story-rifts": {
      story: {
        rift: {
          maxRiftsPerMap: 2,
          lineSteps: 16,
          stepLen: 2,
          shoulderWidth: 1,
        },
      },
    },
    "story-corridors-pre": {
      corridors: {
        sea: {
          protection: "soft",
          softChanceMultiplier: 0.35,
          avoidRadius: 3,
          maxLanes: 2,
          scanStride: 6,
          minLengthFrac: 0.65,
          preferDiagonals: false,
          laneSpacing: 7,
          minChannelWidth: 3,
        },
        land: {
          biomesBiasStrength: 0.6,
          useRiftShoulders: true,
          maxCorridors: 2,
          minRunLength: 26,
          spacing: 1,
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
              threshold: 0.42,
              power: 1.3,
              convergent: 1.5,
              transform: 0.35,
              divergent: -0.45,
              interior: 0.35,
              bayWeight: 0.9,
              bayNoiseBonus: 0.45,
              fjordWeight: 0.85,
            },
            bay: {
              noiseGateAdd: 0.05,
              rollDenActive: 4,
              rollDenDefault: 7,
            },
            fjord: {
              baseDenom: 15,
              activeBonus: 2,
              passiveBonus: 1,
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
              rate: 0.26,
              m: 0.5,
              n: 1.0,
            },
            diffusion: {
              rate: 0.23,
              talus: 0.5,
            },
            deposition: {
              rate: 0.11,
            },
            eras: 3,
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
          beltMinLength: 34,
          windwardBoost: 6,
          leeDrynessAmplifier: 1.15,
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
            minDistFromLandRadius: 5,
            baseIslandDenNearActive: 2,
            baseIslandDenElse: 2,
            hotspotSeedDenom: 3,
            clusterMax: 12,
            microcontinentChance: 0.12,
          },
          hotspot: {
            paradiseBias: 1.3,
            volcanicBias: 1.0,
            volcanicPeakChance: 0.28,
          },
          seaLaneAvoidRadius: 4,
        },
      },
    },
    mountains: {
      mountains: {
        strategy: "default",
        config: {
          tectonicIntensity: 0.64,
          mountainThreshold: 0.59,
          hillThreshold: 0.44,
          upliftWeight: 0.28,
          fractalWeight: 0.72,
          riftDepth: 0.27,
          boundaryWeight: 0.18,
          boundaryGate: 0.11,
          boundaryExponent: 1.18,
          interiorPenaltyWeight: 0.09,
          convergenceBonus: 0.60,
          transformPenalty: 0.65,
          riftPenalty: 0.78,
          hillBoundaryWeight: 0.32,
          hillRiftBonus: 0.36,
          hillConvergentFoothill: 0.36,
          hillInteriorFalloff: 0.20,
          hillUpliftWeight: 0.18,
        },
      },
    },
    volcanoes: {
      volcanoes: {
        strategy: "default",
        config: {
          enabled: true,
          baseDensity: 1 / 160,
          minSpacing: 6,
          boundaryThreshold: 0.32,
          boundaryWeight: 1.35,
          convergentMultiplier: 3.3,
          transformMultiplier: 0.8,
          divergentMultiplier: 0.32,
          hotspotWeight: 0.32,
          shieldPenalty: 0.55,
          randomJitter: 0.04,
          minVolcanoes: 12,
          maxVolcanoes: 42,
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
      dryness: "wet",
      temperature: "hot",
      seasonality: "high",
      oceanCoupling: "earthlike",
      lakeiness: "normal",
    },
    "climate-baseline": {
      seasonality: {
        axialTiltDeg: 27.44,
        modeCount: 4,
      },
      computeAtmosphericCirculation: {
        strategy: "default",
        config: {
          windJetStrength: 1.5,
          windVariance: 0.35,
          windJetStreaks: 5
        },
      }
    },
  },
  "hydrology-hydrography": {
    knobs: {
      riverDensity: "dense",
    },
  },
  "hydrology-climate-refine": {
    knobs: {
      dryness: "wet",
      temperature: "hot",
      cryosphere: "on",
    },
  },
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
      vegetatedFeaturePlacements: {
        strategy: "default",
        config: {
          multiplier: 1,
          chances: {
            FEATURE_FOREST: 50,
            FEATURE_RAINFOREST: 65,
            FEATURE_TAIGA: 60,
            FEATURE_SAVANNA_WOODLAND: 40,
            FEATURE_SAGEBRUSH_STEPPE: 60,
          },
          rules: {
            minVegetationByBiome: {
              snow: 0.9,
              tundra: 0.08,
              boreal: 0.05,
              temperateDry: 0.04,
              temperateHumid: 0.1,
              tropicalSeasonal: 0.05,
              tropicalRainforest: 0.1,
              desert: 0.03,
            },
            vegetationChanceScalar: 1.1,
            desertSagebrushMinVegetation: 0.08,
            desertSagebrushMaxAridity: 0.98,
            tundraTaigaMinVegetation: 0.22,
            tundraTaigaMinTemperature: -4,
            tundraTaigaMaxFreeze: 0.98,
            temperateDryForestMoisture: 150,
            temperateDryForestMaxAridity: 0.5,
            temperateDryForestVegetation: 0.65,
            tropicalSeasonalRainforestMoisture: 150,
            tropicalSeasonalRainforestMaxAridity: 0.55,
          },
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
            thresholds: [55, 130, 150, 180] as [number, number, number, number],
            bias: 0,
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
