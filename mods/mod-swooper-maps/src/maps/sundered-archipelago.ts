/**
 * The Sundered Archipelago — Volcanic island chains and sunken continents (TypeScript)
 *
 * A world where massive tectonic rifting has shattered ancient continents:
 * - Hundreds of islands rather than continents (~82% water)
 * - Volcanic chains from active hotspots and subduction zones
 * - Shallow seas with coral reefs connecting island clusters
 * - Strategic straits and maritime corridors
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
 * Build the Sundered Archipelago configuration.
 * Creates a fragmented world of volcanic island chains.
 */
function buildConfig(): StandardRecipeOverrides {
  return {
      landmass: {
        // Less water, but fragmented into islands not continents
        baseWaterPercent: 65,
        waterScalar: 1,
        // Sharp edges to fragment land into islands
        crustEdgeBlend: 0.2,
        crustNoiseAmplitude: 0.25,
        // Normal continental height (was too low before!)
        continentalHeight: 0.45,
        oceanicHeight: -0.7,
        // Maximum boundary influence - all land at plate edges
        boundaryBias: 0.75,
        boundaryShareTarget: 0.65,
        tectonics: {
          // Maximum boundary arc weight - islands form along plate edges only
          boundaryArcWeight: 0.85,
          boundaryArcNoiseWeight: 0.7,
          // Minimal interior weight - no continental cores
          interiorNoiseWeight: 0.15,
          fractalGrain: 8,
        },
      },
      margins: {
        // Very high active fraction for volcanic arcs
        activeFraction: 0.55,
        passiveFraction: 0.12,
        minSegmentLength: 8,
      },
      coastlines: {
        plateBias: {
          threshold: 0.35,
          power: 1.5,
          // Strong convergent coasts for island arcs
          convergent: 2.0,
          transform: 0.5,
          divergent: -0.2,
          interior: 0.3,
          // Very complex coastlines for island detail
          bayWeight: 1.2,
          bayNoiseBonus: 0.8,
          fjordWeight: 0.9,
        },
      },
      mountains: {
        // Focused volcanic peaks rather than ranges
        tectonicIntensity: 0.7,
        mountainThreshold: 0.55,
        hillThreshold: 0.28,
        upliftWeight: 0.3,
        fractalWeight: 0.35,
        riftDepth: 0.4,
        // Strong boundary influence for arc volcanism
        boundaryWeight: 1.0,
        boundaryExponent: 1.5,
        interiorPenaltyWeight: 0.0,
        convergenceBonus: 0.9,
        transformPenalty: 0.4,
        riftPenalty: 0.6,
        hillBoundaryWeight: 0.5,
        hillRiftBonus: 0.35,
        hillConvergentFoothill: 0.4,
        hillInteriorFalloff: 0.2,
        hillUpliftWeight: 0.3,
      },
      volcanoes: {
        // High volcanic density for island chains
        baseDensity: 1 / 100,
        minSpacing: 2,
        boundaryThreshold: 0.2,
        boundaryWeight: 1.5,
        convergentMultiplier: 3.0,
        transformMultiplier: 1.3,
        divergentMultiplier: 0.6,
        // Maximum hotspot activity for volcanic chains
        hotspotWeight: 0.55,
        shieldPenalty: 0.3,
        randomJitter: 0.15,
        minVolcanoes: 12,
        maxVolcanoes: 55,
      },
      foundation: {
        plates: {
          // Maximum plates for island fragmentation
          count: 32,
          convergenceMix: 0.75,
          relaxationSteps: 4,
          plateRotationMultiple: 1.8,
        },
        dynamics: {
          wind: {
            jetStreaks: 5,
            jetStrength: 0.85,
            variance: 0.8,
          },
          mantle: {
            // Strong upwelling for hotspot chains
            bumps: 7,
            amplitude: 0.9,
            scale: 0.4,
          },
          directionality: {
            // Varied patterns for diverse island climates
            cohesion: 0.18,
            primaryAxes: {
              plateAxisDeg: 30,
              windBiasDeg: 25,
              currentBiasDeg: 35,
            },
            interplay: {
              windsFollowPlates: 0.2,
              currentsFollowWinds: 0.65,
            },
            hemispheres: {
              southernFlip: true,
              monsoonBias: 0.85,
              equatorBandDeg: 22,
            },
            variability: {
              // High variability for island-specific climates
              angleJitterDeg: 30,
              magnitudeVariance: 0.6,
            },
          },
        },
      },
      oceanSeparation: {
        enabled: false,
        baseSeparationTiles: 0,
        boundaryClosenessMultiplier: 1.0,
        maxPerRowDelta: 5,
        minChannelWidth: 3,
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
            // Very wet tropical maritime climate
            deg0to10: 140,
            deg10to20: 125,
            deg20to35: 100,
            deg35to55: 85,
            deg55to70: 65,
            deg70plus: 40,
          },
          orographic: {
            // Strong orographic effects on volcanic peaks
            hi1Threshold: 250,
            hi1Bonus: 15,
            hi2Threshold: 450,
            hi2Bonus: 12,
          },
          coastal: {
            // Very high coastal moisture for island world
            coastalLandBonus: 45,
            spread: 8,
          },
          noise: {
            baseSpanSmall: 4,
            spanLargeScaleFactor: 1.2,
            scale: 0.16,
          },
        },
        refine: {
          waterGradient: {
            radius: 8,
            perRingBonus: 6,
            lowlandBonus: 8,
          },
          orographic: {
            // Moderate rain shadow on larger islands
            steps: 4,
            reductionBase: 10,
            reductionPerStep: 6,
          },
          riverCorridor: {
            lowlandAdjacencyBonus: 20,
            highlandAdjacencyBonus: 10,
          },
          lowBasin: {
            radius: 3,
            delta: 10,
          },
        },
        story: {
          rainfall: {
            riftBoost: 15,
            riftRadius: 3,
            paradiseDelta: 12,
            volcanicDelta: 14,
          },
        },
        swatches: {
          maxPerMap: 8,
          forceAtLeastOne: true,
          sizeScaling: {
            widthMulSqrt: 0.28,
            lengthMulSqrt: 0.35,
          },
          types: {
            // No desert belt in maritime world
            macroDesertBelt: {
              weight: 1,
              latitudeCenterDeg: 25,
              halfWidthDeg: 6,
              drynessDelta: 12,
              bleedRadius: 2,
            },
            equatorialRainbelt: {
              weight: 8,
              latitudeCenterDeg: 0,
              halfWidthDeg: 15,
              wetnessDelta: 35,
              bleedRadius: 4,
            },
            rainforestArchipelago: {
              weight: 10,
              islandBias: 3.0,
              reefBias: 2.0,
              wetnessDelta: 30,
              bleedRadius: 4,
            },
            mountainForests: {
              weight: 5,
              coupleToOrogeny: true,
              windwardBonus: 12,
              leePenalty: 4,
              bleedRadius: 3,
            },
            greatPlains: {
              weight: 2,
              latitudeCenterDeg: 40,
              halfWidthDeg: 6,
              dryDelta: 8,
              lowlandMaxElevation: 250,
              bleedRadius: 3,
            },
          },
        },
      },
      story: {
        hotspot: {
          // Maximum paradise island frequency
          paradiseBias: 5,
          // High volcanic chain frequency
          volcanicBias: 5,
          volcanicPeakChance: 0.45,
        },
        features: {
          paradiseReefChance: 35,
          volcanicForestChance: 35,
          volcanicTaigaChance: 18,
        },
      },
      biomes: {
        tundra: {
          latMin: 78,
          elevMin: 600,
          rainMax: 70,
        },
        tropicalCoast: {
          latMax: 28,
          rainMin: 90,
        },
        riverValleyGrassland: {
          latMax: 55,
          rainMin: 70,
        },
        riftShoulder: {
          grasslandLatMax: 50,
          grasslandRainMin: 60,
          tropicalLatMax: 28,
          tropicalRainMin: 90,
        },
      },
      featuresDensity: {
        // Lush tropical islands
        rainforestExtraChance: 65,
        forestExtraChance: 55,
        taigaExtraChance: 18,
        // Abundant coral reefs
        shelfReefMultiplier: 1.4,
      },
  };
}

const runtimeOptions: MapRuntimeOptions = { logPrefix: "[SUNDERED_ARCHIPELAGO]" };
let mapInitData: MapInitResolution | null = null;

engine.on("RequestMapInitData", (initParams) => {
  mapInitData = applyMapInitData(runtimeOptions, initParams);
});

engine.on("GenerateMap", () => {
  const overrides = buildConfig();
  const init = mapInitData ?? resolveMapInitData(runtimeOptions);
  runStandardRecipe({ recipe: standardRecipe, init, overrides, options: runtimeOptions });
});

console.log("[SUNDERED_ARCHIPELAGO] ========================================");
console.log("[SUNDERED_ARCHIPELAGO] The Sundered Archipelago (TypeScript Build) Loaded");
console.log("[SUNDERED_ARCHIPELAGO] Volcanic island chains and maritime world");
console.log("[SUNDERED_ARCHIPELAGO] ========================================");
