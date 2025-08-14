/**
 * @file Camera Controller
 * @copyright 2021-2025, Firaxis Games
 * @description Handles camera movement triggered by input actions
 */
import { InputEngineEventName } from '/core/ui/input/input-support.js';
import ViewManager from '/core/ui/views/view-manager.js';
var DragType;
(function (DragType) {
    DragType[DragType["None"] = 0] = "None";
    DragType[DragType["Pan"] = 1] = "Pan";
    DragType[DragType["Rotate"] = 2] = "Rotate";
    DragType[DragType["Swipe"] = 3] = "Swipe";
})(DragType || (DragType = {}));
;
const cameraSwipeMinimumVelocity = 5;
const zoomRate = 0.3;
const panModifier = 10;
var PanDirection;
(function (PanDirection) {
    PanDirection[PanDirection["None"] = 0] = "None";
    PanDirection[PanDirection["Up"] = 1] = "Up";
    PanDirection[PanDirection["Down"] = 2] = "Down";
    PanDirection[PanDirection["Left"] = 4] = "Left";
    PanDirection[PanDirection["Right"] = 8] = "Right";
})(PanDirection || (PanDirection = {}));
var ZoomType;
(function (ZoomType) {
    ZoomType[ZoomType["None"] = 0] = "None";
    ZoomType[ZoomType["In"] = 1] = "In";
    ZoomType[ZoomType["Out"] = 2] = "Out";
})(ZoomType || (ZoomType = {}));
class CameraControllerSingleton {
    ;
    constructor() {
        this.keyboardPanDirection = PanDirection.None;
        this.zoomInProgress = ZoomType.None;
        this.currentDragType = DragType.None;
        this.lastMouseDragPos = { x: 0, y: 0 };
        this.keyboardCameraModifierActive = false;
        this.gamepadCameraPan = { x: 0, y: 0 };
        this.panSpeed = this.getModifiedPanSpeed();
        this.swipeVelocity = { x: 0, y: 0 };
        this.engineInputListener = this.onEngineInput.bind(this);
        this.updateFrameListener = this.onUpdateFrame.bind(this);
        this.updateFrameEventHandle = null;
        engine.whenReady.then(() => { this.onReady(); });
    }
    /**
     * Singleton accessor
     */
    static getInstance() {
        if (!CameraControllerSingleton.instance) {
            CameraControllerSingleton.instance = new CameraControllerSingleton();
        }
        return CameraControllerSingleton.instance;
    }
    onReady() {
        window.addEventListener(InputEngineEventName, this.engineInputListener);
        window.addEventListener('camera-drag-mouse', (event) => { this.dragMouse(event); });
        window.addEventListener('camera-drag-mouse-start', (event) => { this.dragMouseStart(event); });
        window.addEventListener('camera-drag-mouse-end', () => { this.dragMouseEnd(); });
        window.addEventListener('camera-drag-mouse-swipe', (event) => { this.dragMouseSwipe(event); });
    }
    /**
     * Get the configuration pan speed and modify it to an appropriate value
     */
    getModifiedPanSpeed() {
        return Configuration.getUser().cameraPanningSpeed * panModifier;
    }
    /**
     * Starts listening for UpdateFrame so we can start panning
     */
    startPanning() {
        if (this.updateFrameEventHandle) {
            // Started panning
            return;
        }
        this.panSpeed = this.getModifiedPanSpeed();
        if (!this.updateFrameEventHandle) {
            this.updateFrameEventHandle = engine.on('UpdateFrame', this.updateFrameListener);
        }
    }
    /**
     * Per frame update as long as pan button is pressed.
     */
    onUpdateFrame(frameDelta) {
        if (!ViewManager.isWorldInputAllowed) {
            this.updateFrameEventHandle?.clear();
            this.updateFrameEventHandle = null;
            return;
        }
        // Only make subsquent frame request if a pan operation is occurring
        if (this.keyboardPanDirection != PanDirection.None) {
            let panAmount = { x: 0, y: 0 };
            const panSpeed = this.panSpeed * frameDelta;
            if ((this.keyboardPanDirection & PanDirection.Up) == PanDirection.Up) {
                panAmount.y = panAmount.y + panSpeed;
            }
            ;
            if ((this.keyboardPanDirection & PanDirection.Down) == PanDirection.Down) {
                panAmount.y = panAmount.y - panSpeed;
            }
            ;
            if ((this.keyboardPanDirection & PanDirection.Left) == PanDirection.Left) {
                panAmount.x = panAmount.x - panSpeed;
            }
            ;
            if ((this.keyboardPanDirection & PanDirection.Right) == PanDirection.Right) {
                panAmount.x = panAmount.x + panSpeed;
            }
            ;
            if (panAmount.x != 0 || panAmount.y != 0) {
                Camera.panFocus(panAmount);
            }
        }
        else if (this.gamepadCameraPan.x != 0 || this.gamepadCameraPan.y != 0) {
            const panSpeed = this.panSpeed * frameDelta;
            const panAmount = { x: this.gamepadCameraPan.x * panSpeed, y: this.gamepadCameraPan.y * panSpeed };
            Camera.panFocus(panAmount);
        }
        else if (this.currentDragType == DragType.Swipe) {
            this.handleSwipe(frameDelta);
        }
        else {
            this.updateFrameEventHandle?.clear();
            this.updateFrameEventHandle = null;
        }
    }
    onEngineInput(inputEvent) {
        switch (inputEvent.detail.name) {
            case 'keyboard-camera-modifier':
                this.onKeyboardCameraModifier(inputEvent.detail.status);
                break;
        }
    }
    handleSwipe(timeStampDiff) {
        let panAmount = { x: 0, y: 0 };
        panAmount.x = this.swipeVelocity.x != 0 ? this.swipeVelocity.x * timeStampDiff / 1000 : 0;
        panAmount.y = this.swipeVelocity.y != 0 ? this.swipeVelocity.y * timeStampDiff / 1000 : 0;
        if ((Math.abs(panAmount.x) + Math.abs(panAmount.y)) < cameraSwipeMinimumVelocity) {
            this.currentDragType = DragType.None;
        }
        else {
            this.swipeVelocity.x -= panAmount.x;
            this.swipeVelocity.y -= panAmount.y;
            Camera.panFocus(panAmount);
        }
    }
    onKeyboardCameraModifier(status) {
        if (status == InputActionStatuses.START) {
            this.keyboardCameraModifierActive = true;
        }
        else if (status == InputActionStatuses.FINISH) {
            this.keyboardCameraModifierActive = false;
        }
    }
    onGamepadCameraPan(status, panDir) {
        switch (status) {
            case InputActionStatuses.START:
            case InputActionStatuses.UPDATE:
                this.gamepadCameraPan = panDir;
                this.startPanning();
                break;
            case InputActionStatuses.FINISH:
                this.gamepadCameraPan = { x: 0, y: 0 };
                break;
        }
    }
    keyboardPanUp(event) {
        const status = event.detail.status;
        if (status == InputActionStatuses.START) {
            this.keyboardPanDirection |= PanDirection.Up;
            this.startPanning();
        }
        else if (status == InputActionStatuses.FINISH) {
            this.keyboardPanDirection ^= PanDirection.Up;
        }
    }
    keyboardPanDown(event) {
        const status = event.detail.status;
        if (status == InputActionStatuses.START) {
            this.keyboardPanDirection |= PanDirection.Down;
            this.startPanning();
        }
        else if (status == InputActionStatuses.FINISH) {
            this.keyboardPanDirection ^= PanDirection.Down;
        }
    }
    keyboardPanLeft(event) {
        const status = event.detail.status;
        if (status == InputActionStatuses.START) {
            this.keyboardPanDirection |= PanDirection.Left;
            this.startPanning();
        }
        else if (status == InputActionStatuses.FINISH) {
            this.keyboardPanDirection ^= PanDirection.Left;
        }
    }
    keyboardPanRight(event) {
        const status = event.detail.status;
        if (status == InputActionStatuses.START) {
            this.keyboardPanDirection |= PanDirection.Right;
            this.startPanning();
        }
        else if (status == InputActionStatuses.FINISH) {
            this.keyboardPanDirection ^= PanDirection.Right;
        }
    }
    cameraRotate(status, x) {
        if (!ViewManager.isWorldInputAllowed) {
            return;
        }
        if (status == InputActionStatuses.FINISH) {
            Camera.rotate(0, false);
        }
        else {
            Camera.rotate(x, true);
        }
    }
    cameraZoomIn(status, x) {
        if (!ViewManager.isWorldInputAllowed || this.zoomInProgress == ZoomType.Out) {
            return;
        }
        this.zoomInProgress = ZoomType.In;
        let zoomValue = x;
        if ((status == InputActionStatuses.START || status == InputActionStatuses.UPDATE) && zoomValue == 0) {
            // zoom can be zero if we use buttons for the camera zoom actions (eg switch ZL/ZR) so set it to 1 in this case
            zoomValue = 1;
        }
        const cameraState = Camera.getState();
        const amount = Math.max(cameraState.zoomLevel - (zoomRate * zoomValue), 0.0);
        Camera.zoom(amount);
        if (status == InputActionStatuses.FINISH) {
            this.zoomInProgress = ZoomType.None;
        }
    }
    cameraZoomOut(status, x) {
        if (!ViewManager.isWorldInputAllowed || this.zoomInProgress == ZoomType.In) {
            return;
        }
        this.zoomInProgress = ZoomType.Out;
        let zoomValue = x;
        if ((status == InputActionStatuses.START || status == InputActionStatuses.UPDATE) && zoomValue == 0) {
            // zoom can be zero if we use buttons for the camera zoom actions (eg switch ZL/ZR) so set it to 1 in this case
            zoomValue = 1;
        }
        const cameraState = Camera.getState();
        const amount = Math.min(cameraState.zoomLevel + (zoomRate * zoomValue), 1.0);
        Camera.zoom(amount);
        if (status == InputActionStatuses.FINISH) {
            this.zoomInProgress = ZoomType.None;
        }
    }
    panToMouse(event) {
        if (event.detail.x && event.detail.y && event.detail.status == InputActionStatuses.FINISH && ViewManager.isWorldInputAllowed) {
            const plotCoords = Camera.pickPlotFromPoint(event.detail.x, event.detail.y);
            if (plotCoords) {
                Camera.lookAtPlot(plotCoords);
            }
        }
    }
    dragMouse(event) {
        if (event.detail.x && event.detail.y) {
            if (this.currentDragType == DragType.Pan) {
                // Pan the camera
                const nx = event.detail.x / window.innerWidth;
                const ny = event.detail.y / window.innerHeight;
                const newMouseDragPos = { x: nx, y: ny };
                Camera.dragFocus(this.lastMouseDragPos, newMouseDragPos);
                this.lastMouseDragPos = newMouseDragPos;
            }
        }
    }
    isOnUI(x, y) {
        const target = document.elementFromPoint(x, y);
        return !(target == document.documentElement || target == document.body || target == null || target.hasAttribute("data-pointer-passthrough"));
    }
    dragMouseStart(event) {
        if (event.detail.x && event.detail.y) {
            if (this.isOnUI(event.detail.x, event.detail.y)) {
                return;
            }
            if (this.keyboardCameraModifierActive) {
                // Do rotate drag if the modifier is active
                this.currentDragType = DragType.Rotate;
            }
            else {
                // Else do normal pan drag
                this.currentDragType = DragType.Pan;
                const nx = event.detail.x / window.innerWidth;
                const ny = event.detail.y / window.innerHeight;
                this.lastMouseDragPos = { x: nx, y: ny };
            }
        }
    }
    dragMouseEnd() {
        this.currentDragType = DragType.None;
    }
    dragMouseSwipe(event) {
        this.swipeVelocity.x = -event.detail.x;
        this.swipeVelocity.y = event.detail.y;
        this.currentDragType = DragType.Swipe;
        this.startPanning();
    }
    handleTouchPan(inputEvent) {
        switch (inputEvent.detail.status) {
            case InputActionStatuses.START:
                this.dragMouseStart(inputEvent);
                break;
            case InputActionStatuses.DRAG:
                this.dragMouse(inputEvent);
                break;
            case InputActionStatuses.FINISH:
                this.dragMouseEnd();
                break;
            default:
                break;
        }
    }
    /**
     *  @returns true if still live, false if input should stop.
     */
    handleInput(inputEvent) {
        switch (inputEvent.detail.name) {
            case 'mousebutton-middle':
                this.panToMouse(inputEvent);
                return false;
            case 'keyboard-nav-up':
                this.keyboardPanUp(inputEvent);
                return false;
            case 'keyboard-nav-down':
                this.keyboardPanDown(inputEvent);
                return false;
            case 'keyboard-nav-right':
                this.keyboardPanRight(inputEvent);
                return false;
            case 'keyboard-nav-left':
                this.keyboardPanLeft(inputEvent);
                return false;
            case 'camera-pan':
                this.onGamepadCameraPan(inputEvent.detail.status, { x: inputEvent.detail.x, y: inputEvent.detail.y });
                return false;
            case 'camera-rotate':
                this.cameraRotate(inputEvent.detail.status, inputEvent.detail.x);
                return false;
            case 'camera-zoom-in':
            case 'touch-pinch-in':
                this.cameraZoomIn(inputEvent.detail.status, inputEvent.detail.x);
                return false;
            case 'camera-zoom-out':
            case 'touch-pinch-out':
                this.cameraZoomOut(inputEvent.detail.status, inputEvent.detail.x);
                return false;
            case 'touch-pan':
                this.handleTouchPan(inputEvent);
                return false;
            case 'touch-swipe':
                this.dragMouseSwipe(inputEvent);
                return false;
            case 'touch-touch':
                this.dragMouseEnd();
                return true;
        }
        return true;
    }
    /**
     * @returns true if still live, false if input should stop.
     */
    handleNavigation(_navigationEvent) {
        return true;
    }
}
const CameraController = CameraControllerSingleton.getInstance();
export { CameraController as default };

//# sourceMappingURL=file:///core/ui/camera/camera-controller.js.map
