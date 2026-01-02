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
        boundaryGate: 0.05,
        boundaryExponent: 1.5,
        interiorPenaltyWeight: 0.1,
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
            baseWeight: 0.25,
            bandWeight: 0.75,
          },
          seed: {
            baseRainfall: 65,
            coastalExponent: 1.1,
          },
          bands: {
            // Very wet tropical maritime climate
            deg0to10: 165,
            deg10to20: 145,
            deg20to35: 115,
            deg35to55: 85,
            deg55to70: 65,
            deg70plus: 40,
            edges: {
              deg0to10: 10,
              deg10to20: 20,
              deg20to35: 35,
              deg35to55: 55,
              deg55to70: 70,
            },
            transitionWidth: 8,
          },
          sizeScaling: {
            baseArea: 10000,
            minScale: 0.6,
            maxScale: 2.0,
            equatorBoostScale: 14,
            equatorBoostTaper: 0.7,
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
            coastalLandBonus: 55,
            spread: 9,
          },
          noise: {
            baseSpanSmall: 4,
            spanLargeScaleFactor: 1.2,
            scale: 0.16,
          },
        },
        swatches: { enabled: false },
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
          paradiseReefRadius: 3,
          volcanicForestChance: 35,
          volcanicForestBonus: 8,
          volcanicForestMinRainfall: 90,
          volcanicTaigaChance: 18,
          volcanicTaigaBonus: 4,
          volcanicRadius: 1,
          volcanicTaigaMinLatitude: 50,
          volcanicTaigaMaxElevation: 450,
          volcanicTaigaMinRainfall: 70,
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
          thresholds: [55, 75, 110, 165],
          bias: 5,
          humidityWeight: 0.35,
        },
        aridity: {
          temperatureMin: 0,
          temperatureMax: 32,
          petBase: 10,
          petTemperatureWeight: 55,
          humidityDampening: 0.7,
          rainfallWeight: 1,
          bias: -12,
          normalization: 150,
          moistureShiftThresholds: [0.6, 0.8],
          vegetationPenalty: 0.05,
        },
        freeze: {
          minTemperature: -10,
          maxTemperature: 3,
        },
        vegetation: {
          base: 0.3,
          moistureWeight: 0.6,
          humidityWeight: 0.3,
          moistureNormalizationPadding: 45,
          biomeModifiers: {
            snow: { multiplier: 0.05, bonus: 0 },
            tundra: { multiplier: 0.35, bonus: 0 },
            boreal: { multiplier: 0.8, bonus: 0 },
            temperateDry: { multiplier: 0.8, bonus: 0 },
            temperateHumid: { multiplier: 1.1, bonus: 0 },
            tropicalSeasonal: { multiplier: 1.1, bonus: 0 },
            tropicalRainforest: { multiplier: 1.1, bonus: 0.4 },
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
        // Lush tropical islands
        rainforestExtraChance: 75,
        forestExtraChance: 60,
        taigaExtraChance: 18,
        // Abundant coral reefs
        shelfReefMultiplier: 1.6,
        shelfReefRadius: 2,
        rainforestVegetationScale: 80,
        forestVegetationScale: 45,
        taigaVegetationScale: 15,
        rainforestMinRainfall: 110,
        forestMinRainfall: 90,
        taigaMaxElevation: 320,
        minVegetationForBonus: 0.01,
      },
      featuresPlacement: {
        strategy: "owned",
        config: {
          groups: {
            vegetated: { multiplier: 1.1 },
            wet: { multiplier: 1.2 },
            aquatic: { multiplier: 1.6 },
            ice: { multiplier: 0.4 },
          },
          chances: {
            FEATURE_FOREST: 55,
            FEATURE_RAINFOREST: 85,
            FEATURE_TAIGA: 35,
            FEATURE_SAVANNA_WOODLAND: 40,
            FEATURE_SAGEBRUSH_STEPPE: 20,
            FEATURE_MARSH: 40,
            FEATURE_TUNDRA_BOG: 15,
            FEATURE_MANGROVE: 55,
            FEATURE_OASIS: 40,
            FEATURE_WATERING_HOLE: 30,
            FEATURE_REEF: 55,
            FEATURE_COLD_REEF: 35,
            FEATURE_ATOLL: 20,
            FEATURE_LOTUS: 28,
            FEATURE_ICE: 60,
          },
          vegetated: {
            minVegetationByBiome: {
              snow: 0.08,
              tundra: 0.05,
              boreal: 0.06,
              temperateDry: 0.04,
              temperateHumid: 0.04,
              tropicalSeasonal: 0.03,
              tropicalRainforest: 0.02,
              desert: 0.02,
            },
            vegetationChanceScalar: 1.15,
            desertSagebrushMinVegetation: 0.12,
            desertSagebrushMaxAridity: 0.9,
            tundraTaigaMinVegetation: 0.08,
            tundraTaigaMinTemperature: -2,
            tundraTaigaMaxFreeze: 0.95,
            temperateDryForestMoisture: 105,
            temperateDryForestMaxAridity: 0.65,
            temperateDryForestVegetation: 0.38,
            tropicalSeasonalRainforestMoisture: 120,
            tropicalSeasonalRainforestMaxAridity: 0.7,
          },
          wet: {
            nearRiverRadius: 2,
            coldTemperatureMax: 2,
            coldBiomeSymbols: ["snow", "tundra", "boreal"],
            mangroveWarmTemperatureMin: 18,
            mangroveWarmBiomeSymbols: ["tropicalRainforest", "tropicalSeasonal"],
            coastalAdjacencyRadius: 2,
            isolatedRiverRadius: 1,
            isolatedSpacingRadius: 1,
            oasisBiomeSymbols: ["desert", "temperateDry"],
          },
          aquatic: {
            reefLatitudeSplit: 58,
            atoll: {
              enableClustering: true,
              clusterRadius: 1,
              equatorialBandMaxAbsLatitude: 25,
              shallowWaterAdjacencyGateChance: 20,
              shallowWaterAdjacencyRadius: 1,
              growthChanceEquatorial: 20,
              growthChanceNonEquatorial: 8,
            },
          },
          ice: {
            minAbsLatitude: 75,
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
          coverageChance: 25,
          freezeWeight: 0.9,
          elevationWeight: 1.1,
          moistureWeight: 0.6,
          scoreNormalization: 2.6,
          scoreBias: 0,
          lightThreshold: 0.45,
          mediumThreshold: 0.65,
          heavyThreshold: 0.8,
          elevationStrategy: "percentile",
          elevationMin: 500,
          elevationMax: 3000,
          elevationPercentileMin: 0.88,
          elevationPercentileMax: 0.995,
          moistureMin: 60,
          moistureMax: 180,
          maxTemperature: 3,
          maxAridity: 0.75,
        },
        sand: {
          enabled: false,
          selector: {
            tags: ["SAND"],
            typeName: "PLOTEFFECT_SAND",
          },
          chance: 4,
          minAridity: 0.7,
          minTemperature: 22,
          maxFreeze: 0.2,
          maxVegetation: 0.12,
          maxMoisture: 80,
          allowedBiomes: ["desert", "temperateDry"],
        },
        burned: {
          enabled: false,
          selector: {
            tags: ["BURNED"],
            typeName: "PLOTEFFECT_BURNED",
          },
          chance: 4,
          minAridity: 0.55,
          minTemperature: 24,
          maxFreeze: 0.2,
          maxVegetation: 0.2,
          maxMoisture: 95,
          allowedBiomes: ["temperateDry", "tropicalSeasonal"],
        },
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
