// @ts-nocheck
/**
 * Minimal runtime config store for per-map inline configuration.
 *
 * Intent
 * - Each map entry file defines a plain JS object (MAP_CONFIG) inline and calls setConfig(MAP_CONFIG).
 * - The generator/orchestrator imports this module and calls getConfig() at runtime (e.g., inside generateMap()).
 * - No dynamic imports, no registries, no evaluation-time side effects. Dead simple and explicit.
 *
 * Usage (in a map entry file):
 *   import { setConfig } from "./config/runtime.js";
 *   import "./map_orchestrator.js"; // or your generator module that reads getConfig() at runtime
 *
 *   setConfig({
 *     toggles: { STORY_ENABLE_WORLDMODEL: true },
 *     landmass: { /* ... *\/ },
 *     worldModel: { /* ... *\/ },
 *     /* other groups ... *\/
 *   });
 *
 * Usage (in the orchestrator/generator):
 *   import { getConfig } from "./config/runtime.js";
 *   function generateMap() {
 *     const cfg = getConfig();
 *     // read cfg.toggles, cfg.landmass, etc., and proceed
 *   }
 */

const GLOBAL_KEY = "__EPIC_MAP_CONFIG__";

/**
 * Store the per-map configuration for this run.
 * Accepts any plain object. Non-objects are coerced to an empty object.
 * The stored object is shallow-frozen to prevent accidental mutation.
 * @param {object} config
 */
export function setConfig(config) {
  const obj = isObject(config) ? config : {};
  const frozen = shallowFreeze(obj);
  try {
    // Use a single well-known global key so all modules can access the same config
    // without import-time coupling or registries.
    globalThis[GLOBAL_KEY] = frozen;
  } catch {
    // In restricted environments, fall back to a local static (unlikely in Civ VM).
    __localStore.value = frozen;
  }
}

/**
 * Retrieve the current per-map configuration.
 * Returns an empty frozen object if none was set.
 * @returns {object}
 */
export function getConfig() {
  try {
    const v = globalThis[GLOBAL_KEY];
    return isObject(v) ? v : EMPTY_FROZEN_OBJECT;
  } catch {
    return isObject(__localStore.value) ? __localStore.value : EMPTY_FROZEN_OBJECT;
  }
}

/* -----------------------------------------------------------------------------
 * Internal helpers
 * -------------------------------------------------------------------------- */

const EMPTY_FROZEN_OBJECT = Object.freeze({});

/** @type {{ value: object }} */
const __localStore = { value: EMPTY_FROZEN_OBJECT };

/**
 * Shallow-freeze an object (freezes only the first level).
 * @template T extends object
 * @param {T} obj
 * @returns {Readonly<T>}
 */
function shallowFreeze(obj) {
  try {
    return Object.freeze(obj);
  } catch {
    return obj;
  }
}

/**
 * @param {any} v
 * @returns {v is object}
 */
function isObject(v) {
  return v != null && typeof v === "object";
}
