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
 * - Compiles a RunRequest into an ExecutionPlan from a recipe
 * - Stages are enabled/disabled via recipe step flags (not stageConfig)
 *
 * Usage (in mod entry point):
 *   import { bootstrap, MapOrchestrator, standardMod } from "@swooper/mapgen-core";
 *
 *   engine.on('RequestMapInitData', () => {
 *     const config = bootstrap({ presets: ["classic"] });
 *     const orchestrator = new MapOrchestrator(config, { logPrefix: "[MOD]" });
 *     orchestrator.requestMapData();
 *   });
 *
 *   engine.on("GenerateMap", () => {
 *     const config = bootstrap({ presets: ["classic"], overrides: { ... } });
 *     const recipe = {
 *       schemaVersion: 1,
 *       steps: standardMod.recipes.default.steps.map((step) => ({
 *         ...step,
 *         enabled: step.id === "foundation" || step.id === "landmassPlates",
 *       })),
 *     };
 *     const orchestrator = new MapOrchestrator(config, {
 *       logPrefix: "[MOD]",
 *       recipeOverride: recipe,
 *     });
 *     orchestrator.generateMap();
 *   });
 */

import type { MapInfo, MapInitParams, MapSizeId } from "@civ7/adapter";
import { createCiv7Adapter } from "@civ7/adapter/civ7";

export type { MapInfo, MapInitParams } from "@civ7/adapter";
import type { FoundationConfig, MapGenConfig } from "@mapgen/config/index.js";
import type { ExtendedMapContext, FoundationContext } from "@mapgen/core/types.js";
import { runFoundationStage } from "@mapgen/pipeline/foundation/producer.js";
import { runTaskGraphGeneration } from "@mapgen/orchestrator/task-graph.js";
import type { GenerationResult, OrchestratorConfig, StageResult } from "@mapgen/orchestrator/types.js";

export type {
  GenerationResult,
  MapSizeDefaults,
  OrchestratorConfig,
  StageResult,
} from "@mapgen/orchestrator/types.js";

// Dev diagnostics
import {
  DEV,
  devWarn,
  logFoundationSummary,
  logFoundationAscii,
  logFoundationHistograms,
  logBoundaryMetrics,
  type FoundationPlates,
} from "@mapgen/dev/index.js";

// ============================================================================
// Types
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
  private stageResults: StageResult[] = [];

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
    const result = runTaskGraphGeneration({
      mapGenConfig: this.mapGenConfig,
      orchestratorOptions: this.options,
      initializeFoundation: (ctx, config) => this.initializeFoundation(ctx, config),
    });
    this.stageResults = result.stageResults;
    return result;
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private initializeFoundation(
    ctx: ExtendedMapContext,
    config: FoundationConfig
  ): FoundationContext {
    const prefix = this.options.logPrefix || "[SWOOPER_MOD]";
    console.log(`${prefix} Initializing foundation...`);
    const foundationContext = runFoundationStage(ctx, config);

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

}

// ============================================================================
// Module Exports
// ============================================================================

export default MapOrchestrator;
