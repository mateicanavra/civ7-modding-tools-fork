import { shuffle } from './map-utilities.js';
import './map-globals.js';

function addNaturalWonders(iWidth, iHeight, iNumNaturalWonders, wonderEventActive = false, requestedWonders = []) {
  if (GameInfo.Feature_NaturalWonders.length < iNumNaturalWonders) {
    iNumNaturalWonders = GameInfo.Feature_NaturalWonders.length;
  }
  console.log("Generating " + iNumNaturalWonders + " Natural Wonders");
  if (wonderEventActive) {
    console.log("Race to wonders event registered");
  }
  placeWonders(iWidth, iHeight, iNumNaturalWonders, wonderEventActive, requestedWonders);
}
function placeWonders(iWidth, iHeight, iNumNaturalWonders, wonderEventActive, requestedWonders) {
  let aPossibleWonders = [];
  let iPlacedWonders = 0;
  const requests = [];
  const configRequests = Configuration.getMapValue("RequestedNaturalWonders");
  if (configRequests) {
    for (const requested of configRequests) {
      if (typeof requested == "string") {
        requests.push(Database.makeHash(requested));
      } else if (typeof requested == "number") {
        requests.push(requested);
      }
    }
  }
  for (const nwDef of GameInfo.Feature_NaturalWonders) {
    if (requestedWonders.includes(nwDef.FeatureType)) {
      requests.push(nwDef.$hash);
    }
    aPossibleWonders.push(nwDef.$hash);
  }
  if (aPossibleWonders.length > 0) {
    aPossibleWonders = shuffle(aPossibleWonders);
    for (const requested of requests) {
      const index = aPossibleWonders.indexOf(requested);
      if (index >= 1) {
        aPossibleWonders.splice(index, 1);
        aPossibleWonders.unshift(requested);
      }
    }
    for (let iI = 0; iI < aPossibleWonders.length; iI++) {
      if (iPlacedWonders < iNumNaturalWonders) {
        const eFeature = aPossibleWonders[iI];
        const nwDef = GameInfo.Feature_NaturalWonders.lookup(eFeature);
        if (nwDef != null) {
          if (nwDef.PlaceFirst == true) {
            const aPossibleLocations = [];
            for (let iY = iHeight - 1; iY >= 0; iY--) {
              for (let iX = 0; iX < iWidth; iX++) {
                const iElevation = GameplayMap.getElevation(iX, iY);
                const featureParam = {
                  Feature: eFeature,
                  Direction: nwDef.Direction,
                  Elevation: iElevation
                };
                if (TerrainBuilder.canHaveFeatureParam(iX, iY, featureParam)) {
                  if (wonderEventActive) {
                    if (GameplayMap.getHemisphere(iX) != GameplayMap.getPrimaryHemisphere()) {
                      aPossibleLocations.push(GameplayMap.getIndexFromXY(iX, iY));
                    }
                  } else {
                    aPossibleLocations.push(GameplayMap.getIndexFromXY(iX, iY));
                  }
                }
              }
            }
            if (aPossibleLocations.length > 0) {
              const randomIndex = TerrainBuilder.getRandomNumber(
                aPossibleLocations.length,
                "Natural Wonder placement location"
              );
              const placementLocation = GameplayMap.getLocationFromIndex(
                aPossibleLocations[randomIndex]
              );
              const iElevation = GameplayMap.getElevation(placementLocation.x, placementLocation.y);
              const featureParam = {
                Feature: eFeature,
                Direction: nwDef.Direction,
                Elevation: iElevation
              };
              console.log("FeatureParam Elevation: " + featureParam.Elevation);
              TerrainBuilder.setFeatureType(placementLocation.x, placementLocation.y, featureParam);
              iPlacedWonders++;
              console.log(
                "Placed A Top Priority Natural Wonder " + nwDef.FeatureType + " At X:" + placementLocation.x + " Y:" + placementLocation.y + " out of " + aPossibleLocations.length + " possible locations."
              );
            } else {
              console.log("No valid location for " + nwDef.FeatureType);
            }
          }
        }
      }
    }
    for (let iI = 0; iI < aPossibleWonders.length; iI++) {
      if (iPlacedWonders < iNumNaturalWonders) {
        const eFeature = aPossibleWonders[iI];
        const nwDef = GameInfo.Feature_NaturalWonders.lookup(eFeature);
        if (nwDef != null && nwDef.PlaceFirst == false) {
          let iPlacementPercent = nwDef.PlacementPercentage;
          if (requests.indexOf(eFeature) != -1) {
            iPlacementPercent = 100;
            console.log(nwDef.FeatureType + " is requested to be placed.");
          }
          const iRoll = TerrainBuilder.getRandomNumber(100, "Random Natural Wonder Chance");
          if (iPlacementPercent > iRoll) {
            const aPossibleLocations = [];
            for (let iY = iHeight - 1; iY >= 0; iY--) {
              for (let iX = 0; iX < iWidth; iX++) {
                const iElevation = GameplayMap.getElevation(iX, iY);
                const featureParam = {
                  Feature: eFeature,
                  Direction: nwDef.Direction,
                  Elevation: iElevation
                };
                if (TerrainBuilder.canHaveFeatureParam(iX, iY, featureParam)) {
                  if (wonderEventActive) {
                    if (GameplayMap.getHemisphere(iX) != GameplayMap.getPrimaryHemisphere()) {
                      aPossibleLocations.push(GameplayMap.getIndexFromXY(iX, iY));
                    }
                  } else {
                    aPossibleLocations.push(GameplayMap.getIndexFromXY(iX, iY));
                  }
                }
              }
            }
            if (aPossibleLocations.length > 0) {
              const randomIndex = TerrainBuilder.getRandomNumber(
                aPossibleLocations.length,
                "Natural Wonder placement location"
              );
              const placementLocation = GameplayMap.getLocationFromIndex(
                aPossibleLocations[randomIndex]
              );
              const iElevation = GameplayMap.getElevation(placementLocation.x, placementLocation.y);
              const featureParam = {
                Feature: eFeature,
                Direction: nwDef.Direction,
                Elevation: iElevation
              };
              console.log("FeatureParam Elevation: " + featureParam.Elevation);
              TerrainBuilder.setFeatureType(placementLocation.x, placementLocation.y, featureParam);
              iPlacedWonders++;
              console.log(
                "Placed A Natural Wonder " + nwDef.FeatureType + " At X:" + placementLocation.x + " Y:" + placementLocation.y + " out of " + aPossibleLocations.length + " possible locations."
              );
            } else {
              console.log("No valid location for " + nwDef.FeatureType);
            }
          }
        }
      }
    }
  }
}

export { addNaturalWonders };
//# sourceMappingURL=natural-wonder-generator.js.map
