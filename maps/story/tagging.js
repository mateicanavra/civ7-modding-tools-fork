/**
 * Climate Story — Tagging functions
 *
 * This module generates lightweight, sparse tags (“StoryTags”) that imprint
 * narrative motifs onto the map without heavy simulation. Tags are consumed by
 * other layers (coast/island shaping, rainfall refinement, biome/feature nudges).
 *
 * Exports:
 *  - storyTagHotspotTrails(ctx?): Tag deep‑ocean hotspot polylines.
 *  - storyTagRiftValleys(ctx?): Tag inland rift centerlines and shoulder tiles.
 *
 * Notes:
 *  - Tags are stored in StoryTags as "x,y" string keys for simplicity.
 *  - ctx is optional; functions will query GameplayMap directly if omitted.
 *  - All tunables are conservative; guardrails are preserved by consumers.
 */

import { StoryTags } from "./tags.js";
import { STORY_TUNABLES } from "../config/tunables.js";
import { inBounds, storyKey, isAdjacentToLand } from "../core/utils.js";

/**
 * Tag deep‑ocean hotspot trails as sparse polylines.
 * Trails are later used to bias offshore island placement and microclimates.
 *
 * Rules:
 *  - Keep trails far from land (minDistFromLand).
 *  - Enforce minimum separation between different trails.
 *  - March a fixed number of steps with occasional gentle bends.
 *
 * @param {object} [ctx] - Optional context (unused; present for future parity).
 * @returns {{ trails:number, points:number }} summary counts
 */
export function storyTagHotspotTrails(ctx) {
    const width = GameplayMap.getGridWidth();
    const height = GameplayMap.getGridHeight();
    const baseHot = STORY_TUNABLES.hotspot;
    const areaHot = Math.max(1, width * height);
    const sqrtHot = Math.min(2.0, Math.max(0.6, Math.sqrt(areaHot / 10000)));
    const maxTrails = Math.max(
        1,
        Math.round(baseHot.maxTrails * (0.9 + 0.6 * sqrtHot)),
    );
    const steps = Math.round(baseHot.steps * (0.9 + 0.4 * sqrtHot));
    const stepLen = baseHot.stepLen;
    const minDistFromLand = baseHot.minDistFromLand;
    const minTrailSeparation = baseHot.minTrailSeparation;

    // Helper: ensure a candidate is far enough from any previously tagged hotspot point
    function farFromExisting(x, y) {
        for (const key of StoryTags.hotspot) {
            const [sx, sy] = key.split(",").map(Number);
            const d = Math.abs(sx - x) + Math.abs(sy - y); // Manhattan is cheap/sufficient
            if (d < minTrailSeparation) return false;
        }
        return true;
    }

    let trailsMade = 0;
    let totalPoints = 0;
    let attempts = 0;

    while (trailsMade < maxTrails && attempts < 200) {
        attempts++;
        const sx = TerrainBuilder.getRandomNumber(width, "HotspotSeedX");
        const sy = TerrainBuilder.getRandomNumber(height, "HotspotSeedY");
        if (!inBounds(sx, sy)) continue;
        if (!GameplayMap.isWater(sx, sy)) continue;
        if (isAdjacentToLand(sx, sy, minDistFromLand)) continue;
        if (!farFromExisting(sx, sy)) continue;

        // Choose one of 8 compass directions; we’ll allow small bends as we march.
        const dirs = [
            [1, 0],
            [1, 1],
            [0, 1],
            [-1, 1],
            [-1, 0],
            [-1, -1],
            [0, -1],
            [1, -1],
        ];
        let dIndex = TerrainBuilder.getRandomNumber(dirs.length, "HotspotDir");
        let [dx, dy] = dirs[dIndex];

        let x = sx;
        let y = sy;

        let taggedThisTrail = 0;
        for (let s = 0; s < steps; s++) {
            x += dx * stepLen;
            y += dy * stepLen;
            if (!inBounds(x, y)) break;
            if (!GameplayMap.isWater(x, y)) continue;
            if (isAdjacentToLand(x, y, minDistFromLand)) continue;

            StoryTags.hotspot.add(storyKey(x, y));
            taggedThisTrail++;
            totalPoints++;

            // Gentle bend with small probability (creates subtle arcs)
            if (TerrainBuilder.getRandomNumber(5, "HotspotBend") === 0) {
                dIndex =
                    (dIndex +
                        (TerrainBuilder.getRandomNumber(3, "HotspotTurn") - 1) +
                        dirs.length) %
                    dirs.length;
                [dx, dy] = dirs[dIndex];
            }
        }

        if (taggedThisTrail > 0) {
            trailsMade++;
        }
    }

    return { trails: trailsMade, points: totalPoints };
}

