import { describe, it, expect } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import { bootstrap } from "../../src/bootstrap/entry.js";
import { MapOrchestrator } from "../../src/MapOrchestrator.js";
import { createExtendedMapContext } from "../../src/core/types.js";
import { createLegacyPlacementStep } from "../../src/steps/LegacyPlacementStep.js";

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

  it("LegacyPlacementStep honors ctx.config.placement overrides", () => {
    const adapter = createMockAdapter({ width, height, mapSizeId: 1, mapInfo, rng: () => 0 });
    const ctx = createExtendedMapContext(
      { width, height, wrapX: true, wrapY: false, topLatitude: 80, bottomLatitude: -80 },
      adapter,
      {
        placement: { wondersPlusOne: false, floodplains: { minLength: 1, maxLength: 2 } },
      } as unknown as Parameters<typeof createExtendedMapContext>[2]
    );

    const step = createLegacyPlacementStep({
      requires: [],
      provides: [],
      placementOptions: {
        mapInfo,
      },
    });

    step.run(ctx);

    const calls = (adapter as unknown as { calls: any }).calls;
    expect(calls.addNaturalWonders[0]?.numWonders).toBe(0);
    expect(calls.addFloodplains[0]).toEqual({ minLength: 1, maxLength: 2 });
  });

  it("MapOrchestrator.generateMap does not hardcode placement defaults over config", () => {
    const adapter = createMockAdapter({ width, height, mapSizeId: 1, mapInfo, rng: () => 0 });
    const config = bootstrap({
      stageConfig: { placement: true },
      overrides: {
        placement: { wondersPlusOne: false, floodplains: { minLength: 1, maxLength: 2 } },
      },
    });

    const orchestrator = new MapOrchestrator(config, { adapter, logPrefix: "[TEST]" });
    const result = orchestrator.generateMap();

    expect(result.success).toBe(true);

    const calls = (adapter as unknown as { calls: any }).calls;
    expect(calls.addNaturalWonders[0]?.numWonders).toBe(0);
    expect(calls.addFloodplains[0]).toEqual({ minLength: 1, maxLength: 2 });
  });
});

