// @ts-check
/**
 * Resolved Config Provider
 *
 * Purpose
 * - Build a single, immutable configuration snapshot for the current run by
 *   composing, in order of increasing precedence:
 *     1) Explicit defaults (BASE_CONFIG)
 *     2) Named presets (optional, ordered)
 *     3) Per-entry overrides from runtime (set via setConfig in entry files)
 *
 * Usage
 * - Call refresh() once at the start of generation (e.g., top of generateMap()).
 * - Import and use the getters below to read resolved groups/fields.
 *
 * Notes
 * - Arrays are replaced (not merged); objects are deep-merged by key.
 * - The final snapshot is deeply frozen to prevent accidental mutation.
 * - Control keys (e.g., `presets`) are stripped from the final snapshot.
 */

/**
 * Type definitions for configuration objects (available at runtime).
 * @typedef {import('./map_config.types.js').MapConfig} MapConfig
 * @typedef {import('./map_config.types.js').Toggles} Toggles
 * @typedef {import('./map_config.types.js').Story} Story
 * @typedef {import('./map_config.types.js').Microclimate} Microclimate
 * @typedef {import('./map_config.types.js').Landmass} Landmass
 * @typedef {import('./map_config.types.js').Coastlines} Coastlines
 * @typedef {import('./map_config.types.js').Margins} Margins
 * @typedef {import('./map_config.types.js').Islands} Islands
 * @typedef {import('./map_config.types.js').ClimateBaseline} ClimateBaseline
 * @typedef {import('./map_config.types.js').ClimateRefine} ClimateRefine
 * @typedef {import('./map_config.types.js').Biomes} Biomes
 * @typedef {import('./map_config.types.js').FeaturesDensity} FeaturesDensity
 * @typedef {import('./map_config.types.js').Mountains} Mountains
 * @typedef {import('./map_config.types.js').Volcanoes} Volcanoes
 * @typedef {import('./map_config.types.js').Corridors} Corridors
 * @typedef {import('./map_config.types.js').Placement} Placement
 * @typedef {import('./map_config.types.js').DevLogging} DevLogging
 * @typedef {import('./map_config.types.js').WorldModel} WorldModel
 * @typedef {import('./map_config.types.js').StageManifest} StageManifest
 * @typedef {import('./map_config.types.js').StageDescriptor} StageDescriptor
 * @typedef {import('./map_config.types.js').StageName} StageName
 */

import { BASE_CONFIG } from "./defaults/base.js";
import { CLASSIC_PRESET } from "./presets/classic.js";
import { TEMPERATE_PRESET } from "./presets/temperate.js";
import { getConfig as getRuntimeConfig } from "./runtime.js";
/* -----------------------------------------------------------------------------
 * Internal state
 * -------------------------------------------------------------------------- */
/** @typedef {Record<string, any>} AnyObject */
/** @type {Record<string, AnyObject>} */
const PRESET_REGISTRY = Object.freeze({
    classic: CLASSIC_PRESET,
    temperate: TEMPERATE_PRESET,
});
/** @type {ReadonlyArray<string>} */
let ACTIVE_PRESETS = Object.freeze([]);
/** @type {Readonly<AnyObject>} */
let SNAPSHOT = BASE_CONFIG;
/** @type {StageManifest} */
const EMPTY_STAGE_MANIFEST = Object.freeze({
    order: Object.freeze([]),
    stages: Object.freeze({}),
});
/* -----------------------------------------------------------------------------
 * Merge and freeze helpers
 * -------------------------------------------------------------------------- */
/**
 * @param {any} v
 * @returns {v is AnyObject}
 */
function isPlainObject(v) {
    return (v != null &&
        typeof v === "object" &&
        (Object.getPrototypeOf(v) === Object.prototype ||
            Object.getPrototypeOf(v) === null));
}
/**
 * Deeply merge two values into a new value.
 * - Objects: merged per-key (recursively).
 * - Arrays: replaced by the source (no concat).
 * - Other types: replaced by the source.
 *
 * @template T
 * @param {T} base
 * @param {any} src
 * @returns {T}
 */
