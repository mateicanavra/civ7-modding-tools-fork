/**
 * @file interface-mode-coordinated-attack.ts
 * @copyright 2021, Firaxis Games
 */
import ChoosePlotInterfaceMode from '/base-standard/ui/interface-modes/interface-mode-choose-plot.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';
/**
 * Base handler for focused attacks.
 */
class FocusedAttackBaseInterfaceMode extends ChoosePlotInterfaceMode {
    constructor() {
        super(...arguments);
        this.operationResult = null;
        this.validPlots = new Set();
        this.commandName = "";
    }
    initialize() {
        if (this.commandName === "")
            return false;
        const context = this.Context;
        const args = {};
        const result = Game.UnitCommands.canStart(context.UnitID, this.commandName, args, false);
        this.operationResult = result;
        result.Plots?.forEach(p => this.validPlots.add(p));
        return this.validPlots.size > 0;
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
            // TODO - Is there a better way to fetch which colors to use?
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
        Game.UnitCommands.sendRequest(unitID, this.commandName, args);
    }
}
export { FocusedAttackBaseInterfaceMode as default };

//# sourceMappingURL=file:///base-standard/ui/interface-modes/interface-mode-focused-attack-base.js.map
