import { describe, expect, it } from "bun:test";

import { createMockAdapter } from "@civ7/adapter";
import { FLAT_TERRAIN, NAVIGABLE_RIVER_TERRAIN } from "@swooper/mapgen-core";
import { tryPlaceFeature } from "../../src/recipes/standard/stages/map-ecology/steps/features/apply.js";

describe("map-ecology:features-apply", () => {
  it("does not place features on navigable river terrain", () => {
    const width = 3;
    const height = 3;
    const adapter = createMockAdapter({ width, height, defaultTerrainType: FLAT_TERRAIN });

    adapter.setTerrainType(1, 1, NAVIGABLE_RIVER_TERRAIN);

    expect(tryPlaceFeature(adapter, 1, 1, 0)).toBe(false);
    expect(adapter.getFeatureType(1, 1)).toBe(-1);

    expect(tryPlaceFeature(adapter, 2, 2, 0)).toBe(true);
    expect(adapter.getFeatureType(2, 2)).toBe(0);
  });
});

