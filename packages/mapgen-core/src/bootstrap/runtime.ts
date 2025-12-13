/**
 * Runtime Config Store
 *
 * Module-scoped config store for per-map configuration.
 * Stores validated MapGenConfig after bootstrap.
 *
 * Design notes:
 * - Config is stored module-scoped (not globalThis) for deterministic behavior
 * - getValidatedConfig() throws if called before bootstrap() to catch init bugs
 * - Config is frozen to prevent accidental mutation
 *
 * Usage (in the orchestrator/generator):
 *   import { getValidatedConfig, resetConfig } from "./runtime.js";
 *   function generateMap() {
 *     const cfg = getValidatedConfig();
 *     // read cfg.toggles, cfg.landmass, etc.
 *   }
 */

import type { MapGenConfig } from "../config/index.js";

// Re-export MapConfig as alias for backwards compatibility
export type { MapGenConfig as MapConfig } from "../config/index.js";

// ============================================================================
// Internal State (module-scoped, not globalThis)
// ============================================================================

/** Module-scoped config store. Null until bootstrap() is called. */
let _validatedConfig: Readonly<MapGenConfig> | null = null;

// ============================================================================
// Helpers
// ============================================================================

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
 * Store the validated per-map configuration.
 * Called by bootstrap() after validation via parseConfig().
 * The stored object is shallow-frozen to prevent accidental mutation.
 *
 * @internal This should only be called by bootstrap(). Prefer using bootstrap() directly.
 */
export function setValidatedConfig(config: MapGenConfig): void {
  _validatedConfig = shallowFreeze(config);
}

/**
 * Retrieve the current validated config.
 * Throws if config has not been initialized via bootstrap().
 *
 * @throws Error if called before bootstrap()
 */
export function getValidatedConfig(): Readonly<MapGenConfig> {
  if (_validatedConfig === null) {
    throw new Error(
      "Config not initialized. Call bootstrap() before accessing config."
    );
  }
  return _validatedConfig;
}

/**
 * Check if config has been initialized.
 * Useful for conditional logic without throwing.
 */
export function hasConfig(): boolean {
  return _validatedConfig !== null;
}

/**
 * Reset the runtime config to uninitialized state.
 * Call this at the start of each generateMap() or in test beforeEach().
 */
export function resetConfig(): void {
  _validatedConfig = null;
}

// ============================================================================
// Backwards Compatibility (deprecated)
// ============================================================================

/**
 * @deprecated Use setValidatedConfig() instead.
 * Provided for backwards compatibility during migration.
 */
export function setConfig(config: Partial<MapGenConfig>): void {
  // In the old API, partial configs were accepted.
  // For backwards compat, we store as-is but warn in dev.
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "setConfig() is deprecated. Use bootstrap() which calls parseConfig() for validation."
    );
  }
  _validatedConfig = shallowFreeze(config as MapGenConfig);
}

/**
 * @deprecated Use getValidatedConfig() instead.
 * Provided for backwards compatibility during migration.
 * Unlike getValidatedConfig(), this returns empty object if not initialized.
 */
export function getConfig(): Readonly<MapGenConfig> {
  return _validatedConfig ?? ({} as MapGenConfig);
}

export default {
  setValidatedConfig,
  getValidatedConfig,
  hasConfig,
  resetConfig,
  // Deprecated aliases
  setConfig,
  getConfig,
};
