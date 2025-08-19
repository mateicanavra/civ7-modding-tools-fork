/**
 * Entry Bootstrap Helper
 *
 * Purpose
 * - Minimize boilerplate in map entry files.
 * - Compose configuration from named presets and inline overrides, then
 *   set the active runtime config. Entries must import the orchestrator separately.
 *
 * Usage (in a map entry file):
 *   import { bootstrap } from "./config/entry.js";
 *   bootstrap({
 *     presets: ["classic", "temperate"], // optional, ordered
 *     overrides: {
 *       // any partial config to override the resolved result
 *       toggles: { STORY_ENABLE_WORLDMODEL: true },
 *       worldModel: { enabled: true },
 *       // ...
 *     }
 *   });
 *
 * Notes
 * - This helper is intentionally simple and synchronous for game VM compatibility.
 * - Presets are applied by name via resolved.js; arrays replace, objects deep-merge.
 * - This helper does not import the orchestrator; keep the explicit import in the entry.
 */

// @ts-check

import { setConfig } from "./runtime.js";

/**
 * Deep merge utility (objects by key, arrays replaced, primitives overwritten).
 * Returns a new object; never mutates inputs.
 * @param {any} base
 * @param {any} src
 * @returns {any}
 */
function deepMerge(base, src) {
    const isObj = (v) =>
        v != null &&
        typeof v === "object" &&
        (Object.getPrototypeOf(v) === Object.prototype ||
            Object.getPrototypeOf(v) === null);

    if (!isObj(base) || Array.isArray(src)) {
        return clone(src);
    }
    if (!isObj(src)) {
        return clone(src);
    }

    /** @type {Record<string, any>} */
    const out = {};
    for (const k of Object.keys(base)) out[k] = clone(base[k]);
    for (const k of Object.keys(src)) {
        const b = out[k];
        const s = src[k];
        out[k] = isObj(b) && isObj(s) ? deepMerge(b, s) : clone(s);
    }
    return out;
}

/**
 * Shallow clone helper (new containers for arrays/objects).
 * @param {any} v
 * @returns {any}
 */
function clone(v) {
    if (Array.isArray(v)) return v.slice();
    const isObj =
        v != null &&
        typeof v === "object" &&
        (Object.getPrototypeOf(v) === Object.prototype ||
            Object.getPrototypeOf(v) === null);
    if (isObj) {
        const o = {};
        for (const k of Object.keys(v)) o[k] = v[k];
        return o;
    }
    return v;
}

/**
 * Compose a per-entry configuration object from presets and overrides,
 * and set it as the active runtime config.
 *
 * @param {object} [options]
 * @param {ReadonlyArray<string>} [options.presets] - Ordered list of preset names understood by resolved.js
 * @param {object} [options.overrides] - Inline overrides applied last (highest precedence)
 */
export function bootstrap(options = {}) {
    const presets =
        Array.isArray(options.presets) && options.presets.length > 0
            ? options.presets.filter((n) => typeof n === "string")
            : undefined;

    const overrides =
        options && typeof options === "object" && options.overrides
            ? clone(options.overrides)
            : undefined;

    /** @type {Record<string, any>} */
    const cfg = {};
    if (presets) cfg.presets = presets;
    if (overrides) {
        // If both presets and overrides exist, ensure overrides apply last (highest precedence)
        Object.assign(cfg, deepMerge(cfg, overrides));
    }

    // Store runtime config for this map entry (entries must import orchestrator separately)
    setConfig(cfg);
}

export default { bootstrap };
