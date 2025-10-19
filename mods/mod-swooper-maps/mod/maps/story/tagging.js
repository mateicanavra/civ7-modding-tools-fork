// @ts-nocheck
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
 *  - Climate tuning (baseline and refinement) is configured via map_config and consumed in the climate layers; this module only tags, while consumers preserve clamps.
 */
import { StoryTags } from "./tags.js";
import { STORY_TUNABLES, STORY_ENABLE_SWATCHES, STORY_ENABLE_PALEO, MARGINS_CFG, MOISTURE_ADJUSTMENTS, WORLDMODEL_DIRECTIONALITY, } from "../bootstrap/tunables.js";
import { inBounds, storyKey, isAdjacentToLand } from "../core/utils.js";
import { writeClimateField, syncClimateField, ctxRandom } from "../core/types.js";
import { WorldModel } from "../world/model.js";
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
    const maxTrails = Math.max(1, Math.round(baseHot.maxTrails * (0.9 + 0.6 * sqrtHot)));
    const steps = Math.round(baseHot.steps * (0.9 + 0.4 * sqrtHot));
    const stepLen = baseHot.stepLen;
    const minDistFromLand = baseHot.minDistFromLand;
    const minTrailSeparation = baseHot.minTrailSeparation;
    // Helper: ensure a candidate is far enough from any previously tagged hotspot point
    function farFromExisting(x, y) {
        for (const key of StoryTags.hotspot) {
            const [sx, sy] = key.split(",").map(Number);
            const d = Math.abs(sx - x) + Math.abs(sy - y); // Manhattan is cheap/sufficient
            if (d < minTrailSeparation)
                return false;
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
        if (!inBounds(sx, sy))
            continue;
        if (!GameplayMap.isWater(sx, sy))
            continue;
        if (isAdjacentToLand(sx, sy, minDistFromLand))
            continue;
        if (!farFromExisting(sx, sy))
            continue;
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
            if (!inBounds(x, y))
                break;
            if (!GameplayMap.isWater(x, y))
                continue;
            if (isAdjacentToLand(x, y, minDistFromLand))
                continue;
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
 * Tag inland rift valleys using WorldModel.riftPotential where available.
 * Fallback: legacy random-marching rifts when WorldModel is disabled.
 *
 * @param {object} [ctx]
 * @returns {{ rifts:number, lineTiles:number, shoulderTiles:number }}
 */
export function storyTagRiftValleys(ctx) {
    const width = GameplayMap.getGridWidth();
    const height = GameplayMap.getGridHeight();
    const baseRift = STORY_TUNABLES.rift;
    const areaRift = Math.max(1, width * height);
    const sqrtRift = Math.min(2.0, Math.max(0.6, Math.sqrt(areaRift / 10000)));
    const maxRiftsPerMap = Math.max(1, Math.round(baseRift.maxRiftsPerMap * (0.8 + 0.6 * sqrtRift)));
    const lineSteps = Math.round(baseRift.lineSteps * (0.9 + 0.4 * sqrtRift));
    const stepLen = Math.max(1, baseRift.stepLen | 0);
    const shoulderWidth = baseRift.shoulderWidth + (sqrtRift > 1.5 ? 1 : 0);
    const useWM = !!(WorldModel?.isEnabled?.() &&
        WorldModel.riftPotential &&
        WorldModel.boundaryType &&
        WorldModel.boundaryCloseness);
    const idx = (x, y) => y * width + x;
    const inb = (x, y) => x >= 0 && x < width && y >= 0 && y < height;
    const latDegAt = (y) => Math.abs(GameplayMap.getPlotLatitude(0, y));
    if (useWM) {
        const RP = WorldModel.riftPotential;
        const BT = WorldModel.boundaryType; // 1=convergent, 2=divergent
        const BC = WorldModel.boundaryCloseness;
        // 1) Find sparse seeds: local maxima on divergent boundaries over land
        const seeds = [];
        let thr = 192;
        let attempts = 0;
        while (attempts++ < 6) {
            seeds.length = 0;
            for (let y = 1; y < height - 1; y++) {
                if (latDegAt(y) > 70)
                    continue;
                for (let x = 1; x < width - 1; x++) {
                    if (GameplayMap.isWater(x, y))
                        continue;
                    const i = idx(x, y);
                    if (BT[i] !== 2 || BC[i] <= 32 || RP[i] < thr)
                        continue;
                    // Local-maximum test
                    const v = RP[i];
                    let isPeak = true;
                    for (let dy = -1; dy <= 1 && isPeak; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dx === 0 && dy === 0)
                                continue;
                            if (RP[idx(x + dx, y + dy)] > v) {
                                isPeak = false;
                                break;
                            }
                        }
                    }
                    if (isPeak)
                        seeds.push({ x, y, v });
                }
            }
            if (seeds.length >= maxRiftsPerMap * 2 || thr <= 112)
                break;
            thr -= 16;
        }
        seeds.sort((a, b) => b.v - a.v);
        // Space seeds out by Manhattan distance
        const chosen = [];
        const minSeedSep = Math.round(sqrtRift > 1.5 ? 18 : 14);
        for (const s of seeds) {
            if (chosen.length >= maxRiftsPerMap)
                break;
            const farEnough = chosen.every((c) => Math.abs(c.x - s.x) + Math.abs(c.y - s.y) >= minSeedSep);
            if (farEnough)
                chosen.push(s);
        }
        let riftsMade = 0;
        let lineCount = 0;
        let shoulderCount = 0;
        function tagShoulders(x, y, sdx, sdy) {
            for (let off = 1; off <= shoulderWidth; off++) {
                const px = x + -sdy * off;
                const py = y + sdx * off;
                const qx = x + sdy * off;
                const qy = y + -sdx * off;
                if (inb(px, py) && !GameplayMap.isWater(px, py)) {
                    const pk = storyKey(px, py);
                    if (!StoryTags.riftShoulder.has(pk)) {
                        StoryTags.riftShoulder.add(pk);
                        shoulderCount++;
                    }
                }
                if (inb(qx, qy) && !GameplayMap.isWater(qx, qy)) {
                    const qk = storyKey(qx, qy);
                    if (!StoryTags.riftShoulder.has(qk)) {
                        StoryTags.riftShoulder.add(qk);
                        shoulderCount++;
                    }
                }
            }
        }
        for (const seed of chosen) {
            let x = seed.x, y = seed.y;
            if (latDegAt(y) > 70)
                continue;
            // Initialize step direction toward highest neighboring RP
            let sdx = 1, sdy = 0;
            {
                let best = -1, bdx = 1, bdy = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0)
                            continue;
                        const nx = x + dx, ny = y + dy;
                        if (!inb(nx, ny) || GameplayMap.isWater(nx, ny))
                            continue;
                        const p = RP[idx(nx, ny)];
                        if (p > best) {
                            best = p;
                            bdx = dx;
                            bdy = dy;
                        }
                    }
                }
                sdx = bdx;
                sdy = bdy;
            }
            let placedAny = false;
            for (let s = 0; s < lineSteps; s++) {
                if (!inb(x, y) || GameplayMap.isWater(x, y) || latDegAt(y) > 70)
                    break;
                const k = storyKey(x, y);
                if (!StoryTags.riftLine.has(k)) {
                    StoryTags.riftLine.add(k);
                    lineCount++;
                }
                placedAny = true;
                tagShoulders(x, y, sdx, sdy);
                // Helper: directionality bias toward plateAxisDeg (cohesion × riftsFollowPlates)
                function stepDirBias(tx, ty) {
                    try {
                        const DIR = WORLDMODEL_DIRECTIONALITY || {};
                        const coh = Math.max(0, Math.min(1, DIR?.cohesion ?? 0));
                        const follow = Math.max(0, Math.min(1, DIR?.interplay?.riftsFollowPlates ?? 0)) * coh;
                        if (follow <= 0)
                            return 0;
                        const deg = (DIR?.primaryAxes?.plateAxisDeg ?? 0) | 0;
                        const rad = (deg * Math.PI) / 180;
                        const ax = Math.cos(rad);
                        const ay = Math.sin(rad);
                        const vlen = Math.max(1, Math.hypot(tx, ty));
                        const vx = tx / vlen;
                        const vy = ty / vlen;
                        const dot = ax * vx + ay * vy; // -1..1
                        // Scale to a small, safe bonus
                        return Math.round(10 * follow * dot);
                    }
                    catch {
                        return 0;
                    }
                }
                // Choose next step by RP gradient with straightness + directionality preference
                let bestScore = -1, ndx = sdx, ndy = sdy, nx = x, ny = y;
                for (let ty = -1; ty <= 1; ty++) {
                    for (let tx = -1; tx <= 1; tx++) {
                        if (tx === 0 && ty === 0)
                            continue;
                        const cx = x + tx * stepLen, cy = y + ty * stepLen;
                        if (!inb(cx, cy) || GameplayMap.isWater(cx, cy))
                            continue;
                        const p = RP[idx(cx, cy)];
                        const align = tx === sdx && ty === sdy
                            ? 16
                            : tx === -sdx && ty === -sdy
                                ? -12
                                : 0;
                        const score = p + align + stepDirBias(tx, ty);
                        if (score > bestScore) {
                            bestScore = score;
                            ndx = tx;
                            ndy = ty;
                            nx = cx;
                            ny = cy;
                        }
                    }
                }
                // Stop if leaving divergent boundary band or very weak RP
                const ii = inb(nx, ny) ? idx(nx, ny) : -1;
                if (ii < 0 || BT[ii] !== 2 || BC[ii] <= 16 || RP[ii] < 64)
                    break;
                x = nx;
                y = ny;
                sdx = ndx;
                sdy = ndy;
            }
            if (placedAny)
                riftsMade++;
            if (riftsMade >= maxRiftsPerMap)
                break;
        }
        return {
            rifts: riftsMade,
            lineTiles: lineCount,
            shoulderTiles: shoulderCount,
        };
    }
    // Legacy fallback: original random marching implementation
    {
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
            if (!inBounds(sx, sy))
                continue;
            if (GameplayMap.isWater(sx, sy))
                continue;
            const plat = Math.abs(GameplayMap.getPlotLatitude(sx, sy));
            if (plat > 70)
                continue; // avoid extreme polar artifacts
            const elev = GameplayMap.getElevation(sx, sy);
            if (elev > 500)
                continue; // seed away from high mountains
            // Pick axis family and a particular direction
            const useNS = TerrainBuilder.getRandomNumber(2, "RiftAxis") === 0;
            let dir = useNS
                ? dirsNS[TerrainBuilder.getRandomNumber(dirsNS.length, "RiftDirNS")]
                : dirsEW[TerrainBuilder.getRandomNumber(dirsEW.length, "RiftDirEW")];
            let [dx, dy] = dir;
            let x = sx;
            let y = sy;
            let placedAny = false;
            for (let s = 0; s < lineSteps; s++) {
                x += dx * stepLen;
                y += dy * stepLen;
                if (!inBounds(x, y))
                    break;
                if (GameplayMap.isWater(x, y))
                    continue;
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
                            dirsNS[TerrainBuilder.getRandomNumber(dirsNS.length, "RiftDirNS2")];
                    }
                    else {
                        dir =
                            dirsEW[TerrainBuilder.getRandomNumber(dirsEW.length, "RiftDirEW2")];
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
}
export const OrogenyCache = {
    belts: new Set(),
    windward: new Set(),
    lee: new Set(),
};
/**
 * Tag Orogeny belts using WorldModel uplift/tectonic stress near convergent boundaries.
 * Fallback: legacy elevation-density heuristic when WorldModel is disabled.
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
    const minLenSoft = Math.max(10, Math.round((cfg.beltMinLength ?? 30) * (0.9 + 0.4 * sqrtScale)));
    const useWM = !!(WorldModel?.isEnabled?.() &&
        WorldModel.upliftPotential &&
        WorldModel.tectonicStress &&
        WorldModel.boundaryType &&
        WorldModel.boundaryCloseness);
    if (useWM) {
        const U = WorldModel.upliftPotential;
        const S = WorldModel.tectonicStress;
        const BT = WorldModel.boundaryType; // 1=convergent
        const BC = WorldModel.boundaryCloseness;
        // Pass 1: seed belts from convergent boundaries with high uplift/stress combo
        // Combined metric: 0.7*U + 0.3*S; threshold search to keep belts sparse
        let thr = 180;
        let attempts = 0;
        while (attempts++ < 5) {
            OrogenyCache.belts.clear();
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    if (GameplayMap.isWater(x, y))
                        continue;
                    const i = y * width + x;
                    if (BT[i] !== 1 || BC[i] < 48)
                        continue;
                    const metric = Math.round(0.7 * U[i] + 0.3 * S[i]);
                    if (metric >= thr) {
                        // Light neighborhood density check to avoid salt-and-pepper
                        let dense = 0;
                        for (let dy = -1; dy <= 1; dy++) {
                            for (let dx = -1; dx <= 1; dx++) {
                                if (dx === 0 && dy === 0)
                                    continue;
                                const j = (y + dy) * width + (x + dx);
                                if (j >= 0 && j < width * height) {
                                    const m2 = Math.round(0.7 * U[j] + 0.3 * S[j]);
                                    if (m2 >= thr)
                                        dense++;
                                }
                            }
                        }
                        if (dense >= 2) {
                            OrogenyCache.belts.add(`${x},${y}`);
                        }
                    }
                }
            }
            if (OrogenyCache.belts.size >= minLenSoft || thr <= 128)
                break;
            thr -= 12;
        }
        // Soft reject trivial belts
        if (OrogenyCache.belts.size < minLenSoft) {
            return { belts: 0, windward: 0, lee: 0 };
        }
        // Prevailing wind step using WorldModel winds (fallback to zonal if unavailable)
        function windStepXY(x, y) {
            try {
                if (WorldModel?.windU && WorldModel?.windV) {
                    const width = GameplayMap.getGridWidth();
                    const i = y * width + x;
                    const u = WorldModel.windU[i] | 0;
                    const v = WorldModel.windV[i] | 0;
                    if (Math.abs(u) >= Math.abs(v)) {
                        return { dx: u === 0 ? 0 : u > 0 ? 1 : -1, dy: 0 };
                    }
                    else {
                        return { dx: 0, dy: v === 0 ? 0 : v > 0 ? 1 : -1 };
                    }
                }
            }
            catch {
                /* fall back to zonal below */
            }
            const lat = Math.abs(GameplayMap.getPlotLatitude(x, y));
            return { dx: lat < 30 || lat >= 60 ? -1 : 1, dy: 0 };
        }
        // Pass 2: expand flanks on both sides of each belt tile
        for (const key of OrogenyCache.belts) {
            const [sx, sy] = key.split(",").map(Number);
            const { dx, dy } = windStepXY(sx, sy);
            const upwindX = -dx, upwindY = -dy;
            const downX = dx, downY = dy;
            for (let r = 1; r <= radius; r++) {
                const wx = sx + upwindX * r, wy = sy + upwindY * r;
                const lx = sx + downX * r, ly = sy + downY * r;
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
    // Legacy fallback: elevation-density heuristic
    {
        // Helper: elevation predicate (prefer GameplayMap.isMountain when exposed)
        function isHighElev(x, y) {
            if (!inBounds(x, y))
                return false;
            if (GameplayMap.isMountain && GameplayMap.isMountain(x, y))
                return true;
            return GameplayMap.getElevation(x, y) >= 500;
        }
        // Pass 1: collect belt candidates by local mountain density
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (!isHighElev(x, y))
                    continue;
                // Count high-elevation neighbors (8-neighborhood)
                let hi = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0)
                            continue;
                        const nx = x + dx, ny = y + dy;
                        if (isHighElev(nx, ny))
                            hi++;
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
            const upwindX = -dx, upwindY = -dy;
            const downX = dx, downY = dy;
            for (let r = 1; r <= radius; r++) {
                const wx = x + upwindX * r, wy = y + upwindY * r;
                const lx = x + downX * r, ly = y + downY * r;
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
}
/**
 * Tag ACTIVE_MARGIN and PASSIVE_SHELF coast segments.
 * Heuristic (lane-safe, size-aware):
 * - Scan rows to collect contiguous coastal-land segments (cheap linear pass).
 * - Choose sparse, long segments for margins using target fractions and a minimum segment length.
 * - Targets scale gently with map size (sqrt(area/base)).
 * Notes
 * - Works without continent IDs; segments stay local and sparse to avoid noisy toggling.
 * - Consumers (coastlines/islands/features) must preserve minimum sea-lane width.
 */
export function storyTagContinentalMargins() {
    const width = GameplayMap.getGridWidth();
    const height = GameplayMap.getGridHeight();
    // Size-aware fractions (configurable with safe defaults)
    const area = Math.max(1, width * height);
    const sqrt = Math.min(2.0, Math.max(0.6, Math.sqrt(area / 10000)));
    const mcfg = MARGINS_CFG || {};
    const baseActiveFrac = Number.isFinite(mcfg.activeFraction)
        ? mcfg.activeFraction
        : 0.25;
    const basePassiveFrac = Number.isFinite(mcfg.passiveFraction)
        ? mcfg.passiveFraction
        : 0.25;
    const activeFrac = Math.min(0.35, baseActiveFrac + 0.05 * (sqrt - 1));
    const passiveFrac = Math.min(0.35, basePassiveFrac + 0.05 * (sqrt - 1));
    const baseMinSeg = Number.isFinite(mcfg.minSegmentLength)
        ? mcfg.minSegmentLength
        : 12;
    const minSegLen = Math.max(10, Math.round(baseMinSeg * (0.9 + 0.4 * sqrt))); // size-aware minimum
    // First pass: count total coastal land to derive quotas
    let totalCoast = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (GameplayMap.isCoastalLand(x, y))
                totalCoast++;
        }
    }
    const targetActive = Math.floor(totalCoast * activeFrac);
    const targetPassive = Math.floor(totalCoast * passiveFrac);
    let markedActive = 0;
    let markedPassive = 0;
    // Helper to mark a segment safely
    function markSegment(y, x0, x1, active) {
        for (let x = x0; x <= x1; x++) {
            const k = `${x},${y}`;
            if (active) {
                if (markedActive >= targetActive)
                    break;
                if (!StoryTags.activeMargin.has(k) &&
                    GameplayMap.isCoastalLand(x, y)) {
                    StoryTags.activeMargin.add(k);
                    markedActive++;
                }
            }
            else {
                if (markedPassive >= targetPassive)
                    break;
                if (!StoryTags.passiveShelf.has(k) &&
                    GameplayMap.isCoastalLand(x, y)) {
                    StoryTags.passiveShelf.add(k);
                    markedPassive++;
                }
            }
        }
    }
    // Row sweep: build contiguous coastal-land segments and select some
    // Alternate selections to avoid clustering too many active or passive in a row.
    let preferActive = true;
    for (let y = 1; y < height - 1; y++) {
        let x = 1;
        while (x < width - 1) {
            // Find start of a coastal segment
            while (x < width - 1 && !GameplayMap.isCoastalLand(x, y))
                x++;
            if (x >= width - 1)
                break;
            const start = x;
            while (x < width - 1 && GameplayMap.isCoastalLand(x, y))
                x++;
            const end = x - 1;
            const segLen = end - start + 1;
            if (segLen >= minSegLen) {
                // Coin flip with bias toward the currently preferred type
                const roll = TerrainBuilder.getRandomNumber(100, "MarginSelect");
                const pickActive = (preferActive && roll < 60) || (!preferActive && roll < 40);
                if (pickActive && markedActive < targetActive) {
                    markSegment(y, start, end, true);
                }
                else if (markedPassive < targetPassive) {
                    markSegment(y, start, end, false);
                }
                // Alternate preference to reduce long runs of the same type
                preferActive = !preferActive;
            }
        }
        // Reset scanning x for next row
        x = 1;
    }
    return {
        active: markedActive,
        passive: markedPassive,
        targetActive,
        targetPassive,
        minSegLen,
    };
}
// -------------------------------- Climate Swatches --------------------------------
/**
 * storyTagClimateSwatches — Paint one guaranteed macro swatch with soft edges.
 * - Selects one swatch type (weighted) and applies rainfall deltas with gentle falloff.
 * - Uses sqrt(area/base) to scale width/length modestly on large maps.
 * - Keeps all adjustments clamped to [0, 200] and local (single O(W×H) pass).
 *
 * Swatch types (see STORY_TUNABLES.swatches.types):
 *  - macroDesertBelt: subtract rainfall around ~20° lat with soft bleed.
 *  - equatorialRainbelt: add rainfall around 0° lat with generous bleed.
 *  - rainforestArchipelago: add rainfall near warm coasts/islands (tropics).
 *  - mountainForests: add on orogeny windward, subtract a touch on lee.
 *  - greatPlains: lowland mid-lat dry bias (broad plains feel).
 */
