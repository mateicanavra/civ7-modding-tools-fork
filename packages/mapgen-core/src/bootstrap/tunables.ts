/**
 * Unified Tunables — Lazy loading with memoized provider pattern
 *
 * Intent:
 * - Provide a single import surface for all generator tunables
 * - Use lazy loading to avoid crashes when globals unavailable
 * - Provide reset functions for test isolation
 *
 * Usage:
 *   import { getTunables, resetTunables, bindTunables } from "./tunables.js";
 *
 *   // In tests
 *   beforeEach(() => {
 *     resetTunablesForTest();
 *   });
 *
 *   // In generator (via bootstrap)
 *   const config = bootstrap(options);
 *   // bootstrap() calls bindTunables(config) internally
 *   const tunables = getTunables();
 *   // use tunables.LANDMASS_CFG, etc.
 */

import type {
  FoundationConfig,
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
// Structural Constants (not defaults - these are fallbacks for missing nested objects)
// ============================================================================

const EMPTY_OBJECT = Object.freeze({}) as Readonly<Record<string, unknown>>;

// NOTE: All value defaults (e.g., count: 8, baseWaterPercent: 60) are now in
// the schema (src/config/schema.ts). parseConfig applies them automatically.
// The tunables layer should NOT re-default values; it just reshapes the config.

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
 * IMPORTANT: This function assumes config has already been validated via parseConfig(),
 * which applies all schema defaults. The tunables layer does NOT apply its own defaults;
 * it only reshapes the validated config into the TunablesSnapshot structure.
 *
 * @param config - Validated MapGenConfig instance (with defaults already applied by parseConfig)
 * @returns Frozen TunablesSnapshot for use by legacy layers
 */
export function buildTunablesFromConfig(config: MapGenConfig): TunablesSnapshot {
  // Config should be validated with defaults applied by parseConfig.
  // We read directly from config without applying fallbacks.

  // Resolve toggles - read directly from validated config
  const togglesConfig = config.toggles ?? {};

  // Resolve foundation config
  // Start with foundation config from config.foundation
  const rawFoundation = (config.foundation ?? {}) as FoundationConfig;
  const foundationConfig: FoundationConfig = { ...rawFoundation };

  // Merge top-level layer configs into foundation (mod overrides pattern)
  // This allows mods to specify e.g. { mountains: {...} } at top level instead of
  // nested inside { foundation: { mountains: {...} } }
  const mergeTopLevelLayer = <K extends keyof FoundationConfig>(key: K): void => {
    const topLevel = config[key as string];
    if (topLevel && typeof topLevel === "object") {
      foundationConfig[key] = deepMerge(
        (foundationConfig[key] as object) ?? {},
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

  // Read plates/dynamics/directionality from validated config
  // Defaults are applied by schema, so we just reshape here
  const platesConfig = safeFreeze(foundationConfig.plates ?? {});
  const dynamicsConfig = safeFreeze(foundationConfig.dynamics ?? {});
  const directionalityConfig = safeFreeze(
    dynamicsConfig.directionality ?? foundationConfig.dynamics?.directionality ?? {}
  );

  // Resolve stage manifest
  const manifestConfig = (config.stageManifest ?? {}) as Partial<StageManifest>;
  const stageManifest: Readonly<StageManifest> = Object.freeze({
    order: (manifestConfig.order ?? []) as string[],
    stages: (manifestConfig.stages ?? {}) as Record<string, StageDescriptor>,
  });

  return {
    STAGE_MANIFEST: stageManifest,
    // Toggles: read directly; defaults are in schema (all true)
    STORY_ENABLE_HOTSPOTS: togglesConfig.STORY_ENABLE_HOTSPOTS ?? true,
    STORY_ENABLE_RIFTS: togglesConfig.STORY_ENABLE_RIFTS ?? true,
    STORY_ENABLE_OROGENY: togglesConfig.STORY_ENABLE_OROGENY ?? true,
    STORY_ENABLE_SWATCHES: togglesConfig.STORY_ENABLE_SWATCHES ?? true,
    STORY_ENABLE_PALEO: togglesConfig.STORY_ENABLE_PALEO ?? true,
    STORY_ENABLE_CORRIDORS: togglesConfig.STORY_ENABLE_CORRIDORS ?? true,
    // Layer configs: read directly; defaults are in schema
    LANDMASS_CFG: safeFreeze(config.landmass ?? {}),
    FOUNDATION_CFG: safeFreeze(foundationConfig),
    FOUNDATION_PLATES: platesConfig,
    FOUNDATION_DYNAMICS: dynamicsConfig,
    FOUNDATION_DIRECTIONALITY: directionalityConfig,
    CLIMATE_CFG: safeFreeze(config.climate ?? {}),
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
  stageEnabled,
  TUNABLES,
};
