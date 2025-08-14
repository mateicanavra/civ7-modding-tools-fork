import * as globals from '/base-standard/maps/map-globals.js';
import * as utilities from '/base-standard/maps/map-utilities.js';

export function addMountains(iWidth: number, iHeight: number) {
	let adjustment: number = 3;  // Default World Age
	let extra_mountains: number = 0;
	let iFlags: number = 0;
	let grainAmount: number = 5;

	// Extra mountainous percentage for mountains live event
	const liveEventDBRow = GameInfo.GlobalParameters.lookup("REGISTERED_MARVELOUS_MOUNTAINS_EVENT");
	if (liveEventDBRow && liveEventDBRow.Value != "0") {
		extra_mountains = 40;
	}

	// Values for mountains adjusted by World Age chosen by user.
	let mountains: number = 93 - adjustment - extra_mountains;

	FractalBuilder.create(globals.g_MountainFractal, iWidth, iHeight, grainAmount, iFlags);
	FractalBuilder.create(globals.g_HillFractal, iWidth, iHeight, grainAmount, iFlags);

	// Get height values for terrain types
	let iMountainThreshold = FractalBuilder.getHeightFromPercent(globals.g_MountainFractal, mountains);

	for (let iY: number = 0; iY < iHeight; iY++) {
		for (let iX: number = 0; iX < iWidth; iX++) {
			let terrain: TerrainType = GameplayMap.getTerrainType(iX, iY);

			if (GameplayMap.isWater(iX, iY) == false) {
				// Get the value from the fractals
				let iMountainHeight: number = FractalBuilder.getHeight(globals.g_MountainFractal, iX, iY);

				if (iMountainHeight >= iMountainThreshold) {
					terrain = globals.g_MountainTerrain;
				}

				// Update the terrain if it changed
				if (terrain != globals.g_FlatTerrain) {
					TerrainBuilder.setTerrainType(iX, iY, terrain);
				}
			}
		}
	}
}

export function addHills(iWidth: number, iHeight: number) {
	let adjustment: number = 3;  // Default World Age
	let base_hills_threshold = 950;
	let extra_hills: number = 0;

	// Values for mountains adjusted by World Age chosen by user.
	let hillsThreshold: number = base_hills_threshold - (adjustment * 20) - extra_hills;

	for (let iY: number = 0; iY < iHeight; iY++) {
		for (let iX: number = 0; iX < iWidth; iX++) {
			if (GameplayMap.isWater(iX, iY) == false && GameplayMap.isMountain(iX, iY) == false) {
				let iIndex = GameplayMap.getIndexFromXY(iX, iY);
				let iLocation = GameplayMap.getLocationFromIndex(iIndex);
				let iHillScore = 0;
				let iElevation: number = GameplayMap.getElevation(iX, iY);
				for (let iDirection = 0; iDirection < DirectionTypes.NUM_DIRECTION_TYPES; iDirection++) {
					if (GameplayMap.isCliffCrossing(iX, iY, iDirection) == false) {
						let iAdjacentX = GameplayMap.getAdjacentPlotLocation(iLocation, iDirection).x;
						let iAdjacentY = GameplayMap.getAdjacentPlotLocation(iLocation, iDirection).y;
						let iAdjacentElevation: number = GameplayMap.getElevation(iAdjacentX, iAdjacentY);
						let iElevationDifference = iAdjacentElevation - iElevation;
						if (iElevationDifference > 0) {
							iHillScore = iHillScore + iElevationDifference;
						}
						else {
							iHillScore = iHillScore - iElevationDifference;
						}
					}
				}
				if (iHillScore > hillsThreshold) {
					TerrainBuilder.setTerrainType(iX, iY, globals.g_HillTerrain);
				}
			}
		}
	}
}

export function expandCoasts(iWidth: number, iHeight: number) {
	for (let iY: number = 0; iY < iHeight; iY++) {
		for (let iX: number = 0; iX < iWidth; iX++) {
			let terrain: TerrainType = GameplayMap.getTerrainType(iX, iY);
			if (terrain == globals.g_OceanTerrain) {
				if (iX > globals.g_OceanWaterColumns / 2 && (iX < ((iWidth - globals.g_OceanWaterColumns) / 2) || (iX > (iWidth + globals.g_OceanWaterColumns) / 2)) && iX < iWidth - globals.g_OceanWaterColumns / 2) {
					if (GameplayMap.isAdjacentToShallowWater(iX, iY) && TerrainBuilder.getRandomNumber(4, "Shallow Water Scater Scatter") == 0) {
						TerrainBuilder.setTerrainType(iX, iY, globals.g_CoastTerrain);
					}
				}
			}
		}
	}
}