export function storyTagClimateSwatches(ctx = null) {
    if (!STORY_ENABLE_SWATCHES)
        return { applied: false, kind: "disabled" };
    const storyMoisture = MOISTURE_ADJUSTMENTS?.story || {};
    const cfg = storyMoisture.swatches;
    if (!cfg)
        return { applied: false, kind: "missing-config" };
    const width = ctx?.dimensions?.width ?? GameplayMap.getGridWidth();
    const height = ctx?.dimensions?.height ?? GameplayMap.getGridHeight();
    const area = Math.max(1, width * height);
    const sqrtScale = Math.min(2.0, Math.max(0.6, Math.sqrt(area / 10000)));
    if (ctx) {
        syncClimateField(ctx);
    }
    const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
    const adapter = ctx?.adapter ?? null;
    const rainfallBuf = ctx?.buffers?.climate?.rainfall || null;
    const idx = (x, y) => y * width + x;
    const inLocalBounds = (x, y) => x >= 0 && x < width && y >= 0 && y < height;
    const readRainfall = (x, y) => {
        if (ctx && rainfallBuf) {
            return rainfallBuf[idx(x, y)] | 0;
        }
        return GameplayMap.getRainfall(x, y);
    };
    const writeRainfall = (x, y, rf) => {
        const clamped = clamp(rf, 0, 200);
        if (ctx) {
            writeClimateField(ctx, x, y, { rainfall: clamped });
        }
        else {
            TerrainBuilder.setRainfall(x, y, clamped);
        }
    };
    const rand = (max, label) => (ctx ? ctxRandom(ctx, label, max) : TerrainBuilder.getRandomNumber(max, label));
    const isWater = (x, y) => (adapter?.isWater ? adapter.isWater(x, y) : GameplayMap.isWater(x, y));
    const getElevation = (x, y) => (adapter?.getElevation ? adapter.getElevation(x, y) : GameplayMap.getElevation(x, y));
    const signedLatitudeAt = (y) => (adapter?.getLatitude ? adapter.getLatitude(0, y) : GameplayMap.getPlotLatitude(0, y));
    const isCoastalLand = (x, y) => {
        if (adapter?.isCoastalLand)
            return adapter.isCoastalLand(x, y);
        if (typeof GameplayMap?.isCoastalLand === "function")
            return GameplayMap.isCoastalLand(x, y);
        if (isWater(x, y))
            return false;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0)
                    continue;
                const nx = x + dx;
                const ny = y + dy;
                if (!inLocalBounds(nx, ny))
                    continue;
                if (isWater(nx, ny))
                    return true;
            }
        }
        return false;
    };
    const isAdjacentToShallowWater = (x, y) => {
        if (adapter?.isAdjacentToShallowWater)
            return adapter.isAdjacentToShallowWater(x, y);
        if (typeof GameplayMap?.isAdjacentToShallowWater === "function")
            return GameplayMap.isAdjacentToShallowWater(x, y);
        return false;
    };
    const types = cfg.types || {};
    let entries = Object.keys(types).map((k) => ({
        key: k,
        w: Math.max(0, types[k].weight | 0),
    }));
    try {
        const DIR = WORLDMODEL_DIRECTIONALITY || {};
        const COH = Math.max(0, Math.min(1, DIR?.cohesion ?? 0));
        if (COH > 0) {
            const windDeg = (DIR?.primaryAxes?.windBiasDeg ?? 0) | 0;
            const plateDeg = (DIR?.primaryAxes?.plateAxisDeg ?? 0) | 0;
            const wRad = (windDeg * Math.PI) / 180;
            const pRad = (plateDeg * Math.PI) / 180;
            const alignZonal = Math.abs(Math.cos(wRad));
            const alignPlate = Math.abs(Math.cos(pRad));
            entries = entries.map((e) => {
                let mul = 1;
                if (e.key === "macroDesertBelt") {
                    mul *= 1 + 0.4 * COH * alignZonal;
                }
                else if (e.key === "equatorialRainbelt") {
                    mul *= 1 + 0.25 * COH * alignZonal;
                }
                else if (e.key === "mountainForests") {
                    mul *= 1 + 0.2 * COH * alignPlate;
                }
                else if (e.key === "greatPlains") {
                    mul *= 1 + 0.2 * COH * alignZonal;
                }
                return { key: e.key, w: Math.max(0, Math.round(e.w * mul)) };
            });
        }
    }
    catch (_) {
        /* keep default weights on any error */
    }
    const totalW = entries.reduce((s, e) => s + e.w, 0) || 1;
    let roll = rand(totalW, "SwatchType");
    let chosenKey = entries[0]?.key || "macroDesertBelt";
    for (const e of entries) {
        if (roll < e.w) {
            chosenKey = e.key;
            break;
        }
        roll -= e.w;
    }
    const kind = chosenKey;
    const t = types[chosenKey] || {};
    const widthMul = 1 + (cfg.sizeScaling?.widthMulSqrt || 0) * (sqrtScale - 1);
    const latBandCenter = () => t.latitudeCenterDeg ?? 0;
    const halfWidthDeg = () => Math.max(4, Math.round((t.halfWidthDeg ?? 10) * widthMul));
    const falloff = (v, r) => Math.max(0, 1 - v / Math.max(1, r));
    let applied = 0;
    for (let y = 0; y < height; y++) {
        const latDegAbs = Math.abs(signedLatitudeAt(y));
        for (let x = 0; x < width; x++) {
            if (isWater(x, y))
                continue;
            let rf = readRainfall(x, y);
            const elev = getElevation(x, y);
            let tileAdjusted = false;
            if (kind === "macroDesertBelt") {
                const center = latBandCenter();
                const hw = halfWidthDeg();
                const f = falloff(Math.abs(latDegAbs - center), hw);
                if (f > 0) {
                    const base = t.drynessDelta ?? 28;
                    const lowlandBonus = elev < 250 ? 4 : 0;
                    const delta = Math.round((base + lowlandBonus) * f);
                    rf = clamp(rf - delta, 0, 200);
                    applied++;
                    tileAdjusted = true;
                }
            }
            else if (kind === "equatorialRainbelt") {
                const center = latBandCenter();
                const hw = halfWidthDeg();
                const f = falloff(Math.abs(latDegAbs - center), hw);
                if (f > 0) {
                    const base = t.wetnessDelta ?? 24;
                    let coastBoost = 0;
                    if (isCoastalLand(x, y))
                        coastBoost += 6;
                    if (isAdjacentToShallowWater(x, y))
                        coastBoost += 4;
                    const delta = Math.round((base + coastBoost) * f);
                    rf = clamp(rf + delta, 0, 200);
                    applied++;
                    tileAdjusted = true;
                }
            }
            else if (kind === "rainforestArchipelago") {
                const fTropics = latDegAbs < 23 ? 1 : latDegAbs < 30 ? 0.5 : 0;
                if (fTropics > 0) {
                    let islandy = 0;
                    if (isCoastalLand(x, y))
                        islandy += 1;
                    if (isAdjacentToShallowWater(x, y))
                        islandy += 0.5;
                    if (islandy > 0) {
                        const base = t.wetnessDelta ?? 18;
                        const delta = Math.round(base * fTropics * islandy);
                        rf = clamp(rf + delta, 0, 200);
                        applied++;
                        tileAdjusted = true;
                    }
                }
            }
            else if (kind === "mountainForests") {
                const inWindward = !!(typeof OrogenyCache === "object" && OrogenyCache.windward?.has?.(`${x},${y}`));
                const inLee = !!(typeof OrogenyCache === "object" && OrogenyCache.lee?.has?.(`${x},${y}`));
                if (inWindward) {
                    const base = t.windwardBonus ?? 6;
                    const delta = base + (elev < 300 ? 2 : 0);
                    rf = clamp(rf + delta, 0, 200);
                    applied++;
                    tileAdjusted = true;
                }
                else if (inLee) {
                    const base = t.leePenalty ?? 2;
                    rf = clamp(rf - base, 0, 200);
                    applied++;
                    tileAdjusted = true;
                }
            }
            else if (kind === "greatPlains") {
                const center = t.latitudeCenterDeg ?? 45;
                const hw = Math.max(6, Math.round((t.halfWidthDeg ?? 8) * widthMul));
                const f = falloff(Math.abs(latDegAbs - center), hw);
                if (f > 0 && elev <= (t.lowlandMaxElevation ?? 300)) {
                    const dry = t.dryDelta ?? 12;
                    const delta = Math.round(dry * f);
                    rf = clamp(rf - delta, 0, 200);
                    applied++;
                    tileAdjusted = true;
                }
            }
            if (tileAdjusted) {
                writeRainfall(x, y, rf);
            }
        }
    }
    try {
        const DIR = WORLDMODEL_DIRECTIONALITY || {};
        const monsoonBias = Math.max(0, Math.min(1, DIR?.hemispheres?.monsoonBias ?? 0));
        const COH = Math.max(0, Math.min(1, DIR?.cohesion ?? 0));
        const eqBand = Math.max(0, (DIR?.hemispheres?.equatorBandDeg ?? 12) | 0);
        if (monsoonBias > 0 && COH > 0 && WorldModel?.isEnabled?.() && WorldModel.windU && WorldModel.windV) {
            const baseDelta = Math.max(1, Math.round(3 * COH * monsoonBias));
            for (let y = 0; y < height; y++) {
                const latSigned = signedLatitudeAt(y);
                const absLat = Math.abs(latSigned);
                if (absLat > eqBand + 18)
                    continue;
                for (let x = 0; x < width; x++) {
                    if (isWater(x, y))
                        continue;
                    if (!isCoastalLand(x, y) && !isAdjacentToShallowWater(x, y))
                        continue;
                    const i = idx(x, y);
                    const u = WorldModel.windU[i] | 0;
                    const v = WorldModel.windV[i] | 0;
                    let ux = 0, vy = 0;
                    if (Math.abs(u) >= Math.abs(v)) {
                        ux = u === 0 ? 0 : u > 0 ? 1 : -1;
                        vy = 0;
                    }
                    else {
                        ux = 0;
                        vy = v === 0 ? 0 : v > 0 ? 1 : -1;
                    }
                    const dnX = x - ux;
                    const dnY = y - vy;
                    if (!inLocalBounds(dnX, dnY))
                        continue;
                    let rf = readRainfall(x, y);
                    let baseDeltaAdj = baseDelta;
                    if (absLat <= eqBand)
                        baseDeltaAdj += 2;
                    if (isWater(dnX, dnY))
                        baseDeltaAdj += 2;
                    rf = clamp(rf + baseDeltaAdj, 0, 200);
                    writeRainfall(x, y, rf);
                    const upX = x + ux;
                    const upY = y + vy;
                    if (inLocalBounds(upX, upY) && isWater(dnX, dnY)) {
                        const rf0 = readRainfall(x, y);
                        const rf1 = Math.max(0, Math.min(200, rf0 - 1));
                        writeRainfall(x, y, rf1);
                    }
                }
            }
        }
    }
    catch (_) {
        /* keep resilient */
    }
    let _swatchResult = { applied: applied > 0, kind, tiles: applied };
    if (STORY_ENABLE_PALEO) {
        try {
            const paleoResult = storyTagPaleoHydrology(ctx || undefined);
            _swatchResult.paleo = paleoResult;
        }
        catch (_) {
            /* keep generation resilient */
        }
    }
    return _swatchResult;
}
// -------------------------------- Paleo‑Hydrology --------------------------------
/**
 * storyTagPaleoHydrology — elevation‑aware paleo motifs:
 *  - Deltas: slight humidity fans near river mouths (lowland, coastal).
 *  - Oxbows: a handful of lowland river‑adjacent wet pockets (no rivers added).
 *  - Fossil channels: short polylines across dry lowlands toward local basins.
 * Elevation cues:
 *  - Canyon/bed dryness on the fossil centerline (small).
 *  - Optional bluff/rim hint via minor adjustments on immediate flanks.
 * Invariants:
 *  - All rainfall ops clamped [0, 200]. No broad flood‑fills. Strict caps.
 */
