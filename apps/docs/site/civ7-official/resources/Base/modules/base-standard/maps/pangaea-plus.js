// pangaea-plus.ts
/**
 * Base game map script - Produces widely varied continents.
 * @packageDocumentation
 */
console.log("Generating using script pangea-plus.ts");
import { assignSingleContinentStartPositions, chooseStartSectors } from '/base-standard/maps/assign-starting-plots.js';
import { addMountains, addHills, buildRainfallMap, generateLakes } from '/base-standard/maps/elevation-terrain-generator.js';
import { addFeatures, designateBiomes } from '/base-standard/maps/feature-biome-generator.js';
import * as globals from '/base-standard/maps/map-globals.js';
import * as utilities from '/base-standard/maps/map-utilities.js';
import { addNaturalWonders } from '/base-standard/maps/natural-wonder-generator.js';
import { generateResources } from '/base-standard/maps/resource-generator.js';
import { addVolcanoes, addTundraVolcanoes } from '/base-standard/maps/volcano-generator.js';
import { assignAdvancedStartRegions } from '/base-standard/maps/assign-advanced-start-region.js';
import { generateDiscoveries } from '/base-standard/maps/discovery-generator.js';
import { generateSnow, dumpPermanentSnow } from '/base-standard/maps/snow-generator.js';
import { dumpStartSectors, dumpContinents, dumpTerrain, dumpElevation, dumpRainfall, dumpBiomes, dumpFeatures, dumpResources, dumpNoisePredicate } from '/base-standard/maps/map-debug-helpers.js';
function requestMapData(initParams) {
    console.log(initParams.width);
    console.log(initParams.height);
    console.log(initParams.topLatitude);
    console.log(initParams.bottomLatitude);
    console.log(initParams.wrapX);
    console.log(initParams.wrapY);
    console.log(initParams.mapSize);
    engine.call("SetMapInitData", initParams);
}
function generateMap() {
    console.log("Generating a map!");
    console.log(`Age - ${GameInfo.Ages.lookup(Game.age).AgeType}`);
    let iWidth = GameplayMap.getGridWidth();
    let iHeight = GameplayMap.getGridHeight();
    let uiMapSize = GameplayMap.getMapSize();
    let startPositions = [];
    let mapInfo = GameInfo.Maps.lookup(uiMapSize);
    if (mapInfo == null)
        return;
    let iNumNaturalWonders = mapInfo.NumNaturalWonders;
    let iTilesPerLake = mapInfo.LakeGenerationFrequency;
    let iNumPlayers1 = mapInfo.PlayersLandmass1;
    let iNumPlayers2 = mapInfo.PlayersLandmass2;
    // Decide which side will be the dominant landmass (80%)
    let bWestDominant = TerrainBuilder.getRandomNumber(2, "Choose Dominant Hemisphere") === 0; // Randomly pick West or East
    console.log(`Dominant Landmass: ${bWestDominant ? "West (80%)" : "East (80%)"}`);
    let westContinent;
    let westContinent2;
    let eastContinent;
    let eastContinent2;
    let iOceanWaterColumns = (globals.g_OceanWaterColumns + mapInfo.OceanWidth) * 1.75;
    if (bWestDominant) {
        // West small islands
        westContinent2 = {
            west: globals.g_AvoidSeamOffset * 2,
            east: Math.floor(iWidth * 0.10),
            south: globals.g_PolarWaterRows,
            north: iHeight - globals.g_PolarWaterRows,
            continent: 0
        };
        // Main Continent
        westContinent = {
            west: westContinent2.east + (globals.g_AvoidSeamOffset * 2),
            east: Math.floor(iWidth * 0.80) - globals.g_AvoidSeamOffset,
            south: globals.g_PolarWaterRows,
            north: iHeight - globals.g_PolarWaterRows,
            continent: 0
        };
        // East Islands
        eastContinent = {
            west: westContinent.east + (globals.g_AvoidSeamOffset * 2),
            east: Math.floor(iWidth * 0.90),
            south: globals.g_PolarWaterRows,
            north: iHeight - globals.g_PolarWaterRows,
            continent: 0
        };
        // More East Islands
        eastContinent2 = {
            west: eastContinent.east,
            east: iWidth - (globals.g_AvoidSeamOffset * 2),
            south: globals.g_PolarWaterRows,
            north: iHeight - globals.g_PolarWaterRows,
            continent: 0
        };
    }
    else {
        // West islands
        westContinent2 = {
            west: globals.g_AvoidSeamOffset * 2,
            east: Math.floor(iWidth * 0.10),
            south: globals.g_PolarWaterRows,
            north: iHeight - globals.g_PolarWaterRows,
            continent: 0
        };
        // More West Islands
        westContinent = {
            west: westContinent2.east,
            east: Math.floor(iWidth * 0.20) - (globals.g_AvoidSeamOffset * 2),
            south: globals.g_PolarWaterRows,
            north: iHeight - globals.g_PolarWaterRows,
            continent: 0
        };
        // Main Continent
        eastContinent = {
            west: westContinent.east + (globals.g_AvoidSeamOffset * 2),
            east: Math.floor(iWidth * 0.80),
            south: globals.g_PolarWaterRows,
            north: iHeight - globals.g_PolarWaterRows,
            continent: 0
        };
        // Small East Islands
        eastContinent2 = {
            west: eastContinent.east + (globals.g_AvoidSeamOffset * 2),
            east: iWidth - (globals.g_AvoidSeamOffset * 2),
            south: globals.g_PolarWaterRows,
            north: iHeight - globals.g_PolarWaterRows,
            continent: 0
        };
    }
    let startSectors = [];
    let iStartSectorRows = 0;
    let iStartSectorCols = 0;
    let startPosition = Configuration.getMapValue("StartPosition");
    if (startPosition == null) {
        startPosition = Database.makeHash('START_POSITION_STANDARD');
    }
    startPosition = Number(BigInt.asIntN(32, BigInt(startPosition)));
    let startPositionHash = Database.makeHash("START_POSITION_BALANCED");
    const ISLAND_COVERAGE_TARGET = 0.04; // ~4% of the map should be islands
    const totalTiles = iWidth * iHeight;
    let bIsBalanced = (startPosition == startPositionHash);
    if (bIsBalanced && totalTiles != 0) {
        console.log("Balanced Map");
        let bHumanNearEquator = utilities.needHumanNearEquator();
        iStartSectorRows = mapInfo.StartSectorRows;
        iStartSectorCols = mapInfo.StartSectorCols;
        startSectors = chooseStartSectors(iNumPlayers1, iNumPlayers2, iStartSectorRows, iStartSectorCols, bHumanNearEquator);
        dumpStartSectors(startSectors);
        createPrimaryLandmass(iWidth, iHeight, westContinent, eastContinent, iStartSectorRows, iStartSectorCols, startSectors, bWestDominant, iOceanWaterColumns);
        // Generate only islands in the smaller
        if (bWestDominant) {
            createSecondaryLandmass(iWidth, iHeight, eastContinent, eastContinent2);
            // add small islands to western ocean
            utilities.createIslands(iWidth, iHeight, westContinent2, westContinent2, 4);
            utilities.createIslands(iWidth, iHeight, westContinent2, westContinent2, 5);
            utilities.createIslands(iWidth, iHeight, westContinent2, westContinent2, 6);
            utilities.applyCoastalErosionAdjustingForStartSectors(westContinent, eastContinent, .1, 1.5, .8, iStartSectorRows, iStartSectorCols, startSectors);
            let islandTiles = countIslandTiles(iWidth, iHeight);
            let islandRatio = islandTiles / totalTiles;
            let attempts = 0;
            while (islandRatio < ISLAND_COVERAGE_TARGET && attempts < 3) {
                console.log("Island coverage too low: " + (islandRatio * 100).toFixed(2) + "%. Adding more islands.");
                utilities.createIslands(iWidth, iHeight, westContinent2, eastContinent2, 6);
                islandTiles = countIslandTiles(iWidth, iHeight);
                islandRatio = islandTiles / totalTiles;
                attempts++;
            }
        }
        else {
            createSecondaryLandmass(iWidth, iHeight, westContinent, westContinent2);
            // add small islands to eastern ocean
            utilities.createIslands(iWidth, iHeight, eastContinent2, eastContinent2, 4);
            utilities.createIslands(iWidth, iHeight, eastContinent2, eastContinent2, 5);
            utilities.createIslands(iWidth, iHeight, eastContinent2, eastContinent2, 6);
            utilities.applyCoastalErosionAdjustingForStartSectors(eastContinent, westContinent, .1, 1.5, .8, iStartSectorRows, iStartSectorCols, startSectors);
            let islandTiles = countIslandTiles(iWidth, iHeight);
            let islandRatio = islandTiles / totalTiles;
            let attempts = 0;
            while (islandRatio < ISLAND_COVERAGE_TARGET && attempts < 3) {
                console.log("Island coverage too low: " + (islandRatio * 100).toFixed(2) + "%. Adding more islands.");
                utilities.createIslands(iWidth, iHeight, eastContinent2, eastContinent2, 6);
                islandTiles = countIslandTiles(iWidth, iHeight);
                islandRatio = islandTiles / totalTiles;
                attempts++;
            }
        }
    }
    else if (totalTiles != 0) {
        console.log("Standard Map");
        let iFractalGrain = 2;
        let iWaterPercent = globals.g_WaterPercent * globals.g_Cutoff;
        let iLargestContinentPercent = 30;
        utilities.createOrganicLandmasses(iWidth, iHeight, westContinent, eastContinent, iFractalGrain, iWaterPercent, iLargestContinentPercent);
        utilities.addPlotTags(iHeight, iWidth, eastContinent.west);
        if (bWestDominant) {
            createSecondaryLandmass(iWidth, iHeight, eastContinent, eastContinent2);
            // add small islands to western ocean
            utilities.createIslands(iWidth, iHeight, westContinent2, westContinent2, 4);
            utilities.createIslands(iWidth, iHeight, westContinent2, westContinent2, 6);
            utilities.createIslands(iWidth, iHeight, westContinent2, westContinent2, 6);
            utilities.applyCoastalErosion(westContinent, .15, 1.5, .8, false);
            utilities.applyCoastalErosion(eastContinent, .01, 1.5, .8, true);
            let islandTiles = countIslandTiles(iWidth, iHeight);
            let islandRatio = islandTiles / totalTiles;
            let attempts = 0;
            while (islandRatio < ISLAND_COVERAGE_TARGET && attempts < 3) {
                console.log("Island coverage too low: " + (islandRatio * 100).toFixed(2) + "%. Adding more islands.");
                utilities.createIslands(iWidth, iHeight, westContinent2, westContinent2, 6);
                islandTiles = countIslandTiles(iWidth, iHeight);
                islandRatio = islandTiles / totalTiles;
                attempts++;
            }
        }
        else {
            createSecondaryLandmass(iWidth, iHeight, westContinent, westContinent2);
            // add small islands to eastern ocean
            utilities.createIslands(iWidth, iHeight, eastContinent2, eastContinent2, 4);
            utilities.createIslands(iWidth, iHeight, eastContinent2, eastContinent2, 6);
            utilities.createIslands(iWidth, iHeight, eastContinent2, eastContinent2, 6);
            utilities.applyCoastalErosion(westContinent, .01, 1.5, .8, true);
            utilities.applyCoastalErosion(eastContinent, .15, 1.5, .8, false);
            let islandTiles = countIslandTiles(iWidth, iHeight);
            let islandRatio = islandTiles / totalTiles;
            let attempts = 0;
            while (islandRatio < ISLAND_COVERAGE_TARGET && attempts < 3) {
                console.log("Island coverage too low: " + (islandRatio * 100).toFixed(2) + "%. Adding more islands.");
                utilities.createIslands(iWidth, iHeight, eastContinent2, eastContinent2, 6);
                islandTiles = countIslandTiles(iWidth, iHeight);
                islandRatio = islandTiles / totalTiles;
                attempts++;
            }
        }
        utilities.applyCoastalErosion(westContinent2, .01, 1.5, .8, true);
        utilities.applyCoastalErosion(eastContinent2, .01, 1.5, .8, true);
    }
    TerrainBuilder.validateAndFixTerrain();
    expandCoastsPlus(westContinent.west, westContinent.east, iHeight);
    expandCoastsPlus(eastContinent.west, eastContinent.east, iHeight);
    expandCoastsPlus(0, westContinent.west - globals.g_OceanWaterColumns, iHeight);
    expandCoastsPlus(westContinent.east + globals.g_OceanWaterColumns, eastContinent.west - globals.g_OceanWaterColumns, iHeight);
    expandCoastsPlus(eastContinent.east + globals.g_OceanWaterColumns, 0, iHeight);
    utilities.adjustOceanPlotTags(bWestDominant);
    AreaBuilder.recalculateAreas();
    TerrainBuilder.stampContinents();
    addMountains(iWidth, iHeight);
    addVolcanoes(iWidth, iHeight);
    generateLakes(iWidth, iHeight, iTilesPerLake);
    utilities.adjustLakePlotTags(westContinent, true);
    utilities.adjustLakePlotTags(westContinent2, true);
    utilities.adjustLakePlotTags(eastContinent, false);
    utilities.adjustLakePlotTags(eastContinent2, false);
    AreaBuilder.recalculateAreas();
    TerrainBuilder.buildElevation();
    addHills(iWidth, iHeight);
    buildRainfallMap(iWidth, iHeight);
    TerrainBuilder.modelRivers(5, 15, globals.g_NavigableRiverTerrain);
    TerrainBuilder.validateAndFixTerrain();
    TerrainBuilder.defineNamedRivers();
    designateBiomes(iWidth, iHeight);
    addTundraVolcanoes(iWidth, iHeight);
    addNaturalWonders(iWidth, iHeight, iNumNaturalWonders);
    TerrainBuilder.addFloodplains(4, 10);
    addFeatures(iWidth, iHeight);
    TerrainBuilder.validateAndFixTerrain();
    AreaBuilder.recalculateAreas();
    TerrainBuilder.storeWaterData();
    generateSnow(iWidth, iHeight);
    dumpStartSectors(startSectors);
    dumpContinents(iWidth, iHeight);
    dumpTerrain(iWidth, iHeight);
    dumpElevation(iWidth, iHeight);
    dumpRainfall(iWidth, iHeight);
    dumpBiomes(iWidth, iHeight);
    dumpFeatures(iWidth, iHeight);
    dumpPermanentSnow(iWidth, iHeight);
    //check which hemisphere was the primary landmass and start all players on it
    if (bWestDominant) {
        generateResources(iWidth, iHeight);
        startPositions = assignSingleContinentStartPositions(iNumPlayers1 + iNumPlayers2, westContinent, iStartSectorRows, iStartSectorCols, startSectors);
        utilities.replaceIslandResources(iWidth, iHeight, "RESOURCECLASS_TREASURE");
    }
    else {
        generateResources(iWidth, iHeight);
        startPositions = assignSingleContinentStartPositions(iNumPlayers1 + iNumPlayers2, eastContinent, iStartSectorRows, iStartSectorCols, startSectors);
        utilities.replaceIslandResources(iWidth, iHeight, "RESOURCECLASS_TREASURE");
    }
    generateDiscoveries(iWidth, iHeight, startPositions);
    dumpResources(iWidth, iHeight);
    FertilityBuilder.recalculate(); // Must be after features are added.
    let seed = GameplayMap.getRandomSeed(); // can use any seed you want for different noises
    let avgDistanceBetweenPoints = 3;
    let normalizedRangeSmoothing = 2;
    let poisson = TerrainBuilder.generatePoissonMap(seed, avgDistanceBetweenPoints, normalizedRangeSmoothing);
    let poissonPred = (val) => {
        return val >= 1 ? "*" : " ";
    };
    dumpNoisePredicate(iWidth, iHeight, poisson, poissonPred);
    assignAdvancedStartRegions();
}
// Register listeners.
engine.on('RequestMapInitData', requestMapData);
engine.on('GenerateMap', generateMap);
console.log("Loaded pangaea-plus.ts");
function createPrimaryLandmass(iWidth, iHeight, continent1, continent2, iStartSectorRows, iStartSectorCols, startSectors, bWestSide, iOceanWaterColumns) {
    FractalBuilder.create(globals.g_LandmassFractal, iWidth, iHeight, 2, 0);
    let iWaterHeight = FractalBuilder.getHeightFromPercent(globals.g_LandmassFractal, globals.g_WaterPercent);
    let iBuffer = Math.floor(iHeight / 18.0);
    let iBuffer2 = Math.floor(iWidth / 28.0);
    for (let iY = 0; iY < iHeight; iY++) {
        for (let iX = 0; iX < iWidth; iX++) {
            let terrain = globals.g_FlatTerrain;
            let iRandom = TerrainBuilder.getRandomNumber(iBuffer, "Random Top/Bottom Edges");
            let iRandom2 = TerrainBuilder.getRandomNumber(iBuffer2, "Random Left/Right Edges");
            // Initialize plot tag
            TerrainBuilder.setPlotTag(iX, iY, PlotTags.PLOT_TAG_NONE);
            //  Must be water if at the poles
            if (iY < continent1.south + iRandom || iY >= continent1.north - iRandom) {
                terrain = globals.g_OceanTerrain;
            }
            // Of if between the continents
            else if (iX < continent1.west + iRandom2 || iX >= continent2.east - iRandom2 ||
                (iX >= continent1.east - iRandom2 && iX < continent2.west + iRandom2)) {
                terrain = globals.g_OceanTerrain;
            }
            else if ((bWestSide && iX > continent1.east + iOceanWaterColumns) || (bWestSide == false && iX < continent2.west - iOceanWaterColumns)) {
                terrain = globals.g_OceanTerrain;
            }
            else {
                let iPlotHeight = utilities.getHeightAdjustingForStartSector(iX, iY, iWaterHeight, globals.g_FractalWeight, globals.g_CenterWeight, globals.g_StartSectorWeight, continent1, continent2, iStartSectorRows, iStartSectorCols, startSectors);
                // Finally see whether or not this stays as Land or has too low a score and drops back to water
                if (iPlotHeight < iWaterHeight * globals.g_Cutoff) {
                    terrain = globals.g_OceanTerrain;
                }
            }
            // Add plot tag if applicable
            if (terrain != globals.g_OceanTerrain && terrain != globals.g_CoastTerrain) {
                utilities.addLandmassPlotTags(iX, iY, continent2.west);
            }
            else {
                utilities.addWaterPlotTags(iX, iY, continent2.west);
            }
            TerrainBuilder.setTerrainType(iX, iY, terrain);
        }
    }
}
function createSecondaryLandmass(iWidth, iHeight, continent1, continent2) {
    console.log("Generating secondary landmass as small islands...");
    // Clear any existing landmass in the region
    utilities.clearContinent(continent1);
    utilities.clearContinent(continent2);
    // Generate multiple groups of islands
    utilities.createIslands(iWidth, iHeight, continent1, continent2, 4);
    utilities.createIslands(iWidth, iHeight, continent1, continent2, 6);
    utilities.createIslands(iWidth, iHeight, continent1, continent2, 6);
}
export function expandCoastsPlus(iWest, iEast, iHeight) {
    for (let iY = 0; iY < iHeight; iY++) {
        for (let iX = iWest; iX < iEast; iX++) {
            let terrain = GameplayMap.getTerrainType(iX, iY);
            if (terrain == globals.g_OceanTerrain) {
                if (GameplayMap.isAdjacentToShallowWater(iX, iY) && TerrainBuilder.getRandomNumber(2, "Shallow Water Scater Scatter") == 0) {
                    TerrainBuilder.setTerrainType(iX, iY, globals.g_CoastTerrain);
                }
            }
        }
    }
}
function countIslandTiles(iWidth, iHeight) {
    let islandCount = 0;
    for (let y = 0; y < iHeight; y++) {
        for (let x = 0; x < iWidth; x++) {
            if (GameplayMap.hasPlotTag(x, y, PlotTags.PLOT_TAG_ISLAND)) {
                islandCount++;
            }
        }
    }
    return islandCount;
}

//# sourceMappingURL=file:///base-standard/maps/pangaea-plus.js.map
