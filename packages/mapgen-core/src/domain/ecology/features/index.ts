/**
 * Features Layer — addDiverseFeatures
 *
 * Purpose
 * - Run base-standard feature generation, then apply small, validated, and
 *   climate-aware embellishments that strengthen the narrative:
 *   - Paradise reefs near hotspot paradise centers
 *   - Volcanic vegetation around volcanic centers (forests in warm/wet, taiga in cold/wet)
 *   - Gentle density tweaks for rainforest/forest/taiga in appropriate biomes
 *
 * Guardrails
 * - Always validate placements via TerrainBuilder.canHaveFeature
 * - Resolve feature indices via lookups; skip if unavailable
 * - Keep probabilities conservative and local; never create chokepoints
 * - O(width × height); small neighborhood scans only
 */

import type { ExtendedMapContext } from "../../../core/types.js";
import { ctxRandom } from "../../../core/types.js";
import { getStoryTags } from "../../narrative/tags/index.js";
import { inBounds as boundsCheck } from "../../../core/index.js";
import { getPublishedClimateField } from "../../../pipeline/artifacts.js";
import type { FeaturesConfig, FeaturesDensityConfig } from "./types.js";
import { resolveFeatureIndices } from "./indices.js";
import { applyParadiseReefs } from "./paradise-reefs.js";
import { applyShelfReefs } from "./shelf-reefs.js";
import { applyVolcanicVegetationAtTile } from "./volcanic-vegetation.js";
import { applyDensityTweaksAtTile } from "./density-tweaks.js";

export type { FeaturesConfig, FeaturesDensityConfig } from "./types.js";

// ============================================================================
// Main Function
// ============================================================================

/**
 * Add diverse features with conservative, validated tweaks.
 */
export function addDiverseFeatures(
  iWidth: number,
  iHeight: number,
  ctx?: ExtendedMapContext | null
): void {
  console.log("Adding diverse terrain features...");

  if (!ctx?.adapter) {
    throw new Error(
      "addDiverseFeatures: MapContext adapter is required (legacy direct-engine fallback removed)."
    );
  }

  const adapter = ctx.adapter;

  // Local bounds check with captured dimensions
  const inBounds = (x: number, y: number): boolean =>
    boundsCheck(x, y, iWidth, iHeight);

  // 1) Base-standard features (vanilla-compatible baseline) via the real engine
  adapter.addFeatures(iWidth, iHeight);

  const config = ctx.config;
  const storyTunables = (config.story || {}) as { features?: FeaturesConfig };
  const featuresCfg = storyTunables.features || {};
  const densityCfg = (config.featuresDensity || {}) as FeaturesDensityConfig;

  const StoryTags = getStoryTags(ctx);

  const climateField = getPublishedClimateField(ctx);
  if (!climateField?.rainfall) {
    throw new Error(
      "addDiverseFeatures: Missing artifact:climateField rainfall field."
    );
  }
  const rainfallField = climateField.rainfall;

  const { reefIndex, rainforestIdx, forestIdx, taigaIdx, NO_FEATURE } = resolveFeatureIndices(adapter);
  const g_GrasslandBiome = adapter.getBiomeGlobal("grassland");
  const g_TropicalBiome = adapter.getBiomeGlobal("tropical");
  const g_TundraBiome = adapter.getBiomeGlobal("tundra");

  const getRandom = (label: string, max: number): number => {
    if (ctx) {
      return ctxRandom(ctx, label, max);
    }
    return adapter.getRandomNumber(max, label);
  };

  const paradiseReefChance = featuresCfg?.paradiseReefChance ?? 18;

  // 2) Paradise reefs near hotspot paradise centers
  if (
    reefIndex !== -1 &&
    StoryTags.hotspotParadise.size > 0 &&
    paradiseReefChance > 0
  ) {
    applyParadiseReefs({
      adapter,
      reefIndex,
      NO_FEATURE,
      inBounds,
      getRandom,
      paradiseReefChance,
      hotspotParadise: StoryTags.hotspotParadise,
    });
  }

  // 2b) Reefs along passive shelves (margin-aware, modest chance)
  if (reefIndex !== -1 && StoryTags.passiveShelf && StoryTags.passiveShelf.size > 0) {
    const shelfMult = densityCfg?.shelfReefMultiplier ?? 0.6;
    const shelfReefChance = Math.max(
      1,
      Math.min(100, Math.floor(paradiseReefChance * shelfMult))
    );
    applyShelfReefs({
      adapter,
      reefIndex,
      NO_FEATURE,
      inBounds,
      getRandom,
      shelfReefChance,
      passiveShelf: StoryTags.passiveShelf,
    });
  }

  // 3) Per-tile post-pass for gentle density tweaks and volcanic vegetation
  const baseVolcanicForestChance = featuresCfg?.volcanicForestChance ?? 22;
  const baseVolcanicTaigaChance = featuresCfg?.volcanicTaigaChance ?? 25;

  // Slight boost to rugged vegetation near volcanic centers (kept conservative)
  const volcanicForestChance = Math.min(100, baseVolcanicForestChance + 6);
  const volcanicTaigaChance = Math.min(100, baseVolcanicTaigaChance + 5);

  const rainforestExtraChance = densityCfg?.rainforestExtraChance ?? 55;
  const forestExtraChance = densityCfg?.forestExtraChance ?? 30;
  const taigaExtraChance = densityCfg?.taigaExtraChance ?? 35;

  for (let y = 0; y < iHeight; y++) {
    for (let x = 0; x < iWidth; x++) {
      if (adapter.isWater(x, y)) continue;
      if (adapter.getFeatureType(x, y) !== NO_FEATURE) continue;

      const biome = adapter.getBiomeType(x, y);
      const elevation = adapter.getElevation(x, y);
      const rainfall = rainfallField[y * iWidth + x] | 0;
      const plat = Math.abs(adapter.getLatitude(x, y));

      // 3a) Volcanic vegetation near volcanic hotspot centers (radius 1)
      if (
        applyVolcanicVegetationAtTile({
          adapter,
          x,
          y,
          inBounds,
          getRandom,
          hotspotVolcanic: StoryTags.hotspotVolcanic,
          forestIdx,
          taigaIdx,
          volcanicForestChance,
          volcanicTaigaChance,
          biome,
          elevation,
          rainfall,
          latAbs: plat,
          grasslandBiome: g_GrasslandBiome,
          tropicalBiome: g_TropicalBiome,
          tundraBiome: g_TundraBiome,
        })
      ) {
        continue;
      }

      // 3b) Gentle density tweaks (validated)
      if (
        applyDensityTweaksAtTile({
          adapter,
          x,
          y,
          getRandom,
          rainforestIdx,
          forestIdx,
          taigaIdx,
          rainfall,
          elevation,
          biome,
          tropicalBiome: g_TropicalBiome,
          grasslandBiome: g_GrasslandBiome,
          tundraBiome: g_TundraBiome,
          rainforestExtraChance,
          forestExtraChance,
          taigaExtraChance,
        })
      ) {
        continue;
      }
    }
  }
}

export default addDiverseFeatures;
