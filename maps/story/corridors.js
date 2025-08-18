/**
 * Strategic Corridors — lightweight, gameplay‑focused path tagging
 *
 * Tags sparse “corridors” that other layers respect to preserve or emphasize
 * traversal routes:
 *  - Sea lanes: long open water lanes across the map (don’t obstruct with coasts/islands)
 *  - Island‑hop lanes: promote hotspot trails as navigable arcs (avoid clutter)
 *  - Land open corridors: long rift‑shoulder runs get gentle grassland bias
 *  - River chains: post‑rivers, lowland river‑adjacent cross‑continent paths
 *
 * Invariants and constraints:
 *  - Pure tagging; no heavy flood fills. All passes are O(width × height) with small constants.
 *  - Consumers must remain lane‑safe: do not create chokepoints or dense clutter.
 *  - Does not modify rainfall or terrain here; those effects belong to other layers.
 */

import { StoryTags } from "./tags.js";
import { inBounds, storyKey } from "../core/utils.js";
import { STORY_ENABLE_CORRIDORS, CORRIDORS_CFG } from "../config/tunables.js";
import { devLogIf } from "../config/dev.js";

/**
 * Safe random helper (engine provided).
 * @param {number} n
 * @param {string} label
 * @returns {number}
 */
function rand(n, label) {
    return TerrainBuilder.getRandomNumber(Math.max(1, n | 0), label || "Corr");
}

/**
 * Compute the longest contiguous run of water along a fixed column x.
 * @param {number} x
 * @param {number} height
 * @returns {{start:number,end:number,len:number}}
 */
function longestWaterRunColumn(x, height) {
    let bestStart = -1,
        bestEnd = -1,
        bestLen = 0;
    let curStart = -1,
        curLen = 0;
    for (let y = 0; y < height; y++) {
        if (GameplayMap.isWater(x, y)) {
            if (curLen === 0) curStart = y;
            curLen++;
            if (curLen > bestLen) {
                bestLen = curLen;
                bestStart = curStart;
                bestEnd = y;
            }
        } else {
            curLen = 0;
        }
    }
    return { start: bestStart, end: bestEnd, len: bestLen };
}

/**
 * Compute the longest contiguous run of water along a fixed row y.
 * @param {number} y
 * @param {number} width
 * @returns {{start:number,end:number,len:number}}
 */
function longestWaterRunRow(y, width) {
    let bestStart = -1,
        bestEnd = -1,
        bestLen = 0;
    let curStart = -1,
        curLen = 0;
    for (let x = 0; x < width; x++) {
        if (GameplayMap.isWater(x, y)) {
            if (curLen === 0) curStart = x;
            curLen++;
            if (curLen > bestLen) {
                bestLen = curLen;
                bestStart = curStart;
                bestEnd = x;
            }
        } else {
            curLen = 0;
        }
    }
    return { start: bestStart, end: bestEnd, len: bestLen };
}

/**
 * Tag long open water “sea lanes” across the map.
 * We prefer a handful of long, straight segments (columns/rows) that clear a large span.
 */
