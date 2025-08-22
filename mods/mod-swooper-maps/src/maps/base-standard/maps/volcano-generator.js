import { g_VolcanoFeature, g_MountainTerrain, g_TundraBiome } from './map-globals.js';

function getContinentBoundaryPlotCount(iWidth, iHeight) {
  let iContinentBoundaryPlots = 0;
  for (let iY = 0; iY < iHeight; iY++) {
    for (let iX = 0; iX < iWidth; iX++) {
      if (GameplayMap.findSecondContinent(iX, iY, 3)) {
        iContinentBoundaryPlots = iContinentBoundaryPlots + 1;
      }
    }
  }
  return iContinentBoundaryPlots;
}
function getNumberAdjacentMountains(iX, iY) {
  let iCount = 0;
  for (let iDirection = 0; iDirection < DirectionTypes.NUM_DIRECTION_TYPES; iDirection++) {
    const iIndex = GameplayMap.getIndexFromXY(iX, iY);
    const iLocation = GameplayMap.getLocationFromIndex(iIndex);
    const pAdjacentPlot = GameplayMap.getAdjacentPlotLocation(iLocation, iDirection);
    if (GameplayMap.isMountain(pAdjacentPlot.x, pAdjacentPlot.y)) {
      iCount = iCount + 1;
    }
  }
  return iCount;
}
function getNumberAdjacentVolcanoes(iX, iY) {
  let iCount = 0;
  for (let iDirection = 0; iDirection < DirectionTypes.NUM_DIRECTION_TYPES; iDirection++) {
    const iIndex = GameplayMap.getIndexFromXY(iX, iY);
    const iLocation = GameplayMap.getLocationFromIndex(iIndex);
    const pAdjacentPlot = GameplayMap.getAdjacentPlotLocation(iLocation, iDirection);
    if (GameplayMap.getFeatureType(pAdjacentPlot.x, pAdjacentPlot.y) == g_VolcanoFeature) {
      iCount = iCount + 1;
    }
  }
  return iCount;
}
function addVolcanoes(iWidth, iHeight, spacing = 2) {
  console.log("Volcanoes");
  const iMountainPercentByDistance = [30, 18, 6];
  let iCountVolcanoesPlaced = 0;
  const placedVolcanoes = [];
  const minDistanceBetweenVolcanoes = spacing;
  let iTotalLandPlots = 0;
  for (let iY = 0; iY < iHeight; iY++) {
    for (let iX = 0; iX < iWidth; iX++) {
      if (!GameplayMap.isWater(iX, iY)) {
        iTotalLandPlots = iTotalLandPlots + 1;
      }
    }
  }
  const iDesiredVolcanoes = iTotalLandPlots / 150;
  console.log("Desired Volcanoes: " + iDesiredVolcanoes);
  const iContinentBoundaryPlots = getContinentBoundaryPlotCount(iWidth, iHeight);
  console.log("Continent Boundary Plots: " + iContinentBoundaryPlots);
  const iDesiredNearBoundaries = iDesiredVolcanoes * 2 / 3;
  console.log("Desired Boundary Volcanoes: " + iDesiredNearBoundaries);
  if (iDesiredNearBoundaries > 0) {
    const iBoundaryPlotsPerVolcano = iContinentBoundaryPlots / iDesiredNearBoundaries;
    console.log("Boundary Plots Per Volcano: " + iBoundaryPlotsPerVolcano);
    for (let iY = 0; iY < iHeight; iY++) {
      for (let iX = 0; iX < iWidth; iX++) {
        if (!GameplayMap.isWater(iX, iY)) {
          let iPlotsFromBoundary = -1;
          let bVolcanoHere = false;
          const iNumAdjacentMountains = getNumberAdjacentMountains(iX, iY);
          if (iNumAdjacentMountains != 6) {
            if (GameplayMap.findSecondContinent(iX, iY, 1)) {
              if (TerrainBuilder.getRandomNumber(iBoundaryPlotsPerVolcano * 0.7, "Volcano on boundary") == 0) {
                bVolcanoHere = true;
              }
              iPlotsFromBoundary = 1;
            } else if (GameplayMap.findSecondContinent(iX, iY, 2)) {
              if (TerrainBuilder.getRandomNumber(iBoundaryPlotsPerVolcano, "Volcano 1 from boundary") == 0) {
                bVolcanoHere = true;
              }
              iPlotsFromBoundary = 2;
            } else if (GameplayMap.findSecondContinent(iX, iY, 3)) {
              if (TerrainBuilder.getRandomNumber(
                iBoundaryPlotsPerVolcano * 1.5,
                "Volcano 2 from boundary"
              ) == 0) {
                bVolcanoHere = true;
              }
              iPlotsFromBoundary = 3;
            }
          }
          if (bVolcanoHere && !isTooCloseToExistingVolcanoes(iX, iY, placedVolcanoes, minDistanceBetweenVolcanoes)) {
            TerrainBuilder.setTerrainType(iX, iY, g_MountainTerrain);
            TerrainBuilder.setFeatureType(iX, iY, {
              Feature: g_VolcanoFeature,
              Direction: -1,
              Elevation: 0
            });
            placedVolcanoes.push({ x: iX, y: iY });
            iCountVolcanoesPlaced++;
          } else if (iPlotsFromBoundary > 0) {
            let iMountainChance = iMountainPercentByDistance[iPlotsFromBoundary - 1];
            if (getNumberAdjacentVolcanoes(iX, iY) > 0) {
              iMountainChance = iMountainChance / 2;
            }
            if (TerrainBuilder.getRandomNumber(100, "Mountain near boundary") < iMountainChance) {
              TerrainBuilder.setTerrainType(iX, iY, g_MountainTerrain);
            }
          }
        }
      }
    }
  }
  console.log("Continent Edge Volcanoes Placed: " + iCountVolcanoesPlaced);
}
function isTooCloseToExistingVolcanoes(iX, iY, existingVolcanoes, minDistance) {
  for (const volcano of existingVolcanoes) {
    const dx = volcano.x - iX;
    const dy = volcano.y - iY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDistance) return true;
  }
  return false;
}
function addTundraVolcanoes(iWidth, iHeight, spacing = 3) {
  console.log(`Adding tundra volcanoes`);
  let iTotalLandPlots = 0;
  for (let iY = 0; iY < iHeight; iY++) {
    for (let iX = 0; iX < iWidth; iX++) {
      if (!GameplayMap.isWater(iX, iY)) {
        iTotalLandPlots++;
      }
    }
  }
  let tundraVolcanoesPlaced = 0;
  const iDesiredVolcanoes = Math.floor(iTotalLandPlots / 300);
  console.log("Desired Tundra Volcanoes: " + iDesiredVolcanoes);
  const placedVolcanoes = [];
  const tundraCandidates = [];
  for (let iY = 0; iY < iHeight; iY++) {
    for (let iX = 0; iX < iWidth; iX++) {
      const biome = GameplayMap.getBiomeType(iX, iY);
      if (biome === g_TundraBiome && GameplayMap.isMountain(iX, iY)) {
        const isInland = !GameplayMap.isCoastalLand(iX, iY);
        tundraCandidates.push({ x: iX, y: iY, isInland });
      }
    }
  }
  shuffleCandidates(tundraCandidates);
  tundraCandidates.sort((a, b) => {
    if (a.isInland === b.isInland) return 0;
    return a.isInland ? -1 : 1;
  });
  const baseChance = 20;
  const falloffPerVolcano = 5;
  for (const { x, y } of tundraCandidates) {
    if (tundraVolcanoesPlaced >= iDesiredVolcanoes) break;
    if (!isTooCloseToExistingVolcanoes(x, y, placedVolcanoes, spacing)) {
      const currentChance = Math.max(1, baseChance - tundraVolcanoesPlaced * falloffPerVolcano);
      if (TerrainBuilder.getRandomNumber(100, "Tundra Volcano Roll") < currentChance) {
        TerrainBuilder.setTerrainType(x, y, g_MountainTerrain);
        TerrainBuilder.setFeatureType(x, y, {
          Feature: g_VolcanoFeature,
          Direction: -1,
          Elevation: 0
        });
        placedVolcanoes.push({ x, y });
        tundraVolcanoesPlaced++;
        console.log(`Tundra Volcano Placed at (${x}, ${y}) — chance was ${currentChance}%`);
      }
    }
  }
  console.log(`Total Tundra Volcanoes Placed: ${tundraVolcanoesPlaced}`);
  function shuffleCandidates(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = TerrainBuilder.getRandomNumber(i + 1, "Shuffle");
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}

export { addTundraVolcanoes, addVolcanoes, isTooCloseToExistingVolcanoes };
//# sourceMappingURL=volcano-generator.js.map
