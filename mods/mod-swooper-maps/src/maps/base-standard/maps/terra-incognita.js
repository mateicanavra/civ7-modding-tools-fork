import { assignAdvancedStartRegions } from './assign-advanced-start-region.js';
import { chooseStartSectors, assignStartPositions } from './assign-starting-plots.js';
import { generateDiscoveries } from './discovery-generator.js';
import { addMountains, generateLakes, addHills, buildRainfallMap } from './elevation-terrain-generator.js';
import { designateBiomes, addFeatures } from './feature-biome-generator.js';
import { dumpStartSectors, dumpContinents, dumpTerrain, dumpElevation, dumpRainfall, dumpBiomes, dumpFeatures, dumpResources, dumpNoisePredicate } from './map-debug-helpers.js';
import { g_OceanWaterColumns, g_PolarWaterRows, g_AvoidSeamOffset, g_IslandWidth, g_WaterPercent, g_Cutoff, g_NavigableRiverTerrain, g_LandmassFractal, g_FlatTerrain, g_OceanTerrain, g_FractalWeight, g_CenterWeight, g_StartSectorWeight, g_CoastTerrain } from './map-globals.js';
import { needHumanNearEquator, createIslands, applyCoastalErosionAdjustingForStartSectors, applyCoastalErosion, createOrganicLandmasses, clearContinent, addPlotTags, adjustOceanPlotTags, adjustLakePlotTags, getHeightAdjustingForStartSector, addLandmassPlotTags, addWaterPlotTags } from './map-utilities.js';
import { addNaturalWonders } from './natural-wonder-generator.js';
import { generateResources } from './resource-generator.js';
import { generateSnow, dumpPermanentSnow } from './snow-generator.js';
import { addVolcanoes, addTundraVolcanoes } from './volcano-generator.js';

