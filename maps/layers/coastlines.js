/**
 * Coastlines Layer — addRuggedCoasts
 *
 * Light-touch coastal reshaping that carves occasional bays and creates sparse
 * fjord-like peninsulas while preserving open sea lanes. Uses a low-frequency
 * fractal mask and conservative randomness to avoid chokepoint proliferation.
 *
 * Dependencies: engine-provided GameplayMap, TerrainBuilder, FractalBuilder, and globals.
 */

import * as globals from "/base-standard/maps/map-globals.js";
import { isAdjacentToLand } from "../core/utils.js";

/**
 * Ruggedize coasts in a sparse, performance-friendly pass.
 * - Occasionally converts coastal land to shallow water (bays).
 * - Occasionally converts adjacent ocean to coast (peninsulas/fjords).
 * - Only operates near current coastlines; does not perform heavy flood fills.
 *
 * Invariants:
 * - Keeps oceans truly open; very low probabilities to avoid chokepoints.
 * - O(width × height) with constant-time local checks.
 *
 * @param {number} iWidth
 * @param {number} iHeight
 */
export function addRuggedCoasts(iWidth, iHeight) {
  // Use hill fractal as a sparse noise mask to drive rare edits
  FractalBuilder.create(globals.g_HillFractal, iWidth, iHeight, 4, 0);

  for (let y = 1; y < iHeight - 1; y++) {
    for (let x = 1; x < iWidth - 1; x++) {
      // Carve bays: coastal land -> coast water (very sparse)
      if (GameplayMap.isCoastalLand(x, y)) {
        const h = FractalBuilder.getHeight(globals.g_HillFractal, x, y);
        if (h % 97 < 2 && TerrainBuilder.getRandomNumber(5, "Carve Bay") === 0) {
          TerrainBuilder.setTerrainType(x, y, globals.g_CoastTerrain);
          continue; // Avoid double-touching same tile in this pass
        }
      }

      // Fjord-like peninsulas: turn some adjacent ocean into coast (very sparse)
      if (GameplayMap.isWater(x, y)) {
        // Keep to near-land ocean only; deep ocean remains untouched
        if (isAdjacentToLand(x, y, 1)) {
          if (TerrainBuilder.getRandomNumber(12, "Fjord Coast") === 0) {
            TerrainBuilder.setTerrainType(x, y, globals.g_CoastTerrain);
          }
        }
      }
    }
  }
}

export default addRuggedCoasts;
