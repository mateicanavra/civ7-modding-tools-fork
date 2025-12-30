/**
 * Biome Classification Module
 *
 * Owned biome classification based on climate inputs.
 * Pure functions with no engine dependencies.
 *
 * @example
 * import { computeBiome, BiomeId } from "@mapgen/domain/ecology/classification";
 *
 * const biome = computeBiome({
 *   latitude: 35,
 *   elevation: 50,
 *   rainfall: 80,
 *   isCoastal: true,
 *   riverAdjacent: false,
 * });
 * // → BiomeId.GRASSLAND
 */

// Types
export type {
  TileClimate,
  DerivedClimate,
  BiomeThresholds,
  BiomeAffinity,
} from "./types.js";

export { BiomeId, DEFAULT_THRESHOLDS } from "./types.js";

// Derivation
export {
  deriveTemperature,
  deriveAridity,
  deriveMoistureIndex,
  deriveClimate,
} from "./derive.js";

// Scoring
export {
  scoreSnow,
  scoreTundra,
  scoreDesert,
  scoreTropical,
  scoreGrassland,
  scorePlains,
} from "./score.js";

// Classification
export {
  computeBiome,
  computeBiomeAffinities,
  classifyBiome,
  computeBiomeDetailed,
  getBiomeName,
} from "./classify.js";

// Narrative Overlay
export type {
  TileNarrativeContext,
  NarrativePolicy,
  NarrativeRNG,
} from "./overlay.js";

export {
  applyNarrativeOverlay,
  buildNarrativeContext,
  DEFAULT_NARRATIVE_POLICY,
} from "./overlay.js";
