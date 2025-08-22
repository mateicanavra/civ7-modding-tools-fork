// @ts-nocheck
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

// @ts-check

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

/* -----------------------------------------------------------------------------
 * Merge and freeze helpers
 * -------------------------------------------------------------------------- */

/**
 * @param {any} v
 * @returns {v is AnyObject}
 */
function isPlainObject(v) {
    return (
        v != null &&
        typeof v === "object" &&
        (Object.getPrototypeOf(v) === Object.prototype ||
            Object.getPrototypeOf(v) === null)
    );
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
        } else {
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
    if (Array.isArray(v)) return v.slice();
    if (isPlainObject(v)) {
        const o = {};
        for (const k of Object.keys(v)) o[k] = v[k];
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
    if (v == null) return v;
    if (typeof Object.isFrozen === "function" && Object.isFrozen(v)) return v;

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
        ? rc.presets.filter(
              (n) => typeof n === "string" && !!PRESET_REGISTRY[n],
          )
        : [];
    for (const name of presetNames) {
        const presetObj = PRESET_REGISTRY[name];
        if (presetObj) {
            merged = deepMerge(merged, presetObj);
        }
    }

    // Strip control keys (e.g., 'presets') from overrides before merge
    /** @type {AnyObject} */
    const overrides = {};
    for (const k of Object.keys(rc)) {
        if (k === "presets") continue;
        overrides[k] = rc[k];
    }

    // Apply per-entry overrides last (highest precedence)
    merged = deepMerge(merged, overrides);

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
 * Dot-path getter for convenience (e.g., "worldModel.directionality").
 * Returns undefined if not found.
 * @param {string} path
 * @returns {any}
 */
export function get(path) {
    if (!path || typeof path !== "string") return undefined;
    const parts = path.split(".");
    /** @type {any} */
    let cur = SNAPSHOT;
    for (const p of parts) {
        if (cur == null) return undefined;
        cur = cur[p];
    }
    return cur;
}

/* ---- Named helpers (common groups; return empty objects if missing) ---- */
export function TOGGLES() {
    return getGroup("toggles");
}
export function STORY() {
    return getGroup("story");
}
export function MICROCLIMATE() {
    return getGroup("microclimate");
}
export function LANDMASS_CFG() {
    return getGroup("landmass");
}
export function COASTLINES_CFG() {
    return getGroup("coastlines");
}
export function MARGINS_CFG() {
    return getGroup("margins");
}
export function ISLANDS_CFG() {
    return getGroup("islands");
}
export function CLIMATE_BASELINE_CFG() {
    return getGroup("climateBaseline");
}
export function CLIMATE_REFINE_CFG() {
    return getGroup("climateRefine");
}
export function BIOMES_CFG() {
    return getGroup("biomes");
}
export function FEATURES_DENSITY_CFG() {
    return getGroup("featuresDensity");
}
export function CORRIDORS_CFG() {
    return getGroup("corridors");
}
export function PLACEMENT_CFG() {
    return getGroup("placement");
}
export function DEV_LOG_CFG() {
    return getGroup("dev");
}
export function WORLDMODEL_CFG() {
    return getGroup("worldModel");
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
