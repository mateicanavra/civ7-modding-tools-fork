/**
 * @file interface-mode-acquire-tile.ts
 * @copyright 2021-2024, Firaxis Games
 */
import { Audio } from '/core/ui/audio-base/audio-support.js';
import ChoosePlotInterfaceMode from '/base-standard/ui/interface-modes/interface-mode-choose-plot.js';
import { CityZoomer } from '/base-standard/ui/city-zoomer/city-zoomer.js';
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import PlotCursor from '/core/ui/input/plot-cursor.js';
import PlotWorkersManager, { PlotWorkersUpdatedEventName } from '/base-standard/ui/plot-workers/plot-workers-manager.js';
import LensManager from '/core/ui/lenses/lens-manager.js';
import PlacePopulation from '/base-standard/ui/place-population/model-place-population.js';
/**
 * Handler for INTERFACEMODE_ACQUIRE_TILE.
 */
class AcquireTileInterfaceMode extends ChoosePlotInterfaceMode {
    constructor() {
        super(...arguments);
        this.validPlots = [];
        this.previousLens = 'fxs-default-lens';
        this.plotOverlay = null;
        this.cityID = ComponentID.getInvalidID();
        this.lastHoveredPlot = -1;
        this.OUTER_REGION_OVERLAY_FILTER = { saturation: 0.1, brightness: 0.3 }; //Semi-opaque dark grey to darken plots outside of the city	
        this.plotWorkerUpdatedListener = this.onPlotWorkerUpdate.bind(this);
        this.updatePlotOverlay = () => {
            this.updateValidPlotsFromCityID(this.cityID);
            const city = Cities.get(this.cityID);
            const context = this.Context;
            if (city?.Growth?.isReadyToPlacePopulation && context.CityID) {
                this.placementOverlayGroup?.clearAll();
                WorldUI.popFilter();
                this.decorate(this.placementOverlayGroup);
                this.isPlotProposed = false;
            }
            else {
                InterfaceMode.switchToDefault();
            }
        };
        this.onDistrictAddedToMap = (payload) => {
            if (ComponentID.isMatch(payload.cityID, this.cityID)) {
                this.updatePlotOverlay();
            }
        };
    }
    /**
     * Initializes the interface mode.
     *
     * @override
     */
    initialize() {
        this.districtAddedToMapHandle = engine.on('DistrictAddedToMap', this.onDistrictAddedToMap);
        window.addEventListener(PlotWorkersUpdatedEventName, this.plotWorkerUpdatedListener);
        const context = this.Context;
        if (context.UnitID) {
            context.CityID = this.getUnitCityID(context.UnitID);
            this.updateValidPlotsFromUnitID(context.UnitID);
        }
        else if (context.CityID) {
            this.updateValidPlotsFromCityID(context.CityID);
        }
        if (this.validPlots.length == 0) {
            console.warn('Cannot start interface mode. No valid plots!');
        }
        if (this.validPlots.length > 0 || PlotWorkersManager.workablePlotIndexes.length > 0) {
            const city = Cities.get(this.cityID);
            if (city?.location) {
                PlotCursor.plotCursorCoords = city?.location;
            }
            return true;
        }
        return false;
    }
    updateValidPlotsFromUnitID(id) {
        this.validPlots = [];
        this.cityID = this.getUnitCityID(id);
        PlacePopulation.updateExpandPlotsForResettle(id);
        this.validPlots = PlacePopulation.getExpandPlotsIndexes();
        PlotWorkersManager.reset();
    }
    updateValidPlotsFromCityID(id) {
        this.validPlots = [];
        this.cityID = id;
        PlacePopulation.updateExpandPlots(id);
        this.validPlots = PlacePopulation.getExpandPlotsIndexes();
        PlotWorkersManager.initializeWorkersData(this.cityID);
    }
    /**
     * @override
     */
    selectPlot(plot, _previousPlot) {
        if (this.isPlotProposed) {
            throw new Error("A plot is already being proposed.");
        }
        this.isPlotProposed = true;
        this.proposePlot(plot, () => { this.commitPlot(plot); }, () => this.isPlotProposed = false);
        return false;
    }
    /**
     * @interface Handler
     * @override
     */
    transitionTo(oldMode, newMode, context) {
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
    transitionFrom(oldMode, newMode) {
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
    canEnterMode(parameters) {
        const cityID = parameters?.CityID;
        const unitID = parameters?.UnitID;
        return (cityID && ComponentID.isValid(cityID)) || (unitID && ComponentID.isValid(unitID));
    }
    /**
     * @interface Handler
     * @override
     */
    canLeaveMode(_newMode) {
        return true;
    }
    getUnitCityID(unitID) {
        const unit = Units.get(unitID);
        if (unit) {
            const location = unit.location;
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
    decorate(overlay) {
        const selectedCity = Cities.get(this.cityID);
        if (!selectedCity) {
            console.error("interface-mode-acquire-tile: Unable to retrieve city with CityID: " + ComponentID.toLogString(this.cityID));
            return;
        }
        CityZoomer.zoomToCity(selectedCity);
        const validPlots = new Set([...this.validPlots, ...selectedCity.getPurchasedPlots()]);
        //Darken all plots not in the city
        WorldUI.pushRegionColorFilter([...validPlots], {}, this.OUTER_REGION_OVERLAY_FILTER);
        // TODO - Is there a better way to fetch which colors to use?
        const CITY_TILE_GRAY_COLOR = { x: 0.0, y: 0.0, z: 0.0, w: 0.1 };
        const EXPAND_CITY_COLOR_LINEAR = { x: 0.8, y: 1, z: 0, w: 0.6 };
        const EXPAND_CITY_BORDER_COLOR_LINEAR = { x: 0.2, y: 0.3, z: 0, w: 1 };
        const ADD_SPECIALIST_COLOR = { x: 0.05, y: 0, z: 0.4, w: 0.9 };
        const ADD_SPECIALIST_BORDER_COLOR = { x: 0.1, y: 0, z: 0.1, w: 1 };
        const BLOCKED_WORKABLE_FILL = { x: 1, y: 0, z: 0, w: 0.5 };
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
    decorateHover(plotCoord, cursorOverlay, cursorModelGroup) {
        cursorOverlay.clearAll();
        cursorModelGroup.clear();
        cursorModelGroup.addVFXAtPlot("VFX_3dUI_PlotCursor_City_Picker", plotCoord, { x: 0, y: 0, z: 0 });
    }
    onPlotCursorCoordsUpdated(event) {
        super.onPlotCursorCoordsUpdated(event);
        if (event.detail.plotCoords) {
            this.hoverNewPlot(event.detail.plotCoords.x, event.detail.plotCoords.y);
        }
    }
    hoverNewPlot(x, y) {
        const plot = { x: x, y: y };
        const plotIndex = GameplayMap.getIndexFromLocation(plot);
        if (plotIndex != this.lastHoveredPlot) {
            this.lastHoveredPlot = plotIndex;
            PlotWorkersManager.hoveredPlotIndex = this.lastHoveredPlot;
            if (PlotWorkersManager.workablePlotIndexes.find(e => e == plotIndex)) {
                UI.setCursorByType(UIHTMLCursorTypes.Place);
            }
            else if (PlotWorkersManager.blockedPlotIndexes.find(e => e == plotIndex)) {
                UI.setCursorByType(UIHTMLCursorTypes.CantPlace);
            }
            else if (this.validPlots.find(e => e == plotIndex)) {
                //TODO: which cursor for growth?
                UI.setCursorByType(UIHTMLCursorTypes.Default);
            }
            else {
                UI.setCursorByType(UIHTMLCursorTypes.Enemy);
            }
            UI.sendAudioEvent(Audio.getSoundTag('data-audio-city-growth-focus', 'city-growth'));
        }
    }
    proposePlot(plot, accept, reject) {
        const plotIndex = GameplayMap.getIndexFromLocation(plot);
        if (this.validPlots.find(e => e == plotIndex) || PlotWorkersManager.workablePlotIndexes.find(e => e == plotIndex)) {
            accept();
        }
        else {
            reject();
        }
    }
    commitPlot(plot) {
        const context = this.Context;
        const args = {};
        args.X = plot.x;
        args.Y = plot.y;
        let improvementEvent = "placement-activate";
        if (PlacePopulation.addImprovementType != "") {
            improvementEvent = "placement-activate-" + PlacePopulation.addImprovementType;
        }
        if (context.UnitID) {
            UI.sendAudioEvent(improvementEvent);
            Game.UnitCommands.sendRequest(context.UnitID, 'UNITCOMMAND_RESETTLE', args);
        }
        else if (context.CityID) {
            const plotIndex = GameplayMap.getIndexFromLocation(plot);
            if (PlotWorkersManager.workablePlotIndexes.find(e => e == plotIndex)) {
                const workerArgs = {
                    Location: plotIndex,
                    Amount: 1
                };
                const result = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.ASSIGN_WORKER, workerArgs, false);
                if (result.Success) {
                    Audio.playSound("data-audio-worker-activate", "city-growth");
                    Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.ASSIGN_WORKER, workerArgs);
                }
                else {
                    console.error("interface-mode-acquire-tile: Unable to start ASSIGN_WORKER player operation on a valid workable tile.");
                }
            }
            else {
                Game.CityCommands.sendRequest(context.CityID, CityCommandTypes.EXPAND, args);
                UI.sendAudioEvent(improvementEvent);
            }
        }
    }
    onPlotWorkerUpdate() {
        this.updatePlotOverlay();
    }
}
InterfaceMode.addHandler('INTERFACEMODE_ACQUIRE_TILE', new AcquireTileInterfaceMode());

//# sourceMappingURL=file:///base-standard/ui/interface-modes/interface-mode-acquire-tile.js.map
