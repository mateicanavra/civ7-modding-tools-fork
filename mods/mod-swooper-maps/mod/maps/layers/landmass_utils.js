// @ts-nocheck
/* global TerrainBuilder */
/**
 * Shared helpers for landmass generation.
 */

import * as globals from "/base-standard/maps/map-globals.js";
import { WORLDMODEL_OCEAN_SEPARATION } from "../bootstrap/tunables.js";
import { WorldModel } from "../world/model.js";

/**
 * Apply geometry post-processing adjustments defined in config.
 *
 * @param {Array<{west:number,east:number,south:number,north:number,continent:number}>} windows
 * @param {any} geometry
 * @param {number} width
 * @param {number} height
 */
export function applyLandmassPostAdjustments(windows, geometry, width, height) {
    if (!Array.isArray(windows) || windows.length === 0)
        return windows;
    const post = geometry?.post;
    if (!post || typeof post !== "object")
        return windows;
    const expandAll = Number.isFinite(post.expandTiles) ? Math.trunc(post.expandTiles) : 0;
    const expandWest = Number.isFinite(post.expandWestTiles) ? Math.trunc(post.expandWestTiles) : 0;
    const expandEast = Number.isFinite(post.expandEastTiles) ? Math.trunc(post.expandEastTiles) : 0;
    const clampWest = Number.isFinite(post.clampWestMin) ? Math.max(0, Math.trunc(post.clampWestMin)) : null;
    const clampEast = Number.isFinite(post.clampEastMax) ? Math.min(width - 1, Math.trunc(post.clampEastMax)) : null;
    const overrideSouth = Number.isFinite(post.overrideSouth) ? clampInt(Math.trunc(post.overrideSouth), 0, height - 1) : null;
    const overrideNorth = Number.isFinite(post.overrideNorth) ? clampInt(Math.trunc(post.overrideNorth), 0, height - 1) : null;
    const minWidth = Number.isFinite(post.minWidthTiles) ? Math.max(0, Math.trunc(post.minWidthTiles)) : null;
    let changed = false;
    const adjusted = windows.map((win) => {
        if (!win)
            return win;
        let west = clampInt(win.west | 0, 0, width - 1);
        let east = clampInt(win.east | 0, 0, width - 1);
        let south = clampInt(win.south | 0, 0, height - 1);
        let north = clampInt(win.north | 0, 0, height - 1);
        const expansionWest = expandAll + expandWest;
        const expansionEast = expandAll + expandEast;
        if (expansionWest > 0)
            west = clampInt(west - expansionWest, 0, width - 1);
        if (expansionEast > 0)
            east = clampInt(east + expansionEast, 0, width - 1);
        if (clampWest != null)
            west = Math.max(west, clampWest);
        if (clampEast != null)
            east = Math.min(east, clampEast);
        if (minWidth != null && minWidth > 0) {
            const span = east - west + 1;
            if (span < minWidth) {
                const deficit = minWidth - span;
                const extraWest = Math.floor(deficit / 2);
                const extraEast = deficit - extraWest;
                west = clampInt(west - extraWest, 0, width - 1);
                east = clampInt(east + extraEast, 0, width - 1);
            }
        }
        if (overrideSouth != null)
            south = overrideSouth;
        if (overrideNorth != null)
            north = overrideNorth;
        const mutated = west !== win.west || east !== win.east || south !== win.south || north !== win.north;
        if (mutated)
            changed = true;
        if (!mutated)
            return win;
        return {
            west,
            east,
            south,
            north,
            continent: win.continent,
        };
    });
    return changed ? adjusted : windows;
}

function clampInt(value, min, max) {
    if (value < min)
        return min;
    if (value > max)
        return max;
    return value;
}

/**
 * Apply plate-aware ocean separation to landmasses after generation.
 *
 * Widens or narrows ocean channels based on WorldModel boundary closeness,
 * mutating both the supplied land mask (when available) and returning updated
 * landmass windows for downstream consumers.
 *
 * @param {{
 *   width: number,
 *   height: number,
 *   windows: ReadonlyArray<{west:number,east:number,south:number,north:number,continent?:number}>,
 *   landMask?: Uint8Array | null,
 *   adapter?: { setTerrainType?(x:number,y:number,terrain:number):void } | null,
 *   policy?: any,
 *   worldModel?: typeof WorldModel | null,
 * }} params
 * @returns {{ windows: Array<{west:number,east:number,south:number,north:number,continent:number}>, landMask?: Uint8Array }}
 */
