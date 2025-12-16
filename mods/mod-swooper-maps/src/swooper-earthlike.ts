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
import { bootstrap, MapOrchestrator, OrchestratorConfig } from "@swooper/mapgen-core";
import type { BootstrapConfig } from "@swooper/mapgen-core/bootstrap";

function buildConfig(): BootstrapConfig {
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
      landmass: {
        crustMode: "area",
        // Earth-like ocean dominance (~70% water).
        baseWaterPercent: 63,
        waterScalar: 1,
        // Crust-first height tuning to preserve water even with broken boundary fields.
        crustEdgeBlend: 0.35,
        crustNoiseAmplitude: 0.1,
        continentalHeight: 0.4,
        oceanicHeight: -0.75,
        // Moderate margin bias: enough active coasts, plenty of passive shelves.
        boundaryBias: 0.2,
        boundaryShareTarget: 0.2,
        tectonics: {
          // Favor coastal arcs (Andes/Ring of Fire) but keep thick interiors.
          boundaryArcWeight: 0.37,
          boundaryArcNoiseWeight: 0.35,
          interiorNoiseWeight: 0.75,
          fractalGrain: 5,
        },
      },
      margins: {
        activeFraction: 0.33,
        passiveFraction: 0.22,
        minSegmentLength: 12,
      },
      coastlines: {
        plateBias: {
          // Close to crust-first defaults with a gentle nudge for Earth coasts.
          threshold: 0.45,
          power: 1.25,
          convergent: 1.4,
          transform: 0.4,
          divergent: -0.4,
          interior: 0.7,
          bayWeight: 0.8,
          bayNoiseBonus: 0.5,
          fjordWeight: 0.8,
        },
      },
      mountains: {
        // Earth-like prevalence: a few major ranges, not wall-to-wall mountains.
        tectonicIntensity: 0.65,
        mountainThreshold: 0.6,
        hillThreshold: 0.32,
        upliftWeight: 0.35,
        fractalWeight: 0.37,
        riftDepth: 0.25,
        boundaryWeight: 0.7,
        boundaryExponent: 1.6,
        interiorPenaltyWeight: 0.0,
        convergenceBonus: 0.77,
        transformPenalty: 0.6,
        riftPenalty: 1.0,
        hillBoundaryWeight: 0.35,
        hillRiftBonus: 0.25,
        hillConvergentFoothill: 0.35,
        hillInteriorFalloff: 0.1,
        hillUpliftWeight: 0.2,
      },
      volcanoes: {
        // Boundary-dominant volcanism with a modest hotspot tail.
        baseDensity: 1 / 190,
        minSpacing: 3,
        boundaryThreshold: 0.35,
        boundaryWeight: 1.2,
        convergentMultiplier: 2.5,
        transformMultiplier: 1.0,
        divergentMultiplier: 0.4,
        hotspotWeight: 0.18,
        shieldPenalty: 0.6,
        randomJitter: 0.08,
        minVolcanoes: 5,
        maxVolcanoes: 30,
      },
      foundation: {
        plates: {
          count: 32,
          convergenceMix: 0.55,
          relaxationSteps: 5,
          plateRotationMultiple: 1.3,
        },
        dynamics: {
          wind: {
            jetStreaks: 3,
            jetStrength: 1.0,
            variance: 0.6,
          },
          mantle: {
            bumps: 4,
            amplitude: 0.7,
            scale: 0.45,
          },
          directionality: {
            cohesion: 0.15,
            primaryAxes: {
              plateAxisDeg: 12,
              windBiasDeg: 12,
              currentBiasDeg: 12,
            },
            interplay: {
              windsFollowPlates: 0.3,
              currentsFollowWinds: 0.6,
            },
            hemispheres: {
              southernFlip: true,
              // Enable monsoon pass in climate swatches/refine (legacy keys not yet typed).
              ...({ monsoonBias: 0.82, equatorBandDeg: 18 } as unknown as Record<string, number>),
            },
            variability: {
              angleJitterDeg: 15,
              magnitudeVariance: 0.4,
            },
          },
        },
        policy: {
          oceanSeparation: {
            // Leave separation off; keep defaults earthlike if enabled later.
            enabled: false,
            baseSeparationTiles: 0,
            boundaryClosenessMultiplier: 1.0,
            maxPerRowDelta: 3,
            minChannelWidth: 4,
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
      climate: {
        baseline: {
          blend: {
            baseWeight: 0.55,
            bandWeight: 0.25,
          },
          bands: {
            deg0to10: 125,
            deg10to20: 105,
            deg20to35: 55,
            deg35to55: 75,
            deg55to70: 60,
            deg70plus: 42,
          },
          orographic: {
            hi1Threshold: 350,
            hi1Bonus: 8,
            hi2Threshold: 600,
            hi2Bonus: 7,
          },
          coastal: {
            coastalLandBonus: 26,
            spread: 5,
          },
          noise: {
            baseSpanSmall: 4,
            spanLargeScaleFactor: 1.0,
            scale: 0.13,
          },
        },
        refine: {
          waterGradient: {
            radius: 6,
            perRingBonus: 4,
            lowlandBonus: 5,
          },
          orographic: {
            steps: 4,
            reductionBase: 9,
            reductionPerStep: 5,
          },
          riverCorridor: {
            lowlandAdjacencyBonus: 15,
            highlandAdjacencyBonus: 6,
          },
          lowBasin: {
            radius: 3,
            delta: 7,
          },
        },
        // Story moisture knobs consumed by swatches/refine passes (legacy keys not yet typed).
        ...({
          story: {
            rainfall: {
              riftBoost: 8,
              riftRadius: 2,
              paradiseDelta: 6,
              volcanicDelta: 8,
            },
            swatches: {
              maxPerMap: 6,
              forceAtLeastOne: true,
              sizeScaling: {
                widthMulSqrt: 0.3,
                lengthMulSqrt: 0.4,
              },
              types: {
                macroDesertBelt: {
                  weight: 6,
                  latitudeCenterDeg: 22,
                  halfWidthDeg: 10,
                  drynessDelta: 22,
                  bleedRadius: 3,
                },
                equatorialRainbelt: {
                  weight: 4,
                  latitudeCenterDeg: 0,
                  halfWidthDeg: 10,
                  wetnessDelta: 26,
                  bleedRadius: 3,
                },
                rainforestArchipelago: {
                  weight: 5,
                  islandBias: 1.6,
                  reefBias: 1,
                  wetnessDelta: 18,
                  bleedRadius: 3,
                },
                mountainForests: {
                  weight: 3,
                  coupleToOrogeny: true,
                  windwardBonus: 6,
                  leePenalty: 2,
                  bleedRadius: 3,
                },
                greatPlains: {
                  weight: 5,
                  latitudeCenterDeg: 45,
                  halfWidthDeg: 8,
                  dryDelta: 10,
                  lowlandMaxElevation: 300,
                  bleedRadius: 4,
                },
              },
            },
          },
        } as unknown as Record<string, unknown>),
      },
      story: {
        hotspot: {
          paradiseBias: 2,
          volcanicBias: 1,
          volcanicPeakChance: 0.33,
        },
        features: {
          paradiseReefChance: 18,
          volcanicForestChance: 22,
          volcanicTaigaChance: 25,
        },
      },
      biomes: {
        tundra: {
          latMin: 85,
          elevMin: 700,
          rainMax: 85,
        },
        tropicalCoast: {
          latMax: 20,
          rainMin: 100,
        },
        riverValleyGrassland: {
          latMax: 65,
          rainMin: 80,
        },
        riftShoulder: {
          grasslandLatMax: 55,
          grasslandRainMin: 70,
          tropicalLatMax: 20,
          tropicalRainMin: 100,
        },
      },
      featuresDensity: {
        rainforestExtraChance: 50,
        forestExtraChance: 40,
        taigaExtraChance: 20,
        shelfReefMultiplier: 0.8,
      },
    },
  };
}

const orchestratorOptions: OrchestratorConfig = { logPrefix: "[SWOOPER_MOD]" };

engine.on("RequestMapInitData", () => {
  const defaultConfig = bootstrap({});
  const initOrchestrator = new MapOrchestrator(defaultConfig, orchestratorOptions);
  initOrchestrator.requestMapData();
});

engine.on("GenerateMap", () => {
  const config = bootstrap(buildConfig());
  const orchestrator = new MapOrchestrator(config, orchestratorOptions);
  orchestrator.generateMap();
});

console.log("[SWOOPER_MOD] ========================================");
console.log("[SWOOPER_MOD] Swooper Earthlike (TypeScript Build) Loaded");
console.log("[SWOOPER_MOD] Using MapOrchestrator from @swooper/mapgen-core");
console.log("[SWOOPER_MOD] ========================================");
