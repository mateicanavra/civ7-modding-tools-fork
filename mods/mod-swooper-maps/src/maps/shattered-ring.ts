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

import "@swooper/mapgen-core/polyfills/text-encoder";
import standardRecipe from "../recipes/standard/recipe.js";
import { applyMapInitData, resolveMapInitData } from "./_runtime/map-init.js";
import { runStandardRecipe } from "./_runtime/run-standard.js";
import type { MapInitResolution } from "./_runtime/map-init.js";
import type { MapRuntimeOptions } from "./_runtime/types.js";
import type { StandardRecipeOverrides } from "./_runtime/standard-config.js";

/**
 * Build the Shattered Ring configuration.
 * Creates a ring-shaped continental structure around a central sea.
 */
function buildConfig(): StandardRecipeOverrides {
  return {
      landmass: {
        // Central crater sea with ring continent
        baseWaterPercent: 62,
        waterScalar: 1,
        // Sharp continental edges from impact scarring
        crustEdgeBlend: 0.15,
        crustNoiseAmplitude: 0.12,
        continentalHeight: 0.45,
        oceanicHeight: -0.8,
        // Strong plate-driven coasts for ring structure
        boundaryBias: 0.45,
        boundaryShareTarget: 0.35,
        tectonics: {
          // Strong coastal arcs for ring formation
          boundaryArcWeight: 0.55,
          boundaryArcNoiseWeight: 0.4,
          interiorNoiseWeight: 0.6,
          fractalGrain: 6,
        },
      },
      margins: {
        // High active fraction for ring volcanism
        activeFraction: 0.45,
        passiveFraction: 0.15,
        minSegmentLength: 10,
      },
      coastlines: {
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
      },
      mountains: {
        // High intensity for ring mountain formation
        tectonicIntensity: 0.85,
        mountainThreshold: 0.5,
        hillThreshold: 0.3,
        upliftWeight: 0.45,
        fractalWeight: 0.25,
        riftDepth: 0.35,
        // Strong emphasis on plate boundaries for the ring
        boundaryWeight: 1.2,
        boundaryExponent: 1.8,
        interiorPenaltyWeight: 0.0,
        convergenceBonus: 0.85,
        transformPenalty: 0.5,
        riftPenalty: 0.8,
        hillBoundaryWeight: 0.4,
        hillRiftBonus: 0.3,
        hillConvergentFoothill: 0.45,
        hillInteriorFalloff: 0.15,
        hillUpliftWeight: 0.25,
      },
      volcanoes: {
        // High volcanic activity in crater sea
        baseDensity: 1 / 140,
        minSpacing: 3,
        boundaryThreshold: 0.25,
        boundaryWeight: 1.4,
        convergentMultiplier: 2.8,
        transformMultiplier: 1.2,
        divergentMultiplier: 0.5,
        // Strong hotspot activity for crater islands
        hotspotWeight: 0.45,
        shieldPenalty: 0.4,
        randomJitter: 0.12,
        minVolcanoes: 8,
        maxVolcanoes: 40,
      },
      foundation: {
        plates: {
          // High plate count for complex ring fracturing
          count: 28,
          convergenceMix: 0.7,
          relaxationSteps: 6,
          plateRotationMultiple: 1.5,
        },
        dynamics: {
          wind: {
            jetStreaks: 4,
            jetStrength: 0.9,
            variance: 0.7,
          },
          mantle: {
            // Strong upwelling in crater center
            bumps: 5,
            amplitude: 0.85,
            scale: 0.5,
          },
          directionality: {
            // Lower coherence for radial patterns
            cohesion: 0.12,
            primaryAxes: {
              plateAxisDeg: 45,
              windBiasDeg: 20,
              currentBiasDeg: 30,
            },
            interplay: {
              windsFollowPlates: 0.25,
              currentsFollowWinds: 0.5,
            },
            hemispheres: {
              southernFlip: true,
              monsoonBias: 0.7,
              equatorBandDeg: 20,
            },
            variability: {
              // High variability for radial flow patterns
              angleJitterDeg: 25,
              magnitudeVariance: 0.55,
            },
          },
        },
      },
      oceanSeparation: {
        enabled: false,
        baseSeparationTiles: 0,
        boundaryClosenessMultiplier: 1.0,
        maxPerRowDelta: 4,
        minChannelWidth: 5,
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
      climate: {
        baseline: {
          blend: {
            baseWeight: 0,
            bandWeight: 1,
          },
          bands: {
            // Moderate tropical due to ring disruption
            deg0to10: 110,
            deg10to20: 95,
            // Strong ring mountain rain shadow
            deg20to35: 45,
            deg35to55: 80,
            deg55to70: 55,
            deg70plus: 35,
          },
          orographic: {
            // Strong rain shadow from ring mountains
            hi1Threshold: 280,
            hi1Bonus: 12,
            hi2Threshold: 500,
            hi2Bonus: 10,
          },
          coastal: {
            coastalLandBonus: 30,
            spread: 6,
          },
          noise: {
            baseSpanSmall: 5,
            spanLargeScaleFactor: 1.1,
            scale: 0.14,
          },
        },
        refine: {
          waterGradient: {
            radius: 7,
            perRingBonus: 5,
            lowlandBonus: 6,
          },
          orographic: {
            // Strong rain shadow reduction
            steps: 5,
            reductionBase: 12,
            reductionPerStep: 7,
          },
          riverCorridor: {
            lowlandAdjacencyBonus: 18,
            highlandAdjacencyBonus: 8,
          },
          lowBasin: {
            radius: 4,
            delta: 9,
          },
        },
        story: {
          rainfall: {
            riftBoost: 12,
            riftRadius: 3,
            paradiseDelta: 8,
            volcanicDelta: 10,
          },
        },
        swatches: {
          maxPerMap: 7,
          forceAtLeastOne: true,
          sizeScaling: {
            widthMulSqrt: 0.35,
            lengthMulSqrt: 0.45,
          },
          types: {
            // Ring-specific climate zones
            macroDesertBelt: {
              weight: 5,
              latitudeCenterDeg: 28,
              halfWidthDeg: 12,
              drynessDelta: 25,
              bleedRadius: 4,
            },
            equatorialRainbelt: {
              weight: 5,
              latitudeCenterDeg: 0,
              halfWidthDeg: 12,
              wetnessDelta: 30,
              bleedRadius: 4,
            },
            rainforestArchipelago: {
              weight: 6,
              islandBias: 2.0,
              reefBias: 1.2,
              wetnessDelta: 22,
              bleedRadius: 3,
            },
            mountainForests: {
              weight: 4,
              coupleToOrogeny: true,
              windwardBonus: 8,
              leePenalty: 3,
              bleedRadius: 3,
            },
            greatPlains: {
              weight: 4,
              latitudeCenterDeg: 42,
              halfWidthDeg: 10,
              dryDelta: 12,
              lowlandMaxElevation: 280,
              bleedRadius: 5,
            },
          },
        },
      },
      story: {
        hotspot: {
          // Tropical paradise islands in crater sea
          paradiseBias: 3,
          // Strong volcanic chains in crater
          volcanicBias: 4,
          volcanicPeakChance: 0.4,
        },
        features: {
          paradiseReefChance: 22,
          volcanicForestChance: 28,
          volcanicTaigaChance: 20,
        },
      },
      biomes: {
        tundra: {
          latMin: 75,
          elevMin: 650,
          rainMax: 80,
        },
        tropicalCoast: {
          latMax: 22,
          rainMin: 95,
        },
        riverValleyGrassland: {
          latMax: 60,
          rainMin: 75,
        },
        riftShoulder: {
          grasslandLatMax: 52,
          grasslandRainMin: 65,
          tropicalLatMax: 22,
          tropicalRainMin: 95,
        },
      },
      featuresDensity: {
        // Lush crater islands
        rainforestExtraChance: 55,
        forestExtraChance: 45,
        taigaExtraChance: 22,
        shelfReefMultiplier: 1.0,
      },
  };
}

const runtimeOptions: MapRuntimeOptions = { logPrefix: "[SHATTERED_RING]" };
let mapInitData: MapInitResolution | null = null;

engine.on("RequestMapInitData", (initParams) => {
  mapInitData = applyMapInitData(runtimeOptions, initParams);
});

engine.on("GenerateMap", () => {
  const overrides = buildConfig();
  const init = mapInitData ?? resolveMapInitData(runtimeOptions);
  runStandardRecipe({ recipe: standardRecipe, init, overrides, options: runtimeOptions });
});

console.log("[SHATTERED_RING] ========================================");
console.log("[SHATTERED_RING] The Shattered Ring (TypeScript Build) Loaded");
console.log("[SHATTERED_RING] Post-impact crater world with ring mountains");
console.log("[SHATTERED_RING] ========================================");
