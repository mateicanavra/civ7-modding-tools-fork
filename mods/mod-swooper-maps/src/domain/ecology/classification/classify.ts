/**
 * Biome Classification Orchestrator
 *
 * The main entry point for biome classification.
 * Computes affinity scores for all biomes and selects the winner.
 */

import type {
  TileClimate,
  DerivedClimate,
  BiomeThresholds,
  BiomeAffinity,
} from "./types.js";
import { BiomeId, DEFAULT_THRESHOLDS } from "./types.js";
import { deriveClimate } from "./derive.js";
import {
  scoreSnow,
  scoreTundra,
  scoreDesert,
  scoreTropical,
  scoreGrassland,
  scorePlains,
} from "./score.js";

/**
 * Compute affinity scores for all biomes.
 *
 * Each biome is scored independently based on how well the climate
 * matches that biome's ideal conditions. Scores are 0-1.
 *
 * @param climate - Derived climate values
 * @param thresholds - Optional threshold overrides
 * @returns Array of biome affinities, unsorted
 */
export function computeBiomeAffinities(
  climate: DerivedClimate,
  thresholds: BiomeThresholds = {}
): BiomeAffinity[] {
  const merged = { ...DEFAULT_THRESHOLDS, ...thresholds };

  const affinities: BiomeAffinity[] = [
    { biome: BiomeId.SNOW, score: scoreSnow(climate, merged) },
    { biome: BiomeId.TUNDRA, score: scoreTundra(climate, merged) },
    { biome: BiomeId.DESERT, score: scoreDesert(climate, merged) },
    { biome: BiomeId.TROPICAL, score: scoreTropical(climate, merged) },
    { biome: BiomeId.GRASSLAND, score: scoreGrassland(climate, merged) },
    { biome: BiomeId.PLAINS, score: scorePlains(climate, merged) },
  ];

  return affinities;
}

/**
 * Classify a tile's biome from derived climate values.
 *
 * Computes affinity scores for all biomes and returns the highest-scoring one.
 * PLAINS is the fallback if all scores are zero (which shouldn't happen).
 *
 * @param climate - Derived climate values
 * @param thresholds - Optional threshold overrides
 * @returns The winning biome ID
 */
export function classifyBiome(
  climate: DerivedClimate,
  thresholds: BiomeThresholds = {}
): BiomeId {
  const affinities = computeBiomeAffinities(climate, thresholds);

  // Find highest-scoring biome
  let best = affinities[0];
  for (let i = 1; i < affinities.length; i++) {
    if (affinities[i].score > best.score) {
      best = affinities[i];
    }
  }

  // Fallback to PLAINS if somehow all scores are 0
  if (best.score <= 0) {
    return BiomeId.PLAINS;
  }

  return best.biome;
}

/**
 * Classify a tile's biome from raw climate inputs.
 *
 * This is the main public API. It derives climate values from raw inputs
 * and then classifies the biome.
 *
 * @param climate - Raw tile climate inputs
 * @param thresholds - Optional threshold overrides
 * @returns The winning biome ID
 *
 * @example
 * // Mediterranean coast
 * computeBiome({
 *   latitude: 35,
 *   elevation: 50,
 *   rainfall: 80,
 *   isCoastal: true,
 *   riverAdjacent: false,
 * }); // → BiomeId.GRASSLAND
 *
 * @example
 * // Sahara interior
 * computeBiome({
 *   latitude: 25,
 *   elevation: 400,
 *   rainfall: 15,
 *   isCoastal: false,
 *   riverAdjacent: false,
 * }); // → BiomeId.DESERT
 */
export function computeBiome(
  climate: TileClimate,
  thresholds: BiomeThresholds = {}
): BiomeId {
  const derived = deriveClimate(climate);
  return classifyBiome(derived, thresholds);
}

/**
 * Get detailed classification results for debugging/visualization.
 *
 * Returns both the winning biome and all affinity scores.
 *
 * @param climate - Raw tile climate inputs
 * @param thresholds - Optional threshold overrides
 * @returns Object with derived climate, all affinities, and winner
 */
export function computeBiomeDetailed(
  climate: TileClimate,
  thresholds: BiomeThresholds = {}
): {
  derived: DerivedClimate;
  affinities: BiomeAffinity[];
  winner: BiomeId;
} {
  const derived = deriveClimate(climate);
  const affinities = computeBiomeAffinities(derived, thresholds);
  const winner = classifyBiome(derived, thresholds);

  // Sort affinities by score descending for readability
  affinities.sort((a, b) => b.score - a.score);

  return { derived, affinities, winner };
}

/**
 * Biome name lookup for debugging.
 */
export function getBiomeName(biome: BiomeId): string {
  switch (biome) {
    case BiomeId.GRASSLAND:
      return "GRASSLAND";
    case BiomeId.PLAINS:
      return "PLAINS";
    case BiomeId.DESERT:
      return "DESERT";
    case BiomeId.TUNDRA:
      return "TUNDRA";
    case BiomeId.TROPICAL:
      return "TROPICAL";
    case BiomeId.SNOW:
      return "SNOW";
    case BiomeId.MARINE:
      return "MARINE";
    default:
      return "UNKNOWN";
  }
}
