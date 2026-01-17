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
import standardRecipe from "../recipes/standard/recipe.js";

export default createMap({
  id: "swooper-earthlike",
  name: "Swooper Earthlike",
  recipe: standardRecipe,
  config: {
    foundation: {
      mesh: {
        computeMesh: {
          strategy: "default",
          config: {
            plateCount: 28,             // Fewer, larger major plates plus some microplates
            cellsPerPlate: 6,           // Slightly denser cells per plate for sharper margins
            relaxationSteps: 5,         // Extra smoothing for coherent plate footprints
            referenceArea: 16000,        // Standard reference
            plateScalePower: 0.76,       // Still heavy-tailed but fewer tiny microplates
          },
        },
      },
      crust: {
        computeCrust: {
          strategy: "default",
          config: {
            continentalRatio: 0.31,     // Earth-ish crust share while leaving room for shelves
          },
        },
      },
      "plate-graph": {
        computePlateGraph: {
          strategy: "default",
          config: {
            plateCount: 28,             // Match mesh plateCount
            referenceArea: 16000,
            plateScalePower: 0.82,
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
            boundaryDecay: 0.5,            // Softer falloff so margins still dominate relief
            movementScale: 60,             // Faster relative drift to energize boundaries
            rotationScale: 110,            // More rotational variance for microplates/torques
          },
        },
      },
    },
    "morphology-pre": {
      "landmass-plates": {
        substrate: {
          strategy: "default",
          config: {
            baseErodibility: 0.58,        // Slightly tighter cohesion for broader lowlands
            baseSediment: 0.24,          // More shelf/alluvial material
            upliftErodibilityBoost: 0.35, // Keep mountains crisp without over-thinning
            riftSedimentBoost: 0.34,      // Preserve inland basins without flooding shelves
          },
        },
        baseTopography: {
          strategy: "default",
          config: {
            // Continental bias for broad landmasses with a few major continents.
            boundaryBias: 0.24,             // Keep margins active but not dominating
            clusteringBias: 0.70,           // More stickiness to fuse fragments
            // Crust-first height tuning to avoid island-heavy hypsometry.
            crustEdgeBlend: 0.60,           // Slightly smoother shelves to avoid speckle land
            crustNoiseAmplitude: 0.36,      // Further cut coast speckle/ghost land
            continentalHeight: 0.62,        // Moderate elevation for coastal gradients
            oceanicHeight: -0.75,           // Shallower basins -> more shelf diversity
            tectonics: {
              // De-emphasize arcs so plate boundaries don't dominate land distribution.
              boundaryArcWeight: 0.32,      // Strong convergent arcs without overpainting
              boundaryArcNoiseWeight: 0.26, // Natural ragged margins
              interiorNoiseWeight: 0.50,    // Calmer interiors to avoid ghost specks
              fractalGrain: 3,              // Fine detail for believable coastlines
            },
          },
        },
        seaLevel: {
          strategy: "default",
          config: {
            // Earth-like ocean dominance, tuned to avoid archipelago output.
            targetWaterPercent: 58,         // Drain a bit more (~+30-50m) to expose shelves/connect fragments
            targetScalar: 1,
            variance: 1.5,                  // Tighter solve to avoid stray blobs
            boundaryShareTarget: 0.08,      // Lower boundary land share to trim edge speckle
            continentalFraction: 0.31,      // Match crust ratio while honoring sea-level solve
          },
        },
        landmask: {
          strategy: "default",
          config: {
            basinSeparation: {
              // Leave separation off; keep defaults earthlike if enabled later.
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
            maxTrails: 8,
            steps: 12,
            stepLen: 2,
            minDistFromLand: 6,
            minTrailSeparation: 14,
            paradiseBias: 1.2,
            volcanicBias: 0.9,
            volcanicPeakChance: 0.28,
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
          river: {
            biomesBiasStrength: 0.5,
            maxChains: 2,
            maxSteps: 90,
            preferLowlandBelow: 340,
            coastSeedRadius: 2,
            minTiles: 0,
            mustEndNearCoast: false,
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
                // Close to crust-first defaults with a gentle nudge for Earth coasts.
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
              // Earth-like coastal features
              bay: {
                noiseGateAdd: 0.05,           // Slight noise gate for natural variation
                rollDenActive: 4,             // Moderate bays on active margins
                rollDenDefault: 7,            // Fewer bays on passive margins
              },
              fjord: {
                baseDenom: 15,                // Less frequent fjords (Earth average)
                activeBonus: 2,               // More fjords at convergent margins
                passiveBonus: 1,              // Rare fjords on passive margins
              },
              minSeaLaneWidth: 3,             // Preserve navigable straits
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
              // Earth-like island distribution with microcontinents
              fractalThresholdPercent: 96,    // Reduce noise seeding
              minDistFromLandRadius: 5,       // Allow closer shelves but avoid clutter
              baseIslandDenNearActive: 2,     // Fewer arc chains
              baseIslandDenElse: 2,           // Fewer passive-shelf archipelagos
              hotspotSeedDenom: 3,            // Hotspot chains retained
              clusterMax: 12,                 // Slightly smaller clusters
              microcontinentChance: 0.12,     // Further reduce microcontinents to avoid ghost land
            },
            hotspot: {
              paradiseBias: 1.3,            // Moderate paradise preference
              volcanicBias: 1.0,            // Modest volcanic activity
              volcanicPeakChance: 0.28,     // Some volcanic peaks
            },
            seaLaneAvoidRadius: 4,
          },
        },
      },
      mountains: {
        mountains: {
          strategy: "default",
          config: {
            // Earth-like: major ranges at margins, few interior mountains
            tectonicIntensity: 0.64,
            mountainThreshold: 0.59,       // Higher: more breaks/passages in chains
            hillThreshold: 0.44,           // Keep foothill skirts broad
            upliftWeight: 0.28,
            fractalWeight: 0.72,           // Extra texture for gaps and saddles
            riftDepth: 0.27,
            boundaryWeight: 0.18,
            boundaryGate: 0.11,            // Slight gate to keep margin focus but allow dips
            boundaryExponent: 1.18,        // Softer decay from margins
            interiorPenaltyWeight: 0.09,   // Allow occasional interior highs
            convergenceBonus: 0.60,
            transformPenalty: 0.65,
            riftPenalty: 0.78,
            hillBoundaryWeight: 0.32,      // Skirts remain but a bit lighter
            hillRiftBonus: 0.36,
            hillConvergentFoothill: 0.36,  // Slightly narrower foothill zones for passes
            hillInteriorFalloff: 0.20,     // Allow more interior foothill bleed
            hillUpliftWeight: 0.18,
          },
        },
      },
      volcanoes: {
        volcanoes: {
          strategy: "default",
          config: {
            // Boundary-dominant volcanism with hotspot trails (Earth-like).
            enabled: true,
            baseDensity: 1 / 160,           // Moderate volcanism; let convergent arcs lead
            minSpacing: 6,                  // Better spacing between volcanoes
            boundaryThreshold: 0.32,        // Lower for stronger boundary influence
            boundaryWeight: 1.35,           // Stronger boundary emphasis
            convergentMultiplier: 3.3,      // Strong Ring of Fire emphasis
            transformMultiplier: 0.8,       // Less transform volcanism
            divergentMultiplier: 0.32,      // Lower divergent (mostly underwater)
            hotspotWeight: 0.32,            // More hotspot chains (Hawaii, Iceland, Yellowstone)
            shieldPenalty: 0.55,            // Stronger craton suppression
            randomJitter: 0.04,             // Less random, more plate-driven
            minVolcanoes: 12,               // Ensure visible volcanic activity
            maxVolcanoes: 42,               // Allow more for larger maps
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
        dryness: "mix",
        temperature: "temperate",
        seasonality: "normal",
        oceanCoupling: "earthlike",
        lakeiness: "normal",
      },
    },
    "hydrology-hydrography": {
      knobs: {
        riverDensity: "normal",
      },
    },
    "narrative-post": {
      "story-corridors-post": {
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
          river: {
            biomesBiasStrength: 0.5,
            maxChains: 2,
            maxSteps: 90,
            preferLowlandBelow: 340,
            coastSeedRadius: 2,
            minTiles: 0,
            mustEndNearCoast: false,
          },
          islandHop: {
            useHotspots: true,
            maxArcs: 2,
          },
        },
      },
    },
    "hydrology-climate-refine": {
      knobs: {
        dryness: "mix",
        temperature: "temperate",
        cryosphere: "on",
      },
    },
    ecology: {
      // New ecology steps with strategy selections
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
        plan: { strategy: "mixed", config: { resources: [] } },  // Variety in resource distribution
        score: { strategy: "default", config: { minConfidence: 0.32, maxPerResource: 14 } },
      },
      biomeEdgeRefine: {
        refine: { strategy: "gaussian", config: { radius: 1, iterations: 1 } },  // Smoother Earth-like biome transitions
      },
      featuresPlan: {
        vegetation: {
          strategy: "clustered",
          config: {
            baseDensity: 0.35,
            fertilityWeight: 0.55,
            moistureWeight: 0.6,
            moistureNormalization: 230,
            coldCutoff: -10,
          },
        },  // Natural forest grouping
        wetlands: {
          strategy: "delta-focused",
          config: {
            moistureThreshold: 0.75,
            fertilityThreshold: 0.35,
            moistureNormalization: 230,
            maxElevation: 1200,
          },
        },  // River-mouth wetlands
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
            seaIceThreshold: -16,   // Colder to shrink ice band
            alpineThreshold: 2600,
            featherC: 4,            // Slightly tighter fade
            jitterC: 2.5,           // Add  ±2.5°C noise to break straight lines
            densityScale: 0.25,     // ~75% reduction in ice coverage
          },
        },
      },
      biomes: {
        classify: {
          strategy: "default",
          config: {
            temperature: {
              equator: 33,
              pole: -22,
              lapseRate: 7.5,
              seaLevel: 0,
              bias: 0.5,              // Reduced: more mid/high-lat cold spread
              polarCutoff: -6,
              tundraCutoff: -1,
              midLatitude: 11,
              tropicalThreshold: 24,
            },
            moisture: {
              thresholds: [45, 90, 150, 210] as [number, number, number, number],  // Widened: more graduated biome transitions
              bias: 0,               // Neutral: let rainfall bands drive distribution
              humidityWeight: 0.42,
            },
            aridity: {
              temperatureMin: 0,
              temperatureMax: 35,
              petBase: 19,           // Moderate evaporation demand
              petTemperatureWeight: 85,  // Moderate temperature effect
              humidityDampening: 0.18,   // Slightly less humid buffering
              rainfallWeight: 0.95,   // Rainfall offsets aridity reasonably
              bias: 1.5,             // Slight push toward aridity
              normalization: 112,    // More reasonable normalization
              moistureShiftThresholds: [0.4, 0.68] as [number, number],  // Less aggressive thresholds
              vegetationPenalty: 0.07,  // Moderate sparse vegetation in arid areas
            },
            freeze: {
              minTemperature: -10,
              maxTemperature: 3,
            },
            vegetation: {
              base: 0.32,            // More contrast between lush and sparse areas
              moistureWeight: 0.68,
              humidityWeight: 0.32,
              moistureNormalizationPadding: 60,
              biomeModifiers: {
                snow: { multiplier: 3.2, bonus: 0.3 },
                tundra: { multiplier: 0.55, bonus: 0 },
                boreal: { multiplier: 0.9, bonus: 0 },
                temperateDry: { multiplier: 0.75, bonus: 0 },
                temperateHumid: { multiplier: 1, bonus: 0 },
                tropicalSeasonal: { multiplier: 1, bonus: 0 },
                tropicalRainforest: { multiplier: 2.3, bonus: 1.2 },
                desert: { multiplier: 0.85, bonus: 0 },
              },
            },
            noise: {
              amplitude: 0.028,
              seed: 53337,
            },
            overlays: {
              corridorMoistureBonus: 8,
              riftShoulderMoistureBonus: 5,
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
              chance: 32,            // Visible sandy deserts without overrun
              minAridity: 0.48,      // Lowered to catch more desert tiles
              minTemperature: 14,    // Allow cooler desert edges
              maxFreeze: 0.3,
              maxVegetation: 0.2,
              maxMoisture: 85,
              allowedBiomes: ["desert", "temperateDry"] as [
                "desert",
                "temperateDry",
              ],
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
  },
});
