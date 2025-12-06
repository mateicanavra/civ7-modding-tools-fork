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

// With boundary-aware scoring we no longer gate land by closeness; keep legacy constants for fallback.
const DEFAULT_CLOSENESS_LIMIT = 255;
const CLOSENESS_STEP_PER_TILE = 8;
const MIN_CLOSENESS_LIMIT = 150;
const MAX_CLOSENESS_LIMIT = 255;

// Boundary type constants (must match WorldModel/plates.js)
const BOUNDARY_TYPE = Object.freeze({
    none: 0,
    convergent: 1,
    divergent: 2,
    transform: 3,
});

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
    const boundaryType = WorldModel.boundaryType;
    const plateIds = WorldModel.plateId;
    if (!shield || !closeness || !boundaryType || !plateIds) {
        return null;
    }
    const size = width * height;
    if (shield.length !== size || closeness.length !== size || plateIds.length !== size) {
        return null;
    }
    const landmassCfg = options.landmassCfg || LANDMASS_CFG || {};
    const boundaryBias = Number.isFinite(landmassCfg.boundaryBias) ? landmassCfg.boundaryBias : 0.35;
    const boundaryShareTarget = Number.isFinite(landmassCfg.boundaryShareTarget)
        ? Math.max(0, Math.min(1, landmassCfg.boundaryShareTarget))
        : 0.2;

    // NEW: Boundary-type-aware scoring parameters
    // Convergent boundaries (collision zones) should become LAND for mountain building
    // Divergent boundaries (spreading ridges) should become OCEAN
    //
    // Physics model: Effects are strongest RIGHT AT the boundary and fall off
    // exponentially with distance. This creates narrow mountain belts at collision
    // zones rather than broad "blob" regions.
    const convergentLandBonus = Number.isFinite(landmassCfg.convergentLandBonus)
        ? landmassCfg.convergentLandBonus
        : 180;  // Max bonus points at boundary (was 0.9 multiplier, now absolute)
    const divergentOceanPenalty = Number.isFinite(landmassCfg.divergentOceanPenalty)
        ? landmassCfg.divergentOceanPenalty
        : 100;  // Max penalty points at boundary
    const boundaryEffectThreshold = Number.isFinite(landmassCfg.boundaryEffectThreshold)
        ? landmassCfg.boundaryEffectThreshold
        : 40;   // Minimum closeness to apply any boundary effect (0-255) - lowered to match tighter scaleFactor
    const boundaryFalloffExponent = Number.isFinite(landmassCfg.boundaryFalloffExponent)
        ? landmassCfg.boundaryFalloffExponent
        : 2.5;  // Falloff power (higher = more concentrated at boundary, 1=linear, 2=squared)

    const geomCfg = options.geometry || {};
    const postCfg = geomCfg.post || {};

    const baseWaterPct = clampPct(landmassCfg.baseWaterPercent, 0, 100, 64);
    const totalTiles = size;
    const targetLandTiles = Math.max(1, Math.min(totalTiles - 1, Math.round(totalTiles * (1 - baseWaterPct / 100))));

    const closenessLimit = MAX_CLOSENESS_LIMIT; // allow high-closeness tiles to become land when scored high

    /**
     * Compute land score for a tile, accounting for boundary TYPE.
     * - Convergent boundaries get a BONUS (mountain-building zones should be land)
     * - Divergent boundaries get a PENALTY (spreading ridges should be ocean)
     * - Transform boundaries and interiors use the base formula
     *
     * Physics model: Tectonic effects are strongest RIGHT AT the plate boundary
     * and fall off exponentially with distance. This creates:
     * - Narrow mountain belts at convergent boundaries (like the Himalayas, Andes)
     * - Linear ocean ridges at divergent boundaries (like the Mid-Atlantic Ridge)
     */
    const computeLandScore = (idx) => {
        const shieldVal = shield[idx] | 0;
        const closenessVal = closeness[idx] | 0;
        const bType = boundaryType[idx] | 0;

        // Base score: shield stability + small closeness bias
        let score = shieldVal + Math.round(closenessVal * boundaryBias);

        // Apply boundary-type-specific modifiers with physics-based falloff
        if (closenessVal >= boundaryEffectThreshold) {
            // Normalize closeness to 0-1 range above threshold
            // At threshold: normalized = 0, at max (255): normalized = 1
            const normalized = (closenessVal - boundaryEffectThreshold) / (255 - boundaryEffectThreshold);

            // Apply exponential falloff - effects concentrated near boundary
            // With exponent=2.5: at normalized=0.5, intensity=0.18 (not 0.5)
            // This creates narrow bands rather than broad zones
            const intensity = Math.pow(normalized, boundaryFalloffExponent);

            if (bType === BOUNDARY_TYPE.convergent) {
                // CONVERGENT: Boost score - collision zones build mountains/land
                // Full bonus only right at the boundary, falls off rapidly
                score += Math.round(convergentLandBonus * intensity);
            } else if (bType === BOUNDARY_TYPE.divergent) {
                // DIVERGENT: Reduce score - spreading ridges create ocean floor
                score -= Math.round(divergentOceanPenalty * intensity);
            }
            // TRANSFORM: No land/ocean modifier (these create linear features
            // but don't fundamentally change crust type - future enhancement)
        }

        return score;
    };

    // Count tiles above threshold using boundary-type-aware scoring
    const countTilesAboveTyped = (threshold) => {
        let count = 0;
        for (let i = 0; i < size; i++) {
            const score = computeLandScore(i);
            if (score >= threshold && closeness[i] <= closenessLimit) {
                count++;
            }
        }
        return count;
    };

    // Binary search threshold to hit target land count
    // Hybrid selection: find a threshold that hits total land, but also enforce a minimum share in boundary bands.
    // First pass: baseline threshold search.
    let low = -100;  // Lower bound to allow negative scores (after divergent penalty)
    let high = 255 + Math.round(255 * (boundaryBias + convergentLandBonus));
    let bestThreshold = 200;
    let bestDiff = Number.POSITIVE_INFINITY;
    let bestCount = 0;
    while (low <= high) {
        const mid = (low + high) >> 1;
        const count = countTilesAboveTyped(mid);
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

    // Second pass: ensure boundary share. If below target, lower threshold until boundary share is met or we hit caps.
    const boundaryBand = (closenessArr, idx) => (closenessArr[idx] | 0) >= 90; // ~0.35 band: 90/255
    const computeShares = (threshold) => {
        let land = 0, boundaryLand = 0, convergentLand = 0;
        for (let i = 0; i < size; i++) {
            const score = computeLandScore(i);
            const isLand = score >= threshold && closeness[i] <= closenessLimit;
            if (isLand) {
                land++;
                if (boundaryBand(closeness, i))
                    boundaryLand++;
                if (boundaryType[i] === BOUNDARY_TYPE.convergent)
                    convergentLand++;
            }
        }
        return { land, boundaryLand, convergentLand };
    };

    let { land: landCount, boundaryLand } = computeShares(bestThreshold);
    const minBoundary = Math.round(targetLandTiles * boundaryShareTarget);
    if (boundaryLand < minBoundary) {
        // Loosen threshold to admit more boundary tiles.
        let t = bestThreshold - 10;
        while (t >= 0) {
            const shares = computeShares(t);
            landCount = shares.land;
            boundaryLand = shares.boundaryLand;
            if (boundaryLand >= minBoundary || landCount >= targetLandTiles * 1.05) {
                bestThreshold = t;
                break;
            }
            t -= 10;
        }
    }

    const landMask = new Uint8Array(size);
    let finalLandTiles = 0;
    let convergentLandCount = 0;
    let divergentOceanCount = 0;
    for (let y = 0; y < height; y++) {
        const rowOffset = y * width;
        for (let x = 0; x < width; x++) {
            const idx = rowOffset + x;
            const score = computeLandScore(idx);
            const isLand = score >= bestThreshold && closeness[idx] <= closenessLimit;

            // Track boundary type distribution for logging
            const bType = boundaryType[idx] | 0;

            if (isLand) {
                if (bType === BOUNDARY_TYPE.convergent) convergentLandCount++;
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
                if (bType === BOUNDARY_TYPE.divergent) divergentOceanCount++;
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

    // Log the boundary-type-aware distribution
    console.log(`[Landmass] Boundary-type-aware scoring: threshold=${bestThreshold}, land=${finalLandTiles}, convergentLand=${convergentLandCount}, divergentOcean=${divergentOceanCount}`);

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
        const verticalPad = Math.max(0, expand);
        const baseSouth = Math.max(polarRows, s.minY - verticalPad);
        const baseNorth = Math.min(height - polarRows, s.maxY + verticalPad);
        const south = postCfg.overrideSouth != null
            ? clampInt(Math.trunc(postCfg.overrideSouth), 0, height - 1)
            : clampInt(baseSouth, 0, height - 1);
        const north = postCfg.overrideNorth != null
            ? clampInt(Math.trunc(postCfg.overrideNorth), 0, height - 1)
            : clampInt(baseNorth, 0, height - 1);
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

function countTilesAbove(shield, closeness, threshold, closenessLimit, boundaryBias = 0) {
    const bias = Math.max(0, boundaryBias);
    let count = 0;
    for (let i = 0; i < shield.length; i++) {
        const score = (shield[i] | 0) + Math.round((closeness[i] | 0) * bias);
        if (score >= threshold && closeness[i] <= closenessLimit) {
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
