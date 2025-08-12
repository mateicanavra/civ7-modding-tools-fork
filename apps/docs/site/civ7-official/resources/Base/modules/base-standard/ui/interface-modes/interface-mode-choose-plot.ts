/**
 * @file interface-mode-choose.plot.ts
 * @copyright 2021-2023, Firaxis Games
 * @description Base interface mode used for interface modes that require plot selection
 */

import FocusManager from '/core/ui/input/focus-manager.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js'
import WorldInput, { PlotSelectionHandler } from '/base-standard/ui/world-input/world-input.js';
import { InputEngineEvent } from '/core/ui/input/input-support.js';
import { PlotCursorUpdatedEvent, PlotCursorUpdatedEventName } from '/core/ui/input/plot-cursor.js'
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js'
import { OVERLAY_PRIORITY } from '/base-standard/ui/utilities/utilities-overlay.js';
import ViewManager from '/core/ui/views/view-manager.js';

/**
 * Base class for a simple choose plot interface mode.
 */
abstract class ChoosePlotInterfaceMode implements InterfaceMode.Handler {

	protected placementOverlayGroup: WorldUI.OverlayGroup = WorldUI.createOverlayGroup("PlacementOverlayGroup", OVERLAY_PRIORITY.PLOT_HIGHLIGHT);
	protected placementModelGroup: WorldUI.ModelGroup = WorldUI.createModelGroup("PlacementModelGroup");
	protected placementCursorOverlayGroup: WorldUI.OverlayGroup = WorldUI.createOverlayGroup("PlacementCursorOverlayGroup", OVERLAY_PRIORITY.CURSOR);
	protected placementCursorModelGroup: WorldUI.ModelGroup = WorldUI.createModelGroup("PlacementCursorModelGroup");

	//Set this to true to bypass having to select a single highlighted plot manually
	protected autoSelectSinglePlots: boolean = false;
	protected singlePlotCoord: PlotCoord | null = null;

	private _context: InterfaceMode.Context | null = null;

	public isPlotProposed: boolean = false;

	private plotSelectionHandler: PlotSelectionHandler = (plot: PlotCoord, previousPlot: PlotCoord | null): boolean => { return this.selectPlot(plot, previousPlot) };
	private plotCursorCoordsUpdatedListener = this.onPlotCursorCoordsUpdated.bind(this);

	get Context(): any {
		return this._context;
	}

	transitionTo(_oldMode: InterfaceMode.ModeId, _newMode: InterfaceMode.ModeId, context: InterfaceMode.Context) {

		this._context = context;
		if (!this.initialize()) {
			InterfaceMode.switchToDefault();
			return;
		}

		if (this.autoSelectSinglePlots == true && this.singlePlotCoord != null) {
			this.commitPlot(this.singlePlotCoord);
		} else {
			this.decorate(this.placementOverlayGroup, this.placementModelGroup);
			window.addEventListener(PlotCursorUpdatedEventName, this.plotCursorCoordsUpdatedListener);
			WorldInput.setPlotSelectionHandler(this.plotSelectionHandler);
			FocusManager.SetWorldFocused();
		}
	}

	transitionFrom(_oldMode: InterfaceMode.ModeId, _newMode: InterfaceMode.ModeId) {
		this.reset();
		this.undecorate(this.placementOverlayGroup, this.placementModelGroup);
		this.placementOverlayGroup?.reset();
		this.placementCursorOverlayGroup?.reset();
		this.placementModelGroup.clear();
		this.placementCursorModelGroup.clear();
		this.isPlotProposed = false;
		this.autoSelectSinglePlots = false;
		this.singlePlotCoord = null;
		WorldInput.useDefaultPlotSelectionHandler();
		window.removeEventListener(PlotCursorUpdatedEventName, this.plotCursorCoordsUpdatedListener);
	}

	/** Check if this mode can be safely transitioned from */
	canLeaveMode?(newMode: InterfaceMode.ModeId): boolean;

	selectPlot(plot: PlotCoord, _previousPlot: PlotCoord | null): boolean {
		if (this.isPlotProposed) {
			throw new Error("A plot is already being proposed.")
		}

		this.isPlotProposed = true;
		this.proposePlot(plot, () => { this.commitPlot(plot); InterfaceMode.switchToDefault(); }, () => this.isPlotProposed = false);
		return false;
	}

	handleInput(inputEvent: InputEngineEvent): boolean {
		if (inputEvent.detail.status != InputActionStatuses.FINISH || !ViewManager.isWorldInputAllowed) {
			return true;
		}

		if (inputEvent.isCancelInput() || inputEvent.detail.name == 'sys-menu') {

			const unitID: ComponentID | null = UI.Player.getHeadSelectedUnit();

			if (ComponentID.isValid(unitID)) {
				InterfaceMode.switchTo("INTERFACEMODE_UNIT_SELECTED", { UnitID: unitID });
			} else {
				InterfaceMode.switchToDefault();
			}

			return false;
		}

		return true;
	}

	onPlotCursorCoordsUpdated(event: PlotCursorUpdatedEvent) {
		if (event.detail.plotCoords) {
			this.decorateHover({ x: event.detail.plotCoords.x, y: event.detail.plotCoords.y }, this.placementCursorOverlayGroup, this.placementCursorModelGroup)
		}
	}

	/**
	 * Decorate an overlay with details.
	 * @param overlay The overlay group managed by the class.
	 */
	decorate(_overlay: WorldUI.OverlayGroup, _modelGroup: WorldUI.ModelGroup) {

	};

	/**
	 * Decorate an overlay with details.
	 * @param overlay The overlay group managed by the class.
	 */
	decorateHover(_plotCoord: PlotCoord, _overlay: WorldUI.OverlayGroup, _modelGroup: WorldUI.ModelGroup) {

	}

	/**
	 * Remove any decoration overlay.
	 * @param overlay The overlay group managed by the class.
	 */
	undecorate(_overlay: WorldUI.OverlayGroup, _modelGroup: WorldUI.ModelGroup) {

	};

	/** 
	 * Initialize any data for the new context.
	 * @returns true if success, false on failure.
	 */
	abstract initialize(): boolean;

	/**
	 * Reset any stored member data.
	 */
	abstract reset(): void;

	/**
	 * Propose a plot selection.
	 * This is where any sort of validation/confirmation may occur.
	 * The check is async and depends on `accept` or `reject` being called.
	 * @param plot The plot being proposed.
	 * @param accept Accept the plot proposal and commit to it.
	 * @param reject Reject the proposal and allow for other plot selections.
	 */
	abstract proposePlot(plot: PlotCoord, accept: () => void, reject: () => void): void;

	/**
	 * Commit to a particular plot as the selection.
	 * @param plot The selected plot.
	 */
	abstract commitPlot(plot: PlotCoord): void;
}

export { ChoosePlotInterfaceMode as default };
