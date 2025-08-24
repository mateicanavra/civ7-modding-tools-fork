/**
 * @file input-support.ts
 * @copyright 2021-2023, Firaxis Games
 * @description Defines game engine based input.
 */
export const InputEngineEventName = 'engine-input';
export class InputEngineEvent extends CustomEvent {
    constructor(name, status, x, y, isTouch, isMouse, bubbles = true) {
        super(InputEngineEventName, {
            bubbles: bubbles,
            cancelable: true,
            detail: {
                name, status, x, y, isTouch, isMouse
            }
        });
    }
    static CreateNewEvent(oldEvent, bubbles) {
        return new InputEngineEvent(oldEvent.detail.name, oldEvent.detail.status, oldEvent.detail.x, oldEvent.detail.y, oldEvent.detail.isTouch, oldEvent.detail.isMouse, bubbles ?? oldEvent.bubbles);
    }
    isCancelInput() {
        return (this.detail.name == 'cancel' || this.detail.name == 'keyboard-escape' || this.detail.name == 'mousebutton-right');
    }
}
export const NavigateInputEventName = 'navigate-input';
export class NavigateInputEvent extends CustomEvent {
    getDirection() { return this.detail.navigation; }
}
export var AnalogInput;
(function (AnalogInput) {
    AnalogInput.deadzoneThreshold = 0.2; // How far an analog stick needs to be moved out of the "deadzone" before it's active.	
})(AnalogInput || (AnalogInput = {}));

//# sourceMappingURL=file:///core/ui/input/input-support.js.map
