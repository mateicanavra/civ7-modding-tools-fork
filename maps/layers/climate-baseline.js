/**
 * Climate Baseline Layer — buildEnhancedRainfall
 *
 * Purpose
 * - Start from base-standard rainfall, then gently blend in latitude bands
 *   and add small, natural-looking local modifiers.
 *
 * Behavior (unchanged from integrated script logic)
 * - Base rainfall from engine (vanilla expectations preserved)
 * - Latitude bands:
 *     0–10  : very wet
 *     10–20 : wet
 *     20–35 : temperate-dry
 *     35–55 : temperate
 *     55–70 : cool but not barren
 *     70+   : cold/dry
 * - Blend weights: base 60%, band target 40%
 * - Orographic: small elevation-based bonuses
 * - Local water humidity: coastal and shallow-water adjacency boosts
 * - Light noise to break up visible banding
 * - Clamp rainfall to [0, 200] as a hard invariant
 *
 * Performance
 * - O(width × height); single linear pass over tiles.
 */

import { buildRainfallMap } from "/base-standard/maps/elevation-terrain-generator.js";
import { clamp } from "../core/utils.js";

/**
 * Build the baseline rainfall map with latitude bands and gentle local modifiers.
 * @param {number} iWidth
 * @param {number} iHeight
 */
export function buildEnhancedRainfall(iWidth, iHeight) {
  console.log("Building enhanced rainfall patterns...");

  // Start from the engine’s base rainfall to preserve vanilla assumptions.
  buildRainfallMap(iWidth, iHeight);

  // Apply latitude bands + small local adjustments
  for (let y = 0; y < iHeight; y++) {
    for (let x = 0; x < iWidth; x++) {
      if (GameplayMap.isWater(x, y)) continue;

      const base = GameplayMap.getRainfall(x, y);
      const elevation = GameplayMap.getElevation(x, y);
      const lat = Math.abs(GameplayMap.getPlotLatitude(x, y)); // 0 at equator, 90 at poles

      // Band target by absolute latitude
      let bandRain = 0;
      if (lat < 10) bandRain = 115;
      else if (lat < 20) bandRain = 100;
      else if (lat < 35) bandRain = 75;
      else if (lat < 55) bandRain = 70;
      else if (lat < 70) bandRain = 60;
      else bandRain = 45;

      // Blend: lean a bit more on the base map to keep variety
      let currentRainfall = Math.round(base * 0.6 + bandRain * 0.4);

      // Orographic: mild elevation bonuses
      if (elevation > 350) currentRainfall += 8;
      if (elevation > 600) currentRainfall += 7;

      // Local water humidity: coast and shallow-water adjacency
      if (GameplayMap.isCoastalLand(x, y)) currentRainfall += 18;
      if (GameplayMap.isAdjacentToShallowWater(x, y)) currentRainfall += 12;

      // Light noise to avoid striping/banding artifacts
      currentRainfall += TerrainBuilder.getRandomNumber(6, "Rain Noise") - 3;

      TerrainBuilder.setRainfall(x, y, clamp(currentRainfall, 0, 200));
    }
  }
}

export default buildEnhancedRainfall;
