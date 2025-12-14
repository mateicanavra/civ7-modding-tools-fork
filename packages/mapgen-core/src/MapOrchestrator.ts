/**
 * MapOrchestrator — Central orchestration for map generation pipeline
 *
 * @packageDocumentation
 */

/// <reference types="@civ7/types" />

/**
 * Purpose:
 * - Coordinate all map generation stages in proper order
 * - Manage MapContext lifecycle and stage dependencies
 * - Provide typed interface for mod entry points
 *
 * Architecture:
 * - Uses lazy bootstrap system for configuration
 * - Creates ExtendedMapContext with EngineAdapter
 * - Executes stage manifest in order, respecting requires/provides
 * - Stages are enabled/disabled via configuration
 *
 * Usage (in mod entry point):
 *   import { bootstrap, MapOrchestrator } from '@swooper/mapgen-core';
 *
 *   engine.on('RequestMapInitData', () => {
 *     const config = bootstrap({});
 *     const orchestrator = new MapOrchestrator(config, { logPrefix: '[MOD]' });
 *     orchestrator.requestMapData();
 *   });
 *
 *   engine.on('GenerateMap', () => {
 *     const config = bootstrap({ overrides: { ... } });
 *     const orchestrator = new MapOrchestrator(config, { logPrefix: '[MOD]' });
 *     orchestrator.generateMap();
 *   });
 */

import type { EngineAdapter } from "@civ7/adapter";
import { Civ7Adapter, createCiv7Adapter } from "@civ7/adapter/civ7";
import type { MapGenConfig } from "./config/index.js";
import type {
  LandmassConfig,
  MountainsConfig,
  VolcanoesConfig,
  ContinentBounds,
} from "./bootstrap/types.js";
import type { ExtendedMapContext, FoundationContext } from "./core/types.js";
import type { WorldModelState } from "./world/types.js";

import {
  createExtendedMapContext,
  createFoundationContext,
  syncHeightfield,
  syncClimateField,
} from "./core/types.js";
import {
  addPlotTagsSimple,
  markLandmassRegionId,
  LANDMASS_REGION,
  type TerrainBuilderLike,
} from "./core/plot-tags.js";
import {
  MOUNTAIN_TERRAIN,
  HILL_TERRAIN,
  NAVIGABLE_RIVER_TERRAIN,
} from "./core/terrain-constants.js";
import {
  getTunables,
  resetTunables,
  stageEnabled,
} from "./bootstrap/tunables.js";
import { validateStageDrift } from "./bootstrap/resolved.js";
import { getStoryTags, resetStoryTags } from "./story/tags.js";
import { resetStoryOverlays } from "./story/overlays.js";
import {
  storyTagContinentalMargins,
  storyTagHotspotTrails,
  storyTagRiftValleys,
} from "./story/tagging.js";
import { WorldModel, setConfigProvider, type WorldModelConfig } from "./world/index.js";
import {
  PipelineExecutor,
  StepRegistry,
  M3_STANDARD_STAGE_PHASE,
} from "./pipeline/index.js";

// Layer imports
import { createPlateDrivenLandmasses } from "./layers/landmass-plate.js";
import {
  applyLandmassPostAdjustments,
  applyPlateAwareOceanSeparation,
  type LandmassWindow,
} from "./layers/landmass-utils.js";
import { addRuggedCoasts } from "./layers/coastlines.js";
import { addIslandChains } from "./layers/islands.js";
import { layerAddMountainsPhysics } from "./layers/mountains.js";
import { layerAddVolcanoesPlateAware } from "./layers/volcanoes.js";
import { applyClimateBaseline, refineClimateEarthlike } from "./layers/climate-engine.js";
import { designateEnhancedBiomes } from "./layers/biomes.js";
import { addDiverseFeatures } from "./layers/features.js";
import { runPlacement } from "./layers/placement.js";

// Dev diagnostics
import {
  DEV,
  initDevFlags,
  resetDevFlags,
  devLogIf,
  devWarn,
  logFoundationSummary,
  logFoundationAscii,
  logLandmassAscii,
  logReliefAscii,
  logRainfallStats,
  logBiomeSummary,
  logMountainSummary,
  logVolcanoSummary,
  logFoundationHistograms,
  logBoundaryMetrics,
  logEngineSurfaceApisOnce,
  type DevLogConfig,
  type FoundationPlates,
} from "./dev/index.js";

// ============================================================================
// Types
// ============================================================================

/** Map initialization parameters */
export interface MapInitParams {
  width: number;
  height: number;
  topLatitude?: number;
  bottomLatitude?: number;
  wrapX?: boolean;
  wrapY?: boolean;
}

/** Map info from GameInfo.Maps lookup */
export interface MapInfo {
  // === Map Size Dimensions ===
  GridWidth?: number;
  GridHeight?: number;
  MinLatitude?: number;
  MaxLatitude?: number;
  // === Game Setup Parameters ===
  NumNaturalWonders?: number;
  LakeGenerationFrequency?: number;
  PlayersLandmass1?: number;
  PlayersLandmass2?: number;
  StartSectorRows?: number;
  StartSectorCols?: number;
  [key: string]: unknown;
}

/**
 * Map size defaults for testing (bypasses game settings).
 *
 * When provided via OrchestratorConfig.mapSizeDefaults, these values
 * bypass GameplayMap.getMapSize() and GameInfo.Maps.lookup() calls,
 * allowing tests to control map dimensions without engine globals.
 */
export interface MapSizeDefaults {
  /**
   * Numeric map size ID as returned by GameplayMap.getMapSize().
   * Used for logging only; the actual dimensions come from mapInfo.
   * Example values: 0 (small), 1 (standard), 2 (large), etc.
   */
  mapSizeId?: number;
  /** Map info to use for dimension/latitude lookups */
  mapInfo?: MapInfo;
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
   * When set, bypasses GameplayMap.getMapSize() and GameInfo.Maps.lookup().
   */
  mapSizeDefaults?: MapSizeDefaults;
  /**
   * Use the M3 Task Graph execution path (PipelineExecutor + StepRegistry).
   * The legacy orchestrator path remains available for migration safety.
   */
  useTaskGraph?: boolean;
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

/**
 * Asserts that foundation context is available.
 * Throws an error if foundation is missing - this surfaces manifest/wiring issues
 * rather than silently degrading to fallback behavior.
 */
function assertFoundationContext(
  ctx: ExtendedMapContext | null,
  stageName: string
): asserts ctx is ExtendedMapContext & {
  foundation: NonNullable<ExtendedMapContext["foundation"]>;
} {
  if (!ctx) {
    throw new Error(`Stage "${stageName}" requires ExtendedMapContext but ctx is null`);
  }
  if (!ctx.foundation) {
    throw new Error(
      `Stage "${stageName}" requires FoundationContext but ctx.foundation is null. ` +
        `Ensure the "foundation" stage is enabled and runs before "${stageName}".`
    );
  }
}

// ============================================================================
// Adapter Resolution
// ============================================================================

interface OrchestratorAdapter {
  getGridWidth: () => number;
  getGridHeight: () => number;
  getMapSize: () => number;
  lookupMapInfo: (mapSize: number) => MapInfo | null;
  setMapInitData: (params: MapInitParams) => void;
  isWater: (x: number, y: number) => boolean;
  validateAndFixTerrain: () => void;
  recalculateAreas: () => void;
  stampContinents: () => void;
  buildElevation: () => void;
  modelRivers: (minLength: number, maxLength: number, navigableTerrain: number) => void;
  defineNamedRivers: () => void;
  storeWaterData: () => void;
  generateLakes: (width: number, height: number, tilesPerLake: number) => void;
  expandCoasts: (width: number, height: number) => void;
  chooseStartSectors: (
    players1: number,
    players2: number,
    rows: number,
    cols: number,
    humanNearEquator: boolean
  ) => unknown[];
  needHumanNearEquator: () => boolean;
}

function resolveOrchestratorAdapter(): OrchestratorAdapter {
  // Use engine globals directly - orchestrator-specific operations
  return {
    getGridWidth: () => (typeof GameplayMap !== "undefined" ? GameplayMap.getGridWidth() : 0),
    getGridHeight: () => (typeof GameplayMap !== "undefined" ? GameplayMap.getGridHeight() : 0),
    getMapSize: () =>
      typeof GameplayMap !== "undefined" ? (GameplayMap.getMapSize() as unknown as number) : 0,
    lookupMapInfo: (mapSize: number) =>
      typeof GameInfo !== "undefined" && GameInfo?.Maps?.lookup
        ? GameInfo.Maps.lookup(mapSize)
        : null,
    setMapInitData: (params: MapInitParams) => {
      if (typeof engine !== "undefined" && engine?.call) {
        engine.call("SetMapInitData", params);
      }
    },
    isWater: (x: number, y: number) =>
      typeof GameplayMap !== "undefined" ? GameplayMap.isWater(x, y) : true,
    validateAndFixTerrain: () => {
      if (typeof TerrainBuilder !== "undefined" && TerrainBuilder?.validateAndFixTerrain) {
        TerrainBuilder.validateAndFixTerrain();
      }
    },
    recalculateAreas: () => {
      if (typeof AreaBuilder !== "undefined" && AreaBuilder?.recalculateAreas) {
        AreaBuilder.recalculateAreas();
      }
    },
    stampContinents: () => {
      if (typeof TerrainBuilder !== "undefined" && TerrainBuilder?.stampContinents) {
        TerrainBuilder.stampContinents();
      }
    },
    buildElevation: () => {
      if (typeof TerrainBuilder !== "undefined" && TerrainBuilder?.buildElevation) {
        TerrainBuilder.buildElevation();
      }
    },
    modelRivers: (minLength: number, maxLength: number, navigableTerrain: number) => {
      if (typeof TerrainBuilder !== "undefined" && TerrainBuilder?.modelRivers) {
        TerrainBuilder.modelRivers(minLength, maxLength, navigableTerrain);
      }
    },
    defineNamedRivers: () => {
      if (typeof TerrainBuilder !== "undefined" && TerrainBuilder?.defineNamedRivers) {
        TerrainBuilder.defineNamedRivers();
      }
    },
    storeWaterData: () => {
      if (typeof TerrainBuilder !== "undefined" && TerrainBuilder?.storeWaterData) {
        TerrainBuilder.storeWaterData();
      }
    },
    generateLakes: (width: number, height: number, tilesPerLake: number) => {
      // Import dynamically to avoid circular deps
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require("/base-standard/maps/elevation-terrain-generator.js") as {
          generateLakes?: (w: number, h: number, t: number) => void;
        };
        if (mod?.generateLakes) {
          mod.generateLakes(width, height, tilesPerLake);
        }
      } catch {
        console.log("[MapOrchestrator] generateLakes not available");
      }
    },
    expandCoasts: (width: number, height: number) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require("/base-standard/maps/elevation-terrain-generator.js") as {
          expandCoasts?: (w: number, h: number) => void;
        };
        if (mod?.expandCoasts) {
          mod.expandCoasts(width, height);
        }
      } catch {
        console.log("[MapOrchestrator] expandCoasts not available");
      }
    },
    chooseStartSectors: (
      players1: number,
      players2: number,
      rows: number,
      cols: number,
      humanNearEquator: boolean
    ) => {
      // Use Civ7Adapter with static imports instead of require()
      try {
        const civ7 = createCiv7Adapter();
        if (typeof civ7.chooseStartSectors === "function") {
          return civ7.chooseStartSectors(players1, players2, rows, cols, humanNearEquator);
        }
      } catch (err) {
        console.log("[MapOrchestrator] chooseStartSectors not available:", err);
      }
      return [];
    },
    needHumanNearEquator: () => {
      // Use Civ7Adapter with static imports instead of require()
      try {
        const civ7 = createCiv7Adapter();
        if (typeof civ7.needHumanNearEquator === "function") {
          return civ7.needHumanNearEquator();
        }
      } catch (err) {
        console.log("[MapOrchestrator] needHumanNearEquator not available:", err);
      }
      return false;
    },
  };
}

