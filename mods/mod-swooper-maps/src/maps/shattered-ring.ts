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
            baseWeight: 0.2,
            bandWeight: 0.8,
          },
          seed: {
            baseRainfall: 35,
            coastalExponent: 1.3,
          },
          bands: {
            // Moderate tropical due to ring disruption
            deg0to10: 108,
            deg10to20: 90,
            // Strong ring mountain rain shadow
            deg20to35: 40,
            deg35to55: 78,
            deg55to70: 55,
            deg70plus: 35,
            edges: {
              deg0to10: 10,
              deg10to20: 20,
              deg20to35: 35,
              deg35to55: 55,
              deg55to70: 70,
            },
            transitionWidth: 7,
          },
          sizeScaling: {
            baseArea: 10000,
            minScale: 0.6,
            maxScale: 2.0,
            equatorBoostScale: 12,
            equatorBoostTaper: 0.6,
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
        swatches: { enabled: false },
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
          paradiseReefRadius: 2,
          volcanicForestChance: 28,
          volcanicForestBonus: 6,
          volcanicForestMinRainfall: 95,
          volcanicTaigaChance: 20,
          volcanicTaigaBonus: 4,
          volcanicRadius: 1,
          volcanicTaigaMinLatitude: 55,
          volcanicTaigaMaxElevation: 420,
          volcanicTaigaMinRainfall: 65,
        },
      },
      biomes: {
        temperature: {
          equator: 28,
          pole: -8,
          lapseRate: 6.5,
          seaLevel: 0,
          bias: 0,
          polarCutoff: -5,
          tundraCutoff: 2,
          midLatitude: 12,
          tropicalThreshold: 24,
        },
        moisture: {
          thresholds: [85, 105, 145, 195],
          bias: 0,
          humidityWeight: 0.35,
        },
        aridity: {
          temperatureMin: 0,
          temperatureMax: 35,
          petBase: 20,
          petTemperatureWeight: 80,
          humidityDampening: 0.55,
          rainfallWeight: 1,
          bias: 4,
          normalization: 120,
          moistureShiftThresholds: [0.45, 0.7],
          vegetationPenalty: 0.15,
        },
        freeze: {
          minTemperature: -11,
          maxTemperature: 2,
        },
        vegetation: {
          base: 0.2,
          moistureWeight: 0.55,
          humidityWeight: 0.25,
          moistureNormalizationPadding: 40,
          biomeModifiers: {
            snow: { multiplier: 0.05, bonus: 0 },
            tundra: { multiplier: 0.35, bonus: 0 },
            boreal: { multiplier: 0.75, bonus: 0 },
            temperateDry: { multiplier: 0.7, bonus: 0 },
            temperateHumid: { multiplier: 1, bonus: 0 },
            tropicalSeasonal: { multiplier: 1, bonus: 0 },
            tropicalRainforest: { multiplier: 1, bonus: 0.25 },
            desert: { multiplier: 0.08, bonus: 0 },
          },
        },
        noise: {
          amplitude: 0.03,
          seed: 1337,
        },
        overlays: {
          corridorMoistureBonus: 8,
          riftShoulderMoistureBonus: 5,
        },
      },
      biomeBindings: {
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
      featuresDensity: {
        // Lush crater islands
        rainforestExtraChance: 55,
        forestExtraChance: 45,
        taigaExtraChance: 22,
        shelfReefMultiplier: 1.0,
        shelfReefRadius: 1,
        rainforestVegetationScale: 45,
        forestVegetationScale: 35,
        taigaVegetationScale: 20,
        rainforestMinRainfall: 125,
        forestMinRainfall: 95,
        taigaMaxElevation: 320,
        minVegetationForBonus: 0.01,
      },
      featuresPlacement: {
        strategy: "owned",
        config: {
          groups: {
            vegetated: { multiplier: 1 },
            wet: { multiplier: 0.95 },
            aquatic: { multiplier: 1.3 },
            ice: { multiplier: 0.9 },
          },
          chances: {
            FEATURE_FOREST: 50,
            FEATURE_RAINFOREST: 60,
            FEATURE_TAIGA: 45,
            FEATURE_SAVANNA_WOODLAND: 30,
            FEATURE_SAGEBRUSH_STEPPE: 30,
            FEATURE_MARSH: 25,
            FEATURE_TUNDRA_BOG: 25,
            FEATURE_MANGROVE: 35,
            FEATURE_OASIS: 45,
            FEATURE_WATERING_HOLE: 30,
            FEATURE_REEF: 40,
            FEATURE_COLD_REEF: 35,
            FEATURE_ATOLL: 16,
            FEATURE_LOTUS: 18,
            FEATURE_ICE: 85,
          },
          vegetated: {
            minVegetationByBiome: {
              snow: 0.08,
              tundra: 0.05,
              boreal: 0.06,
              temperateDry: 0.05,
              temperateHumid: 0.05,
              tropicalSeasonal: 0.05,
              tropicalRainforest: 0.04,
              desert: 0.02,
            },
            vegetationChanceScalar: 1,
            desertSagebrushMinVegetation: 0.16,
            desertSagebrushMaxAridity: 0.88,
            tundraTaigaMinVegetation: 0.22,
            tundraTaigaMinTemperature: -2,
            tundraTaigaMaxFreeze: 0.9,
            temperateDryForestMoisture: 125,
            temperateDryForestMaxAridity: 0.6,
            temperateDryForestVegetation: 0.45,
            tropicalSeasonalRainforestMoisture: 140,
            tropicalSeasonalRainforestMaxAridity: 0.6,
          },
          wet: {
            nearRiverRadius: 2,
            coldTemperatureMax: 2,
            coldBiomeSymbols: ["snow", "tundra", "boreal"],
            mangroveWarmTemperatureMin: 18,
            mangroveWarmBiomeSymbols: ["tropicalRainforest", "tropicalSeasonal"],
            coastalAdjacencyRadius: 1,
            isolatedRiverRadius: 1,
            isolatedSpacingRadius: 1,
            oasisBiomeSymbols: ["desert", "temperateDry"],
          },
          aquatic: {
            reefLatitudeSplit: 58,
            atoll: {
              enableClustering: true,
              clusterRadius: 1,
              equatorialBandMaxAbsLatitude: 23,
              shallowWaterAdjacencyGateChance: 30,
              shallowWaterAdjacencyRadius: 1,
              growthChanceEquatorial: 18,
              growthChanceNonEquatorial: 7,
            },
          },
          ice: {
            minAbsLatitude: 80,
            forbidAdjacentToLand: true,
            landAdjacencyRadius: 1,
            forbidAdjacentToNaturalWonders: true,
            naturalWonderAdjacencyRadius: 1,
          },
        },
      },
      plotEffects: {
        snow: {
          enabled: true,
          selectors: {
            light: {
              tags: ["SNOW", "LIGHT", "PERMANENT"],
              typeName: "PLOTEFFECT_SNOW_LIGHT_PERMANENT",
            },
            medium: {
              tags: ["SNOW", "MEDIUM", "PERMANENT"],
              typeName: "PLOTEFFECT_SNOW_MEDIUM_PERMANENT",
            },
            heavy: {
              tags: ["SNOW", "HEAVY", "PERMANENT"],
              typeName: "PLOTEFFECT_SNOW_HEAVY_PERMANENT",
            },
          },
          coverageChance: 55,
          freezeWeight: 1,
          elevationWeight: 1,
          moistureWeight: 0.6,
          scoreNormalization: 2.6,
          scoreBias: 0,
          lightThreshold: 0.4,
          mediumThreshold: 0.6,
          heavyThreshold: 0.78,
          elevationMin: 300,
          elevationMax: 2600,
          moistureMin: 40,
          moistureMax: 160,
          maxTemperature: 3,
          maxAridity: 0.8,
        },
        sand: {
          enabled: true,
          selector: {
            tags: ["SAND"],
            typeName: "PLOTEFFECT_SAND",
          },
          chance: 12,
          minAridity: 0.55,
          minTemperature: 20,
          maxFreeze: 0.25,
          maxVegetation: 0.18,
          maxMoisture: 85,
          allowedBiomes: ["desert", "temperateDry"],
        },
        burned: {
          enabled: true,
          selector: {
            tags: ["BURNED"],
            typeName: "PLOTEFFECT_BURNED",
          },
          chance: 6,
          minAridity: 0.5,
          minTemperature: 20,
          maxFreeze: 0.2,
          maxVegetation: 0.25,
          maxMoisture: 100,
          allowedBiomes: ["temperateDry", "tropicalSeasonal"],
        },
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