function tagSeaLanes() {
    const cfg = (CORRIDORS_CFG && CORRIDORS_CFG.sea) || {};
    const width = GameplayMap.getGridWidth();
    const height = GameplayMap.getGridHeight();
    const maxLanes = Math.max(0, (cfg.maxLanes ?? 3) | 0);
    const stride = Math.max(2, (cfg.scanStride ?? 6) | 0);
    const minLenFrac = Math.min(1, Math.max(0.4, cfg.minLengthFrac ?? 0.7));
    const preferDiagonals = !!cfg.preferDiagonals;
    const laneSpacing = Math.max(0, (cfg.laneSpacing ?? 6) | 0);
    const requiredMinWidth = Math.max(1, (cfg.minChannelWidth ?? 3) | 0);

    // Helper: check perpendicular water width around (x,y) for given orientation
    // Orient: 'col' (vertical), 'row' (horizontal), 'diagNE' (x+y const), 'diagNW' (x-y const)
    function hasPerpWidth(x, y, orient, minWidth) {
        const r = Math.floor((minWidth - 1) / 2);
        if (r <= 0) return GameplayMap.isWater(x, y);
        if (!GameplayMap.isWater(x, y)) return false;

        // Check along perpendicular line
        if (orient === "col") {
            // Perpendicular to vertical is horizontal — vary dx, fixed y
            for (let dx = -r; dx <= r; dx++) {
                const nx = x + dx;
                if (nx < 0 || nx >= width) return false;
                if (!GameplayMap.isWater(nx, y)) return false;
            }
            return true;
        } else if (orient === "row") {
            // Perpendicular to horizontal is vertical — vary dy, fixed x
            for (let dy = -r; dy <= r; dy++) {
                const ny = y + dy;
                if (ny < 0 || ny >= height) return false;
                if (!GameplayMap.isWater(x, ny)) return false;
            }
            return true;
        } else if (orient === "diagNE") {
            // Lane along NE-SW (x+y = const); perpendicular is NW-SE (x+=t, y+=t)
            for (let t = -r; t <= r; t++) {
                const nx = x + t,
                    ny = y + t;
                if (nx < 0 || nx >= width || ny < 0 || ny >= height)
                    return false;
                if (!GameplayMap.isWater(nx, ny)) return false;
            }
            return true;
        } else if (orient === "diagNW") {
            // Lane along NW-SE (x-y = const); perpendicular is NE-SW (x+=t, y-=t)
            for (let t = -r; t <= r; t++) {
                const nx = x + t,
                    ny = y - t;
                if (nx < 0 || nx >= width || ny < 0 || ny >= height)
                    return false;
                if (!GameplayMap.isWater(nx, ny)) return false;
            }
            return true;
        }
        return false;
    }

    // Helpers for diagonals
    function longestWaterRunDiagSum(k) {
        // NE-SW family: x+y = k
        const xs = Math.max(0, k - (height - 1));
        const xe = Math.min(width - 1, k);
        let bestStartX = -1,
            bestEndX = -1,
            bestLen = 0;
        let curStartX = -1,
            curLen = 0;
        for (let x = xs; x <= xe; x++) {
            const y = k - x;
            if (GameplayMap.isWater(x, y)) {
                if (curLen === 0) curStartX = x;
                curLen++;
                if (curLen > bestLen) {
                    bestLen = curLen;
                    bestStartX = curStartX;
                    bestEndX = x;
                }
            } else {
                curLen = 0;
            }
        }
        return {
            xs,
            xe,
            startX: bestStartX,
            endX: bestEndX,
            len: bestLen,
            axisLen: xe - xs + 1,
        };
    }

    function longestWaterRunDiagDiff(d) {
        // NW-SE family: x - y = d
        const ys = Math.max(0, -d);
        const ye = Math.min(height - 1, width - 1 - d);
        let bestStartY = -1,
            bestEndY = -1,
            bestLen = 0;
        let curStartY = -1,
            curLen = 0;
        for (let y = ys; y <= ye; y++) {
            const x = d + y;
            if (GameplayMap.isWater(x, y)) {
                if (curLen === 0) curStartY = y;
                curLen++;
                if (curLen > bestLen) {
                    bestLen = curLen;
                    bestStartY = curStartY;
                    bestEndY = y;
                }
            } else {
                curLen = 0;
            }
        }
        return {
            ys,
            ye,
            startY: bestStartY,
            endY: bestEndY,
            len: bestLen,
            axisLen: ye - ys + 1,
        };
    }

    // Build candidates with simple scores and spacing metadata
    /** @type {Array<{orient:'col'|'row'|'diagNE'|'diagNW', index:number, start:number, end:number, len:number, minWidth:number, score:number}>} */
    const candidates = [];

    // Columns
    const minCol = Math.floor(height * minLenFrac);
    for (let x = 1; x < width - 1; x += stride) {
        const run = longestWaterRunColumn(x, height);
        if (run.len >= minCol) {
            // Sample perpendicular width at a few points
            const step = Math.max(1, Math.floor(run.len / 10));
            let ok = true;
            for (let y = run.start; y <= run.end; y += step) {
                if (!hasPerpWidth(x, y, "col", requiredMinWidth)) {
                    ok = false;
                    break;
                }
            }
            const minW = ok ? requiredMinWidth : 1;
            const coverage = run.len / height;
            const score = run.len + 3 * minW + Math.round(coverage * 10);
            candidates.push({
                orient: "col",
                index: x,
                start: run.start,
                end: run.end,
                len: run.len,
                minWidth: minW,
                score,
            });
        }
    }

    // Rows
    const minRow = Math.floor(width * minLenFrac);
    for (let y = 1; y < height - 1; y += stride) {
        const run = longestWaterRunRow(y, width);
        if (run.len >= minRow) {
            const step = Math.max(1, Math.floor(run.len / 10));
            let ok = true;
            for (let x = run.start; x <= run.end; x += step) {
                if (!hasPerpWidth(x, y, "row", requiredMinWidth)) {
                    ok = false;
                    break;
                }
            }
            const minW = ok ? requiredMinWidth : 1;
            const coverage = run.len / width;
            const score = run.len + 3 * minW + Math.round(coverage * 10);
            candidates.push({
                orient: "row",
                index: y,
                start: run.start,
                end: run.end,
                len: run.len,
                minWidth: minW,
                score,
            });
        }
    }

    // Diagonals (optional)
    if (preferDiagonals) {
        // NE-SW: k = x+y in [0, width-1+height-1]
        const kMax = width - 1 + (height - 1);
        for (let k = 0; k <= kMax; k += Math.max(2, stride)) {
            const run = longestWaterRunDiagSum(k);
            const minDiag = Math.floor(run.axisLen * minLenFrac);
            if (run.len >= minDiag && run.startX !== -1) {
                const step = Math.max(1, Math.floor(run.len / 10));
                let ok = true;
                for (let x = run.startX; x <= run.endX; x += step) {
                    const y = k - x;
                    if (!hasPerpWidth(x, y, "diagNE", requiredMinWidth)) {
                        ok = false;
                        break;
                    }
                }
                const minW = ok ? requiredMinWidth : 1;
                const coverage = run.len / run.axisLen;
                const score = run.len + 2 * minW + Math.round(coverage * 10);
                candidates.push({
                    orient: "diagNE",
                    index: k,
                    start: run.startX,
                    end: run.endX,
                    len: run.len,
                    minWidth: minW,
                    score,
                });
            }
        }

        // NW-SE: d = x - y in [-(height-1)..(width-1)]
        const dMin = -(height - 1);
        const dMax = width - 1;
        for (let d = dMin; d <= dMax; d += Math.max(2, stride)) {
            const run = longestWaterRunDiagDiff(d);
            const minDiag = Math.floor(run.axisLen * minLenFrac);
            if (run.len >= minDiag && run.startY !== -1) {
                const step = Math.max(1, Math.floor(run.len / 10));
                let ok = true;
                for (let y = run.startY; y <= run.endY; y += step) {
                    const x = d + y;
                    if (!hasPerpWidth(x, y, "diagNW", requiredMinWidth)) {
                        ok = false;
                        break;
                    }
                }
                const minW = ok ? requiredMinWidth : 1;
                const coverage = run.len / run.axisLen;
                const score = run.len + 2 * minW + Math.round(coverage * 10);
                candidates.push({
                    orient: "diagNW",
                    index: d,
                    start: run.startY,
                    end: run.endY,
                    len: run.len,
                    minWidth: minW,
                    score,
                });
            }
        }
    }

    // Select top-K by score while enforcing spacing within the same orientation family
    candidates.sort((a, b) => b.score - a.score);
    /** @type {{col:number[],row:number[],diagNE:number[],diagNW:number[]}} */
    const chosenIdx = { col: [], row: [], diagNE: [], diagNW: [] };
    let lanes = 0;

    function spaced(orient, index) {
        const arr = chosenIdx[orient];
        for (let i = 0; i < arr.length; i++) {
            if (Math.abs(arr[i] - index) < laneSpacing) return false;
        }
        return true;
    }

    for (const c of candidates) {
        if (lanes >= maxLanes) break;
        if (!spaced(c.orient, c.index)) continue;
        chosenIdx[c.orient].push(c.index);

        // Tag tiles for this lane
        if (c.orient === "col") {
            const x = c.index;
            for (let y = c.start; y <= c.end; y++) {
                if (GameplayMap.isWater(x, y)) {
                    StoryTags.corridorSeaLane.add(storyKey(x, y));
                }
            }
        } else if (c.orient === "row") {
            const y = c.index;
            for (let x = c.start; x <= c.end; x++) {
                if (GameplayMap.isWater(x, y)) {
                    StoryTags.corridorSeaLane.add(storyKey(x, y));
                }
            }
        } else if (c.orient === "diagNE") {
            const k = c.index;
            for (let x = c.start; x <= c.end; x++) {
                const y = k - x;
                if (
                    x >= 0 &&
                    x < width &&
                    y >= 0 &&
                    y < height &&
                    GameplayMap.isWater(x, y)
                ) {
                    StoryTags.corridorSeaLane.add(storyKey(x, y));
                }
            }
        } else if (c.orient === "diagNW") {
            const d = c.index;
            for (let y = c.start; y <= c.end; y++) {
                const x = d + y;
                if (
                    x >= 0 &&
                    x < width &&
                    y >= 0 &&
                    y < height &&
                    GameplayMap.isWater(x, y)
                ) {
                    StoryTags.corridorSeaLane.add(storyKey(x, y));
                }
            }
        }

        lanes++;
    }

    // Log a compact summary of selected sea lanes
    devLogIf &&
        devLogIf(
            "LOG_STORY_TAGS",
            `[Corridors] Sea lanes selected: ${lanes} (col:${chosenIdx.col.length}, row:${chosenIdx.row.length}, diagNE:${chosenIdx.diagNE.length}, diagNW:${chosenIdx.diagNW.length}); tiles=${StoryTags.corridorSeaLane.size}`,
        );
}