// ============================================================================
// MapOrchestrator Class
// ============================================================================

/**
 * Central orchestrator for the map generation pipeline.
 *
 * Constructor accepts validated MapGenConfig as first parameter.
 * This enables explicit dependency injection and fail-fast validation.
 *
 * Usage:
 *   const config = bootstrap(options);
 *   const orchestrator = new MapOrchestrator(config, { logPrefix: "[MOD]" });
 *   orchestrator.generateMap();
 */
export class MapOrchestrator {
  /** Validated map generation config (injected via constructor) */
  private readonly mapGenConfig: MapGenConfig;
  /** Orchestrator options (adapter, logging, etc.) */
  private options: OrchestratorConfig;
  /**
   * Orchestrator-specific adapter for Civ7 map-init operations.
   * Handles: map size, MapInitData, GameplayMap/GameInfo globals,
   * lake/coast stamping, continent operations.
   * Always resolved from engine globals - NOT configurable via options.
   */
  private orchestratorAdapter: OrchestratorAdapter;
  private stageResults: StageResult[] = [];
  private worldModelConfigBound = false;

  /**
   * Create a new MapOrchestrator with validated config.
   *
   * @param config - Validated MapGenConfig from bootstrap()
   * @param options - Orchestrator options (adapter, logPrefix, etc.)
   * @throws Error if config is not provided or invalid
   */
  constructor(config: MapGenConfig, options: OrchestratorConfig = {}) {
    // Fail-fast: config is required
    if (!config || typeof config !== "object") {
      throw new Error(
        "MapOrchestrator requires validated MapGenConfig. " +
          "Call bootstrap() first and pass the returned config."
      );
    }

    this.mapGenConfig = config;
    this.options = options;

    // OrchestratorAdapter is always resolved from engine globals.
    // It handles Civ7-specific map-init operations (map size, SetMapInitData,
    // GameplayMap/GameInfo, lake/coast stamping).
    // NOTE: options.adapter (EngineAdapter) is used separately for layer operations
    // via createLayerAdapter() - the two adapters serve different purposes.
    this.orchestratorAdapter = resolveOrchestratorAdapter();

    // Note: Tunables must already be bound before constructing MapOrchestrator.
    // The expected flow is: bootstrap(options) → config → new MapOrchestrator(config)
    // bootstrap() calls bindTunables() internally, so getTunables() will work.
    // If tunables are not bound, getTunables() will throw (fail-fast).
  }

  /**
   * Get the validated MapGenConfig.
   * Exposed for downstream stages that need direct config access.
   */
  getMapGenConfig(): Readonly<MapGenConfig> {
    return this.mapGenConfig;
  }

  /**
   * Handle RequestMapInitData event.
   * Sets map dimensions and latitude parameters from game settings.
   *
   * Flow: GameplayMap.getMapSize() → GameInfo.Maps.lookup() → extract dimensions
   * This replaces the previous hard-coded 84×54 approach (CIV-22).
   *
   * For testing, use `config.mapSizeDefaults` to bypass game settings.
   */
  requestMapData(initParams?: Partial<MapInitParams>): void {
    const prefix = this.options.logPrefix || "[SWOOPER_MOD]";
    console.log(`${prefix} === RequestMapInitData ===`);

    // Get map size and info: use config defaults if provided (for testing),
    // otherwise query game settings
    let mapSizeId: number;
    let mapInfo: MapInfo | null;

    if (this.options.mapSizeDefaults) {
      // Testing mode: use provided defaults
      mapSizeId = this.options.mapSizeDefaults.mapSizeId ?? 0;
      mapInfo = this.options.mapSizeDefaults.mapInfo ?? null;
      console.log(`${prefix} Using test mapSizeDefaults`);
    } else {
      // Production mode: query game settings
      mapSizeId = this.orchestratorAdapter.getMapSize();
      mapInfo = this.orchestratorAdapter.lookupMapInfo(mapSizeId);
    }

    // Extract dimensions from MapInfo, with sensible fallbacks.
    // Fallback values intentionally mirror Civ7's MAPSIZE_STANDARD defaults:
    //   - 84×54 grid dimensions
    //   - ±80° latitude bounds
    // These are used when GameInfo.Maps.lookup() fails or returns incomplete data.
    // If Civ7's base map defaults change, these should be updated to match.
    const gameWidth = mapInfo?.GridWidth ?? 84;
    const gameHeight = mapInfo?.GridHeight ?? 54;
    const gameMaxLat = mapInfo?.MaxLatitude ?? 80;
    const gameMinLat = mapInfo?.MinLatitude ?? -80;

    console.log(`${prefix} Map size ID: ${mapSizeId}`);
    console.log(
      `${prefix} MapInfo: GridWidth=${gameWidth}, GridHeight=${gameHeight}, Lat=[${gameMinLat}, ${gameMaxLat}]`
    );

    // Build params: explicit overrides take precedence over game settings
    const params: MapInitParams = {
      width: initParams?.width ?? gameWidth,
      height: initParams?.height ?? gameHeight,
      topLatitude: initParams?.topLatitude ?? gameMaxLat,
      bottomLatitude: initParams?.bottomLatitude ?? gameMinLat,
      wrapX: initParams?.wrapX ?? true,
      wrapY: initParams?.wrapY ?? false,
    };

    console.log(`${prefix} Final dimensions: ${params.width} x ${params.height}`);
    console.log(
      `${prefix} Final latitude range: ${params.bottomLatitude} to ${params.topLatitude}`
    );

    this.orchestratorAdapter.setMapInitData(params);
  }

