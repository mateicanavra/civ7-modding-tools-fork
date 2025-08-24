import * as globals from '/base-standard/maps/map-globals.js';

export function dumpStartSectors(sectors: boolean[]) {
	for (let iX: number = 0; iX < sectors.length; iX++) {
		console.log(iX + ": " + sectors[iX]);
	}
}

export function dumpContinents(iWidth: number, iHeight: number) {
	// Dump it out as an ASCII map to "Scripting.log"
	for (let iY: number = iHeight - 1; iY >= 0; iY--) {
		let str: string = '';
		if (iY % 2 == 1) {
			str += ' ';
		}
		for (let iX: number = 0; iX < iWidth; iX++) {
			let terrainString: string = " ";

			if (GameplayMap.isWater(iX, iY) == false) {
				const continent = GameplayMap.getContinentType(iX, iY);
				if (typeof continent == 'number') {
					terrainString = Math.floor(continent % 10).toString();
				}

			}
			str += terrainString + ' ';
		}
		console.log(str);
	}
}

export function dumpTerrain(iWidth: number, iHeight: number) {
	// Dump it out as an ASCII map to "Scripting.log"
	for (let iY: number = iHeight - 1; iY >= 0; iY--) {
		let str: string = '';
		if (iY % 2 == 1) {
			str += ' ';
		}
		for (let iX: number = 0; iX < iWidth; iX++) {
			let terrain: TerrainType = GameplayMap.getTerrainType(iX, iY);
			let terrainString: string = " ";
			if (terrain == globals.g_FlatTerrain) {
				terrainString = '.';
			}
			else if (terrain == globals.g_HillTerrain) {
				terrainString = "^";
			}
			else if (terrain == globals.g_MountainTerrain) {
				terrainString = "M";
			}
			else if (terrain == globals.g_OceanTerrain) {
				terrainString = "~";
			}
			str += terrainString + ' ';
		}
		console.log(str);
	}
}

export function dumpElevation(iWidth: number, iHeight: number) {
	// Dump it out as an ASCII map to "Scripting.log"
	for (let iY: number = iHeight - 1; iY >= 0; iY--) {
		let str: string = '';
		if (iY % 2 == 1) {
			str += ' ';
		}
		for (let iX: number = 0; iX < iWidth; iX++) {
			if (GameplayMap.isWater(iX, iY) == false) {
				let elevation: number = GameplayMap.getElevation(iX, iY);
				let elevationToDisplay: string = ' ';
				let iNumToDisplay: number = Math.floor(elevation / 100);
				elevationToDisplay = iNumToDisplay.toString();
				str += elevationToDisplay + ' ';
			}
			else {
				str += '  ';
			}
		}
		console.log(str);
	}
}

export function dumpRainfall(iWidth: number, iHeight: number) {
	// Dump it out as an ASCII map to "Scripting.log"
	for (let iY: number = iHeight - 1; iY >= 0; iY--) {
		let str: string = '';
		if (iY % 2 == 1) {
			str += ' ';
		}
		for (let iX: number = 0; iX < iWidth; iX++) {
			if (GameplayMap.isWater(iX, iY) == false) {
				let rainfall: number = GameplayMap.getRainfall(iX, iY);
				let rainfallToDisplay: string = ' ';
				if (rainfall == (globals.g_StandardRainfall + globals.g_MountainTopIncrease)) {
					rainfallToDisplay = 'D';
				}
				else if (rainfall == globals.g_StandardRainfall) {
					rainfallToDisplay = 's';
				}
				else {
					let iNumToDisplay: number = Math.floor(rainfall / 10);
					rainfallToDisplay = iNumToDisplay.toString();
				}
				str += rainfallToDisplay + ' ';
			}
			else {
				str += '  ';
			}
		}
		console.log(str);
	}
}

