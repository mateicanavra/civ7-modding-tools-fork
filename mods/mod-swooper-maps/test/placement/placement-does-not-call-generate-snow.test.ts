import { describe, it, expect } from "vitest";
import { createMockAdapter } from "@civ7/adapter";
import { createExtendedMapContext } from "@swooper/mapgen-core";
import { implementArtifacts } from "@swooper/mapgen-core/authoring";
import placement from "../../src/domain/placement/ops.js";
import { getStandardRuntime } from "../../src/recipes/standard/runtime.js";
import { placementArtifacts } from "../../src/recipes/standard/stages/placement/artifacts.js";
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
    const baseStarts = {
      playersLandmass1: runtime.playersLandmass1,
      playersLandmass2: runtime.playersLandmass2,
      westContinent: { west: 0, east: 2, south: 0, north: 3, continent: 0 },
      eastContinent: { west: 2, east: 3, south: 0, north: 3, continent: 1 },
      startSectorRows: runtime.startSectorRows,
      startSectorCols: runtime.startSectorCols,
      startSectors: runtime.startSectors,
    };

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

    const placementRuntime = implementArtifacts([placementArtifacts.placementOutputs], {
      placementOutputs: {},
    });
    applyPlacementPlan({
      context,
      starts,
      wonders,
      floodplains,
      landmasses: {
        landmasses: [
          { id: 0, tileCount: 16, bbox: { west: 0, east: 3, south: 0, north: 3 } },
        ],
        landmassIdByTile: new Int32Array(16).fill(0),
      },
      publishOutputs: (outputs) => placementRuntime.placementOutputs.publish(context, outputs),
    });

    expect(adapter.calls.generateSnow.length).toBe(0);
  });
});
