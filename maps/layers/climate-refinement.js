/**
 * Climate Refinement Layer — refineRainfallEarthlike
 *
 * Purpose
 * - Apply earthlike refinements to the baseline rainfall after rivers exist.
 * - Keep adjustments small, localized, and clamped to preserve balance.
 *
 * Passes (A–E)
 * A) Coastal and lake humidity gradient (up to radius 4; stronger at low elevation)
 * B) Orographic rain shadows with latitude-dependent prevailing winds
 * C) River corridor greening and slight low-basin humidity
 * D) Rift humidity boost near StoryTags.riftLine (narrow radius; elevation-aware)
 * E) Hotspot island microclimates (paradise/volcanic centers) with small boosts
 *
 * Invariants
 * - Clamp all rainfall updates to [0, 200].
 * - Keep scans local (radius ≤ 4) and complexity O(width × height).
 * - Do not reorder the broader pipeline (this runs after rivers are modeled).
 */

import { clamp, inBounds } from "../core/utils.js";
import { StoryTags } from "../story/tags.js";
import { OrogenyCache } from "../story/tagging.js";
import { STORY_TUNABLES, STORY_ENABLE_OROGENY } from "../config/tunables.js";

/**
 * Distance in tiles (Chebyshev radius) to nearest water within maxR; -1 if none.
 * @param {number} x
 * @param {number} y
 * @param {number} maxR
 */
function distanceToNearestWater(x, y, maxR) {
    const width = GameplayMap.getGridWidth();
    const height = GameplayMap.getGridHeight();

    for (let r = 1; r <= maxR; r++) {
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    if (GameplayMap.isWater(nx, ny)) return r;
                }
            }
        }
    }
    return -1;
}

/**
 * Returns number of steps (1..steps) to the first upwind barrier or 0 if none.
 * A barrier is a mountain tile (if engine exposes GameplayMap.isMountain)
 * or a tile with elevation >= 500.
 * @param {number} x
 * @param {number} y
 * @param {number} dx - upwind x-step
 * @param {number} dy - upwind y-step
 * @param {number} steps - how far to scan
 */
function hasUpwindBarrier(x, y, dx, dy, steps) {
    const width = GameplayMap.getGridWidth();
    const height = GameplayMap.getGridHeight();
    for (let s = 1; s <= steps; s++) {
        const nx = x + dx * s;
        const ny = y + dy * s;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) break;
        if (!GameplayMap.isWater(nx, ny)) {
            if (GameplayMap.isMountain && GameplayMap.isMountain(nx, ny))
                return s;
            const elev = GameplayMap.getElevation(nx, ny);
            if (elev >= 500) return s;
        }
    }
    return 0;
}

/**
 * Apply earthlike rainfall refinements in multiple small, clamped passes.
 * Call this after rivers are modeled and named.
 * @param {number} iWidth
 * @param {number} iHeight
 */
