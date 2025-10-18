// @ts-nocheck
/**
 * Voronoi-based landmass generator adapter.
 */

import { VoronoiContinents } from "/base-standard/scripts/voronoi_maps/continents.js";
import { RuleAvoidEdge } from "/base-standard/scripts/voronoi_rules/avoid-edge.js";
import { TerrainType } from "/base-standard/scripts/voronoi-utils.js";
import * as globals from "/base-standard/maps/map-globals.js";
import { applyLandmassPostAdjustments } from "./landmass_utils.js";

/**
 * Run the official Voronoi continent simulation and return land windows for the Swooper pipeline.
 *
 * @param {number} width
 * @param {number} height
 * @param {import("../core/types.js").MapContext} ctx
 * @param {any} mapInfo
 */
export function generateVoronoiLandmasses(width, height, ctx, mapInfo, geometry) {
    if (!mapInfo) {
        return null;
    }
    try {
        const voronoi = new VoronoiContinents();
        voronoi.init(mapInfo.$index);
        const builder = voronoi.getBuilder();
        const generator = builder.getGenerator();
        const rules = generator.getRules();
        for (const ruleGroup of Object.values(rules)) {
            for (const rule of ruleGroup) {
                if (rule.name === RuleAvoidEdge.getName()) {
                    rule.configValues.poleDistance = globals.g_PolarWaterRows;
                }
            }
        }
        builder.simulate();
        const tiles = builder.getTiles();
        const landMask = new Uint8Array(width * height);
        const adapter = ctx && ctx.adapter;
        const landmassStats = new Map();
        for (let y = 0; y < tiles.length; y++) {
            const row = tiles[y];
            for (let x = 0; x < row.length; x++) {
                const tile = row[x];
                const idx = y * width + x;
                if (tile.isLand()) {
                    landMask[idx] = 1;
                    setTerrain(adapter, x, y, globals.g_FlatTerrain);
                    accumulateStats(landmassStats, tile.landmassId, x, y, width, height);
                }
                else {
                    const terrain = tile.terrainType === TerrainType.Ocean ? globals.g_OceanTerrain : globals.g_CoastTerrain;
                    setTerrain(adapter, x, y, terrain);
                }
            }
        }
        const rawWindows = buildWindows(landmassStats, width, height);
        const adjusted = applyLandmassPostAdjustments(rawWindows, geometry || {}, width, height);
        const startRegions = adjusted.length >= 2
            ? {
                westContinent: Object.assign({}, adjusted[0]),
                eastContinent: Object.assign({}, adjusted[adjusted.length - 1]),
            }
            : undefined;
        return {
            windows: adjusted,
            startRegions,
            landMask,
        };
    }
    catch (err) {
        console.log("[SWOOPER_MOD] Voronoi landmass generation failed:", err);
        return null;
    }
}

function setTerrain(adapter, x, y, terrain) {
    if (adapter && typeof adapter.setTerrainType === "function") {
        adapter.setTerrainType(x, y, terrain);
    }
    else {
        TerrainBuilder.setTerrainType(x, y, terrain);
    }
}

function accumulateStats(stats, landmassId, x, y, width, height) {
    if (landmassId == null || landmassId < 0)
        return;
    let record = stats.get(landmassId);
    if (!record) {
        record = {
            id: landmassId,
            minX: width,
            maxX: -1,
            minY: height,
            maxY: -1,
        };
        stats.set(landmassId, record);
    }
    if (x < record.minX)
        record.minX = x;
    if (x > record.maxX)
        record.maxX = x;
    if (y < record.minY)
        record.minY = y;
    if (y > record.maxY)
        record.maxY = y;
}

function buildWindows(stats, width, height) {
    const polarRows = globals.g_PolarWaterRows ?? 0;
    return Array.from(stats.values())
        .filter((s) => s.maxX >= s.minX && s.maxY >= s.minY)
        .sort((a, b) => a.minX - b.minX)
        .map((s, index) => ({
        west: clampInt(s.minX, 0, width - 1),
        east: clampInt(s.maxX, 0, width - 1),
        south: polarRows,
        north: height - polarRows,
        continent: index,
    }));
}

function clampInt(value, min, max) {
    if (value < min)
        return min;
    if (value > max)
        return max;
    return value;
}
