/**
 * Core Utilities Tests
 *
 * Tests for idx, inBounds, storyKey, clamp, lerp, wrapX, fillBuffer functions.
 */

import { describe, it, expect } from "bun:test";
import {
  idx,
  inBounds,
  storyKey,
  parseStoryKey,
  clamp,
  lerp,
  wrapX,
  fillBuffer,
} from "@mapgen/core/index.js";

describe("core/utils", () => {
  describe("idx", () => {
    it("calculates linear index from (x, y) coordinates", () => {
      expect(idx(0, 0, 10)).toBe(0);
      expect(idx(5, 0, 10)).toBe(5);
      expect(idx(0, 1, 10)).toBe(10);
      expect(idx(3, 2, 10)).toBe(23);
    });

    it("works with different widths", () => {
      expect(idx(0, 1, 5)).toBe(5);
      expect(idx(0, 1, 20)).toBe(20);
      expect(idx(4, 3, 100)).toBe(304);
    });
  });

  describe("inBounds", () => {
    it("returns true for coordinates within bounds", () => {
      expect(inBounds(0, 0, 10, 10)).toBe(true);
      expect(inBounds(5, 5, 10, 10)).toBe(true);
      expect(inBounds(9, 9, 10, 10)).toBe(true);
    });

    it("returns false for coordinates outside bounds", () => {
      expect(inBounds(-1, 0, 10, 10)).toBe(false);
      expect(inBounds(0, -1, 10, 10)).toBe(false);
      expect(inBounds(10, 0, 10, 10)).toBe(false);
      expect(inBounds(0, 10, 10, 10)).toBe(false);
      expect(inBounds(10, 10, 10, 10)).toBe(false);
    });

    it("handles edge cases", () => {
      expect(inBounds(0, 0, 1, 1)).toBe(true);
      expect(inBounds(1, 0, 1, 1)).toBe(false);
      expect(inBounds(0, 1, 1, 1)).toBe(false);
    });
  });

  describe("storyKey", () => {
    it("produces stable string key for coordinates", () => {
      expect(storyKey(0, 0)).toBe("0,0");
      expect(storyKey(10, 20)).toBe("10,20");
      expect(storyKey(123, 456)).toBe("123,456");
    });

    it("handles negative coordinates", () => {
      expect(storyKey(-1, -2)).toBe("-1,-2");
      expect(storyKey(-10, 20)).toBe("-10,20");
    });
  });

  describe("parseStoryKey", () => {
    it("parses story key back into coordinates", () => {
      expect(parseStoryKey("0,0")).toEqual({ x: 0, y: 0 });
      expect(parseStoryKey("10,20")).toEqual({ x: 10, y: 20 });
      expect(parseStoryKey("123,456")).toEqual({ x: 123, y: 456 });
    });

    it("handles negative coordinates", () => {
      expect(parseStoryKey("-1,-2")).toEqual({ x: -1, y: -2 });
      expect(parseStoryKey("-10,20")).toEqual({ x: -10, y: 20 });
    });

    it("round-trips with storyKey", () => {
      const x = 42, y = 99;
      const key = storyKey(x, y);
      const parsed = parseStoryKey(key);
      expect(parsed).toEqual({ x, y });
    });
  });

  describe("clamp", () => {
    it("returns value when within range", () => {
      expect(clamp(50, 0, 100)).toBe(50);
      expect(clamp(0, 0, 100)).toBe(0);
      expect(clamp(100, 0, 100)).toBe(100);
    });

    it("clamps to min when below range", () => {
      expect(clamp(-10, 0, 100)).toBe(0);
      expect(clamp(-1, 0, 100)).toBe(0);
    });

    it("clamps to max when above range", () => {
      expect(clamp(110, 0, 100)).toBe(100);
      expect(clamp(200, 0, 100)).toBe(100);
    });

    it("works with different ranges", () => {
      expect(clamp(5, 10, 20)).toBe(10);
      expect(clamp(25, 10, 20)).toBe(20);
      expect(clamp(15, 10, 20)).toBe(15);
    });
  });

  describe("lerp", () => {
    it("returns a when t=0", () => {
      expect(lerp(0, 100, 0)).toBe(0);
      expect(lerp(10, 50, 0)).toBe(10);
    });

    it("returns b when t=1", () => {
      expect(lerp(0, 100, 1)).toBe(100);
      expect(lerp(10, 50, 1)).toBe(50);
    });

    it("interpolates correctly for t=0.5", () => {
      expect(lerp(0, 100, 0.5)).toBe(50);
      expect(lerp(10, 50, 0.5)).toBe(30);
    });

    it("interpolates correctly for other t values", () => {
      expect(lerp(0, 100, 0.25)).toBe(25);
      expect(lerp(0, 100, 0.75)).toBe(75);
    });

    it("extrapolates beyond 0-1 range", () => {
      expect(lerp(0, 100, 1.5)).toBe(150);
      expect(lerp(0, 100, -0.5)).toBe(-50);
    });
  });

  describe("wrapX", () => {
    it("returns x when within bounds", () => {
      expect(wrapX(5, 10)).toBe(5);
      expect(wrapX(0, 10)).toBe(0);
      expect(wrapX(9, 10)).toBe(9);
    });

    it("wraps x when at or above width", () => {
      expect(wrapX(10, 10)).toBe(0);
      expect(wrapX(11, 10)).toBe(1);
      expect(wrapX(20, 10)).toBe(0);
      expect(wrapX(25, 10)).toBe(5);
    });

    it("wraps negative x", () => {
      expect(wrapX(-1, 10)).toBe(9);
      expect(wrapX(-5, 10)).toBe(5);
      expect(wrapX(-10, 10)).toBe(0);
      expect(wrapX(-11, 10)).toBe(9);
    });
  });

  describe("fillBuffer", () => {
    it("fills typed array with value", () => {
      const buffer = new Uint8Array(5);
      fillBuffer(buffer, 42);
      expect(Array.from(buffer)).toEqual([42, 42, 42, 42, 42]);
    });

    it("fills Int16Array", () => {
      const buffer = new Int16Array(3);
      fillBuffer(buffer, -100);
      expect(Array.from(buffer)).toEqual([-100, -100, -100]);
    });

    it("handles null/undefined safely", () => {
      expect(() => fillBuffer(null, 0)).not.toThrow();
      expect(() => fillBuffer(undefined, 0)).not.toThrow();
    });

    it("handles objects without fill method", () => {
      const obj = { length: 5 };
      expect(() => fillBuffer(obj as any, 0)).not.toThrow();
    });
  });
});
