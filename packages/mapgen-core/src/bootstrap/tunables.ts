/**
 * Unified Tunables — Lazy loading with memoized provider pattern
 *
 * Intent:
 * - Provide a single import surface for all generator tunables
 * - Use lazy loading to avoid crashes when globals unavailable
 * - Provide reset functions for test isolation
 *
 * Usage:
 *   import { getTunables, resetTunables, rebind } from "./tunables.js";
 *
 *   // In tests
 *   beforeEach(() => {
 *     resetTunables();
 *   });
 *
 *   // In generator
 *   function generateMap() {
 *     rebind(); // Refresh config from game state
 *     const tunables = getTunables();
 *     // use tunables.LANDMASS_CFG, etc.
 *   }
 */

import type {
  MapConfig,
  Toggles,
  LandmassConfig,
  FoundationConfig,
  FoundationPlatesConfig,
  FoundationDynamicsConfig,
  FoundationDirectionalityConfig,
  ClimateConfig,
  StageManifest,
  StageDescriptor,
  TunablesSnapshot,
} from "./types.js";
import type { MapGenConfig } from "../config/index.js";

// ============================================================================
// Internal State (memoized cache)
// ============================================================================

let _cache: TunablesSnapshot | null = null;
let _boundConfig: MapGenConfig | null = null;

// ============================================================================
// Default Values
// ============================================================================

const EMPTY_OBJECT = Object.freeze({}) as Readonly<Record<string, unknown>>;

const EMPTY_STAGE_MANIFEST: Readonly<StageManifest> = Object.freeze({
  order: [] as string[],
  stages: {} as Record<string, StageDescriptor>,
});

const DEFAULT_TOGGLES: Readonly<Toggles> = Object.freeze({
  STORY_ENABLE_HOTSPOTS: true,
  STORY_ENABLE_RIFTS: true,
  STORY_ENABLE_OROGENY: true,
  STORY_ENABLE_SWATCHES: true,
  STORY_ENABLE_PALEO: true,
  STORY_ENABLE_CORRIDORS: true,
});

const DEFAULT_LANDMASS: Readonly<LandmassConfig> = Object.freeze({
  baseWaterPercent: 60,
});

const DEFAULT_FOUNDATION: Readonly<FoundationConfig> = Object.freeze({});

const DEFAULT_PLATES: Readonly<FoundationPlatesConfig> = Object.freeze({
  count: 8,
  relaxationSteps: 5,
  convergenceMix: 0.5,
  plateRotationMultiple: 1.0,
  seedMode: "engine",
});

const DEFAULT_DYNAMICS: Readonly<FoundationDynamicsConfig> = Object.freeze({
  mantle: Object.freeze({ bumps: 4, amplitude: 0.6, scale: 0.4 }),
  wind: Object.freeze({ jetStreaks: 3, jetStrength: 1.0, variance: 0.6 }),
});

const DEFAULT_DIRECTIONALITY: Readonly<FoundationDirectionalityConfig> = Object.freeze({
  cohesion: 0,
});

const DEFAULT_CLIMATE: Readonly<ClimateConfig> = Object.freeze({});

// ============================================================================
// Helpers
// ============================================================================

function safeFreeze<T extends object>(obj: T | null | undefined): Readonly<T> {
  if (!obj || typeof obj !== "object") {
    return EMPTY_OBJECT as Readonly<T>;
  }
  if (Object.isFrozen(obj)) {
    return obj as Readonly<T>;
  }
  return Object.freeze({ ...obj }) as Readonly<T>;
}

