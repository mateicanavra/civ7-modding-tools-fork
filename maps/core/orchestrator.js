/**
 * Orchestrator — Map generation entry points (requestMapData, generateMap)
 *
 * This module owns the high-level pipeline and delegates to existing layers
 * in the same order we already use. It is intentionally thin and defensive:
 * - It imports engine/base-standard modules for core responsibilities.
 * - It invokes our Climate Story tagging between coast shaping and islands.
 * - It attempts to call custom layer functions if they exist (created earlier
 *   in epic-diverse-huge.js); otherwise it logs and safely continues.
 *
 * Wiring plan:
 * - The main script should import { requestMapData, generateMap } from here
 *   and register them with the engine. That swap can happen in a follow-up step.
 */

import { assignStartPositions, chooseStartSectors } from "/base-standard/maps/assign-starting-plots.js";
import {
  addMountains,
  addHills,
  expandCoasts,
  buildRainfallMap,
  generateLakes,
} from "/base-standard/maps/elevation-terrain-generator.js";
import { addFeatures, designateBiomes } from "/base-standard/maps/feature-biome-generator.js";
import * as globals from "/base-standard/maps/map-globals.js";
import * as utilities from "/base-standard/maps/map-utilities.js";
import { addNaturalWonders } from "/base-standard/maps/natural-wonder-generator.js";
import { generateResources } from "/base-standard/maps/resource-generator.js";
import { addVolcanoes } from "/base-standard/maps/volcano-generator.js";
import { assignAdvancedStartRegions } from "/base-standard/maps/assign-advanced-start-region.js";
import { generateDiscoveries } from "/base-standard/maps/discovery-generator.js";
import { generateSnow } from "/base-standard/maps/snow-generator.js";

// Our modular bits
import createContext from "../core/context.js";
import { StoryTags, resetStoryTags } from "../story/tags.js";
import { storyTagHotspotTrails, storyTagRiftValleys } from "../story/tagging.js";

// Utilities (for optional fallbacks)
import { clamp } from "../core/utils.js";

/**
 * requestMapData — thin wrapper that sets init data and logs context.
 * Kept here so the main script can register both endpoints from one module.
 */
export function requestMapData(initParams) {
  console.log("=== EPIC DIVERSE HUGE GENERATOR STARTING ===");
  console.log(`Map dimensions: ${initParams.width} x ${initParams.height}`);
  console.log(`Latitude range: ${initParams.bottomLatitude} to ${initParams.topLatitude}`);

  // Optional external monitor (kept commented for parity)
  // console.log("EPIC_MAP_GEN_START|" + JSON.stringify({
  //   width: initParams.width,
  //   height: initParams.height,
  //   timestamp: Date.now(),
  //   mapSize: initParams.mapSize
  // }));

  engine.call("SetMapInitData", initParams);
}

/**
 * generateMap — orchestrates the entire pipeline in the established order.
 * This function delegates to existing layer functions when available. It also
 * triggers our Climate Story tagging between coast shaping and island seeding.
 */
