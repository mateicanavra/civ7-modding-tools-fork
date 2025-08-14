/**
 * @file interface-modes.ts
 * @copyright 2019-2025, Firaxis Games
 * @description States of different "modes" the User Interface may be in while playing the game.
 */

import { InputEngineEvent, NavigateInputEvent } from '/core/ui/input/input-support.js';
import ViewManager from '/core/ui/views/view-manager.js';

const debug_showModeChanges: boolean = false;	// log out the UI mode as well as current view and input for that mode 

export const InterfaceModeChangedEventName = 'interface-mode-changed' as const;
export class InterfaceModeChangedEvent extends CustomEvent<{ prevMode: string, newMode: string }> {
	constructor(prevMode: string, newMode: string) {
		super(InterfaceModeChangedEventName, {
			detail: {
				prevMode,
				newMode
			}
		});
	}
}

export class InterfaceModeReadyEvent extends CustomEvent<never> {
	constructor() {
		super('interface-mode-ready');
	}
}

export namespace InterfaceMode {

	export type ModeId = string;

	export interface Context {
		ActionType: string;
	}

	export interface Handler {
		/** Handle a transition from a different mode to the currently registered mode. */
		transitionTo(oldMode: ModeId, newMode: ModeId, context?: Context): void;

		/** Handle a transition going from the currently registered interface mode to a different mode. */
		transitionFrom(oldMode: ModeId, newMode: ModeId): void;

		/** 
		 * Given the environment, can this mode be entered? 
		 * @param {any} parameters passed into switchTo
		 */
		canEnterMode?(parameters?: any): boolean;

		/** Check if this mode can be safely transitioned from */
		canLeaveMode?(newMode: ModeId): boolean;

		/* check if this interface mode alows hotkeys to be pressed */
		allowsHotKeys?(): boolean;

		/** (optional) Take an input event and potentially do something with it. */
		handleInput?(inputEvent: InputEngineEvent): boolean;

		/** (optional) Take an navigation event and attempt to handle it.
		 * @returns true if still live, false if input should stop.
		 */
		handleNavigation?(navigationEvent: NavigateInputEvent): boolean;
	}


	const UNSET_INTERFACE_MODE = 'INTERFACEMODE_UNSET';
	const DEFAULT_INTERFACE_MODE = 'INTERFACEMODE_DEFAULT';
	const InterfaceModeHandlers = new Map<ModeId, Handler>();
	let isReady: boolean = false;						// Call startup to get state machine a' runnin.
	let initMode: ModeId = DEFAULT_INTERFACE_MODE;		// First mode to initialize with
	let currentInterfaceMode: ModeId = UNSET_INTERFACE_MODE;
	let currentInterfaceParameters: any = undefined;

	export function getInterfaceModeHandler(mode: ModeId): InterfaceMode.Handler | null {
		return InterfaceModeHandlers.get(mode) ?? null;
	}

	export function addHandler(mode: ModeId, handler: InterfaceMode.Handler) {
		const definition = GameInfo.InterfaceModes.lookup(mode);
		if (definition == null) {
			console.warn(`Interface Mode '${mode}' not defined in database.`);
		}
		const oldHandler = InterfaceModeHandlers.get(mode);
		if (oldHandler != null) {
			console.warn("Replacing an existing interface mode handler.");
		}
		InterfaceModeHandlers.set(mode, handler);
	}

	/**
	 * Gets the current interface mode.
	 * 
	 * @returns ModeId of the current interface mode.
	 */
	export function getCurrent(): ModeId {
		return currentInterfaceMode;
	}

	/**
	 * Gets the parameters of the current interface mode.
	 * 
	 * @returns Parameters passed into the current interface mode when it was switched to
	 */
	export function getParameters(): any {
		return currentInterfaceParameters;
	}

