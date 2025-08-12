/**
 * @file plot-workers-manager.ts
 * @copyright 2022 - 2024, Firaxis Games
 * @description Helper class that holds all of the plot workers data
 */

import { ComponentID } from '/core/ui/utilities/utilities-component-id.js'

export interface YieldPillData {
	iconURL: string,
	yieldDelta: number
}

export const PlotWorkersHoveredPlotChangedEventName = 'population-placement-hovered-plot-changed' as const;
export class PlotWorkersHoveredPlotChangedEvent extends CustomEvent<{}> {
	constructor() {
		super(PlotWorkersHoveredPlotChangedEventName, { bubbles: false, cancelable: true });
	}
}

export const PlotWorkersUpdatedEventName = 'plot-workers-updated' as const;
export class PlotWorkersUpdatedEvent extends CustomEvent<{ location: PlotCoord | undefined }> {
	constructor(location?: PlotCoord) {
		super(PlotWorkersUpdatedEventName, { bubbles: false, cancelable: true, detail: { location } });
	}
}

class PlotWorkersManagerClass {
	private static instance: PlotWorkersManagerClass | null = null;

	private _cityID: ComponentID | null = null;
	get cityID(): ComponentID | null {
		return this._cityID;
	}

	private _allWorkerPlots: WorkerPlacementInfo[] = [];
	get allWorkerPlots(): WorkerPlacementInfo[] {
		return this._allWorkerPlots;
	}
	private _allWorkerPlotIndexes: PlotIndex[] = [];
	get allWorkerPlotIndexes(): PlotIndex[] {
		return this._allWorkerPlotIndexes;
	}

	private _workablePlots: WorkerPlacementInfo[] = [];
	get workablePlots(): WorkerPlacementInfo[] {
		return this._workablePlots;
	}

	private _workablePlotIndexes: PlotIndex[] = [];
	get workablePlotIndexes(): PlotIndex[] {
		return this._workablePlotIndexes;
	}
	private _blockedPlots: WorkerPlacementInfo[] = [];
	get blockedPlots(): WorkerPlacementInfo[] {
		return this._blockedPlots;
	}

	private _blockedPlotIndexes: PlotIndex[] = [];
	get blockedPlotIndexes(): PlotIndex[] {
		return this._blockedPlotIndexes;
	}

	private _hoveredPlotIndex: PlotIndex | null = null;
	get hoveredPlotIndex(): Readonly<PlotIndex | null> {
		return this._hoveredPlotIndex;
	}
	set hoveredPlotIndex(plotIndex: PlotIndex | null) {
		if (this._hoveredPlotIndex == plotIndex) {
			// This plot is already selected or already null
			return;
		}

		if (plotIndex != null && this.isPlotIndexSelectable(plotIndex)) {
			this._hoveredPlotIndex = plotIndex;
		} else {
			this._hoveredPlotIndex = null;
		}

		window.dispatchEvent(new PlotWorkersHoveredPlotChangedEvent());
	}

	//TODO: Once concept of worker caps in implemented
	//private fullWorkablePlots: PlotIndex[] = [];

	constructor() {
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

	initializeWorkersData(cityID: ComponentID) {
		this._allWorkerPlots = [];
		this._allWorkerPlotIndexes = [];
		this._workablePlots = [];
		this._workablePlotIndexes = [];
		this._blockedPlots = [];
		this._blockedPlotIndexes = [];
		const city: City | null = Cities.get(cityID);
		if (!city?.Workers) {
			console.error("plot-workers-manager: Unable to fetch valid city object for city with ID: " + ComponentID.toLogString(cityID));
			return;
		}

		this._cityID = cityID;

		this.update();
	}

	private update() {
		if (!this._cityID) {
			// Don't worry about updating if we no longer have a valid id anymore
			return;
		}

		const city: City | null = Cities.get(this._cityID);
		if (!city?.Workers) {
			console.error("plot-workers-manager: Unable to fetch valid city object for city with ID: " + ComponentID.toLogString(this._cityID));
			return;
		};

		this._allWorkerPlots = city.Workers.GetAllPlacementInfo();
		this._allWorkerPlots.forEach(info => {
			this._allWorkerPlotIndexes.push(info.PlotIndex);
			if (info.IsBlocked) {
				this._blockedPlots.push(info);
				this._blockedPlotIndexes.push(info.PlotIndex);
			} else {
				this._workablePlots.push(info);
				this._workablePlotIndexes.push(info.PlotIndex);
			}
		});
	}

	getYieldPillIcon(yieldType: string, yieldNum?: number) {
		if (!yieldNum || yieldNum == 0) {
			return UI.getIconBLP(yieldType).toLowerCase() + "_neut";
		} else if (yieldNum > 0) {
			return UI.getIconBLP(yieldType).toLowerCase() + "_pos";
		} else {
			return UI.getIconBLP(yieldType).toLowerCase() + "_neg";
		}
	}

	private isPlotIndexSelectable(plotIndex: PlotIndex) {
		return this._allWorkerPlotIndexes.find((index) => { return index == plotIndex }) != undefined;
	}

	private onWorkerAdded = (data: WorkerAdded_EventData): void => {
		if (!ComponentID.isMatch(this._cityID, data.cityID)) {
			// Event unrelated to current city
			return;
		}

		this.update();

		window.dispatchEvent(new PlotWorkersUpdatedEvent(data.location));
	}
}

const PlotWorkersManager: PlotWorkersManagerClass = new PlotWorkersManagerClass();
export { PlotWorkersManager as default };