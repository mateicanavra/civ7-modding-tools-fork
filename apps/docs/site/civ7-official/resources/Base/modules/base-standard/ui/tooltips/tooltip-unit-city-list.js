/**
 * @file Unit City Tooltips
 * @copyright 2021, Firaxis Gmaes
 * @description The tooltips that appear based on the cursor hovering items in the HUD Unit/City List.
 */
/* https://textik.com/#867e836940562138
+------------------------------------------------------------------------------------------------------------------------------------------------------------+
|info-panel                                   +-------------------------------------------------------------------+                                          |
|                                             |  +-------------------------------------------------------------+  |                                          |
|                                             |  |  fxs-ornament                                               |  |                                          |
|                                             |  |                                                             |  |                                          |
|    +--------------------------------------- |  +-------------------------------------------------------------+  |                                          |
|    |frame                                   |  +-------------------------------------------------------------+  |------------------------------------+     |
|    |                                        |  | title                                                       |  |                         +--------+ |     |
|    |                                        |  |                                                             |  |                         |  arrow | |     |
|    |                                        |  |                                                             |  |                         |        | |     |
|    |                                        |  +-------------------------------------------------------------+  |                         +--------+ |     |
|    |                                        +-------------------------------------------------------------------+                                    |     |
|    |  +--------------------------------------------------------------------------------------------------------------------------------------------+ |     |
|    |  | infoContainer                                                                                                                              | |     |
|    |  |                                                                                                                                            | |     |
|    |  |    +-----------------------------------------------------+  +---+  +---------------------------------------------------------------------+ | |     |
|    |  |    |  statsInfo                                          |  | f |  |    productionInfo                                   +------------+  | | |     |
|    |  |    | +------------------------------------------------+  |  | x |  |                                                     |            |  | | |     |
|    |  |    | | +--------------------+ +--------------------+  |  |  | s |  |    +---------------------------------------------+  |   icon     |  | | |     |
|    |  |    | | |             value  | | label              |  |  |  |   |  |    | label                                       |  |            |  | | |     |
|    |  |    | | +--------------------+ +--------------------+  |  |  | o |  |    +---------------------------------------------+  |            |  | | |     |
|    |  |    | | +--------------------+ +--------------------+  |  |  | r |  |    +----------------------------------------------+ |            |  | | |     |
|    |  |    | | |             value  | | label              |  |  |  | n |  |    |title                                         | +------------+  | | |     |
|    |  |    | | +--------------------+ +--------------------+  |  |  | a |  |    |                                              |                 | | |     |
|    |  |    | | +--------------------+ +--------------------+  |  |  | m |  |    +----------------------------------------------+                 | | |     |
|    |  |    | | |             value  | | label              |  |  |  | e |  |    +-------------------------------------------------------------+  | | |     |
|    |  |    | | +--------------------+ +--------------------+  |  |  | n |  |    |body                                                         |  | | |     |
|    |  |    | |                                                |  |  | t |  |    |                                                             |  | | |     |
|    |  |    | +------------------------------------------------+  |  |   |  |    +-------------------------------------------------------------+  | | |     |
|    |  |    | +------------------------------------------------+  |  |   |  |    +--------------------------------------------------------------+ | | |     |
|    |  |    | | turnsInfo                                      |  |  |   |  |    | turnsInfo                                                    | | | |     |
|    |  |    | | +---------------------+ +--------------------+ |  |  |   |  |    | +---------------------+ +--------------------+               | | | |     |
|    |  |    | | |              value  | | label              | |  |  |   |  |    | |              value  | | label              |               | | | |     |
|    |  |    | | +---------------------+ +--------------------+ |  |  |   |  |    | +---------------------+ +--------------------+               | | | |     |
|    |  |    | +------------------------------------------------+  |  |   |  |    +--------------------------------------------------------------+ | | |     |
|    |  |    +-----------------------------------------------------+  +---+  +---------------------------------------------------------------------+ | |     |
|    |  +--------------------------------------------------------------------------------------------------------------------------------------------+ |     |
|    |-------------------------------------------------------------------------------------------------------------------------------------------------+     |
|                                                                                                                                                            |
|                                                                                                                                                            |
+------------------------------------------------------------------------------------------------------------------------------------------------------------+*/
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
import TooltipManager from '/core/ui/tooltips/tooltip-manager.js';
class UnitCityList_CityTooltipType {
    constructor() {
        this.component = document.createElement('fxs-tooltip');
        this.div = document.createElement('div');
        this.div.classList.add("tooltip-text");
        this.component.appendChild(this.div);
    }
    getHTML() {
        return this.component;
    }
    reset() {
        while (this.div.hasChildNodes()) {
            this.div.removeChild(this.div.lastChild);
        }
    }
    isUpdateNeeded(target) {
        const cid = getComponentID(target);
        if (!cid || this.cityID == undefined) {
            return false;
        }
        if (ComponentID.isMatch(this.cityID, cid)) {
            return false;
        }
        this.cityID = cid; //Save for later update 
        return true;
    }
    update() {
        if (this.cityID == undefined)
            return;
        const city = Cities.get(this.cityID);
        if (!city)
            return;
        this.div.innerHTML = Locale.compose(city.name);
        //this.div.innerHTML = Locale.compose(city.name) + "<br>" + JSON.stringify(city); //This crashes in native! 
        //TODO: build fancy tooltip contents here 
    }
    isBlank() {
        return (this.cityID == undefined || ComponentID.isInvalid(this.cityID));
    }
}
TooltipManager.registerType('UnitCityList_CityTooltipType', new UnitCityList_CityTooltipType());
// ------------------------------------------------------
class UnitCityList_TownTooltipType {
    constructor() {
        this.component = document.createElement('fxs-tooltip');
        this.div = document.createElement('div');
        this.div.classList.add("tooltip-text");
        this.component.appendChild(this.div);
    }
    getHTML() {
        return this.component;
    }
    reset() {
        while (this.div.hasChildNodes()) {
            this.div.removeChild(this.div.lastChild);
        }
    }
    isUpdateNeeded(target) {
        const cid = getComponentID(target);
        if (!cid || this.townID == undefined) {
            return false;
        }
        if (ComponentID.isMatch(this.townID, cid)) {
            return false;
        }
        this.townID = cid; //Save for later update 
        return true;
    }
    update() {
        if (this.townID == undefined)
            return;
        const city = Cities.get(this.townID);
        if (!city)
            return;
        this.div.innerHTML = Locale.compose(city.name);
        //TODO: build fancy tooltip contents here 
    }
    isBlank() {
        return (this.townID == undefined || ComponentID.isInvalid(this.townID));
    }
}
TooltipManager.registerType('UnitCityList_TownTooltipType', new UnitCityList_TownTooltipType());
// ------------------------------------------------------
class UnitCityList_UnitTooltipType {
    constructor() {
        this.component = document.createElement('fxs-tooltip');
        this.div = document.createElement('div');
        this.div.classList.add("tooltip-text");
        this.component.appendChild(this.div);
    }
    getHTML() {
        return this.component;
    }
    reset() {
        while (this.div.hasChildNodes()) {
            this.div.removeChild(this.div.lastChild);
        }
    }
    isUpdateNeeded(target) {
        const cid = getComponentID(target);
        if (!cid || this.unitID == undefined) {
            return false;
        }
        if (ComponentID.isMatch(this.unitID, cid)) {
            return false;
        }
        this.unitID = cid; //Save for later update 
        return true;
    }
    update() {
        if (this.unitID == undefined)
            return;
        const unit = Units.get(this.unitID);
        if (!unit)
            return;
        let tooltipString = Locale.compose(unit.name);
        if (unit.Movement) {
            tooltipString += "<br>" + (unit.hasMoved ? Locale.compose("LOC_UI_UNITCITYLIST_MOVED") : Locale.compose("LOC_UI_UNITCITYLIST_NOT_MOVED", unit.Movement.movementMovesRemaining.toString()));
        }
        this.div.innerHTML = tooltipString;
        //TODO: build fancy tooltip contents here 
    }
    isBlank() {
        return (this.unitID == undefined || ComponentID.isInvalid(this.unitID));
    }
}
TooltipManager.registerType('UnitCityList_UnitTooltipType', new UnitCityList_UnitTooltipType());
// TODO: Remove this and replace with ComponentID helper library
function getComponentID(target) {
    const itemID = target.getAttribute('componentIDID');
    const itemType = target.getAttribute('componentIDType');
    const itemOwner = target.getAttribute('componentIDOwner');
    if (!itemOwner || !itemID || !itemType) {
        return undefined;
    }
    const targetID = +itemID;
    const targetType = +itemType;
    const targetOwner = +itemOwner;
    return { owner: targetOwner, id: targetID, type: targetType };
}

//# sourceMappingURL=file:///base-standard/ui/tooltips/tooltip-unit-city-list.js.map
