// Epic Diverse Huge Map Generator
/**
 * Custom map script - Produces diverse terrain with cliffs, inland lakes,
 * coastal regions, mountains, jungle, tundra, and all biome variety on huge maps.
 * @packageDocumentation
 */
console.log("Loading Epic Diverse Huge Map Generator");

import {
    assignStartPositions,
    chooseStartSectors,
} from "/base-standard/maps/assign-starting-plots.js";
import {
    addMountains,
    addHills,
    expandCoasts,
    buildRainfallMap,
    generateLakes,
} from "/base-standard/maps/elevation-terrain-generator.js";
import {
    addFeatures,
    designateBiomes,
} from "/base-standard/maps/feature-biome-generator.js";
import * as globals from "/base-standard/maps/map-globals.js";
import * as utilities from "/base-standard/maps/map-utilities.js";
import { addNaturalWonders } from "/base-standard/maps/natural-wonder-generator.js";
import {
    STORY_ENABLE_HOTSPOTS as CFG_STORY_ENABLE_HOTSPOTS,
    STORY_ENABLE_RIFTS as CFG_STORY_ENABLE_RIFTS,
    STORY_TUNABLES as CFG_STORY_TUNABLES,
} from "./config/tunables.js";
import { StoryTags, resetStoryTags } from "./story/tags.js";
import { storyTagHotspotTrails, storyTagRiftValleys } from "./story/tagging.js";
import {
    clamp as utilClamp,
    inBounds as utilInBounds,
    storyKey as utilStoryKey,
    isAdjacentToLand as utilIsAdjacentToLand,
    getFeatureTypeIndex as utilGetFeatureTypeIndex,
} from "./core/utils.js";
import { generateResources } from "/base-standard/maps/resource-generator.js";
import { addVolcanoes } from "/base-standard/maps/volcano-generator.js";
import { assignAdvancedStartRegions } from "/base-standard/maps/assign-advanced-start-region.js";
import { generateDiscoveries } from "/base-standard/maps/discovery-generator.js";
import { generateSnow } from "/base-standard/maps/snow-generator.js";
import { dumpStartSectors } from "/base-standard/maps/map-debug-helpers.js";
import { createDiverseLandmasses as layerCreateDiverseLandmasses } from "./layers/landmass.js";
import { addRuggedCoasts as layerAddRuggedCoasts } from "./layers/coastlines.js";
import { addIslandChains as layerAddIslandChains } from "./layers/islands.js";
import { buildEnhancedRainfall as layerBuildEnhancedRainfall } from "./layers/climate-baseline.js";
import { refineRainfallEarthlike as layerRefineRainfallEarthlike } from "./layers/climate-refinement.js";
import { designateEnhancedBiomes as layerDesignateEnhancedBiomes } from "./layers/biomes.js";
import { addDiverseFeatures as layerAddDiverseFeatures } from "./layers/features.js";
// Orchestrator import removed for stability while we restore local engine listeners

/**
 * Climate Story v0.1 — StoryTags scaffolding and toggles
 * Tags are sparse: store as "x,y" strings in Sets.
 */
const STORY_ENABLE_HOTSPOTS = CFG_STORY_ENABLE_HOTSPOTS;
const STORY_ENABLE_RIFTS = CFG_STORY_ENABLE_RIFTS;

// StoryTags are now imported from ./story/tags.js

// Tunables (conservative defaults)
const STORY_TUNABLES = CFG_STORY_TUNABLES;

function storyKey(x, y) {
    return `${x},${y}`;
}
function inBounds(x, y) {
    return (
        x >= 0 &&
        x < GameplayMap.getGridWidth() &&
        y >= 0 &&
        y < GameplayMap.getGridHeight()
    );
}
function storyResetTags() {
    StoryTags.hotspot.clear();
    StoryTags.hotspotParadise.clear();
    StoryTags.hotspotVolcanic.clear();
    StoryTags.riftLine.clear();
    StoryTags.riftShoulder.clear();
}

function requestMapData(initParams) {
    console.log("=== EPIC DIVERSE HUGE GENERATOR STARTING ===");
    console.log(`Map dimensions: ${initParams.width} x ${initParams.height}`);
    console.log(
        `Latitude range: ${initParams.bottomLatitude} to ${initParams.topLatitude}`,
    );

    // Log to external monitoring system via console (for communication bridge)
    // console.log("EPIC_MAP_GEN_START|" + JSON.stringify({
    //     width: initParams.width,
    //     height: initParams.height,
    //     timestamp: Date.now(),
    //     mapSize: initParams.mapSize
    // }));

    engine.call("SetMapInitData", initParams);
}

