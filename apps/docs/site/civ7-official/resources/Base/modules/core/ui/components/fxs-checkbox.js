/**
 * @file fxs-checkbox.ts
 * @copyright 2020-2023, Firaxis Games
 * @description A checkbox primitive.
 */
import { ActionActivateEvent } from '/core/ui/components/fxs-activatable.js';
export class FxsCheckbox extends ChangeNotificationComponent {
    constructor() {
        super(...arguments);
        this.navContainer = document.createElement('div');
        this.idleElement = document.createElement('div');
        this.highlightElement = document.createElement('div');
        this.pressedElement = document.createElement('div');
        this.engineInputListener = this.onEngineInput.bind(this);
        this._isChecked = false;
    }
    /** Get the current value of the checkbox */
    get value() {
        return this.isChecked;
    }
    get disabled() {
        return this.Root.getAttribute('disabled') === 'true';
    }
    set disabled(value) {
        this.Root.setAttribute('disabled', value.toString());
    }
    get isChecked() { return this._isChecked; }
    ;
    set isChecked(value) {
        this._isChecked = value;
        const correctSelectedAttribute = value ? 'true' : 'false';
        if (this.Root.getAttribute('selected') !== correctSelectedAttribute) {
            this.Root.setAttribute('selected', correctSelectedAttribute);
        }
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
        if (force == undefined) {
            const id = this.isChecked ? 'data-audio-checkbox-enable' : 'data-audio-checkbox-disable';
            this.playSound(id);
        }
        const changeEvent = new ComponentValueChangeEvent({ value: this.isChecked, forced: force != undefined });
        const cancelled = !this.sendValueChange(changeEvent);
        if (cancelled) {
            this.isChecked = wasChecked;
            return;
        }
        this.updateCheckboxElements();
    }
    onInitialize() {
        super.onInitialize();
        this.render();
    }
    onAttach() {
        super.onAttach();
        this.Root.addEventListener('mouseenter', this.playSound.bind(this, 'data-audio-focus', 'data-audio-focus-ref'));
        this.Root.addEventListener('engine-input', this.engineInputListener);
    }
    onDetach() {
        this.Root.removeEventListener('engine-input', this.engineInputListener);
        super.onDetach();
    }
    onEngineInput(inputEvent) {
        if (this.disabled) {
            if (inputEvent.detail.status == InputActionStatuses.START) {
                if (inputEvent.detail.name == 'mousebutton-left' || inputEvent.detail.name == 'accept' || inputEvent.detail.name == 'touch-tap') {
                    this.playSound("data-audio-error-press");
                }
            }
            return;
        }
        if (inputEvent.detail.status == InputActionStatuses.START) {
            if (inputEvent.detail.name == 'mousebutton-left' || inputEvent.detail.name == 'accept' || inputEvent.detail.name == 'touch-tap') {
                this.playSound("data-audio-checkbox-press");
            }
        }
        else if (inputEvent.detail.status == InputActionStatuses.FINISH) {
            //here do a input start thing
            if (inputEvent.detail.name == 'mousebutton-left' || inputEvent.detail.name == 'accept' || inputEvent.detail.name == 'touch-tap') {
                this.toggle();
                window.dispatchEvent(new ActivatedComponentChangeEvent(null));
                this.Root.dispatchEvent(new ActionActivateEvent(inputEvent.detail.x, inputEvent.detail.y));
                inputEvent.stopPropagation();
                inputEvent.preventDefault();
            }
        }
    }
    onAttributeChanged(name, _oldValue, newValue) {
        switch (name) {
            case "disabled":
                this.updateCheckboxElements();
                break;
            case "selected":
                this.toggle(newValue === "true");
                break;
            case 'action-key': {
                this.addOrRemoveNavHelpElement(this.navContainer, newValue);
                break;
            }
        }
    }
    updateCheckboxElements() {
        this.idleElement.classList.toggle('img-checkbox-on', this.isChecked);
        this.idleElement.classList.toggle('img-checkbox-off', !this.isChecked);
        this.highlightElement.classList.toggle('img-checkbox-on-highlight', this.isChecked);
        this.highlightElement.classList.toggle('img-checkbox-off-highlight', !this.isChecked);
        this.pressedElement.classList.toggle('img-checkbox-on-pressed', this.isChecked);
        this.pressedElement.classList.toggle('img-checkbox-off-pressed', !this.isChecked);
        const disabled = this.disabled;
        this.Root.classList.toggle('cursor-not-allowed', disabled);
        this.Root.classList.toggle('cursor-pointer', !disabled);
        this.highlightElement.classList.toggle('hidden', disabled);
        this.pressedElement.classList.toggle('hidden', disabled);
    }
    render() {
        const isMobileViewExperience = UI.getViewExperience() == UIViewExperience.Mobile;
        this.Root.classList.add('group', 'relative', 'cursor-pointer', 'pointer-events-auto');
        this.Root.classList.toggle("size-8", !isMobileViewExperience);
        this.Root.classList.toggle("size-10", isMobileViewExperience);
        this.idleElement.className = 'size-full';
        this.highlightElement.className = 'absolute inset-0 opacity-0 group-hover\\:opacity-100 group-focus\\:opacity-100 transition-opacity';
        this.pressedElement.className = 'absolute inset-0 opacity-0 group-active\\:opacity-100 transition-opacity';
        this.Root.appendChild(this.idleElement);
        this.Root.appendChild(this.highlightElement);
        this.Root.appendChild(this.pressedElement);
        this.updateCheckboxElements();
        this.navContainer.className = 'absolute -left-7 flex flex-col h-full self-center items-center justify-center';
        this.Root.appendChild(this.navContainer);
        this.addOrRemoveNavHelpElement(this.navContainer, this.Root.getAttribute('action-key'));
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
}
Controls.define('fxs-checkbox', {
    createInstance: FxsCheckbox,
    description: 'A checkbox primitive',
    classNames: ['fxs-checkbox'],
    attributes: [
        {
            name: 'disabled'
        },
        {
            name: "selected",
            description: "Whether or not the checkbox is 'checked'."
        },
        {
            name: "action-key",
            description: "The action key for inline nav help."
        },
    ],
    images: [
        "fs://game/base_checkbox-on.png",
        "fs://game/base_checkbox-off.png"
    ],
    tabIndex: -1
});

//# sourceMappingURL=file:///core/ui/components/fxs-checkbox.js.map