function deepMerge(base, src) {
    // Replace primitives and arrays directly
    if (!isPlainObject(base) || Array.isArray(src)) {
        return clone(src);
    }
    if (!isPlainObject(src)) {
        // If source is not a plain object, replace
        return clone(src);
    }
    /** @type {AnyObject} */
    const out = {};
    // Copy base keys first
    for (const k of Object.keys(base)) {
        out[k] = clone(base[k]);
    }
    // Merge/replace from source
    for (const k of Object.keys(src)) {
        const b = out[k];
        const s = src[k];
        if (isPlainObject(b) && isPlainObject(s)) {
            out[k] = deepMerge(b, s);
        }
        else {
            out[k] = clone(s);
        }
    }
    return /** @type {T} */ (out);
}
/**
 * Clone a value shallowly (objects/arrays produce new containers).
 * @param {any} v
 * @returns {any}
 */
function clone(v) {
    if (Array.isArray(v))
        return v.slice();
    if (isPlainObject(v)) {
        const o = {};
        for (const k of Object.keys(v))
            o[k] = v[k];
        return o;
    }
    return v;
}
/**
 * Deep-freeze an object graph (objects/arrays).
 * Loosened typing for @ts-check to avoid structural complaints in JS.
 * @param {any} v
 * @returns {any}
 */
function deepFreeze(v) {
    if (v == null)
        return v;
    if (typeof Object.isFrozen === "function" && Object.isFrozen(v))
        return v;
    if (Array.isArray(v)) {
        const arr = v.map((item) => deepFreeze(item));
        return Object.freeze(arr);
    }
    if (isPlainObject(v)) {
        /** @type {Record<string, any>} */
        const out = {};
        for (const k of Object.keys(v)) {
            out[k] = deepFreeze(v[k]);
        }
        return Object.freeze(out);
    }
    return v;
}
/**
 * @typedef {Object} StageState
 * @property {boolean} enabled
 * @property {boolean} requested
 * @property {Array<StageName>} requires
 * @property {Array<string>} legacyToggles
 * @property {Array<string>} provides
 * @property {string | undefined} blockedBy
 */
/**
 * @param {any} values
 * @returns {Array<string>}
 */
function normalizeStringArray(values) {
    if (!Array.isArray(values))
        return [];
    /** @type {Array<string>} */
    const out = [];
    const seen = new Set();
    for (const val of values) {
        if (typeof val !== "string")
            continue;
        if (seen.has(val))
            continue;
        seen.add(val);
        out.push(val);
    }
    return out;
}
/**
 * Normalize stage manifest metadata, enforce dependencies, and derive toggle state.
 *
 * @param {any} manifestInput
 * @param {AnyObject} togglesInput
 * @param {AnyObject} worldModelCfg
 * @returns {{ manifest: StageManifest, toggles: Record<string, boolean>, warnings: Array<string> }}
 */
