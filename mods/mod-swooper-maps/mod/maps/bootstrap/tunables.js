// @ts-nocheck
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
import { refresh as __refreshResolved__,
// group getters
TOGGLES as __TOGGLES__, STORY as __STORY__, MICROCLIMATE as __MICROCLIMATE__, LANDMASS_CFG as __LANDMASS__, COASTLINES_CFG as __COASTLINES__, MARGINS_CFG as __MARGINS__, ISLANDS_CFG as __ISLANDS__, CLIMATE_BASELINE_CFG as __CLIMATE_BASELINE__, CLIMATE_REFINE_CFG as __CLIMATE_REFINE__, MOUNTAINS_CFG as __MOUNTAINS__, VOLCANOES_CFG as __VOLCANOES__, BIOMES_CFG as __BIOMES__, FEATURES_DENSITY_CFG as __FEATURES_DENSITY__, CORRIDORS_CFG as __CORRIDORS__, PLACEMENT_CFG as __PLACEMENT__, DEV_LOG_CFG as __DEV__, WORLDMODEL_CFG as __WM__, STAGE_MANIFEST as __STAGE_MANIFEST__,
// nested WM helpers
WORLDMODEL_PLATES as __WM_PLATES__, WORLDMODEL_WIND as __WM_WIND__, WORLDMODEL_CURRENTS as __WM_CURRENTS__, WORLDMODEL_PRESSURE as __WM_PRESSURE__, WORLDMODEL_POLICY as __WM_POLICY__, WORLDMODEL_DIRECTIONALITY as __WM_DIR__, WORLDMODEL_OCEAN_SEPARATION as __WM_OSEPARATION__, } from "./resolved.js";
/**
 * Type definitions for configuration objects (available at runtime).
 * @typedef {import('./map_config.types.js').Landmass} Landmass
 * @typedef {import('./map_config.types.js').LandmassGeometry} LandmassGeometry
 * @typedef {import('./map_config.types.js').Coastlines} CoastlinesCfg
 * @typedef {import('./map_config.types.js').Margins} MarginsCfg
 * @typedef {import('./map_config.types.js').Islands} IslandsCfg
 * @typedef {import('./map_config.types.js').ClimateBaseline} ClimateBaseline
* @typedef {import('./map_config.types.js').ClimateRefine} ClimateRefine
 * @typedef {import('./map_config.types.js').Mountains} MountainsCfg
 * @typedef {import('./map_config.types.js').Biomes} Biomes
 * @typedef {import('./map_config.types.js').Volcanoes} VolcanoesCfg
 * @typedef {import('./map_config.types.js').FeaturesDensity} FeaturesDensity
 * @typedef {import('./map_config.types.js').Corridors} Corridors
 * @typedef {import('./map_config.types.js').CorridorPolicy} CorridorPolicy
 * @typedef {import('./map_config.types.js').CorridorKinds} CorridorKinds
 * @typedef {import('./map_config.types.js').Placement} Placement
 * @typedef {import('./map_config.types.js').DevLogging} DevLogging
 * @typedef {import('./map_config.types.js').WorldModel} WorldModel
 * @typedef {import('./map_config.types.js').StageManifest} StageManifest
 * @typedef {import('./map_config.types.js').StageName} StageName
 */
/* -----------------------------------------------------------------------------
 * Exported live bindings (updated by rebind)
 * -------------------------------------------------------------------------- */
/** @type {Readonly<StageManifest>} */
export let STAGE_MANIFEST = Object.freeze({
    order: Object.freeze([]),
    stages: Object.freeze({}),
});
/**
 * Check whether a manifest stage is enabled after dependency evaluation.
 * @param {StageName} stage
 * @returns {boolean}
 */
