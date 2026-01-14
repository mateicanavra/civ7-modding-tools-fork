import { describe, expect, it } from "vitest";
import { createMockAdapter } from "@civ7/adapter";
import { createExtendedMapContext } from "@swooper/mapgen-core";
import { implementArtifacts } from "@swooper/mapgen-core/authoring";
import placement from "../../src/domain/placement/ops.js";
import { getStandardRuntime } from "../../src/recipes/standard/runtime.js";
import type { MorphologyLandmassesArtifact } from "../../src/recipes/standard/stages/morphology-pre/artifacts.js";
import { placementArtifacts } from "../../src/recipes/standard/stages/placement/artifacts.js";
import { deriveContinentBounds, selectLandmassRegions } from "../../src/recipes/standard/stages/placement/landmass-regions.js";
import { applyPlacementPlan } from "../../src/recipes/standard/stages/placement/steps/placement/apply.js";

describe("placement landmass region projection", () => {
  it("labels LandmassRegionId before resources and starts", () => {
    const adapter = createMockAdapter({
      width: 4,
      height: 2,
      mapInfo: {
        GridWidth: 4,
        GridHeight: 2,
        PlayersLandmass1: 1,
        PlayersLandmass2: 1,
        StartSectorRows: 1,
        StartSectorCols: 1,
        NumNaturalWonders: 0,
      },
      landmassIds: {
        WEST: 11,
        EAST: 22,
      },
    });
    const context = createExtendedMapContext({ width: 4, height: 2 }, adapter, { seed: 1 });
    const runtime = getStandardRuntime(context);
    const landmasses = buildLandmasses(4, 2);
    const landmassRegions = { strategy: "largest" } as const;
    const selection = selectLandmassRegions(landmasses, landmassRegions);
    const { west, east } = deriveContinentBounds(4, 2, landmasses, selection);

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

    const callOrder: string[] = [];
    const originalSetLandmassRegionId = adapter.setLandmassRegionId.bind(adapter);
    adapter.setLandmassRegionId = (x, y, regionId) => {
      callOrder.push("setLandmassRegionId");
      return originalSetLandmassRegionId(x, y, regionId);
    };

    const originalGenerateResources = adapter.generateResources.bind(adapter);
    adapter.generateResources = (width, height) => {
      callOrder.push("generateResources");
      return originalGenerateResources(width, height);
    };

    const originalAssignStartPositions = adapter.assignStartPositions.bind(adapter);
    adapter.assignStartPositions = (
      playersLandmass1,
      playersLandmass2,
      westContinent,
      eastContinent,
      startSectorRows,
      startSectorCols,
      startSectors
    ) => {
      callOrder.push("assignStartPositions");
      return originalAssignStartPositions(
        playersLandmass1,
        playersLandmass2,
        westContinent,
        eastContinent,
        startSectorRows,
        startSectorCols,
        startSectors
      );
    };

    applyPlacementPlan({
      context,
      landmasses,
      landmassRegions,
      starts,
      wonders,
      floodplains,
      publishOutputs: (outputs) => placementRuntime.placementOutputs.publish(context, outputs),
    });

    expect(adapter.calls.setLandmassRegionId.length).toBeGreaterThan(0);
    const regionIds = new Set(adapter.calls.setLandmassRegionId.map((call) => call.regionId));
    expect(regionIds.has(11)).toBe(true);
    expect(regionIds.has(22)).toBe(true);

    const lastRegionIndex = callOrder.lastIndexOf("setLandmassRegionId");
    const resourcesIndex = callOrder.indexOf("generateResources");
    const startsIndex = callOrder.indexOf("assignStartPositions");

    expect(lastRegionIndex).toBeGreaterThan(-1);
    expect(resourcesIndex).toBeGreaterThan(lastRegionIndex);
    expect(startsIndex).toBeGreaterThan(lastRegionIndex);
  });
});

function buildLandmasses(width: number, height: number): MorphologyLandmassesArtifact {
  const size = Math.max(0, width * height);
  const tileToLandmass = new Int32Array(size);
  let landmass1Tiles = 0;
  let landmass2Tiles = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (y < 1) {
        tileToLandmass[idx] = 1;
        landmass1Tiles++;
      } else {
        tileToLandmass[idx] = 2;
        landmass2Tiles++;
      }
    }
  }

  return {
    tileToLandmass,
    landmasses: [
      { id: 1, tiles: landmass1Tiles },
      { id: 2, tiles: landmass2Tiles },
    ],
    landTiles: landmass1Tiles + landmass2Tiles,
  };
}