export function generateLakes(iWidth: number, iHeight: number, iTilesPerLake: number) {
	let iLakesAdded: number = 0;
	if (iTilesPerLake == 0) iTilesPerLake = 25;  // Divide by zero proof
	let ilakePlotRand: number = Math.floor(iWidth * iHeight / iTilesPerLake);

	console.log("Num Directions" + DirectionTypes.NUM_DIRECTION_TYPES);

	for (let iY: number = 0; iY < iHeight; iY++) {
		for (let iX: number = 0; iX < iWidth; iX++) {
			if (GameplayMap.isWater(iX, iY) == false) {
				if (GameplayMap.isCoastalLand(iX, iY) == false) {
					if (GameplayMap.isImpassable(iX, iY) == false) {
						let r: number = TerrainBuilder.getRandomNumber(ilakePlotRand, "MapGenerator AddLakes");
						if (r == 0) {
							iLakesAdded = iLakesAdded + 1;
							addMoreLake(iX, iY);

							TerrainBuilder.setTerrainType(iX, iY, globals.g_CoastTerrain);
						}
					}
				}
			}
		}
	}

	if (iLakesAdded > 0) {
		console.log("Lakes Added: " + iLakesAdded);
	}
}

function addMoreLake(iX: number, iY: number) {
	let iLargeLakes: number = 0;
	let adjacentPlots: PlotCoord[] = [];

	for (let iDirection: DirectionTypes = 0; iDirection < DirectionTypes.NUM_DIRECTION_TYPES; iDirection++) {
		let iIndex: number = GameplayMap.getIndexFromXY(iX, iY);
		let iLocation: PlotCoord = GameplayMap.getLocationFromIndex(iIndex);
		let iAdjacentX: number = GameplayMap.getAdjacentPlotLocation(iLocation, iDirection).x;
		let iAdjacentY: number = GameplayMap.getAdjacentPlotLocation(iLocation, iDirection).y;
		let iAdjacentPlot: PlotCoord = GameplayMap.getAdjacentPlotLocation(iLocation, iDirection);
		if (GameplayMap.isWater(iAdjacentX, iAdjacentY) == false) {
			if (GameplayMap.isAdjacentToShallowWater(iAdjacentX, iAdjacentY) == false) {
				if (GameplayMap.isImpassable(iAdjacentX, iAdjacentY) == false) {
					let r: number = TerrainBuilder.getRandomNumber(4 + iLargeLakes, "MapGenerator Enlarge Lakes");
					if (r < 3) {
						adjacentPlots.push(iAdjacentPlot);
						iLargeLakes = iLargeLakes + 1;
					}
				}
			}
		}
	}

	for (var adjacentIdx = 0; adjacentIdx < adjacentPlots.length; adjacentIdx++) {
		TerrainBuilder.setTerrainType(adjacentPlots[adjacentIdx].x, adjacentPlots[adjacentIdx].y, globals.g_CoastTerrain);
	}
}

export function buildRainfallMap(iWidth: number, iHeight: number) {
	for (let iY: number = 0; iY < iHeight; iY++) {
		let iMountainXTilesAgo: number = -1;
		for (let iX: number = 0; iX < iWidth; iX++) {
			let iRainfall: number = globals.g_StandardRainfall;
			let terrain: TerrainType = GameplayMap.getTerrainType(iX, iY);

			if (GameplayMap.isLake(iX, iY) == true) {
				TerrainBuilder.setRainfall(iX, iY, iRainfall * 2);
			}
			else if (GameplayMap.isWater(iX, iY) == false) {
				if (terrain == globals.g_MountainTerrain || utilities.isCliff(iX, iY)) {
					iMountainXTilesAgo = 0;
				}
				else if (iMountainXTilesAgo >= 0) {
					iMountainXTilesAgo++;
				}
				if (iMountainXTilesAgo == 0) {
					iRainfall += globals.g_MountainTopIncrease;
				}
				else if (iMountainXTilesAgo > 0) {
					iRainfall += globals.g_RainShadowDrop;
					iRainfall += (iMountainXTilesAgo * globals.g_RainShadowIncreasePerHex);
					if (iRainfall > globals.g_StandardRainfall) {
						iRainfall = globals.g_StandardRainfall;
					}
				}
				TerrainBuilder.setRainfall(iX, iY, iRainfall);
			}
			else {
				iMountainXTilesAgo = -1;
			}
		}
	}
}