import { assignAdvancedStartRegions } from './assign-advanced-start-region.js';
import { chooseStartSectors, assignStartPositions } from './assign-starting-plots.js';
import { generateDiscoveries } from './discovery-generator.js';
import { addMountains, generateLakes, addHills, buildRainfallMap } from './elevation-terrain-generator.js';
import { designateBiomes, addFeatures } from './feature-biome-generator.js';
import { dumpStartSectors, dumpContinents, dumpTerrain, dumpElevation, dumpRainfall, dumpBiomes, dumpFeatures, dumpResources, dumpNoisePredicate } from './map-debug-helpers.js';
import { g_OceanWaterColumns, g_PolarWaterRows, g_AvoidSeamOffset, g_IslandWidth, g_NavigableRiverTerrain, g_CoastTerrain, g_OceanTerrain, g_LandmassFractal, g_FlatTerrain, g_WaterPercent, g_StartSectorWeight, g_FractalWeight, g_CenterWeight, g_Cutoff } from './map-globals.js';
import { needHumanNearEquator, applyCoastalErosionAdjustingForStartSectors, applyCoastalErosion, addPlotTags, createIslands, adjustOceanPlotTags, isAdjacentToLand, getSector, getHeightAdjustingForStartSector } from './map-utilities.js';
import { addNaturalWonders } from './natural-wonder-generator.js';
import { generateResources } from './resource-generator.js';
import { generateSnow, dumpPermanentSnow } from './snow-generator.js';
import { addVolcanoes } from './volcano-generator.js';

