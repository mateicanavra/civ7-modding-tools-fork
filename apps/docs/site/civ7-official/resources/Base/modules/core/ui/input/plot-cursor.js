/**
 * @file plot cursor
 * @copyright 2024, Firaxis Games
 * @description Track the plot cursor in the 3D game world
 */
import ContextManager from '/core/ui/context-manager/context-manager.js';
import Cursor, { CursorUpdatedEventName } from '/core/ui/input/cursor.js';
import ViewManager from '/core/ui/views/view-manager.js';
/// Debug switches
const debug_plotCursorSpeed = false; // log out plot cursor information as it moves (lots of LOG!)
// Pre-compute frequently used value(s)
const PI2 = Math.PI * 2;
const VELOCITY = 1.6;
var State;
(function (State) {
    State[State["IDLE"] = 0] = "IDLE";
    State[State["MOVING"] = 1] = "MOVING";
})(State || (State = {}));
const plotCursorModes = [
    {
        initialDelay: 0.1,
        maxAccumulateToMove: 0.1,
        analogStickThreshold: 0.35,
        cameraZoomMultiplier: 4,
        panBorderPercentW: 0.2,
        panBorderPercentH: 0.15,
    },
    {
        initialDelay: .01,
        maxAccumulateToMove: 1,
        analogStickThreshold: 0.40,
        cameraZoomMultiplier: 0,
        panBorderPercentW: 0,
        panBorderPercentH: 0,
    }
];
export const PlotCursorUpdatedEventName = 'plot-cursor-coords-updated';
export class PlotCursorUpdatedEvent extends CustomEvent {
    constructor(plotCoords) {
        super(PlotCursorUpdatedEventName, { bubbles: false, detail: { plotCoords } });
    }
}
class PlotCursorSingleton {
    constructor() {
        this.init = false;
        this.state = State.IDLE;
        this.plotVFXHidden = false;
        this._PlotCursorCoords = null;
        this.worldAnchor = null;
        this.cursorParameters = plotCursorModes[0];
        this.isFOWNavigationAllowed = true; // Can the cursor move into fog-of-war tiles?
        this.frameAccumulated = 0; // Accumulated frame deltas between moves once state is moving
        this.distance = 0; // When greater than a value, triggers a move to the next plot.
        this.origin = { x: 0, y: 0, z: 0 };
        this.isUnitSelected = false;
        this.unitLocation = null;
        this.plotCursorModelGroup = null;
        this.cursorUpdatedListener = this.onCursorUpdated.bind(this);
        this.hidePlotVFXListener = this.hidePlotVFX.bind(this);
        this.showPlotVFXListener = this.showPlotVFX.bind(this);
        Loading.runWhenLoaded(() => this.initialize());
    }
    initialize() {
        // Register debug widget.
        const disablePlotCursor = {
            id: 'disablePlotCursor',
            category: 'Systems',
            caption: 'Disable Plot Cursor',
            domainType: 'bool',
            value: false,
        };
        UI.Debug.registerWidget(disablePlotCursor);
        const hidePlotVFX = {
            id: 'hidePlotVFX',
            category: 'Tuning',
            caption: 'Hide Plot VFX',
            domainType: 'bool',
            value: false,
        };
        UI.Debug.registerWidget(hidePlotVFX);
        engine.on('DebugWidgetUpdated', (id, value) => {
            console.log(`DebugWidgetUpdated! ${id} ${value}`);
            if (id == 'disablePlotCursor') {
                if (value) {
                    this.shutdown();
                }
                else {
                    this.startup();
                }
            }
            else if (id == 'hidePlotVFX') {
                if (value) {
                    this.hidePlotVFX();
                }
                else {
                    this.showPlotVFX();
                }
            }
        });
        this.startup();
    }
    startup() {
        if (!this.init) {
            engine.on('BeginFrame', this.onUpdate, this);
            engine.on('plotCursorMode', this.onPlotCursorModeChange, this);
            engine.on('UnitSelectionChanged', this.onUnitSelectionChanged, this);
            engine.on('CameraChanged', this.onCameraChanged, this);
            engine.on('BeforeUnload', this.shutdown, this);
            if (Configuration.getXR()) {
                engine.on('PlotChanged', this.onPlotChanged, this);
            }
            window.addEventListener(CursorUpdatedEventName, this.cursorUpdatedListener);
            window.addEventListener('ui-hide-plot-vfx', this.hidePlotVFXListener);
            window.addEventListener('ui-show-plot-vfx', this.showPlotVFXListener);
            this.plotCursorModelGroup = WorldUI.createModelGroup("plotCursorModelGroup");
            this.init = true;
        }
    }
    shutdown() {
        if (this.init) {
            engine.off('BeginFrame', this.onUpdate, this);
            engine.off('plotCursorMode', this.onPlotCursorModeChange, this);
            engine.off('UnitSelectionChanged', this.onUnitSelectionChanged, this);
            engine.off('CameraChanged', this.onCameraChanged, this);
            engine.off('BeforeUnload', this.shutdown, this);
            if (Configuration.getXR()) {
                engine.off('PlotChanged', this.onPlotChanged, this);
            }
            window.removeEventListener(CursorUpdatedEventName, this.cursorUpdatedListener);
            window.removeEventListener('ui-hide-plot-vfx', this.hidePlotVFXListener);
            window.removeEventListener('ui-show-plot-vfx', this.showPlotVFXListener);
            if (this.plotCursorModelGroup) {
                this.plotCursorModelGroup.destroy();
                this.plotCursorModelGroup = null;
            }
            this.init = false;
        }
    }
    onUpdate(timeDelta) {
        this.frameAccumulated = timeDelta;
    }
    /**
     * Singleton accessor
     */
    static getInstance() {
        if (!PlotCursorSingleton.Instance) {
            PlotCursorSingleton.Instance = new PlotCursorSingleton();
        }
        return PlotCursorSingleton.Instance;
    }
    set plotCursorCoords(coords) {
        //TODO: HACK for blocking engine input contextually. Remove when focus / input flow is updated.
        //Check if we are allowed to use input 
        if (!Configuration.getXR()) {
            if (!ContextManager.canUseInput("plot-cursor", 'set-plot-cursor-coords')) {
                return;
            }
        }
        else {
            console.warn("disabling canUseInput check due to hitch locking plot selection.");
        }
        // Filter out duplicate coords
        if (coords == null && this._PlotCursorCoords == null) {
            return;
        }
        else if (this._PlotCursorCoords?.x == coords?.x && this._PlotCursorCoords?.y == coords?.y) {
            return;
        }
        this._PlotCursorCoords = coords;
        // Move the world anchor and update (virtual) cursor position to center of plot.
        if (this._PlotCursorCoords) {
            if (this.worldAnchor != null) {
                this.worldAnchor.SetAnchorAtPlot(this._PlotCursorCoords, 1);
            }
            else {
                this.worldAnchor = WorldAnchors.CreateAtPlot(this._PlotCursorCoords, 1);
            }
        }
        else {
            this.worldAnchor?.Destroy();
            this.worldAnchor = null;
        }
        this.updateVirtualScreenPosition();
        this.realizeFocusedPlot();
        // Tell listeners we've updated plot coords
        window.dispatchEvent(new PlotCursorUpdatedEvent(this._PlotCursorCoords));
    }
    get plotCursorCoords() {
        return this._PlotCursorCoords;
    }
    updateVirtualScreenPosition() {
        if (this.worldAnchor != null) {
            const pixel = this.worldAnchor.PixelPosition();
            Cursor.setGamePadScreenPosition(pixel ?? { x: -1, y: -1 }); // Set the cursor
        }
    }
    onCameraChanged(_data) {
        this.updateVirtualScreenPosition();
    }
    /// Debug function - used to change parameters of the plot cursor based on signals from the debug console
    onPlotCursorModeChange(mode) {
        if (mode < 0 || mode >= plotCursorModes.length) {
            console.warn("Unable to change plot cursor mode. Out of range. mode: ", mode, " length: ", plotCursorModes.length);
            return;
        }
        // Ensure the parameter set being loaded is valid.
        const parameters = plotCursorModes[mode];
        if (parameters.analogStickThreshold > 0.9) {
            console.warn("Not changing plot cursor mode, stick threshold is crazy big. mode: ", mode, " analogStickThreshold: ", parameters.analogStickThreshold);
            return;
        }
        this.cursorParameters = parameters;
        console.warn("Plot Cursor '" + mode + "' parameters are live:");
        console.log("     analogStickThreshold: ", parameters.analogStickThreshold);
        console.log("    cameraZoomMultiplier: ", parameters.cameraZoomMultiplier);
        console.log("     maxAccumulateToMove: ", parameters.maxAccumulateToMove);
    }
    /// Sets the plot cursor position directly. (for XR)
    onPlotChanged(posX, posY) {
        if (!ViewManager.isWorldInputAllowed) {
            return;
        }
        this.plotCursorCoords = { x: posX, y: posY };
    }
    onCursorUpdated(event) {
        //TODO: HACK for blocking engine input contextually. Remove when focus / input flow is updated.
        //Check if we are allowed to use input 
        if (!ContextManager.canUseInput("plot-cursor", CursorUpdatedEventName)) {
            return;
        }
        this.plotCursorCoords = event.detail.plot;
    }
    /**
     * Take an analog joystick with an X and a Y axis, wach spaning values -1 to 1.
     * Assume at 0, 90, 180, and 270 degrees a max "length" is 1.0
     * When at a 45 degree angle (inbetween the above), max length is 1.41421 but...
     * ...because analog sticks physically are clamped at a circle this tends to be 1.1ish.
     * Every stick varies so 1.1 seems to be the safest that maintains full range for all players
     * Finds magnitude (between 1.0 to 1.1) for a given angle and computes length along the magnitude
     * @param {number} x - analog stick x coordinate -1 to 1
     * @param {number} y - analog stick y coordinate -1 to 1
     * @returns A value between 0 and 1 representing the % of the angle's magnitude to the unit square
     */
    getAnalogJoystickPercentOutward(x, y) {
        const angle = Math.atan2(y, x);
        const cosAngle = Math.abs(Math.cos(angle));
        const sinAngle = Math.abs(Math.sin(angle));
        const magnitude = 1.0 / ((sinAngle <= cosAngle) ? cosAngle : sinAngle);
        const adjustedMagnitude = Math.min(magnitude, 1.1); // Clamp at 1.1 since values between that and 1.4141 likly not possible due to physical joystick ring
        const length = Math.hypot(x, y) / adjustedMagnitude;
        return length;
    }
    onMovePlotCursor(event) {
        if (event.detail.status == undefined || event.detail.x == undefined || event.detail.y == undefined) {
            console.error("onMovePlotCursor failed to receive valid detail data.");
            return;
        }
        // The finish event guarnatees an end.
        if (event.detail.status == InputActionStatuses.FINISH) {
            this.distance = 0;
            this.frameAccumulated = 0;
            this.state = State.IDLE;
            return;
        }
        // If not enough of a press is occurring on the analog stick, don't start or update a move.
        const x = event.detail.x;
        const y = event.detail.y;
        const length = this.getAnalogJoystickPercentOutward(x, y);
        if (length < this.cursorParameters.analogStickThreshold) {
            this.distance = 0;
            this.frameAccumulated = 0;
            return;
        }
        // Not moving, start up.
        if (this.state == State.IDLE) {
            this.state = State.MOVING;
            this.distance = -this.cursorParameters.initialDelay; // Reset so after first move
            this.movePlotCursor(x, y); // Immediate move.
        }
        else {
            const zoom = (this.cursorParameters.cameraZoomMultiplier * Camera.getState().zoomLevel);
            const speed = this.frameAccumulated * (zoom + (2 * length) + VELOCITY);
            this.distance += speed;
            if (this.distance >= this.cursorParameters.maxAccumulateToMove) {
                this.distance = 0;
                this.movePlotCursor(x, y);
                if (debug_plotCursorSpeed) {
                    console.log(`onMovePlotCursor(${event.detail.status}) moveAcc: ${this.distance.toFixed(4)}, frameAcc: ${this.frameAccumulated.toFixed(4)}, speed: ${speed.toFixed(4)}, zoom: ${zoom}}`);
                }
            }
        }
        this.frameAccumulated = 0; // Reset accumulated frame delta from update.
    }
    movePlotCursor(x, y) {
        // If we have no plot currently selected then select the center most plot from the camera
        if (this.plotCursorCoords == null || !GameplayMap.isValidLocation(this.plotCursorCoords)) {
            // make sure the centermost plot is within the game board otherwise shift the y coordinate until it is
            let newCoord = Camera.pickPlot(0.5, 0.5);
            if (newCoord == null)
                return;
            if (newCoord.y < 0)
                newCoord.y = 0;
            if (newCoord.y > GameplayMap.getGridHeight() - 1)
                newCoord.y = GameplayMap.getGridHeight() - 1;
            this.plotCursorCoords = newCoord;
            return;
        }
        else {
            console.warn("No valid coords found when attempting to move plot cursor!");
        }
        const angle = (Math.atan2(y, x) + PI2) % (PI2); // Calculate angle in radians and normalize it to [0, PI2].
        const direction = Math.round((angle / PI2) * 6) % 6; // Divide angle into 6 equal sectors for the hex directions.
        // Move the plot cursor in that direction
        let newCoord = { x: -1, y: -1 };
        switch (direction) {
            case 0:
                newCoord = GameplayMap.getAdjacentPlotLocation(this.plotCursorCoords, DirectionTypes.DIRECTION_EAST);
                break;
            case 1:
                newCoord = GameplayMap.getAdjacentPlotLocation(this.plotCursorCoords, DirectionTypes.DIRECTION_NORTHEAST);
                break;
            case 2:
                newCoord = GameplayMap.getAdjacentPlotLocation(this.plotCursorCoords, DirectionTypes.DIRECTION_NORTHWEST);
                break;
            case 3:
                newCoord = GameplayMap.getAdjacentPlotLocation(this.plotCursorCoords, DirectionTypes.DIRECTION_WEST);
                break;
            case 4:
                newCoord = GameplayMap.getAdjacentPlotLocation(this.plotCursorCoords, DirectionTypes.DIRECTION_SOUTHWEST);
                break;
            case 5:
                newCoord = GameplayMap.getAdjacentPlotLocation(this.plotCursorCoords, DirectionTypes.DIRECTION_SOUTHEAST);
                break;
        }
        // If the newCoord is out of the gameplay map we don't need to continue, but allow for +/- 1 row for buffer zone
        if (newCoord.y < 0 || newCoord.y > GameplayMap.getGridHeight() - 1) {
            return;
        }
        // Eval FOW, don't move if hidden.
        if (!this.isFOWNavigationAllowed) {
            const revealedState = GameplayMap.getRevealedState(GameContext.localPlayerID, newCoord.x, newCoord.y);
            if (revealedState == RevealedStates.HIDDEN) {
                // Leave early unless already in a hidden state, meaning we were dropped off by the mouse.
                const currentRevealedState = GameplayMap.getRevealedState(GameContext.localPlayerID, this.plotCursorCoords.x, this.plotCursorCoords.y);
                if (currentRevealedState != RevealedStates.HIDDEN) {
                    return;
                }
            }
        }
        this.plotCursorCoords = newCoord;
        // Move the camera if our plot cursor is outside of the panning boundary.
        let isMoveCamera = true; // default to yes to handle when cursor is offscreen and there is no world anchor
        const position = this.worldAnchor?.PixelPosition();
        if (position) {
            const width = window.innerWidth * this.cursorParameters.panBorderPercentW;
            const height = window.innerHeight * this.cursorParameters.panBorderPercentH;
            isMoveCamera = (position.x < width || position.x > window.innerWidth - width || position.y < height || position.y > window.innerHeight - height);
        }
        if (isMoveCamera) {
            Camera.lookAtPlot(this.plotCursorCoords);
        }
    }
    realizeFocusedPlot() {
        if (this.plotCursorModelGroup && !this.plotVFXHidden) {
            this.plotCursorModelGroup.clear();
            if (this._PlotCursorCoords) {
                this.plotCursorModelGroup.addVFXAtPlot("VFX_3dUI_PlotCursor_01", this._PlotCursorCoords, this.origin);
            }
        }
    }
    onCenterPlotCursor(status) {
        if (status == InputActionStatuses.FINISH) {
            const centerPlot = Camera.pickPlot(0.5, 0.5);
            if (centerPlot) {
                this.plotCursorCoords = centerPlot;
            }
        }
    }
    hidePlotVFX() {
        if (!this.plotVFXHidden) {
            if (this.plotCursorModelGroup) {
                this.plotCursorModelGroup.clear();
            }
            this.plotVFXHidden = true;
        }
    }
    showPlotVFX() {
        if (this.plotVFXHidden) {
            this.plotVFXHidden = false;
            this.updateVirtualScreenPosition();
            this.realizeFocusedPlot();
        }
    }
    hideCursor() {
        this.hidePlotVFX();
    }
    showCursor() {
        this.showPlotVFX();
    }
    onUnitSelectionChanged(data) {
        this.isUnitSelected = data.selected;
        this.unitLocation = data.location;
        if (data.selected) {
            const selectedUnit = Units.get(data.unit);
            if (selectedUnit && selectedUnit.isOnMap) { // Since units can now be selected while not on the map, lets check that before updating the plot cursor location.
                if (this.plotCursorCoords) {
                    this.plotCursorCoords.x = data.location.i;
                    this.plotCursorCoords.y = data.location.j;
                    this.updateVirtualScreenPosition();
                    this.realizeFocusedPlot();
                }
                else {
                    this.plotCursorCoords = { x: data.location.i, y: data.location.j };
                }
            }
        }
    }
    isOnUI(x, y) {
        const target = document.elementFromPoint(x, y);
        return !(target == document.documentElement || target == document.body || target == null || target.hasAttribute("data-pointer-passthrough"));
    }
    handleTouchTap(inputEvent) {
        if (this.isOnUI(inputEvent.detail.x, inputEvent.detail.y)) {
            // only change plot if we didn't hit a UI Element
            return false;
        }
        const newCoords = Camera.pickPlotFromPoint(inputEvent.detail.x, inputEvent.detail.y);
        ;
        let live = true;
        if (this.isUnitSelected &&
            (newCoords?.x != this.unitLocation?.i || newCoords?.y != this.unitLocation?.j) && // not the unit location
            (newCoords?.x != this.plotCursorCoords?.x || newCoords?.y != this.plotCursorCoords?.y)) { // new plot coords
            live = false;
        }
        this.plotCursorCoords = newCoords;
        return live;
    }
    handleTouchPress(inputEvent) {
        if (this.isOnUI(inputEvent.detail.x, inputEvent.detail.y)) {
            // only change plot if we didn't hit a UI Element
            // don't stop the event so tooltip manager can process the press
            return true;
        }
        this.plotCursorCoords = Camera.pickPlotFromPoint(inputEvent.detail.x, inputEvent.detail.y);
        // continue so tooltip manager can process the press as well
        return true;
    }
    handleInput(inputEvent) {
        let live = true;
        switch (inputEvent.detail.name) {
            case 'center-plot-cursor':
                this.onCenterPlotCursor(inputEvent.detail.status);
                // TODO: Reactivate if gamepad button combinations are available for tutorial-callout minimization
                // live = false;
                break;
            case 'touch-tap':
                live = this.handleTouchTap(inputEvent);
                break;
            case 'touch-press':
                live = this.handleTouchPress(inputEvent);
                break;
            case 'plot-move':
                this.onMovePlotCursor(inputEvent);
                live = false;
                break;
        }
        return live;
    }
    handleNavigation(_navigationEvent) {
        return false;
    }
}
export const PlotCursor = PlotCursorSingleton.getInstance();
export { PlotCursor as default };

//# sourceMappingURL=file:///core/ui/input/plot-cursor.js.map