console.log("Generating using script terra-incognita.ts");
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
  const iWidth = GameplayMap.getGridWidth();
  const iHeight = GameplayMap.getGridHeight();
  const uiMapSize = GameplayMap.getMapSize();
  let startPositions = [];
  const mapInfo = GameInfo.Maps.lookup(uiMapSize);
  if (mapInfo == null) return;
  const iNumNaturalWonders = mapInfo.NumNaturalWonders;
  const iTilesPerLake = mapInfo.LakeGenerationFrequency;
  let iNumPlayers1 = mapInfo.PlayersLandmass1;
  let iNumPlayers2 = mapInfo.PlayersLandmass2;
  const iOceanWaterColumns = (g_OceanWaterColumns + mapInfo.OceanWidth) * 1.75;
  const westContinent = {
    west: 3 * g_AvoidSeamOffset + g_IslandWidth,
    east: iWidth / 2 - g_AvoidSeamOffset,
    south: g_PolarWaterRows,
    north: iHeight - g_PolarWaterRows,
    continent: 0
  };
  const eastContinent = {
    west: westContinent.east + 4 * g_AvoidSeamOffset + g_IslandWidth,
    east: iWidth - g_AvoidSeamOffset,
    south: g_PolarWaterRows,
    north: iHeight - g_PolarWaterRows,
    continent: 0
  };
  const westContinent2 = {
    west: g_AvoidSeamOffset,
    east: g_AvoidSeamOffset + g_IslandWidth,
    south: g_PolarWaterRows,
    north: iHeight - g_PolarWaterRows,
    continent: 0
  };
  const eastContinent2 = {
    west: iWidth / 2 + g_AvoidSeamOffset,
    east: iWidth / 2 + g_AvoidSeamOffset + g_IslandWidth,
    south: g_PolarWaterRows,
    north: iHeight - g_PolarWaterRows,
    continent: 0
  };
  let startSectors = [];
  let iStartSectorRows = 0;
  let iStartSectorCols = 0;
  let startPosition = Configuration.getMapValue("StartPosition");
  if (startPosition == null) {
    startPosition = Database.makeHash("START_POSITION_STANDARD");
  }
  startPosition = Number(BigInt.asIntN(32, BigInt(startPosition)));
  const startPositionHash = Database.makeHash("START_POSITION_BALANCED");
  const bIsBalanced = startPosition == startPositionHash;
  if (bIsBalanced) {
    console.log("Balanced Map");
    const iRandom = TerrainBuilder.getRandomNumber(2, "East or West");
    console.log("Random Hemisphere: " + iRandom);
    if (iRandom == 1) {
      const iNum1 = iNumPlayers1;
      const iNum2 = iNumPlayers2;
      iNumPlayers1 = iNum2;
      iNumPlayers2 = iNum1;
    }
    const bHumanNearEquator = needHumanNearEquator();
    iStartSectorRows = mapInfo.StartSectorRows;
    iStartSectorCols = mapInfo.StartSectorCols;
    startSectors = chooseStartSectors(
      iNumPlayers1,
      iNumPlayers2,
      iStartSectorRows,
      iStartSectorCols,
      bHumanNearEquator
    );
    dumpStartSectors(startSectors);
    createPrimaryLandmass(
      iWidth,
      iHeight,
      westContinent,
      eastContinent,
      iStartSectorRows,
      iStartSectorCols,
      startSectors,
      iNumPlayers1 > iNumPlayers2,
      iOceanWaterColumns
    );
    createSecondaryLandmassBalanced(
      iWidth,
      iHeight,
      westContinent,
      eastContinent,
      iStartSectorRows,
      iStartSectorCols,
      startSectors,
      iNumPlayers1 > iNumPlayers2,
      iOceanWaterColumns
    );
    createIslands(iWidth, iHeight, westContinent2, eastContinent2, 4);
    createIslands(iWidth, iHeight, westContinent2, eastContinent2, 5);
    createIslands(iWidth, iHeight, westContinent2, eastContinent2, 6);
    applyCoastalErosionAdjustingForStartSectors(
      westContinent,
      eastContinent,
      0.02,
      1.5,
      0.8,
      iStartSectorRows,
      iStartSectorCols,
      startSectors
    );
    applyCoastalErosionAdjustingForStartSectors(
      eastContinent,
      eastContinent,
      0.02,
      1.5,
      0.8,
      iStartSectorRows,
      iStartSectorCols,
      startSectors
    );
    applyCoastalErosion(westContinent2, 0.02, 1.5, 0.8, true);
    applyCoastalErosion(eastContinent2, 0.02, 1.5, 0.8, true);
  } else {
    console.log("Standard Map");
    const iFractalGrain = 2;
    const iWaterPercent = g_WaterPercent * g_Cutoff;
    const iLargestContinentPercent = 15;
    createOrganicLandmasses(
      iWidth,
      iHeight,
      westContinent,
      eastContinent,
      iFractalGrain,
      iWaterPercent,
      iLargestContinentPercent
    );
    const iAreaID = AreaBuilder.findBiggestArea(false);
    const kBoundaries = AreaBuilder.getAreaBoundary(iAreaID);
    if (kBoundaries.west > iWidth / 2) {
      const iNum1 = iNumPlayers1;
      const iNum2 = iNumPlayers2;
      iNumPlayers1 = iNum2;
      iNumPlayers2 = iNum1;
      clearContinent(westContinent);
      createSecondaryLandmassStandard(westContinent);
    } else {
      clearContinent(eastContinent);
      createSecondaryLandmassStandard(eastContinent);
    }
    addPlotTags(iHeight, iWidth, eastContinent.west);
    createIslands(iWidth, iHeight, westContinent2, eastContinent2, 5);
    createIslands(iWidth, iHeight, westContinent2, eastContinent2, 6);
    applyCoastalErosion(westContinent, 0.02, 1.5, 0.8, false);
    applyCoastalErosion(eastContinent, 0.02, 1.5, 0.8, false);
    applyCoastalErosion(westContinent2, 0.1, 1.5, 0.8, true);
    applyCoastalErosion(eastContinent2, 0.1, 1.5, 0.8, true);
  }
  TerrainBuilder.validateAndFixTerrain();
  expandCoastsPlus(westContinent.west, westContinent.east, iHeight);
  expandCoastsPlus(eastContinent.west, eastContinent.east, iHeight);
  expandCoastsPlus(0, westContinent.west - g_OceanWaterColumns, iHeight);
  expandCoastsPlus(
    westContinent.east + g_OceanWaterColumns,
    eastContinent.west - g_OceanWaterColumns,
    iHeight
  );
  expandCoastsPlus(eastContinent.east + g_OceanWaterColumns, 0, iHeight);
  adjustOceanPlotTags(iNumPlayers1 > iNumPlayers2);
  AreaBuilder.recalculateAreas();
  TerrainBuilder.stampContinents();
  addMountains(iWidth, iHeight);
  addVolcanoes(iWidth, iHeight);
  generateLakes(iWidth, iHeight, iTilesPerLake);
  adjustLakePlotTags(westContinent, true);
  adjustLakePlotTags(westContinent2, true);
  adjustLakePlotTags(eastContinent, false);
  adjustLakePlotTags(eastContinent2, false);
  AreaBuilder.recalculateAreas();
  TerrainBuilder.buildElevation();
  addHills(iWidth, iHeight);
  buildRainfallMap(iWidth, iHeight);
  TerrainBuilder.modelRivers(5, 15, g_NavigableRiverTerrain);
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
  startPositions = assignStartPositions(
    iNumPlayers1,
    iNumPlayers2,
    westContinent,
    eastContinent,
    iStartSectorRows,
    iStartSectorCols,
    startSectors
  );
  generateDiscoveries(iWidth, iHeight, startPositions);
  dumpResources(iWidth, iHeight);
  FertilityBuilder.recalculate();
  const seed = GameplayMap.getRandomSeed();
  const avgDistanceBetweenPoints = 3;
  const normalizedRangeSmoothing = 2;
  const poisson = TerrainBuilder.generatePoissonMap(seed, avgDistanceBetweenPoints, normalizedRangeSmoothing);
  const poissonPred = (val) => {
    return val >= 1 ? "*" : " ";
  };
  dumpNoisePredicate(iWidth, iHeight, poisson, poissonPred);
  assignAdvancedStartRegions();
}
engine.on("RequestMapInitData", requestMapData);
engine.on("GenerateMap", generateMap);
console.log("Loaded terra-incognita.ts");
function createPrimaryLandmass(iWidth, iHeight, continent1, continent2, iStartSectorRows, iStartSectorCols, startSectors, bWestSide, iOceanWaterColumns) {
  FractalBuilder.create(g_LandmassFractal, iWidth, iHeight, 2, 0);
  const iWaterHeight = FractalBuilder.getHeightFromPercent(g_LandmassFractal, g_WaterPercent);
  const iBuffer = Math.floor(iHeight / 18);
  const iBuffer2 = Math.floor(iWidth / 28);
  for (let iY = 0; iY < iHeight; iY++) {
    for (let iX = 0; iX < iWidth; iX++) {
      let terrain = g_FlatTerrain;
      const iRandom = TerrainBuilder.getRandomNumber(iBuffer, "Random Top/Bottom Edges");
      const iRandom2 = TerrainBuilder.getRandomNumber(iBuffer2, "Random Left/Right Edges");
      TerrainBuilder.setPlotTag(iX, iY, PlotTags.PLOT_TAG_NONE);
      if (iY < continent1.south + iRandom || iY >= continent1.north - iRandom) {
        terrain = g_OceanTerrain;
      } else if (iX < continent1.west + iRandom2 || iX >= continent2.east - iRandom2 || iX >= continent1.east - iRandom2 && iX < continent2.west + iRandom2) {
        terrain = g_OceanTerrain;
      } else if (bWestSide && iX > continent1.east + iOceanWaterColumns || bWestSide == false && iX < continent2.west - iOceanWaterColumns) {
        terrain = g_OceanTerrain;
      } else {
        const iPlotHeight = getHeightAdjustingForStartSector(
          iX,
          iY,
          iWaterHeight,
          g_FractalWeight,
          g_CenterWeight,
          g_StartSectorWeight,
          continent1,
          continent2,
          iStartSectorRows,
          iStartSectorCols,
          startSectors
        );
        if (iPlotHeight < iWaterHeight * g_Cutoff) {
          terrain = g_OceanTerrain;
        }
      }
      if (terrain != g_OceanTerrain && terrain != g_CoastTerrain) {
        addLandmassPlotTags(iX, iY, continent2.west);
      } else {
        addWaterPlotTags(iX, iY, continent2.west);
      }
      TerrainBuilder.setTerrainType(iX, iY, terrain);
    }
  }
}
function createSecondaryLandmassBalanced(iWidth, iHeight, continent1, continent2, iStartSectorRows, iStartSectorCols, startSectors, bWestSide, iOceanWaterColumns) {
  const iSize = TerrainBuilder.getRandomNumber(6, "Random Land Size");
  console.log("Random Land Size " + iSize);
  FractalBuilder.create(g_LandmassFractal, iWidth, iHeight, iSize, 0);
  const iRanHeight = 130 - iSize * 10;
  const iWaterHeight = FractalBuilder.getHeightFromPercent(
    g_LandmassFractal,
    g_WaterPercent * iRanHeight / 100
  );
  const iBuffer = Math.floor(iHeight / 18);
  const iBuffer2 = Math.floor(iWidth / 28);
  for (let iY = 0; iY < iHeight; iY++) {
    for (let iX = 0; iX < iWidth; iX++) {
      let terrain = g_FlatTerrain;
      const iRandom = TerrainBuilder.getRandomNumber(iBuffer, "Random Top/Bottom Edges");
      const iRandom2 = TerrainBuilder.getRandomNumber(iBuffer2, "Random Left/Right Edges");
      if (iY < continent1.south + iRandom || iY >= continent1.north - iRandom) {
        terrain = g_OceanTerrain;
        TerrainBuilder.setPlotTag(iX, iY, PlotTags.PLOT_TAG_NONE);
        if (terrain != g_OceanTerrain && terrain != g_CoastTerrain) {
          addLandmassPlotTags(iX, iY, continent2.west);
        } else {
          addWaterPlotTags(iX, iY, continent2.west);
        }
        TerrainBuilder.setTerrainType(iX, iY, terrain);
      } else if (iX < continent1.west + iRandom2 || iX >= continent2.east - iRandom2 || iX >= continent1.east - iRandom2 && iX < continent2.west + iRandom2) {
        terrain = g_OceanTerrain;
        TerrainBuilder.setPlotTag(iX, iY, PlotTags.PLOT_TAG_NONE);
        if (terrain != g_OceanTerrain && terrain != g_CoastTerrain) {
          addLandmassPlotTags(iX, iY, continent2.west);
        } else {
          addWaterPlotTags(iX, iY, continent2.west);
        }
        TerrainBuilder.setTerrainType(iX, iY, terrain);
      } else if (bWestSide && iX > continent1.east + iOceanWaterColumns || bWestSide == false && iX < continent2.west - iOceanWaterColumns) {
        const iPlotHeight = getHeightAdjustingForStartSector(
          iX,
          iY,
          iWaterHeight,
          g_FractalWeight,
          g_CenterWeight,
          g_StartSectorWeight,
          continent1,
          continent2,
          iStartSectorRows,
          iStartSectorCols,
          startSectors
        );
        if (iPlotHeight < iWaterHeight * g_Cutoff) {
          terrain = g_OceanTerrain;
        }
        if (terrain != g_OceanTerrain && terrain != g_CoastTerrain) {
          addLandmassPlotTags(iX, iY, continent2.west);
        } else {
          addWaterPlotTags(iX, iY, continent2.west);
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
  const iGrain = TerrainBuilder.getRandomNumber(3, "Secondary Landmass Fractal Grain") + 2;
  console.log("Secondary Landmass Fractal Grain: " + iGrain);
  FractalBuilder.create(
    g_LandmassFractal,
    continent1.east - continent1.west + 1,
    continent1.north - continent1.south + 1,
    iGrain,
    0
  );
  const iWaterHeightRange = 30;
  const iRanHeight = TerrainBuilder.getRandomNumber(iWaterHeightRange, "Random Water Height");
  console.log("Random Water Height: " + iRanHeight);
  const iWaterHeight = FractalBuilder.getHeightFromPercent(
    g_LandmassFractal,
    g_WaterPercent * g_Cutoff + iRanHeight - 5
  );
  for (let iY = continent1.south; iY <= continent1.north; iY++) {
    for (let iX = continent1.west; iX <= continent1.east; iX++) {
      const terrain = g_FlatTerrain;
      const iPlotHeight = FractalBuilder.getHeight(
        g_LandmassFractal,
        iX - continent1.west,
        iY - continent1.south
      );
      if (iPlotHeight >= iWaterHeight) {
        if (iY == continent1.south || iY == continent1.north || iX == continent1.west || iX == continent1.east) {
          if (TerrainBuilder.getRandomNumber(2, "Feather hard edges") == 0) {
            TerrainBuilder.setTerrainType(iX, iY, terrain);
          }
        } else {
          TerrainBuilder.setTerrainType(iX, iY, terrain);
        }
      }
    }
  }
}
function expandCoastsPlus(iWest, iEast, iHeight) {
  for (let iY = 0; iY < iHeight; iY++) {
    for (let iX = iWest; iX < iEast; iX++) {
      const terrain = GameplayMap.getTerrainType(iX, iY);
      if (terrain == g_OceanTerrain) {
        if (GameplayMap.isAdjacentToShallowWater(iX, iY) && TerrainBuilder.getRandomNumber(2, "Shallow Water Scater Scatter") == 0) {
          TerrainBuilder.setTerrainType(iX, iY, g_CoastTerrain);
        }
      }
    }
  }
}

export { expandCoastsPlus };
//# sourceMappingURL=terra-incognita.js.map
