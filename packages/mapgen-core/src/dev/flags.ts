/**
 * Developer logging flags & configuration.
 *
 * All flags are disabled by default. Enable selectively during development
 * or via config entries. When DEV.ENABLED is false, all dev logging is no-op.
 *
 * @module dev/flags
 */

/**
 * DEV flag keys for type-safe access.
 */
export type DevFlagKey =
  | "ENABLED"
  | "LOG_TIMING"
  | "LOG_FOUNDATION_SEED"
  | "LOG_FOUNDATION_PLATES"
  | "LOG_FOUNDATION_DYNAMICS"
  | "LOG_FOUNDATION_SURFACE"
  | "LOG_FOUNDATION_SUMMARY"
  | "LOG_FOUNDATION_ASCII"
  | "LOG_LANDMASS_ASCII"
  | "LOG_LANDMASS_WINDOWS"
  | "LOG_RELIEF_ASCII"
  | "LOG_RAINFALL_ASCII"
  | "LOG_RAINFALL_SUMMARY"
  | "LOG_BIOME_ASCII"
  | "LOG_BIOME_SUMMARY"
  | "LOG_STORY_TAGS"
  | "LOG_CORRIDOR_ASCII"
  | "LOG_BOUNDARY_METRICS"
  | "LOG_MOUNTAINS"
  | "LOG_VOLCANOES"
  | "FOUNDATION_HISTOGRAMS"
  | "LAYER_COUNTS";

/**
 * DEV flags interface for type safety.
 */
export interface DevFlags extends Record<DevFlagKey, boolean> {
  /** Master switch - must be true for any dev logging */
  ENABLED: boolean;
  /** Log per-section timings */
  LOG_TIMING: boolean;
  /** Log foundation seed configuration */
  LOG_FOUNDATION_SEED: boolean;
  /** Log foundation plates configuration */
  LOG_FOUNDATION_PLATES: boolean;
  /** Log foundation dynamics configuration */
  LOG_FOUNDATION_DYNAMICS: boolean;
  /** Log foundation surface configuration */
  LOG_FOUNDATION_SURFACE: boolean;
  /** Print compact foundation summary */
  LOG_FOUNDATION_SUMMARY: boolean;
  /** ASCII visualization of plate boundaries */
  LOG_FOUNDATION_ASCII: boolean;
  /** ASCII snapshot of land vs. ocean */
  LOG_LANDMASS_ASCII: boolean;
  /** Log landmass window bounding boxes */
  LOG_LANDMASS_WINDOWS: boolean;
  /** ASCII visualization of terrain relief */
  LOG_RELIEF_ASCII: boolean;
  /** ASCII heatmap for rainfall */
  LOG_RAINFALL_ASCII: boolean;
  /** Log rainfall min/max/avg statistics */
  LOG_RAINFALL_SUMMARY: boolean;
  /** ASCII biome classification overlay */
  LOG_BIOME_ASCII: boolean;
  /** Log biome tile counts */
  LOG_BIOME_SUMMARY: boolean;
  /** Log StoryTags summary counts */
  LOG_STORY_TAGS: boolean;
  /** ASCII corridor overlay */
  LOG_CORRIDOR_ASCII: boolean;
  /** Quantitative boundary coverage metrics */
  LOG_BOUNDARY_METRICS: boolean;
  /** Detailed mountain placement summaries */
  LOG_MOUNTAINS: boolean;
  /** Detailed volcano placement summaries */
  LOG_VOLCANOES: boolean;
  /** Print histograms for uplift/rift */
  FOUNDATION_HISTOGRAMS: boolean;
  /** Layer-specific counters */
  LAYER_COUNTS: boolean;
}

/**
 * Master DEV flags object. All flags disabled by default.
 */
