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
        climateRefine: /** @type {Partial<ClimateRefine>} */ ({
            waterGradient: {
                lowlandBonus: 5.0
            }
        }),
        worldModel: /** @type {Partial<WorldModelCfg>} */ {
            pressure: {
                amplitude: 3.0
            },
            wind: {
                jetStreaks: 5,
                jetStrength: 1.2,
                coriolisZonalScale: 2.2
            },
            currents: {
                currentStrength: 1.7
            },
            plates: {
                count: 18,
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
