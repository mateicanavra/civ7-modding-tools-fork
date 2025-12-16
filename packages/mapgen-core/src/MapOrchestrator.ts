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
 *     const config = bootstrap({ stageConfig: { foundation: true } });
 *     const orchestrator = new MapOrchestrator(config, { logPrefix: '[MOD]' });
 *     orchestrator.requestMapData();
 *   });
 *
 *   engine.on('GenerateMap', () => {
 *     const config = bootstrap({
 *       stageConfig: {
 *         foundation: true,
 *         landmassPlates: true,
 *         coastlines: true,
 *         mountains: true,
 *         volcanoes: true,
 *         climateBaseline: true,
 *         rivers: true,
 *         climateRefine: true,
 *         biomes: true,
 *         features: true,
 *         placement: true,
 *       },
 *       overrides: { ... },
 *     });
 *     const orchestrator = new MapOrchestrator(config, { logPrefix: '[MOD]' });
 *     orchestrator.generateMap();
 *   });
 */

import type { EngineAdapter, MapInfo, MapInitParams, MapSizeId } from "@civ7/adapter";
import { Civ7Adapter, createCiv7Adapter } from "@civ7/adapter/civ7";

export type { MapInfo, MapInitParams } from "@civ7/adapter";
import type { MapGenConfig } from "./config/index.js";
import type {
  LandmassConfig,
  MountainsConfig,
  VolcanoesConfig,
  ContinentBounds,
  StartsConfig,
} from "./bootstrap/types.js";
import type { ExtendedMapContext, FoundationContext } from "./core/types.js";
import type { WorldModelState } from "./world/types.js";

import { createExtendedMapContext, createFoundationContext } from "./core/types.js";
import {
  isStageEnabled,
  validateStageDrift,
} from "./bootstrap/resolved.js";
import { getStoryTags, resetStoryTags } from "./domain/narrative/tags/index.js";
import { resetStoryOverlays } from "./domain/narrative/overlays/index.js";
import { resetOrogenyCache } from "./domain/narrative/orogeny/index.js";
import { resetCorridorStyleCache } from "./domain/narrative/corridors/index.js";
import { WorldModel, setConfigProvider, type WorldModelConfig } from "./world/index.js";
import {
  PipelineExecutor,
  StepRegistry,
  MissingDependencyError,
  UnsatisfiedProvidesError,
  registerStandardLibrary,
} from "./pipeline/index.js";
import {
  computeRiverAdjacencyMask,
  publishClimateFieldArtifact,
  publishHeightfieldArtifact,
  publishRiverAdjacencyArtifact,
} from "./pipeline/artifacts.js";

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

/**
 * Map size defaults for testing (bypasses game settings).
 *
 * When provided via OrchestratorConfig.mapSizeDefaults, these values
 * bypass GameplayMap.getMapSize() and GameInfo.Maps.lookup() calls,
 * allowing tests to control map dimensions without engine globals.
 */
