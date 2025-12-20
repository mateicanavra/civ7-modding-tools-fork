/**
 * Placement Layer — Wonders, Floodplains, Snow, Resources, Starts, Discoveries, Fertility, Advanced Start
 *
 * @packageDocumentation
 */

/**
 * Purpose:
 * - Encapsulate all late-stage placement and finalization passes into a single, reusable function.
 * - Keep behavior compatible with the existing pipeline while enabling clean orchestration.
 *
 * Responsibilities:
 * - Natural wonders (+1 vs. map defaults unless overridden)
 * - Floodplains
 * - Snow generation
 * - Resources
 * - Start position assignment (vanilla-compatible)
 * - Discoveries (post-starts to seed exploration)
 * - Fertility recalculation
 * - Advanced start region assignment
 *
 * Usage:
 *   import { runPlacement } from "@mapgen/domain/placement/domain/placement/index.js";
 *   const startPositions = runPlacement(adapter, iWidth, iHeight, {
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
 * Notes:
 * - All external engine/module calls go through the EngineAdapter.
 * - Returns the computed startPositions array for downstream consumers (e.g., discoveries).
 */

import type { EngineAdapter } from "@civ7/adapter";
import type { FloodplainsConfig, PlacementOptions } from "@mapgen/domain/placement/types.js";
import { logAsciiMap, logTerrainStats } from "@mapgen/domain/placement/diagnostics.js";
import { applyNaturalWonders } from "@mapgen/domain/placement/wonders.js";
import { applyFloodplains } from "@mapgen/domain/placement/floodplains.js";
import { validateAndFixTerrain } from "@mapgen/domain/placement/terrain-validation.js";
import { recalculateAreas } from "@mapgen/domain/placement/areas.js";
import { storeWaterData } from "@mapgen/domain/placement/water-data.js";
import { generateSnow } from "@mapgen/domain/placement/snow.js";
import { generateResources } from "@mapgen/domain/placement/resources.js";
import { applyStartPositions } from "@mapgen/domain/placement/starts.js";
import { applyDiscoveries } from "@mapgen/domain/placement/discoveries.js";
import { applyFertilityRecalc } from "@mapgen/domain/placement/fertility.js";
import { applyAdvancedStartRegions } from "@mapgen/domain/placement/advanced-start.js";

export type {
  ContinentBounds,
  FloodplainsConfig,
  MapInfo,
  PlacementConfig,
  PlacementOptions,
  StartsConfig,
} from "@mapgen/domain/placement/types.js";

// ============================================================================
// ============================================================================
// Main Function
// ============================================================================

/**
 * Run late-stage placement and finalization passes.
 *
 * @param adapter - Engine adapter for all engine interactions
 * @param iWidth - Map width
 * @param iHeight - Map height
 * @param options - Placement options
 * @returns startPositions array for downstream consumers
 */
