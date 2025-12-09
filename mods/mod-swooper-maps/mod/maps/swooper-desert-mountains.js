import {
  MapOrchestrator,
  bootstrap
} from "./chunk-UNNX7WFS.js";

// src/swooper-desert-mountains.ts
var PLATE_DENSITY_TARGET = 160;
var PLATE_COUNT_MIN = 9;
var PLATE_COUNT_MAX = 27;
function calculatePlateCount(width, height) {
  const totalTiles = width * height;
  const calculated = Math.floor(totalTiles / PLATE_DENSITY_TARGET);
  return Math.max(PLATE_COUNT_MIN, Math.min(PLATE_COUNT_MAX, calculated));
}
function buildConfig(plateCount) {
  return {
    stageConfig: {
      foundation: true,
      landmassPlates: true,
      coastlines: true,
      storySeed: true,
      storyHotspots: true,
      storyRifts: true,
      storyOrogeny: true,
      storyCorridorsPre: true,
      storyPaleo: true,
      storySwatches: true,
      mountains: true,
      volcanoes: true,
      climateBaseline: true,
      climateRefine: true,
      biomes: true,
      features: true,
      rivers: true,
      placement: true
    },
    overrides: {
      toggles: {
        // Enable standard story features for variety
        STORY_ENABLE_HOTSPOTS: true,
        STORY_ENABLE_RIFTS: true,
        STORY_ENABLE_OROGENY: true,
        STORY_ENABLE_SWATCHES: true,
        STORY_ENABLE_PALEO: true,
        STORY_ENABLE_CORRIDORS: true
      },
      landmass: {
        crustMode: "area",
        baseWaterPercent: 43,
        // More ocean for distinct continents
        waterThumbOnScale: -1.5,
        jitterAmpFracBase: 0.015,
        boundaryBias: 0.1,
        // Slight bias towards boundaries for interest
        boundaryShareTarget: 0.4,
        tectonics: {
          boundaryArcWeight: 0.35,
          // Balanced
          interiorNoiseWeight: 0.6
          // Balanced
        }
      },
      margins: {
        activeFraction: 0.35,
        passiveFraction: 0.2,
        minSegmentLength: 15
      },
      coastlines: {
        plateBias: {
          threshold: 0.35,
          power: 1.3,
          convergent: 1.25,
          transform: 0.75,
          divergent: 0.5,
          interior: 0.2,
          bayWeight: 0.5,
          bayNoiseBonus: 0.5,
          fjordWeight: 0.8
        }
      },
      // Configuration moved inside foundation to ensure it is picked up correctly
      // by the orchestrator without relying on complex merging logic.
      foundation: {
        mountains: {
          // Balanced physics settings for plate-driven terrain
          tectonicIntensity: 0.5,
          // Full intensity for proper mountain formation
          mountainThreshold: 0.7,
          // Slightly lowered for reliable mountain generation
          hillThreshold: 0.25,
          // Much lower - hill scores are inherently smaller than mountain scores
          upliftWeight: 0.37,
          // Standard uplift contribution
          fractalWeight: 0.635,
          // Standard fractal noise
          riftDepth: 0.2,
          boundaryWeight: 1,
          // Standard boundary weight
          boundaryExponent: 2.37,
          // Standard falloff
          interiorPenaltyWeight: 0,
          // Disabled as per mountains.ts defaults
          convergenceBonus: 0.4,
          transformPenalty: 0.6,
          riftPenalty: 1,
          hillBoundaryWeight: 0.35,
          hillRiftBonus: 0.25,
          hillConvergentFoothill: 0.35,
          hillInteriorFalloff: 0.1,
          hillUpliftWeight: 0.2
        },
        volcanoes: {
          baseDensity: 8e-3,
          minSpacing: 4,
          boundaryThreshold: 0.3,
          boundaryWeight: 1.2,
          convergentMultiplier: 2.5,
          transformMultiplier: 0.8,
          divergentMultiplier: 0.3,
          hotspotWeight: 0.4,
          shieldPenalty: 0.5,
          randomJitter: 0.1,
          minVolcanoes: 5,
          maxVolcanoes: 25
        },
        plates: {
          count: plateCount,
          convergenceMix: 0.65,
          relaxationSteps: 4,
          // Smoother cells
          seedJitter: 21,
          interiorSmooth: 15,
          plateRotationMultiple: 1.77
        },
        dynamics: {
          wind: {
            jetStreaks: 3,
            jetStrength: 1,
            variance: 0.5
          },
          currents: {
            basinGyreCountMax: 3,
            westernBoundaryBias: 1.2,
            currentStrength: 1
          },
          mantle: {
            bumps: 3,
            amplitude: 1,
            scale: 1
          },
          directionality: {
            cohesion: 0.2,
            primaryAxes: {
              plateAxisDeg: 127,
              windBiasDeg: 0,
              currentBiasDeg: 90
            },
            interplay: {
              windsFollowPlates: 0.3,
              currentsFollowWinds: 0.5
            },
            hemispheres: {
              southernFlip: true
            },
            variability: {
              angleJitterDeg: 15,
              magnitudeVariance: 0.3
            }
          }
        },
        policy: {
          windInfluence: 1,
          currentHumidityBias: 0.5,
          boundaryFjordBias: 0.8,
          shelfReefBias: 0.5,
          oceanSeparation: {
            enabled: false,
            // Ensure oceans separate continents
            baseSeparationTiles: 3,
            boundaryClosenessMultiplier: 0.9,
            maxPerRowDelta: 10,
            minChannelWidth: 3,
            respectSeaLanes: true,
            edgeWest: {
              enabled: false,
              baseTiles: 3,
              boundaryClosenessMultiplier: 0.5,
              maxPerRowDelta: 1
            },
            edgeEast: {
              enabled: false,
              baseTiles: 3,
              boundaryClosenessMultiplier: 0.5,
              maxPerRowDelta: 1
            }
          }
        }
      },
      climate: {
        baseline: {
          blend: {
            baseWeight: 0.5,
            bandWeight: 0.5
          },
          bands: {
            // Standard Earth-like distribution
            deg0to10: 80,
            // Wet tropics
            deg10to20: 60,
            deg20to35: 20,
            // Deserts
            deg35to55: 60,
            // Temperate
            deg55to70: 40,
            deg70plus: 20
          },
          orographic: {
            hi1Threshold: 200,
            hi1Bonus: 10,
            hi2Threshold: 400,
            hi2Bonus: 20
          },
          coastal: {
            coastalLandBonus: 10,
            shallowAdjBonus: 5
          },
          noise: {
            baseSpanSmall: 3,
            spanLargeScaleFactor: 1
          }
        },
        refine: {
          waterGradient: {
            radius: 5,
            perRingBonus: 2,
            lowlandBonus: 5
          },
          orographic: {
            steps: 4,
            reductionBase: 20,
            reductionPerStep: 10
          },
          riverCorridor: {
            lowlandAdjacencyBonus: 15,
            highlandAdjacencyBonus: 5
          },
          lowBasin: {
            radius: 3,
            delta: 10
          }
        }
      },
      story: {
        hotspot: {
          maxTrails: 5,
          steps: 8,
          stepLen: 2,
          minDistFromLand: 4,
          minTrailSeparation: 10,
          paradiseBias: 1,
          volcanicBias: 1,
          volcanicPeakChance: 0.3
        },
        rift: {
          maxRiftsPerMap: 2,
          lineSteps: 15,
          stepLen: 2,
          shoulderWidth: 1
        },
        orogeny: {
          beltMaxPerContinent: 2,
          beltMinLength: 10,
          radius: 5,
          windwardBoost: 15,
          leeDrynessAmplifier: 1.5
        },
        swatches: {
          maxPerMap: 4,
          forceAtLeastOne: false,
          types: {
            macroDesertBelt: {
              weight: 10,
              latitudeCenterDeg: 30,
              halfWidthDeg: 10,
              drynessDelta: 40,
              bleedRadius: 5
            },
            equatorialRainbelt: {
              weight: 10,
              latitudeCenterDeg: 0,
              halfWidthDeg: 8,
              wetnessDelta: 40,
              bleedRadius: 5
            },
            mountainForests: {
              weight: 5,
              coupleToOrogeny: true,
              windwardBonus: 15,
              leePenalty: 10,
              bleedRadius: 3
            },
            rainforestArchipelago: {
              weight: 5,
              islandBias: 1.2,
              reefBias: 1.2,
              wetnessDelta: 20,
              bleedRadius: 3
            }
          }
        },
        paleo: {
          maxFossilChannels: 12,
          fossilChannelLengthTiles: 12,
          fossilChannelStep: 2,
          fossilChannelHumidity: 10,
          fossilChannelMinDistanceFromCurrentRivers: 4,
          sizeScaling: {
            lengthMulSqrt: 0.8
          },
          elevationCarving: {
            enableCanyonRim: true,
            rimWidth: 3,
            canyonDryBonus: 10,
            bluffWetReduction: 5
          }
        }
      },
      microclimate: {
        rainfall: {
          riftBoost: 10,
          riftRadius: 2,
          paradiseDelta: 10,
          volcanicDelta: 10
        },
        features: {
          paradiseReefChance: 25,
          volcanicForestChance: 20,
          volcanicTaigaChance: 15
        }
      },
      biomes: {
        tundra: {
          latMin: 60,
          elevMin: 400,
          rainMax: 60
        },
        tropicalCoast: {
          latMax: 23,
          rainMin: 80
        },
        riverValleyGrassland: {
          latMax: 50,
          rainMin: 50
        },
        riftShoulder: {
          grasslandLatMax: 50,
          grasslandRainMin: 40,
          tropicalLatMax: 30,
          tropicalRainMin: 80
        }
      },
      featuresDensity: {
        rainforestExtraChance: 10,
        forestExtraChance: 10,
        taigaExtraChance: 5,
        shelfReefMultiplier: 1
      }
    }
  };
}
var orchestrator = new MapOrchestrator({
  logPrefix: "[SWOOPER_MOD]"
});
engine.on("RequestMapInitData", () => orchestrator.requestMapData());
engine.on("GenerateMap", () => {
  const width = GameplayMap.getGridWidth();
  const height = GameplayMap.getGridHeight();
  const totalTiles = width * height;
  const plateCount = calculatePlateCount(width, height);
  console.log(
    `[SWOOPER_MOD] Dynamic Config: ${width}x${height} (${totalTiles} tiles) -> ${plateCount} plates`
  );
  bootstrap(buildConfig(plateCount));
  orchestrator.generateMap();
});
console.log("[SWOOPER_MOD] ========================================");
console.log("[SWOOPER_MOD] Swooper Desert Mountains (TypeScript Build) Loaded");
console.log("[SWOOPER_MOD] Using MapOrchestrator from @swooper/mapgen-core");
console.log("[SWOOPER_MOD] ========================================");