export function refineRainfallEarthlike(iWidth, iHeight) {
    // Pass A: coastal and lake humidity gradient (decays with distance up to 4)
    {
        const maxR = 4;
        for (let y = 0; y < iHeight; y++) {
            for (let x = 0; x < iWidth; x++) {
                if (GameplayMap.isWater(x, y)) continue;

                const dist = distanceToNearestWater(x, y, maxR);
                if (dist >= 0) {
                    // Closer to water -> more humidity; stronger if also low elevation
                    const elev = GameplayMap.getElevation(x, y);
                    let bonus = Math.max(0, maxR - dist) * 4;
                    if (elev < 150) bonus += 2;

                    const rf = GameplayMap.getRainfall(x, y);
                    TerrainBuilder.setRainfall(x, y, clamp(rf + bonus, 0, 200));
                }
            }
        }
    }

    // Pass B: orographic rain shadows with latitude-dependent prevailing winds
    {
        for (let y = 0; y < iHeight; y++) {
            for (let x = 0; x < iWidth; x++) {
                if (GameplayMap.isWater(x, y)) continue;

                const lat = Math.abs(GameplayMap.getPlotLatitude(x, y));
                // Trade winds (0–30): E→W; Westerlies (30–60): W→E; Polar easterlies (60+): E→W
                const dx = lat < 30 || lat >= 60 ? -1 : 1;
                const dy = 0; // zonal winds simplified
                const barrier = hasUpwindBarrier(x, y, dx, dy, 4);

                if (barrier) {
                    const rf = GameplayMap.getRainfall(x, y);
                    const reduction = 8 + barrier * 6; // stronger reduction with closer barrier
                    TerrainBuilder.setRainfall(
                        x,
                        y,
                        clamp(rf - reduction, 0, 200),
                    );
                }
            }
        }
    }

    // Pass C: river corridor greening and basin humidity
    {
        for (let y = 0; y < iHeight; y++) {
            for (let x = 0; x < iWidth; x++) {
                if (GameplayMap.isWater(x, y)) continue;

                let rf = GameplayMap.getRainfall(x, y);
                const elev = GameplayMap.getElevation(x, y);

                // River adjacency boost (stronger at low elevation)
                if (GameplayMap.isAdjacentToRivers(x, y, 1)) {
                    rf += elev < 250 ? 14 : 10;
                }

                // Slight wetness in enclosed low basins (surrounded by higher elevation in radius 2)
                let lowBasin = true;
                for (let dy = -2; dy <= 2 && lowBasin; dy++) {
                    for (let dx = -2; dx <= 2; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const nx = x + dx;
                        const ny = y + dy;
                        if (inBounds(nx, ny)) {
                            if (GameplayMap.getElevation(nx, ny) < elev + 20) {
                                lowBasin = false;
                                break;
                            }
                        }
                    }
                }
                if (lowBasin && elev < 200) rf += 6;

                TerrainBuilder.setRainfall(x, y, clamp(rf, 0, 200));
            }
        }
    }

    // Pass D: Rift humidity boost (narrow radius, elevation-aware)
    {
        const riftR = STORY_TUNABLES?.rainfall?.riftRadius ?? 2;
        const riftBoost = STORY_TUNABLES?.rainfall?.riftBoost ?? 8;

        if (StoryTags.riftLine.size > 0 && riftR > 0 && riftBoost !== 0) {
            for (let y = 0; y < iHeight; y++) {
                for (let x = 0; x < iWidth; x++) {
                    if (GameplayMap.isWater(x, y)) continue;

                    // Quick proximity check: any rift line tile within radius riftR
                    let nearRift = false;
                    for (let dy = -riftR; dy <= riftR && !nearRift; dy++) {
                        for (let dx = -riftR; dx <= riftR; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            const nx = x + dx;
                            const ny = y + dy;
                            if (!inBounds(nx, ny)) continue;
                            if (StoryTags.riftLine.has(`${nx},${ny}`)) {
                                nearRift = true;
                                break;
                            }
                        }
                    }

                    if (nearRift) {
                        const rf = GameplayMap.getRainfall(x, y);
                        const elev = GameplayMap.getElevation(x, y);
                        // Slightly reduce boost at higher elevation
                        const penalty = Math.max(
                            0,
                            Math.floor((elev - 200) / 150),
                        );
                        const delta = Math.max(0, riftBoost - penalty);
                        TerrainBuilder.setRainfall(
                            x,
                            y,
                            clamp(rf + delta, 0, 200),
                        );
                    }
                }
            }
        }
    }

    // Pass E: Orogeny belts (windward/lee amplification — size-aware, clamped)
    {
        if (STORY_ENABLE_OROGENY && typeof OrogenyCache === "object") {
            const hasWindward =
                OrogenyCache.windward && OrogenyCache.windward.size > 0;
            const hasLee = OrogenyCache.lee && OrogenyCache.lee.size > 0;

            if (hasWindward || hasLee) {
                const windwardBoost =
                    STORY_TUNABLES?.orogeny?.windwardBoost ?? 5;
                const leeAmp =
                    STORY_TUNABLES?.orogeny?.leeDrynessAmplifier ?? 1.2;

                for (let y = 0; y < iHeight; y++) {
                    for (let x = 0; x < iWidth; x++) {
                        if (GameplayMap.isWater(x, y)) continue;

                        let rf = GameplayMap.getRainfall(x, y);
                        const key = `${x},${y}`;

                        // Apply windward boost (small, positive)
                        if (hasWindward && OrogenyCache.windward.has(key)) {
                            rf = clamp(rf + windwardBoost, 0, 200);
                        }

                        // Apply lee dryness by amplifying a small baseline subtraction
                        if (hasLee && OrogenyCache.lee.has(key)) {
                            const baseSubtract = 8; // slightly stronger lee-side dryness to accentuate relief
                            const extra = Math.max(
                                0,
                                Math.round(baseSubtract * (leeAmp - 1)),
                            );
                            rf = clamp(rf - (baseSubtract + extra), 0, 200);
                        }

                        TerrainBuilder.setRainfall(x, y, rf);
                    }
                }
            }
        }
    }

    // Pass F: Hotspot island microclimates (paradise/volcanic centers)
    {
        const paradiseDelta = STORY_TUNABLES?.rainfall?.paradiseDelta ?? 6;
        const volcanicDelta = STORY_TUNABLES?.rainfall?.volcanicDelta ?? 8;
        const radius = 2;

        const hasParadise = StoryTags.hotspotParadise.size > 0;
        const hasVolcanic = StoryTags.hotspotVolcanic.size > 0;

        if (hasParadise || hasVolcanic) {
            for (let y = 0; y < iHeight; y++) {
                for (let x = 0; x < iWidth; x++) {
                    if (GameplayMap.isWater(x, y)) continue;

                    let nearParadise = false;
                    let nearVolcanic = false;

                    for (
                        let dy = -radius;
                        dy <= radius && (!nearParadise || !nearVolcanic);
                        dy++
                    ) {
                        for (let dx = -radius; dx <= radius; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            const nx = x + dx;
                            const ny = y + dy;
                            if (!inBounds(nx, ny)) continue;

                            const key = `${nx},${ny}`;
                            if (
                                !nearParadise &&
                                hasParadise &&
                                StoryTags.hotspotParadise.has(key)
                            )
                                nearParadise = true;
                            if (
                                !nearVolcanic &&
                                hasVolcanic &&
                                StoryTags.hotspotVolcanic.has(key)
                            )
                                nearVolcanic = true;

                            if (nearParadise && nearVolcanic) break;
                        }
                    }

                    if (nearParadise || nearVolcanic) {
                        const rf = GameplayMap.getRainfall(x, y);
                        let delta = 0;
                        if (nearParadise) delta += paradiseDelta;
                        if (nearVolcanic) delta += volcanicDelta;
                        TerrainBuilder.setRainfall(
                            x,
                            y,
                            clamp(rf + delta, 0, 200),
                        );
                    }
                }
            }
        }
    }
}

export default refineRainfallEarthlike;
