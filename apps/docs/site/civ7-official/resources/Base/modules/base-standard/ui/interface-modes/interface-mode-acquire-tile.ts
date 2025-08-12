/**
 * @file interface-mode-acquire-tile.ts
 * @copyright 2021-2024, Firaxis Games
 */

import { Audio } from '/core/ui/audio-base/audio-support.js';
import ChoosePlotInterfaceMode from '/base-standard/ui/interface-modes/interface-mode-choose-plot.js'
import { CityZoomer } from '/base-standard/ui/city-zoomer/city-zoomer.js';
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js'
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js'
import PlotCursor, { PlotCursorUpdatedEvent } from '/core/ui/input/plot-cursor.js'
import PlotWorkersManager, { PlotWorkersUpdatedEventName } from '/base-standard/ui/plot-workers/plot-workers-manager.js'
import LensManager, { LensName } from '/core/ui/lenses/lens-manager.js'
import PlacePopulation from '/base-standard/ui/place-population/model-place-population.js';

interface AcquireTileInterfaceModeContext extends InterfaceMode.Context {
	CityID?: ComponentID;
	UnitID?: ComponentID;
}

/**
 * Handler for INTERFACEMODE_ACQUIRE_TILE.
 */
class AcquireTileInterfaceMode extends ChoosePlotInterfaceMode {
	private validPlots: PlotIndex[] = [];
	private previousLens: LensName = 'fxs-default-lens';
	private plotOverlay: WorldUI.PlotOverlay | null = null;
	private cityID: ComponentID = ComponentID.getInvalidID();
	private lastHoveredPlot: PlotIndex = -1;

	private OUTER_REGION_OVERLAY_FILTER: WorldUI.ColorFilter = { saturation: 0.1, brightness: 0.3 } //Semi-opaque dark grey to darken plots outside of the city	

	private districtAddedToMapHandle?: EventHandle;

	private plotWorkerUpdatedListener = this.onPlotWorkerUpdate.bind(this);

	/**
	 * Initializes the interface mode.
	 * 
	 * @override
	 */
	initialize(): boolean {
		this.districtAddedToMapHandle = engine.on('DistrictAddedToMap', this.onDistrictAddedToMap);
		window.addEventListener(PlotWorkersUpdatedEventName, this.plotWorkerUpdatedListener);

		const context = this.Context as AcquireTileInterfaceModeContext;
		if (context.UnitID) {
			context.CityID = this.getUnitCityID(context.UnitID);
			this.updateValidPlotsFromUnitID(context.UnitID);
		} else if (context.CityID) {
			this.updateValidPlotsFromCityID(context.CityID);
		}

		if (this.validPlots.length == 0) {
			console.warn('Cannot start interface mode. No valid plots!');
		}

		if (this.validPlots.length > 0 || PlotWorkersManager.workablePlotIndexes.length > 0) {
			const city: City | null = Cities.get(this.cityID);
			if (city?.location) {
				PlotCursor.plotCursorCoords = city?.location;
			}
			return true;
		}

		return false;
	}

	updateValidPlotsFromUnitID(id: ComponentID) {
		this.validPlots = [];
		this.cityID = this.getUnitCityID(id);
		PlacePopulation.updateExpandPlotsForResettle(id);
		this.validPlots = PlacePopulation.getExpandPlotsIndexes();
		PlotWorkersManager.reset();
	}

	updateValidPlotsFromCityID(id: ComponentID) {
		this.validPlots = [];
		this.cityID = id;
		PlacePopulation.updateExpandPlots(id);
		this.validPlots = PlacePopulation.getExpandPlotsIndexes();
		PlotWorkersManager.initializeWorkersData(this.cityID);
	}

	/**
	 * @override
	 */
	selectPlot(plot: PlotCoord, _previousPlot: PlotCoord | null): boolean {
		if (this.isPlotProposed) {
			throw new Error("A plot is already being proposed.")
		}
		this.isPlotProposed = true;
		this.proposePlot(plot, () => { this.commitPlot(plot); }, () => this.isPlotProposed = false);
		return false;
	}

	/** 
	 * @interface Handler
	 * @override
	 */
	transitionTo(oldMode: InterfaceMode.ModeId, newMode: InterfaceMode.ModeId, context: InterfaceMode.Context) {
		UI.sendAudioEvent(Audio.getSoundTag('data-audio-city-growth-enter', 'city-growth'));

		super.transitionTo(oldMode, newMode, context);
		this.previousLens = LensManager.getActiveLens();
		LensManager.setActiveLens("fxs-acquire-tile-lens");
		this.lastHoveredPlot = -1;
		if (PlotCursor?.plotCursorCoords) {
			this.hoverNewPlot(PlotCursor.plotCursorCoords.x, PlotCursor.plotCursorCoords.y);
		}
		WorldUI.setUnitVisibility(false);
	}