/**
 * Tag inland rift valleys as long linear features with narrow shoulder bands.
 * Rifts are later consumed by microclimate and biome nudges (and optional tiny lakes).
 *
 * Rules:
 *  - Avoid very high latitudes and high mountain seeds.
 *  - Prefer long, straight lines with occasional gentle bends.
 *  - Shoulder width is small (typically 1) to keep belts crisp and readable.
 *
 * @param {object} [ctx] - Optional context (unused; present for future parity).
 * @returns {{ rifts:number, lineTiles:number, shoulderTiles:number }} summary counts
 */
export function storyTagRiftValleys(ctx) {
    const width = GameplayMap.getGridWidth();
    const height = GameplayMap.getGridHeight();
    const baseRift = STORY_TUNABLES.rift;
    const areaRift = Math.max(1, width * height);
    const sqrtRift = Math.min(2.0, Math.max(0.6, Math.sqrt(areaRift / 10000)));
    const maxRiftsPerMap = Math.max(
        1,
        Math.round(baseRift.maxRiftsPerMap * (0.8 + 0.6 * sqrtRift)),
    );
    const lineSteps = Math.round(baseRift.lineSteps * (0.9 + 0.4 * sqrtRift));
    const stepLen = baseRift.stepLen;
    const shoulderWidth = baseRift.shoulderWidth + (sqrtRift > 1.5 ? 1 : 0);

    // Two families of headings to get “continental-scale” lines without zig-zag
    const dirsNS = [
        [0, 1],
        [0, -1],
        [1, 1],
        [-1, -1],
    ];
    const dirsEW = [
        [1, 0],
        [-1, 0],
        [1, 1],
        [-1, -1],
    ];

    let riftsMade = 0;
    let lineCount = 0;
    let shoulderCount = 0;
    let tries = 0;

    while (riftsMade < maxRiftsPerMap && tries < 300) {
        tries++;
        const sx = TerrainBuilder.getRandomNumber(width, "RiftSeedX");
        const sy = TerrainBuilder.getRandomNumber(height, "RiftSeedY");
        if (!inBounds(sx, sy)) continue;
        if (GameplayMap.isWater(sx, sy)) continue;

        const plat = Math.abs(GameplayMap.getPlotLatitude(sx, sy));
        if (plat > 70) continue; // avoid extreme polar artifacts

        const elev = GameplayMap.getElevation(sx, sy);
        if (elev > 500) continue; // seed away from high mountains

        // Pick axis family and a particular direction
        const useNS = TerrainBuilder.getRandomNumber(2, "RiftAxis") === 0;
        let dir = useNS
            ? dirsNS[TerrainBuilder.getRandomNumber(dirsNS.length, "RiftDirNS")]
            : dirsEW[
                  TerrainBuilder.getRandomNumber(dirsEW.length, "RiftDirEW")
              ];

        let [dx, dy] = dir;
        let x = sx;
        let y = sy;

        let placedAny = false;
        for (let s = 0; s < lineSteps; s++) {
            x += dx * stepLen;
            y += dy * stepLen;
            if (!inBounds(x, y)) break;
            if (GameplayMap.isWater(x, y)) continue;

            const k = storyKey(x, y);
            if (!StoryTags.riftLine.has(k)) {
                StoryTags.riftLine.add(k);
                lineCount++;
            }
            placedAny = true;

            // Tag shoulder tiles on both sides (perpendicular offset)
            for (let off = 1; off <= shoulderWidth; off++) {
                const px = x + -dy * off;
                const py = y + dx * off;
                const qx = x + dy * off;
                const qy = y + -dx * off;

                if (inBounds(px, py) && !GameplayMap.isWater(px, py)) {
                    const pk = storyKey(px, py);
                    if (!StoryTags.riftShoulder.has(pk)) {
                        StoryTags.riftShoulder.add(pk);
                        shoulderCount++;
                    }
                }
                if (inBounds(qx, qy) && !GameplayMap.isWater(qx, qy)) {
                    const qk = storyKey(qx, qy);
                    if (!StoryTags.riftShoulder.has(qk)) {
                        StoryTags.riftShoulder.add(qk);
                        shoulderCount++;
                    }
                }
            }

            // Occasional, small bend to avoid ruler-straight lines
            if (TerrainBuilder.getRandomNumber(6, "RiftBend") === 0) {
                if (useNS) {
                    dir =
                        dirsNS[
                            TerrainBuilder.getRandomNumber(
                                dirsNS.length,
                                "RiftDirNS2",
                            )
                        ];
                } else {
                    dir =
                        dirsEW[
                            TerrainBuilder.getRandomNumber(
                                dirsEW.length,
                                "RiftDirEW2",
                            )
                        ];
                }
                [dx, dy] = dir;
            }
        }

        if (placedAny) {
            riftsMade++;
        }
    }

    return {
        rifts: riftsMade,
        lineTiles: lineCount,
        shoulderTiles: shoulderCount,
    };
}

