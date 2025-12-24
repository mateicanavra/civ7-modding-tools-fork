/**
 * Plot Tags — Adapter-aware plot tagging helpers
 *
 * Maintains plot tagging (land/water + east/west) using adapter-provided IDs.
 * Fallback constants are provided for tests and non-engine contexts only.
 */

import type { EngineAdapter, LandmassIdName, PlotTagName } from "@civ7/adapter";
import { OCEAN_TERRAIN } from "@mapgen/core/terrain-constants.js";

// ============================================================================
// Plot Tag Constants (fallbacks)
// ============================================================================

/**
 * Plot tag values used as fallbacks for tests.
 */
export const PLOT_TAG = {
  NONE: 0,
  LANDMASS: 1,
  WATER: 2,
  EAST_LANDMASS: 3,
  WEST_LANDMASS: 4,
  EAST_WATER: 5,
  WEST_WATER: 6,
  ISLAND: 7,
} as const;

export type PlotTagType = number;

export function resolvePlotTagIds(adapter: EngineAdapter): Record<PlotTagName, number> {
  return {
    NONE: adapter.getPlotTagId("NONE"),
    LANDMASS: adapter.getPlotTagId("LANDMASS"),
    WATER: adapter.getPlotTagId("WATER"),
    EAST_LANDMASS: adapter.getPlotTagId("EAST_LANDMASS"),
    WEST_LANDMASS: adapter.getPlotTagId("WEST_LANDMASS"),
    EAST_WATER: adapter.getPlotTagId("EAST_WATER"),
    WEST_WATER: adapter.getPlotTagId("WEST_WATER"),
    ISLAND: adapter.getPlotTagId("ISLAND"),
  };
}

// ============================================================================
// Terrain Type Constants (for land/water detection)
// ============================================================================

/**
 * Interface for terrain builder operations
 */
export interface TerrainBuilderLike {
  setPlotTag(x: number, y: number, tag: number): void;
  addPlotTag(x: number, y: number, tag: number): void;
}

/**
 * Options for addPlotTagIds function
 */
export interface AddPlotTagIdsOptions {
  /** Ocean terrain index (typically 0) */
  oceanTerrain: number;
  /** Coast terrain index (typically 1) */
  coastTerrain: number;
  /** TerrainBuilder interface for setting tags */
  terrainBuilder: TerrainBuilderLike;
}

// ============================================================================
// Plot Tagging Functions
// ============================================================================

/**
 * Add plot tags for land/water and east/west classification.
 *
 * This function iterates over all tiles and assigns appropriate plot tags
 * based on terrain type and position relative to the east continent boundary.
 *
 * @param height - Map height in tiles
 * @param width - Map width in tiles
 * @param eastContinentLeftCol - Column separating west/east landmasses
 * @param adapter - Engine adapter for terrain queries + plot tag IDs
 * @param options - Terrain constants and builder interface
 */
export function addPlotTagIds(
  height: number,
  width: number,
  eastContinentLeftCol: number,
  adapter: EngineAdapter,
  options: AddPlotTagIdsOptions
): void {
  const { oceanTerrain, coastTerrain, terrainBuilder } = options;
  const plotTags = resolvePlotTagIds(adapter);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Reset tags
      terrainBuilder.setPlotTag(x, y, plotTags.NONE);

      // Check if land (not ocean or coast)
      const terrain = adapter.getTerrainType(x, y);
      const isLand = terrain !== oceanTerrain && terrain !== coastTerrain;

      if (isLand) {
        terrainBuilder.addPlotTag(x, y, plotTags.LANDMASS);
        if (x >= eastContinentLeftCol) {
          terrainBuilder.addPlotTag(x, y, plotTags.EAST_LANDMASS);
        } else {
          terrainBuilder.addPlotTag(x, y, plotTags.WEST_LANDMASS);
        }
      } else {
        terrainBuilder.addPlotTag(x, y, plotTags.WATER);
        if (x >= eastContinentLeftCol - 1) {
          terrainBuilder.addPlotTag(x, y, plotTags.EAST_WATER);
        } else {
          terrainBuilder.addPlotTag(x, y, plotTags.WEST_WATER);
        }
      }
    }
  }
}

/**
 * Simplified addPlotTagIds that uses adapter's isWater method
 * instead of terrain type checks.
 */
export function addPlotTagIdsSimple(
  height: number,
  width: number,
  eastContinentLeftCol: number,
  adapter: EngineAdapter,
  terrainBuilder: TerrainBuilderLike
): void {
  const plotTags = resolvePlotTagIds(adapter);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      terrainBuilder.setPlotTag(x, y, plotTags.NONE);

      const isLand = !adapter.isWater(x, y);

      if (isLand) {
        terrainBuilder.addPlotTag(x, y, plotTags.LANDMASS);
        if (x >= eastContinentLeftCol) {
          terrainBuilder.addPlotTag(x, y, plotTags.EAST_LANDMASS);
        } else {
          terrainBuilder.addPlotTag(x, y, plotTags.WEST_LANDMASS);
        }
      } else {
        terrainBuilder.addPlotTag(x, y, plotTags.WATER);
        if (x >= eastContinentLeftCol - 1) {
          terrainBuilder.addPlotTag(x, y, plotTags.EAST_WATER);
        } else {
          terrainBuilder.addPlotTag(x, y, plotTags.WEST_WATER);
        }
      }
    }
  }
}

// ============================================================================
// Landmass Region ID Helpers
// ============================================================================

/**
 * Landmass region values used as fallbacks for tests.
 */
export const LANDMASS_ID = {
  NONE: 0,
  WEST: 2,
  EAST: 1,
  DEFAULT: 0,
  ANY: -1,
} as const;

export function resolveLandmassIds(adapter: EngineAdapter): Record<LandmassIdName, number> {
  return {
    NONE: adapter.getLandmassId("NONE"),
    WEST: adapter.getLandmassId("WEST"),
    EAST: adapter.getLandmassId("EAST"),
    DEFAULT: adapter.getLandmassId("DEFAULT"),
    ANY: adapter.getLandmassId("ANY"),
  };
}

/**
 * Continent bounds interface for markLandmassId
 */
export interface ContinentBoundsLike {
  west: number;
  east: number;
  south: number;
  north: number;
}

/**
 * Mark all non-ocean tiles in a continent with a specific region ID.
 *
 * This function MUST be called early in the map generation pipeline, BEFORE
 * validateAndFixTerrain/expandCoasts/recalculateAreas/stampContinents.
 * The vanilla StartPositioner.divideMapIntoMajorRegions() filters by this ID.
 *
 * @param continent - Bounds of the continent to mark
 * @param regionId - Region ID to assign (use resolveLandmassIds(adapter).WEST/EAST)
 * @param adapter - Engine adapter for terrain queries
 */
export function markLandmassId(
  continent: ContinentBoundsLike,
  regionId: number,
  adapter: EngineAdapter
): number {
  // OCEAN_TERRAIN imported from shared terrain-constants module
  // CORRECT terrain.xml order: 0:MOUNTAIN, 1:HILL, 2:FLAT, 3:COAST, 4:OCEAN
  let markedCount = 0;

  for (let y = continent.south; y <= continent.north; y++) {
    for (let x = continent.west; x <= continent.east; x++) {
      if (adapter.getTerrainType(x, y) !== OCEAN_TERRAIN) {
        adapter.setLandmassId(x, y, regionId);
        markedCount++;
      }
    }
  }

  return markedCount;
}
