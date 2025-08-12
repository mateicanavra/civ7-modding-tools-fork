/**
 * @file interface-mode-grant-second-wind.ts
 * @copyright 2024, Firaxis Games
 */

import ChoosePlotInterfaceMode from '/base-standard/ui/interface-modes/interface-mode-choose-plot.js'
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js'
import { Audio } from '/core/ui/audio-base/audio-support.js'


interface GrantSecondWindInterfaceModeContext extends InterfaceMode.Context {
	UnitID: ComponentID;
	OperationArguments: any;
}
/**
 * Handler for INTERFACEMODE_GRANT_SECOND_WIND.
 */
class GrantSecondWindInterfaceMode extends ChoosePlotInterfaceMode {

	private _OperationResult: OperationResult | null = null;
	private validPlots = new Set<PlotIndex>();

	initialize() {
		const context = this.Context as GrantSecondWindInterfaceModeContext;
		const args: any = {};
		const result = Game.UnitCommands.canStart(context.UnitID, 'UNITCOMMAND_GRANT_SECOND_WIND', args, false);
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
		const context = this.Context as GrantSecondWindInterfaceModeContext
		const unitID: ComponentID = context.UnitID;
		let args: any = {};
		args.X = plot.x;
		args.Y = plot.y;
		Game.UnitCommands.sendRequest(unitID, 'UNITCOMMAND_GRANT_SECOND_WIND', args);
	}
}

InterfaceMode.addHandler('INTERFACEMODE_GRANT_SECOND_WIND', new GrantSecondWindInterfaceMode());