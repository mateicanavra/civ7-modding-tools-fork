import { describe, it, expect } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import { createExtendedMapContext, OCEAN_TERRAIN } from "@swooper/mapgen-core";
import { CorridorsConfigSchema, FoundationDirectionalityConfigSchema } from "@mapgen/domain/config";
import {
  getStoryOverlay,
  STORY_OVERLAY_KEYS,
} from "@mapgen/domain/narrative/overlays/index.js";
import { storyTagStrategicCorridors } from "@mapgen/domain/narrative/corridors/index.js";
import { normalizeStrictOrThrow } from "../support/compiler-helpers.js";

describe("story/corridors", () => {
  it("tags sea lanes and publishes a corridors overlay", () => {
    const width = 20;
    const height = 12;
    const corridorsConfig = normalizeStrictOrThrow(CorridorsConfigSchema, {}, "/story/corridors");
    const directionality = normalizeStrictOrThrow(
      FoundationDirectionalityConfigSchema,
      {},
      "/env/directionality"
    );
    const env = {
      seed: 0,
      dimensions: { width, height },
      latitudeBounds: { topLatitude: 0, bottomLatitude: 0 },
      wrap: { wrapX: false, wrapY: false },
      directionality,
    };
    const adapter = createMockAdapter({ width, height, defaultTerrainType: OCEAN_TERRAIN });
    (adapter as any).fillWater(true);

    const ctx = createExtendedMapContext({ width, height }, adapter, env);

    const result = storyTagStrategicCorridors(ctx, "preIslands", {
      corridors: corridorsConfig,
      directionality,
    });

    expect(result.corridors).not.toBeNull();
    expect(result.corridors.seaLanes.size).toBeGreaterThan(0);

    const overlay = getStoryOverlay(ctx, STORY_OVERLAY_KEYS.CORRIDORS);
    expect(overlay).not.toBeNull();
    expect(overlay?.summary).toMatchObject({ stage: "preIslands" });
  });
});
