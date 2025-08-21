import { g_OceanTerrain, g_MountainTerrain, g_CoastTerrain, g_FlatTerrain, g_HillTerrain } from './map-globals.js';

const g_StartingScore = 20;
const g_BadTerrainScore = 1;
const g_GoodTerrainScore = 10;
const g_TooCloseToOtherPlayerPenalty = -3;
const g_TooCloseDistance = 10;
class AdvancedStartRegion {
  player;
  claimedPlots = [];
  potentialPlots;
  startPlot;
  constructor(inPlayer) {
    this.player = inPlayer;
    this.startPlot = { x: -1, y: -1 };
    this.potentialPlots = /* @__PURE__ */ new Map();
  }
}
function assignAdvancedStartRegions() {
  const playerIds = Players.getAliveIds();
  const playerRegions = [];
  const playerStartPositions = [];
  for (const playerId of playerIds) {
    const region = new AdvancedStartRegion(playerId);
    initializeRegion(region);
    playerStartPositions.push(region.startPlot);
    playerRegions.push(region);
  }
  let maxRegionSize = 0;
  const advStartParams = GameInfo.AdvancedStartParameters.lookup(Game.age);
  if (advStartParams !== null) {
    maxRegionSize = advStartParams.MaxRegionPlots;
  }
  let minRange = 3;
  const minRangeDef = GameInfo.GlobalParameters.lookup("CITY_MIN_RANGE");
  if (minRangeDef !== null) {
    minRange = parseInt(minRangeDef.Value);
  }
  for (let plotCount = 0; plotCount < maxRegionSize; plotCount++) {
    for (let i = 0; i < playerRegions.length; i++) {
      const plotIndex = claimPlot(playerRegions[i], playerStartPositions);
      if (plotIndex !== -1) {
        const plot = GameplayMap.getLocationFromIndex(plotIndex);
        const claimedPlots = GameplayMap.getPlotIndicesInRadius(plot.x, plot.y, minRange);
        for (let j = 0; j < playerRegions.length; j++) {
          if (i !== j) {
            for (const claimedPlot of claimedPlots) {
              playerRegions[j].potentialPlots.set(claimedPlot, -1);
            }
          }
        }
      }
    }
  }
  for (let i = 0; i < playerRegions.length; i++) {
    StartPositioner.setAdvancedStartRegion(playerRegions[i].player, playerRegions[i].claimedPlots);
  }
  dumpAdvancedStartRegions(playerRegions);
}
function initializeRegion(region) {
  const startPosition = StartPositioner.getStartPosition(region.player);
  if (startPosition === -1) {
    return;
  }
  region.startPlot = GameplayMap.getLocationFromIndex(startPosition);
  region.potentialPlots.set(startPosition, g_StartingScore + g_GoodTerrainScore);
}
function claimPlot(region, playerStartPositions) {
  let chosenPlot = -1;
  let maxScore = -1;
  for (const [potentialPlot, score] of region.potentialPlots.entries()) {
    if (score > maxScore) {
      maxScore = score;
      chosenPlot = potentialPlot;
    }
  }
  if (chosenPlot !== -1) {
    region.claimedPlots.push(chosenPlot);
    region.potentialPlots.set(chosenPlot, -1);
    const plot = GameplayMap.getLocationFromIndex(chosenPlot);
    const adjacentPlots = GameplayMap.getPlotIndicesInRadius(plot.x, plot.y, 1);
    for (let i = 0; i < adjacentPlots.length; i++) {
      const adjacentPlotIndex = adjacentPlots[i];
      if (region.potentialPlots.has(adjacentPlotIndex) == false) {
        const adjPlot = GameplayMap.getLocationFromIndex(adjacentPlotIndex);
        const terrainType = GameplayMap.getTerrainType(adjPlot.x, adjPlot.y);
        if (terrainType == g_OceanTerrain) {
          region.potentialPlots.set(adjacentPlotIndex, -1);
        } else if (terrainType == g_MountainTerrain || terrainType == g_CoastTerrain) {
          region.potentialPlots.set(adjacentPlotIndex, g_BadTerrainScore);
        } else {
          region.potentialPlots.set(adjacentPlotIndex, g_GoodTerrainScore);
        }
        let score = region.potentialPlots.get(adjacentPlotIndex);
        if (score) {
          if (score > 0) {
            let distScore = g_StartingScore - GameplayMap.getPlotDistance(region.startPlot.x, region.startPlot.y, adjPlot.x, adjPlot.y);
            if (distScore < 0) {
              distScore = 0;
            }
            score += distScore;
          }
          for (const playerPos of playerStartPositions) {
            const dist = GameplayMap.getPlotDistance(playerPos.x, playerPos.y, adjPlot.x, adjPlot.y);
            if (dist < g_TooCloseDistance) {
              score += g_TooCloseToOtherPlayerPenalty;
            }
          }
          region.potentialPlots.set(adjacentPlotIndex, score);
        }
      } else {
        const score = region.potentialPlots.get(adjacentPlotIndex);
        if (score && score > 0) {
          region.potentialPlots.set(adjacentPlotIndex, score + 1);
        }
      }
    }
  }
  return chosenPlot;
}
function dumpAdvancedStartRegions(playerRegions) {
  console.log("AdvancedStartRegions");
  const iHeight = GameplayMap.getGridHeight();
  const iWidth = GameplayMap.getGridWidth();
  for (let iY = iHeight - 1; iY >= 0; iY--) {
    let str = "";
    if (iY % 2 == 1) {
      str += " ";
    }
    for (let iX = 0; iX < iWidth; iX++) {
      const terrain = GameplayMap.getTerrainType(iX, iY);
      let terrainString = " ";
      if (terrain == g_FlatTerrain) {
        terrainString = ".";
      } else if (terrain == g_HillTerrain) {
        terrainString = "^";
      } else if (terrain == g_MountainTerrain) {
        terrainString = "M";
      } else if (terrain == g_OceanTerrain) {
        terrainString = "~";
      }
      str += terrainString;
      const plotIndex = GameplayMap.getIndexFromXY(iX, iY);
      const player = findPlotOwner(playerRegions, plotIndex);
      if (player !== -1) {
        str += player;
      } else {
        str += " ";
      }
    }
    console.log(str);
  }
}
function findPlotOwner(playerRegions, plot) {
  for (let player = 0; player < playerRegions.length; player++) {
    if (playerRegions[player].claimedPlots.indexOf(plot) !== -1) {
      return player;
    }
  }
  return -1;
}

export { assignAdvancedStartRegions };
//# sourceMappingURL=assign-advanced-start-region.js.map
