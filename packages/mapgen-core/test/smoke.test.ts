/**
 * Smoke test - verifies the test infrastructure works
 */

import { describe, it, expect } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";

describe("Test Infrastructure", () => {
  it("should have global mocks available", () => {
    expect(GameplayMap).toBeDefined();
    expect(GameplayMap.getGridWidth()).toBe(128);
    expect(GameplayMap.getGridHeight()).toBe(80);
  });

  it("should have GameInfo mocks available", () => {
    expect(GameInfo).toBeDefined();
    expect(GameInfo.Maps.lookup("MAPSIZE_HUGE")).toBeDefined();
  });

});

describe("MockAdapter", () => {
  it("should create a mock adapter with default dimensions", () => {
    const adapter = createMockAdapter();
    expect(adapter.width).toBe(128);
    expect(adapter.height).toBe(80);
  });

  it("should create a mock adapter with custom dimensions", () => {
    const adapter = createMockAdapter({ width: 64, height: 40 });
    expect(adapter.width).toBe(64);
    expect(adapter.height).toBe(40);
  });

  it("should allow setting and getting terrain data", () => {
    const adapter = createMockAdapter({ width: 10, height: 10 });

    // Initial state
    expect(adapter.isWater(5, 5)).toBe(false);
    expect(adapter.getTerrainType(5, 5)).toBe(0);

    // Modify and verify
    adapter.setWater(5, 5, true);
    expect(adapter.isWater(5, 5)).toBe(true);

    adapter.setTerrainType(5, 5, 3);
    expect(adapter.getTerrainType(5, 5)).toBe(3);
  });

  it("should provide deterministic RNG with custom function", () => {
    let callCount = 0;
    const adapter = createMockAdapter({
      rng: (max, _label) => {
        callCount++;
        return callCount % max;
      },
    });

    expect(adapter.getRandomNumber(10, "test")).toBe(1);
    expect(adapter.getRandomNumber(10, "test")).toBe(2);
    expect(adapter.getRandomNumber(10, "test")).toBe(3);
  });
});
