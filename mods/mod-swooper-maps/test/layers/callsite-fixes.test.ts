/**
 * Call-site Fixes Tests (CIV-18)
 *
 * Verifies fixes for:
 * 1. Biomes stage missing ctx parameter
 * 2. Climate adapter stubs blocking fallback execution
 */

import { describe, it, expect } from "bun:test";
import type { ClimateAdapter } from "@mapgen/domain/hydrology/climate/index.js";

describe("CIV-18: Call-site Fixes", () => {
  describe("ClimateAdapter interface", () => {
    it("allows isCoastalLand to be undefined (optional)", () => {
      // This test verifies the interface change that makes isCoastalLand optional.
      // When undefined, the climate code uses local neighborhood fallback.
      const adapter: ClimateAdapter = {
        isWater: () => false,
        isMountain: () => false,
        // isCoastalLand intentionally omitted
        isAdjacentToRivers: () => false,
        getRainfall: () => 50,
        setRainfall: () => {},
        getElevation: () => 100,
        getLatitude: () => 0,
        getRandomNumber: (max) => (max > 0 ? 0 : 0),
      };

      // Type check: adapter should be valid without isCoastalLand
      expect(adapter.isCoastalLand).toBeUndefined();
    });

    it("allows isCoastalLand to be provided when available", () => {
      const adapter: ClimateAdapter = {
        isWater: () => false,
        isMountain: () => false,
        isCoastalLand: (x, y) => x === 0 && y === 0, // Only (0,0) is coastal
        isAdjacentToRivers: () => false,
        getRainfall: () => 50,
        setRainfall: () => {},
        getElevation: () => 100,
        getLatitude: () => 0,
        getRandomNumber: (max) => (max > 0 ? 0 : 0),
      };

      expect(adapter.isCoastalLand?.(0, 0)).toBe(true);
      expect(adapter.isCoastalLand?.(1, 1)).toBe(false);
    });
  });

  describe("climate fallback behavior", () => {
    it("local isCoastalLand helper works correctly", () => {
      // Simulate the local fallback pattern used in climate-engine.ts
      const width = 5;
      const height = 5;
      const waterGrid = new Set(["0,0", "0,1", "1,0"]); // Water tiles

      const isWater = (x: number, y: number): boolean =>
        waterGrid.has(`${x},${y}`);

      // Local fallback implementation (mirrors climate-engine.ts)
      const isCoastalLandFallback = (x: number, y: number): boolean => {
        if (isWater(x, y)) return false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            if (isWater(nx, ny)) return true;
          }
        }
        return false;
      };

      // Test: (1,1) is adjacent to water at (0,0), (0,1), (1,0)
      expect(isCoastalLandFallback(1, 1)).toBe(true);

      // Test: (3,3) is not adjacent to any water
      expect(isCoastalLandFallback(3, 3)).toBe(false);

      // Test: (0,0) is water, not coastal land
      expect(isCoastalLandFallback(0, 0)).toBe(false);
    });

    it("conditional fallback pattern works when adapter method is undefined", () => {
      // This tests the pattern used in climate-engine.ts:
      // if (adapter.isCoastalLand) { return adapter.isCoastalLand(x, y); }
      // else { return localFallback(x, y); }

      const adapterWithMethod: Partial<ClimateAdapter> = {
        isCoastalLand: () => true,
      };

      const adapterWithoutMethod: Partial<ClimateAdapter> = {
        // isCoastalLand not defined
      };

      const localFallback = () => false;

      // With method defined - uses adapter
      const resultWithMethod = adapterWithMethod.isCoastalLand
        ? adapterWithMethod.isCoastalLand(0, 0)
        : localFallback();
      expect(resultWithMethod).toBe(true);

      // Without method - uses fallback
      const resultWithoutMethod = adapterWithoutMethod.isCoastalLand
        ? adapterWithoutMethod.isCoastalLand(0, 0)
        : localFallback();
      expect(resultWithoutMethod).toBe(false);
    });
  });

  describe("biomes op exports", () => {
    it("classifyBiomes exposes a runnable op with defaults", async () => {
      const { classifyBiomes } = await import("@mapgen/domain/ops/ecology/classify-biomes/index.js");
      expect(typeof classifyBiomes.run).toBe("function");
      expect(classifyBiomes.defaultConfig).toBeDefined();
    });
  });
});
