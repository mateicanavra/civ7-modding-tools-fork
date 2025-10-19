// @ts-nocheck
/**
 * Plate-driven landmass generator
 *
 * Uses Civ VII WorldModel plate fields to carve land and ocean before the
 * remainder of the Swooper pipeline runs. The algorithm ranks tiles by plate
 * interior "stability" (WorldModel.shieldStability) and selects the highest
 * scoring tiles until the configured land/sea ratio is satisfied, while also
 * respecting boundary closeness to preserve coastlines.
 */

import * as globals from "/base-standard/maps/map-globals.js";
import { LANDMASS_CFG } from "../bootstrap/tunables.js";
import { WorldModel } from "../world/model.js";
import { writeHeightfield } from "../core/types.js";

const DEFAULT_CLOSENESS_LIMIT = 215;
const CLOSENESS_STEP_PER_TILE = 8;
const MIN_CLOSENESS_LIMIT = 150;
const MAX_CLOSENESS_LIMIT = 255;

/**
 * Create landmasses using plate stability metrics.
 *
 * @param {number} width
 * @param {number} height
 * @param {import("../core/types.js").MapContext} [ctx]
 * @param {{ landmassCfg?: any, geometry?: any }} [options]
 * @returns {{ windows: Array<{west:number,east:number,south:number,north:number,continent:number}>, startRegions?: {westContinent?:any,eastContinent?:any}, landMask: Uint8Array }|null}
 */
