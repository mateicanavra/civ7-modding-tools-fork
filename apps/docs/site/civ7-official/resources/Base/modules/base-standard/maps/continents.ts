// Continents.ts
/**
 * Base game map script - Produces widely varied continents.
 * @packageDocumentation
 */
console.log("Generating using script Continents.ts");

import { assignStartPositions, chooseStartSectors } from '/base-standard/maps/assign-starting-plots.js';
import { addMountains, addHills, expandCoasts, buildRainfallMap, generateLakes } from '/base-standard/maps/elevation-terrain-generator.js';
import { addFeatures, designateBiomes } from '/base-standard/maps/feature-biome-generator.js';
import * as globals from '/base-standard/maps/map-globals.js';
import * as utilities from '/base-standard/maps/map-utilities.js';
import { addNaturalWonders } from '/base-standard/maps/natural-wonder-generator.js';
import { generateResources } from '/base-standard/maps/resource-generator.js';
import { addTundraVolcanoes, addVolcanoes } from '/base-standard/maps/volcano-generator.js';
import { assignAdvancedStartRegions } from '/base-standard/maps/assign-advanced-start-region.js';
import { generateDiscoveries } from '/base-standard/maps/discovery-generator.js';
import { generateSnow, dumpPermanentSnow } from '/base-standard/maps/snow-generator.js';
import { dumpStartSectors, dumpContinents, dumpTerrain, dumpElevation, dumpRainfall, dumpBiomes, dumpFeatures, dumpResources, dumpNoisePredicate } from '/base-standard/maps/map-debug-helpers.js';

function requestMapData(initParams: MapInitializationParams) {
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
	console.log(`Age - ${GameInfo.Ages.lookup(Game.age)!.AgeType}`);

	let iWidth = GameplayMap.getGridWidth();
	let iHeight = GameplayMap.getGridHeight();
	let uiMapSize = GameplayMap.getMapSize();
	let startPositions = [];

	let mapInfo = GameInfo.Maps.lookup(uiMapSize);
	if (mapInfo == null) return;

	let iNumNaturalWonders: number = mapInfo.NumNaturalWonders;
	let iTilesPerLake: number = mapInfo.LakeGenerationFrequency;
	let iNumPlayers1: number = mapInfo.PlayersLandmass1;
	let iNumPlayers2: number = mapInfo.PlayersLandmass2;

	// Establish continent boundaries
	let iOceanWaterColumns = globals.g_OceanWaterColumns;
	let westContinent: ContinentBoundary = {
		west: iOceanWaterColumns / 2,
		east: (iWidth / 2) - (iOceanWaterColumns / 2),
		south: globals.g_PolarWaterRows,
		north: iHeight - globals.g_PolarWaterRows,
		continent: 0
	};
	let eastContinent: ContinentBoundary = {
		west: (iWidth / 2) + (iOceanWaterColumns / 2),
		east: iWidth - (iOceanWaterColumns / 2),
		south: globals.g_PolarWaterRows,
		north: iHeight - globals.g_PolarWaterRows,
		continent: 0
	};
	let startSectors: boolean[] = [];
	let iStartSectorRows: number = 0;
	let iStartSectorCols: number = 0;

	let startPosition: number = Configuration.getMapValue("StartPosition");
	if (startPosition == null) {
		startPosition = Database.makeHash('START_POSITION_STANDARD');
	}
	startPosition = Number(BigInt.asIntN(32, BigInt(startPosition))); // Convert to signed int32.
	let startPositionHash: number = Database.makeHash("START_POSITION_BALANCED");

	let bIsBalanced: boolean = (startPosition == startPositionHash);
	if (bIsBalanced) {
		console.log("Balanced Map");
		let iRandom: number = TerrainBuilder.getRandomNumber(2, "East or West");
		if (iRandom == 1) {
			let iNum1: number = iNumPlayers1;
			let iNum2: number = iNumPlayers2;
			iNumPlayers1 = iNum2;
			iNumPlayers2 = iNum1;
		}

		let bHumanNearEquator: boolean = utilities.needHumanNearEquator();
		iStartSectorRows = mapInfo.StartSectorRows;
		iStartSectorCols = mapInfo.StartSectorCols;
		startSectors = chooseStartSectors(iNumPlayers1, iNumPlayers2, iStartSectorRows, iStartSectorCols, bHumanNearEquator);
		dumpStartSectors(startSectors);
		createLandmasses(iWidth, iHeight, westContinent, eastContinent, iStartSectorRows, iStartSectorCols, startSectors);
		utilities.applyCoastalErosionAdjustingForStartSectors(westContinent, eastContinent, .02, 1.5, .8, iStartSectorRows, iStartSectorCols, startSectors);
		utilities.applyCoastalErosionAdjustingForStartSectors(eastContinent, eastContinent, .02, 1.5, .8, iStartSectorRows, iStartSectorCols, startSectors);
		utilities.addPlotTags(iHeight, iWidth, eastContinent.west);
	}
	else {
		console.log("Standard Map");
		let iFractalGrain = 2;
		let iWaterPercent = globals.g_WaterPercent * globals.g_Cutoff;
		let iLargestContinentPercent = 18;
		utilities.createOrganicLandmasses(iWidth, iHeight, westContinent, eastContinent, iFractalGrain, iWaterPercent, iLargestContinentPercent);
		utilities.addPlotTags(iHeight, iWidth, eastContinent.west);

		utilities.applyCoastalErosion(westContinent, .02, 1.5, .8, false);
		utilities.applyCoastalErosion(eastContinent, .02, 1.5, .8, false);

		// Is biggest area in west or east?
		let iAreaID = AreaBuilder.findBiggestArea(false);
		let kBoundaries = AreaBuilder.getAreaBoundary(iAreaID);
		console.log("BIGGEST AREA");
		console.log("  West: " + kBoundaries.west);
		console.log("  East: " + kBoundaries.east);
		console.log("  South: " + kBoundaries.south);
		console.log("  North: " + kBoundaries.north);
		if (kBoundaries.west > (iWidth / 2)) {
			let iNum1: number = iNumPlayers1;
			let iNum2: number = iNumPlayers2;
			iNumPlayers1 = iNum2;
			iNumPlayers2 = iNum1;
		}
	}

	TerrainBuilder.validateAndFixTerrain();
	expandCoasts(iWidth, iHeight);
	utilities.adjustOceanPlotTags(iNumPlayers1 > iNumPlayers2);
	AreaBuilder.recalculateAreas();
	TerrainBuilder.stampContinents();
	addMountains(iWidth, iHeight);
	addVolcanoes(iWidth, iHeight);
	generateLakes(iWidth, iHeight, iTilesPerLake);
	utilities.adjustLakePlotTags(westContinent, true);
	utilities.adjustLakePlotTags(eastContinent, false);
	AreaBuilder.recalculateAreas();
	TerrainBuilder.buildElevation();
	addHills(iWidth, iHeight);
	buildRainfallMap(iWidth, iHeight);
	TerrainBuilder.modelRivers(5, 15, globals.g_NavigableRiverTerrain);
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
	startPositions = assignStartPositions(iNumPlayers1, iNumPlayers2, westContinent, eastContinent, iStartSectorRows, iStartSectorCols, startSectors);
	generateDiscoveries(iWidth, iHeight, startPositions);

	dumpResources(iWidth, iHeight);

	FertilityBuilder.recalculate();		// Must be after features are added.

	let seed = GameplayMap.getRandomSeed(); // can use any seed you want for different noises
	let avgDistanceBetweenPoints = 3;
	let normalizedRangeSmoothing = 2;
	let poisson = TerrainBuilder.generatePoissonMap(seed, avgDistanceBetweenPoints, normalizedRangeSmoothing);
	let poissonPred = (val: number): string => {
		return val >= 1 ? "*" : " ";
	}
	dumpNoisePredicate(iWidth, iHeight, poisson, poissonPred);

	assignAdvancedStartRegions();
}

