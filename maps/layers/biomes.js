/**
 * Biomes Layer — designateEnhancedBiomes
 *
 * Purpose
 * - Start with base-standard biome assignment, then apply light, climate-aware
 *   nudges for playability and realism.
 * - Includes a narrow preference along rift shoulders to suggest fertile
 *   corridor edges without overriding vanilla eligibility rules.
 *
 * Behavior
 * - Base biomes: delegated to engine (vanilla-compatible).
 * - Tundra restraint: only at very high latitude or extreme elevation when dry.
 * - Tropical encouragement: wet, warm coasts near the equator.
 * - River-valley playability: temperate/warm river-adjacent tiles trend grassland.
 * - Rift shoulder bias: temperate/warm shoulder tiles prefer grassland when moist.
 *
 * Invariants
 * - Does not bypass engine constraints beyond setting biome types.
 * - Keeps adjustments modest; does not interfere with feature validation rules.
 * - O(width × height) with simple local checks.
 */

import { designateBiomes as baseDesignateBiomes } from "/base-standard/maps/feature-biome-generator.js";
import * as globals from "/base-standard/maps/map-globals.js";
import { StoryTags } from "../story/tags.js";
import { STORY_ENABLE_RIFTS } from "../config/tunables.js";

/**
 * Enhanced biome designation with gentle, readable nudges.
 * @param {number} iWidth
 * @param {number} iHeight
 */
export function designateEnhancedBiomes(iWidth, iHeight) {
  console.log("Creating enhanced biome diversity (climate-aware)...");

  // Start with vanilla-consistent biomes
  baseDesignateBiomes(iWidth, iHeight);

  // Apply small, climate-aware preferences
  for (let y = 0; y < iHeight; y++) {
    for (let x = 0; x < iWidth; x++) {
      if (GameplayMap.isWater(x, y)) continue;

      const lat = Math.abs(GameplayMap.getPlotLatitude(x, y));
      const elevation = GameplayMap.getElevation(x, y);
      const rainfall = GameplayMap.getRainfall(x, y);

      // Tundra restraint: require very high lat or extreme elevation and dryness
      if ((lat > 70 || elevation > 850) && rainfall < 90) {
        TerrainBuilder.setBiomeType(x, y, globals.g_TundraBiome);
        continue; // lock this decision; skip other nudges
      }

      // Wet, warm coasts near the equator tend tropical
      if (lat < 18 && GameplayMap.isCoastalLand(x, y) && rainfall > 105) {
        TerrainBuilder.setBiomeType(x, y, globals.g_TropicalBiome);
      }

      // Temperate/warm river valleys prefer grassland for playability
      if (GameplayMap.isAdjacentToRivers(x, y, 1) && rainfall > 75 && lat < 50) {
        TerrainBuilder.setBiomeType(x, y, globals.g_GrasslandBiome);
      }

      // Climate Story: rift shoulder preference (narrow, moisture-aware)
      if (STORY_ENABLE_RIFTS && StoryTags.riftShoulder.size > 0) {
        const key = `${x},${y}`;
        if (StoryTags.riftShoulder.has(key)) {
          // Temperate/warm shoulders: prefer grassland when sufficiently moist
          if (lat < 50 && rainfall > 75) {
            TerrainBuilder.setBiomeType(x, y, globals.g_GrasslandBiome);
          } else if (lat < 18 && rainfall > 100) {
            // In very warm & wet shoulders, allow tropical bias (still gentle)
            TerrainBuilder.setBiomeType(x, y, globals.g_TropicalBiome);
          }
        }
      }
    }
  }
}

export default designateEnhancedBiomes;
