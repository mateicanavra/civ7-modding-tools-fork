// @ts-check
/**
 * Swooper Desert Mountains — Hyper‑arid, plate-driven world
 *
 * Purpose
 * - Deliver a mostly dry planet punctuated by brutal orographic walls.
 * - Lean on plate-aware uplift so convergent margins become mega ranges.
 * - Reserve humidity for narrow rainfall belts hugging those ranges and a
 *   few equatorial/monsoonal refuges.
 */
import { bootstrap } from "./bootstrap/entry.js";

/** @typedef {import("./bootstrap/map_config.types.js").MapConfig} MapConfig */
/** @typedef {import("./bootstrap/map_config.types.js").ClimateRefine} ClimateRefine */
/** @typedef {import("./bootstrap/map_config.types.js").WorldModel} WorldModelCfg */

bootstrap({
    presets: ["voronoi"],
    overrides: /** @type {Partial<MapConfig>} */ ({
        landmass: {
            baseWaterPercent: 58,
            waterThumbOnScale: -6,
            jitterAmpFracBase: 0.02,
            geometry: {
                preset: "tightMiddle",
                oceanColumnsScale: 1.05,
            },
        },
        margins: {
            activeFraction: 0.34,
            passiveFraction: 0.18,
            minSegmentLength: 28,
        },
        coastlines: {
            plateBias: {
                threshold: 0.5,
                power: 1.35,
                convergent: 1.4,
                transform: 0.7,
                divergent: -0.25,
                interior: -0.2,
                bayWeight: 0.55,
                bayNoiseBonus: 1.6,
                fjordWeight: 1.25,
            },
        },
        mountains: {
            mountainPercent: 11,
            hillPercent: 20,
            upliftWeight: 0.94,
            fractalWeight: 0.06,
            riftDepth: 0.52,
            variance: 1.2,
            boundaryWeight: 1.65,
            boundaryExponent: 1.32,
            interiorPenaltyWeight: 0.33,
            convergenceBonus: 1.92,
            transformPenalty: 0.28,
            riftPenalty: 1.1,
            hillBoundaryWeight: 0.82,
            hillRiftBonus: 0.58,
            hillConvergentFoothill: 0.46,
            hillInteriorFalloff: 0.27,
            hillUpliftWeight: 0.42,
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
            maxVolcanoes: 42,
        },
        climateBaseline: {
            blend: {
                baseWeight: 0.35,
                bandWeight: 0.65,
            },
            bands: {
                deg0to10: 225,
                deg10to20: 93,
                deg20to35: 12,
                deg35to55: 72,
                deg55to70: 22,
                deg70plus: 10,
            },
            orographic: {
                hi1Threshold: 280,
                hi1Bonus: 6,
                hi2Threshold: 540,
                hi2Bonus: 18,
            },
            coastal: {
                coastalLandBonus: 6,
                shallowAdjBonus: 4,
            },
            noise: {
                baseSpanSmall: 6,
                spanLargeScaleFactor: 1.4,
            },
        },
        climateRefine: /** @type {Partial<ClimateRefine>} */ ({
            waterGradient: {
                radius: 9,
                perRingBonus: 2.4,
                lowlandBonus: 4,
            },
            orographic: {
                steps: 6,
                reductionBase: 34,
                reductionPerStep: 14,
            },
            riverCorridor: {
                lowlandAdjacencyBonus: 22,
                highlandAdjacencyBonus: 11,
            },
            lowBasin: {
                radius: 4,
                delta: 16,
            },
        }),
        story: {
            hotspot: {
                maxTrails: 9,
                steps: 13,
                stepLen: 2,
                minDistFromLand: 6,
                minTrailSeparation: 14,
                paradiseBias: 1,
                volcanicBias: 2,
                volcanicPeakChance: 0.58,
            },
            rift: {
                maxRiftsPerMap: 2,
                lineSteps: 22,
                stepLen: 3,
                shoulderWidth: 1,
            },
            orogeny: {
                beltMaxPerContinent: 4,
                beltMinLength: 16,
                radius: 7,
                windwardBoost: 24,
                leeDrynessAmplifier: 2.6,
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
                        bleedRadius: 10,
                    },
                    equatorialRainbelt: {
                        weight: 7,
                        latitudeCenterDeg: 4,
                        halfWidthDeg: 6,
                        wetnessDelta: 70,
                        bleedRadius: 5,
                    },
                    mountainForests: {
                        weight: 5,
                        coupleToOrogeny: true,
                        windwardBonus: 18,
                        leePenalty: 10,
                        bleedRadius: 5,
                    },
                    rainforestArchipelago: {
                        weight: 2,
                        islandBias: 1.5,
                        reefBias: 1.2,
                        wetnessDelta: 28,
                        bleedRadius: 4,
                    },
                },
            },
            paleo: {
                maxFossilChannels: 24,
                fossilChannelLengthTiles: 18,
                fossilChannelStep: 2,
                fossilChannelHumidity: 7,
                fossilChannelMinDistanceFromCurrentRivers: 5,
                sizeScaling: {
                    lengthMulSqrt: 0.8,
                },
                elevationCarving: {
                    enableCanyonRim: true,
                    rimWidth: 5,
                    canyonDryBonus: 12,
                    bluffWetReduction: 2,
                },
            },
        },
        microclimate: {
            rainfall: {
                riftBoost: 6,
                riftRadius: 2,
                paradiseDelta: 4,
                volcanicDelta: 5,
            },
            features: {
                paradiseReefChance: 18,
                volcanicForestChance: 14,
                volcanicTaigaChance: 12,
            },
        },
        biomes: {
            tundra: {
                latMin: 62,
                elevMin: 420,
                rainMax: 55,
            },
            tropicalCoast: {
                latMax: 22,
                rainMin: 115,
            },
            riverValleyGrassland: {
                latMax: 48,
                rainMin: 65,
            },
            riftShoulder: {
                grasslandLatMax: 48,
                grasslandRainMin: 55,
                tropicalLatMax: 28,
                tropicalRainMin: 95,
            },
        },
        featuresDensity: {
            rainforestExtraChance: 18,
            forestExtraChance: 12,
            taigaExtraChance: 8,
            shelfReefMultiplier: 0.85,
        },
        worldModel: /** @type {Partial<WorldModelCfg>} */ ({
            plates: {
                count: 14,
                axisAngles: [15, 195],
                convergenceMix: 0.78,
                relaxationSteps: 3,
                seedJitter: 2,
                interiorSmooth: 1,
                plateRotationMultiple: 8,
                seedOffset: 2203,
            },
            wind: {
                jetStreaks: 5,
                jetStrength: 2.35,
                variance: 0.32,
                coriolisZonalScale: 2.4,
            },
            currents: {
                basinGyreCountMax: 5,
                westernBoundaryBias: 1.8,
                currentStrength: 1.6,
            },
            pressure: {
                bumps: 12,
                amplitude: 8,
                scale: 2.3,
            },
            directionality: {
                cohesion: 0.62,
                primaryAxes: {
                    plateAxisDeg: 30,
                    windBiasDeg: 18,
                    currentBiasDeg: 205,
                },
                interplay: {
                    windsFollowPlates: 0.58,
                    currentsFollowWinds: 0.66,
                    riftsFollowPlates: 0.86,
                    orogenyOpposesRifts: 0.68,
                },
                hemispheres: {
                    southernFlip: true,
                    equatorBandDeg: 14,
                    monsoonBias: 0.28,
                },
                variability: {
                    angleJitterDeg: 18,
                    magnitudeVariance: 0.35,
                    seedOffset: 9053,
                },
            },
            policy: {
                windInfluence: 1.4,
                currentHumidityBias: 0.72,
                boundaryFjordBias: 1.5,
                shelfReefBias: 0.8,
                oceanSeparation: {
                    enabled: true,
                    bandPairs: [
                        [0, 1],
                        [1, 2],
                    ],
                    baseSeparationTiles: 4,
                    boundaryClosenessMultiplier: 1.1,
                    maxPerRowDelta: 2,
                    minChannelWidth: 5,
                    respectSeaLanes: true,
                    edgeWest: {
                        enabled: true,
                        baseTiles: 1,
                        boundaryClosenessMultiplier: 0.8,
                        maxPerRowDelta: 1,
                    },
                    edgeEast: {
                        enabled: false,
                        baseTiles: 0,
                        boundaryClosenessMultiplier: 1.0,
                        maxPerRowDelta: 1,
                    },
                },
            },
        }),
    }),
});
import "./map_orchestrator.js";
