/**
 * Biomes Layer — Owned Biome Classification
 *
 * Purpose
 * - Compute biomes directly from climate inputs using an owned classification model
 * - Apply narrative overlay (corridors, rifts) as a clean layer
 * - Write to engine via setBiomeType() — engine is a write-only sink
 *
 * Architecture
 * - Layer 1: computeBiome(climate) → BiomeId (pure function, testable)
 * - Layer 2: applyNarrativeOverlay(biome, climate, narrative) (clean boundary)
 * - Layer 3: adapter.setBiomeType() (engine write)
 *
 * Invariants
 * - No calls to engine.designateBiomes() — we own biome logic entirely
 * - All thresholds in one config section, not scattered
 * - Narrative overlay respects climate gates
 * - O(width × height) with pure climate-based classification
 */

// Re-export the owned biome designation
export {
  designateOwnedBiomes,
  type OwnedBiomeConfig,
} from "@mapgen/domain/ecology/biomes/owned.js";

// Re-export classification module for direct access
export {
  // Types
  BiomeId,
  DEFAULT_THRESHOLDS,
  type TileClimate,
  type DerivedClimate,
  type BiomeThresholds,
  type BiomeAffinity,
  // Derivation
  deriveTemperature,
  deriveAridity,
  deriveMoistureIndex,
  deriveClimate,
  // Scoring
  scoreSnow,
  scoreTundra,
  scoreDesert,
  scoreTropical,
  scoreGrassland,
  scorePlains,
  // Classification
  computeBiome,
  computeBiomeAffinities,
  classifyBiome,
  computeBiomeDetailed,
  getBiomeName,
  // Overlay
  applyNarrativeOverlay,
  buildNarrativeContext,
  DEFAULT_NARRATIVE_POLICY,
  type TileNarrativeContext,
  type NarrativePolicy,
  type NarrativeRNG,
} from "@mapgen/domain/ecology/classification/index.js";

// Re-export supporting types
export type { BiomeConfig, BiomeGlobals, CorridorPolicy } from "@mapgen/domain/ecology/biomes/types.js";

// Export the coastal utility (used by owned.ts)
export { isCoastalLand } from "@mapgen/domain/ecology/biomes/coastal.js";
