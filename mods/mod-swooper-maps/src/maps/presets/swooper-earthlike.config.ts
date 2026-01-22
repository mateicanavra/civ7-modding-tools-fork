import type { StandardRecipeConfig } from "../../recipes/standard/recipe.js";

import { realismEarthlikeConfig } from "./realism/earthlike.config.js";
import { swooperEarthlikeEcologyConfig, swooperEarthlikeMapEcologyConfig } from "./swooper-earthlike.ecology.config.js";
import { swooperEarthlikeHydrologyConfig } from "./swooper-earthlike.hydrology.config.js";

/**
 * Swooper Earthlike — realism-first default configuration.
 *
 * Contract:
 * - Advanced step config is the baseline (schema defaults + authored overrides).
 * - Knobs apply last as deterministic transforms over that baseline (no presence-gating).
 */
export const swooperEarthlikeConfig = {
  ...realismEarthlikeConfig,
  foundation: {
    ...realismEarthlikeConfig.foundation,
    advanced: {
      mesh: {
        computeMesh: {
          strategy: "default",
          config: {
            plateCount: 19, // Fewer, larger major plates plus some microplates
            cellsPerPlate: 7, // Slightly denser cells per plate for sharper margins
            relaxationSteps: 6, // Extra smoothing for coherent plate footprints
            referenceArea: 16000, // Standard reference
            plateScalePower: 1, // Still heavy-tailed but fewer tiny microplates
          },
        },
      },
      crust: {
        computeCrust: {
          strategy: "default",
          config: {
            continentalRatio: 0.37, // Earth-ish crust share while leaving room for shelves
          },
        },
      },
      "plate-graph": {
        computePlateGraph: {
          strategy: "default",
          config: {
            plateCount: 19, // Match mesh plateCount
            referenceArea: 16000,
            plateScalePower: 1,
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
            movementScale: 65, // Faster relative drift to energize boundaries
            rotationScale: 80, // More rotational variance for microplates/torques
          },
        },
      },
    },
  },
  "morphology-pre": {
    ...realismEarthlikeConfig["morphology-pre"],
    advanced: {
      "landmass-plates": {
        substrate: {
          strategy: "default",
          config: {
            continentalBaseErodibility: 0.63, // Higher land erodibility for broader lowlands
            oceanicBaseErodibility: 0.53, // Lower oceanic erodibility baseline
            continentalBaseSediment: 0.19, // More shelf/alluvial material
            oceanicBaseSediment: 0.29,
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
    },
  },
  "morphology-mid": {
    ...realismEarthlikeConfig["morphology-mid"],
    advanced: {
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
  },
  "morphology-post": {
    ...realismEarthlikeConfig["morphology-post"],
    advanced: {
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
  },
  "map-morphology": {
    ...realismEarthlikeConfig["map-morphology"],
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
  },
  ...swooperEarthlikeHydrologyConfig,
  ...swooperEarthlikeEcologyConfig,
  ...swooperEarthlikeMapEcologyConfig,
} satisfies StandardRecipeConfig;
