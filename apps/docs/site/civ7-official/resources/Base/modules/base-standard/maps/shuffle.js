// shuffle.ts
/**
 * Base game map script - Produces widely varied map.
 * @packageDocumentation
 */
console.log("Generating using script shuffle.ts");
import { assignStartPositions, chooseStartSectors } from '/base-standard/maps/assign-starting-plots.js';
import { addMountains, addHills, buildRainfallMap, generateLakes } from '/base-standard/maps/elevation-terrain-generator.js';
import { addFeatures, designateBiomes } from '/base-standard/maps/feature-biome-generator.js';
import * as globals from '/base-standard/maps/map-globals.js';
import * as utilities from '/base-standard/maps/map-utilities.js';
import { addNaturalWonders } from '/base-standard/maps/natural-wonder-generator.js';
import { generateResources } from '/base-standard/maps/resource-generator.js';
import { addVolcanoes } from '/base-standard/maps/volcano-generator.js';
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
    let iRandom = TerrainBuilder.getRandomNumber(2, "East or West");
    if (iRandom == 1) {
        let iNum1 = iNumPlayers1;
        let iNum2 = iNumPlayers2;
        iNumPlayers1 = iNum2;
        iNumPlayers2 = iNum1;
    }
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
        let bHumanNearEquator = utilities.needHumanNearEquator();
        iStartSectorRows = mapInfo.StartSectorRows;
        iStartSectorCols = mapInfo.StartSectorCols;
        startSectors = chooseStartSectors(iNumPlayers1, iNumPlayers2, iStartSectorRows, iStartSectorCols, bHumanNearEquator);
        dumpStartSectors(startSectors);
        createLandmasses(iWidth, iHeight, westContinent, eastContinent, iStartSectorRows, iStartSectorCols, startSectors, iOceanWaterColumns);
        utilities.applyCoastalErosionAdjustingForStartSectors(westContinent, eastContinent, .02, 1.5, .8, iStartSectorRows, iStartSectorCols, startSectors);
        utilities.applyCoastalErosionAdjustingForStartSectors(eastContinent, eastContinent, .02, 1.5, .8, iStartSectorRows, iStartSectorCols, startSectors);
        utilities.applyCoastalErosion(westContinent2, .02, 1.5, .8, true);
        utilities.applyCoastalErosion(eastContinent2, .02, 1.5, .8, true);
    }
    else {
        console.log("Standard Map");
        createLandmasses(iWidth, iHeight, westContinent, eastContinent, iStartSectorRows, iStartSectorCols, startSectors, iOceanWaterColumns);
        utilities.applyCoastalErosion(westContinent, .02, 1.5, .8, false);
        utilities.applyCoastalErosion(eastContinent, .02, 1.5, .8, false);
        utilities.applyCoastalErosion(westContinent2, .1, 1.5, .8, true);
        utilities.applyCoastalErosion(eastContinent2, .1, 1.5, .8, true);
    }
    utilities.addPlotTags(iHeight, iWidth, eastContinent.west);
    TerrainBuilder.validateAndFixTerrain();
    utilities.createIslands(iWidth, iHeight, westContinent2, eastContinent2, 4);
    utilities.createIslands(iWidth, iHeight, westContinent2, eastContinent2, 5);
    utilities.createIslands(iWidth, iHeight, westContinent2, eastContinent2, 6);
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
    AreaBuilder.recalculateAreas();
    TerrainBuilder.buildElevation();
    addHills(iWidth, iHeight);
    buildRainfallMap(iWidth, iHeight);
    let iRandomRiver = TerrainBuilder.getRandomNumber(10, "Intensity of Rivers");
    if (iRandomRiver == 0) {
        TerrainBuilder.modelRivers(10, 85, globals.g_NavigableRiverTerrain);
    }
    else if (iRandomRiver < 3) {
        TerrainBuilder.modelRivers(5, 70, globals.g_NavigableRiverTerrain);
    }
    else {
        TerrainBuilder.modelRivers(5, 15, globals.g_NavigableRiverTerrain);
    }
    TerrainBuilder.validateAndFixTerrain();
    TerrainBuilder.defineNamedRivers();
    designateBiomes(iWidth, iHeight);
    addNaturalWonders(iWidth, iHeight, iNumNaturalWonders);
    TerrainBuilder.addFloodplains(4, 10);
    addFeatures(iWidth, iHeight);
    TerrainBuilder.validateAndFixTerrain();
    for (let iY = 0; iY < iHeight; iY++) {
        for (let iX = 0; iX < iWidth; iX++) {
            let terrain = GameplayMap.getTerrainType(iX, iY);
            if (terrain == globals.g_CoastTerrain) {
                TerrainBuilder.setPlotTag(iX, iY, PlotTags.PLOT_TAG_WATER);
                if (iNumPlayers1 > iNumPlayers2) {
                    if (iX < westContinent.west - 2 || iX > westContinent.east + 2) {
                        //console.log("Islands on the Coast: " + iX + ", " + iY)
                        TerrainBuilder.addPlotTag(iX, iY, PlotTags.PLOT_TAG_EAST_WATER);
                    }
                    else {
                        //console.log("Main Coast: " + iX + ", " + iY)
                        TerrainBuilder.addPlotTag(iX, iY, PlotTags.PLOT_TAG_WEST_WATER);
                    }
                }
                else {
                    if (iX > eastContinent.east + 2 || iX < eastContinent.west - 2) {
                        //console.log("Islands on the Coast2: " + iX + ", " + iY)
                        TerrainBuilder.addPlotTag(iX, iY, PlotTags.PLOT_TAG_WEST_WATER);
                    }
                    else {
                        //console.log("Main Coast2: " + iX + ", " + iY)
                        TerrainBuilder.addPlotTag(iX, iY, PlotTags.PLOT_TAG_EAST_WATER);
                    }
                }
            }
        }
    }
    AreaBuilder.recalculateAreas();
    TerrainBuilder.storeWaterData();
    generateSnow(iWidth, iHeight);
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
console.log("Loaded shuffle.ts");
function createLandmasses(iWidth, iHeight, continent1, continent2, iStartSectorRows, iStartSectorCols, startSectors, iOceanWaterColumns) {
    let iRandomLandmassSetup = TerrainBuilder.getRandomNumber(4, "Shuffle Map Landmass Structure");
    if (iRandomLandmassSetup == 0) {
        createArchipelago(iWidth, iHeight, continent1, continent2, iStartSectorRows, iStartSectorCols, startSectors);
        console.log("Random Landmass Setup: Archipelago");
    }
    else if (iRandomLandmassSetup == 1) {
        createContinents(iWidth, iHeight, continent1, continent2, iStartSectorRows, iStartSectorCols, startSectors);
        console.log("Random Landmass Setup: Continents");
    }
    else if (iRandomLandmassSetup == 2) {
        createFractal(iWidth, iHeight, continent1, continent2, iStartSectorRows, iStartSectorCols, startSectors);
        console.log("Random Landmass Setup: Fractal");
    }
    else if (iRandomLandmassSetup == 3) {
        for (let iY = 0; iY < iHeight; iY++) {
            for (let iX = 0; iX < iWidth; iX++) {
                TerrainBuilder.setTerrainType(iX, iY, globals.g_OceanTerrain);
                TerrainBuilder.setPlotTag(iX, iY, PlotTags.PLOT_TAG_NONE);
            }
        }
        createTerraMass(iWidth, iHeight, continent1, continent2, iStartSectorRows, iStartSectorCols, startSectors, true, iOceanWaterColumns);
        createTerraMass(iWidth, iHeight, continent1, continent2, iStartSectorRows, iStartSectorCols, startSectors, false, iOceanWaterColumns);
        console.log("Random Landmass Setup: Terra");
    }
}
function createArchipelago(iWidth, iHeight, continent1, continent2, iStartSectorRows, iStartSectorCols, startSectors) {
    for (let iY = 0; iY < iHeight; iY++) {
        for (let iX = 0; iX < iWidth; iX++) {
            TerrainBuilder.setTerrainType(iX, iY, globals.g_OceanTerrain);
            TerrainBuilder.setPlotTag(iX, iY, PlotTags.PLOT_TAG_NONE);
        }
    }
    //console.log("Set Water World");
    generateFractalLayerWithoutHills(iWidth, iHeight, continent1, continent2, iStartSectorRows, iStartSectorCols, startSectors, 3);
    //console.log("Islands1");
    //dumpTerrain(iWidth, iHeight);
    generateFractalLayerWithoutHills(iWidth, iHeight, continent1, continent2, iStartSectorRows, iStartSectorCols, startSectors, 4);
    //console.log("Islands2");
    //dumpTerrain(iWidth, iHeight);
    generateFractalLayerWithoutHills(iWidth, iHeight, continent1, continent2, iStartSectorRows, iStartSectorCols, startSectors, 5);
    //console.log("Islands3");
    //dumpTerrain(iWidth, iHeight);
    generateFractalLayerWithoutHills(iWidth, iHeight, continent1, continent2, iStartSectorRows, iStartSectorCols, startSectors, 6);
    for (let iY = 0; iY < iHeight; iY++) {
        for (let iX = 0; iX < iWidth; iX++) {
            let terrain = GameplayMap.getTerrainType(iX, iY);
            if (terrain != globals.g_OceanTerrain && terrain != globals.g_CoastTerrain) {
                TerrainBuilder.removePlotTag(iX, iY, PlotTags.PLOT_TAG_ISLAND);
            }
        }
    }
}
function generateFractalLayerWithoutHills(iWidth, iHeight, continent1, continent2, iStartSectorRows, iStartSectorCols, startSectors, iSize) {
    FractalBuilder.create(globals.g_LandmassFractal, iWidth, iHeight, iSize, 0);
    let iwater_percent = 50 /*Special Water Percent for Archipelago */ + iSize * 7;
    let iWaterHeight = FractalBuilder.getHeightFromPercent(globals.g_LandmassFractal, iwater_percent);
    let iCenterWeight = 0;
    let iBuffer = Math.floor(iHeight / 18.0);
    let iBuffer2 = Math.floor(iWidth / 28.0);
    for (let iY = 0; iY < iHeight; iY++) {
        for (let iX = 0; iX < iWidth; iX++) {
            if (GameplayMap.getTerrainType(iX, iY) == globals.g_OceanTerrain || GameplayMap.getTerrainType(iX, iY) == globals.g_CoastTerrain) {
                let terrain = globals.g_FlatTerrain;
                let iRandom = TerrainBuilder.getRandomNumber(iBuffer, "Random Top/Bottom Edges");
                let iRandom2 = TerrainBuilder.getRandomNumber(iBuffer2, "Random Left/Right Edges");
                // If already land here, don't add more
                if (utilities.isAdjacentToLand(iX, iY)) {
                    continue;
                }
                //  Must be water if at the poles
                else if (iY < continent1.south + iRandom || iY >= continent1.north - iRandom) {
                    continue;
                }
                // Of if between the continents
                else if (iX < continent1.west + iRandom2 || iX >= continent2.east - iRandom2 ||
                    (iX >= continent1.east - iRandom2 && iX < continent2.west + iRandom2)) {
                    terrain = globals.g_OceanTerrain;
                }
                else {
                    let iSector = utilities.getSector(iX, iY, iStartSectorRows, iStartSectorCols, continent1.south, continent1.north, continent1.west, continent1.east, continent2.west);
                    let iStartSectorWeight = 0;
                    let iFractalWeight = 1;
                    if (startSectors[iSector]) {
                        iStartSectorWeight = 0.7;
                        iFractalWeight = 0.35;
                    }
                    let iPlotHeight = utilities.getHeightAdjustingForStartSector(iX, iY, iWaterHeight, iFractalWeight, iCenterWeight, iStartSectorWeight, continent1, continent2, iStartSectorRows, iStartSectorCols, startSectors);
                    // Finally see whether or not this stays as Land or has too low a score and drops back to water
                    if (iPlotHeight < iWaterHeight) {
                        continue;
                    }
                }
                TerrainBuilder.setTerrainType(iX, iY, terrain);
            }
        }
    }
    for (let iY = 0; iY < iHeight; iY++) {
        for (let iX = 0; iX < iWidth; iX++) {
            let terrain = GameplayMap.getTerrainType(iX, iY);
            if (terrain != globals.g_OceanTerrain && terrain != globals.g_CoastTerrain) {
                TerrainBuilder.addPlotTag(iX, iY, PlotTags.PLOT_TAG_ISLAND);
            }
        }
    }
}
function createContinents(iWidth, iHeight, continent1, continent2, iStartSectorRows, iStartSectorCols, startSectors) {
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
            else {
                let iStartSectorWeight = 0;
                let iFractalWeight = 1;
                if (iStartSectorRows > 0 && iStartSectorCols > 0) {
                    iStartSectorWeight = globals.g_StartSectorWeight;
                    iFractalWeight = globals.g_FractalWeight;
                }
                let iPlotHeight = utilities.getHeightAdjustingForStartSector(iX, iY, iWaterHeight, iFractalWeight, globals.g_CenterWeight, iStartSectorWeight, continent1, continent2, iStartSectorRows, iStartSectorCols, startSectors);
                // Finally see whether or not this stays as Land or has too low a score and drops back to water
                if (iPlotHeight < iWaterHeight * globals.g_Cutoff) {
                    terrain = globals.g_OceanTerrain;
                }
            }
            TerrainBuilder.setTerrainType(iX, iY, terrain);
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
function createFractal(iWidth, iHeight, westContinent, eastContinent, iStartSectorRows, iStartSectorCols, startSectors) {
    FractalBuilder.create(globals.g_LandmassFractal, iWidth, iHeight, 3, 0);
    let iWaterHeight = FractalBuilder.getHeightFromPercent(globals.g_LandmassFractal, globals.g_WaterPercent);
    let iBuffer = Math.floor(iHeight / 13.5);
    let iBuffer2 = Math.floor(iWidth / 21.0);
    for (let iY = 0; iY < iHeight; iY++) {
        for (let iX = 0; iX < iWidth; iX++) {
            let terrain = globals.g_FlatTerrain;
            // Initialize plot tag
            TerrainBuilder.setPlotTag(iX, iY, PlotTags.PLOT_TAG_NONE);
            let iRandom = TerrainBuilder.getRandomNumber(iBuffer, "Random Top/Bottom Edges");
            let iRandom2 = TerrainBuilder.getRandomNumber(iBuffer2, "Random Left/Right Edges");
            if (iY < westContinent.south + iRandom || iY >= westContinent.north - iRandom) {
                terrain = globals.g_OceanTerrain;
            }
            else if (iX == 0) {
                terrain = globals.g_OceanTerrain;
            }
            // Near wrap
            else if (iX < westContinent.west + iRandom2 || iX >= eastContinent.east - iRandom2) {
                terrain = globals.g_OceanTerrain;
            }
            // Of if between the continents
            else if (iX >= westContinent.east - iRandom2 && iX < eastContinent.west + iRandom2) {
                terrain = globals.g_OceanTerrain;
            }
            else {
                let iStartSectorWeight = 0;
                let iFractalWeight = 1;
                if (iStartSectorRows > 0 && iStartSectorCols > 0) {
                    iStartSectorWeight = globals.g_StartSectorWeight;
                    iFractalWeight = globals.g_FractalWeight;
                }
                let iPlotHeight = utilities.getHeightAdjustingForStartSector(iX, iY, iWaterHeight, iFractalWeight, 0.0 /*CenterWeight*/, iStartSectorWeight, westContinent, eastContinent, iStartSectorRows, iStartSectorCols, startSectors);
                // Finally see whether or not this stays as Land or has too low a score and drops back to water
                if (iPlotHeight < iWaterHeight * (globals.g_FractalWeight + globals.g_StartSectorWeight)) {
                    terrain = globals.g_OceanTerrain;
                }
            }
            TerrainBuilder.setTerrainType(iX, iY, terrain);
        }
    }
}
function createTerraMass(iWidth, iHeight, continent1, continent2, iStartSectorRows, iStartSectorCols, startSectors, bFirst, iOceanWaterColumns) {
    let iSize = TerrainBuilder.getRandomNumber(6, "Random Land Size") + 2;
    //console.log("Frac Size " + iSize);
    FractalBuilder.create(globals.g_LandmassFractal, iWidth, iHeight, iSize, 0);
    let iRanHeight = 100 - ((iSize * 10) - 20);
    let iMaxHeight = FractalBuilder.getHeightFromPercent(globals.g_LandmassFractal, iRanHeight);
    let iBuffer = Math.floor(iHeight / 18.0);
    let iBuffer2 = Math.floor(iWidth / 28.0);
    for (let iY = 0; iY < iHeight; iY++) {
        for (let iX = 0; iX < iWidth; iX++) {
            let terrain = globals.g_FlatTerrain;
            let iRandom = TerrainBuilder.getRandomNumber(iBuffer, "Random Top/Bottom Edges");
            let iRandom2 = TerrainBuilder.getRandomNumber(iBuffer2, "Random Left/Right Edges");
            // Initialize plot tag
            if (bFirst == true) {
                TerrainBuilder.setPlotTag(iX, iY, PlotTags.PLOT_TAG_NONE);
            }
            //  Must be water if at the poles
            if (iY < continent1.south + iRandom || iY >= continent1.north - iRandom) {
                if (bFirst == true) {
                    terrain = globals.g_OceanTerrain;
                    TerrainBuilder.setTerrainType(iX, iY, terrain);
                }
            }
            else if (iX < continent1.west + iRandom2 || iX >= continent2.east - iRandom2 ||
                (iX >= continent1.east - iRandom2 && iX < continent2.west + iRandom2)) {
                if (bFirst == true) {
                    terrain = globals.g_OceanTerrain;
                    TerrainBuilder.setTerrainType(iX, iY, terrain);
                }
            }
            else if ((bFirst == true && iX > continent1.east + iOceanWaterColumns) || (bFirst == false && iX < continent2.west - iOceanWaterColumns)) {
                let iStartSectorWeight = 0;
                let iFractalWeight = 1;
                if (iStartSectorRows > 0 && iStartSectorCols > 0) {
                    iStartSectorWeight = globals.g_StartSectorWeight;
                    iFractalWeight = globals.g_FractalWeight;
                }
                let iPlotHeight = utilities.getHeightAdjustingForStartSector(iX, iY, iMaxHeight, iFractalWeight, globals.g_CenterWeight, iStartSectorWeight, continent1, continent2, iStartSectorRows, iStartSectorCols, startSectors);
                // Finally see whether or not this stays as Land or has too low a score and drops back to water
                if (iPlotHeight < iMaxHeight * globals.g_Cutoff) {
                    terrain = globals.g_OceanTerrain;
                }
                TerrainBuilder.setTerrainType(iX, iY, terrain);
            }
            else if ((bFirst == false && iX > continent1.east + iOceanWaterColumns) || (bFirst == true && iX < continent2.west - iOceanWaterColumns)) {
                let iStartSectorWeight = 0;
                let iFractalWeight = 1;
                if (iStartSectorRows > 0 && iStartSectorCols > 0) {
                    iStartSectorWeight = globals.g_StartSectorWeight;
                    iFractalWeight = globals.g_FractalWeight;
                }
                let iPlotHeight = utilities.getHeightAdjustingForStartSector(iX, iY, iMaxHeight, iFractalWeight, globals.g_CenterWeight, iStartSectorWeight, continent1, continent2, iStartSectorRows, iStartSectorCols, startSectors);
                // Finally see whether or not this stays as Land or has too low a score and drops back to water
                if (iPlotHeight < iMaxHeight * globals.g_Cutoff) {
                    terrain = globals.g_OceanTerrain;
                }
                TerrainBuilder.setTerrainType(iX, iY, terrain);
            }
        }
    }
}

//# sourceMappingURL=file:///base-standard/maps/shuffle.js.map