export function runPlacement(
  adapter: EngineAdapter,
  iWidth: number,
  iHeight: number,
  options: PlacementOptions = {}
): number[] {
  console.log("[SWOOPER_MOD] === runPlacement() CALLED ===");
  console.log(`[SWOOPER_MOD] Map size: ${iWidth}x${iHeight}`);

  logTerrainStats(adapter, iWidth, iHeight, "Initial");

  const { mapInfo, wondersPlusOne, floodplains, starts } = options;
  const placementCfg = options.placementConfig ?? {};
  const startPositions: number[] = [];

  // =========================================================================
  // Vanilla continents.js order (after features):
  //   addNaturalWonders → addFloodplains → addFeatures → validateAndFixTerrain →
  //   recalculateAreas → storeWaterData → generateSnow → generateResources →
  //   assignStartPositions → generateDiscoveries → FertilityBuilder.recalculate
  //
  // IMPORTANT: LandmassRegionId is already set early in landmassPlates stage.
  // PlotTags LANDMASS/WATER/EAST_LANDMASS/WEST_LANDMASS no longer exist in the engine.
  // The vanilla algorithm now uses LandmassRegion IDs for filtering, not PlotTags.
  // =========================================================================

  // 1) Natural Wonders
  try {
    const useWondersPlusOne =
      typeof wondersPlusOne === "boolean"
        ? wondersPlusOne
        : typeof placementCfg.wondersPlusOne === "boolean"
          ? placementCfg.wondersPlusOne
          : true;
    applyNaturalWonders(adapter, iWidth, iHeight, mapInfo, useWondersPlusOne);
  } catch (err) {
    console.log("[Placement] addNaturalWonders failed:", err);
  }

  // 2) Floodplains
  try {
    const floodplainsCfg = floodplains || placementCfg.floodplains || {};
    applyFloodplains(adapter, floodplainsCfg as FloodplainsConfig);
  } catch (err) {
    console.log("[Placement] addFloodplains failed:", err);
  }

  // 3) Validate and fix terrain (matches vanilla order before recalculateAreas)
  try {
    validateAndFixTerrain(adapter);
    console.log("[Placement] Terrain validated successfully");
    logTerrainStats(adapter, iWidth, iHeight, "After validateAndFixTerrain");
  } catch (err) {
    console.log("[Placement] validateAndFixTerrain failed:", err);
  }

  // 4) Area recalculation (after terrain validation)
  try {
    recalculateAreas(adapter);
    console.log("[Placement] Areas recalculated successfully");
  } catch (err) {
    console.log("[Placement] AreaBuilder.recalculateAreas failed:", err);
  }

  // 5) Store water data (CRITICAL for start position scoring)
  // This must happen BEFORE generateSnow and generateResources per vanilla order.
  // Without this, the StartPositioner may not have valid water data for scoring.
  try {
    storeWaterData(adapter);
    console.log("[Placement] Water data stored successfully");
  } catch (err) {
    console.log("[Placement] storeWaterData failed:", err);
  }

  // 6) Snow (after water data is stored)
  try {
    generateSnow(adapter, iWidth, iHeight);
  } catch (err) {
    console.log("[Placement] generateSnow failed:", err);
  }

  // 7) Resources (after snow, before start positions)
  try {
    generateResources(adapter, iWidth, iHeight);
  } catch (err) {
    console.log("[Placement] generateResources failed:", err);
  }

  // NOTE: LandmassRegionId is already set early in landmassPlates stage.
  // PlotTags (LANDMASS, WATER, EAST_LANDMASS, WEST_LANDMASS) no longer exist in Civ7.
  // The vanilla StartPositioner.divideMapIntoMajorRegions() now uses LandmassRegion IDs.
  // Do NOT mark them again here - that causes inconsistency with the early marking.

  // 8) Start positions (vanilla-compatible)
  try {
    if (!starts) {
      console.log("[Placement] Start placement skipped (no starts config provided).");
    } else {
      const pos = applyStartPositions(adapter, starts);
      startPositions.push(...pos);

      const totalPlayers = starts.playersLandmass1 + starts.playersLandmass2;
      const successCount = pos.filter((p) => p !== undefined && p >= 0).length;

      if (successCount === totalPlayers) {
        console.log("[Placement] Start positions assigned successfully");
      } else {
        console.log(`[Placement] Start positions assignment incomplete: ${totalPlayers - successCount} failures`);
      }
    }
  } catch (err) {
    console.log("[Placement] assignStartPositions failed:", err);
  }

  // 9) Discoveries (post-starts to seed exploration)
  try {
    applyDiscoveries(adapter, iWidth, iHeight, startPositions);
    console.log("[Placement] Discoveries generated successfully");
  } catch (err) {
    console.log("[Placement] generateDiscoveries failed:", err);
  }

  // 10) Fertility recalculation (AFTER starts, matching vanilla order)
  // Must be after features are added per vanilla comment
  try {
    applyFertilityRecalc(adapter);
    console.log("[Placement] Fertility recalculated successfully");
  } catch (err) {
    console.log("[Placement] FertilityBuilder.recalculate failed:", err);
  }

  // 11) Advanced Start regions
  try {
    applyAdvancedStartRegions(adapter);
  } catch (err) {
    console.log("[Placement] assignAdvancedStartRegions failed:", err);
  }

  logTerrainStats(adapter, iWidth, iHeight, "Final");
  logAsciiMap(adapter, iWidth, iHeight);

  return startPositions;
}

export default runPlacement;
