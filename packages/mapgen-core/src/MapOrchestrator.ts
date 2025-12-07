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
import type {
  LandmassConfig,
  MountainsConfig,
  VolcanoesConfig,
  ContinentBounds,
  MapConfig,
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
import { setConfig, getConfig } from "./bootstrap/runtime.js";
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
  NumNaturalWonders?: number;
  LakeGenerationFrequency?: number;
  PlayersLandmass1?: number;
  PlayersLandmass2?: number;
  StartSectorRows?: number;
  StartSectorCols?: number;
  [key: string]: unknown;
}

/** Orchestrator configuration */
export interface OrchestratorConfig {
  /** Custom adapter factory (defaults to CivEngineAdapter) */
  createAdapter?: (width: number, height: number) => EngineAdapter;
  /** Log prefix for console output */
  logPrefix?: string;
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

// ============================================================================
// Timing Utilities
// ============================================================================

function timeStart(label: string): { label: string; start: number } {
  console.log(`[SWOOPER_MOD] Starting: ${label}`);
  return { label, start: Date.now() };
}

function timeEnd(timer: { label: string; start: number }): number {
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
   * Sets map dimensions and latitude parameters.
   */
  requestMapData(initParams?: Partial<MapInitParams>): void {
    const prefix = this.config.logPrefix || "[SWOOPER_MOD]";
    console.log(`${prefix} === RequestMapInitData ===`);

    const params: MapInitParams = {
      width: initParams?.width ?? 84,
      height: initParams?.height ?? 54,
      topLatitude: initParams?.topLatitude ?? 80,
      bottomLatitude: initParams?.bottomLatitude ?? -80,
      wrapX: initParams?.wrapX ?? true,
      wrapY: initParams?.wrapY ?? false,
    };

    console.log(`${prefix} Map dimensions: ${params.width} x ${params.height}`);
    console.log(`${prefix} Latitude range: ${params.bottomLatitude} to ${params.topLatitude}`);

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

    // 1. Get map dimensions first (before tunables bind)
    const iWidth = this.adapter.getGridWidth();
    const iHeight = this.adapter.getGridHeight();
    const uiMapSize = this.adapter.getMapSize();
    const mapInfo = this.adapter.lookupMapInfo(uiMapSize);

    if (!mapInfo) {
      console.error(`${prefix} Failed to lookup map info`);
      return { success: false, stageResults: this.stageResults, startPositions };
    }

    console.log(`${prefix} Map size: ${iWidth}x${iHeight}`);

    // ------------------------------------------------------------------------
    // FIX: DYNAMIC PLATE SCALING
    // Calculate target plates based on area to ensure stability gradients exist.
    // Factor 0.0025 yields ~9 plates for Standard (74x46) and ~18 for Huge (106x66).
    // On larger maps, static 8 plates create massive interiors where all tiles
    // share the same maximum stability score, causing landmass generation to fail.
    // ------------------------------------------------------------------------
    const targetPlates = Math.max(8, Math.round(iWidth * iHeight * 0.0025));
    console.log(`${prefix} Auto-scaling: Setting plate count to ${targetPlates} for size ${iWidth}x${iHeight}`);

    // Update runtime config, preserving any existing overrides
    const currentConfig = getConfig();
    const newConfig: MapConfig = {
      ...currentConfig,
      foundation: {
        ...(currentConfig.foundation || {}),
        plates: {
          ...(currentConfig.foundation?.plates || {}),
          count: targetPlates,
        },
      },
    };
    setConfig(newConfig);

    // 2. Rebind Tunables (Now picks up the new plate count)
    resetTunables();
    const tunables = getTunables();
    console.log(`${prefix} Tunables rebound successfully`);

    // Get stage configuration
    const stageFlags = this.resolveStageFlags();

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
        const plateResult = createPlateDrivenLandmasses(iWidth, iHeight, ctx!, {
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
          context: ctx!,
          adapter: ctx!.adapter,
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
        addPlotTagsSimple(iHeight, iWidth, eastContinent.west, ctx!.adapter, terrainBuilder);
      });
      this.stageResults.push(stageResult);
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
        layerAddMountainsPhysics(ctx!, mountainOptions);
      });
      this.stageResults.push(stageResult);
    }

    // ========================================================================
    // Stage: Volcanoes
    // ========================================================================
    if (stageFlags.volcanoes && ctx) {
      const stageResult = this.runStage("volcanoes", () => {
        layerAddVolcanoesPlateAware(ctx!, volcanoOptions);
      });
      this.stageResults.push(stageResult);
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
        applyClimateBaseline(iWidth, iHeight, ctx!);
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
        refineClimateEarthlike(iWidth, iHeight, ctx!);
      });
      this.stageResults.push(stageResult);
    }

    // ========================================================================
    // Stage: Biomes
    // ========================================================================
    if (stageFlags.biomes && ctx) {
      const stageResult = this.runStage("biomes", () => {
        designateEnhancedBiomes(iWidth, iHeight);
      });
      this.stageResults.push(stageResult);
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
    if (stageFlags.placement) {
      const stageResult = this.runStage("placement", () => {
        const positions = runPlacement(iWidth, iHeight, {
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
    return {
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
  }

  private runStage(name: string, fn: () => void): StageResult {
    const timer = timeStart(name);
    try {
      fn();
      const durationMs = timeEnd(timer);
      return { stage: name, success: true, durationMs };
    } catch (err) {
      const durationMs = timeEnd(timer);
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
    try {
      if (!WorldModel.init()) {
        throw new Error("WorldModel initialization failed");
      }
      ctx.worldModel = WorldModel as unknown as WorldModelState;

      const foundationCfg = tunables.FOUNDATION_CFG || {};
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
      ctx.foundation = foundationContext;

      console.log(`${prefix} Foundation context initialized`);
      return foundationContext;
    } catch (err) {
      console.error(`${prefix} Failed to initialize foundation:`, err);
      return null;
    }
  }

  private createLayerAdapter(width: number, height: number): EngineAdapter {
    if (this.config.createAdapter) {
      return this.config.createAdapter(width, height);
    }

    // Default: try to import CivEngineAdapter
    try {
      // Dynamic import to avoid circular dependencies
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const adaptersModule = require("./core/adapters.js");
      if (adaptersModule?.CivEngineAdapter) {
        return new adaptersModule.CivEngineAdapter(width, height);
      }
    } catch {
      // Fallback: create minimal adapter
    }

    // Fallback minimal adapter using globals
    return this.createFallbackAdapter(width, height);
  }

  private createFallbackAdapter(width: number, height: number): EngineAdapter {
    return {
      width,
      height,
      isWater: (x, y) =>
        typeof GameplayMap !== "undefined" ? GameplayMap.isWater(x, y) : true,
      isMountain: (x, y) =>
        typeof GameplayMap !== "undefined" ? GameplayMap.isMountain(x, y) : false,
      isAdjacentToRivers: () => false,
      getElevation: (x, y) =>
        typeof GameplayMap !== "undefined" ? GameplayMap.getElevation?.(x, y) ?? 0 : 0,
      getTerrainType: (x, y) =>
        typeof GameplayMap !== "undefined" ? GameplayMap.getTerrainType(x, y) : 0,
      getRainfall: (x, y) =>
        typeof GameplayMap !== "undefined" ? GameplayMap.getRainfall?.(x, y) ?? 0 : 0,
      getTemperature: (x, y) =>
        typeof GameplayMap !== "undefined" ? GameplayMap.getTemperature?.(x, y) ?? 15 : 15,
      getLatitude: (x, y) =>
        typeof GameplayMap !== "undefined"
          ? ((GameplayMap as unknown as { getLatitude?: (x: number, y: number) => number }).getLatitude?.(x, y) ?? 0)
          : 0,
      setTerrainType: (x, y, t) => {
        if (typeof TerrainBuilder !== "undefined" && TerrainBuilder?.setTerrainType) {
          TerrainBuilder.setTerrainType(x, y, t);
        }
      },
      setRainfall: (x, y, r) => {
        if (typeof TerrainBuilder !== "undefined" && TerrainBuilder?.setRainfall) {
          TerrainBuilder.setRainfall(x, y, r);
        }
      },
      setElevation: (x, y, e) => {
        if (typeof TerrainBuilder !== "undefined" && TerrainBuilder?.setElevation) {
          TerrainBuilder.setElevation(x, y, e);
        }
      },
      getFeatureType: (x, y) =>
        typeof GameplayMap !== "undefined" ? GameplayMap.getFeatureType?.(x, y) ?? -1 : -1,
      setFeatureType: (x, y, data) => {
        if (typeof TerrainBuilder !== "undefined" && TerrainBuilder?.setFeatureType) {
          TerrainBuilder.setFeatureType(x, y, data);
        }
      },
      canHaveFeature: () => true,
      getRandomNumber: (max) => Math.floor(Math.random() * max),
      validateAndFixTerrain: () => this.adapter.validateAndFixTerrain(),
      recalculateAreas: () => this.adapter.recalculateAreas(),
      createFractal: (id, w, h, grain, flags) => {
        const tb = TerrainBuilder as unknown as {
          createFractal?: (id: number, w: number, h: number, grain: number, flags: number) => void;
        };
        if (typeof TerrainBuilder !== "undefined" && tb.createFractal) {
          tb.createFractal(id, w, h, grain, flags);
        }
      },
      getFractalHeight: (id, x, y) => {
        const tb = TerrainBuilder as unknown as {
          getFractalHeight?: (id: number, x: number, y: number) => number;
        };
        if (typeof TerrainBuilder !== "undefined" && tb.getFractalHeight) {
          return tb.getFractalHeight(id, x, y);
        }
        return 0;
      },
      stampContinents: () => this.adapter.stampContinents(),
      buildElevation: () => this.adapter.buildElevation(),
      modelRivers: (min, max, nav) => this.adapter.modelRivers(min, max, nav),
      defineNamedRivers: () => this.adapter.defineNamedRivers(),
      storeWaterData: () => this.adapter.storeWaterData(),
    };
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
