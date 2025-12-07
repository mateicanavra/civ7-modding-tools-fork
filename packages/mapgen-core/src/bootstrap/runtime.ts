/**
 * Runtime Config Store
 *
 * Minimal runtime config store for per-map inline configuration.
 * Uses lazy initialization to avoid crashes when globals unavailable.
 *
 * Usage (in a map entry file):
 *   import { setConfig } from "./runtime.js";
 *   setConfig({
 *     landmass: { ... },
 *     foundation: { ... },
 *   });
 *
 * Usage (in the orchestrator/generator):
 *   import { getConfig, resetConfig } from "./runtime.js";
 *   function generateMap() {
 *     resetConfig(); // Clear any stale config
 *     const cfg = getConfig();
 *     // read cfg.toggles, cfg.landmass, etc.
 *   }
 */

import type { MapConfig } from "./types.js";

// ============================================================================
// Internal State
// ============================================================================

const GLOBAL_KEY = "__EPIC_MAP_CONFIG__";
const EMPTY_FROZEN_OBJECT: Readonly<MapConfig> = Object.freeze({});

/** Local fallback store in case globalThis access fails */
let _localStore: Readonly<MapConfig> = EMPTY_FROZEN_OBJECT;

// ============================================================================
// Helpers
// ============================================================================

function isObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object";
}

function shallowFreeze<T extends object>(obj: T): Readonly<T> {
  try {
    return Object.freeze(obj);
  } catch {
    return obj;
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Store the per-map configuration for this run.
 * Accepts any plain object. Non-objects are coerced to an empty object.
 * The stored object is shallow-frozen to prevent accidental mutation.
 */
export function setConfig(config: Partial<MapConfig>): void {
  const obj = isObject(config) ? config : {};
  const frozen = shallowFreeze(obj) as Readonly<MapConfig>;

  try {
    // Use a single well-known global key so all modules can access the same config
    (globalThis as Record<string, unknown>)[GLOBAL_KEY] = frozen;
  } catch {
    // In restricted environments, fall back to local static
    _localStore = frozen;
  }
}

/**
 * Retrieve the current per-map configuration.
 * Returns an empty frozen object if none was set.
 */
export function getConfig(): Readonly<MapConfig> {
  try {
    const v = (globalThis as Record<string, unknown>)[GLOBAL_KEY];
    return isObject(v) ? (v as Readonly<MapConfig>) : EMPTY_FROZEN_OBJECT;
  } catch {
    return isObject(_localStore) ? _localStore : EMPTY_FROZEN_OBJECT;
  }
}

/**
 * Reset the runtime config to empty state.
 * Call this at the start of each generateMap() or in test beforeEach().
 */
export function resetConfig(): void {
  try {
    (globalThis as Record<string, unknown>)[GLOBAL_KEY] = EMPTY_FROZEN_OBJECT;
  } catch {
    // Ignore
  }
  _localStore = EMPTY_FROZEN_OBJECT;
}

export default { setConfig, getConfig, resetConfig };