export function dumpBiomes(iWidth: number, iHeight: number) {
	// Dump it out as an ASCII map to "Scripting.log"
	var biomes: number[] = new Array(GameInfo.Biomes.length);

	for (var biomeIdx = 0; biomeIdx < GameInfo.Biomes.length; biomeIdx++) {
		biomes[biomeIdx] = 0;
	}

	for (let iY: number = iHeight - 1; iY >= 0; iY--) {
		let str: string = '';
		if (iY % 2 == 1) {
			str += ' ';
		}
		for (let iX: number = 0; iX < iWidth; iX++) {
			let biome: BiomeType = GameplayMap.getBiomeType(iX, iY);
			let biomeString: string = " ";
			if (biome == globals.g_MarineBiome) {
				biomeString = ' ';
			}
			else if (biome == globals.g_PlainsBiome) {
				biomeString = "_";
			}
			else if (biome == globals.g_DesertBiome) {
				biomeString = ".";
			}
			else if (biome == globals.g_TropicalBiome) {
				biomeString = "#";
			}
			else if (biome == globals.g_TundraBiome) {
				biomeString = "*";
			}
			else if (biome == globals.g_GrasslandBiome) {
				biomeString = "~";
			}
			str += biomeString + ' ';

			if (typeof biome == 'number') {
				biomes[biome]++;
			}
		}

		console.log(str);
	}


	for (var biomeIDx = 0; biomeIDx < GameInfo.Biomes.length; biomeIDx++) {
		let str: string = '';

		str += GameInfo.Biomes[biomeIDx].Name + " ( " + biomeIDx + " ) " + " Count: " + biomes[biomeIDx];

		console.log(str);
	}
}

function getFeatureTypeIndex(name: string): FeatureType {
	const def = GameInfo.Features.lookup(name);
	if (def) {
		return def.$index;
	}
	return -1;
}

export function dumpFeatures(iWidth: number, iHeight: number) {
	// Dump it out as an ASCII map to "Scripting.log"
	console.log("Feature placement");

	const displayTypes: { index: FeatureType, ch: string }[] = [
		{ index: getFeatureTypeIndex("FEATURE_SAGEBRUSH_STEPPE"), ch: 'P' },
		{ index: getFeatureTypeIndex("FEATURE_OASIS"), ch: 'O' },
		{ index: getFeatureTypeIndex("FEATURE_DESERT_FLOODPLAIN_MINOR"), ch: 'd' },
		{ index: getFeatureTypeIndex("FEATURE_DESERT_FLOODPLAIN_NAVIGABLE"), ch: 'd' },
		{ index: getFeatureTypeIndex("FEATURE_FOREST"), ch: 'F' },
		{ index: getFeatureTypeIndex("FEATURE_MARSH"), ch: 'M' },
		{ index: getFeatureTypeIndex("FEATURE_GRASSLAND_FLOODPLAIN_MINOR"), ch: 'g' },
		{ index: getFeatureTypeIndex("FEATURE_GRASSLAND_FLOODPLAIN_NAVIGABLE"), ch: 'g' },
		{ index: getFeatureTypeIndex("FEATURE_REEF"), ch: 'E' },
		{ index: getFeatureTypeIndex("FEATURE_COLD_REEF"), ch: 'E' },
		{ index: getFeatureTypeIndex("FEATURE_ICE"), ch: 'I' },
		{ index: getFeatureTypeIndex("FEATURE_SAVANNA_WOODLAND"), ch: 'T' },
		{ index: getFeatureTypeIndex("FEATURE_WATERING_HOLE"), ch: 'W' },
		{ index: getFeatureTypeIndex("FEATURE_PLAINS_FLOODPLAIN_MINOR"), ch: 'p' },
		{ index: getFeatureTypeIndex("FEATURE_PLAINS_FLOODPLAIN_NAVIGABLE"), ch: 'p' },
		{ index: getFeatureTypeIndex("FEATURE_RAINFOREST"), ch: 'R' },
		{ index: getFeatureTypeIndex("FEATURE_MANGROVE"), ch: 'G' },
		{ index: getFeatureTypeIndex("FEATURE_TROPICAL_FLOODPLAIN_MINOR"), ch: 't' },
		{ index: getFeatureTypeIndex("FEATURE_TROPICAL_FLOODPLAIN_NAVIGABLE"), ch: 't' },
		{ index: getFeatureTypeIndex("FEATURE_TAIGA"), ch: 'T' },
		{ index: getFeatureTypeIndex("FEATURE_TUNDRA_BOG"), ch: 'B' },
		{ index: getFeatureTypeIndex("FEATURE_TUNDRA_FLOODPLAIN_MINOR"), ch: 'u' },
		{ index: getFeatureTypeIndex("FEATURE_TUNDRA_FLOODPLAIN_NAVIGABLE"), ch: 'u' },
		{ index: getFeatureTypeIndex("FEATURE_VOLCANO"), ch: '%' },
		// Wonders
		{ index: getFeatureTypeIndex("FEATURE_VALLEY_OF_FLOWERS"), ch: '@' },
		{ index: getFeatureTypeIndex("FEATURE_BARRIER_REEF"), ch: '@' },
		{ index: getFeatureTypeIndex("FEATURE_BERMUDA_TRIANGLE"), ch: '@' },
		{ index: getFeatureTypeIndex("FEATURE_REDWOOD_FOREST"), ch: '@' },
		{ index: getFeatureTypeIndex("FEATURE_GRAND_CANYON"), ch: '@' },
		{ index: getFeatureTypeIndex("FEATURE_GULLFOSS"), ch: '@' },
		{ index: getFeatureTypeIndex("FEATURE_IGUAZU_FALLS"), ch: '@' },
		{ index: getFeatureTypeIndex("FEATURE_KILIMANJARO"), ch: '@' },
		{ index: getFeatureTypeIndex("FEATURE_ZHANGJIAJIE"), ch: '@' },
		{ index: getFeatureTypeIndex("FEATURE_THERA"), ch: '@' },
		{ index: getFeatureTypeIndex("FEATURE_TORRES_DEL_PAINE"), ch: '@' },
		{ index: getFeatureTypeIndex("FEATURE_ULURU"), ch: '@' }
	];

	for (let iY: number = iHeight - 1; iY >= 0; iY--) {
		let str: string = '';
		if (iY % 2 == 1) {
			str += ' ';
		}
		for (let iX: number = 0; iX < iWidth; iX++) {
			let featureString: string = (GameplayMap.isWater(iX, iY) == false) ? '.' : ' ';
			let feature: FeatureType = GameplayMap.getFeatureType(iX, iY);
			if (feature != FeatureTypes.NO_FEATURE) {
				for (const entry of displayTypes) {
					if (entry.index == feature) {
						featureString = entry.ch;
						break;
					}
				}
			}

			str += featureString + ' ';
		}
		console.log(str);
	}
}

