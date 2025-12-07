/**
 * Plot Tags — Engine-independent plot tagging helpers
 *
 * Maintains plot tagging (land/water + east/west) independently of Civ7 updates.
 * Uses adapter pattern to work without direct engine dependencies.
 */

import type { EngineAdapter } from "@civ7/adapter";

// ============================================================================
// Plot Tag Constants
// ============================================================================

/**
 * Plot tag types matching the engine's PlotTags enum
 */
export const PLOT_TAG = {
  NONE: 0,
  LANDMASS: 1,
  WATER: 2,
  EAST_LANDMASS: 3,
  WEST_LANDMASS: 4,
  EAST_WATER: 5,
  WEST_WATER: 6,
} as const;

export type PlotTagType = (typeof PLOT_TAG)[keyof typeof PLOT_TAG];

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
 * Options for addPlotTags function
 */
export interface AddPlotTagsOptions {
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
 * @param adapter - Engine adapter for terrain queries
 * @param options - Terrain constants and builder interface
 */
export function addPlotTags(
  height: number,
  width: number,
  eastContinentLeftCol: number,
  adapter: EngineAdapter,
  options: AddPlotTagsOptions
): void {
  const { oceanTerrain, coastTerrain, terrainBuilder } = options;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Reset tags
      terrainBuilder.setPlotTag(x, y, PLOT_TAG.NONE);

      // Check if land (not ocean or coast)
      const terrain = adapter.getTerrainType(x, y);
      const isLand = terrain !== oceanTerrain && terrain !== coastTerrain;

      if (isLand) {
        terrainBuilder.addPlotTag(x, y, PLOT_TAG.LANDMASS);
        if (x >= eastContinentLeftCol) {
          terrainBuilder.addPlotTag(x, y, PLOT_TAG.EAST_LANDMASS);
        } else {
          terrainBuilder.addPlotTag(x, y, PLOT_TAG.WEST_LANDMASS);
        }
      } else {
        terrainBuilder.addPlotTag(x, y, PLOT_TAG.WATER);
        if (x >= eastContinentLeftCol - 1) {
          terrainBuilder.addPlotTag(x, y, PLOT_TAG.EAST_WATER);
        } else {
          terrainBuilder.addPlotTag(x, y, PLOT_TAG.WEST_WATER);
        }
      }
    }
  }
}

/**
 * Simplified addPlotTags that uses adapter's isWater method
 * instead of terrain type checks.
 */
export function addPlotTagsSimple(
  height: number,
  width: number,
  eastContinentLeftCol: number,
  adapter: EngineAdapter,
  terrainBuilder: TerrainBuilderLike
): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      terrainBuilder.setPlotTag(x, y, PLOT_TAG.NONE);

      const isLand = !adapter.isWater(x, y);

      if (isLand) {
        terrainBuilder.addPlotTag(x, y, PLOT_TAG.LANDMASS);
        if (x >= eastContinentLeftCol) {
          terrainBuilder.addPlotTag(x, y, PLOT_TAG.EAST_LANDMASS);
        } else {
          terrainBuilder.addPlotTag(x, y, PLOT_TAG.WEST_LANDMASS);
        }
      } else {
        terrainBuilder.addPlotTag(x, y, PLOT_TAG.WATER);
        if (x >= eastContinentLeftCol - 1) {
          terrainBuilder.addPlotTag(x, y, PLOT_TAG.EAST_WATER);
        } else {
          terrainBuilder.addPlotTag(x, y, PLOT_TAG.WEST_WATER);
        }
      }
    }
  }
}