export function stageEnabled(stage) {
    if (!STAGE_MANIFEST || typeof STAGE_MANIFEST !== "object")
        return false;
    const stages = STAGE_MANIFEST.stages || {};
    const entry = stages && stages[stage];
    return !!(entry && entry.enabled !== false);
}
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
/** @type {Readonly<Landmass>} */
export let LANDMASS_CFG = Object.freeze({});
/** @type {Readonly<LandmassGeometry>} */
export let LANDMASS_GEOMETRY = Object.freeze({});
/** @type {Readonly<CoastlinesCfg>} */
export let COASTLINES_CFG = Object.freeze({});
/** @type {Readonly<MarginsCfg>} */
export let MARGINS_CFG = Object.freeze({});
/** @type {Readonly<IslandsCfg>} */
export let ISLANDS_CFG = Object.freeze({});
/** @type {Readonly<ClimateBaseline>} */
export let CLIMATE_BASELINE_CFG = Object.freeze({});
/** @type {Readonly<ClimateRefine>} */
export let CLIMATE_REFINE_CFG = Object.freeze({});
/** @type {Readonly<MountainsCfg>} */
export let MOUNTAINS_CFG = Object.freeze({});
/** @type {Readonly<VolcanoesCfg>} */
export let VOLCANOES_CFG = Object.freeze({});
/** @type {Readonly<Biomes>} */
export let BIOMES_CFG = Object.freeze({});
/** @type {Readonly<FeaturesDensity>} */
export let FEATURES_DENSITY_CFG = Object.freeze({});
/** @type {Readonly<Corridors>} */
export let CORRIDORS_CFG = Object.freeze({});
/** @type {Readonly<Placement>} */
export let PLACEMENT_CFG = Object.freeze({});
/** @type {Readonly<DevLogging>} */
export let DEV_LOG_CFG = Object.freeze({});
/** @type {Readonly<WorldModel>} */
export let WORLDMODEL_CFG = Object.freeze({});
// Corridor sub-groups
/** @type {Readonly<CorridorPolicy>} */
export let CORRIDOR_POLICY = Object.freeze({});
/** @type {Readonly<CorridorKinds>} */
export let CORRIDOR_KINDS = Object.freeze({});
// WorldModel nested groups
/** @type {Readonly<WorldModel['plates']>} */
export let WORLDMODEL_PLATES = Object.freeze({});
/** @type {Readonly<WorldModel['wind']>} */
export let WORLDMODEL_WIND = Object.freeze({});
/** @type {Readonly<WorldModel['currents']>} */
export let WORLDMODEL_CURRENTS = Object.freeze({});
/** @type {Readonly<WorldModel['pressure']>} */
export let WORLDMODEL_PRESSURE = Object.freeze({});
/** @type {Readonly<WorldModel['policy']>} */
export let WORLDMODEL_POLICY = Object.freeze({});
/** @type {Readonly<WorldModel['directionality']>} */
export let WORLDMODEL_DIRECTIONALITY = Object.freeze({});
/** @type {Readonly<NonNullable<WorldModel['policy']>['oceanSeparation']>} */
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
    STAGE_MANIFEST = safeObj(__STAGE_MANIFEST__());
    const manifestToggleMap = deriveManifestToggleMap(STAGE_MANIFEST);
    const resolvedToggleSnapshot = safeObj(__TOGGLES__());
    const toggleValue = (key, fallback) => {
        if (Object.prototype.hasOwnProperty.call(manifestToggleMap, key))
            return manifestToggleMap[key];
        const raw = resolvedToggleSnapshot[key];
        return typeof raw === "boolean" ? raw : fallback;
    };
    // 2) Toggles
    STORY_ENABLE_HOTSPOTS = toggleValue("STORY_ENABLE_HOTSPOTS", true);
    STORY_ENABLE_RIFTS = toggleValue("STORY_ENABLE_RIFTS", true);
    STORY_ENABLE_OROGENY = toggleValue("STORY_ENABLE_OROGENY", true);
    STORY_ENABLE_SWATCHES = toggleValue("STORY_ENABLE_SWATCHES", true);
    STORY_ENABLE_PALEO = toggleValue("STORY_ENABLE_PALEO", true);
    STORY_ENABLE_CORRIDORS = toggleValue("STORY_ENABLE_CORRIDORS", true);
    STORY_ENABLE_WORLDMODEL = toggleValue("STORY_ENABLE_WORLDMODEL", true);
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
    MOUNTAINS_CFG = safeObj(__MOUNTAINS__());
    VOLCANOES_CFG = safeObj(__VOLCANOES__());
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
 * Build a lookup of legacy toggle keys derived from the stage manifest.
 * @param {Readonly<StageManifest>} manifest
 * @returns {Record<string, boolean>}
 */
function deriveManifestToggleMap(manifest) {
    /** @type {Record<string, boolean>} */
    const out = {};
    if (!manifest || typeof manifest !== "object")
        return out;
    const stages = manifest.stages || {};
    const order = Array.isArray(manifest.order) && manifest.order.length > 0
        ? manifest.order
        : Object.keys(stages || {});
    for (const name of order) {
        const stage = stages && stages[name];
        if (!stage)
            continue;
        const toggles = Array.isArray(stage.legacyToggles) ? stage.legacyToggles : [];
        for (const key of toggles) {
            if (typeof key !== "string")
                continue;
            out[key] = stage.enabled !== false;
        }
    }
    for (const name of Object.keys(stages || {})) {
        const stage = stages[name];
        if (!stage)
            continue;
        const toggles = Array.isArray(stage.legacyToggles) ? stage.legacyToggles : [];
        for (const key of toggles) {
            if (typeof key !== "string" || Object.prototype.hasOwnProperty.call(out, key))
                continue;
            out[key] = stage.enabled !== false;
        }
    }
    return out;
}
/**
 * Ensure we always return a frozen object of the expected shape for TS consumers.
 * Falls back to an empty frozen object when input is null/undefined or not an object.
 * @template T
 * @param {any} v
 * @returns {Readonly<T>}
 */
function safeObj(v) {
    if (!v || typeof v !== "object")
        return /** @type {Readonly<T>} */ (Object.freeze({}));
    return /** @type {Readonly<T>} */ (v);
}
/* -----------------------------------------------------------------------------
 * Module-load bootstrap
 * -------------------------------------------------------------------------- */
// Perform an initial bind so imports have sane values even if callers forget to rebind().
// Callers should still rebind() at the start of each GenerateMap to ensure the
// snapshot reflects the active entry’s presets and overrides.
try {
    rebind();
}
catch {
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
