/**
 * Owned Biome Designation
 *
 * Computes biomes using our owned classification model instead of
 * delegating to the engine's black-box designateBiomes().
 *
 * Architecture:
 * 1. Build TileClimate from artifacts and adapter
 * 2. Compute biome via owned classification (pure function)
 * 3. Apply narrative overlay (corridors, rifts)
 * 4. Write to engine via setBiomeType()
 *
 * The engine becomes a write-only sink - we own correctness.
 */

import type { ExtendedMapContext, ClimateFieldBuffer } from "@swooper/mapgen-core";
import { ctxRandom } from "@swooper/mapgen-core";
import type { EngineAdapter } from "@civ7/adapter";
import {
  computeBiome,
  deriveClimate,
  applyNarrativeOverlay,
  buildNarrativeContext,
  BiomeId,
  type TileClimate,
  type BiomeThresholds,
  type NarrativePolicy,
  DEFAULT_NARRATIVE_POLICY,
} from "@mapgen/domain/ecology/classification/index.js";
import {
  getPublishedClimateField,
  getPublishedRiverAdjacency,
} from "@mapgen/domain/artifacts.js";
import {
  getNarrativeCorridors,
  getNarrativeMotifsRifts,
} from "@mapgen/domain/narrative/queries.js";
import { isCoastalLand } from "@mapgen/domain/ecology/biomes/coastal.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for owned biome designation.
 */
export interface OwnedBiomeConfig {
  /** Biome classification thresholds (optional, uses defaults) */
  thresholds?: BiomeThresholds;
  /** Narrative overlay policy (optional, uses defaults) */
  narrative?: Partial<NarrativePolicy>;
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Designate biomes using owned classification model.
 *
 * This replaces the legacy `designateEnhancedBiomes` which delegated to
 * engine.designateBiomes() then applied 7 nudge functions.
 *
 * @param width - Map width
 * @param height - Map height
 * @param ctx - Extended map context with artifacts
 * @param config - Optional configuration
 */
export function designateOwnedBiomes(
  width: number,
  height: number,
  ctx: ExtendedMapContext,
  config: OwnedBiomeConfig = {}
): void {
  console.log("Designating biomes via owned classification model...");

  if (!ctx.adapter) {
    throw new Error("designateOwnedBiomes: adapter is required");
  }

  const adapter = ctx.adapter;

  // Get required artifacts
  const climateField = getPublishedClimateField(ctx);
  if (!climateField?.rainfall) {
    throw new Error("designateOwnedBiomes: Missing climateField rainfall");
  }

  const riverAdjacency = getPublishedRiverAdjacency(ctx);
  if (!riverAdjacency) {
    throw new Error("designateOwnedBiomes: Missing riverAdjacency");
  }

  // Get narrative artifacts (optional)
  const corridors = getNarrativeCorridors(ctx);
  const rifts = getNarrativeMotifsRifts(ctx);

  // Build narrative policy
  const narrativePolicy: NarrativePolicy = {
    ...DEFAULT_NARRATIVE_POLICY,
    ...config.narrative,
  };

  // RNG wrapper
  const rng = (label: string, max: number) => ctxRandom(ctx, label, max);

  // Classify each tile
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Skip water tiles
      if (adapter.isWater(x, y)) continue;

      // Build tile climate from artifacts and adapter
      const tileClimate = buildTileClimate(
        x,
        y,
        width,
        height,
        adapter,
        climateField,
        riverAdjacency
      );

      // Compute biome via owned classification
      let biome = computeBiome(tileClimate, config.thresholds);

      // Build narrative context
      const key = `${x},${y}`;
      const narrative = buildNarrativeContext(
        key,
        corridors?.landCorridors,
        corridors?.riverCorridors,
        rifts?.riftShoulder
      );

      // Apply narrative overlay with climate derivation
      // Note: applyNarrativeOverlay expects DerivedClimate, but we can
      // build a minimal version from tileClimate since we only need
      // temperature, moistureIndex, latitude for the overlay gates
      const derived = buildDerivedForOverlay(tileClimate);
      biome = applyNarrativeOverlay(biome, derived, narrative, narrativePolicy, rng);

      // Write to engine
      const engineBiome = biomeIdToEngine(biome);
      adapter.setBiomeType(x, y, engineBiome);
    }
  }

  console.log("Biome designation complete (owned model).");
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Build TileClimate from artifacts and adapter for a single tile.
 */
function buildTileClimate(
  x: number,
  y: number,
  width: number,
  height: number,
  adapter: EngineAdapter,
  climateField: ClimateFieldBuffer,
  riverAdjacency: Uint8Array
): TileClimate {
  const idx = y * width + x;

  return {
    latitude: Math.abs(adapter.getLatitude(x, y)),
    elevation: adapter.getElevation(x, y),
    rainfall: climateField.rainfall[idx] | 0,
    isCoastal: isCoastalLand(adapter, x, y, width, height),
    riverAdjacent: riverAdjacency[idx] === 1,
  };
}

/**
 * Build a DerivedClimate for overlay gates.
 *
 * The overlay uses temperature, moistureIndex, and latitude for its
 * climate gates (canBeGrassland, canBeTropical).
 */
function buildDerivedForOverlay(climate: TileClimate) {
  return deriveClimate(climate);
}

/**
 * Map BiomeId to engine biome type.
 *
 * BiomeId values are designed to match engine indices directly,
 * but this function provides a clear boundary for any future mapping.
 */
function biomeIdToEngine(biome: BiomeId): number {
  // BiomeId values match engine indices by design
  return biome;
}
