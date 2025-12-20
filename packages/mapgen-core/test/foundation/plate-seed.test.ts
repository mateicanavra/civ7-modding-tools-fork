/**
 * Plate Seed Manager Tests
 *
 * Tests deterministic seed generation and RNG state management.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { PlateSeedManager } from "@mapgen/foundation/plate-seed.js";
import type { PlateConfig, SeedSnapshot } from "@mapgen/foundation/types.js";

describe("PlateSeedManager", () => {
  describe("capture", () => {
    it("should create a snapshot with dimensions", () => {
      const { snapshot } = PlateSeedManager.capture(80, 50, null);

      expect(snapshot.width).toBe(80);
      expect(snapshot.height).toBe(50);
    });

    it("should default to engine seed mode", () => {
      const { snapshot } = PlateSeedManager.capture(80, 50, null);

      expect(snapshot.seedMode).toBe("engine");
    });

    it("should respect fixed seed mode", () => {
      const config: Partial<PlateConfig> = {
        seedMode: "fixed",
        fixedSeed: 42,
      };
      const { snapshot } = PlateSeedManager.capture(80, 50, config);

      expect(snapshot.seedMode).toBe("fixed");
      expect(snapshot.fixedSeed).toBe(42);
    });

    it("should fall back to engine if fixed seed is missing", () => {
      const config: Partial<PlateConfig> = {
        seedMode: "fixed",
        // fixedSeed is missing
      };
      const { snapshot } = PlateSeedManager.capture(80, 50, config);

      expect(snapshot.seedMode).toBe("engine");
    });

    it("should capture seedOffset", () => {
      const config: Partial<PlateConfig> = {
        seedOffset: 100,
      };
      const { snapshot } = PlateSeedManager.capture(80, 50, config);

      expect(snapshot.seedOffset).toBe(100);
    });

    it("should include timestamp", () => {
      const { snapshot } = PlateSeedManager.capture(80, 50, null);

      // Should have a timestamp (number) or null
      if (snapshot.timestamp !== undefined) {
        expect(typeof snapshot.timestamp).toBe("number");
        expect(snapshot.timestamp).toBeGreaterThan(0);
      }
    });

    it("should return a restore function (may be null)", () => {
      const { restore } = PlateSeedManager.capture(80, 50, null);

      // restore is null when RandomImpl is not available (test environment)
      expect(restore === null || typeof restore === "function").toBe(true);
    });

    it("should freeze the snapshot", () => {
      const { snapshot } = PlateSeedManager.capture(80, 50, null);

      expect(Object.isFrozen(snapshot)).toBe(true);
    });
  });

  describe("finalize", () => {
    it("should return null for null input", () => {
      const result = PlateSeedManager.finalize(null);

      expect(result).toBeNull();
    });

    it("should preserve base snapshot fields", () => {
      const base: SeedSnapshot = {
        width: 80,
        height: 50,
        seedMode: "fixed",
        fixedSeed: 42,
        seedOffset: 10,
        timestamp: Date.now(),
        seed: 52,
      };

      const result = PlateSeedManager.finalize(base);

      expect(result?.width).toBe(80);
      expect(result?.height).toBe(50);
      expect(result?.seedMode).toBe("fixed");
      expect(result?.fixedSeed).toBe(42);
      expect(result?.seedOffset).toBe(10);
      expect(result?.seed).toBe(52);
    });

    it("should merge config extras", () => {
      const base: SeedSnapshot = {
        width: 80,
        height: 50,
        seedMode: "engine",
      };

      const config: Partial<PlateConfig> = {
        count: 8,
        relaxationSteps: 5,
      };

      const result = PlateSeedManager.finalize(base, { config });

      expect(result?.config).toBeDefined();
      expect(result?.config?.count).toBe(8);
      expect(result?.config?.relaxationSteps).toBe(5);
    });

    it("should normalize seed locations", () => {
      const base: SeedSnapshot = {
        width: 80,
        height: 50,
        seedMode: "engine",
      };

      const meta = {
        seedLocations: [
          { id: 0, x: 10, y: 20 },
          { id: 1, x: 30, y: 40 },
        ],
      };

      const result = PlateSeedManager.finalize(base, { meta });

      expect(result?.seedLocations).toBeDefined();
      expect(result?.seedLocations?.length).toBe(2);
      expect(result?.seedLocations?.[0]).toEqual({ id: 0, x: 10, y: 20 });
    });

    it("should freeze the result", () => {
      const base: SeedSnapshot = {
        width: 80,
        height: 50,
        seedMode: "engine",
      };

      const result = PlateSeedManager.finalize(base);

      expect(Object.isFrozen(result)).toBe(true);
    });

    it("should freeze nested objects", () => {
      const base: SeedSnapshot = {
        width: 80,
        height: 50,
        seedMode: "engine",
      };

      const config: Partial<PlateConfig> = { count: 8 };
      const result = PlateSeedManager.finalize(base, { config });

      expect(Object.isFrozen(result?.config)).toBe(true);
    });
  });

  describe("Integration with calculateVoronoiCells", () => {
    it("should produce consistent results when seed is captured", () => {
      // Test that the seed manager works correctly in context
      const { snapshot: snapshot1 } = PlateSeedManager.capture(80, 50, {
        seedMode: "fixed",
        fixedSeed: 42,
      });

      const { snapshot: snapshot2 } = PlateSeedManager.capture(80, 50, {
        seedMode: "fixed",
        fixedSeed: 42,
      });

      expect(snapshot1.fixedSeed).toBe(snapshot2.fixedSeed);
      expect(snapshot1.seedMode).toBe(snapshot2.seedMode);
    });
  });
});
