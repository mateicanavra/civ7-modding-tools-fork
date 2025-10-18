import { assignAdvancedStartRegions } from './assign-advanced-start-region.js';
import { chooseStartSectors, assignSingleContinentStartPositions } from './assign-starting-plots.js';
import { generateDiscoveries } from './discovery-generator.js';
import { addMountains, generateLakes, addHills, buildRainfallMap } from './elevation-terrain-generator.js';
import { designateBiomes, addFeatures } from './feature-biome-generator.js';
import { dumpStartSectors, dumpContinents, dumpTerrain, dumpElevation, dumpRainfall, dumpBiomes, dumpFeatures, dumpResources, dumpNoisePredicate } from './map-debug-helpers.js';
import { g_OceanWaterColumns, g_PolarWaterRows, g_AvoidSeamOffset, g_WaterPercent, g_Cutoff, g_NavigableRiverTerrain, g_LandmassFractal, g_FlatTerrain, g_OceanTerrain, g_FractalWeight, g_CenterWeight, g_StartSectorWeight, g_CoastTerrain } from './map-globals.js';
import { needHumanNearEquator, createIslands, applyCoastalErosionAdjustingForStartSectors, createOrganicLandmasses, addPlotTags, applyCoastalErosion, adjustOceanPlotTags, adjustLakePlotTags, replaceIslandResources, getHeightAdjustingForStartSector, addLandmassPlotTags, addWaterPlotTags, clearContinent } from './map-utilities.js';
import { addNaturalWonders } from './natural-wonder-generator.js';
import { generateResources } from './resource-generator.js';
import { generateSnow, dumpPermanentSnow } from './snow-generator.js';
import { addVolcanoes, addTundraVolcanoes } from './volcano-generator.js';

