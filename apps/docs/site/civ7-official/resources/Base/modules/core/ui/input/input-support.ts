/**
 * @file input-support.ts
 * @copyright 2021-2023, Firaxis Games
 * @description Defines game engine based input.
 */


type InputEventDetails = { readonly name: string, readonly status: InputActionStatuses, readonly x: number, readonly y: number, readonly isTouch: boolean, readonly isMouse: boolean };
export const InputEngineEventName = 'engine-input' as const;
export class InputEngineEvent extends CustomEvent<InputEventDetails> {
	constructor(name: string,
		status: InputActionStatuses,
		x: number,
		y: number,
		isTouch: boolean,
		isMouse: boolean,
		bubbles = true) {
		super(InputEngineEventName, {
			bubbles: bubbles,
			cancelable: true,
			detail: {
				name, status, x, y, isTouch, isMouse
			}
		});
	}

	static CreateNewEvent(oldEvent: InputEngineEvent, bubbles?: boolean): InputEngineEvent {
		return new InputEngineEvent(oldEvent.detail.name, oldEvent.detail.status,
			oldEvent.detail.x, oldEvent.detail.y, oldEvent.detail.isTouch, oldEvent.detail.isMouse, bubbles ?? oldEvent.bubbles);
	}

	isCancelInput(): boolean {
		return (this.detail.name == 'cancel' || this.detail.name == 'keyboard-escape' || this.detail.name == 'mousebutton-right');
	}
}

type NavigateInputEventDetails = { readonly name: string, readonly status: InputActionStatuses, readonly x: number, readonly y: number, navigation: InputNavigationAction };
export const NavigateInputEventName = 'navigate-input' as const;
export class NavigateInputEvent extends CustomEvent<NavigateInputEventDetails> {
	getDirection(): InputNavigationAction { return (this.detail as NavigateInputEventDetails).navigation; }
}


export namespace AnalogInput {
	export let deadzoneThreshold: number = 0.2;	// How far an analog stick needs to be moved out of the "deadzone" before it's active.	
}

/**
 * Handler interface for input that's raised from the engine.
 */
export interface IEngineInputHandler {
	/**
	 * Handling an input from the engine.
	 * @param {InputEngineEvent} inputEvent of type 'engine-input' with details on the event name, status, (x), (y)
	 */
	handleInput(inputEvent: InputEngineEvent): boolean;

	/**
	 * Handle a focus navigation event.
	 * @param {NavigateInputEvent} navigationEvent of type 'navigate-input' with both engine input and navigation information
	 * @returns true if still live, false if input should stop.
	 */
	handleNavigation(navigationEvent: NavigateInputEvent): boolean;
}

declare global {
	interface WindowEventMap {
		'engine-input': InputEngineEvent;
		'navigate-input': NavigateInputEvent;
	}

	interface HTMLElementEventMap {
		'engine-input': InputEngineEvent;
		'navigate-input': NavigateInputEvent;
	}
}