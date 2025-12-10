/**
 * Plate Boundary Calculation Tests
 *
 * Tests boundary detection and physics calculations.
 */

import { describe, it, expect } from "bun:test";
import { computePlatesVoronoi, BOUNDARY_TYPE } from "../../src/world/index.js";
import type { PlateConfig, RngFunction } from "../../src/world/types.js";

describe("Plate Boundary Calculations", () => {
  // Deterministic RNG for testing
  function createDeterministicRng(seed = 12345): RngFunction {
    let state = seed;
    return (max: number) => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state % max;
    };
  }

  describe("Boundary Type Detection", () => {
    it("should assign valid boundary types to all tiles", () => {
      const config: PlateConfig = { count: 8 };
      const result = computePlatesVoronoi(80, 50, config, {
        rng: createDeterministicRng(),
      });

      const validTypes = [
        BOUNDARY_TYPE.none,
        BOUNDARY_TYPE.convergent,
        BOUNDARY_TYPE.divergent,
        BOUNDARY_TYPE.transform,
      ];

      for (let i = 0; i < result.boundaryType.length; i++) {
        expect(validTypes).toContain(result.boundaryType[i]);
      }
    });

    it("should have convergent boundaries (for mountain formation)", () => {
      const config: PlateConfig = { count: 8 };
      const result = computePlatesVoronoi(80, 50, config, {
        rng: createDeterministicRng(),
      });

      let hasConvergent = false;
      for (let i = 0; i < result.boundaryType.length; i++) {
        if (result.boundaryType[i] === BOUNDARY_TYPE.convergent) {
          hasConvergent = true;
          break;
        }
      }
      expect(hasConvergent).toBe(true);
    });

    it("should have divergent boundaries (for rift formation)", () => {
      const config: PlateConfig = { count: 8 };
      const result = computePlatesVoronoi(80, 50, config, {
        rng: createDeterministicRng(),
      });

      let hasDivergent = false;
      for (let i = 0; i < result.boundaryType.length; i++) {
        if (result.boundaryType[i] === BOUNDARY_TYPE.divergent) {
          hasDivergent = true;
          break;
        }
      }
      expect(hasDivergent).toBe(true);
    });
  });

  describe("Boundary Closeness", () => {
    it("should have gradient from boundaries to interiors", () => {
      const config: PlateConfig = { count: 8 };
      const result = computePlatesVoronoi(80, 50, config, {
        rng: createDeterministicRng(),
      });

      // Count tiles at different closeness levels
      const counts = { high: 0, medium: 0, low: 0, zero: 0 };

      for (let i = 0; i < result.boundaryCloseness.length; i++) {
        const c = result.boundaryCloseness[i];
        if (c > 200) counts.high++;
        else if (c > 100) counts.medium++;
        else if (c > 0) counts.low++;
        else counts.zero++;
      }

      // Should have some tiles at each level (gradient)
      expect(counts.high).toBeGreaterThan(0);
      expect(counts.zero).toBeGreaterThan(0); // interior tiles
    });

    it("should correlate with shield stability (inverse relationship)", () => {
      const config: PlateConfig = { count: 8 };
      const result = computePlatesVoronoi(80, 50, config, {
        rng: createDeterministicRng(),
      });

      // For tiles with high boundary closeness, shield stability should be low
      for (let i = 0; i < result.boundaryCloseness.length; i++) {
        const closeness = result.boundaryCloseness[i];
        const stability = result.shieldStability[i];

        // They should roughly sum to 255 (inverse relationship)
        // Allow some tolerance
        expect(closeness + stability).toBeGreaterThanOrEqual(240);
        expect(closeness + stability).toBeLessThanOrEqual(270);
      }
    });
  });

  describe("Tectonic Stress and Potentials", () => {
    it("should have high uplift at convergent boundaries", () => {
      const config: PlateConfig = { count: 8 };
      const result = computePlatesVoronoi(80, 50, config, {
        rng: createDeterministicRng(),
      });

      // Find tiles with convergent boundaries and check uplift
      for (let i = 0; i < result.boundaryType.length; i++) {
        if (result.boundaryType[i] === BOUNDARY_TYPE.convergent) {
          // Convergent boundaries should have higher uplift than rift
          if (result.boundaryCloseness[i] > 200) {
            expect(result.upliftPotential[i]).toBeGreaterThan(result.riftPotential[i]);
          }
        }
      }
    });

    it("should have high rift at divergent boundaries", () => {
      const config: PlateConfig = { count: 8 };
      const result = computePlatesVoronoi(80, 50, config, {
        rng: createDeterministicRng(),
      });

      // Find tiles with divergent boundaries and check rift
      for (let i = 0; i < result.boundaryType.length; i++) {
        if (result.boundaryType[i] === BOUNDARY_TYPE.divergent) {
          // Divergent boundaries should have higher rift than uplift
          if (result.boundaryCloseness[i] > 200) {
            expect(result.riftPotential[i]).toBeGreaterThan(result.upliftPotential[i]);
          }
        }
      }
    });

    it("should have stress matching boundary closeness", () => {
      const config: PlateConfig = { count: 8 };
      const result = computePlatesVoronoi(80, 50, config, {
        rng: createDeterministicRng(),
      });

      // Tectonic stress should equal boundary closeness
      for (let i = 0; i < result.tectonicStress.length; i++) {
        expect(result.tectonicStress[i]).toBe(result.boundaryCloseness[i]);
      }
    });
  });

  describe("Plate Movement Vectors", () => {
    it("should have movement in valid range (-127 to 127)", () => {
      const config: PlateConfig = { count: 8 };
      const result = computePlatesVoronoi(80, 50, config, {
        rng: createDeterministicRng(),
      });

      for (let i = 0; i < result.plateMovementU.length; i++) {
        expect(result.plateMovementU[i]).toBeGreaterThanOrEqual(-127);
        expect(result.plateMovementU[i]).toBeLessThanOrEqual(127);
        expect(result.plateMovementV[i]).toBeGreaterThanOrEqual(-127);
        expect(result.plateMovementV[i]).toBeLessThanOrEqual(127);
        expect(result.plateRotation[i]).toBeGreaterThanOrEqual(-127);
        expect(result.plateRotation[i]).toBeLessThanOrEqual(127);
      }
    });

    it("should have non-zero movement for most plates", () => {
      const config: PlateConfig = { count: 8 };
      const result = computePlatesVoronoi(80, 50, config, {
        rng: createDeterministicRng(),
      });

      let hasMovement = false;
      for (let i = 0; i < result.plateMovementU.length; i++) {
        if (result.plateMovementU[i] !== 0 || result.plateMovementV[i] !== 0) {
          hasMovement = true;
          break;
        }
      }
      expect(hasMovement).toBe(true);
    });
  });

  describe("Boundary Statistics", () => {
    it("should track boundary coverage in metadata", () => {
      const config: PlateConfig = { count: 8 };
      const result = computePlatesVoronoi(80, 50, config, {
        rng: createDeterministicRng(),
      });

      expect(result.meta?.boundaryStats).toBeDefined();
      const stats = result.meta!.boundaryStats!;

      // Boundary share should be less than 50% (not saturated)
      expect(stats.boundaryTileShare).toBeLessThan(0.5);
      expect(stats.boundaryInfluenceShare).toBeLessThan(0.6);

      // Should have some boundaries
      expect(stats.boundaryTiles).toBeGreaterThan(0);
    });
  });
});
