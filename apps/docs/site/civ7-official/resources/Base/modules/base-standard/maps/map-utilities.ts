import * as globals from '/base-standard/maps/map-globals.js';

export const EAST_LAND_MASS_ID = 0;
export const WEST_LAND_MASS_ID = 1;
export const AVAILABLE_ON_ALL_LANDMASSES_ID = 2;

export function needHumanNearEquator() {

	let uiMapSize = GameplayMap.getMapSize();
	let mapInfo = GameInfo.Maps.lookup(uiMapSize);
	let iPlayerCount = 0;
	if (mapInfo) iPlayerCount = mapInfo.PlayersLandmass1 + mapInfo.PlayersLandmass2;

	for (let iPlay: number = 0; iPlay < iPlayerCount; iPlay++) {

		if (Players.getEverAlive()[iPlay] && Players.getEverAlive()[iPlay].isHuman) {

			// 	Find their total bias (Leader + Civ) for each Biome and for Navigable Rivers
			let uiCivType: CivilizationType = Players.getEverAlive()[iPlay].civilizationType;
			let uiLeaderType: LeaderType = Players.getEverAlive()[iPlay].leaderType;

			for (let startBiomeIdx: number = 0; startBiomeIdx < GameInfo.StartBiasBiomes.length; startBiomeIdx++) {
				let civString = GameInfo.StartBiasBiomes[startBiomeIdx]?.CivilizationType;
				let ldrString = GameInfo.StartBiasBiomes[startBiomeIdx]?.LeaderType;
				let civHash = 0;
				let ldrHash = 0;
				if (civString != null && GameInfo.Civilizations.lookup(civString) != null) {
					let civObj = GameInfo.Civilizations.lookup(civString);
					if (civObj) {
						civHash = civObj.$hash;
					}
				}
				if (ldrString != null && GameInfo.Leaders.lookup(ldrString) != null) {
					let ldrObj = GameInfo.Leaders.lookup(ldrString);
					if (ldrObj) {
						ldrHash = ldrObj.$hash;
					}
				}
				if ((civHash == uiCivType) || (ldrHash == uiLeaderType)) {
					let szBiome: string = GameInfo.StartBiasBiomes[startBiomeIdx].BiomeType;
					console.log(szBiome);
					if (szBiome == "BIOME_TROPICAL") {
						console.log("Human player needing a Tropical start.");
						return true;
					}
				}
			}
		}
	}

	return false;
}

export function getMinimumResourcePlacementModifier() {
	let mapSizeInfo = GameInfo.Maps.lookup(GameplayMap.getMapSize());
	if (mapSizeInfo == null) return;
	let iMapMinimumModifer = 0;
	const mapType = Configuration.getMapValue("Name");
	for (const option of GameInfo.MapResourceMinimumAmountModifier) {
		if (option.MapType === mapType && option.MapSizeType == mapSizeInfo.MapSizeType) {
			iMapMinimumModifer = option.Amount;
			break;
		}
	}

	//If we didn't find a matching map type, use the default per map size
	if (iMapMinimumModifer == 0)
	{
		for (const option of GameInfo.MapResourceMinimumAmountModifier) {
			if (option.MapType === "DEFAULT" && option.MapSizeType == mapSizeInfo.MapSizeType) {
				iMapMinimumModifer = option.Amount;
				console.log("Using default map size for resuource placemtn, please update the table for this map type. Modifer is " + iMapMinimumModifer + " by default.");
				break;
			}
		}
	}

	return iMapMinimumModifer;
}

export function getDistanceFromContinentCenter(iX: number, iY: number, iContinentBottomRow: number, iContinentTopRow: number, iWestContinentLeftCol: number, iWestContinentRightCol: number, iEastContinentLeftCol: number, iEastContinentRightCol: number): number {
	let iContinentLeftEdge: number = iWestContinentLeftCol;
	let iContinentRightEdge: number = iWestContinentRightCol;
	if (iX >= iEastContinentLeftCol) {
		iContinentLeftEdge = iEastContinentLeftCol;
		iContinentRightEdge = iEastContinentRightCol;
	}

	let iContinentHeight: number = iContinentTopRow - iContinentBottomRow;
	let iContinentWidth: number = iContinentRightEdge - iContinentLeftEdge;
	let iContinentCenterX: number = iContinentLeftEdge + (iContinentWidth / 2);
	let iContinentCenterY: number = iContinentBottomRow + (iContinentHeight / 2);

	let iDistance: number = GameplayMap.getPlotDistance(iX, iY, iContinentCenterX, iContinentCenterY);
	return iDistance;
}

export function getMaxDistanceFromContinentCenter(iX: number, iContinentBottomRow: number, iContinentTopRow: number, iWestContinentLeftCol: number, iWestContinentRightCol: number, iEastContinentLeftCol: number, iEastContinentRightCol: number): number {
	let iContinentLeftEdge: number = iWestContinentLeftCol;
	let iContinentRightEdge: number = iWestContinentRightCol;
	if (iX >= iEastContinentLeftCol) {
		iContinentLeftEdge = iEastContinentLeftCol;
		iContinentRightEdge = iEastContinentRightCol;
	}

	let iContinentHeight: number = iContinentTopRow - iContinentBottomRow;
	let iContinentWidth: number = iContinentRightEdge - iContinentLeftEdge;
	let iContinentCenterX: number = iContinentLeftEdge + (iContinentWidth / 2);
	let iContinentCenterY: number = iContinentBottomRow + (iContinentHeight / 2);

	let iDistance: number = GameplayMap.getPlotDistance(iContinentLeftEdge, iContinentBottomRow, iContinentCenterX, iContinentCenterY);
	return iDistance;
}

