import * as utilities from '/base-standard/maps/map-utilities.js';
/** Add Natural Wonders to the map.
 * @param iWidth - the width of the map
 * @param iHeight - the height of the map
 * @param iNumNaturalWonders - the total number of natural wonders *requested*.  The function may not be able to place that many wonders
 */
export function addNaturalWonders(iWidth, iHeight, iNumNaturalWonders, wonderEventActive = false, requestedWonders = []) {
    if (GameInfo.Feature_NaturalWonders.length < iNumNaturalWonders) {
        iNumNaturalWonders = GameInfo.Feature_NaturalWonders.length;
    }
    console.log("Generating " + iNumNaturalWonders + " Natural Wonders");
    if (wonderEventActive) {
        console.log("Race to wonders event registered");
    }
    placeWonders(iWidth, iHeight, iNumNaturalWonders, wonderEventActive, requestedWonders);
}
/** Try and place the requested number of Natural Wonders
 * @param iWidth - the width of the map
 * @param iHeight - the height of the map
 * @param iNumNaturalWonders - the total number of natural wonders *requested*.  The function may not be able to place that many wonders
*/
function placeWonders(iWidth, iHeight, iNumNaturalWonders, wonderEventActive, requestedWonders) {
    let aPossibleWonders = []; // Will contain the *hash*
    let iPlacedWonders = 0;
    // See if there are any "requested" Natural Wonders
    let requests = [];
    let configRequests = Configuration.getMapValue("RequestedNaturalWonders");
    if (configRequests) {
        // Convert any strings to hashes
        for (const requested of configRequests) {
            if (typeof requested == 'string') {
                requests.push(Database.makeHash(requested));
            }
            else if (typeof requested == 'number') {
                requests.push(requested);
            }
        }
    }
    // Get a list of all the wonders available.
    // This previously tried to see if the wonder could be placed
    // before adding to the list, but we are going to do that
    // while placing as well, and it is an expensive operation.
    for (let nwDef of GameInfo.Feature_NaturalWonders) {
        // handle special case for things like BERMUDA TRIANGLE and MOUNT_EVEREST, 
        // only available with and after live event
        if (requestedWonders.includes(nwDef.FeatureType)) {
            requests.push(nwDef.$hash);
        }
        aPossibleWonders.push(nwDef.$hash);
    }
    if (aPossibleWonders.length > 0) {
        // Shuffle them, so we don't pick in the order they are in the database every time.
        aPossibleWonders = utilities.shuffle(aPossibleWonders);
        // However, float any 'requested' ones to the top
        for (const requested of requests) {
            const index = aPossibleWonders.indexOf(requested);
            if (index >= 1) {
                // Move to the front
                aPossibleWonders.splice(index, 1);
                aPossibleWonders.unshift(requested);
            }
        }
        // First loop -- this if for "PlaceFirst" ones (such as Waterfalls, where we have trouble finding spots for them)
        for (let iI = 0; iI < aPossibleWonders.length; iI++) {
            if (iPlacedWonders < iNumNaturalWonders) {
                let eFeature = aPossibleWonders[iI];
                let nwDef = GameInfo.Feature_NaturalWonders.lookup(eFeature);
                if (nwDef != null) {
                    if (nwDef.PlaceFirst == true) {
                        // To get a proper random location for the NW, collect all the possible locations
                        // and pick a randome one from that.
                        let aPossibleLocations = [];
                        for (let iY = iHeight - 1; iY >= 0; iY--) {
                            for (let iX = 0; iX < iWidth; iX++) {
                                let iElevation = GameplayMap.getElevation(iX, iY);
                                const featureParam = {
                                    Feature: eFeature,
                                    Direction: nwDef.Direction,
                                    Elevation: iElevation
                                };
                                if (TerrainBuilder.canHaveFeatureParam(iX, iY, featureParam)) {
                                    // Indicies will be smaller, so convert
                                    if (wonderEventActive) {
                                        if (GameplayMap.getHemisphere(iX) != GameplayMap.getPrimaryHemisphere()) {
                                            aPossibleLocations.push(GameplayMap.getIndexFromXY(iX, iY));
                                        }
                                    }
                                    else {
                                        aPossibleLocations.push(GameplayMap.getIndexFromXY(iX, iY));
                                    }
                                }
                            }
                        }
                        // Find one?
                        if (aPossibleLocations.length > 0) {
                            let randomIndex = TerrainBuilder.getRandomNumber(aPossibleLocations.length, "Natural Wonder placement location");
                            let placementLocation = GameplayMap.getLocationFromIndex(aPossibleLocations[randomIndex]);
                            let iElevation = GameplayMap.getElevation(placementLocation.x, placementLocation.y);
                            const featureParam = {
                                Feature: eFeature,
                                Direction: nwDef.Direction,
                                Elevation: iElevation
                            };
                            console.log("FeatureParam Elevation: " + featureParam.Elevation);
                            TerrainBuilder.setFeatureType(placementLocation.x, placementLocation.y, featureParam);
                            iPlacedWonders++;
                            console.log("Placed A Top Priority Natural Wonder " + nwDef.FeatureType + " At X:" + placementLocation.x + " Y:" + placementLocation.y + " out of " + aPossibleLocations.length + " possible locations.");
                        }
                        else {
                            console.log("No valid location for " + nwDef.FeatureType);
                        }
                    }
                }
            }
        }
        // Second loop -- now ones that don't have "PlaceFirst"
        for (let iI = 0; iI < aPossibleWonders.length; iI++) {
            if (iPlacedWonders < iNumNaturalWonders) {
                let eFeature = aPossibleWonders[iI];
                let nwDef = GameInfo.Feature_NaturalWonders.lookup(eFeature);
                if (nwDef != null && nwDef.PlaceFirst == false) {
                    let iPlacementPercent = nwDef.PlacementPercentage;
                    if (requests.indexOf(eFeature) != -1) {
                        iPlacementPercent = 100;
                        console.log(nwDef.FeatureType + " is requested to be placed.");
                    }
                    let iRoll = TerrainBuilder.getRandomNumber(100, "Random Natural Wonder Chance");
                    if (iPlacementPercent > iRoll) {
                        // Ok, we want this NW.
                        // To get a proper random location for the NW, collect all the possible locations
                        // and pick a randome one from that.
                        let aPossibleLocations = [];
                        for (let iY = iHeight - 1; iY >= 0; iY--) {
                            for (let iX = 0; iX < iWidth; iX++) {
                                let iElevation = GameplayMap.getElevation(iX, iY);
                                const featureParam = {
                                    Feature: eFeature,
                                    Direction: nwDef.Direction,
                                    Elevation: iElevation
                                };
                                if (TerrainBuilder.canHaveFeatureParam(iX, iY, featureParam)) {
                                    // Indicies will be smaller, so convert
                                    if (wonderEventActive) {
                                        if (GameplayMap.getHemisphere(iX) != GameplayMap.getPrimaryHemisphere()) {
                                            aPossibleLocations.push(GameplayMap.getIndexFromXY(iX, iY));
                                        }
                                    }
                                    else {
                                        aPossibleLocations.push(GameplayMap.getIndexFromXY(iX, iY));
                                    }
                                }
                            }
                        }
                        // Find one?
                        if (aPossibleLocations.length > 0) {
                            let randomIndex = TerrainBuilder.getRandomNumber(aPossibleLocations.length, "Natural Wonder placement location");
                            let placementLocation = GameplayMap.getLocationFromIndex(aPossibleLocations[randomIndex]);
                            let iElevation = GameplayMap.getElevation(placementLocation.x, placementLocation.y);
                            const featureParam = {
                                Feature: eFeature,
                                Direction: nwDef.Direction,
                                Elevation: iElevation
                            };
                            console.log("FeatureParam Elevation: " + featureParam.Elevation);
                            TerrainBuilder.setFeatureType(placementLocation.x, placementLocation.y, featureParam);
                            iPlacedWonders++;
                            console.log("Placed A Natural Wonder " + nwDef.FeatureType + " At X:" + placementLocation.x + " Y:" + placementLocation.y + " out of " + aPossibleLocations.length + " possible locations.");
                        }
                        else {
                            console.log("No valid location for " + nwDef.FeatureType);
                        }
                    }
                }
            }
        }
    }
}

//# sourceMappingURL=file:///base-standard/maps/natural-wonder-generator.js.map
