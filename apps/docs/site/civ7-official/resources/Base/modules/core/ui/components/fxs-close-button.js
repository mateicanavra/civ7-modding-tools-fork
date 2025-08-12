/**
 * @file fxs-close-button.ts
 * @copyright 2021, Firaxis Games
 * @description A UI button control to close a panel/screen/window.
 *
 */
import { ActionActivateEvent } from '/core/ui/components/fxs-activatable.js';
import ActionHandler, { ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';
export class FxsCloseButton extends Component {
    constructor() {
        super(...arguments);
        this.activateCounter = 0;
        this.engineInputListener = this.onEngineInput.bind(this);
        this.activeDeviceTypeListener = this.onActiveDeviceTypeChanged.bind(this);
    }
    onInitialize() {
        super.onInitialize();
        this.render();
    }
    onAttach() {
        super.onAttach();
        this.Root.addEventListener('mouseenter', this.playSound.bind(this, 'data-audio-focus', 'data-audio-focus-ref'));
        this.setVisibility(!ActionHandler.isGamepadActive);
        this.Root.classList.toggle("touch-enabled", UI.isTouchEnabled());
        window.addEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener, true);
        this.Root.addEventListener('engine-input', this.engineInputListener);
    }
    onDetach() {
        this.Root.removeEventListener('engine-input', this.engineInputListener);
        window.removeEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener, true);
        super.onDetach();
    }
    onEngineInput(inputEvent) {
        if (inputEvent.detail.status == InputActionStatuses.START) {
            if (inputEvent.detail.name == 'mousebutton-left' || inputEvent.detail.name == 'accept' || inputEvent.detail.name == 'touch-tap') {
                this.playSound("data-audio-close-press");
            }
        }
        else if (inputEvent.detail.status == InputActionStatuses.FINISH) {
            if (inputEvent.detail.name == 'mousebutton-left' || inputEvent.detail.name == 'accept' || inputEvent.detail.name == 'touch-tap') {
                if (this.activateCounter == 0) {
                    this.playSound("data-audio-close-selected");
                }
                this.activateCounter = 1;
                window.dispatchEvent(new SetActivatedComponentEvent(null));
                this.Root.dispatchEvent(new ActionActivateEvent(inputEvent.detail.x, inputEvent.detail.y));
                inputEvent.stopPropagation();
                inputEvent.preventDefault();
            }
        }
    }
    setVisibility(isVisible) {
        this.Root.classList.toggle("hidden", !isVisible);
    }
    onActiveDeviceTypeChanged(event) {
        this.setVisibility(!event.detail?.gamepadActive);
    }
    render() {
        this.Root.classList.add('size-12', 'cursor-pointer', 'group');
        this.Root.innerHTML = `
			<div class="close-button__bg absolute inset-0"></div>
			<div class="close-button__bg-hover absolute inset-0 opacity-0 group-hover\\:opacity-100 group-focus\\:opacity-100 transition-opacity"></div>
		`;
    }
}
Controls.define('fxs-close-button', {
    createInstance: FxsCloseButton,
    description: 'A close button primitive',
    classNames: ['fxs-close-button'],
    images: [
        'fs://game/hud_closebutton.png'
    ]
});

//# sourceMappingURL=file:///core/ui/components/fxs-close-button.js.map
