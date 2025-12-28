import type { EngineAdapter, MapInfo, MapSizeId } from "@civ7/adapter";
import type { RecipeV1 } from "@mapgen/engine/execution-plan.js";

/**
 * Map size defaults for testing (bypasses game settings).
 *
 * When provided via OrchestratorConfig.mapSizeDefaults, these values
 * bypass adapter map-size lookups, allowing tests to control map dimensions
 * without relying on engine globals.
 */
export interface MapSizeDefaults {
  /**
   * Map size selection key as returned by adapter.getMapSizeId().
   * Used for logging only; the actual dimensions come from mapInfo.
   */
  mapSizeId?: MapSizeId;
  /**
   * Map info to use for dimension/latitude lookups.
   *
   * Required: test harnesses must provide concrete dimensions/latitudes rather
   * than relying on in-engine defaults.
   */
  mapInfo: MapInfo;
}

/** Orchestrator configuration */
export interface OrchestratorConfig {
  /**
   * Pre-built adapter instance (takes precedence over createAdapter).
   * Use this when you have an adapter ready to use.
   */
  adapter?: EngineAdapter;
  /**
   * Custom adapter factory (defaults to Civ7Adapter from @civ7/adapter).
   * Called with map dimensions when generateMap() runs.
   */
  createAdapter?: (width: number, height: number) => EngineAdapter;
  /** Log prefix for console output */
  logPrefix?: string;
  /**
   * Override map size defaults for testing.
   * When set, bypasses adapter map-size lookups.
   * Test harnesses must provide concrete dimensions/latitudes via `mapInfo`.
   */
  mapSizeDefaults?: MapSizeDefaults;
  /**
   * Override the default recipe used for execution.
   * Useful for tests or custom runs that need explicit enablement.
   */
  recipeOverride?: RecipeV1;
}

/** Stage execution result */
export interface StageResult {
  stage: string;
  success: boolean;
  durationMs?: number;
  error?: string;
}

/** Generation result */
export interface GenerationResult {
  success: boolean;
  stageResults: StageResult[];
  startPositions: number[];
}

export type { MapInfo, MapInitParams } from "@civ7/adapter";
