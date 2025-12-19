import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import { bootstrap } from "../../src/index.js";
import { createExtendedMapContext } from "../../src/core/types.js";
import { runFoundationStage } from "../../src/pipeline/foundation/producer.js";

describe("smoke: MapOrchestrator.generateMap foundation slice", () => {
  const width = 24;
  const height = 16;
  const size = width * height;
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

  it("populates foundation tensors via foundation stage", () => {
    const adapter = createMockAdapter({
      width,
      height,
      mapSizeId: 1,
      mapInfo,
      rng: () => 0,
    });

    const config = bootstrap({ stageConfig: { foundation: true } });
    const ctx = createExtendedMapContext({ width, height }, adapter, config);
    const foundation = runFoundationStage(ctx);

    expect(foundation.plates.id?.length).toBe(size);
    expect(foundation.plates.boundaryCloseness?.length).toBe(size);
    expect(foundation.plates.boundaryType?.length).toBe(size);
    expect(foundation.plates.upliftPotential?.length).toBe(size);
    expect(foundation.plates.riftPotential?.length).toBe(size);
    expect(foundation.dynamics.windU?.length).toBe(size);
    expect(foundation.dynamics.windV?.length).toBe(size);
    expect(foundation.dynamics.currentU?.length).toBe(size);
    expect(foundation.dynamics.currentV?.length).toBe(size);
    expect(foundation.dynamics.pressure?.length).toBe(size);
    expect(foundation.plateSeed?.width).toBe(width);
    expect(foundation.plateSeed?.height).toBe(height);

    const expectFiniteNumbers = (label: string, values: ArrayLike<number> | null | undefined) => {
      expect(values).not.toBeNull();
      if (!values) return;
      for (let i = 0; i < values.length; i++) {
        const value = values[i];
        expect(Number.isFinite(value)).toBe(true);
      }
    };

    expectFiniteNumbers("boundaryCloseness", foundation.plates.boundaryCloseness);
    expectFiniteNumbers("upliftPotential", foundation.plates.upliftPotential);
    expectFiniteNumbers("riftPotential", foundation.plates.riftPotential);
    expectFiniteNumbers("windU", foundation.dynamics.windU);
    expectFiniteNumbers("windV", foundation.dynamics.windV);
    expectFiniteNumbers("currentU", foundation.dynamics.currentU);
    expectFiniteNumbers("currentV", foundation.dynamics.currentV);
    expectFiniteNumbers("pressure", foundation.dynamics.pressure);

    const plateId = foundation.plates.id;
    expect(plateId).not.toBeNull();
    const uniquePlates = new Set<number>();
    for (let i = 0; i < plateId!.length; i++) {
      uniquePlates.add(plateId![i]);
    }
    expect(uniquePlates.size).toBeGreaterThan(1);
  });
});