function deepMerge<T extends object>(base: T, override: Partial<T> | undefined): Readonly<T> {
  if (!override || typeof override !== "object") {
    return safeFreeze(base);
  }

  const result = { ...base } as Record<string, unknown>;

  for (const key of Object.keys(override)) {
    const baseVal = (base as Record<string, unknown>)[key];
    const overrideVal = (override as Record<string, unknown>)[key];

    if (
      baseVal &&
      typeof baseVal === "object" &&
      !Array.isArray(baseVal) &&
      overrideVal &&
      typeof overrideVal === "object" &&
      !Array.isArray(overrideVal)
    ) {
      result[key] = deepMerge(baseVal as object, overrideVal as object);
    } else if (overrideVal !== undefined) {
      result[key] = overrideVal;
    }
  }

  return Object.freeze(result) as Readonly<T>;
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Build the tunables snapshot from a validated config.
 * This is the primary interface for constructing tunables from config.
 *
 * @param config - Validated MapGenConfig instance
 * @returns Frozen TunablesSnapshot for use by legacy layers
 */
export function buildTunablesFromConfig(config: MapGenConfig): TunablesSnapshot {

  // Resolve toggles
  const togglesConfig = config.toggles || {};
  const toggleValue = (key: keyof Toggles, fallback: boolean): boolean => {
    const val = togglesConfig[key];
    return typeof val === "boolean" ? val : fallback;
  };

  // Resolve foundation config
  // Start with foundation config from config.foundation
  const rawFoundation = (config.foundation || {}) as FoundationConfig;
  const foundationConfig: FoundationConfig = { ...rawFoundation };

  // Merge top-level layer configs into foundation (mod overrides pattern)
  // This allows mods to specify e.g. { mountains: {...} } at top level instead of
  // nested inside { foundation: { mountains: {...} } }
  const mergeTopLevelLayer = <K extends keyof FoundationConfig>(key: K): void => {
    const topLevel = config[key as string];
    if (topLevel && typeof topLevel === "object") {
      foundationConfig[key] = deepMerge(
        (foundationConfig[key] as object) || {},
        topLevel as object
      ) as FoundationConfig[K];
    }
  };

  // Merge supported top-level layer configs
  mergeTopLevelLayer("mountains");
  mergeTopLevelLayer("volcanoes");
  mergeTopLevelLayer("coastlines");
  mergeTopLevelLayer("islands");
  mergeTopLevelLayer("biomes");
  mergeTopLevelLayer("featuresDensity");
  mergeTopLevelLayer("story");
  mergeTopLevelLayer("corridors");
  mergeTopLevelLayer("oceanSeparation");

  const platesConfig = deepMerge(DEFAULT_PLATES, foundationConfig.plates);
  const dynamicsConfig = deepMerge(DEFAULT_DYNAMICS, foundationConfig.dynamics);
  const directionalityConfig = deepMerge(
    DEFAULT_DIRECTIONALITY,
    dynamicsConfig.directionality || foundationConfig.dynamics?.directionality
  );

  // Resolve stage manifest
  const manifestConfig = (config.stageManifest || {}) as Partial<StageManifest>;
  const stageManifest: Readonly<StageManifest> = Object.freeze({
    order: (manifestConfig.order ?? []) as string[],
    stages: (manifestConfig.stages ?? {}) as Record<string, StageDescriptor>,
  });

  return {
    STAGE_MANIFEST: stageManifest,
    STORY_ENABLE_HOTSPOTS: toggleValue("STORY_ENABLE_HOTSPOTS", true),
    STORY_ENABLE_RIFTS: toggleValue("STORY_ENABLE_RIFTS", true),
    STORY_ENABLE_OROGENY: toggleValue("STORY_ENABLE_OROGENY", true),
    STORY_ENABLE_SWATCHES: toggleValue("STORY_ENABLE_SWATCHES", true),
    STORY_ENABLE_PALEO: toggleValue("STORY_ENABLE_PALEO", true),
    STORY_ENABLE_CORRIDORS: toggleValue("STORY_ENABLE_CORRIDORS", true),
    LANDMASS_CFG: deepMerge(DEFAULT_LANDMASS, config.landmass as LandmassConfig | undefined),
    FOUNDATION_CFG: safeFreeze(foundationConfig),
    FOUNDATION_PLATES: platesConfig,
    FOUNDATION_DYNAMICS: dynamicsConfig,
    FOUNDATION_DIRECTIONALITY: directionalityConfig,
    CLIMATE_CFG: deepMerge(DEFAULT_CLIMATE, config.climate as ClimateConfig | undefined),
  };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Bind tunables to a validated config.
 * Call this from bootstrap() after config validation.
 * Invalidates the cache so next getTunables() rebuilds from new config.
 *
 * @param config - Validated MapGenConfig instance
 */
export function bindTunables(config: MapGenConfig): void {
  _boundConfig = config;
  _cache = null; // Invalidate cache so next access rebuilds
}

/**
 * Get the current tunables snapshot.
 * Returns cached value if available, otherwise builds from bound config.
 *
 * Fail-fast behavior: throws if no config has been bound via bindTunables() or bootstrap().
 * This ensures the config→tunables flow is explicit and prevents silent fallback to
 * uninitialized or stale module-scoped state.
 *
 * @throws Error if called before bindTunables(config) or bootstrap()
 */
export function getTunables(): Readonly<TunablesSnapshot> {
  if (_cache) return _cache;
  if (!_boundConfig) {
    throw new Error(
      "Tunables not initialized. Call bootstrap() or bindTunables(config) before accessing tunables."
    );
  }
  _cache = buildTunablesFromConfig(_boundConfig);
  return _cache;
}

/**
 * Reset the tunables cache (forces rebuild on next getTunables() call).
 * The bound config is preserved - only the cached snapshot is cleared.
 * Call this at the start of each generateMap() to pick up any config changes.
 *
 * For test isolation, use resetTunablesForTest() which also clears the binding.
 */
export function resetTunables(): void {
  _cache = null;
}

/**
 * Fully reset tunables state including the bound config.
 * Use this in test beforeEach() for complete isolation between tests.
 */
export function resetTunablesForTest(): void {
  _cache = null;
  _boundConfig = null;
}

/**
 * Refresh the tunables from current bound config.
 * Invalidates cache so next getTunables() rebuilds.
 * For backwards compatibility - prefer bindTunables() for explicit binding.
 */
export function rebind(): void {
  _cache = null; // Just invalidate; next getTunables() rebuilds from _boundConfig
}

/**
 * Check whether a manifest stage is enabled.
 */
export function stageEnabled(stage: string): boolean {
  const tunables = getTunables();
  const stages = tunables.STAGE_MANIFEST.stages || {};
  const entry = stages[stage];
  return !!(entry && entry.enabled !== false);
}

// ============================================================================
// Convenience Exports (for backwards compatibility)
// ============================================================================

// These are getters that return the current cached value
// They're defined as functions to maintain live binding semantics

export const TUNABLES = {
  get STAGE_MANIFEST() {
    return getTunables().STAGE_MANIFEST;
  },
  get STORY_ENABLE_HOTSPOTS() {
    return getTunables().STORY_ENABLE_HOTSPOTS;
  },
  get STORY_ENABLE_RIFTS() {
    return getTunables().STORY_ENABLE_RIFTS;
  },
  get STORY_ENABLE_OROGENY() {
    return getTunables().STORY_ENABLE_OROGENY;
  },
  get STORY_ENABLE_SWATCHES() {
    return getTunables().STORY_ENABLE_SWATCHES;
  },
  get STORY_ENABLE_PALEO() {
    return getTunables().STORY_ENABLE_PALEO;
  },
  get STORY_ENABLE_CORRIDORS() {
    return getTunables().STORY_ENABLE_CORRIDORS;
  },
  get LANDMASS_CFG() {
    return getTunables().LANDMASS_CFG;
  },
  get FOUNDATION_CFG() {
    return getTunables().FOUNDATION_CFG;
  },
  get FOUNDATION_PLATES() {
    return getTunables().FOUNDATION_PLATES;
  },
  get FOUNDATION_DYNAMICS() {
    return getTunables().FOUNDATION_DYNAMICS;
  },
  get FOUNDATION_DIRECTIONALITY() {
    return getTunables().FOUNDATION_DIRECTIONALITY;
  },
  get CLIMATE_CFG() {
    return getTunables().CLIMATE_CFG;
  },
};

export default {
  bindTunables,
  buildTunablesFromConfig,
  getTunables,
  resetTunables,
  resetTunablesForTest,
  rebind,
  stageEnabled,
  TUNABLES,
};
