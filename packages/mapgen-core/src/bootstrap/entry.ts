/**
 * Bootstrap Entry Point
 *
 * Provides the main `bootstrap()` function that initializes map generation.
 * Uses lazy loading to avoid crashes when globals are unavailable.
 *
 * Usage (in a map entry file):
 *   import { bootstrap } from "@swooper/mapgen-core/bootstrap";
 *   bootstrap({
 *     presets: ["classic", "temperate"],
 *     overrides: {
 *       foundation: { plates: { count: 12 } },
 *     },
 *   });
 */

/// <reference types="@civ7/types" />

import type { MapConfig } from "./types.js";
import { setConfig, resetConfig } from "./runtime.js";
import { resetTunables, rebind as rebindTunables } from "./tunables.js";

// ============================================================================
// Types
// ============================================================================

export interface BootstrapOptions {
  /** Ordered list of preset names (applied by resolved.js) */
  presets?: string[];
  /** Inline overrides applied last (highest precedence) */
  overrides?: Partial<MapConfig>;
  /** Stage metadata indicating which stages provide config overrides */
  stageConfig?: Record<string, boolean>;
}

export interface BootstrapConfig extends BootstrapOptions {
  /** Enable specific generation stages (legacy interface) */
  stages?: {
    foundation?: boolean;
    mountains?: boolean;
    climate?: boolean;
    biomes?: boolean;
    features?: boolean;
    resources?: boolean;
  };
}

// ============================================================================
// Helpers
// ============================================================================

function isObject(v: unknown): v is Record<string, unknown> {
  return (
    v != null &&
    typeof v === "object" &&
    (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null)
  );
}

function clone<T>(v: T): T {
  if (Array.isArray(v)) return v.slice() as unknown as T;
  if (isObject(v)) {
    const o: Record<string, unknown> = {};
    for (const k of Object.keys(v)) o[k] = v[k];
    return o as T;
  }
  return v;
}

function deepMerge<T extends object>(base: T, src: Partial<T> | undefined): T {
  if (!src || !isObject(src)) return clone(base);
  if (!isObject(base)) return clone(src) as T;

  const out: Record<string, unknown> = {};
  for (const k of Object.keys(base)) out[k] = clone((base as Record<string, unknown>)[k]);
  for (const k of Object.keys(src)) {
    const b = out[k];
    const s = (src as Record<string, unknown>)[k];
    if (isObject(b) && isObject(s)) {
      out[k] = deepMerge(b as object, s as object);
    } else {
      out[k] = clone(s);
    }
  }
  return out as T;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Bootstrap the map generation system.
 *
 * Composes configuration from presets and overrides, then sets the active
 * runtime config. This is called from mod entry points.
 */
export function bootstrap(options: BootstrapConfig = {}): void {
  // Extract presets
  const presets =
    Array.isArray(options.presets) && options.presets.length > 0
      ? options.presets.filter((n): n is string => typeof n === "string")
      : undefined;

  // Extract overrides
  const overrides =
    options && typeof options === "object" && options.overrides ? clone(options.overrides) : undefined;

  // Extract stage config
  const stageConfig =
    options && typeof options === "object" && options.stageConfig
      ? clone(options.stageConfig)
      : undefined;

  // Build config object
  const cfg: MapConfig = {};
  if (presets) cfg.presets = presets;
  if (stageConfig) cfg.stageConfig = stageConfig;

  // Merge overrides (highest precedence)
  if (overrides) {
    Object.assign(cfg, deepMerge(cfg, overrides as Partial<MapConfig>));
  }

  // Store runtime config
  setConfig(cfg);

  // Rebind tunables to pick up new config
  rebindTunables();
}

/**
 * Reset all bootstrap state.
 * Call this at the start of each generateMap() or in test beforeEach().
 */
export function resetBootstrap(): void {
  resetConfig();
  resetTunables();
}

/**
 * Rebind all tunables from current config.
 * Call this at the start of each generateMap() entry.
 */
export function rebind(): void {
  rebindTunables();
}

// Re-export types and functions for convenience
export type { MapConfig } from "./types.js";
export { setConfig, getConfig, resetConfig } from "./runtime.js";
export { getTunables, resetTunables, stageEnabled, TUNABLES } from "./tunables.js";

export default { bootstrap, resetBootstrap, rebind };
