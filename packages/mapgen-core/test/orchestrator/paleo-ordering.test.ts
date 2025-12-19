import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import { bootstrap } from "../../src/index.js";
import type { ExtendedMapContext } from "../../src/core/types.js";
import { createExtendedMapContext } from "../../src/core/types.js";
import {
  PipelineExecutor,
  StepRegistry,
  registerFoundationLayer,
  registerHydrologyLayer,
  registerNarrativeLayer,
} from "../../src/pipeline/index.js";
import { runFoundationStage } from "../../src/pipeline/foundation/producer.js";
import {
  getStoryOverlay,
  STORY_OVERLAY_KEYS,
} from "../../src/domain/narrative/overlays/index.js";

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

  function runRecipe(config: ReturnType<typeof bootstrap>, adapter: ReturnType<typeof createMockAdapter>) {
    const ctx = createExtendedMapContext({ width, height }, adapter, config);
    const stageManifest = config.stageManifest!;

    const stageFlags: Record<string, boolean> = {};
    for (const stage of stageManifest.order ?? []) {
      stageFlags[stage] = stageManifest.stages?.[stage]?.enabled !== false;
    }

    const getStageDescriptor = (stageId: string) => {
      const desc = stageManifest.stages?.[stageId] ?? {};
      const requires = Array.isArray(desc.requires) ? desc.requires : [];
      const provides = Array.isArray(desc.provides) ? desc.provides : [];
      return { requires, provides };
    };

    const registry = new StepRegistry<ExtendedMapContext>();

    registerFoundationLayer(registry, {
      getStageDescriptor,
      stageFlags,
      runFoundation: (context) => {
        runFoundationStage(context);
      },
    });

    registerNarrativeLayer(registry, { getStageDescriptor, stageFlags, logPrefix: "[TEST]" });

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
      stageFlags,
      logPrefix: "[TEST]",
      mapInfo,
      westContinent,
      eastContinent,
    });

    const executor = new PipelineExecutor(registry, { logPrefix: "[TEST]" });
    const recipe = registry.getStandardRecipe(stageManifest);
    const { stepResults } = executor.execute(ctx, recipe);

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
      stageConfig: {
        foundation: true,
        climateBaseline: true,
        storySwatches: true,
        rivers: true,
      },
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

    const { ctx, stepResults } = runRecipe(config, adapter);
    expect(stepResults.every((r) => r.success)).toBe(true);

    const overlay = getStoryOverlay(ctx, STORY_OVERLAY_KEYS.PALEO);
    const deltas = (overlay?.summary as { deltas?: number } | undefined)?.deltas ?? 0;
    expect(deltas).toBe(1);
  });
});
