import { describe, expect, it } from "bun:test";

import { createMockAdapter } from "@civ7/adapter";
import { createExtendedMapContext } from "@swooper/mapgen-core";
import { implementArtifacts } from "@swooper/mapgen-core/authoring";

import placement from "../../src/domain/placement/ops.js";
import { getStandardRuntime } from "../../src/recipes/standard/runtime.js";
import { placementArtifacts } from "../../src/recipes/standard/stages/placement/artifacts.js";
import { applyPlacementPlan } from "../../src/recipes/standard/stages/placement/steps/placement/apply.js";

describe("placement landmass region projection", () => {
  it("projects LandmassRegionId before resources and starts using adapter constants", () => {
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
    });
    const callOrder: string[] = [];
    const regionIds: number[] = [];

    const originalSetLandmassRegionId = adapter.setLandmassRegionId.bind(adapter);
    adapter.setLandmassRegionId = (x, y, regionId) => {
      callOrder.push("setLandmassRegionId");
      regionIds.push(regionId);
      originalSetLandmassRegionId(x, y, regionId);
    };
    const originalGenerateResources = adapter.generateResources.bind(adapter);
    adapter.generateResources = (width, height) => {
      callOrder.push("generateResources");
      originalGenerateResources(width, height);
    };
    const originalSetStartPosition = adapter.setStartPosition.bind(adapter);
    adapter.setStartPosition = (plotIndex, playerId) => {
      callOrder.push("setStartPosition");
      originalSetStartPosition(plotIndex, playerId);
    };

    const context = createExtendedMapContext({ width: 4, height: 2 }, adapter, { seed: 0 });
    const runtime = getStandardRuntime(context);
    const baseStarts = {
      playersLandmass1: runtime.playersLandmass1,
      playersLandmass2: runtime.playersLandmass2,
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

    const landmassIdByTile = new Int32Array(8);
    for (let i = 0; i < landmassIdByTile.length; i++) {
      const y = (i / 4) | 0;
      const x = i - y * 4;
      landmassIdByTile[i] = x < 2 ? 0 : 1;
    }

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
          { id: 0, tileCount: 4, bbox: { west: 0, east: 1, south: 0, north: 1 } },
          { id: 1, tileCount: 4, bbox: { west: 2, east: 3, south: 0, north: 1 } },
        ],
        landmassIdByTile,
      },
      publishOutputs: (outputs) => placementRuntime.placementOutputs.publish(context, outputs),
    });

    const firstProjection = callOrder.indexOf("setLandmassRegionId");
    const firstResources = callOrder.indexOf("generateResources");
    const firstStart = callOrder.indexOf("setStartPosition");

    expect(firstProjection).toBeGreaterThanOrEqual(0);
    expect(firstResources).toBeGreaterThan(firstProjection);
    expect(firstStart).toBeGreaterThan(firstProjection);
    expect(firstStart).toBeGreaterThan(firstResources);

    const allowed = new Set([
      adapter.getLandmassId("WEST"),
      adapter.getLandmassId("EAST"),
      adapter.getLandmassId("NONE"),
    ]);
    expect(regionIds.length).toBeGreaterThan(0);
    for (const id of regionIds) {
      expect(allowed.has(id)).toBe(true);
    }
  });
});
