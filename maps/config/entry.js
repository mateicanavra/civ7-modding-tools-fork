/**
 * Entry Bootstrap Helper
 *
 * Purpose
 * - Minimize boilerplate in map entry files.
 * - Compose configuration from named presets and inline overrides, then
 *   register the generator by importing the orchestrator exactly once.
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
 *     },
 *     orchestrator: "./map_orchestrator.js", // optional (defaults to same-dir)
 *   });
 *
 * Notes
 * - This helper is intentionally simple and synchronous for game VM compatibility.
 * - Presets are applied by name via resolved.js; arrays replace, objects deep-merge.
 * - The orchestrator import is guarded so it runs only once per runtime.
 */

// @ts-check

import { setConfig } from "./runtime.js";

/** Guard to avoid importing the orchestrator more than once per runtime */
const BOOT_FLAG = "__EPIC_EDH_BOOTSTRAPPED__";

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
 * set it as the active runtime config, and import the orchestrator once.
 *
 * @param {object} [options]
 * @param {ReadonlyArray<string>} [options.presets] - Ordered list of preset names understood by resolved.js
 * @param {object} [options.overrides] - Inline overrides applied last (highest precedence)
 * @param {string} [options.orchestrator="./map_orchestrator.js"] - Relative path to the orchestrator module
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

  // Store runtime config for this map entry
  setConfig(cfg);

  // Import orchestrator exactly once
  try {
    if (!globalThis[BOOT_FLAG]) {
      globalThis[BOOT_FLAG] = true;
      const orchestratorPath =
        typeof options.orchestrator === "string" && options.orchestrator.length
          ? options.orchestrator
          : "./map_orchestrator.js";
      // Static import for engine VM; side-effect registers engine listeners.
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      import(orchestratorPath);
    }
  } catch {
    // Fallback: best-effort static import (path default)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    import("./map_orchestrator.js");
  }
}

export default { bootstrap };