export function getSector(iX: number, iY: number, iRows: number, iCols: number, iContinentBottomRow: number, iContinentTopRow: number, iWestContinentLeftCol: number, iWestContinentRightCol: number, iEastContinentLeftCol: number): number {

	let iContinentBase: number = 0;
	if (iX >= iEastContinentLeftCol) {
		iContinentBase += (iRows * iCols);
		iX = iX - iEastContinentLeftCol + iWestContinentLeftCol;
	}

	let iXSector: number = Math.floor((iX - iWestContinentLeftCol) / ((iWestContinentRightCol - iWestContinentLeftCol) / iCols));
	let iYSector: number = Math.floor((iY - iContinentBottomRow) / ((iContinentTopRow - iContinentBottomRow) / iRows));
	let iSector: number = (iYSector * iCols) + iXSector;
	let iReturnValue: number = iContinentBase + iSector;

	return iReturnValue;
}

export function getSectorRegion(iSector: number, iRows: number, iCols: number, iContinentBottomRow: number, iContinentTopRow: number, iWestContinentLeftCol: number, iWestContinentRightCol: number, iEastContinentLeftCol: number): ContinentBoundary {

	let region: ContinentBoundary = { west: 0, east: 0, south: 0, north: 0, continent: 0 };

	if (iCols == 0) return region; // Safety check 

	let bIsEastContinent: boolean = (iSector >= (iRows * iCols));
	let iSectorAdjust = 0;
	if (bIsEastContinent) {
		iSectorAdjust = iRows * iCols;
	}
	let row: number = Math.floor((iSector - iSectorAdjust) / iCols);
	let col: number = Math.floor((iSector - iSectorAdjust) - (row * iCols));
	let iSectorWidth = (iWestContinentRightCol - iWestContinentLeftCol) / iCols;
	let iSectorHeight = (iContinentTopRow - iContinentBottomRow) / iRows;

	let iXAdjust = iWestContinentLeftCol;
	if (bIsEastContinent) {
		iXAdjust = iEastContinentLeftCol;
	}
	region.west = Math.floor(iXAdjust + (iSectorWidth * col));
	region.east = Math.floor(iXAdjust + (iSectorWidth * (col + 1)));
	region.south = Math.floor(iContinentBottomRow + (iSectorHeight * row));
	region.north = Math.floor(iContinentBottomRow + (iSectorHeight * (row + 1)));
	region.continent = -1;  // ignore continent check

	return region;
}

export function getHeightAdjustingForStartSector(iX: number, iY: number, iWaterHeight: number, iFractalWeight: number, iCenterWeight: number, iStartSectorWeight: number, continent1: ContinentBoundary, continent2: ContinentBoundary,
	iStartSectorRows: number, iStartSectorCols: number, startSectors: boolean[]): number {

	// Get the value from the fractal
	let iPlotHeight: number = FractalBuilder.getHeight(globals.g_LandmassFractal, iX, iY);
	iPlotHeight *= iFractalWeight;

	// Adjust based on distance from center of the continent
	let iDistanceFromCenter: number = getDistanceFromContinentCenter(iX, iY, continent1.south, continent1.north, continent1.west, continent1.east, continent2.west, continent2.east);
	let iMaxDistanceFromCenter: number = getMaxDistanceFromContinentCenter(iX, continent1.south, continent1.north, continent1.west, continent1.east, continent2.west, continent2.east);
	let iPercentFromCenter: number = Math.min(100 * iDistanceFromCenter / iMaxDistanceFromCenter, 100);
	iPlotHeight += iCenterWeight * Math.pow((iWaterHeight * (100 - iPercentFromCenter) / 100), globals.g_CenterExponent);

	// Adjust based on whether or not the plot is near a start location (unless very far from center)
	if (iPercentFromCenter < globals.g_IgnoreStartSectorPctFromCtr) {
		let iSector: number = getSector(iX, iY, iStartSectorRows, iStartSectorCols, continent1.south, continent1.north, continent1.west, continent1.east, continent2.west);
		if (startSectors[iSector]) {
			// Start sector, increase chance we include it
			let sectorCenterX = (continent1.west + continent1.east) / 2;
			let sectorCenterY = (continent1.south + continent1.north) / 2;
			let distanceToSectorCenter = Math.sqrt((iX - sectorCenterX) ** 2 + (iY - sectorCenterY) ** 2);
			let maxSectorRadius = Math.min(continent1.east - continent1.west, continent1.north - continent1.south) / 3;

			let sectorBoostFactor = 1 - Math.pow(Math.min(distanceToSectorCenter / maxSectorRadius, 1), 1.5);
			iPlotHeight += (iStartSectorWeight * iWaterHeight * sectorBoostFactor);

			// Start sector and less than 2/3rds of full distance from center, add that amount again
			if (iPercentFromCenter < (globals.g_IgnoreStartSectorPctFromCtr * 2 / 3)) {
				iPlotHeight += iStartSectorWeight * iWaterHeight;
			}
		}

		// Interior sector that isn't a start sector? Give it the center bias
		if (iStartSectorCols > 2 && iStartSectorRows > 2) {
			let iTestSector = iSector;
			if (iTestSector >= iStartSectorRows * iStartSectorCols) {
				iTestSector = iSector - (iStartSectorRows * iStartSectorCols);
			}
			if ((iTestSector % iStartSectorCols) > 0 && (iTestSector % iStartSectorCols) < (iStartSectorCols - 1)) {
				if (iTestSector >= iStartSectorCols && iTestSector < (iStartSectorRows * iStartSectorCols - iStartSectorCols)) {
					iPlotHeight += iCenterWeight * iWaterHeight;
				}
			}
		}
	}

	return iPlotHeight;
}

