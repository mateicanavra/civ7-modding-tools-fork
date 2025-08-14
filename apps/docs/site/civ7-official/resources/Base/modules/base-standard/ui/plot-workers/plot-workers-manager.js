/**
 * @file plot-workers-manager.ts
 * @copyright 2022 - 2024, Firaxis Games
 * @description Helper class that holds all of the plot workers data
 */
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
export const PlotWorkersHoveredPlotChangedEventName = 'population-placement-hovered-plot-changed';
export class PlotWorkersHoveredPlotChangedEvent extends CustomEvent {
    constructor() {
        super(PlotWorkersHoveredPlotChangedEventName, { bubbles: false, cancelable: true });
    }
}
export const PlotWorkersUpdatedEventName = 'plot-workers-updated';
export class PlotWorkersUpdatedEvent extends CustomEvent {
    constructor(location) {
        super(PlotWorkersUpdatedEventName, { bubbles: false, cancelable: true, detail: { location } });
    }
}
class PlotWorkersManagerClass {
    get cityID() {
        return this._cityID;
    }
    get allWorkerPlots() {
        return this._allWorkerPlots;
    }
    get allWorkerPlotIndexes() {
        return this._allWorkerPlotIndexes;
    }
    get workablePlots() {
        return this._workablePlots;
    }
    get workablePlotIndexes() {
        return this._workablePlotIndexes;
    }
    get blockedPlots() {
        return this._blockedPlots;
    }
    get blockedPlotIndexes() {
        return this._blockedPlotIndexes;
    }
    get hoveredPlotIndex() {
        return this._hoveredPlotIndex;
    }
    set hoveredPlotIndex(plotIndex) {
        if (this._hoveredPlotIndex == plotIndex) {
            // This plot is already selected or already null
            return;
        }
        if (plotIndex != null && this.isPlotIndexSelectable(plotIndex)) {
            this._hoveredPlotIndex = plotIndex;
        }
        else {
            this._hoveredPlotIndex = null;
        }
        window.dispatchEvent(new PlotWorkersHoveredPlotChangedEvent());
    }
    //TODO: Once concept of worker caps in implemented
    //private fullWorkablePlots: PlotIndex[] = [];
    constructor() {
        this._cityID = null;
        this._allWorkerPlots = [];
        this._allWorkerPlotIndexes = [];
        this._workablePlots = [];
        this._workablePlotIndexes = [];
        this._blockedPlots = [];
        this._blockedPlotIndexes = [];
        this._hoveredPlotIndex = null;
        this.onWorkerAdded = (data) => {
            if (!ComponentID.isMatch(this._cityID, data.cityID)) {
                // Event unrelated to current city
                return;
            }
            this.update();
            window.dispatchEvent(new PlotWorkersUpdatedEvent(data.location));
        };
        if (PlotWorkersManagerClass.instance) {
            console.error("Only one instance of the diplomacy manager class exist at a time, second attempt to create one.");
        }
        PlotWorkersManagerClass.instance = this;
        engine.on('WorkerAdded', this.onWorkerAdded);
    }
    reset() {
        this._allWorkerPlots = [];
        this._allWorkerPlotIndexes = [];
        this._workablePlots = [];
        this._workablePlotIndexes = [];
        this._blockedPlots = [];
        this._blockedPlotIndexes = [];
    }
    initializeWorkersData(cityID) {
        this._allWorkerPlots = [];
        this._allWorkerPlotIndexes = [];
        this._workablePlots = [];
        this._workablePlotIndexes = [];
        this._blockedPlots = [];
        this._blockedPlotIndexes = [];
        const city = Cities.get(cityID);
        if (!city?.Workers) {
            console.error("plot-workers-manager: Unable to fetch valid city object for city with ID: " + ComponentID.toLogString(cityID));
            return;
        }
        this._cityID = cityID;
        this.update();
    }
    update() {
        if (!this._cityID) {
            // Don't worry about updating if we no longer have a valid id anymore
            return;
        }
        const city = Cities.get(this._cityID);
        if (!city?.Workers) {
            console.error("plot-workers-manager: Unable to fetch valid city object for city with ID: " + ComponentID.toLogString(this._cityID));
            return;
        }
        ;
        this._allWorkerPlots = city.Workers.GetAllPlacementInfo();
        this._allWorkerPlots.forEach(info => {
            this._allWorkerPlotIndexes.push(info.PlotIndex);
            if (info.IsBlocked) {
                this._blockedPlots.push(info);
                this._blockedPlotIndexes.push(info.PlotIndex);
            }
            else {
                this._workablePlots.push(info);
                this._workablePlotIndexes.push(info.PlotIndex);
            }
        });
    }
    getYieldPillIcon(yieldType, yieldNum) {
        if (!yieldNum || yieldNum == 0) {
            return UI.getIconBLP(yieldType).toLowerCase() + "_neut";
        }
        else if (yieldNum > 0) {
            return UI.getIconBLP(yieldType).toLowerCase() + "_pos";
        }
        else {
            return UI.getIconBLP(yieldType).toLowerCase() + "_neg";
        }
    }
    isPlotIndexSelectable(plotIndex) {
        return this._allWorkerPlotIndexes.find((index) => { return index == plotIndex; }) != undefined;
    }
}
PlotWorkersManagerClass.instance = null;
const PlotWorkersManager = new PlotWorkersManagerClass();
export { PlotWorkersManager as default };

//# sourceMappingURL=file:///base-standard/ui/plot-workers/plot-workers-manager.js.map
