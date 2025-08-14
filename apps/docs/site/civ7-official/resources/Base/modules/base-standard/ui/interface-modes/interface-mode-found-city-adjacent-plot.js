/**
 * @file interface-mode-coordinated-attack.ts
 * @copyright 2021, Firaxis Games
 */
import ChoosePlotInterfaceMode from '/base-standard/ui/interface-modes/interface-mode-choose-plot.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';
/**
 * Handler for INTERFACEMODE_FOUND_CITY_ADJACENT_PLOT.
 */
class FoundCityAdjacentPlotInterfaceMode extends ChoosePlotInterfaceMode {
    constructor() {
        super(...arguments);
        this._OperationResult = null;
        this.validPlots = new Set();
    }
    initialize() {
        const context = this.Context;
        const args = {};
        const result = Game.UnitOperations.canStart(context.UnitID, 'UNITOPERATION_FOUND_CITY_ADJACENT_PLOT', args, false);
        this._OperationResult = result;
        result.Plots?.forEach(p => this.validPlots.add(p));
        return this.validPlots.size > 0;
    }
    reset() {
        this._OperationResult = null;
        this.validPlots.clear();
    }
    decorate(overlay) {
        const result = this._OperationResult;
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
        Game.UnitOperations.sendRequest(unitID, 'UNITOPERATION_FOUND_CITY_ADJACENT_PLOT', args);
    }
}
InterfaceMode.addHandler('INTERFACEMODE_FOUND_CITY_ADJACENT_PLOT', new FoundCityAdjacentPlotInterfaceMode());

//# sourceMappingURL=file:///base-standard/ui/interface-modes/interface-mode-found-city-adjacent-plot.js.map
