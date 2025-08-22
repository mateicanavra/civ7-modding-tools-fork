import { g_DesiredBufferBetweenMajorStarts, g_RequiredBufferBetweenMajorStarts } from './map-globals.js';
import { getSectorRegion, shuffle, isOceanAccess } from './map-utilities.js';

class PlayerRegionTile {
  x = 0;
  y = 0;
  playerId = 0;
}
function chooseStartSectors(iNumPlayersLandmass1, iNumPlayersLandmass2, iRows, iCols, bHumanNearEquator) {
  const returnValue = [];
  const iSectorsPerContinent = iRows * iCols;
  let iPlayersWestContinent = iNumPlayersLandmass1;
  let iPlayersEastContinent = iNumPlayersLandmass2;
  let iMaxNumMajors = 0;
  iMaxNumMajors = iPlayersWestContinent + iPlayersEastContinent;
  const aliveMajorIds = Players.getAliveMajorIds();
  const humanPlayers = [];
  for (let iMajorIndex = 0; iMajorIndex < iMaxNumMajors; iMajorIndex++) {
    if (iMajorIndex < aliveMajorIds.length && Players.isHuman(aliveMajorIds[iMajorIndex])) {
      humanPlayers.push(iMajorIndex);
    }
  }
  const numHumans = humanPlayers.length;
  const maxSide = Math.max(iPlayersWestContinent, iPlayersEastContinent);
  if (numHumans > maxSide) {
    const half = Math.floor(iMaxNumMajors / 2);
    iPlayersWestContinent = half;
    iPlayersEastContinent = iMaxNumMajors - half;
    iNumPlayersLandmass1 = iPlayersWestContinent;
    iNumPlayersLandmass2 = iPlayersEastContinent;
  }
  if (iNumPlayersLandmass1 == 1 && iNumPlayersLandmass2 == 3) {
    var validConfigs1 = [[0], [1], [2], [3], [4], [5]];
    var validConfigs2 = [
      [0, 3, 4],
      [1, 2, 5]
    ];
  } else if (iNumPlayersLandmass1 == 3 && iNumPlayersLandmass2 == 1) {
    var validConfigs1 = [
      [0, 3, 4],
      [1, 2, 5]
    ];
    var validConfigs2 = [[0], [1], [2], [3], [4], [5]];
  } else if (iNumPlayersLandmass1 == 4 && iNumPlayersLandmass2 == 0) {
    var validConfigs1 = [[0, 2, 3, 5]];
    var validConfigs2 = [[]];
  } else if (iNumPlayersLandmass1 == 4 && iNumPlayersLandmass2 == 2) {
    var validConfigs1 = [
      [0, 2, 6, 8],
      [1, 3, 5, 7]
    ];
    var validConfigs2 = [
      [0, 8],
      [2, 6]
    ];
  } else if (iNumPlayersLandmass1 == 2 && iNumPlayersLandmass2 == 4) {
    var validConfigs1 = [
      [0, 8],
      [2, 6]
    ];
    var validConfigs2 = [
      [0, 2, 6, 8],
      [1, 3, 5, 7]
    ];
  } else if (iNumPlayersLandmass1 == 6 && iNumPlayersLandmass2 == 0) {
    var validConfigs1 = [[0, 2, 3, 5, 6, 8]];
    var validConfigs2 = [[]];
  } else if (iNumPlayersLandmass1 == 5 && iNumPlayersLandmass2 == 3) {
    var validConfigs1 = [
      [0, 2, 6, 8, 10],
      [1, 3, 5, 9, 11]
    ];
    var validConfigs2 = [
      [3, 5, 7],
      [4, 6, 8]
    ];
  } else if (iNumPlayersLandmass1 == 3 && iNumPlayersLandmass2 == 5) {
    var validConfigs1 = [
      [3, 5, 7],
      [4, 6, 8]
    ];
    var validConfigs2 = [
      [0, 2, 6, 8, 10],
      [1, 3, 5, 9, 11]
    ];
  } else if (iNumPlayersLandmass1 == 6 && iNumPlayersLandmass2 == 4) {
    var validConfigs1 = [
      [0, 2, 4, 6, 8, 10],
      [1, 3, 5, 7, 9, 11]
    ];
    var validConfigs2 = [
      [1, 3, 5, 7],
      [4, 6, 8, 10]
    ];
  } else if (iNumPlayersLandmass1 == 4 && iNumPlayersLandmass2 == 6) {
    var validConfigs1 = [
      [1, 3, 5, 7],
      [4, 6, 8, 10]
    ];
    var validConfigs2 = [
      [0, 2, 4, 6, 8, 10],
      [1, 3, 5, 7, 9, 11]
    ];
  } else if (iNumPlayersLandmass1 == 2 && iNumPlayersLandmass2 == 2) {
    var validConfigs1 = [
      [0, 5],
      [1, 4]
    ];
    var validConfigs2 = [
      [0, 5],
      [1, 4]
    ];
  } else if (iNumPlayersLandmass1 == 3 && iNumPlayersLandmass2 == 3) {
    var validConfigs1 = [
      [0, 2, 7],
      [1, 6, 8]
    ];
    var validConfigs2 = [
      [0, 2, 7],
      [1, 6, 8]
    ];
  } else if (iNumPlayersLandmass1 == 4 && iNumPlayersLandmass2 == 4) {
    var validConfigs1 = [
      [0, 2, 6, 8],
      [3, 5, 9, 11]
    ];
    var validConfigs2 = [
      [0, 2, 6, 8],
      [3, 5, 9, 11]
    ];
  } else if (iNumPlayersLandmass1 == 5 && iNumPlayersLandmass2 == 5) {
    var validConfigs1 = [
      [0, 2, 6, 8, 10],
      [1, 3, 5, 9, 11]
    ];
    var validConfigs2 = [
      [0, 2, 6, 8, 10],
      [1, 3, 5, 9, 11]
    ];
  } else if (iNumPlayersLandmass1 == 6 && iNumPlayersLandmass2 == 6) {
    var validConfigs1 = [
      [0, 2, 4, 6, 8, 10],
      [1, 3, 5, 7, 9, 11]
    ];
    var validConfigs2 = [
      [0, 2, 4, 6, 8, 10],
      [1, 3, 5, 7, 9, 11]
    ];
  } else if (iNumPlayersLandmass1 == 8 && iNumPlayersLandmass2 == 0) {
    var validConfigs1 = [[0, 2, 3, 5, 6, 8, 9, 11]];
    var validConfigs2 = [[]];
  } else if (iNumPlayersLandmass1 == 5 && iNumPlayersLandmass2 == 0) {
    var validConfigs1 = [[0, 2, 3, 5, 6]];
    var validConfigs2 = [[]];
  } else {
    console.log("THIS SHOULD NOT BE HIT IN STARTING POSITION");
    var validConfigs1 = [[0], [1], [2], [3], [4], [5]];
    var validConfigs2 = [
      [0, 2, 4],
      [1, 3, 5]
    ];
  }
  let iWestContinentConfig = validConfigs1.length - 1;
  if (!bHumanNearEquator)
    iWestContinentConfig = TerrainBuilder.getRandomNumber(validConfigs1.length, "West Continent Start Positions");
  for (let i = 0; i < iSectorsPerContinent; i++) {
    let bFoundIt = false;
    for (let j = 0; j < iPlayersWestContinent; j++) {
      if (i == validConfigs1[iWestContinentConfig][j]) {
        bFoundIt = true;
        break;
      }
    }
    returnValue[i] = bFoundIt;
  }
  let iEastContinentConfig = validConfigs2.length - 1;
  if (!bHumanNearEquator)
    iEastContinentConfig = TerrainBuilder.getRandomNumber(validConfigs2.length, "East Continent Start Positions");
  for (let i = 0; i < iSectorsPerContinent; i++) {
    let bFoundIt = false;
    for (let j = 0; j < iPlayersEastContinent; j++) {
      if (i == validConfigs2[iEastContinentConfig][j]) {
        bFoundIt = true;
        break;
      }
    }
    returnValue[i + iSectorsPerContinent] = bFoundIt;
  }
  return returnValue;
}
function assignStartPositions(iNumWest, iNumEast, west, east, iStartSectorRows, iStartSectorCols, sectors) {
  console.log("Assigning Starting Positions");
  const startPositions = [];
  console.log("iStartSectorRows: " + iStartSectorRows);
  console.log("iStartSectorCols: " + iStartSectorCols);
  console.log("iNumWest: " + iNumWest);
  console.log("iNumEast: " + iNumEast);
  let iMaxNumMajors = 0;
  iMaxNumMajors = iNumWest + iNumEast;
  console.log("iMaxNumMajors: " + iMaxNumMajors);
  let bEastBias = false;
  if (iNumEast > iNumWest) {
    console.log("EastSide");
    bEastBias = true;
  }
  const aliveMajorIds = Players.getAliveMajorIds();
  if (iMaxNumMajors < aliveMajorIds.length) {
    console.log("The input total is less than the total alive majors: " + aliveMajorIds.length);
  }
  const humanPlayers = [];
  for (let iMajorIndex = 0; iMajorIndex < iMaxNumMajors; iMajorIndex++) {
    if (iMajorIndex < aliveMajorIds.length && Players.isHuman(aliveMajorIds[iMajorIndex])) {
      humanPlayers.push(iMajorIndex);
    }
  }
  let iNumberHomelands = 0;
  let bHumansLargestLandmass = GameInfo.Ages.lookup(Game.age).HumanPlayersPrimaryHemisphere;
  if (bEastBias && iNumEast < humanPlayers.length) {
    bHumansLargestLandmass = false;
  } else if (!bEastBias && iNumWest < humanPlayers.length) {
    bHumansLargestLandmass = false;
  }
  if (bHumansLargestLandmass) {
    if (bEastBias) {
      iNumberHomelands = iNumEast;
    } else {
      iNumberHomelands = iNumWest;
    }
  } else {
    iNumberHomelands = (iNumWest + iNumEast) / 2;
  }
  const homelandStartRegions = [];
  const distantStartRegions = [];
  let bAssignStartPositionsBySector = true;
  if (iStartSectorRows == 0 || iStartSectorCols == 0) {
    bAssignStartPositionsBySector = false;
  } else {
    bAssignStartPositionsBySector = checkStartSectorsViable(
      west,
      east,
      iStartSectorRows,
      iStartSectorCols,
      sectors
    );
  }
  if (bAssignStartPositionsBySector) {
    console.log("Using Sector-based Assignments");
    for (let iSector = 0; iSector < sectors.length; iSector++) {
      if (sectors[iSector] == true) {
        const region = getSectorRegion(
          iSector,
          iStartSectorRows,
          iStartSectorCols,
          east.south,
          east.north,
          west.west,
          west.east,
          east.west
        );
        const bEastHemis = iSector >= sectors.length / 2;
        let szHeading;
        if (bEastHemis == bEastBias) {
          homelandStartRegions.push(region);
          szHeading = "HOMELAND START REGION:";
        } else {
          distantStartRegions.push(region);
          szHeading = "DISTANT START REGION:";
        }
        console.log(szHeading);
        console.log("West: " + region.west);
        console.log("East: " + region.east);
        console.log("North: " + region.north);
        console.log("South: " + region.south);
        console.log("Start Sector: " + iSector);
      }
    }
  } else {
    console.log("Using Areas of Equal Fertility");
    const iMinMajorFertility = 25;
    const iMinMinorFertility = 5;
    {
      const iLeftCol = bEastBias ? east.west : west.west;
      const iRightCol = bEastBias ? east.east : west.east;
      const uiPlotTagFilter = bEastBias ? PlotTags.PLOT_TAG_EAST_LANDMASS : PlotTags.PLOT_TAG_WEST_LANDMASS;
      StartPositioner.initializeValues();
      StartPositioner.divideMapIntoMajorRegions(
        iNumberHomelands,
        iMinMajorFertility,
        iMinMinorFertility,
        iLeftCol,
        iRightCol,
        uiPlotTagFilter
      );
      console.log("Divided map into major regions for Homelands");
      for (let iRegion = 0; iRegion < iNumberHomelands; iRegion++) {
        homelandStartRegions[iRegion] = StartPositioner.getMajorStartRegion(iRegion);
        console.log("HOMELAND START REGION: " + iRegion);
        console.log("West: " + homelandStartRegions[iRegion].west);
        console.log("East: " + homelandStartRegions[iRegion].east);
        console.log("North: " + homelandStartRegions[iRegion].north);
        console.log("South: " + homelandStartRegions[iRegion].south);
        console.log("Continent: " + homelandStartRegions[iRegion].continent);
      }
    }
    {
      const iLeftCol = bEastBias ? west.west : east.west;
      const iRightCol = bEastBias ? west.east : east.east;
      const uiPlotTagFilter = bEastBias ? PlotTags.PLOT_TAG_WEST_LANDMASS : PlotTags.PLOT_TAG_EAST_LANDMASS;
      StartPositioner.initializeValues();
      StartPositioner.divideMapIntoMajorRegions(
        iMaxNumMajors - iNumberHomelands,
        iMinMajorFertility,
        iMinMinorFertility,
        iLeftCol,
        iRightCol,
        uiPlotTagFilter
      );
      console.log("Divided map into major regions for Distant Lands");
      for (let iRegion = 0; iRegion < iMaxNumMajors - iNumberHomelands; iRegion++) {
        distantStartRegions[iRegion] = StartPositioner.getMajorStartRegion(iRegion);
        console.log("DISTANT START REGION: " + iRegion);
        console.log("West: " + distantStartRegions[iRegion].west);
        console.log("East: " + distantStartRegions[iRegion].east);
        console.log("North: " + distantStartRegions[iRegion].north);
        console.log("South: " + distantStartRegions[iRegion].south);
        console.log("Continent: " + distantStartRegions[iRegion].continent);
      }
    }
  }
  const homelandPlayers = [];
  const distantPlayers = [];
  if (bHumansLargestLandmass) {
    for (let iMajorIndex = 0; iMajorIndex < iMaxNumMajors; iMajorIndex++) {
      if (iMajorIndex < aliveMajorIds.length && Players.isHuman(aliveMajorIds[iMajorIndex])) {
        homelandPlayers.push(iMajorIndex);
      }
    }
    for (let iMajorIndex = 0; iMajorIndex < iMaxNumMajors; iMajorIndex++) {
      if (iMajorIndex < aliveMajorIds.length && Players.isAI(aliveMajorIds[iMajorIndex])) {
        if (homelandPlayers.length < iNumberHomelands) {
          homelandPlayers.push(iMajorIndex);
        } else {
          distantPlayers.push(iMajorIndex);
        }
      }
    }
    shuffle(homelandPlayers);
    shuffle(distantPlayers);
  } else {
    const tempPlayers = [];
    for (let iMajorIndex = 0; iMajorIndex < iMaxNumMajors; iMajorIndex++) {
      if (iMajorIndex < aliveMajorIds.length) {
        console.log("Found real major at: " + aliveMajorIds[iMajorIndex]);
        tempPlayers.push(iMajorIndex);
      }
    }
    shuffle(tempPlayers);
    for (let i = 0; i < tempPlayers.length; i++) {
      if (homelandPlayers.length < iNumberHomelands) {
        homelandPlayers.push(tempPlayers[i]);
      } else {
        distantPlayers.push(tempPlayers[i]);
      }
    }
  }
  console.log("homelandPlayers: " + homelandPlayers.length);
  console.log("homelandStartRegions: " + homelandStartRegions.length);
  console.log("distantPlayers: " + distantPlayers.length);
  console.log("distantStartRegions: " + distantStartRegions.length);
  console.log("Update homelandPlayers:");
  updateRegionsForStartBias(homelandPlayers, homelandStartRegions);
  console.log("Update distantPlayers:");
  updateRegionsForStartBias(distantPlayers, distantStartRegions);
  for (let i = 0; i < homelandPlayers.length; i++) {
    const iStartPosition = homelandPlayers[i];
    const playerId = aliveMajorIds[iStartPosition];
    const plotIndex = pickStartPlot(homelandStartRegions[i], i, playerId, false, startPositions);
    if (plotIndex >= 0) {
      startPositions[iStartPosition] = plotIndex;
      const location = GameplayMap.getLocationFromIndex(plotIndex);
      console.log("CHOICE FOR PLAYER: " + playerId + " (" + location.x + ", " + location.y + ")");
      StartPositioner.setStartPosition(plotIndex, playerId);
    } else {
      console.log("FAILED TO PICK LOCATION FOR: " + playerId);
    }
  }
  for (let i = 0; i < distantPlayers.length; i++) {
    const iStartPosition = distantPlayers[i];
    const playerId = aliveMajorIds[iStartPosition];
    const plotIndex = pickStartPlot(
      distantStartRegions[i],
      i + homelandPlayers.length,
      playerId,
      false,
      startPositions
    );
    if (plotIndex >= 0) {
      startPositions[iStartPosition] = plotIndex;
      const location = GameplayMap.getLocationFromIndex(plotIndex);
      console.log("CHOICE FOR PLAYER: " + playerId + " (" + location.x + ", " + location.y + ")");
      StartPositioner.setStartPosition(plotIndex, playerId);
    } else {
      console.log("FAILED TO PICK LOCATION FOR: " + playerId);
    }
  }
  return startPositions;
}
function assignStartPositionsFromTiles(iNumWest, iNumEast, west, east) {
  console.log("Assigning Starting Positions");
  const startPositions = [];
  console.log("iNumWest: " + iNumWest);
  console.log("iNumEast: " + iNumEast);
  let iMaxNumMajors = 0;
  iMaxNumMajors = iNumWest + iNumEast;
  console.log("iMaxNumMajors: " + iMaxNumMajors);
  let bEastBias = false;
  if (iNumEast > iNumWest || iNumEast == iNumWest && east.length > west.length) {
    console.log("EastSide");
    bEastBias = true;
  }
  const aliveMajorIds = Players.getAliveMajorIds();
  if (iMaxNumMajors != aliveMajorIds.length) {
    console.log(
      "The input player total " + iMaxNumMajors + " is not equal to the alive majors: " + aliveMajorIds.length
    );
  }
  const humanPlayers = [];
  for (let iMajorIndex = 0; iMajorIndex < iMaxNumMajors; iMajorIndex++) {
    if (iMajorIndex < aliveMajorIds.length && Players.isHuman(aliveMajorIds[iMajorIndex])) {
      humanPlayers.push(iMajorIndex);
    }
  }
  let iNumberHomelands = 0;
  let bHumansLargestLandmass = GameInfo.Ages.lookup(Game.age).HumanPlayersPrimaryHemisphere;
  if (bEastBias && iNumEast < humanPlayers.length) {
    bHumansLargestLandmass = false;
  } else if (!bEastBias && iNumWest < humanPlayers.length) {
    bHumansLargestLandmass = false;
  }
  if (bHumansLargestLandmass) {
    if (bEastBias) {
      iNumberHomelands = iNumEast;
    } else {
      iNumberHomelands = iNumWest;
    }
  } else {
    iNumberHomelands = (iNumWest + iNumEast) / 2;
  }
  const homelandPlayers = [];
  const distantPlayers = [];
  if (bHumansLargestLandmass) {
    for (let iMajorIndex = 0; iMajorIndex < iMaxNumMajors; iMajorIndex++) {
      if (iMajorIndex < aliveMajorIds.length && Players.isHuman(aliveMajorIds[iMajorIndex])) {
        homelandPlayers.push(iMajorIndex);
      }
    }
    for (let iMajorIndex = 0; iMajorIndex < iMaxNumMajors; iMajorIndex++) {
      if (iMajorIndex < aliveMajorIds.length && Players.isAI(aliveMajorIds[iMajorIndex])) {
        if (homelandPlayers.length < iNumberHomelands) {
          homelandPlayers.push(iMajorIndex);
        } else {
          distantPlayers.push(iMajorIndex);
        }
      }
    }
    shuffle(homelandPlayers);
    shuffle(distantPlayers);
  } else {
    const tempPlayers = [];
    for (let iMajorIndex = 0; iMajorIndex < iMaxNumMajors; iMajorIndex++) {
      if (iMajorIndex < aliveMajorIds.length) {
        console.log("Found real major at: " + aliveMajorIds[iMajorIndex]);
        tempPlayers.push(iMajorIndex);
      }
    }
    shuffle(tempPlayers);
    for (let i = 0; i < tempPlayers.length; i++) {
      if (homelandPlayers.length < iNumberHomelands) {
        homelandPlayers.push(tempPlayers[i]);
      } else {
        distantPlayers.push(tempPlayers[i]);
      }
    }
  }
  const homelandTiles = bEastBias ? east : west;
  const distantTiles = bEastBias ? west : east;
  for (let i = 0; i < homelandPlayers.length; i++) {
    const iStartPosition = homelandPlayers[i];
    const playerId = aliveMajorIds[iStartPosition];
    const playerTiles = homelandTiles.filter((tile) => tile.playerId === playerId);
    console.log(
      "Searching " + playerTiles.length + " tiles on the " + (bEastBias ? "east" : "west") + " landmass for a start position for player " + playerId + (Players.isHuman(playerId) ? " (human)" : " (ai)")
    );
    const plotIndex = pickStartPlotByTile(playerTiles, -1, i, playerId, false, startPositions);
    if (plotIndex >= 0) {
      startPositions[iStartPosition] = plotIndex;
      const location = GameplayMap.getLocationFromIndex(plotIndex);
      console.log("CHOICE FOR PLAYER: " + playerId + " (" + location.x + ", " + location.y + ")");
      StartPositioner.setStartPosition(plotIndex, playerId);
    } else {
      console.log("FAILED TO PICK LOCATION FOR: " + playerId);
    }
  }
  for (let i = 0; i < distantPlayers.length; i++) {
    const iStartPosition = distantPlayers[i];
    const playerId = aliveMajorIds[iStartPosition];
    const playerTiles = distantTiles.filter((tile) => tile.playerId === playerId);
    console.log(
      "Searching " + playerTiles.length + " tiles on the " + (bEastBias ? "west" : "east") + " landmass for a start position for player " + playerId + (Players.isHuman(playerId) ? " (human)" : " (ai)")
    );
    const plotIndex = pickStartPlotByTile(playerTiles, -1, i, playerId, false, startPositions);
    if (plotIndex >= 0) {
      startPositions[iStartPosition] = plotIndex;
      const location = GameplayMap.getLocationFromIndex(plotIndex);
      console.log("CHOICE FOR PLAYER: " + playerId + " (" + location.x + ", " + location.y + ")");
      StartPositioner.setStartPosition(plotIndex, playerId);
    } else {
      console.log("FAILED TO PICK LOCATION FOR: " + playerId);
    }
  }
  return startPositions;
}
function assignSingleContinentStartPositions(iNumPlayers, primaryLandmass, iStartSectorRows, iStartSectorCols, sectors, uiPlotTagFilter = 4294967295) {
  console.log("Assigning Starting Positions");
  const startPositions = [];
  console.log("iStartSectorRows: " + iStartSectorRows);
  console.log("iStartSectorCols: " + iStartSectorCols);
  let iMaxNumMajors = 0;
  iMaxNumMajors = iNumPlayers;
  console.log("iMaxNumMajors: " + iMaxNumMajors);
  const aliveMajorIds = Players.getAliveMajorIds();
  if (iMaxNumMajors < aliveMajorIds.length) {
    console.log("The input total is less than the total alive majors: " + aliveMajorIds.length);
  }
  const homelandPlayers = [];
  const homelandStartRegions = [];
  let bAssignStartPositionsBySector = true;
  if (iStartSectorRows == 0 || iStartSectorCols == 0) {
    bAssignStartPositionsBySector = false;
  } else {
    bAssignStartPositionsBySector = checkStartSectorsViable(
      primaryLandmass,
      primaryLandmass,
      iStartSectorRows,
      iStartSectorCols,
      sectors
    );
  }
  if (bAssignStartPositionsBySector) {
    console.log("Using Sector-based Assignments");
    for (let iSector = 0; iSector < sectors.length; iSector++) {
      if (sectors[iSector] == true) {
        const region = getSectorRegion(
          iSector,
          iStartSectorRows,
          iStartSectorCols,
          primaryLandmass.south,
          primaryLandmass.north,
          primaryLandmass.west,
          primaryLandmass.east,
          primaryLandmass.west
        );
        let szHeading;
        homelandStartRegions.push(region);
        szHeading = "HOMELAND START REGION:";
        console.log(szHeading);
        console.log("West: " + region.west);
        console.log("East: " + region.east);
        console.log("North: " + region.north);
        console.log("South: " + region.south);
        console.log("Start Sector: " + iSector);
      }
    }
  } else {
    console.log("Assigning Starting Positions Across a Single Continent with Equal Fertility");
    const iMinMajorFertility = 25;
    const iMinMinorFertility = 5;
    StartPositioner.initializeValues();
    StartPositioner.divideMapIntoMajorRegions(
      iNumPlayers,
      iMinMajorFertility,
      iMinMinorFertility,
      primaryLandmass.west,
      primaryLandmass.east,
      uiPlotTagFilter
    );
    const potentialRegions = [];
    for (let i = 0; i < iNumPlayers; i++) {
      const region = StartPositioner.getMajorStartRegion(i);
      if (region && region.east > primaryLandmass.west && region.west < primaryLandmass.east) {
        potentialRegions.push(region);
      }
    }
    potentialRegions.sort(
      (a, b) => (b.east - b.west) * (b.north - b.south) - (a.east - a.west) * (a.north - a.south)
    );
    for (const region of potentialRegions) {
      if (homelandStartRegions.length < iNumPlayers) {
        homelandStartRegions.push(region);
      }
    }
    if (homelandStartRegions.length < iNumPlayers) {
      console.log("WARNING: Not enough fertile regions found within the selected continent.");
    }
  }
  for (let iMajorIndex = 0; iMajorIndex < iMaxNumMajors; iMajorIndex++) {
    if (iMajorIndex < aliveMajorIds.length) {
      homelandPlayers.push(iMajorIndex);
    }
  }
  shuffle(homelandPlayers);
  console.log("homelandPlayers: " + homelandPlayers.length);
  console.log("homelandStartRegions: " + homelandStartRegions.length);
  console.log("Update homelandPlayers:");
  updateRegionsForStartBias(homelandPlayers, homelandStartRegions);
  for (let i = 0; i < homelandPlayers.length; i++) {
    const iStartPosition = homelandPlayers[i];
    const playerId = aliveMajorIds[iStartPosition];
    let plotIndex = pickStartPlot(homelandStartRegions[i], i, playerId, false, startPositions);
    if (plotIndex >= 0) {
      startPositions[iStartPosition] = plotIndex;
      const location = GameplayMap.getLocationFromIndex(plotIndex);
      console.log("CHOICE FOR PLAYER: " + playerId + " (" + location.x + ", " + location.y + ")");
      StartPositioner.setStartPosition(plotIndex, playerId);
    } else {
      console.log("FAILED TO PICK LOCATION FOR: " + playerId + " - Retrying with alternative regions.");
      for (const retryRegion of homelandStartRegions) {
        plotIndex = pickStartPlot(retryRegion, i, playerId, false, startPositions);
        if (plotIndex >= 0) {
          startPositions[iStartPosition] = plotIndex;
          StartPositioner.setStartPosition(plotIndex, playerId);
          console.log("Successfully found an alternative start position for " + playerId);
          break;
        }
      }
      if (plotIndex < 0) {
        console.log("FAILED AGAIN - NO VALID LOCATION FOUND FOR: " + playerId);
      }
    }
  }
  return startPositions;
}
function checkStartSectorsViable(west, east, iStartSectorRows, iStartSectorCols, sectors) {
  const tempStartPositions = [];
  for (let iSector = 0; iSector < sectors.length; iSector++) {
    if (sectors[iSector] == true) {
      const region = getSectorRegion(
        iSector,
        iStartSectorRows,
        iStartSectorCols,
        east.south,
        east.north,
        west.west,
        west.east,
        east.west
      );
      const startPlot = pickStartPlot(region, 0, 0, true, tempStartPositions);
      if (startPlot == -1) {
        console.log("LOW FERTILITY START SECTOR: " + iSector);
        console.log("West: " + region.west);
        console.log("East: " + region.east);
        console.log("North: " + region.north);
        console.log("South: " + region.south);
        console.log("ABORTING - Falling back to Civ VI start position assignment algorithm");
        return false;
      }
    }
  }
  return true;
}
function updateRegionsForStartBias(majorGroup, startRegions) {
  const biomeBiases = new Array(majorGroup.length);
  for (let i = 0; i < majorGroup.length; i++) {
    biomeBiases[i] = [];
  }
  const navRiverBias = [];
  const NWBias = [];
  for (let iMajorGroup = 0; iMajorGroup < majorGroup.length; iMajorGroup++) {
    for (let iBiome = 0; iBiome < GameInfo.Biomes.length; iBiome++) {
      biomeBiases[iMajorGroup][iBiome] = 0;
    }
    navRiverBias[iMajorGroup] = 0;
    NWBias[iMajorGroup] = 0;
  }
  const aliveMajorIds = Players.getAliveMajorIds();
  for (let iMajorGroup = 0; iMajorGroup < majorGroup.length; iMajorGroup++) {
    const playerId = aliveMajorIds[majorGroup[iMajorGroup]];
    const player = Players.get(playerId);
    if (player == null) {
      continue;
    }
    const uiCivType = player.civilizationType;
    const uiLeaderType = player.leaderType;
    console.log("Player Id:" + playerId + ", " + player.civilizationName + ", " + player.leaderName);
    for (let startBiomeIdx = 0; startBiomeIdx < GameInfo.StartBiasBiomes.length; startBiomeIdx++) {
      const startBiomeDef = GameInfo.StartBiasBiomes[startBiomeIdx];
      if (startBiomeDef) {
        const civString = startBiomeDef.CivilizationType;
        const ldrString = startBiomeDef.LeaderType;
        let civHash = 0;
        let ldrHash = 0;
        if (civString != null) {
          const civObj = GameInfo.Civilizations.lookup(civString);
          if (civObj) {
            civHash = civObj.$hash;
          }
        }
        if (ldrString != null) {
          const ldrObj = GameInfo.Leaders.lookup(ldrString);
          if (ldrObj) {
            ldrHash = ldrObj.$hash;
          }
        }
        if (civHash == uiCivType || ldrHash == uiLeaderType) {
          const biomeDef = GameInfo.Biomes.lookup(startBiomeDef.BiomeType);
          if (biomeDef) {
            const biomeIndex = biomeDef.$index;
            console.log("biomeIndex: " + biomeIndex + ", Score: " + startBiomeDef.Score);
            biomeBiases[iMajorGroup][biomeIndex] += startBiomeDef.Score;
          }
        }
      }
    }
    for (let startRiverIdx = 0; startRiverIdx < GameInfo.StartBiasTerrains.length; startRiverIdx++) {
      const startBiasTerrainDef = GameInfo.StartBiasTerrains[startRiverIdx];
      if (startBiasTerrainDef) {
        if (startBiasTerrainDef.TerrainType == "TERRAIN_NAVIGABLE_RIVER") {
          const civString = startBiasTerrainDef.CivilizationType;
          const ldrString = startBiasTerrainDef.LeaderType;
          let civHash = 0;
          let ldrHash = 0;
          if (civString != null) {
            const civObj = GameInfo.Civilizations.lookup(civString);
            if (civObj) {
              civHash = civObj.$hash;
            }
          }
          if (ldrString != null) {
            const ldrObj = GameInfo.Leaders.lookup(ldrString);
            if (ldrObj) {
              ldrHash = ldrObj.$hash;
            }
          }
          if (civHash == uiCivType || ldrHash == uiLeaderType) {
            navRiverBias[iMajorGroup] += startBiasTerrainDef.Score;
          }
        }
      }
    }
    for (let startNWIdx = 0; startNWIdx < GameInfo.StartBiasNaturalWonders.length; startNWIdx++) {
      const startBiasNWDef = GameInfo.StartBiasNaturalWonders[startNWIdx];
      if (startBiasNWDef) {
        const civString = startBiasNWDef.CivilizationType;
        const ldrString = startBiasNWDef.LeaderType;
        let civHash = 0;
        let ldrHash = 0;
        if (civString != null) {
          const civObj = GameInfo.Civilizations.lookup(civString);
          if (civObj) {
            civHash = civObj.$hash;
          }
        }
        if (ldrString != null) {
          const ldrObj = GameInfo.Leaders.lookup(ldrString);
          if (ldrObj) {
            ldrHash = ldrObj.$hash;
          }
        }
        if (civHash == uiCivType || ldrHash == uiLeaderType) {
          NWBias[iMajorGroup] += startBiasNWDef.Score;
        }
      }
    }
  }
  console.log("biomeBiases " + biomeBiases);
  console.log("navRiverBias " + navRiverBias);
  console.log("NWBias " + NWBias);
  const biomeCounts = new Array(startRegions.length);
  for (let i = 0; i < startRegions.length; i++) {
    biomeCounts[i] = [];
  }
  const navRiverCounts = [];
  const NWCounts = [];
  for (let iRegion = 0; iRegion < startRegions.length; iRegion++) {
    for (let iBiome = 0; iBiome < GameInfo.Biomes.length; iBiome++) {
      biomeCounts[iRegion][iBiome] = 0;
    }
    navRiverCounts[iRegion] = 0;
    NWCounts[iRegion] = 0;
  }
  for (let iRegion = 0; iRegion < startRegions.length; iRegion++) {
    const region = startRegions[iRegion];
    for (let iX = region.west; iX <= region.east; iX++) {
      for (let iY = region.south; iY <= region.north; iY++) {
        const biomeType = GameplayMap.getBiomeType(iX, iY);
        biomeCounts[iRegion][biomeType]++;
        if (GameplayMap.isNavigableRiver(iX, iY)) {
          navRiverCounts[iRegion]++;
        }
        if (GameplayMap.isNaturalWonder(iX, iY)) {
          NWCounts[iRegion]++;
        }
      }
    }
  }
  console.log("biomeCounts " + biomeCounts);
  console.log("navRiverCounts " + navRiverCounts);
  console.log("NWCounts " + NWCounts);
  const totalMajorBiases = [];
  const sortedMajorIndices = [];
  for (let iMajorGroup = 0; iMajorGroup < majorGroup.length; iMajorGroup++) {
    totalMajorBiases[iMajorGroup] = 0;
    sortedMajorIndices[iMajorGroup] = iMajorGroup;
  }
  for (let iMajorGroup = 0; iMajorGroup < majorGroup.length; iMajorGroup++) {
    for (let iBiome = 0; iBiome < GameInfo.Biomes.length; iBiome++) {
      totalMajorBiases[iMajorGroup] += biomeBiases[iMajorGroup][iBiome];
    }
    totalMajorBiases[iMajorGroup] += navRiverBias[iMajorGroup];
    totalMajorBiases[iMajorGroup] += NWBias[iMajorGroup];
  }
  console.log("totalMajorBiases " + totalMajorBiases);
  sortedMajorIndices.sort((a, b) => {
    return totalMajorBiases[b] - totalMajorBiases[a];
  });
  console.log("sortedMajorIndices " + sortedMajorIndices);
  console.log("majorGroup (original):" + majorGroup);
  const originalMajorGroup = [];
  for (let iMajorGroup = 0; iMajorGroup < majorGroup.length; iMajorGroup++) {
    originalMajorGroup[iMajorGroup] = majorGroup[iMajorGroup];
    majorGroup[iMajorGroup] = -1;
  }
  for (let iMajorGroup = 0; iMajorGroup < majorGroup.length; iMajorGroup++) {
    const iMajorToPlace = sortedMajorIndices[iMajorGroup];
    let iBestScore = -1;
    let iBestRegion = -1;
    for (let iRegion = 0; iRegion < startRegions.length; iRegion++) {
      if (majorGroup[iRegion] == -1) {
        let regionScoreForMajor = 0;
        for (let iBiome = 0; iBiome < GameInfo.Biomes.length; iBiome++) {
          regionScoreForMajor += biomeBiases[iMajorToPlace][iBiome] * biomeCounts[iRegion][iBiome];
        }
        regionScoreForMajor += navRiverBias[iMajorToPlace] * navRiverCounts[iRegion];
        regionScoreForMajor += NWBias[iMajorToPlace] * NWCounts[iRegion];
        console.log(
          "majorIndex: " + iMajorToPlace + ", original ID: " + originalMajorGroup[iMajorToPlace] + ", regionScore: " + regionScoreForMajor
        );
        if (regionScoreForMajor > iBestScore) {
          iBestScore = regionScoreForMajor;
          iBestRegion = iRegion;
        }
      }
    }
    if (iBestRegion >= 0) {
      majorGroup[iBestRegion] = originalMajorGroup[iMajorToPlace];
      console.log("Region " + iBestRegion + " is best for major: " + originalMajorGroup[iMajorToPlace]);
    }
  }
  console.log("Majors (final form):" + majorGroup);
}
function pickStartPlotByTile(tiles, continentId, numFoundEarlier, playerId, ignoreBias, startPositions) {
  let chosenPlotIndex = -1;
  let highestScore = 0;
  for (const tile of tiles) {
    let score = scorePlot(tile.x, tile.y, continentId);
    if (score > 0) {
      if (!ignoreBias) {
        score += adjustScoreByStartBias(tile.x, tile.y, playerId);
      }
      if (numFoundEarlier > 0) {
        score = adjustScoreByClosestStart(score, tile.x, tile.y, startPositions);
      }
      if (score > highestScore) {
        highestScore = score;
        chosenPlotIndex = tile.y * GameplayMap.getGridWidth() + tile.x;
      }
    }
  }
  return chosenPlotIndex;
}
function pickStartPlot(region, numFoundEarlier, playerId, ignoreBias, startPositions) {
  const tiles = [];
  for (let iY = region.south; iY <= region.north; iY++) {
    for (let iX = region.west; iX <= region.east; iX++) {
      tiles.push({ x: iX, y: iY });
    }
  }
  return pickStartPlotByTile(tiles, region.continent, numFoundEarlier, playerId, ignoreBias, startPositions);
}
function scorePlot(iX, iY, iContinent) {
  let score = -1;
  if (!GameplayMap.isWater(iX, iY) && !GameplayMap.isMountain(iX, iY)) {
    if (iContinent == -1 || GameplayMap.getContinentType(iX, iY) == iContinent) {
      score = StartPositioner.getStartPositionScore(iX, iY);
    }
  }
  return score;
}
function adjustScoreByClosestStart(originalScore, iX, iY, startPositions) {
  let score = originalScore;
  if (g_DesiredBufferBetweenMajorStarts <= g_RequiredBufferBetweenMajorStarts) return score;
  const distance = getDistanceToClosestStart(iX, iY, startPositions);
  if (distance < g_RequiredBufferBetweenMajorStarts) {
    score = 0;
  } else if (distance < g_DesiredBufferBetweenMajorStarts) {
    score = score * (distance - g_RequiredBufferBetweenMajorStarts + 1) / (g_DesiredBufferBetweenMajorStarts - g_RequiredBufferBetweenMajorStarts + 1);
  }
  return score;
}
function getDistanceToClosestStart(iX, iY, startPositions) {
  let minDistance = 32768;
  for (let iStart = 0; iStart < startPositions.length; iStart++) {
    const startPlotIndex = startPositions[iStart];
    if (startPlotIndex) {
      const iStartX = startPlotIndex % GameplayMap.getGridWidth();
      const iStartY = startPlotIndex / GameplayMap.getGridWidth();
      const distance = GameplayMap.getPlotDistance(iX, iY, iStartX, iStartY);
      if (distance < minDistance) {
        minDistance = distance;
      }
    }
  }
  return minDistance;
}
function adjustScoreByStartBias(iX, iY, playerId) {
  let score = 0;
  const player = Players.get(playerId);
  if (player == null || player.isAlive == false) {
    return score;
  }
  const eCivType = player.civilizationType;
  const eLeaderType = player.leaderType;
  for (let biomeIdx = 0; biomeIdx < GameInfo.StartBiasBiomes.length; biomeIdx++) {
    const startBiasCivilization = GameInfo.StartBiasBiomes[biomeIdx]?.CivilizationType;
    const startBiasLeader = GameInfo.StartBiasBiomes[biomeIdx]?.LeaderType;
    const startBiasBiome = GameInfo.StartBiasBiomes[biomeIdx]?.BiomeType;
    if (startBiasBiome) {
      if (startBiasCivilization) {
        const startBiasCivilizationTypeIndex = GameInfo.Civilizations.lookup(startBiasCivilization)?.$index;
        const civInfoTypeIndex = GameInfo.Civilizations.lookup(eCivType)?.$index;
        if (startBiasCivilizationTypeIndex == civInfoTypeIndex) {
          score += getBiomeStartBiasScore(startBiasBiome, GameInfo.StartBiasBiomes[biomeIdx].Score, iX, iY);
        }
      }
      if (startBiasLeader) {
        const startBiasLeaderTypeIndex = GameInfo.Leaders.lookup(startBiasLeader)?.$index;
        const leaderInfoTypeIndex = GameInfo.Leaders.lookup(eLeaderType)?.$index;
        if (startBiasLeaderTypeIndex == leaderInfoTypeIndex) {
          score += getBiomeStartBiasScore(startBiasBiome, GameInfo.StartBiasBiomes[biomeIdx].Score, iX, iY);
        }
      }
    }
  }
  for (let terrainIdx = 0; terrainIdx < GameInfo.StartBiasTerrains.length; terrainIdx++) {
    const startBiasCivilization = GameInfo.StartBiasTerrains[terrainIdx]?.CivilizationType;
    const startBiasLeader = GameInfo.StartBiasTerrains[terrainIdx]?.LeaderType;
    const startBiasTerrain = GameInfo.StartBiasTerrains[terrainIdx]?.TerrainType;
    if (startBiasTerrain) {
      if (startBiasCivilization) {
        const startBiasCivilizationTypeIndex = GameInfo.Civilizations.lookup(startBiasCivilization)?.$index;
        const civInfoTypeIndex = GameInfo.Civilizations.lookup(eCivType)?.$index;
        if (startBiasCivilizationTypeIndex == civInfoTypeIndex) {
          score += getTerrainStartBiasScore(
            startBiasTerrain,
            GameInfo.StartBiasTerrains[terrainIdx].Score,
            iX,
            iY
          );
        }
      }
      if (startBiasLeader) {
        const startBiasLeaderTypeIndex = GameInfo.Leaders.lookup(startBiasLeader)?.$index;
        const leaderInfoTypeIndex = GameInfo.Leaders.lookup(eLeaderType)?.$index;
        if (startBiasLeaderTypeIndex == leaderInfoTypeIndex) {
          score += getTerrainStartBiasScore(
            startBiasTerrain,
            GameInfo.StartBiasTerrains[terrainIdx].Score,
            iX,
            iY
          );
        }
      }
    }
  }
  for (let riverIdx = 0; riverIdx < GameInfo.StartBiasRivers.length; riverIdx++) {
    const startBiasCivilization = GameInfo.StartBiasRivers[riverIdx]?.CivilizationType;
    const startBiasLeader = GameInfo.StartBiasRivers[riverIdx]?.LeaderType;
    if (startBiasCivilization) {
      const startBiasCivilizationTypeIndex = GameInfo.Civilizations.lookup(startBiasCivilization)?.$index;
      const civInfoTypeIndex = GameInfo.Civilizations.lookup(eCivType)?.$index;
      if (startBiasCivilizationTypeIndex == civInfoTypeIndex) {
        score += getRiverStartBiasScore(GameInfo.StartBiasRivers[riverIdx].Score, iX, iY);
      }
    }
    if (startBiasLeader) {
      const startBiasLeaderTypeIndex = GameInfo.Leaders.lookup(startBiasLeader)?.$index;
      const leaderInfoTypeIndex = GameInfo.Leaders.lookup(eLeaderType)?.$index;
      if (startBiasLeaderTypeIndex == leaderInfoTypeIndex) {
        score += getRiverStartBiasScore(GameInfo.StartBiasRivers[riverIdx].Score, iX, iY);
      }
    }
  }
  for (let coastIdx = 0; coastIdx < GameInfo.StartBiasAdjacentToCoasts.length; coastIdx++) {
    const startBiasCivilization = GameInfo.StartBiasAdjacentToCoasts[coastIdx]?.CivilizationType;
    const startBiasLeader = GameInfo.StartBiasAdjacentToCoasts[coastIdx]?.LeaderType;
    if (startBiasCivilization) {
      const startBiasCivilizationTypeIndex = GameInfo.Civilizations.lookup(startBiasCivilization)?.$index;
      const civInfoTypeIndex = GameInfo.Civilizations.lookup(eCivType)?.$index;
      if (startBiasCivilizationTypeIndex == civInfoTypeIndex) {
        score += getCoastStartBiasScore(GameInfo.StartBiasAdjacentToCoasts[coastIdx].Score, iX, iY);
      }
    }
    if (startBiasLeader) {
      const startBiasLeaderTypeIndex = GameInfo.Leaders.lookup(startBiasLeader)?.$index;
      const leaderInfoTypeIndex = GameInfo.Leaders.lookup(eLeaderType)?.$index;
      if (startBiasLeaderTypeIndex == leaderInfoTypeIndex) {
        score += getCoastStartBiasScore(GameInfo.StartBiasAdjacentToCoasts[coastIdx].Score, iX, iY);
      }
    }
  }
  for (let featureIdx = 0; featureIdx < GameInfo.StartBiasFeatureClasses.length; featureIdx++) {
    const startBiasCivilization = GameInfo.StartBiasFeatureClasses[featureIdx]?.CivilizationType;
    const startBiasLeader = GameInfo.StartBiasFeatureClasses[featureIdx]?.LeaderType;
    const startBiasFeature = GameInfo.StartBiasFeatureClasses[featureIdx]?.FeatureClassType;
    if (startBiasFeature) {
      if (startBiasCivilization) {
        const startBiasCivilizationTypeIndex = GameInfo.Civilizations.lookup(startBiasCivilization)?.$index;
        const civInfoTypeIndex = GameInfo.Civilizations.lookup(eCivType)?.$index;
        if (startBiasCivilizationTypeIndex == civInfoTypeIndex) {
          score += getFeatureClassStartBiasScore(
            startBiasFeature,
            GameInfo.StartBiasFeatureClasses[featureIdx].Score,
            iX,
            iY
          );
        }
      }
      if (startBiasLeader) {
        const startBiasLeaderTypeIndex = GameInfo.Leaders.lookup(startBiasLeader)?.$index;
        const leaderInfoTypeIndex = GameInfo.Leaders.lookup(eLeaderType)?.$index;
        if (startBiasLeaderTypeIndex == leaderInfoTypeIndex) {
          score += getFeatureClassStartBiasScore(
            startBiasFeature,
            GameInfo.StartBiasFeatureClasses[featureIdx].Score,
            iX,
            iY
          );
        }
      }
    }
  }
  for (let resourceIdx = 0; resourceIdx < GameInfo.StartBiasResources.length; resourceIdx++) {
    const startBiasCivilization = GameInfo.StartBiasResources[resourceIdx]?.CivilizationType;
    const startBiasLeader = GameInfo.StartBiasResources[resourceIdx]?.LeaderType;
    const startBiasResource = GameInfo.StartBiasResources[resourceIdx]?.ResourceType;
    if (startBiasResource) {
      if (startBiasCivilization) {
        const startBiasCivilizationTypeIndex = GameInfo.Civilizations.lookup(startBiasCivilization)?.$index;
        const civInfoTypeIndex = GameInfo.Civilizations.lookup(eCivType)?.$index;
        if (startBiasCivilizationTypeIndex == civInfoTypeIndex) {
          score += getResourceStartBiasScore(
            startBiasResource,
            GameInfo.StartBiasResources[resourceIdx].Score,
            iX,
            iY
          );
        }
      }
      if (startBiasLeader) {
        const startBiasLeaderTypeIndex = GameInfo.Leaders.lookup(startBiasLeader)?.$index;
        const leaderInfoTypeIndex = GameInfo.Leaders.lookup(eLeaderType)?.$index;
        if (startBiasLeaderTypeIndex == leaderInfoTypeIndex) {
          score += getResourceStartBiasScore(
            startBiasResource,
            GameInfo.StartBiasResources[resourceIdx].Score,
            iX,
            iY
          );
        }
      }
    }
  }
  for (let lakeIdx = 0; lakeIdx < GameInfo.StartBiasLakes.length; lakeIdx++) {
    const startBiasCivilization = GameInfo.StartBiasLakes[lakeIdx]?.CivilizationType;
    const startBiasLeader = GameInfo.StartBiasLakes[lakeIdx]?.LeaderType;
    if (startBiasCivilization) {
      const startBiasCivilizationTypeIndex = GameInfo.Civilizations.lookup(startBiasCivilization)?.$index;
      const civInfoTypeIndex = GameInfo.Civilizations.lookup(eCivType)?.$index;
      if (startBiasCivilizationTypeIndex == civInfoTypeIndex) {
        score += getLakeStartBiasScore(GameInfo.StartBiasLakes[lakeIdx].Score, iX, iY);
      }
    }
    if (startBiasLeader) {
      const startBiasLeaderTypeIndex = GameInfo.Leaders.lookup(startBiasLeader)?.$index;
      const leaderInfoTypeIndex = GameInfo.Leaders.lookup(eLeaderType)?.$index;
      if (startBiasLeaderTypeIndex == leaderInfoTypeIndex) {
        score += getLakeStartBiasScore(GameInfo.StartBiasLakes[lakeIdx].Score, iX, iY);
      }
    }
  }
  for (let nwIdx = 0; nwIdx < GameInfo.StartBiasNaturalWonders.length; nwIdx++) {
    const startBiasCivilization = GameInfo.StartBiasNaturalWonders[nwIdx]?.CivilizationType;
    const startBiasLeader = GameInfo.StartBiasNaturalWonders[nwIdx]?.LeaderType;
    if (startBiasCivilization) {
      const startBiasCivilizationTypeIndex = GameInfo.Civilizations.lookup(startBiasCivilization)?.$index;
      const civInfoTypeIndex = GameInfo.Civilizations.lookup(eCivType)?.$index;
      if (startBiasCivilizationTypeIndex == civInfoTypeIndex) {
        score += getNaturalWonderStartBiasScore(GameInfo.StartBiasNaturalWonders[nwIdx].Score, iX, iY);
      }
    }
    if (startBiasLeader) {
      const startBiasLeaderTypeIndex = GameInfo.Leaders.lookup(startBiasLeader)?.$index;
      const leaderInfoTypeIndex = GameInfo.Leaders.lookup(eLeaderType)?.$index;
      if (startBiasLeaderTypeIndex == leaderInfoTypeIndex) {
        score += getNaturalWonderStartBiasScore(GameInfo.StartBiasNaturalWonders[nwIdx].Score, iX, iY);
      }
    }
  }
  return score;
}
function getBiomeStartBiasScore(biome, score, iX, iY) {
  const startBiasBiomeTypeIndex = GameInfo.Biomes.lookup(biome)?.$index;
  const plots = GameplayMap.getPlotIndicesInRadius(iX, iY, 3);
  let outputScore = 0;
  for (let plot = 0; plot < plots.length; plot++) {
    const iLocation = GameplayMap.getLocationFromIndex(plots[plot]);
    const biomeInfoTypeIndex = GameInfo.Biomes.lookup(GameplayMap.getBiomeType(iLocation.x, iLocation.y))?.$index;
    if (startBiasBiomeTypeIndex == biomeInfoTypeIndex) {
      let distance = GameplayMap.getPlotDistance(iX, iY, iLocation.x, iLocation.y);
      if (distance < 1) {
        distance = 1;
      }
      outputScore += score / distance;
    }
  }
  return outputScore;
}
function getTerrainStartBiasScore(terrain, score, iX, iY) {
  const startBiasTerrainTypeIndex = GameInfo.Terrains.lookup(terrain)?.$index;
  const plots = GameplayMap.getPlotIndicesInRadius(iX, iY, 3);
  let outputScore = 0;
  for (let plot = 0; plot < plots.length; plot++) {
    const iLocation = GameplayMap.getLocationFromIndex(plots[plot]);
    const terrainInfoTypeIndex = GameInfo.Terrains.lookup(
      GameplayMap.getTerrainType(iLocation.x, iLocation.y)
    )?.$index;
    if (startBiasTerrainTypeIndex == terrainInfoTypeIndex) {
      let distance = GameplayMap.getPlotDistance(iX, iY, iLocation.x, iLocation.y);
      if (distance < 1) {
        distance = 1;
      }
      outputScore += score / distance;
    }
  }
  return outputScore;
}
function getRiverStartBiasScore(score, iX, iY) {
  const plots = GameplayMap.getPlotIndicesInRadius(iX, iY, 3);
  let outputScore = 0;
  for (let plot = 0; plot < plots.length; plot++) {
    const iLocation = GameplayMap.getLocationFromIndex(plots[plot]);
    if (GameplayMap.isRiver(iLocation.x, iLocation.y)) {
      let distance = GameplayMap.getPlotDistance(iX, iY, iLocation.x, iLocation.y);
      if (distance < 1) {
        distance = 1;
      }
      outputScore += score / distance;
    }
  }
  return outputScore;
}
function getCoastStartBiasScore(score, iX, iY) {
  let outputScore = 0;
  if (isOceanAccess(iX, iY)) {
    outputScore += score;
  }
  return outputScore;
}
function getFeatureClassStartBiasScore(feature, score, iX, iY) {
  const startBiasFeatureTypeIndex = GameInfo.FeatureClasses.lookup(feature)?.$index;
  const plots = GameplayMap.getPlotIndicesInRadius(iX, iY, 3);
  let outputScore = 0;
  for (let plot = 0; plot < plots.length; plot++) {
    const iLocation = GameplayMap.getLocationFromIndex(plots[plot]);
    const featureInfoTypeIndex = GameInfo.Features.lookup(
      GameplayMap.getFeatureType(iLocation.x, iLocation.y)
    )?.FeatureClassType;
    if (featureInfoTypeIndex) {
      const featureClassInfoTypeIndex = GameInfo.FeatureClasses.lookup(featureInfoTypeIndex)?.$index;
      if (featureClassInfoTypeIndex == startBiasFeatureTypeIndex) {
        let distance = GameplayMap.getPlotDistance(iX, iY, iLocation.x, iLocation.y);
        if (distance < 1) {
          distance = 1;
        }
        outputScore += score / distance;
      }
    }
  }
  return outputScore;
}
function getResourceStartBiasScore(resource, score, iX, iY) {
  const startBiasResourceTypeIndex = GameInfo.Resources.lookup(resource)?.$index;
  const plots = GameplayMap.getPlotIndicesInRadius(iX, iY, 3);
  let outputScore = 0;
  for (let plot = 0; plot < plots.length; plot++) {
    const iLocation = GameplayMap.getLocationFromIndex(plots[plot]);
    const resourceInfoTypeIndex = GameInfo.Resources.lookup(
      GameplayMap.getResourceType(iLocation.x, iLocation.y)
    )?.$index;
    if (startBiasResourceTypeIndex == resourceInfoTypeIndex) {
      outputScore += score;
    }
  }
  return outputScore;
}
function getLakeStartBiasScore(score, iX, iY) {
  const plots = GameplayMap.getPlotIndicesInRadius(iX, iY, 3);
  let outputScore = 0;
  for (let plot = 0; plot < plots.length; plot++) {
    const iLocation = GameplayMap.getLocationFromIndex(plots[plot]);
    if (GameplayMap.isLake(iLocation.x, iLocation.y)) {
      outputScore += score;
    }
  }
  if (outputScore > 0) {
    console.log("Start Bias Score: " + outputScore);
  }
  return outputScore;
}
function getNaturalWonderStartBiasScore(score, iX, iY) {
  const plots = GameplayMap.getPlotIndicesInRadius(iX, iY, 3);
  let outputScore = 0;
  for (let plot = 0; plot < plots.length; plot++) {
    const iLocation = GameplayMap.getLocationFromIndex(plots[plot]);
    if (GameplayMap.isNaturalWonder(iLocation.x, iLocation.y)) {
      outputScore += score;
    }
  }
  if (outputScore > 0) {
    console.log("Start Bias Score: " + outputScore);
  }
  return outputScore;
}

export { PlayerRegionTile, assignSingleContinentStartPositions, assignStartPositions, assignStartPositionsFromTiles, chooseStartSectors };
//# sourceMappingURL=assign-starting-plots.js.map