/**
 * Promote hotspot trail points to “island‑hop” lanes (avoid clutter, just tag proximity).
 * We select up to N arcs from existing StoryTags.hotspot points.
 */
function tagIslandHopFromHotspots() {
    const cfg = (CORRIDORS_CFG && CORRIDORS_CFG.islandHop) || {};
    if (!cfg.useHotspots) return;
    const maxArcs = Math.max(0, (cfg.maxArcs ?? 2) | 0);
    if (maxArcs === 0) return;

    const width = GameplayMap.getGridWidth();
    const height = GameplayMap.getGridHeight();

    // Gather hotspot keys for indexed access
    const keys = Array.from(StoryTags.hotspot);
    if (!keys.length) return;

    // Randomly sample up to maxArcs seeds from the hotspot set
    const picked = new Set();
    let arcs = 0,
        attempts = 0;
    while (arcs < maxArcs && attempts < 100 && attempts < keys.length * 2) {
        attempts++;
        const idx = rand(keys.length, "IslandHopPick");
        const key = keys[idx % keys.length];
        if (picked.has(key)) continue;
        picked.add(key);
        arcs++;

        // Tag the seed and a tight neighborhood to “promote” the trail locally
        const [sx, sy] = key.split(",").map(Number);
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const nx = sx + dx,
                    ny = sy + dy;
                if (!inBounds(nx, ny)) continue;
                if (!GameplayMap.isWater(nx, ny)) continue;
                StoryTags.corridorIslandHop.add(storyKey(nx, ny));
            }
        }
    }
}

