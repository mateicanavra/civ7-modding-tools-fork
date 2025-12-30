/**
 * Biome Classification Tests
 *
 * Tests the owned biome classification model with canonical examples
 * and edge cases. All tests use pure functions with no adapter dependencies.
 */

import { describe, it, expect } from "bun:test";
import {
  deriveTemperature,
  deriveAridity,
  deriveMoistureIndex,
  deriveClimate,
} from "@mapgen/domain/ecology/classification/derive.js";
import {
  scoreSnow,
  scoreTundra,
  scoreDesert,
  scoreTropical,
  scoreGrassland,
  scorePlains,
} from "@mapgen/domain/ecology/classification/score.js";
import {
  computeBiome,
  computeBiomeDetailed,
  getBiomeName,
} from "@mapgen/domain/ecology/classification/classify.js";
import { BiomeId } from "@mapgen/domain/ecology/classification/types.js";
import type { TileClimate, DerivedClimate } from "@mapgen/domain/ecology/classification/types.js";

// ============================================================================
// Climate Derivation Tests
// ============================================================================

describe("Climate Derivation", () => {
  describe("deriveTemperature", () => {
    it("should return ~28°C at equator, sea level", () => {
      const temp = deriveTemperature(0, 0);
      expect(temp).toBeCloseTo(28, 0);
    });

    it("should return ~-15°C at poles, sea level", () => {
      const temp = deriveTemperature(90, 0);
      expect(temp).toBeCloseTo(-15, 0);
    });

    it("should apply lapse rate for elevation", () => {
      const seaLevel = deriveTemperature(30, 0);
      const elevated = deriveTemperature(30, 1000);
      expect(seaLevel - elevated).toBeCloseTo(6.5, 1);
    });

    it("should produce cold temps at high elevation even at low latitude", () => {
      const temp = deriveTemperature(30, 4500);
      expect(temp).toBeLessThan(0);
    });
  });

  describe("deriveAridity", () => {
    it("should return 0 for cold temperatures (no PET)", () => {
      const aridity = deriveAridity(-5, 100);
      expect(aridity).toBe(0);
    });

    it("should return 1 for zero rainfall", () => {
      const aridity = deriveAridity(25, 0);
      expect(aridity).toBe(1);
    });

    it("should return high aridity for hot + dry", () => {
      const aridity = deriveAridity(25, 15);
      expect(aridity).toBeGreaterThan(0.7);
    });

    it("should return low aridity for cool + wet", () => {
      const aridity = deriveAridity(10, 150);
      // Cool temps have low PET, high rainfall → low aridity
      expect(aridity).toBeLessThan(0.15);
      expect(aridity).toBeGreaterThan(0);
    });
  });

  describe("deriveMoistureIndex", () => {
    it("should normalize rainfall to 0-1", () => {
      expect(deriveMoistureIndex(0, false, false)).toBe(0);
      expect(deriveMoistureIndex(100, false, false)).toBe(0.5);
      expect(deriveMoistureIndex(200, false, false)).toBe(1);
    });

    it("should add coastal bonus", () => {
      const base = deriveMoistureIndex(100, false, false);
      const coastal = deriveMoistureIndex(100, true, false);
      expect(coastal - base).toBeCloseTo(0.1, 2);
    });

    it("should add river bonus", () => {
      const base = deriveMoistureIndex(100, false, false);
      const river = deriveMoistureIndex(100, false, true);
      expect(river - base).toBeCloseTo(0.15, 2);
    });

    it("should cap at 1.0", () => {
      const moisture = deriveMoistureIndex(200, true, true);
      expect(moisture).toBe(1.0);
    });
  });

  describe("deriveClimate", () => {
    it("should compute all derived values", () => {
      const raw: TileClimate = {
        latitude: 35,
        elevation: 100,
        rainfall: 80,
        isCoastal: true,
        riverAdjacent: false,
      };
      const derived = deriveClimate(raw);

      expect(derived.temperature).toBeDefined();
      expect(derived.aridity).toBeDefined();
      expect(derived.moistureIndex).toBeDefined();
      expect(derived.latitude).toBe(35);
    });
  });
});

// ============================================================================
// Biome Scoring Tests
// ============================================================================

