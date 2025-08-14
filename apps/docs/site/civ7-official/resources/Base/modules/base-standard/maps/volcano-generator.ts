import * as globals from '/base-standard/maps/map-globals.js';

function getContinentBoundaryPlotCount(iWidth: number, iHeight: number) {

	let iContinentBoundaryPlots = 0;

	for (let iY: number = 0; iY < iHeight; iY++) {
		for (let iX: number = 0; iX < iWidth; iX++) {
			if (GameplayMap.findSecondContinent(iX, iY, 3)) {
				iContinentBoundaryPlots = iContinentBoundaryPlots + 1;
			}
		}
	}
	return iContinentBoundaryPlots;
}

function getNumberAdjacentMountains(iX: number, iY: number) {

	let iCount = 0;

	for (let iDirection = 0; iDirection < DirectionTypes.NUM_DIRECTION_TYPES; iDirection++) {
		let iIndex = GameplayMap.getIndexFromXY(iX, iY);
		let iLocation = GameplayMap.getLocationFromIndex(iIndex);
		let pAdjacentPlot = GameplayMap.getAdjacentPlotLocation(iLocation, iDirection);
		if (GameplayMap.isMountain(pAdjacentPlot.x, pAdjacentPlot.y)) {
			iCount = iCount + 1;
		}
	}
	return iCount;
}

function getNumberAdjacentVolcanoes(iX: number, iY: number) {

	let iCount = 0;

	for (let iDirection = 0; iDirection < DirectionTypes.NUM_DIRECTION_TYPES; iDirection++) {
		let iIndex = GameplayMap.getIndexFromXY(iX, iY);
		let iLocation = GameplayMap.getLocationFromIndex(iIndex);
		let pAdjacentPlot = GameplayMap.getAdjacentPlotLocation(iLocation, iDirection);
		if (GameplayMap.getFeatureType(pAdjacentPlot.x, pAdjacentPlot.y) == globals.g_VolcanoFeature) {
			iCount = iCount + 1;
		}
	}
	return iCount;
}

export function addVolcanoes(iWidth: number, iHeight: number, spacing: number = 2) {
	console.log("Volcanoes");

	let iMountainPercentByDistance: number[] = [30, 18, 6];

	let iCountVolcanoesPlaced = 0;
	let placedVolcanoes: { x: number, y: number }[] = [];
	let minDistanceBetweenVolcanoes = spacing;

	// Compute target number of volcanoes
	let iTotalLandPlots = 0;
	for (let iY: number = 0; iY < iHeight; iY++) {
		for (let iX: number = 0; iX < iWidth; iX++) {
			if (!GameplayMap.isWater(iX, iY)) {
				iTotalLandPlots = iTotalLandPlots + 1;
			}
		}
	}

	// TODO: modify the 150 divisor by World Age or Realism Setting
	let iDesiredVolcanoes = iTotalLandPlots / 150;
	console.log("Desired Volcanoes: " + iDesiredVolcanoes);

	// 2/3rds of Earth's volcanoes are near continent boundaries
	let iContinentBoundaryPlots = getContinentBoundaryPlotCount(iWidth, iHeight);
	console.log("Continent Boundary Plots: " + iContinentBoundaryPlots);
	let iDesiredNearBoundaries = iDesiredVolcanoes * 2 / 3;
	console.log("Desired Boundary Volcanoes: " + iDesiredNearBoundaries);

	if (iDesiredNearBoundaries > 0) {
		let iBoundaryPlotsPerVolcano = iContinentBoundaryPlots / iDesiredNearBoundaries;

		console.log("Boundary Plots Per Volcano: " + iBoundaryPlotsPerVolcano);

		for (let iY: number = 0; iY < iHeight; iY++) {
			for (let iX: number = 0; iX < iWidth; iX++) {
				if (!GameplayMap.isWater(iX, iY)) {

					let iPlotsFromBoundary = -1;
					let bVolcanoHere = false;
					let iNumAdjacentMountains = getNumberAdjacentMountains(iX, iY);

					// 	Do not place inaccessible volcanoes
					if (iNumAdjacentMountains != 6) {
						// 	if (iNumAdjacentMountains ~= 6 and GetNumberNearbyVolcanoes(iX, iY, 3, aPlacedVolcanoes) == 0) then

						if (GameplayMap.findSecondContinent(iX, iY, 1)) {
							if (TerrainBuilder.getRandomNumber(iBoundaryPlotsPerVolcano * .7, "Volcano on boundary") == 0) {
								bVolcanoHere = true;
							}
							iPlotsFromBoundary = 1;
						}
						else if (GameplayMap.findSecondContinent(iX, iY, 2)) {
							if (TerrainBuilder.getRandomNumber(iBoundaryPlotsPerVolcano, "Volcano 1 from boundary") == 0) {
								bVolcanoHere = true;
							}
							iPlotsFromBoundary = 2;
						}
						else if (GameplayMap.findSecondContinent(iX, iY, 3)) {
							if (TerrainBuilder.getRandomNumber(iBoundaryPlotsPerVolcano * 1.5, "Volcano 2 from boundary") == 0) {
								bVolcanoHere = true;
							}
							iPlotsFromBoundary = 3;
						}
					}

					if (bVolcanoHere && !isTooCloseToExistingVolcanoes(iX, iY, placedVolcanoes, minDistanceBetweenVolcanoes)) {
						TerrainBuilder.setTerrainType(iX, iY, globals.g_MountainTerrain);
						TerrainBuilder.setFeatureType(iX, iY, {
							Feature: globals.g_VolcanoFeature,
							Direction: -1,
							Elevation: 0
						});
						placedVolcanoes.push({ x: iX, y: iY });
						iCountVolcanoesPlaced++;
					}
					else if (iPlotsFromBoundary > 0) {
						let iMountainChance = iMountainPercentByDistance[iPlotsFromBoundary - 1];
						if (getNumberAdjacentVolcanoes(iX, iY) > 0) {
							iMountainChance = iMountainChance / 2;
						}
						// Mountain?
						if (TerrainBuilder.getRandomNumber(100, "Mountain near boundary") < iMountainChance) {
							TerrainBuilder.setTerrainType(iX, iY, globals.g_MountainTerrain);
						}
					}
				}
			}
		}
	}
	console.log("Continent Edge Volcanoes Placed: " + iCountVolcanoesPlaced);
}