export function createPlateDrivenLandmasses(width, height, ctx, options = {}) {
    if (!WorldModel || typeof WorldModel.isEnabled !== "function" || !WorldModel.isEnabled()) {
        return null;
    }
    const shield = WorldModel.shieldStability;
    const closeness = WorldModel.boundaryCloseness;
    const plateIds = WorldModel.plateId;
    if (!shield || !closeness || !plateIds) {
        return null;
    }
    const size = width * height;
    if (shield.length !== size || closeness.length !== size || plateIds.length !== size) {
        return null;
    }
    const landmassCfg = options.landmassCfg || LANDMASS_CFG || {};
    const geomCfg = options.geometry || {};
    const postCfg = geomCfg.post || {};

    const baseWaterPct = clampPct(landmassCfg.baseWaterPercent, 0, 100, 64);
    const totalTiles = size;
    const targetLandTiles = Math.max(1, Math.min(totalTiles - 1, Math.round(totalTiles * (1 - baseWaterPct / 100))));

    const closenessLimit = computeClosenessLimit(postCfg);

    // Binary search threshold on shield stability to hit target land count (after closeness gating)
    let low = 0;
    let high = 255;
    let bestThreshold = 200;
    let bestDiff = Number.POSITIVE_INFINITY;
    let bestCount = 0;
    while (low <= high) {
        const mid = (low + high) >> 1;
        const count = countTilesAbove(shield, closeness, mid, closenessLimit);
        const diff = Math.abs(count - targetLandTiles);
        if (diff < bestDiff || (diff === bestDiff && count > bestCount)) {
            bestDiff = diff;
            bestThreshold = mid;
            bestCount = count;
        }
        if (count > targetLandTiles) {
            low = mid + 1;
        }
        else {
            high = mid - 1;
        }
    }

    const landMask = new Uint8Array(size);
    let finalLandTiles = 0;
    for (let y = 0; y < height; y++) {
        const rowOffset = y * width;
        for (let x = 0; x < width; x++) {
            const idx = rowOffset + x;
            const isLand = shield[idx] >= bestThreshold && closeness[idx] <= closenessLimit;
            if (isLand) {
                landMask[idx] = 1;
                finalLandTiles++;
                if (ctx) {
                    writeHeightfield(ctx, x, y, {
                        terrain: globals.g_FlatTerrain,
                        elevation: 0,
                        isLand: true,
                    });
                }
                else {
                    setTerrain(null, x, y, globals.g_FlatTerrain);
                }
            }
            else {
                landMask[idx] = 0;
                if (ctx) {
                    writeHeightfield(ctx, x, y, {
                        terrain: globals.g_OceanTerrain,
                        elevation: -1,
                        isLand: false,
                    });
                }
                else {
                    setTerrain(null, x, y, globals.g_OceanTerrain);
                }
            }
        }
    }

    // Derive bounding boxes per plate for downstream start placement heuristics.
    const plateStats = new Map();
    for (let idx = 0; idx < size; idx++) {
        if (!landMask[idx])
            continue;
        const plateId = plateIds[idx];
        if (plateId == null || plateId < 0)
            continue;
        const y = Math.floor(idx / width);
        const x = idx - y * width;
        let stat = plateStats.get(plateId);
        if (!stat) {
            stat = {
                plateId,
                count: 0,
                minX: width,
                maxX: -1,
                minY: height,
                maxY: -1,
            };
            plateStats.set(plateId, stat);
        }
        stat.count++;
        if (x < stat.minX)
            stat.minX = x;
        if (x > stat.maxX)
            stat.maxX = x;
        if (y < stat.minY)
            stat.minY = y;
        if (y > stat.maxY)
            stat.maxY = y;
    }

    const minWidth = postCfg.minWidthTiles ? Math.max(1, Math.trunc(postCfg.minWidthTiles)) : 0;
    const polarRows = globals.g_PolarWaterRows ?? 0;

    const windows = Array.from(plateStats.values())
        .filter((s) => s.count > 0 && s.maxX >= s.minX && s.maxY >= s.minY)
        .map((s) => {
        const expand = postCfg.expandTiles ? Math.trunc(postCfg.expandTiles) : 0;
        const expandWest = postCfg.expandWestTiles ? Math.trunc(postCfg.expandWestTiles) : 0;
        const expandEast = postCfg.expandEastTiles ? Math.trunc(postCfg.expandEastTiles) : 0;
        let west = Math.max(0, s.minX - Math.max(0, expand + expandWest));
        let east = Math.min(width - 1, s.maxX + Math.max(0, expand + expandEast));
        if (minWidth > 0) {
            const span = east - west + 1;
            if (span < minWidth) {
                const deficit = minWidth - span;
                const extraWest = Math.floor(deficit / 2);
                const extraEast = deficit - extraWest;
                west = Math.max(0, west - extraWest);
                east = Math.min(width - 1, east + extraEast);
            }
        }
        if (postCfg.clampWestMin != null) {
            west = Math.max(west, Math.max(0, Math.trunc(postCfg.clampWestMin)));
        }
        if (postCfg.clampEastMax != null) {
            east = Math.min(east, Math.min(width - 1, Math.trunc(postCfg.clampEastMax)));
        }
        const south = postCfg.overrideSouth != null
            ? clampInt(Math.trunc(postCfg.overrideSouth), 0, height - 1)
            : polarRows;
        const north = postCfg.overrideNorth != null
            ? clampInt(Math.trunc(postCfg.overrideNorth), 0, height - 1)
            : height - polarRows;
        return {
            plateId: s.plateId,
            west,
            east,
            south,
            north,
            centerX: (west + east) * 0.5,
            count: s.count,
        };
    })
        .sort((a, b) => a.centerX - b.centerX);

    const windowsOut = windows.map((win, index) => ({
        west: win.west,
        east: win.east,
        south: win.south,
        north: win.north,
        continent: index,
    }));

    let startRegions = null;
    if (windowsOut.length >= 2) {
        startRegions = {
            westContinent: Object.assign({}, windowsOut[0]),
            eastContinent: Object.assign({}, windowsOut[windowsOut.length - 1]),
        };
    }

    if (ctx?.buffers?.heightfield?.landMask) {
        ctx.buffers.heightfield.landMask.set(landMask);
    }

    return {
        windows: windowsOut,
        startRegions,
        landMask,
        landTiles: finalLandTiles,
        threshold: bestThreshold,
    };
}

function computeClosenessLimit(postCfg) {
    const expand = postCfg && postCfg.expandTiles ? Math.trunc(postCfg.expandTiles) : 0;
    const limit = DEFAULT_CLOSENESS_LIMIT + expand * CLOSENESS_STEP_PER_TILE;
    return clampInt(limit, MIN_CLOSENESS_LIMIT, MAX_CLOSENESS_LIMIT);
}

function countTilesAbove(shield, closeness, threshold, closenessLimit) {
    let count = 0;
    for (let i = 0; i < shield.length; i++) {
        if (shield[i] >= threshold && closeness[i] <= closenessLimit) {
            count++;
        }
    }
    return count;
}

function setTerrain(adapter, x, y, terrainType) {
    if (adapter) {
        adapter.setTerrainType(x, y, terrainType);
    }
    else {
        TerrainBuilder.setTerrainType(x, y, terrainType);
    }
}

function clampPct(value, min, max, fallback) {
    if (!Number.isFinite(value))
        return fallback;
    const v = Math.max(min, Math.min(max, value));
    return v;
}

function clampInt(value, min, max) {
    if (!Number.isFinite(value))
        return min;
    if (value < min)
        return min;
    if (value > max)
        return max;
    return value;
}

export default createPlateDrivenLandmasses;
