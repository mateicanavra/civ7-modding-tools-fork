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

import { addFeatures as baseAddFeatures } from "/base-standard/maps/feature-biome-generator.js";
import * as globals from "/base-standard/maps/map-globals.js";
import { StoryTags } from "../story/tags.js";
import { STORY_ENABLE_HOTSPOTS, STORY_TUNABLES } from "../config/tunables.js";
import { getFeatureTypeIndex, inBounds } from "../core/utils.js";

/**
 * Add diverse features with conservative, validated tweaks.
 * @param {number} iWidth
 * @param {number} iHeight
 */
export function addDiverseFeatures(iWidth, iHeight) {
  console.log("Adding diverse terrain features...");

  // 1) Base-standard features (vanilla-compatible baseline)
  baseAddFeatures(iWidth, iHeight);

  // 2) Paradise reefs near hotspot paradise centers
  const reefIndex = getFeatureTypeIndex("FEATURE_REEF");
  const paradiseReefChance =
    STORY_TUNABLES?.features?.paradiseReefChance ?? 18;

  if (
    STORY_ENABLE_HOTSPOTS &&
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
          if (!GameplayMap.isWater(nx, ny)) continue;
          if (GameplayMap.getFeatureType(nx, ny) !== FeatureTypes.NO_FEATURE)
            continue;

          if (
            TerrainBuilder.getRandomNumber(
              100,
              "Paradise Reef"
            ) < paradiseReefChance
          ) {
            if (TerrainBuilder.canHaveFeature(nx, ny, reefIndex)) {
              TerrainBuilder.setFeatureType(nx, ny, {
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
  const volcanicForestChance =
    STORY_TUNABLES?.features?.volcanicForestChance ?? 22;
  const volcanicTaigaChance =
    STORY_TUNABLES?.features?.volcanicTaigaChance ?? 25;

  const rainforestIdx = getFeatureTypeIndex("FEATURE_RAINFOREST");
  const forestIdx = getFeatureTypeIndex("FEATURE_FOREST");
  const taigaIdx = getFeatureTypeIndex("FEATURE_TAIGA");

  for (let y = 0; y < iHeight; y++) {
    for (let x = 0; x < iWidth; x++) {
      if (GameplayMap.isWater(x, y)) continue;
      if (GameplayMap.getFeatureType(x, y) !== FeatureTypes.NO_FEATURE) continue;

      const biome = GameplayMap.getBiomeType(x, y);
      const elevation = GameplayMap.getElevation(x, y);
      const rainfall = GameplayMap.getRainfall(x, y);
      const plat = Math.abs(GameplayMap.getPlotLatitude(x, y));

      // 3a) Volcanic vegetation near volcanic hotspot centers (radius 1)
      if (STORY_ENABLE_HOTSPOTS && StoryTags.hotspotVolcanic.size > 0) {
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
            (biome === globals.g_GrasslandBiome ||
              biome === globals.g_TropicalBiome)
          ) {
            if (
              TerrainBuilder.getRandomNumber(100, "Volcanic Forest") <
              volcanicForestChance
            ) {
              if (TerrainBuilder.canHaveFeature(x, y, forestIdx)) {
                TerrainBuilder.setFeatureType(x, y, {
                  Feature: forestIdx,
                  Direction: -1,
                  Elevation: 0,
                });
                continue; // placed a feature; skip other tweaks on this tile
              }
            }
          }

          // Cold/wet: bias taiga in suitable tundra pockets
          if (
            taigaIdx !== -1 &&
            plat >= 55 &&
            biome === globals.g_TundraBiome &&
            elevation < 400 &&
            rainfall > 60
          ) {
            if (
              TerrainBuilder.getRandomNumber(100, "Volcanic Taiga") <
              volcanicTaigaChance
            ) {
              if (TerrainBuilder.canHaveFeature(x, y, taigaIdx)) {
                TerrainBuilder.setFeatureType(x, y, {
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
        biome === globals.g_TropicalBiome &&
        rainfall > 140
      ) {
        if (TerrainBuilder.getRandomNumber(100, "Extra Jungle") < 40) {
          if (TerrainBuilder.canHaveFeature(x, y, rainforestIdx)) {
            TerrainBuilder.setFeatureType(x, y, {
              Feature: rainforestIdx,
              Direction: -1,
              Elevation: 0,
            });
            continue;
          }
        }
      }

      // Enhanced forests in temperate grasslands
      if (forestIdx !== -1 && biome === globals.g_GrasslandBiome && rainfall > 100) {
        if (TerrainBuilder.getRandomNumber(100, "Extra Forest") < 30) {
          if (TerrainBuilder.canHaveFeature(x, y, forestIdx)) {
            TerrainBuilder.setFeatureType(x, y, {
              Feature: forestIdx,
              Direction: -1,
              Elevation: 0,
            });
            continue;
          }
        }
      }

      // Taiga in cold areas (low elevation)
      if (taigaIdx !== -1 && biome === globals.g_TundraBiome && elevation < 300) {
        if (TerrainBuilder.getRandomNumber(100, "Extra Taiga") < 35) {
          if (TerrainBuilder.canHaveFeature(x, y, taigaIdx)) {
            TerrainBuilder.setFeatureType(x, y, {
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
