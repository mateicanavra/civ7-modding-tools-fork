// Epic Diverse Huge Map Generator
/**
 * Custom map script - Produces diverse terrain with cliffs, inland lakes,
 * coastal regions, mountains, jungle, tundra, and all biome variety on huge maps.
 * @packageDocumentation
 */
console.log("Loading Epic Diverse Huge Map Generator");
console.log("[SWOOPER_MOD] ========================================");
console.log("[SWOOPER_MOD] Map orchestrator loaded - v1.0");
console.log("[SWOOPER_MOD] Plate-aware mountain tuning enabled");
console.log("[SWOOPER_MOD] Diagnostics enabled");
console.log("[SWOOPER_MOD] ========================================");
import { chooseStartSectors } from "/base-standard/maps/assign-starting-plots.js";
import { expandCoasts, generateLakes } from "/base-standard/maps/elevation-terrain-generator.js";
import { layerAddMountainsPhysics } from "./layers/mountains.js";
import * as globals from "/base-standard/maps/map-globals.js";
import * as utilities from "/base-standard/maps/map-utilities.js";
import { STORY_ENABLE_HOTSPOTS, STORY_ENABLE_RIFTS, STORY_ENABLE_OROGENY, STORY_ENABLE_WORLDMODEL, LANDMASS_CFG, LANDMASS_GEOMETRY, MOUNTAINS_CFG, VOLCANOES_CFG, rebind, } from "./bootstrap/tunables.js";
import { StoryTags, resetStoryTags } from "./story/tags.js";
import { storyTagStrategicCorridors } from "./story/corridors.js";
import { storyTagHotspotTrails, storyTagRiftValleys, storyTagOrogenyBelts, storyTagContinentalMargins, storyTagClimateSwatches, OrogenyCache, } from "./story/tagging.js";
import { layerAddVolcanoesPlateAware } from "./layers/volcanoes.js";
import { createDiverseLandmasses as layerCreateDiverseLandmasses } from "./layers/landmass.js";
import { generateVoronoiLandmasses } from "./layers/landmass_voronoi.js";
import { createPlateDrivenLandmasses } from "./layers/landmass_plate.js";
import { applyLandmassPostAdjustments } from "./layers/landmass_utils.js";
import { addRuggedCoasts as layerAddRuggedCoasts } from "./layers/coastlines.js";
import { addIslandChains as layerAddIslandChains } from "./layers/islands.js";
import { buildEnhancedRainfall as layerBuildEnhancedRainfall } from "./layers/climate-baseline.js";
import { refineRainfallEarthlike as layerRefineRainfallEarthlike } from "./layers/climate-refinement.js";
import { designateEnhancedBiomes as layerDesignateEnhancedBiomes } from "./layers/biomes.js";
import { addDiverseFeatures as layerAddDiverseFeatures } from "./layers/features.js";
import { runPlacement as layerRunPlacement } from "./layers/placement.js";
import { devLogIf, timeStart, timeEnd, logStoryTagsSummary, logRainfallHistogram, logCorridorAsciiOverlay, logWorldModelSummary, logWorldModelHistograms, logWorldModelAscii, logBoundaryMetrics, } from "./bootstrap/dev.js";
import { WorldModel } from "./world/model.js";
// Phase 1 Refactoring: Context + Adapter layer
import { createMapContext } from "./core/types.js";
import { CivEngineAdapter } from "./core/adapters.js";

// Maintain compatibility with dev helpers that expect StoryTags on the global scope.
try {
    globalThis.StoryTags = StoryTags;
}
catch (_err) {
    // Swallow silently; the game VM should always expose globalThis but guard just in case.
}
/**
 * Climate Story v0.1 — StoryTags scaffolding and toggles
 * Tags are sparse: store as "x,y" strings in Sets.
 * Per-map config is read at runtime from getConfig().
 */
