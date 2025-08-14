// terra-incognita.ts
/**
 * Base game map script - Produces widely varied continents.
 * @packageDocumentation
 */
console.log("Generating using script terra-incognita.ts");
import { assignStartPositions, chooseStartSectors } from '/base-standard/maps/assign-starting-plots.js';
import { addMountains, addHills, buildRainfallMap, generateLakes } from '/base-standard/maps/elevation-terrain-generator.js';
import { addFeatures, designateBiomes } from '/base-standard/maps/feature-biome-generator.js';
import * as globals from '/base-standard/maps/map-globals.js';
import * as utilities from '/base-standard/maps/map-utilities.js';
import { addNaturalWonders } from '/base-standard/maps/natural-wonder-generator.js';
import { generateResources } from '/base-standard/maps/resource-generator.js';
import { addTundraVolcanoes, addVolcanoes } from '/base-standard/maps/volcano-generator.js';
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
    // Establish continent boundaries
    let iOceanWaterColumns = (globals.g_OceanWaterColumns + mapInfo.OceanWidth) * 1.75;
    let westContinent = {
        west: (3 * globals.g_AvoidSeamOffset) + globals.g_IslandWidth,
        east: (iWidth / 2) - globals.g_AvoidSeamOffset,
        south: globals.g_PolarWaterRows,
        north: iHeight - globals.g_PolarWaterRows,
        continent: 0
    };
    let eastContinent = {
        west: westContinent.east + (4 * globals.g_AvoidSeamOffset) + globals.g_IslandWidth,
        east: iWidth - globals.g_AvoidSeamOffset,
        south: globals.g_PolarWaterRows,
        north: iHeight - globals.g_PolarWaterRows,
        continent: 0
    };
    let westContinent2 = {
        west: globals.g_AvoidSeamOffset,
        east: globals.g_AvoidSeamOffset + globals.g_IslandWidth,
        south: globals.g_PolarWaterRows,
        north: iHeight - globals.g_PolarWaterRows,
        continent: 0
    };
    let eastContinent2 = {
        west: (iWidth / 2) + globals.g_AvoidSeamOffset,
        east: (iWidth / 2) + globals.g_AvoidSeamOffset + globals.g_IslandWidth,
        south: globals.g_PolarWaterRows,
        north: iHeight - globals.g_PolarWaterRows,
        continent: 0
    };
    let startSectors = [];
    let iStartSectorRows = 0;
    let iStartSectorCols = 0;
    let startPosition = Configuration.getMapValue("StartPosition");
    if (startPosition == null) {
        startPosition = Database.makeHash('START_POSITION_STANDARD');
    }
    startPosition = Number(BigInt.asIntN(32, BigInt(startPosition))); // Convert to signed int32.
    let startPositionHash = Database.makeHash("START_POSITION_BALANCED");
    let bIsBalanced = (startPosition == startPositionHash);
    if (bIsBalanced) {
        console.log("Balanced Map");
        let iRandom = TerrainBuilder.getRandomNumber(2, "East or West");
        console.log("Random Hemisphere: " + iRandom);
        if (iRandom == 1) {
            let iNum1 = iNumPlayers1;
            let iNum2 = iNumPlayers2;
            iNumPlayers1 = iNum2;
            iNumPlayers2 = iNum1;
        }
        let bHumanNearEquator = utilities.needHumanNearEquator();
        iStartSectorRows = mapInfo.StartSectorRows;
        iStartSectorCols = mapInfo.StartSectorCols;
        startSectors = chooseStartSectors(iNumPlayers1, iNumPlayers2, iStartSectorRows, iStartSectorCols, bHumanNearEquator);
        dumpStartSectors(startSectors);
        createPrimaryLandmass(iWidth, iHeight, westContinent, eastContinent, iStartSectorRows, iStartSectorCols, startSectors, iNumPlayers1 > iNumPlayers2, iOceanWaterColumns);
        createSecondaryLandmassBalanced(iWidth, iHeight, westContinent, eastContinent, iStartSectorRows, iStartSectorCols, startSectors, iNumPlayers1 > iNumPlayers2, iOceanWaterColumns);
        utilities.createIslands(iWidth, iHeight, westContinent2, eastContinent2, 4);
        utilities.createIslands(iWidth, iHeight, westContinent2, eastContinent2, 5);
        utilities.createIslands(iWidth, iHeight, westContinent2, eastContinent2, 6);
        utilities.applyCoastalErosionAdjustingForStartSectors(westContinent, eastContinent, .02, 1.5, .8, iStartSectorRows, iStartSectorCols, startSectors);
        utilities.applyCoastalErosionAdjustingForStartSectors(eastContinent, eastContinent, .02, 1.5, .8, iStartSectorRows, iStartSectorCols, startSectors);
        utilities.applyCoastalErosion(westContinent2, .02, 1.5, .8, true);
        utilities.applyCoastalErosion(eastContinent2, .02, 1.5, .8, true);
    }
    else {
        console.log("Standard Map");
        let iFractalGrain = 2;
        let iWaterPercent = globals.g_WaterPercent * globals.g_Cutoff;
        let iLargestContinentPercent = 15;
        utilities.createOrganicLandmasses(iWidth, iHeight, westContinent, eastContinent, iFractalGrain, iWaterPercent, iLargestContinentPercent);
        // Is biggest area in west or east?
        let iAreaID = AreaBuilder.findBiggestArea(false);
        let kBoundaries = AreaBuilder.getAreaBoundary(iAreaID);
        if (kBoundaries.west > (iWidth / 2)) {
            let iNum1 = iNumPlayers1;
            let iNum2 = iNumPlayers2;
            iNumPlayers1 = iNum2;
            iNumPlayers2 = iNum1;
            utilities.clearContinent(westContinent);
            createSecondaryLandmassStandard(westContinent);
        }
        else {
            utilities.clearContinent(eastContinent);
            createSecondaryLandmassStandard(eastContinent);
        }
        utilities.addPlotTags(iHeight, iWidth, eastContinent.west);
        utilities.createIslands(iWidth, iHeight, westContinent2, eastContinent2, 5);
        utilities.createIslands(iWidth, iHeight, westContinent2, eastContinent2, 6);
        utilities.applyCoastalErosion(westContinent, .02, 1.5, .8, false);
        utilities.applyCoastalErosion(eastContinent, .02, 1.5, .8, false);
        utilities.applyCoastalErosion(westContinent2, .1, 1.5, .8, true);
        utilities.applyCoastalErosion(eastContinent2, .1, 1.5, .8, true);
    }
    TerrainBuilder.validateAndFixTerrain();
    expandCoastsPlus(westContinent.west, westContinent.east, iHeight);
    expandCoastsPlus(eastContinent.west, eastContinent.east, iHeight);
    expandCoastsPlus(0, westContinent.west - globals.g_OceanWaterColumns, iHeight);
    expandCoastsPlus(westContinent.east + globals.g_OceanWaterColumns, eastContinent.west - globals.g_OceanWaterColumns, iHeight);
    expandCoastsPlus(eastContinent.east + globals.g_OceanWaterColumns, 0, iHeight);
    utilities.adjustOceanPlotTags(iNumPlayers1 > iNumPlayers2);
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
    generateResources(iWidth, iHeight);
    startPositions = assignStartPositions(iNumPlayers1, iNumPlayers2, westContinent, eastContinent, iStartSectorRows, iStartSectorCols, startSectors);
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
console.log("Loaded terra-incognita.ts");
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
function createSecondaryLandmassBalanced(iWidth, iHeight, continent1, continent2, iStartSectorRows, iStartSectorCols, startSectors, bWestSide, iOceanWaterColumns) {
    let iSize = TerrainBuilder.getRandomNumber(6, "Random Land Size");
    console.log("Random Land Size " + iSize);
    FractalBuilder.create(globals.g_LandmassFractal, iWidth, iHeight, iSize, 0);
    let iRanHeight = 130 - (iSize * 10);
    let iWaterHeight = FractalBuilder.getHeightFromPercent(globals.g_LandmassFractal, (globals.g_WaterPercent * iRanHeight) / 100);
    let iBuffer = Math.floor(iHeight / 18.0);
    let iBuffer2 = Math.floor(iWidth / 28.0);
    for (let iY = 0; iY < iHeight; iY++) {
        for (let iX = 0; iX < iWidth; iX++) {
            let terrain = globals.g_FlatTerrain;
            let iRandom = TerrainBuilder.getRandomNumber(iBuffer, "Random Top/Bottom Edges");
            let iRandom2 = TerrainBuilder.getRandomNumber(iBuffer2, "Random Left/Right Edges");
            //  Must be water if at the poles
            if (iY < continent1.south + iRandom || iY >= continent1.north - iRandom) {
                terrain = globals.g_OceanTerrain;
                // Initialize plot tag
                TerrainBuilder.setPlotTag(iX, iY, PlotTags.PLOT_TAG_NONE);
                // Add plot tag if applicable
                if (terrain != globals.g_OceanTerrain && terrain != globals.g_CoastTerrain) {
                    utilities.addLandmassPlotTags(iX, iY, continent2.west);
                }
                else {
                    utilities.addWaterPlotTags(iX, iY, continent2.west);
                }
                TerrainBuilder.setTerrainType(iX, iY, terrain);
            }
            // Of if between the continents
            else if (iX < continent1.west + iRandom2 || iX >= continent2.east - iRandom2 ||
                (iX >= continent1.east - iRandom2 && iX < continent2.west + iRandom2)) {
                terrain = globals.g_OceanTerrain;
                // Initialize plot tag
                TerrainBuilder.setPlotTag(iX, iY, PlotTags.PLOT_TAG_NONE);
                // Add plot tag if applicable
                if (terrain != globals.g_OceanTerrain && terrain != globals.g_CoastTerrain) {
                    utilities.addLandmassPlotTags(iX, iY, continent2.west);
                }
                else {
                    utilities.addWaterPlotTags(iX, iY, continent2.west);
                }
                TerrainBuilder.setTerrainType(iX, iY, terrain);
            }
            else if ((bWestSide && iX > continent1.east + iOceanWaterColumns) || (bWestSide == false && iX < continent2.west - iOceanWaterColumns)) {
                let iPlotHeight = utilities.getHeightAdjustingForStartSector(iX, iY, iWaterHeight, globals.g_FractalWeight, globals.g_CenterWeight, globals.g_StartSectorWeight, continent1, continent2, iStartSectorRows, iStartSectorCols, startSectors);
                // Finally see whether or not this stays as Land or has too low a score and drops back to water
                if (iPlotHeight < iWaterHeight * globals.g_Cutoff) {
                    terrain = globals.g_OceanTerrain;
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
}
function createSecondaryLandmassStandard(continent1) {
    console.log("Creating new landmass in this box");
    console.log("  North: " + continent1.north);
    console.log("  South: " + continent1.south);
    console.log("  East:  " + continent1.east);
    console.log("  West:  " + continent1.west);
    let iGrain = TerrainBuilder.getRandomNumber(3, "Secondary Landmass Fractal Grain") + 2; // Min of 2
    console.log("Secondary Landmass Fractal Grain: " + iGrain);
    FractalBuilder.create(globals.g_LandmassFractal, (continent1.east - continent1.west + 1), (continent1.north - continent1.south + 1), iGrain, 0);
    let iWaterHeightRange = 30;
    let iRanHeight = TerrainBuilder.getRandomNumber(iWaterHeightRange, "Random Water Height");
    console.log("Random Water Height: " + iRanHeight);
    // Normally we use water height of 40, let's increase that a bit on average and use a range from 35 to 65
    let iWaterHeight = FractalBuilder.getHeightFromPercent(globals.g_LandmassFractal, (globals.g_WaterPercent * globals.g_Cutoff) + iRanHeight - 5);
    for (let iY = continent1.south; iY <= continent1.north; iY++) {
        for (let iX = continent1.west; iX <= continent1.east; iX++) {
            let terrain = globals.g_FlatTerrain;
            let iPlotHeight = FractalBuilder.getHeight(globals.g_LandmassFractal, iX - continent1.west, iY - continent1.south);
            if (iPlotHeight >= iWaterHeight) {
                // Apply random feathering if along an edge
                if (iY == continent1.south || iY == continent1.north || iX == continent1.west || iX == continent1.east) {
                    if (TerrainBuilder.getRandomNumber(2, "Feather hard edges") == 0) {
                        TerrainBuilder.setTerrainType(iX, iY, terrain);
                    }
                }
                // Not along an edge, so always change to land if above the water height
                else {
                    TerrainBuilder.setTerrainType(iX, iY, terrain);
                }
            }
        }
    }
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

//# sourceMappingURL=file:///base-standard/maps/terra-incognita.js.map