export const DEV: DevFlags = {
  ENABLED: false,
  LOG_TIMING: false,
  LOG_FOUNDATION_SEED: false,
  LOG_FOUNDATION_PLATES: false,
  LOG_FOUNDATION_DYNAMICS: false,
  LOG_FOUNDATION_SURFACE: false,
  LOG_FOUNDATION_SUMMARY: false,
  LOG_FOUNDATION_ASCII: false,
  LOG_LANDMASS_ASCII: false,
  LOG_LANDMASS_WINDOWS: false,
  LOG_RELIEF_ASCII: false,
  LOG_RAINFALL_ASCII: false,
  LOG_RAINFALL_SUMMARY: false,
  LOG_BIOME_ASCII: false,
  LOG_BIOME_SUMMARY: false,
  LOG_STORY_TAGS: false,
  LOG_CORRIDOR_ASCII: false,
  LOG_BOUNDARY_METRICS: false,
  LOG_MOUNTAINS: false,
  LOG_VOLCANOES: false,
  FOUNDATION_HISTOGRAMS: false,
  LAYER_COUNTS: false,
};

/**
 * Configuration object for initializing DEV flags from config.
 */
export interface DevLogConfig {
  enabled?: boolean;
  logTiming?: boolean;
  logFoundationSeed?: boolean;
  logFoundationPlates?: boolean;
  logFoundationDynamics?: boolean;
  logFoundationSurface?: boolean;
  logFoundationSummary?: boolean;
  logFoundationAscii?: boolean;
  logLandmassAscii?: boolean;
  logLandmassWindows?: boolean;
  logReliefAscii?: boolean;
  logRainfallAscii?: boolean;
  logRainfallSummary?: boolean;
  logBiomeAscii?: boolean;
  logBiomeSummary?: boolean;
  logStoryTags?: boolean;
  logCorridorAscii?: boolean;
  logBoundaryMetrics?: boolean;
  logMountains?: boolean;
  logVolcanoes?: boolean;
  foundationHistograms?: boolean;
  layerCounts?: boolean;
}

/**
 * Initialize DEV flags from a config object.
 * Maps camelCase config keys to UPPER_SNAKE_CASE flag keys.
 */
export function initDevFlags(config?: DevLogConfig | null): void {
  if (!config || typeof config !== "object") return;

  const mapping: Record<keyof DevLogConfig, DevFlagKey> = {
    enabled: "ENABLED",
    logTiming: "LOG_TIMING",
    logFoundationSeed: "LOG_FOUNDATION_SEED",
    logFoundationPlates: "LOG_FOUNDATION_PLATES",
    logFoundationDynamics: "LOG_FOUNDATION_DYNAMICS",
    logFoundationSurface: "LOG_FOUNDATION_SURFACE",
    logFoundationSummary: "LOG_FOUNDATION_SUMMARY",
    logFoundationAscii: "LOG_FOUNDATION_ASCII",
    logLandmassAscii: "LOG_LANDMASS_ASCII",
    logLandmassWindows: "LOG_LANDMASS_WINDOWS",
    logReliefAscii: "LOG_RELIEF_ASCII",
    logRainfallAscii: "LOG_RAINFALL_ASCII",
    logRainfallSummary: "LOG_RAINFALL_SUMMARY",
    logBiomeAscii: "LOG_BIOME_ASCII",
    logBiomeSummary: "LOG_BIOME_SUMMARY",
    logStoryTags: "LOG_STORY_TAGS",
    logCorridorAscii: "LOG_CORRIDOR_ASCII",
    logBoundaryMetrics: "LOG_BOUNDARY_METRICS",
    logMountains: "LOG_MOUNTAINS",
    logVolcanoes: "LOG_VOLCANOES",
    foundationHistograms: "FOUNDATION_HISTOGRAMS",
    layerCounts: "LAYER_COUNTS",
  };

  for (const [configKey, flagKey] of Object.entries(mapping)) {
    const value = config[configKey as keyof DevLogConfig];
    if (value !== undefined) {
      DEV[flagKey] = !!value;
    }
  }
}

/**
 * Reset all DEV flags to defaults (disabled).
 * Useful for test isolation.
 */
export function resetDevFlags(): void {
  for (const key of Object.keys(DEV) as DevFlagKey[]) {
    DEV[key] = false;
  }
}

/**
 * Check if a specific flag is enabled (and master switch is on).
 */
export function isDevEnabled(flag: DevFlagKey): boolean {
  return !!(DEV.ENABLED && DEV[flag]);
}
