/**
 * Narrative Overlay Layer
 *
 * Applies narrative context (corridors, rifts) as a clean overlay on top of
 * the owned biome classification. This is the single boundary between
 * physics-based classification and narrative intent.
 *
 * Principles:
 * - Narrative can only SUGGEST biomes, respecting climate gates
 * - Each overlay has a strength (0-1) controlling how often it activates
 * - RNG is labeled for determinism and debugging
 */

import { BiomeId } from "./types.js";
import type { DerivedClimate } from "./types.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Narrative context for a tile - what narrative features affect it.
 */
export interface TileNarrativeContext {
  /** Is this tile part of a land corridor? */
  isLandCorridor: boolean;
  /** Is this tile part of a river corridor? */
  isRiverCorridor: boolean;
  /** Is this tile on a rift shoulder (fertile rift valley edge)? */
  isRiftShoulder: boolean;
}

/**
 * Policy controlling narrative overlay strength.
 * All values are 0-1 where 0 = never apply, 1 = always apply.
 */
export interface NarrativePolicy {
  /** Strength of corridor→grassland preference (default: 0.6) */
  corridorStrength: number;
  /** Strength of rift shoulder→fertile biome preference (default: 0.5) */
  riftStrength: number;
}

/**
 * Default narrative policy values.
 */
export const DEFAULT_NARRATIVE_POLICY: Readonly<NarrativePolicy> = {
  corridorStrength: 0.6,
  riftStrength: 0.5,
};

/**
 * RNG function signature for narrative overlay.
 * Label is used for determinism and debugging.
 */
export type NarrativeRNG = (label: string, max: number) => number;

// ============================================================================
// Climate Gates
// ============================================================================

/**
 * Check if climate allows grassland biome.
 * Grassland requires temperate conditions - not frozen, not scorching.
 */
function canBeGrassland(climate: DerivedClimate): boolean {
  // Too cold for grassland
  if (climate.temperature < 0) return false;
  // Too dry for grassland (would be desert)
  if (climate.moistureIndex < 0.3) return false;
  // OK for grassland
  return true;
}

/**
 * Check if climate allows tropical biome.
 * Tropical requires heat, moisture, and low latitude.
 */
function canBeTropical(climate: DerivedClimate): boolean {
  // Must be warm
  if (climate.temperature < 18) return false;
  // Must be moist
  if (climate.moistureIndex < 0.5) return false;
  // Must be relatively equatorial
  if (climate.latitude > 30) return false;
  // OK for tropical
  return true;
}

// ============================================================================
// Overlay Logic
// ============================================================================

/**
 * Apply narrative overlay to a classified biome.
 *
 * This is the single entry point for all narrative biome influence.
 * The overlay respects climate gates - it will not force a biome
 * that is climatically impossible.
 *
 * @param baseBiome - Biome computed from climate classification
 * @param climate - Derived climate values for the tile
 * @param narrative - Narrative features affecting the tile
 * @param policy - Overlay strength settings
 * @param rng - RNG function for probabilistic overlay
 * @returns Final biome after narrative overlay
 *
 * @example
 * // Corridor tile with favorable climate
 * const biome = applyNarrativeOverlay(
 *   BiomeId.PLAINS,
 *   { temperature: 15, moistureIndex: 0.5, latitude: 35, ... },
 *   { isLandCorridor: true, isRiverCorridor: false, isRiftShoulder: false },
 *   { corridorStrength: 0.6, riftStrength: 0.5 },
 *   (label, max) => Math.floor(Math.random() * max)
 * );
 * // May return GRASSLAND if RNG passes and climate allows
 */
export function applyNarrativeOverlay(
  baseBiome: BiomeId,
  climate: DerivedClimate,
  narrative: TileNarrativeContext,
  policy: NarrativePolicy = DEFAULT_NARRATIVE_POLICY,
  rng: NarrativeRNG
): BiomeId {
  // Skip if no narrative features
  if (
    !narrative.isLandCorridor &&
    !narrative.isRiverCorridor &&
    !narrative.isRiftShoulder
  ) {
    return baseBiome;
  }

  // Try corridor overlay first (corridors are travel paths - prefer grassland)
  if (narrative.isLandCorridor || narrative.isRiverCorridor) {
    const corridorResult = tryCorridorOverlay(baseBiome, climate, policy, rng);
    if (corridorResult !== null) {
      return corridorResult;
    }
  }

  // Try rift shoulder overlay (fertile valley edges)
  if (narrative.isRiftShoulder) {
    const riftResult = tryRiftShoulderOverlay(baseBiome, climate, policy, rng);
    if (riftResult !== null) {
      return riftResult;
    }
  }

  return baseBiome;
}

/**
 * Try to apply corridor preference (grassland for easier travel).
 * Returns null if overlay doesn't apply.
 */
function tryCorridorOverlay(
  baseBiome: BiomeId,
  climate: DerivedClimate,
  policy: NarrativePolicy,
  rng: NarrativeRNG
): BiomeId | null {
  // Already optimal for corridors
  if (baseBiome === BiomeId.GRASSLAND) return null;

  // Climate must allow grassland
  if (!canBeGrassland(climate)) return null;

  // Apply strength check
  const roll = rng("ecology:corridor", 100);
  if (roll >= policy.corridorStrength * 100) return null;

  return BiomeId.GRASSLAND;
}

/**
 * Try to apply rift shoulder preference (fertile biomes at rift edges).
 * Returns null if overlay doesn't apply.
 */
function tryRiftShoulderOverlay(
  baseBiome: BiomeId,
  climate: DerivedClimate,
  policy: NarrativePolicy,
  rng: NarrativeRNG
): BiomeId | null {
  // Already a fertile biome
  if (baseBiome === BiomeId.TROPICAL || baseBiome === BiomeId.GRASSLAND) {
    return null;
  }

  // Apply strength check
  const roll = rng("ecology:rift", 100);
  if (roll >= policy.riftStrength * 100) return null;

  // Prefer tropical if climate allows, otherwise grassland
  if (canBeTropical(climate)) {
    return BiomeId.TROPICAL;
  }
  if (canBeGrassland(climate)) {
    return BiomeId.GRASSLAND;
  }

  return null;
}

// ============================================================================
// Helpers for Integration
// ============================================================================

/**
 * Build narrative context for a tile from corridor and rift artifact sets.
 *
 * This is a convenience function for integration with the artifact system.
 *
 * @param key - Tile key in "x,y" format
 * @param landCorridors - Set of land corridor tile keys
 * @param riverCorridors - Set of river corridor tile keys
 * @param riftShoulder - Set of rift shoulder tile keys
 */
export function buildNarrativeContext(
  key: string,
  landCorridors: ReadonlySet<string> | null | undefined,
  riverCorridors: ReadonlySet<string> | null | undefined,
  riftShoulder: ReadonlySet<string> | null | undefined
): TileNarrativeContext {
  return {
    isLandCorridor: landCorridors?.has(key) ?? false,
    isRiverCorridor: riverCorridors?.has(key) ?? false,
    isRiftShoulder: riftShoulder?.has(key) ?? false,
  };
}