/**
 * Promote long rift‑shoulder runs as “land‑open” corridors (plains/grass bias consumers).
 * MVP: tag shoulder tiles that form sufficiently long contiguous row segments.
 */
function tagLandCorridorsFromRifts() {
    const cfg = (CORRIDORS_CFG && CORRIDORS_CFG.land) || {};
    if (!cfg.useRiftShoulders) return;

    const width = GameplayMap.getGridWidth();
    const height = GameplayMap.getGridHeight();
    const maxCorridors = Math.max(0, (cfg.maxCorridors ?? 2) | 0);
    const minRun = Math.max(12, (cfg.minRunLength ?? 24) | 0);

    if (maxCorridors === 0 || StoryTags.riftShoulder.size === 0) return;

    let corridors = 0;

    // Sweep rows; find shoulder segments of sufficient length, tag them until budget exhausted
    for (let y = 1; y < height - 1 && corridors < maxCorridors; y++) {
        let x = 1;
        while (x < width - 1 && corridors < maxCorridors) {
            // Skip non‑shoulder
            while (x < width - 1 && !StoryTags.riftShoulder.has(storyKey(x, y)))
                x++;
            if (x >= width - 1) break;

            const start = x;
            while (x < width - 1 && StoryTags.riftShoulder.has(storyKey(x, y)))
                x++;
            const end = x - 1;
            const len = end - start + 1;

            if (len >= minRun) {
                for (let cx = start; cx <= end; cx++) {
                    if (!GameplayMap.isWater(cx, y)) {
                        StoryTags.corridorLandOpen.add(storyKey(cx, y));
                    }
                }
                corridors++;
            }
        }
    }
}

