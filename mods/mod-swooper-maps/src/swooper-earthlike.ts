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
import { bootstrap, MapOrchestrator } from "@swooper/mapgen-core";
import type { BootstrapConfig } from "@swooper/mapgen-core/bootstrap";

// ============================================================================
// Dynamic Plate Density Calculation
// ============================================================================
// Fewer, larger plates to encourage big continental masses.
const PLATE_DENSITY_TARGET = 240;
const PLATE_COUNT_MIN = 7;
const PLATE_COUNT_MAX = 18;

function calculatePlateCount(width: number, height: number): number {
  const totalTiles = width * height;
  const calculated = Math.floor(totalTiles / PLATE_DENSITY_TARGET);
  return Math.max(PLATE_COUNT_MIN, Math.min(PLATE_COUNT_MAX, calculated));
}

function buildConfig(plateCount: number): BootstrapConfig {
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
      placement: true,
    },
    overrides: {
      toggles: {
        STORY_ENABLE_HOTSPOTS: true,
        STORY_ENABLE_RIFTS: true,
        STORY_ENABLE_OROGENY: true,
        STORY_ENABLE_SWATCHES: true,
        STORY_ENABLE_PALEO: true,
        STORY_ENABLE_CORRIDORS: true,
      },
      landmass: {
        crustMode: "area",
        baseWaterPercent: 70,
        waterScalar: 1,
        boundaryBias: 0.05,
        boundaryShareTarget: 0.33,
        tectonics: {
          boundaryArcWeight: 0.2,
          interiorNoiseWeight: 0.8,
        },
      },
      margins: {
        activeFraction: 0.3,
        passiveFraction: 0.25,
        minSegmentLength: 12,
      },
      coastlines: {
        plateBias: {
          threshold: 0.15,
          power: 1.25,
          convergent: 2.6,
          transform: 0.2,
          divergent: 0.55,
          interior: 0.4,
          bayWeight: 0.7,
          bayNoiseBonus: 0.08,
          fjordWeight: 0.7,
        },
      },
      foundation: {
        mountains: {
          tectonicIntensity: 0.45,
          mountainThreshold: 0.72,
          hillThreshold: 0.33,
          upliftWeight: 0.34,
          fractalWeight: 0.735,
          riftDepth: 1,
          boundaryWeight: 1.0,
          boundaryExponent: 1.77,
          interiorPenaltyWeight: 0.0,
          convergenceBonus: 0.4,
          transformPenalty: 0.6,
          riftPenalty: 1.0,
          hillBoundaryWeight: 0.35,
          hillRiftBonus: 0.25,
          hillConvergentFoothill: 0.35,
          hillInteriorFalloff: 0.1,
          hillUpliftWeight: 0.2,
        },
        volcanoes: {
          baseDensity: 0.006,
          minSpacing: 4,
          boundaryThreshold: 0.3,
          boundaryWeight: 1.2,
          convergentMultiplier: 1.47,
          transformMultiplier: 0.8,
          divergentMultiplier: 0.3,
          hotspotWeight: 0.4,
          shieldPenalty: 0.2,
          randomJitter: 0.1,
          minVolcanoes: 4,
          maxVolcanoes: 20,
        },
        plates: {
          count: plateCount,
          convergenceMix: 0.6,
          relaxationSteps: 5,
          plateRotationMultiple: 1.6,
        },
        dynamics: {
          wind: {
            jetStreaks: 3,
            jetStrength: 1.0,
            variance: 0.5,
          },
          mantle: {
            bumps: 3,
            amplitude: 1.0,
            scale: 1,
          },
          directionality: {
            cohesion: 0.2,
            primaryAxes: {
              plateAxisDeg: 120,
              windBiasDeg: 0,
              currentBiasDeg: 70,
            },
            interplay: {
              windsFollowPlates: 0.4,
              currentsFollowWinds: 0.6,
            },
            hemispheres: {
              southernFlip: true,
            },
            variability: {
              angleJitterDeg: 15,
              magnitudeVariance: 0.5,
            },
          },
        },
        policy: {
          oceanSeparation: {
            enabled: false,
            baseSeparationTiles: 3,
            boundaryClosenessMultiplier: 0.9,
            maxPerRowDelta: 10,
            minChannelWidth: 3,
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
      climate: {
        baseline: {
          blend: {
            baseWeight: 0.8,
            bandWeight: 0.2,
          },
          bands: {
            deg0to10: 85,
            deg10to20: 65,
            deg20to35: 25,
            deg35to55: 55,
            deg55to70: 35,
            deg70plus: 15,
          },
          orographic: {
            hi1Threshold: 200,
            hi1Bonus: 10,
            hi2Threshold: 400,
            hi2Bonus: 20,
          },
          coastal: {
            coastalLandBonus: 30,
            spread: 5,
          },
          noise: {
            baseSpanSmall: 6,
            spanLargeScaleFactor: 1.1,
            scale: 0.12,
          },
        },
        refine: {
          waterGradient: {
            radius: 5,
            perRingBonus: 3,
            lowlandBonus: 7,
          },
          orographic: {
            steps: 4,
            reductionBase: 20,
            reductionPerStep: 10,
          },
          riverCorridor: {
            lowlandAdjacencyBonus: 15,
            highlandAdjacencyBonus: 5,
          },
          lowBasin: {
            radius: 3,
            delta: 10,
          },
        },
      },
      story: {
        hotspot: {
          paradiseBias: 1,
          volcanicBias: 1,
          volcanicPeakChance: 0.3,
        },
      },
      microclimate: {
        rainfall: {
          riftBoost: 10,
          riftRadius: 2,
          paradiseDelta: 10,
          volcanicDelta: 10,
        },
        features: {
          paradiseReefChance: 25,
          volcanicForestChance: 20,
          volcanicTaigaChance: 15,
        },
      },
      biomes: {
        tundra: {
          latMin: 55,
          elevMin: 350,
          rainMax: 55,
        },
        tropicalCoast: {
          latMax: 25,
          rainMin: 85,
        },
        riverValleyGrassland: {
          latMax: 55,
          rainMin: 55,
        },
        riftShoulder: {
          grasslandLatMax: 55,
          grasslandRainMin: 45,
          tropicalLatMax: 30,
          tropicalRainMin: 85,
        },
      },
      featuresDensity: {
        rainforestExtraChance: 8,
        forestExtraChance: 8,
        taigaExtraChance: 5,
        shelfReefMultiplier: 1.0,
      },
    },
  };
}

const orchestratorOptions = { logPrefix: "[SWOOPER_MOD]" };

engine.on("RequestMapInitData", () => {
  const defaultConfig = bootstrap({});
  const initOrchestrator = new MapOrchestrator(defaultConfig, orchestratorOptions);
  initOrchestrator.requestMapData();
});

engine.on("GenerateMap", () => {
  const width = GameplayMap.getGridWidth();
  const height = GameplayMap.getGridHeight();
  const totalTiles = width * height;

  const plateCount = calculatePlateCount(width, height);

  console.log(
    `[SWOOPER_MOD] Earthlike Dynamic Config: ${width}x${height} (${totalTiles} tiles) -> ${plateCount} plates`
  );

  const config = bootstrap(buildConfig(plateCount));
  const orchestrator = new MapOrchestrator(config, orchestratorOptions);
  orchestrator.generateMap();
});

console.log("[SWOOPER_MOD] ========================================");
console.log("[SWOOPER_MOD] Swooper Earthlike (TypeScript Build) Loaded");
console.log("[SWOOPER_MOD] Using MapOrchestrator from @swooper/mapgen-core");
console.log("[SWOOPER_MOD] ========================================");

