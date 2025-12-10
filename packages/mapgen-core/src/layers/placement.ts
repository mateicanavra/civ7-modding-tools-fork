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
 *   import { runPlacement } from "./layers/placement.js";
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
import type {
  PlacementConfig,
  FloodplainsConfig,
  ContinentBounds,
  StartsConfig,
} from "../bootstrap/types.js";

import { getTunables } from "../bootstrap/tunables.js";

// Terrain type constants - imported from shared module
// CORRECT terrain.xml order: 0:MOUNTAIN, 1:HILL, 2:FLAT, 3:COAST, 4:OCEAN
import {
  MOUNTAIN_TERRAIN,
  HILL_TERRAIN,
  getTerrainSymbol,
} from "../core/terrain-constants.js";

// Re-export config types
export type {
  PlacementConfig,
  FloodplainsConfig,
  ContinentBounds,
  StartsConfig,
} from "../bootstrap/types.js";

// ============================================================================
// Types
// ============================================================================

/** Map info from GameInfo.Maps lookup */
interface MapInfo {
  NumNaturalWonders?: number;
  [key: string]: unknown;
}

/** Options for runPlacement */
export interface PlacementOptions {
  /** GameInfo.Maps row (used to derive defaults) */
  mapInfo?: MapInfo;
  /** Whether to add +1 to map default wonders */
  wondersPlusOne?: boolean;
  /** Floodplains config (defaults: {minLength: 4, maxLength: 10}) */
  floodplains?: FloodplainsConfig;
  /** Start placement inputs */
  starts?: StartsConfig;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Compute the number of natural wonders to place.
 * Default behavior mirrors the main script: +1 vs map defaults (but never below default).
 */
function resolveNaturalWonderCount(mapInfo: MapInfo | undefined, wondersPlusOne: boolean): number {
  if (!mapInfo || typeof mapInfo.NumNaturalWonders !== "number") {
    return 1;
  }
  if (wondersPlusOne) {
    return Math.max(mapInfo.NumNaturalWonders + 1, mapInfo.NumNaturalWonders);
  }
  return mapInfo.NumNaturalWonders;
}

/**
 * Get placement config from tunables, if available.
 */
function getPlacementConfig(): PlacementConfig {
  try {
    const tunables = getTunables();
    const foundationCfg = tunables.FOUNDATION_CFG;
    if (foundationCfg && typeof foundationCfg === "object" && "placement" in foundationCfg) {
      return (foundationCfg as { placement?: PlacementConfig }).placement || {};
    }
  } catch {
    // Tunables not available
  }
  return {};
}

function logTerrainStats(
  adapter: EngineAdapter,
  width: number,
  height: number,
  stage: string
): void {
  let flat = 0;
  let hill = 0;
  let mtn = 0;
  let water = 0;
  const total = width * height;

  // CORRECT terrain.xml order: 0:MOUNTAIN, 1:HILL, 2:FLAT, 3:COAST, 4:OCEAN
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (adapter.isWater(x, y)) {
        water++;
        continue;
      }
      const t = adapter.getTerrainType(x, y);
      if (t === MOUNTAIN_TERRAIN) mtn++;
      else if (t === HILL_TERRAIN) hill++;
      else flat++;
    }
  }

  const land = Math.max(1, flat + hill + mtn);
  console.log(`[Placement] Stats (${stage}):`);
  console.log(`  Water: ${((water / total) * 100).toFixed(1)}%`);
  console.log(`  Land:  ${((land / total) * 100).toFixed(1)}% (${land} tiles)`);
  console.log(`    Mtn:  ${((mtn / land) * 100).toFixed(1)}%`);
  console.log(`    Hill: ${((hill / land) * 100).toFixed(1)}%`);
  console.log(`    Flat: ${((flat / land) * 100).toFixed(1)}%`);
}

