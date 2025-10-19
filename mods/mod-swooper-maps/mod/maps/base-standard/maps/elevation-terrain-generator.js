import { g_MountainFractal, g_HillFractal, g_MountainTerrain, g_FlatTerrain, g_HillTerrain, g_OceanTerrain, g_OceanWaterColumns, g_CoastTerrain, g_StandardRainfall, g_MountainTopIncrease, g_RainShadowDrop, g_RainShadowIncreasePerHex } from './map-globals.js';
import { isCliff } from './map-utilities.js';

function addMountains(iWidth, iHeight) {
  const adjustment = 3;
  let extra_mountains = 0;
  const iFlags = 0;
  const grainAmount = 5;
  const liveEventDBRow = GameInfo.GlobalParameters.lookup("REGISTERED_MARVELOUS_MOUNTAINS_EVENT");
  if (liveEventDBRow && liveEventDBRow.Value != "0") {
    extra_mountains = 40;
  }
  const mountains = 93 - adjustment - extra_mountains;
  FractalBuilder.create(g_MountainFractal, iWidth, iHeight, grainAmount, iFlags);
  FractalBuilder.create(g_HillFractal, iWidth, iHeight, grainAmount, iFlags);
  const iMountainThreshold = FractalBuilder.getHeightFromPercent(g_MountainFractal, mountains);
  for (let iY = 0; iY < iHeight; iY++) {
    for (let iX = 0; iX < iWidth; iX++) {
      let terrain = GameplayMap.getTerrainType(iX, iY);
      if (GameplayMap.isWater(iX, iY) == false) {
        const iMountainHeight = FractalBuilder.getHeight(g_MountainFractal, iX, iY);
        if (iMountainHeight >= iMountainThreshold) {
          terrain = g_MountainTerrain;
        }
        if (terrain != g_FlatTerrain) {
          TerrainBuilder.setTerrainType(iX, iY, terrain);
        }
      }
    }
  }
}
function addHills(iWidth, iHeight) {
  const adjustment = 3;
  const base_hills_threshold = 950;
  const extra_hills = 0;
  const hillsThreshold = base_hills_threshold - adjustment * 20 - extra_hills;
  for (let iY = 0; iY < iHeight; iY++) {
    for (let iX = 0; iX < iWidth; iX++) {
      if (GameplayMap.isWater(iX, iY) == false && GameplayMap.isMountain(iX, iY) == false) {
        const iIndex = GameplayMap.getIndexFromXY(iX, iY);
        const iLocation = GameplayMap.getLocationFromIndex(iIndex);
        let iHillScore = 0;
        const iElevation = GameplayMap.getElevation(iX, iY);
        for (let iDirection = 0; iDirection < DirectionTypes.NUM_DIRECTION_TYPES; iDirection++) {
          if (GameplayMap.isCliffCrossing(iX, iY, iDirection) == false) {
            const iAdjacentX = GameplayMap.getAdjacentPlotLocation(iLocation, iDirection).x;
            const iAdjacentY = GameplayMap.getAdjacentPlotLocation(iLocation, iDirection).y;
            const iAdjacentElevation = GameplayMap.getElevation(iAdjacentX, iAdjacentY);
            const iElevationDifference = iAdjacentElevation - iElevation;
            if (iElevationDifference > 0) {
              iHillScore = iHillScore + iElevationDifference;
            } else {
              iHillScore = iHillScore - iElevationDifference;
            }
          }
        }
        if (iHillScore > hillsThreshold) {
          TerrainBuilder.setTerrainType(iX, iY, g_HillTerrain);
        }
      }
    }
  }
}
function expandCoasts(iWidth, iHeight) {
  for (let iY = 0; iY < iHeight; iY++) {
    for (let iX = 0; iX < iWidth; iX++) {
      const terrain = GameplayMap.getTerrainType(iX, iY);
      if (terrain == g_OceanTerrain) {
        if (iX > g_OceanWaterColumns / 2 && (iX < (iWidth - g_OceanWaterColumns) / 2 || iX > (iWidth + g_OceanWaterColumns) / 2) && iX < iWidth - g_OceanWaterColumns / 2) {
          if (GameplayMap.isAdjacentToShallowWater(iX, iY) && TerrainBuilder.getRandomNumber(4, "Shallow Water Scater Scatter") == 0) {
            TerrainBuilder.setTerrainType(iX, iY, g_CoastTerrain);
          }
        }
      }
    }
  }
}
function generateLakes(iWidth, iHeight, iTilesPerLake) {
  let iLakesAdded = 0;
  if (iTilesPerLake == 0) iTilesPerLake = 25;
  const ilakePlotRand = Math.floor(iWidth * iHeight / iTilesPerLake);
  console.log("Num Directions" + DirectionTypes.NUM_DIRECTION_TYPES);
  const lakeTiles = [];
  for (let iY = 0; iY < iHeight; iY++) {
    for (let iX = 0; iX < iWidth; iX++) {
      if (GameplayMap.isWater(iX, iY) == false) {
        if (GameplayMap.isCoastalLand(iX, iY) == false) {
          if (GameplayMap.isImpassable(iX, iY) == false) {
            const r = TerrainBuilder.getRandomNumber(ilakePlotRand, "MapGenerator AddLakes");
            if (r == 0) {
              iLakesAdded = iLakesAdded + 1;
              lakeTiles.push(...addMoreLake(iX, iY));
              lakeTiles.push({ x: iX, y: iY });
              TerrainBuilder.setTerrainType(iX, iY, g_CoastTerrain);
            }
          }
        }
      }
    }
  }
  if (iLakesAdded > 0) {
    console.log("Lakes Added: " + iLakesAdded);
  }
  return lakeTiles;
}
function addMoreLake(iX, iY) {
  let iLargeLakes = 0;
  const lakeTiles = [];
  const adjacentPlots = [];
  for (let iDirection = 0; iDirection < DirectionTypes.NUM_DIRECTION_TYPES; iDirection++) {
    const iIndex = GameplayMap.getIndexFromXY(iX, iY);
    const iLocation = GameplayMap.getLocationFromIndex(iIndex);
    const iAdjacentX = GameplayMap.getAdjacentPlotLocation(iLocation, iDirection).x;
    const iAdjacentY = GameplayMap.getAdjacentPlotLocation(iLocation, iDirection).y;
    const iAdjacentPlot = GameplayMap.getAdjacentPlotLocation(iLocation, iDirection);
    if (GameplayMap.isWater(iAdjacentX, iAdjacentY) == false) {
      if (GameplayMap.isAdjacentToShallowWater(iAdjacentX, iAdjacentY) == false) {
        if (GameplayMap.isImpassable(iAdjacentX, iAdjacentY) == false) {
          const r = TerrainBuilder.getRandomNumber(4 + iLargeLakes, "MapGenerator Enlarge Lakes");
          if (r < 3) {
            adjacentPlots.push(iAdjacentPlot);
            iLargeLakes = iLargeLakes + 1;
          }
        }
      }
    }
  }
  for (let adjacentIdx = 0; adjacentIdx < adjacentPlots.length; adjacentIdx++) {
    const x = adjacentPlots[adjacentIdx].x;
    const y = adjacentPlots[adjacentIdx].y;
    TerrainBuilder.setTerrainType(x, y, g_CoastTerrain);
    lakeTiles.push({ x, y });
  }
  return lakeTiles;
}
function buildRainfallMap(iWidth, iHeight) {
  for (let iY = 0; iY < iHeight; iY++) {
    let iMountainXTilesAgo = -1;
    for (let iX = 0; iX < iWidth; iX++) {
      let iRainfall = g_StandardRainfall;
      const terrain = GameplayMap.getTerrainType(iX, iY);
      if (GameplayMap.isLake(iX, iY) == true) {
        TerrainBuilder.setRainfall(iX, iY, iRainfall * 2);
      } else if (GameplayMap.isWater(iX, iY) == false) {
        if (terrain == g_MountainTerrain || isCliff(iX, iY)) {
          iMountainXTilesAgo = 0;
        } else if (iMountainXTilesAgo >= 0) {
          iMountainXTilesAgo++;
        }
        if (iMountainXTilesAgo == 0) {
          iRainfall += g_MountainTopIncrease;
        } else if (iMountainXTilesAgo > 0) {
          iRainfall += g_RainShadowDrop;
          iRainfall += iMountainXTilesAgo * g_RainShadowIncreasePerHex;
          if (iRainfall > g_StandardRainfall) {
            iRainfall = g_StandardRainfall;
          }
        }
        TerrainBuilder.setRainfall(iX, iY, iRainfall);
      } else {
        iMountainXTilesAgo = -1;
      }
    }
  }
}

export { addHills, addMountains, buildRainfallMap, expandCoasts, generateLakes };
//# sourceMappingURL=elevation-terrain-generator.js.map
