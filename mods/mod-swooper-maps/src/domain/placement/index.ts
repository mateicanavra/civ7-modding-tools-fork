/**
 * Placement Layer — Wonders, Floodplains, Resources, Starts, Discoveries, Fertility, Advanced Start
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
  const trace = options.trace ?? null;
  const emit = (payload: Record<string, unknown>): void => {
    if (!trace?.isVerbose) return;
    trace.event(() => payload);
  };

  emit({ type: "placement.start", message: "[SWOOPER_MOD] === runPlacement() CALLED ===" });
  emit({ type: "placement.start", message: `[SWOOPER_MOD] Map size: ${iWidth}x${iHeight}` });

  logTerrainStats(trace, adapter, iWidth, iHeight, "Initial");

  const { mapInfo, wondersPlusOne, floodplains, starts } = options;
  const placementCfg = options.placementConfig ?? {};
  const startPositions: number[] = [];

  // =========================================================================
  // Vanilla continents.js order (after features):
  //   addNaturalWonders → addFloodplains → addFeatures → validateAndFixTerrain →
  //   recalculateAreas → storeWaterData → generateResources →
  //   assignStartPositions → generateDiscoveries → FertilityBuilder.recalculate
  //
  // IMPORTANT: Region IDs are already set early in landmassPlates stage.
  // The vanilla algorithm now filters by region IDs rather than plot tags.
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
    emit({ type: "placement.wonders.error", error: err instanceof Error ? err.message : String(err) });
  }

  // 2) Floodplains
  try {
    const floodplainsCfg = floodplains || placementCfg.floodplains || {};
    applyFloodplains(adapter, floodplainsCfg as FloodplainsConfig);
  } catch (err) {
    emit({ type: "placement.floodplains.error", error: err instanceof Error ? err.message : String(err) });
  }

  // 3) Validate and fix terrain (matches vanilla order before recalculateAreas)
  try {
    validateAndFixTerrain(adapter);
    emit({ type: "placement.terrain.validated" });
    logTerrainStats(trace, adapter, iWidth, iHeight, "After validateAndFixTerrain");
  } catch (err) {
    emit({
      type: "placement.terrain.error",
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 4) Area recalculation (after terrain validation)
  try {
    recalculateAreas(adapter);
    emit({ type: "placement.areas.recalculated" });
  } catch (err) {
    emit({
      type: "placement.areas.error",
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 5) Store water data (CRITICAL for start position scoring)
  // This must happen BEFORE generateResources per vanilla order.
  // Without this, the StartPositioner may not have valid water data for scoring.
  try {
    storeWaterData(adapter);
    emit({ type: "placement.water.stored" });
  } catch (err) {
    emit({
      type: "placement.water.error",
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 6) Resources (after water data, before start positions)
  try {
    generateResources(adapter, iWidth, iHeight);
  } catch (err) {
    emit({
      type: "placement.resources.error",
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // NOTE: Region IDs are already set early in landmassPlates stage.
  // The vanilla StartPositioner.divideMapIntoMajorRegions() now uses region IDs.
  // Do NOT mark them again here - that causes inconsistency with the early marking.

  // 8) Start positions (vanilla-compatible)
  try {
    if (!starts) {
      emit({ type: "placement.starts.skipped", reason: "no starts config provided" });
    } else {
      const pos = applyStartPositions(adapter, starts, trace);
      startPositions.push(...pos);

      const totalPlayers = starts.playersLandmass1 + starts.playersLandmass2;
      const successCount = pos.filter((p) => p !== undefined && p >= 0).length;

      if (successCount === totalPlayers) {
        emit({ type: "placement.starts.assigned", successCount, totalPlayers });
      } else {
        emit({
          type: "placement.starts.partial",
          successCount,
          totalPlayers,
          failures: Math.max(0, totalPlayers - successCount),
        });
      }
    }
  } catch (err) {
    emit({
      type: "placement.starts.error",
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 9) Discoveries (post-starts to seed exploration)
  try {
    applyDiscoveries(adapter, iWidth, iHeight, startPositions);
    emit({ type: "placement.discoveries.applied" });
  } catch (err) {
    emit({
      type: "placement.discoveries.error",
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 10) Fertility recalculation (AFTER starts, matching vanilla order)
  // Must be after features are added per vanilla comment
  try {
    applyFertilityRecalc(adapter);
    emit({ type: "placement.fertility.recalculated" });
  } catch (err) {
    emit({
      type: "placement.fertility.error",
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 11) Advanced Start regions
  try {
    applyAdvancedStartRegions(adapter);
  } catch (err) {
    emit({
      type: "placement.advancedStart.error",
      error: err instanceof Error ? err.message : String(err),
    });
  }

  logTerrainStats(trace, adapter, iWidth, iHeight, "Final");
  logAsciiMap(trace, adapter, iWidth, iHeight);

  return startPositions;
}

export default runPlacement;
