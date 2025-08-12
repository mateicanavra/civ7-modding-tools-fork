/**
 * @file action-handler.ts
 * @copyright 2020-2023, Firaxis Games
 * @description Input point for inputs gestures raised as 'actions'; includes all gamepad input.
 */

import { Framework } from '/core/ui/framework.js';
import Cursor from '/core/ui/input/cursor.js';
import DebugInput from '/core/ui/input/debug-input-handler.js';
import { AnalogInput, InputEngineEvent, InputEngineEventName, NavigateInputEvent, NavigateInputEventName } from '/core/ui/input/input-support.js';

/**
 * ActiveDeviceTypeChangedEvent is triggered when the active input device type changes.
 */
export type ActiveDeviceTypeChangedEventDetail = { deviceType: InputDeviceType, gamepadActive: boolean };
export const ActiveDeviceTypeChangedEventName = 'active-device-type-changed' as const;
export class ActiveDeviceTypeChangedEvent extends CustomEvent<ActiveDeviceTypeChangedEventDetail> {
	constructor(deviceType: InputDeviceType, gamepadActive: boolean) {
		super(ActiveDeviceTypeChangedEventName, { bubbles: false, detail: { deviceType, gamepadActive } });
	}
}

export type MoveSoftCursorEventDetail = { status: InputActionStatuses, x: number, y: number };
/**
 * MoveSoftCursorEvent is triggered when the soft cursor is moved
 */
export class MoveSoftCursorEvent extends CustomEvent<MoveSoftCursorEventDetail> {
	constructor(status: InputActionStatuses, x: number, y: number) {
		super('move-soft-cursor', { detail: { status, x, y } });
	}
}

class ActionHandlerSingleton {

	private static Instance: ActionHandlerSingleton; // Singleton
	private _deviceType: InputDeviceType = InputDeviceType.Mouse;
	private _deviceLayout: InputDeviceLayout = InputDeviceLayout.Unknown;

	// Keep track of the last move direction from nav-move so we can send a FINISH event
	private lastMoveNavDirection: InputNavigationAction = InputNavigationAction.NONE;

	private constructor() {
		engine.on('InputAction', (actionName: string, status: InputActionStatuses, x: number, y: number) => { this.onEngineInput(actionName, status, x, y); });

		this.deviceType = Input.getActiveDeviceType();
		engine.on('input-source-changed', (deviceType: InputDeviceType, deviceLayout: InputDeviceLayout) => { this.onDeviceTypeChanged(deviceType, deviceLayout); });
	}

	/**
	 * Singleton accessor 
	 */
	static getInstance() {

		if (!ActionHandlerSingleton.Instance) {
			ActionHandlerSingleton.Instance = new ActionHandlerSingleton();
		}
		return ActionHandlerSingleton.Instance;
	}

	/**
	 * Try to handle the input in soft cursor mode
	 * @param name The action name
	 * @param status The status of the input
	 * @param x x coordinate
	 * @param y y coordinate
	 * @returns true if the input was handled false otherwise
	 */
	private handleSoftCursorInput(name: string, status: InputActionStatuses, x: number, y: number): boolean {
		switch (name) {
			case 'nav-move':
				window.dispatchEvent(new MoveSoftCursorEvent(status, x, y));
				return true;
			case 'plot-move':
				window.dispatchEvent(new MoveSoftCursorEvent(status, x, y));
				return true;
			case 'accept':
				if (status == InputActionStatuses.START) {
					Input.virtualMouseLeft(true, Cursor.position.x, Cursor.position.y);
				} else if (status == InputActionStatuses.FINISH) {
					Input.virtualMouseLeft(false, Cursor.position.x, Cursor.position.y);
				}
				return true;
			case 'shell-action-1':
				if (status == InputActionStatuses.START) {
					Input.virtualMouseRight(true, Cursor.position.x, Cursor.position.y);
				} else if (status == InputActionStatuses.FINISH) {
					Input.virtualMouseRight(false, Cursor.position.x, Cursor.position.y);
				}
				return true;
		}

		return false;
	}