export function storyTagPaleoHydrology(ctx = null) {
    const storyMoisture = MOISTURE_ADJUSTMENTS?.story || {};
    const cfg = storyMoisture.paleo;
    if (!cfg)
        return { deltas: 0, oxbows: 0, fossils: 0 };
    const width = ctx?.dimensions?.width ?? GameplayMap.getGridWidth();
    const height = ctx?.dimensions?.height ?? GameplayMap.getGridHeight();
    const area = Math.max(1, width * height);
    const sqrtScale = Math.min(2.0, Math.max(0.6, Math.sqrt(area / 10000)));
    if (ctx) {
        syncClimateField(ctx);
    }
    const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
    const nearStartGuard = ( /*x,y*/) => true;
    const rand = (n, lbl) => (ctx ? ctxRandom(ctx, lbl || 'Paleo', n) : TerrainBuilder.getRandomNumber(n, lbl || 'Paleo'));
    const adapter = ctx?.adapter ?? null;
    const rainfallBuf = ctx?.buffers?.climate?.rainfall || null;
    const idx = (x, y) => y * width + x;
    const readRainfall = (x, y) => {
        if (ctx && rainfallBuf) {
            return rainfallBuf[idx(x, y)] | 0;
        }
        return GameplayMap.getRainfall(x, y);
    };
    const writeRainfall = (x, y, rf) => {
        const clamped = clamp(rf, 0, 200);
        if (ctx) {
            writeClimateField(ctx, x, y, { rainfall: clamped });
        }
        else {
            TerrainBuilder.setRainfall(x, y, clamped);
        }
    };
    let deltas = 0, oxbows = 0, fossils = 0;
    if (cfg.maxDeltas > 0) {
        for (let y = 1; y < height - 1 && deltas < cfg.maxDeltas; y++) {
            for (let x = 1; x < width - 1 && deltas < cfg.maxDeltas; x++) {
                if (!(adapter?.isCoastalLand ? adapter.isCoastalLand(x, y) : GameplayMap.isCoastalLand(x, y)))
                    continue;
                if (!(adapter?.isAdjacentToRivers ? adapter.isAdjacentToRivers(x, y, 1) : GameplayMap.isAdjacentToRivers(x, y, 1)))
                    continue;
                if ((adapter?.getElevation ? adapter.getElevation(x, y) : GameplayMap.getElevation(x, y)) > 300)
                    continue;
                const fanR = Math.max(0, cfg.deltaFanRadius | 0);
                for (let dy = -fanR; dy <= fanR; dy++) {
                    for (let dx = -fanR; dx <= fanR; dx++) {
                        const nx = x + dx, ny = y + dy;
                        if (!inBounds(nx, ny))
                            continue;
                        if (adapter?.isWater ? adapter.isWater(nx, ny) : GameplayMap.isWater(nx, ny))
                            continue;
                        let rf = readRainfall(nx, ny);
                        if (rand(100, 'DeltaMarsh') < Math.round((cfg.deltaMarshChance || 0.35) * 100)) {
                            rf = clamp(rf + 6, 0, 200);
                        }
                        else {
                            rf = clamp(rf + 3, 0, 200);
                        }
                        writeRainfall(nx, ny, rf);
                    }
                }
                deltas++;
            }
        }
    }
    if (cfg.maxOxbows > 0) {
        let attempts = 0;
        while (oxbows < cfg.maxOxbows && attempts < 300) {
            attempts++;
            const x = rand(width, 'OxbowX');
            const y = rand(height, 'OxbowY');
            if (!inBounds(x, y))
                continue;
            if (adapter?.isWater ? adapter.isWater(x, y) : GameplayMap.isWater(x, y))
                continue;
            const elev = adapter?.getElevation ? adapter.getElevation(x, y) : GameplayMap.getElevation(x, y);
            if (elev > (cfg.oxbowElevationMax ?? 280))
                continue;
            if (!(adapter?.isAdjacentToRivers ? adapter.isAdjacentToRivers(x, y, 1) : GameplayMap.isAdjacentToRivers(x, y, 1)))
                continue;
            if (!nearStartGuard(x, y))
                continue;
            let rf = readRainfall(x, y);
            writeRainfall(x, y, rf + 8);
            oxbows++;
        }
    }
    if (cfg.maxFossilChannels > 0) {
        const baseLen = Math.max(6, cfg.fossilChannelLengthTiles | 0);
        const step = Math.max(1, cfg.fossilChannelStep | 0);
        const len = Math.round(baseLen * (1 + (cfg.sizeScaling?.lengthMulSqrt || 0) * (sqrtScale - 1)));
        const hum = cfg.fossilChannelHumidity | 0;
        const minDistFromRivers = Math.max(0, cfg.fossilChannelMinDistanceFromCurrentRivers | 0);
        const canyonCfg = cfg.elevationCarving || {};
        const rimW = Math.max(0, canyonCfg.rimWidth | 0);
        const canyonDryBonus = Math.max(0, canyonCfg.canyonDryBonus | 0);
        let tries = 0;
        while (fossils < cfg.maxFossilChannels && tries < 120) {
            tries++;
            let sx = rand(width, 'FossilX');
            let sy = rand(height, 'FossilY');
            if (!inBounds(sx, sy))
                continue;
            if (adapter?.isWater ? adapter.isWater(sx, sy) : GameplayMap.isWater(sx, sy))
                continue;
            const startElev = adapter?.getElevation ? adapter.getElevation(sx, sy) : GameplayMap.getElevation(sx, sy);
            if (startElev > 320)
                continue;
            if ((adapter?.isAdjacentToRivers ? adapter.isAdjacentToRivers(sx, sy, minDistFromRivers) : GameplayMap.isAdjacentToRivers(sx, sy, minDistFromRivers)))
                continue;
            let x = sx, y = sy;
            let used = 0;
            while (used < len) {
                if (inBounds(x, y) && !(adapter?.isWater ? adapter.isWater(x, y) : GameplayMap.isWater(x, y))) {
                    let rf = readRainfall(x, y);
                    rf = clamp(rf + hum, 0, 200);
                    if ((canyonCfg.enableCanyonRim ?? true) && canyonDryBonus > 0) {
                        rf = clamp(rf - canyonDryBonus, 0, 200);
                    }
                    writeRainfall(x, y, rf);
                    if ((canyonCfg.enableCanyonRim ?? true) && rimW > 0) {
                        for (let ry = -rimW; ry <= rimW; ry++) {
                            for (let rx = -rimW; rx <= rimW; rx++) {
                                if (rx === 0 && ry === 0)
                                    continue;
                                const nx = x + rx, ny = y + ry;
                                if (!inBounds(nx, ny) || (adapter?.isWater ? adapter.isWater(nx, ny) : GameplayMap.isWater(nx, ny)))
                                    continue;
                                const e0 = adapter?.getElevation ? adapter.getElevation(x, y) : GameplayMap.getElevation(x, y);
                                const e1 = adapter?.getElevation ? adapter.getElevation(nx, ny) : GameplayMap.getElevation(nx, ny);
                                if (e1 > e0 + 15) {
                                    const rfn = clamp(readRainfall(nx, ny) - (cfg.bluffWetReduction ?? 0), 0, 200);
                                    writeRainfall(nx, ny, rfn);
                                }
                            }
                        }
                    }
                }
                let bestNX = x, bestNY = y, bestElev = adapter?.getElevation ? adapter.getElevation(x, y) : GameplayMap.getElevation(x, y);
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0)
                            continue;
                        if ((dx !== 0 || dy !== 0) && (Math.abs(dx) + Math.abs(dy)) * step > 2)
                            continue;
                        const nx = x + dx;
                        const ny = y + dy;
                        if (!inBounds(nx, ny))
                            continue;
                        const elev = adapter?.getElevation ? adapter.getElevation(nx, ny) : GameplayMap.getElevation(nx, ny);
                        if (elev < bestElev) {
                            bestElev = elev;
                            bestNX = nx;
                            bestNY = ny;
                        }
                    }
                }
                if (bestNX === x && bestNY === y)
                    break;
                x = bestNX;
                y = bestNY;
                used += step;
            }
            if (used >= len)
                fossils++;
        }
    }
    return { deltas, oxbows, fossils };
}

export default {
    storyTagHotspotTrails,
    storyTagRiftValleys,
    storyTagOrogenyBelts,
    storyTagContinentalMargins,
    storyTagClimateSwatches,
    storyTagPaleoHydrology,
    OrogenyCache,
};
