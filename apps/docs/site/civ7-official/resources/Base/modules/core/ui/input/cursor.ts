/**
 * @file cursor.ts
 * @copyright 2020-2022, Firaxis Games
 * @description Input marshaling of where the 'cursor' should exist in screen space.
 * Cursor may be moved by a mouse, by a soft-cursor setup from gamepad, by touch, or by focus jumping via gamepad.
 */

import { type ActiveDeviceTypeChangedEvent } from '/core/ui/input/action-handler.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { IEngineInputHandler, InputEngineEvent, NavigateInputEvent } from '/core/ui/input/input-support.js';
import { SpriteSheet, SpriteSheetAnimation } from '/core/ui/utilities/animations.js';
import ViewManager from '/core/ui/views/view-manager.js';

type CursorUpdatedEventDetail = {
	x: number,
	y: number,
	target: EventTarget | null,
	plot: float2 | null
}

/**
 * CursorUpdatedEvent is fired when the cursor's position has changed.
 */
export const CursorUpdatedEventName = 'cursor-updated' as const;
export class CursorUpdatedEvent extends CustomEvent<CursorUpdatedEventDetail> {
	constructor(x: number, y: number, target: EventTarget | null, plot: float2 | null) {
		super(CursorUpdatedEventName, { bubbles: true, cancelable: false, detail: { x, y, target, plot: plot } });
	}
}

class CursorSingleton implements IEngineInputHandler {

	public position: float2 = { x: -1, y: -1 };		// Position of the active cursor

	// True when we want to ignore cursor target input events due to dragging
	public ignoreCursorTargetDueToDragging: boolean = false;

	private static Instance: CursorSingleton;

	// TODO - A bug exists where the translate is not correctly interpreted as an XY translate unless two non-zero values are used.
	private cursorTranslate = new CSSTranslate(CSS.px(-1), CSS.px(-1));
	private cursorTransform = new CSSTransformValue([this.cursorTranslate]);

	private mouse: float2 = { x: -1, y: -1 };		// Last mouse x,y (or touch equivalent)
	public gamepad: float2 = { x: -1, y: -1 };		// Last gamepad x,y
	private isMouse: boolean = true;				// Is mouse x,y the active one?
	private _target: Element = document.body;				// What is under the cursor
	private lastPosition: float2 = { x: -1, y: -1 };

	private softCursorRoot: HTMLDivElement;
	private softCursor: HTMLElement;
	private softCursorVelocity: float2 = { x: 0, y: 0 };
	private softCursorSpeed: number = 550;
	private _softCursorEnabled: boolean = false;
	private _hybridCursorEnabled: boolean = false;

	// Pixel length of the mouse position change needed to trigger setTarget()
	private mouseMoveDeadzone: number = 3;

	private onClickListener: EventListener = this.onClick.bind(this);
	private mouseMoveEventListener: EventListener = this.onMouseMove.bind(this);
	private mouseCheckEventListener: EventListener = this.onMouseCheck.bind(this);
	private activeDeviceTypeChangedEventListener: EventListener = this.onActiveDeviceTypeChanged.bind(this);
	private moveSoftCursorEventListener: EventListener = this.onMoveSoftCursor.bind(this);

