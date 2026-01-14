import { describe, it, expect } from "vitest";
import { createMockAdapter } from "@civ7/adapter";
import { createExtendedMapContext } from "@swooper/mapgen-core";
import { implementArtifacts } from "@swooper/mapgen-core/authoring";
import placement from "../../src/domain/placement/ops.js";
import { getStandardRuntime } from "../../src/recipes/standard/runtime.js";
import type { MorphologyLandmassesArtifact } from "../../src/recipes/standard/stages/morphology-pre/artifacts.js";
import { placementArtifacts } from "../../src/recipes/standard/stages/placement/artifacts.js";
import { applyPlacementPlan } from "../../src/recipes/standard/stages/placement/steps/placement/apply.js";
import { deriveContinentBounds, selectLandmassRegions } from "../../src/recipes/standard/stages/placement/landmass-regions.js";

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
    const landmasses = buildLandmasses(4, 4);
    const landmassRegions = { strategy: "largest" } as const;
    const selection = selectLandmassRegions(landmasses, landmassRegions);
    const { west, east } = deriveContinentBounds(4, 4, landmasses, selection);
    const baseStarts = {
      playersLandmass1: runtime.playersLandmass1,
      playersLandmass2: runtime.playersLandmass2,
      westContinent: west,
      eastContinent: east,
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
      landmasses,
      landmassRegions,
      starts,
      wonders,
      floodplains,
      publishOutputs: (outputs) => placementRuntime.placementOutputs.publish(context, outputs),
    });

    expect(adapter.calls.generateSnow.length).toBe(0);
  });
});

function buildLandmasses(width: number, height: number): MorphologyLandmassesArtifact {
  const size = Math.max(0, width * height);
  const tileToLandmass = new Int32Array(size);
  tileToLandmass.fill(1);
  return {
    tileToLandmass,
    landmasses: [{ id: 1, tiles: size }],
    landTiles: size,
  };
}
