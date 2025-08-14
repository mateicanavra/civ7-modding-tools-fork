import * as globals from '/base-standard/maps/map-globals.js';
import * as utilities from '/base-standard/maps/map-utilities.js';

export function designateBiomes(iWidth: number, iHeight: number) {
	console.log("Biomes");

	let iTotalLandPlots: number = 0;
	let iTotalLandPlotsAbove: number = 0;
	for (let iY: number = 0; iY < iHeight; iY++) {
		for (let iX: number = 0; iX < iWidth; iX++) {
			let latitude: number = GameplayMap.getPlotLatitude(iX, iY);
			if (!GameplayMap.isWater(iX, iY)) {
				iTotalLandPlots = iTotalLandPlots + 1;
			}

			if (!GameplayMap.isWater(iX, iY) && globals.g_PlainsLatitude < latitude) {
				iTotalLandPlotsAbove = iTotalLandPlotsAbove + 1;
			}
		}
	}

	let iPlainsLowering: number = 0;
	let iDesertLowering: number = 0;
	let iGrassLowering: number = 0;
	let iTropicalLowering: number = 0;

	if (Math.round(iTotalLandPlots / 5.0 * 2.0 * 0.75) > iTotalLandPlotsAbove) {
		iPlainsLowering += 5;
		iDesertLowering += 4;
		iGrassLowering += 4;
		iTropicalLowering += 2;
		console.log("Less " + " iTotalLandPlots: " + iTotalLandPlots + " iTotalLandPlotsAbove: " + iTotalLandPlotsAbove);
	}

	for (let iY: number = 0; iY < iHeight; iY++) {
		for (let iX: number = 0; iX < iWidth; iX++) {

			if (GameplayMap.isWater(iX, iY)) {
				TerrainBuilder.setBiomeType(iX, iY, globals.g_MarineBiome);
			}
			else {
				let latitude: number = GameplayMap.getPlotLatitude(iX, iY);

				if (latitude < 0) latitude = -1 * latitude;

				latitude += Math.round(GameplayMap.getElevation(iX, iY) / 120.0);

				if (GameplayMap.isRiver(iX, iY)) {
					latitude -= 10;
				}
				else if (GameplayMap.isAdjacentToRivers(iX, iY, 1)) {
					latitude -= 5;
				}

				let rainfall: number = GameplayMap.getRainfall(iX, iY);
				if (latitude < globals.g_TropicalLatitude - iTropicalLowering && rainfall < 85) {
					TerrainBuilder.setBiomeType(iX, iY, globals.g_PlainsBiome);
				}
				else if (latitude < globals.g_TropicalLatitude - iTropicalLowering) {
					TerrainBuilder.setBiomeType(iX, iY, globals.g_TropicalBiome);
				}
				else if (latitude < globals.g_PlainsLatitude - iPlainsLowering || (latitude < globals.g_TropicalLatitude - iTropicalLowering && rainfall < 85)) {
					TerrainBuilder.setBiomeType(iX, iY, globals.g_PlainsBiome);
				}
				else if (latitude < globals.g_DesertLatitude - iDesertLowering || (latitude < globals.g_PlainsLatitude - iPlainsLowering && rainfall < 85)) {
					TerrainBuilder.setBiomeType(iX, iY, globals.g_DesertBiome);
				}
				else if (latitude < globals.g_GrasslandLatitude - iGrassLowering) {
					TerrainBuilder.setBiomeType(iX, iY, globals.g_GrasslandBiome);
				}
				else {
					TerrainBuilder.setBiomeType(iX, iY, globals.g_TundraBiome);
				}
			}
		}
	}
}

export function addFeatures(iWidth: number, iHeight: number) {
	console.log("Features");
	addPositionalFeatures(iWidth, iHeight);
	scatterFeatures(iWidth, iHeight);
	addIce(iWidth, iHeight);
	addReefs(iWidth, iHeight);
}