console.log("Generating using script shuffle.ts");
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
  const iRandom = TerrainBuilder.getRandomNumber(2, "East or West");
  if (iRandom == 1) {
    const iNum1 = iNumPlayers1;
    const iNum2 = iNumPlayers2;
    iNumPlayers1 = iNum2;
    iNumPlayers2 = iNum1;
  }
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
    createLandmasses(
      iWidth,
      iHeight,
      westContinent,
      eastContinent,
      iStartSectorRows,
      iStartSectorCols,
      startSectors,
      iOceanWaterColumns
    );
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
    createLandmasses(
      iWidth,
      iHeight,
      westContinent,
      eastContinent,
      iStartSectorRows,
      iStartSectorCols,
      startSectors,
      iOceanWaterColumns
    );
    applyCoastalErosion(westContinent, 0.02, 1.5, 0.8, false);
    applyCoastalErosion(eastContinent, 0.02, 1.5, 0.8, false);
    applyCoastalErosion(westContinent2, 0.1, 1.5, 0.8, true);
    applyCoastalErosion(eastContinent2, 0.1, 1.5, 0.8, true);
  }
  addPlotTags(iHeight, iWidth, eastContinent.west);
  TerrainBuilder.validateAndFixTerrain();
  createIslands(iWidth, iHeight, westContinent2, eastContinent2, 4);
  createIslands(iWidth, iHeight, westContinent2, eastContinent2, 5);
  createIslands(iWidth, iHeight, westContinent2, eastContinent2, 6);
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
  AreaBuilder.recalculateAreas();
  TerrainBuilder.buildElevation();
  addHills(iWidth, iHeight);
  buildRainfallMap(iWidth, iHeight);
  const iRandomRiver = TerrainBuilder.getRandomNumber(10, "Intensity of Rivers");
  if (iRandomRiver == 0) {
    TerrainBuilder.modelRivers(10, 85, g_NavigableRiverTerrain);
  } else if (iRandomRiver < 3) {
    TerrainBuilder.modelRivers(5, 70, g_NavigableRiverTerrain);
  } else {
    TerrainBuilder.modelRivers(5, 15, g_NavigableRiverTerrain);
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
      const terrain = GameplayMap.getTerrainType(iX, iY);
      if (terrain == g_CoastTerrain) {
        TerrainBuilder.setPlotTag(iX, iY, PlotTags.PLOT_TAG_WATER);
        if (iNumPlayers1 > iNumPlayers2) {
          if (iX < westContinent.west - 2 || iX > westContinent.east + 2) {
            TerrainBuilder.addPlotTag(iX, iY, PlotTags.PLOT_TAG_EAST_WATER);
          } else {
            TerrainBuilder.addPlotTag(iX, iY, PlotTags.PLOT_TAG_WEST_WATER);
          }
        } else {
          if (iX > eastContinent.east + 2 || iX < eastContinent.west - 2) {
            TerrainBuilder.addPlotTag(iX, iY, PlotTags.PLOT_TAG_WEST_WATER);
          } else {
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
console.log("Loaded shuffle.ts");
function createLandmasses(iWidth, iHeight, continent1, continent2, iStartSectorRows, iStartSectorCols, startSectors, iOceanWaterColumns) {
  const iRandomLandmassSetup = TerrainBuilder.getRandomNumber(4, "Shuffle Map Landmass Structure");
  if (iRandomLandmassSetup == 0) {
    createArchipelago(iWidth, iHeight, continent1, continent2, iStartSectorRows, iStartSectorCols, startSectors);
    console.log("Random Landmass Setup: Archipelago");
  } else if (iRandomLandmassSetup == 1) {
    createContinents(iWidth, iHeight, continent1, continent2, iStartSectorRows, iStartSectorCols, startSectors);
    console.log("Random Landmass Setup: Continents");
  } else if (iRandomLandmassSetup == 2) {
    createFractal(iWidth, iHeight, continent1, continent2, iStartSectorRows, iStartSectorCols, startSectors);
    console.log("Random Landmass Setup: Fractal");
  } else if (iRandomLandmassSetup == 3) {
    for (let iY = 0; iY < iHeight; iY++) {
      for (let iX = 0; iX < iWidth; iX++) {
        TerrainBuilder.setTerrainType(iX, iY, g_OceanTerrain);
        TerrainBuilder.setPlotTag(iX, iY, PlotTags.PLOT_TAG_NONE);
      }
    }
    createTerraMass(
      iWidth,
      iHeight,
      continent1,
      continent2,
      iStartSectorRows,
      iStartSectorCols,
      startSectors,
      true,
      iOceanWaterColumns
    );
    createTerraMass(
      iWidth,
      iHeight,
      continent1,
      continent2,
      iStartSectorRows,
      iStartSectorCols,
      startSectors,
      false,
      iOceanWaterColumns
    );
    console.log("Random Landmass Setup: Terra");
  }
}
function createArchipelago(iWidth, iHeight, continent1, continent2, iStartSectorRows, iStartSectorCols, startSectors) {
  for (let iY = 0; iY < iHeight; iY++) {
    for (let iX = 0; iX < iWidth; iX++) {
      TerrainBuilder.setTerrainType(iX, iY, g_OceanTerrain);
      TerrainBuilder.setPlotTag(iX, iY, PlotTags.PLOT_TAG_NONE);
    }
  }
  generateFractalLayerWithoutHills(
    iWidth,
    iHeight,
    continent1,
    continent2,
    iStartSectorRows,
    iStartSectorCols,
    startSectors,
    3
  );
  generateFractalLayerWithoutHills(
    iWidth,
    iHeight,
    continent1,
    continent2,
    iStartSectorRows,
    iStartSectorCols,
    startSectors,
    4
  );
  generateFractalLayerWithoutHills(
    iWidth,
    iHeight,
    continent1,
    continent2,
    iStartSectorRows,
    iStartSectorCols,
    startSectors,
    5
  );
  generateFractalLayerWithoutHills(
    iWidth,
    iHeight,
    continent1,
    continent2,
    iStartSectorRows,
    iStartSectorCols,
    startSectors,
    6
  );
  for (let iY = 0; iY < iHeight; iY++) {
    for (let iX = 0; iX < iWidth; iX++) {
      const terrain = GameplayMap.getTerrainType(iX, iY);
      if (terrain != g_OceanTerrain && terrain != g_CoastTerrain) {
        TerrainBuilder.removePlotTag(iX, iY, PlotTags.PLOT_TAG_ISLAND);
      }
    }
  }
}
function generateFractalLayerWithoutHills(iWidth, iHeight, continent1, continent2, iStartSectorRows, iStartSectorCols, startSectors, iSize) {
  FractalBuilder.create(g_LandmassFractal, iWidth, iHeight, iSize, 0);
  const iwater_percent = 50 + iSize * 7;
  const iWaterHeight = FractalBuilder.getHeightFromPercent(g_LandmassFractal, iwater_percent);
  const iCenterWeight = 0;
  const iBuffer = Math.floor(iHeight / 18);
  const iBuffer2 = Math.floor(iWidth / 28);
  for (let iY = 0; iY < iHeight; iY++) {
    for (let iX = 0; iX < iWidth; iX++) {
      if (GameplayMap.getTerrainType(iX, iY) == g_OceanTerrain || GameplayMap.getTerrainType(iX, iY) == g_CoastTerrain) {
        let terrain = g_FlatTerrain;
        const iRandom = TerrainBuilder.getRandomNumber(iBuffer, "Random Top/Bottom Edges");
        const iRandom2 = TerrainBuilder.getRandomNumber(iBuffer2, "Random Left/Right Edges");
        if (isAdjacentToLand(iX, iY)) {
          continue;
        } else if (iY < continent1.south + iRandom || iY >= continent1.north - iRandom) {
          continue;
        } else if (iX < continent1.west + iRandom2 || iX >= continent2.east - iRandom2 || iX >= continent1.east - iRandom2 && iX < continent2.west + iRandom2) {
          terrain = g_OceanTerrain;
        } else {
          const iSector = getSector(
            iX,
            iY,
            iStartSectorRows,
            iStartSectorCols,
            continent1.south,
            continent1.north,
            continent1.west,
            continent1.east,
            continent2.west
          );
          let iStartSectorWeight = 0;
          let iFractalWeight = 1;
          if (startSectors[iSector]) {
            iStartSectorWeight = 0.7;
            iFractalWeight = 0.35;
          }
          const iPlotHeight = getHeightAdjustingForStartSector(
            iX,
            iY,
            iWaterHeight,
            iFractalWeight,
            iCenterWeight,
            iStartSectorWeight,
            continent1,
            continent2,
            iStartSectorRows,
            iStartSectorCols,
            startSectors
          );
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
      const terrain = GameplayMap.getTerrainType(iX, iY);
      if (terrain != g_OceanTerrain && terrain != g_CoastTerrain) {
        TerrainBuilder.addPlotTag(iX, iY, PlotTags.PLOT_TAG_ISLAND);
      }
    }
  }
}
function createContinents(iWidth, iHeight, continent1, continent2, iStartSectorRows, iStartSectorCols, startSectors) {
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
      } else {
        let iStartSectorWeight = 0;
        let iFractalWeight = 1;
        if (iStartSectorRows > 0 && iStartSectorCols > 0) {
          iStartSectorWeight = g_StartSectorWeight;
          iFractalWeight = g_FractalWeight;
        }
        const iPlotHeight = getHeightAdjustingForStartSector(
          iX,
          iY,
          iWaterHeight,
          iFractalWeight,
          g_CenterWeight,
          iStartSectorWeight,
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
      TerrainBuilder.setTerrainType(iX, iY, terrain);
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
function createFractal(iWidth, iHeight, westContinent, eastContinent, iStartSectorRows, iStartSectorCols, startSectors) {
  FractalBuilder.create(g_LandmassFractal, iWidth, iHeight, 3, 0);
  const iWaterHeight = FractalBuilder.getHeightFromPercent(g_LandmassFractal, g_WaterPercent);
  const iBuffer = Math.floor(iHeight / 13.5);
  const iBuffer2 = Math.floor(iWidth / 21);
  for (let iY = 0; iY < iHeight; iY++) {
    for (let iX = 0; iX < iWidth; iX++) {
      let terrain = g_FlatTerrain;
      TerrainBuilder.setPlotTag(iX, iY, PlotTags.PLOT_TAG_NONE);
      const iRandom = TerrainBuilder.getRandomNumber(iBuffer, "Random Top/Bottom Edges");
      const iRandom2 = TerrainBuilder.getRandomNumber(iBuffer2, "Random Left/Right Edges");
      if (iY < westContinent.south + iRandom || iY >= westContinent.north - iRandom) {
        terrain = g_OceanTerrain;
      } else if (iX == 0) {
        terrain = g_OceanTerrain;
      } else if (iX < westContinent.west + iRandom2 || iX >= eastContinent.east - iRandom2) {
        terrain = g_OceanTerrain;
      } else if (iX >= westContinent.east - iRandom2 && iX < eastContinent.west + iRandom2) {
        terrain = g_OceanTerrain;
      } else {
        let iStartSectorWeight = 0;
        let iFractalWeight = 1;
        if (iStartSectorRows > 0 && iStartSectorCols > 0) {
          iStartSectorWeight = g_StartSectorWeight;
          iFractalWeight = g_FractalWeight;
        }
        const iPlotHeight = getHeightAdjustingForStartSector(
          iX,
          iY,
          iWaterHeight,
          iFractalWeight,
          0,
          iStartSectorWeight,
          westContinent,
          eastContinent,
          iStartSectorRows,
          iStartSectorCols,
          startSectors
        );
        if (iPlotHeight < iWaterHeight * (g_FractalWeight + g_StartSectorWeight)) {
          terrain = g_OceanTerrain;
        }
      }
      TerrainBuilder.setTerrainType(iX, iY, terrain);
    }
  }
}
function createTerraMass(iWidth, iHeight, continent1, continent2, iStartSectorRows, iStartSectorCols, startSectors, bFirst, iOceanWaterColumns) {
  const iSize = TerrainBuilder.getRandomNumber(6, "Random Land Size") + 2;
  FractalBuilder.create(g_LandmassFractal, iWidth, iHeight, iSize, 0);
  const iRanHeight = 100 - (iSize * 10 - 20);
  const iMaxHeight = FractalBuilder.getHeightFromPercent(g_LandmassFractal, iRanHeight);
  const iBuffer = Math.floor(iHeight / 18);
  const iBuffer2 = Math.floor(iWidth / 28);
  for (let iY = 0; iY < iHeight; iY++) {
    for (let iX = 0; iX < iWidth; iX++) {
      let terrain = g_FlatTerrain;
      const iRandom = TerrainBuilder.getRandomNumber(iBuffer, "Random Top/Bottom Edges");
      const iRandom2 = TerrainBuilder.getRandomNumber(iBuffer2, "Random Left/Right Edges");
      if (bFirst == true) {
        TerrainBuilder.setPlotTag(iX, iY, PlotTags.PLOT_TAG_NONE);
      }
      if (iY < continent1.south + iRandom || iY >= continent1.north - iRandom) {
        if (bFirst == true) {
          terrain = g_OceanTerrain;
          TerrainBuilder.setTerrainType(iX, iY, terrain);
        }
      } else if (iX < continent1.west + iRandom2 || iX >= continent2.east - iRandom2 || iX >= continent1.east - iRandom2 && iX < continent2.west + iRandom2) {
        if (bFirst == true) {
          terrain = g_OceanTerrain;
          TerrainBuilder.setTerrainType(iX, iY, terrain);
        }
      } else if (bFirst == true && iX > continent1.east + iOceanWaterColumns || bFirst == false && iX < continent2.west - iOceanWaterColumns) {
        let iStartSectorWeight = 0;
        let iFractalWeight = 1;
        if (iStartSectorRows > 0 && iStartSectorCols > 0) {
          iStartSectorWeight = g_StartSectorWeight;
          iFractalWeight = g_FractalWeight;
        }
        const iPlotHeight = getHeightAdjustingForStartSector(
          iX,
          iY,
          iMaxHeight,
          iFractalWeight,
          g_CenterWeight,
          iStartSectorWeight,
          continent1,
          continent2,
          iStartSectorRows,
          iStartSectorCols,
          startSectors
        );
        if (iPlotHeight < iMaxHeight * g_Cutoff) {
          terrain = g_OceanTerrain;
        }
        TerrainBuilder.setTerrainType(iX, iY, terrain);
      } else if (bFirst == false && iX > continent1.east + iOceanWaterColumns || bFirst == true && iX < continent2.west - iOceanWaterColumns) {
        let iStartSectorWeight = 0;
        let iFractalWeight = 1;
        if (iStartSectorRows > 0 && iStartSectorCols > 0) {
          iStartSectorWeight = g_StartSectorWeight;
          iFractalWeight = g_FractalWeight;
        }
        const iPlotHeight = getHeightAdjustingForStartSector(
          iX,
          iY,
          iMaxHeight,
          iFractalWeight,
          g_CenterWeight,
          iStartSectorWeight,
          continent1,
          continent2,
          iStartSectorRows,
          iStartSectorCols,
          startSectors
        );
        if (iPlotHeight < iMaxHeight * g_Cutoff) {
          terrain = g_OceanTerrain;
        }
        TerrainBuilder.setTerrainType(iX, iY, terrain);
      }
    }
  }
}

export { expandCoastsPlus };
//# sourceMappingURL=shuffle.js.map
