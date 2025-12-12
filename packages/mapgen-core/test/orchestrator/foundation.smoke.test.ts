import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import { bootstrap, MapOrchestrator } from "../../src/index.js";
import { resetTunablesForTest } from "../../src/bootstrap/tunables.js";
import { resetConfigProviderForTest, WorldModel } from "../../src/world/model.js";

describe("smoke: MapOrchestrator.generateMap foundation slice", () => {
  const width = 24;
  const height = 16;
  const size = width * height;

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

  it("populates foundation WorldModel fields via generateMap()", () => {
    const adapter = createMockAdapter({
      width,
      height,
      rng: () => 0,
    });

    const config = bootstrap({ stageConfig: { foundation: true } });
    const orchestrator = new MapOrchestrator(config, { adapter, logPrefix: "[TEST]" });
    const result = orchestrator.generateMap();

    expect(result.success).toBe(true);
    expect(result.stageResults.some((stage) => stage.stage === "foundation" && stage.success)).toBe(
      true
    );

    expect(WorldModel.initialized).toBe(true);
    expect(WorldModel.width).toBe(width);
    expect(WorldModel.height).toBe(height);

    expect(WorldModel.plateId?.length).toBe(size);
    expect(WorldModel.boundaryCloseness?.length).toBe(size);
    expect(WorldModel.boundaryType?.length).toBe(size);
    expect(WorldModel.upliftPotential?.length).toBe(size);
    expect(WorldModel.riftPotential?.length).toBe(size);
    expect(WorldModel.windU?.length).toBe(size);
    expect(WorldModel.windV?.length).toBe(size);
    expect(WorldModel.currentU?.length).toBe(size);
    expect(WorldModel.currentV?.length).toBe(size);
    expect(WorldModel.pressure?.length).toBe(size);
    expect(WorldModel.plateSeed?.width).toBe(width);
    expect(WorldModel.plateSeed?.height).toBe(height);

    const expectFiniteNumbers = (label: string, values: ArrayLike<number> | null | undefined) => {
      expect(values).not.toBeNull();
      if (!values) return;
      for (let i = 0; i < values.length; i++) {
        const value = values[i];
        expect(Number.isFinite(value)).toBe(true);
      }
    };

    expectFiniteNumbers("boundaryCloseness", WorldModel.boundaryCloseness);
    expectFiniteNumbers("upliftPotential", WorldModel.upliftPotential);
    expectFiniteNumbers("riftPotential", WorldModel.riftPotential);
    expectFiniteNumbers("windU", WorldModel.windU);
    expectFiniteNumbers("windV", WorldModel.windV);
    expectFiniteNumbers("currentU", WorldModel.currentU);
    expectFiniteNumbers("currentV", WorldModel.currentV);
    expectFiniteNumbers("pressure", WorldModel.pressure);

    const plateId = WorldModel.plateId;
    expect(plateId).not.toBeNull();
    const uniquePlates = new Set<number>();
    for (let i = 0; i < plateId!.length; i++) {
      uniquePlates.add(plateId![i]);
    }
    expect(uniquePlates.size).toBeGreaterThan(1);
  });
});