export function createIslands(iWidth: number, iHeight: number, continent1: ContinentBoundary, continent2: ContinentBoundary, iSize: number) {

	FractalBuilder.create(globals.g_LandmassFractal, iWidth, iHeight, iSize, 0);
	let iwater_percent = 50 /*Special Water Percent for Archipelago */ + iSize * 7;
	let iWaterHeight: number = FractalBuilder.getHeightFromPercent(globals.g_LandmassFractal, iwater_percent);
	let iBuffer: number = Math.floor(iWidth / 24.0);
	let terrain: TerrainType = globals.g_FlatTerrain;

	for (let iY: number = 0; iY < iHeight; iY++) {
		for (let iX: number = 0; iX < iWidth; iX++) {
			let iRandom: number = TerrainBuilder.getRandomNumber(iBuffer, "Random Top/Bottom Edges");
			if (iY >= continent1.south + iRandom &&
				iY <= continent1.north - iRandom &&
				(iX >= continent1.west && iX <= continent1.east ||
					iX >= continent2.west && iX <= continent2.east)) {
				let iPlotHeight: number = FractalBuilder.getHeight(globals.g_LandmassFractal, iX, iY);
				if (iPlotHeight > iWaterHeight) {
					TerrainBuilder.setTerrainType(iX, iY, terrain);
					TerrainBuilder.setPlotTag(iX, iY, PlotTags.PLOT_TAG_NONE);
					TerrainBuilder.addPlotTag(iX, iY, PlotTags.PLOT_TAG_ISLAND);
				}
			}
		}
	}
}

export function applyCoastalErosion(continent: ContinentBoundary, strength: number, falloff: number, minRadiusFactor: number, verticalOnly: boolean) {
	console.log(`Applying Coastal Erosion with strength ${strength} to continent at (${continent.west}, ${continent.east})`);

	let centerX = (continent.west + continent.east) / 2;
	let centerY = (continent.south + continent.north) / 2;
	let maxRadiusY = (continent.north - continent.south) / 2;
	let maxRadius = verticalOnly ? maxRadiusY : Math.min(continent.east - continent.west, continent.north - continent.south) / 2;
	let minRadius = maxRadius * minRadiusFactor;

	let erosionTiles: { x: number, y: number }[] = [];

	for (let iY = continent.south; iY <= continent.north; iY++) {
		for (let iX = continent.west; iX <= continent.east; iX++) {

			let terrain = GameplayMap.getTerrainType(iX, iY);
			if (terrain == globals.g_OceanTerrain) continue;

			let distance = 0;
			if (verticalOnly) {
				distance = Math.abs(iY - ((continent.south + continent.north) / 2))
			}
			else {
				distance = Math.sqrt((iX - centerX) ** 2 + (iY - centerY) ** 2);
			}

			if (distance <= minRadius) continue;

			let erosionFactor = (distance > minRadius) ? ((distance - minRadius) / (maxRadius - minRadius)) ** falloff : 0;
			let erosionThreshold = (distance > minRadius) ? strength * erosionFactor : 0;
			let randomChance = TerrainBuilder.getRandomNumber(100, "Coastal Erosion") / 100.0;

			if (randomChance < erosionThreshold) {
				erosionTiles.push({ x: iX, y: iY });
			}
		}
	}



	// Expand erosion from selected tiles for more natural clusters
	let expandedErosion = new Set<string>();

	function addErosionTile(x: number, y: number) {
		let key = `${x},${y}`;
		if (!expandedErosion.has(key)) {
			expandedErosion.add(key);
			TerrainBuilder.setTerrainType(x, y, globals.g_OceanTerrain);
			TerrainBuilder.setPlotTag(x, y, PlotTags.PLOT_TAG_WATER);
		}
	}

	for (let tile of erosionTiles) {
		addErosionTile(tile.x, tile.y);

		let expansionChance = TerrainBuilder.getRandomNumber(100, "Erosion Expansion") / 100.0;
		if (expansionChance < .70) {
			let neighbors = [
				{ x: tile.x + 1, y: tile.y },
				{ x: tile.x - 1, y: tile.y },
				{ x: tile.x, y: tile.y + 1 },
				{ x: tile.x, y: tile.y - 1 }
			];
			for (let neighbor of neighbors) {
				if (GameplayMap.getTerrainType(neighbor.x, neighbor.y) !== globals.g_OceanTerrain) {
					addErosionTile(neighbor.x, neighbor.y);
				}
			}
		}
	}

	console.log("Coastal Erosion Applied.");
}

