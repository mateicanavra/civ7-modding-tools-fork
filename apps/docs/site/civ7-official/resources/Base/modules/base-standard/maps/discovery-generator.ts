//import * as utilities from '/base-standard/maps/map-utilities.js';
//import
import * as globals from '/base-standard/maps/map-globals.js';
import { getDistanceToClosestStart } from '/base-standard/maps/map-utilities.js';
//import { assignStartPositions, chooseStartSectors } from '/base-standard/maps/assign-starting-plots.js';

export function generateDiscoveries(iWidth: number, iHeight: number, startingPositions: number[]) {

	if (GameInfo.Ages.lookup(Game.age)!.GenerateDiscoveries == false) {
		console.log("DISCOVERIES TURNED OFF FOR " + Game.age);
		return;
	}
	if (Configuration.getGameValue("DiscoverySiftingType") == 0x8A0F94F9) {
		console.log("DISCOVERIES TURNED OFF");
		return;
	}

	console.log("Discovery generation", iWidth, iHeight);

	let discoveryCounter = 0;
	let oceanDiscoveryCounter = 0;
	let discoveryPlacedCounter = 0;
	let totalCoastalDiscoveryNotPlaced = 0;
	let totalOceanDiscoveryNotPlaced = 0;
	let seed = GameplayMap.getRandomSeed();
	let avgDistanceBetweenPoints = 5;
	let normalizedRangeSmoothing = 2;
	let poisson = TerrainBuilder.generatePoissonMap(seed, avgDistanceBetweenPoints, normalizedRangeSmoothing);
	var distanceToClosestStart = 0;


	//Rough boundaries so the main continents don't get ship wreck discoveries at the poles.  Used the continents plus model
	let uiMapSize = GameplayMap.getMapSize();
	let mapInfo = GameInfo.Maps.lookup(uiMapSize);
	if (mapInfo == null) {
		console.log("Skipping discoveries.  No mapInfo for map of size ", uiMapSize);
		return;
	}

	let iOceanWaterColumns = (globals.g_OceanWaterColumns + mapInfo.OceanWidth) * 1.75;
	let westContinent: ContinentBoundary = {
		west: iOceanWaterColumns / 2,
		east: (iWidth / 2) - (iOceanWaterColumns / 2),
		south: 0,
		north: 0,
		continent: 0
	};
	let eastContinent: ContinentBoundary = {
		west: (iWidth / 2) + (iOceanWaterColumns / 2),
		east: iWidth - (iOceanWaterColumns / 2),
		south: 0,
		north: 0,
		continent: 0
	};

	function DiscoveryDiceRoller() {
		var randomthing = TerrainBuilder.getRandomNumber(100, "Discovery Type Roll");
		if (randomthing <= 65) {
			return DiscoveryActivationTypes.BASIC
		} else if (randomthing <= 100) {
			return DiscoveryActivationTypes.INVESTIGATION
		} else {
			return DiscoveryActivationTypes.MYTHIC
		}
	}

	function DiscoveryVisualString(numb: number) {
		switch (numb) {
			case DiscoveryVisualTypes.IMPROVEMENT_CAVE:
				return "Cave";
			case DiscoveryVisualTypes.IMPROVEMENT_RUINS:
				return "Ruins";
			case DiscoveryVisualTypes.IMPROVEMENT_CAMPFIRE:
				return "Campfire";
			case DiscoveryVisualTypes.IMPROVEMENT_TENTS:
				return "Tents";
			case DiscoveryVisualTypes.IMPROVEMENT_CAIRN:
				return "Cairn";
			case DiscoveryVisualTypes.IMPROVEMENT_RICH:
				return "Rich";
			case DiscoveryVisualTypes.IMPROVEMENT_WRECKAGE:
				return "Wreckage";
			default:
				return "";
		}
	}

	function DiscoveryTypeString(numb: number) {
		switch (numb) {
			case DiscoveryActivationTypes.BASIC:
				return "Basic";
			case DiscoveryActivationTypes.INVESTIGATION:
				return "Investigation";
			default:
				return "Unknown";
		}
	}

	function AllowedDiscoveryVisual(numb: number) {
		switch (numb) {
			case DiscoveryVisualTypes.IMPROVEMENT_CAVE:
			case DiscoveryVisualTypes.IMPROVEMENT_RUINS:
			case DiscoveryVisualTypes.IMPROVEMENT_CAMPFIRE:
			case DiscoveryVisualTypes.IMPROVEMENT_TENTS:
			case DiscoveryVisualTypes.IMPROVEMENT_CAIRN:
			case DiscoveryVisualTypes.IMPROVEMENT_RICH:
			case DiscoveryVisualTypes.IMPROVEMENT_WRECKAGE:
				return true
			default:
				return false
		}
	}

	function AllowedDiscoveryVisualExploration(numb: number) {
		switch (numb) {
			case DiscoveryVisualTypes.IMPROVEMENT_CAVE:
			case DiscoveryVisualTypes.IMPROVEMENT_RUINS:
			case DiscoveryVisualTypes.IMPROVEMENT_TENTS:
			case DiscoveryVisualTypes.IMPROVEMENT_CAIRN:
			case DiscoveryVisualTypes.IMPROVEMENT_RICH:
			case DiscoveryVisualTypes.IMPROVEMENT_WRECKAGE:
				return true
			default:
				return false
		}
	}

	console.log("counting");
	console.log(DiscoveryVisualTypes.IMPROVEMENT_CAVE)

	let basicsMap: [DiscoveryVisualTypes, number][] = [];
	let investigationMap: [DiscoveryVisualTypes, number][] = [];
	if (Game.age == Database.makeHash("AGE_EXPLORATION")) {

		GameInfo.DiscoverySiftingImprovements.forEach(discoverySift => {
			if (AllowedDiscoveryVisualExploration(Database.makeHash(discoverySift.ConstructibleType))) {
				let amount = GameInfo.NarrativeStories.filter(def => def.Queue == discoverySift.QueueType).length
				if (amount > 0) {
					if (discoverySift.Activation === "BASIC") {
						basicsMap.push([Database.makeHash(discoverySift.ConstructibleType), amount]);
					}
					else if (discoverySift.Activation === "INVESTIGATION") {
						investigationMap.push([Database.makeHash(discoverySift.ConstructibleType), amount]);
					}
				}
			}
		});
	} else {
		GameInfo.DiscoverySiftingImprovements.forEach(discoverySift => {

			if (AllowedDiscoveryVisual(Database.makeHash(discoverySift.ConstructibleType))) {
				let amount = GameInfo.NarrativeStories.filter(def => def.Queue == discoverySift.QueueType).length
				if (amount > 0) {
					if (discoverySift.Activation === "BASIC") {
						basicsMap.push([Database.makeHash(discoverySift.ConstructibleType), amount]);
					}
					else if (discoverySift.Activation === "INVESTIGATION") {
						investigationMap.push([Database.makeHash(discoverySift.ConstructibleType), amount]);
					}
				}
			}
		});
	}

	console.log("poisson number?: " + poisson);
	for (let iY: number = iHeight - 1; iY >= 0; iY--) {
		for (let iX: number = 0; iX < iWidth; iX++) {
			let index = iY * iWidth + iX;
			if (poisson[index] >= 1) {

				let iLocation: PlotCoord = GameplayMap.getLocationFromIndex(index);
				var terrainType = GameplayMap.getTerrainType(iX, iY);
				// don't place on settlements
				if (startingPositions.length > 0) {
					distanceToClosestStart = getDistanceToClosestStart(iX, iY, startingPositions.length, startingPositions)
					if (distanceToClosestStart < globals.g_RequiredDistanceFromMajorForDiscoveries) {
						continue;
					}
				}
				else {
					// don't place in owned territory
					let owner = GameplayMap.getOwner(iX, iY);
					if (owner != PlayerIds.NO_PLAYER) {
						console.log("Can't Place Discovery, tile already owned: ", "X=" + iLocation.x + " Y=" + iLocation.y);
						continue;
					}
				}

				// don't place on mountains / impassible
				if (GameplayMap.isImpassable(iX, iY)) {
					continue;
				}


				// don't place on navigable Rivers.
				if (GameplayMap.isNavigableRiver(iX, iY)) {
					continue;
				}

				var resourceAtThisLocal = GameplayMap.getResourceType(iX, iY);

				// don't place on resources
				if (resourceAtThisLocal !== -1) {
					continue;

				}

				// don't place on natural wonders
				if (GameplayMap.isNaturalWonder(iX, iY)) {
					continue;
				}

				//check  to see if on coast to place the Coast discovery. Doing this before the water check, since Coast Terrain counts as water.
				if (terrainType === globals.g_CoastTerrain && TerrainBuilder.getRandomNumber(100, "Coast Check") >= 65) {
					let discoveryType = DiscoveryDiceRoller();
					discoveryCounter++;
					if (MapConstructibles.addDiscovery(iX, iY, DiscoveryVisualTypes.IMPROVEMENT_COAST, discoveryType)) {
						discoveryPlacedCounter++;
						console.log("Discovery #", discoveryCounter);
						console.log("VALID coastal DISCOVERY SPOT FOUND!-------------------------------------", "X=" + iLocation.x + " Y=" + iLocation.y)
						continue;
					} else {
						++totalCoastalDiscoveryNotPlaced;
						console.log("did not place COASTAL Discovery#: " + discoveryCounter);
						continue;
					}

				}

				if (terrainType === globals.g_OceanTerrain) {
					if (Game.age == Database.makeHash("AGE_EXPLORATION") && TerrainBuilder.getRandomNumber(100, "Coast Check") >= 65) {
						if ((iX < westContinent.west) || (iX > westContinent.east && iX < eastContinent.west) || (iX > eastContinent.east)) {
							let discoveryType = DiscoveryDiceRoller();
							discoveryCounter++;
							if (MapConstructibles.addDiscovery(iX, iY, DiscoveryVisualTypes.IMPROVEMENT_SHIPWRECK, discoveryType)) {
								discoveryPlacedCounter++;
								oceanDiscoveryCounter++;
								console.log("Discovery #", discoveryCounter)
								console.log("VALID coastal DISCOVERY SPOT FOUND!-------------------------------------", "X=" + iLocation.x + " Y=" + iLocation.y)
								continue;
							} else {
								++totalOceanDiscoveryNotPlaced;
								console.log("did not place OCEAN discovery#: " + discoveryCounter)
								continue
							}
						}
					}
				}
				// don't place on water (like in the Ocean tiles)
				if (GameplayMap.isWater(iX, iY)) {
					continue

				}

				discoveryCounter++;
				let discoveryType = DiscoveryDiceRoller();
				let discoveryTypeString = DiscoveryTypeString(discoveryType);
				let discoveryHash = DiscoveryVisualTypes.INVALID;
				let visualIndex = -1
				if (discoveryType == DiscoveryActivationTypes.BASIC) {
					if (basicsMap.length > 0) {
						visualIndex = TerrainBuilder.getRandomNumber(basicsMap.length, "Discovery roll");
						discoveryHash = basicsMap[visualIndex][0];
					}
				}
				else {
					if (investigationMap.length > 0) {
						visualIndex = TerrainBuilder.getRandomNumber(investigationMap.length, "Discovery roll");
						discoveryHash = investigationMap[visualIndex][0];
					}
				}
				let discoveryVisual = DiscoveryVisualString(discoveryHash);
				if (discoveryHash == DiscoveryVisualTypes.INVALID) {
					console.log("Could not find available discovery: ", discoveryTypeString, "Discovery#: ", discoveryCounter);
					continue;
				}
				//place the discovery code:
				if (Game.age == Database.makeHash("AGE_EXPLORATION")) {
					console.log("in exploration age");
					console.log("Discovery #", discoveryCounter)
					console.log("VALID DISCOVERY SPOT FOUND-------------------------------------", "X=" + iLocation.x + " Y=" + iLocation.y + "  Type: " + discoveryVisual);
					if (MapConstructibles.addDiscovery(iX, iY, discoveryHash, discoveryType)) {

						if (discoveryType == DiscoveryActivationTypes.BASIC) {
							--basicsMap[visualIndex][1];
							if (basicsMap[visualIndex][1] < 1) {
								console.log("No more ", discoveryTypeString, discoveryVisual)
								basicsMap.splice(visualIndex, 1);
							}
						} else {
							--investigationMap[visualIndex][1];
							if (investigationMap[visualIndex][1] < 1) {
								console.log("No more ", discoveryTypeString, discoveryVisual)
								investigationMap.splice(visualIndex, 1);
							}
						}
						discoveryPlacedCounter++;
						let discoveryX = iX;
						let discoveryY = iY;

						console.log(discoveryX, discoveryY, discoveryVisual, discoveryTypeString);
					} else {
						console.log("did not place discovery#: " + discoveryCounter + " discovery visual: " + discoveryVisual + " discovery type: " + discoveryTypeString);
					}
				} else {
					console.log("in antiquity age")
					console.log("Discovery #", discoveryCounter)
					console.log("VALID DISCOVERY SPOT FOUND-------------------------------------", "X=" + iLocation.x + " Y=" + iLocation.y + "  Type: " + discoveryVisual);
					if (MapConstructibles.addDiscovery(iX, iY, discoveryHash, discoveryType)) {
						if (discoveryType == DiscoveryActivationTypes.BASIC) {
							--basicsMap[visualIndex][1];
							if (basicsMap[visualIndex][1] < 1) {
								console.log("No more ", discoveryTypeString, discoveryVisual)
								basicsMap.splice(visualIndex, 1);
							}
						} else {
							--investigationMap[visualIndex][1];
							if (investigationMap[visualIndex][1] < 1) {
								console.log("No more ", discoveryTypeString, discoveryVisual)
								investigationMap.splice(visualIndex, 1);
							}
						}
						discoveryPlacedCounter++;
						let discoveryX = iX;
						let discoveryY = iY;

						console.log(discoveryX, discoveryY, discoveryVisual, discoveryTypeString);
					} else {
						console.log("did not place discovery#: " + discoveryCounter + " discovery visual: " + discoveryVisual + " discovery type: " + discoveryTypeString);
					}
				}
			}
		}
	}
	console.log("Basics: ");
	for (const [key, value] of basicsMap) {
		console.log(key, "->", value)
	}
	console.log("investigations: ");
	for (const [key, value] of investigationMap) {
		console.log(key, "->", value)
	}

	console.log("Total Discoveries Placed: " + discoveryPlacedCounter);
	console.log("Total ocean Discoveries Placed: " + oceanDiscoveryCounter);
	console.log("Total Coastal Discoveries Not Placed: " + totalCoastalDiscoveryNotPlaced);
	console.log("Total Ocean Discoveries Not Placed: " + totalOceanDiscoveryNotPlaced);
	console.log("could not place this many discoveries: " + (discoveryCounter - discoveryPlacedCounter));

}