export function generateMap() {
  console.log("Generating Epic Diverse Map with maximum terrain variety!");

  // Build context snapshot (dimensions, windows, toggles/tunables, tags, utils)
  const ctx = createContext();
  if (!ctx.mapInfo) {
    console.warn("[Orchestrator] MapInfo not found; aborting generation.");
    return;
  }

  // Pull out frequently used values
  const iWidth = ctx.width;
  const iHeight = ctx.height;
  const mapInfo = ctx.mapInfo;

  // Wonders and lake tuning consistent with epic-diverse-huge.js
  const iNumNaturalWonders = Math.max(mapInfo.NumNaturalWonders + 1, mapInfo.NumNaturalWonders);
  const iTilesPerLake = Math.max(10, mapInfo.LakeGenerationFrequency * 2); // fewer lakes than base script used

  // Start sectors first (before terrain generation)
  const bHumanNearEquator = utilities.needHumanNearEquator();
  const iNumPlayers1 = mapInfo.PlayersLandmass1;
  const iNumPlayers2 = mapInfo.PlayersLandmass2;
  const iStartSectorRows = mapInfo.StartSectorRows;
  const iStartSectorCols = mapInfo.StartSectorCols;
  const startSectors = chooseStartSectors(
    iNumPlayers1,
    iNumPlayers2,
    iStartSectorRows,
    iStartSectorCols,
    bHumanNearEquator
  );
  ctx.startSectors = startSectors;
  console.log("Start sectors chosen successfully");

  // Vanilla-compatible continent windows for assignment (kept simple by design)
  const westContinent = ctx.windows.westContinent;
  const eastContinent = ctx.windows.eastContinent;

  // Diverse landmass carve: three vertical bands with widened oceans
  const iOceanWaterColumns = Math.floor(globals.g_OceanWaterColumns * 1.1);
  const landmass1 = {
    west: Math.floor(iOceanWaterColumns),
    east: Math.floor(iWidth * 0.25) - Math.floor(iOceanWaterColumns * 0.5),
    south: globals.g_PolarWaterRows,
    north: iHeight - globals.g_PolarWaterRows,
    continent: 0,
  };
  const landmass2 = {
    west: Math.floor(iWidth * 0.38) + Math.floor(iOceanWaterColumns * 0.35),
    east: Math.floor(iWidth * 0.62) - Math.floor(iOceanWaterColumns * 0.35),
    south: globals.g_PolarWaterRows,
    north: iHeight - globals.g_PolarWaterRows,
    continent: 1,
  };
  const landmass3 = {
    west: Math.floor(iWidth * 0.75) + Math.floor(iOceanWaterColumns * 0.5),
    east: iWidth - Math.floor(iOceanWaterColumns),
    south: globals.g_PolarWaterRows,
    north: iHeight - globals.g_PolarWaterRows,
    continent: 2,
  };

  // Call the custom landmass creator if available (defined in the main script)
  if (typeof globalThis.createDiverseLandmasses === "function") {
    globalThis.createDiverseLandmasses(iWidth, iHeight, [landmass1, landmass2, landmass3]);
  } else {
    console.warn("[Orchestrator] createDiverseLandmasses not found; relying on downstream base passes.");
  }

  // Validate terrain and expand coasts using base-standard
  TerrainBuilder.validateAndFixTerrain();
  expandCoasts(iWidth, iHeight);

  // Ruggedize coasts (custom) if available
  if (typeof globalThis.addRuggedCoasts === "function") {
    globalThis.addRuggedCoasts(iWidth, iHeight);
  } else {
    console.warn("[Orchestrator] addRuggedCoasts not found; continuing.");
  }

  // Climate Story tagging (hotspot trails + rift lines/shoulders)
  if (ctx.toggles.STORY_ENABLE_HOTSPOTS || ctx.toggles.STORY_ENABLE_RIFTS) {
    resetStoryTags();
  }
  if (ctx.toggles.STORY_ENABLE_HOTSPOTS) {
    console.log("Drawing hotspot trails...");
    storyTagHotspotTrails(ctx);
  }
  if (ctx.toggles.STORY_ENABLE_RIFTS) {
    console.log("Marking rift lines and shoulders...");
    storyTagRiftValleys(ctx);
  }

  // Seed offshore islands (custom) if available
  if (typeof globalThis.addIslandChains === "function") {
    globalThis.addIslandChains(iWidth, iHeight);
  } else {
    console.warn("[Orchestrator] addIslandChains not found; continuing.");
  }

  // Areas/continents bookkeeping
  AreaBuilder.recalculateAreas();
  TerrainBuilder.stampContinents();

  // Elevation: mountains/volcanoes/lakes → rebuild elevation → hills
  addMountains(iWidth, iHeight);
  addVolcanoes(iWidth, iHeight);
  generateLakes(iWidth, iHeight, iTilesPerLake);

  AreaBuilder.recalculateAreas();
  TerrainBuilder.buildElevation();
  addHills(iWidth, iHeight);

  // Climate Phase A (baseline bands; custom build if available)
  if (typeof globalThis.buildEnhancedRainfall === "function") {
    globalThis.buildEnhancedRainfall(iWidth, iHeight);
  } else {
    // Fallback: at least build the base rainfall map if custom function is missing
    console.warn("[Orchestrator] buildEnhancedRainfall not found; using base rainfall map.");
    buildRainfallMap(iWidth, iHeight);
  }

  // Rivers modeled and named
  TerrainBuilder.modelRivers(5, 15, globals.g_NavigableRiverTerrain);
  TerrainBuilder.validateAndFixTerrain();
  TerrainBuilder.defineNamedRivers();

  // Climate Phase B (earthlike refinements; custom refine if available)
  if (typeof globalThis.refineRainfallEarthlike === "function") {
    globalThis.refineRainfallEarthlike(iWidth, iHeight);
  } else {
    console.warn("[Orchestrator] refineRainfallEarthlike not found; skipping earthlike refinements.");
  }

  // Biomes (custom nudges if available; otherwise base)
  if (typeof globalThis.designateEnhancedBiomes === "function") {
    globalThis.designateEnhancedBiomes(iWidth, iHeight);
  } else {
    console.warn("[Orchestrator] designateEnhancedBiomes not found; falling back to base biomes.");
    designateBiomes(iWidth, iHeight);
  }

  // Natural wonders and floodplains
  addNaturalWonders(iWidth, iHeight, iNumNaturalWonders);
  TerrainBuilder.addFloodplains(4, 10);

  // Features (custom diversity if available; otherwise base)
  if (typeof globalThis.addDiverseFeatures === "function") {
    globalThis.addDiverseFeatures(iWidth, iHeight);
  } else {
    console.warn("[Orchestrator] addDiverseFeatures not found; using base features.");
    addFeatures(iWidth, iHeight);
  }

  // Final terrain consistency and environmental passes
  TerrainBuilder.validateAndFixTerrain();
  AreaBuilder.recalculateAreas();
  TerrainBuilder.storeWaterData();
  generateSnow(iWidth, iHeight);

  // Resources
  generateResources(iWidth, iHeight);

  // Start placement (vanilla-compatible method)
  console.log("Assigning start positions using proper method...");
  let startPositions = [];
  try {
    startPositions = assignStartPositions(
      iNumPlayers1,
      iNumPlayers2,
      westContinent,
      eastContinent,
      iStartSectorRows,
      iStartSectorCols,
      startSectors
    );
    console.log("Start positions assigned successfully");
  } catch (error) {
    console.log("Error in start position assignment: " + error);
  }

  // Discoveries for exploration
  try {
    generateDiscoveries(iWidth, iHeight, startPositions);
    console.log("Discoveries generated successfully");
  } catch (error) {
    console.log("Error generating discoveries: " + error);
  }

  // Recalculate fertility and assign advanced start regions
  FertilityBuilder.recalculate();
  assignAdvancedStartRegions();

  // Optional completion log (kept commented for parity)
  // console.log("EPIC_MAP_GEN_COMPLETE|" + JSON.stringify({
  //   timestamp: Date.now(),
  //   naturalWonders: iNumNaturalWonders,
  //   lakeDensity: iTilesPerLake
  // }));

  console.log("=== EPIC DIVERSE HUGE GENERATOR COMPLETED ===");
}

export default {
  requestMapData,
  generateMap,
  StoryTags, // exported for convenience if the host wants direct access (read-only usage recommended)
};