	/**
	 * Handle the input for tuner action
	 * @param name The action name
	 * @param status The status of the input
	 * @returns true if the tuner did not use the input (same as the cancel status)
	 */
	private handleTunerAction(name: string, status: InputActionStatuses): boolean {
		if (status == InputActionStatuses.FINISH) {
			if (name == 'accept' || name == 'mousebutton-left') {
				return DebugInput.sendTunerActionA();
			} else if (name == 'cancel' || name == 'mousebutton-right') {
				return DebugInput.sendTunerActionB();
			}
		}
		return true;
	}

	/**
	 * Handle an input event that has come from the game engine.
	 * Separates event into general input "action" event or a navigation based event.
	 * Order of handling starts at specific element and cascades to broader scopes until false returned.
	 * 	1. Send to ContextManager (which first try the focused item)
	 * 	2. Send to global (window)
	 * 
	 * @param name The "action" name of the event as defined by the engine's Input library (typically in the XML.)
	 * @param status Status of the input type.
	 * @param x coordinate if relevant.
	 * @param y coordinate if relevant
	 */
	private onEngineInput(name: string, status: InputActionStatuses, x: number, y: number) {
		if (Cursor.softCursorEnabled && this.handleSoftCursorInput(name, status, x, y)) {
			// Soft cursor handled the input so leave
			return;
		}

		// if the tuner handled the input, don't continue
		if (!this.handleTunerAction(name, status)) {
			return;
		}

		// Creates the approriate event type based on the engine input.
		// Navigation events may ping-pong around the system a bit more based on slot navigation rules.

		const isNavigation: boolean = (name.substr(0, 4) == "nav-");
		const isTouch: boolean = (name.substr(0, 6) == "touch-");
		const isMouse: boolean = (name.substr(0, 12) == "mousebutton-" || (name.substr(0, 11) == "mousewheel-"));
		if (isNavigation) {

			let navigationDirection: InputNavigationAction | null = null;
			const hypheonLocation: number = name.indexOf("nav-");
			const directionName: string = name.substr(hypheonLocation + 4, name.length - 1).toLowerCase();
			switch (directionName) {
				case "up":
					navigationDirection = InputNavigationAction.UP;
					break;
				case "down":
					navigationDirection = InputNavigationAction.DOWN;
					break;
				case "left":
					navigationDirection = InputNavigationAction.LEFT;
					break;
				case "right":
					navigationDirection = InputNavigationAction.RIGHT;
					break;
				case "next": navigationDirection = InputNavigationAction.NEXT; break;
				case "previous": navigationDirection = InputNavigationAction.PREVIOUS; break;
				case "shell-next": navigationDirection = InputNavigationAction.SHELL_NEXT; break;
				case "shell-previous": navigationDirection = InputNavigationAction.SHELL_PREVIOUS; break;
				case "move":
					// Convert analog to cardinal direction.
					const length: number = Math.hypot(x, y);
					if (length > AnalogInput.deadzoneThreshold) {
						const angle: number = Math.atan2(y, x) + Math.PI;
						const fourthPI: number = Math.PI / 4;
						if (angle >= fourthPI && angle < (fourthPI * 3)) {
							navigationDirection = InputNavigationAction.DOWN;
						} else if (angle >= (fourthPI * 3) && angle < (fourthPI * 5)) {
							navigationDirection = InputNavigationAction.RIGHT;
						} else if (angle >= (fourthPI * 5) && angle < (fourthPI * 7)) {
							navigationDirection = InputNavigationAction.UP;
						} else {
							navigationDirection = InputNavigationAction.LEFT;
						}
					}

					// Since the FINISH event for nav-move might not have a length use the last direction we captured here 
					if (status == InputActionStatuses.FINISH && this.lastMoveNavDirection != InputNavigationAction.NONE && navigationDirection == null) {
						navigationDirection = this.lastMoveNavDirection;
					} else if (navigationDirection) {
						this.lastMoveNavDirection = navigationDirection;
					}
					break;
			}

			// If input is switching device, change name to something that should not be handled (and none out the nav-direction.) Ignore if we are in soft cursor mode as it will change isGamepadActive when moving the cursor
			const inputName: string = (this.isGamepadActive || Cursor.softCursorEnabled) ? name : "refocus";
			navigationDirection = (this.isGamepadActive && navigationDirection != null) ? navigationDirection : InputNavigationAction.NONE;

			const navigationEvent: NavigateInputEvent = new NavigateInputEvent(NavigateInputEventName, { bubbles: true, cancelable: true, detail: { name: inputName, status: status, x: x, y: y, navigation: navigationDirection } });

			if (navigationDirection != null) {	// May be moving but not past deadzone.
				try {
					Framework.ContextManager.handleNavigation(navigationEvent);
				} catch (err) { };
			}
		} else {
			const inputEvent: InputEngineEvent = new InputEngineEvent(name, status, x, y, isTouch, isMouse);

			try {
				let live: boolean = Framework.ContextManager.handleInput(inputEvent);
				if (live) {
					window.dispatchEvent(inputEvent);	// One last crack at event; should anything be listening to this?
				}
			} catch (err) { };
		}
	}