export function applyCoastalErosionAdjustingForStartSectors(continent1: ContinentBoundary, continent2: ContinentBoundary, strength: number, falloff: number, minRadiusFactor: number, iStartSectorRows: number, iStartSectorCols: number, startSectors: boolean[]) {
	console.log(`Applying Coastal Erosion Ajdusting for Start Sectors with strength ${strength} to continent at (${continent1.west}, ${continent1.east})`);

	let centerX = (continent1.west + continent1.east) / 2;
	let centerY = (continent1.south + continent1.north) / 2;
	let maxRadius = Math.min(continent1.east - continent1.west, continent1.north - continent1.south) / 2;
	let minRadius = maxRadius * minRadiusFactor;

	let erosionTiles: { x: number, y: number }[] = [];

	for (let iY = continent1.south; iY <= continent1.north; iY++) {
		for (let iX = continent1.west; iX <= continent1.east; iX++) {

			let terrain = GameplayMap.getTerrainType(iX, iY);
			if (terrain == globals.g_OceanTerrain) continue;

			let distance = 0;
			distance = Math.sqrt((iX - centerX) ** 2 + (iY - centerY) ** 2);

			if (distance <= minRadius) continue;

			let erosionFactor = (distance > minRadius) ? ((distance - minRadius) / (maxRadius - minRadius)) ** falloff : 0;
			let erosionThreshold = (distance > minRadius) ? strength * erosionFactor : 0;
			let randomChance = TerrainBuilder.getRandomNumber(100, "Coastal Erosion") / 100.0;

			let iSector: number = getSector(iX, iY, iStartSectorRows, iStartSectorCols, continent1.south, continent1.north, continent1.west, continent1.east, continent2.west);
			if (startSectors[iSector]) {
				// Start sector, decrease chance of erosion unless we are at boundry corners
				if (!isNearContinentCorner(iX, iY, continent1, .10)) {
					erosionThreshold = erosionThreshold / 10;
				}
			}
			if (randomChance < erosionThreshold) {
				erosionTiles.push({ x: iX, y: iY });
			}
		}
	}

	// Checks if a tile is near the corner of a continent's boundaries
	function isNearContinentCorner(iX: number, iY: number, continent: ContinentBoundary, bufferScale: number): boolean {
		let continentWidth = continent.east - continent.west;
		let continentHeight = continent.north - continent.south;

		let bufferX = Math.max(2, Math.min(Math.floor(continentWidth * bufferScale), 10));
		let bufferY = Math.max(2, Math.min(Math.floor(continentHeight * bufferScale), 10));

		let topLeft = { x: continent.west, y: continent.north };
		let topRight = { x: continent.east, y: continent.north };
		let bottomLeft = { x: continent.west, y: continent.south };
		let bottomRight = { x: continent.east, y: continent.south };

		function isNearCorner(cornerX: number, cornerY: number) {
			return Math.abs(iX - cornerX) <= bufferX && Math.abs(iY - cornerY) <= bufferY;
		}

		return (
			isNearCorner(topLeft.x, topLeft.y) ||
			isNearCorner(topRight.x, topRight.y) ||
			isNearCorner(bottomLeft.x, bottomLeft.y) ||
			isNearCorner(bottomRight.x, bottomRight.y)
		);
	}


	// Expand erosion from selected tiles for more natural clusters
	let expandedErosion = new Set<string>();

	function addErosionTile(x: number, y: number) {
		let key = `${x},${y}`;
		if (!expandedErosion.has(key)) {
			expandedErosion.add(key);
			TerrainBuilder.setTerrainType(x, y, globals.g_OceanTerrain);
			TerrainBuilder.setPlotTag(x, y, PlotTags.PLOT_TAG_WATER);
		}
	}

	for (let tile of erosionTiles) {
		addErosionTile(tile.x, tile.y);

		let expansionChance = TerrainBuilder.getRandomNumber(100, "Erosion Expansion") / 100.0;
		if (expansionChance < .70) {
			let neighbors = [
				{ x: tile.x + 1, y: tile.y },
				{ x: tile.x - 1, y: tile.y },
				{ x: tile.x, y: tile.y + 1 },
				{ x: tile.x, y: tile.y - 1 }
			];
			for (let neighbor of neighbors) {
				if (GameplayMap.getTerrainType(neighbor.x, neighbor.y) !== globals.g_OceanTerrain) {
					addErosionTile(neighbor.x, neighbor.y);
				}
			}
		}
	}

	console.log("Coastal Erosion Applied.");
}

export function shuffle(array: number[]) {
	var currentIndex = array.length, temporaryValue, randomIndex;

	// While there remain elements to shuffle...
	while (0 !== currentIndex) {

		// Pick a remaining element...
		randomIndex = TerrainBuilder.getRandomNumber(currentIndex, "Array Shuffle");
		currentIndex -= 1;

		// And swap it with the current element.
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}

	return array;
}

export function getContinentEdgeHeightBump(iX: number, iY: number): number {
	if (GameplayMap.findSecondContinent(iX, iY, 1)) {
		return 100;
	}
	else if (GameplayMap.findSecondContinent(iX, iY, 2)) {
		return 40;
	}
	else if (GameplayMap.findSecondContinent(iX, iY, 3)) {
		return 20;
	}
	return 0;
}

export function getDistanceToClosestStart(iX: number, iY: number, numFoundEarlier: number, startPositions: number[]): number {

	let minDistance: number = 32768;

	for (let iStart = 0; iStart < numFoundEarlier; iStart++) {
		let startPlotIndex = startPositions[iStart];
		let iStartX = startPlotIndex % GameplayMap.getGridWidth();
		let iStartY = Math.floor(startPlotIndex / GameplayMap.getGridWidth());
		let distance: number = GameplayMap.getPlotDistance(iX, iY, iStartX, iStartY);
		if (distance < minDistance) {
			minDistance = distance;
		}
	}
	//console.log("Distance to Closest start: ", minDistance)
	return minDistance;
}

