import {
  MapOrchestrator,
  bootstrap
} from "./chunk-V65UJZNM.js";

// src/swooper-desert-mountains.ts
bootstrap({
  stageConfig: {
    foundation: true,
    landmassPlates: true,
    coastlines: true,
    storySeed: true,
    storyHotspots: true,
    storyRifts: true,
    storyOrogeny: true,
    storyPaleo: true,
    storyCorridorsPre: true,
    mountains: true,
    volcanoes: true,
    climateBaseline: true,
    storySwatches: true,
    climateRefine: true,
    biomes: true,
    features: true
  },
  overrides: {
    toggles: {
      STORY_ENABLE_HOTSPOTS: false,
      STORY_ENABLE_RIFTS: false,
      STORY_ENABLE_OROGENY: false,
      STORY_ENABLE_SWATCHES: false,
      STORY_ENABLE_PALEO: false,
      STORY_ENABLE_CORRIDORS: false
    },
    landmass: {
      baseWaterPercent: 63,
      waterThumbOnScale: -6,
      jitterAmpFracBase: 0.02
    },
    margins: {
      activeFraction: 0.34,
      passiveFraction: 0.18,
      minSegmentLength: 28
    },
    coastlines: {
      plateBias: {
        threshold: 0.54,
        power: 1.25,
        convergent: 1.1,
        transform: 0.45,
        divergent: -0.2,
        interior: -0.15,
        bayWeight: 0.48,
        bayNoiseBonus: 1.2,
        fjordWeight: 1.05
      }
    },
    mountains: {
      // Physics-threshold controls (higher intensity = more dramatic mountains)
      tectonicIntensity: 0.77,
      // Moderate intensity for balanced mountains
      mountainThreshold: 0.62,
      // Higher threshold = fewer mountains
      hillThreshold: 0.2,
      // Higher threshold = fewer hills
      // Physics weights
      upliftWeight: 0.65,
      fractalWeight: 0.35,
      riftDepth: 0.4,
      boundaryWeight: 0.7,
      boundaryExponent: 1.35,
      interiorPenaltyWeight: 0.6,
      convergenceBonus: 0.9,
      transformPenalty: 0.3,
      riftPenalty: 0.9,
      hillBoundaryWeight: 0.5,
      hillRiftBonus: 0.52,
      hillConvergentFoothill: 0.4,
      hillInteriorFalloff: 0.3,
      hillUpliftWeight: 0.4
    },
    volcanoes: {
      baseDensity: 1 / 175,
      minSpacing: 5,
      boundaryThreshold: 0.3,
      boundaryWeight: 1.6,
      convergentMultiplier: 3.25,
      transformMultiplier: 0.9,
      divergentMultiplier: 0.22,
      hotspotWeight: 0.16,
      shieldPenalty: 0.78,
      randomJitter: 0.12,
      minVolcanoes: 9,
      maxVolcanoes: 42
    },
    climate: {
      baseline: {
        blend: {
          baseWeight: 0.45,
          bandWeight: 0.55
        },
        bands: {
          deg0to10: 92,
          deg10to20: 64,
          deg20to35: 32,
          deg35to55: 52,
          deg55to70: 34,
          deg70plus: 18
        },
        orographic: {
          hi1Threshold: 280,
          hi1Bonus: 6,
          hi2Threshold: 540,
          hi2Bonus: 18
        },
        coastal: {
          coastalLandBonus: 3,
          shallowAdjBonus: 2
        },
        noise: {
          baseSpanSmall: 5,
          spanLargeScaleFactor: 1.1
        }
      },
      refine: {
        waterGradient: {
          radius: 7,
          perRingBonus: 1.6,
          lowlandBonus: 3
        },
        orographic: {
          steps: 6,
          reductionBase: 34,
          reductionPerStep: 14
        },
        riverCorridor: {
          lowlandAdjacencyBonus: 22,
          highlandAdjacencyBonus: 11
        },
        lowBasin: {
          radius: 4,
          delta: 16
        }
      }
    },
    story: {
      hotspot: {
        maxTrails: 9,
        steps: 13,
        stepLen: 2,
        minDistFromLand: 6,
        minTrailSeparation: 14,
        paradiseBias: 1,
        volcanicBias: 2,
        volcanicPeakChance: 0.58
      },
      rift: {
        maxRiftsPerMap: 2,
        lineSteps: 22,
        stepLen: 3,
        shoulderWidth: 1
      },
      orogeny: {
        beltMaxPerContinent: 4,
        beltMinLength: 16,
        radius: 7,
        windwardBoost: 24,
        leeDrynessAmplifier: 2.6
      },
      swatches: {
        maxPerMap: 8,
        forceAtLeastOne: true,
        types: {
          macroDesertBelt: {
            weight: 20,
            latitudeCenterDeg: 18,
            halfWidthDeg: 18,
            drynessDelta: 60,
            bleedRadius: 10
          },
          equatorialRainbelt: {
            weight: 7,
            latitudeCenterDeg: 4,
            halfWidthDeg: 6,
            wetnessDelta: 70,
            bleedRadius: 5
          },
          mountainForests: {
            weight: 5,
            coupleToOrogeny: true,
            windwardBonus: 18,
            leePenalty: 10,
            bleedRadius: 5
          },
          rainforestArchipelago: {
            weight: 2,
            islandBias: 1.5,
            reefBias: 1.2,
            wetnessDelta: 28,
            bleedRadius: 4
          }
        }
      },
      paleo: {
        maxFossilChannels: 24,
        fossilChannelLengthTiles: 18,
        fossilChannelStep: 2,
        fossilChannelHumidity: 7,
        fossilChannelMinDistanceFromCurrentRivers: 5,
        sizeScaling: {
          lengthMulSqrt: 0.8
        },
        elevationCarving: {
          enableCanyonRim: true,
          rimWidth: 5,
          canyonDryBonus: 12,
          bluffWetReduction: 2
        }
      }
    },
    microclimate: {
      rainfall: {
        riftBoost: 6,
        riftRadius: 2,
        paradiseDelta: 4,
        volcanicDelta: 5
      },
      features: {
        paradiseReefChance: 18,
        volcanicForestChance: 14,
        volcanicTaigaChance: 12
      }
    },
    biomes: {
      tundra: {
        latMin: 62,
        elevMin: 420,
        rainMax: 55
      },
      tropicalCoast: {
        latMax: 22,
        rainMin: 115
      },
      riverValleyGrassland: {
        latMax: 48,
        rainMin: 65
      },
      riftShoulder: {
        grasslandLatMax: 48,
        grasslandRainMin: 55,
        tropicalLatMax: 28,
        tropicalRainMin: 95
      }
    },
    featuresDensity: {
      rainforestExtraChance: 18,
      forestExtraChance: 12,
      taigaExtraChance: 2,
      shelfReefMultiplier: 0.85
    },
    foundation: {
      plates: {
        count: 23,
        convergenceMix: 0.55,
        relaxationSteps: 3,
        seedJitter: 5,
        interiorSmooth: 1.35,
        plateRotationMultiple: 3
      },
      dynamics: {
        wind: {
          jetStreaks: 5,
          jetStrength: 2,
          variance: 0.4
        },
        currents: {
          basinGyreCountMax: 4,
          westernBoundaryBias: 1.6,
          currentStrength: 1.4
        },
        mantle: {
          bumps: 10,
          amplitude: 6,
          scale: 1.8
        },
        directionality: {
          cohesion: 0.48,
          primaryAxes: {
            plateAxisDeg: 47,
            windBiasDeg: 24,
            currentBiasDeg: 85
          },
          interplay: {
            windsFollowPlates: 0.55,
            currentsFollowWinds: 0.62
          },
          hemispheres: {
            southernFlip: true
          },
          variability: {
            angleJitterDeg: 22,
            magnitudeVariance: 0.45
          }
        }
      },
      policy: {
        windInfluence: 1.2,
        currentHumidityBias: 0.6,
        boundaryFjordBias: 1.1,
        shelfReefBias: 0.7,
        oceanSeparation: {
          enabled: false,
          baseSeparationTiles: 0,
          boundaryClosenessMultiplier: 0,
          maxPerRowDelta: 0,
          minChannelWidth: 5,
          respectSeaLanes: true,
          edgeWest: {
            enabled: false,
            baseTiles: 0,
            boundaryClosenessMultiplier: 1,
            maxPerRowDelta: 1
          },
          edgeEast: {
            enabled: false,
            baseTiles: 0,
            boundaryClosenessMultiplier: 1,
            maxPerRowDelta: 1
          }
        }
      }
    }
  }
});
var orchestrator = new MapOrchestrator({
  logPrefix: "[SWOOPER_MOD]"
});
engine.on("RequestMapInitData", () => orchestrator.requestMapData());
engine.on("GenerateMap", () => orchestrator.generateMap());
console.log("[SWOOPER_MOD] ========================================");
console.log("[SWOOPER_MOD] Swooper Desert Mountains (TypeScript Build) Loaded");
console.log("[SWOOPER_MOD] Using MapOrchestrator from @swooper/mapgen-core");
console.log("[SWOOPER_MOD] ========================================");
