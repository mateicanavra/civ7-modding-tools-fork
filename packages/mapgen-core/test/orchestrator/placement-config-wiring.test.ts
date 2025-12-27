import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import { bootstrap } from "@mapgen/bootstrap/entry.js";
import { runTaskGraphGeneration } from "@mapgen/index.js";
import { createExtendedMapContext } from "@mapgen/core/types.js";
import { baseMod } from "@mapgen/base/index.js";
import { publishPlacementInputsArtifact } from "@mapgen/base/pipeline/artifacts.js";
import { createPlacementStep } from "@mapgen/base/pipeline/placement/steps.js";

describe("placement config wiring", () => {
  const width = 24;
  const height = 16;
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

  it("PlacementStep honors explicit placement config", () => {
    const adapter = createMockAdapter({ width, height, mapSizeId: 1, mapInfo, rng: () => 0 });
    const ctx = createExtendedMapContext(
      { width, height, wrapX: true, wrapY: false, topLatitude: 80, bottomLatitude: -80 },
      adapter,
      {
        placement: { wondersPlusOne: false, floodplains: { minLength: 1, maxLength: 2 } },
      } as unknown as Parameters<typeof createExtendedMapContext>[2]
    );
    const stepConfig = {
      placement: { wondersPlusOne: false, floodplains: { minLength: 1, maxLength: 2 } },
    };

    const starts = {
      playersLandmass1: 0,
      playersLandmass2: 0,
      westContinent: { west: 0, east: 0, south: 0, north: 0 },
      eastContinent: { west: 0, east: 0, south: 0, north: 0 },
      startSectorRows: mapInfo.StartSectorRows ?? 0,
      startSectorCols: mapInfo.StartSectorCols ?? 0,
      startSectors: [],
    };

    const startPositions: number[] = [];
    const step = createPlacementStep(
      {
        startPositions,
      },
      { requires: [], provides: [] }
    );

    publishPlacementInputsArtifact(ctx, {
      mapInfo,
      starts,
      placementConfig: stepConfig.placement,
    });

    step.run(ctx, stepConfig);

    const calls = (adapter as unknown as { calls: any }).calls;
    expect(calls.addNaturalWonders[0]?.numWonders).toBe(0);
    expect(calls.addFloodplains[0]).toEqual({ minLength: 1, maxLength: 2 });
  });

  it("runTaskGraphGeneration does not run placement without prerequisites", () => {
    const adapter = createMockAdapter({ width, height, mapSizeId: 1, mapInfo, rng: () => 0 });
    const config = bootstrap();
    const recipeOverride = { schemaVersion: 1, id: "test.placement-only", steps: [{ id: "placement" }] };

    const result = runTaskGraphGeneration({
      mod: baseMod,
      mapGenConfig: config,
      orchestratorOptions: {
        adapter,
        logPrefix: "[TEST]",
        recipeOverride,
      },
    });

    expect(result.success).toBe(false);

    const calls = (adapter as unknown as { calls: any }).calls;
    expect(calls.addNaturalWonders.length).toBe(0);
    expect(calls.addFloodplains.length).toBe(0);
  });
});
