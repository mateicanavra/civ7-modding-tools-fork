/**
 * Swooper Desert Mountains — Hyper-arid, plate-driven world (TypeScript)
 *
 * REFACTORED CONFIGURATION:
 * This version uses a completely standard, balanced configuration to eliminate
 * extreme mountain generation and start failures.
 *
 * It uses the migrated MapOrchestrator from @swooper/mapgen-core.
 */

/// <reference types="@civ7/types" />

import { bootstrap, MapOrchestrator } from "@swooper/mapgen-core";
import type { BootstrapOptions } from "@swooper/mapgen-core/bootstrap";

// ============================================================================
// Dynamic Plate Density Calculation
// ============================================================================
// Standard density target to ensure reasonable plate sizes.
// 500 tiles per plate ensures plates are large enough to have distinct
// interiors vs boundaries.
const PLATE_DENSITY_TARGET = 160;
const PLATE_COUNT_MIN = 9;
const PLATE_COUNT_MAX = 27;

/**
 * Calculate optimal plate count for the given map dimensions.
 * @param width - Map width in tiles
 * @param height - Map height in tiles
 * @returns Plate count clamped to [4, 24]
 */
function calculatePlateCount(width: number, height: number): number {
  const totalTiles = width * height;
  const calculated = Math.floor(totalTiles / PLATE_DENSITY_TARGET);
  return Math.max(PLATE_COUNT_MIN, Math.min(PLATE_COUNT_MAX, calculated));
}

/**
 * Build the bootstrap configuration with dynamic plate count.
 * Uses standard, balanced defaults to ensure playability.
 */
