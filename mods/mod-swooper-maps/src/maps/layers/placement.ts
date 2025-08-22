// @ts-nocheck
/**
 * Placement Layer — Wonders, Floodplains, Snow, Resources, Starts, Discoveries, Fertility, Advanced Start
 *
 * Purpose
 * - Encapsulate all late-stage placement and finalization passes into a single, reusable function.
 * - Keep behavior compatible with the existing pipeline while enabling clean orchestration.
 *
 * Responsibilities
 * - Natural wonders (+1 vs. map defaults unless overridden)
 * - Floodplains
 * - Snow generation
 * - Resources
 * - Start position assignment (vanilla-compatible)
 * - Discoveries (post-starts to seed exploration)
 * - Fertility recalculation
 * - Advanced start region assignment
 *
 * Usage
 *   import { runPlacement } from "./layers/placement.js";
 *   const startPositions = runPlacement(iWidth, iHeight, {
 *     mapInfo,
 *     wondersPlusOne: true, // default true
 *     floodplains: { minLength: 4, maxLength: 10 },
 *     starts: {
 *       playersLandmass1, playersLandmass2,
 *       westContinent, eastContinent,
 *       startSectorRows, startSectorCols,
 *       startSectors
 *     }
 *   });
 *
 * Notes
 * - All external engine/module calls are wrapped in light defensive try/catch where sensible.
 * - Returns the computed startPositions array for downstream consumers (e.g., discoveries).
 */

import { addNaturalWonders } from "/base-standard/maps/natural-wonder-generator.js";
import { generateResources } from "/base-standard/maps/resource-generator.js";
import { assignAdvancedStartRegions } from "/base-standard/maps/assign-advanced-start-region.js";
import { generateDiscoveries } from "/base-standard/maps/discovery-generator.js";
import { generateSnow } from "/base-standard/maps/snow-generator.js";
import { assignStartPositions } from "/base-standard/maps/assign-starting-plots.js";
import { PLACEMENT_CFG } from "../config/tunables.js";

/**
 * Compute the number of natural wonders to place.
 * Default behavior mirrors the main script: +1 vs map defaults (but never below default).
 * @param {any} mapInfo
 * @param {boolean} wondersPlusOne
 * @returns {number}
 */
function resolveNaturalWonderCount(mapInfo, wondersPlusOne = true) {
    if (!mapInfo || typeof mapInfo.NumNaturalWonders !== "number") {
        return 1;
    }
    if (wondersPlusOne) {
        return Math.max(
            mapInfo.NumNaturalWonders + 1,
            mapInfo.NumNaturalWonders,
        );
    }
    return mapInfo.NumNaturalWonders;
}

/**
 * Run late-stage placement and finalization passes.
 * @param {number} iWidth
 * @param {number} iHeight
 * @param {object} params
 * @param {any} params.mapInfo - GameInfo.Maps row (used to derive defaults).
 * @param {boolean} [params.wondersPlusOne=true] - Whether to add +1 to map default wonders.
 * @param {{minLength:number,maxLength:number}} [params.floodplains] - Floodplains config (defaults: {4, 10}).
 * @param {object} params.starts - Start placement inputs.
 * @param {number} params.starts.playersLandmass1
 * @param {number} params.starts.playersLandmass2
 * @param {{west:number,east:number,south:number,north:number,continent:number}} params.starts.westContinent
 * @param {{west:number,east:number,south:number,north:number,continent:number}} params.starts.eastContinent
 * @param {number} params.starts.startSectorRows
 * @param {number} params.starts.startSectorCols
 * @param {Array<any>} params.starts.startSectors
 * @returns {Array<any>} startPositions
 */
export function runPlacement(
    iWidth,
    iHeight,
    {
        mapInfo,
        wondersPlusOne = true,
        floodplains = { minLength: 4, maxLength: 10 },
        starts,
    } = {},
) {
    const startPositions = [];

    // 1) Natural Wonders
    try {
        const wonders = resolveNaturalWonderCount(
            mapInfo,
            typeof wondersPlusOne === "boolean"
                ? wondersPlusOne
                : PLACEMENT_CFG &&
                    typeof PLACEMENT_CFG.wondersPlusOne === "boolean"
                  ? PLACEMENT_CFG.wondersPlusOne
                  : true,
        );
        addNaturalWonders(iWidth, iHeight, wonders);
    } catch (err) {
        console.log("[Placement] addNaturalWonders failed:", err);
    }

    // 2) Floodplains
    try {
        const minLen =
            floodplains && typeof floodplains.minLength === "number"
                ? floodplains.minLength
                : PLACEMENT_CFG &&
                    PLACEMENT_CFG.floodplains &&
                    typeof PLACEMENT_CFG.floodplains.minLength === "number"
                  ? PLACEMENT_CFG.floodplains.minLength
                  : 4;
        const maxLen =
            floodplains && typeof floodplains.maxLength === "number"
                ? floodplains.maxLength
                : PLACEMENT_CFG &&
                    PLACEMENT_CFG.floodplains &&
                    typeof PLACEMENT_CFG.floodplains.maxLength === "number"
                  ? PLACEMENT_CFG.floodplains.maxLength
                  : 10;
        TerrainBuilder.addFloodplains(minLen, maxLen);
    } catch (err) {
        console.log("[Placement] addFloodplains failed:", err);
    }

    // 3) Snow (post-water/terrain stabilization)
    try {
        generateSnow(iWidth, iHeight);
    } catch (err) {
        console.log("[Placement] generateSnow failed:", err);
    }

    // 4) Resources (after snow)
    try {
        generateResources(iWidth, iHeight);
    } catch (err) {
        console.log("[Placement] generateResources failed:", err);
    }

    // 5) Start positions (vanilla-compatible)
    try {
        if (!starts) {
            console.log(
                "[Placement] Start placement skipped (no starts config provided).",
            );
        } else {
            const {
                playersLandmass1,
                playersLandmass2,
                westContinent,
                eastContinent,
                startSectorRows,
                startSectorCols,
                startSectors,
            } = starts;

            const pos = assignStartPositions(
                playersLandmass1,
                playersLandmass2,
                westContinent,
                eastContinent,
                startSectorRows,
                startSectorCols,
                startSectors,
            );
            if (Array.isArray(pos)) {
                startPositions.push(...pos);
            }
            console.log("[Placement] Start positions assigned successfully");
        }
    } catch (err) {
        console.log("[Placement] assignStartPositions failed:", err);
    }

    // 6) Discoveries (post-starts to seed exploration)
    try {
        generateDiscoveries(iWidth, iHeight, startPositions);
        console.log("[Placement] Discoveries generated successfully");
    } catch (err) {
        console.log("[Placement] generateDiscoveries failed:", err);
    }

    // 7) Fertility + Advanced Start
    try {
        FertilityBuilder.recalculate();
    } catch (err) {
        console.log("[Placement] FertilityBuilder.recalculate failed:", err);
    }

    try {
        assignAdvancedStartRegions();
    } catch (err) {
        console.log("[Placement] assignAdvancedStartRegions failed:", err);
    }

    return startPositions;
}

export default runPlacement;
