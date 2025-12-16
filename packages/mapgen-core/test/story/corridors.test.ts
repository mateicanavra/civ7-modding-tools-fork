import { describe, it, expect, beforeEach } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import { parseConfig } from "../../src/config/index.js";
import { createExtendedMapContext } from "../../src/core/types.js";
import { OCEAN_TERRAIN } from "../../src/core/terrain-constants.js";
import { resetStoryTags, getStoryTags } from "../../src/domain/narrative/tags/index.js";
import {
  resetStoryOverlays,
  getStoryOverlay,
  STORY_OVERLAY_KEYS,
} from "../../src/domain/narrative/overlays/index.js";
import { storyTagStrategicCorridors } from "../../src/domain/narrative/corridors/index.js";

describe("story/corridors", () => {
  beforeEach(() => {
    resetStoryTags();
    resetStoryOverlays();
  });

  it("tags sea lanes and publishes a corridors overlay", () => {
    const width = 20;
    const height = 12;
    const adapter = createMockAdapter({ width, height, defaultTerrainType: OCEAN_TERRAIN });
    (adapter as any).fillWater(true);

    const ctx = createExtendedMapContext({ width, height }, adapter, parseConfig({}));

    storyTagStrategicCorridors(ctx, "preIslands");

    expect(getStoryTags().corridorSeaLane.size).toBeGreaterThan(0);

    const overlay = getStoryOverlay(ctx, STORY_OVERLAY_KEYS.CORRIDORS);
    expect(overlay).not.toBeNull();
    expect(overlay?.summary).toMatchObject({ stage: "preIslands" });
  });
});
