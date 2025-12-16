import { describe, it, expect } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import { parseConfig } from "../../src/config/index.js";
import { createExtendedMapContext } from "../../src/core/types.js";
import { OCEAN_TERRAIN } from "../../src/core/terrain-constants.js";
import { getStoryTags } from "../../src/domain/narrative/tags/index.js";
import {
  getStoryOverlay,
  STORY_OVERLAY_KEYS,
} from "../../src/domain/narrative/overlays/index.js";
import { storyTagStrategicCorridors } from "../../src/domain/narrative/corridors/index.js";

describe("story/corridors", () => {
  it("tags sea lanes and publishes a corridors overlay", () => {
    const width = 20;
    const height = 12;
    const adapter = createMockAdapter({ width, height, defaultTerrainType: OCEAN_TERRAIN });
    (adapter as any).fillWater(true);

    const ctx = createExtendedMapContext({ width, height }, adapter, parseConfig({}));

    storyTagStrategicCorridors(ctx, "preIslands");

    expect(getStoryTags(ctx).corridorSeaLane.size).toBeGreaterThan(0);

    const overlay = getStoryOverlay(ctx, STORY_OVERLAY_KEYS.CORRIDORS);
    expect(overlay).not.toBeNull();
    expect(overlay?.summary).toMatchObject({ stage: "preIslands" });
  });
});