describe("Biome Scoring", () => {
  // Helper to create derived climate for testing
  function makeDerived(overrides: Partial<DerivedClimate>): DerivedClimate {
    return {
      latitude: 45,
      elevation: 200,
      rainfall: 100,
      isCoastal: false,
      riverAdjacent: false,
      temperature: 15,
      aridity: 0.3,
      moistureIndex: 0.5,
      ...overrides,
    };
  }

  describe("scoreSnow", () => {
    it("should score high for very cold temperatures", () => {
      const climate = makeDerived({ temperature: -15 });
      const score = scoreSnow(climate);
      expect(score).toBeGreaterThan(0.8);
    });

    it("should score low for warm temperatures", () => {
      const climate = makeDerived({ temperature: 15 });
      const score = scoreSnow(climate);
      expect(score).toBeLessThan(0.1);
    });

    it("should get polar bonus at high latitudes", () => {
      const midLat = makeDerived({ temperature: -5, latitude: 60 });
      const polar = makeDerived({ temperature: -5, latitude: 85 });
      expect(scoreSnow(polar)).toBeGreaterThan(scoreSnow(midLat));
    });

    it("should get alpine bonus at high elevation with cold temps", () => {
      const lowElev = makeDerived({ temperature: -2, elevation: 400 });
      const highElev = makeDerived({ temperature: -2, elevation: 1200 });
      expect(scoreSnow(highElev)).toBeGreaterThan(scoreSnow(lowElev));
    });
  });

  describe("scoreTundra", () => {
    it("should score high for cold temps and high latitude", () => {
      const climate = makeDerived({ temperature: -2, latitude: 65 });
      const score = scoreTundra(climate);
      expect(score).toBeGreaterThan(0.6);
    });

    it("should score low for warm temperatures", () => {
      const climate = makeDerived({ temperature: 20, latitude: 65 });
      const score = scoreTundra(climate);
      expect(score).toBeLessThan(0.2);
    });

    it("should penalize high aridity", () => {
      const moist = makeDerived({ temperature: 0, latitude: 65, aridity: 0.3 });
      const arid = makeDerived({ temperature: 0, latitude: 65, aridity: 0.8 });
      expect(scoreTundra(moist)).toBeGreaterThan(scoreTundra(arid));
    });
  });

  describe("scoreDesert", () => {
    it("should score high for hot + arid conditions", () => {
      const climate = makeDerived({
        temperature: 25,
        aridity: 0.85,
        moistureIndex: 0.1,
      });
      const score = scoreDesert(climate);
      expect(score).toBeGreaterThan(0.7);
    });

    it("should score low for wet conditions", () => {
      const climate = makeDerived({
        temperature: 25,
        aridity: 0.3,
        moistureIndex: 0.7,
      });
      const score = scoreDesert(climate);
      expect(score).toBeLessThan(0.2);
    });

    it("should still score for cold deserts (lower)", () => {
      const hotDesert = makeDerived({
        temperature: 30,
        aridity: 0.8,
        moistureIndex: 0.1,
      });
      const coldDesert = makeDerived({
        temperature: 5,
        aridity: 0.8,
        moistureIndex: 0.1,
      });
      expect(scoreDesert(coldDesert)).toBeGreaterThan(0.3);
      expect(scoreDesert(hotDesert)).toBeGreaterThan(scoreDesert(coldDesert));
    });
  });

  describe("scoreTropical", () => {
    it("should score high for hot + wet + equatorial", () => {
      const climate = makeDerived({
        temperature: 26,
        latitude: 10,
        moistureIndex: 0.8,
      });
      const score = scoreTropical(climate);
      expect(score).toBeGreaterThan(0.7);
    });

    it("should score low at high latitudes", () => {
      const climate = makeDerived({
        temperature: 26,
        latitude: 45,
        moistureIndex: 0.8,
      });
      const score = scoreTropical(climate);
      expect(score).toBeLessThan(0.3);
    });

    it("should score low for dry conditions", () => {
      const climate = makeDerived({
        temperature: 26,
        latitude: 10,
        moistureIndex: 0.2,
      });
      const score = scoreTropical(climate);
      expect(score).toBeLessThan(0.3);
    });
  });

  describe("scoreGrassland", () => {
    it("should score high for temperate + moist conditions", () => {
      const climate = makeDerived({
        temperature: 12,
        moistureIndex: 0.6,
        aridity: 0.25,
      });
      const score = scoreGrassland(climate);
      expect(score).toBeGreaterThan(0.7);
    });

    it("should score low for cold conditions", () => {
      const climate = makeDerived({
        temperature: -5,
        moistureIndex: 0.6,
        aridity: 0.2,
      });
      const score = scoreGrassland(climate);
      expect(score).toBeLessThan(0.3);
    });

    it("should penalize arid conditions", () => {
      const moist = makeDerived({
        temperature: 12,
        moistureIndex: 0.5,
        aridity: 0.3,
      });
      const arid = makeDerived({
        temperature: 12,
        moistureIndex: 0.5,
        aridity: 0.7,
      });
      expect(scoreGrassland(moist)).toBeGreaterThan(scoreGrassland(arid));
    });
  });

  describe("scorePlains", () => {
    it("should score well for drier temperate conditions", () => {
      const climate = makeDerived({
        temperature: 15,
        moistureIndex: 0.35,
        aridity: 0.4,
      });
      const score = scorePlains(climate);
      expect(score).toBeGreaterThan(0.5);
    });

    it("should have broad temperature tolerance", () => {
      const cold = makeDerived({ temperature: 5 });
      const warm = makeDerived({ temperature: 22 });
      expect(scorePlains(cold)).toBeGreaterThan(0.2);
      expect(scorePlains(warm)).toBeGreaterThan(0.2);
    });
  });
});