	/**
	 * Checks if an input event is for a navigation-based action.
	 * @param inputEvent An input event.
	 * @returns true if the input event is used for navigating input focus (e.g., switching between menu items)
	 */
	isNavigationInput(inputEvent: InputEngineEvent): boolean {
		if (inputEvent.type != InputEngineEventName) {
			console.warn("Attempt to inspect a non-input event to see if it was a navigation input.");
			return false;
		}
		const name: string = inputEvent.detail.name;
		if (name == undefined || name == "") {
			return false;
		}
		return (name.substr(0, 4) == "nav-");	// Any input starting with "nav-" is considered navigation.
	}

	private onDeviceTypeChanged(deviceType: InputDeviceType, deviceLayout: InputDeviceLayout) {
		this.deviceType = deviceType;
		this.deviceLayout = deviceLayout;
		window.dispatchEvent(new ActiveDeviceTypeChangedEvent(this._deviceType, this.isGamepadActive));
	}

	get isGamepadActive() {
		return this._deviceType == InputDeviceType.Controller;
	}

	get isTouchActive() {
		return this._deviceType == InputDeviceType.Touch;
	}

	get isHybridActive() {
		return this._deviceType == InputDeviceType.Hybrid;
	}

	get deviceLayout() {
		return this._deviceLayout;
	}

	get deviceType() {
		return this._deviceType;
	}

	private isCursorShowing: boolean = false;
	set deviceType(inputDeviceType: InputDeviceType) {
		this._deviceType = inputDeviceType;
		if (this._deviceType != InputDeviceType.Keyboard && this._deviceType != InputDeviceType.Mouse && this._deviceType != InputDeviceType.Hybrid) {
			if (!this.isCursorShowing) {
				console.warn("Attempt to hide cursor when it's already hidden!");
				return;
			}
			this.isCursorShowing = false;
			UI.hideCursor();
		} else {
			if (this.isCursorShowing) {
				console.warn("Attempt to show cursor when it's already shown!");
				return;
			}
			this.isCursorShowing = true;
			UI.showCursor();
		}
	}

	/**
	 * For the special case where it's believed an element has moved to 
	 * or from what is below the cursor and a new check needs to be done
	 * for tooltips (and other reasons)?
	 */
	forceCursorCheck() {
		if (this.isGamepadActive) {
			console.warn("action-handler: Performing cursor check when using gamepad can result in a loss of focus.")
			console.trace();
			return;
		}
		delayByFrame(() => {
			const x = Cursor.position.x;	// capture for reset
			const y = Cursor.position.y;
			window.dispatchEvent(new MouseEvent("mousecheck", <MouseEventInit>{ clientX: 0, clientY: 0, screenX: 0, screenY: 0 }));
			delayByFrame(() => {
				window.dispatchEvent(new MouseEvent("mousecheck", <MouseEventInit>{ clientX: x, clientY: y, screenX: x, screenY: y }));
			}, 10)	// wait a few more frames before re-sampling to make sure animation has settled
		}, 1);
	}


	set deviceLayout(inputDeviceLayout: InputDeviceLayout) {
		this._deviceLayout = inputDeviceLayout;
	}
}

declare global {
	interface WindowEventMap {
		'active-device-type-changed': ActiveDeviceTypeChangedEvent;
		'move-soft-cursor': MoveSoftCursorEvent;
	}
}

const ActionHandler = ActionHandlerSingleton.getInstance();
export { ActionHandler as default };