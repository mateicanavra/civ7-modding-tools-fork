/**
 * @file cursor.ts
 * @copyright 2020-2022, Firaxis Games
 * @description Input marshaling of where the 'cursor' should exist in screen space.
 * Cursor may be moved by a mouse, by a soft-cursor setup from gamepad, by touch, or by focus jumping via gamepad.
 */
import FocusManager from '/core/ui/input/focus-manager.js';
import { SpriteSheet, SpriteSheetAnimation } from '/core/ui/utilities/animations.js';
import ViewManager from '/core/ui/views/view-manager.js';
/**
 * CursorUpdatedEvent is fired when the cursor's position has changed.
 */
export const CursorUpdatedEventName = 'cursor-updated';
export class CursorUpdatedEvent extends CustomEvent {
    constructor(x, y, target, plot) {
        super(CursorUpdatedEventName, { bubbles: true, cancelable: false, detail: { x, y, target, plot: plot } });
    }
}
class CursorSingleton {
    constructor() {
        this.position = { x: -1, y: -1 }; // Position of the active cursor
        // True when we want to ignore cursor target input events due to dragging
        this.ignoreCursorTargetDueToDragging = false;
        // TODO - A bug exists where the translate is not correctly interpreted as an XY translate unless two non-zero values are used.
        this.cursorTranslate = new CSSTranslate(CSS.px(-1), CSS.px(-1));
        this.cursorTransform = new CSSTransformValue([this.cursorTranslate]);
        this.mouse = { x: -1, y: -1 }; // Last mouse x,y (or touch equivalent)
        this.gamepad = { x: -1, y: -1 }; // Last gamepad x,y
        this.isMouse = true; // Is mouse x,y the active one?
        this._target = document.body; // What is under the cursor
        this.lastPosition = { x: -1, y: -1 };
        this.softCursorVelocity = { x: 0, y: 0 };
        this.softCursorSpeed = 550;
        this._softCursorEnabled = false;
        this._hybridCursorEnabled = false;
        // Pixel length of the mouse position change needed to trigger setTarget()
        this.mouseMoveDeadzone = 3;
        this.onClickListener = this.onClick.bind(this);
        this.mouseMoveEventListener = this.onMouseMove.bind(this);
        this.mouseCheckEventListener = this.onMouseCheck.bind(this);
        this.activeDeviceTypeChangedEventListener = this.onActiveDeviceTypeChanged.bind(this);
        this.moveSoftCursorEventListener = this.onMoveSoftCursor.bind(this);
        this.softCursorRoot = document.createElement('div');
        this.softCursor = document.createElement('fxs-soft-cursor');
        Loading.runWhenLoaded(() => { this.onInitialize(); });
    }
    /**
     * Singleton accessor
     */
    static getInstance() {
        if (!CursorSingleton.Instance) {
            CursorSingleton.Instance = new CursorSingleton();
        }
        return CursorSingleton.Instance;
    }
    /**
     * @returns true if the current location of the cursor over top of a User Interface element.
     */
    get isOnUI() {
        return this.isMouse
            && !(this._target === document.body
                || this._target.hasAttribute('data-pointer-passthrough'));
    }
    /**
     * @returns the current target of the cursor
     */
    get target() {
        return this._target;
    }
    /**
     * Set the cursor target
     */
    set target(newTarget) {
        if (this._target != newTarget) {
            this._target = newTarget;
            const shouldBlockZoom = !this.shouldAllowCameraControls() || !ViewManager.isWorldInputAllowed;
            Camera.setPreventMouseCameraMovement(shouldBlockZoom);
        }
    }
    /**
     * Allow mouse based camera controls if the document body is the target or if it explicitly allows camera movement
     */
    shouldAllowCameraControls() {
        if (this.target instanceof HTMLElement) {
            if (this.target === document.body) {
                // If our target is just the body we shouldn't be over any UI so allow camera controls
                return true;
            }
            else if (this.target.closest('.allowCameraMovement') != null) {
                // Whatever UI we're over allows camera controls somewhere in it's parent chain
                return true;
            }
        }
        // Prevent camera controls in all other cases
        return false;
    }
    /**
     * Toggles the software cursor
     * Resets to center of screen on enabled
     */
    set softCursorEnabled(enabled) {
        if (this.hybridCursorEnabled) {
            return;
        }
        if (enabled) {
            this._softCursorEnabled = true;
            this.softCursorRoot.style.opacity = "1";
            this.softCursorVelocity = { x: 0, y: 0 };
            const windowCenterX = window.innerWidth / 2;
            const windowCenterY = window.innerHeight / 2;
            this.cursorTranslate.x = CSS.px(windowCenterX);
            this.cursorTranslate.y = CSS.px(windowCenterY);
            this.softCursor.attributeStyleMap.set('transform', this.cursorTransform);
            Input.virtualMouseMove(windowCenterX, windowCenterY);
        }
        else {
            this._softCursorEnabled = false;
            this.softCursorRoot.style.opacity = "0";
        }
    }
    /**
     * @returns true if the software cursor is enabled
     */
    get softCursorEnabled() {
        return this._softCursorEnabled;
    }
    set hybridCursorEnabled(enabled) {
        if (enabled) {
            this.softCursorEnabled = false;
            this._hybridCursorEnabled = true;
            this.softCursorRoot.style.opacity = "1";
        }
        else {
            this._hybridCursorEnabled = false;
            if (!this._softCursorEnabled) {
                this.softCursorRoot.style.opacity = "0";
            }
        }
    }
    get hybridCursorEnabled() {
        return this._hybridCursorEnabled;
    }
    /**
     * Wire up event listeners.
     */
    onInitialize() {
        if (this.softCursorRoot == undefined) {
            this.softCursorRoot = document.createElement('div');
        }
        if (this.softCursor == undefined) {
            this.softCursor = document.createElement('fxs-soft-cursor');
        }
        this.softCursorRoot.style.pointerEvents = "none";
        this.softCursorRoot.style.position = "absolute";
        this.softCursorRoot.style.opacity = "0";
        this.softCursorRoot.style.zIndex = "2147483647";
        this.softCursorRoot.appendChild(this.softCursor);
        document.body.appendChild(this.softCursorRoot);
        const deviceType = Input.getActiveDeviceType();
        this.isMouse = [InputDeviceType.Hybrid, InputDeviceType.Mouse, InputDeviceType.Keyboard].includes(deviceType);
        window.addEventListener('click', this.onClickListener);
        window.addEventListener('mousemove', this.mouseMoveEventListener, true);
        window.addEventListener('mousecheck', this.mouseCheckEventListener, true); // FXS custom
        window.addEventListener('active-device-type-changed', this.activeDeviceTypeChangedEventListener);
        window.addEventListener('move-soft-cursor', this.moveSoftCursorEventListener);
        engine.on('ToggleMouseEmulate', this.onToggleMouseEmulate, this);
        engine.on('UpdateFrame', this.onUpdate, this);
    }
    onUpdate(timeDelta) {
        this.lastPosition.x = this.position.x;
        this.lastPosition.y = this.position.y;
        if (Cursor.softCursorEnabled) {
            if (this.softCursorVelocity.x != 0 || this.softCursorVelocity.y != 0) {
                // time delta divided by 1000 because it's in milliseconds
                const rate = this.softCursorSpeed * timeDelta;
                const newX = this.mouse.x + (this.softCursorVelocity.x * rate);
                const newY = this.mouse.y - (this.softCursorVelocity.y * rate);
                this.cursorTranslate.x = CSS.px(newX);
                this.cursorTranslate.y = CSS.px(newY);
                this.softCursor.attributeStyleMap.set('transform', this.cursorTransform);
                Input.virtualMouseMove(newX, newY);
            }
        }
        if (this.isMouse) {
            this.position.x = this.mouse.x;
            this.position.y = this.mouse.y;
        }
        else {
            // Gamepad, base position on focus manager
            if (!FocusManager.isWorldFocused()) {
                const targetElement = FocusManager.getFocus();
                const domRect = targetElement.getBoundingClientRect();
                let y = domRect.y + (domRect.height * 0.75);
                if ((y + 50) > window.innerHeight) { // Flip if nearing bottom edge (TODO: Better value, 50 is a arbitrary)
                    y = domRect.y - 25;
                }
                this.position.x = domRect.x + (domRect.width * 0.75);
                this.position.y = y;
            }
            else {
                this.position.x = this.gamepad.x;
                this.position.y = this.gamepad.y;
            }
        }
    }
    /**
     * Determine if the mouse has moved enough to warrent calling setTarget()
     * @param x New X position of mouse
     * @param y New Y position of mouse
     */
    shouldSetTarget(x, y) {
        if (this.isMouse) { // If mouse, no deadzone..
            return true;
        } // ...but in gamepad we want to check for accidental bumps.
        if (Configuration.getXR()) {
            return true;
        }
        const dx = x - this.mouse.x;
        const dy = y - this.mouse.y;
        const deadzoneSquared = (this.mouseMoveDeadzone * this.mouseMoveDeadzone);
        const distance = dx * dx + dy * dy;
        return distance > deadzoneSquared;
    }
    /**
     * Track mouse position and inform focus manager of update.
     * @param event DOM mouse event.
     */
    onMouseMove(event) {
        if (this.shouldSetTarget(event.clientX, event.clientY)
            && event.target instanceof Element) {
            this.setTarget(event.target, event.clientX, event.clientY);
        }
        else {
            // If the mouse doesn't move enough only update position but don't set target or trigger 'set-gamepad-active'
            this.mouse.x = event.clientX;
            this.mouse.y = event.clientY;
        }
        if (this._hybridCursorEnabled) {
            this.cursorTranslate.x = CSS.px(event.clientX);
            this.cursorTranslate.y = CSS.px(event.clientY);
            this.softCursor.attributeStyleMap.set('transform', this.cursorTransform);
        }
    }
    /**
     * FXS Custom
     * Force a check of the target at the existing mouse position.
     * @param event Partial mouse event.  "target" will not be filled out,
     * as that is typically set by Gameface, but this event likely game from the script itself.
     */
    onMouseCheck(event) {
        const x = event.clientX;
        const y = event.clientY;
        const target = document.elementFromPoint(x, y);
        if (target) {
            this.setTarget(target, x, y);
        }
        if (this._hybridCursorEnabled) {
            this.cursorTranslate.x = CSS.px(x);
            this.cursorTranslate.y = CSS.px(y);
            this.softCursor.attributeStyleMap.set('transform', this.cursorTransform);
        }
    }
    /**
     * Set the current cursor target position
     * Should ONLY be triggered by mouse movement and mouse button clicks
     * @param target Element currently being targeted by the cursor
     * @param x X position of the cursor
     * @param y Y position of the cursor
     */
    setTarget(target, x, y) {
        this.mouse.x = x;
        this.mouse.y = y;
        let pointerEventPassthrough = false;
        if (target) {
            if (target instanceof HTMLHtmlElement) {
                // HTMLHtmlElement would be the <html> so we want to make sure to set target to <body>
                this.target = document.body;
            }
            else {
                this.target = target;
                pointerEventPassthrough = this.target.hasAttribute('data-pointer-passthrough');
            }
            this.isMouse = true;
        }
        if (this.lastPosition.x != x || this.lastPosition.y != y) {
            // Inform passive elements the cursor's XY has changed.
            const plot = (UI.isInGame() && (!this.isOnUI || pointerEventPassthrough)) ? Camera.pickPlotFromPoint(x, y) : null;
            window.dispatchEvent(new CursorUpdatedEvent(x, y, target, plot));
        }
    }
    onMoveSoftCursor(event) {
        if (event.detail.status != null && event.detail.x != null && event.detail.y != null) {
            if (event.detail.status == InputActionStatuses.START || event.detail.status == InputActionStatuses.UPDATE) {
                this.softCursorVelocity.x = event.detail.x;
                this.softCursorVelocity.y = event.detail.y;
            }
            else {
                this.softCursorVelocity.x = 0;
                this.softCursorVelocity.y = 0;
            }
        }
        else {
            console.error("onMoveSoftCursor failed to contain necessary detail data");
        }
    }
    onToggleMouseEmulate() {
        this.softCursorEnabled = !this.softCursorEnabled;
    }
    onActiveDeviceTypeChanged(event) {
        this.isMouse = [InputDeviceType.Hybrid, InputDeviceType.Mouse, InputDeviceType.Keyboard].includes(event.detail.deviceType);
    }
    /** Set the game pad's virtual position. */
    setGamePadScreenPosition(pixel) {
        this.gamepad.x = pixel.x;
        this.gamepad.y = pixel.y;
    }
    /**
     *  @returns true if still live, false if input should stop.
     */
    handleInput(inputEvent) {
        if (inputEvent.detail.name == 'mousebutton-left' && inputEvent.detail.status == InputActionStatuses.DRAG) {
            this.ignoreCursorTargetDueToDragging = true;
        }
        return true;
    }
    /**
     * @returns true if still live, false if input should stop.
     */
    handleNavigation(_navigationEvent) {
        return true;
    }
    /** Update the target on standard mouse events to ensure we have the best target */
    onClick(event) {
        if (event.target instanceof Element) {
            this.setTarget(event.target, event.x, event.y);
        }
    }
}
const SOFT_CURSOR_SPRITE_SHEET = {
    imageName: "fs://game/core/ui/cursors/soft-cursor.png",
    cols: 8,
    rows: 8,
    frames: 64,
    startFrame: 0
};
class SoftCursor extends Component {
    constructor() {
        super(...arguments);
        this.defaultCursor = SpriteSheet.from(SOFT_CURSOR_SPRITE_SHEET, 24, 1);
        this.typeCursorMap = new Map([
            [UIHTMLCursorTypes.Default, this.defaultCursor],
            [UIHTMLCursorTypes.Grab, SpriteSheet.from(SOFT_CURSOR_SPRITE_SHEET, 25, 1)],
            [UIHTMLCursorTypes.Grabbing, SpriteSheet.from(SOFT_CURSOR_SPRITE_SHEET, 25, 1)],
            [UIHTMLCursorTypes.Pointer, SpriteSheet.from(SOFT_CURSOR_SPRITE_SHEET, 25, 1)],
            [UIHTMLCursorTypes.Help, SpriteSheet.from(SOFT_CURSOR_SPRITE_SHEET, 29, 1)],
            [UIHTMLCursorTypes.NotAllowed, SpriteSheet.from(SOFT_CURSOR_SPRITE_SHEET, 27, 1)],
        ]);
        this.urlCursorMap = new Map([
            ["fs://game/core/ui/cursors/loading.ani", SpriteSheet.from(SOFT_CURSOR_SPRITE_SHEET, 0, 23)],
            ["fs://game/core/ui/cursors/attack.ani", SpriteSheet.from(SOFT_CURSOR_SPRITE_SHEET, 26, 1)],
            ["fs://game/core/ui/cursors/cantplace.ani", SpriteSheet.from(SOFT_CURSOR_SPRITE_SHEET, 27, 1)],
            ["fs://game/core/ui/cursors/enemy.ani", SpriteSheet.from(SOFT_CURSOR_SPRITE_SHEET, 28, 1)],
            ["fs://game/core/ui/cursors/place.ani", SpriteSheet.from(SOFT_CURSOR_SPRITE_SHEET, 30, 1)],
            ["fs://game/core/ui/cursors/ranged.ani", SpriteSheet.from(SOFT_CURSOR_SPRITE_SHEET, 31, 1)], // Crosshair
        ]);
        this.isCreated = false;
    }
    onAttach() {
        super.onAttach();
        // Create on attach, but don't re-create on re-attach; reuse!
        if (this.isCreated) {
            return;
        }
        this.isCreated = true;
        const cursor = document.createElement('div');
        cursor.classList.add('soft-cursor');
        this.Root.appendChild(cursor);
        const cursorIcon = document.createElement('div');
        cursorIcon.classList.add('soft-cursor-icon');
        cursor.appendChild(cursorIcon);
        this.animation = new SpriteSheetAnimation(cursorIcon, this.defaultCursor, 2500);
        this.animation.start();
        this.onCursorChanged();
        engine.on("CursorChanged", this.onCursorChanged, this);
    }
    onDetach() {
        engine.off("CursorChanged", this.onCursorChanged, this);
    }
    onCursorChanged() {
        let cursorSprite = this.defaultCursor;
        const cursorType = UI.getCursorType();
        if (cursorType == UIHTMLCursorTypes.URL) {
            const cursorUrl = UI.getCursorURL();
            cursorSprite = this.urlCursorMap.get(cursorUrl) ?? this.defaultCursor;
        }
        else {
            cursorSprite = this.typeCursorMap.get(cursorType) ?? this.defaultCursor;
        }
        this.animation?.start(cursorSprite);
    }
}
Controls.define('fxs-soft-cursor', {
    createInstance: SoftCursor,
    description: 'SoftCursor',
    styles: ["fs://game/core/ui/input/cursor.css"],
    attributes: []
});
const Cursor = CursorSingleton.getInstance();
export { Cursor as default };

//# sourceMappingURL=file:///core/ui/input/cursor.js.map