// ============================================================================
// End-to-End Classification Tests (Canonical Examples)
// ============================================================================

describe("Biome Classification", () => {
  describe("Canonical test cases", () => {
    const testCases: Array<{
      name: string;
      climate: TileClimate;
      expected: BiomeId;
    }> = [
      {
        name: "Mediterranean coast",
        climate: {
          latitude: 35,
          elevation: 50,
          rainfall: 80,
          isCoastal: true,
          riverAdjacent: false,
        },
        expected: BiomeId.GRASSLAND,
      },
      {
        name: "Sahara interior",
        climate: {
          latitude: 25,
          elevation: 400,
          rainfall: 15,
          isCoastal: false,
          riverAdjacent: false,
        },
        expected: BiomeId.DESERT,
      },
      {
        name: "Amazon basin",
        climate: {
          latitude: 5,
          elevation: 100,
          rainfall: 180,
          isCoastal: false,
          riverAdjacent: true,
        },
        expected: BiomeId.TROPICAL,
      },
      {
        name: "Himalayan peak",
        climate: {
          latitude: 30,
          elevation: 4500,
          rainfall: 60,
          isCoastal: false,
          riverAdjacent: false,
        },
        expected: BiomeId.SNOW,
      },
      {
        name: "Siberian plain",
        climate: {
          latitude: 65,
          elevation: 200,
          rainfall: 50,
          isCoastal: false,
          riverAdjacent: false,
        },
        expected: BiomeId.TUNDRA,
      },
      {
        name: "Kansas prairie",
        climate: {
          latitude: 38,
          elevation: 400,
          rainfall: 70,
          isCoastal: false,
          riverAdjacent: false,
        },
        expected: BiomeId.PLAINS,
      },
      {
        name: "English countryside",
        climate: {
          latitude: 52,
          elevation: 100,
          rainfall: 120,
          isCoastal: false,
          riverAdjacent: true,
        },
        expected: BiomeId.GRASSLAND,
      },
      {
        name: "Gobi edge",
        climate: {
          latitude: 42,
          elevation: 1000,
          rainfall: 25,
          isCoastal: false,
          riverAdjacent: false,
        },
        expected: BiomeId.DESERT,
      },
      {
        name: "Norwegian fjord",
        climate: {
          latitude: 62,
          elevation: 50,
          rainfall: 140,
          isCoastal: true,
          riverAdjacent: false,
        },
        expected: BiomeId.TUNDRA,
      },
      {
        name: "Florida coast",
        climate: {
          latitude: 26,
          elevation: 5,
          rainfall: 150,
          isCoastal: true,
          riverAdjacent: false,
        },
        expected: BiomeId.TROPICAL,
      },
    ];

    for (const { name, climate, expected } of testCases) {
      it(`should classify ${name} as ${getBiomeName(expected)}`, () => {
        const result = computeBiome(climate);
        expect(result).toBe(expected);
      });
    }
  });

  describe("computeBiomeDetailed", () => {
    it("should return detailed classification info", () => {
      const climate: TileClimate = {
        latitude: 35,
        elevation: 50,
        rainfall: 80,
        isCoastal: true,
        riverAdjacent: false,
      };
      const result = computeBiomeDetailed(climate);

      expect(result.derived.temperature).toBeDefined();
      expect(result.affinities.length).toBe(6);
      expect(result.winner).toBe(BiomeId.GRASSLAND);
      // Affinities should be sorted by score descending
      expect(result.affinities[0].score).toBeGreaterThanOrEqual(
        result.affinities[1].score
      );
    });
  });

  describe("Edge cases", () => {
    it("should handle zero rainfall", () => {
      const climate: TileClimate = {
        latitude: 25,
        elevation: 200,
        rainfall: 0,
        isCoastal: false,
        riverAdjacent: false,
      };
      const result = computeBiome(climate);
      expect(result).toBe(BiomeId.DESERT);
    });

    it("should handle maximum rainfall", () => {
      const climate: TileClimate = {
        latitude: 5,
        elevation: 50,
        rainfall: 200,
        isCoastal: true,
        riverAdjacent: true,
      };
      const result = computeBiome(climate);
      expect(result).toBe(BiomeId.TROPICAL);
    });

    it("should handle extreme elevation", () => {
      const climate: TileClimate = {
        latitude: 0,
        elevation: 6000,
        rainfall: 50,
        isCoastal: false,
        riverAdjacent: false,
      };
      const result = computeBiome(climate);
      expect(result).toBe(BiomeId.SNOW);
    });

    it("should handle polar latitude", () => {
      const climate: TileClimate = {
        latitude: 85,
        elevation: 100,
        rainfall: 30,
        isCoastal: false,
        riverAdjacent: false,
      };
      const result = computeBiome(climate);
      expect(result).toBe(BiomeId.SNOW);
    });
  });
});
