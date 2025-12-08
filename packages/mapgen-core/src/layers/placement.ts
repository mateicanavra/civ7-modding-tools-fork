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

// Re-export config types
export type { PlacementConfig, FloodplainsConfig, ContinentBounds, StartsConfig };

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

  const { mapInfo, wondersPlusOne, floodplains, starts } = options;
  const placementCfg = getPlacementConfig();
  const startPositions: number[] = [];

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
    const minLen =
      typeof floodplainsCfg.minLength === "number" ? floodplainsCfg.minLength : 4;
    const maxLen =
      typeof floodplainsCfg.maxLength === "number" ? floodplainsCfg.maxLength : 10;
    adapter.addFloodplains(minLen, maxLen);
  } catch (err) {
    console.log("[Placement] addFloodplains failed:", err);
  }

  // 3) Snow (post-water/terrain stabilization)
  try {
    adapter.generateSnow(iWidth, iHeight);
  } catch (err) {
    console.log("[Placement] generateSnow failed:", err);
  }

  // 4) Resources (after snow)
  try {
    adapter.generateResources(iWidth, iHeight);
  } catch (err) {
    console.log("[Placement] generateResources failed:", err);
  }

  // 5) Start positions (vanilla-compatible)
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

  // 6) Discoveries (post-starts to seed exploration)
  try {
    adapter.generateDiscoveries(iWidth, iHeight, startPositions);
    console.log("[Placement] Discoveries generated successfully");
  } catch (err) {
    console.log("[Placement] generateDiscoveries failed:", err);
  }

  // 7) Fertility + Advanced Start
  try {
    adapter.recalculateFertility();
  } catch (err) {
    console.log("[Placement] FertilityBuilder.recalculate failed:", err);
  }
  try {
    adapter.assignAdvancedStartRegions();
  } catch (err) {
    console.log("[Placement] assignAdvancedStartRegions failed:", err);
  }

  return startPositions;
}

export default runPlacement;
