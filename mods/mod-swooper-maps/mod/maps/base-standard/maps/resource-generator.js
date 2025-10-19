import { getMinimumResourcePlacementModifier, AVAILABLE_ON_ALL_LANDMASSES_ID, EAST_LAND_MASS_ID, WEST_LAND_MASS_ID, replaceIslandResources, shuffle } from './map-utilities.js';
import './map-globals.js';

function generateResources(iWidth, iHeight) {
  const resourceWeight = new Array(GameInfo.Resources.length);
  const resourceRunningWeight = new Array(GameInfo.Resources.length);
  const importantResourceRegionalCountHome = new Array(GameInfo.Resources.length);
  const importantResourceRegionalCountDistant = new Array(GameInfo.Resources.length);
  const resourcesPlacedCount = new Array(GameInfo.Resources.length);
  let minimumResourcePlacementModifer = getMinimumResourcePlacementModifier();
  if (minimumResourcePlacementModifer == void 0) {
    minimumResourcePlacementModifer = 0;
  }
  for (let resourceIdx = 0; resourceIdx < GameInfo.Resources.length; resourceIdx++) {
    resourceWeight[resourceIdx] = 0;
    resourceRunningWeight[resourceIdx] = 0;
    resourcesPlacedCount[resourceIdx] = 0;
  }
  const aResourceTypes = [];
  const resources = ResourceBuilder.getGeneratedMapResources();
  for (let ridx = 0; ridx < resources.length; ++ridx) {
    const resourceInfo = GameInfo.Resources.lookup(resources[ridx]);
    if (resourceInfo && resourceInfo.Tradeable) {
      resourceWeight[resourceInfo.$index] = resourceInfo.Weight;
      aResourceTypes.push(resourceInfo.$index);
      importantResourceRegionalCountHome[resourceInfo.$index] = 0;
      importantResourceRegionalCountDistant[resourceInfo.$index] = 0;
    }
  }
  const seed = GameplayMap.getRandomSeed();
  const avgDistanceBetweenPoints = 3;
  const normalizedRangeSmoothing = 2;
  const poisson = TerrainBuilder.generatePoissonMap(seed, avgDistanceBetweenPoints, normalizedRangeSmoothing);
  for (let iY = iHeight - 1; iY >= 0; iY--) {
    for (let iX = 0; iX < iWidth; iX++) {
      let plotTag = PlotTags.PLOT_TAG_NONE;
      if (GameplayMap.getPlotTag(iX, iY) & PlotTags.PLOT_TAG_EAST_LANDMASS) {
        plotTag = PlotTags.PLOT_TAG_EAST_LANDMASS;
      } else if (GameplayMap.getPlotTag(iX, iY) & PlotTags.PLOT_TAG_WEST_LANDMASS) {
        plotTag = PlotTags.PLOT_TAG_WEST_LANDMASS;
      }
      const index = iY * iWidth + iX;
      if (poisson[index] >= 1) {
        const resources2 = [];
        aResourceTypes.forEach((resourceIdx) => {
          const assignedLandmass = ResourceBuilder.getResourceLandmass(resourceIdx);
          if (assignedLandmass == AVAILABLE_ON_ALL_LANDMASSES_ID) {
            if (canHaveFlowerPlot(iX, iY, resourceIdx)) {
              resources2.push(resourceIdx);
            }
          } else if (assignedLandmass == EAST_LAND_MASS_ID && plotTag == PlotTags.PLOT_TAG_EAST_LANDMASS) {
            if (canHaveFlowerPlot(iX, iY, resourceIdx)) {
              resources2.push(resourceIdx);
            }
          } else if (assignedLandmass == WEST_LAND_MASS_ID && plotTag == PlotTags.PLOT_TAG_WEST_LANDMASS) {
            if (canHaveFlowerPlot(iX, iY, resourceIdx)) {
              resources2.push(resourceIdx);
            }
          }
        });
        if (resources2.length > 0) {
          let resourceChosen = ResourceTypes.NO_RESOURCE;
          let resourceChosenIndex = 0;
          for (let iI = 0; iI < resources2.length; iI++) {
            if (resourceChosen == ResourceTypes.NO_RESOURCE) {
              resourceChosen = resources2[iI];
              resourceChosenIndex = resources2[iI];
            } else {
              if (resourceRunningWeight[resources2[iI]] > resourceRunningWeight[resourceChosenIndex]) {
                resourceChosen = resources2[iI];
                resourceChosenIndex = resources2[iI];
              } else if (resourceRunningWeight[resources2[iI]] == resourceRunningWeight[resourceChosenIndex]) {
                const iRoll = TerrainBuilder.getRandomNumber(2, "Resource Scatter");
                if (iRoll >= 1) {
                  resourceChosen = resources2[iI];
                  resourceChosenIndex = resources2[iI];
                }
              }
            }
          }
          if (resourceChosen != ResourceTypes.NO_RESOURCE) {
            const iResourcePlotIndex = getFlowerPlot(iX, iY, resourceChosen);
            if (iResourcePlotIndex != -1) {
              const iLocation = GameplayMap.getLocationFromIndex(iResourcePlotIndex);
              const iResourceX = iLocation.x;
              const iResourceY = iLocation.y;
              ResourceBuilder.setResourceType(iResourceX, iResourceY, resourceChosen);
              resourceRunningWeight[resourceChosenIndex] -= resourceWeight[resourceChosenIndex];
              resourcesPlacedCount[resourceChosenIndex]++;
              plotTag == PlotTags.PLOT_TAG_EAST_LANDMASS ? importantResourceRegionalCountHome[resourceChosenIndex]++ : importantResourceRegionalCountDistant[resourceChosenIndex]++;
            } else {
              console.log("Resource Index Failure");
            }
          } else {
            console.log("Resource Type Failure");
          }
        }
      }
    }
  }
  let checkHomeHemisphereLP = true;
  let checkDistantHemisphereLP = true;
  for (let iY = 0; iY < iHeight; iY++) {
    for (let iX = 0; iX < iWidth; iX++) {
      let plotTag = PlotTags.PLOT_TAG_NONE;
      if (GameplayMap.getPlotTag(iX, iY) & PlotTags.PLOT_TAG_EAST_LANDMASS) {
        plotTag = PlotTags.PLOT_TAG_EAST_LANDMASS;
      } else if (GameplayMap.getPlotTag(iX, iY) & PlotTags.PLOT_TAG_WEST_LANDMASS) {
        plotTag = PlotTags.PLOT_TAG_WEST_LANDMASS;
      }
      const resourceAtLocation = GameplayMap.getResourceType(iX, iY);
      if (resourceAtLocation == ResourceTypes.NO_RESOURCE) {
        const resourcesEligible = [];
        for (let i = 0; i < resourcesPlacedCount.length; ++i) {
          const resourceToPlace = GameInfo.Resources.lookup(i);
          if (resourceToPlace) {
            const assignedLandmass = ResourceBuilder.getResourceLandmass(i);
            if (assignedLandmass == AVAILABLE_ON_ALL_LANDMASSES_ID || assignedLandmass == EAST_LAND_MASS_ID && plotTag == PlotTags.PLOT_TAG_EAST_LANDMASS || assignedLandmass == WEST_LAND_MASS_ID && plotTag == PlotTags.PLOT_TAG_WEST_LANDMASS) {
              const minimumPerLandMass = resourceToPlace.MinimumPerHemisphere > 0 ? resourceToPlace.MinimumPerHemisphere + minimumResourcePlacementModifer : 0;
              if (plotTag == PlotTags.PLOT_TAG_EAST_LANDMASS && importantResourceRegionalCountHome[i] < minimumPerLandMass || plotTag == PlotTags.PLOT_TAG_WEST_LANDMASS && importantResourceRegionalCountDistant[i] < minimumPerLandMass) {
                if (checkHomeHemisphereLP && plotTag == PlotTags.PLOT_TAG_EAST_LANDMASS) {
                  checkHomeHemisphereLP = ResourceBuilder.isResourceClassRequiredForLegacyPath(
                    i,
                    plotTag
                  );
                } else if (checkDistantHemisphereLP && plotTag == PlotTags.PLOT_TAG_WEST_LANDMASS) {
                  checkDistantHemisphereLP = ResourceBuilder.isResourceClassRequiredForLegacyPath(
                    i,
                    plotTag
                  );
                }
                if (ResourceBuilder.isResourceRequiredForAge(i)) {
                  if (ResourceBuilder.canHaveResource(iX, iY, i, false)) {
                    let hasAdjResource = false;
                    for (let iDirection = 0; iDirection < DirectionTypes.NUM_DIRECTION_TYPES; iDirection++) {
                      const iIndex = GameplayMap.getIndexFromXY(iX, iY);
                      const iLocation = GameplayMap.getLocationFromIndex(iIndex);
                      const iAdjacentX = GameplayMap.getAdjacentPlotLocation(
                        iLocation,
                        iDirection
                      ).x;
                      const iAdjacentY = GameplayMap.getAdjacentPlotLocation(
                        iLocation,
                        iDirection
                      ).y;
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
        let resourceChosenIndex = -1;
        if (resourcesEligible.length > 0) {
          let resourceChosen = ResourceTypes.NO_RESOURCE;
          for (let iI = 0; iI < resourcesEligible.length; iI++) {
            if (resourceChosen == ResourceTypes.NO_RESOURCE) {
              resourceChosen = resourcesEligible[iI];
              resourceChosenIndex = resourcesEligible[iI];
            } else {
              if (resourceRunningWeight[resourcesEligible[iI]] > resourceRunningWeight[resourceChosenIndex]) {
                resourceChosen = resourcesEligible[iI];
                resourceChosenIndex = resourcesEligible[iI];
              } else if (resourceRunningWeight[resourcesEligible[iI]] == resourceRunningWeight[resourceChosenIndex]) {
                const iRoll = TerrainBuilder.getRandomNumber(2, "Resource Scatter");
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
          const name = GameInfo.Resources.lookup(resourceChosenIndex)?.Name;
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
    for (const option of GameInfo.MapIslandBehavior) {
      if (option.MapType === mapType) {
        replaceIslandResources(iWidth, iHeight, option.ResourceClassType);
      }
    }
  }
}
function canHaveFlowerPlot(iX, iY, resourceType) {
  if (ResourceBuilder.canHaveResource(iX, iY, resourceType, false)) {
    return true;
  }
  for (let iDirection = 0; iDirection < DirectionTypes.NUM_DIRECTION_TYPES; iDirection++) {
    const iIndex = GameplayMap.getIndexFromXY(iX, iY);
    const iLocation = GameplayMap.getLocationFromIndex(iIndex);
    const iAdjacentX = GameplayMap.getAdjacentPlotLocation(iLocation, iDirection).x;
    const iAdjacentY = GameplayMap.getAdjacentPlotLocation(iLocation, iDirection).y;
    if (ResourceBuilder.canHaveResource(iAdjacentX, iAdjacentY, resourceType, false)) {
      return true;
    }
  }
  return false;
}
function getFlowerPlot(iX, iY, resourceType) {
  if (ResourceBuilder.canHaveResource(iX, iY, resourceType, false)) {
    return GameplayMap.getIndexFromXY(iX, iY);
  }
  const resourcePlotIndexes = [];
  for (let iDirection = 0; iDirection < DirectionTypes.NUM_DIRECTION_TYPES; iDirection++) {
    const iIndex = GameplayMap.getIndexFromXY(iX, iY);
    const iLocation = GameplayMap.getLocationFromIndex(iIndex);
    const iAdjacentX = GameplayMap.getAdjacentPlotLocation(iLocation, iDirection).x;
    const iAdjacentY = GameplayMap.getAdjacentPlotLocation(iLocation, iDirection).y;
    const iAdjacentIndex = GameplayMap.getIndexFromXY(iAdjacentX, iAdjacentY);
    if (ResourceBuilder.canHaveResource(iAdjacentX, iAdjacentY, resourceType, false)) {
      resourcePlotIndexes.push(iAdjacentIndex);
    }
  }
  if (resourcePlotIndexes.length > 0) {
    return shuffle(resourcePlotIndexes)[0];
  } else {
    return -1;
  }
}

export { canHaveFlowerPlot, generateResources, getFlowerPlot };
//# sourceMappingURL=resource-generator.js.map
