/**
 * @file interface-mode-choose.plot.ts
 * @copyright 2021-2023, Firaxis Games
 * @description Base interface mode used for interface modes that require plot selection
 */
import FocusManager from '/core/ui/input/focus-manager.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import WorldInput from '/base-standard/ui/world-input/world-input.js';
import { PlotCursorUpdatedEventName } from '/core/ui/input/plot-cursor.js';
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
import { OVERLAY_PRIORITY } from '/base-standard/ui/utilities/utilities-overlay.js';
import ViewManager from '/core/ui/views/view-manager.js';
/**
 * Base class for a simple choose plot interface mode.
 */
class ChoosePlotInterfaceMode {
    constructor() {
        this.placementOverlayGroup = WorldUI.createOverlayGroup("PlacementOverlayGroup", OVERLAY_PRIORITY.PLOT_HIGHLIGHT);
        this.placementModelGroup = WorldUI.createModelGroup("PlacementModelGroup");
        this.placementCursorOverlayGroup = WorldUI.createOverlayGroup("PlacementCursorOverlayGroup", OVERLAY_PRIORITY.CURSOR);
        this.placementCursorModelGroup = WorldUI.createModelGroup("PlacementCursorModelGroup");
        //Set this to true to bypass having to select a single highlighted plot manually
        this.autoSelectSinglePlots = false;
        this.singlePlotCoord = null;
        this._context = null;
        this.isPlotProposed = false;
        this.plotSelectionHandler = (plot, previousPlot) => { return this.selectPlot(plot, previousPlot); };
        this.plotCursorCoordsUpdatedListener = this.onPlotCursorCoordsUpdated.bind(this);
    }
    get Context() {
        return this._context;
    }
    transitionTo(_oldMode, _newMode, context) {
        this._context = context;
        if (!this.initialize()) {
            InterfaceMode.switchToDefault();
            return;
        }
        if (this.autoSelectSinglePlots == true && this.singlePlotCoord != null) {
            this.commitPlot(this.singlePlotCoord);
        }
        else {
            this.decorate(this.placementOverlayGroup, this.placementModelGroup);
            window.addEventListener(PlotCursorUpdatedEventName, this.plotCursorCoordsUpdatedListener);
            WorldInput.setPlotSelectionHandler(this.plotSelectionHandler);
            FocusManager.SetWorldFocused();
        }
    }
    transitionFrom(_oldMode, _newMode) {
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
    selectPlot(plot, _previousPlot) {
        if (this.isPlotProposed) {
            throw new Error("A plot is already being proposed.");
        }
        this.isPlotProposed = true;
        this.proposePlot(plot, () => { this.commitPlot(plot); InterfaceMode.switchToDefault(); }, () => this.isPlotProposed = false);
        return false;
    }
    handleInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH || !ViewManager.isWorldInputAllowed) {
            return true;
        }
        if (inputEvent.isCancelInput() || inputEvent.detail.name == 'sys-menu') {
            const unitID = UI.Player.getHeadSelectedUnit();
            if (ComponentID.isValid(unitID)) {
                InterfaceMode.switchTo("INTERFACEMODE_UNIT_SELECTED", { UnitID: unitID });
            }
            else {
                InterfaceMode.switchToDefault();
            }
            return false;
        }
        return true;
    }
    onPlotCursorCoordsUpdated(event) {
        if (event.detail.plotCoords) {
            this.decorateHover({ x: event.detail.plotCoords.x, y: event.detail.plotCoords.y }, this.placementCursorOverlayGroup, this.placementCursorModelGroup);
        }
    }
    /**
     * Decorate an overlay with details.
     * @param overlay The overlay group managed by the class.
     */
    decorate(_overlay, _modelGroup) {
    }
    ;
    /**
     * Decorate an overlay with details.
     * @param overlay The overlay group managed by the class.
     */
    decorateHover(_plotCoord, _overlay, _modelGroup) {
    }
    /**
     * Remove any decoration overlay.
     * @param overlay The overlay group managed by the class.
     */
    undecorate(_overlay, _modelGroup) {
    }
    ;
}
export { ChoosePlotInterfaceMode as default };

//# sourceMappingURL=file:///base-standard/ui/interface-modes/interface-mode-choose-plot.js.map