function generateMap() {
    console.log("Generating Epic Diverse Map with maximum terrain variety!");

    let iWidth = GameplayMap.getGridWidth();
    let iHeight = GameplayMap.getGridHeight();
    let uiMapSize = GameplayMap.getMapSize();
    let startPositions = [];

    let mapInfo = GameInfo.Maps.lookup(uiMapSize);
    if (mapInfo == null) return;

    let iNumNaturalWonders = Math.max(
        mapInfo.NumNaturalWonders + 1,
        mapInfo.NumNaturalWonders,
    );
    let iTilesPerLake = Math.max(10, mapInfo.LakeGenerationFrequency * 2); // fewer lakes than base script used
    let iNumPlayers1 = mapInfo.PlayersLandmass1;
    let iNumPlayers2 = mapInfo.PlayersLandmass2;
    let iStartSectorRows = mapInfo.StartSectorRows;
    let iStartSectorCols = mapInfo.StartSectorCols;

    // Set up start sectors first (before terrain generation)
    let bHumanNearEquator = utilities.needHumanNearEquator();
    let startSectors = chooseStartSectors(
        iNumPlayers1,
        iNumPlayers2,
        iStartSectorRows,
        iStartSectorCols,
        bHumanNearEquator,
    );
    console.log("Start sectors chosen successfully");

    // Create continent boundaries for start position assignment (simplified for compatibility)
    let westContinent = {
        west: globals.g_AvoidSeamOffset,
        east: iWidth / 2 - globals.g_AvoidSeamOffset,
        south: globals.g_PolarWaterRows,
        north: iHeight - globals.g_PolarWaterRows,
        continent: 0,
    };

    let eastContinent = {
        west: iWidth / 2 + globals.g_AvoidSeamOffset,
        east: iWidth - globals.g_AvoidSeamOffset,
        south: globals.g_PolarWaterRows,
        north: iHeight - globals.g_PolarWaterRows,
        continent: 0,
    };

    // Create more complex continent boundaries for our diverse terrain generation
    // Increase ocean columns so there is true ocean on the sides and between land bands
    let iOceanWaterColumns = Math.floor(globals.g_OceanWaterColumns * 1.1);

    // Landmass approach – 3 vertical bands, slightly narrower to widen oceans
    let landmass1 = {
        west: Math.floor(iOceanWaterColumns),
        east: Math.floor(iWidth * 0.25) - Math.floor(iOceanWaterColumns * 0.5),
        south: globals.g_PolarWaterRows,
        north: iHeight - globals.g_PolarWaterRows,
        continent: 0,
    };

    let landmass2 = {
        west: Math.floor(iWidth * 0.38) + Math.floor(iOceanWaterColumns * 0.35),
        east: Math.floor(iWidth * 0.62) - Math.floor(iOceanWaterColumns * 0.35),
        south: globals.g_PolarWaterRows,
        north: iHeight - globals.g_PolarWaterRows,
        continent: 1,
    };

    let landmass3 = {
        west: Math.floor(iWidth * 0.75) + Math.floor(iOceanWaterColumns * 0.5),
        east: iWidth - Math.floor(iOceanWaterColumns),
        south: globals.g_PolarWaterRows,
        north: iHeight - globals.g_PolarWaterRows,
        continent: 2,
    };

    // Generate landmasses without creating a hard horizontal ocean band
    layerCreateDiverseLandmasses(iWidth, iHeight, [
        landmass1,
        landmass2,
        landmass3,
    ]);

    TerrainBuilder.validateAndFixTerrain();
    expandCoasts(iWidth, iHeight);

    // Add post-processing to make coasts more rugged and place a few islands
    layerAddRuggedCoasts(iWidth, iHeight);

    // Climate Story v0.1: Tag narrative motifs after coasts exist
    if (STORY_ENABLE_HOTSPOTS || STORY_ENABLE_RIFTS) {
        resetStoryTags();
    }
    if (STORY_ENABLE_HOTSPOTS) {
        console.log("Drawing hotspot trails...");
        storyTagHotspotTrails(iWidth, iHeight);
    }
    if (STORY_ENABLE_RIFTS) {
        console.log("Marking rift lines and shoulders...");
        storyTagRiftValleys(iWidth, iHeight);
    }

    layerAddIslandChains(iWidth, iHeight);

    // Remove aggressive cliff systems for playability

    AreaBuilder.recalculateAreas();
    TerrainBuilder.stampContinents();

    // Mountains – use base generator only (fewer peaks)
    addMountains(iWidth, iHeight);
    addVolcanoes(iWidth, iHeight);

    // Lakes – fewer than before
    generateLakes(iWidth, iHeight, iTilesPerLake);

    AreaBuilder.recalculateAreas();
    TerrainBuilder.buildElevation();
    addHills(iWidth, iHeight);

    // Create moderated rainfall patterns (keep enhanced but gentle)
    layerBuildEnhancedRainfall(iWidth, iHeight);

    // Rivers – closer to base values for balance
    TerrainBuilder.modelRivers(5, 15, globals.g_NavigableRiverTerrain);
    TerrainBuilder.validateAndFixTerrain();
    TerrainBuilder.defineNamedRivers();

    // Refine rainfall with earthlike dynamics after rivers exist
    layerRefineRainfallEarthlike(iWidth, iHeight);

    // Enhanced biome diversity
    layerDesignateEnhancedBiomes(iWidth, iHeight);

    addNaturalWonders(iWidth, iHeight, iNumNaturalWonders);
    TerrainBuilder.addFloodplains(4, 10);

    // Add extensive feature variety
    layerAddDiverseFeatures(iWidth, iHeight);

    TerrainBuilder.validateAndFixTerrain();
    AreaBuilder.recalculateAreas();
    TerrainBuilder.storeWaterData();
    generateSnow(iWidth, iHeight);

    // Debug output (kept disabled for performance)
    // dumpContinents(iWidth, iHeight);
    // dumpTerrain(iWidth, iHeight);
    // dumpElevation(iWidth, iHeight);
    // dumpRainfall(iWidth, iHeight);
    // dumpBiomes(iWidth, iHeight);
    // dumpFeatures(iWidth, iHeight);

    generateResources(iWidth, iHeight);

    // Assign start positions using proper method like working mod
    console.log("Assigning start positions using proper method...");
    try {
        startPositions = assignStartPositions(
            iNumPlayers1,
            iNumPlayers2,
            westContinent,
            eastContinent,
            iStartSectorRows,
            iStartSectorCols,
            startSectors,
        );
        console.log("Start positions assigned successfully");
    } catch (error) {
        console.log("Error in start position assignment: " + error);
        startPositions = [];
    }

    // Generate discoveries for exploration
    try {
        generateDiscoveries(iWidth, iHeight, startPositions);
        console.log("Discoveries generated successfully");
    } catch (error) {
        console.log("Error generating discoveries: " + error);
    }

    // dumpResources(iWidth, iHeight); // COMMENTED OUT TO PREVENT CRASHES

    FertilityBuilder.recalculate();

    // Noise generation for additional texture - COMMENTED OUT TO PREVENT CRASHES
    // let seed = GameplayMap.getRandomSeed();
    // let avgDistanceBetweenPoints = 2; // Denser features
    // let normalizedRangeSmoothing = 3;
    // let poisson = TerrainBuilder.generatePoissonMap(seed, avgDistanceBetweenPoints, normalizedRangeSmoothing);
    // let poissonPred = function(val) {
    //     return val >= 1.5 ? "#" : val >= 1 ? "*" : val >= 0.5 ? "." : " ";
    // };
    // dumpNoisePredicate(iWidth, iHeight, poisson, poissonPred);

    assignAdvancedStartRegions();

    // Log completion with statistics
    // console.log("EPIC_MAP_GEN_COMPLETE|" + JSON.stringify({
    //     timestamp: Date.now(),
    //     naturalWonders: iNumNaturalWonders,
    //     lakeDensity: iTilesPerLake,
    //     biomeVariety: "maximum"
    // }));

    console.log("=== EPIC DIVERSE HUGE GENERATOR COMPLETED ===");
}

// Register listeners
engine.on("RequestMapInitData", requestMapData);
engine.on("GenerateMap", generateMap);

console.log("Epic Diverse Huge Map Generator loaded and ready!");