function normalizeStageManifest(manifestInput, togglesInput, worldModelCfg) {
    const manifestObj = isPlainObject(manifestInput) ? manifestInput : {};
    const rawOrder = Array.isArray(manifestObj.order) ? manifestObj.order : [];
    const rawStages = isPlainObject(manifestObj.stages) ? manifestObj.stages : {};
    /** @type {Array<StageName>} */
    const order = [];
    const seen = new Set();
    for (const entry of rawOrder) {
        if (typeof entry !== "string")
            continue;
        if (seen.has(entry))
            continue;
        order.push(entry);
        seen.add(entry);
    }
    for (const key of Object.keys(rawStages)) {
        if (seen.has(key))
            continue;
        order.push(key);
        seen.add(key);
    }
    /** @type {Record<string, StageState>} */
    const states = {};
    const toggles = isPlainObject(togglesInput) ? togglesInput : {};
    const orderIndex = new Map(order.map((name, idx) => [name, idx]));
    const worldModelEnabledByConfig = isPlainObject(worldModelCfg)
        ? worldModelCfg.enabled !== false
        : false;
    for (const name of order) {
        const rawDescriptor = rawStages[name];
        const descriptor = isPlainObject(rawDescriptor) ? rawDescriptor : {};
        const requires = normalizeStringArray(descriptor.requires);
        const provides = normalizeStringArray(descriptor.provides);
        const legacyToggles = normalizeStringArray(descriptor.legacyToggles);
        let enabled = descriptor.enabled !== false;
        let requested = enabled;
        for (const key of legacyToggles) {
            if (Object.prototype.hasOwnProperty.call(toggles, key) &&
                typeof toggles[key] === "boolean") {
                enabled = !!toggles[key];
                requested = !!toggles[key];
            }
        }
        let blockedBy = undefined;
        if (name === "worldModel" && !worldModelEnabledByConfig) {
            blockedBy = "worldModel config disabled";
            enabled = false;
        }
        states[name] = {
            enabled,
            requested,
            requires,
            legacyToggles,
            provides,
            blockedBy,
        };
    }
    for (const name of order) {
        const state = states[name];
        if (!state || !state.enabled)
            continue;
        for (const dep of state.requires) {
            const depState = states[dep];
            if (!depState) {
                if (!state.blockedBy)
                    state.blockedBy = `requires missing stage "${dep}"`;
                state.enabled = false;
                break;
            }
            if (!depState.enabled) {
                if (!state.blockedBy)
                    state.blockedBy = `requires disabled stage "${dep}"`;
                state.enabled = false;
                break;
            }
            const depIdx = orderIndex.get(dep);
            const stageIdx = orderIndex.get(name);
            if (depIdx != null && stageIdx != null && depIdx > stageIdx) {
                if (!state.blockedBy)
                    state.blockedBy = `dependency "${dep}" executes after stage`;
                state.enabled = false;
                break;
            }
        }
    }
    /** @type {Record<string, boolean>} */
    const derivedToggles = {};
    /** @type {Array<string>} */
    const warnings = [];
    /** @type {Record<string, StageDescriptor>} */
    const normalizedStages = {};
    for (const name of order) {
        const state = states[name];
        if (!state)
            continue;
        for (const key of state.legacyToggles) {
            derivedToggles[key] = !!state.enabled;
        }
        if (state.blockedBy && state.requested) {
            warnings.push(`Stage "${name}" disabled: ${state.blockedBy}.`);
        }
        const desc = /** @type {StageDescriptor} */ ({
            enabled: !!state.enabled,
        });
        if (state.requires.length)
            desc.requires = state.requires.slice();
        if (state.provides.length)
            desc.provides = state.provides.slice();
        if (state.legacyToggles.length)
            desc.legacyToggles = state.legacyToggles.slice();
        if (state.blockedBy)
            desc.blockedBy = state.blockedBy;
        normalizedStages[name] = desc;
    }
    return {
        manifest: {
            order: order.slice(),
            stages: normalizedStages,
        },
        toggles: derivedToggles,
        warnings,
    };
}

/**
 * Normalize stage configuration provider metadata from runtime entries.
 * @param {any} input
 * @returns {Record<string, boolean>}
 */
function normalizeStageConfigProviders(input) {
    if (!isPlainObject(input))
        return {};
    /** @type {Record<string, boolean>} */
    const out = {};
    for (const key of Object.keys(input)) {
        if (typeof key !== "string")
            continue;
        const value = input[key];
        if (typeof value === "boolean") {
            if (value)
                out[key] = true;
            continue;
        }
        if (value != null)
            out[key] = true;
    }
    return out;
}

/**
 * Derive warnings when overrides target disabled or missing stages.
 * @param {Record<string, boolean>} providers
 * @param {StageManifest} manifest
 * @returns {Array<string>}
 */
function deriveStageOverrideWarnings(providers, manifest) {
    /** @type {Array<string>} */
    const warnings = [];
    if (!providers)
        return warnings;
    const stages = manifest?.stages || {};
    for (const name of Object.keys(providers)) {
        if (!providers[name])
            continue;
        const desc = stages[name];
        if (!desc) {
            warnings.push(`Stage "${name}" not present in manifest; overrides will not run.`);
            continue;
        }
        if (desc.enabled)
            continue;
        const reason = desc.blockedBy ? ` (${desc.blockedBy})` : "";
        warnings.push(`Stage "${name}" disabled${reason}; overrides for this stage will be ignored.`);
    }
    return warnings;
}
/* -----------------------------------------------------------------------------
 * Resolution
 * -------------------------------------------------------------------------- */
/**
 * Build a new resolved snapshot by composing:
 *   BASE_CONFIG <- presets[] <- runtimeOverrides
 *
 * Runtime overrides may optionally include { presets: string[] } to select
 * named presets. The 'presets' control key is stripped from the final snapshot.
 *
 * @returns {{ snapshot: Readonly<AnyObject>, activePresetNames: ReadonlyArray<string> }}
 */
