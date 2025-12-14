import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import { bootstrap, MapOrchestrator } from "../../src/index.js";
import { resetTunablesForTest } from "../../src/bootstrap/tunables.js";
import { resetConfigProviderForTest, WorldModel } from "../../src/world/model.js";

describe("smoke: MapOrchestrator.generateMap TaskGraph entry", () => {
  const width = 24;
  const height = 16;

  let originalGameplayMap: unknown;
  let originalGameInfo: unknown;

  beforeEach(() => {
    resetTunablesForTest();
    resetConfigProviderForTest();
    WorldModel.reset();

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
        lookup: () => ({
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
        }),
      },
    };
  });

  afterEach(() => {
    (globalThis as Record<string, unknown>).GameplayMap = originalGameplayMap;
    (globalThis as Record<string, unknown>).GameInfo = originalGameInfo;

    resetTunablesForTest();
    resetConfigProviderForTest();
    WorldModel.reset();
  });

  it("runs the foundation stage via PipelineExecutor", () => {
    const adapter = createMockAdapter({
      width,
      height,
      rng: () => 0,
    });

    const config = bootstrap({ stageConfig: { foundation: true } });
    const orchestrator = new MapOrchestrator(config, {
      adapter,
      logPrefix: "[TEST]",
      useTaskGraph: true,
    });
    const result = orchestrator.generateMap();

    expect(result.success).toBe(true);
    expect(
      result.stageResults.some((stage) => stage.stage === "foundation" && stage.success)
    ).toBe(true);
  });
});

