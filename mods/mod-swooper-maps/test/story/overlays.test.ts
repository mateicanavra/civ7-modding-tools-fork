/**
 * Story Overlays Tests
 *
 * Tests for publishStoryOverlay, getStoryOverlay, and overlay utilities.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  STORY_OVERLAY_KEYS,
  resetStoryOverlays,
  publishStoryOverlay,
  finalizeStoryOverlay,
  getStoryOverlay,
} from "@mapgen/domain/narrative/overlays/index.js";
import type { StoryOverlayRegistry } from "@swooper/mapgen-core";

describe("story/overlays", () => {
  let ctx: { overlays?: StoryOverlayRegistry };
  const overlayCount = (overlays?: StoryOverlayRegistry): number => {
    if (!overlays) return 0;
    return overlays.corridors.length + overlays.swatches.length + overlays.motifs.length;
  };

  beforeEach(() => {
    ctx = { overlays: { corridors: [], swatches: [], motifs: [] } };
    resetStoryOverlays(ctx);
  });

  describe("STORY_OVERLAY_KEYS", () => {
    it("has expected keys", () => {
      expect(STORY_OVERLAY_KEYS.MARGINS).toBe("margins");
      expect(STORY_OVERLAY_KEYS.HOTSPOTS).toBe("hotspots");
      expect(STORY_OVERLAY_KEYS.RIFTS).toBe("rifts");
      expect(STORY_OVERLAY_KEYS.OROGENY).toBe("orogeny");
      expect(STORY_OVERLAY_KEYS.CORRIDORS).toBe("corridors");
      expect(STORY_OVERLAY_KEYS.SWATCHES).toBe("swatches");
      expect(STORY_OVERLAY_KEYS.PALEO).toBe("paleo");
    });
  });

  describe("resetStoryOverlays", () => {
    it("clears the context overlays map", () => {
      publishStoryOverlay(ctx, STORY_OVERLAY_KEYS.MARGINS, { width: 10, height: 10 });
      expect(overlayCount(ctx.overlays)).toBe(1);

      resetStoryOverlays(ctx);

      expect(overlayCount(ctx.overlays)).toBe(0);
    });
  });

  describe("publishStoryOverlay", () => {
    it("publishes an overlay to the provided context", () => {
      const snapshot = publishStoryOverlay(ctx, STORY_OVERLAY_KEYS.MARGINS, {
        width: 100,
        height: 80,
        active: ["1,1", "2,2"],
        passive: ["3,3"],
      });

      expect(snapshot.key).toBe(STORY_OVERLAY_KEYS.MARGINS);
      expect(snapshot.width).toBe(100);
      expect(snapshot.height).toBe(80);
      expect(snapshot.active).toEqual(["1,1", "2,2"]);
      expect(snapshot.passive).toEqual(["3,3"]);

      expect(getStoryOverlay(ctx, STORY_OVERLAY_KEYS.MARGINS)).toBe(snapshot);
    });

    it("attaches overlay to context when provided", () => {
      const ctx = { overlays: { corridors: [], swatches: [], motifs: [] } };

      publishStoryOverlay(ctx, STORY_OVERLAY_KEYS.MARGINS, { width: 50, height: 50 });

      expect(getStoryOverlay(ctx, STORY_OVERLAY_KEYS.MARGINS)?.width).toBe(50);
    });

    it("creates overlays map on context if missing", () => {
      const ctx: { overlays?: StoryOverlayRegistry } = {};

      publishStoryOverlay(ctx, STORY_OVERLAY_KEYS.SWATCHES, { width: 10, height: 10 });

      expect(ctx.overlays).toBeDefined();
      expect(getStoryOverlay(ctx, STORY_OVERLAY_KEYS.SWATCHES)).not.toBeNull();
    });

    it("normalizes overlay with defaults", () => {
      const snapshot = publishStoryOverlay(null, STORY_OVERLAY_KEYS.PALEO, {});

      expect(snapshot.key).toBe(STORY_OVERLAY_KEYS.PALEO);
      expect(snapshot.kind).toBe(STORY_OVERLAY_KEYS.PALEO); // defaults to key
      expect(snapshot.version).toBe(1);
      expect(snapshot.width).toBe(0);
      expect(snapshot.height).toBe(0);
      expect(snapshot.active).toEqual([]);
      expect(snapshot.passive).toEqual([]);
      expect(snapshot.summary).toEqual({});
    });

    it("freezes the snapshot", () => {
      const snapshot = publishStoryOverlay(null, STORY_OVERLAY_KEYS.PALEO, { width: 10 });

      expect(Object.isFrozen(snapshot)).toBe(true);
    });

    it("deduplicates active/passive arrays", () => {
      const snapshot = publishStoryOverlay(null, STORY_OVERLAY_KEYS.PALEO, {
        active: ["1,1", "2,2", "1,1", "3,3", "2,2"],
        passive: ["4,4", "4,4", "5,5"],
      });

      expect(snapshot.active).toEqual(["1,1", "2,2", "3,3"]);
      expect(snapshot.passive).toEqual(["4,4", "5,5"]);
    });
  });

  describe("finalizeStoryOverlay", () => {
    it("creates snapshot without publishing to registry", () => {
      const snapshot = finalizeStoryOverlay(STORY_OVERLAY_KEYS.SWATCHES, {
        width: 100,
        height: 80,
      });

      expect(snapshot.key).toBe(STORY_OVERLAY_KEYS.SWATCHES);
      expect(snapshot.width).toBe(100);
    });

    it("normalizes the same as publishStoryOverlay", () => {
      const snapshot = finalizeStoryOverlay(STORY_OVERLAY_KEYS.SWATCHES, {
        active: ["1,1", "1,1"],
      });

      expect(snapshot.active).toEqual(["1,1"]);
      expect(Object.isFrozen(snapshot)).toBe(true);
    });
  });

  describe("getStoryOverlay", () => {
    it("returns overlay from context if available", () => {
      const snapshot = finalizeStoryOverlay(STORY_OVERLAY_KEYS.SWATCHES, { width: 42 });
      const ctx = {
        overlays: {
          corridors: [],
          swatches: [snapshot],
          motifs: [],
        },
      };

      const result = getStoryOverlay(ctx, STORY_OVERLAY_KEYS.SWATCHES);

      expect(result).toBe(snapshot);
    });

    it("does not persist overlays without a context", () => {
      publishStoryOverlay(null, STORY_OVERLAY_KEYS.MARGINS, { width: 100 });
      expect(getStoryOverlay(null, STORY_OVERLAY_KEYS.MARGINS)).toBeNull();
    });

    it("returns null for missing overlay", () => {
      const result = getStoryOverlay(null, STORY_OVERLAY_KEYS.RIFTS);

      expect(result).toBeNull();
    });
  });

  describe("isolation", () => {
    it("does not leak state between tests", () => {
      expect(overlayCount(ctx.overlays)).toBe(0);
    });
  });
});