function buildConfig(plateCount: number): BootstrapOptions {
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
        // Enable standard story features for variety
        STORY_ENABLE_HOTSPOTS: true,
        STORY_ENABLE_RIFTS: true,
        STORY_ENABLE_OROGENY: true,
        STORY_ENABLE_SWATCHES: true,
        STORY_ENABLE_PALEO: true,
        STORY_ENABLE_CORRIDORS: true,
      },
      landmass: {
        crustMode: "area",
        baseWaterPercent: 43, // More ocean for distinct continents
        waterThumbOnScale: -1.5,
        jitterAmpFracBase: 0.015,
        boundaryBias: 0.1, // Slight bias towards boundaries for interest
        boundaryShareTarget: 0.4,
        tectonics: {
          boundaryArcWeight: 0.35, // Balanced
          interiorNoiseWeight: 0.6, // Balanced
        },
      },
      margins: {
        activeFraction: 0.35,
        passiveFraction: 0.2,
        minSegmentLength: 15,
      },
      coastlines: {
        plateBias: {
          threshold: 0.55,
          power: 1.0,
          convergent: 1.4,
          transform: 1.6,
          divergent: 0.6,
          interior: 0.2,
          bayWeight: 0.5,
          bayNoiseBonus: 0.5,
          fjordWeight: 0.8,
        },
      },
      // Configuration moved inside foundation to ensure it is picked up correctly
      // by the orchestrator without relying on complex merging logic.
      foundation: {
        mountains: {
          // Balanced physics settings for plate-driven terrain
          tectonicIntensity: 0.5, // Full intensity for proper mountain formation
          mountainThreshold: 0.7, // Slightly lowered for reliable mountain generation
          hillThreshold: 0.25, // Much lower - hill scores are inherently smaller than mountain scores
          upliftWeight: 0.37, // Standard uplift contribution
          fractalWeight: 0.635, // Standard fractal noise
          riftDepth: 0.2,
          boundaryWeight: 1.0, // Standard boundary weight
          boundaryExponent: 2.37, // Standard falloff
          interiorPenaltyWeight: 0.0, // Disabled as per mountains.ts defaults
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
          baseDensity: 0.008,
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
          maxVolcanoes: 25,
        },
        plates: {
          count: plateCount,
          convergenceMix: 0.65,
          relaxationSteps: 7, // Smoother cells
          seedJitter: 17,
          interiorSmooth: 17,
          plateRotationMultiple: 1.37,
        },
        dynamics: {
          wind: {
            jetStreaks: 3,
            jetStrength: 1.0,
            variance: 0.5,
          },
          currents: {
            basinGyreCountMax: 3,
            westernBoundaryBias: 1.2,
            currentStrength: 1.0,
          },
          mantle: {
            bumps: 3,
            amplitude: 1.0,
            scale: 1.0,
          },
          directionality: {
            cohesion: 0.2,
            primaryAxes: {
              plateAxisDeg: 127,
              windBiasDeg: 0,
              currentBiasDeg: 90,
            },
            interplay: {
              windsFollowPlates: 0.3,
              currentsFollowWinds: 0.5,
            },
            hemispheres: {
              southernFlip: true,
            },
            variability: {
              angleJitterDeg: 15,
              magnitudeVariance: 0.3,
            },
          },
        },
        policy: {
          windInfluence: 1.0,
          currentHumidityBias: 0.5,
          boundaryFjordBias: 0.8,
          shelfReefBias: 0.5,
          oceanSeparation: {
            enabled: false, // Ensure oceans separate continents
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
            baseWeight: 0.5,
            bandWeight: 0.5,
          },
          bands: {
            // Standard Earth-like distribution
            deg0to10: 80, // Wet tropics
            deg10to20: 60,
            deg20to35: 20, // Deserts
            deg35to55: 60, // Temperate
            deg55to70: 40,
            deg70plus: 20,
          },
          orographic: {
            hi1Threshold: 200,
            hi1Bonus: 10,
            hi2Threshold: 400,
            hi2Bonus: 20,
          },
          coastal: {
            coastalLandBonus: 10,
            shallowAdjBonus: 5,
          },
          noise: {
            baseSpanSmall: 3,
            spanLargeScaleFactor: 1.0,
          },
        },
        refine: {
          waterGradient: {
            radius: 5,
            perRingBonus: 2,
            lowlandBonus: 5,
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
          maxTrails: 5,
          steps: 8,
          stepLen: 2,
          minDistFromLand: 4,
          minTrailSeparation: 10,
          paradiseBias: 1,
          volcanicBias: 1,
          volcanicPeakChance: 0.3,
        },
        rift: {
          maxRiftsPerMap: 2,
          lineSteps: 15,
          stepLen: 2,
          shoulderWidth: 1,
        },
        orogeny: {
          beltMaxPerContinent: 2,
          beltMinLength: 10,
          radius: 5,
          windwardBoost: 15,
          leeDrynessAmplifier: 1.5,
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
              bleedRadius: 5,
            },
            equatorialRainbelt: {
              weight: 10,
              latitudeCenterDeg: 0,
              halfWidthDeg: 8,
              wetnessDelta: 40,
              bleedRadius: 5,
            },
            mountainForests: {
              weight: 5,
              coupleToOrogeny: true,
              windwardBonus: 15,
              leePenalty: 10,
              bleedRadius: 3,
            },
            rainforestArchipelago: {
              weight: 5,
              islandBias: 1.2,
              reefBias: 1.2,
              wetnessDelta: 20,
              bleedRadius: 3,
            },
          },
        },
        paleo: {
          maxFossilChannels: 12,
          fossilChannelLengthTiles: 12,
          fossilChannelStep: 2,
          fossilChannelHumidity: 10,
          fossilChannelMinDistanceFromCurrentRivers: 4,
          sizeScaling: {
            lengthMulSqrt: 0.8,
          },
          elevationCarving: {
            enableCanyonRim: true,
            rimWidth: 3,
            canyonDryBonus: 10,
            bluffWetReduction: 5,
          },
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
          latMin: 60,
          elevMin: 400,
          rainMax: 60,
        },
        tropicalCoast: {
          latMax: 23,
          rainMin: 80,
        },
        riverValleyGrassland: {
          latMax: 50,
          rainMin: 50,
        },
        riftShoulder: {
          grasslandLatMax: 50,
          grasslandRainMin: 40,
          tropicalLatMax: 30,
          tropicalRainMin: 80,
        },
      },
      featuresDensity: {
        rainforestExtraChance: 10,
        forestExtraChance: 10,
        taigaExtraChance: 5,
        shelfReefMultiplier: 1.0,
      },
    },
  };
}

// Create orchestrator instance
const orchestrator = new MapOrchestrator({
  logPrefix: "[SWOOPER_MOD]",
});

// Wire engine events to orchestrator methods
engine.on("RequestMapInitData", () => orchestrator.requestMapData());

// CRITICAL: Bootstrap configuration happens INSIDE GenerateMap event.
// This ensures we read the *actual* player-selected map dimensions,
// which are not available when the script file first loads.
engine.on("GenerateMap", () => {
  // 1. Get runtime dimensions (finalized by engine at this point)
  const width = GameplayMap.getGridWidth();
  const height = GameplayMap.getGridHeight();
  const totalTiles = width * height;

  // 2. Calculate dynamic plate count (1 plate per 500 tiles)
  const plateCount = calculatePlateCount(width, height);

  console.log(
    `[SWOOPER_MOD] Dynamic Config: ${width}x${height} (${totalTiles} tiles) -> ${plateCount} plates`
  );

  // 3. Bootstrap with just-in-time configuration
  bootstrap(buildConfig(plateCount));

  // 4. Run generation with the new config
  orchestrator.generateMap();
});

// TypeScript build marker
console.log("[SWOOPER_MOD] ========================================");
console.log("[SWOOPER_MOD] Swooper Desert Mountains (TypeScript Build) Loaded");
console.log("[SWOOPER_MOD] Using MapOrchestrator from @swooper/mapgen-core");
console.log("[SWOOPER_MOD] ========================================");
