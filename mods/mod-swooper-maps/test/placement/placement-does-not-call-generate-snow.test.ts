import { describe, it, expect } from "vitest";
import { createMockAdapter } from "@civ7/adapter";
import { createExtendedMapContext } from "@swooper/mapgen-core";
import placement from "../../src/domain/placement/ops.js";
import { getBaseStarts, getStandardRuntime } from "../../src/recipes/standard/runtime.js";
import { applyPlacementPlan } from "../../src/recipes/standard/stages/placement/steps/placement/apply.js";

describe("placement", () => {
  it("does not call adapter.generateSnow", () => {
    const adapter = createMockAdapter({
      width: 4,
      height: 4,
      mapInfo: {
        GridWidth: 4,
        GridHeight: 4,
        PlayersLandmass1: 1,
        PlayersLandmass2: 1,
        StartSectorRows: 1,
        StartSectorCols: 1,
        NumNaturalWonders: 0,
      },
    });
    const context = createExtendedMapContext({ width: 4, height: 4 }, adapter, { seed: 0 });
    const runtime = getStandardRuntime(context);
    const baseStarts = getBaseStarts(context);

    const starts = placement.ops.planStarts.run(
      { baseStarts },
      placement.ops.planStarts.defaultConfig
    );
    const wonders = placement.ops.planWonders.run(
      { mapInfo: runtime.mapInfo },
      placement.ops.planWonders.defaultConfig
    );
    const floodplains = placement.ops.planFloodplains.run(
      {},
      placement.ops.planFloodplains.defaultConfig
    );

    applyPlacementPlan({ context, starts, wonders, floodplains });

    expect(adapter.calls.generateSnow.length).toBe(0);
  });
});
