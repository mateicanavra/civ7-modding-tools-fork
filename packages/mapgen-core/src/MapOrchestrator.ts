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
 *   import { MapOrchestrator } from '@swooper/mapgen-core';
 *   import { CivEngineAdapter } from '@civ7/adapter';
 *
 *   const orchestrator = new MapOrchestrator();
 *   engine.on('RequestMapInitData', () => orchestrator.requestMapData());
 *   engine.on('GenerateMap', () => orchestrator.generateMap());
 */

import type { EngineAdapter } from "@civ7/adapter";
import { Civ7Adapter } from "@civ7/adapter/civ7";
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
import { addPlotTagsSimple, type TerrainBuilderLike } from "./core/plot-tags.js";
import { getTunables, resetTunables, stageEnabled } from "./bootstrap/tunables.js";
import { validateStageDrift } from "./bootstrap/resolved.js";
import { resetStoryTags } from "./story/tags.js";
import { WorldModel } from "./world/model.js";

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
  timeSection,
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
): asserts ctx is ExtendedMapContext & { foundation: NonNullable<ExtendedMapContext["foundation"]> } {
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
// Timing Utilities
// ============================================================================

/** Simple timing helper for stage execution (always logs, unlike DEV timing) */
function stageTimeStart(label: string): { label: string; start: number } {
  console.log(`[SWOOPER_MOD] Starting: ${label}`);
  return { label, start: Date.now() };
}

/** End stage timing and return elapsed ms */
function stageTimeEnd(timer: { label: string; start: number }): number {
  const elapsed = Date.now() - timer.start;
  console.log(`[SWOOPER_MOD] Completed: ${timer.label} (${elapsed}ms)`);
  return elapsed;
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
    getGridWidth: () =>
      typeof GameplayMap !== "undefined" ? GameplayMap.getGridWidth() : 0,
    getGridHeight: () =>
      typeof GameplayMap !== "undefined" ? GameplayMap.getGridHeight() : 0,
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
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require("/base-standard/maps/assign-starting-plots.js") as {
          chooseStartSectors?: (p1: number, p2: number, r: number, c: number, h: boolean) => unknown[];
        };
        if (mod?.chooseStartSectors) {
          return mod.chooseStartSectors(players1, players2, rows, cols, humanNearEquator);
        }
      } catch {
        console.log("[MapOrchestrator] chooseStartSectors not available");
      }
      return [];
    },
    needHumanNearEquator: () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require("/base-standard/maps/map-utilities.js") as {
          needHumanNearEquator?: () => boolean;
        };
        if (mod?.needHumanNearEquator) {
          return mod.needHumanNearEquator();
        }
      } catch {
        console.log("[MapOrchestrator] needHumanNearEquator not available");
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
 */
export class MapOrchestrator {
  private config: OrchestratorConfig;
  private adapter: OrchestratorAdapter;
  private stageResults: StageResult[] = [];

  constructor(config: OrchestratorConfig = {}) {
    this.config = config;
    this.adapter = resolveOrchestratorAdapter();
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
    const prefix = this.config.logPrefix || "[SWOOPER_MOD]";
    console.log(`${prefix} === RequestMapInitData ===`);

    // Get map size and info: use config defaults if provided (for testing),
    // otherwise query game settings
    let mapSizeId: number;
    let mapInfo: MapInfo | null;

    if (this.config.mapSizeDefaults) {
      // Testing mode: use provided defaults
      mapSizeId = this.config.mapSizeDefaults.mapSizeId ?? 0;
      mapInfo = this.config.mapSizeDefaults.mapInfo ?? null;
      console.log(`${prefix} Using test mapSizeDefaults`);
    } else {
      // Production mode: query game settings
      mapSizeId = this.adapter.getMapSize();
      mapInfo = this.adapter.lookupMapInfo(mapSizeId);
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
    console.log(`${prefix} MapInfo: GridWidth=${gameWidth}, GridHeight=${gameHeight}, Lat=[${gameMinLat}, ${gameMaxLat}]`);

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
    console.log(`${prefix} Final latitude range: ${params.bottomLatitude} to ${params.topLatitude}`);

    this.adapter.setMapInitData(params);
  }

  /**
   * Handle GenerateMap event.
   * Runs the full generation pipeline.
   */
  generateMap(): GenerationResult {
    const prefix = this.config.logPrefix || "[SWOOPER_MOD]";
    console.log(`${prefix} === GenerateMap ===`);

    this.stageResults = [];
    const startPositions: number[] = [];

    // Enable dev diagnostics so engine surface introspection and other DEV
    // helpers can run during this generation pass.
    initDevFlags({ enabled: true });

    // Refresh configuration and world state
    resetTunables();
    const tunables = getTunables();
    console.log(`${prefix} Tunables rebound successfully`);

    // Reset WorldModel to ensure fresh state for this generation run
    // This clears any stale plate/dynamics data from previous runs
    WorldModel.reset();

    // Get map dimensions
    const iWidth = this.adapter.getGridWidth();
    const iHeight = this.adapter.getGridHeight();
    const uiMapSize = this.adapter.getMapSize();
    const mapInfo = this.adapter.lookupMapInfo(uiMapSize);

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
    const foundationCfg = tunables.FOUNDATION_CFG || {};
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
      ctx = createExtendedMapContext(
        { width: iWidth, height: iHeight },
        layerAdapter,
        {
          toggles: {
            STORY_ENABLE_HOTSPOTS: stageFlags.storyHotspots,
            STORY_ENABLE_RIFTS: stageFlags.storyRifts,
            STORY_ENABLE_OROGENY: stageFlags.storyOrogeny,
            STORY_ENABLE_SWATCHES: stageFlags.storySwatches,
            STORY_ENABLE_PALEO: false,
            STORY_ENABLE_CORRIDORS: stageFlags.storyCorridorsPre || stageFlags.storyCorridorsPost,
          },
        }
      );
      console.log(`${prefix} MapContext created successfully`);
    } catch (err) {
      console.error(`${prefix} Failed to create context:`, err);
      return { success: false, stageResults: this.stageResults, startPositions };
    }

    // Initialize WorldModel and FoundationContext
    // Note: foundationContext stored for potential future use in story stages
    if (stageFlags.foundation && ctx) {
      this.initializeFoundation(ctx, tunables);
    }

    // Set up start sectors
    const iNumPlayers1 = mapInfo.PlayersLandmass1 ?? 4;
    const iNumPlayers2 = mapInfo.PlayersLandmass2 ?? 4;
    const iStartSectorRows = mapInfo.StartSectorRows ?? 4;
    const iStartSectorCols = mapInfo.StartSectorCols ?? 4;
    const bHumanNearEquator = this.adapter.needHumanNearEquator();
    const startSectors = this.adapter.chooseStartSectors(
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
        });
        windows = separationResult.windows;

        // Apply post-adjustments
        windows = applyLandmassPostAdjustments(windows, landmassCfg.geometry, iWidth, iHeight);

        // Update continent bounds from windows
        if (windows.length >= 2) {
          const first = windows[0];
          const last = windows[windows.length - 1];
          if (first && last) {
            westContinent = this.windowToContinentBounds(first, 0);
            eastContinent = this.windowToContinentBounds(last, 1);
          }
        }

        // Validate and stamp continents
        this.adapter.validateAndFixTerrain();
        this.adapter.recalculateAreas();
        this.adapter.stampContinents();

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
        this.adapter.expandCoasts(iWidth, iHeight);
      });
      this.stageResults.push(stageResult);
    }

    // ========================================================================
    // Stage: Story Seed (Continental Margins)
    // ========================================================================
    if (stageFlags.storySeed && ctx) {
      const stageResult = this.runStage("storySeed", () => {
        resetStoryTags();
        console.log(`${prefix} Imprinting continental margins (active/passive)...`);
        // Story tagging functions would be called here
      });
      this.stageResults.push(stageResult);
    }

    // ========================================================================
    // Stage: Rugged Coastlines
    // ========================================================================
    if (stageFlags.coastlines && ctx) {
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
        this.adapter.generateLakes(iWidth, iHeight, iTilesPerLake);
        syncHeightfield(ctx!);
      });
      this.stageResults.push(stageResult);
    }

    // Build elevation after terrain modifications
    this.adapter.recalculateAreas();
    this.adapter.buildElevation();

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
      const navigableRiverTerrain = 3; // g_NavigableRiverTerrain
      const stageResult = this.runStage("rivers", () => {
        this.adapter.modelRivers(5, 15, navigableRiverTerrain);
        this.adapter.validateAndFixTerrain();
        syncHeightfield(ctx!);
        syncClimateField(ctx!);
        this.adapter.defineNamedRivers();
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
        this.adapter.validateAndFixTerrain();
        syncHeightfield(ctx!);
        this.adapter.recalculateAreas();
      });
      this.stageResults.push(stageResult);
    }

    // Store water data before placement
    this.adapter.storeWaterData();

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
    const timer = stageTimeStart(name);
    try {
      fn();
      const durationMs = stageTimeEnd(timer);
      return { stage: name, success: true, durationMs };
    } catch (err) {
      const durationMs = stageTimeEnd(timer);
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[MapOrchestrator] Stage "${name}" failed:`, err);
      return { stage: name, success: false, durationMs, error: errorMessage };
    }
  }

  private initializeFoundation(
    ctx: ExtendedMapContext,
    tunables: ReturnType<typeof getTunables>
  ): FoundationContext | null {
    const prefix = this.config.logPrefix || "[SWOOPER_MOD]";
    console.log(`${prefix} Initializing foundation...`);
    try {
      console.log(`${prefix} WorldModel.init() starting`);
      if (!WorldModel.init()) {
        throw new Error("WorldModel initialization failed");
      }
      console.log(`${prefix} WorldModel.init() succeeded`);
      ctx.worldModel = WorldModel as unknown as WorldModelState;

      const foundationCfg = tunables.FOUNDATION_CFG || {};
      console.log(`${prefix} createFoundationContext() starting`);
      const foundationContext = createFoundationContext(
        WorldModel as unknown as WorldModelState,
        {
          dimensions: ctx.dimensions,
          config: {
            seed: (foundationCfg.seed || {}) as Record<string, unknown>,
            plates: tunables.FOUNDATION_PLATES as Record<string, unknown>,
            dynamics: tunables.FOUNDATION_DYNAMICS as Record<string, unknown>,
            surface: (foundationCfg.surface || {}) as Record<string, unknown>,
            policy: (foundationCfg.policy || {}) as Record<string, unknown>,
            diagnostics: (foundationCfg.diagnostics || {}) as Record<string, unknown>,
          },
        }
      );
      console.log(`${prefix} createFoundationContext() succeeded`);
      ctx.foundation = foundationContext;

      console.log(`${prefix} Foundation context initialized`);

      // Dev diagnostics for foundation
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
      }

      return foundationContext;
    } catch (err) {
      console.error(`${prefix} Failed to initialize foundation:`, err);
      return null;
    }
  }

  private createLayerAdapter(width: number, height: number): EngineAdapter {
    // Priority 1: Use pre-built adapter if provided
    if (this.config.adapter) {
      return this.config.adapter;
    }

    // Priority 2: Use custom factory if provided
    if (this.config.createAdapter) {
      return this.config.createAdapter(width, height);
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
      mountainThreshold: config.mountainThreshold ?? 0.45,
      hillThreshold: config.hillThreshold ?? 0.25,
      upliftWeight: config.upliftWeight ?? 0.75,
      fractalWeight: config.fractalWeight ?? 0.25,
      riftDepth: config.riftDepth ?? 0.3,
      boundaryWeight: config.boundaryWeight ?? 0.6,
      boundaryExponent: config.boundaryExponent ?? 1.4,
      interiorPenaltyWeight: config.interiorPenaltyWeight ?? 0.2,
      convergenceBonus: config.convergenceBonus ?? 0.9,
      transformPenalty: config.transformPenalty ?? 0.3,
      riftPenalty: config.riftPenalty ?? 0.75,
      hillBoundaryWeight: config.hillBoundaryWeight ?? 0.45,
      hillRiftBonus: config.hillRiftBonus ?? 0.5,
      hillConvergentFoothill: config.hillConvergentFoothill ?? 0.25,
      hillInteriorFalloff: config.hillInteriorFalloff ?? 0.2,
      hillUpliftWeight: config.hillUpliftWeight ?? 0.25,
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
