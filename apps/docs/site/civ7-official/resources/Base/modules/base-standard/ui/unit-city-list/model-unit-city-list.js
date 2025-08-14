/**
 * @file model-unit-city-list.ts
 * @copyright 2020-2021, Firaxis Games
 */
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
import { Icon } from '/core/ui/utilities/utilities-image.js';
import PlotCursor from '/core/ui/input/plot-cursor.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
var UnityCityItemType;
(function (UnityCityItemType) {
    UnityCityItemType[UnityCityItemType["Type_City"] = 0] = "Type_City";
    UnityCityItemType[UnityCityItemType["Type_Town"] = 1] = "Type_Town";
    UnityCityItemType[UnityCityItemType["Type_Unit"] = 2] = "Type_Unit";
})(UnityCityItemType || (UnityCityItemType = {}));
class UnitCityList {
    constructor() {
        this._items = []; // Property
        this.unitAddedRemovedListener = (data) => { this.onUnitAddedRemoved(data); };
        this.dirty = false;
        engine.whenReady.then(() => {
            const playerTurnOrCitySelectionListener = () => {
                this.update();
            };
            engine.on('PlayerTurnActivated', playerTurnOrCitySelectionListener);
            engine.on('CitySelectionChanged', playerTurnOrCitySelectionListener);
            engine.on('UnitAddedToMap', (data) => { this.unitAddedRemovedListener(data); });
            engine.on('UnitRemovedFromMap', (data) => { this.unitAddedRemovedListener(data); });
            this.update();
        });
    }
    set updateCallback(callback) {
        this._OnUpdate = callback;
    }
    get items() {
        //! TEMPORARILLY DISABLE UNIT-CITY-LIST
        return [];
        //return this._items ?? [];
    }
    get numItems() {
        //! TEMPORARILLY DISABLE UNIT-CITY-LIST
        return 0;
        //return this._items.length;
    }
    update() {
        const player = Players.get(GameContext.localPlayerID);
        this._items = [];
        if (!player) {
            return;
        }
        let cities = player.Cities?.getCityIds();
        if (cities) {
            cities.forEach(cityID => {
                const city = Cities.get(cityID);
                if (city) {
                    if (city.isTown) {
                        const item = {
                            id: cityID,
                            hashedID: ComponentID.toString(cityID),
                            name: Locale.compose(city.name),
                            tooltip: Locale.compose(city.name),
                            tooltipStyle: "UnitCityList_TownTooltipType",
                            itemType: UnityCityItemType.Type_Town,
                            icon: `fs://game/core/ui/themes/default/img/icons/cityList_town1.png`,
                            isCityOrTown: true
                        };
                        this._items.push(item);
                    }
                    else {
                        const item = {
                            id: cityID,
                            hashedID: ComponentID.toString(cityID),
                            name: Locale.compose(city.name),
                            tooltip: Locale.compose(city.name),
                            tooltipStyle: "UnitCityList_CityTooltipType",
                            itemType: UnityCityItemType.Type_City,
                            icon: `fs://game/core/ui/themes/default/img/icons/cityList_city2.png`,
                            isCityOrTown: true
                        };
                        this._items.push(item);
                    }
                }
            });
        }
        const units = player.Units?.getUnitIds();
        if (units) {
            units.forEach(unitID => {
                const unit = Units.get(unitID);
                if (unit && !unit.isAutomated) {
                    const item = {
                        id: unitID,
                        hashedID: ComponentID.toString(unitID),
                        name: Locale.compose(unit.name),
                        tooltip: Locale.compose(unit.name),
                        //tooltipStyle: "UnitCityList_UnitTooltipType",
                        itemType: UnityCityItemType.Type_Unit,
                        icon: Icon.getUnitIconFromID(unitID),
                        isDisabled: (!unit.isOnMap),
                        isCityOrTown: false
                    };
                    this._items.push(item);
                }
            });
        }
        if (this._OnUpdate) {
            this._OnUpdate(this);
        }
    }
    inspect(targetComponentID) {
        const itemInfo = this._items.find(c => (ComponentID.isMatch(c.id, targetComponentID)));
        switch (itemInfo?.itemType) {
            case UnityCityItemType.Type_Unit:
                const unit = Units.get(itemInfo.id);
                if (!unit) {
                    console.error("Player selected unit but received null from engine. ID: ", itemInfo.id, " cid: ", ComponentID.toLogString(targetComponentID));
                    return;
                }
                this.selectUnit(unit);
                break;
            case UnityCityItemType.Type_City:
            case UnityCityItemType.Type_Town:
                const city = Cities.get(itemInfo.id);
                this.selectCity(city);
                break;
        }
    }
    onUnitAddedRemoved(data) {
        if (data.unit.owner == GameContext.localPlayerID) {
            this.queueUpdate();
        }
    }
    queueUpdate() {
        if (!this.dirty) {
            this.dirty = true;
            requestAnimationFrame(() => {
                this.update();
                this.dirty = false;
            });
        }
    }
    selectCity(targetCity) {
        if (targetCity == null || targetCity.location == null) {
            return;
        }
        // Unselect the city if it's already selected
        const selectedCityID = UI.Player.getHeadSelectedCity();
        if (ComponentID.isMatch(selectedCityID, targetCity.id)) {
            UI.Player.deselectAllCities();
            return;
        }
        const plotCoordinates = targetCity.location;
        if (plotCoordinates.x == -1 || plotCoordinates.y == -1) {
            console.error("Attempt to select a city in the model unit city list but location is (-1,-1). cid: ", ComponentID.toLogString(targetCity.id));
        }
        else {
            Camera.lookAtPlot(plotCoordinates);
            PlotCursor.plotCursorCoords = plotCoordinates;
            const cityID = MapCities.getCity(plotCoordinates.x, plotCoordinates.y);
            if (cityID && cityID.owner == GameContext.localPlayerID) {
                UI.Player.selectCity(cityID);
            }
        }
    }
    selectUnit(unit) {
        if (!unit.isOnMap) {
            // TODO: When army interface is exposed, find commander and go to it.
            console.warn("Ignoring select unit because it doesn't have a valid map position; likely packed in an army. cid: ", ComponentID.toLogString(unit.id));
            return;
        }
        // Switch to default interface mode to unselect the unit if it's already selected
        const selectedUnitID = UI.Player.getHeadSelectedUnit();
        if (ComponentID.isMatch(selectedUnitID, unit.id)) {
            InterfaceMode.switchToDefault();
            return;
        }
        const plotCoordinates = unit.location;
        Camera.lookAtPlot(plotCoordinates);
        UI.Player.selectUnit(unit.id);
    }
}
const UnitCityListModel = new UnitCityList();
engine.whenReady.then(() => {
    const updateModel = () => {
        engine.updateWholeModel(UnitCityListModel);
    };
    engine.createJSModel('g_UnitCityList', UnitCityListModel);
    UnitCityListModel.updateCallback = updateModel;
});
export { UnitCityListModel as default };

//# sourceMappingURL=file:///base-standard/ui/unit-city-list/model-unit-city-list.js.map