export function dumpResources(iWidth: number, iHeight: number) {
	// Dump it out as an ASCII map to "Scripting.log"
	var resources: number[] = new Array(GameInfo.Resources.length);

	for (var resourceIdx = 0; resourceIdx < GameInfo.Resources.length; resourceIdx++) {
		resources[resourceIdx] = 0;
	}

	for (let iY: number = iHeight - 1; iY >= 0; iY--) {
		let str: string = '';
		if (iY % 2 == 1) {
			str += ' ';
		}
		for (let iX: number = 0; iX < iWidth; iX++) {
			let resource: ResourceType = GameplayMap.getResourceType(iX, iY);
			let resourcestring: string = " ";
			if (resource != ResourceTypes.NO_RESOURCE && typeof resource == 'number') {
				resourcestring = resource.toString();
				resources[resource]++;
			}
			else {
				if (GameplayMap.isWater(iX, iY) == false) {
					resourcestring = "*";
				}
			}

			str += resourcestring + ' ';
		}

		console.log(str);
	}

	let totalCount = 0;
	for (var resourceIdx = 0; resourceIdx < GameInfo.Resources.length; resourceIdx++) {
		let str: string = '';

		str += GameInfo.Resources[resourceIdx].Name + " ( " + resourceIdx + " ) " + " Count: " + resources[resourceIdx];
		totalCount += resources[resourceIdx];

		console.log(str);
	}

	console.log("Total resources on map after generation: " + totalCount);
}

// Prints custom strings/characters for noise values based on a predicate
export function dumpNoisePredicate(iWidth: number, iHeight: number, noise: number[], pred: (value: number) => string) {
	console.log("NOISE MAP (Predicate)");
	if (!pred) {
		console.log("dumpNoiseInterp error: no predicate provided");
		return;
	}
	if (noise.length != iWidth * iHeight) {
		console.log("dumpNoiseInterp error: noise map does not match map width*height");
		return;
	}

	for (let iY: number = iHeight - 1; iY >= 0; iY--) {
		let str: string = '';
		if (iY % 2 == 1) {
			str += ' ';
		}
		for (let iX: number = 0; iX < iWidth; iX++) {
			let index = iY * iWidth + iX;
			str += pred(noise[index]);
		}

		console.log(str);
	}
}