  /**
   * Handle GenerateMap event.
   * Runs the full generation pipeline.
   */
  generateMap(): GenerationResult {
    if (this.options.useTaskGraph) {
      return this.generateMapTaskGraph();
    }

    const prefix = this.options.logPrefix || "[SWOOPER_MOD]";
    console.log(`${prefix} === GenerateMap ===`);

    this.stageResults = [];
    const startPositions: number[] = [];

    // Refresh configuration and tunables snapshot for this generation pass.
    resetTunables();
    const tunables = getTunables();

    // Initialize DEV flags from stable-slice diagnostics config.
    // Keys are camelCase and match DevLogConfig.
    resetDevFlags();
    const foundationCfg = tunables.FOUNDATION_CFG || {};
    const rawDiagnostics = (foundationCfg.diagnostics || {}) as Record<string, unknown>;
    const diagnosticsConfig = { ...rawDiagnostics } as DevLogConfig;
    const hasTruthyFlag = Object.entries(diagnosticsConfig).some(
      ([key, value]) => key !== "enabled" && value === true
    );
    if (diagnosticsConfig.enabled === undefined && hasTruthyFlag) {
      diagnosticsConfig.enabled = true;
    }
    initDevFlags(diagnosticsConfig);

    console.log(`${prefix} Tunables rebound successfully`);

    // Reset WorldModel to ensure fresh state for this generation run
    // This clears any stale plate/dynamics data from previous runs
    WorldModel.reset();

    // Get map dimensions
    const iWidth = this.orchestratorAdapter.getGridWidth();
    const iHeight = this.orchestratorAdapter.getGridHeight();
    const uiMapSize = this.orchestratorAdapter.getMapSize();
    const mapInfo = this.orchestratorAdapter.lookupMapInfo(uiMapSize);

    if (!mapInfo) {
      console.error(`${prefix} Failed to lookup map info`);
      return { success: false, stageResults: this.stageResults, startPositions };
    }

    console.log(`${prefix} Map size: ${iWidth}x${iHeight}`);
    console.log(
      `${prefix} MapInfo summary: NumNaturalWonders=${mapInfo.NumNaturalWonders}, ` +
        `LakeGenerationFrequency=${mapInfo.LakeGenerationFrequency}, ` +
        `PlayersLandmass1=${mapInfo.PlayersLandmass1}, PlayersLandmass2=${mapInfo.PlayersLandmass2}`
    );

    // Dev: introspect engine surface APIs once per context (GameplayMap, TerrainBuilder)
    logEngineSurfaceApisOnce();

    // Get stage configuration
    const stageFlags = this.resolveStageFlags();
    const enabledStages = Object.entries(stageFlags)
      .filter(([, enabled]) => enabled)
      .map(([name]) => name)
      .join(", ");
    console.log(`${prefix} Enabled stages: ${enabledStages || "(none)"}`);

    // Get layer configurations from tunables
    const landmassCfg = tunables.LANDMASS_CFG || {};
    const mountainsCfg = (foundationCfg.mountains || {}) as MountainsConfig;
    const volcanosCfg = (foundationCfg.volcanoes || {}) as VolcanoesConfig;

    // Build mountain options
    const mountainOptions = this.buildMountainOptions(mountainsCfg);

    // Build volcano options
    const volcanoOptions = this.buildVolcanoOptions(volcanosCfg);

    // Create context with adapter
    let ctx: ExtendedMapContext | null = null;

    try {
      // Create adapter for layer operations
      const layerAdapter = this.createLayerAdapter(iWidth, iHeight);
      ctx = createExtendedMapContext({ width: iWidth, height: iHeight }, layerAdapter, {
        toggles: {
          STORY_ENABLE_HOTSPOTS: stageFlags.storyHotspots,
          STORY_ENABLE_RIFTS: stageFlags.storyRifts,
          STORY_ENABLE_OROGENY: stageFlags.storyOrogeny,
          STORY_ENABLE_SWATCHES: stageFlags.storySwatches,
          STORY_ENABLE_PALEO: false,
          STORY_ENABLE_CORRIDORS: stageFlags.storyCorridorsPre || stageFlags.storyCorridorsPost,
        },
      });
      console.log(`${prefix} MapContext created successfully`);
    } catch (err) {
      console.error(`${prefix} Failed to create context:`, err);
      return { success: false, stageResults: this.stageResults, startPositions };
    }

    // Initialize WorldModel and FoundationContext
    // Note: foundationContext stored for potential future use in story stages
    if (stageFlags.foundation && ctx) {
      const stageResult = this.runStage("foundation", () => {
        this.initializeFoundation(ctx!, tunables);
      });
      this.stageResults.push(stageResult);
    }

    // Set up start sectors
    const iNumPlayers1 = mapInfo.PlayersLandmass1 ?? 4;
    const iNumPlayers2 = mapInfo.PlayersLandmass2 ?? 4;
    const iStartSectorRows = mapInfo.StartSectorRows ?? 4;
    const iStartSectorCols = mapInfo.StartSectorCols ?? 4;
    const bHumanNearEquator = this.orchestratorAdapter.needHumanNearEquator();
    const startSectors = this.orchestratorAdapter.chooseStartSectors(
      iNumPlayers1,
      iNumPlayers2,
      iStartSectorRows,
      iStartSectorCols,
      bHumanNearEquator
    );
    console.log(`${prefix} Start sectors chosen successfully`);

    // Initialize continent boundaries
    let westContinent = this.createDefaultContinentBounds(iWidth, iHeight, "west");
    let eastContinent = this.createDefaultContinentBounds(iWidth, iHeight, "east");

    // ========================================================================
    // Stage: Landmass (Plate-Driven)
    // ========================================================================
    if (stageFlags.landmassPlates && ctx) {
      const stageResult = this.runStage("landmassPlates", () => {
        // Assert foundation is available - fail fast if not
        assertFoundationContext(ctx, "landmassPlates");

        const plateResult = createPlateDrivenLandmasses(iWidth, iHeight, ctx, {
          landmassCfg: landmassCfg as LandmassConfig,
          geometry: landmassCfg.geometry,
        });

        if (!plateResult?.windows?.length) {
          throw new Error("Plate-driven landmass generation failed (no windows)");
        }

        let windows = plateResult.windows.slice();

        // Apply ocean separation
        const separationResult = applyPlateAwareOceanSeparation({
          width: iWidth,
          height: iHeight,
          windows,
          landMask: plateResult.landMask,
          context: ctx,
          adapter: ctx.adapter,
          crustMode: landmassCfg.crustMode,
        });
        windows = separationResult.windows;

        // Apply post-adjustments
        windows = applyLandmassPostAdjustments(windows, landmassCfg.geometry, iWidth, iHeight);

        // Minimal smoke warning: plate-driven landmass should yield at least two windows.
        if (DEV.ENABLED && windows.length < 2) {
          devWarn(
            `[smoke] landmassPlates produced ${windows.length} window(s); expected >= 2 for west/east continents.`
          );
        }

        // Update continent bounds from windows
        if (windows.length >= 2) {
          const first = windows[0];
          const last = windows[windows.length - 1];
          if (first && last) {
            westContinent = this.windowToContinentBounds(first, 0);
            eastContinent = this.windowToContinentBounds(last, 1);
          }
        }

        // Mark LandmassRegionId EARLY - this MUST happen before validateAndFixTerrain.
        // The vanilla StartPositioner.divideMapIntoMajorRegions() filters by this ID.
        // This matches the vanilla continents.js order: markLandmassRegionId → validate → expand → recalculate → stamp
        const westMarked = markLandmassRegionId(westContinent, LANDMASS_REGION.WEST, ctx.adapter);
        const eastMarked = markLandmassRegionId(eastContinent, LANDMASS_REGION.EAST, ctx.adapter);
        console.log(
          `[landmass-plate] LandmassRegionId marked: ${westMarked} west (ID=${LANDMASS_REGION.WEST}), ${eastMarked} east (ID=${LANDMASS_REGION.EAST})`
        );

        // Validate and stamp continents
        this.orchestratorAdapter.validateAndFixTerrain();
        this.orchestratorAdapter.recalculateAreas();
        this.orchestratorAdapter.stampContinents();

        // Apply plot tags
        const terrainBuilder: TerrainBuilderLike = {
          setPlotTag: (x, y, tag) => {
            if (typeof TerrainBuilder !== "undefined" && TerrainBuilder?.setPlotTag) {
              TerrainBuilder.setPlotTag(x, y, tag);
            }
          },
          addPlotTag: (x, y, tag) => {
            if (typeof TerrainBuilder !== "undefined" && TerrainBuilder?.addPlotTag) {
              TerrainBuilder.addPlotTag(x, y, tag);
            }
          },
        };
        addPlotTagsSimple(iHeight, iWidth, eastContinent.west, ctx.adapter, terrainBuilder);
      });
      this.stageResults.push(stageResult);

      // Dev: log landmass visualization
      if (DEV.ENABLED && ctx?.adapter) {
        logLandmassAscii(ctx.adapter, iWidth, iHeight);
      }
    }

    // ========================================================================
    // Stage: Coastlines
    // ========================================================================
    if (stageFlags.coastlines && ctx) {
      const stageResult = this.runStage("coastlines", () => {
        this.orchestratorAdapter.expandCoasts(iWidth, iHeight);
      });
      this.stageResults.push(stageResult);
    }

    // ========================================================================
    // Stage: Story Seed (Continental Margins)
    // ========================================================================
    if (stageFlags.storySeed && ctx) {
      const stageResult = this.runStage("storySeed", () => {
        resetStoryTags();
        resetStoryOverlays();
        console.log(`${prefix} Imprinting continental margins (active/passive)...`);
        const margins = storyTagContinentalMargins(ctx);

        if (DEV.ENABLED) {
          const activeCount = margins.active?.length ?? 0;
          const passiveCount = margins.passive?.length ?? 0;
          if (activeCount + passiveCount === 0) {
            devWarn("[smoke] storySeed enabled but margins overlay is empty");
          }
        }
      });
      this.stageResults.push(stageResult);
    }

    // ========================================================================
    // Stage: Story Hotspots (Hotspot Trails)
    // ========================================================================
    if (stageFlags.storyHotspots && ctx) {
      const stageResult = this.runStage("storyHotspots", () => {
        console.log(`${prefix} Imprinting hotspot trails...`);
        const summary = storyTagHotspotTrails(ctx);

        if (DEV.ENABLED && summary.points === 0) {
          devWarn("[smoke] storyHotspots enabled but no hotspot points were emitted");
        }
      });
      this.stageResults.push(stageResult);
    }

    // ========================================================================
    // Stage: Story Rifts (Rift Valleys)
    // ========================================================================
    if (stageFlags.storyRifts && ctx) {
      const stageResult = this.runStage("storyRifts", () => {
        console.log(`${prefix} Imprinting rift valleys...`);
        const summary = storyTagRiftValleys(ctx);

        if (DEV.ENABLED && summary.lineTiles === 0) {
          devWarn("[smoke] storyRifts enabled but no rift tiles were emitted");
        }
      });
      this.stageResults.push(stageResult);
    }

    // ========================================================================
    // Stage: Rugged Coastlines
    // ========================================================================
    if (stageFlags.ruggedCoasts && ctx) {
      const stageResult = this.runStage("ruggedCoasts", () => {
        addRuggedCoasts(iWidth, iHeight, ctx!);
      });
      this.stageResults.push(stageResult);
    }

    // ========================================================================
    // Stage: Islands
    // ========================================================================
    if (stageFlags.islands && ctx) {
      const stageResult = this.runStage("islands", () => {
        addIslandChains(iWidth, iHeight, ctx!);
      });
      this.stageResults.push(stageResult);
    }

    // ========================================================================
    // Stage: Mountains
    // ========================================================================
    if (stageFlags.mountains && ctx) {
      const stageResult = this.runStage("mountains", () => {
        // Assert foundation is available - fail fast if not
        assertFoundationContext(ctx, "mountains");

        devLogIf(
          "LOG_MOUNTAINS",
          `${prefix} [Mountains] thresholds ` +
            `mountain=${mountainOptions.mountainThreshold}, ` +
            `hill=${mountainOptions.hillThreshold}, ` +
            `tectonicIntensity=${mountainOptions.tectonicIntensity}, ` +
            `boundaryWeight=${mountainOptions.boundaryWeight}, ` +
            `boundaryExponent=${mountainOptions.boundaryExponent}, ` +
            `interiorPenaltyWeight=${mountainOptions.interiorPenaltyWeight}`
        );

        layerAddMountainsPhysics(ctx, mountainOptions);
      });
      this.stageResults.push(stageResult);

      // Dev: log mountain summary and relief
      if (DEV.ENABLED && ctx?.adapter) {
        logMountainSummary(ctx.adapter, iWidth, iHeight);
        logReliefAscii(ctx.adapter, iWidth, iHeight);
      }
    }

    // ========================================================================
    // Stage: Volcanoes
    // ========================================================================
    if (stageFlags.volcanoes && ctx) {
      const stageResult = this.runStage("volcanoes", () => {
        // Assert foundation is available - fail fast if not
        assertFoundationContext(ctx, "volcanoes");

        layerAddVolcanoesPlateAware(ctx, volcanoOptions);
      });
      this.stageResults.push(stageResult);

      // Dev: log volcano summary
      if (DEV.ENABLED && ctx?.adapter) {
        // Try to get volcano feature ID from adapter
        const volcanoId = ctx.adapter.getFeatureTypeIndex?.("FEATURE_VOLCANO") ?? -1;
        logVolcanoSummary(ctx.adapter, iWidth, iHeight, volcanoId);
      }
    }

    // ========================================================================
    // Stage: Lakes
    // ========================================================================
    if (stageFlags.lakes && ctx) {
      const iTilesPerLake = Math.max(10, (mapInfo.LakeGenerationFrequency ?? 5) * 2);
      const stageResult = this.runStage("lakes", () => {
        this.orchestratorAdapter.generateLakes(iWidth, iHeight, iTilesPerLake);
        syncHeightfield(ctx!);
      });
      this.stageResults.push(stageResult);
    }

    // Build elevation after terrain modifications
    this.orchestratorAdapter.recalculateAreas();
    this.orchestratorAdapter.buildElevation();

    // Refresh landmass regions after coast/rugged/island/lake/mountain changes so StartPositioner
    // sees the final land/water layout.
    const westRestamped = markLandmassRegionId(westContinent, LANDMASS_REGION.WEST, ctx.adapter);
    const eastRestamped = markLandmassRegionId(eastContinent, LANDMASS_REGION.EAST, ctx.adapter);
    ctx.adapter.recalculateAreas();
    ctx.adapter.stampContinents();
    console.log(
      `[landmass-plate] LandmassRegionId refreshed post-terrain: ${westRestamped} west (ID=${LANDMASS_REGION.WEST}), ${eastRestamped} east (ID=${LANDMASS_REGION.EAST})`
    );

    // ========================================================================
    // Stage: Climate Baseline
    // ========================================================================
    if (stageFlags.climateBaseline && ctx) {
      const stageResult = this.runStage("climateBaseline", () => {
        // Assert foundation is available - fail fast if not
        assertFoundationContext(ctx, "climateBaseline");

        applyClimateBaseline(iWidth, iHeight, ctx);
      });
      this.stageResults.push(stageResult);
    }

    // ========================================================================
    // Stage: Rivers
    // ========================================================================
    if (stageFlags.rivers && ctx) {
      // Use terrain constant from shared module (terrain.xml: 5=NAVIGABLE_RIVER)
      const navigableRiverTerrain = NAVIGABLE_RIVER_TERRAIN;
      const logStats = (label: string) => {
        const w = iWidth;
        const h = iHeight;
        let flat = 0,
          hill = 0,
          mtn = 0,
          water = 0;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (ctx!.adapter.isWater(x, y)) {
              water++;
              continue;
            }
            const t = ctx!.adapter.getTerrainType(x, y);
            // CORRECT terrain.xml order: 0:MOUNTAIN, 1:HILL, 2:FLAT, 3:COAST, 4:OCEAN
            if (t === MOUNTAIN_TERRAIN) mtn++;
            else if (t === HILL_TERRAIN) hill++;
            else flat++;
          }
        }
        const total = w * h;
        const land = Math.max(1, flat + hill + mtn);
        console.log(
          `[Rivers] ${label}: Land=${land} (${((land / total) * 100).toFixed(1)}%) ` +
            `Mtn=${((mtn / land) * 100).toFixed(1)}% ` +
            `Hill=${((hill / land) * 100).toFixed(1)}% ` +
            `Flat=${((flat / land) * 100).toFixed(1)}%`
        );
      };

