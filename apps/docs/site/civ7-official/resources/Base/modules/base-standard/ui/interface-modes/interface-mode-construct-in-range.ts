/**
 * @file interface-mode-construct-in-range.ts
 * @copyright 2021, Firaxis Games
 */

import ChoosePlotInterfaceMode from '/base-standard/ui/interface-modes/interface-mode-choose-plot.js'
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js'
import { Audio } from '/core/ui/audio-base/audio-support.js'


interface ConstructInRangeInterfaceModeContext extends InterfaceMode.Context {
	UnitID: ComponentID;
	CommandArguments: any;
}
/**
 * Handler for INTERFACEMODE_CONSTRUCT_IN_RANGE.
 * Commands:
 * - UNITCOMMAND_CONSTRUCT_IN_RANGE
 * - UNITCOMMAND_ARMY_CONSTRUCT_IN_RANGE
 */
class ConstructInRangeInterfaceMode extends ChoosePlotInterfaceMode {

	private _OperationResult: OperationResult | null = null;
	private validPlots = new Set<PlotIndex>();

	initialize() {
		const context = this.Context as ConstructInRangeInterfaceModeContext;
		if (!context.ActionType) {
			context.ActionType = 'UNITCOMMAND_CONSTRUCT_IN_RANGE'; // default
		}
		const result = Game.UnitCommands.canStart(context.UnitID, context.ActionType, context.CommandArguments, false);
		this._OperationResult = result;
		result.Plots?.forEach(p => this.validPlots.add(p));
		return this.validPlots.size > 0;
	}

	reset() {
		this._OperationResult = null;
		this.validPlots.clear();
	}

	decorate(overlay: WorldUI.OverlayGroup) {
		const result = this._OperationResult;
		if (result == null) {
			throw new ReferenceError('OperationResult is null');
		}
		else {
			// TODO - Is there a better way to fetch which colors to use?
			const GREEN_TRANSPARENT_LINEAR: float4 = { x: 0, y: 1, z: 0, w: 0.5 };

			if (result.Plots) {
				const plotOverlay = overlay.addPlotOverlay();
				plotOverlay?.addPlots(result.Plots, { fillColor: GREEN_TRANSPARENT_LINEAR });
				Audio.playSound("data-audio-plot-select-overlay", "interact-unit");
			}
		}
	}

	proposePlot(plot: PlotCoord, accept: () => void, reject: () => void) {
		const plotIndex = GameplayMap.getIndexFromLocation(plot);
		if (this.validPlots.has(plotIndex)) {
			accept();
		}
		else {
			reject();
		}
	}

	commitPlot(plot: PlotCoord) {
		const context = this.Context as ConstructInRangeInterfaceModeContext
		if (!context.ActionType) {
			context.ActionType = 'UNITCOMMAND_CONSTRUCT_IN_RANGE'; // default
		}
		const unitID: ComponentID = context.UnitID;
		const args = context.CommandArguments;
		args.X = plot.x;
		args.Y = plot.y;
		Game.UnitCommands.sendRequest(unitID, context.ActionType, args);
	}
}

InterfaceMode.addHandler('INTERFACEMODE_CONSTRUCT_IN_RANGE', new ConstructInRangeInterfaceMode());