export function applyPlateAwareOceanSeparation(params) {
    const width = params?.width | 0;
    const height = params?.height | 0;
    const windows = Array.isArray(params?.windows) ? params.windows : [];
    if (!width || !height || windows.length === 0) {
        return { windows: windows.map((win, idx) => normalizeWindow(win, idx, width, height)) };
    }
    const adapter = params?.adapter && typeof params.adapter.setTerrainType === "function"
        ? params.adapter
        : null;
    const worldModel = params?.worldModel ?? WorldModel;
    const policy = params?.policy || worldModel?.policy?.oceanSeparation || WORLDMODEL_OCEAN_SEPARATION;
    if (!policy || !policy.enabled || !worldModel || typeof worldModel.isEnabled !== "function" || !worldModel.isEnabled()) {
        return {
            windows: windows.map((win, idx) => normalizeWindow(win, idx, width, height)),
            landMask: params?.landMask ?? undefined,
        };
    }
    const closeness = worldModel.boundaryCloseness;
    if (!closeness || closeness.length !== width * height) {
        return {
            windows: windows.map((win, idx) => normalizeWindow(win, idx, width, height)),
            landMask: params?.landMask ?? undefined,
        };
    }
    const landMask = params?.landMask instanceof Uint8Array && params.landMask.length === width * height
        ? params.landMask
        : null;
    const bandPairs = Array.isArray(policy.bandPairs) && policy.bandPairs.length
        ? policy.bandPairs
        : [
            [0, 1],
            [1, 2],
        ];
    const baseSeparation = Math.max(0, policy.baseSeparationTiles | 0 || 0);
    const closenessMultiplier = Number.isFinite(policy.boundaryClosenessMultiplier)
        ? policy.boundaryClosenessMultiplier
        : 1.0;
    const maxPerRow = Math.max(0, policy.maxPerRowDelta | 0 || 3);
    const rowStates = windows.map((win, idx) => createRowState(win, idx, width, height));
    const setTerrain = (x, y, terrain) => {
        if (x < 0 || x >= width || y < 0 || y >= height)
            return;
        if (landMask) {
            landMask[y * width + x] = terrain === globals.g_FlatTerrain ? 1 : 0;
        }
        if (adapter) {
            adapter.setTerrainType(x, y, terrain);
        }
        else {
            TerrainBuilder.setTerrainType(x, y, terrain);
        }
    };
    const carveOceanFromEast = (state, y, tiles) => {
        if (!tiles)
            return 0;
        let removed = 0;
        let x = state.east[y];
        const limit = state.west[y];
        const rowOffset = y * width;
        while (removed < tiles && x >= limit) {
            const idx = rowOffset + x;
            if (!landMask || landMask[idx]) {
                setTerrain(x, y, globals.g_OceanTerrain);
                removed++;
            }
            x--;
        }
        state.east[y] = clampInt(state.east[y] - removed, limit, width - 1);
        return removed;
    };
    const carveOceanFromWest = (state, y, tiles) => {
        if (!tiles)
            return 0;
        let removed = 0;
        let x = state.west[y];
        const limit = state.east[y];
        const rowOffset = y * width;
        while (removed < tiles && x <= limit) {
            const idx = rowOffset + x;
            if (!landMask || landMask[idx]) {
                setTerrain(x, y, globals.g_OceanTerrain);
                removed++;
            }
            x++;
        }
        state.west[y] = clampInt(state.west[y] + removed, 0, limit);
        return removed;
    };
    const fillLandFromWest = (state, y, tiles) => {
        if (!tiles)
            return 0;
        let added = 0;
        let x = state.west[y] - 1;
        while (added < tiles && x >= 0) {
            setTerrain(x, y, globals.g_FlatTerrain);
            added++;
            x--;
        }
        state.west[y] = clampInt(state.west[y] - added, 0, width - 1);
        return added;
    };
    const fillLandFromEast = (state, y, tiles) => {
        if (!tiles)
            return 0;
        let added = 0;
        let x = state.east[y] + 1;
        while (added < tiles && x < width) {
            setTerrain(x, y, globals.g_FlatTerrain);
            added++;
            x++;
        }
        state.east[y] = clampInt(state.east[y] + added, 0, width - 1);
        return added;
    };
    for (const pair of bandPairs) {
        const li = Array.isArray(pair) ? pair[0] | 0 : -1;
        const ri = Array.isArray(pair) ? pair[1] | 0 : -1;
        const left = rowStates[li];
        const right = rowStates[ri];
        if (!left || !right)
            continue;
        const rowStart = Math.max(0, Math.max(left.south, right.south));
        const rowEnd = Math.min(height - 1, Math.min(left.north, right.north));
        for (let y = rowStart; y <= rowEnd; y++) {
            const mid = clampInt(Math.floor((left.east[y] + right.west[y]) / 2), 0, width - 1);
            const clos = closeness[y * width + mid] | 0;
            let sep = baseSeparation;
            if (sep > 0) {
                const weight = clos / 255;
                sep += Math.round(weight * closenessMultiplier * baseSeparation);
            }
            if (sep > maxPerRow)
                sep = maxPerRow;
            if (sep <= 0)
                continue;
            carveOceanFromEast(left, y, sep);
            carveOceanFromWest(right, y, sep);
        }
    }
    const edgeWest = policy.edgeWest || {};
    if (rowStates.length && edgeWest.enabled) {
        const state = rowStates[0];
        const base = edgeWest.baseTiles | 0 || 0;
        const mult = Number.isFinite(edgeWest.boundaryClosenessMultiplier)
            ? edgeWest.boundaryClosenessMultiplier
            : 1.0;
        const cap = Math.max(0, edgeWest.maxPerRowDelta | 0 || 2);
        for (let y = state.south; y <= state.north; y++) {
            const clos = closeness[y * width + 0] | 0;
            let mag = Math.abs(base) + Math.round((clos / 255) * Math.abs(base) * mult);
            if (mag > cap)
                mag = cap;
            if (mag <= 0)
                continue;
            if (base >= 0) {
                carveOceanFromWest(state, y, mag);
            }
            else {
                fillLandFromWest(state, y, mag);
            }
        }
    }
    const edgeEast = policy.edgeEast || {};
    if (rowStates.length && edgeEast.enabled) {
        const state = rowStates[rowStates.length - 1];
        const base = edgeEast.baseTiles | 0 || 0;
        const mult = Number.isFinite(edgeEast.boundaryClosenessMultiplier)
            ? edgeEast.boundaryClosenessMultiplier
            : 1.0;
        const cap = Math.max(0, edgeEast.maxPerRowDelta | 0 || 2);
        for (let y = state.south; y <= state.north; y++) {
            const clos = closeness[y * width + (width - 1)] | 0;
            let mag = Math.abs(base) + Math.round((clos / 255) * Math.abs(base) * mult);
            if (mag > cap)
                mag = cap;
            if (mag <= 0)
                continue;
            if (base >= 0) {
                carveOceanFromEast(state, y, mag);
            }
            else {
                fillLandFromEast(state, y, mag);
            }
        }
    }
    const normalized = rowStates.map((state) => aggregateRowState(state, width, height));
    return {
        windows: normalized,
        landMask: landMask ?? undefined,
    };
}