      const stageResult = this.runStage("rivers", () => {
        logStats("PRE-RIVERS");
        this.orchestratorAdapter.modelRivers(5, 15, navigableRiverTerrain);
        logStats("POST-MODELRIVERS");
        this.orchestratorAdapter.validateAndFixTerrain();
        logStats("POST-VALIDATE");
        syncHeightfield(ctx!);
        syncClimateField(ctx!);
        this.orchestratorAdapter.defineNamedRivers();
      });
      this.stageResults.push(stageResult);
    }

    // ========================================================================
    // Stage: Climate Refinement
    // ========================================================================
    if (stageFlags.climateRefine && ctx) {
      const stageResult = this.runStage("climateRefine", () => {
        // Assert foundation is available - fail fast if not
        assertFoundationContext(ctx, "climateRefine");

        refineClimateEarthlike(iWidth, iHeight, ctx);
      });
      this.stageResults.push(stageResult);

      // Dev: log rainfall stats after climate refinement
      if (DEV.ENABLED && ctx?.adapter) {
        logRainfallStats(ctx.adapter, iWidth, iHeight, "post-climate");
      }
    }

    // ========================================================================
    // Stage: Biomes
    // ========================================================================
    if (stageFlags.biomes && ctx) {
      const stageResult = this.runStage("biomes", () => {
        designateEnhancedBiomes(iWidth, iHeight, ctx);
      });
      this.stageResults.push(stageResult);

      // Dev: log biome summary
      if (DEV.ENABLED && ctx?.adapter) {
        logBiomeSummary(ctx.adapter, iWidth, iHeight);
      }
    }

    // ========================================================================
    // Stage: Features
    // ========================================================================
    if (stageFlags.features && ctx) {
      const stageResult = this.runStage("features", () => {
        addDiverseFeatures(iWidth, iHeight, ctx!);
        this.orchestratorAdapter.validateAndFixTerrain();
        syncHeightfield(ctx!);
        this.orchestratorAdapter.recalculateAreas();
      });
      this.stageResults.push(stageResult);
    }

    // Store water data before placement
    this.orchestratorAdapter.storeWaterData();

    // ========================================================================
    // Stage: Placement
    // ========================================================================
    if (stageFlags.placement && ctx) {
      const stageResult = this.runStage("placement", () => {
        const positions = runPlacement(ctx.adapter, iWidth, iHeight, {
          mapInfo: mapInfo as { NumNaturalWonders?: number },
          wondersPlusOne: true,
          floodplains: { minLength: 4, maxLength: 10 },
          starts: {
            playersLandmass1: iNumPlayers1,
            playersLandmass2: iNumPlayers2,
            westContinent,
            eastContinent,
            startSectorRows: iStartSectorRows,
            startSectorCols: iStartSectorCols,
            startSectors,
          },
        });
        startPositions.push(...positions);
      });
      this.stageResults.push(stageResult);
    }

    // Minimal smoke warning: enabled story stages should emit some tags.
    const storyStagesEnabled =
      stageFlags.storySeed ||
      stageFlags.storyHotspots ||
      stageFlags.storyRifts ||
      stageFlags.storyOrogeny ||
      stageFlags.storyCorridorsPre ||
      stageFlags.storySwatches ||
      stageFlags.storyCorridorsPost;
    if (DEV.ENABLED && storyStagesEnabled) {
      const tags = getStoryTags();
      const tagTotal =
        tags.hotspot.size +
        tags.hotspotParadise.size +
        tags.hotspotVolcanic.size +
        tags.riftLine.size +
        tags.riftShoulder.size +
        tags.activeMargin.size +
        tags.passiveShelf.size +
        tags.corridorSeaLane.size +
        tags.corridorIslandHop.size +
        tags.corridorLandOpen.size +
        tags.corridorRiverChain.size;
      if (tagTotal === 0) {
        devWarn("[smoke] story stages enabled but no story tags were emitted");
      }
    }

    console.log(`${prefix} === GenerateMap COMPLETE ===`);

    const success = this.stageResults.every((r) => r.success);
    return { success, stageResults: this.stageResults, startPositions };
  }

  /**
   * M3 Task Graph execution entry.
   *
   * Runs the same wrap-first stage implementations as generateMap(), but through
   * PipelineExecutor with runtime requires/provides gating.
   */
  generateMapTaskGraph(): GenerationResult {
    const prefix = this.options.logPrefix || "[SWOOPER_MOD]";
    console.log(`${prefix} === GenerateMap (TaskGraph) ===`);

    this.stageResults = [];
    const startPositions: number[] = [];

    // Refresh configuration and tunables snapshot for this generation pass.
    resetTunables();
    const tunables = getTunables();

    // Initialize DEV flags from stable-slice diagnostics config.
    resetDevFlags();
    const foundationCfg = tunables.FOUNDATION_CFG || {};
    const rawDiagnostics = (foundationCfg.diagnostics || {}) as Record<string, unknown>;
    const diagnosticsConfig = { ...rawDiagnostics } as DevLogConfig;
    const hasTruthyFlag = Object.entries(diagnosticsConfig).some(
      ([key, value]) => key !== "enabled" && value === true
    );
    if (diagnosticsConfig.enabled === undefined && hasTruthyFlag) {
      diagnosticsConfig.enabled = true;
    }
    initDevFlags(diagnosticsConfig);

    console.log(`${prefix} Tunables rebound successfully`);

    // Reset WorldModel to ensure fresh state for this generation run
    WorldModel.reset();

    // Get map dimensions
    const iWidth = this.orchestratorAdapter.getGridWidth();
    const iHeight = this.orchestratorAdapter.getGridHeight();
    const uiMapSize = this.orchestratorAdapter.getMapSize();
    const mapInfo = this.orchestratorAdapter.lookupMapInfo(uiMapSize);

    if (!mapInfo) {
      console.error(`${prefix} Failed to lookup map info`);
      return { success: false, stageResults: this.stageResults, startPositions };
    }

    console.log(`${prefix} Map size: ${iWidth}x${iHeight}`);
    console.log(
      `${prefix} MapInfo summary: NumNaturalWonders=${mapInfo.NumNaturalWonders}, ` +
        `LakeGenerationFrequency=${mapInfo.LakeGenerationFrequency}, ` +
        `PlayersLandmass1=${mapInfo.PlayersLandmass1}, PlayersLandmass2=${mapInfo.PlayersLandmass2}`
    );

    // Dev: introspect engine surface APIs once per context (GameplayMap, TerrainBuilder)
    logEngineSurfaceApisOnce();

    // Stage configuration and logging
    const stageFlags = this.resolveStageFlags();
    const enabledStages = Object.entries(stageFlags)
      .filter(([, enabled]) => enabled)
      .map(([name]) => name)
      .join(", ");
    console.log(`${prefix} Enabled stages: ${enabledStages || "(none)"}`);

    // Get layer configurations from tunables
    const landmassCfg = tunables.LANDMASS_CFG || {};
    const mountainsCfg = (foundationCfg.mountains || {}) as MountainsConfig;
    const volcanosCfg = (foundationCfg.volcanoes || {}) as VolcanoesConfig;

    const mountainOptions = this.buildMountainOptions(mountainsCfg);
    const volcanoOptions = this.buildVolcanoOptions(volcanosCfg);

    // Create context with adapter
    let ctx: ExtendedMapContext | null = null;
    try {
      const layerAdapter = this.createLayerAdapter(iWidth, iHeight);
      ctx = createExtendedMapContext({ width: iWidth, height: iHeight }, layerAdapter, {
        toggles: {
          STORY_ENABLE_HOTSPOTS: stageFlags.storyHotspots,
          STORY_ENABLE_RIFTS: stageFlags.storyRifts,
          STORY_ENABLE_OROGENY: stageFlags.storyOrogeny,
          STORY_ENABLE_SWATCHES: stageFlags.storySwatches,
          STORY_ENABLE_PALEO: false,
          STORY_ENABLE_CORRIDORS: stageFlags.storyCorridorsPre || stageFlags.storyCorridorsPost,
        },
      });
      console.log(`${prefix} MapContext created successfully`);
    } catch (err) {
      console.error(`${prefix} Failed to create context:`, err);
      return { success: false, stageResults: this.stageResults, startPositions };
    }

    // Set up start sectors (placement consumes these)
    const iNumPlayers1 = mapInfo.PlayersLandmass1 ?? 4;
    const iNumPlayers2 = mapInfo.PlayersLandmass2 ?? 4;
    const iStartSectorRows = mapInfo.StartSectorRows ?? 4;
    const iStartSectorCols = mapInfo.StartSectorCols ?? 4;
    const bHumanNearEquator = this.orchestratorAdapter.needHumanNearEquator();
    const startSectors = this.orchestratorAdapter.chooseStartSectors(
      iNumPlayers1,
      iNumPlayers2,
      iStartSectorRows,
      iStartSectorCols,
      bHumanNearEquator
    );
    console.log(`${prefix} Start sectors chosen successfully`);

    // Mutable landmass bounds used by placement (wrap-first state)
    let westContinent = this.createDefaultContinentBounds(iWidth, iHeight, "west");
    let eastContinent = this.createDefaultContinentBounds(iWidth, iHeight, "east");

    const registry = new StepRegistry<ExtendedMapContext>();
    const stageManifest = tunables.STAGE_MANIFEST;

    const getStageDescriptor = (
      stageName: string
    ): { requires: readonly string[]; provides: readonly string[] } => {
      const desc = stageManifest.stages?.[stageName] ?? {};
      const requires = Array.isArray(desc.requires) ? desc.requires : [];
      const provides = Array.isArray(desc.provides) ? desc.provides : [];
      return { requires, provides };
    };

    // Register wrap-first stage steps (stage id -> step id is 1:1 in M3).
    registry.register({
      id: "foundation",
      phase: M3_STANDARD_STAGE_PHASE.foundation,
      ...getStageDescriptor("foundation"),
      shouldRun: () => stageFlags.foundation,
      run: () => {
        this.initializeFoundation(ctx!, tunables);
      },
    });

    registry.register({
      id: "landmassPlates",
      phase: M3_STANDARD_STAGE_PHASE.landmassPlates,
      ...getStageDescriptor("landmassPlates"),
      shouldRun: () => stageFlags.landmassPlates,
      run: () => {
        assertFoundationContext(ctx, "landmassPlates");

        const plateResult = createPlateDrivenLandmasses(iWidth, iHeight, ctx, {
          landmassCfg: landmassCfg as LandmassConfig,
          geometry: landmassCfg.geometry,
        });

        if (!plateResult?.windows?.length) {
          throw new Error("Plate-driven landmass generation failed (no windows)");
        }

        let windows = plateResult.windows.slice();

        // Apply ocean separation
        const separationResult = applyPlateAwareOceanSeparation({
          width: iWidth,
          height: iHeight,
          windows,
          landMask: plateResult.landMask,
          context: ctx,
          adapter: ctx.adapter,
          crustMode: landmassCfg.crustMode,
        });
        windows = separationResult.windows;

        // Apply post-adjustments
        windows = applyLandmassPostAdjustments(windows, landmassCfg.geometry, iWidth, iHeight);

        // Minimal smoke warning: plate-driven landmass should yield at least two windows.
        if (DEV.ENABLED && windows.length < 2) {
          devWarn(
            `[smoke] landmassPlates produced ${windows.length} window(s); expected >= 2 for west/east continents.`
          );
        }

        // Update continent bounds from windows
        if (windows.length >= 2) {
          const first = windows[0];
          const last = windows[windows.length - 1];
          if (first && last) {
            westContinent = this.windowToContinentBounds(first, 0);
            eastContinent = this.windowToContinentBounds(last, 1);
          }
        }

        // Mark LandmassRegionId EARLY - this MUST happen before validateAndFixTerrain.
        const westMarked = markLandmassRegionId(westContinent, LANDMASS_REGION.WEST, ctx.adapter);
        const eastMarked = markLandmassRegionId(eastContinent, LANDMASS_REGION.EAST, ctx.adapter);
        console.log(
          `[landmass-plate] LandmassRegionId marked: ${westMarked} west (ID=${LANDMASS_REGION.WEST}), ${eastMarked} east (ID=${LANDMASS_REGION.EAST})`
        );

        // Validate and stamp continents
        this.orchestratorAdapter.validateAndFixTerrain();
        this.orchestratorAdapter.recalculateAreas();
        this.orchestratorAdapter.stampContinents();

        // Apply plot tags
        const terrainBuilder: TerrainBuilderLike = {
          setPlotTag: (x, y, tag) => {
            if (typeof TerrainBuilder !== "undefined" && TerrainBuilder?.setPlotTag) {
              TerrainBuilder.setPlotTag(x, y, tag);
            }
          },
          addPlotTag: (x, y, tag) => {
            if (typeof TerrainBuilder !== "undefined" && TerrainBuilder?.addPlotTag) {
              TerrainBuilder.addPlotTag(x, y, tag);
            }
          },
        };
        addPlotTagsSimple(iHeight, iWidth, eastContinent.west, ctx.adapter, terrainBuilder);

        // Dev: log landmass visualization
        if (DEV.ENABLED && ctx?.adapter) {
          logLandmassAscii(ctx.adapter, iWidth, iHeight);
        }
      },
    });

    registry.register({
      id: "coastlines",
      phase: M3_STANDARD_STAGE_PHASE.coastlines,
      ...getStageDescriptor("coastlines"),
      shouldRun: () => stageFlags.coastlines,
      run: () => {
        this.orchestratorAdapter.expandCoasts(iWidth, iHeight);
      },
    });

    registry.register({
      id: "storySeed",
      phase: M3_STANDARD_STAGE_PHASE.storySeed,
      ...getStageDescriptor("storySeed"),
      shouldRun: () => stageFlags.storySeed,
      run: () => {
        resetStoryTags();
        resetStoryOverlays();
        console.log(`${prefix} Imprinting continental margins (active/passive)...`);
        const margins = storyTagContinentalMargins(ctx);

        if (DEV.ENABLED) {
          const activeCount = margins.active?.length ?? 0;
          const passiveCount = margins.passive?.length ?? 0;
          if (activeCount + passiveCount === 0) {
            devWarn("[smoke] storySeed enabled but margins overlay is empty");
          }
        }
      },
    });

    registry.register({
      id: "storyHotspots",
      phase: M3_STANDARD_STAGE_PHASE.storyHotspots,
      ...getStageDescriptor("storyHotspots"),
      shouldRun: () => stageFlags.storyHotspots,
      run: () => {
        console.log(`${prefix} Imprinting hotspot trails...`);
        const summary = storyTagHotspotTrails(ctx);

        if (DEV.ENABLED && summary.points === 0) {
          devWarn("[smoke] storyHotspots enabled but no hotspot points were emitted");
        }
      },
    });

    registry.register({
      id: "storyRifts",
      phase: M3_STANDARD_STAGE_PHASE.storyRifts,
      ...getStageDescriptor("storyRifts"),
      shouldRun: () => stageFlags.storyRifts,
      run: () => {
        console.log(`${prefix} Imprinting rift valleys...`);
        const summary = storyTagRiftValleys(ctx);

        if (DEV.ENABLED && summary.lineTiles === 0) {
          devWarn("[smoke] storyRifts enabled but no rift tiles were emitted");
        }
      },
    });

    registry.register({
      id: "ruggedCoasts",
      phase: M3_STANDARD_STAGE_PHASE.ruggedCoasts,
      ...getStageDescriptor("ruggedCoasts"),
      shouldRun: () => stageFlags.ruggedCoasts,
      run: () => {
        addRuggedCoasts(iWidth, iHeight, ctx);
      },
    });

    // Placeholder steps for story stages not yet implemented in the stable slice.
    registry.register({
      id: "storyOrogeny",
      phase: M3_STANDARD_STAGE_PHASE.storyOrogeny,
      ...getStageDescriptor("storyOrogeny"),
      shouldRun: () => false,
      run: () => {},
    });
    registry.register({
      id: "storyCorridorsPre",
      phase: M3_STANDARD_STAGE_PHASE.storyCorridorsPre,
      ...getStageDescriptor("storyCorridorsPre"),
      shouldRun: () => false,
      run: () => {},
    });

    registry.register({
      id: "islands",
      phase: M3_STANDARD_STAGE_PHASE.islands,
      ...getStageDescriptor("islands"),
      shouldRun: () => stageFlags.islands,
      run: () => {
        addIslandChains(iWidth, iHeight, ctx);
      },
    });

    registry.register({
      id: "mountains",
      phase: M3_STANDARD_STAGE_PHASE.mountains,
      ...getStageDescriptor("mountains"),
      shouldRun: () => stageFlags.mountains,
      run: () => {
        assertFoundationContext(ctx, "mountains");

        devLogIf(
          "LOG_MOUNTAINS",
          `${prefix} [Mountains] thresholds ` +
            `mountain=${mountainOptions.mountainThreshold}, ` +
            `hill=${mountainOptions.hillThreshold}, ` +
            `tectonicIntensity=${mountainOptions.tectonicIntensity}, ` +
            `boundaryWeight=${mountainOptions.boundaryWeight}, ` +
            `boundaryExponent=${mountainOptions.boundaryExponent}, ` +
            `interiorPenaltyWeight=${mountainOptions.interiorPenaltyWeight}`
        );

        layerAddMountainsPhysics(ctx, mountainOptions);

        // Dev: log mountain summary and relief
        if (DEV.ENABLED && ctx?.adapter) {
          logMountainSummary(ctx.adapter, iWidth, iHeight);
          logReliefAscii(ctx.adapter, iWidth, iHeight);
        }
      },
    });

    registry.register({
      id: "volcanoes",
      phase: M3_STANDARD_STAGE_PHASE.volcanoes,
      ...getStageDescriptor("volcanoes"),
      shouldRun: () => stageFlags.volcanoes,
      run: () => {
        assertFoundationContext(ctx, "volcanoes");

        layerAddVolcanoesPlateAware(ctx, volcanoOptions);

        // Dev: log volcano summary
        if (DEV.ENABLED && ctx?.adapter) {
          const volcanoId = ctx.adapter.getFeatureTypeIndex?.("FEATURE_VOLCANO") ?? -1;
          logVolcanoSummary(ctx.adapter, iWidth, iHeight, volcanoId);
        }
      },
    });

    registry.register({
      id: "lakes",
      phase: M3_STANDARD_STAGE_PHASE.lakes,
      ...getStageDescriptor("lakes"),
      shouldRun: () => stageFlags.lakes,
      run: () => {
        const iTilesPerLake = Math.max(10, (mapInfo.LakeGenerationFrequency ?? 5) * 2);
        this.orchestratorAdapter.generateLakes(iWidth, iHeight, iTilesPerLake);
        syncHeightfield(ctx);
      },
    });

    registry.register({
      id: "climateBaseline",
      phase: M3_STANDARD_STAGE_PHASE.climateBaseline,
      ...getStageDescriptor("climateBaseline"),
      shouldRun: () => stageFlags.climateBaseline,
      run: () => {
        // Mirror legacy: build elevation and refresh landmass regions before climate.
        this.orchestratorAdapter.recalculateAreas();
        this.orchestratorAdapter.buildElevation();

        const westRestamped = markLandmassRegionId(westContinent, LANDMASS_REGION.WEST, ctx.adapter);
        const eastRestamped = markLandmassRegionId(eastContinent, LANDMASS_REGION.EAST, ctx.adapter);
        ctx.adapter.recalculateAreas();
        ctx.adapter.stampContinents();
        console.log(
          `[landmass-plate] LandmassRegionId refreshed post-terrain: ${westRestamped} west (ID=${LANDMASS_REGION.WEST}), ${eastRestamped} east (ID=${LANDMASS_REGION.EAST})`
        );

        assertFoundationContext(ctx, "climateBaseline");
        applyClimateBaseline(iWidth, iHeight, ctx);
      },
    });

    registry.register({
      id: "storySwatches",
      phase: M3_STANDARD_STAGE_PHASE.storySwatches,
      ...getStageDescriptor("storySwatches"),
      shouldRun: () => false,
      run: () => {},
    });

    registry.register({
      id: "rivers",
      phase: M3_STANDARD_STAGE_PHASE.rivers,
      ...getStageDescriptor("rivers"),
      shouldRun: () => stageFlags.rivers,
      run: () => {
        const navigableRiverTerrain = NAVIGABLE_RIVER_TERRAIN;
        const logStats = (label: string) => {
          const w = iWidth;
          const h = iHeight;
          let flat = 0,
            hill = 0,
            mtn = 0,
            water = 0;
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              if (ctx.adapter.isWater(x, y)) {
                water++;
                continue;
              }
              const t = ctx.adapter.getTerrainType(x, y);
              if (t === MOUNTAIN_TERRAIN) mtn++;
              else if (t === HILL_TERRAIN) hill++;
              else flat++;
            }
          }
          const total = w * h;
          const land = Math.max(1, flat + hill + mtn);
          console.log(
            `[Rivers] ${label}: Land=${land} (${((land / total) * 100).toFixed(1)}%) ` +
              `Mtn=${((mtn / land) * 100).toFixed(1)}% ` +
              `Hill=${((hill / land) * 100).toFixed(1)}% ` +
              `Flat=${((flat / land) * 100).toFixed(1)}%`
          );
        };

        logStats("PRE-RIVERS");
        this.orchestratorAdapter.modelRivers(5, 15, navigableRiverTerrain);
        logStats("POST-MODELRIVERS");
        this.orchestratorAdapter.validateAndFixTerrain();
        logStats("POST-VALIDATE");
        syncHeightfield(ctx);
        syncClimateField(ctx);
        this.orchestratorAdapter.defineNamedRivers();
      },
    });

    registry.register({
      id: "storyCorridorsPost",
      phase: M3_STANDARD_STAGE_PHASE.storyCorridorsPost,
      ...getStageDescriptor("storyCorridorsPost"),
      shouldRun: () => false,
      run: () => {},
    });

    registry.register({
      id: "climateRefine",
      phase: M3_STANDARD_STAGE_PHASE.climateRefine,
      ...getStageDescriptor("climateRefine"),
      shouldRun: () => stageFlags.climateRefine,
      run: () => {
        assertFoundationContext(ctx, "climateRefine");
        refineClimateEarthlike(iWidth, iHeight, ctx);

        if (DEV.ENABLED && ctx?.adapter) {
          logRainfallStats(ctx.adapter, iWidth, iHeight, "post-climate");
        }
      },
    });

    registry.register({
      id: "biomes",
      phase: M3_STANDARD_STAGE_PHASE.biomes,
      ...getStageDescriptor("biomes"),
      shouldRun: () => stageFlags.biomes,
      run: () => {
        designateEnhancedBiomes(iWidth, iHeight, ctx);

        if (DEV.ENABLED && ctx?.adapter) {
          logBiomeSummary(ctx.adapter, iWidth, iHeight);
        }
      },
    });

    registry.register({
      id: "features",
      phase: M3_STANDARD_STAGE_PHASE.features,
      ...getStageDescriptor("features"),
      shouldRun: () => stageFlags.features,
      run: () => {
        addDiverseFeatures(iWidth, iHeight, ctx);
        this.orchestratorAdapter.validateAndFixTerrain();
        syncHeightfield(ctx);
        this.orchestratorAdapter.recalculateAreas();
      },
    });

    registry.register({
      id: "placement",
      phase: M3_STANDARD_STAGE_PHASE.placement,
      ...getStageDescriptor("placement"),
      shouldRun: () => stageFlags.placement,
      run: () => {
        // Store water data before placement
        this.orchestratorAdapter.storeWaterData();

        const positions = runPlacement(ctx.adapter, iWidth, iHeight, {
          mapInfo: mapInfo as { NumNaturalWonders?: number },
          wondersPlusOne: true,
          floodplains: { minLength: 4, maxLength: 10 },
          starts: {
            playersLandmass1: iNumPlayers1,
            playersLandmass2: iNumPlayers2,
            westContinent,
            eastContinent,
            startSectorRows: iStartSectorRows,
            startSectorCols: iStartSectorCols,
            startSectors,
          },
        });
        startPositions.push(...positions);
      },
    });

    const executor = new PipelineExecutor(registry, { logPrefix: `${prefix} [TaskGraph]` });
    const recipe = registry.getStandardRecipe(stageManifest);

    // Ensure all recipe steps are registered before starting.
    for (const stepId of recipe) {
      if (!registry.has(stepId)) {
        console.error(`${prefix} Missing registered step for "${stepId}"`);
        return { success: false, stageResults: this.stageResults, startPositions };
      }
    }

    try {
      const { stepResults } = executor.execute(ctx!, recipe);
      this.stageResults = stepResults.map((r) => ({
        stage: r.stepId,
        success: r.success,
        durationMs: r.durationMs,
        error: r.error,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`${prefix} TaskGraph execution failed: ${message}`, err);
      return { success: false, stageResults: this.stageResults, startPositions };
    }

    // Minimal smoke warning: enabled story stages should emit some tags.
    const storyStagesEnabled =
      stageFlags.storySeed ||
      stageFlags.storyHotspots ||
      stageFlags.storyRifts ||
      stageFlags.storyOrogeny ||
      stageFlags.storyCorridorsPre ||
      stageFlags.storySwatches ||
      stageFlags.storyCorridorsPost;
    if (DEV.ENABLED && storyStagesEnabled) {
      const tags = getStoryTags();
      const tagTotal =
        tags.hotspot.size +
        tags.hotspotParadise.size +
        tags.hotspotVolcanic.size +
        tags.riftLine.size +
        tags.riftShoulder.size +
        tags.activeMargin.size +
        tags.passiveShelf.size +
        tags.corridorSeaLane.size +
        tags.corridorIslandHop.size +
        tags.corridorLandOpen.size +
        tags.corridorRiverChain.size;
      if (tagTotal === 0) {
        devWarn("[smoke] story stages enabled but no story tags were emitted");
      }
    }

    console.log(`${prefix} === GenerateMap COMPLETE ===`);

    const success = this.stageResults.every((r) => r.success);
    return { success, stageResults: this.stageResults, startPositions };
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private resolveStageFlags(): Record<string, boolean> {
    const flags = {
      foundation: stageEnabled("foundation"),
      landmassPlates: stageEnabled("landmassPlates"),
      coastlines: stageEnabled("coastlines"),
      storySeed: stageEnabled("storySeed"),
      storyHotspots: stageEnabled("storyHotspots"),
      storyRifts: stageEnabled("storyRifts"),
      ruggedCoasts: stageEnabled("ruggedCoasts"),
      storyOrogeny: stageEnabled("storyOrogeny"),
      storyCorridorsPre: stageEnabled("storyCorridorsPre"),
      islands: stageEnabled("islands"),
      mountains: stageEnabled("mountains"),
      volcanoes: stageEnabled("volcanoes"),
      lakes: stageEnabled("lakes"),
      climateBaseline: stageEnabled("climateBaseline"),
      storySwatches: stageEnabled("storySwatches"),
      rivers: stageEnabled("rivers"),
      storyCorridorsPost: stageEnabled("storyCorridorsPost"),
      climateRefine: stageEnabled("climateRefine"),
      biomes: stageEnabled("biomes"),
      features: stageEnabled("features"),
      placement: stageEnabled("placement"),
    };

    // Validate resolver/orchestrator stage alignment (runs once per session)
    validateStageDrift(Object.keys(flags));

    return flags;
  }

  private runStage(name: string, fn: () => void): StageResult {
    const basePrefix = this.options.logPrefix || "[SWOOPER_MOD]";
    const nowMs = (): number => {
      try {
        if (typeof performance !== "undefined" && typeof performance.now === "function") {
          return performance.now();
        }
      } catch {
        // Fallback to Date.now()
      }
      return Date.now();
    };

    devLogIf("LOG_TIMING", `${basePrefix} [Stage] Starting ${name}`);
    const t0 = nowMs();

    try {
      fn();
      const durationMs = nowMs() - t0;
      devLogIf(
        "LOG_TIMING",
        `${basePrefix} [Stage] Completed ${name} (${durationMs.toFixed(2)}ms)`
      );
      return { stage: name, success: true, durationMs };
    } catch (err) {
      const durationMs = nowMs() - t0;
      const errorMessage = err instanceof Error ? err.message : String(err);
      const timingSuffix = DEV.ENABLED && DEV.LOG_TIMING
        ? ` (${durationMs.toFixed(2)}ms)`
        : "";
      console.error(
        `[MapOrchestrator][Stage:${name}] Failed${timingSuffix}: ${errorMessage}`,
        err
      );
      return { stage: name, success: false, durationMs, error: errorMessage };
    }
  }

  private bindWorldModelConfigProvider(): void {
    if (this.worldModelConfigBound) return;

    setConfigProvider((): WorldModelConfig => {
      const tunables = getTunables();
      return {
        plates: tunables.FOUNDATION_PLATES,
        dynamics: tunables.FOUNDATION_DYNAMICS,
        directionality: tunables.FOUNDATION_DIRECTIONALITY,
      };
    });

    this.worldModelConfigBound = true;
  }

  private initializeFoundation(
    ctx: ExtendedMapContext,
    tunables: ReturnType<typeof getTunables>
  ): FoundationContext {
    const prefix = this.options.logPrefix || "[SWOOPER_MOD]";
    console.log(`${prefix} Initializing foundation...`);

    // Ensure WorldModel pulls configuration from foundation tunables
    this.bindWorldModelConfigProvider();
    console.log(`${prefix} WorldModel.init() starting`);
    if (!WorldModel.init()) {
      throw new Error("WorldModel initialization failed");
    }
    console.log(`${prefix} WorldModel.init() succeeded`);
    ctx.worldModel = WorldModel as unknown as WorldModelState;

    const foundationCfg = tunables.FOUNDATION_CFG || {};
    console.log(`${prefix} createFoundationContext() starting`);
    const foundationContext = createFoundationContext(WorldModel as unknown as WorldModelState, {
      dimensions: ctx.dimensions,
      config: {
        seed: (foundationCfg.seed || {}) as Record<string, unknown>,
        plates: tunables.FOUNDATION_PLATES as Record<string, unknown>,
        dynamics: tunables.FOUNDATION_DYNAMICS as Record<string, unknown>,
        surface: (foundationCfg.surface || {}) as Record<string, unknown>,
        policy: (foundationCfg.policy || {}) as Record<string, unknown>,
        diagnostics: (foundationCfg.diagnostics || {}) as Record<string, unknown>,
      },
    });
    console.log(`${prefix} createFoundationContext() succeeded`);
    ctx.foundation = foundationContext;

    console.log(`${prefix} Foundation context initialized`);

    // Dev diagnostics for foundation (gated by DEV flags internally)
    if (DEV.ENABLED && ctx.adapter) {
      const plates: FoundationPlates = {
        plateId: foundationContext.plates.id,
        boundaryType: foundationContext.plates.boundaryType,
        boundaryCloseness: foundationContext.plates.boundaryCloseness,
        upliftPotential: foundationContext.plates.upliftPotential,
        riftPotential: foundationContext.plates.riftPotential,
      };
      logFoundationSummary(ctx.adapter, ctx.dimensions.width, ctx.dimensions.height, plates);
      logFoundationAscii(ctx.adapter, ctx.dimensions.width, ctx.dimensions.height, plates);
      logFoundationHistograms(ctx.dimensions.width, ctx.dimensions.height, plates);
      logBoundaryMetrics(ctx.adapter, ctx.dimensions.width, ctx.dimensions.height, plates);

      // Minimal smoke warning: foundation should produce at least one plate.
      const plateId = foundationContext.plates.id;
      if (!plateId || plateId.length === 0) {
        devWarn("[smoke] foundation enabled but produced empty plate data");
      } else {
        const uniquePlates = new Set<number>();
        for (let i = 0; i < plateId.length; i++) {
          uniquePlates.add(plateId[i]);
        }
        if (uniquePlates.size === 0) {
          devWarn("[smoke] foundation enabled but produced zero plates");
        }
      }
    }

    return foundationContext;
  }

  private createLayerAdapter(width: number, height: number): EngineAdapter {
    // Priority 1: Use pre-built adapter if provided
    if (this.options.adapter) {
      return this.options.adapter;
    }

    // Priority 2: Use custom factory if provided
    if (this.options.createAdapter) {
      return this.options.createAdapter(width, height);
    }

    // Priority 3: Default to Civ7Adapter from @civ7/adapter
    // This is the production adapter that wraps GameplayMap, TerrainBuilder, etc.
    return new Civ7Adapter(width, height);
  }

  private createDefaultContinentBounds(
    width: number,
    height: number,
    side: "west" | "east"
  ): ContinentBounds {
    const avoidSeamOffset = 4; // g_AvoidSeamOffset
    const polarWaterRows = 2; // g_PolarWaterRows

    if (side === "west") {
      return {
        west: avoidSeamOffset,
        east: Math.floor(width / 2) - avoidSeamOffset,
        south: polarWaterRows,
        north: height - polarWaterRows,
        continent: 0,
      };
    }
    return {
      west: Math.floor(width / 2) + avoidSeamOffset,
      east: width - avoidSeamOffset,
      south: polarWaterRows,
      north: height - polarWaterRows,
      continent: 1,
    };
  }

  private windowToContinentBounds(window: LandmassWindow, continent: number): ContinentBounds {
    return {
      west: window.west,
      east: window.east,
      south: window.south,
      north: window.north,
      continent: window.continent ?? continent,
    };
  }

  private buildMountainOptions(config: MountainsConfig): MountainsConfig {
    return {
      tectonicIntensity: config.tectonicIntensity ?? 1.0,
      // Defaults are aligned with the crust-first collision-only formulation in
      // layers/mountains.ts. If callers supply overrides, those values will be
      // used instead.
      mountainThreshold: config.mountainThreshold ?? 0.58,
      hillThreshold: config.hillThreshold ?? 0.32,
      upliftWeight: config.upliftWeight ?? 0.35,
      fractalWeight: config.fractalWeight ?? 0.15,
      riftDepth: config.riftDepth ?? 0.2,
      boundaryWeight: config.boundaryWeight ?? 1.0,
      boundaryExponent: config.boundaryExponent ?? 1.6,
      interiorPenaltyWeight: config.interiorPenaltyWeight ?? 0.0,
      convergenceBonus: config.convergenceBonus ?? 1.0,
      transformPenalty: config.transformPenalty ?? 0.6,
      riftPenalty: config.riftPenalty ?? 1.0,
      hillBoundaryWeight: config.hillBoundaryWeight ?? 0.35,
      hillRiftBonus: config.hillRiftBonus ?? 0.25,
      hillConvergentFoothill: config.hillConvergentFoothill ?? 0.35,
      hillInteriorFalloff: config.hillInteriorFalloff ?? 0.1,
      hillUpliftWeight: config.hillUpliftWeight ?? 0.2,
    };
  }

  private buildVolcanoOptions(config: VolcanoesConfig): VolcanoesConfig {
    return {
      enabled: config.enabled ?? true,
      baseDensity: config.baseDensity ?? 1 / 170,
      minSpacing: config.minSpacing ?? 3,
      boundaryThreshold: config.boundaryThreshold ?? 0.35,
      boundaryWeight: config.boundaryWeight ?? 1.2,
      convergentMultiplier: config.convergentMultiplier ?? 2.4,
      transformMultiplier: config.transformMultiplier ?? 1.1,
      divergentMultiplier: config.divergentMultiplier ?? 0.35,
      hotspotWeight: config.hotspotWeight ?? 0.12,
      shieldPenalty: config.shieldPenalty ?? 0.6,
      randomJitter: config.randomJitter ?? 0.08,
      minVolcanoes: config.minVolcanoes ?? 5,
      maxVolcanoes: config.maxVolcanoes ?? 40,
    };
  }
}

// ============================================================================
// Module Exports
// ============================================================================

export default MapOrchestrator;