function buildSnapshot() {
    // Start from explicit defaults
    let merged = /** @type {AnyObject} */ (deepMerge({}, BASE_CONFIG));
    // Read per-entry overrides
    const rc = /** @type {AnyObject} */ (getRuntimeConfig() || {});
    // Resolve and apply presets (ordered)
    const presetNames = Array.isArray(rc.presets)
        ? rc.presets.filter((n) => typeof n === "string" && !!PRESET_REGISTRY[n])
        : [];
    for (const name of presetNames) {
        const presetObj = PRESET_REGISTRY[name];
        if (presetObj) {
            merged = deepMerge(merged, presetObj);
        }
    }
    const stageConfigProviders = normalizeStageConfigProviders(rc.stageConfig);
    // Strip control keys (e.g., 'presets') from overrides before merge
    /** @type {AnyObject} */
    const overrides = {};
    for (const k of Object.keys(rc)) {
        if (k === "presets" || k === "stageConfig")
            continue;
        overrides[k] = rc[k];
    }
    // Apply per-entry overrides last (highest precedence)
    merged = deepMerge(merged, overrides);
    if (Object.keys(stageConfigProviders).length > 0) {
        merged.stageConfig = stageConfigProviders;
    }
    const togglesBase = isPlainObject(merged.toggles) ? /** @type {AnyObject} */ (merged.toggles) : {};
    const worldModelCfg = isPlainObject(merged.worldModel) ? /** @type {AnyObject} */ (merged.worldModel) : {};
    const { manifest: normalizedManifest, toggles: manifestToggles, warnings } = normalizeStageManifest(merged.stageManifest, togglesBase, worldModelCfg);
    const overrideWarnings = deriveStageOverrideWarnings(stageConfigProviders, normalizedManifest);
    merged.stageManifest = normalizedManifest;
    merged.toggles = { ...togglesBase, ...manifestToggles };
    for (const msg of [...warnings, ...overrideWarnings]) {
        try {
            console.warn(`[StageManifest] ${msg}`);
        }
        catch (_) {
            // Ignore console access issues in restrictive runtimes.
        }
    }
    // Freeze deeply for safety
    const frozen = deepFreeze(merged);
    return {
        snapshot: frozen,
        activePresetNames: Object.freeze(presetNames.slice()),
    };
}
/* -----------------------------------------------------------------------------
 * Public API
 * -------------------------------------------------------------------------- */
/**
 * Rebuild the resolved snapshot for the current run.
 * Should be called at the start of generation (e.g., in generateMap()).
 */
export function refresh() {
    const { snapshot, activePresetNames } = buildSnapshot();
    SNAPSHOT = snapshot;
    ACTIVE_PRESETS = activePresetNames;
}
/**
 * Get the current immutable snapshot (for diagnostics or advanced usage).
 * @returns {Readonly<AnyObject>}
 */
export function getSnapshot() {
    return SNAPSHOT;
}
/**
 * Get the currently active preset names (in application order).
 * @returns {ReadonlyArray<string>}
 */
export function currentActivePresets() {
    return ACTIVE_PRESETS;
}
/**
 * Generic group accessor with safe fallback to empty object.
 * @param {string} groupName
 * @returns {Readonly<AnyObject>}
 */
export function getGroup(groupName) {
    const g = SNAPSHOT && /** @type {AnyObject} */ (SNAPSHOT)[groupName];
    return /** @type {any} */ (isPlainObject(g) ? g : {});
}
/**
 * Retrieve the normalized stage manifest (order + descriptors).
 * @returns {Readonly<StageManifest>}
 */
export function STAGE_MANIFEST() {
    const manifest = SNAPSHOT && /** @type {AnyObject} */ (SNAPSHOT).stageManifest;
    return isPlainObject(manifest)
        ? /** @type {Readonly<StageManifest>} */ (manifest)
        : EMPTY_STAGE_MANIFEST;
}
/**
 * Dot-path getter for convenience (e.g., "worldModel.directionality").
 * Returns undefined if not found.
 * @param {string} path
 * @returns {any}
 */
