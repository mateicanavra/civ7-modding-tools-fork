/**
 * Unified Tunables — Live bindings with runtime rebind()
 *
 * Intent
 * - Provide a single import surface for all generator tunables (toggles and groups)
 *   backed by the resolved config snapshot.
 * - Export live ES module bindings (let variables) so callers see updated values
 *   after a call to rebind().
 *
 * Usage
 *   // Import once anywhere (bindings are live)
 *   import {
 *     rebind,
 *     STORY_ENABLE_WORLDMODEL,
 *     LANDMASS_CFG,
 *     WORLDMODEL_DIRECTIONALITY,
 *     // ...
 *   } from "./config/tunables.js";
 *
 *   // Call rebind() at the start of a generation (or when the active entry changes)
 *   rebind();
 *
 * Notes
 * - rebind() calls resolved.refresh() internally, then updates all exported bindings.
 * - A best‑effort initial rebind() is performed at module load for safety.
 * - Arrays and objects returned from the resolver are treated as read‑only.
 */

// @ts-check

import {
    refresh as __refreshResolved__,
    // group getters
    TOGGLES as __TOGGLES__,
    STORY as __STORY__,
    MICROCLIMATE as __MICROCLIMATE__,
    LANDMASS_CFG as __LANDMASS__,
    COASTLINES_CFG as __COASTLINES__,
    MARGINS_CFG as __MARGINS__,
    ISLANDS_CFG as __ISLANDS__,
    CLIMATE_BASELINE_CFG as __CLIMATE_BASELINE__,
    CLIMATE_REFINE_CFG as __CLIMATE_REFINE__,
    BIOMES_CFG as __BIOMES__,
    FEATURES_DENSITY_CFG as __FEATURES_DENSITY__,
    CORRIDORS_CFG as __CORRIDORS__,
    PLACEMENT_CFG as __PLACEMENT__,
    DEV_LOG_CFG as __DEV__,
    WORLDMODEL_CFG as __WM__,
    // nested WM helpers
    WORLDMODEL_PLATES as __WM_PLATES__,
    WORLDMODEL_WIND as __WM_WIND__,
    WORLDMODEL_CURRENTS as __WM_CURRENTS__,
    WORLDMODEL_PRESSURE as __WM_PRESSURE__,
    WORLDMODEL_POLICY as __WM_POLICY__,
    WORLDMODEL_DIRECTIONALITY as __WM_DIR__,
    WORLDMODEL_OCEAN_SEPARATION as __WM_OSEPARATION__,
} from "./resolved.js";

/* -----------------------------------------------------------------------------
 * Exported live bindings (updated by rebind)
 * -------------------------------------------------------------------------- */

// Master toggles
export let STORY_ENABLE_HOTSPOTS = true;
export let STORY_ENABLE_RIFTS = true;
export let STORY_ENABLE_OROGENY = true;
export let STORY_ENABLE_SWATCHES = true;
export let STORY_ENABLE_PALEO = true;
export let STORY_ENABLE_CORRIDORS = true;
export let STORY_ENABLE_WORLDMODEL = true;

// Merged story+micro tunables convenience view
export let STORY_TUNABLES = Object.freeze({
    hotspot: Object.freeze({}),
    rift: Object.freeze({}),
    orogeny: Object.freeze({}),
    swatches: Object.freeze({}),
    paleo: Object.freeze({}),
    rainfall: Object.freeze({}),
    features: Object.freeze({}),
});

// Group objects (treat as read‑only from callers)
export let LANDMASS_CFG = Object.freeze({});
export let LANDMASS_GEOMETRY = Object.freeze({});
export let COASTLINES_CFG = Object.freeze({});
export let MARGINS_CFG = Object.freeze({});
export let ISLANDS_CFG = Object.freeze({});
export let CLIMATE_BASELINE_CFG = Object.freeze({});
export let CLIMATE_REFINE_CFG = Object.freeze({});
export let BIOMES_CFG = Object.freeze({});
export let FEATURES_DENSITY_CFG = Object.freeze({});
export let CORRIDORS_CFG = Object.freeze({});
export let PLACEMENT_CFG = Object.freeze({});
export let DEV_LOG_CFG = Object.freeze({});
export let WORLDMODEL_CFG = Object.freeze({});

// Corridor sub-groups
export let CORRIDOR_POLICY = Object.freeze({});
export let CORRIDOR_KINDS = Object.freeze({});

// WorldModel nested groups
export let WORLDMODEL_PLATES = Object.freeze({});
export let WORLDMODEL_WIND = Object.freeze({});
export let WORLDMODEL_CURRENTS = Object.freeze({});
export let WORLDMODEL_PRESSURE = Object.freeze({});
export let WORLDMODEL_POLICY = Object.freeze({});
export let WORLDMODEL_DIRECTIONALITY = Object.freeze({});
export let WORLDMODEL_OCEAN_SEPARATION = Object.freeze({});