function logAsciiMap(adapter: EngineAdapter, width: number, height: number): void {
  console.log("[Placement] Final Map ASCII:");
  // CORRECT terrain.xml order: 0:MOUNTAIN, 1:HILL, 2:FLAT, 3:COAST, 4:OCEAN
  // Using getTerrainSymbol() from terrain-constants for correct mapping

  for (let y = height - 1; y >= 0; y--) {
    let row = "";
    if (y % 2 !== 0) row += " ";
    for (let x = 0; x < width; x++) {
      const t = adapter.getTerrainType(x, y);
      row += getTerrainSymbol(t) + " ";
    }
    console.log(row);
  }
}

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
  const placementCfg = getPlacementConfig();
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
    const wonders = resolveNaturalWonderCount(mapInfo, useWondersPlusOne);
    adapter.addNaturalWonders(iWidth, iHeight, wonders);
  } catch (err) {
    console.log("[Placement] addNaturalWonders failed:", err);
  }

  // 2) Floodplains
  try {
    const floodplainsCfg = floodplains || placementCfg.floodplains || {};
    const minLen = typeof floodplainsCfg.minLength === "number" ? floodplainsCfg.minLength : 4;
    const maxLen = typeof floodplainsCfg.maxLength === "number" ? floodplainsCfg.maxLength : 10;
    adapter.addFloodplains(minLen, maxLen);
  } catch (err) {
    console.log("[Placement] addFloodplains failed:", err);
  }

  // 3) Validate and fix terrain (matches vanilla order before recalculateAreas)
  try {
    adapter.validateAndFixTerrain();
    console.log("[Placement] Terrain validated successfully");
    logTerrainStats(adapter, iWidth, iHeight, "After validateAndFixTerrain");
  } catch (err) {
    console.log("[Placement] validateAndFixTerrain failed:", err);
  }

  // 4) Area recalculation (after terrain validation)
  try {
    adapter.recalculateAreas();
    console.log("[Placement] Areas recalculated successfully");
  } catch (err) {
    console.log("[Placement] AreaBuilder.recalculateAreas failed:", err);
  }

  // 5) Store water data (CRITICAL for start position scoring)
  // This must happen BEFORE generateSnow and generateResources per vanilla order.
  // Without this, the StartPositioner may not have valid water data for scoring.
  try {
    adapter.storeWaterData();
    console.log("[Placement] Water data stored successfully");
  } catch (err) {
    console.log("[Placement] storeWaterData failed:", err);
  }

  // 6) Snow (after water data is stored)
  try {
    adapter.generateSnow(iWidth, iHeight);
  } catch (err) {
    console.log("[Placement] generateSnow failed:", err);
  }

  // 7) Resources (after snow, before start positions)
  try {
    adapter.generateResources(iWidth, iHeight);
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
      const {
        playersLandmass1,
        playersLandmass2,
        westContinent,
        eastContinent,
        startSectorRows,
        startSectorCols,
        startSectors,
      } = starts;

      // DIAGNOSTIC LOGGING - Start placement parameters
      const totalPlayers = playersLandmass1 + playersLandmass2;
      console.log(`[START_DEBUG] === Beginning Start Placement ===`);
      console.log(
        `[START_DEBUG] Players: ${totalPlayers} total (${playersLandmass1} landmass1, ${playersLandmass2} landmass2)`
      );
      console.log(
        `[START_DEBUG] Continents: west=${JSON.stringify(westContinent)}, east=${JSON.stringify(eastContinent)}`
      );
      console.log(
        `[START_DEBUG] Sectors: ${startSectorRows}x${startSectorCols} grid, ${startSectors.length} sectors chosen`
      );

      const pos = adapter.assignStartPositions(
        playersLandmass1,
        playersLandmass2,
        westContinent,
        eastContinent,
        startSectorRows,
        startSectorCols,
        startSectors as number[]
      );

      // DIAGNOSTIC LOGGING - Placement results
      const successCount = pos ? pos.filter((p) => p !== undefined && p >= 0).length : 0;
      console.log(
        `[START_DEBUG] Result: ${successCount}/${totalPlayers} civilizations placed successfully`
      );
      if (successCount < totalPlayers) {
        console.log(
          `[START_DEBUG] WARNING: ${totalPlayers - successCount} civilizations failed to find valid start locations!`
        );
      }
      console.log(`[START_DEBUG] === End Start Placement ===`);

      if (Array.isArray(pos)) {
        startPositions.push(...pos);
      }
      if (successCount === totalPlayers) {
        console.log("[Placement] Start positions assigned successfully");
      } else {
        console.log(
          `[Placement] Start positions assignment incomplete: ${totalPlayers - successCount} failures`
        );
      }
    }
  } catch (err) {
    console.log("[Placement] assignStartPositions failed:", err);
  }

  // 9) Discoveries (post-starts to seed exploration)
  try {
    adapter.generateDiscoveries(iWidth, iHeight, startPositions);
    console.log("[Placement] Discoveries generated successfully");
  } catch (err) {
    console.log("[Placement] generateDiscoveries failed:", err);
  }

  // 10) Fertility recalculation (AFTER starts, matching vanilla order)
  // Must be after features are added per vanilla comment
  try {
    adapter.recalculateFertility();
    console.log("[Placement] Fertility recalculated successfully");
  } catch (err) {
    console.log("[Placement] FertilityBuilder.recalculate failed:", err);
  }

  // 11) Advanced Start regions
  try {
    adapter.assignAdvancedStartRegions();
  } catch (err) {
    console.log("[Placement] assignAdvancedStartRegions failed:", err);
  }

  logTerrainStats(adapter, iWidth, iHeight, "Final");
  logAsciiMap(adapter, iWidth, iHeight);

  return startPositions;
}

export default runPlacement;
