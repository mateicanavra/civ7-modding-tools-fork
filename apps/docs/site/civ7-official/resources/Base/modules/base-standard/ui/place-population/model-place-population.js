/**
 * @file model-place-population.ts
 * @copyright 2024, Firaxis Games
 * @description Data model for placing a selecting a plot to grow
 */
import { ComponentID } from "/core/ui/utilities/utilities-component-id.js";
import CityYields from '/base-standard/ui/utilities/utilities-city-yields.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js';
import { PlotCursorUpdatedEventName } from '/core/ui/input/plot-cursor.js';
import PlotWorkersManager, { PlotWorkersHoveredPlotChangedEventName } from '/base-standard/ui/plot-workers/plot-workers-manager.js';
class PlacePopulationModel {
    get cityWorkerCap() {
        return this._cityWorkerCap;
    }
    constructor() {
        this.cityName = "";
        this.cityYields = [];
        this.isTown = false;
        this.isResettling = false;
        this.hasHoveredWorkerPlot = false;
        this.numSpecialistsMessage = "";
        this.canAddSpecialistMessage = "";
        this.slotsAvailableMessage = "";
        this.maxSlotsMessage = "";
        this.bonusGrantedMessage = "";
        this.shouldShowImprovement = false;
        this.addImprovementType = "";
        this.addImprovementText = "";
        this.expandPlots = [];
        this.ExpandPlotDataUpdatedEvent = new LiteEvent();
        this._cityWorkerCap = 0;
        this.hoveredPlotWorkerIndex = null;
        this.hoveredPlotWorkerPlacementInfo = undefined;
        this.plotCursorCoordsUpdatedListener = this.onPlotCursorCoordsUpdated.bind(this);
        this.updateGate = new UpdateGate(() => {
            this.update();
        });
        this.onWorkersHoveredPlotChanged = () => {
            this.hoveredPlotWorkerIndex = PlotWorkersManager.hoveredPlotIndex;
            this.updateGate.call('onWorkersHoveredPlotChanged');
        };
        this.onWorkerAdded = () => {
            this.updateGate.call('onWorkerAdded');
        };
        engine.whenReady.then(() => {
            window.addEventListener(PlotWorkersHoveredPlotChangedEventName, this.onWorkersHoveredPlotChanged);
            window.addEventListener(PlotCursorUpdatedEventName, this.plotCursorCoordsUpdatedListener);
            engine.on('WorkerAdded', this.onWorkerAdded);
        });
    }
    set updateCallback(callback) {
        this._OnUpdate = callback;
    }
    updateExpandPlots(id) {
        this.expandPlots = [];
        const result = Game.CityCommands.canStart(id, CityCommandTypes.EXPAND, {}, false);
        if (!result.Plots) {
            console.error("model-place-population: updateExpandPlots() failed to get any Plots for Expand command");
            return;
        }
        for (const [index, plotIndex] of result.Plots.entries()) {
            if (!result.ConstructibleTypes) {
                console.error(`model-place-population: Failed to get ConstructibleTypes results for plotIndex ${plotIndex}`);
                return;
            }
            const constructibleType = result.ConstructibleTypes[index];
            this.expandPlots.push({
                plotIndex: plotIndex,
                constructibleType: constructibleType
            });
        }
        this.isResettling = false;
        this.ExpandPlotDataUpdatedEvent.trigger(this.expandPlots);
    }
    updateExpandPlotsForResettle(id) {
        this.expandPlots = [];
        const result = Game.UnitCommands.canStart(id, UnitCommandTypes.RESETTLE, {}, false);
        if (!result.Plots) {
            console.error("model-place-population: updateExpandPlotsForResettle() failed to get any Plots for Resettle command");
            return;
        }
        for (const [index, plotIndex] of result.Plots.entries()) {
            if (!result.ConstructibleTypes) {
                console.error(`model-place-population: Failed to get ConstructibleTypes results for plotIndex ${plotIndex}`);
                return;
            }
            const constructibleType = result.ConstructibleTypes[index];
            this.expandPlots.push({
                plotIndex: plotIndex,
                constructibleType: constructibleType
            });
        }
        this.isResettling = true;
        this.ExpandPlotDataUpdatedEvent.trigger(this.expandPlots);
    }
    getExpandPlots() {
        return this.expandPlots;
    }
    getExpandPlotsIndexes() {
        const expandPlotIndexes = [];
        this.expandPlots.forEach(data => {
            expandPlotIndexes.push(data.plotIndex);
        });
        return expandPlotIndexes;
    }
    getExpandConstructibleForPlot(plotIndex) {
        const expandPlotData = this.expandPlots.find(data => {
            return data.plotIndex == plotIndex;
        });
        if (expandPlotData) {
            return expandPlotData.constructibleType;
        }
        else {
            console.error(`model-place-population: getExpandConstructibleForPlot failed to find constructibleType for plotIndex ${plotIndex}`);
            return undefined;
        }
    }
    update() {
        if (InterfaceMode.getCurrent() != "INTERFACEMODE_ACQUIRE_TILE") {
            // Ignore updates if we're not in the right interface mode
            // Can be expected if GameEvents trigger updates
            return;
        }
        // Make sure we got a ComponentID
        let cityID = ComponentID.getInvalidID();
        const acquireTileParameters = InterfaceMode.getParameters();
        if (acquireTileParameters.CityID &&
            acquireTileParameters.CityID.id != undefined &&
            acquireTileParameters.CityID.owner != undefined &&
            acquireTileParameters.CityID.type != undefined) {
            cityID = acquireTileParameters.CityID;
        }
        if (ComponentID.isInvalid(cityID)) {
            console.error(`model-place-population: Failed to get city ComponentID from INTERFACEMODE_ACQUIRE_TILE!`);
            return;
        }
        const city = Cities.get(cityID);
        if (!city) {
            console.error(`model-place-population: updateGate - failed to find valid CityID for plot ${cityID}`);
            return;
        }
        const cityWorkers = city.Workers;
        if (!cityWorkers) {
            console.error(`model-place-population: updateGate - failed to find valid city workers for city ${cityID}`);
            return;
        }
        this.cityName = city.name;
        this.isTown = city.isTown;
        this.cityYields = CityYields.getCityYieldDetails(cityID);
        this._cityWorkerCap = cityWorkers.getCityWorkerCap();
        this.maxSlotsMessage = Locale.compose("LOC_UI_ACQUIRE_TILE_ADD_POPULATION_MAX_PER_TILE", this._cityWorkerCap);
        // Update Specialist Info
        if (this.hoveredPlotWorkerIndex != null) {
            this.hasHoveredWorkerPlot = true;
            this.hoveredPlotWorkerPlacementInfo = PlotWorkersManager.allWorkerPlots.find((info) => info.PlotIndex == this.hoveredPlotWorkerIndex);
            if (!this.hoveredPlotWorkerPlacementInfo) {
                console.error(`model-place-population: updateGate - no WorkerPlacementInfo for plot ${this.hoveredPlotWorkerIndex}`);
                return;
            }
            this.numSpecialistsMessage = Locale.compose("LOC_UI_ACQUIRE_TILE_NUM_SPECIALISTS", this.hoveredPlotWorkerPlacementInfo.NumWorkers);
            this.canAddSpecialistMessage = this.hoveredPlotWorkerPlacementInfo.IsBlocked ? Locale.compose("LOC_UI_ACQUIRE_TILE_CANNOT_ADD_SPECIALISTS") : Locale.compose("LOC_UI_ACQUIRE_TILE_CAN_ADD_SPECIALISTS");
            this.slotsAvailableMessage = Locale.compose("LOC_UI_ACQUIRE_TILE_SPECIALIST_SLOTS_AVAILABLE", this._cityWorkerCap - cityWorkers.getNumWorkersAtPlot(this.hoveredPlotWorkerIndex));
        }
        else {
            this.hasHoveredWorkerPlot = false;
            this.numSpecialistsMessage = "";
        }
        // Update Improvement Info
        if (this.constructibleToBeBuiltOnExpand) {
            const constructibleDefinition = GameInfo.Constructibles.lookup(this.constructibleToBeBuiltOnExpand);
            if (constructibleDefinition) {
                this.addImprovementType = constructibleDefinition.ConstructibleType;
                this.addImprovementText = Locale.compose('LOC_UI_IMPROVEMENT_FOR_TILE', constructibleDefinition.Name);
            }
        }
        else {
            this.addImprovementText = '';
        }
        if (this._OnUpdate) {
            this._OnUpdate(this);
        }
    }
    onPlotCursorCoordsUpdated(event) {
        if (event.detail.plotCoords) {
            const plotIndex = GameplayMap.getIndexFromLocation(event.detail.plotCoords);
            const plotData = this.expandPlots.find(data => {
                return plotIndex == data.plotIndex;
            });
            if (plotData) {
                this.shouldShowImprovement = true;
                this.constructibleToBeBuiltOnExpand = this.getExpandConstructibleForPlot(plotIndex);
                return;
            }
        }
        this.shouldShowImprovement = false;
        this.constructibleToBeBuiltOnExpand = undefined;
    }
}
const PlacePopulation = new PlacePopulationModel();
engine.whenReady.then(() => {
    const updateModel = () => {
        engine.updateWholeModel(PlacePopulation);
    };
    engine.createJSModel('g_PlacePopulation', PlacePopulation);
    PlacePopulation.updateCallback = updateModel;
});
export { PlacePopulation as default };

//# sourceMappingURL=file:///base-standard/ui/place-population/model-place-population.js.map