/**
 * After rivers are modeled, tag “river‑chain” corridors:
 * - Start near a coast and near rivers
 * - Greedily step to adjacent tiles that remain river‑adjacent and prefer lowlands/downhill
 */
function tagRiverChainsPostRivers() {
    const cfg = (CORRIDORS_CFG && CORRIDORS_CFG.river) || {};
    const width = GameplayMap.getGridWidth();
    const height = GameplayMap.getGridHeight();

    const maxChains = Math.max(0, (cfg.maxChains ?? 2) | 0);
    const maxSteps = Math.max(20, (cfg.maxSteps ?? 80) | 0);
    const lowlandThresh = Math.max(0, (cfg.preferLowlandBelow ?? 300) | 0);
    const coastSeedR = Math.max(1, (cfg.coastSeedRadius ?? 2) | 0);

    if (maxChains === 0) return;

    let chains = 0,
        tries = 0;
    while (chains < maxChains && tries < 300) {
        tries++;
        const sx = rand(width, "RiverChainSX");
        const sy = rand(height, "RiverChainSY");
        if (!inBounds(sx, sy)) continue;
        if (!GameplayMap.isCoastalLand(sx, sy)) continue;
        if (!GameplayMap.isAdjacentToRivers(sx, sy, coastSeedR)) continue;

        let x = sx,
            y = sy,
            steps = 0,
            placed = 0;

        while (steps < maxSteps) {
            if (
                !GameplayMap.isWater(x, y) &&
                GameplayMap.isAdjacentToRivers(x, y, 1)
            ) {
                StoryTags.corridorRiverChain.add(storyKey(x, y));
                placed++;
            }

            // Greedy move: prefer neighbor that’s river‑adjacent and lower/similar elevation,
            // with a mild preference for lowlands
            let bx = x,
                by = y,
                be = GameplayMap.getElevation(x, y);
            let improved = false;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const nx = x + dx,
                        ny = y + dy;
                    if (!inBounds(nx, ny) || GameplayMap.isWater(nx, ny))
                        continue;
                    if (!GameplayMap.isAdjacentToRivers(nx, ny, 1)) continue;

                    const e = GameplayMap.getElevation(nx, ny);
                    const prefer =
                        e <= be || // downhill or level near river
                        (e < lowlandThresh && be >= lowlandThresh); // moving toward lowland

                    if (prefer) {
                        // Soft tie‑break with slight randomness to avoid loops
                        if (!improved || rand(3, "RiverChainTie") === 0) {
                            bx = nx;
                            by = ny;
                            be = e;
                            improved = true;
                        }
                    }
                }
            }

            if (!improved) break;
            x = bx;
            y = by;
            steps++;
        }

        if (placed > 0) chains++;
    }
}

/**
 * Entrypoint for corridor tagging.
 * Call with:
 *  - stage="preIslands": After coast/margin shaping, before island seeding
 *  - stage="postRivers": After modelRivers/defineNamedRivers
 * @param {"preIslands"|"postRivers"} stage
 */
export function storyTagStrategicCorridors(stage) {
    if (!STORY_ENABLE_CORRIDORS) return;

    if (stage === "preIslands") {
        tagSeaLanes();
        tagIslandHopFromHotspots();
        tagLandCorridorsFromRifts();
    } else if (stage === "postRivers") {
        tagRiverChainsPostRivers();
    }
}

export default {
    storyTagStrategicCorridors,
};
