/**
 * @file model-place-building.ts
 * @copyright 2023, Firaxis Games
 * @description Data model for placing a building on a plot
 */
import BuildingPlacementManager, { BuildingPlacementSelectedPlotChangedEventName, BuildingPlacementConstructibleChangedEventName } from '/base-standard/ui/building-placement/building-placement-manager.js';
import { composeConstructibleDescription } from '/core/ui/utilities/utilities-core-textprovider.js';
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js';
var ConstructibleIcons;
(function (ConstructibleIcons) {
    ConstructibleIcons["EMPTY"] = "BUILDING_OPEN";
    ConstructibleIcons["ADD"] = "BUILDING_ADD";
    ConstructibleIcons["WARNING"] = "BUILDING_WARNING";
})(ConstructibleIcons || (ConstructibleIcons = {}));
class PlaceBuildingModel {
    constructor() {
        this.hasSelectedPlot = false;
        this.cityName = "";
        this.isRepairing = false;
        this.selectedConstructibleInfo = {
            name: "",
            type: ConstructibleIcons.EMPTY,
            shouldShow: true,
            details: [],
            showPlacementIcon: false,
            showRepairIcon: false,
            collectionIndex: -1
        };
        this.selectPlotMessage = "";
        this.firstConstructibleSlot = {
            name: "",
            type: ConstructibleIcons.EMPTY,
            shouldShow: true,
            details: [],
            showPlacementIcon: false,
            showRepairIcon: false,
            collectionIndex: -1
        };
        this.secondConstructibleSlot = {
            name: "",
            type: ConstructibleIcons.EMPTY,
            shouldShow: true,
            details: [],
            showPlacementIcon: false,
            showRepairIcon: false,
            collectionIndex: -1
        };
        this.shouldShowOverbuild = false;
        this.overbuildText = "";
        this.overbuildConstructibleSlot = {
            name: "",
            type: ConstructibleIcons.EMPTY,
            shouldShow: true,
            details: [],
            showPlacementIcon: false,
            showRepairIcon: false,
            collectionIndex: -1
        };
        this.shouldShowUniqueQuarterText = false;
        this.uniqueQuarterText = "";
        this.uniqueQuarterWarning = "";
        this.shouldShowFromThisPlot = false;
        this.fromThisPlotYields = [];
        this.shouldShowAdjacencyBonuses = false;
        this.adjacencyBonuses = [];
        this.warehouseBonuses = [];
        this.placementHeaderText = "";
        this.selectedPlotIndex = null;
        this.updateGate = new UpdateGate(() => {
            const constructibleDef = BuildingPlacementManager.currentConstructible;
            if (!constructibleDef) {
                console.warn('model-place-building: Tried to update but BuildingPlacementManager does not have a valid constructible.');
                return;
            }
            const cityID = BuildingPlacementManager.cityID;
            if (!cityID) {
                console.warn('model-place-building: Tried to update but BuildingPlacementManager does not have a valid cityID.');
                return;
            }
            const city = Cities.get(cityID);
            if (!city) {
                console.warn(`model-place-building: Failed to get the city for cityID ${cityID} provided by BuildingPlacementManager.`);
                return;
            }
            // Determine if the building we're placing is part of a unique district
            let uniqueQuarterPlotIndex = -1;
            let uniqueQuarterDefinition = null;
            for (const uniqueDistrictDef of GameInfo.UniqueQuarters) {
                if (constructibleDef.ConstructibleType == uniqueDistrictDef.BuildingType1 || constructibleDef.ConstructibleType == uniqueDistrictDef.BuildingType2) {
                    uniqueQuarterDefinition = uniqueDistrictDef;
                    // If we do have a unique quarter determine if we already have placed one of the required buildings
                    uniqueQuarterPlotIndex = BuildingPlacementManager.findExistingUniqueBuilding(uniqueDistrictDef);
                }
            }
            // Determine if the constructible is a unique improvement or a wonder (rural tile isn't converted into an urban tile)
            let isUniqueImprovement = false;
            const playerConfig = Configuration.getPlayer(GameContext.localPlayerID);
            const civType = playerConfig.civilizationTypeName;
            if (civType) {
                const civTrait = GameInfo.LegacyCivilizationTraits.lookup(civType);
                for (const improvement of GameInfo.Improvements) {
                    if (civTrait == null) {
                        console.error("Place Building: No civilization trait found. There's no trait to compare improvements.");
                        break;
                    }
                    if (civTrait.TraitType == improvement.TraitType &&
                        constructibleDef.ConstructibleClass == "IMPROVEMENT" &&
                        improvement.ConstructibleType == constructibleDef.ConstructibleType) {
                        isUniqueImprovement = true;
                        break;
                    }
                }
            }
            const showUrbanWarning = !(isUniqueImprovement || constructibleDef.ConstructibleClass == "WONDER");
            this.cityName = city.name;
            this.isRepairing = BuildingPlacementManager.isRepairing;
            // Defaults for most cases
            this.firstConstructibleSlot.shouldShow = true;
            this.firstConstructibleSlot.showRepairIcon = false;
            this.secondConstructibleSlot.shouldShow = true;
            this.secondConstructibleSlot.showRepairIcon = false;
            this.overbuildConstructibleSlot.shouldShow = true;
            this.overbuildConstructibleSlot.showRepairIcon = false;
            this.selectedConstructibleInfo.name = constructibleDef.Name;
            this.selectedConstructibleInfo.type = constructibleDef.ConstructibleType;
            if (this.selectedPlotIndex != null) {
                this.hasSelectedPlot = true;
                this.selectedConstructibleInfo.details = [];
                BuildingPlacementManager.getTotalYieldChanges(this.selectedPlotIndex)?.forEach((yieldChangeData) => {
                    this.selectedConstructibleInfo.details.push(Locale.stylize('LOC_BUILDING_PLACEMENT_YIELD', yieldChangeData.yieldChange, yieldChangeData.text));
                });
                // If we failed to find yield changes use the contructible definition description
                // EX: Repairing an Improvement
                if (this.selectedConstructibleInfo.details.length == 0) {
                    this.selectedConstructibleInfo.details.push(composeConstructibleDescription(constructibleDef.ConstructibleType, city));
                }
                const overbuildConstructibleID = BuildingPlacementManager.getOverbuildConstructibleID(this.selectedPlotIndex);
                this.shouldShowOverbuild = false;
                const selectedDistrict = Districts.getAtLocation(GameplayMap.getLocationFromIndex(this.selectedPlotIndex));
                if (selectedDistrict) {
                    //filter stuff that doesn't take up a building slot, such as walls
                    const constructibles = selectedDistrict.getConstructibleIds().filter((constructibleID) => {
                        const constructible = Constructibles.getByComponentID(constructibleID);
                        if (!constructible) {
                            console.error(`model-place-building: updateGate - no constructible found for component id ${constructibleID}`);
                            return false;
                        }
                        const constructibleDefinition = GameInfo.Constructibles.lookup(constructible.type);
                        if (!constructibleDefinition) {
                            console.error(`model-place-building: updateGate - no constructible definition found for component id ${constructibleID}`);
                            return false;
                        }
                        if (constructibleDefinition.ExistingDistrictOnly) {
                            return false;
                        }
                        return true;
                    });
                    if (constructibles[0]) {
                        this.firstConstructibleSlot = this.getConstructibleInfoByComponentID(constructibles[0]);
                        if (this.isRepairing && this.firstConstructibleSlot.type == this.selectedConstructibleInfo.type) {
                            this.placementHeaderText = Locale.compose("LOC_UI_CITY_VIEW_REPAIR", this.firstConstructibleSlot.name);
                            this.firstConstructibleSlot.showRepairIcon = true;
                            this.firstConstructibleSlot.showPlacementIcon = false;
                        }
                        else if (this.firstConstructibleSlot.collectionIndex == overbuildConstructibleID) {
                            this.firstConstructibleSlot.showPlacementIcon = true;
                            this.shouldShowOverbuild = true;
                            this.overbuildConstructibleSlot = this.firstConstructibleSlot;
                            this.overbuildText = Locale.compose("LOC_UI_CITY_VIEW_PLACE_OVER_DESC", this.firstConstructibleSlot.name);
                            this.placementHeaderText = Locale.compose("LOC_UI_CITY_VIEW_PLACE_OVER", this.overbuildConstructibleSlot.name);
                        }
                        else {
                            this.firstConstructibleSlot.showPlacementIcon = false;
                        }
                    }
                    if (constructibles[1]) {
                        this.secondConstructibleSlot = this.getConstructibleInfoByComponentID(constructibles[1]);
                        if (this.isRepairing && this.secondConstructibleSlot.type == this.selectedConstructibleInfo.type) {
                            this.placementHeaderText = Locale.compose("LOC_UI_CITY_VIEW_REPAIR", this.secondConstructibleSlot.name);
                            this.secondConstructibleSlot.showRepairIcon = true;
                            this.secondConstructibleSlot.showPlacementIcon = false;
                        }
                        else if (this.secondConstructibleSlot.collectionIndex == overbuildConstructibleID) {
                            this.secondConstructibleSlot.showPlacementIcon = true;
                            this.shouldShowOverbuild = true;
                            this.overbuildConstructibleSlot = this.secondConstructibleSlot;
                            this.overbuildText = Locale.compose("LOC_UI_CITY_VIEW_PLACE_OVER_DESC", this.secondConstructibleSlot.name);
                            this.placementHeaderText = Locale.compose("LOC_UI_CITY_VIEW_PLACE_OVER", this.overbuildConstructibleSlot.name);
                        }
                        else {
                            this.secondConstructibleSlot.showPlacementIcon = false;
                        }
                    }
                    else {
                        if (selectedDistrict.isUrbanCore) {
                            // Urban plot but second slot is empty
                            this.secondConstructibleSlot.type = ConstructibleIcons.EMPTY;
                            this.firstConstructibleSlot.showPlacementIcon = false;
                            this.secondConstructibleSlot.showPlacementIcon = true;
                            this.placementHeaderText = Locale.compose("LOC_UI_CITY_VIEW_PLACE_HERE");
                        }
                        else {
                            // Rural plot which will get converted to urban which adds a new slot (except improvements and wonders)
                            this.secondConstructibleSlot.type = ConstructibleIcons.ADD;
                            this.firstConstructibleSlot.showPlacementIcon = true;
                            this.secondConstructibleSlot.showPlacementIcon = false;
                            this.overbuildConstructibleSlot = this.firstConstructibleSlot;
                            if (this.isRepairing) {
                                this.placementHeaderText = Locale.compose("LOC_UI_CITY_VIEW_REPAIR", this.firstConstructibleSlot.name);
                                this.firstConstructibleSlot.showRepairIcon = true;
                                this.firstConstructibleSlot.showPlacementIcon = false;
                                this.secondConstructibleSlot.shouldShow = false;
                                this.shouldShowOverbuild = false;
                            }
                            else {
                                this.overbuildText = Locale.compose("LOC_UI_CITY_VIEW_PLACE_OVER_DESC", this.firstConstructibleSlot.name);
                                const converWarning = Locale.compose("LOC_UI_CITY_VIEW_CONVERT_TO_URBAN_WARNING");
                                const placeOver = Locale.compose("LOC_UI_CITY_VIEW_PLACE_OVER", this.overbuildConstructibleSlot.name);
                                this.placementHeaderText = showUrbanWarning ? converWarning : placeOver;
                                this.shouldShowOverbuild = true;
                            }
                        }
                    }
                }
                else {
                    // Expanding and creating a new district on plot
                    this.firstConstructibleSlot.type = ConstructibleIcons.EMPTY;
                    this.firstConstructibleSlot.showPlacementIcon = true;
                    this.secondConstructibleSlot.type = ConstructibleIcons.ADD;
                    this.secondConstructibleSlot.showPlacementIcon = false;
                    const converWarning = Locale.compose("LOC_UI_CITY_VIEW_CONVERT_TO_URBAN_WARNING");
                    const placeOver = Locale.compose("LOC_UI_CITY_VIEW_PLACE_OVER", this.overbuildConstructibleSlot.name);
                    this.placementHeaderText = showUrbanWarning ? converWarning : placeOver;
                }
                // Override Header Text to Indicate Unique Quarter name 
                if (uniqueQuarterDefinition != null && this.selectedPlotIndex == uniqueQuarterPlotIndex) {
                    // We're trying to place the last building in the correct unique quarter slot
                    this.placementHeaderText = Locale.compose(uniqueQuarterDefinition.Name);
                    this.shouldShowUniqueQuarterText = true;
                    this.uniqueQuarterText = Locale.compose("LOC_UI_CITY_VIEW_UNIQUE_QUARTER_WILL_COMPLETE", this.selectedConstructibleInfo.name, uniqueQuarterDefinition.Name);
                    this.uniqueQuarterWarning = "";
                }
                else if (uniqueQuarterDefinition != null && uniqueQuarterPlotIndex != -1) {
                    // Warning that placing the last unique building here will make finishing the unique quarter impossible
                    this.shouldShowUniqueQuarterText = true;
                    this.uniqueQuarterText = "";
                    this.uniqueQuarterWarning = Locale.compose("LOC_UI_CITY_VIEW_UNIQUE_QUARTER_CANT_COMPLETE", uniqueQuarterDefinition.Name);
                }
                else {
                    this.shouldShowUniqueQuarterText = false;
                }
                // From this Plot Yields
                this.fromThisPlotYields = [];
                const plotYieldsData = BuildingPlacementManager.getPlotYieldChanges(this.selectedPlotIndex);
                plotYieldsData?.forEach((data) => {
                    this.fromThisPlotYields.push(Locale.stylize('LOC_BUILDING_PLACEMENT_YIELD', data.yieldChange, data.text));
                });
                this.shouldShowFromThisPlot = this.fromThisPlotYields.length > 0;
                // Adjacency Bonuses
                this.adjacencyBonuses = [];
                const adjacencyData = BuildingPlacementManager.getAdjacencyYieldChanges(this.selectedPlotIndex);
                adjacencyData?.forEach((data) => {
                    this.adjacencyBonuses.push(Locale.stylize('LOC_BUILDING_PLACEMENT_YIELD', data.yieldChange, data.text));
                });
                this.shouldShowAdjacencyBonuses = this.adjacencyBonuses.length > 0;
                // Warehouse Bonuses
                this.warehouseBonuses = [];
                const warehouseData = BuildingPlacementManager.getCumulativeWarehouseBonuses();
                warehouseData.forEach((data) => {
                    this.warehouseBonuses.push({
                        value: data.value > 0 ? "+" + data.value.toString() : "-" + data.value.toString(),
                        icon: UI.getIconURL(data.type, 'YIELD'),
                        description: Locale.compose("LOC_BUILDING_PLACEMENT_WAREHOUSE_BONUS", data.name)
                    });
                });
            }
            else {
                this.selectedConstructibleInfo.details = [];
                this.selectedConstructibleInfo.details.push(composeConstructibleDescription(constructibleDef.ConstructibleType, city));
                this.hasSelectedPlot = false;
                this.shouldShowFromThisPlot = false;
                this.shouldShowAdjacencyBonuses = false;
                this.shouldShowOverbuild = false;
                this.shouldShowUniqueQuarterText = false;
                this.selectPlotMessage = Locale.compose('LOC_UI_CITY_VIEW_SELECT_A_PLOT', this.selectedConstructibleInfo.name);
            }
            if (this._OnUpdate) {
                this._OnUpdate(this);
            }
        });
        this.onSelectedPlotChanged = () => {
            this.selectedPlotIndex = BuildingPlacementManager.selectedPlotIndex;
            this.updateGate.call('onSelectedPlotChanged');
        };
        this.onConstructibleChanged = () => {
            this.updateGate.call('onConstructibleChanged');
        };
        engine.whenReady.then(() => {
            window.addEventListener(BuildingPlacementSelectedPlotChangedEventName, this.onSelectedPlotChanged);
            window.addEventListener(BuildingPlacementConstructibleChangedEventName, this.onConstructibleChanged);
        });
    }
    set updateCallback(callback) {
        this._OnUpdate = callback;
    }
    getConstructibleInfoByComponentID(constructibleID) {
        let constructibleInfo = {
            name: "",
            type: ConstructibleIcons.EMPTY,
            shouldShow: true,
            details: [],
            showPlacementIcon: false,
            showRepairIcon: false,
            collectionIndex: -1
        };
        const cityID = BuildingPlacementManager.cityID;
        if (!cityID) {
            console.warn('model-place-building: getConstructibleInfoByComponentID(): Tried to update but BuildingPlacementManager does not have a valid cityID.');
            return constructibleInfo;
        }
        const city = Cities.get(cityID);
        if (!city) {
            console.warn(`model-place-building: getConstructibleInfoByComponentID(): Failed to get the city for cityID ${cityID} provided by BuildingPlacementManager.`);
            return constructibleInfo;
        }
        const constructible = Constructibles.getByComponentID(constructibleID);
        if (constructible) {
            const constructibleDefinition = GameInfo.Constructibles.lookup(constructible.type);
            if (constructibleDefinition) {
                constructibleInfo.name = constructibleDefinition.Name;
                constructibleInfo.details.push(composeConstructibleDescription(constructibleDefinition.ConstructibleType, city));
                constructibleInfo.type = constructibleDefinition.ConstructibleType;
                constructibleInfo.collectionIndex = constructibleDefinition.$index;
            }
            else {
                console.error(`model-place-building: Failed to get constructible definition for type ${constructible.type}`);
            }
        }
        else {
            console.error(`model-place-building: Failed to get constructible for id ${constructibleID}`);
        }
        return constructibleInfo;
    }
}
const PlaceBuilding = new PlaceBuildingModel();
engine.whenReady.then(() => {
    const updateModel = () => {
        engine.updateWholeModel(PlaceBuilding);
    };
    engine.createJSModel('g_PlaceBuilding', PlaceBuilding);
    PlaceBuilding.updateCallback = updateModel;
});
export { PlaceBuilding as default };

//# sourceMappingURL=file:///base-standard/ui/place-building/model-place-building.js.map
