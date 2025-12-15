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

import type { ExtendedMapContext } from "../core/types.js";
import type { EngineAdapter } from "@civ7/adapter";
import { ctxRandom } from "../core/types.js";
import { getStoryTags } from "../story/tags.js";
import { getTunables } from "../bootstrap/tunables.js";
import { inBounds as boundsCheck } from "../core/index.js";
import { getPublishedClimateField } from "../pipeline/artifacts.js";

// ============================================================================
// Types
// ============================================================================

export interface FeaturesConfig {
  paradiseReefChance?: number;
  volcanicForestChance?: number;
  volcanicTaigaChance?: number;
}

export interface FeaturesDensityConfig {
  shelfReefMultiplier?: number;
  rainforestExtraChance?: number;
  forestExtraChance?: number;
  taigaExtraChance?: number;
}

// Note: FeatureData is imported from @civ7/adapter via the EngineAdapter interface

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

  const tunables = getTunables();
  const foundationCfg = tunables.FOUNDATION_CFG || {};
  const storyTunables = (foundationCfg.story || {}) as { features?: FeaturesConfig };
  const featuresCfg = storyTunables.features || {};
  const densityCfg = (foundationCfg.featuresDensity || {}) as FeaturesDensityConfig;

  const StoryTags = getStoryTags();

  // Feature indices from the adapter
  const reefIndex = adapter.getFeatureTypeIndex("FEATURE_REEF");
  const rainforestIdx = adapter.getFeatureTypeIndex("FEATURE_RAINFOREST");
  const forestIdx = adapter.getFeatureTypeIndex("FEATURE_FOREST");
  const taigaIdx = adapter.getFeatureTypeIndex("FEATURE_TAIGA");

  // Biome globals from the adapter
  const g_GrasslandBiome = adapter.getBiomeGlobal("grassland");
  const g_TropicalBiome = adapter.getBiomeGlobal("tropical");
  const g_TundraBiome = adapter.getBiomeGlobal("tundra");

  const NO_FEATURE = adapter.NO_FEATURE;

  const getRandom = (label: string, max: number): number => {
    if (ctx) {
      return ctxRandom(ctx, label, max);
    }
    return adapter.getRandomNumber(max, label);
  };

  const climateField = getPublishedClimateField(ctx);
  if (!climateField?.rainfall) {
    throw new Error("addDiverseFeatures: Missing artifact:climateField rainfall field.");
  }
  const rainfallField = climateField.rainfall;

  const paradiseReefChance = featuresCfg?.paradiseReefChance ?? 18;

  // 2) Paradise reefs near hotspot paradise centers
  if (
    tunables.STORY_ENABLE_HOTSPOTS &&
    reefIndex !== -1 &&
    StoryTags.hotspotParadise.size > 0 &&
    paradiseReefChance > 0
  ) {
    for (const key of StoryTags.hotspotParadise) {
      const [cx, cy] = key.split(",").map(Number);

      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (!inBounds(nx, ny)) continue;
          if (!adapter.isWater(nx, ny)) continue;
          if (adapter.getFeatureType(nx, ny) !== NO_FEATURE) continue;

          if (getRandom("Paradise Reef", 100) < paradiseReefChance) {
            const canPlace = adapter.canHaveFeature(nx, ny, reefIndex);
            if (canPlace) {
              adapter.setFeatureType(nx, ny, {
                Feature: reefIndex,
                Direction: -1,
                Elevation: 0,
              });
            }
          }
        }
      }
    }
  }

  // 2b) Reefs along passive shelves (margin-aware, modest chance)
  if (reefIndex !== -1 && StoryTags.passiveShelf && StoryTags.passiveShelf.size > 0) {
    const shelfMult = densityCfg?.shelfReefMultiplier ?? 0.6;
    const shelfReefChance = Math.max(
      1,
      Math.min(100, Math.floor((paradiseReefChance || 18) * shelfMult))
    );

    for (const key of StoryTags.passiveShelf) {
      const [sx, sy] = key.split(",").map(Number);

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = sx + dx;
          const ny = sy + dy;
          if (!inBounds(nx, ny)) continue;
          if (!adapter.isWater(nx, ny)) continue;
          if (adapter.getFeatureType(nx, ny) !== NO_FEATURE) continue;

          if (getRandom("Shelf Reef", 100) < shelfReefChance) {
            const canPlace = adapter.canHaveFeature(nx, ny, reefIndex);
            if (canPlace) {
              adapter.setFeatureType(nx, ny, {
                Feature: reefIndex,
                Direction: -1,
                Elevation: 0,
              });
            }
          }
        }
      }
    }
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
      if (tunables.STORY_ENABLE_HOTSPOTS && StoryTags.hotspotVolcanic.size > 0) {
        let nearVolcanic = false;

        for (let vdy = -1; vdy <= 1 && !nearVolcanic; vdy++) {
          for (let vdx = -1; vdx <= 1; vdx++) {
            if (vdx === 0 && vdy === 0) continue;
            const vx = x + vdx;
            const vy = y + vdy;
            if (!inBounds(vx, vy)) continue;
            if (StoryTags.hotspotVolcanic.has(`${vx},${vy}`)) {
              nearVolcanic = true;
              break;
            }
          }
        }

        if (nearVolcanic) {
          // Warm/wet: bias forest on eligible land
          if (
            forestIdx !== -1 &&
            rainfall > 95 &&
            (biome === g_GrasslandBiome || biome === g_TropicalBiome)
          ) {
            if (getRandom("Volcanic Forest", 100) < volcanicForestChance) {
              const canPlace = adapter.canHaveFeature(x, y, forestIdx);
              if (canPlace) {
                adapter.setFeatureType(x, y, {
                  Feature: forestIdx,
                  Direction: -1,
                  Elevation: 0,
                });
                continue;
              }
            }
          }

          // Cold/wet: bias taiga in suitable tundra pockets
          if (
            taigaIdx !== -1 &&
            plat >= 55 &&
            biome === g_TundraBiome &&
            elevation < 400 &&
            rainfall > 60
          ) {
            if (getRandom("Volcanic Taiga", 100) < volcanicTaigaChance) {
              const canPlace = adapter.canHaveFeature(x, y, taigaIdx);
              if (canPlace) {
                adapter.setFeatureType(x, y, {
                  Feature: taigaIdx,
                  Direction: -1,
                  Elevation: 0,
                });
                continue;
              }
            }
          }
        }
      }

      // 3b) Gentle density tweaks (validated)
      // Enhanced jungle in tropical high-rainfall areas
      if (
        rainforestIdx !== -1 &&
        biome === g_TropicalBiome &&
        rainfall > 130
      ) {
        if (getRandom("Extra Jungle", 100) < rainforestExtraChance) {
          const canPlace = adapter.canHaveFeature(x, y, rainforestIdx);
          if (canPlace) {
            adapter.setFeatureType(x, y, {
              Feature: rainforestIdx,
              Direction: -1,
              Elevation: 0,
            });
            continue;
          }
        }
      }

      // Enhanced forests in temperate grasslands
      if (forestIdx !== -1 && biome === g_GrasslandBiome && rainfall > 100) {
        if (getRandom("Extra Forest", 100) < forestExtraChance) {
          const canPlace = adapter.canHaveFeature(x, y, forestIdx);
          if (canPlace) {
            adapter.setFeatureType(x, y, {
              Feature: forestIdx,
              Direction: -1,
              Elevation: 0,
            });
            continue;
          }
        }
      }

      // Taiga in cold areas (low elevation)
      if (taigaIdx !== -1 && biome === g_TundraBiome && elevation < 300) {
        if (getRandom("Extra Taiga", 100) < taigaExtraChance) {
          const canPlace = adapter.canHaveFeature(x, y, taigaIdx);
          if (canPlace) {
            adapter.setFeatureType(x, y, {
              Feature: taigaIdx,
              Direction: -1,
              Elevation: 0,
            });
            continue;
          }
        }
      }
    }
  }
}

export default addDiverseFeatures;