export interface MapSizeDefaults {
  /**
   * Map size selection key as returned by GameplayMap.getMapSize().
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
   * When set, bypasses GameplayMap.getMapSize() and GameInfo.Maps.lookup().
   * Test harnesses must provide concrete dimensions/latitudes via `mapInfo`.
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
   * Flow: adapter.getMapSizeId() → adapter.lookupMapInfo() → extract dimensions
   * This replaces the previous hard-coded 84×54 approach (CIV-22).
   *
   * For testing, use `options.mapSizeDefaults` to bypass game settings.
   */
  requestMapData(initParams?: Partial<MapInitParams>): void {
    const prefix = this.options.logPrefix || "[SWOOPER_MOD]";
    console.log(`${prefix} === RequestMapInitData ===`);

    // Get map size and info: use provided defaults (for testing),
    // otherwise query game settings
    let mapSizeId: MapSizeId;
    let mapInfo: MapInfo | null;

    if (this.options.mapSizeDefaults) {
      // Testing mode: use provided defaults
      mapSizeId = this.options.mapSizeDefaults.mapSizeId ?? 0;
      mapInfo = this.options.mapSizeDefaults.mapInfo;
      console.log(`${prefix} Using test mapSizeDefaults`);
    } else {
      // Production mode: query game settings via adapter boundary
      const adapter = this.options.adapter ?? createCiv7Adapter();
      mapSizeId = adapter.getMapSizeId();
      mapInfo = adapter.lookupMapInfo(mapSizeId);
    }

    if (!mapInfo) {
      throw new Error(
        `${prefix} Failed to resolve mapInfo for mapSizeId=${String(mapSizeId)}. ` +
          `In tests, provide options.mapSizeDefaults.mapInfo; in-engine, ensure GameInfo.Maps.lookup is available.`
      );
    }

    const resolvedWidth = initParams?.width ?? mapInfo.GridWidth;
    const resolvedHeight = initParams?.height ?? mapInfo.GridHeight;
    const resolvedTopLatitude = initParams?.topLatitude ?? mapInfo.MaxLatitude;
    const resolvedBottomLatitude = initParams?.bottomLatitude ?? mapInfo.MinLatitude;

    if (resolvedWidth == null || resolvedHeight == null) {
      throw new Error(
        `${prefix} Missing map dimensions. Provide initParams.width/height or include GridWidth/GridHeight in mapInfo.`
      );
    }
    if (resolvedTopLatitude == null || resolvedBottomLatitude == null) {
      throw new Error(
        `${prefix} Missing map latitude bounds. Provide initParams.topLatitude/bottomLatitude or include MaxLatitude/MinLatitude in mapInfo.`
      );
    }

    console.log(`${prefix} Map size ID: ${mapSizeId}`);
    console.log(
      `${prefix} MapInfo: GridWidth=${resolvedWidth}, GridHeight=${resolvedHeight}, Lat=[${resolvedBottomLatitude}, ${resolvedTopLatitude}]`
    );

    // Build params: explicit overrides take precedence over game settings
    const params: MapInitParams = {
      width: resolvedWidth,
      height: resolvedHeight,
      topLatitude: resolvedTopLatitude,
      bottomLatitude: resolvedBottomLatitude,
      wrapX: initParams?.wrapX ?? true,
      wrapY: initParams?.wrapY ?? false,
    };

    console.log(`${prefix} Final dimensions: ${params.width} x ${params.height}`);
    console.log(
      `${prefix} Final latitude range: ${params.bottomLatitude} to ${params.topLatitude}`
    );

    const adapter = this.options.adapter ?? createCiv7Adapter();
    adapter.setMapInitData(params);
  }