export function addLandmassPlotTags(iX: number, iY: number, iEastContinentLeftCol: number): void {
	TerrainBuilder.addPlotTag(iX, iY, PlotTags.PLOT_TAG_LANDMASS);
	if (iX >= iEastContinentLeftCol) {
		TerrainBuilder.addPlotTag(iX, iY, PlotTags.PLOT_TAG_EAST_LANDMASS);
	}
	else {
		TerrainBuilder.addPlotTag(iX, iY, PlotTags.PLOT_TAG_WEST_LANDMASS);
	}
}
export function addWaterPlotTags(iX: number, iY: number, iEastContinentLeftCol: number): void {
	TerrainBuilder.addPlotTag(iX, iY, PlotTags.PLOT_TAG_WATER);
	if (iX >= iEastContinentLeftCol - 1) {
		TerrainBuilder.addPlotTag(iX, iY, PlotTags.PLOT_TAG_EAST_WATER);
	}
	else {
		TerrainBuilder.addPlotTag(iX, iY, PlotTags.PLOT_TAG_WEST_WATER);
	}
}

export function adjustOceanPlotTags(bWestSide: boolean): void {
	let iWidth = GameplayMap.getGridWidth();
	let iHeight = GameplayMap.getGridHeight();
	for (let iY: number = 0; iY < iHeight; iY++) {
		for (let iX: number = 0; iX < iWidth; iX++) {
			let terrain: TerrainType = GameplayMap.getTerrainType(iX, iY);
			if (terrain == globals.g_OceanTerrain) {
				//console.log("ocean");
				TerrainBuilder.setPlotTag(iX, iY, PlotTags.PLOT_TAG_WATER);
				if (bWestSide) {
					//console.log("East");
					TerrainBuilder.addPlotTag(iX, iY, PlotTags.PLOT_TAG_EAST_WATER);
				}
				else {
					//console.log("West");
					TerrainBuilder.addPlotTag(iX, iY, PlotTags.PLOT_TAG_WEST_WATER);
				}
			}
		}
	}
}

export function adjustLakePlotTags(region: ContinentBoundary, bWestSide: boolean): void {
	for (let iY = region.south; iY <= region.north; iY++) {
		for (let iX = region.west; iX <= region.east; iX++) {
			let terrain: TerrainType = GameplayMap.getTerrainType(iX, iY);
			if (terrain == globals.g_CoastTerrain) {

				TerrainBuilder.setPlotTag(iX, iY, PlotTags.PLOT_TAG_WATER);
				TerrainBuilder.addPlotTag(iX, iY, bWestSide ? PlotTags.PLOT_TAG_WEST_WATER : PlotTags.PLOT_TAG_EAST_WATER);

			}
		}
	}
}


export function isAdjacentToNaturalWonder(iX: number, iY: number): boolean {
	for (let iDirection: DirectionTypes = 0; iDirection < DirectionTypes.NUM_DIRECTION_TYPES; iDirection++) {
		let iIndex: number = GameplayMap.getIndexFromXY(iX, iY);
		let iLocation: PlotCoord = GameplayMap.getLocationFromIndex(iIndex);
		let iAdjacentX: number = GameplayMap.getAdjacentPlotLocation(iLocation, iDirection).x;
		let iAdjacentY: number = GameplayMap.getAdjacentPlotLocation(iLocation, iDirection).y;
		if (GameplayMap.isNaturalWonder(iAdjacentX, iAdjacentY)) {
			return true;
		}
	}

	return false;
}
export function isCliff(iX: number, iY: number): boolean {
	for (let iDirection = 0; iDirection < DirectionTypes.NUM_DIRECTION_TYPES; iDirection++) {
		if (GameplayMap.isCliffCrossing(iX, iY, iDirection) == false) {
			return true;
		}
	}

	return false;
}

export function isOceanAccess(iX: number, iY: number): boolean {
	for (let iDirection = 0; iDirection < DirectionTypes.NUM_DIRECTION_TYPES; iDirection++) {
		let iIndex: number = GameplayMap.getIndexFromXY(iX, iY);
		let iLocation: PlotCoord = GameplayMap.getLocationFromIndex(iIndex);
		let iAdjacentX: number = GameplayMap.getAdjacentPlotLocation(iLocation, iDirection).x;
		let iAdjacentY: number = GameplayMap.getAdjacentPlotLocation(iLocation, iDirection).y;
		let iAdjacentIndex: number = GameplayMap.getIndexFromXY(iAdjacentX, iAdjacentY)
		if (GameplayMap.getRiverType(iAdjacentX, iAdjacentY) == RiverTypes.RIVER_NAVIGABLE && MapRivers.isRiverConnectedToOcean(iAdjacentIndex)) {
			//console.log("River connected to ocean");
			return true;
		}

		if (GameplayMap.getAreaId(iAdjacentX, iAdjacentY) > -1 && GameplayMap.getAreaIsWater(iAdjacentX, iAdjacentY) && AreaBuilder.isAreaConnectedToOcean(GameplayMap.getAreaId(iAdjacentX, iAdjacentY))) {
			//console.log("Area connected to ocean");
			return true;
		}
	}

	return false;
}

export function removeRuralDistrict(iX: number, iY: number) {
	let districtID = MapCities.getDistrict(iX, iY);
	if (districtID != null) {
		let cityID = MapCities.getCity(iX, iY);
		if (cityID != null) {
			const city: City | null = Cities.get(cityID);
			if (city != null) {
				// Don't remove the district if it is the CITY_CENTER district
				if (city.location.x != iX || city.location.y != iY) {
					console.log("Removed district at (" + iX + ", " + iY + ")");
					city.Districts?.removeDistrict(districtID);
				}
			}
		}
	}
}