	/** 
	 * @interface Handler
	 * @override
	 */
	transitionFrom(oldMode: InterfaceMode.ModeId, newMode: InterfaceMode.ModeId) {
		UI.sendAudioEvent(Audio.getSoundTag('data-audio-city-growth-exit', 'city-growth'));

		this.plotOverlay?.clear();
		WorldUI.popFilter();
		CityZoomer.resetZoom();
		LensManager.setActiveLens(this.previousLens);
		super.transitionFrom(oldMode, newMode);
		UI.setCursorByType(UIHTMLCursorTypes.Default);
		WorldUI.setUnitVisibility(true);
	}

	/** 
	 * @interface Handler
	 * @override
	 */
	canEnterMode(parameters: any): boolean {
		const cityID: ComponentID = parameters?.CityID;
		const unitID: ComponentID = parameters?.UnitID;
		return (cityID && ComponentID.isValid(cityID)) || (unitID && ComponentID.isValid(unitID));
	}

	/** 
	 * @interface Handler
	 * @override
	 */
	canLeaveMode(_newMode: InterfaceMode.ModeId): boolean {
		return true;
	}

	private getUnitCityID(unitID: ComponentID): ComponentID {
		const unit = Units.get(unitID);
		if (unit) {
			const location: float2 = unit.location;
			if (location.x != -1 && location.y != -1) {
				return MapCities.getCity(unit.location.x, unit.location.y) ?? ComponentID.getInvalidID();
			}
			console.error("Mode acquire tile has valid unit but invalid (-1,-1) location. cid:", ComponentID.toLogString(unit.id));
		}
		return ComponentID.getInvalidID();
	}

	/** 
	 * @interface Handler
	 * @override
	 */
	reset() {
		this.validPlots = [];
		this.districtAddedToMapHandle?.clear();
		window.removeEventListener(PlotWorkersUpdatedEventName, this.plotWorkerUpdatedListener);
	}

	/**
	 * @override
	 */
	decorate(overlay: WorldUI.OverlayGroup) {
		const selectedCity: City | null = Cities.get(this.cityID)
		if (!selectedCity) {
			console.error("interface-mode-acquire-tile: Unable to retrieve city with CityID: " + ComponentID.toLogString(this.cityID));
			return;
		}

		CityZoomer.zoomToCity(selectedCity);

		const validPlots = new Set([...this.validPlots, ...selectedCity.getPurchasedPlots()]);
		//Darken all plots not in the city
		WorldUI.pushRegionColorFilter([...validPlots], {}, this.OUTER_REGION_OVERLAY_FILTER);

		// TODO - Is there a better way to fetch which colors to use?
		const CITY_TILE_GRAY_COLOR: float4 = { x: 0.0, y: 0.0, z: 0.0, w: 0.1 };
		const EXPAND_CITY_COLOR_LINEAR: float4 = { x: 0.8, y: 1, z: 0, w: 0.6 };
		const EXPAND_CITY_BORDER_COLOR_LINEAR: float4 = { x: 0.2, y: 0.3, z: 0, w: 1 };
		const ADD_SPECIALIST_COLOR: float4 = { x: 0.05, y: 0, z: 0.4, w: 0.9 };
		const ADD_SPECIALIST_BORDER_COLOR: float4 = { x: 0.1, y: 0, z: 0.1, w: 1 };
		const BLOCKED_WORKABLE_FILL: float4 = { x: 1, y: 0, z: 0, w: 0.5 };

		this.plotOverlay = overlay.addPlotOverlay();

		this.plotOverlay.addPlots([...validPlots], { fillColor: CITY_TILE_GRAY_COLOR });
		this.plotOverlay.addPlots(this.validPlots, { fillColor: EXPAND_CITY_COLOR_LINEAR, edgeColor: EXPAND_CITY_BORDER_COLOR_LINEAR });
		this.plotOverlay.addPlots(PlotWorkersManager.workablePlotIndexes, { fillColor: ADD_SPECIALIST_COLOR, edgeColor: ADD_SPECIALIST_BORDER_COLOR });
		this.plotOverlay.addPlots(PlotWorkersManager.blockedPlotIndexes, { fillColor: BLOCKED_WORKABLE_FILL });
		WorldUI.setUnitVisibility(false);
	}

