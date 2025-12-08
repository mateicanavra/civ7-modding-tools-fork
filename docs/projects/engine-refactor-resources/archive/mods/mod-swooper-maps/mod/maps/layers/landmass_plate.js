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

// Default closeness gating for land selection. We keep the full 0–255 band so
// that boundary tiles remain eligible; presets can still clamp via geometry.post.
const DEFAULT_CLOSENESS_LIMIT = 255;
const CLOSENESS_STEP_PER_TILE = 8;
const MIN_CLOSENESS_LIMIT = 150;
const MAX_CLOSENESS_LIMIT = 255;

const BOUNDARY_TYPE = Object.freeze({
    none: 0,
    convergent: 1,
    divergent: 2,
    transform: 3,
});
// Reserve a dedicated tectonic fractal slot for interior noise and arc raggedness.
// Base-standard maps typically claim 0..2; we keep 3 for Swooper tectonics.
const FRACTAL_TECTONIC_ID = 3;

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
    if (shield.length !== size || closeness.length !== size || boundaryType.length !== size || plateIds.length !== size) {
        return null;
    }
    const landmassCfg = options.landmassCfg || LANDMASS_CFG || {};
    // Keep a modest bias toward margins but clamp to a “core-first” band.
    const boundaryBias = clampInt(
        Number.isFinite(landmassCfg.boundaryBias) ? landmassCfg.boundaryBias : 0.25,
        0,
        0.4
    );
    const boundaryShareTarget = Number.isFinite(landmassCfg.boundaryShareTarget)
        ? Math.max(0, Math.min(1, landmassCfg.boundaryShareTarget))
        : 0.15;
    const tectonicsCfg = landmassCfg.tectonics || {};
    const interiorNoiseWeight = clamp01(tectonicsCfg.interiorNoiseWeight, 0.3);
    const arcWeight = clampRange(tectonicsCfg.boundaryArcWeight, 0.8, 0, 2);
    const arcNoiseWeight = clamp01(tectonicsCfg.boundaryArcNoiseWeight, 0.5);
    const fractalGrain = clampInt(
        Number.isFinite(tectonicsCfg.fractalGrain) ? tectonicsCfg.fractalGrain : 4,
        1,
        32
    );
    const geomCfg = options.geometry || {};
    const postCfg = geomCfg.post || {};

    // Earth-like baseline water coverage with a scalar to nudge wetter/drier worlds.
    const baseWaterPct = clampPct(landmassCfg.baseWaterPercent, 0, 100, 64);
    const waterScalar = clampPct(
        Number.isFinite(landmassCfg.waterScalar) ? landmassCfg.waterScalar * 100 : 100,
        25,
        175,
        100
    ) / 100;
    const waterPct = clampPct(baseWaterPct * waterScalar, 0, 100, baseWaterPct);
    const totalTiles = size || 1;
    const targetLandTiles = Math.max(1, Math.min(totalTiles - 1, Math.round(totalTiles * (1 - waterPct / 100))));

    // Allow high-closeness tiles to become land when scored high.
    const closenessLimit = computeClosenessLimit(postCfg);
    const adapter = ctx?.adapter;
    const useFractal = !!(
        adapter &&
        typeof adapter.createFractal === "function" &&
        typeof adapter.getFractalHeight === "function" &&
        (interiorNoiseWeight > 0 || arcNoiseWeight > 0)
    );
    if (useFractal) {
        adapter.createFractal(FRACTAL_TECTONIC_ID, width, height, fractalGrain, 0);
    }
    const baseInteriorWeight = 1 - interiorNoiseWeight;
    const interiorScore = new Uint16Array(size);
    const arcScore = new Uint16Array(size);
    const landScore = new Uint16Array(size);
    // Debug stats to validate score ranges before thresholding.
    let interiorMin = 255, interiorMax = 0, interiorSum = 0;
    let arcMin = 255, arcMax = 0, arcSum = 0;
    let landMin = 255, landMax = 0, landSum = 0;
    let interiorStretch = 1;

    for (let y = 0; y < height; y++) {
        const rowOffset = y * width;
        for (let x = 0; x < width; x++) {
            const idx = rowOffset + x;
            const closenessVal = closeness[idx] | 0;
            const interiorBase = 255 - closenessVal;

            // --- Interior score: plate core + tectonic noise ---
            let noise255 = 128;
            if (useFractal && interiorNoiseWeight > 0) {
                const raw = adapter.getFractalHeight(FRACTAL_TECTONIC_ID, x, y) | 0;
                noise255 = raw >>> 8; // downscale 0..65535 → 0..255
            }
            const centeredNoise = noise255 - 128; // -128..127
            const noisyInterior = interiorBase * baseInteriorWeight + centeredNoise * interiorNoiseWeight;
            const clampedInterior = noisyInterior < 0 ? 0 : noisyInterior > 255 ? 255 : noisyInterior;
            const interiorVal = clampedInterior & 0xff;
            interiorScore[idx] = interiorVal;
            interiorMin = Math.min(interiorMin, interiorVal);
            interiorMax = Math.max(interiorMax, interiorVal);
            interiorSum += interiorVal;

            // --- Arc score: convergent uplift / island arcs ---
            const bType = boundaryType[idx] | 0;
            const rawArc = closenessVal;
            let arc = rawArc;
            if (bType === BOUNDARY_TYPE.convergent) {
                arc = rawArc * arcWeight;
            }
            else if (bType === BOUNDARY_TYPE.divergent) {
                arc = rawArc * 0.25;
            }
            else {
                arc = rawArc * 0.5;
            }
            if (useFractal && arcNoiseWeight > 0) {
                const raw = adapter.getFractalHeight(FRACTAL_TECTONIC_ID, x, y) | 0;
                const noiseNorm = (raw >>> 8) / 255; // 0..1
                const noiseMix = 1.0 + (noiseNorm - 0.5) * arcNoiseWeight; // ~[0.75, 1.25] scaled by weight
                arc *= noiseMix;
            }
            if (boundaryBias > 0) {
                arc += closenessVal * boundaryBias;
            }
            const clampedArc = arc < 0 ? 0 : arc > 255 ? 255 : arc;
            arcScore[idx] = clampedArc & 0xff;
            arcMin = Math.min(arcMin, arcScore[idx]);
            arcMax = Math.max(arcMax, arcScore[idx]);
            arcSum += arcScore[idx];
        }
    }

    // Stretch interior scores if they trail arcs, but cap to avoid flattening the distribution.
    if (interiorMax > 0) {
        const desiredTop = arcMax > 0 ? arcMax + 32 : 255;
        interiorStretch = desiredTop / interiorMax;
        if (interiorStretch < 1.05 || !Number.isFinite(interiorStretch)) {
            interiorStretch = 1;
        }
        else {
            interiorStretch = Math.min(1.6, interiorStretch);
            interiorMin = 255;
            interiorMax = 0;
            interiorSum = 0;
            for (let i = 0; i < size; i++) {
                const stretched = Math.min(255, Math.round(interiorScore[i] * interiorStretch));
                interiorScore[i] = stretched;
                interiorMin = Math.min(interiorMin, stretched);
                interiorMax = Math.max(interiorMax, stretched);
                interiorSum += stretched;
            }
        }
    }

    // --- Final land score: core vs boundary uplift ---
    landMin = 255; landMax = 0; landSum = 0;
    for (let i = 0; i < size; i++) {
        const l = interiorScore[i] >= arcScore[i] ? interiorScore[i] : arcScore[i];
        landScore[i] = l;
        landMin = Math.min(landMin, l);
        landMax = Math.max(landMax, l);
        landSum += l;
    }

    const computeLandScore = (idx) => landScore[idx] | 0;

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

    // Distribution and sanity logs to avoid zero-land failures.
    const thresholdsProbe = [32, 64, 96, 128, 160, 192, 224];
    const probeCounts = thresholdsProbe.map((t) => ({
        threshold: t,
        count: countTilesAboveTyped(t),
    }));

    console.log(
        "[Landmass][Debug] score ranges",
        JSON.stringify({
            width,
            height,
            targetLandTiles,
            closenessLimit,
            boundaryBias,
            boundaryShareTarget,
            interiorNoiseWeight,
            interiorStretch,
            arcWeight,
            arcNoiseWeight,
            fractalGrain,
            useFractal,
            interior: {
                min: interiorMin,
                max: interiorMax,
                avg: Number((interiorSum / totalTiles).toFixed(2)),
            },
            arc: {
                min: arcMin,
                max: arcMax,
                avg: Number((arcSum / totalTiles).toFixed(2)),
            },
            land: {
                min: landMin,
                max: landMax,
                avg: Number((landSum / totalTiles).toFixed(2)),
            },
            probes: probeCounts,
        })
    );

    // Binary search threshold to hit target land count.
    let low = 0;
    let high = 255;
    let bestThreshold = 128;
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
        } else {
            high = mid - 1;
        }
    }

    // Ensure a minimum share of land within the high-closeness band near boundaries.
    const boundaryBand = (closenessArr, idx) => (closenessArr[idx] | 0) >= 90;
    const computeShares = (threshold) => {
        let land = 0, boundaryLand = 0, convergentLand = 0;
        for (let i = 0; i < size; i++) {
            const score = computeLandScore(i);
            const isLand = score >= threshold && closeness[i] <= closenessLimit;
            if (isLand) {
                land++;
                if (boundaryBand(closeness, i)) boundaryLand++;
                if (boundaryType[i] === BOUNDARY_TYPE.convergent) convergentLand++;
            }
        }
        return { land, boundaryLand, convergentLand };
    };

    let { land: landCount, boundaryLand } = computeShares(bestThreshold);
    const minBoundary = Math.round(targetLandTiles * boundaryShareTarget);
    if (boundaryLand < minBoundary) {
        const maxAllowedLand = Math.round(targetLandTiles * 1.5);
        let t = bestThreshold - 5;
        while (t >= 0) {
            const shares = computeShares(t);
            landCount = shares.land;
            boundaryLand = shares.boundaryLand;
            if (boundaryLand >= minBoundary) {
                bestThreshold = t;
                break;
            }
            if (landCount > maxAllowedLand) {
                break;
            }
            t -= 5;
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
            if (isLand) {
                if (boundaryType[idx] === BOUNDARY_TYPE.convergent) convergentLandCount++;
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
                if (boundaryType[idx] === BOUNDARY_TYPE.divergent) divergentOceanCount++;
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

    console.log(
        `[Landmass] Core-vs-boundary scoring: threshold=${bestThreshold}, land=${finalLandTiles}, convergentLand=${convergentLandCount}, divergentOcean=${divergentOceanCount}, boundaryShare=${boundaryLand}/${Math.round(
            targetLandTiles * boundaryShareTarget
        )}`
    );

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

function clamp01(value, fallback = 0) {
    if (!Number.isFinite(value))
        return fallback;
    if (value < 0)
        return 0;
    if (value > 1)
        return 1;
    return value;
}

function clampRange(value, fallback, min, max) {
    if (!Number.isFinite(value))
        return fallback;
    if (value < min)
        return min;
    if (value > max)
        return max;
    return value;
}

export default createPlateDrivenLandmasses;
