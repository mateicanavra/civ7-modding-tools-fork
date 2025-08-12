/**
 * @file fxs-switch.ts
 * @copyright 2020-2023, Firaxis Games
 * @description A toggle switch primitive component.
 */
import { ActionActivateEvent } from '/core/ui/components/fxs-activatable.js';
export class FxsSwitch extends ChangeNotificationComponent {
    constructor() {
        super(...arguments);
        this.isChecked = false;
        this.navContainer = document.createElement('div');
        this.onStateElements = document.createElement('div');
        this.offStateElements = document.createElement('div');
        this.ballElement = document.createElement('div');
        this.leftValue = CSS.px(0);
        this.resizeObserver = new ResizeObserver(this.updateBallPosition.bind(this));
        this.onEngineInputListener = this.onEngineInput.bind(this);
    }
    get disabled() {
        return this.Root.getAttribute('disabled') === 'true';
    }
    set disabled(value) {
        this.Root.setAttribute('disabled', value.toString());
    }
    toggle(force = undefined) {
        const wasChecked = this.isChecked;
        // Note: Due to the synchronous nature of synthetic events, we update the value immediately before sending the event. This reduces the number of redundant events sent.
        // Example: Lens Layers Two-way Binding
        //     User clicks checkbox, signaling to enable a lens layer.
        //     The event handler reads the value and enables the lens layer.
        //     The lens layer being enabled sends a lens layer event, which is handled by the minimap options.
        //     The minimap options sees that the checkbox is unchecked, and tries to check it, causing another event to be sent.
        this.isChecked = force ?? !this.isChecked;
        if (wasChecked === this.isChecked) {
            return;
        }
        // Signal change to any outside listener. Forced will be set to true if the force param is either true or false (case when we go through the attribute change)
        const changeEvent = new ComponentValueChangeEvent({ value: this.isChecked, forced: force != undefined });
        const cancelled = !this.sendValueChange(changeEvent);
        if (cancelled) {
            this.isChecked = wasChecked;
            return;
        }
        this.updateSwitchElements();
        this.updateBallPosition();
    }
    onEngineInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        if (inputEvent.detail.name == 'mousebutton-left' || inputEvent.detail.name == 'accept' || inputEvent.detail.name == 'touch-tap') {
            this.playSound('data-audio-activate', 'data-audio-activate-ref');
            this.toggle();
            window.dispatchEvent(new ActivatedComponentChangeEvent(null));
            this.Root.dispatchEvent(new ActionActivateEvent(inputEvent.detail.x, inputEvent.detail.y));
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
    }
    addOrRemoveNavHelpElement(parent, value) {
        if (value) {
            this.navHelp ?? (this.navHelp = document.createElement('fxs-nav-help'));
            if (!this.navHelp.parentElement) {
                parent.appendChild(this.navHelp);
            }
            this.navHelp.setAttribute("action-key", value);
        }
        else if (this.navHelp) {
            this.Root.removeChild(this.navHelp);
        }
    }
    onInitialize() {
        super.onInitialize();
        this.render();
    }
    onAttach() {
        super.onAttach();
        this.resizeObserver.observe(this.Root);
        this.Root.addEventListener('engine-input', this.onEngineInputListener);
    }
    onDetach() {
        this.Root.removeEventListener('engine-input', this.onEngineInputListener);
        this.resizeObserver.disconnect();
        super.onDetach();
    }
    onAttributeChanged(name, _oldValue, newValue) {
        switch (name) {
            case 'disabled':
                super.onAttributeChanged(name, _oldValue, newValue);
                break;
            case 'selected':
                this.toggle(newValue === 'true');
                break;
            case 'action-key': {
                this.addOrRemoveNavHelpElement(this.navContainer, newValue);
                break;
            }
        }
    }
    updateSwitchElements() {
        this.Root.classList.toggle('img-switch-frame-off', !this.isChecked);
        this.Root.classList.toggle('img-switch-frame-on', this.isChecked);
        const disabled = this.disabled;
        this.Root.classList.toggle('group', !disabled);
        this.ballElement.classList.toggle('opacity-40', disabled);
        this.Root.classList.toggle('cursor-pointer', !disabled);
    }
    updateBallPosition() {
        const ballWidth = this.ballElement.offsetWidth;
        const switchWidth = this.Root.offsetWidth;
        this.leftValue.value = this.isChecked ? switchWidth - ballWidth * 2 : 0;
        this.ballElement.attributeStyleMap.set('left', this.leftValue);
    }
    render() {
        this.Root.classList.add('group', 'relative', 'flex', 'items-center', 'h-8', 'w-20', 'px-2', 'py-1');
        // This structure is used to avoid swapping the background images of the frame elements while opacity transitions are occuring
        //   If the background images change during transition, the transition is interrupted and the new image is shown at full opacity
        //   this results in flickering
        this.onStateElements.classList.value = 'absolute inset-0 transition-opacity';
        this.onStateElements.innerHTML = `
			<div class="absolute inset-0 opacity-0 group-hover\\:opacity-100 group-focus\\:opacity-100 img-switch-frame-on-focus transition-opacity"></div>
			<div class="absolute inset-0 opacity-0 group-active\\:opacity-100 img-switch-frame-on-active transition-opacity"></div>
		`;
        this.offStateElements.classList.value = 'absolute inset-0 transition-opacity';
        this.offStateElements.innerHTML = `
			<div class="absolute inset-0 opacity-0 group-hover\\:opacity-100 group-focus\\:opacity-100 img-switch-frame-off-focus transition-opacity"></div>
			<div class="absolute inset-0 opacity-0 group-active\\:opacity-100 img-switch-frame-off-active transition-opacity"></div>
		`;
        this.Root.appendChild(this.onStateElements);
        this.Root.appendChild(this.offStateElements);
        this.ballElement.classList.value = 'relative size-4 img-radio-button-ball transition-all';
        this.Root.appendChild(this.ballElement);
        this.updateSwitchElements();
    }
}
Controls.define('fxs-switch', {
    createInstance: FxsSwitch,
    description: 'A switch primitive',
    attributes: [
        {
            name: "disabled"
        },
        {
            name: "selected",
            description: "Whether or not the switch is 'checked'."
        },
        {
            name: "action-key",
            description: "The action key for inline nav help."
        },
    ],
    tabIndex: -1
});

//# sourceMappingURL=file:///core/ui/components/fxs-switch.js.map
