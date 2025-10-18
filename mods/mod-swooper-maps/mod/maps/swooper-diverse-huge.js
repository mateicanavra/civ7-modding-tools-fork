// @ts-check
/**
 * Epic Diverse Huge — Base Map Entry
 *
 * Minimal entry: set a default per‑map config, then import the orchestrator.
 * The orchestrator registers engine listeners on load and reads config at runtime.
 */
import { bootstrap } from "./bootstrap/entry.js";

/** @typedef {import("./bootstrap/map_config.types.js").MapConfig} MapConfig */
/** @typedef {import("./bootstrap/map_config.types.js").Toggles} Toggles */
/** @typedef {import("./bootstrap/map_config.types.js").WorldModel} WorldModelCfg */
/** @typedef {MapConfig['worldModel']} WorldModel */
/** @typedef {MapConfig['climateRefine']} ClimateRefine */



bootstrap({
    presets: ["voronoi"],
    overrides: /** @type {Partial<MapConfig>} */ ({
        // Earth-like climate pushed toward arid, ancient continental interiors
        climateBaseline: {
            bands: {
                deg0to10: 165,      // Still humid equator, but less jungle saturation
                deg10to20: 95,      // Hot subtropics trending arid
                deg20to35: 22,      // Broad desert girdle (old Gondwanan belts)
                deg35to55: 54,      // Semi-arid temperate zones
                deg55to70: 41,      // Dry, windswept subpolar bands
                deg70plus: 24,      // Stark polar deserts
            },
            coastal: {
                coastalLandBonus: 4,     // Dusty shorelines—coastal deserts thrive
                shallowAdjBonus: 3,      // Minimal humidity bleed from shallow seas
            },
        },
        climateRefine: /** @type {Partial<ClimateRefine>} */ ({
            waterGradient: {
                radius: 6,
                perRingBonus: 1.4,       // Interiors desiccate quickly away from coasts
                lowlandBonus: 1.2,       // Basins stay dry unless fed by rivers
            },
            orographic: {
                steps: 5,
                reductionBase: 28,       // Brutal lee-side shadows
                reductionPerStep: 16,    // Moisture collapse with each ridge
            },
        }),
        mountains: {
            mountainPercent: 10,
            hillPercent: 18,
            upliftWeight: 0.9,
            fractalWeight: 0.1,
            riftDepth: 0.45,
            variance: 1.5,
            boundaryWeight: 1.35,
            boundaryExponent: 1.25,
            interiorPenaltyWeight: 0.25,
            convergenceBonus: 1.6,
            transformPenalty: 0.35,
            riftPenalty: 1.05,
            hillBoundaryWeight: 0.7,
            hillRiftBonus: 0.65,
            hillConvergentFoothill: 0.4,
            hillInteriorFalloff: 0.22,
            hillUpliftWeight: 0.35,
        },
        coastlines: {
            plateBias: {
                threshold: 0.4,
                power: 1.3,
                convergent: 1.4,
                transform: 0.5,
                divergent: -0.85,
                interior: 0,
                bayWeight: 0.45,
                bayNoiseBonus: 1.2,
                fjordWeight: 1.15,
            },
        },
        volcanoes: {
            baseDensity: 1 / 160,
            minSpacing: 4,
            boundaryThreshold: 0.32,
            boundaryWeight: 1.45,
            convergentMultiplier: 2.8,
            transformMultiplier: 1.15,
            divergentMultiplier: 0.25,
            hotspotWeight: 0.18,
            shieldPenalty: 0.7,
            randomJitter: 0.1,
            minVolcanoes: 8,
            maxVolcanoes: 48,
        },
        margins: {
            activeFraction: 0.25,
            passiveFraction: 0.87,
            minSegmentLength: 33
        },
        // Enhanced desert swatches and rain shadow effects
        story: {
            swatches: {
                maxPerMap: 26,            // Many overlapping paleo climate pockets
                types: {
                    macroDesertBelt: {
                        weight: 22,          // Dominant macro feature
                        drynessDelta: 70,    // Scorched earth core belts
                        halfWidthDeg: 27,    // Sprawling desert girdles
                        bleedRadius: 12
                    },
                    equatorialRainbelt: {
                        weight: 4,           // Sparse equatorial refuges
                        wetnessDelta: 58,    // Still lush where it survives
                    },
                    greatPlains: {
                        weight: 3,           // Windswept steppe shelves
                        dryDelta: 28,        // Parched prairie basins
                    },
                    rainforestArchipelago: {
                        weight: 6,
                        coupleToOrogeny: true,
                        latitudeCenterDeg: 19
                    }
                },
            },
            orogeny: {
                beltMaxPerContinent: 3,
                beltMinLength: 10,
                radius: 6,
                leeDrynessAmplifier: 3.1,    // Hyper-arid lees
                windwardBoost: 8,            // Verdant windward pockets
            },
            paleo: {
                maxFossilChannels: 20,       // Abundant dry paleo channels
                canyonDryBonus: 9,           // Bone-dry canyon floors
            },
        },
        worldModel: /** @type {Partial<WorldModelCfg>} */ {
            pressure: {
                amplitude: 7,
                scale: 1.9,
                bumps: 14
            },
            wind: {
                jetStreaks: 4,
                jetStrength: 2.1,
                coriolisZonalScale: 2.5
            },
            currents: {
                currentStrength: 1.9
            },
            plates: {
                count: 13,
                convergenceMix: 0.72,
                relaxationSteps: 2,
                plateRotationMultiple: 7,
                seedOffset: 1000,
            },
            policy: {
                boundaryFjordBias: 1.4,
                oceanSeparation: {
                    enabled: false
                }
            }
        }
    }),
});
import "./map_orchestrator.js";
