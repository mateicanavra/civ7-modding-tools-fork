/**
 * @file model-place-population.ts
 * @copyright 2024, Firaxis Games
 * @description Data model for placing a selecting a plot to grow
 */

import { ComponentID } from "/core/ui/utilities/utilities-component-id.js";
import CityYields, { CityYieldData } from '/base-standard/ui/utilities/utilities-city-yields.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js'
import { PlotCursorUpdatedEvent, PlotCursorUpdatedEventName } from '/core/ui/input/plot-cursor.js';
import PlotWorkersManager, { PlotWorkersHoveredPlotChangedEventName } from '/base-standard/ui/plot-workers/plot-workers-manager.js';

export type ExpandPlotData = {
	plotIndex: PlotIndex,
	constructibleType: ConstructibleType | undefined
}

class PlacePopulationModel {
	cityName: string = "";
	cityYields: CityYieldData[] = [];
	isTown: boolean = false;
	isResettling: boolean = false;

	hasHoveredWorkerPlot: boolean = false;
	numSpecialistsMessage: string = "";
	canAddSpecialistMessage: string = "";
	slotsAvailableMessage: string = "";
	maxSlotsMessage: string = "";
	bonusGrantedMessage: string = "";

	shouldShowImprovement: boolean = false;
	constructibleToBeBuiltOnExpand: ConstructibleType | undefined;
	addImprovementType: string = "";
	addImprovementText: string = "";

	private expandPlots: ExpandPlotData[] = [];

	ExpandPlotDataUpdatedEvent: LiteEvent<ExpandPlotData[]> = new LiteEvent<ExpandPlotData[]>();

	private _cityWorkerCap: number = 0;
	get cityWorkerCap(): number {
		return this._cityWorkerCap;
	}

	private hoveredPlotWorkerIndex: number | null = null;
	private hoveredPlotWorkerPlacementInfo: WorkerPlacementInfo | undefined = undefined;

	private plotCursorCoordsUpdatedListener = this.onPlotCursorCoordsUpdated.bind(this);

	constructor() {
		engine.whenReady.then(() => {
			window.addEventListener(PlotWorkersHoveredPlotChangedEventName, this.onWorkersHoveredPlotChanged);
			window.addEventListener(PlotCursorUpdatedEventName, this.plotCursorCoordsUpdatedListener);
			engine.on('WorkerAdded', this.onWorkerAdded);
		})
	}

	private _OnUpdate?: (model: PlacePopulationModel) => void;

	set updateCallback(callback: (model: PlacePopulationModel) => void) {
		this._OnUpdate = callback;
	}

	updateExpandPlots(id: ComponentID) {
		this.expandPlots = [];

		const result: OperationResult = Game.CityCommands.canStart(id, CityCommandTypes.EXPAND, {}, false);
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

	updateExpandPlotsForResettle(id: ComponentID) {
		this.expandPlots = [];

		const result: OperationResult = Game.UnitCommands.canStart(id, UnitCommandTypes.RESETTLE, {}, false);
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

	getExpandPlots(): ExpandPlotData[] {
		return this.expandPlots
	}

	getExpandPlotsIndexes(): PlotIndex[] {
		const expandPlotIndexes: PlotIndex[] = [];
		this.expandPlots.forEach(data => {
			expandPlotIndexes.push(data.plotIndex);
		})
		return expandPlotIndexes;
	}

	getExpandConstructibleForPlot(plotIndex: PlotIndex): ConstructibleType | undefined {
		const expandPlotData = this.expandPlots.find(data => {
			return data.plotIndex == plotIndex;
		})

		if (expandPlotData) {
			return expandPlotData.constructibleType;
		} else {
			console.error(`model-place-population: getExpandConstructibleForPlot failed to find constructibleType for plotIndex ${plotIndex}`);
			return undefined;
		}
	}

	private updateGate = new UpdateGate(() => {
		this.update();
	});

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

	private onWorkersHoveredPlotChanged = () => {
		this.hoveredPlotWorkerIndex = PlotWorkersManager.hoveredPlotIndex;
		this.updateGate.call('onWorkersHoveredPlotChanged');
	}

	private onWorkerAdded = () => {
		this.updateGate.call('onWorkerAdded');
	}

	private onPlotCursorCoordsUpdated(event: PlotCursorUpdatedEvent) {
		if (event.detail.plotCoords) {
			const plotIndex = GameplayMap.getIndexFromLocation(event.detail.plotCoords);
			const plotData = this.expandPlots.find(data => {
				return plotIndex == data.plotIndex;
			})

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

const PlacePopulation: PlacePopulationModel = new PlacePopulationModel();
engine.whenReady.then(() => {

	const updateModel = () => {
		engine.updateWholeModel(PlacePopulation);
	}

	engine.createJSModel('g_PlacePopulation', PlacePopulation);
	PlacePopulation.updateCallback = updateModel;
});

export { PlacePopulation as default };