	/**
	 * @override
	 */
	decorateHover(plotCoord: PlotCoord, cursorOverlay: WorldUI.OverlayGroup, cursorModelGroup: WorldUI.ModelGroup) {
		cursorOverlay.clearAll();
		cursorModelGroup.clear();
		cursorModelGroup.addVFXAtPlot("VFX_3dUI_PlotCursor_City_Picker", plotCoord, { x: 0, y: 0, z: 0 });
	}

	onPlotCursorCoordsUpdated(event: PlotCursorUpdatedEvent) {
		super.onPlotCursorCoordsUpdated(event);
		if (event.detail.plotCoords) {
			this.hoverNewPlot(event.detail.plotCoords.x, event.detail.plotCoords.y);
		}
	}

	private hoverNewPlot(x: number, y: number) {
		const plot: PlotCoord = { x: x, y: y };
		const plotIndex = GameplayMap.getIndexFromLocation(plot);

		if (plotIndex != this.lastHoveredPlot) {
			this.lastHoveredPlot = plotIndex;
			PlotWorkersManager.hoveredPlotIndex = this.lastHoveredPlot;

			if (PlotWorkersManager.workablePlotIndexes.find(e => e == plotIndex)) {
				UI.setCursorByType(UIHTMLCursorTypes.Place);
			} else if (PlotWorkersManager.blockedPlotIndexes.find(e => e == plotIndex)) {
				UI.setCursorByType(UIHTMLCursorTypes.CantPlace);
			} else if (this.validPlots.find(e => e == plotIndex)) {
				//TODO: which cursor for growth?
				UI.setCursorByType(UIHTMLCursorTypes.Default);
			} else {
				UI.setCursorByType(UIHTMLCursorTypes.Enemy);
			}

			UI.sendAudioEvent(Audio.getSoundTag('data-audio-city-growth-focus', 'city-growth'));
		}
	}

	proposePlot(plot: PlotCoord, accept: () => void, reject: () => void) {
		const plotIndex: PlotIndex = GameplayMap.getIndexFromLocation(plot);
		if (this.validPlots.find(e => e == plotIndex) || PlotWorkersManager.workablePlotIndexes.find(e => e == plotIndex)) {
			accept();
		}
		else {
			reject();
		}
	}

	commitPlot(plot: PlotCoord) {
		const context = this.Context as AcquireTileInterfaceModeContext
		const args: any = {};
		args.X = plot.x;
		args.Y = plot.y;

		let improvementEvent = "placement-activate";
		if (PlacePopulation.addImprovementType != "") {
			improvementEvent = "placement-activate-" + PlacePopulation.addImprovementType;
		}

		if (context.UnitID) {
			UI.sendAudioEvent(improvementEvent);
			Game.UnitCommands.sendRequest(context.UnitID, 'UNITCOMMAND_RESETTLE', args);
		} else if (context.CityID) {
			const plotIndex: PlotIndex = GameplayMap.getIndexFromLocation(plot);
			if (PlotWorkersManager.workablePlotIndexes.find(e => e == plotIndex)) {
				const workerArgs: object = {
					Location: plotIndex,
					Amount: 1
				};
				const result: OperationResult = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.ASSIGN_WORKER, workerArgs, false);
				if (result.Success) {
					Audio.playSound("data-audio-worker-activate", "city-growth");
					Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.ASSIGN_WORKER, workerArgs);
				} else {
					console.error("interface-mode-acquire-tile: Unable to start ASSIGN_WORKER player operation on a valid workable tile.")
				}
			} else {
				Game.CityCommands.sendRequest(context.CityID, CityCommandTypes.EXPAND, args);
				UI.sendAudioEvent(improvementEvent);
			}
		}

	}

	private updatePlotOverlay = () => {
		this.updateValidPlotsFromCityID(this.cityID);
		const city: City | null = Cities.get(this.cityID);
		const context = this.Context as AcquireTileInterfaceModeContext;
		if (city?.Growth?.isReadyToPlacePopulation && context.CityID) {
			this.placementOverlayGroup?.clearAll();
			WorldUI.popFilter();
			this.decorate(this.placementOverlayGroup);
			this.isPlotProposed = false;
		} else {
			InterfaceMode.switchToDefault();
		}
	}


	private onDistrictAddedToMap = (payload: DistrictAddedToMap_EventData): void => {
		if (ComponentID.isMatch(payload.cityID, this.cityID)) {
			this.updatePlotOverlay();
		}
	}

	private onPlotWorkerUpdate() {
		this.updatePlotOverlay();
	}
}

InterfaceMode.addHandler('INTERFACEMODE_ACQUIRE_TILE', new AcquireTileInterfaceMode());