// StoryTags are now imported from ./story/tags.js
function requestMapData(initParams) {
    console.log("=== EPIC DIVERSE HUGE GENERATOR STARTING ===");
    console.log(`Map dimensions: ${initParams.width} x ${initParams.height}`);
    console.log(`Latitude range: ${initParams.bottomLatitude} to ${initParams.topLatitude}`);
    engine.call("SetMapInitData", initParams);
}
function generateMap() {
    console.log("[SWOOPER_MOD] === generateMap() CALLED ===");
    console.log("Generating Epic Diverse Map with maximum terrain variety!");
    // Ensure tunables reflect the active entry config for this run.
    rebind();
    const mountainsConfig = MOUNTAINS_CFG || {};
    const mountainOptions = {
        mountainPercent: mountainsConfig.mountainPercent ?? 3,
        hillPercent: mountainsConfig.hillPercent ?? 8,
        upliftWeight: mountainsConfig.upliftWeight ?? 0.75,
        fractalWeight: mountainsConfig.fractalWeight ?? 0.25,
        riftDepth: mountainsConfig.riftDepth ?? 0.3,
        variance: mountainsConfig.variance ?? 2.0,
        boundaryWeight: mountainsConfig.boundaryWeight ?? 0.6,
        boundaryExponent: mountainsConfig.boundaryExponent ?? 1.4,
        interiorPenaltyWeight: mountainsConfig.interiorPenaltyWeight ?? 0.2,
        convergenceBonus: mountainsConfig.convergenceBonus ?? 0.9,
        transformPenalty: mountainsConfig.transformPenalty ?? 0.3,
        riftPenalty: mountainsConfig.riftPenalty ?? 0.75,
        hillBoundaryWeight: mountainsConfig.hillBoundaryWeight ?? 0.45,
        hillRiftBonus: mountainsConfig.hillRiftBonus ?? 0.5,
        hillConvergentFoothill: mountainsConfig.hillConvergentFoothill ?? 0.25,
        hillInteriorFalloff: mountainsConfig.hillInteriorFalloff ?? 0.2,
        hillUpliftWeight: mountainsConfig.hillUpliftWeight ?? 0.25,
    };
    const volcanoConfig = VOLCANOES_CFG || {};
    const volcanoOptions = {
        enabled: volcanoConfig.enabled ?? true,
        baseDensity: volcanoConfig.baseDensity ?? (1 / 170),
        minSpacing: volcanoConfig.minSpacing ?? 3,
        boundaryThreshold: volcanoConfig.boundaryThreshold ?? 0.35,
        boundaryWeight: volcanoConfig.boundaryWeight ?? 1.2,
        convergentMultiplier: volcanoConfig.convergentMultiplier ?? 2.4,
        transformMultiplier: volcanoConfig.transformMultiplier ?? 1.1,
        divergentMultiplier: volcanoConfig.divergentMultiplier ?? 0.35,
        hotspotWeight: volcanoConfig.hotspotWeight ?? 0.12,
        shieldPenalty: volcanoConfig.shieldPenalty ?? 0.6,
        randomJitter: volcanoConfig.randomJitter ?? 0.08,
        minVolcanoes: volcanoConfig.minVolcanoes ?? 5,
        maxVolcanoes: volcanoConfig.maxVolcanoes ?? 40,
    };
    console.log("[SWOOPER_MOD] Tunables rebound successfully");
    console.log(
        `[SWOOPER_MOD] Mountain target: ${mountainOptions.mountainPercent}% | Hills: ${mountainOptions.hillPercent}%`
    );
    console.log(
        `[SWOOPER_MOD] Volcano config — base density ${(volcanoOptions.baseDensity ?? 0).toFixed(4)}, spacing ${volcanoOptions.minSpacing}`
    );
    let iWidth = GameplayMap.getGridWidth();
    let iHeight = GameplayMap.getGridHeight();
    let uiMapSize = GameplayMap.getMapSize();
    let startPositions = [];
    let mapInfo = GameInfo.Maps.lookup(uiMapSize);
    if (mapInfo == null)
        return;

    // Phase 1 Refactoring: Create MapContext with adapter
    console.log("[Refactoring] Creating MapContext with CivEngineAdapter...");
    const adapter = new CivEngineAdapter(iWidth, iHeight);
    const ctx = createMapContext(
        { width: iWidth, height: iHeight },
        adapter,
        {
            STORY_ENABLE_WORLDMODEL,
            STORY_ENABLE_HOTSPOTS,
            STORY_ENABLE_RIFTS,
            STORY_ENABLE_OROGENY,
            LANDMASS_GEOMETRY,
        }
    );

    // Initialize WorldModel (optional) and attach to context
    if (STORY_ENABLE_WORLDMODEL) {
        try {
            if (WorldModel.init()) {
                ctx.worldModel = WorldModel;
                devLogIf("LOG_STORY_TAGS", "[WorldModel] Initialized and attached to context");
                logWorldModelSummary(WorldModel);
                logWorldModelAscii(WorldModel);
            }
        }
        catch (err) {
            devLogIf("LOG_STORY_TAGS", "[WorldModel] init error");
        }
    }
    let iNumNaturalWonders = Math.max(mapInfo.NumNaturalWonders + 1, mapInfo.NumNaturalWonders);
    let iTilesPerLake = Math.max(10, mapInfo.LakeGenerationFrequency * 2); // fewer lakes than base script used
    let iNumPlayers1 = mapInfo.PlayersLandmass1;
    let iNumPlayers2 = mapInfo.PlayersLandmass2;
    let iStartSectorRows = mapInfo.StartSectorRows;
    let iStartSectorCols = mapInfo.StartSectorCols;
    // Set up start sectors first (before terrain generation)
    let bHumanNearEquator = utilities.needHumanNearEquator();
    let startSectors = chooseStartSectors(iNumPlayers1, iNumPlayers2, iStartSectorRows, iStartSectorCols, bHumanNearEquator);
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
    let usedPlateLandmasses = false;
    // Create more complex continent boundaries for our diverse terrain generation
    // Compute band windows from per-map geometry config (if provided)
    {
        const GEOM = LANDMASS_GEOMETRY || /**/ {};
        const usePlateGeometry = (GEOM.mode === "plates" || (GEOM.mode === "auto" && WorldModel?.isEnabled?.()));
        let landmassWindows;
        let derivedStartRegions;
        let adjustmentsApplied = false;
        if (usePlateGeometry) {
            const voronoiResult = generateVoronoiLandmasses(iWidth, iHeight, ctx, mapInfo, GEOM);
            if (voronoiResult && Array.isArray(voronoiResult.windows) && voronoiResult.windows.length > 0) {
                usedPlateLandmasses = true;
                landmassWindows = voronoiResult.windows;
                derivedStartRegions = voronoiResult.startRegions;
                adjustmentsApplied = true;
            }
        }
        if (!landmassWindows && usePlateGeometry) {
            const plateResult = createPlateDrivenLandmasses(iWidth, iHeight, ctx, {
                landmassCfg: LANDMASS_CFG,
                geometry: GEOM,
            });
            if (plateResult && Array.isArray(plateResult.windows) && plateResult.windows.length > 0) {
                usedPlateLandmasses = true;
                landmassWindows = plateResult.windows;
                derivedStartRegions = plateResult.startRegions;
                adjustmentsApplied = true;
            }
        }
        if (!landmassWindows) {
            const oceanScale = Number.isFinite(GEOM.oceanColumnsScale)
                ? GEOM.oceanColumnsScale
                : 1.1;
            const iOceanWaterColumns = Math.floor(globals.g_OceanWaterColumns * oceanScale);
            const presetName = GEOM.preset;
            const presetBands = presetName && GEOM.presets && Array.isArray(GEOM.presets[presetName]?.bands)
                ? GEOM.presets[presetName].bands
                : null;
            const bandDefs = Array.isArray(presetBands) && presetBands.length >= 3
                ? presetBands
                : Array.isArray(GEOM.bands) && GEOM.bands.length >= 3
                    ? GEOM.bands
                    : [
                        { westFrac: 0.0, eastFrac: 0.3, westOceanOffset: 1.0, eastOceanOffset: -0.35 },
                        { westFrac: 0.35, eastFrac: 0.6, westOceanOffset: 0.25, eastOceanOffset: -0.25 },
                        { westFrac: 0.75, eastFrac: 1.0, westOceanOffset: 0.5, eastOceanOffset: -1.0 },
                    ];
            function bandWindow(band, idx) {
                const west = Math.floor(iWidth * (band.westFrac ?? 0)) + Math.floor(iOceanWaterColumns * (band.westOceanOffset ?? 0));
                const east = Math.floor(iWidth * (band.eastFrac ?? 1)) + Math.floor(iOceanWaterColumns * (band.eastOceanOffset ?? 0));
                return {
                    west: Math.max(0, Math.min(iWidth - 1, west)),
                    east: Math.max(0, Math.min(iWidth - 1, east)),
                    south: globals.g_PolarWaterRows,
                    north: iHeight - globals.g_PolarWaterRows,
                    continent: idx,
                };
            }
            landmassWindows = [
                bandWindow(bandDefs[0], 0),
                bandWindow(bandDefs[1], 1),
                bandWindow(bandDefs[2], 2),
            ];
            landmassWindows = applyLandmassPostAdjustments(landmassWindows, GEOM, iWidth, iHeight);
            adjustmentsApplied = true;
        }
        if (landmassWindows && !adjustmentsApplied) {
            landmassWindows = applyLandmassPostAdjustments(landmassWindows, GEOM, iWidth, iHeight);
        }
        if (!derivedStartRegions && Array.isArray(landmassWindows) && landmassWindows.length >= 2) {
            const first = landmassWindows[0];
            const last = landmassWindows[landmassWindows.length - 1];
            derivedStartRegions = {
                westContinent: Object.assign({}, first),
                eastContinent: Object.assign({}, last),
            };
        }
        if (derivedStartRegions?.westContinent && derivedStartRegions?.eastContinent) {
            westContinent = {
                west: derivedStartRegions.westContinent.west,
                east: derivedStartRegions.westContinent.east,
                south: derivedStartRegions.westContinent.south,
                north: derivedStartRegions.westContinent.north,
                continent: derivedStartRegions.westContinent.continent ?? 0,
            };
            eastContinent = {
                west: derivedStartRegions.eastContinent.west,
                east: derivedStartRegions.eastContinent.east,
                south: derivedStartRegions.eastContinent.south,
                north: derivedStartRegions.eastContinent.north,
                continent: derivedStartRegions.eastContinent.continent ?? 1,
            };
        }
        var landmassWindowsFinal = landmassWindows;
    }
    // Generate landmasses without creating a hard horizontal ocean band
    {
        const t = timeStart("Landmass");
        if (usedPlateLandmasses) {
            console.log("[SWOOPER_MOD] Applied plate-driven landmass mask");
        }
        else {
            layerCreateDiverseLandmasses(iWidth, iHeight, landmassWindowsFinal, ctx);
        }
        timeEnd(t);
    }
    TerrainBuilder.validateAndFixTerrain();
    {
        const t = timeStart("ExpandCoasts");
        expandCoasts(iWidth, iHeight);
        timeEnd(t);
    }
    // Reset StoryTags and tag continental margins before coast shaping
    resetStoryTags();
    console.log("Imprinting continental margins (active/passive)...");
    storyTagContinentalMargins();
    // Add post-processing to make coasts more rugged (margin-aware) and place a few islands
    {
        const t = timeStart("RuggedCoasts");
        layerAddRuggedCoasts(iWidth, iHeight, ctx);
        timeEnd(t);
    }
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
    if (STORY_ENABLE_OROGENY) {
        console.log("Tagging orogenic belts...");
        storyTagOrogenyBelts();
        logWorldModelHistograms(WorldModel, {
            riftSet: StoryTags.riftLine,
            beltSet: OrogenyCache.belts,
            bins: 12,
        });
    }
    // Re-tag continental margins for downstream consumers (islands/features) after reset
    storyTagContinentalMargins();
    // Strategic Corridors: tag pre-islands lanes and land corridors
    storyTagStrategicCorridors("preIslands");
    logCorridorAsciiOverlay();
    devLogIf("LOG_STORY_TAGS", "StoryTags summary follows");
    logStoryTagsSummary(StoryTags, OrogenyCache);
    {
        const t = timeStart("IslandChains");
        layerAddIslandChains(iWidth, iHeight, ctx);
        timeEnd(t);
    }
    // Remove aggressive cliff systems for playability
    AreaBuilder.recalculateAreas();
    TerrainBuilder.stampContinents();
    // Restore plot tags (west/east landmass, corridor water, etc.) for downstream placement logic.
    utilities.addPlotTags(iHeight, iWidth, eastContinent.west);
    // Mountains & Hills – Phase 2: Physics-based placement using plate boundaries
    {
        const t = timeStart("Mountains & Hills (Physics)");
        layerAddMountainsPhysics(ctx, mountainOptions);
        timeEnd(t);
    }
    logBoundaryMetrics(WorldModel, { stage: "post-mountains" });
    {
        const t = timeStart("Volcanoes");
        layerAddVolcanoesPlateAware(ctx, volcanoOptions);
        timeEnd(t);
    }
    logBoundaryMetrics(WorldModel, { stage: "post-volcanoes" });
    // Lakes – fewer than before
    {
        const t = timeStart("Lakes");
        generateLakes(iWidth, iHeight, iTilesPerLake);
        timeEnd(t);
    }
    // MAP STATISTICS LOGGING - Diagnostic for start placement failures
    console.log("[SWOOPER_MOD] About to calculate MAP_STATS...");
    {
        let waterCount = 0, mountainCount = 0, hillCount = 0, flatCount = 0;
        const totalTiles = iWidth * iHeight;
        for (let y = 0; y < iHeight; y++) {
            for (let x = 0; x < iWidth; x++) {
                if (GameplayMap.isWater(x, y))
                    waterCount++;
                else if (GameplayMap.isMountain(x, y))
                    mountainCount++;
                else if (GameplayMap.getTerrainType(x, y) === globals.g_HillTerrain)
                    hillCount++;
                else
                    flatCount++;
            }
        }
        const landCount = totalTiles - waterCount;
        const waterPct = ((waterCount / totalTiles) * 100).toFixed(1);
        const landPct = ((landCount / totalTiles) * 100).toFixed(1);
        const mtnPct = landCount > 0 ? ((mountainCount / landCount) * 100).toFixed(1) : 0;
        const hillPct = landCount > 0 ? ((hillCount / landCount) * 100).toFixed(1) : 0;
        const flatPct = landCount > 0 ? ((flatCount / landCount) * 100).toFixed(1) : 0;
        console.log(`[MAP_STATS] Total tiles: ${totalTiles}, Water: ${waterCount} (${waterPct}%), Land: ${landCount} (${landPct}%)`);
        console.log(`[MAP_STATS] Land breakdown: Mountains: ${mountainCount} (${mtnPct}%), Hills: ${hillCount} (${hillPct}%), Flat: ${flatCount} (${flatPct}%)`);
    }
    AreaBuilder.recalculateAreas();
    TerrainBuilder.buildElevation();
    // Create moderated rainfall patterns (keep enhanced but gentle)
    {
        const t = timeStart("Climate: Baseline");
        layerBuildEnhancedRainfall(iWidth, iHeight);
        timeEnd(t);
    }
    {
        const t = timeStart("Climate: Swatches");
        const swatchResult = storyTagClimateSwatches();
        if (swatchResult && swatchResult.kind) {
            devLogIf("LOG_STORY_TAGS", `Climate Swatch: ${swatchResult.kind} (${swatchResult.tiles} tiles)`);
        }
        timeEnd(t);
    }
    // Rivers – closer to base values for balance
    {
        const t = timeStart("Rivers");
        TerrainBuilder.modelRivers(5, 15, globals.g_NavigableRiverTerrain);
        timeEnd(t);
    }
    TerrainBuilder.validateAndFixTerrain();
    TerrainBuilder.defineNamedRivers();
    // Strategic Corridors: tag river-chain corridors post-rivers
    storyTagStrategicCorridors("postRivers");
    logCorridorAsciiOverlay();
    // Refine rainfall with earthlike dynamics after rivers exist
    {
        const t = timeStart("Climate: Earthlike Refinements");
        // Phase 1: Pass context to refactored layer
        layerRefineRainfallEarthlike(iWidth, iHeight, ctx);
        timeEnd(t);
    }
    // Enhanced biome diversity
    {
        const t = timeStart("Biomes");
        layerDesignateEnhancedBiomes(iWidth, iHeight);
        timeEnd(t);
    }
    // Add extensive feature variety
    {
        const t = timeStart("Features");
        layerAddDiverseFeatures(iWidth, iHeight, ctx);
        timeEnd(t);
    }
    TerrainBuilder.validateAndFixTerrain();
    AreaBuilder.recalculateAreas();
    devLogIf("RAINFALL_HISTOGRAM", "Rainfall histogram (land tiles)");
    logRainfallHistogram(iWidth, iHeight, 12);
    TerrainBuilder.storeWaterData();
    // Placement phase (wonders, floodplains, snow, resources, starts, discoveries, fertility, advanced starts)
    {
        const t = timeStart("Placement");
        startPositions = layerRunPlacement(iWidth, iHeight, {
            mapInfo,
            wondersPlusOne: true,
            floodplains: { minLength: 4, maxLength: 10 },
            starts: {
                playersLandmass1: iNumPlayers1,
                playersLandmass2: iNumPlayers2,
                westContinent,
                eastContinent,
                startSectorRows: iStartSectorRows,
                startSectorCols: iStartSectorCols,
                startSectors,
            },
        });
        timeEnd(t);
    }
    console.log("=== EPIC DIVERSE HUGE GENERATOR COMPLETED ===");
}
// Register listeners
engine.on("RequestMapInitData", requestMapData);
engine.on("GenerateMap", generateMap);
console.log("Epic Diverse Huge Map Generator loaded and ready!");