// Register listeners.
engine.on('RequestMapInitData', requestMapData);
engine.on('GenerateMap', generateMap);

console.log("Loaded Continents.ts");
console.log("hey, continents is firing");

function createLandmasses(iWidth: number, iHeight: number, continent1: ContinentBoundary, continent2: ContinentBoundary,
	iStartSectorRows: number, iStartSectorCols: number, startSectors: boolean[]) {
	FractalBuilder.create(globals.g_LandmassFractal, iWidth, iHeight, 2, 0);
	let iWaterHeight: number = FractalBuilder.getHeightFromPercent(globals.g_LandmassFractal, globals.g_WaterPercent);

	let iBuffer: number = Math.floor(iHeight / 18.0);
	let iBuffer2: number = Math.floor(iWidth / 28.0);
	for (let iY: number = 0; iY < iHeight; iY++) {
		for (let iX: number = 0; iX < iWidth; iX++) {
			let terrain: TerrainType = globals.g_FlatTerrain;

			let iRandom: number = TerrainBuilder.getRandomNumber(iBuffer, "Random Top/Bottom Edges");
			let iRandom2: number = TerrainBuilder.getRandomNumber(iBuffer2, "Random Left/Right Edges");

			//  Must be water if at the poles
			if (iY < continent1.south + iRandom || iY >= continent1.north - iRandom) {
				terrain = globals.g_OceanTerrain;
			}

			// Of if between the continents
			else if (iX < continent1.west + iRandom2 || iX >= continent2.east - iRandom2 ||
				(iX >= continent1.east - iRandom2 && iX < continent2.west + iRandom2)) {
				terrain = globals.g_OceanTerrain;
			}

			else {
				let iPlotHeight = utilities.getHeightAdjustingForStartSector(iX, iY, iWaterHeight, globals.g_FractalWeight, globals.g_CenterWeight, globals.g_StartSectorWeight, continent1, continent2, iStartSectorRows, iStartSectorCols, startSectors);

				// Finally see whether or not this stays as Land or has too low a score and drops back to water
				if (iPlotHeight < iWaterHeight * globals.g_Cutoff) {
					let iSector: number = utilities.getSector(iX, iY, iStartSectorRows, iStartSectorCols, continent1.south, continent1.north, continent1.west, continent1.east, continent2.west);
					if (startSectors[iSector]) {
						terrain = globals.g_CoastTerrain;
					}
					else {
						terrain = globals.g_OceanTerrain;
					}
				}
			}

			TerrainBuilder.setTerrainType(iX, iY, terrain);
		}
	}
}