function addPositionalFeatures(iWidth: number, iHeight: number) {
	// Find next specific position
	for (let iY: number = 0; iY < iHeight; iY++) {
		for (let iX: number = 0; iX < iWidth; iX++) {
			//let _biome: BiomeType = GameplayMap.getBiomeType(iX, iY);
			let feature: FeatureType = GameplayMap.getFeatureType(iX, iY);

			if (GameplayMap.isWater(iX, iY) == false && feature == FeatureTypes.NO_FEATURE && GameplayMap.isNavigableRiver(iX, iY) == false) {
				// Along coast?
				if (GameplayMap.isCoastalLand(iX, iY)) {
					// See if we can scatter a feature here
					for (var featIdx = 0; featIdx < GameInfo.Features.length; featIdx++) {
						if (canAddFeature(iX, iY, featIdx, false /*bScatterable*/, false /*bRiverMouth*/, true /*bCoastal*/, false /*bNearRiver*/, false /*bIsolated*/, false /*bReef*/, false /*bIce*/)) {
							let iScatterChance = GameInfo.Features[featIdx].PlacementDensity;
							let iRoll = TerrainBuilder.getRandomNumber(100, "Feature Scatter");
							if (iRoll < iScatterChance) {
								const featureParam = {
									Feature: featIdx,
									Direction: -1,
									Elevation: 0
								};
								TerrainBuilder.setFeatureType(iX, iY, featureParam);
								break;
							}
						}
					}
				}

				// Near multiple river hexes?
				else if (GameplayMap.isAdjacentToRivers(iX, iY, 2)) {
					// See if we can scatter a feature here
					for (var featIdx = 0; featIdx < GameInfo.Features.length; featIdx++) {
						if (canAddFeature(iX, iY, featIdx, false /*bScatterable*/, false /*bRiverMouth*/, false /*bCoastal*/, true /*bNearRiver*/, false /*bIsolated*/, false /*bReef*/, false /*bIce*/)) {
							let iScatterChance = GameInfo.Features[featIdx].PlacementDensity;
							let iRoll = TerrainBuilder.getRandomNumber(100, "Feature Scatter");
							if (iRoll < iScatterChance) {
								const featureParam = {
									Feature: featIdx,
									Direction: -1,
									Elevation: 0
								};
								TerrainBuilder.setFeatureType(iX, iY, featureParam);
								break;
							}
						}
					}
				}

				// Away from water?
				else {
					if (GameplayMap.isAdjacentToRivers(iX, iY, 1)) {
						continue;
					}
					else if (GameplayMap.isCoastalLand(iX, iY)) {
						continue;
					}

					for (var featIdx = 0; featIdx < GameInfo.Features.length; featIdx++) {
						// Must not already be in an adjacent plot
						if (!(GameplayMap.isAdjacentToFeature(iX, iY, featIdx)) &&
							canAddFeature(iX, iY, featIdx, false /*bScatterable*/, false /*bRiverMouth*/, false /*bCoastal*/, false /*bNearRiver*/, true /*bIsolated*/, false /*bReef*/, false /*bIce*/)) {
							let iScatterChance = GameInfo.Features[featIdx].PlacementDensity;
							let iRoll = TerrainBuilder.getRandomNumber(100, "Feature Scatter");
							if (iRoll < iScatterChance) {
								const featureParam = {
									Feature: featIdx,
									Direction: -1,
									Elevation: 0
								};
								TerrainBuilder.setFeatureType(iX, iY, featureParam);
								break;
							}
						}
					}
				}
			}
		}
	}
}

function scatterFeatures(iWidth: number, iHeight: number) {
	// Find spots and use PlacementDensity to decide whether or not to place it
	for (let iY: number = 0; iY < iHeight; iY++) {
		for (let iX: number = 0; iX < iWidth; iX++) {
			let feature: FeatureType = GameplayMap.getFeatureType(iX, iY);

			if (GameplayMap.isWater(iX, iY) == false && feature == FeatureTypes.NO_FEATURE && GameplayMap.isNavigableRiver(iX, iY) == false) {
				// See if we can scatter a feature here
				for (var featIdx = 0; featIdx < GameInfo.Features.length; featIdx++) {
					if (canAddFeature(iX, iY, featIdx, true /*bScatterable*/, false /*bRiverMouth*/, false /*bCoastal*/, false /*bNearRiver*/, false /*bIsolated*/, false /*bReef*/, false /*bIce*/)) {
						let iScatterChance = GameInfo.Features[featIdx].PlacementDensity;
						let iRoll = TerrainBuilder.getRandomNumber(100, "Feature Scatter");
						if (iRoll < iScatterChance) {
							const featureParam = {
								Feature: featIdx,
								Direction: -1,
								Elevation: 0
							};
							TerrainBuilder.setFeatureType(iX, iY, featureParam);
							break;
						}
					}
				}
			}
		}
	}
}

