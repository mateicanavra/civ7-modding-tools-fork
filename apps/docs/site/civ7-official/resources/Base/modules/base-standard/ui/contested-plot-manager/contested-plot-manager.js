/**
 * @file Contested Plot Manager
 * @copyright 2021, Firaxis Games
 * @description Manages the visual state of city plots that are contested by enemy Civs
 */
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
class ContestedPlot {
    constructor(plotIndex, cityOwner, plotOwner) {
        this.plotIndex = -1;
        this.cityOwner = -1;
        this.plotOwner = -1;
        this.modelGroup = WorldUI.createModelGroup("contestedPlotGroup");
        this.contesetedAlpha = 0.9;
        this.contestedZOffset = 20;
        this.plotIndex = plotIndex;
        this.cityOwner = cityOwner;
        this.plotOwner = plotOwner;
        this.visualize();
    }
    visualize() {
        this.modelGroup.clear();
        const playerColorPri = UI.Player.getPrimaryColorValueAsHex(this.plotOwner);
        const plotLocation = GameplayMap.getLocationFromIndex(this.plotIndex);
        const revealedState = GameplayMap.getRevealedState(GameContext.localPlayerID, plotLocation.x, plotLocation.y);
        if (revealedState != RevealedStates.HIDDEN) {
            this.modelGroup.addModelAtPlot('UI_Prototype_Sword_Crossed_01', { i: plotLocation.x, j: plotLocation.y }, { x: 0, y: 0, z: this.contestedZOffset }, { angle: 0, alpha: this.contesetedAlpha, tintColor1: playerColorPri });
        }
    }
    destroy() {
        this.modelGroup.destroy();
    }
    update(cityOwner, plotOwner) {
        let shouldDestroy = false;
        this.cityOwner = cityOwner;
        this.plotOwner = plotOwner;
        // If our city owner is the same as the plot owner this plot is no longer contested
        // So, remove the contested plot indicator
        if (this.cityOwner == this.plotOwner) {
            this.destroy();
            shouldDestroy = true;
        }
        else {
            this.visualize();
        }
        return shouldDestroy;
    }
}
class ContestedPlotManagerSingleton {
    constructor() {
        this.contestedPlotMap = new Map();
        this.citiesToUpdate = new Set();
        engine.whenReady.then(() => { this.onReady(); });
    }
    onReady() {
        engine.on('DistrictControlChanged', this.onDistrictControlChanged, this);
        engine.on('DistrictAddedToMap', this.onDistrictAddedToMap, this);
        engine.on('DistrictRemovedFromMap', this.onDistrictRemovedFromMap, this);
        engine.on('CityTransfered', this.onCityTransfered, this);
        engine.on('PlotVisibilityChanged', this.onPlotVisibilityChanged, this);
        this.loadUpdateCity();
    }
    onDistrictControlChanged(data) {
        this.addCityToUpdate(data.cityID);
    }
    onDistrictAddedToMap(data) {
        this.addCityToUpdate(data.cityID);
    }
    onDistrictRemovedFromMap(data) {
        this.addCityToUpdate(data.cityID);
    }
    onCityTransfered(data) {
        this.addCityToUpdate(data.cityID);
    }
    onPlotVisibilityChanged(data) {
        const plotIndex = GameplayMap.getIndexFromLocation(data.location);
        const contestedPlot = this.contestedPlotMap.get(plotIndex);
        if (contestedPlot && data.visibility != RevealedStates.HIDDEN) {
            contestedPlot.visualize();
        }
    }
    loadUpdateCity() {
        const playerList = Players.getAlive();
        for (const player of playerList) {
            const playerCities = player.Cities;
            if (playerCities == undefined) {
                console.warn("Cannot make contested plot banners for player with misisng playerCities object: ", player.name);
                continue;
            }
            const cityIDs = playerCities.getCityIds();
            for (const cityID of cityIDs) {
                this.addCityToUpdate(cityID);
            }
        }
    }
    addCityToUpdate(cityID) {
        this.citiesToUpdate.add(cityID);
        window.requestAnimationFrame(() => { this.checkUpdates(); });
    }
    checkUpdates() {
        this.citiesToUpdate.forEach((cityID) => {
            this.updateCity(cityID);
        });
        this.citiesToUpdate.clear();
    }
    updateCity(cityID) {
        const city = Cities.get(cityID);
        if (city == null) {
            console.warn(`Unable to find the city(${ComponentID.toLogString(cityID)}) from DistrictControlChanged event`);
            return;
        }
        const districts = city.Districts;
        if (districts == undefined) {
            console.warn("Unable to find the districts from DistrictControlChanged event");
            return;
        }
        for (const districtID of districts.getIds()) {
            const district = Districts.get(districtID);
            if (district == null) {
                console.error("null district building city info. cid: " + ComponentID.toLogString(cityID) + ",  districtID: " + ComponentID.toLogString(districtID));
                continue;
            }
            const plotIndex = GameplayMap.getIndexFromLocation(district.location);
            this.addContestedPlot(plotIndex, district.owner, district.controllingPlayer);
        }
    }
    addContestedPlot(plotIndex, owningPlayer, controllingPlayer) {
        const contestedPlot = this.contestedPlotMap.get(plotIndex);
        if (contestedPlot != undefined) {
            // If the plot was already contested see if we need to change/remove the indicator
            if (contestedPlot.update(owningPlayer, controllingPlayer)) {
                this.contestedPlotMap.delete(plotIndex);
            }
        }
        else {
            // If newly contested add the plot and indicator
            if (owningPlayer != controllingPlayer) {
                this.contestedPlotMap.set(plotIndex, new ContestedPlot(plotIndex, owningPlayer, controllingPlayer));
            }
        }
    }
}
const ContestedPlotManager = new ContestedPlotManagerSingleton();
export { ContestedPlotManager as default };

//# sourceMappingURL=file:///base-standard/ui/contested-plot-manager/contested-plot-manager.js.map
