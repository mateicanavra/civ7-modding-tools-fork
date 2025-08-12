// age-transition-post-load.ts
/**
 * Age transition processing, post-load of the transition map.
 * @packageDocumentation
 */
import * as utilities from '/base-standard/maps/map-utilities.js';
import { generateDiscoveries } from '/base-standard/maps/discovery-generator.js';
import { dumpResources } from '/base-standard/maps/map-debug-helpers.js';
console.log("Loading age-transition-post-load.ts");
// Global variables
var g_numMajorPlayers = 0;
//var g_outgoingAge: number = 0;
var g_incomingAge = 0;
function requestInitializationParameters(initParams) {
    console.log("Getting Age Transition Parameters");
    console.log("Players: ", initParams.numMajorPlayers);
    console.log("Old Age: ", initParams.outgoingAge);
    console.log("New Age: ", initParams.incomingAge);
    g_numMajorPlayers = initParams.numMajorPlayers;
    //	g_outgoingAge = initParams.outgoingAge;
    g_incomingAge = initParams.incomingAge;
    engine.call("SetAgeInitializationParameters", initParams);
}
function doMapUpdates() {
    TerrainBuilder.storeWaterData();
}
function generateTransition() {
    console.log("Generating age transition!");
    const setting = Configuration.getGameValue("AgeTransitionSettingName");
    console.log("Age Transition Setting: " + setting);
    let continuityMode = false;
    if (setting == "AGE_TRANSITION_SETTING_KEEP_MORE") {
        console.log("Using continuity setting");
        continuityMode = true;
    }
    doMapUpdates();
    var iRemovedResourcePlots = [];
    let aGeneratedResources = ResourceBuilder.getGeneratedMapResources();
    removeObsoleteResources(iRemovedResourcePlots, aGeneratedResources);
    addNewResources(iRemovedResourcePlots, aGeneratedResources);
    let iWidth = GameplayMap.getGridWidth();
    let iHeight = GameplayMap.getGridHeight();
    generateDiscoveries(iWidth, iHeight, []);
    // Update units for each player
    for (let iPlayer = 0; iPlayer < g_numMajorPlayers; iPlayer++) {
        let regressedCities = regressCitiesToTowns(iPlayer);
        if (continuityMode) {
            positionUnits(iPlayer);
        }
        else {
            positionArmyCommanders(iPlayer);
            positionFleetCommanders(iPlayer);
        }
        capGold(iPlayer);
        capInfluence(iPlayer);
        changeCapitalCards(iPlayer);
        generateDarkAgeCards(iPlayer);
        generateDynamicVictoryCards(iPlayer);
        generateRetainCityCards(iPlayer, regressedCities);
        Players.AdvancedStart.get(iPlayer)?.dynamicCardsAddedComplete();
    }
}
function removeObsoleteResources(iRemovedResourcePlots, aGeneratedResources) {
    console.log("Removing old resources");
    let aTypesRemoved = [];
    let aCutResources = [];
    let resourcesAvailable = ResourceBuilder.getResourceCounts(-1);
    let countOnMap = 0;
    let countRemoved = 0;
    for (let i = 0; i < resourcesAvailable.length; ++i) {
        if (resourcesAvailable[i] > 0) {
            countOnMap++;
        }
    }
    let countToAdd = aGeneratedResources.length;
    console.log("Adding new resources: " + countToAdd);
    console.log("Resources already on map: " + countOnMap);
    let totalResourceToCut = (countOnMap + countToAdd) - countOnMap;
    if (totalResourceToCut < 0) {
        totalResourceToCut = 0;
    }
    console.log("Number of resources to cut: " + totalResourceToCut);
    let resourceToCut = ResourceBuilder.getBestMapResourceCuts(aGeneratedResources, totalResourceToCut);
    for (let iI = 0; iI < resourceToCut.length; ++iI) {
        var resourceInfo = GameInfo.Resources.lookup(resourceToCut[iI]);
        if (resourceInfo) {
            aCutResources.push(resourceInfo.$index);
        }
    }
    console.log("Cutting " + aCutResources.length + " resources");
    // Traverse the map
    let iWidth = GameplayMap.getGridWidth();
    let iHeight = GameplayMap.getGridHeight();
    for (let iY = 0; iY < iHeight; iY++) {
        for (let iX = 0; iX < iWidth; iX++) {
            let iIndex = (iY * iWidth) + iX;
            // Resource here?
            let resource = GameplayMap.getResourceType(iX, iY);
            if (resource != ResourceTypes.NO_RESOURCE) {
                // Remove it if wrong Age
                let removeResource = false;
                if (aCutResources.find(x => x == resource)) {
                    removeResource = true;
                }
                if (!removeResource && !ResourceBuilder.isResourceValidForAge(resource, g_incomingAge)) {
                    removeResource = true;
                }
                if (removeResource) {
                    var resourceInfo = GameInfo.Resources.lookup(resource);
                    if (resourceInfo) {
                        countRemoved++;
                        utilities.removeRuralDistrict(iX, iY);
                        ResourceBuilder.setResourceType(iX, iY, ResourceTypes.NO_RESOURCE);
                        console.log("Removed resource: " + Locale.compose(resourceInfo.Name) + " at (" + iX + ", " + iY + ")");
                        iRemovedResourcePlots.push(iIndex);
                        utilities.placeRuralDistrict(iX, iY);
                        let resourceType = resourceInfo.$index;
                        if (!aTypesRemoved.find(x => x == resourceType)) {
                            aTypesRemoved.push(resourceType);
                        }
                    }
                }
            }
        }
    }
    console.log("Removed total resource locations: " + countRemoved);
    return aTypesRemoved.length;
}
function addNewResources(iRemovedResourcePlots, aGeneratedResources) {
    console.log("Adding new resources");
    // Count all resources on map
    let iResourceCounts = ResourceBuilder.getResourceCounts(-1);
    // Look for resources included in this Age that aren't present
    let aResourceTypes = [];
    for (let ridx = 0; ridx < aGeneratedResources.length; ++ridx) {
        var resourceInfo = GameInfo.Resources.lookup(aGeneratedResources[ridx]);
        if (resourceInfo && resourceInfo.Tradeable) {
            if (iResourceCounts[resourceInfo.$index] == 0) {
                aResourceTypes.push(resourceInfo.$index);
            }
        }
    }
    let iMapMinimumModifer = utilities.getMinimumResourcePlacementModifier();
    if (iMapMinimumModifer == undefined) {
        iMapMinimumModifer = 0;
    }
    // Get a list of plots from a new Poisson map with a different seed from the first time we placed resources
    let aPlacementPlots = [];
    let seed = GameplayMap.getRandomSeed() * (1 + g_incomingAge);
    let avgDistanceBetweenPoints = 3;
    let normalizedRangeSmoothing = 2;
    let poisson = TerrainBuilder.generatePoissonMap(seed, avgDistanceBetweenPoints, normalizedRangeSmoothing);
    let iWidth = GameplayMap.getGridWidth();
    let iHeight = GameplayMap.getGridHeight();
    for (let iY = 0; iY < iHeight; iY++) {
        for (let iX = 0; iX < iWidth; iX++) {
            let index = iY * iWidth + iX;
            if (poisson[index] >= 1) {
                // Don't put resources under existing districts
                let districtID = MapCities.getDistrict(iX, iY);
                if (districtID == null) {
                    aPlacementPlots.push(index);
                }
            }
        }
    }
    // Add additional plots for each place a resource was removed
    iRemovedResourcePlots.forEach(index => {
        if (index) {
            if (!aPlacementPlots.find(x => x == index)) {
                aPlacementPlots.push(index);
            }
        }
    });
    // Randomize all these plots
    utilities.shuffle(aPlacementPlots);
    let resourceWeight = new Array(GameInfo.Resources.length);
    let resourceRunningWeight = new Array(GameInfo.Resources.length);
    let resourcesPlacedCount = new Array(GameInfo.Resources.length);
    let importantResourceRegionalCountHome = new Array(GameInfo.Resources.length);
    let importantResourceRegionalCountDistant = new Array(GameInfo.Resources.length);
    //Initial Resource data
    for (var resourceIdx = 0; resourceIdx < GameInfo.Resources.length; resourceIdx++) {
        resourceWeight[resourceIdx] = 0;
        resourceRunningWeight[resourceIdx] = 0;
        resourcesPlacedCount[resourceIdx] = 0;
        importantResourceRegionalCountHome[resourceIdx] = 0;
        importantResourceRegionalCountDistant[resourceIdx] = 0;
    }
    let maxPerHemisphere = 0;
    let resourceDistribution = GameInfo.Resource_Distribution.lookup(g_incomingAge);
    if (resourceDistribution) {
        maxPerHemisphere = resourceDistribution.ResourceTypeMaxPerHemisphere;
    }
    // Set resource weights/hemispheres
    aResourceTypes.forEach(resourceType => {
        if (resourceType) {
            var resourceInfo = GameInfo.Resources[resourceType];
            if (resourceInfo) {
                resourceWeight[resourceInfo.$index] = resourceInfo.Weight;
            }
        }
    });
    let iNumPlaced = 0;
    aPlacementPlots.forEach(index => {
        if (index) {
            let kLocation = GameplayMap.getLocationFromIndex(index);
            let plotTag = PlotTags.PLOT_TAG_NONE;
            if (GameplayMap.getPlotTag(kLocation.x, kLocation.y) & PlotTags.PLOT_TAG_EAST_LANDMASS) {
                plotTag = PlotTags.PLOT_TAG_EAST_LANDMASS;
            }
            else if (GameplayMap.getPlotTag(kLocation.x, kLocation.y) & PlotTags.PLOT_TAG_WEST_LANDMASS) {
                plotTag = PlotTags.PLOT_TAG_WEST_LANDMASS;
            }
            //Generate a list of valid resources at this plot
            let resources = [];
            aResourceTypes.forEach(resourceIdx => {
                let assignedLandmass = ResourceBuilder.getResourceLandmass(resourceIdx);
                if (assignedLandmass == utilities.AVAILABLE_ON_ALL_LANDMASSES_ID || ((assignedLandmass == utilities.EAST_LAND_MASS_ID && plotTag == PlotTags.PLOT_TAG_EAST_LANDMASS) || (assignedLandmass == utilities.WEST_LAND_MASS_ID && plotTag == PlotTags.PLOT_TAG_WEST_LANDMASS))) {
                    let existingResource = GameplayMap.getResourceType(kLocation.x, kLocation.y);
                    if (existingResource != ResourceTypes.NO_RESOURCE && !ResourceBuilder.isResourceClassRequiredForLegacyPath(existingResource, assignedLandmass)) {
                        if (ResourceBuilder.canHaveResource(kLocation.x, kLocation.y, resourceIdx, true)) {
                            resources.push(resourceIdx);
                        }
                    }
                    else {
                        if (ResourceBuilder.canHaveResource(kLocation.x, kLocation.y, resourceIdx, true)) {
                            resources.push(resourceIdx);
                        }
                    }
                }
            });
            //Select the highest weighted (ties are a coin flip) resource
            if (resources.length > 0) {
                let resourceChosen = ResourceTypes.NO_RESOURCE;
                let resourceChosenIndex = 0;
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
                if (plotTag == PlotTags.PLOT_TAG_EAST_LANDMASS && importantResourceRegionalCountHome[resourceChosenIndex] < maxPerHemisphere || plotTag == PlotTags.PLOT_TAG_WEST_LANDMASS && importantResourceRegionalCountDistant[resourceChosenIndex] < maxPerHemisphere) {
                    //Place the selected resource
                    if (resourceChosen != ResourceTypes.NO_RESOURCE) {
                        ResourceBuilder.setResourceType(kLocation.x, kLocation.y, resourceChosen);
                        resourceRunningWeight[resourceChosenIndex] -= resourceWeight[resourceChosenIndex];
                        let name = GameInfo.Resources[resourceChosenIndex].Name;
                        console.log("Placed " + Locale.compose(name) + " at (" + kLocation.x + ", " + kLocation.y + ")");
                        iNumPlaced++;
                        if (plotTag == PlotTags.PLOT_TAG_EAST_LANDMASS) {
                            importantResourceRegionalCountHome[resourceChosenIndex]++;
                        }
                        else {
                            importantResourceRegionalCountDistant[resourceChosenIndex]++;
                        }
                        resourcesPlacedCount[resourceChosenIndex]++;
                        utilities.removeRuralDistrict(kLocation.x, kLocation.y);
                        utilities.placeRuralDistrict(kLocation.x, kLocation.y);
                    }
                    else {
                        console.log("Resource Type Failure");
                    }
                }
            }
        }
    });
    //Check that all the replacement plots were filled, and if not, push any compatible resource to it
    //If we weren't able to place some resources, go through and force place the remaining ones, removing exisitng unimportant resources so the map isn't flooded
    for (let iY = 0; iY < iHeight; iY++) {
        for (let iX = 0; iX < iWidth; iX++) {
            // Don't put resources under existing districts
            let districtID = MapCities.getDistrict(iX, iY);
            let plotTag = PlotTags.PLOT_TAG_NONE;
            if (GameplayMap.getPlotTag(iX, iY) & PlotTags.PLOT_TAG_EAST_LANDMASS) {
                plotTag = PlotTags.PLOT_TAG_EAST_LANDMASS;
            }
            else if (GameplayMap.getPlotTag(iX, iY) & PlotTags.PLOT_TAG_WEST_LANDMASS) {
                plotTag = PlotTags.PLOT_TAG_WEST_LANDMASS;
            }
            if (districtID == null) {
                for (let i = 0; i < resourcesPlacedCount.length; ++i) {
                    let resourceToPlace = GameInfo.Resources.lookup(i);
                    if (resourceToPlace) {
                        let assignedLandmass = ResourceBuilder.getResourceLandmass(i);
                        if (assignedLandmass != utilities.AVAILABLE_ON_ALL_LANDMASSES_ID && ((assignedLandmass == utilities.EAST_LAND_MASS_ID && plotTag != PlotTags.PLOT_TAG_EAST_LANDMASS) || (assignedLandmass == utilities.WEST_LAND_MASS_ID && plotTag != PlotTags.PLOT_TAG_WEST_LANDMASS))) {
                            continue;
                        }
                        let minimumPerLandMass = resourceToPlace.MinimumPerHemisphere > 0 ? resourceToPlace.MinimumPerHemisphere + iMapMinimumModifer : 0;
                        if (plotTag == PlotTags.PLOT_TAG_EAST_LANDMASS && importantResourceRegionalCountHome[i] < minimumPerLandMass || plotTag == PlotTags.PLOT_TAG_WEST_LANDMASS && importantResourceRegionalCountDistant[i] < minimumPerLandMass) {
                            if ((resourcesPlacedCount[i] > 0) && ResourceBuilder.isResourceRequiredForAge(i)) {
                                if (ResourceBuilder.canHaveResource(iX, iY, i, false)) {
                                    ResourceBuilder.setResourceType(iX, iY, i);
                                    let name = GameInfo.Resources.lookup(i)?.Name;
                                    console.log("Force Placed " + Locale.compose(name) + " at (" + iX + ", " + iY + ")");
                                    plotTag == PlotTags.PLOT_TAG_EAST_LANDMASS ? importantResourceRegionalCountHome[i]++ : importantResourceRegionalCountDistant[i]++;
                                    utilities.removeRuralDistrict(iX, iY);
                                    utilities.placeRuralDistrict(iX, iY);
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    const ageDefinition = GameInfo.Ages.lookup(g_incomingAge);
    if (ageDefinition) {
        const mapType = Configuration.getMapValue("Name");
        for (const option of GameInfo.MapIslandBehavior) {
            if (option.MapType === mapType && option.AgeType == ageDefinition.AgeType) {
                utilities.replaceIslandResources(iWidth, iHeight, option.ResourceClassType);
            }
        }
    }
    //Logs the final resource output
    dumpResources(iWidth, iHeight);
}
var DynamicCardTypes;
(function (DynamicCardTypes) {
    DynamicCardTypes[DynamicCardTypes["None"] = 0] = "None";
    DynamicCardTypes[DynamicCardTypes["Capital"] = 1] = "Capital";
    DynamicCardTypes[DynamicCardTypes["City"] = 2] = "City";
    DynamicCardTypes[DynamicCardTypes["Commander"] = 3] = "Commander";
    DynamicCardTypes[DynamicCardTypes["Wonder"] = 4] = "Wonder";
    DynamicCardTypes[DynamicCardTypes["Gold"] = 5] = "Gold";
    DynamicCardTypes[DynamicCardTypes["DarkAge"] = 6] = "DarkAge";
    DynamicCardTypes[DynamicCardTypes["Victory"] = 7] = "Victory";
    DynamicCardTypes[DynamicCardTypes["Unit"] = 8] = "Unit";
})(DynamicCardTypes || (DynamicCardTypes = {}));
function regressCitiesToTowns(iPlayer) {
    const player = Players.get(iPlayer);
    const playerSettlements = player?.Cities?.getCityIds();
    let regressedCities = [];
    if (playerSettlements != null) {
        for (let i = 0; i < playerSettlements.length; i++) {
            const settlement = Cities.get(playerSettlements[i]);
            if (settlement != null) {
                // If this is a city, but not the capital, revert it to a town
                if (!settlement.isCapital && !settlement.isTown) {
                    regressedCities.push(playerSettlements[i]);
                    settlement.changeHasBuildQueue(-1);
                }
            }
        }
    }
    return regressedCities;
}
function changeCapitalCards(iPlayer) {
    const capitalOptions = 2;
    const player = Players.get(iPlayer);
    let playerSettlements = player?.Cities?.getCityIds();
    let currentPlayerCapitalName = "LOC_ERROR_NO_CAPITAL_NAME";
    const currentPlayerCapital = player?.Cities?.getCapital();
    if (currentPlayerCapital != null) {
        currentPlayerCapitalName = currentPlayerCapital.name;
    }
    if (player != null && playerSettlements != null) {
        playerSettlements = playerSettlements.sort((a, b) => {
            const popA = Cities.get(a)?.population;
            const popB = Cities.get(b)?.population;
            if (popA == null)
                return 1;
            if (popB == null)
                return -1;
            return popB - popA;
        });
        let capitalName = "LOC_ERROR_NO_CAPITAL_NAME";
        const civ = GameInfo.Civilizations.lookup(player.civilizationType);
        if (civ != null) {
            capitalName = civ.CapitalName;
        }
        let cardsGenerated = 0;
        for (let i = 0; i < playerSettlements.length && cardsGenerated < capitalOptions; i++) {
            const settlement = Cities.get(playerSettlements[i]);
            if (settlement != null) {
                if (!settlement.isCapital && settlement.Trade != null && settlement.Trade.isConnectedToOwnersCapitalByLand()) {
                    let card = {
                        id: "CARD_AT_CHANGE_CAPITAL_" + cardsGenerated,
                        name: "LOC_CARD_AT_CHANGE_CAPITAL",
                        description: "LOC_CARD_AT_CHANGE_CAPITAL_DESCRIPTION\\" + settlement.name + "\\" + capitalName + "\\" + currentPlayerCapitalName,
                        tooltip: "",
                        iconOverride: "",
                        limitID: "CARD_AT_CHANGE_CAPITAL_0",
                        individualLimit: 1,
                        groupLimit: 1,
                        categorySortOrder: 100,
                        cost: [
                            { category: CardCategories.CARD_CATEGORY_WILDCARD, value: 0 }
                        ],
                        effects: [{
                                id: "CARD_AT_CHANGE_CAPITAL_" + cardsGenerated,
                                type: "CARD_AT_CHANGE_CAPITAL",
                                name: "",
                                description: "",
                                amount: 1,
                                special: 0,
                                metadata: {
                                    Type: DynamicCardTypes.Capital,
                                    SettlementId: settlement.id.id
                                }
                            }],
                        aiModifierLists: []
                    };
                    Players.AdvancedStart.get(iPlayer)?.addDynamicAvailableCard(card);
                    cardsGenerated += 1;
                }
            }
        }
    }
}
function positionUnits(iPlayer) {
    const player = Players.get(iPlayer);
    if (player != null) {
        const playerUnits = player?.Units;
        if (playerUnits != null) {
            let commanderIds = playerUnits.getUnitIds();
            if (commanderIds != null) {
                // First get only the commander units so we can easily check them later when needing to pack into them
                commanderIds = commanderIds.filter((unitId) => {
                    return Units.get(unitId)?.isCommanderUnit;
                });
                let shadows = playerUnits.getUnitShadows();
                for (let shadow of shadows) {
                    // Create the new unit from the shadow
                    const unit = createUnitFromShadowAtLocation(player, shadow, shadow.location);
                    // Check if the shadow was in a commander last age. If so, find the commander on this plot and pack that unit into it
                    if (unit != null && shadow.isInCommander) {
                        console.log("In commander");
                        for (let commanderId of commanderIds) {
                            const army = Armies.get(commanderId);
                            console.log("Locations: " + army?.location.x + "," + army?.location.y + " " + shadow.location.x + "," + shadow.location.y + " " + (army != null) + " " + (army?.location == shadow.location));
                            if (army != null && army.location.x == shadow.location.x && army.location.y == shadow.location.y) {
                                console.log("Packing");
                                army.packUnit(unit);
                            }
                        }
                    }
                }
            }
        }
    }
}
function positionArmyCommanders(iPlayer) {
    const LAND_DOMAIN_HASH = Database.makeHash("DOMAIN_LAND");
    const CORE_CLASS_MILITARY_HASH = Database.makeHash("CORE_CLASS_MILITARY");
    const numDefensiveUnits = getNumDefenders();
    const player = Players.get(iPlayer);
    if (player != null) {
        let playerSettlements = player?.Cities?.getCityIds();
        if (playerSettlements != null && playerSettlements.length > 0) {
            // Sort them by population
            playerSettlements = playerSettlements.sort((a, b) => {
                const popA = Cities.get(a)?.population;
                const popB = Cities.get(b)?.population;
                if (popA == null)
                    return 1;
                if (popB == null)
                    return -1;
                return popB - popA;
            });
            let cityCount = playerSettlements.length;
            console.log("Cities available ", cityCount);
            // Create defenders
            const playerUnits = player?.Units;
            if (playerUnits != null) {
                let shadows = playerUnits.getUnitShadows();
                for (let i = 0; i < shadows.length; i++) {
                    console.log(JSON.stringify(shadows[i]));
                }
                let cityIndex = 0;
                for (let i = 0; i < numDefensiveUnits; i++) {
                    let city = Cities.get(playerSettlements[cityIndex]);
                    if (city != null) {
                        const shadowIndex = playerUnits.getShadowIndexClosestToLocation(city.location, LAND_DOMAIN_HASH, CORE_CLASS_MILITARY_HASH);
                        if (shadowIndex >= 0 && shadowIndex < shadows.length) {
                            createUnitFromShadowAtLocation(player, shadows[shadowIndex], city.location);
                            playerUnits.removeUnitShadowAtIndex(shadowIndex);
                            shadows = playerUnits.getUnitShadows();
                        }
                        else {
                            console.log("Spawning free unit as defender");
                            player.AdvancedStart?.createDefender(city.location, Database.makeHash("UNIT_CLASS_INFANTRY"));
                        }
                    }
                    cityIndex++;
                    if (cityIndex >= cityCount) {
                        cityIndex = 0;
                    }
                }
                // Move army commanders and fill them
                let unitIds = player?.Units?.getUnitIds();
                if (unitIds != null) {
                    // Filter out non-army commander units
                    unitIds = unitIds.filter((unitId) => {
                        return Units.get(unitId)?.Experience?.canEarnExperience == true && Units.get(unitId)?.isArmyCommander;
                    });
                    // Sort by experience
                    unitIds = unitIds.sort((a, b) => {
                        let expA = 0;
                        let expB = 0;
                        const expCompA = Units.get(a)?.Experience;
                        if (expCompA != null) {
                            expA = expCompA.experiencePoints;
                        }
                        const expCompB = Units.get(b)?.Experience;
                        if (expCompB != null) {
                            expB = expCompB.experiencePoints;
                        }
                        return expB - expA;
                    });
                    if (unitIds.length == 0) {
                        const city = Cities.get(playerSettlements[0]);
                        if (city != null) {
                            const commanderType = player.Units?.getBuildUnit("UNIT_ARMY_COMMANDER");
                            const result = Units.create(player.id, { Type: commanderType, Location: city.location });
                            if (result.Success && result.ID) {
                                unitIds.push(result.ID);
                            }
                        }
                    }
                    unitIds.forEach(unitID => {
                        let unit = Units.get(unitID);
                        if (unit != null && playerSettlements != null) {
                            console.log(Locale.compose(unit.name));
                            if (unit.isArmyCommander) {
                                const army = Armies.get(unit.armyId);
                                const prevArmyLocation = unit.location;
                                let city = player.Cities?.findClosest(unit.location);
                                if (city != null && army != null) {
                                    Units.setLocation(unitID, city.location);
                                    unit.setProperty("PROPERTY_CHECK_COMMANDER", true);
                                    unit.setProperty("PROPERTY_KEEP_COMMANDER", true);
                                    // Fill the commander with the nearest shadows
                                    for (let i = 0; i < army.combatUnitCapacity && shadows.length > 0; i++) {
                                        const shadowIndex = playerUnits.getShadowIndexClosestToLocation(prevArmyLocation, LAND_DOMAIN_HASH, CORE_CLASS_MILITARY_HASH);
                                        if (shadowIndex >= 0 && shadowIndex < shadows.length) {
                                            const newUnitID = createUnitFromShadowAtLocation(player, shadows[shadowIndex], city.location);
                                            playerUnits.removeUnitShadowAtIndex(shadowIndex);
                                            shadows = playerUnits.getUnitShadows();
                                            if (newUnitID != null) {
                                                army.packUnit(newUnitID);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    });
                }
            }
        }
    }
}
function positionFleetCommanders(iPlayer) {
    const SEA_DOMAIN_HASH = Database.makeHash("DOMAIN_SEA");
    const CORE_CLASS_MILITARY_HASH = Database.makeHash("CORE_CLASS_MILITARY");
    const player = Players.get(iPlayer);
    if (player != null) {
        let unitIds = player?.Units?.getUnitIds();
        if (unitIds != null) {
            // Filter out non-fleet commander units
            unitIds = unitIds.filter((unitId) => {
                return Units.get(unitId)?.Experience?.canEarnExperience == true && Units.get(unitId)?.isFleetCommander;
            });
            // Sort by experience
            unitIds = unitIds.sort((a, b) => {
                let expA = 0;
                let expB = 0;
                const expCompA = Units.get(a)?.Experience;
                if (expCompA != null) {
                    expA = expCompA.experiencePoints;
                }
                const expCompB = Units.get(b)?.Experience;
                if (expCompB != null) {
                    expB = expCompB.experiencePoints;
                }
                return expB - expA;
            });
            const playerUnits = player?.Units;
            if (playerUnits != null) {
                let shadows = playerUnits.getUnitShadows();
                unitIds.forEach(unitID => {
                    let unit = Units.get(unitID);
                    if (unit != null) {
                        console.log(Locale.compose(unit.name));
                        if (unit.isFleetCommander) {
                            const army = Armies.get(unit.armyId);
                            const locationIndex = Game.PlacementRules.getValidOceanNavalLocation(iPlayer);
                            console.log("Location Index: " + locationIndex);
                            if (army != null && locationIndex != -1) {
                                const location = GameplayMap.getLocationFromIndex(locationIndex);
                                const prevArmyLocation = unit.location;
                                Units.setLocation(unitID, location);
                                console.log("Location: " + JSON.stringify(location));
                                unit.setProperty("PROPERTY_CHECK_COMMANDER", true);
                                unit.setProperty("PROPERTY_KEEP_COMMANDER", true);
                                // Fill the commander with the nearest shadows
                                for (let i = 0; i < army.combatUnitCapacity && shadows.length > 0; i++) {
                                    const shadowIndex = playerUnits.getShadowIndexClosestToLocation(prevArmyLocation, SEA_DOMAIN_HASH, CORE_CLASS_MILITARY_HASH);
                                    if (shadowIndex >= 0 && shadowIndex < shadows.length) {
                                        const newUnitID = createUnitFromShadowAtLocation(player, shadows[shadowIndex], prevArmyLocation);
                                        playerUnits.removeUnitShadowAtIndex(shadowIndex);
                                        shadows = playerUnits.getUnitShadows();
                                        if (newUnitID != null) {
                                            army.packUnit(newUnitID);
                                        }
                                    }
                                    else {
                                        console.log("Shadow index outside of valid range");
                                    }
                                }
                            }
                        }
                    }
                });
            }
        }
    }
}
function createUnitFromShadowAtLocation(player, shadow, location) {
    for (let shadowOption of GameInfo.Unit_ShadowReplacements) {
        if (Database.makeHash(shadowOption.Domain) == shadow.domainHash &&
            Database.makeHash(shadowOption.CoreClass) == shadow.coreClassHash &&
            Database.makeHash(shadowOption.Tag) == shadow.tagHash) {
            const buildUnit = player.Units?.getBuildUnit(shadowOption.UnitType);
            if (buildUnit != null) {
                const result = Units.create(player.id, { Type: buildUnit, Location: location, Validate: true });
                if (result.Success && result.ID) {
                    return result.ID;
                }
            }
        }
    }
    return null;
}
function getNumDefenders() {
    const definition = GameInfo.Ages.lookup(Game.age);
    if (definition != null) {
        return definition.NumDefenders;
    }
    return 0;
}
function capGold(iPlayer) {
    const player = Players.get(iPlayer);
    let defaultGold = Game.EconomicRules.adjustForGameSpeed(3000);
    console.log("Default gold: " + defaultGold);
    const currentGold = player?.Treasury?.goldBalance;
    if (currentGold != null) {
        // If we are over the gold amount we can carry over
        if (currentGold > defaultGold) {
            player?.Treasury?.changeGoldBalance(defaultGold - currentGold);
        }
    }
}
function capInfluence(iPlayer) {
    const player = Players.get(iPlayer);
    let defaultInfluence = Game.EconomicRules.adjustForGameSpeed(500);
    console.log("Default influence: " + defaultInfluence);
    const currentInfluence = player?.DiplomacyTreasury?.diplomacyBalance;
    if (currentInfluence != null) {
        // If we are over the influence amount we can carry over
        if (currentInfluence > defaultInfluence) {
            player?.DiplomacyTreasury?.changeDiplomacyBalance(defaultInfluence - currentInfluence);
        }
    }
}
//<!-- Dark Age Cards -->
//<Row Age="AGE_EXPLORATION" CardSet="AGE_TRANSITION_EXP_DEFAULT" CardID="CARD_AT_EXP_DARK_AGE_ARMIES" Name="LOC_CARD_AT_EXP_DARK_AGE_ARMIES" Description="LOC_CARD_AT_EXP_DARK_AGE_ARMIES_DESCRIPTION" DarkAgeCost="1" CardEffectType1="CARD_EFFECT_AT_EXP_DARK_AGE_ARMIES" IndividualLimit="1" Unlock="UNLOCK_DARK_AGE_1"/>
function generateDarkAgeCards(iPlayer) {
    if (Game.age == Database.makeHash("AGE_EXPLORATION")) {
        let card = {
            id: "CARD_AT_EXP_DARK_AGE_MILITARY",
            name: "LOC_LEGACY_PATH_ANTIQUITY_MILITARY_DARK_AGE_NAME",
            description: "LOC_LEGACY_PATH_ANTIQUITY_MILITARY_DARK_AGE_DESCRIPTION",
            tooltip: "",
            iconOverride: "agecard_dark.png",
            limitID: "",
            individualLimit: 1,
            unlock: "UNLOCK_DARK_AGE_MILITARISTIC_1",
            categorySortOrder: 100,
            cost: [
                { category: CardCategories.CARD_CATEGORY_DARK_AGE, value: 1 }
            ],
            effects: [{
                    id: "CARD_AT_EXP_DARK_AGE_ARMY",
                    type: "CARD_ADD_ARMY_CAVALRY_PLUS_SIEGE",
                    name: "",
                    description: "",
                    amount: 3,
                    special: 0,
                    metadata: {
                        Type: DynamicCardTypes.DarkAge
                    }
                },
                {
                    id: "CARD_AT_EXP_DARK_AGE_LOSE_ALL_BUT_CAPITAL",
                    type: "",
                    name: "",
                    description: "",
                    amount: 1,
                    special: 0,
                    metadata: {
                        Type: DynamicCardTypes.DarkAge
                    }
                }],
            aiModifierLists: [
                "Dark Age Armies Pseudoyields"
            ]
        };
        Players.AdvancedStart.get(iPlayer)?.addDynamicAvailableCard(card);
    }
}
function generateRetainCityCards(iPlayer, aSettlements) {
    // Cards for keeping upgraded cities
    const player = Players.get(iPlayer);
    if (player != null) {
        if (aSettlements.length > 0) {
            if (Game.age == Database.makeHash("AGE_EXPLORATION")) {
                let card = {
                    id: "CARD_AT_EXP_GOLDEN_AGE_ECONOMIC",
                    name: "LOC_LEGACY_PATH_ANTIQUITY_ECONOMIC_GOLDEN_AGE_NAME",
                    description: "LOC_LEGACY_PATH_ANTIQUITY_ECONOMIC_GOLDEN_AGE_DESCRIPTION",
                    tooltip: "",
                    iconOverride: "agecard_victory.png",
                    limitID: "CARD_AT_EXP_VICTORY_CULTURE_GOLDEN_AGE",
                    individualLimit: 1,
                    goldenAgeReward: true,
                    categorySortOrder: 10,
                    unlock: "UNLOCK_WON_ECONOMIC_VICTORY_1",
                    cost: [
                        { category: CardCategories.CARD_CATEGORY_ECONOMIC, value: 2 }
                    ],
                    effects: [],
                    aiModifierLists: []
                };
                for (let i = 0; i < aSettlements.length; i++) {
                    card.effects.push({
                        id: "CARD_AT_EXP_GOLDEN_AGE_ECONOMIC_" + i,
                        type: "CARD_AT_EXP_GOLDEN_AGE_ECONOMIC",
                        name: "",
                        description: "",
                        amount: 1,
                        special: 0,
                        metadata: {
                            Type: DynamicCardTypes.City,
                            SettlementId: aSettlements[i].id
                        }
                    });
                }
                Players.AdvancedStart.get(iPlayer)?.addDynamicAvailableCard(card);
            }
            else if (Game.age == Database.makeHash("AGE_MODERN")) {
                let card = {
                    id: "CARD_AT_MOD_GOLDEN_AGE_ECONOMIC",
                    name: "LOC_LEGACY_PATH_EXPLORATION_ECONOMIC_GOLDEN_AGE_NAME",
                    description: "LOC_LEGACY_PATH_EXPLORATION_ECONOMIC_GOLDEN_AGE_DESCRIPTION",
                    tooltip: "",
                    iconOverride: "agecard_victory.png",
                    limitID: "CARD_AT_MOD_VICTORY_MILITARISTIC_FIRST",
                    individualLimit: 1,
                    goldenAgeReward: true,
                    categorySortOrder: 10,
                    unlock: "UNLOCK_WON_ECONOMIC_VICTORY_2",
                    cost: [
                        { category: CardCategories.CARD_CATEGORY_ECONOMIC, value: 2 }
                    ],
                    effects: [{
                            id: "CARD_AT_MOD_GOLDEN_AGE_ECONOMIC_POPULATION",
                            type: "CARD_AT_MOD_GOLDEN_AGE_ECONOMIC_POPULATION",
                            name: "",
                            description: "",
                            amount: 1,
                            special: 0,
                            metadata: {}
                        }],
                    aiModifierLists: []
                };
                for (let i = 0; i < aSettlements.length; i++) {
                    card.effects.push({
                        id: "CARD_AT_MOD_GOLDEN_AGE_ECONOMIC_" + i,
                        type: "CARD_AT_MOD_GOLDEN_AGE_ECONOMIC",
                        name: "",
                        description: "",
                        amount: 1,
                        special: 0,
                        metadata: {
                            Type: DynamicCardTypes.City,
                            SettlementId: aSettlements[i].id
                        }
                    });
                }
                Players.AdvancedStart.get(iPlayer)?.addDynamicAvailableCard(card);
            }
        }
    }
}
function generateDynamicVictoryCards(iPlayer) {
    const player = Players.get(iPlayer);
    if (player != null) {
        if (Game.age == Database.makeHash("AGE_EXPLORATION")) {
            //total number of trade routes the player had last age
            let yield_multiplier = 5;
            let numberOfroutes = player.getProperty("PROPERTY_ANTIQUITY_TRADE_ROUTE_TOTAL");
            let totalYield = numberOfroutes * yield_multiplier;
            if (totalYield > 0) {
                let card = {
                    id: "CARD_AT_EXP_VICTORY_ECONOMIC_SECOND",
                    name: "LOC_LEGACY_PATH_ANTIQUITY_ECONOMIC_MILESTONE_2_NAME\\",
                    description: "LOC_LEGACY_PATH_ANTIQUITY_ECONOMIC_MILESTONE_2_DESCRIPTION_DYNAMIC\\5\\" + totalYield,
                    tooltip: "",
                    iconOverride: "agecard_victory.png",
                    limitID: "",
                    individualLimit: 1,
                    categorySortOrder: 20,
                    unlock: "UNLOCK_AT_LEAST_SECOND_ECONOMIC_VICTORY_1",
                    cost: [
                        { category: CardCategories.CARD_CATEGORY_ECONOMIC, value: 2 }
                    ],
                    effects: [{
                            id: "CARD_AT_EXP_VICTORY_ECONOMIC_SECOND",
                            type: "CARD_AT_EXP_VICTORY_ECONOMIC_SECOND",
                            name: "",
                            description: "",
                            amount: 1,
                            special: 0,
                            metadata: {
                                Type: DynamicCardTypes.Victory,
                                Amount: totalYield
                            }
                        }],
                    aiModifierLists: []
                };
                Players.AdvancedStart.get(iPlayer)?.addDynamicAvailableCard(card);
            }
            //total number of codices the player had last age
            yield_multiplier = 1;
            let numberOfGreatWorks = player.getProperty("PROPERTY_PREVIOUS_AGE_GREAT_WORK_TOTAL");
            totalYield = numberOfGreatWorks * yield_multiplier;
            if (totalYield > 0) {
                let card = {
                    id: "CARD_AT_EXP_VICTORY_SCIENTIFIC_SECOND",
                    name: "LOC_LEGACY_PATH_ANTIQUITY_SCIENCE_MILESTONE_2_NAME\\",
                    description: "LOC_LEGACY_PATH_ANTIQUITY_SCIENCE_MILESTONE_2_DESCRIPTION_DYNAMIC\\1\\" + totalYield,
                    tooltip: "",
                    iconOverride: "agecard_victory.png",
                    limitID: "",
                    individualLimit: 1,
                    unlock: "UNLOCK_AT_LEAST_SECOND_SCIENTIFIC_VICTORY_1",
                    categorySortOrder: 20,
                    cost: [
                        { category: CardCategories.CARD_CATEGORY_SCIENTIFIC, value: 2 }
                    ],
                    effects: [{
                            id: "CARD_AT_EXP_VICTORY_SCIENTIFIC_SECOND",
                            type: "CARD_AT_EXP_VICTORY_SCIENTIFIC_SECOND",
                            name: "",
                            description: "",
                            amount: 1,
                            special: 0,
                            metadata: {
                                Type: DynamicCardTypes.Victory,
                                Amount: totalYield
                            }
                        }],
                    aiModifierLists: []
                };
                Players.AdvancedStart.get(iPlayer)?.addDynamicAvailableCard(card);
            }
            {
                let card = {
                    id: "CARD_AT_EXP_VICTORY_MILITARISTIC_UNITS",
                    name: "LOC_LEGACY_PATH_ANTIQUITY_MILITARY_GOLDEN_AGE_NAME",
                    description: "",
                    tooltip: "",
                    iconOverride: "agecard_victory.png",
                    limitID: "CARD_AT_EXP_VICTORY_CULTURE_GOLDEN_AGE",
                    individualLimit: 1,
                    goldenAgeReward: true,
                    unlock: "UNLOCK_WON_MILITARISTIC_VICTORY_1",
                    categorySortOrder: 10,
                    cost: [
                        { category: CardCategories.CARD_CATEGORY_MILITARISTIC, value: 2 }
                    ],
                    effects: [],
                    aiModifierLists: []
                };
                let totalUnits = 0;
                if (player.Cities?.getCities() != null) {
                    for (const city of player.Cities?.getCities()) {
                        if (city.getProperty(Database.makeHash("PROPERTY_WAS_CONQUERED"))) {
                            console.log("Was conquered: " + city.name);
                            card.effects.push({
                                id: "CARD_EFFECT_AT_EXP_VICTORY_MILITARISTIC_UNITS" + totalUnits,
                                type: "CARD_AT_EXP_VICTORY_MILITARISTIC_UNITS",
                                name: "",
                                description: "",
                                amount: 1,
                                special: 0,
                                metadata: {
                                    Type: DynamicCardTypes.Unit,
                                    SettlementId: city.id.id,
                                }
                            });
                            totalUnits++;
                        }
                    }
                }
                card.description = "LOC_LEGACY_PATH_ANTIQUITY_MILITARY_GOLDEN_AGE_DESCRIPTION_DYNAMIC\\" + totalUnits;
                Players.AdvancedStart.get(iPlayer)?.addDynamicAvailableCard(card);
            }
        }
        else if (Game.age == Database.makeHash("AGE_MODERN")) {
            //total number of relics the player had last age
            let yield_multiplier = 2;
            let numberOfGreatWorks = player.getProperty("PROPERTY_PREVIOUS_AGE_GREAT_WORK_TOTAL");
            let totalYield = numberOfGreatWorks * yield_multiplier;
            if (totalYield > 0) {
                let card = {
                    id: "CARD_AT_MOD_VICTORY_CULTURAL_SECOND",
                    name: "LOC_LEGACY_PATH_EXPLORATION_CULTURE_MILESTONE_2_NAME\\",
                    description: "LOC_LEGACY_PATH_EXPLORATION_CULTURE_MILESTONE_2_DESCRIPTION_DYNAMIC\\2\\" + totalYield,
                    tooltip: "",
                    iconOverride: "agecard_victory.png",
                    limitID: "",
                    individualLimit: 1,
                    unlock: "UNLOCK_AT_LEAST_SECOND_CULTURAL_VICTORY_2",
                    categorySortOrder: 20,
                    cost: [
                        { category: CardCategories.CARD_CATEGORY_CULTURAL, value: 2 }
                    ],
                    effects: [{
                            id: "CARD_AT_MOD_VICTORY_CULTURAL_SECOND",
                            type: "CARD_AT_MOD_VICTORY_CULTURAL_SECOND",
                            name: "",
                            description: "",
                            amount: 1,
                            special: 0,
                            metadata: {
                                Type: DynamicCardTypes.Victory,
                                Amount: totalYield
                            }
                        }],
                    aiModifierLists: []
                };
                Players.AdvancedStart.get(iPlayer)?.addDynamicAvailableCard(card);
            }
        }
    }
}
// Register listeners.
engine.on('RequestAgeInitializationParameters', requestInitializationParameters);
engine.on('GenerateAgeTransition', generateTransition);
console.log("Loaded age-transition-post-load.ts");

//# sourceMappingURL=file:///base-standard/scripts/age-transition-post-load.js.map
