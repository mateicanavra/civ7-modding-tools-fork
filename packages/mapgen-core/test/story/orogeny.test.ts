import { describe, it, expect } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import { parseConfig } from "../../src/config/index.js";
import { createExtendedMapContext } from "../../src/core/types.js";
import {
  getStoryOverlay,
  STORY_OVERLAY_KEYS,
} from "../../src/domain/narrative/overlays/index.js";
import {
  storyTagOrogenyBelts,
} from "../../src/domain/narrative/orogeny/index.js";

describe("story/orogeny", () => {
  it("fails fast when foundation context is missing", () => {
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

    expect(() => storyTagOrogenyBelts(ctx)).toThrow("FoundationContext");

    const overlay = getStoryOverlay(ctx, STORY_OVERLAY_KEYS.OROGENY);
    expect(overlay).toBeNull();
  });
});