/* -----------------------------------------------------------------------------
 * Rebind implementation
 * -------------------------------------------------------------------------- */

/**
 * Refresh the resolved snapshot then update all exported bindings.
 * Call this at the start of a generation (or whenever the active entry changes).
 */
export function rebind() {
    // 1) Resolve the current snapshot from defaults + presets + per-entry overrides
    __refreshResolved__();

    // 2) Toggles
    const T = safeObj(__TOGGLES__());
    STORY_ENABLE_HOTSPOTS = T.STORY_ENABLE_HOTSPOTS ?? true;
    STORY_ENABLE_RIFTS = T.STORY_ENABLE_RIFTS ?? true;
    STORY_ENABLE_OROGENY = T.STORY_ENABLE_OROGENY ?? true;
    STORY_ENABLE_SWATCHES = T.STORY_ENABLE_SWATCHES ?? true;
    STORY_ENABLE_PALEO = T.STORY_ENABLE_PALEO ?? true;
    STORY_ENABLE_CORRIDORS = T.STORY_ENABLE_CORRIDORS ?? true;
    STORY_ENABLE_WORLDMODEL = T.STORY_ENABLE_WORLDMODEL ?? true;

    // 3) Story+Micro merged convenience
    const S = safeObj(__STORY__());
    const M = safeObj(__MICROCLIMATE__());
    STORY_TUNABLES = Object.freeze({
        hotspot: safeObj(S.hotspot),
        rift: safeObj(S.rift),
        orogeny: safeObj(S.orogeny),
        swatches: safeObj(S.swatches),
        paleo: safeObj(S.paleo),
        rainfall: safeObj(M.rainfall),
        features: safeObj(M.features),
    });

    // 4) Groups
    LANDMASS_CFG = safeObj(__LANDMASS__());
    LANDMASS_GEOMETRY = safeObj(LANDMASS_CFG.geometry);
    COASTLINES_CFG = safeObj(__COASTLINES__());
    MARGINS_CFG = safeObj(__MARGINS__());
    ISLANDS_CFG = safeObj(__ISLANDS__());
    CLIMATE_BASELINE_CFG = safeObj(__CLIMATE_BASELINE__());
    CLIMATE_REFINE_CFG = safeObj(__CLIMATE_REFINE__());
    BIOMES_CFG = safeObj(__BIOMES__());
    FEATURES_DENSITY_CFG = safeObj(__FEATURES_DENSITY__());
    CORRIDORS_CFG = safeObj(__CORRIDORS__());
    PLACEMENT_CFG = safeObj(__PLACEMENT__());
    DEV_LOG_CFG = safeObj(__DEV__());
    WORLDMODEL_CFG = safeObj(__WM__());

    // 5) Corridor sub-groups
    CORRIDOR_POLICY = safeObj(CORRIDORS_CFG.policy);
    CORRIDOR_KINDS = safeObj(CORRIDORS_CFG.kinds);

    // 6) WorldModel nested groups
    WORLDMODEL_PLATES = safeObj(__WM_PLATES__());
    WORLDMODEL_WIND = safeObj(__WM_WIND__());
    WORLDMODEL_CURRENTS = safeObj(__WM_CURRENTS__());
    WORLDMODEL_PRESSURE = safeObj(__WM_PRESSURE__());
    WORLDMODEL_POLICY = safeObj(__WM_POLICY__());
    WORLDMODEL_DIRECTIONALITY = safeObj(__WM_DIR__());
    WORLDMODEL_OCEAN_SEPARATION = safeObj(__WM_OSEPARATION__());
}

/* -----------------------------------------------------------------------------
 * Helpers
 * -------------------------------------------------------------------------- */

/**
 * Ensure we always return a frozen plain object (never null/undefined/primitives).
 * @param {any} v
 * @returns {Readonly<Record<string, any>>}
 */
function safeObj(v) {
    if (!v || typeof v !== "object") return Object.freeze({});
    return v;
}

/* -----------------------------------------------------------------------------
 * Module-load bootstrap
 * -------------------------------------------------------------------------- */

// Perform an initial bind so imports have sane values even if callers forget to rebind().
// Callers should still rebind() at the start of each GenerateMap to ensure the
// snapshot reflects the active entry’s presets and overrides.
try {
    rebind();
} catch {
    // Keep imports resilient even if resolution fails very early in a cold VM.
    // Bindings already hold conservative defaults above.
}

export default {
    rebind,
    // expose current group snapshots (optional convenience mirror)
    get LANDMASS() {
        return LANDMASS_CFG;
    },
    get CORRIDORS() {
        return CORRIDORS_CFG;
    },
    get WORLD_MODEL() {
        return WORLDMODEL_CFG;
    },
};
