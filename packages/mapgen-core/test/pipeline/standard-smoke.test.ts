import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import { bootstrap } from "@mapgen/index.js";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { createExtendedMapContext } from "@mapgen/core/types.js";
import { mod as standardMod } from "@mapgen/mods/standard/mod.js";
import { createDefaultContinentBounds } from "@mapgen/orchestrator/helpers.js";
import {
  compileExecutionPlan,
  computePlanFingerprint,
  createTraceSessionFromPlan,
  M4_EFFECT_TAGS,
  PipelineExecutor,
  StepRegistry,
} from "@mapgen/pipeline/index.js";
import { M3_DEPENDENCY_TAGS } from "@mapgen/pipeline/index.js";
import { M3_STAGE_DEPENDENCY_SPINE } from "@mapgen/pipeline/standard.js";
import { runFoundationStage } from "@mapgen/pipeline/foundation/producer.js";
import type { TraceEvent } from "@mapgen/trace/index.js";

describe("smoke: standard recipe compile/execute", () => {
  const width = 84;
  const height = 54;
  const mapInfo = {
    GridWidth: width,
    GridHeight: height,
    MinLatitude: -80,
    MaxLatitude: 80,
    NumNaturalWonders: 0,
    LakeGenerationFrequency: 0,
    PlayersLandmass1: 4,
    PlayersLandmass2: 4,
    StartSectorRows: 4,
    StartSectorCols: 4,
  };

  let originalGameplayMap: unknown;
  let originalGameInfo: unknown;

  beforeEach(() => {
    originalGameplayMap = (globalThis as Record<string, unknown>).GameplayMap;
    originalGameInfo = (globalThis as Record<string, unknown>).GameInfo;

    (globalThis as Record<string, unknown>).GameplayMap = {
      getGridWidth: () => width,
      getGridHeight: () => height,
      getMapSize: () => 1,
      getIndexFromXY: (x: number, y: number) => y * width + x,
      getLocationFromIndex: (index: number) => ({
        x: index % width,
        y: Math.floor(index / width),
      }),
      getPlotLatitude: () => 0,
      getRandomSeed: () => 12345,
      isWater: () => false,
    };

    (globalThis as Record<string, unknown>).GameInfo = {
      Maps: {
        lookup: () => mapInfo,
      },
    };
  });

  afterEach(() => {
    (globalThis as Record<string, unknown>).GameplayMap = originalGameplayMap;
    (globalThis as Record<string, unknown>).GameInfo = originalGameInfo;
  });

  const createDeterministicRng = (seed = 12345) => {
    let state = seed;
    return (max: number, _label?: string) => {
      if (max <= 0) return 0;
      state = (state * 1664525 + 1013904223) >>> 0;
      return state % max;
    };
  };

  const buildStandardStepConfig = (stepId: string, config: ReturnType<typeof bootstrap>) => {
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
        return { coastlines: config.coastlines ?? {}, corridors: config.corridors ?? {} };
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
        return { corridors: config.corridors ?? {}, foundation: { dynamics: { directionality } } };
      case "storySwatches":
        return { climate: config.climate ?? {}, foundation: { dynamics: { directionality } } };
      case "biomes":
        return { biomes: config.biomes ?? {}, corridors: config.corridors ?? {} };
      case "features":
        return {
          story: { features: config.story?.features ?? {} },
          featuresDensity: config.featuresDensity ?? {},
        };
      case "derivePlacementInputs":
        return { placement: config.placement ?? {} };
      case "placement":
        return {};
      default:
        return {};
    }
  };

  const buildRunRequest = (config: ReturnType<typeof bootstrap>) => {
    const steps = standardMod.recipes.default.steps.map((step) => {
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
      recipe: { ...standardMod.recipes.default, steps },
      settings: {
        seed: 123,
        dimensions: { width, height },
        latitudeBounds: { topLatitude: mapInfo.MaxLatitude, bottomLatitude: mapInfo.MinLatitude },
        wrap: { wrapX: true, wrapY: false },
        trace: { enabled: true },
      },
    };
  };

  const buildRegistry = (
    adapter: ReturnType<typeof createMockAdapter>,
    config: ReturnType<typeof bootstrap>
  ) => {
    const registry = new StepRegistry<ExtendedMapContext>();
    const recipeSteps = standardMod.recipes.default.steps.filter((step) => step.enabled ?? true);
    const storyEnabled = recipeSteps.some((step) => step.id.startsWith("story"));

    const getStageDescriptor = (stageId: string) => {
      const desc = M3_STAGE_DEPENDENCY_SPINE[stageId] ?? { requires: [], provides: [] };
      return {
        requires: Array.isArray(desc.requires) ? desc.requires : [],
        provides: Array.isArray(desc.provides) ? desc.provides : [],
      };
    };

    const playersLandmass1 = mapInfo.PlayersLandmass1 ?? 0;
    const playersLandmass2 = mapInfo.PlayersLandmass2 ?? 0;
    const startSectorRows = mapInfo.StartSectorRows ?? 0;
    const startSectorCols = mapInfo.StartSectorCols ?? 0;
    const startSectors = adapter.chooseStartSectors(
      playersLandmass1,
      playersLandmass2,
      startSectorRows,
      startSectorCols,
      adapter.needHumanNearEquator()
    );
    const startPositions: number[] = [];

    standardMod.registry.register(registry, config, {
      getStageDescriptor,
      logPrefix: "[TEST]",
      runFoundation: (context, foundationConfig) => {
        runFoundationStage(context, foundationConfig);
      },
      storyEnabled,
      mapInfo,
      playersLandmass1,
      playersLandmass2,
      startSectorRows,
      startSectorCols,
      startSectors,
      westContinent: createDefaultContinentBounds(width, height, "west"),
      eastContinent: createDefaultContinentBounds(width, height, "east"),
      startPositions,
    });

    return { registry, startPositions };
  };

  it("compiles the standard recipe into an execution plan", () => {
    const adapter = createMockAdapter({
      width,
      height,
      mapSizeId: 1,
      mapInfo,
      rng: createDeterministicRng(),
    });
    const config = bootstrap();
    const { registry } = buildRegistry(adapter, config);

    const runRequest = buildRunRequest(config);
    const plan = compileExecutionPlan(runRequest, registry);

    const expectedSteps = standardMod.recipes.default.steps
      .filter((step) => step.enabled ?? true)
      .map((step) => step.id);

    expect(plan.recipeId).toBe("core.standard");
    expect(plan.nodes.map((node) => node.stepId)).toEqual(expectedSteps);
    expect(computePlanFingerprint(plan)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("executes the standard plan with a mock adapter", () => {
    const adapter = createMockAdapter({
      width,
      height,
      mapSizeId: 1,
      mapInfo,
      rng: createDeterministicRng(),
    });
    const config = bootstrap();
    const { registry, startPositions } = buildRegistry(adapter, config);
    const ctx = createExtendedMapContext({ width, height }, adapter, config);

    const plan = compileExecutionPlan(buildRunRequest(config), registry);
    const events: TraceEvent[] = [];
    const trace = createTraceSessionFromPlan(plan, { emit: (event) => events.push(event) });
    const executor = new PipelineExecutor(registry, { logPrefix: "[TEST]", log: () => {} });
    const { stepResults, satisfied } = executor.executePlan(ctx, plan, { trace });

    expect(stepResults).toHaveLength(plan.nodes.length);
    expect(stepResults.every((result) => result.success)).toBe(true);
    expect(satisfied.has(M4_EFFECT_TAGS.engine.biomesApplied)).toBe(true);
    expect(satisfied.has(M4_EFFECT_TAGS.engine.featuresApplied)).toBe(true);
    expect(ctx.artifacts.foundation).toBeTruthy();
    expect(ctx.fields.biomeId).toBeInstanceOf(Uint8Array);
    expect(ctx.fields.featureType).toBeInstanceOf(Int16Array);

    const sampleX = Math.floor(width / 3);
    const sampleY = Math.floor(height / 3);
    const sampleIdx = sampleY * width + sampleX;
    expect(ctx.fields.biomeId?.[sampleIdx]).toBe(adapter.getBiomeType(sampleX, sampleY));
    expect(ctx.fields.featureType?.[sampleIdx]).toBe(adapter.getFeatureType(sampleX, sampleY));
    expect(ctx.artifacts.get(M3_DEPENDENCY_TAGS.artifact.placementInputsV1)).toBeTruthy();
    expect(ctx.artifacts.get(M3_DEPENDENCY_TAGS.artifact.placementOutputsV1)).toBeTruthy();
    expect(startPositions.length).toBeGreaterThan(0);
    expect(events.some((event) => event.kind === "run.finish" && event.success)).toBe(true);
  });
});
