import { describe, it, expect } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import { parseConfig } from "../../src/config/index.js";
import { createExtendedMapContext } from "../../src/core/types.js";
import {
  getStoryOverlay,
  STORY_OVERLAY_KEYS,
} from "../../src/domain/narrative/overlays/index.js";
import {
  getOrogenyCache,
  storyTagOrogenyBelts,
} from "../../src/domain/narrative/orogeny/index.js";

describe("story/orogeny", () => {
  it("tags legacy orogeny belts from mountain density and publishes an overlay", () => {
    const width = 30;
    const height = 20;
    const adapter = createMockAdapter({ width, height });

    // Create a dense mountain patch to exceed the minLenSoft floor (>=10).
    for (let y = 6; y <= 10; y++) {
      for (let x = 10; x <= 14; x++) {
        (adapter as any).setMountain(x, y, true);
      }
    }

    const ctx = createExtendedMapContext(
      { width, height },
      adapter,
      parseConfig({ story: { orogeny: { beltMinLength: 12 } } })
    );

    storyTagOrogenyBelts(ctx);

    const cache = getOrogenyCache(ctx);
    expect(cache.belts.size).toBeGreaterThan(0);
    expect(cache.windward.size).toBeGreaterThan(0);
    expect(cache.lee.size).toBeGreaterThan(0);

    const overlay = getStoryOverlay(ctx, STORY_OVERLAY_KEYS.OROGENY);
    expect(overlay).not.toBeNull();
    expect(overlay?.key).toBe(STORY_OVERLAY_KEYS.OROGENY);
  });
});