function createRowState(win, index, width, height) {
    const normalized = normalizeWindow(win, index, width, height);
    const west = new Int16Array(height);
    const east = new Int16Array(height);
    for (let y = 0; y < height; y++) {
        west[y] = normalized.west;
        east[y] = normalized.east;
    }
    return {
        index,
        west,
        east,
        south: normalized.south,
        north: normalized.north,
        continent: normalized.continent,
    };
}

function aggregateRowState(state, width, height) {
    let minWest = width - 1;
    let maxEast = 0;
    const south = clampInt(state.south, 0, height - 1);
    const north = clampInt(state.north, 0, height - 1);
    for (let y = south; y <= north; y++) {
        if (state.west[y] < minWest)
            minWest = state.west[y];
        if (state.east[y] > maxEast)
            maxEast = state.east[y];
    }
    return {
        west: clampInt(minWest, 0, width - 1),
        east: clampInt(maxEast, 0, width - 1),
        south,
        north,
        continent: state.continent,
    };
}

function normalizeWindow(win, index, width, height) {
    if (!win)
        return {
            west: 0,
            east: Math.max(0, width - 1),
            south: 0,
            north: Math.max(0, height - 1),
            continent: index,
        };
    const west = clampInt(win.west | 0, 0, width - 1);
    const east = clampInt(win.east | 0, 0, width - 1);
    const south = clampInt(win.south | 0, 0, height - 1);
    const north = clampInt(win.north | 0, 0, height - 1);
    return {
        west: Math.min(west, east),
        east: Math.max(west, east),
        south: Math.min(south, north),
        north: Math.max(south, north),
        continent: win.continent ?? index,
    };
}
