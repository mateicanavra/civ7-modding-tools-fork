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
  compileExecutionPlan,
  MissingDependencyError,
  PipelineExecutor,
  StepRegistry,
  UnsatisfiedProvidesError,
  type ExecutionPlan,
  type RecipeV1,
  type RunRequest,
} from "@mapgen/pipeline/index.js";
import {
  DEV,
  devWarn,
  initDevFlags,
  logEngineSurfaceApisOnce,
  resetDevFlags,
  type DevLogConfig,
} from "@mapgen/dev/index.js";
import { mod as standardMod } from "@mapgen/mods/standard/mod.js";
import { M3_STAGE_DEPENDENCY_SPINE } from "@mapgen/pipeline/standard.js";

import { createDefaultContinentBounds, createLayerAdapter } from "@mapgen/orchestrator/helpers.js";
import type { GenerationResult, OrchestratorConfig, StageResult } from "@mapgen/orchestrator/types.js";

export interface TaskGraphRunnerOptions {
  mapGenConfig: MapGenConfig;
  orchestratorOptions: OrchestratorConfig;
  initializeFoundation: (ctx: ExtendedMapContext, config: FoundationConfig) => FoundationContext;
}

function resolveRunSeed(config: MapGenConfig): number {
  const seedConfig = config.foundation?.seed;
  if (seedConfig?.mode === "fixed" && typeof seedConfig.fixedSeed === "number") {
    return Math.trunc(seedConfig.fixedSeed);
  }
  return 0;
}

function buildStandardStepConfig(stepId: string, config: MapGenConfig): Record<string, unknown> {
  const directionality = config.foundation?.dynamics?.directionality ?? {};

  switch (stepId) {
    case "foundation":
      return { foundation: config.foundation ?? {} };
    case "landmassPlates":
      return {
        landmass: config.landmass ?? {},
        oceanSeparation: config.oceanSeparation ?? {},
      };
    case "coastlines":
    case "lakes":
      return {};
    case "ruggedCoasts":
      return {
        coastlines: config.coastlines ?? {},
        corridors: config.corridors ?? {},
      };
    case "islands":
      return {
        islands: config.islands ?? {},
        story: { hotspot: config.story?.hotspot ?? {} },
        corridors: { sea: config.corridors?.sea ?? {} },
      };
    case "mountains":
      return { mountains: config.mountains ?? {} };
    case "volcanoes":
      return { volcanoes: config.volcanoes ?? {} };
    case "climateBaseline":
      return { climate: { baseline: config.climate?.baseline ?? {} } };
    case "rivers":
      return { climate: { story: { paleo: config.climate?.story?.paleo ?? {} } } };
    case "climateRefine":
      return {
        climate: config.climate ?? {},
        story: { orogeny: config.story?.orogeny ?? {} },
        foundation: { dynamics: { directionality } },
      };
    case "storySeed":
      return { margins: config.margins ?? {} };
    case "storyHotspots":
      return { story: { hotspot: config.story?.hotspot ?? {} } };
    case "storyRifts":
      return {
        story: { rift: config.story?.rift ?? {} },
        foundation: { dynamics: { directionality } },
      };
    case "storyOrogeny":
      return { story: { orogeny: config.story?.orogeny ?? {} } };
    case "storyCorridorsPre":
    case "storyCorridorsPost":
      return {
        corridors: config.corridors ?? {},
        foundation: { dynamics: { directionality } },
      };
    case "storySwatches":
      return {
        climate: config.climate ?? {},
        foundation: { dynamics: { directionality } },
      };
    case "biomes":
      return { biomes: config.biomes ?? {}, corridors: config.corridors ?? {} };
    case "features":
      return {
        story: { features: config.story?.features ?? {} },
        featuresDensity: config.featuresDensity ?? {},
      };
    case "placement":
      return { placement: config.placement ?? {} };
    default:
      return {};
  }
}

function buildStandardRunRequest(
  recipe: RecipeV1,
  config: MapGenConfig,
  ctx: ExtendedMapContext,
  mapInfo: MapInfo
): RunRequest {
  const steps = recipe.steps.map((step) => {
    const stepConfig = buildStandardStepConfig(step.id, config);
    const mergedConfig =
      step.config && typeof step.config === "object"
        ? { ...stepConfig, ...step.config }
        : stepConfig;
    return {
      ...step,
      config: mergedConfig,
    };
  });

  return {
    recipe: {
      ...recipe,
      steps,
    },
    settings: {
      seed: resolveRunSeed(config),
      dimensions: { width: ctx.dimensions.width, height: ctx.dimensions.height },
      latitudeBounds: {
        topLatitude: mapInfo.MaxLatitude ?? 90,
        bottomLatitude: mapInfo.MinLatitude ?? -90,
      },
      wrap: { wrapX: true, wrapY: false },
    },
  };
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

  const registry = new StepRegistry<ExtendedMapContext>();
  const standardRecipe = standardMod.recipes.default;
  const enabledSteps = standardRecipe.steps.filter((step) => step.enabled ?? true);
  const enabledStages = enabledSteps.map((step) => step.id).join(", ");
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

  const storyEnabled = enabledSteps.some((step) => step.id.startsWith("story"));

  const getStageDescriptor = (
    stageName: string
  ): { requires: readonly string[]; provides: readonly string[] } => {
    const desc = M3_STAGE_DEPENDENCY_SPINE[stageName] ?? { requires: [], provides: [] };
    const requires = Array.isArray(desc.requires) ? desc.requires : [];
    const provides = Array.isArray(desc.provides) ? desc.provides : [];
    return { requires, provides };
  };

  standardMod.registry.register(registry, config, {
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

  for (const step of enabledSteps) {
    const stepId = step.id;
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

  let plan: ExecutionPlan;
  try {
    plan = compileExecutionPlan(buildStandardRunRequest(standardRecipe, config, ctx, mapInfo), registry);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    stageResults.push({
      stage: "taskGraph",
      success: false,
      error: message,
    });
    console.error(`${prefix} TaskGraph compile failed: ${message}`, err);
    return { success: false, stageResults, startPositions };
  }

  try {
    const { stepResults } = executor.executePlan(ctx, plan);
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
