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
import { StoryTags } from "../story/tags.js";

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
    // Size-aware modifiers (gentle; keep lanes open)
    const area = Math.max(1, iWidth * iHeight);
    const sqrtScale = Math.min(2.0, Math.max(0.6, Math.sqrt(area / 10000)));

    // Use hill fractal as a sparse noise mask to drive rare edits
    FractalBuilder.create(globals.g_HillFractal, iWidth, iHeight, 4, 0);

    // Probability tuning: on larger maps, allow a touch more edits
    const bayNoiseMod = sqrtScale > 1 ? 1 : 0; // widen noise gate slightly
    const fjordDenom = Math.max(6, 12 - (sqrtScale > 1.3 ? 1 : 0)); // 12 → 11 on very large maps

    for (let y = 1; y < iHeight - 1; y++) {
        for (let x = 1; x < iWidth - 1; x++) {
            // Carve bays: coastal land -> coast water (very sparse)
            if (GameplayMap.isCoastalLand(x, y)) {
                const h = FractalBuilder.getHeight(globals.g_HillFractal, x, y);
                // Margin-aware: slightly stronger bay carving on ACTIVE_MARGIN
                const isActive = StoryTags.activeMargin.has(`${x},${y}`);
                const noiseGate = 2 + bayNoiseMod + (isActive ? 1 : 0);
                const bayRollDen = isActive ? 4 : 5;
                if (
                    h % 97 < noiseGate &&
                    TerrainBuilder.getRandomNumber(bayRollDen, "Carve Bay") ===
                        0
                ) {
                    TerrainBuilder.setTerrainType(x, y, globals.g_CoastTerrain);
                    continue; // Avoid double-touching same tile in this pass
                }
            }

            // Fjord-like peninsulas: turn some adjacent ocean into coast (very sparse)
            if (GameplayMap.isWater(x, y)) {
                // Keep to near-land ocean only; deep ocean remains untouched
                if (isAdjacentToLand(x, y, 1)) {
                    {
                        // Margin-aware: widen shelf near PASSIVE_SHELF, deepen cuts near ACTIVE_MARGIN
                        let nearActive = false,
                            nearPassive = false;
                        for (
                            let ddy = -1;
                            ddy <= 1 && (!nearActive || !nearPassive);
                            ddy++
                        ) {
                            for (let ddx = -1; ddx <= 1; ddx++) {
                                if (ddx === 0 && ddy === 0) continue;
                                const nx = x + ddx,
                                    ny = y + ddy;
                                if (
                                    nx <= 0 ||
                                    nx >= iWidth - 1 ||
                                    ny <= 0 ||
                                    ny >= iHeight - 1
                                )
                                    continue;
                                const k = `${nx},${ny}`;
                                if (
                                    !nearActive &&
                                    StoryTags.activeMargin.has(k)
                                )
                                    nearActive = true;
                                if (
                                    !nearPassive &&
                                    StoryTags.passiveShelf.has(k)
                                )
                                    nearPassive = true;
                            }
                        }
                        const denom = Math.max(
                            4,
                            fjordDenom -
                                (nearPassive ? 2 : 0) -
                                (nearActive ? 1 : 0),
                        );
                        if (
                            TerrainBuilder.getRandomNumber(
                                denom,
                                "Fjord Coast",
                            ) === 0
                        ) {
                            TerrainBuilder.setTerrainType(
                                x,
                                y,
                                globals.g_CoastTerrain,
                            );
                        }
                    }
                }
            }
        }
    }
}

export default addRuggedCoasts;
