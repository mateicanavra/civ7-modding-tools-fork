/**
 * @file interface-mode-pillage-base.ts
 * @copyright 2024, Firaxis Games
 */
import ChoosePlotInterfaceMode from '/base-standard/ui/interface-modes/interface-mode-choose-plot.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';
/**
 * Base Handler for Pillage based interface modes.
 */
class PillageBaseInterfaceMode extends ChoosePlotInterfaceMode {
    constructor() {
        super(...arguments);
        this.operationResult = null;
        this.validPlots = new Set();
        this.operationName = "";
    }
    initialize() {
        if (this.operationName === "") {
            console.error(`Failed initializing pillage based interface mode ${this.constructor.name} due to missing operation name set.`);
            return false;
        }
        const context = this.Context;
        const args = {};
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
            }
            else {
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
    decorate(overlay) {
        const result = this.operationResult;
        if (result == null) {
            throw new ReferenceError('OperationResult is null');
        }
        else {
            const GREEN_TRANSPARENT_LINEAR = { x: 0, y: 1, z: 0, w: 0.5 };
            if (result.Plots) {
                const plotOverlay = overlay.addPlotOverlay();
                plotOverlay?.addPlots(result.Plots, { fillColor: GREEN_TRANSPARENT_LINEAR });
                Audio.playSound("data-audio-plot-select-overlay", "interact-unit");
            }
        }
    }
    proposePlot(plot, accept, reject) {
        const plotIndex = GameplayMap.getIndexFromLocation(plot);
        if (this.validPlots.has(plotIndex)) {
            accept();
        }
        else {
            reject();
        }
    }
    commitPlot(plot) {
        const context = this.Context;
        const unitID = context.UnitID;
        let args = {};
        args.X = plot.x;
        args.Y = plot.y;
        Game.UnitOperations.sendRequest(unitID, this.operationName, args);
        Audio.playSound("data-audio-unit-pillage-release", "interact-unit");
    }
}
export { PillageBaseInterfaceMode as default };

//# sourceMappingURL=file:///base-standard/ui/interface-modes/interface-mode-pillage-base.js.map
