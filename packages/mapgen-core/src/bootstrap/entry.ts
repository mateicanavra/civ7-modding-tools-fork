/**
 * Bootstrap Entry Point
 *
 * Provides the main `bootstrap()` function that initializes map generation.
 * Config is validated via parseConfig() and stored module-scoped.
 *
 * Config Flow:
 *   bootstrap(options) → parseConfig(rawConfig) → setValidatedConfig() → MapGenConfig
 *
 * Usage (in a map entry file):
 *   import { bootstrap } from "@swooper/mapgen-core/bootstrap";
 *   const config = bootstrap({
 *     presets: ["classic", "temperate"],
 *     overrides: {
 *       foundation: { plates: { count: 12 } },
 *     },
 *   });
 */

/// <reference types="@civ7/types" />

import type { MapGenConfig } from "../config/index.js";
import { parseConfig } from "../config/index.js";
import {
  setValidatedConfig,
  resetConfig,
  // Deprecated exports for backwards compatibility
  setConfig,
  getConfig,
} from "./runtime.js";
import { bindTunables, resetTunables, rebind as rebindTunables } from "./tunables.js";
import { resolveStageManifest, validateOverrides } from "./resolved.js";

// ============================================================================
// Types
// ============================================================================

export interface BootstrapOptions {
  /** Ordered list of preset names (applied by resolved.js) */
  presets?: string[];
  /** Inline overrides applied last (highest precedence) */
  overrides?: Partial<MapGenConfig>;
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
 * Composes configuration from presets and overrides, validates via parseConfig(),
 * then stores the validated config. Returns the validated MapGenConfig.
 *
 * @param options - Bootstrap options including presets and overrides
 * @returns Validated MapGenConfig with defaults applied
 * @throws Error if config validation fails
 */
export function bootstrap(options: BootstrapConfig = {}): MapGenConfig {
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

  // Build raw config object (before validation)
  const rawConfig: Partial<MapGenConfig> = {};
  if (presets) rawConfig.presets = presets;
  if (stageConfig) rawConfig.stageConfig = stageConfig;

  // Resolve stageConfig → stageManifest (bridges the "Config Air Gap")
  // This ensures stageEnabled() returns the correct values
  const manifest = resolveStageManifest(stageConfig);
  rawConfig.stageManifest = manifest;

  // Validate overrides against manifest (warn about targeting disabled stages)
  if (overrides) {
    validateOverrides(overrides, manifest);
  }

  // Merge overrides (highest precedence)
  if (overrides) {
    Object.assign(rawConfig, deepMerge(rawConfig as object, overrides as object));
  }

  // Validate and apply defaults via parseConfig
  // This uses the TypeBox schema to ensure type correctness
  const validatedConfig = parseConfig(rawConfig);

  // Store validated config in module-scoped state
  setValidatedConfig(validatedConfig);

  // Bind tunables to validated config (CIV-31: tunables now receive config explicitly)
  bindTunables(validatedConfig);

  return validatedConfig;
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
export type { MapConfig } from "./runtime.js";
export type { MapGenConfig } from "../config/index.js";
export {
  setValidatedConfig,
  getValidatedConfig,
  hasConfig,
  resetConfig,
  // Deprecated exports
  setConfig,
  getConfig,
} from "./runtime.js";
export {
  bindTunables,
  buildTunablesFromConfig,
  getTunables,
  resetTunables,
  stageEnabled,
  TUNABLES,
} from "./tunables.js";
export {
  STAGE_ORDER,
  resolveStageManifest,
  validateOverrides,
  validateStageDrift,
  resetDriftCheck,
} from "./resolved.js";

export default { bootstrap, resetBootstrap, rebind };
