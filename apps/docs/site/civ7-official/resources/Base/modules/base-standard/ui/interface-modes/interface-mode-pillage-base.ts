/**
 * @file interface-mode-pillage-base.ts
 * @copyright 2024, Firaxis Games
 */

import ChoosePlotInterfaceMode from '/base-standard/ui/interface-modes/interface-mode-choose-plot.js'
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js'
import { Audio } from '/core/ui/audio-base/audio-support.js'

interface PillageBaseInterfaceModeContext extends InterfaceMode.Context {
	UnitID: ComponentID;
	OperationArguments: any;
}

/**
 * Base Handler for Pillage based interface modes.
 */
class PillageBaseInterfaceMode extends ChoosePlotInterfaceMode {

	private operationResult: OperationResult | null = null;
	private validPlots = new Set<PlotIndex>();
	protected operationName = "";

	initialize() {
		if (this.operationName === "") {
			console.error(`Failed initializing pillage based interface mode ${this.constructor.name} due to missing operation name set.`);
			return false;
		}

		const context = this.Context as PillageBaseInterfaceModeContext;
		const args: any = {};
		const result = Game.UnitOperations.canStart(context.UnitID, this.operationName, args, false);
		this.operationResult = result;
		this.autoSelectSinglePlots = true;
		result.Plots?.forEach(p => this.validPlots.add(p));

		if (this.validPlots.size > 1) {
			return true;
		}
		else if (this.validPlots.size == 1) {
			const it = this.validPlots.values();
			const plotIndex = it.next().value;
			if (plotIndex) {
				this.singlePlotCoord = GameplayMap.getLocationFromIndex(plotIndex);
				return true;
			} else {
				console.error(`Failed to get a valid plot index when initializing ${this.constructor.name}.`);
				return false;
			}
		}
		else {
			return false;
		}
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
		const context = this.Context as PillageBaseInterfaceModeContext
		const unitID: ComponentID = context.UnitID;
		let args: any = {};
		args.X = plot.x;
		args.Y = plot.y;

		Game.UnitOperations.sendRequest(unitID, this.operationName, args);
		Audio.playSound("data-audio-unit-pillage-release", "interact-unit");
	}
}

export { PillageBaseInterfaceMode as default };
