import { describe, expect, it } from "bun:test";

import { createMockAdapter } from "@civ7/adapter";
import { FLAT_TERRAIN, NAVIGABLE_RIVER_TERRAIN } from "@swooper/mapgen-core";
import { applyNavigableRiverTerrain } from "../../src/recipes/standard/stages/map-hydrology/steps/plotRivers.js";

function idx(x: number, y: number, width: number): number {
  return y * width + x;
}

describe("map-hydrology:metrics", () => {
  it("stamps navigable river terrain from hydrography-derived masks (1:1 overlap)", () => {
    const width = 5;
    const height = 5;
    const size = width * height;

    const adapter = createMockAdapter({ width, height, defaultTerrainType: FLAT_TERRAIN });

    const hydrographyNav = new Uint8Array(size);
    for (let x = 0; x < width; x++) {
      hydrographyNav[idx(x, 2, width)] = 1;
    }

    const stamped = applyNavigableRiverTerrain(adapter, width, height, hydrographyNav);

    const engineNav = new Uint8Array(size);
    let engineNavCount = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = idx(x, y, width);
        const isNav = adapter.getTerrainType(x, y) === NAVIGABLE_RIVER_TERRAIN;
        engineNav[i] = isNav ? 1 : 0;
        if (isNav) engineNavCount += 1;
      }
    }

    let overlap = 0;
    for (let i = 0; i < size; i++) {
      if (engineNav[i] === 1 && hydrographyNav[i] === 1) overlap += 1;
    }

    expect(stamped).toBe(width);
    expect(engineNavCount).toBe(width);
    expect(overlap).toBe(width);
  });
});