export function isTooCloseToExistingVolcanoes(
	iX: number,
	iY: number,
	existingVolcanoes: { x: number; y: number }[],
	minDistance: number
): boolean {
	for (let volcano of existingVolcanoes) {
		const dx = volcano.x - iX;
		const dy = volcano.y - iY;
		const dist = Math.sqrt(dx * dx + dy * dy);
		if (dist < minDistance) return true;
	}
	return false;
}

export function addTundraVolcanoes(
	iWidth: number,
	iHeight: number,
	spacing: number = 3
) {
	console.log(`Adding tundra volcanoes`);

	// Count land tiles to scale volcano target
	let iTotalLandPlots = 0;
	for (let iY = 0; iY < iHeight; iY++) {
		for (let iX = 0; iX < iWidth; iX++) {
			if (!GameplayMap.isWater(iX, iY)) {
				iTotalLandPlots++;
			}
		}
	}

	//TODO: Do not place volcanoes along continent boundaries too near each other(keep an array of where placed and check distance)
	let tundraVolcanoesPlaced = 0;
	let iDesiredVolcanoes = Math.floor(iTotalLandPlots / 300);
	console.log("Desired Tundra Volcanoes: " + iDesiredVolcanoes);

	let placedVolcanoes: { x: number, y: number }[] = [];

	// Gather tundra candidates - has a tundra biome, is not a river or water tile and is not already a volcano or mountain
	let tundraCandidates: { x: number; y: number; isInland: boolean }[] = [];

	for (let iY = 0; iY < iHeight; iY++) {
		for (let iX = 0; iX < iWidth; iX++) {
			const biome = GameplayMap.getBiomeType(iX, iY);
			if (biome === globals.g_TundraBiome && GameplayMap.isMountain(iX, iY)) {
				const isInland = !GameplayMap.isCoastalLand(iX, iY);
				tundraCandidates.push({ x: iX, y: iY, isInland });
			}
		}
	}

	// Shuffle candidates for randomness prioritizing noncoastal tiles
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
			const currentChance = Math.max(1, baseChance - (tundraVolcanoesPlaced * falloffPerVolcano));

			if (TerrainBuilder.getRandomNumber(100, "Tundra Volcano Roll") < currentChance) {
				TerrainBuilder.setTerrainType(x, y, globals.g_MountainTerrain);
				TerrainBuilder.setFeatureType(x, y, {
					Feature: globals.g_VolcanoFeature,
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

	function shuffleCandidates<T>(array: T[]): void {
		for (let i = array.length - 1; i > 0; i--) {
			const j = TerrainBuilder.getRandomNumber(i + 1, "Shuffle");
			[array[i], array[j]] = [array[j], array[i]];
		}
	}

}