	/**
	 * Change to an interface mode.  Any input or associated views are changed as well.
	 * @param mode 
	 * @param {any} parameters optional values that are specifically needed by a mode.
	 * @returns true if successful
	 */
	export function switchTo(mode: ModeId, parameters?: any): boolean {
		let success: boolean = false;

		if (!isReady) {
			// Lazy loading is allowed, should only be done at startup and from something
			// special like a benchmark system.
			if (parameters?.lazyInit == true) {
				initMode = mode;
				return false;
			}

			console.error(`Attempt to switch to an interface mode '${mode}' before startup completed.`);
			return false;
		}

		// Ensure handler is defined in the XML
		const definition: InterfaceModeDefinition | null = GameInfo.InterfaceModes.lookup(mode);
		if (definition == null) {
			console.warn(`Interface Mode '${mode}' not defined in Database.`);
			return false;
		}

		const handler: Handler | null = getInterfaceModeHandler(mode);
		if (handler == null) {
			console.error(`No handler registered for '${mode}'`);
			return false;
		}

		// Ensure we can leave the current mode and enter the next mode before attempting.
		const prevHandler: Handler | null = getInterfaceModeHandler(currentInterfaceMode);
		if (prevHandler && prevHandler.canLeaveMode && !prevHandler.canLeaveMode(mode)) {
			return false;
		}
		if (handler.canEnterMode && !handler.canEnterMode(parameters)) {
			return false;
		}

		const prevMode: string = currentInterfaceMode;
		if (mode != currentInterfaceMode) {
			currentInterfaceMode = mode;
			currentInterfaceParameters = parameters;
			console.log(`UIInterfaceMode: from '${prevMode}' to '${mode}'.`);	// Key info to log.

			prevHandler?.transitionFrom(prevMode, mode);
			handler?.transitionTo(prevMode, mode, parameters);

			// Change the view, if successful setup the input keys and inform the world.
			success = ViewManager.setCurrentByName(definition.ViewName);
			if (success) {
				window.dispatchEvent(new InterfaceModeChangedEvent(prevMode, currentInterfaceMode));

				if (debug_showModeChanges) {
					const GreenANSI: string = "\x1b[32m";
					const BlackOnGreenANSI: string = "\x1b[30m\x1b[42m";
					const ResetANSI: string = "\x1b[0m";
					console.log(GreenANSI + `IM.switchTo('${BlackOnGreenANSI}${mode}${ResetANSI}${GreenANSI}') success!   View: '${BlackOnGreenANSI}${definition.ViewName}${ResetANSI}${GreenANSI}'` + ResetANSI);
				}
			}
			else {
				console.warn(`Failed after chaning mode to '${mode}', failed to change the associated view with name '${definition.ViewName}'.`);
			}
		}


		return success;
	}

	const MaxFrames = 5;
	let delayFrameCount: number = 0;
	/** 
	 * Default mode needs to exist, so if it doesn't assume it was called too early during a loading sequence.
	 */
	export function startup() {
		return new Promise((resolve, reject) => {
			let updateListener: FrameRequestCallback = (_timeStamp: DOMHighResTimeStamp) => {
				delayFrameCount++;
				const handler: Handler | null = getInterfaceModeHandler(DEFAULT_INTERFACE_MODE);
				if (handler != null) {
					isReady = true;
					window.dispatchEvent(new InterfaceModeReadyEvent());
					resolve(switchTo(initMode));
				}
				else {
					console.warn(`Delaying startup of interface mode handler, because default mode isn't yet registered. frame: ${delayFrameCount}`);
					requestAnimationFrame(updateListener);
					if (delayFrameCount > MaxFrames) {
						console.error(`Unable to startup interface modes; more than ${MaxFrames} passed since called and a default mode has yet to be registered.`);
						reject();
					}
				}
			}
			updateListener(0);
		});
	}

	/**
	 * Switch to the default interface mode.
	 */
	export function switchToDefault() {
		switchTo(DEFAULT_INTERFACE_MODE);
	}

	/// Is a particular interface mode the current one?
	export function isInInterfaceMode(targetMode: ModeId) {
		return currentInterfaceMode == targetMode;
	}

	//does this interface mode allow for hotkeys?
	export function allowsHotKeys(): boolean {
		const handler: Handler | null = getInterfaceModeHandler(currentInterfaceMode);
		if (!handler || !handler.allowsHotKeys) {
			return false;
		}
		return handler.allowsHotKeys();
	}

	/// If the current interface mode handles input, let it inspect an engine input event.
	export function handleInput(inputEvent: InputEngineEvent) {
		if (inputEvent.type != 'engine-input') {
			console.warn("Attempt to handle a non engine-input event to the interface mode handlers.");
			return true;
		}
		const handler: Handler | null = getInterfaceModeHandler(currentInterfaceMode);
		if (!handler || !handler.handleInput) {
			return true;
		}
		return handler.handleInput(inputEvent);
	}

	/**
	 * If the current interface mode handles navigation, let it inspect the navigation event.
	 * @returns true if still live, false if input should stop.
	 */
	export function handleNavigation(navigationEvent: NavigateInputEvent): boolean {
		if (navigationEvent.type != 'navigate-input') {
			console.warn("Attempt to handle a non navigate-input event to the interface mode handlers.");
			return true;
		}
		const handler: Handler | null = getInterfaceModeHandler(currentInterfaceMode);
		if (!handler || !handler.handleNavigation) {
			return true;
		}
		return handler.handleNavigation(navigationEvent);
	}

	export function isInDefaultMode(): boolean {
		return currentInterfaceMode == DEFAULT_INTERFACE_MODE;
	}
}

declare global {
	interface WindowEventMap {
		'interface-mode-ready': InterfaceModeReadyEvent;
		'interface-mode-changed': InterfaceModeChangedEvent;
	}
}