  /**
   * Handle GenerateMap event.
   * Runs the full generation pipeline.
   */
  generateMap(): GenerationResult {
    return this.generateMapTaskGraph();
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

    const config = this.mapGenConfig;

    // Initialize DEV flags from stable-slice diagnostics config.
    resetDevFlags();
    const rawDiagnostics = (config.foundation?.diagnostics || {}) as Record<string, unknown>;
    const diagnosticsConfig = { ...rawDiagnostics } as DevLogConfig;
    const hasTruthyFlag = Object.entries(diagnosticsConfig).some(
      ([key, value]) => key !== "enabled" && value === true
    );
    if (diagnosticsConfig.enabled === undefined && hasTruthyFlag) {
      diagnosticsConfig.enabled = true;
    }
    initDevFlags(diagnosticsConfig);

    // Reset WorldModel to ensure fresh state for this generation run
    WorldModel.reset();

    const mapInfoAdapter = this.options.adapter ?? createCiv7Adapter();

    // Get map dimensions
    const iWidth = mapInfoAdapter.width;
    const iHeight = mapInfoAdapter.height;

    // Get map size and info: use config defaults if provided (for testing),
    // otherwise query game settings via adapter boundary
    let uiMapSize: MapSizeId;
    let mapInfo: MapInfo | null;

    const mapSizeDefaults = this.options.mapSizeDefaults;

    if (mapSizeDefaults) {
      uiMapSize = mapSizeDefaults.mapSizeId ?? 0;
      mapInfo = mapSizeDefaults.mapInfo;
    } else {
      uiMapSize = mapInfoAdapter.getMapSizeId();
      mapInfo = mapInfoAdapter.lookupMapInfo(uiMapSize);
    }

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

    // Layer configuration
    const landmassCfg = config.landmass ?? {};
    const mountainOptions = (config.mountains ?? {}) as MountainsConfig;
    const volcanoOptions = (config.volcanoes ?? {}) as VolcanoesConfig;

    // Create context with adapter
    let ctx: ExtendedMapContext | null = null;
    try {
      const layerAdapter = this.createLayerAdapter(iWidth, iHeight);
      ctx = createExtendedMapContext(
        { width: iWidth, height: iHeight },
        layerAdapter,
        config
      );
      console.log(`${prefix} MapContext created successfully`);
    } catch (err) {
      console.error(`${prefix} Failed to create context:`, err);
      return { success: false, stageResults: this.stageResults, startPositions };
    }

    // Reset story state once per generation to prevent cross-run leakage.
    resetStoryTags(ctx);
    resetStoryOverlays(ctx);
    resetOrogenyCache(ctx);
    resetCorridorStyleCache(ctx);

    // Set up start sectors (placement consumes these)
    const iNumPlayers1 = mapInfo.PlayersLandmass1 ?? 4;
    const iNumPlayers2 = mapInfo.PlayersLandmass2 ?? 4;
    const iStartSectorRows = mapInfo.StartSectorRows ?? 4;
    const iStartSectorCols = mapInfo.StartSectorCols ?? 4;
    const bHumanNearEquator = ctx!.adapter.needHumanNearEquator();
    const startSectors = ctx!.adapter.chooseStartSectors(
      iNumPlayers1,
      iNumPlayers2,
      iStartSectorRows,
      iStartSectorCols,
      bHumanNearEquator
    );
    console.log(`${prefix} Start sectors chosen successfully`);

    // Mutable landmass bounds used by placement (wrap-first state)
    const westContinent = this.createDefaultContinentBounds(iWidth, iHeight, "west");
    const eastContinent = this.createDefaultContinentBounds(iWidth, iHeight, "east");

    const registry = new StepRegistry<ExtendedMapContext>();
    const stageManifest = config.stageManifest ?? { order: [], stages: {} };

    const getStageDescriptor = (
      stageName: string
    ): { requires: readonly string[]; provides: readonly string[] } => {
      const desc = stageManifest.stages?.[stageName] ?? {};
      const requires = Array.isArray(desc.requires) ? desc.requires : [];
      const provides = Array.isArray(desc.provides) ? desc.provides : [];
      return { requires, provides };
    };

    registerStandardLibrary(registry, config, {
      getStageDescriptor,
      stageFlags,
      logPrefix: prefix,
      runFoundation: (context) => {
        this.initializeFoundation(context);
      },
      landmassCfg: landmassCfg as LandmassConfig,
      mountainOptions,
      volcanoOptions,
      mapInfo,
      playersLandmass1: iNumPlayers1,
      playersLandmass2: iNumPlayers2,
      startSectorRows: iStartSectorRows,
      startSectorCols: iStartSectorCols,
      startSectors,
      westContinent,
      eastContinent,
      placementStartsOverrides: ctx!.config.placement?.starts as Partial<StartsConfig> | undefined,
      startPositions,
    });
    const executor = new PipelineExecutor(registry, { logPrefix: `${prefix} [TaskGraph]` });
    const recipe = registry.getStandardRecipe(stageManifest);

    // Ensure all recipe steps are registered before starting.
    for (const stepId of recipe) {
      if (!registry.has(stepId)) {
        console.error(`${prefix} Missing registered step for "${stepId}"`);
        this.stageResults.push({
          stage: stepId,
          success: false,
          error: `Missing registered step for "${stepId}"`,
        });
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
      const failedStepId =
        err instanceof MissingDependencyError || err instanceof UnsatisfiedProvidesError
          ? err.stepId
          : null;
      this.stageResults.push({
        stage: failedStepId ?? "taskGraph",
        success: false,
        error: message,
      });
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
      const tags = getStoryTags(ctx);
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

  private buildPlacementStartsConfig(
    baseStarts: StartsConfig,
    overrides: Partial<StartsConfig> | undefined
  ): StartsConfig {
    if (!overrides || typeof overrides !== "object") return baseStarts;
    return { ...baseStarts, ...overrides };
  }

  private resolveStageFlags(): Record<string, boolean> {
    const flags = {
      foundation: isStageEnabled(this.mapGenConfig.stageManifest, "foundation"),
      landmassPlates: isStageEnabled(this.mapGenConfig.stageManifest, "landmassPlates"),
      coastlines: isStageEnabled(this.mapGenConfig.stageManifest, "coastlines"),
      storySeed: isStageEnabled(this.mapGenConfig.stageManifest, "storySeed"),
      storyHotspots: isStageEnabled(this.mapGenConfig.stageManifest, "storyHotspots"),
      storyRifts: isStageEnabled(this.mapGenConfig.stageManifest, "storyRifts"),
      ruggedCoasts: isStageEnabled(this.mapGenConfig.stageManifest, "ruggedCoasts"),
      storyOrogeny: isStageEnabled(this.mapGenConfig.stageManifest, "storyOrogeny"),
      storyCorridorsPre: isStageEnabled(this.mapGenConfig.stageManifest, "storyCorridorsPre"),
      islands: isStageEnabled(this.mapGenConfig.stageManifest, "islands"),
      mountains: isStageEnabled(this.mapGenConfig.stageManifest, "mountains"),
      volcanoes: isStageEnabled(this.mapGenConfig.stageManifest, "volcanoes"),
      lakes: isStageEnabled(this.mapGenConfig.stageManifest, "lakes"),
      climateBaseline: isStageEnabled(this.mapGenConfig.stageManifest, "climateBaseline"),
      storySwatches: isStageEnabled(this.mapGenConfig.stageManifest, "storySwatches"),
      rivers: isStageEnabled(this.mapGenConfig.stageManifest, "rivers"),
      storyCorridorsPost: isStageEnabled(this.mapGenConfig.stageManifest, "storyCorridorsPost"),
      climateRefine: isStageEnabled(this.mapGenConfig.stageManifest, "climateRefine"),
      biomes: isStageEnabled(this.mapGenConfig.stageManifest, "biomes"),
      features: isStageEnabled(this.mapGenConfig.stageManifest, "features"),
      placement: isStageEnabled(this.mapGenConfig.stageManifest, "placement"),
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
      const foundationCfg = this.mapGenConfig.foundation ?? {};
      return {
        plates: (foundationCfg.plates ?? {}) as WorldModelConfig["plates"],
        dynamics: (foundationCfg.dynamics ?? {}) as WorldModelConfig["dynamics"],
        directionality: (foundationCfg.dynamics?.directionality ??
          {}) as WorldModelConfig["directionality"],
      };
    });

    this.worldModelConfigBound = true;
  }

  private initializeFoundation(ctx: ExtendedMapContext): FoundationContext {
    const prefix = this.options.logPrefix || "[SWOOPER_MOD]";
    console.log(`${prefix} Initializing foundation...`);

    // Ensure WorldModel pulls configuration from injected config.
    this.bindWorldModelConfigProvider();
    console.log(`${prefix} WorldModel.init() starting`);
    if (!WorldModel.init()) {
      throw new Error("WorldModel initialization failed");
    }
    console.log(`${prefix} WorldModel.init() succeeded`);
    ctx.worldModel = WorldModel as unknown as WorldModelState;

    const foundationCfg = ctx.config.foundation ?? {};
    console.log(`${prefix} createFoundationContext() starting`);
    const foundationContext = createFoundationContext(WorldModel as unknown as WorldModelState, {
      dimensions: ctx.dimensions,
      config: {
        seed: (foundationCfg.seed || {}) as Record<string, unknown>,
        plates: (foundationCfg.plates || {}) as Record<string, unknown>,
        dynamics: (foundationCfg.dynamics || {}) as Record<string, unknown>,
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

}

// ============================================================================
// Module Exports
// ============================================================================

export default MapOrchestrator;