export const OrogenyCache = {
    belts: new Set(),
    windward: new Set(),
    lee: new Set(),
};

/**
 * Tag Orogeny belts (mountain corridors) and derive windward/lee flanks.
 * Lightweight heuristic:
 * - Belt tiles: elevation >= 500 (or engine mountain) with ≥2 high-elev neighbors.
 * - Prevailing winds by latitude: 0–30° and 60–90° E→W (dx=-1), 30–60° W→E (dx=1).
 * - Windward = upwind side within radius; Lee = downwind side within radius.
 * Size scaling:
 * - Length threshold (soft) scales with sqrt(area/base); radius +1 on very large maps.
 *
 * Returns simple counts; results stored in OrogenyCache for consumers.
 */
export function storyTagOrogenyBelts(ctx) {
    // Clear previous cache
    OrogenyCache.belts.clear();
    OrogenyCache.windward.clear();
    OrogenyCache.lee.clear();

    const width = GameplayMap.getGridWidth();
    const height = GameplayMap.getGridHeight();

    const area = Math.max(1, width * height);
    const sqrtScale = Math.min(2.0, Math.max(0.6, Math.sqrt(area / 10000)));

    const cfg = STORY_TUNABLES?.orogeny || {};
    const baseRadius = (cfg.radius ?? 2) | 0;
    const radius = baseRadius + (sqrtScale > 1.5 ? 1 : 0);

    const minLenSoft = Math.max(
        10,
        Math.round((cfg.beltMinLength ?? 30) * (0.9 + 0.4 * sqrtScale)),
    );

    // Helper: elevation predicate (prefer GameplayMap.isMountain when exposed)
    function isHighElev(x, y) {
        if (!inBounds(x, y)) return false;
        if (GameplayMap.isMountain && GameplayMap.isMountain(x, y)) return true;
        return GameplayMap.getElevation(x, y) >= 500;
    }

    // Pass 1: collect belt candidates by local mountain density
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (!isHighElev(x, y)) continue;

            // Count high-elevation neighbors (8-neighborhood)
            let hi = 0;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const nx = x + dx,
                        ny = y + dy;
                    if (isHighElev(nx, ny)) hi++;
                }
            }
            if (hi >= 2) {
                OrogenyCache.belts.add(storyKey(x, y));
            }
        }
    }

    // Soft reject trivial belts (very small mountain presence)
    if (OrogenyCache.belts.size < minLenSoft) {
        return { belts: 0, windward: 0, lee: 0 };
    }

    // Prevailing wind vector by latitude (zonal)
    function windDX(x, y) {
        const lat = Math.abs(GameplayMap.getPlotLatitude(x, y));
        return lat < 30 || lat >= 60 ? -1 : 1; // E→W else W→E
    }

    // Pass 2: expand flanks on both sides of each belt tile
    for (const key of OrogenyCache.belts) {
        const [x, y] = key.split(",").map(Number);
        const dx = windDX(x, y);
        const dy = 0;
        const upwindX = -dx,
            upwindY = -dy;
        const downX = dx,
            downY = dy;

        for (let r = 1; r <= radius; r++) {
            const wx = x + upwindX * r,
                wy = y + upwindY * r;
            const lx = x + downX * r,
                ly = y + downY * r;

            if (inBounds(wx, wy) && !GameplayMap.isWater(wx, wy)) {
                OrogenyCache.windward.add(storyKey(wx, wy));
            }
            if (inBounds(lx, ly) && !GameplayMap.isWater(lx, ly)) {
                OrogenyCache.lee.add(storyKey(lx, ly));
            }
        }
    }

    return {
        belts: OrogenyCache.belts.size,
        windward: OrogenyCache.windward.size,
        lee: OrogenyCache.lee.size,
    };
}

export default {
    storyTagHotspotTrails,
    storyTagRiftValleys,
    storyTagOrogenyBelts,
    OrogenyCache,
};
