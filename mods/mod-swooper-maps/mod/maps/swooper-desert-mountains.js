// @ts-check
/**
 * Swooper Desert Mountains — Hyper‑arid, plate-driven world
 *
 * Purpose
 * - Deliver a mostly dry planet punctuated by brutal orographic walls.
 * - Lean on plate-aware uplift so convergent margins become mega ranges.
 * - Reserve humidity for narrow rainfall belts hugging those ranges and a
 *   few equatorial/monsoonal refuges.
 *
 * Notes
 * - Mountains: the config intentionally dampens shoreline stacking by
 *   reducing boundary bonuses, raising interior penalties, and enabling a
 *   light ocean-separation pass. If convergent belts begin clumping again,
 *   revisit `mountains.*` weights or tweak the plate seed/rotation knobs
 *   under `worldModel`.
 */
import { bootstrap } from "./bootstrap/entry.js";

/** @typedef {import("./bootstrap/map_config.types.js").MapConfig} MapConfig */
/** @typedef {import("./bootstrap/map_config.types.js").ClimateRefine} ClimateRefine */
/** @typedef {import("./bootstrap/map_config.types.js").WorldModel} WorldModelCfg */
/** @typedef {import("./bootstrap/map_config.types.js").StageConfigProviders} StageConfigProviders */

bootstrap({
    stageConfig: /** @type {StageConfigProviders} */ ({
        worldModel: true,
        landmass: true,
        coastlines: true,
        storySeed: true,
        storyHotspots: true,
        storyRifts: true,
        storyOrogeny: true,
        storyPaleo: true,
        storyCorridorsPre: true,
        mountains: true,
        volcanoes: true,
        climateBaseline: true,
        storySwatches: true,
        climateRefine: true,
        biomes: true,
        features: true,
    }),
    overrides: /** @type {Partial<MapConfig>} */ ({
        toggles: {
            STORY_ENABLE_HOTSPOTS: true,
            STORY_ENABLE_RIFTS: true,
            STORY_ENABLE_OROGENY: true,
            STORY_ENABLE_SWATCHES: true,
            STORY_ENABLE_PALEO: true,
            STORY_ENABLE_CORRIDORS: true,
        },
        landmass: {
            baseWaterPercent: 58,
            waterThumbOnScale: -6,
            jitterAmpFracBase: 0.02,
        },
        margins: {
            activeFraction: 0.34,
            passiveFraction: 0.18,
            minSegmentLength: 28,
        },
        coastlines: {
            plateBias: {
                threshold: 0.54,
                power: 1.25,
                convergent: 1.1,
                transform: 0.45,
                divergent: -0.2,
                interior: -0.15,
                bayWeight: 0.48,
                bayNoiseBonus: 1.2,
                fjordWeight: 1.05,
            },
        },
        mountains: {
            mountainPercent: 11,
            hillPercent: 20,
            upliftWeight: 0.7,
            fractalWeight: 0.3,
            riftDepth: 0.4,
            variance: 1.2,
            boundaryWeight: 0.6,
            boundaryExponent: 1.28,
            interiorPenaltyWeight: 0.5,
            convergenceBonus: 0.7,
            transformPenalty: 0.24,
            riftPenalty: 0.85,
            hillBoundaryWeight: 0.4,
            hillRiftBonus: 0.52,
            hillConvergentFoothill: 0.38,
            hillInteriorFalloff: 0.24,
            hillUpliftWeight: 0.36,
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
                baseWeight: 0.45,
                bandWeight: 0.55,
            },
            bands: {
                deg0to10: 92,
                deg10to20: 64,
                deg20to35: 32,
                deg35to55: 52,
                deg55to70: 34,
                deg70plus: 18,
            },
            orographic: {
                hi1Threshold: 280,
                hi1Bonus: 6,
                hi2Threshold: 540,
                hi2Bonus: 18,
            },
            coastal: {
                coastalLandBonus: 3,
                shallowAdjBonus: 2,
            },
            noise: {
                baseSpanSmall: 5,
                spanLargeScaleFactor: 1.1,
            },
        },
        climateRefine: /** @type {Partial<ClimateRefine>} */ ({
            waterGradient: {
                radius: 7,
                perRingBonus: 1.6,
                lowlandBonus: 3,
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
            taigaExtraChance: 2,
            shelfReefMultiplier: 0.85,
        },
        worldModel: /** @type {Partial<WorldModelCfg>} */ ({
            plates: {
                count: 13,
                convergenceMix: 0.55,
                relaxationSteps: 4,
                seedJitter: 3,
                interiorSmooth: 2,
                plateRotationMultiple: 2,
                // seedOffset: 2203, // tweak for alternate plate tessellations
            },
            wind: {
                jetStreaks: 5,
                jetStrength: 2.0,
                variance: 0.4,
                coriolisZonalScale: 2.1,
            },
            currents: {
                basinGyreCountMax: 4,
                westernBoundaryBias: 1.6,
                currentStrength: 1.4,
            },
            pressure: {
                bumps: 10,
                amplitude: 6,
                scale: 1.8,
            },
            directionality: {
                cohesion: 0.48,
                primaryAxes: {
                    plateAxisDeg: 180,
                    windBiasDeg: 24,
                    currentBiasDeg: 195,
                },
                interplay: {
                    windsFollowPlates: 0.55,
                    currentsFollowWinds: 0.62,
                    riftsFollowPlates: 0.78,
                    orogenyOpposesRifts: 0.62,
                },
                hemispheres: {
                    southernFlip: true,
                    equatorBandDeg: 14,
                    monsoonBias: 0.24,
                },
                variability: {
                    angleJitterDeg: 22,
                    magnitudeVariance: 0.45,
                    // seedOffset: 9053,
                },
            },
            policy: {
                windInfluence: 1.2,
                currentHumidityBias: 0.6,
                boundaryFjordBias: 1.1,
                shelfReefBias: 0.7,
                oceanSeparation: {
                    enabled: true,
                    baseSeparationTiles: 1,
                    boundaryClosenessMultiplier: 0.35,
                    maxPerRowDelta: 1,
                    minChannelWidth: 5,
                    respectSeaLanes: true,
                    edgeWest: {
                        enabled: false,
                        baseTiles: 0,
                        boundaryClosenessMultiplier: 1.0,
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