console.log("Generating using script pangaea-plus.ts");
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
  const iNumPlayers1 = mapInfo.PlayersLandmass1;
  const iNumPlayers2 = mapInfo.PlayersLandmass2;
  const bWestDominant = TerrainBuilder.getRandomNumber(2, "Choose Dominant Hemisphere") === 0;
  console.log(`Dominant Landmass: ${bWestDominant ? "West (80%)" : "East (80%)"}`);
  let westContinent;
  let westContinent2;
  let eastContinent;
  let eastContinent2;
  const iOceanWaterColumns = (g_OceanWaterColumns + mapInfo.OceanWidth) * 1.75;
  if (bWestDominant) {
    westContinent2 = {
      west: g_AvoidSeamOffset * 2,
      east: Math.floor(iWidth * 0.1),
      south: g_PolarWaterRows,
      north: iHeight - g_PolarWaterRows,
      continent: 0
    };
    westContinent = {
      west: westContinent2.east + g_AvoidSeamOffset * 2,
      east: Math.floor(iWidth * 0.8) - g_AvoidSeamOffset,
      south: g_PolarWaterRows,
      north: iHeight - g_PolarWaterRows,
      continent: 0
    };
    eastContinent = {
      west: westContinent.east + g_AvoidSeamOffset * 2,
      east: Math.floor(iWidth * 0.9),
      south: g_PolarWaterRows,
      north: iHeight - g_PolarWaterRows,
      continent: 0
    };
    eastContinent2 = {
      west: eastContinent.east,
      east: iWidth - g_AvoidSeamOffset * 2,
      south: g_PolarWaterRows,
      north: iHeight - g_PolarWaterRows,
      continent: 0
    };
  } else {
    westContinent2 = {
      west: g_AvoidSeamOffset * 2,
      east: Math.floor(iWidth * 0.1),
      south: g_PolarWaterRows,
      north: iHeight - g_PolarWaterRows,
      continent: 0
    };
    westContinent = {
      west: westContinent2.east,
      east: Math.floor(iWidth * 0.2) - g_AvoidSeamOffset * 2,
      south: g_PolarWaterRows,
      north: iHeight - g_PolarWaterRows,
      continent: 0
    };
    eastContinent = {
      west: westContinent.east + g_AvoidSeamOffset * 2,
      east: Math.floor(iWidth * 0.8),
      south: g_PolarWaterRows,
      north: iHeight - g_PolarWaterRows,
      continent: 0
    };
    eastContinent2 = {
      west: eastContinent.east + g_AvoidSeamOffset * 2,
      east: iWidth - g_AvoidSeamOffset * 2,
      south: g_PolarWaterRows,
      north: iHeight - g_PolarWaterRows,
      continent: 0
    };
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
  const ISLAND_COVERAGE_TARGET = 0.04;
  const totalTiles = iWidth * iHeight;
  const bIsBalanced = startPosition == startPositionHash;
  if (bIsBalanced && totalTiles != 0) {
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
    createPrimaryLandmass(
      iWidth,
      iHeight,
      westContinent,
      eastContinent,
      iStartSectorRows,
      iStartSectorCols,
      startSectors,
      bWestDominant,
      iOceanWaterColumns
    );
    if (bWestDominant) {
      createSecondaryLandmass(iWidth, iHeight, eastContinent, eastContinent2);
      createIslands(iWidth, iHeight, westContinent2, westContinent2, 4);
      createIslands(iWidth, iHeight, westContinent2, westContinent2, 5);
      createIslands(iWidth, iHeight, westContinent2, westContinent2, 6);
      applyCoastalErosionAdjustingForStartSectors(
        westContinent,
        eastContinent,
        0.1,
        1.5,
        0.8,
        iStartSectorRows,
        iStartSectorCols,
        startSectors
      );
      let islandTiles = countIslandTiles(iWidth, iHeight);
      let islandRatio = islandTiles / totalTiles;
      let attempts = 0;
      while (islandRatio < ISLAND_COVERAGE_TARGET && attempts < 3) {
        console.log("Island coverage too low: " + (islandRatio * 100).toFixed(2) + "%. Adding more islands.");
        createIslands(iWidth, iHeight, westContinent2, eastContinent2, 6);
        islandTiles = countIslandTiles(iWidth, iHeight);
        islandRatio = islandTiles / totalTiles;
        attempts++;
      }
    } else {
      createSecondaryLandmass(iWidth, iHeight, westContinent, westContinent2);
      createIslands(iWidth, iHeight, eastContinent2, eastContinent2, 4);
      createIslands(iWidth, iHeight, eastContinent2, eastContinent2, 5);
      createIslands(iWidth, iHeight, eastContinent2, eastContinent2, 6);
      applyCoastalErosionAdjustingForStartSectors(
        eastContinent,
        westContinent,
        0.1,
        1.5,
        0.8,
        iStartSectorRows,
        iStartSectorCols,
        startSectors
      );
      let islandTiles = countIslandTiles(iWidth, iHeight);
      let islandRatio = islandTiles / totalTiles;
      let attempts = 0;
      while (islandRatio < ISLAND_COVERAGE_TARGET && attempts < 3) {
        console.log("Island coverage too low: " + (islandRatio * 100).toFixed(2) + "%. Adding more islands.");
        createIslands(iWidth, iHeight, eastContinent2, eastContinent2, 6);
        islandTiles = countIslandTiles(iWidth, iHeight);
        islandRatio = islandTiles / totalTiles;
        attempts++;
      }
    }
  } else if (totalTiles != 0) {
    console.log("Standard Map");
    const iFractalGrain = 2;
    const iWaterPercent = g_WaterPercent * g_Cutoff;
    const iLargestContinentPercent = 30;
    createOrganicLandmasses(
      iWidth,
      iHeight,
      westContinent,
      eastContinent,
      iFractalGrain,
      iWaterPercent,
      iLargestContinentPercent
    );
    addPlotTags(iHeight, iWidth, eastContinent.west);
    if (bWestDominant) {
      createSecondaryLandmass(iWidth, iHeight, eastContinent, eastContinent2);
      createIslands(iWidth, iHeight, westContinent2, westContinent2, 4);
      createIslands(iWidth, iHeight, westContinent2, westContinent2, 6);
      createIslands(iWidth, iHeight, westContinent2, westContinent2, 6);
      applyCoastalErosion(westContinent, 0.15, 1.5, 0.8, false);
      applyCoastalErosion(eastContinent, 0.01, 1.5, 0.8, true);
      let islandTiles = countIslandTiles(iWidth, iHeight);
      let islandRatio = islandTiles / totalTiles;
      let attempts = 0;
      while (islandRatio < ISLAND_COVERAGE_TARGET && attempts < 3) {
        console.log("Island coverage too low: " + (islandRatio * 100).toFixed(2) + "%. Adding more islands.");
        createIslands(iWidth, iHeight, westContinent2, westContinent2, 6);
        islandTiles = countIslandTiles(iWidth, iHeight);
        islandRatio = islandTiles / totalTiles;
        attempts++;
      }
    } else {
      createSecondaryLandmass(iWidth, iHeight, westContinent, westContinent2);
      createIslands(iWidth, iHeight, eastContinent2, eastContinent2, 4);
      createIslands(iWidth, iHeight, eastContinent2, eastContinent2, 6);
      createIslands(iWidth, iHeight, eastContinent2, eastContinent2, 6);
      applyCoastalErosion(westContinent, 0.01, 1.5, 0.8, true);
      applyCoastalErosion(eastContinent, 0.15, 1.5, 0.8, false);
      let islandTiles = countIslandTiles(iWidth, iHeight);
      let islandRatio = islandTiles / totalTiles;
      let attempts = 0;
      while (islandRatio < ISLAND_COVERAGE_TARGET && attempts < 3) {
        console.log("Island coverage too low: " + (islandRatio * 100).toFixed(2) + "%. Adding more islands.");
        createIslands(iWidth, iHeight, eastContinent2, eastContinent2, 6);
        islandTiles = countIslandTiles(iWidth, iHeight);
        islandRatio = islandTiles / totalTiles;
        attempts++;
      }
    }
    applyCoastalErosion(westContinent2, 0.01, 1.5, 0.8, true);
    applyCoastalErosion(eastContinent2, 0.01, 1.5, 0.8, true);
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
  adjustOceanPlotTags(bWestDominant);
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
  if (bWestDominant) {
    generateResources(iWidth, iHeight);
    startPositions = assignSingleContinentStartPositions(
      iNumPlayers1 + iNumPlayers2,
      westContinent,
      iStartSectorRows,
      iStartSectorCols,
      startSectors
    );
    replaceIslandResources(iWidth, iHeight, "RESOURCECLASS_TREASURE");
  } else {
    generateResources(iWidth, iHeight);
    startPositions = assignSingleContinentStartPositions(
      iNumPlayers1 + iNumPlayers2,
      eastContinent,
      iStartSectorRows,
      iStartSectorCols,
      startSectors
    );
    replaceIslandResources(iWidth, iHeight, "RESOURCECLASS_TREASURE");
  }
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
console.log("Loaded pangaea-plus.ts");
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
function createSecondaryLandmass(iWidth, iHeight, continent1, continent2) {
  console.log("Generating secondary landmass as small islands...");
  clearContinent(continent1);
  clearContinent(continent2);
  createIslands(iWidth, iHeight, continent1, continent2, 4);
  createIslands(iWidth, iHeight, continent1, continent2, 6);
  createIslands(iWidth, iHeight, continent1, continent2, 6);
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

export { expandCoastsPlus };
//# sourceMappingURL=pangaea-plus.js.map
