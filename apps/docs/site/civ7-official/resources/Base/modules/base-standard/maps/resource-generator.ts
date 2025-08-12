import * as utilities from '/base-standard/maps/map-utilities.js';

export function generateResources(iWidth: number, iHeight: number) {
	let resourceWeight: number[] = new Array(GameInfo.Resources.length);
	let resourceRunningWeight: number[] = new Array(GameInfo.Resources.length);
	let importantResourceRegionalCountHome: number[] = new Array(GameInfo.Resources.length);
	let importantResourceRegionalCountDistant: number[] = new Array(GameInfo.Resources.length);
	let resourcesPlacedCount: number[] = new Array(GameInfo.Resources.length);
	let minimumResourcePlacementModifer = utilities.getMinimumResourcePlacementModifier();
	if (minimumResourcePlacementModifer == undefined)
	{
		minimumResourcePlacementModifer = 0;
	}
	//Initial Resource data
	for (var resourceIdx = 0; resourceIdx < GameInfo.Resources.length; resourceIdx++) {
		resourceWeight[resourceIdx] = 0;
		resourceRunningWeight[resourceIdx] = 0;
		resourcesPlacedCount[resourceIdx] = 0;
	}

	// Find all resources
	let aResourceTypes: number[] = [];
	let resources: ResourceType[] = ResourceBuilder.getGeneratedMapResources();
	for (let ridx: number = 0; ridx < resources.length; ++ridx) 
	{
		var resourceInfo = GameInfo.Resources.lookup(resources[ridx]);
		if (resourceInfo && resourceInfo.Tradeable) {
			resourceWeight[resourceInfo.$index] = resourceInfo.Weight;
			aResourceTypes.push(resourceInfo.$index);
			importantResourceRegionalCountHome[resourceInfo.$index] = 0;
			importantResourceRegionalCountDistant[resourceInfo.$index] = 0;
		}
	}

	//Generate Poisson Map
	let seed = GameplayMap.getRandomSeed();
	let avgDistanceBetweenPoints = 3;
	let normalizedRangeSmoothing = 2;
	let poisson = TerrainBuilder.generatePoissonMap(seed, avgDistanceBetweenPoints, normalizedRangeSmoothing);

	for (let iY: number = iHeight - 1; iY >= 0; iY--) {
		for (let iX: number = 0; iX < iWidth; iX++) {
			let plotTag = PlotTags.PLOT_TAG_NONE;
			if (GameplayMap.getPlotTag(iX, iY) & PlotTags.PLOT_TAG_EAST_LANDMASS) {
				plotTag = PlotTags.PLOT_TAG_EAST_LANDMASS;
			} 
			else if (GameplayMap.getPlotTag(iX, iY) & PlotTags.PLOT_TAG_WEST_LANDMASS) {
				plotTag = PlotTags.PLOT_TAG_WEST_LANDMASS;
			}
			let index = iY * iWidth + iX;
			if (poisson[index] >= 1) {
				
				//Generate a list of valid resources at this plot
				let resources: number[] = [];

				aResourceTypes.forEach(resourceIdx => {
					//let iBuffer: number = Math.floor(iWidth / 28.0);
					let assignedLandmass = ResourceBuilder.getResourceLandmass(resourceIdx);
					if (assignedLandmass == utilities.AVAILABLE_ON_ALL_LANDMASSES_ID) {
						if (canHaveFlowerPlot(iX, iY, resourceIdx)) {
							resources.push(resourceIdx);
						}
					}
					else if (assignedLandmass == utilities.EAST_LAND_MASS_ID && plotTag == PlotTags.PLOT_TAG_EAST_LANDMASS) {
						if (canHaveFlowerPlot(iX, iY, resourceIdx)) {
							resources.push(resourceIdx);
						}
					}
					else if (assignedLandmass == utilities.WEST_LAND_MASS_ID && plotTag == PlotTags.PLOT_TAG_WEST_LANDMASS) {
						if (canHaveFlowerPlot(iX, iY, resourceIdx)) {
							resources.push(resourceIdx);
						}
					}
				});

				//Select the heighest weighted (ties are a coin flip) resource
				if (resources.length > 0) {
					let resourceChosen: ResourceType = ResourceTypes.NO_RESOURCE;
					let resourceChosenIndex: number = 0
					for (let iI = 0; iI < resources.length; iI++) {
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

					//Place the selected resource
					if (resourceChosen != ResourceTypes.NO_RESOURCE) {
						let iResourcePlotIndex: number = getFlowerPlot(iX, iY, resourceChosen);
						if (iResourcePlotIndex != -1) {
							let iLocation: PlotCoord = GameplayMap.getLocationFromIndex(iResourcePlotIndex);
							let iResourceX: number = iLocation.x;
							let iResourceY: number = iLocation.y;
							ResourceBuilder.setResourceType(iResourceX, iResourceY, resourceChosen);
							resourceRunningWeight[resourceChosenIndex] -= resourceWeight[resourceChosenIndex];
							resourcesPlacedCount[resourceChosenIndex]++;

							plotTag == PlotTags.PLOT_TAG_EAST_LANDMASS ? importantResourceRegionalCountHome[resourceChosenIndex]++ : importantResourceRegionalCountDistant[resourceChosenIndex]++;
						}
						else {
							console.log("Resource Index Failure");
						}
					}
					else {
						console.log("Resource Type Failure");
					}
				}
			}
		}
	}

	//Some resources are required for gameplay for the age, if not enough were generated, place them on the map now. Some differences from transition placement but might want to look at making a utility function for these placements.
	let checkHomeHemisphereLP = true;
	let checkDistantHemisphereLP = true;
	for (let iY = 0; iY < iHeight; iY++) {
		for (let iX = 0; iX < iWidth; iX++) {
			let plotTag = PlotTags.PLOT_TAG_NONE;
			if (GameplayMap.getPlotTag(iX, iY) & PlotTags.PLOT_TAG_EAST_LANDMASS) {
				plotTag = PlotTags.PLOT_TAG_EAST_LANDMASS;
			} 
			else if (GameplayMap.getPlotTag(iX, iY) & PlotTags.PLOT_TAG_WEST_LANDMASS) {
				plotTag = PlotTags.PLOT_TAG_WEST_LANDMASS;
			}
			let resourceAtLocation = GameplayMap.getResourceType(iX, iY);
			if (resourceAtLocation == ResourceTypes.NO_RESOURCE) {
				let resourcesEligible: number[] = [];
				for (let i = 0; i < resourcesPlacedCount.length; ++i) {
					let resourceToPlace = GameInfo.Resources.lookup(i);
					if (resourceToPlace) {
						let assignedLandmass = ResourceBuilder.getResourceLandmass(i);
						if (assignedLandmass == utilities.AVAILABLE_ON_ALL_LANDMASSES_ID || ((assignedLandmass == utilities.EAST_LAND_MASS_ID && plotTag == PlotTags.PLOT_TAG_EAST_LANDMASS) || (assignedLandmass == utilities.WEST_LAND_MASS_ID && plotTag == PlotTags.PLOT_TAG_WEST_LANDMASS))) {
							let minimumPerLandMass = resourceToPlace.MinimumPerHemisphere > 0 ? resourceToPlace.MinimumPerHemisphere + minimumResourcePlacementModifer : 0;
							if (plotTag == PlotTags.PLOT_TAG_EAST_LANDMASS && importantResourceRegionalCountHome[i] < minimumPerLandMass || plotTag == PlotTags.PLOT_TAG_WEST_LANDMASS && importantResourceRegionalCountDistant[i] < minimumPerLandMass) {
								//Once LP class checks are complete, no need to do them anymore
								if (checkHomeHemisphereLP && plotTag == PlotTags.PLOT_TAG_EAST_LANDMASS ) {
									checkHomeHemisphereLP = ResourceBuilder.isResourceClassRequiredForLegacyPath(i, plotTag);
								} else if (checkDistantHemisphereLP && plotTag == PlotTags.PLOT_TAG_WEST_LANDMASS) {
									checkDistantHemisphereLP = ResourceBuilder.isResourceClassRequiredForLegacyPath(i, plotTag);
								}
								if (ResourceBuilder.isResourceRequiredForAge(i)) {
									if (ResourceBuilder.canHaveResource(iX, iY, i, false)) {

										//Try not to place adjacent to other resources. The new Poission map causes the old one to be ignored, which causes clumping.
										let hasAdjResource = false;
										for (let iDirection: DirectionTypes = 0; iDirection < DirectionTypes.NUM_DIRECTION_TYPES; iDirection++) {
											let iIndex: number = GameplayMap.getIndexFromXY(iX, iY);
											let iLocation: PlotCoord = GameplayMap.getLocationFromIndex(iIndex);
											let iAdjacentX: number = GameplayMap.getAdjacentPlotLocation(iLocation, iDirection).x;
											let iAdjacentY: number = GameplayMap.getAdjacentPlotLocation(iLocation, iDirection).y;
											if (GameplayMap.getResourceType(iAdjacentX, iAdjacentY) != ResourceTypes.NO_RESOURCE) {
												hasAdjResource = true;
												break;
											}
										}

										if (!hasAdjResource) {
											resourcesEligible.push(i);
										}
									}
								}
							}
						}
					}
				}

				//Select the heighest weighted (ties are a coin flip) resource
				let resourceChosenIndex: number = -1;
				if (resourcesEligible.length > 0) {
					let resourceChosen: ResourceType = ResourceTypes.NO_RESOURCE;
					for (let iI = 0; iI < resourcesEligible.length; iI++) {
						if (resourceChosen == ResourceTypes.NO_RESOURCE) {
							resourceChosen = resourcesEligible[iI];
							resourceChosenIndex = resourcesEligible[iI];
						}
						else {
							if (resourceRunningWeight[resourcesEligible[iI]] > resourceRunningWeight[resourceChosenIndex]) {
								resourceChosen = resourcesEligible[iI];
								resourceChosenIndex = resourcesEligible[iI];
							}
							else if (resourceRunningWeight[resourcesEligible[iI]] == resourceRunningWeight[resourceChosenIndex]) {
								let iRoll = TerrainBuilder.getRandomNumber(2, "Resource Scatter");
								if (iRoll >= 1) {
									resourceChosen = resourcesEligible[iI];
									resourceChosenIndex = resourcesEligible[iI];
								}
							}
						}
					}
				}

				if (resourceChosenIndex > -1) {
					ResourceBuilder.setResourceType(iX, iY, resourceChosenIndex);
					resourceRunningWeight[resourceChosenIndex] -= resourceWeight[resourceChosenIndex];
					let name: any = GameInfo.Resources.lookup(resourceChosenIndex)?.Name;
					console.log("Force Placed " + Locale.compose(name) + " at (" + iX + ", " + iY + ")");
					plotTag == PlotTags.PLOT_TAG_EAST_LANDMASS ? importantResourceRegionalCountHome[resourceChosenIndex]++ : importantResourceRegionalCountDistant[resourceChosenIndex]++;
					break;
				}
			}
		}
	}

	const definition = GameInfo.Ages.lookup(Game.age);
	if (definition) {
		const mapType = Configuration.getMapValue("Name");
		for (let option of GameInfo.MapIslandBehavior) {
			if (option.MapType === mapType ) {
				utilities.replaceIslandResources(iWidth, iHeight, option.ResourceClassType);
			}
		}
	}
}

//Can I have a resource in this flower?
export function canHaveFlowerPlot(iX: number, iY: number, resourceType: ResourceType): boolean {
	if (ResourceBuilder.canHaveResource(iX, iY, resourceType, false)) {
		return true;
	}

	for (let iDirection: DirectionTypes = 0; iDirection < DirectionTypes.NUM_DIRECTION_TYPES; iDirection++) {
		let iIndex: number = GameplayMap.getIndexFromXY(iX, iY);
		let iLocation: PlotCoord = GameplayMap.getLocationFromIndex(iIndex);
		let iAdjacentX: number = GameplayMap.getAdjacentPlotLocation(iLocation, iDirection).x;
		let iAdjacentY: number = GameplayMap.getAdjacentPlotLocation(iLocation, iDirection).y;
		if (ResourceBuilder.canHaveResource(iAdjacentX, iAdjacentY, resourceType, false)) {
			return true;
		}
	}

	return false;
}

//Return a plot index for this resource
//First choosing the initial plot, otherwise it randomly chooses a valid plot from the sorounding ring
export function getFlowerPlot(iX: number, iY: number, resourceType: ResourceType): number {
	if (ResourceBuilder.canHaveResource(iX, iY, resourceType, false)) {
		return GameplayMap.getIndexFromXY(iX, iY);
	}

	let resourcePlotIndexes: number[] = [];
	for (let iDirection: DirectionTypes = 0; iDirection < DirectionTypes.NUM_DIRECTION_TYPES; iDirection++) {
		let iIndex: number = GameplayMap.getIndexFromXY(iX, iY);
		let iLocation: PlotCoord = GameplayMap.getLocationFromIndex(iIndex);
		let iAdjacentX: number = GameplayMap.getAdjacentPlotLocation(iLocation, iDirection).x;
		let iAdjacentY: number = GameplayMap.getAdjacentPlotLocation(iLocation, iDirection).y;
		let iAdjacentIndex: number = GameplayMap.getIndexFromXY(iAdjacentX, iAdjacentY);
		if (ResourceBuilder.canHaveResource(iAdjacentX, iAdjacentY, resourceType, false)) {
			resourcePlotIndexes.push(iAdjacentIndex);
		}
	}

	if (resourcePlotIndexes.length > 0) {
		return utilities.shuffle(resourcePlotIndexes)[0];
	}
	else {
		return -1;
	}
}
