import { assignAdvancedStartRegions } from './assign-advanced-start-region.js';
import { chooseStartSectors, assignStartPositions } from './assign-starting-plots.js';
import { generateDiscoveries } from './discovery-generator.js';
import { expandCoasts, addMountains, generateLakes, addHills, buildRainfallMap } from './elevation-terrain-generator.js';
import { designateBiomes, addFeatures } from './feature-biome-generator.js';
import { dumpStartSectors, dumpContinents, dumpTerrain, dumpElevation, dumpRainfall, dumpBiomes, dumpFeatures, dumpResources, dumpNoisePredicate } from './map-debug-helpers.js';
import { g_OceanWaterColumns, g_PolarWaterRows, g_WaterPercent, g_Cutoff, g_NavigableRiverTerrain, g_LandmassFractal, g_FlatTerrain, g_OceanTerrain, g_FractalWeight, g_CenterWeight, g_StartSectorWeight, g_CoastTerrain } from './map-globals.js';
import { needHumanNearEquator, applyCoastalErosionAdjustingForStartSectors, addPlotTags, createOrganicLandmasses, applyCoastalErosion, adjustOceanPlotTags, adjustLakePlotTags, getHeightAdjustingForStartSector, getSector } from './map-utilities.js';
import { addNaturalWonders } from './natural-wonder-generator.js';
import { generateResources } from './resource-generator.js';
import { generateSnow, dumpPermanentSnow } from './snow-generator.js';
import { addVolcanoes, addTundraVolcanoes } from './volcano-generator.js';

console.log("Generating using script Continents.ts");
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
  const iOceanWaterColumns = g_OceanWaterColumns;
  const westContinent = {
    west: iOceanWaterColumns / 2,
    east: iWidth / 2 - iOceanWaterColumns / 2,
    south: g_PolarWaterRows,
    north: iHeight - g_PolarWaterRows,
    continent: 0
  };
  const eastContinent = {
    west: iWidth / 2 + iOceanWaterColumns / 2,
    east: iWidth - iOceanWaterColumns / 2,
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
    createLandmasses(
      iWidth,
      iHeight,
      westContinent,
      eastContinent,
      iStartSectorRows,
      iStartSectorCols,
      startSectors
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
    addPlotTags(iHeight, iWidth, eastContinent.west);
  } else {
    console.log("Standard Map");
    const iFractalGrain = 2;
    const iWaterPercent = g_WaterPercent * g_Cutoff;
    const iLargestContinentPercent = 18;
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
    applyCoastalErosion(westContinent, 0.02, 1.5, 0.8, false);
    applyCoastalErosion(eastContinent, 0.02, 1.5, 0.8, false);
    const iAreaID = AreaBuilder.findBiggestArea(false);
    const kBoundaries = AreaBuilder.getAreaBoundary(iAreaID);
    console.log("BIGGEST AREA");
    console.log("  West: " + kBoundaries.west);
    console.log("  East: " + kBoundaries.east);
    console.log("  South: " + kBoundaries.south);
    console.log("  North: " + kBoundaries.north);
    if (kBoundaries.west > iWidth / 2) {
      const iNum1 = iNumPlayers1;
      const iNum2 = iNumPlayers2;
      iNumPlayers1 = iNum2;
      iNumPlayers2 = iNum1;
    }
  }
  TerrainBuilder.validateAndFixTerrain();
  expandCoasts(iWidth, iHeight);
  adjustOceanPlotTags(iNumPlayers1 > iNumPlayers2);
  AreaBuilder.recalculateAreas();
  TerrainBuilder.stampContinents();
  addMountains(iWidth, iHeight);
  addVolcanoes(iWidth, iHeight);
  generateLakes(iWidth, iHeight, iTilesPerLake);
  adjustLakePlotTags(westContinent, true);
  adjustLakePlotTags(eastContinent, false);
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
console.log("Loaded Continents.ts");
console.log("hey, continents is firing");
function createLandmasses(iWidth, iHeight, continent1, continent2, iStartSectorRows, iStartSectorCols, startSectors) {
  FractalBuilder.create(g_LandmassFractal, iWidth, iHeight, 2, 0);
  const iWaterHeight = FractalBuilder.getHeightFromPercent(g_LandmassFractal, g_WaterPercent);
  const iBuffer = Math.floor(iHeight / 18);
  const iBuffer2 = Math.floor(iWidth / 28);
  for (let iY = 0; iY < iHeight; iY++) {
    for (let iX = 0; iX < iWidth; iX++) {
      let terrain = g_FlatTerrain;
      const iRandom = TerrainBuilder.getRandomNumber(iBuffer, "Random Top/Bottom Edges");
      const iRandom2 = TerrainBuilder.getRandomNumber(iBuffer2, "Random Left/Right Edges");
      if (iY < continent1.south + iRandom || iY >= continent1.north - iRandom) {
        terrain = g_OceanTerrain;
      } else if (iX < continent1.west + iRandom2 || iX >= continent2.east - iRandom2 || iX >= continent1.east - iRandom2 && iX < continent2.west + iRandom2) {
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
          if (startSectors[iSector]) {
            terrain = g_CoastTerrain;
          } else {
            terrain = g_OceanTerrain;
          }
        }
      }
      TerrainBuilder.setTerrainType(iX, iY, terrain);
    }
  }
}
//# sourceMappingURL=continents.js.map