export function placeRuralDistrict(iX: number, iY: number) {
	let cityID = MapCities.getCity(iX, iY);
	if (cityID != null) {
		const city: City | null = Cities.get(cityID);
		if (city != null) {
			if (city.location.x != iX || city.location.y != iY) {
				console.log("Placed district at (" + iX + ", " + iY + ")");
				city.Growth?.claimPlot({ x: iX, y: iY });
			}
		}
	}
}

export function replaceIslandResources(iWidth: number, iHeight: number, zResourceClassType: string) {

	//Get all treasure resources
	let resourceRunningWeight: number[] = new Array(GameInfo.Resources.length);
	let resourceWeight: number[] = new Array(GameInfo.Resources.length);
	let resources: number[] = [];
	for (var resourceIdx = 0; resourceIdx < GameInfo.Resources.length; resourceIdx++) {
		var resourceInfo = GameInfo.Resources.lookup(resourceIdx);
		if (resourceInfo && resourceInfo.Tradeable) {
			if (GameInfo.Resources.lookup(resourceIdx)?.ResourceClassType == zResourceClassType) {
				resources.push(resourceIdx);
			}
			resourceWeight[resourceInfo.$index] = resourceInfo.Weight;
		}
		resourceRunningWeight[resourceIdx] = 0;
	}

	for (let iY: number = iHeight - 1; iY >= 0; iY--) {
		for (let iX: number = 0; iX < iWidth; iX++) {
			if (GameplayMap.hasPlotTag(iX, iY, PlotTags.PLOT_TAG_ISLAND)) {
				const resourceAtLocation = GameplayMap.getResourceType(iX, iY);
				if (resourceAtLocation != ResourceTypes.NO_RESOURCE) {
					if (resources.length > 0) {
						let resourceChosen: ResourceType = ResourceTypes.NO_RESOURCE;
						let resourceChosenIndex: number = 0
						for (let iI = 0; iI < resources.length; iI++) {
							if (resources[iI] as ResourceType != resourceAtLocation) {
								if (ResourceBuilder.canHaveResource(iX, iY, resources[iI], true)) {
									if (resourceChosen == ResourceTypes.NO_RESOURCE) {
										resourceChosen = resources[iI];
										resourceChosenIndex = resources[iI];
									}
									else {
										if (resourceRunningWeight[resources[iI]] > resourceRunningWeight[resourceChosenIndex]) {
											resourceChosen = resources[iI];
											resourceChosenIndex = resources[iI];
										}
										else if (resourceRunningWeight[resources[iI]] == resourceRunningWeight[resourceChosenIndex]) {
											let iRoll = TerrainBuilder.getRandomNumber(2, "Resource Scatter");
											if (iRoll >= 1) {
												resourceChosen = resources[iI];
												resourceChosenIndex = resources[iI];
											}
										}
									}
								}
							}
						}

						//Place the selected resource
						if (resourceChosen != ResourceTypes.NO_RESOURCE) {
							let iResourcePlotIndex: number = GameplayMap.getIndexFromXY(iX, iY);
							if (iResourcePlotIndex != -1) {
								removeRuralDistrict(iX, iY);
								ResourceBuilder.setResourceType(iX, iY, ResourceTypes.NO_RESOURCE);
								ResourceBuilder.setResourceType(iX, iY, resourceChosen);
								placeRuralDistrict(iX, iY);
								resourceRunningWeight[resourceChosenIndex] -= resourceWeight[resourceChosenIndex];
								let oldName: any = GameInfo.Resources.lookup(resourceAtLocation)?.Name;
								let name: any = GameInfo.Resources.lookup(resourceChosenIndex)?.Name;
								console.log("Replaced " + Locale.compose(oldName) + " at (" + iX + ", " + iY + ")");
								console.log("Placed " + Locale.compose(name) + " at (" + iX + ", " + iY + ")");
							}
							else {
								console.log("Resource Index Failure");
							}
						}
						else {
							console.log("No valid resource replacement");
						}
					}
				}
			}
		}
	}

}


export function isAdjacentToLand(iX: number, iY: number): boolean {
	if (GameplayMap.hasPlotTag(iX, iY, PlotTags.PLOT_TAG_ISLAND)) {
		//console.log("Island " + " X: " + iX + " Y: " + iY);
		return true
	}
	else {
		for (let iDirection: DirectionTypes = 0; iDirection < DirectionTypes.NUM_DIRECTION_TYPES; iDirection++) {
			let iIndex: number = GameplayMap.getIndexFromXY(iX, iY);
			let iLocation: PlotCoord = GameplayMap.getLocationFromIndex(iIndex);
			let iAdjacentX: number = GameplayMap.getAdjacentPlotLocation(iLocation, iDirection).x;
			let iAdjacentY: number = GameplayMap.getAdjacentPlotLocation(iLocation, iDirection).y;
			if (GameplayMap.hasPlotTag(iAdjacentX, iAdjacentY, PlotTags.PLOT_TAG_ISLAND)) {
				//console.log("Island2 " + " X: " + iX + " Y: " + iY);
				return true;
			}
		}
	}

	return false;
}

