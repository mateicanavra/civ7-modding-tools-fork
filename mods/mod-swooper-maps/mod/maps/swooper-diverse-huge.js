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
/** @typedef {WorldModel[]} Plates */
/** @typedef {MapConfig['climateRefine']} ClimateRefine */


bootstrap({
    presets: ["voronoi"],
    overrides: /** @type {Partial<MapConfig>} */ ({
        // Earth-like climate with enhanced desertification
        climateBaseline: {
            bands: {
                deg0to10: 210,      // Keep equatorial wet (rainforests)
                deg10to20: 130,      // Reduce slightly (transitional)
                deg20to35: 34,      // Strong reduction for subtropical desert belts (Sahara-like)
                deg35to55: 80,      // Slight reduction (temperate)
                deg55to70: 58,      // Reduce tundra precipitation
                deg70plus: 33,      // Reduce polar precipitation
            },
            coastal: {
                coastalLandBonus: 10,    // Reduced from 24 (drier coasts, allows coastal deserts)
                shallowAdjBonus: 8,     // Reduced from 16
            },
        },
        climateRefine: /** @type {Partial<ClimateRefine>} */ ({
            waterGradient: {
                radius: 5,
                perRingBonus: 2.3,       // Reduced from 5 (drier continental interiors)
                lowlandBonus: 2.0,       // Reduced from 3 (less moisture inland)
            },
            orographic: {
                steps: 4,
                reductionBase: 21,       // Increased from 8 (stronger rain shadows)
                reductionPerStep: 12,     // Increased from 6 (steeper moisture gradients)
            },
        }),
        // Enhanced desert swatches and rain shadow effects
        story: {
            swatches: {
                maxPerMap: 22,            // Increased from 7 (allow more climate zones)
                types: {
                    macroDesertBelt: {
                        weight: 17,          // Increased from 8 (much more likely)
                        drynessDelta: 53,    // Increased from 28 (more intense deserts)
                        halfWidthDeg: 23,    // Increased from 12 (wider Sahara/Gobi-like belts)
                    },
                    equatorialRainbelt: {
                        weight: 7,           // Increased from 3 (preserve Amazon/Congo)
                        wetnessDelta: 67,    // Increased from 24 (wetter rainforests)
                    },
                    greatPlains: {
                        weight: 4,           // Increased from 5 (more dry grasslands)
                        dryDelta: 20,        // Increased from 12 (drier plains)
                    },
                    rainforestArchipelago: {
                        weight: 6,
                        coupleToOrogeny: true,
                        latitudeCenterDeg: 19
                    }
                },
            },
            orogeny: {
                leeDrynessAmplifier: 2.3,    // Increased from 1.2 (strong rain shadows like Gobi/Atacama)
                windwardBoost: 6,            // Increased from 5 (wetter windward slopes)
            },
            paleo: {
                maxFossilChannels: 16,       // Increased from 12 (more dry wadis/arroyos)
                canyonDryBonus: 5,           // Increased from 3 (drier canyon floors)
            },
        },
        worldModel: /** @type {Partial<WorldModelCfg>} */ {
            pressure: {
                amplitude: 6,
                scale: 1.7,
                bumps: 13
            },
            wind: {
                jetStreaks: 3,
                jetStrength: 1.8,
                coriolisZonalScale: 2.2
            },
            currents: {
                currentStrength: 1.7
            },
            plates: {
                count: 13,
                relaxationSteps: 3,
                plateRotationMultiple: 6,
                seedOffset: 1000
            },
            policy: {
                boundaryFjordBias: 3.0,
                oceanSeparation: {
                    enabled: false
                }
            }
        }
    }),
});
import "./map_orchestrator.js";
