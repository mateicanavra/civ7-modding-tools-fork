/**
 * Plot Tags — Engine-aware plot tagging helpers
 *
 * Maintains plot tagging (land/water + east/west) using the engine's PlotTags enum.
 * Falls back to hardcoded values only in test environments where PlotTags is unavailable.
 *
 * IMPORTANT: The engine's PlotTags enum values must be used at runtime for compatibility
 * with vanilla start position algorithms that filter by these tags.
 */

import type { EngineAdapter } from "@civ7/adapter";

// ============================================================================
// Plot Tag Constants
// ============================================================================

/**
 * Get plot tag value from engine's PlotTags global, with fallback for testing.
 *
 * The engine's PlotTags enum is the source of truth. Hardcoded fallbacks are
 * provided only for test environments where the engine globals aren't available.
 */
function getPlotTagValue(name: string, fallback: number): number {
  // Try to get from engine's PlotTags global
  if (typeof PlotTags !== "undefined") {
    const engineValue = (PlotTags as Record<string, number>)[`PLOT_TAG_${name}`];
    if (typeof engineValue === "number") {
      return engineValue;
    }
  }
  // Fallback for testing environments
  return fallback;
}

// One-time debug logging when first accessed
let _plotTagsLogged = false;
function logPlotTagsOnce(): void {
  if (_plotTagsLogged) return;
  _plotTagsLogged = true;

  const hasPlotTags = typeof PlotTags !== "undefined";
  console.log(`[PlotTags] Engine PlotTags available: ${hasPlotTags}`);
  if (hasPlotTags) {
    console.log(`[PlotTags] Keys: ${Object.keys(PlotTags).join(", ")}`);
    console.log(`[PlotTags] PLOT_TAG_NONE=${(PlotTags as any).PLOT_TAG_NONE}, PLOT_TAG_LANDMASS=${(PlotTags as any).PLOT_TAG_LANDMASS}, PLOT_TAG_WATER=${(PlotTags as any).PLOT_TAG_WATER}`);
    console.log(`[PlotTags] PLOT_TAG_EAST_LANDMASS=${(PlotTags as any).PLOT_TAG_EAST_LANDMASS}, PLOT_TAG_WEST_LANDMASS=${(PlotTags as any).PLOT_TAG_WEST_LANDMASS}`);
  }
}

/**
 * Plot tag types - resolved at runtime from engine's PlotTags enum.
 *
 * CRITICAL: These values MUST match what the vanilla start position algorithm
 * uses when filtering tiles by PlotTags.PLOT_TAG_WEST_LANDMASS etc.
 */
export const PLOT_TAG = {
  get NONE() { logPlotTagsOnce(); return getPlotTagValue("NONE", 0); },
  get LANDMASS() { return getPlotTagValue("LANDMASS", 1); },
  get WATER() { return getPlotTagValue("WATER", 2); },
  get EAST_LANDMASS() { return getPlotTagValue("EAST_LANDMASS", 3); },
  get WEST_LANDMASS() { return getPlotTagValue("WEST_LANDMASS", 4); },
  get EAST_WATER() { return getPlotTagValue("EAST_WATER", 5); },
  get WEST_WATER() { return getPlotTagValue("WEST_WATER", 6); },
  get ISLAND() { return getPlotTagValue("ISLAND", 7); },
} as const;

export type PlotTagType = number;

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

// ============================================================================
// Landmass Region ID Functions
// ============================================================================

/**
 * Get landmass region ID value from engine's LandmassRegion global.
 *
 * The engine's LandmassRegion enum is the source of truth. The StartPositioner
 * algorithm filters by these values when dividing the map into start regions.
 */
function getLandmassRegionValue(name: string, fallback: number): number {
  if (typeof LandmassRegion !== "undefined") {
    const engineValue = (LandmassRegion as Record<string, number>)[`LANDMASS_REGION_${name}`];
    if (typeof engineValue === "number") {
      return engineValue;
    }
  }
  return fallback;
}

/**
 * Landmass region constants - resolved at runtime from engine's LandmassRegion enum.
 *
 * CRITICAL: These values MUST match what the vanilla StartPositioner algorithm
 * uses when filtering tiles via getLandmassRegionId().
 */
export const LANDMASS_REGION = {
  get NONE() { return getLandmassRegionValue("NONE", 0); },
  get WEST() { return getLandmassRegionValue("WEST", 2); },
  get EAST() { return getLandmassRegionValue("EAST", 1); },
  get DEFAULT() { return getLandmassRegionValue("DEFAULT", 0); },
  get ANY() { return getLandmassRegionValue("ANY", -1); },
} as const;

/**
 * Continent bounds interface for markLandmassRegionId
 */
export interface ContinentBoundsLike {
  west: number;
  east: number;
  south: number;
  north: number;
}

/**
 * Mark all non-ocean tiles in a continent with a specific LandmassRegionId.
 *
 * This function MUST be called early in the map generation pipeline, BEFORE
 * validateAndFixTerrain/expandCoasts/recalculateAreas/stampContinents.
 * The vanilla StartPositioner.divideMapIntoMajorRegions() filters by this ID.
 *
 * @param continent - Bounds of the continent to mark
 * @param regionId - LandmassRegion ID to assign (use LANDMASS_REGION.WEST/EAST)
 * @param adapter - Engine adapter for terrain queries
 */
export function markLandmassRegionId(
  continent: ContinentBoundsLike,
  regionId: number,
  adapter: EngineAdapter
): number {
  // Ocean terrain is index 0
  const OCEAN_TERRAIN = 0;
  let markedCount = 0;

  for (let y = continent.south; y <= continent.north; y++) {
    for (let x = continent.west; x <= continent.east; x++) {
      if (adapter.getTerrainType(x, y) !== OCEAN_TERRAIN) {
        adapter.setLandmassRegionId(x, y, regionId);
        markedCount++;
      }
    }
  }

  return markedCount;
}
