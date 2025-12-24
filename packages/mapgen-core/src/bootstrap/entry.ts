/**
 * Bootstrap Entry Point
 *
 * Provides the main `bootstrap()` function that initializes map generation.
 * Config is validated via parseConfig() using explicit overrides only.
 *
 * Config Flow:
 *   bootstrap(options) → parseConfig(overrides) → MapGenConfig
 *
 * Usage (in a map entry file):
 *   import { bootstrap } from "@swooper/mapgen-core/bootstrap";
 *   const config = bootstrap({
 *     overrides: {
 *       foundation: { plates: { count: 12 } },
 *     },
 *   });
 */

/// <reference types="@civ7/types" />

import type { MapGenConfig } from "@mapgen/config/index.js";
import { parseConfig } from "@mapgen/config/index.js";

// ============================================================================
// Types
// ============================================================================

export interface BootstrapOptions {
  /** Inline overrides applied last (highest precedence) */
  overrides?: Partial<MapGenConfig>;
}

export interface BootstrapConfig extends BootstrapOptions {
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

const BOOTSTRAP_ALLOWED_KEYS = new Set(["overrides"]);

// ============================================================================
// Public API
// ============================================================================

/**
 * Bootstrap the map generation system.
 *
 * Validates explicit overrides via parseConfig() and returns the validated MapGenConfig.
 *
 * @param options - Bootstrap options including overrides
 * @returns Validated MapGenConfig with defaults applied
 * @throws Error if config validation fails
 */
export function bootstrap(options: BootstrapConfig = {}): MapGenConfig {
  if (!isPlainObject(options)) {
    throw new Error("Invalid bootstrap options: expected an object.");
  }

  const unknownKeys = Object.keys(options).filter((key) => !BOOTSTRAP_ALLOWED_KEYS.has(key));
  if (unknownKeys.length > 0) {
    throw new Error(
      `Invalid bootstrap options: unknown keys ${unknownKeys.map((key) => `"${key}"`).join(", ")}.`
    );
  }

  return parseConfig(options.overrides ?? {});
}

/**
 * Reset any bootstrap-local state.
 *
 * Bootstrap is intended to be pure; this exists for backwards compatibility and tests.
 */
export function resetBootstrap(): void {
  // no-op
}


// Re-export types and functions for convenience
export type { MapConfig } from "@mapgen/bootstrap/runtime.js";
export type { MapGenConfig } from "@mapgen/config/index.js";

export default { bootstrap, resetBootstrap };
