/**
 * Story Tags Tests
 *
 * Tests for getStoryTags, resetStoryTags, clearStoryTags and helper functions.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  getStoryTags,
  resetStoryTags,
  clearStoryTags,
  hasTag,
  addTag,
  removeTag,
  getTagCoordinates,
} from "../../src/domain/narrative/tags/index.js";

describe("story/tags", () => {
  beforeEach(() => {
    resetStoryTags();
  });

  describe("getStoryTags", () => {
    it("returns a StoryTags instance", () => {
      const tags = getStoryTags();

      expect(tags).toBeDefined();
      expect(tags.hotspot).toBeInstanceOf(Set);
      expect(tags.riftLine).toBeInstanceOf(Set);
      expect(tags.corridorKind).toBeInstanceOf(Map);
    });

    it("returns cached instance on repeated calls", () => {
      const tags1 = getStoryTags();
      const tags2 = getStoryTags();

      expect(tags1).toBe(tags2);
    });

    it("has all expected tag sets", () => {
      const tags = getStoryTags();

      // Hotspot tags
      expect(tags.hotspot).toBeDefined();
      expect(tags.hotspotParadise).toBeDefined();
      expect(tags.hotspotVolcanic).toBeDefined();

      // Rift tags
      expect(tags.riftLine).toBeDefined();
      expect(tags.riftShoulder).toBeDefined();

      // Margin tags
      expect(tags.activeMargin).toBeDefined();
      expect(tags.passiveShelf).toBeDefined();

      // Corridor tags
      expect(tags.corridorSeaLane).toBeDefined();
      expect(tags.corridorIslandHop).toBeDefined();
      expect(tags.corridorLandOpen).toBeDefined();
      expect(tags.corridorRiverChain).toBeDefined();

      // Corridor metadata
      expect(tags.corridorKind).toBeDefined();
      expect(tags.corridorStyle).toBeDefined();
      expect(tags.corridorAttributes).toBeDefined();
    });

    it("starts with empty sets", () => {
      const tags = getStoryTags();

      expect(tags.hotspot.size).toBe(0);
      expect(tags.riftLine.size).toBe(0);
      expect(tags.corridorSeaLane.size).toBe(0);
      expect(tags.corridorKind.size).toBe(0);
    });
  });

  describe("resetStoryTags", () => {
    it("creates a new instance after reset", () => {
      const tags1 = getStoryTags();
      resetStoryTags();
      const tags2 = getStoryTags();

      expect(tags1).not.toBe(tags2);
    });

    it("clears all data after reset", () => {
      const tags = getStoryTags();
      tags.hotspot.add("5,10");
      tags.riftLine.add("20,30");
      expect(tags.hotspot.size).toBe(1);

      resetStoryTags();
      const newTags = getStoryTags();

      expect(newTags.hotspot.size).toBe(0);
      expect(newTags.riftLine.size).toBe(0);
    });
  });

  describe("clearStoryTags", () => {
    it("clears all tag sets without resetting instance", () => {
      const tags = getStoryTags();
      tags.hotspot.add("5,10");
      tags.riftLine.add("20,30");
      tags.corridorKind.set("1,2", "sea");

      clearStoryTags();

      // Same instance
      expect(getStoryTags()).toBe(tags);

      // But all cleared
      expect(tags.hotspot.size).toBe(0);
      expect(tags.riftLine.size).toBe(0);
      expect(tags.corridorKind.size).toBe(0);
    });

    it("clears all tag types", () => {
      const tags = getStoryTags();

      // Add data to all
      tags.hotspot.add("1,1");
      tags.hotspotParadise.add("2,2");
      tags.hotspotVolcanic.add("3,3");
      tags.riftLine.add("4,4");
      tags.riftShoulder.add("5,5");
      tags.activeMargin.add("6,6");
      tags.passiveShelf.add("7,7");
      tags.corridorSeaLane.add("8,8");
      tags.corridorIslandHop.add("9,9");
      tags.corridorLandOpen.add("10,10");
      tags.corridorRiverChain.add("11,11");
      tags.corridorKind.set("12,12", "test");
      tags.corridorStyle.set("13,13", "test");
      tags.corridorAttributes.set("14,14", { foo: "bar" });

      clearStoryTags();

      expect(tags.hotspot.size).toBe(0);
      expect(tags.hotspotParadise.size).toBe(0);
      expect(tags.hotspotVolcanic.size).toBe(0);
      expect(tags.riftLine.size).toBe(0);
      expect(tags.riftShoulder.size).toBe(0);
      expect(tags.activeMargin.size).toBe(0);
      expect(tags.passiveShelf.size).toBe(0);
      expect(tags.corridorSeaLane.size).toBe(0);
      expect(tags.corridorIslandHop.size).toBe(0);
      expect(tags.corridorLandOpen.size).toBe(0);
      expect(tags.corridorRiverChain.size).toBe(0);
      expect(tags.corridorKind.size).toBe(0);
      expect(tags.corridorStyle.size).toBe(0);
      expect(tags.corridorAttributes.size).toBe(0);
    });
  });

  describe("hasTag", () => {
    it("returns true when tag exists", () => {
      const tags = getStoryTags();
      tags.hotspot.add("5,10");

      expect(hasTag(tags.hotspot, 5, 10)).toBe(true);
    });

    it("returns false when tag does not exist", () => {
      const tags = getStoryTags();

      expect(hasTag(tags.hotspot, 5, 10)).toBe(false);
    });
  });

  describe("addTag", () => {
    it("adds a tag to the set", () => {
      const tags = getStoryTags();

      addTag(tags.hotspot, 5, 10);

      expect(tags.hotspot.has("5,10")).toBe(true);
      expect(hasTag(tags.hotspot, 5, 10)).toBe(true);
    });

    it("does not duplicate tags", () => {
      const tags = getStoryTags();

      addTag(tags.hotspot, 5, 10);
      addTag(tags.hotspot, 5, 10);

      expect(tags.hotspot.size).toBe(1);
    });
  });

  describe("removeTag", () => {
    it("removes a tag from the set", () => {
      const tags = getStoryTags();
      addTag(tags.hotspot, 5, 10);

      const result = removeTag(tags.hotspot, 5, 10);

      expect(result).toBe(true);
      expect(hasTag(tags.hotspot, 5, 10)).toBe(false);
    });

    it("returns false when tag does not exist", () => {
      const tags = getStoryTags();

      const result = removeTag(tags.hotspot, 5, 10);

      expect(result).toBe(false);
    });
  });

  describe("getTagCoordinates", () => {
    it("returns empty array for empty set", () => {
      const tags = getStoryTags();

      const coords = getTagCoordinates(tags.hotspot);

      expect(coords).toEqual([]);
    });

    it("returns all coordinates from set", () => {
      const tags = getStoryTags();
      addTag(tags.hotspot, 5, 10);
      addTag(tags.hotspot, 20, 30);
      addTag(tags.hotspot, 0, 0);

      const coords = getTagCoordinates(tags.hotspot);

      expect(coords).toHaveLength(3);
      expect(coords).toContainEqual({ x: 5, y: 10 });
      expect(coords).toContainEqual({ x: 20, y: 30 });
      expect(coords).toContainEqual({ x: 0, y: 0 });
    });
  });

  describe("isolation", () => {
    it("does not leak state between tests", () => {
      const tags = getStoryTags();
      expect(tags.hotspot.size).toBe(0);
      expect(tags.riftLine.size).toBe(0);
    });
  });
});