export function get(path) {
    if (!path || typeof path !== "string")
        return undefined;
    const parts = path.split(".");
    /** @type {any} */
    let cur = SNAPSHOT;
    for (const p of parts) {
        if (cur == null)
            return undefined;
        cur = cur[p];
    }
    return cur;
}
/* ---- Named helpers (common groups; return empty objects if missing) ---- */
/** @returns {Readonly<Toggles>} */
export function TOGGLES() {
    return /** @type {Readonly<Toggles>} */ (getGroup("toggles"));
}
/** @returns {Readonly<Story>} */
export function STORY() {
    return /** @type {Readonly<Story>} */ (getGroup("story"));
}
/** @returns {Readonly<Microclimate>} */
export function MICROCLIMATE() {
    return /** @type {Readonly<Microclimate>} */ (getGroup("microclimate"));
}
/** @returns {Readonly<Landmass>} */
export function LANDMASS_CFG() {
    return /** @type {Readonly<Landmass>} */ (getGroup("landmass"));
}
/** @returns {Readonly<Coastlines>} */
export function COASTLINES_CFG() {
    return /** @type {Readonly<Coastlines>} */ (getGroup("coastlines"));
}
/** @returns {Readonly<Margins>} */
export function MARGINS_CFG() {
    return /** @type {Readonly<Margins>} */ (getGroup("margins"));
}
/** @returns {Readonly<Islands>} */
export function ISLANDS_CFG() {
    return /** @type {Readonly<Islands>} */ (getGroup("islands"));
}
/** @returns {Readonly<ClimateBaseline>} */
export function CLIMATE_BASELINE_CFG() {
    return /** @type {Readonly<ClimateBaseline>} */ (getGroup("climateBaseline"));
}
/** @returns {Readonly<ClimateRefine>} */
export function CLIMATE_REFINE_CFG() {
    return /** @type {Readonly<ClimateRefine>} */ (getGroup("climateRefine"));
}
/** @returns {Readonly<Mountains>} */
export function MOUNTAINS_CFG() {
    return /** @type {Readonly<Mountains>} */ (getGroup("mountains"));
}
/** @returns {Readonly<Volcanoes>} */
export function VOLCANOES_CFG() {
    return /** @type {Readonly<Volcanoes>} */ (getGroup("volcanoes"));
}
/** @returns {Readonly<Biomes>} */
export function BIOMES_CFG() {
    return /** @type {Readonly<Biomes>} */ (getGroup("biomes"));
}
/** @returns {Readonly<FeaturesDensity>} */
export function FEATURES_DENSITY_CFG() {
    return /** @type {Readonly<FeaturesDensity>} */ (getGroup("featuresDensity"));
}
/** @returns {Readonly<Corridors>} */
export function CORRIDORS_CFG() {
    return /** @type {Readonly<Corridors>} */ (getGroup("corridors"));
}
/** @returns {Readonly<Placement>} */
export function PLACEMENT_CFG() {
    return /** @type {Readonly<Placement>} */ (getGroup("placement"));
}
/** @returns {Readonly<DevLogging>} */
export function DEV_LOG_CFG() {
    return /** @type {Readonly<DevLogging>} */ (getGroup("dev"));
}
/** @returns {Readonly<WorldModel>} */
export function WORLDMODEL_CFG() {
    return /** @type {Readonly<WorldModel>} */ (getGroup("worldModel"));
}
/* ---- Common nested worldModel helpers ---- */
export function WORLDMODEL_PLATES() {
    return /** @type {any} */ (get("worldModel.plates") || {});
}
export function WORLDMODEL_WIND() {
    return /** @type {any} */ (get("worldModel.wind") || {});
}
export function WORLDMODEL_CURRENTS() {
    return /** @type {any} */ (get("worldModel.currents") || {});
}
export function WORLDMODEL_PRESSURE() {
    return /** @type {any} */ (get("worldModel.pressure") || {});
}
export function WORLDMODEL_POLICY() {
    return /** @type {any} */ (get("worldModel.policy") || {});
}
export function WORLDMODEL_DIRECTIONALITY() {
    return /** @type {any} */ (get("worldModel.directionality") || {});
}
export function WORLDMODEL_OCEAN_SEPARATION() {
    return /** @type {any} */ (get("worldModel.policy.oceanSeparation") || {});
}
/* ---- Default export (optional convenience) ---- */
export default {
    refresh,
    getSnapshot,
    currentActivePresets,
    getGroup,
    get,
    STAGE_MANIFEST,
    // Groups
    TOGGLES,
    STORY,
    MICROCLIMATE,
    LANDMASS_CFG,
    COASTLINES_CFG,
    MARGINS_CFG,
    ISLANDS_CFG,
    CLIMATE_BASELINE_CFG,
    CLIMATE_REFINE_CFG,
    BIOMES_CFG,
    FEATURES_DENSITY_CFG,
    CORRIDORS_CFG,
    PLACEMENT_CFG,
    DEV_LOG_CFG,
    WORLDMODEL_CFG,
    // WorldModel subsets
    WORLDMODEL_PLATES,
    WORLDMODEL_WIND,
    WORLDMODEL_CURRENTS,
    WORLDMODEL_PRESSURE,
    WORLDMODEL_POLICY,
    WORLDMODEL_DIRECTIONALITY,
    WORLDMODEL_OCEAN_SEPARATION,
};
