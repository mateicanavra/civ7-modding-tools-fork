import { getSectorRegion, shuffle, isOceanAccess } from '/base-standard/maps/map-utilities.js';
import * as globals from '/base-standard/maps/map-globals.js';

export class PlayerRegionTile {
	x: number = 0;
	y: number = 0;
	playerId: number = 0;
};

export function chooseStartSectors(iNumPlayersLandmass1: number, iNumPlayersLandmass2: number, iRows: number, iCols: number, bHumanNearEquator: boolean): boolean[] {
	let returnValue: boolean[] = [];
	let iSectorsPerContinent = iRows * iCols;

	let iPlayersWestContinent = iNumPlayersLandmass1;
	let iPlayersEastContinent = iNumPlayersLandmass2;

	// Ensure humans don't overflow one side
	let iMaxNumMajors: number = 0;
	iMaxNumMajors = iPlayersWestContinent + iPlayersEastContinent;
	let aliveMajorIds = Players.getAliveMajorIds();
	let humanPlayers: number[] = [];
	for (let iMajorIndex: number = 0; iMajorIndex < iMaxNumMajors; iMajorIndex++) {
		if (iMajorIndex < aliveMajorIds.length && Players.isHuman(aliveMajorIds[iMajorIndex])) {
			humanPlayers.push(iMajorIndex);
		}
	}
	let numHumans = humanPlayers.length;
	let maxSide = Math.max(iPlayersWestContinent, iPlayersEastContinent);
	if (numHumans > maxSide) {
		// Evenly divide the total number of players
		const half = Math.floor(iMaxNumMajors / 2);
		iPlayersWestContinent = half;
		iPlayersEastContinent = iMaxNumMajors - half;

		iNumPlayersLandmass1 = iPlayersWestContinent;
		iNumPlayersLandmass2 = iPlayersEastContinent;
	}

	if (iNumPlayersLandmass1 == 1 && iNumPlayersLandmass2 == 3) {
		var validConfigs1: number[][] = [[0], [1], [2], [3], [4], [5]];
		var validConfigs2: number[][] = [[0, 3, 4], [1, 2, 5]];
	}
	else if (iNumPlayersLandmass1 == 3 && iNumPlayersLandmass2 == 1) {
		var validConfigs1: number[][] = [[0, 3, 4], [1, 2, 5]];
		var validConfigs2: number[][] = [[0], [1], [2], [3], [4], [5]];
	}
	else if (iNumPlayersLandmass1 == 4 && iNumPlayersLandmass2 == 0) {
		var validConfigs1: number[][] = [[0, 2, 3, 5]];
		var validConfigs2: number[][] = [[]];
	}
	else if (iNumPlayersLandmass1 == 4 && iNumPlayersLandmass2 == 2) {
		var validConfigs1: number[][] = [[0, 2, 6, 8], [1, 3, 5, 7]];
		var validConfigs2: number[][] = [[0, 8], [2, 6]];
	}
	else if (iNumPlayersLandmass1 == 2 && iNumPlayersLandmass2 == 4) {
		var validConfigs1: number[][] = [[0, 8], [2, 6]];
		var validConfigs2: number[][] = [[0, 2, 6, 8], [1, 3, 5, 7]];
	}
	else if (iNumPlayersLandmass1 == 6 && iNumPlayersLandmass2 == 0) {
		var validConfigs1: number[][] = [[0, 2, 3, 5, 6, 8]];
		var validConfigs2: number[][] = [[]];
	}
	else if (iNumPlayersLandmass1 == 5 && iNumPlayersLandmass2 == 3) {
		var validConfigs1: number[][] = [[0, 2, 6, 8, 10], [1, 3, 5, 9, 11]];
		var validConfigs2: number[][] = [[3, 5, 7], [4, 6, 8]];
	}
	else if (iNumPlayersLandmass1 == 3 && iNumPlayersLandmass2 == 5) {
		var validConfigs1: number[][] = [[3, 5, 7], [4, 6, 8]];
		var validConfigs2: number[][] = [[0, 2, 6, 8, 10], [1, 3, 5, 9, 11]];
	}
	else if (iNumPlayersLandmass1 == 6 && iNumPlayersLandmass2 == 4) {
		var validConfigs1: number[][] = [[0, 2, 4, 6, 8, 10], [1, 3, 5, 7, 9, 11]];
		var validConfigs2: number[][] = [[1, 3, 5, 7], [4, 6, 8, 10]];
	}
	else if (iNumPlayersLandmass1 == 4 && iNumPlayersLandmass2 == 6) {
		var validConfigs1: number[][] = [[1, 3, 5, 7], [4, 6, 8, 10]];
		var validConfigs2: number[][] = [[0, 2, 4, 6, 8, 10], [1, 3, 5, 7, 9, 11]];
	}
	else if (iNumPlayersLandmass1 == 2 && iNumPlayersLandmass2 == 2) {
		var validConfigs1: number[][] = [[0, 5], [1, 4]];
		var validConfigs2: number[][] = [[0, 5], [1, 4]];
	}
	else if (iNumPlayersLandmass1 == 3 && iNumPlayersLandmass2 == 3) {
		var validConfigs1: number[][] = [[0, 2, 7], [1, 6, 8]];
		var validConfigs2: number[][] = [[0, 2, 7], [1, 6, 8]];
	}
	else if (iNumPlayersLandmass1 == 4 && iNumPlayersLandmass2 == 4) {
		var validConfigs1: number[][] = [[0, 2, 6, 8], [3, 5, 9, 11]];
		var validConfigs2: number[][] = [[0, 2, 6, 8], [3, 5, 9, 11]];
	}
	else if (iNumPlayersLandmass1 == 5 && iNumPlayersLandmass2 == 5) {
		var validConfigs1: number[][] = [[0, 2, 6, 8, 10], [1, 3, 5, 9, 11]];
		var validConfigs2: number[][] = [[0, 2, 6, 8, 10], [1, 3, 5, 9, 11]];
	}
	else if (iNumPlayersLandmass1 == 6 && iNumPlayersLandmass2 == 6) {
		var validConfigs1: number[][] = [[0, 2, 4, 6, 8, 10], [1, 3, 5, 7, 9, 11]];
		var validConfigs2: number[][] = [[0, 2, 4, 6, 8, 10], [1, 3, 5, 7, 9, 11]];
	}
	else if (iNumPlayersLandmass1 == 8 && iNumPlayersLandmass2 == 0) {
		var validConfigs1: number[][] = [[0, 2, 3, 5, 6, 8, 9, 11]];
		var validConfigs2: number[][] = [[]];
	}
	else if (iNumPlayersLandmass1 == 5 && iNumPlayersLandmass2 == 0) {
		var validConfigs1: number[][] = [[0, 2, 3, 5, 6]];
		var validConfigs2: number[][] = [[]];
	}
	else {
		console.log("THIS SHOULD NOT BE HIT IN STARTING POSITION")
		var validConfigs1: number[][] = [[0], [1], [2], [3], [4], [5]];
		var validConfigs2: number[][] = [[0, 2, 4], [1, 3, 5]];
	}

	let iWestContinentConfig = validConfigs1.length - 1;  // Default to final config (those all have an equatorial start)
	if (!bHumanNearEquator) iWestContinentConfig = TerrainBuilder.getRandomNumber(validConfigs1.length, "West Continent Start Positions");

	for (let i: number = 0; i < iSectorsPerContinent; i++) {
		let bFoundIt: boolean = false;
		for (let j: number = 0; j < iPlayersWestContinent; j++) {
			if (i == validConfigs1[iWestContinentConfig][j]) {
				bFoundIt = true;
				break;
			}
		}
		returnValue[i] = bFoundIt;
	}

	let iEastContinentConfig = validConfigs2.length - 1;  // Default to final config (those all have an equatorial start)
	if (!bHumanNearEquator) iEastContinentConfig = TerrainBuilder.getRandomNumber(validConfigs2.length, "East Continent Start Positions");

	for (let i: number = 0; i < iSectorsPerContinent; i++) {
		let bFoundIt: boolean = false;
		for (let j: number = 0; j < iPlayersEastContinent; j++) {
			if (i == validConfigs2[iEastContinentConfig][j]) {
				bFoundIt = true;
				break;
			}
		}
		returnValue[i + iSectorsPerContinent] = bFoundIt;
	}

	return returnValue;
}

