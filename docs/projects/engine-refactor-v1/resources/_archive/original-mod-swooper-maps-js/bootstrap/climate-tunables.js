/**
 * Climate-focused tunable surface. Thin wrapper over the unified tunables module
 * so climate layers can import a concise bundle without re-export noise.
 */
export {
    rebind,
    CLIMATE_TUNABLES,
    CLIMATE,
    CLIMATE_CFG,
    CLIMATE_DRIVERS,
    MOISTURE_ADJUSTMENTS,
    STORY_TUNABLES,
} from "./tunables.js";
