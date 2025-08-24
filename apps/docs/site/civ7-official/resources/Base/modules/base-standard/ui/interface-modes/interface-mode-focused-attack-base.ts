/**
 * @file interface-mode-coordinated-attack.ts
 * @copyright 2021, Firaxis Games
 */

import ChoosePlotInterfaceMode from '/base-standard/ui/interface-modes/interface-mode-choose-plot.js'
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js'
import { Audio } from '/core/ui/audio-base/audio-support.js'


interface FocusedAttackBaseInterfaceModeContext extends InterfaceMode.Context {
	UnitID: ComponentID;
	OperationArguments: any;
}


/**
 * Base handler for focused attacks.
 */
class FocusedAttackBaseInterfaceMode extends ChoosePlotInterfaceMode {

	protected operationResult: OperationResult | null = null;
	protected validPlots = new Set<PlotIndex>();
	protected commandName = "";

	initialize() {
		if (this.commandName === "")
			return false;

		const context = this.Context as FocusedAttackBaseInterfaceModeContext;
		const args: any = {};
		const result = Game.UnitCommands.canStart(context.UnitID, this.commandName, args, false);
		this.operationResult = result;
		result.Plots?.forEach(p => this.validPlots.add(p));
		return this.validPlots.size > 0;
	}

	reset() {
		this.operationResult = null;
		this.validPlots.clear();
	}

	decorate(overlay: WorldUI.OverlayGroup) {
		const result = this.operationResult;
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
		const context = this.Context as FocusedAttackBaseInterfaceModeContext
		const unitID: ComponentID = context.UnitID;
		let args: any = {};
		args.X = plot.x;
		args.Y = plot.y;
		Game.UnitCommands.sendRequest(unitID, this.commandName, args);
	}
}

export { FocusedAttackBaseInterfaceMode as default };
