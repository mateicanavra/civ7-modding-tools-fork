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

import { createMap } from "@swooper/mapgen-core/authoring/maps";
import standardRecipe, { type StandardRecipeConfig } from "../recipes/standard/recipe.js";

export default createMap({
  id: "swooper-earthlike",
  name: "Swooper Earthlike",
  recipe: standardRecipe,
  config: (
    {
      "foundation": {
        "knobs": {
          "plateCount": "normal",
          "plateActivity": "normal"
        },
        "advanced": {
          "mesh": {
            "computeMesh": {
              "strategy": "default",
              "config": {
                "plateCount": 28,
                "cellsPerPlate": 14,
                "relaxationSteps": 4,
                "referenceArea": 6996,
                "plateScalePower": 0.65
              }
            }
          },
          "crust": {
            "computeCrust": {
              "strategy": "default",
              "config": {
                "continentalRatio": 0.29
              }
            }
          },
          "plate-graph": {
            "computePlateGraph": {
              "strategy": "default",
              "config": {
                "plateCount": 28,
                "referenceArea": 6996,
                "plateScalePower": 0.65
              }
            }
          },
          "tectonics": {
            "computeTectonicSegments": {
              "strategy": "default",
              "config": {
                "intensityScale": 180,
                "regimeMinIntensity": 4
              }
            },
            "computeTectonicHistory": {
              "strategy": "default",
              "config": {
                "eraWeights": [
                  0.35,
                  0.35,
                  0.3
                ],
                "driftStepsByEra": [
                  2,
                  1,
                  0
                ],
                "beltInfluenceDistance": 8,
                "beltDecay": 0.55,
                "activityThreshold": 1
              }
            }
          },
          "projection": {
            "computePlates": {
              "strategy": "default",
              "config": {
                "boundaryInfluenceDistance": 12,
                "boundaryDecay": 0.5,
                "movementScale": 65,
                "rotationScale": 80
              }
            }
          }
        }
      },
      "morphology-pre": {
        "knobs": {
          "seaLevel": "earthlike"
        },
        "advanced": {
          "landmass-plates": {
            "substrate": {
              "strategy": "default",
              "config": {
                "continentalBaseErodibility": 0.63,
                "oceanicBaseErodibility": 0.53,
                "continentalBaseSediment": 0.19,
                "oceanicBaseSediment": 0.29,
                "upliftErodibilityBoost": 0.35,
                "riftSedimentBoost": 0.34,
                "ageErodibilityReduction": 0.25,
                "ageSedimentBoost": 0.15,
                "convergentBoundaryErodibilityBoost": 0.12,
                "divergentBoundaryErodibilityBoost": 0.18,
                "transformBoundaryErodibilityBoost": 0.08,
                "convergentBoundarySedimentBoost": 0.05,
                "divergentBoundarySedimentBoost": 0.1,
                "transformBoundarySedimentBoost": 0.03
              }
            },
            "baseTopography": {
              "strategy": "default",
              "config": {
                "boundaryBias": 0.24,
                "clusteringBias": 0.7,
                "crustEdgeBlend": 0.6,
                "crustNoiseAmplitude": 0.36,
                "continentalHeight": 0.62,
                "oceanicHeight": -0.75,
                "tectonics": {
                  "boundaryArcWeight": 0.32,
                  "boundaryArcNoiseWeight": 0.26,
                  "interiorNoiseWeight": 0.5,
                  "fractalGrain": 3
                }
              }
            },
            "seaLevel": {
              "strategy": "default",
              "config": {
                "targetWaterPercent": 63,
                "targetScalar": 1,
                "variance": 1.5,
                "boundaryShareTarget": 0.08,
                "continentalFraction": 0.39
              }
            },
            "landmask": {
              "strategy": "default",
              "config": {
                "basinSeparation": {
                  "enabled": false,
                  "bandPairs": [],
                  "baseSeparationTiles": 0,
                  "boundaryClosenessMultiplier": 1,
                  "maxPerRowDelta": 3,
                  "minChannelWidth": 4,
                  "channelJitter": 0,
                  "respectSeaLanes": true,
                  "edgeWest": {
                    "enabled": false,
                    "baseTiles": 0,
                    "boundaryClosenessMultiplier": 1,
                    "maxPerRowDelta": 2
                  },
                  "edgeEast": {
                    "enabled": false,
                    "baseTiles": 0,
                    "boundaryClosenessMultiplier": 1,
                    "maxPerRowDelta": 2
                  }
                }
              }
            }
          }
        }
      },
      "morphology-mid": {
        "knobs": {
          "erosion": "normal",
          "coastRuggedness": "normal"
        },
        "advanced": {
          "rugged-coasts": {
            "coastlines": {
              "strategy": "default",
              "config": {
                "coast": {
                  "plateBias": {
                    "threshold": 0.42,
                    "power": 1.3,
                    "convergent": 1.5,
                    "transform": 0.35,
                    "divergent": -0.45,
                    "interior": 0.35,
                    "bayWeight": 0.9,
                    "bayNoiseBonus": 0.45,
                    "fjordWeight": 0.85
                  },
                  "bay": {
                    "noiseGateAdd": 0.05,
                    "rollDenActive": 4,
                    "rollDenDefault": 7
                  },
                  "fjord": {
                    "baseDenom": 15,
                    "activeBonus": 2,
                    "passiveBonus": 1
                  }
                }
              }
            }
          },
          "routing": {
            "routing": {
              "strategy": "default",
              "config": {}
            }
          },
          "geomorphology": {
            "geomorphology": {
              "strategy": "default",
              "config": {
                "geomorphology": {
                  "fluvial": {
                    "rate": 0.26,
                    "m": 0.5,
                    "n": 1
                  },
                  "diffusion": {
                    "rate": 0.23,
                    "talus": 0.5
                  },
                  "deposition": {
                    "rate": 0.11
                  },
                  "eras": 3
                },
                "worldAge": "mature"
              }
            }
          }
        }
      },
      "morphology-post": {
        "knobs": {
          "volcanism": "normal"
        },
        "advanced": {
          "islands": {
            "islands": {
              "strategy": "default",
              "config": {
                "islands": {
                  "fractalThresholdPercent": 96,
                  "minDistFromLandRadius": 5,
                  "baseIslandDenNearActive": 2,
                  "baseIslandDenElse": 2,
                  "hotspotSeedDenom": 3,
                  "clusterMax": 12,
                  "microcontinentChance": 0.12
                }
              }
            }
          },
          "volcanoes": {
            "volcanoes": {
              "strategy": "default",
              "config": {
                "enabled": true,
                "baseDensity": 0.00625,
                "minSpacing": 6,
                "boundaryThreshold": 0.32,
                "boundaryWeight": 1.35,
                "convergentMultiplier": 3.3,
                "transformMultiplier": 0.8,
                "divergentMultiplier": 0.32,
                "hotspotWeight": 0.32,
                "shieldPenalty": 0.55,
                "randomJitter": 0.04,
                "minVolcanoes": 12,
                "maxVolcanoes": 42
              }
            }
          },
          "landmasses": {
            "landmasses": {
              "strategy": "default",
              "config": {}
            }
          }
        }
      },
      "hydrology-climate-baseline": {
        "knobs": {
          "dryness": "mix",
          "temperature": "hot",
          "seasonality": "high",
          "oceanCoupling": "earthlike"
        },
        "climate-baseline": {
          "seasonality": {
            "axialTiltDeg": 29.44,
            "modeCount": 4
          },
          "computeAtmosphericCirculation": {
            "strategy": "default",
            "config": {
              "windJetStrength": 1.5,
              "windVariance": 0.35,
              "windJetStreaks": 4
            }
          },
          "computeRadiativeForcing": {
            "strategy": "default",
            "config": {
              "equatorInsolation": 1,
              "poleInsolation": 0.35,
              "latitudeExponent": 1.2
            }
          },
          "computeThermalState": {
            "strategy": "default",
            "config": {
              "baseTemperatureC": 14,
              "insolationScaleC": 28,
              "lapseRateCPerM": -0.0065,
              "landCoolingC": 2,
              "minC": -40,
              "maxC": 50
            }
          },
          "computeOceanSurfaceCurrents": {
            "strategy": "default",
            "config": {
              "strength": 1
            }
          },
          "computeEvaporationSources": {
            "strategy": "default",
            "config": {
              "oceanStrength": 1,
              "landStrength": 0.2,
              "minTempC": -10,
              "maxTempC": 30
            }
          },
          "transportMoisture": {
            "strategy": "default",
            "config": {
              "iterations": 28,
              "advection": 0.65,
              "retention": 0.92
            }
          },
          "computePrecipitation": {
            "strategy": "default",
            "config": {
              "rainfallScale": 180,
              "humidityExponent": 1,
              "noiseAmplitude": 6,
              "noiseScale": 0.12,
              "waterGradient": {
                "radius": 5,
                "perRingBonus": 4,
                "lowlandBonus": 2,
                "lowlandElevationMax": 150
              },
              "orographic": {
                "steps": 4,
                "reductionBase": 8,
                "reductionPerStep": 6,
                "barrierElevationM": 500
              }
            }
          }
        }
      },
      "hydrology-hydrography": {
        "knobs": {
          "riverDensity": "dense"
        },
        "rivers": {
          "accumulateDischarge": {
            "strategy": "default",
            "config": {
              "runoffScale": 1,
              "infiltrationFraction": 0.15,
              "humidityDampening": 0.25,
              "minRunoff": 0
            }
          },
          "projectRiverNetwork": {
            "strategy": "default",
            "config": {
              "minorPercentile": 0.85,
              "majorPercentile": 0.95,
              "minMinorDischarge": 0,
              "minMajorDischarge": 0
            }
          }
        }
      },
      "hydrology-climate-refine": {
        "knobs": {
          "dryness": "mix",
          "temperature": "hot",
          "cryosphere": "on"
        },
        "climate-refine": {
          "computePrecipitation": {
            "strategy": "refine",
            "config": {
              "riverCorridor": {
                "adjacencyRadius": 1,
                "lowlandAdjacencyBonus": 14,
                "highlandAdjacencyBonus": 10,
                "lowlandElevationMax": 250
              },
              "lowBasin": {
                "radius": 2,
                "delta": 6,
                "elevationMax": 200,
                "openThresholdM": 20
              }
            }
          },
          "computeRadiativeForcing": {
            "strategy": "default",
            "config": {
              "equatorInsolation": 1,
              "poleInsolation": 0.35,
              "latitudeExponent": 1.2
            }
          },
          "computeThermalState": {
            "strategy": "default",
            "config": {
              "baseTemperatureC": 14,
              "insolationScaleC": 28,
              "lapseRateCPerM": -0.0065,
              "landCoolingC": 2,
              "minC": -40,
              "maxC": 50
            }
          },
          "applyAlbedoFeedback": {
            "strategy": "default",
            "config": {
              "iterations": 4,
              "snowCoolingC": 4,
              "seaIceCoolingC": 6,
              "minC": -60,
              "maxC": 60,
              "landSnowStartC": 0,
              "landSnowFullC": -12,
              "seaIceStartC": -1,
              "seaIceFullC": -10,
              "precipitationInfluence": 0.25
            }
          },
          "computeCryosphereState": {
            "strategy": "default",
            "config": {
              "landSnowStartC": 0,
              "landSnowFullC": -12,
              "seaIceStartC": -1,
              "seaIceFullC": -10,
              "freezeIndexStartC": 2,
              "freezeIndexFullC": -12,
              "precipitationInfluence": 0.25,
              "permafrostStartFreezeIndex": 0.4,
              "permafrostFullFreezeIndex": 0.8,
              "meltStartC": 0,
              "meltFullC": 10,
              "groundIceSnowInfluence": 0.75,
              "baseAlbedo": 30,
              "snowAlbedoBoost": 140,
              "seaIceAlbedoBoost": 180
            }
          },
          "computeLandWaterBudget": {
            "strategy": "default",
            "config": {
              "tMinC": 0,
              "tMaxC": 35,
              "petBase": 18,
              "petTemperatureWeight": 75,
              "humidityDampening": 0.55
            }
          },
          "computeClimateDiagnostics": {
            "strategy": "default",
            "config": {
              "barrierSteps": 4,
              "barrierElevationM": 500,
              "continentalityMaxDist": 12,
              "convergenceNormalization": 64
            }
          }
        }
      },
      "ecology": {
        "knobs": {},
        "pedology": {
          "classify": {
            "strategy": "default",
            "config": {
              "climateWeight": 1.3,
              "reliefWeight": 0.9,
              "sedimentWeight": 1,
              "bedrockWeight": 0.7,
              "fertilityCeiling": 0.96
            }
          }
        },
        "resourceBasins": {
          "plan": {
            "strategy": "mixed",
            "config": {
              "resources": []
            }
          },
          "score": {
            "strategy": "default",
            "config": {
              "minConfidence": 0.32,
              "maxPerResource": 14
            }
          }
        },
        "biomes": {
          "classify": {
            "strategy": "default",
            "config": {
              "temperature": {
                "equator": 34,
                "pole": -22,
                "lapseRate": 7.5,
                "seaLevel": 0,
                "bias": 0.5,
                "polarCutoff": -6,
                "tundraCutoff": -1,
                "midLatitude": 10,
                "tropicalThreshold": 18
              },
              "moisture": {
                "thresholds": [
                  100,
                  130,
                  150,
                  180
                ],
                "bias": -15,
                "humidityWeight": 0.42
              },
              "aridity": {
                "temperatureMin": 0,
                "temperatureMax": 37,
                "petBase": 19,
                "petTemperatureWeight": 180,
                "humidityDampening": 0.18,
                "rainfallWeight": 1.8,
                "bias": 1,
                "normalization": 80,
                "moistureShiftThresholds": [
                  0.38,
                  0.4
                ],
                "vegetationPenalty": 0
              },
              "freeze": {
                "minTemperature": -10,
                "maxTemperature": 3
              },
              "vegetation": {
                "base": 0.72,
                "moistureWeight": 0.88,
                "humidityWeight": 0.32,
                "moistureNormalizationPadding": 45,
                "biomeModifiers": {
                  "snow": {
                    "multiplier": 3.2,
                    "bonus": 0.3
                  },
                  "tundra": {
                    "multiplier": 0.55,
                    "bonus": 0
                  },
                  "boreal": {
                    "multiplier": 0.9,
                    "bonus": 0
                  },
                  "temperateDry": {
                    "multiplier": 0.75,
                    "bonus": 0
                  },
                  "temperateHumid": {
                    "multiplier": 1,
                    "bonus": 0
                  },
                  "tropicalSeasonal": {
                    "multiplier": 1,
                    "bonus": 0
                  },
                  "tropicalRainforest": {
                    "multiplier": 5,
                    "bonus": 1.2
                  },
                  "desert": {
                    "multiplier": 5,
                    "bonus": 0.25
                  }
                }
              },
              "noise": {
                "amplitude": 0.028,
                "seed": 53337
              },
              "riparian": {
                "adjacencyRadius": 1,
                "minorRiverMoistureBonus": 4,
                "majorRiverMoistureBonus": 8
              }
            }
          }
        },
        "biomeEdgeRefine": {
          "refine": {
            "strategy": "gaussian",
            "config": {
              "radius": 1,
              "iterations": 1
            }
          }
        },
        "featuresPlan": {
          "vegetation": {
            "strategy": "clustered",
            "config": {
              "baseDensity": 0.35,
              "fertilityWeight": 0.55,
              "moistureWeight": 0.6,
              "moistureNormalization": 230,
              "coldCutoff": -10
            }
          },
          "wetlands": {
            "strategy": "delta-focused",
            "config": {
              "moistureThreshold": 0.93,
              "fertilityThreshold": 0.35,
              "moistureNormalization": 230,
              "maxElevation": 1200
            }
          },
          "wetFeaturePlacements": {
            "strategy": "default",
            "config": {
              "multiplier": 0.35,
              "chances": {
                "FEATURE_MARSH": 0,
                "FEATURE_TUNDRA_BOG": 20,
                "FEATURE_MANGROVE": 30,
                "FEATURE_OASIS": 40,
                "FEATURE_WATERING_HOLE": 20
              },
              "rules": {
                "nearRiverRadius": 2,
                "coldTemperatureMax": 2,
                "coldBiomeSymbols": [
                  "snow",
                  "tundra",
                  "boreal"
                ],
                "mangroveWarmTemperatureMin": 20,
                "mangroveWarmBiomeSymbols": [
                  "tropicalRainforest"
                ],
                "coastalAdjacencyRadius": 1,
                "isolatedRiverRadius": 1,
                "isolatedSpacingRadius": 2,
                "oasisBiomeSymbols": [
                  "desert",
                  "temperateDry"
                ]
              }
            }
          },
          "reefs": {
            "strategy": "default",
            "config": {
              "warmThreshold": 12,
              "density": 0.35
            }
          },
          "ice": {
            "strategy": "continentality",
            "config": {
              "seaIceThreshold": -16,
              "alpineThreshold": 2600,
              "featherC": 4,
              "jitterC": 2.5,
              "densityScale": 0.25
            }
          }
        }
      },
      "map-morphology": {
        "knobs": {
          "orogeny": "normal"
        },
        "plotCoasts": {},
        "plotContinents": {},
        "mountains": {
          "mountains": {
            "strategy": "default",
            "config": {
              "tectonicIntensity": 0.61,
              "mountainThreshold": 0.605,
              "hillThreshold": 0.42,
              "upliftWeight": 0.3,
              "fractalWeight": 0.75,
              "riftDepth": 0.25,
              "boundaryWeight": 0.22,
              "boundaryGate": 0.1,
              "boundaryExponent": 1.12,
              "interiorPenaltyWeight": 0.09,
              "convergenceBonus": 0.65,
              "transformPenalty": 0.65,
              "riftPenalty": 0.78,
              "hillBoundaryWeight": 0.36,
              "hillRiftBonus": 0.36,
              "hillConvergentFoothill": 0.42,
              "hillInteriorFalloff": 0.14,
              "hillUpliftWeight": 0.18
            }
          }
        },
        "plotVolcanoes": {},
        "buildElevation": {}
      },
      "map-hydrology": {
        "knobs": {
          "lakeiness": "normal",
          "riverDensity": "dense"
        },
        "lakes": {
          "tilesPerLakeMultiplier": 1
        },
        "plot-rivers": {
          "minLength": 5,
          "maxLength": 15
        }
      },
      "map-ecology": {
        "knobs": {},
        "biomes": {
          "bindings": {
            "snow": "BIOME_TUNDRA",
            "tundra": "BIOME_TUNDRA",
            "boreal": "BIOME_TUNDRA",
            "temperateDry": "BIOME_PLAINS",
            "temperateHumid": "BIOME_GRASSLAND",
            "tropicalSeasonal": "BIOME_GRASSLAND",
            "tropicalRainforest": "BIOME_TROPICAL",
            "desert": "BIOME_DESERT",
            "marine": "BIOME_MARINE"
          }
        },
        "featuresApply": {
          "apply": {
            "strategy": "default",
            "config": {
              "maxPerTile": 1
            }
          }
        },
        "plotEffects": {
          "plotEffects": {
            "strategy": "default",
            "config": {
              "snow": {
                "enabled": true,
                "selectors": {
                  "light": {
                    "typeName": "PLOTEFFECT_SNOW_LIGHT_PERMANENT"
                  },
                  "medium": {
                    "typeName": "PLOTEFFECT_SNOW_MEDIUM_PERMANENT"
                  },
                  "heavy": {
                    "typeName": "PLOTEFFECT_SNOW_HEAVY_PERMANENT"
                  }
                },
                "coverageChance": 65,
                "freezeWeight": 1.1,
                "elevationWeight": 0.9,
                "moistureWeight": 0.7,
                "scoreNormalization": 2.7,
                "scoreBias": 0,
                "lightThreshold": 0.35,
                "mediumThreshold": 0.6,
                "heavyThreshold": 0.8,
                "elevationStrategy": "percentile",
                "elevationMin": 200,
                "elevationMax": 2800,
                "elevationPercentileMin": 0.68,
                "elevationPercentileMax": 0.98,
                "moistureMin": 50,
                "moistureMax": 170,
                "maxTemperature": 3,
                "maxAridity": 0.85
              },
              "sand": {
                "enabled": true,
                "selector": {
                  "typeName": "PLOTEFFECT_SAND"
                },
                "chance": 32,
                "minAridity": 0.48,
                "minTemperature": 14,
                "maxFreeze": 0.3,
                "maxVegetation": 0.2,
                "maxMoisture": 85,
                "allowedBiomes": [
                  "desert",
                  "temperateDry"
                ]
              },
              "burned": {
                "enabled": true,
                "selector": {
                  "typeName": "PLOTEFFECT_BURNED"
                },
                "chance": 5,
                "minAridity": 0.48,
                "minTemperature": 21,
                "maxFreeze": 0.22,
                "maxVegetation": 0.27,
                "maxMoisture": 100,
                "allowedBiomes": [
                  "temperateDry",
                  "tropicalSeasonal"
                ]
              }
            }
          }
        }
      },
      "placement": {
        "knobs": {},
        "derive-placement-inputs": {
          "wonders": {
            "strategy": "default",
            "config": {
              "wondersPlusOne": true
            }
          },
          "floodplains": {
            "strategy": "default",
            "config": {
              "minLength": 4,
              "maxLength": 10
            }
          },
          "starts": {
            "strategy": "default",
            "config": {
              "overrides": {
                "startSectors": []
              }
            }
          }
        },
        "plot-landmass-regions": {},
        "placement": {}
      }
    }
  ) satisfies StandardRecipeConfig,
});