//-------------------------------------------------------------------------------------------
//-- FUNCTIONS TO SHIFT LANDMASSES (i.e. to better center them)
//-------------------------------------------------------------------------------------------
export function shiftTerrain(iWidth: number, iHeight: number) {

	let shift_x = 0;
	let shift_y = 0;

	shift_x = determineXShift(iWidth, iHeight);
	shift_y = determineYShift(iWidth, iHeight);

	console.log("shift_x: " + shift_x);
	console.log("shift_y: ", shift_y);

	shiftPlotTypesBy(iWidth, iHeight, shift_x, shift_y);
}
// -------------------------------------------------------------------------------------------	
export function shiftPlotTypesBy(iWidth: number, iHeight: number, xshift: number, yshift: number) {

	if (xshift > 0 || yshift > 0) {

		// Copy all info into a temp array
		let iTempTerrainArray = Array(iWidth).fill(globals.g_OceanTerrain).map(_ => Array(iHeight));
		for (let iX: number = 0; iX < iWidth; iX++) {
			for (let iY: number = 0; iY < iHeight; iY++) {
				iTempTerrainArray[iX][iY] = GameplayMap.getTerrainType(iX, iY);
			}
		}

		// Set them with the shifts applied
		for (let iDestX: number = 0; iDestX < iWidth; iDestX++) {
			for (let iDestY: number = 0; iDestY < iHeight; iDestY++) {
				let iSourceX = (iDestX + xshift) % iWidth;
				let iSourceY = (iDestY + yshift) % iHeight;
				let iTerrain = iTempTerrainArray[iSourceX][iSourceY];
				TerrainBuilder.setTerrainType(iDestX, iDestY, iTerrain);
			}
		}
	}
}
// -------------------------------------------------------------------------------------------	
export function determineXShift(iWidth: number, iHeight: number) {

	/* This function will align the most water-heavy vertical portion of the map with the 
	vertical map edge. This is a form of centering the landmasses, but it emphasizes the
	edge not the middle. If there are columns completely empty of land, these will tend to
	be chosen as the new map edge, but it is possible for a narrow column between two large 
	continents to be passed over in favor of the thinnest section of a continent, because
	the operation looks at a group of columns not just a single column, then picks the 
	center of the most water heavy group of columns to be the new vertical map edge. */

	// First loop through the map columns and record land plots in each column.
	let waterTotals: number[] = [];
	for (let iX: number = 0; iX < iWidth; iX++) {
		let colWaterCount: number = 0;
		for (let iY: number = 0; iY < iHeight; iY++) {
			if (GameplayMap.getTerrainType(iX, iY) == globals.g_OceanTerrain) {
				colWaterCount = colWaterCount + 1;
			}
		}
		waterTotals.push(colWaterCount);
	}

	// Now evaluate column groups, each record applying to the center column of the group.
	let columnGroups: number[] = [];

	// Determine the group size in relation to map width.
	let groupRadius = Math.floor(iWidth / 10);

	// Measure the groups.
	for (let columnIndex = 0; columnIndex < iWidth; columnIndex++) {
		let currentGroupTotal = 0;
		for (let currentCol: number = columnIndex - groupRadius; currentCol <= columnIndex + groupRadius; currentCol++) {
			let currentIdx = (currentCol + iWidth) % iWidth;
			currentGroupTotal = currentGroupTotal + waterTotals[currentIdx];
		}
		columnGroups.push(currentGroupTotal);
	}

	// Identify the group with the most water in it.
	let bestValue = 0; // Set initial value to lowest possible.
	let bestGroup = 0; // Set initial best group as current map edge.

	for (let columnIndex = 0; columnIndex < iWidth; columnIndex++) {
		if (columnGroups[columnIndex] > bestValue) {
			bestValue = columnGroups[columnIndex];
			bestGroup = columnIndex;
		}
	}

	// Determine X Shift
	let x_shift = bestGroup;
	return x_shift;
}
// -------------------------------------------------------------------------------------------	
export function determineYShift(iWidth: number, iHeight: number) {

	// Counterpart to determineXShift()

	// First loop through the map rows and record water plots in each row
	let waterTotals: number[] = [];
	for (let iY: number = 0; iY < iHeight; iY++) {
		let rowWaterCount: number = 0;
		for (let iX: number = 0; iX < iWidth; iX++) {
			if (GameplayMap.getTerrainType(iX, iY) == globals.g_OceanTerrain) {
				rowWaterCount = rowWaterCount + 1;
			}
		}
		waterTotals.push(rowWaterCount);
	}

	// Now evaluate row groups, each record applying to the center row of the group.
	let rowGroups: number[] = [];

	// Determine the group size in relation to map height.
	let groupRadius = Math.floor(iHeight / 15);

	// Measure the groups.
	for (let rowIndex = 0; rowIndex < iHeight; rowIndex++) {
		let currentGroupTotal = 0;
		for (let currentRow: number = rowIndex - groupRadius; currentRow <= rowIndex + groupRadius; currentRow++) {
			let currentIdx = (currentRow + iHeight) % iHeight;
			currentGroupTotal = currentGroupTotal + waterTotals[currentIdx];
		}
		rowGroups.push(currentGroupTotal);
	}

	// Identify the group with the most water in it.
	let bestValue = 0; // Set initial value to lowest possible.
	let bestGroup = 0; // Set initial best group as current map edge.

	for (let rowIndex = 0; rowIndex < iHeight; rowIndex++) {
		if (rowGroups[rowIndex] > bestValue) {
			bestValue = rowGroups[rowIndex];
			bestGroup = rowIndex;
		}
	}

	// Determine X Shift
	let y_shift = bestGroup;
	return y_shift;
}

