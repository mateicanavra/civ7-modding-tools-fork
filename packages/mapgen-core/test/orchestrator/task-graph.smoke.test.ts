import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import { bootstrap, runTaskGraphGeneration } from "@mapgen/index.js";

describe("smoke: runTaskGraphGeneration TaskGraph entry", () => {
  const standardMapInfo = {
    GridWidth: 84,
    GridHeight: 54,
    MinLatitude: -80,
    MaxLatitude: 80,
    NumNaturalWonders: 0,
    LakeGenerationFrequency: 0,
    PlayersLandmass1: 4,
    PlayersLandmass2: 4,
    StartSectorRows: 4,
    StartSectorCols: 4,
  };
  const smallMapInfo = {
    GridWidth: 24,
    GridHeight: 16,
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
  });

  const setEngineGlobals = (mapInfo: typeof standardMapInfo) => {
    const width = mapInfo.GridWidth;
    const height = mapInfo.GridHeight;
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
  };

  afterEach(() => {
    (globalThis as Record<string, unknown>).GameplayMap = originalGameplayMap;
    (globalThis as Record<string, unknown>).GameInfo = originalGameInfo;
  });

  it("runs the foundation stage via PipelineExecutor", () => {
    setEngineGlobals(standardMapInfo);
    const adapter = createMockAdapter({
      width: standardMapInfo.GridWidth,
      height: standardMapInfo.GridHeight,
      mapSizeId: 1,
      mapInfo: standardMapInfo,
    });

    const config = bootstrap();
    const result = runTaskGraphGeneration({
      mapGenConfig: config,
      orchestratorOptions: { adapter, logPrefix: "[TEST]" },
    });

    expect(result.success).toBe(true);
    expect(
      result.stageResults.some((stage) => stage.stage === "foundation" && stage.success)
    ).toBe(true);
  });

  it("surfaces stage failures as structured stageResult entries", () => {
    setEngineGlobals(smallMapInfo);
    const adapter = createMockAdapter({
      width: smallMapInfo.GridWidth,
      height: smallMapInfo.GridHeight,
      mapSizeId: 1,
      mapInfo: smallMapInfo,
      rng: () => 0,
    });

    const config = bootstrap();
    const result = runTaskGraphGeneration({
      mapGenConfig: config,
      orchestratorOptions: { adapter, logPrefix: "[TEST]" },
    });

    expect(result.success).toBe(false);
    expect(
      result.stageResults.some(
        (stage) =>
          stage.stage === "landmassPlates" &&
          stage.success === false &&
          typeof stage.error === "string" &&
          stage.error.includes("Plate-driven landmass generation failed")
      )
    ).toBe(true);
  });
});