	private constructor() {
		this.softCursorRoot = document.createElement('div');
		this.softCursor = document.createElement('fxs-soft-cursor');

		Loading.runWhenLoaded(() => { this.onInitialize(); })
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
	get isOnUI(): boolean {
		return this.isMouse
			&& !(this._target === document.body
				|| this._target.hasAttribute('data-pointer-passthrough'));
	}

	/**
	 * @returns the current target of the cursor
	 */
	get target(): Element {
		return this._target;
	}

	/**
	 * Set the cursor target
	 */
	set target(newTarget: Element) {
		if (this._target != newTarget) {
			this._target = newTarget;
			const shouldBlockZoom = !this.shouldAllowCameraControls() || !ViewManager.isWorldInputAllowed;
			Camera.setPreventMouseCameraMovement(shouldBlockZoom);
		}
	}

	/**
	 * Allow mouse based camera controls if the document body is the target or if it explicitly allows camera movement
	 */
	private shouldAllowCameraControls(): boolean {
		if (this.target instanceof HTMLElement) {
			if (this.target === document.body) {
				// If our target is just the body we shouldn't be over any UI so allow camera controls
				return true;
			} else if (this.target.closest('.allowCameraMovement') != null) {
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
	set softCursorEnabled(enabled: boolean) {
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

		} else {
			this._softCursorEnabled = false;
			this.softCursorRoot.style.opacity = "0";
		}
	}

	/**
	 * @returns true if the software cursor is enabled
	 */
	get softCursorEnabled(): boolean {
		return this._softCursorEnabled;
	}

	set hybridCursorEnabled(enabled: boolean) {
		if (enabled) {
			this.softCursorEnabled = false;
			this._hybridCursorEnabled = true;

			this.softCursorRoot.style.opacity = "1";
		} else {
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
		window.addEventListener('mousecheck', this.mouseCheckEventListener, true);	// FXS custom
		window.addEventListener('active-device-type-changed', this.activeDeviceTypeChangedEventListener);
		window.addEventListener('move-soft-cursor', this.moveSoftCursorEventListener);

		engine.on('ToggleMouseEmulate', this.onToggleMouseEmulate, this);
		engine.on('UpdateFrame', this.onUpdate, this);
	}

	onUpdate(timeDelta: DOMHighResTimeStamp) {
		this.lastPosition.x = this.position.x;
		this.lastPosition.y = this.position.y;

		if (Cursor.softCursorEnabled) {
			if (this.softCursorVelocity.x != 0 || this.softCursorVelocity.y != 0) {
				// time delta divided by 1000 because it's in milliseconds
				const rate = this.softCursorSpeed * timeDelta;
				const newX: number = this.mouse.x + (this.softCursorVelocity.x * rate);
				const newY: number = this.mouse.y - (this.softCursorVelocity.y * rate);

				this.cursorTranslate.x = CSS.px(newX);
				this.cursorTranslate.y = CSS.px(newY);
				this.softCursor.attributeStyleMap.set('transform', this.cursorTransform);

				Input.virtualMouseMove(newX, newY);
			}
		}

		if (this.isMouse) {
			this.position.x = this.mouse.x;
			this.position.y = this.mouse.y;
		} else {
			// Gamepad, base position on focus manager
			if (!FocusManager.isWorldFocused()) {
				const targetElement: HTMLElement = FocusManager.getFocus();
				const domRect: DOMRect = targetElement.getBoundingClientRect()
				let y: number = domRect.y + (domRect.height * 0.75);
				if ((y + 50) > window.innerHeight) {	// Flip if nearing bottom edge (TODO: Better value, 50 is a arbitrary)
					y = domRect.y - 25;
				}
				this.position.x = domRect.x + (domRect.width * 0.75);
				this.position.y = y;
			} else {
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
	private shouldSetTarget(x: number, y: number): boolean {
		if (this.isMouse) {		// If mouse, no deadzone..
			return true;
		} // ...but in gamepad we want to check for accidental bumps.
		if (Configuration.getXR()) {
			return true;
		}
		const dx: number = x - this.mouse.x;
		const dy: number = y - this.mouse.y;
		const deadzoneSquared = (this.mouseMoveDeadzone * this.mouseMoveDeadzone);
		const distance: number = dx * dx + dy * dy;
		return distance > deadzoneSquared
	}

	/**
	 * Track mouse position and inform focus manager of update.
	 * @param event DOM mouse event.
	 */
	private onMouseMove(event: MouseEvent) {
		if (this.shouldSetTarget(event.clientX, event.clientY)
			&& event.target instanceof Element) {
			this.setTarget(event.target, event.clientX, event.clientY);
		} else {
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
	private onMouseCheck(event: MouseEvent) {
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
	private setTarget(target: Element, x: number, y: number) {

		this.mouse.x = x;
		this.mouse.y = y;

		let pointerEventPassthrough = false;
		if (target) {
			if (target instanceof HTMLHtmlElement) {
				// HTMLHtmlElement would be the <html> so we want to make sure to set target to <body>
				this.target = document.body;
			} else {
				this.target = target;
				pointerEventPassthrough = this.target.hasAttribute('data-pointer-passthrough');
			}
			this.isMouse = true;
		}

		if (this.lastPosition.x != x || this.lastPosition.y != y) {
			// Inform passive elements the cursor's XY has changed.
			const plot: float2 | null = (UI.isInGame() && (!this.isOnUI || pointerEventPassthrough)) ? Camera.pickPlotFromPoint(x, y) : null;
			window.dispatchEvent(new CursorUpdatedEvent(x, y, target, plot));
		}
	}

	private onMoveSoftCursor(event: CustomEvent) {
		if (event.detail.status != null && event.detail.x != null && event.detail.y != null) {
			if (event.detail.status == InputActionStatuses.START || event.detail.status == InputActionStatuses.UPDATE) {
				this.softCursorVelocity.x = event.detail.x;
				this.softCursorVelocity.y = event.detail.y;
			} else {
				this.softCursorVelocity.x = 0;
				this.softCursorVelocity.y = 0;
			}
		} else {
			console.error("onMoveSoftCursor failed to contain necessary detail data");
		}
	}

	private onToggleMouseEmulate() {
		this.softCursorEnabled = !this.softCursorEnabled;
	}

	private onActiveDeviceTypeChanged(event: ActiveDeviceTypeChangedEvent): void {
		this.isMouse = [InputDeviceType.Hybrid, InputDeviceType.Mouse, InputDeviceType.Keyboard].includes(event.detail.deviceType);
	}

	/** Set the game pad's virtual position. */
	setGamePadScreenPosition(pixel: float2) {
		this.gamepad.x = pixel.x;
		this.gamepad.y = pixel.y;
	}

	/**
	 *  @returns true if still live, false if input should stop.
	 */
	handleInput(inputEvent: InputEngineEvent): boolean {
		if (inputEvent.detail.name == 'mousebutton-left' && inputEvent.detail.status == InputActionStatuses.DRAG) {
			this.ignoreCursorTargetDueToDragging = true;
		}
		return true;
	}

	/**
	 * @returns true if still live, false if input should stop.
	 */
	handleNavigation(_navigationEvent: NavigateInputEvent): boolean {
		return true;
	}

	/** Update the target on standard mouse events to ensure we have the best target */
	private onClick(event: MouseEvent) {
		if (event.target instanceof Element) {
			this.setTarget(event.target, event.x, event.y);
		}
	}
}

const SOFT_CURSOR_SPRITE_SHEET: SpriteSheet = {
	imageName: "fs://game/core/ui/cursors/soft-cursor.png",
	cols: 8,
	rows: 8,
	frames: 64,
	startFrame: 0
}

class SoftCursor extends Component {
	private defaultCursor: SpriteSheet = SpriteSheet.from(SOFT_CURSOR_SPRITE_SHEET, 24, 1);
	private animation?: SpriteSheetAnimation;

	private typeCursorMap = new Map<UIHTMLCursorTypes, SpriteSheet>([
		[UIHTMLCursorTypes.Default, this.defaultCursor],
		[UIHTMLCursorTypes.Grab, SpriteSheet.from(SOFT_CURSOR_SPRITE_SHEET, 25, 1)],
		[UIHTMLCursorTypes.Grabbing, SpriteSheet.from(SOFT_CURSOR_SPRITE_SHEET, 25, 1)],
		[UIHTMLCursorTypes.Pointer, SpriteSheet.from(SOFT_CURSOR_SPRITE_SHEET, 25, 1)],
		[UIHTMLCursorTypes.Help, SpriteSheet.from(SOFT_CURSOR_SPRITE_SHEET, 29, 1)],
		[UIHTMLCursorTypes.NotAllowed, SpriteSheet.from(SOFT_CURSOR_SPRITE_SHEET, 27, 1)],
	]);

	private urlCursorMap = new Map<string, SpriteSheet>([
		["fs://game/core/ui/cursors/loading.ani", SpriteSheet.from(SOFT_CURSOR_SPRITE_SHEET, 0, 23)],
		["fs://game/core/ui/cursors/attack.ani", SpriteSheet.from(SOFT_CURSOR_SPRITE_SHEET, 26, 1)], // Attack
		["fs://game/core/ui/cursors/cantplace.ani", SpriteSheet.from(SOFT_CURSOR_SPRITE_SHEET, 27, 1)],
		["fs://game/core/ui/cursors/enemy.ani", SpriteSheet.from(SOFT_CURSOR_SPRITE_SHEET, 28, 1)],
		["fs://game/core/ui/cursors/place.ani", SpriteSheet.from(SOFT_CURSOR_SPRITE_SHEET, 30, 1)],
		["fs://game/core/ui/cursors/ranged.ani", SpriteSheet.from(SOFT_CURSOR_SPRITE_SHEET, 31, 1)], // Crosshair
	]);

	private isCreated: boolean = false;

	override onAttach(): void {
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

	override onDetach(): void {
		engine.off("CursorChanged", this.onCursorChanged, this);
	}

	private onCursorChanged() {
		let cursorSprite = this.defaultCursor;
		const cursorType = UI.getCursorType();

		if (cursorType == UIHTMLCursorTypes.URL) {
			const cursorUrl = UI.getCursorURL();
			cursorSprite = this.urlCursorMap.get(cursorUrl) ?? this.defaultCursor;
		} else {
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
})

declare global {
	interface WindowEventMap {
		'cursor-updated': CursorUpdatedEvent;
	}
}

const Cursor = CursorSingleton.getInstance();
export { Cursor as default };
