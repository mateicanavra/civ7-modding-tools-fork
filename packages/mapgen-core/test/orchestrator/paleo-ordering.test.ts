import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import { bootstrap } from "@mapgen/index.js";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import { createExtendedMapContext, syncHeightfield } from "@mapgen/core/types.js";
import { M3_DEPENDENCY_TAGS, M3_STAGE_DEPENDENCY_SPINE, registerBaseTags } from "@mapgen/base/index.js";
import {
  compileExecutionPlan,
  PipelineExecutor,
  StepRegistry,
} from "@mapgen/engine/index.js";
import { registerFoundationLayer } from "@mapgen/base/pipeline/foundation/index.js";
import { runFoundationStage } from "@mapgen/base/pipeline/foundation/producer.js";
import { registerHydrologyLayer } from "@mapgen/base/pipeline/hydrology/index.js";
import { registerNarrativeLayer } from "@mapgen/base/pipeline/narrative/index.js";
import { publishHeightfieldArtifact } from "@mapgen/base/pipeline/artifacts.js";
import {
  getStoryOverlay,
  STORY_OVERLAY_KEYS,
} from "@mapgen/domain/narrative/overlays/index.js";

describe("orchestrator: paleo hydrology runs post-rivers", () => {
  const width = 12;
  const height = 8;
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

  function runRecipe(
    config: ReturnType<typeof bootstrap>,
    adapter: ReturnType<typeof createMockAdapter>,
    recipe: readonly string[]
  ) {
    const ctx = createExtendedMapContext({ width, height }, adapter, config);
    const registry = new StepRegistry<ExtendedMapContext>();
    registerBaseTags(registry);
    const storyEnabled = recipe.some((id) => id.startsWith("story"));

    const getStageDescriptor = (stageId: string) => {
      const desc = M3_STAGE_DEPENDENCY_SPINE[stageId] ?? { requires: [], provides: [] };
      const requires = Array.isArray(desc.requires) ? desc.requires : [];
      const provides = Array.isArray(desc.provides) ? desc.provides : [];
      return { requires, provides };
    };

    registerFoundationLayer(registry, {
      getStageDescriptor,
      runFoundation: (context) => {
        runFoundationStage(context, config.foundation);
      },
    });

    registerNarrativeLayer(registry, { getStageDescriptor, logPrefix: "[TEST]" });

    const westContinent = { west: 0, east: Math.floor(width / 2), south: 0, north: height - 1, continent: 0 };
    const eastContinent = {
      west: Math.floor(width / 2),
      east: width - 1,
      south: 0,
      north: height - 1,
      continent: 1,
    };

    registerHydrologyLayer(registry, {
      getStageDescriptor,
      logPrefix: "[TEST]",
      storyEnabled,
      mapInfo,
      westContinent,
      eastContinent,
    });

    registry.register({
      id: "seedHeightfield",
      phase: "hydrology",
      requires: [],
      provides: [M3_DEPENDENCY_TAGS.artifact.heightfield],
      run: (context, _config) => {
        syncHeightfield(context);
        publishHeightfieldArtifact(context);
      },
    });

    const buildStepConfig = (stepId: string): Record<string, unknown> => {
      switch (stepId) {
        case "foundation":
          return { foundation: config.foundation ?? {} };
        case "seedHeightfield":
          return {};
        case "climateBaseline":
          return { climate: { baseline: config.climate?.baseline ?? {} } };
        case "storySwatches":
          return { climate: config.climate ?? {} };
        case "rivers":
          return { climate: { story: { paleo: config.climate?.story?.paleo ?? {} } } };
        default:
          return {};
      }
    };

    const runRequest = {
      recipe: {
        schemaVersion: 1,
        steps: recipe.map((stepId) => ({
          id: stepId,
          config: buildStepConfig(stepId),
        })),
      },
      settings: {
        seed: 123,
        dimensions: { width, height },
        latitudeBounds: { topLatitude: mapInfo.MaxLatitude, bottomLatitude: mapInfo.MinLatitude },
        wrap: { wrapX: true, wrapY: false },
        directionality: config.foundation?.dynamics?.directionality ?? {},
      },
    };

    const plan = compileExecutionPlan(runRequest, registry);
    const executor = new PipelineExecutor(registry, { logPrefix: "[TEST]" });
    const { stepResults } = executor.executePlan(ctx, plan);

    return { ctx, stepResults };
  }

  it("runs paleo after modelRivers", () => {
    const adapter = createMockAdapter({
      width,
      height,
      mapSizeId: 1,
      mapInfo,
    });

    // Ensure there are coastal land tiles (y=1 adjacent to water at y=0).
    for (let x = 0; x < width; x++) {
      (adapter as any).setWater(x, 0, true);
    }

    let modeled = false;
    const originalModelRivers = adapter.modelRivers.bind(adapter);
    (adapter as any).modelRivers = (...args: unknown[]) => {
      modeled = true;
      return originalModelRivers(...(args as [number, number, number]));
    };
    (adapter as any).isAdjacentToRivers = () => modeled;

    const config = bootstrap({
      overrides: {
        climate: {
          story: {
            paleo: {
              maxDeltas: 1,
              deltaFanRadius: 1,
              deltaMarshChance: 0,
              maxOxbows: 0,
              maxFossilChannels: 0,
            },
          },
        },
      },
    });
    const recipe = ["foundation", "seedHeightfield", "climateBaseline", "storySwatches", "rivers"] as const;

    const { ctx, stepResults } = runRecipe(config, adapter, recipe);
    expect(stepResults.every((r) => r.success)).toBe(true);

    const overlay = getStoryOverlay(ctx, STORY_OVERLAY_KEYS.PALEO);
    const deltas = (overlay?.summary as { deltas?: number } | undefined)?.deltas ?? 0;
    expect(deltas).toBe(1);
  });
});
