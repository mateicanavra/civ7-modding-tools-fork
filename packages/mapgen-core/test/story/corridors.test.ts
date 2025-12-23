import { describe, it, expect } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import { parseConfig } from "@mapgen/config/index.js";
import { createExtendedMapContext } from "@mapgen/core/types.js";
import { OCEAN_TERRAIN } from "@mapgen/core/terrain-constants.js";
import { getStoryTags } from "@mapgen/domain/narrative/tags/index.js";
import {
  getStoryOverlay,
  STORY_OVERLAY_KEYS,
} from "@mapgen/domain/narrative/overlays/index.js";
import { storyTagStrategicCorridors } from "@mapgen/domain/narrative/corridors/index.js";

describe("story/corridors", () => {
  it("tags sea lanes and publishes a corridors overlay", () => {
    const width = 20;
    const height = 12;
    const adapter = createMockAdapter({ width, height, defaultTerrainType: OCEAN_TERRAIN });
    (adapter as any).fillWater(true);

    const config = parseConfig({});
    const ctx = createExtendedMapContext({ width, height }, adapter, config);

    storyTagStrategicCorridors(ctx, "preIslands", {
      corridors: config.corridors,
      directionality: config.foundation?.dynamics?.directionality,
    });

    expect(getStoryTags(ctx).corridorSeaLane.size).toBeGreaterThan(0);

    const overlay = getStoryOverlay(ctx, STORY_OVERLAY_KEYS.CORRIDORS);
    expect(overlay).not.toBeNull();
    expect(overlay?.summary).toMatchObject({ stage: "preIslands" });
  });
});
