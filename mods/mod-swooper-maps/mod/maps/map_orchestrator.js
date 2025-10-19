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
import { stageEnabled, LANDMASS_CFG, LANDMASS_GEOMETRY, MOUNTAINS_CFG, VOLCANOES_CFG, rebind, } from "./bootstrap/tunables.js";
import { StoryTags, resetStoryTags } from "./story/tags.js";
import { storyTagStrategicCorridors } from "./story/corridors.js";
import { storyTagHotspotTrails, storyTagRiftValleys, storyTagOrogenyBelts, storyTagContinentalMargins, storyTagClimateSwatches, OrogenyCache, } from "./story/tagging.js";
import { layerAddVolcanoesPlateAware } from "./layers/volcanoes.js";
import { createPlateDrivenLandmasses } from "./layers/landmass_plate.js";
import { applyLandmassPostAdjustments, applyPlateAwareOceanSeparation } from "./layers/landmass_utils.js";
import { addRuggedCoasts as layerAddRuggedCoasts } from "./layers/coastlines.js";
import { addIslandChains as layerAddIslandChains } from "./layers/islands.js";
import { applyClimateBaseline, refineClimateEarthlike } from "./layers/climate-engine.js";
import { designateEnhancedBiomes as layerDesignateEnhancedBiomes } from "./layers/biomes.js";
import { addDiverseFeatures as layerAddDiverseFeatures } from "./layers/features.js";
import { runPlacement as layerRunPlacement } from "./layers/placement.js";
import { devLogIf, timeStart, timeEnd, logStoryTagsSummary, logRainfallHistogram, logRainfallStats, logCorridorAsciiOverlay, logWorldModelSummary, logWorldModelHistograms, logWorldModelAscii, logBoundaryMetrics, logLandmassAscii, logTerrainReliefAscii, logRainfallAscii, logBiomeAscii, logBiomeSummary, } from "./bootstrap/dev.js";
import { WorldModel } from "./world/model.js";
// Phase 1 Refactoring: Context + Adapter layer
import { createMapContext, syncHeightfield, syncClimateField } from "./core/types.js";
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
    const stageWorldModel = stageEnabled("worldModel");
    const stageLandmass = stageEnabled("landmass");
    const stageCoastlines = stageEnabled("coastlines");
    const stageStorySeed = stageEnabled("storySeed");
    const stageStoryHotspots = stageEnabled("storyHotspots");
    const stageStoryRifts = stageEnabled("storyRifts");
    const stageStoryOrogeny = stageEnabled("storyOrogeny");
    const stageStoryCorridorsPre = stageEnabled("storyCorridorsPre");
    const stageIslands = stageEnabled("islands");
    const stageMountains = stageEnabled("mountains");
    const stageVolcanoes = stageEnabled("volcanoes");
    const stageLakes = stageEnabled("lakes");
    const stageClimateBaseline = stageEnabled("climateBaseline");
    const stageStorySwatches = stageEnabled("storySwatches");
    const stageRivers = stageEnabled("rivers");
    const stageStoryCorridorsPost = stageEnabled("storyCorridorsPost");
    const stageClimateRefine = stageEnabled("climateRefine");
    const stageBiomes = stageEnabled("biomes");
    const stageFeatures = stageEnabled("features");
    const stagePlacement = stageEnabled("placement");
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
            STORY_ENABLE_HOTSPOTS: stageStoryHotspots,
            STORY_ENABLE_RIFTS: stageStoryRifts,
            STORY_ENABLE_OROGENY: stageStoryOrogeny,
            LANDMASS_GEOMETRY,
        }
    );

    // Initialize WorldModel (optional) and attach to context
    if (!stageWorldModel) {
        console.warn("[StageManifest] WorldModel stage disabled; physics pipeline requires it.");
    }
    try {
        if (WorldModel.init()) {
            ctx.worldModel = WorldModel;
            if (ctx.foundation) {
                ctx.foundation.plateSeed = WorldModel.plateSeed || null;
            }
            devLogIf("LOG_STORY_TAGS", "[WorldModel] Initialized and attached to context");
            logWorldModelSummary(WorldModel);
            logWorldModelAscii(WorldModel);
        }
        else {
            console.error("[WorldModel] Initialization failed; physics data unavailable.");
        }
    }
    catch (err) {
        devLogIf("LOG_STORY_TAGS", "[WorldModel] init error");
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
    const landmassSource = stageLandmass ? "plate" : "disabled";
    let landmaskDebug = null;
    let landmassWindowsFinal = [];
    if (stageLandmass) {
        const t = timeStart("Landmass (Plate-Driven)");
        const plateResult = createPlateDrivenLandmasses(iWidth, iHeight, ctx, {
            landmassCfg: LANDMASS_CFG,
            geometry: LANDMASS_GEOMETRY,
        });
        if (!plateResult || !Array.isArray(plateResult.windows) || plateResult.windows.length === 0) {
            console.error("[SWOOPER_MOD] ERROR: Plate-driven landmass generation failed (no windows).");
            timeEnd(t);
            return;
        }
        landmaskDebug = plateResult.landMask || null;
        let landmassWindows = plateResult.windows.slice();
        const separationResult = applyPlateAwareOceanSeparation({
            width: iWidth,
            height: iHeight,
            windows: landmassWindows,
            landMask: plateResult.landMask,
            context: ctx,
            adapter: ctx?.adapter,
            worldModel: WorldModel,
        });
        landmassWindows = separationResult.windows;
        if (separationResult.landMask) {
            landmaskDebug = separationResult.landMask;
        }
        landmassWindows = applyLandmassPostAdjustments(landmassWindows, LANDMASS_GEOMETRY, iWidth, iHeight);
        if (Array.isArray(landmassWindows) && landmassWindows.length >= 2) {
            const first = landmassWindows[0];
            const last = landmassWindows[landmassWindows.length - 1];
            if (first && last) {
                westContinent = {
                    west: first.west,
                    east: first.east,
                    south: first.south,
                    north: first.north,
                    continent: first.continent ?? 0,
                };
                eastContinent = {
                    west: last.west,
                    east: last.east,
                    south: last.south,
                    north: last.north,
                    continent: last.continent ?? 1,
                };
            }
        }
        landmassWindowsFinal = landmassWindows;
        console.log("[SWOOPER_MOD] Applied plate-driven landmass mask");
        timeEnd(t);
        if (landmassWindowsFinal.length) {
            const windowSummary = landmassWindowsFinal.map((win, idx) => {
                if (!win)
                    return { index: idx };
                const spanX = Number.isFinite(win.east) && Number.isFinite(win.west) ? win.east - win.west + 1 : null;
                const spanY = Number.isFinite(win.north) && Number.isFinite(win.south) ? win.north - win.south + 1 : null;
                return {
                    index: idx,
                    continent: win.continent ?? idx,
                    west: win.west,
                    east: win.east,
                    south: win.south,
                    north: win.north,
                    width: spanX,
                    height: spanY,
                    area: spanX && spanY ? spanX * spanY : null,
                };
            });
            devLogIf("LOG_LANDMASS_WINDOWS", "[Landmass] windows summary", windowSummary);
        }
        else {
            devLogIf("LOG_LANDMASS_WINDOWS", "[Landmass] windows summary", "no plate windows");
        }
    }
    else {
        console.warn("[StageManifest] Landmass stage disabled — skipping landmass generation.");
    }
    logLandmassAscii(landmassSource, {
        windows: Array.isArray(landmassWindowsFinal) ? landmassWindowsFinal : [],
        landMask: landmaskDebug || undefined,
    });
    TerrainBuilder.validateAndFixTerrain();
    syncHeightfield(ctx);
    if (stageCoastlines) {
        const t = timeStart("ExpandCoasts");
        expandCoasts(iWidth, iHeight);
        timeEnd(t);
    }
    else {
        console.log("[StageManifest] Coastlines stage disabled — skipping expandCoasts()");
    }
    // Reset StoryTags and tag continental margins before coast shaping
    if (stageStorySeed) {
        resetStoryTags();
        console.log("Imprinting continental margins (active/passive)...");
        storyTagContinentalMargins();
    }
    // Add post-processing to make coasts more rugged (margin-aware) and place a few islands
    if (stageCoastlines) {
        const t = timeStart("RuggedCoasts");
        layerAddRuggedCoasts(iWidth, iHeight, ctx);
        timeEnd(t);
    }
    // Climate Story v0.1: Tag narrative motifs after coasts exist
    if (stageStoryHotspots || stageStoryRifts) {
        resetStoryTags();
    }
    if (stageStoryHotspots) {
        console.log("Drawing hotspot trails...");
        storyTagHotspotTrails(iWidth, iHeight);
    }
    if (stageStoryRifts) {
        console.log("Marking rift lines and shoulders...");
        storyTagRiftValleys(iWidth, iHeight);
    }
    if (stageStoryOrogeny) {
        console.log("Tagging orogenic belts...");
        storyTagOrogenyBelts();
        logWorldModelHistograms(WorldModel, {
            riftSet: StoryTags.riftLine,
            beltSet: OrogenyCache.belts,
            bins: 12,
        });
    }
    // Re-tag continental margins for downstream consumers (islands/features) after reset
    if (stageStorySeed) {
        storyTagContinentalMargins();
    }
    // Strategic Corridors: tag pre-islands lanes and land corridors
    if (stageStoryCorridorsPre) {
        storyTagStrategicCorridors("preIslands");
        logCorridorAsciiOverlay();
    }
    if (stageStorySeed || stageStoryHotspots || stageStoryRifts || stageStoryOrogeny) {
        devLogIf("LOG_STORY_TAGS", "StoryTags summary follows");
        logStoryTagsSummary(StoryTags, OrogenyCache);
    }
    if (stageIslands) {
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
    if (stageMountains) {
        const t = timeStart("Mountains & Hills (Physics)");
        layerAddMountainsPhysics(ctx, mountainOptions);
        timeEnd(t);
        if (stageWorldModel) {
            logBoundaryMetrics(WorldModel, { stage: "post-mountains" });
        }
    }
    if (stageVolcanoes) {
        const t = timeStart("Volcanoes");
        layerAddVolcanoesPlateAware(ctx, volcanoOptions);
        timeEnd(t);
        if (stageWorldModel) {
            logBoundaryMetrics(WorldModel, { stage: "post-volcanoes" });
        }
    }
    if (stageMountains || stageVolcanoes) {
        logTerrainReliefAscii("post-volcanoes");
    }
    // Lakes – fewer than before
    if (stageLakes) {
        const t = timeStart("Lakes");
        generateLakes(iWidth, iHeight, iTilesPerLake);
        timeEnd(t);
        syncHeightfield(ctx);
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
    // Commit the latest mountain/hill assignments before climate stages.
    // Base-standard scripts call TerrainBuilder.buildElevation() here so the
    // engine propagates terrain height for rainfall, biomes, and placement.
    TerrainBuilder.buildElevation();
    // Create moderated rainfall patterns (keep enhanced but gentle)
    if (stageClimateBaseline) {
        const t = timeStart("Climate: Baseline");
        applyClimateBaseline(iWidth, iHeight, ctx);
        timeEnd(t);
        logRainfallAscii("baseline");
        logRainfallStats("baseline", iWidth, iHeight);
    }
    if (stageStorySwatches) {
        const t = timeStart("Climate: Swatches");
        const swatchResult = storyTagClimateSwatches(ctx);
        if (swatchResult && swatchResult.kind) {
            devLogIf("LOG_STORY_TAGS", `Climate Swatch: ${swatchResult.kind} (${swatchResult.tiles} tiles)`);
        }
        devLogIf("LOG_SWATCHES", "[Swatches] result", swatchResult || null);
        timeEnd(t);
    }
    // Rivers – closer to base values for balance
    if (stageRivers) {
        const t = timeStart("Rivers");
        TerrainBuilder.modelRivers(5, 15, globals.g_NavigableRiverTerrain);
        timeEnd(t);
        TerrainBuilder.validateAndFixTerrain();
        syncHeightfield(ctx);
        syncClimateField(ctx);
        TerrainBuilder.defineNamedRivers();
    }
    // Strategic Corridors: tag river-chain corridors post-rivers
    if (stageStoryCorridorsPost) {
        storyTagStrategicCorridors("postRivers");
        logCorridorAsciiOverlay();
    }
    // Refine rainfall with earthlike dynamics after rivers exist
    if (stageClimateRefine) {
        const t = timeStart("Climate: Earthlike Refinements");
        // Phase 1: Pass context to refactored layer
        refineClimateEarthlike(iWidth, iHeight, ctx);
        timeEnd(t);
        logRainfallAscii("refined");
        logRainfallStats("refined", iWidth, iHeight);
    }
    // Enhanced biome diversity
    if (stageBiomes) {
        const t = timeStart("Biomes");
        layerDesignateEnhancedBiomes(iWidth, iHeight);
        timeEnd(t);
        logBiomeAscii("final");
        logBiomeSummary("final", iWidth, iHeight);
    }
    // Add extensive feature variety
    if (stageFeatures) {
        const t = timeStart("Features");
        layerAddDiverseFeatures(iWidth, iHeight, ctx);
        timeEnd(t);
        TerrainBuilder.validateAndFixTerrain();
        syncHeightfield(ctx);
        AreaBuilder.recalculateAreas();
    }
    if (stageClimateBaseline || stageClimateRefine) {
        devLogIf("RAINFALL_HISTOGRAM", "Rainfall histogram (land tiles)");
        logRainfallHistogram(iWidth, iHeight, 12);
    }
    TerrainBuilder.storeWaterData();
    // Placement phase (wonders, floodplains, snow, resources, starts, discoveries, fertility, advanced starts)
    if (stagePlacement) {
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