//-------------------------------------------------------------------------------------------
//-- FUNCTIONS TO SHIFT LANDMASSES (i.e. to better center them)
//-------------------------------------------------------------------------------------------
export function createOrganicLandmasses(iWidth: number, iHeight: number, continent1: ContinentBoundary, continent2: ContinentBoundary, iFractalGrain: number, iWaterPercent: number, iLargestContinentPercent: number) {

	let bLargeEnoughFound: boolean = false;

	while (!bLargeEnoughFound) {

		let iFlags: number = 0;
		iFlags = 1;   // FRAC_WRAP_X
		iFlags += 2;  // FRAC_WRAP_Y
		FractalBuilder.create(globals.g_LandmassFractal, iWidth, iHeight, iFractalGrain, iFlags);
		let iWaterHeight: number = FractalBuilder.getHeightFromPercent(globals.g_LandmassFractal, iWaterPercent);

		// Apply the fractal as is
		for (let iY: number = 0; iY < iHeight; iY++) {
			for (let iX: number = 0; iX < iWidth; iX++) {

				let terrain: TerrainType = globals.g_OceanTerrain;
				let iPlotHeight: number = FractalBuilder.getHeight(globals.g_LandmassFractal, iX, iY);
				if (iPlotHeight >= iWaterHeight) {
					terrain = globals.g_FlatTerrain;
				}
				TerrainBuilder.setTerrainType(iX, iY, terrain);
			}
		}

		// Shift it vertically and horizontally so the most water-filled rows & columns are where
		// we want them
		shiftTerrain(iWidth, iHeight);

		// Add the gutters at the top of the map and along the world wrap
		let iTilesChoppedInGutter = 0;
		for (let iY: number = 0; iY < iHeight; iY++) {
			for (let iX: number = 0; iX < iWidth; iX++) {

				if (GameplayMap.getTerrainType(iX, iY) != globals.g_OceanTerrain) {

					// Top and bottom
					if (iY < continent1.south || iY >= continent1.north) {
						TerrainBuilder.setTerrainType(iX, iY, globals.g_OceanTerrain);
					}
					// Random feathering
					else if (iY == continent1.south || iY == continent1.north - 1) {
						if (TerrainBuilder.getRandomNumber(2, "Feather hard edges") == 0) {
							TerrainBuilder.setTerrainType(iX, iY, globals.g_OceanTerrain);
						}
					}

					// Now gutter along world wrap
					if (iX < continent1.west || iX > (continent2.east - 1)) {
						TerrainBuilder.setTerrainType(iX, iY, globals.g_OceanTerrain);
					}

					// Random feathering
					else if (iX == continent1.west || iX == (continent2.east - 1)) {
						if (TerrainBuilder.getRandomNumber(2, "Feather hard edges") == 0) {
							TerrainBuilder.setTerrainType(iX, iY, globals.g_OceanTerrain);
						}
					}

					// Finally gutter between hemispheres
					if (iX > (continent1.east - 1) && iX < continent2.west) {
						iTilesChoppedInGutter = iTilesChoppedInGutter + 1;
						TerrainBuilder.setTerrainType(iX, iY, globals.g_OceanTerrain);
					}

					// Random feathering
					else if (iX == (continent1.east - 1) || iX == continent2.west) {
						if (TerrainBuilder.getRandomNumber(2, "Feather hard edges") == 0) {
							TerrainBuilder.setTerrainType(iX, iY, globals.g_OceanTerrain);
						}
					}
				}
			}
		}

		// Keep trying if we just had to chop a LOT of tiles down the gutter (which leads to long, straight lines)
		console.log("Tiles in Center Gutter:" + iTilesChoppedInGutter);
		let iMaxTilesToChop = iHeight * (continent2.west - continent1.east) / 2;
		console.log("Max Tiles to Chop: " + iMaxTilesToChop);
		if (iTilesChoppedInGutter >= iMaxTilesToChop) {
			console.log("Fail. Too many tiles lost in center gutter");
		}

		else {
			// Now check that largest continent is big enough
			AreaBuilder.recalculateAreas();
			let iAreaID = AreaBuilder.findBiggestArea(false);
			let iPlotCount = AreaBuilder.getPlotCount(iAreaID);
			console.log("Plots in Largest Landmass:" + iPlotCount);
			let iPlotsNeeded = iWidth * iHeight * iLargestContinentPercent / 100;
			console.log("Plots Needed:" + iPlotsNeeded);

			if (iPlotCount >= iPlotsNeeded) {
				console.log("Useable continent found");
				bLargeEnoughFound = true;
			}
		}
	}
}

export function addPlotTags(iHeight: number, iWidth: number, iEastContinentLeftCol: number) {
	for (let iY: number = 0; iY < iHeight; iY++) {
		for (let iX: number = 0; iX < iWidth; iX++) {
			TerrainBuilder.setPlotTag(iX, iY, PlotTags.PLOT_TAG_NONE);
			const terrain: TerrainType = GameplayMap.getTerrainType(iX, iY);
			if (terrain != globals.g_OceanTerrain && terrain != globals.g_CoastTerrain) {
				addLandmassPlotTags(iX, iY, iEastContinentLeftCol);
			}
			else {
				addWaterPlotTags(iX, iY, iEastContinentLeftCol);
			}
		}
	}
}

export function clearContinent(continent1: ContinentBoundary) {

	for (let iY: number = continent1.south; iY <= continent1.north; iY++) {
		for (let iX: number = continent1.west; iX <= continent1.east; iX++) {
			let terrain: TerrainType = globals.g_OceanTerrain;
			TerrainBuilder.setTerrainType(iX, iY, terrain);
		}
	}
}