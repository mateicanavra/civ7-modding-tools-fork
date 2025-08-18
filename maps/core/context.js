/**
 * Core MapContext builder
 *
 * Creates a lightweight context object that centralizes:
 * - Dimensions and map metadata
 * - Start-placement windows (west/east continent halves)
 * - Story toggles and tunables
 * - Story tag sets and reset helper
 * - Shared utility functions (clamp, inBounds, storyKey, adjacency/feature lookups)
 * - Small convenience helpers (rng, refreshDimensions)
 *
 * Intent:
 * - Keep layers decoupled while sharing a common view of state and knobs.
 * - Avoid re-reading globals all over the pipeline.
 * - Preserve vanilla compatibility and our established pass ordering.
 */

import * as globals from "/base-standard/maps/map-globals.js";
import {
  STORY_ENABLE_HOTSPOTS,
  STORY_ENABLE_RIFTS,
  STORY_TUNABLES,
} from "../config/tunables.js";
import { StoryTags, resetStoryTags } from "../story/tags.js";
import {
  clamp,
  inBounds,
  storyKey,
  isAdjacentToLand,
  getFeatureTypeIndex,
} from "./utils.js";

/**
 * Build the default start-placement windows (west/east halves) used by vanilla-compatible
 * assignment. These are coarse windows for continent selection, not the diverse landmass
 * carving windows used by our generator.
 * @param {number} width
 * @param {number} height
 */
function buildStartWindows(width, height) {
  const half = Math.floor(width / 2);
  const westContinent = {
    west: globals.g_AvoidSeamOffset,
    east: half - globals.g_AvoidSeamOffset,
    south: globals.g_PolarWaterRows,
    north: height - globals.g_PolarWaterRows,
    continent: 0,
  };

  const eastContinent = {
    west: half + globals.g_AvoidSeamOffset,
    east: width - globals.g_AvoidSeamOffset,
    south: globals.g_PolarWaterRows,
    north: height - globals.g_PolarWaterRows,
    continent: 0,
  };

  return { westContinent, eastContinent };
}

/**
 * Create a MapContext snapshot from the live engine state.
 * Layers should treat ctx as read-mostly; StoryTags are the shared mutable bits.
 *
 * @returns {object} ctx
 */
export default function createContext() {
  const width = GameplayMap.getGridWidth();
  const height = GameplayMap.getGridHeight();
  const uiMapSize = GameplayMap.getMapSize();
  const mapInfo = GameInfo.Maps.lookup(uiMapSize) || null;

  let { westContinent, eastContinent } = buildStartWindows(width, height);

  const ctx = {
    // Dimensions and metadata
    width,
    height,
    uiMapSize,
    mapInfo,

    // Start sectors/windows (assignment code will populate startSectors)
    startSectors: null,
    windows: { westContinent, eastContinent },

    // Narrative toggles and tunables
    toggles: {
      STORY_ENABLE_HOTSPOTS,
      STORY_ENABLE_RIFTS,
    },
    tunables: STORY_TUNABLES,

    // Story tag sets and reset helper
    tags: StoryTags,
    story: {
      reset: resetStoryTags,
    },

    // Shared utilities (imported; not redefined)
    utils: {
      clamp,
      inBounds,
      storyKey,
      isAdjacentToLand,
      getFeatureTypeIndex,
    },

    /**
     * RNG convenience wrapper (defer to engine RNG).
     * @param {number} max - exclusive upper bound
     * @param {string} label - RNG stream label
     */
    rng(max, label) {
      return TerrainBuilder.getRandomNumber(max, label || "RNG");
    },

    /**
     * Refresh ctx.width/height/uiMapSize/mapInfo and recompute start windows.
     * Call if dimensions have changed or after a map-size-sensitive engine update.
     */
    refreshDimensions() {
      this.width = GameplayMap.getGridWidth();
      this.height = GameplayMap.getGridHeight();
      this.uiMapSize = GameplayMap.getMapSize();
      this.mapInfo = GameInfo.Maps.lookup(this.uiMapSize) || null;
      const w = buildStartWindows(this.width, this.height);
      this.windows.westContinent = w.westContinent;
      this.windows.eastContinent = w.eastContinent;
    },

    /**
     * Useful short summary for logs.
     * @returns {string}
     */
    toString() {
      const size = this.uiMapSize;
      const dims = `${this.width}x${this.height}`;
      const name = this.mapInfo && this.mapInfo.Name ? this.mapInfo.Name : "Unknown";
      return `MapContext(size=${size}, dims=${dims}, name=${name})`;
    },
  };

  return ctx;
}