function addReefs(iWidth: number, iHeight: number) {
	// Find spots and use PlacementDensity to decide whether or not to place it
	for (let iY: number = 0; iY < iHeight; iY++) {
		for (let iX: number = 0; iX < iWidth; iX++) {
			let feature: FeatureType = GameplayMap.getFeatureType(iX, iY);

			if (GameplayMap.isWater(iX, iY) == true && feature == FeatureTypes.NO_FEATURE) {
				// See if we can scatter a feature here
				let latitude: number = GameplayMap.getPlotLatitude(iX, iY);
				if (latitude < 0) latitude = -1 * latitude;

				for (var featIdx = 0; featIdx < GameInfo.Features.length; featIdx++) {
					if (canAddFeature(iX, iY, featIdx, false /*bScatterable*/, false /*bRiverMouth*/, false /*bCoastal*/, false /*bNearRiver*/, false /*bIsolated*/, true /*bReef*/, false /*bIce*/)) {
						if (GameInfo.Features[featIdx].MinLatitude <= latitude && GameInfo.Features[featIdx].MaxLatitude > latitude) {
							let iScatterChance = GameInfo.Features[featIdx].PlacementDensity;
							let iWeight: number = (latitude + 50) * 2;
							let iRoll = TerrainBuilder.getRandomNumber(iWeight, "Feature Reef");
							if (iRoll < iScatterChance) {
								const featureParam = {
									Feature: featIdx,
									Direction: -1,
									Elevation: 0
								};
								TerrainBuilder.setFeatureType(iX, iY, featureParam);
								break;
							}
						}
					}
				}
			}
		}
	}
}

function addIce(iWidth: number, iHeight: number) {
	// Find spots and use PlacementDensity to decide whether or not to place it
	for (let iY: number = 0; iY < iHeight; iY++) {
		for (let iX: number = 0; iX < iWidth; iX++) {
			let feature: FeatureType = GameplayMap.getFeatureType(iX, iY);

			if (GameplayMap.isWater(iX, iY) == true && feature == FeatureTypes.NO_FEATURE) {
				// See if we can scatter a feature here
				let latitude: number = GameplayMap.getPlotLatitude(iX, iY);
				if (latitude < 0) latitude = -1 * latitude - 5;

				if (latitude > 78) {
					for (var featIdx = 0; featIdx < GameInfo.Features.length; featIdx++) {
						if (canAddFeature(iX, iY, featIdx, false /*bScatterable*/, false /*bRiverMouth*/, false /*bCoastal*/, false /*bNearRiver*/, false /*bIsolated*/, false /*bReef*/, true /*bIce*/)) {

							let iScatterChance = GameInfo.Features[featIdx].PlacementDensity;
							let iScore: number = TerrainBuilder.getRandomNumber(100, "Feature Ice");
							iScore = iScore + latitude;

							if (GameplayMap.isAdjacentToLand(iX, iY)) {
								iScore = 0;
							}

							if (utilities.isAdjacentToNaturalWonder(iX, iY)) {
								iScore = 0;
							}

							if (iScore > iScatterChance) {
								const featureParam = {
									Feature: featIdx,
									Direction: -1,
									Elevation: 0
								};
								TerrainBuilder.setFeatureType(iX, iY, featureParam);
								break;
							}
						}
					}
				}
			}
		}
	}
}

function canAddFeature(iX: number, iY: number, feature: number, bScatterable: boolean, bRiverMouth: boolean, bCoastal: boolean, bNearRiver: boolean, bIsolated: boolean, bReef: boolean, bIce: boolean): boolean {
	// Check DB to see if this is scatterable
	if (!bScatterable || GameInfo.Features[feature].PlacementClass == "SCATTER") {
		if (!bRiverMouth || GameInfo.Features[feature].PlacementClass == "RIVERMOUTH") {
			if (!bCoastal || GameInfo.Features[feature].PlacementClass == "COASTAL") {
				if (!bNearRiver || GameInfo.Features[feature].PlacementClass == "NEARRIVER") {
					if (!bIsolated || GameInfo.Features[feature].PlacementClass == "ISOLATED") {
						if (!bReef || GameInfo.Features[feature].PlacementClass == "REEF") {
							if (!bIce || GameInfo.Features[feature].PlacementClass == "ICE") {
								return TerrainBuilder.canHaveFeature(iX, iY, feature);
							}
						}
					}
				}
			}
		}
	}

	return false;
}