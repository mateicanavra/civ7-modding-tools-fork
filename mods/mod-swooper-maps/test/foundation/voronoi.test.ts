/**
 * Voronoi Plate Generation Tests
 *
 * Tests the core acceptance criteria:
 * - calculateVoronoiCells({ width: 80, height: 50, count: 12 }) returns 12 plates
 * - Deterministic results with same seed
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import { calculateVoronoiCells, computePlatesVoronoi } from "@mapgen/domain/foundation/plates.js";
import type { PlateConfig, RngFunction } from "@mapgen/domain/foundation/types.js";

describe("Voronoi Plate Generation", () => {
  const voronoiUtils = createMockAdapter({ width: 1, height: 1 }).getVoronoiUtils();

  describe("calculateVoronoiCells", () => {
    it("should generate the requested number of plates", () => {
      const plates = calculateVoronoiCells({ width: 80, height: 50, count: 12 });
      expect(plates.length).toBe(12);
    });

    it("should generate plates with valid coordinates", () => {
      const plates = calculateVoronoiCells({ width: 80, height: 50, count: 8 });

      for (const plate of plates) {
        expect(plate.id).toBeGreaterThanOrEqual(0);
        expect(plate.x).toBeGreaterThanOrEqual(0);
        expect(plate.x).toBeLessThan(80);
        expect(plate.y).toBeGreaterThanOrEqual(0);
        expect(plate.y).toBeLessThan(50);
      }
    });

    it("should produce deterministic results with same seed", () => {
      const opts = { width: 80, height: 50, count: 8, seed: 42 };
      const plates1 = calculateVoronoiCells(opts);
      const plates2 = calculateVoronoiCells(opts);

      expect(plates1).toEqual(plates2);
    });

    it("should produce different results with different seeds", () => {
      const plates1 = calculateVoronoiCells({ width: 80, height: 50, count: 8, seed: 42 });
      const plates2 = calculateVoronoiCells({ width: 80, height: 50, count: 8, seed: 999 });

      // At least some plates should have different positions
      const same = plates1.every(
        (p, i) => p.x === plates2[i].x && p.y === plates2[i].y
      );
      expect(same).toBe(false);
    });

    it("should handle small plate counts", () => {
      const plates = calculateVoronoiCells({ width: 80, height: 50, count: 2 });
      expect(plates.length).toBe(2);
    });

    it("should handle large plate counts", () => {
      const plates = calculateVoronoiCells({ width: 128, height: 80, count: 24 });
      expect(plates.length).toBe(24);
    });
  });

  describe("computePlatesVoronoi", () => {
    // Deterministic RNG for testing
    function createDeterministicRng(seed = 12345): RngFunction {
      let state = seed;
      return (max: number) => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state % max;
      };
    }

    it("should return typed arrays of correct size", () => {
      const config: PlateConfig = { count: 8 };
      const result = computePlatesVoronoi(80, 50, config, {
        rng: createDeterministicRng(),
        voronoiUtils,
      });

      const expectedSize = 80 * 50;
      expect(result.plateId.length).toBe(expectedSize);
      expect(result.boundaryCloseness.length).toBe(expectedSize);
      expect(result.boundaryType.length).toBe(expectedSize);
      expect(result.tectonicStress.length).toBe(expectedSize);
      expect(result.upliftPotential.length).toBe(expectedSize);
      expect(result.riftPotential.length).toBe(expectedSize);
      expect(result.shieldStability.length).toBe(expectedSize);
      expect(result.plateMovementU.length).toBe(expectedSize);
      expect(result.plateMovementV.length).toBe(expectedSize);
      expect(result.plateRotation.length).toBe(expectedSize);
    });

    it("should assign all tiles to valid plates", () => {
      const config: PlateConfig = { count: 8 };
      const result = computePlatesVoronoi(80, 50, config, {
        rng: createDeterministicRng(),
        voronoiUtils,
      });

      const actualPlateCount = result.plateRegions.length;
      for (let i = 0; i < result.plateId.length; i++) {
        expect(result.plateId[i]).toBeGreaterThanOrEqual(0);
        expect(result.plateId[i]).toBeLessThan(actualPlateCount);
      }
    });

    it("should identify boundary tiles", () => {
      const config: PlateConfig = { count: 8 };
      const result = computePlatesVoronoi(80, 50, config, {
        rng: createDeterministicRng(),
        voronoiUtils,
      });

      // There should be some tiles with high boundary closeness
      let hasBoundaries = false;
      for (let i = 0; i < result.boundaryCloseness.length; i++) {
        if (result.boundaryCloseness[i] > 200) {
          hasBoundaries = true;
          break;
        }
      }
      expect(hasBoundaries).toBe(true);
    });

    it("should have plate interiors with low stress", () => {
      const config: PlateConfig = { count: 8 };
      const result = computePlatesVoronoi(80, 50, config, {
        rng: createDeterministicRng(),
        voronoiUtils,
      });

      // There should be some tiles with high shield stability (interior tiles)
      let hasInteriors = false;
      for (let i = 0; i < result.shieldStability.length; i++) {
        if (result.shieldStability[i] > 200) {
          hasInteriors = true;
          break;
        }
      }
      expect(hasInteriors).toBe(true);
    });

    it("should return plate regions with movement vectors", () => {
      const config: PlateConfig = { count: 8 };
      const result = computePlatesVoronoi(80, 50, config, {
        rng: createDeterministicRng(),
        voronoiUtils,
      });

      // May have fewer plates due to retry logic, but should have at least some
      expect(result.plateRegions.length).toBeGreaterThanOrEqual(2);
      expect(result.plateRegions.length).toBeLessThanOrEqual(8);

      for (const region of result.plateRegions) {
        expect(region.seedLocation).toBeDefined();
        expect(region.m_movement).toBeDefined();
        expect(typeof region.m_movement.x).toBe("number");
        expect(typeof region.m_movement.y).toBe("number");
        expect(typeof region.m_rotation).toBe("number");
      }
    });

    it("should include metadata in result", () => {
      const config: PlateConfig = { count: 8 };
      const result = computePlatesVoronoi(80, 50, config, {
        rng: createDeterministicRng(),
        voronoiUtils,
      });

      expect(result.meta).toBeDefined();
      expect(result.meta?.width).toBe(80);
      expect(result.meta?.height).toBe(50);
      expect(result.meta?.seedLocations).toBeDefined();
      // May have fewer plates due to retry logic
      expect(result.meta?.seedLocations?.length).toBeGreaterThanOrEqual(2);
    });
  });
});
