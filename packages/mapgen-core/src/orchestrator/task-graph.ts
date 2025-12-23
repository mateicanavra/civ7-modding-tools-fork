import type { MapInfo, MapSizeId } from "@civ7/adapter";
import { createCiv7Adapter } from "@civ7/adapter/civ7";

import type { FoundationConfig, MapGenConfig } from "@mapgen/config/index.js";
import type { ExtendedMapContext, FoundationContext } from "@mapgen/core/types.js";
import { createExtendedMapContext } from "@mapgen/core/types.js";
import { getStoryTags, resetStoryTags } from "@mapgen/domain/narrative/tags/index.js";
import { resetStoryOverlays } from "@mapgen/domain/narrative/overlays/index.js";
import { resetOrogenyCache } from "@mapgen/domain/narrative/orogeny/index.js";
import { resetCorridorStyleCache } from "@mapgen/domain/narrative/corridors/index.js";
import {
  MissingDependencyError,
  PipelineExecutor,
  StepRegistry,
  UnsatisfiedProvidesError,
  registerStandardLibrary,
} from "@mapgen/pipeline/index.js";
import {
  DEV,
  devWarn,
  initDevFlags,
  logEngineSurfaceApisOnce,
  resetDevFlags,
  type DevLogConfig,
} from "@mapgen/dev/index.js";

import { createDefaultContinentBounds, createLayerAdapter } from "@mapgen/orchestrator/helpers.js";
import type { GenerationResult, OrchestratorConfig, StageResult } from "@mapgen/orchestrator/types.js";

export interface TaskGraphRunnerOptions {
  mapGenConfig: MapGenConfig;
  orchestratorOptions: OrchestratorConfig;
  initializeFoundation: (ctx: ExtendedMapContext, config: FoundationConfig) => FoundationContext;
}

export function runTaskGraphGeneration(options: TaskGraphRunnerOptions): GenerationResult {
  const prefix = options.orchestratorOptions.logPrefix || "[SWOOPER_MOD]";
  console.log(`${prefix} === GenerateMap (TaskGraph) ===`);

  const stageResults: StageResult[] = [];
  const startPositions: number[] = [];
  const config = options.mapGenConfig;

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

  const mapInfoAdapter = options.orchestratorOptions.adapter ?? createCiv7Adapter();

  const iWidth = mapInfoAdapter.width;
  const iHeight = mapInfoAdapter.height;

  let uiMapSize: MapSizeId;
  let mapInfo: MapInfo | null;

  const mapSizeDefaults = options.orchestratorOptions.mapSizeDefaults;
  if (mapSizeDefaults) {
    uiMapSize = mapSizeDefaults.mapSizeId ?? 0;
    mapInfo = mapSizeDefaults.mapInfo;
  } else {
    uiMapSize = mapInfoAdapter.getMapSizeId();
    mapInfo = mapInfoAdapter.lookupMapInfo(uiMapSize);
  }

  if (!mapInfo) {
    console.error(`${prefix} Failed to lookup map info`);
    return { success: false, stageResults, startPositions };
  }

  console.log(`${prefix} Map size: ${iWidth}x${iHeight}`);
  console.log(
    `${prefix} MapInfo summary: NumNaturalWonders=${mapInfo.NumNaturalWonders}, ` +
      `LakeGenerationFrequency=${mapInfo.LakeGenerationFrequency}, ` +
      `PlayersLandmass1=${mapInfo.PlayersLandmass1}, PlayersLandmass2=${mapInfo.PlayersLandmass2}`
  );

  logEngineSurfaceApisOnce();

  const stageManifest = options.mapGenConfig.stageManifest ?? { order: [], stages: {} };
  const registry = new StepRegistry<ExtendedMapContext>();
  const recipe = registry.getStandardRecipe(stageManifest);
  const enabledStages = recipe.join(", ");
  console.log(`${prefix} Enabled stages: ${enabledStages || "(none)"}`);

  let ctx: ExtendedMapContext | null = null;
  try {
    const layerAdapter = createLayerAdapter(options.orchestratorOptions, iWidth, iHeight);
    ctx = createExtendedMapContext({ width: iWidth, height: iHeight }, layerAdapter, config);
    console.log(`${prefix} MapContext created successfully`);
  } catch (err) {
    console.error(`${prefix} Failed to create context:`, err);
    return { success: false, stageResults, startPositions };
  }

  // Reset story state once per generation to prevent cross-run leakage.
  resetStoryTags(ctx);
  resetStoryOverlays(ctx);
  resetOrogenyCache(ctx);
  resetCorridorStyleCache(ctx);

  const iNumPlayers1 = mapInfo.PlayersLandmass1 ?? 4;
  const iNumPlayers2 = mapInfo.PlayersLandmass2 ?? 4;
  const iStartSectorRows = mapInfo.StartSectorRows ?? 4;
  const iStartSectorCols = mapInfo.StartSectorCols ?? 4;
  const bHumanNearEquator = ctx.adapter.needHumanNearEquator();
  const startSectors = ctx.adapter.chooseStartSectors(
    iNumPlayers1,
    iNumPlayers2,
    iStartSectorRows,
    iStartSectorCols,
    bHumanNearEquator
  );
  console.log(`${prefix} Start sectors chosen successfully`);

  const westContinent = createDefaultContinentBounds(iWidth, iHeight, "west");
  const eastContinent = createDefaultContinentBounds(iWidth, iHeight, "east");

  const storyEnabled = recipe.some((id) => id.startsWith("story"));

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
    logPrefix: prefix,
    runFoundation: (context, config) => {
      options.initializeFoundation(context, config);
    },
    storyEnabled,
    mapInfo,
    playersLandmass1: iNumPlayers1,
    playersLandmass2: iNumPlayers2,
    startSectorRows: iStartSectorRows,
    startSectorCols: iStartSectorCols,
    startSectors,
    westContinent,
    eastContinent,
    startPositions,
  });

  const executor = new PipelineExecutor(registry, { logPrefix: `${prefix} [TaskGraph]` });

  for (const stepId of recipe) {
    if (!registry.has(stepId)) {
      console.error(`${prefix} Missing registered step for "${stepId}"`);
      stageResults.push({
        stage: stepId,
        success: false,
        error: `Missing registered step for "${stepId}"`,
      });
      return { success: false, stageResults, startPositions };
    }
  }

  try {
    const { stepResults } = executor.execute(ctx, recipe);
    stageResults.push(
      ...stepResults.map((r) => ({
        stage: r.stepId,
        success: r.success,
        durationMs: r.durationMs,
        error: r.error,
      }))
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const failedStepId =
      err instanceof MissingDependencyError || err instanceof UnsatisfiedProvidesError
        ? err.stepId
        : null;
    stageResults.push({
      stage: failedStepId ?? "taskGraph",
      success: false,
      error: message,
    });
    console.error(`${prefix} TaskGraph execution failed: ${message}`, err);
    return { success: false, stageResults, startPositions };
  }

  if (DEV.ENABLED && storyEnabled) {
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

  const success = stageResults.every((r) => r.success);
  return { success, stageResults, startPositions };
}