// Assign Start Positions to the Major Players
// The input 'east' and 'west' counts are the maximum majors for each hemisphere and those
// two values combined are the maximum number of majors that can be placed.  
// This total should be greater than or equal to the total number of alive majors at the start of the game.
//
// The return is an array of starting plots.  DO NOT ASSUME THAT THE INDEX of the Starting Position is the Player ID!  It is NOT!
// If more information is required from the starting position return array, make it into an array of objects with some context.
export function assignStartPositions(iNumWest: number, iNumEast: number, west: ContinentBoundary, east: ContinentBoundary, iStartSectorRows: number, iStartSectorCols: number, sectors: boolean[]) {
	console.log("Assigning Starting Positions");

	let startPositions: number[] = [];  // Plot indices for start positions chosen

	console.log("iStartSectorRows: " + iStartSectorRows);
	console.log("iStartSectorCols: " + iStartSectorCols);

	console.log("iNumWest: " + iNumWest);
	console.log("iNumEast: " + iNumEast);
	let iMaxNumMajors: number = 0;
	iMaxNumMajors = iNumWest + iNumEast;
	console.log("iMaxNumMajors: " + iMaxNumMajors);

	let bEastBias: boolean = false;
	if (iNumEast > iNumWest) {
		console.log("EastSide");
		bEastBias = true;
	}

	// The index values we will be dealing with in this function, correspond to the index
	// in the Alive Majors array.
	let aliveMajorIds = Players.getAliveMajorIds();
	if (iMaxNumMajors < aliveMajorIds.length) {
		console.log("The input total is less than the total alive majors: " + aliveMajorIds.length);
	}

	let humanPlayers: number[] = [];
	for (let iMajorIndex: number = 0; iMajorIndex < iMaxNumMajors; iMajorIndex++) {
		if (iMajorIndex < aliveMajorIds.length && Players.isHuman(aliveMajorIds[iMajorIndex])) {
			humanPlayers.push(iMajorIndex);
		}
	}

	// Less players shuffled in Antiquity games (always want final/AI players on other hemisphere).
	// If there's more human players than spaces on a single continent then divide the players evenly.
	let iNumberHomelands: number = 0;
	let bHumansLargestLandmass: boolean = GameInfo.Ages.lookup(Game.age)!.HumanPlayersPrimaryHemisphere;
	if (bEastBias && iNumEast < humanPlayers.length) {
		bHumansLargestLandmass = false;
	}
	else if (!bEastBias && iNumWest < humanPlayers.length) {
		bHumansLargestLandmass = false;
	}
	if (bHumansLargestLandmass) {
		if (bEastBias) {
			iNumberHomelands = iNumEast;
		}
		else {
			iNumberHomelands = iNumWest;
		}
	}
	else {
		iNumberHomelands = (iNumWest + iNumEast) / 2;  // Should set up data so num east and west are identical on these maps
	}

	let homelandStartRegions: ContinentBoundary[] = [];
	let distantStartRegions: ContinentBoundary[] = [];

	//===========================================================================
	// Setting to determine which start position algorithm to use
	//     Is TRUE if using the Civ VII sector-based approach
	//	   Is FALSE if using the Civ VI method (areas of equal fertility)
	let bAssignStartPositionsBySector: boolean = true;
	if (iStartSectorRows == 0 || iStartSectorCols == 0) {
		bAssignStartPositionsBySector = false;
	}
	else {
		bAssignStartPositionsBySector = checkStartSectorsViable(west, east, iStartSectorRows, iStartSectorCols, sectors);
	}

	//
	// NEW CIV VII METHOD
	//
	if (bAssignStartPositionsBySector) {
		console.log("Using Sector-based Assignments");

		for (let iSector: number = 0; iSector < sectors.length; iSector++) {

			// Is this one of the start sectors?
			if (sectors[iSector] == true) {
				let region = getSectorRegion(iSector, iStartSectorRows, iStartSectorCols, east.south, east.north, west.west, west.east, east.west);

				// Store into the proper start region list
				let bEastHemis: boolean = iSector >= sectors.length / 2;
				let szHeading: string;
				if (bEastHemis == bEastBias) {
					homelandStartRegions.push(region);
					szHeading = "HOMELAND START REGION:";
				}
				else {
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
	}

	//
	// LEGACY CIV VI METHOD
	//
	else {
		console.log("Using Areas of Equal Fertility");

		let iMinMajorFertility: number = 25;
		let iMinMinorFertility: number = 5;

		// Start on hemisphere with most Civs
		{
			const iLeftCol: number = bEastBias ? east.west : west.west;
			const iRightCol: number = bEastBias ? east.east : west.east;
			const uiPlotTagFilter: number = bEastBias ? PlotTags.PLOT_TAG_EAST_LANDMASS : PlotTags.PLOT_TAG_WEST_LANDMASS;

			StartPositioner.initializeValues();
			StartPositioner.divideMapIntoMajorRegions(iNumberHomelands, iMinMajorFertility, iMinMinorFertility, iLeftCol, iRightCol, uiPlotTagFilter);
			console.log("Divided map into major regions for Homelands");
			for (let iRegion: number = 0; iRegion < iNumberHomelands; iRegion++) {
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
			// Switch halves of the map
			const iLeftCol: number = bEastBias ? west.west : east.west;
			const iRightCol: number = bEastBias ? west.east : east.east;
			const uiPlotTagFilter: number = bEastBias ? PlotTags.PLOT_TAG_WEST_LANDMASS : PlotTags.PLOT_TAG_EAST_LANDMASS;

			StartPositioner.initializeValues();
			StartPositioner.divideMapIntoMajorRegions((iMaxNumMajors - iNumberHomelands), iMinMajorFertility, iMinMinorFertility, iLeftCol, iRightCol, uiPlotTagFilter);
			console.log("Divided map into major regions for Distant Lands");

			for (let iRegion: number = 0; iRegion < iMaxNumMajors - iNumberHomelands; iRegion++) {
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

	let homelandPlayers: number[] = [];
	let distantPlayers: number[] = [];

	// Humans on one half of map: find human players and put them in Homelands
	if (bHumansLargestLandmass) {
		for (let iMajorIndex: number = 0; iMajorIndex < iMaxNumMajors; iMajorIndex++) {
			if (iMajorIndex < aliveMajorIds.length && Players.isHuman(aliveMajorIds[iMajorIndex])) {
				homelandPlayers.push(iMajorIndex);
			}
		}

		// Fill up the remainder of these player arrays
		for (let iMajorIndex: number = 0; iMajorIndex < iMaxNumMajors; iMajorIndex++) {
			if (iMajorIndex < aliveMajorIds.length && Players.isAI(aliveMajorIds[iMajorIndex])) {
				if (homelandPlayers.length < iNumberHomelands) {
					homelandPlayers.push(iMajorIndex);
				}
				else {
					distantPlayers.push(iMajorIndex);
				}
			}
		}

		// Shuffle both arrays
		shuffle(homelandPlayers);
		shuffle(distantPlayers);
	}
	// Any player could be in either list. Shuffle a temp list and then assign
	else {
		let tempPlayers: number[] = [];
		for (let iMajorIndex: number = 0; iMajorIndex < iMaxNumMajors; iMajorIndex++) {
			if (iMajorIndex < aliveMajorIds.length) {
				console.log("Found real major at: " + aliveMajorIds[iMajorIndex]);
				tempPlayers.push(iMajorIndex);
			}
		}
		shuffle(tempPlayers);
		for (let i: number = 0; i < tempPlayers.length; i++) {
			if (homelandPlayers.length < iNumberHomelands) {
				homelandPlayers.push(tempPlayers[i]);
			}
			else {
				distantPlayers.push(tempPlayers[i]);
			}
		}
	}

	console.log("homelandPlayers: " + homelandPlayers.length);
	console.log("homelandStartRegions: " + homelandStartRegions.length);
	console.log("distantPlayers: " + distantPlayers.length);
	console.log("distantStartRegions: " + distantStartRegions.length);

	// Slide players around based on Start Biases
	console.log("Update homelandPlayers:");
	updateRegionsForStartBias(homelandPlayers, homelandStartRegions);
	console.log("Update distantPlayers:");
	updateRegionsForStartBias(distantPlayers, distantStartRegions);

	// Pick exact plots in the regions and assign them
	for (let i: number = 0; i < homelandPlayers.length; i++) {
		let iStartPosition: number = homelandPlayers[i];
		// Get the absolute playerId
		let playerId = aliveMajorIds[iStartPosition];
		let plotIndex = pickStartPlot(homelandStartRegions[i], i, playerId, false /*bIgnoreBias*/, startPositions);
		if (plotIndex >= 0) {
			startPositions[iStartPosition] = plotIndex;
			let location = GameplayMap.getLocationFromIndex(plotIndex);
			console.log("CHOICE FOR PLAYER: " + playerId + " (" + location.x + ", " + location.y + ")");
			StartPositioner.setStartPosition(plotIndex, playerId);
		}
		else {
			console.log("FAILED TO PICK LOCATION FOR: " + playerId);
		}
	}
	for (let i: number = 0; i < distantPlayers.length; i++) {
		let iStartPosition: number = distantPlayers[i];
		// Get the absolute playerId
		let playerId = aliveMajorIds[iStartPosition];
		let plotIndex = pickStartPlot(distantStartRegions[i], i + homelandPlayers.length, playerId, false /*bIgnoreBias*/, startPositions);
		if (plotIndex >= 0) {
			startPositions[iStartPosition] = plotIndex;
			let location = GameplayMap.getLocationFromIndex(plotIndex);
			console.log("CHOICE FOR PLAYER: " + playerId + " (" + location.x + ", " + location.y + ")");
			StartPositioner.setStartPosition(plotIndex, playerId);
		}
		else {
			console.log("FAILED TO PICK LOCATION FOR: " + playerId);
		}
	}

	return startPositions;
}

export function assignStartPositionsFromTiles(iNumWest: number, iNumEast: number, west: PlayerRegionTile[], east: PlayerRegionTile[]) {
	console.log("Assigning Starting Positions");

	let startPositions: number[] = [];  // Plot indices for start positions chosen

	console.log("iNumWest: " + iNumWest);
	console.log("iNumEast: " + iNumEast);
	let iMaxNumMajors: number = 0;
	iMaxNumMajors = iNumWest + iNumEast;
	console.log("iMaxNumMajors: " + iMaxNumMajors);

	let bEastBias: boolean = false;
	if (iNumEast > iNumWest || (iNumEast == iNumWest && east.length > west.length)) {
		console.log("EastSide");
		bEastBias = true;
	}

	// The index values we will be dealing with in this function, correspond to the index
	// in the Alive Majors array.
	let aliveMajorIds = Players.getAliveMajorIds();
	if (iMaxNumMajors != aliveMajorIds.length) {
		console.log("The input player total " + iMaxNumMajors + " is not equal to the alive majors: " + aliveMajorIds.length);
	}

	let humanPlayers: number[] = [];
	for (let iMajorIndex: number = 0; iMajorIndex < iMaxNumMajors; iMajorIndex++) {
		if (iMajorIndex < aliveMajorIds.length && Players.isHuman(aliveMajorIds[iMajorIndex])) {
			humanPlayers.push(iMajorIndex);
		}
	}

	// Less players shuffled in Antiquity games (always want final/AI players on other hemisphere).
	// If there's more human players than spaces on a single continent then divide the players evenly.
	let iNumberHomelands: number = 0;
	let bHumansLargestLandmass: boolean = GameInfo.Ages.lookup(Game.age)!.HumanPlayersPrimaryHemisphere;
	if (bEastBias && iNumEast < humanPlayers.length) {
		bHumansLargestLandmass = false;
	}
	else if (!bEastBias && iNumWest < humanPlayers.length) {
		bHumansLargestLandmass = false;
	}
	if (bHumansLargestLandmass) {
		if (bEastBias) {
			iNumberHomelands = iNumEast;
		}
		else {
			iNumberHomelands = iNumWest;
		}
	}
	else {
		iNumberHomelands = (iNumWest + iNumEast) / 2;  // Should set up data so num east and west are identical on these maps
	}

	let homelandPlayers: number[] = [];
	let distantPlayers: number[] = [];

	// Humans on one half of map: find human players and put them in Homelands
	if (bHumansLargestLandmass) {
		for (let iMajorIndex: number = 0; iMajorIndex < iMaxNumMajors; iMajorIndex++) {
			if (iMajorIndex < aliveMajorIds.length && Players.isHuman(aliveMajorIds[iMajorIndex])) {
				homelandPlayers.push(iMajorIndex);
			}
		}

		// Fill up the remainder of these player arrays
		for (let iMajorIndex: number = 0; iMajorIndex < iMaxNumMajors; iMajorIndex++) {
			if (iMajorIndex < aliveMajorIds.length && Players.isAI(aliveMajorIds[iMajorIndex])) {
				if (homelandPlayers.length < iNumberHomelands) {
					homelandPlayers.push(iMajorIndex);
				}
				else {
					distantPlayers.push(iMajorIndex);
				}
			}
		}

		// Shuffle both arrays
		shuffle(homelandPlayers);
		shuffle(distantPlayers);
	}
	// Any player could be in either list. Shuffle a temp list and then assign
	else {
		let tempPlayers: number[] = [];
		for (let iMajorIndex: number = 0; iMajorIndex < iMaxNumMajors; iMajorIndex++) {
			if (iMajorIndex < aliveMajorIds.length) {
				console.log("Found real major at: " + aliveMajorIds[iMajorIndex]);
				tempPlayers.push(iMajorIndex);
			}
		}
		shuffle(tempPlayers);
		for (let i: number = 0; i < tempPlayers.length; i++) {
			if (homelandPlayers.length < iNumberHomelands) {
				homelandPlayers.push(tempPlayers[i]);
			}
			else {
				distantPlayers.push(tempPlayers[i]);
			}
		}
	}

	let homelandTiles = bEastBias ? east : west;
	let distantTiles = bEastBias ? west : east;

	// Pick exact plots in the regions and assign them
	for (let i: number = 0; i < homelandPlayers.length; i++) {
		let iStartPosition: number = homelandPlayers[i];
		// Get the absolute playerId
		let playerId = aliveMajorIds[iStartPosition];
		const playerTiles: PlayerRegionTile[] = homelandTiles.filter(tile => tile.playerId === playerId);
		console.log("Searching " + playerTiles.length + " tiles on the " + (bEastBias ? "east" : "west") + " landmass for a start position for player " + playerId + (Players.isHuman(playerId) ? " (human)" : " (ai)"));
		let plotIndex = pickStartPlotByTile(playerTiles, -1, i, playerId, false /*bIgnoreBias*/, startPositions);
		if (plotIndex >= 0) {
			startPositions[iStartPosition] = plotIndex;
			let location = GameplayMap.getLocationFromIndex(plotIndex);
			console.log("CHOICE FOR PLAYER: " + playerId + " (" + location.x + ", " + location.y + ")");
			StartPositioner.setStartPosition(plotIndex, playerId);
		}
		else {
			console.log("FAILED TO PICK LOCATION FOR: " + playerId);
		}
	}
	for (let i: number = 0; i < distantPlayers.length; i++) {
		let iStartPosition: number = distantPlayers[i];
		// Get the absolute playerId
		let playerId = aliveMajorIds[iStartPosition];
		const playerTiles: PlayerRegionTile[] = distantTiles.filter(tile => tile.playerId === playerId);
		console.log("Searching " + playerTiles.length + " tiles on the " + (bEastBias ? "west" : "east") + " landmass for a start position for player " + playerId + (Players.isHuman(playerId) ? " (human)" : " (ai)"));
		let plotIndex = pickStartPlotByTile(playerTiles, -1, i, playerId, false /*bIgnoreBias*/, startPositions);
		if (plotIndex >= 0) {
			startPositions[iStartPosition] = plotIndex;
			let location = GameplayMap.getLocationFromIndex(plotIndex);
			console.log("CHOICE FOR PLAYER: " + playerId + " (" + location.x + ", " + location.y + ")");
			StartPositioner.setStartPosition(plotIndex, playerId);
		}
		else {
			console.log("FAILED TO PICK LOCATION FOR: " + playerId);
		}
	}
	return startPositions;

}

export function assignSingleContinentStartPositions(iNumPlayers: number, primaryLandmass: ContinentBoundary,
	iStartSectorRows: number, iStartSectorCols: number, sectors: boolean[], uiPlotTagFilter: number = 0xFFFFFFFF) {

	console.log("Assigning Starting Positions");

	let startPositions: number[] = [];  // Plot indices for start positions chosen

	console.log("iStartSectorRows: " + iStartSectorRows);
	console.log("iStartSectorCols: " + iStartSectorCols);

	let iMaxNumMajors: number = 0;
	iMaxNumMajors = iNumPlayers;
	console.log("iMaxNumMajors: " + iMaxNumMajors);

	let aliveMajorIds = Players.getAliveMajorIds();

	if (iMaxNumMajors < aliveMajorIds.length) {
		console.log("The input total is less than the total alive majors: " + aliveMajorIds.length);
	}

	let homelandPlayers: number[] = [];
	let homelandStartRegions: ContinentBoundary[] = [];
	//===========================================================================
	// Setting to determine which start position algorithm to use
	//     Is TRUE if using the Civ VII sector-based approach
	//	   Is FALSE if using the Civ VI method (areas of equal fertility)
	let bAssignStartPositionsBySector: boolean = true;
	if (iStartSectorRows == 0 || iStartSectorCols == 0) {
		bAssignStartPositionsBySector = false;
	}
	else {
		bAssignStartPositionsBySector = checkStartSectorsViable(primaryLandmass, primaryLandmass, iStartSectorRows, iStartSectorCols, sectors);
	}

	if (bAssignStartPositionsBySector) {
		console.log("Using Sector-based Assignments");

		for (let iSector: number = 0; iSector < sectors.length; iSector++) {

			// Is this one of the start sectors?
			if (sectors[iSector] == true) {
				let region = getSectorRegion(iSector, iStartSectorRows, iStartSectorCols, primaryLandmass.south, primaryLandmass.north, primaryLandmass.west, primaryLandmass.east, primaryLandmass.west);

				// Store into the proper start region list
				let szHeading: string;

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
	}
	else {
		console.log("Assigning Starting Positions Across a Single Continent with Equal Fertility");


		// Divide the continent into major regions based on fertility
		let iMinMajorFertility = 25;
		let iMinMinorFertility = 5;

		StartPositioner.initializeValues();
		StartPositioner.divideMapIntoMajorRegions(iNumPlayers, iMinMajorFertility, iMinMinorFertility, primaryLandmass.west, primaryLandmass.east, uiPlotTagFilter);

		// Ensure players are spread across the largest and most fertile areas
		let potentialRegions: ContinentBoundary[] = [];
		for (let i = 0; i < iNumPlayers; i++) {
			let region = StartPositioner.getMajorStartRegion(i);
			if (region && region.east > primaryLandmass.west && region.west < primaryLandmass.east) {
				potentialRegions.push(region);
			}
		}

		// Sort by size to prioritize larger areas (reduces clustering)
		potentialRegions.sort((a, b) => ((b.east - b.west) * (b.north - b.south)) - ((a.east - a.west) * (a.north - a.south)));

		for (let region of potentialRegions) {
			if (homelandStartRegions.length < iNumPlayers) {
				homelandStartRegions.push(region);
			}
		}

		if (homelandStartRegions.length < iNumPlayers) {
			console.log("WARNING: Not enough fertile regions found within the selected continent.");
		}
	}

	for (let iMajorIndex: number = 0; iMajorIndex < iMaxNumMajors; iMajorIndex++) {
		if (iMajorIndex < aliveMajorIds.length) {
			homelandPlayers.push(iMajorIndex);
		}
	}

	shuffle(homelandPlayers);

	console.log("homelandPlayers: " + homelandPlayers.length);
	console.log("homelandStartRegions: " + homelandStartRegions.length);

	// Slide players around based on Start Biases
	console.log("Update homelandPlayers:");
	updateRegionsForStartBias(homelandPlayers, homelandStartRegions);

	for (let i = 0; i < homelandPlayers.length; i++) {
		let iStartPosition: number = homelandPlayers[i];
		let playerId = aliveMajorIds[iStartPosition];

		let plotIndex = pickStartPlot(homelandStartRegions[i], i, playerId, false, startPositions);

		if (plotIndex >= 0) {
			startPositions[iStartPosition] = plotIndex;
			let location = GameplayMap.getLocationFromIndex(plotIndex);
			console.log("CHOICE FOR PLAYER: " + playerId + " (" + location.x + ", " + location.y + ")");
			StartPositioner.setStartPosition(plotIndex, playerId);
		} else {
			console.log("FAILED TO PICK LOCATION FOR: " + playerId + " - Retrying with alternative regions.");
			for (let retryRegion of homelandStartRegions) {
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

function checkStartSectorsViable(west: ContinentBoundary, east: ContinentBoundary, iStartSectorRows: number, iStartSectorCols: number, sectors: boolean[]): boolean {

	let tempStartPositions: number[] = [];  // Plot indices for start positions chosen

	for (let iSector: number = 0; iSector < sectors.length; iSector++) {

		// Is this one of the start sectors?
		if (sectors[iSector] == true) {
			let region = getSectorRegion(iSector, iStartSectorRows, iStartSectorCols, east.south, east.north, west.west, west.east, east.west);

			// Call pickStartPlot() to make sure there is at least one viable start position in sector
			let startPlot: number = pickStartPlot(region, 0, 0, true /*bIgnoreBias*/, tempStartPositions);
			if (startPlot == -1) {
				console.log("LOW FERTILITY START SECTOR: " + iSector);
				console.log("West: " + region.west);
				console.log("East: " + region.east);
				console.log("North: " + region.north);
				console.log("South: " + region.south);
				console.log("ABORTING - Falling back to Civ VI start position assignment algorithm")
				return false;
			}
		}
	}
	return true;
}

// The input array is an array of Major Indices that form a group that will be put into the
// input region.
function updateRegionsForStartBias(majorGroup: number[], startRegions: ContinentBoundary[]) {

	let biomeBiases = new Array(majorGroup.length);
	for (let i = 0; i < majorGroup.length; i++) {
		biomeBiases[i] = [];
	}
	let navRiverBias: number[] = [];
	let NWBias: number[] = [];
	// Initialize
	for (let iMajorGroup: number = 0; iMajorGroup < majorGroup.length; iMajorGroup++) {
		for (let iBiome = 0; iBiome < GameInfo.Biomes.length; iBiome++) {
			biomeBiases[iMajorGroup][iBiome] = 0;
		}
		navRiverBias[iMajorGroup] = 0;
		NWBias[iMajorGroup] = 0;
	}

	let aliveMajorIds = Players.getAliveMajorIds();

	// For each major in the group
	for (let iMajorGroup: number = 0; iMajorGroup < majorGroup.length; iMajorGroup++) {

		// Get the absolute player
		let playerId = aliveMajorIds[majorGroup[iMajorGroup]];
		let player = Players.get(playerId);
		if (player == null) {
			continue;
		}

		// 	Find their total bias (Leader + Civ) for each Biome and for Navigable Rivers
		let uiCivType: CivilizationType = player.civilizationType;
		let uiLeaderType: LeaderType = player.leaderType;
		console.log("Player Id:" + playerId + ", " + player.civilizationName + ", " + player.leaderName);

		for (let startBiomeIdx: number = 0; startBiomeIdx < GameInfo.StartBiasBiomes.length; startBiomeIdx++) {
			let startBiomeDef = GameInfo.StartBiasBiomes[startBiomeIdx];
			if (startBiomeDef) {
				let civString = startBiomeDef.CivilizationType;
				let ldrString = startBiomeDef.LeaderType;
				let civHash = 0;
				let ldrHash = 0;
				if (civString != null) {
					let civObj = GameInfo.Civilizations.lookup(civString);
					if (civObj) {
						civHash = civObj.$hash;
					}
				}
				if (ldrString != null) {
					let ldrObj = GameInfo.Leaders.lookup(ldrString);
					if (ldrObj) {
						ldrHash = ldrObj.$hash;
					}
				}
				if ((civHash == uiCivType) || (ldrHash == uiLeaderType)) {
					let biomeDef = GameInfo.Biomes.lookup(startBiomeDef.BiomeType);
					if (biomeDef) {
						let biomeIndex = biomeDef.$index;
						console.log("biomeIndex: " + biomeIndex + ", Score: " + startBiomeDef.Score);
						biomeBiases[iMajorGroup][biomeIndex] += startBiomeDef.Score;
					}
				}
			}
		}

		for (let startRiverIdx: number = 0; startRiverIdx < GameInfo.StartBiasTerrains.length; startRiverIdx++) {
			let startBiasTerrainDef = GameInfo.StartBiasTerrains[startRiverIdx];
			if (startBiasTerrainDef) {
				if (startBiasTerrainDef.TerrainType == "TERRAIN_NAVIGABLE_RIVER") {
					let civString = startBiasTerrainDef.CivilizationType;
					let ldrString = startBiasTerrainDef.LeaderType;
					let civHash = 0;
					let ldrHash = 0;
					if (civString != null) {
						let civObj = GameInfo.Civilizations.lookup(civString);
						if (civObj) {
							civHash = civObj.$hash;
						}
					}
					if (ldrString != null) {
						let ldrObj = GameInfo.Leaders.lookup(ldrString);
						if (ldrObj) {
							ldrHash = ldrObj.$hash;
						}
					}
					if ((civHash == uiCivType) || (ldrHash == uiLeaderType)) {
						navRiverBias[iMajorGroup] += startBiasTerrainDef.Score;
					}
				}
			}
		}

		for (let startNWIdx: number = 0; startNWIdx < GameInfo.StartBiasNaturalWonders.length; startNWIdx++) {
			let startBiasNWDef = GameInfo.StartBiasNaturalWonders[startNWIdx];
			if (startBiasNWDef) {
				let civString = startBiasNWDef.CivilizationType;
				let ldrString = startBiasNWDef.LeaderType;
				let civHash = 0;
				let ldrHash = 0;
				if (civString != null) {
					let civObj = GameInfo.Civilizations.lookup(civString);
					if (civObj) {
						civHash = civObj.$hash;
					}
				}
				if (ldrString != null) {
					let ldrObj = GameInfo.Leaders.lookup(ldrString);
					if (ldrObj) {
						ldrHash = ldrObj.$hash;
					}
				}
				if ((civHash == uiCivType) || (ldrHash == uiLeaderType)) {
					NWBias[iMajorGroup] += startBiasNWDef.Score;
				}
			}
		}
	}


	console.log("biomeBiases " + biomeBiases);
	console.log("navRiverBias " + navRiverBias);
	console.log("NWBias " + NWBias);

	// For each Start Sector in that hemisphere, count:
	let biomeCounts = new Array(startRegions.length);
	for (let i = 0; i < startRegions.length; i++) {
		biomeCounts[i] = [];
	}
	let navRiverCounts: number[] = [];
	let NWCounts: number[] = [];
	for (let iRegion: number = 0; iRegion < startRegions.length; iRegion++) {
		for (let iBiome = 0; iBiome < GameInfo.Biomes.length; iBiome++) {
			biomeCounts[iRegion][iBiome] = 0;
		}
		navRiverCounts[iRegion] = 0;
		NWCounts[iRegion] = 0;
	}

	for (let iRegion: number = 0; iRegion < startRegions.length; iRegion++) {
		let region: ContinentBoundary = startRegions[iRegion];
		for (let iX = region.west; iX <= region.east; iX++) {
			for (let iY = region.south; iY <= region.north; iY++) {

				// 	Number of tiles of each Biome
				let biomeType = GameplayMap.getBiomeType(iX, iY);
				biomeCounts[iRegion][biomeType]++;

				// 	Number of Navigable River tiles
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

	// Sort players by grand total of biases (add all Biome biases to Nav River bias)
	let totalMajorBiases: number[] = [];
	let sortedMajorIndices: number[] = [];
	for (let iMajorGroup: number = 0; iMajorGroup < majorGroup.length; iMajorGroup++) {
		totalMajorBiases[iMajorGroup] = 0;
		sortedMajorIndices[iMajorGroup] = iMajorGroup;
	}
	for (let iMajorGroup: number = 0; iMajorGroup < majorGroup.length; iMajorGroup++) {
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

	// Copy over and clear output list of major indices
	console.log("majorGroup (original):" + majorGroup);
	let originalMajorGroup: number[] = [];
	for (let iMajorGroup: number = 0; iMajorGroup < majorGroup.length; iMajorGroup++) {
		originalMajorGroup[iMajorGroup] = majorGroup[iMajorGroup];
		majorGroup[iMajorGroup] = -1;
	}

	// Assign final start sector in sorted order from highest grand total to lowest
	for (let iMajorGroup: number = 0; iMajorGroup < majorGroup.length; iMajorGroup++) {
		let iMajorToPlace = sortedMajorIndices[iMajorGroup];

		// 	Find best score for this player's biases
		let iBestScore = -1;
		let iBestRegion = -1;
		for (let iRegion: number = 0; iRegion < startRegions.length; iRegion++) {

			// Make sure this region has not been used already
			if (majorGroup[iRegion] == -1) {
				let regionScoreForMajor = 0;
				for (let iBiome = 0; iBiome < GameInfo.Biomes.length; iBiome++) {
					regionScoreForMajor += biomeBiases[iMajorToPlace][iBiome] * biomeCounts[iRegion][iBiome];
				}
				regionScoreForMajor += navRiverBias[iMajorToPlace] * navRiverCounts[iRegion];
				regionScoreForMajor += NWBias[iMajorToPlace] * NWCounts[iRegion];
				console.log("majorIndex: " + iMajorToPlace + ", original ID: " + originalMajorGroup[iMajorToPlace] + ", regionScore: " + regionScoreForMajor);

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

// The playerId is the absolute playerId
function pickStartPlotByTile(tiles: { x: number, y: number }[], continentId: number, numFoundEarlier: number, playerId: number, ignoreBias: boolean, startPositions: number[]) {
	let chosenPlotIndex: number = -1;
	let highestScore: number = 0;
	for (const tile of tiles) {
		let score: number = scorePlot(tile.x, tile.y, continentId);
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

// The playerId is the absolute playerId
function pickStartPlot(region: ContinentBoundary, numFoundEarlier: number, playerId: number, ignoreBias: boolean, startPositions: number[]): number {

	let tiles: { x: number, y: number }[] = [];
	for (let iY: number = region.south; iY <= region.north; iY++) {
		for (let iX: number = region.west; iX <= region.east; iX++) {
			tiles.push({ x: iX, y: iY });
		}
	}
	return pickStartPlotByTile(tiles, region.continent, numFoundEarlier, playerId, ignoreBias, startPositions);
}

function scorePlot(iX: number, iY: number, iContinent: number): number {

	let score: number = -1;

	if (!GameplayMap.isWater(iX, iY) && !GameplayMap.isMountain(iX, iY)) {
		if (iContinent == -1 || GameplayMap.getContinentType(iX, iY) == iContinent) {
			score = StartPositioner.getStartPositionScore(iX, iY);
		}
	}

	//console.log("scoring tile {X:" + iX + ", y:" + iY + "}. Score = " + score + ". isWater? " + GameplayMap.isWater(iX, iY) + ", isMountain? " + GameplayMap.isMountain(iX, iY) + ", iContinent = " + iContinent + ", continent type = " + GameplayMap.getContinentType(iX, iY));
	return score;
}

function adjustScoreByClosestStart(originalScore: number, iX: number, iY: number, startPositions: number[]): number {

	let score: number = originalScore;

	// Divide by zero check
	if (globals.g_DesiredBufferBetweenMajorStarts <= globals.g_RequiredBufferBetweenMajorStarts) return score;

	let distance: number = getDistanceToClosestStart(iX, iY, startPositions);
	if (distance < globals.g_RequiredBufferBetweenMajorStarts) {
		score = 0;
	}
	else if (distance < globals.g_DesiredBufferBetweenMajorStarts) {
		score = score * (distance - globals.g_RequiredBufferBetweenMajorStarts + 1) / (globals.g_DesiredBufferBetweenMajorStarts - globals.g_RequiredBufferBetweenMajorStarts + 1);
	}
	return score;
}

function getDistanceToClosestStart(iX: number, iY: number, startPositions: number[]): number {

	let minDistance: number = 32768;

	for (let iStart = 0; iStart < startPositions.length; iStart++) {
		let startPlotIndex = startPositions[iStart];

		// Make sure this player's position has been set
		if (startPlotIndex) {
			let iStartX = startPlotIndex % GameplayMap.getGridWidth();
			let iStartY = startPlotIndex / GameplayMap.getGridWidth();
			let distance: number = GameplayMap.getPlotDistance(iX, iY, iStartX, iStartY);
			if (distance < minDistance) {
				minDistance = distance;
			}
		}
	}

	return minDistance;
}

// The input playerId is the absolute ID of the player
function adjustScoreByStartBias(iX: number, iY: number, playerId: number): number {

	let score: number = 0;

	let player = Players.get(playerId);
	if (player == null || player.isAlive == false) {
		return score;
	}

	let eCivType: CivilizationType = player.civilizationType;
	let eLeaderType: LeaderType = player.leaderType;

	for (let biomeIdx: number = 0; biomeIdx < GameInfo.StartBiasBiomes.length; biomeIdx++) {
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

	for (let terrainIdx: number = 0; terrainIdx < GameInfo.StartBiasTerrains.length; terrainIdx++) {
		const startBiasCivilization = GameInfo.StartBiasTerrains[terrainIdx]?.CivilizationType;
		const startBiasLeader = GameInfo.StartBiasTerrains[terrainIdx]?.LeaderType;
		const startBiasTerrain = GameInfo.StartBiasTerrains[terrainIdx]?.TerrainType;

		if (startBiasTerrain) {
			if (startBiasCivilization) {
				const startBiasCivilizationTypeIndex = GameInfo.Civilizations.lookup(startBiasCivilization)?.$index;
				const civInfoTypeIndex = GameInfo.Civilizations.lookup(eCivType)?.$index;

				if (startBiasCivilizationTypeIndex == civInfoTypeIndex) {
					score += getTerrainStartBiasScore(startBiasTerrain, GameInfo.StartBiasTerrains[terrainIdx].Score, iX, iY);
				}
			}
			if (startBiasLeader) {
				const startBiasLeaderTypeIndex = GameInfo.Leaders.lookup(startBiasLeader)?.$index;
				const leaderInfoTypeIndex = GameInfo.Leaders.lookup(eLeaderType)?.$index;

				if (startBiasLeaderTypeIndex == leaderInfoTypeIndex) {
					score += getTerrainStartBiasScore(startBiasTerrain, GameInfo.StartBiasTerrains[terrainIdx].Score, iX, iY);
				}
			}
		}
	}

	for (let riverIdx: number = 0; riverIdx < GameInfo.StartBiasRivers.length; riverIdx++) {
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

	for (let coastIdx: number = 0; coastIdx < GameInfo.StartBiasAdjacentToCoasts.length; coastIdx++) {
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

	for (let featureIdx: number = 0; featureIdx < GameInfo.StartBiasFeatureClasses.length; featureIdx++) {
		const startBiasCivilization = GameInfo.StartBiasFeatureClasses[featureIdx]?.CivilizationType;
		const startBiasLeader = GameInfo.StartBiasFeatureClasses[featureIdx]?.LeaderType;
		const startBiasFeature = GameInfo.StartBiasFeatureClasses[featureIdx]?.FeatureClassType;

		if (startBiasFeature) {
			if (startBiasCivilization) {
				const startBiasCivilizationTypeIndex = GameInfo.Civilizations.lookup(startBiasCivilization)?.$index;
				const civInfoTypeIndex = GameInfo.Civilizations.lookup(eCivType)?.$index;

				if (startBiasCivilizationTypeIndex == civInfoTypeIndex) {
					score += getFeatureClassStartBiasScore(startBiasFeature, GameInfo.StartBiasFeatureClasses[featureIdx].Score, iX, iY);
				}
			}
			if (startBiasLeader) {
				const startBiasLeaderTypeIndex = GameInfo.Leaders.lookup(startBiasLeader)?.$index;
				const leaderInfoTypeIndex = GameInfo.Leaders.lookup(eLeaderType)?.$index;

				if (startBiasLeaderTypeIndex == leaderInfoTypeIndex) {
					score += getFeatureClassStartBiasScore(startBiasFeature, GameInfo.StartBiasFeatureClasses[featureIdx].Score, iX, iY);
				}
			}
		}
	}

	for (let resourceIdx: number = 0; resourceIdx < GameInfo.StartBiasResources.length; resourceIdx++) {
		const startBiasCivilization = GameInfo.StartBiasResources[resourceIdx]?.CivilizationType;
		const startBiasLeader = GameInfo.StartBiasResources[resourceIdx]?.LeaderType;
		const startBiasResource = GameInfo.StartBiasResources[resourceIdx]?.ResourceType;

		if (startBiasResource) {
			if (startBiasCivilization) {
				const startBiasCivilizationTypeIndex = GameInfo.Civilizations.lookup(startBiasCivilization)?.$index;
				const civInfoTypeIndex = GameInfo.Civilizations.lookup(eCivType)?.$index;

				if (startBiasCivilizationTypeIndex == civInfoTypeIndex) {
					score += getResourceStartBiasScore(startBiasResource, GameInfo.StartBiasResources[resourceIdx].Score, iX, iY);
				}
			}
			if (startBiasLeader) {
				const startBiasLeaderTypeIndex = GameInfo.Leaders.lookup(startBiasLeader)?.$index;
				const leaderInfoTypeIndex = GameInfo.Leaders.lookup(eLeaderType)?.$index;

				if (startBiasLeaderTypeIndex == leaderInfoTypeIndex) {
					score += getResourceStartBiasScore(startBiasResource, GameInfo.StartBiasResources[resourceIdx].Score, iX, iY);
				}
			}
		}
	}

	for (let lakeIdx: number = 0; lakeIdx < GameInfo.StartBiasLakes.length; lakeIdx++) {
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

	for (let nwIdx: number = 0; nwIdx < GameInfo.StartBiasNaturalWonders.length; nwIdx++) {
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

function getBiomeStartBiasScore(biome: string, score: number, iX: number, iY: number): number {
	const startBiasBiomeTypeIndex = GameInfo.Biomes.lookup(biome)?.$index;

	let plots: number[] = GameplayMap.getPlotIndicesInRadius(iX, iY, 3);
	let outputScore: number = 0;

	for (let plot: number = 0; plot < plots.length; plot++) {
		let iLocation: PlotCoord = GameplayMap.getLocationFromIndex(plots[plot]);
		const biomeInfoTypeIndex = GameInfo.Biomes.lookup(GameplayMap.getBiomeType(iLocation.x, iLocation.y))?.$index;

		if (startBiasBiomeTypeIndex == biomeInfoTypeIndex) {
			let distance: number = GameplayMap.getPlotDistance(iX, iY, iLocation.x, iLocation.y);

			if (distance < 1) {
				distance = 1;
			}

			outputScore += score / distance;
		}
	}

	return outputScore;
}


function getTerrainStartBiasScore(terrain: string, score: number, iX: number, iY: number): number {
	const startBiasTerrainTypeIndex = GameInfo.Terrains.lookup(terrain)?.$index;

	let plots: number[] = GameplayMap.getPlotIndicesInRadius(iX, iY, 3);
	let outputScore: number = 0;

	for (let plot: number = 0; plot < plots.length; plot++) {
		let iLocation: PlotCoord = GameplayMap.getLocationFromIndex(plots[plot]);
		const terrainInfoTypeIndex = GameInfo.Terrains.lookup(GameplayMap.getTerrainType(iLocation.x, iLocation.y))?.$index;

		if (startBiasTerrainTypeIndex == terrainInfoTypeIndex) {
			let distance: number = GameplayMap.getPlotDistance(iX, iY, iLocation.x, iLocation.y);

			if (distance < 1) {
				distance = 1;
			}

			outputScore += score / distance;
		}
	}

	return outputScore;
}

function getRiverStartBiasScore(score: number, iX: number, iY: number): number {
	let plots: number[] = GameplayMap.getPlotIndicesInRadius(iX, iY, 3);
	let outputScore: number = 0;

	for (let plot: number = 0; plot < plots.length; plot++) {
		let iLocation: PlotCoord = GameplayMap.getLocationFromIndex(plots[plot]);

		if (GameplayMap.isRiver(iLocation.x, iLocation.y)) {
			let distance: number = GameplayMap.getPlotDistance(iX, iY, iLocation.x, iLocation.y);

			if (distance < 1) {
				distance = 1;
			}

			outputScore += score / distance;
		}
	}

	return outputScore;
}

function getCoastStartBiasScore(score: number, iX: number, iY: number): number {

	let outputScore: number = 0;

	if (isOceanAccess(iX, iY)) {
		outputScore += score;
	}

	return outputScore;
}

function getFeatureClassStartBiasScore(feature: string, score: number, iX: number, iY: number): number {
	const startBiasFeatureTypeIndex = GameInfo.FeatureClasses.lookup(feature)?.$index;

	let plots: number[] = GameplayMap.getPlotIndicesInRadius(iX, iY, 3);
	let outputScore: number = 0;

	for (let plot: number = 0; plot < plots.length; plot++) {
		let iLocation: PlotCoord = GameplayMap.getLocationFromIndex(plots[plot]);
		const featureInfoTypeIndex = GameInfo.Features.lookup(GameplayMap.getFeatureType(iLocation.x, iLocation.y))?.FeatureClassType

		if (featureInfoTypeIndex) {
			const featureClassInfoTypeIndex = GameInfo.FeatureClasses.lookup(featureInfoTypeIndex)?.$index

			if (featureClassInfoTypeIndex == startBiasFeatureTypeIndex) {
				let distance: number = GameplayMap.getPlotDistance(iX, iY, iLocation.x, iLocation.y);

				if (distance < 1) {
					distance = 1;
				}

				outputScore += score / distance;
			}
		}

	}

	return outputScore;
}

function getResourceStartBiasScore(resource: string, score: number, iX: number, iY: number): number {
	const startBiasResourceTypeIndex = GameInfo.Resources.lookup(resource)?.$index;

	let plots: number[] = GameplayMap.getPlotIndicesInRadius(iX, iY, 3);
	let outputScore: number = 0;

	for (let plot: number = 0; plot < plots.length; plot++) {
		let iLocation: PlotCoord = GameplayMap.getLocationFromIndex(plots[plot]);
		const resourceInfoTypeIndex = GameInfo.Resources.lookup(GameplayMap.getResourceType(iLocation.x, iLocation.y))?.$index;

		if (startBiasResourceTypeIndex == resourceInfoTypeIndex) {
			outputScore += score;
		}
	}

	return outputScore;
}

function getLakeStartBiasScore(score: number, iX: number, iY: number): number {
	let plots: number[] = GameplayMap.getPlotIndicesInRadius(iX, iY, 3);
	let outputScore: number = 0;

	for (let plot: number = 0; plot < plots.length; plot++) {
		let iLocation: PlotCoord = GameplayMap.getLocationFromIndex(plots[plot]);

		if (GameplayMap.isLake(iLocation.x, iLocation.y)) {
			outputScore += score;
		}
	}

	if (outputScore > 0) {
		console.log("Start Bias Score: " + outputScore)
	}

	return outputScore;
}

function getNaturalWonderStartBiasScore(score: number, iX: number, iY: number): number {
	let plots: number[] = GameplayMap.getPlotIndicesInRadius(iX, iY, 3);
	let outputScore: number = 0;

	for (let plot: number = 0; plot < plots.length; plot++) {
		let iLocation: PlotCoord = GameplayMap.getLocationFromIndex(plots[plot]);

		if (GameplayMap.isNaturalWonder(iLocation.x, iLocation.y)) {
			outputScore += score;
		}
	}

	if (outputScore > 0) {
		console.log("Start Bias Score: " + outputScore)
	}

	return outputScore;
}