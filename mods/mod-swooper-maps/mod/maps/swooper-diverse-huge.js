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
            boundaryExponent: 2,
            mountainPercent: 11,
            boundaryWeight: 2,
            convergenceBonus: 1.6,
            hillInteriorFalloff: 0.9,
            hillPercent: 2,
            riftDepth: 0,
            riftPenalty: 0,
            hillRiftBonus: 0.6,
            hillBoundaryWeight: 0.2,
            hillConvergentFoothill: 0.1,
            hillUpliftWeight: 0.3,
            interiorPenaltyWeight: 0.8,
            transformPenalty: 0.8
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
                    },
                    equatorialRainbelt: {
                        weight: 4,           // Sparse equatorial refuges
                        wetnessDelta: 58,    // Still lush where it survives
                    },
                    greatPlains: {
                        weight: 6,           // Windswept steppe shelves
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
