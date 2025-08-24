/**
 * @file fxs-radio-button.ts
 * @copyright 2020-2023, Firaxis Games
 * @description A radio button primitive.
 *
 */
import { ActionActivateEvent } from '/core/ui/components/fxs-activatable.js';
/**
 * RadioButtonGroupChangeEvent is fired when the value of a radio button group changes.
 *
 * The event is dispatched to the window.
 *
 * The event `value` is the value of the radio button that was selected.
 */
export class RadioButtonGroupChangeEvent extends CustomEvent {
    constructor(detail) {
        super('radio-button-change', {
            bubbles: false,
            cancelable: false,
            detail
        });
    }
}
/**
 * A custom radio button component that can be used in a radio button group.
 *
 * @example
 * ```
 * <fxs-radio-button group-tag="user-graphics" value="high" checked="true" caption="LOC_UI_OPTIONS_GRAPHICS_HIGH"></fxs-radio-button>
 * <fxs-radio-button group-tag="user-graphics" value="medium" caption="LOC_UI_OPTIONS_GRAPHICS_MEDIUM"></fxs-radio-button>
 * <fxs-radio-button group-tag="user-graphics" value="low" caption="LOC_UI_OPTIONS_GRAPHICS_LOW"></fxs-radio-button>
 * ```
 *
 * @fires RadioButtonChangeEvent - Dispatched to the radio button root element when the radio button is toggled. This is a type alias for ComponentValueChangeEvent.
 * @fires RadioButtonGroupChangeEvent - Dispatched to the window when the radio button is toggled.
 *
 * `group-tag` - The group tag of the radio button. Used for associating radio buttons together.
 * `value` - The value of the radio button.
 * `selected` - Whether the radio button is checked.
 * `disabled` - Whether the radio button is disabled.
 */
export default class FxsRadioButton extends ChangeNotificationComponent {
    constructor() {
        super(...arguments);
        this.ballElement = document.createElement('div');
        this.highlightElement = document.createElement('div');
        this.engineInputEventListener = this.onEngineInput.bind(this);
        this.radioButtonChangeEventListener = this.onRadioButtonGroupChange.bind(this);
        this.mouseEnterEventListener = this.playFocusSound.bind(this);
        this._isChecked = false;
    }
    /**
     * If set to a value, other radio buttons with the same groupTag will be deselected when this radio button is selected.
     * If set to null, or not set, no other radio buttons will be deselected automatically.
     */
    get groupTag() {
        return this.Root.getAttribute('group-tag');
    }
    /**
     * value is the string value represented by this radio button, not it's checked state.
     */
    get value() {
        const value = this.Root.getAttribute('value');
        if (!value) {
            throw new Error('fxs-radio-button: value attribute was null');
        }
        return value;
    }
    get isChecked() { return this._isChecked; }
    set isChecked(value) {
        this._isChecked = value;
        // Make sure the selected attribute is in sync with the value.
        const selectedAttribute = this.Root.getAttribute('selected');
        if (selectedAttribute === 'true' && !this.isChecked) {
            this.Root.setAttribute('selected', 'false');
        }
        else if (selectedAttribute === 'false' && this.isChecked) {
            this.Root.setAttribute('selected', 'true');
        }
    }
    get disabled() {
        return this.Root.getAttribute('disabled') === 'true';
    }
    set disabled(value) {
        this.Root.setAttribute('disabled', value.toString());
    }
    get isTiny() {
        return this.Root.getAttribute("is-tiny") === "true";
    }
    get isSoundDisabled() {
        return this.Root.getAttribute("sound-disabled") === "true";
    }
    onInitialize() {
        super.onInitialize();
        this.render();
    }
    onAttach() {
        super.onAttach();
        this.Root.addEventListener('engine-input', this.engineInputEventListener);
        window.addEventListener('radio-button-change', this.radioButtonChangeEventListener);
        this.Root.addEventListener('mouseenter', this.mouseEnterEventListener);
        if (!this.Root.hasAttribute("data-audio-group-ref")) {
            this.Root.setAttribute("data-audio-group-ref", "radio-button");
        }
    }
    onDetach() {
        window.removeEventListener('radio-button-change', this.radioButtonChangeEventListener);
        this.Root.removeEventListener('engine-input', this.engineInputEventListener);
        this.Root.removeEventListener('mouseenter', this.mouseEnterEventListener);
        super.onDetach();
    }
    playPressSound() {
        this.playSound('data-audio-press', 'data-audio-press-ref');
    }
    playFocusSound() {
        this.playSound('data-audio-focus', 'data-audio-focus-ref');
    }
    onEngineInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.START && inputEvent.detail.status != InputActionStatuses.FINISH || this.disabled || this.isChecked) {
            return;
        }
        if (inputEvent.detail.name == 'mousebutton-left' || inputEvent.detail.name == 'accept' || inputEvent.detail.name == 'touch-tap') {
            if (inputEvent.detail.status == InputActionStatuses.START) {
                this.playPressSound();
                return;
            }
            if (inputEvent.detail.status == InputActionStatuses.FINISH) {
                if (!this.isSoundDisabled) {
                    this.playSound('data-audio-activate', 'data-audio-activate-ref');
                }
                this.toggle();
                // Even if the toggle is not effective, the inputEvent is consumed
                window.dispatchEvent(new ActivatedComponentChangeEvent(null));
                this.Root.dispatchEvent(new ActionActivateEvent(inputEvent.detail.x, inputEvent.detail.y));
                inputEvent.stopPropagation();
                inputEvent.preventDefault();
            }
        }
    }
    onRadioButtonGroupChange(event) {
        const { groupTag, value } = event.detail;
        // Is it selected (but not the one that sent the event)?
        if (groupTag === this.groupTag && value !== this.value && this.isChecked) {
            this.toggle(false);
        }
    }
    onAttributeChanged(name, _oldValue, newValue) {
        switch (name) {
            case "disabled":
                this.updateRadioButtonElements();
                break;
            case "selected":
                this.toggle(newValue === "true");
                break;
            default:
                break;
        }
    }
    toggle(force = undefined) {
        const wasChecked = this.isChecked;
        this.isChecked = force ?? !this.isChecked;
        // Note: Due to the synchronous nature of synthetic events, we update the value immediately before sending the event. This reduces the number of redundant events sent.
        // Example: Lens Layers Two-way Binding
        //     User clicks checkbox, signaling to enable a lens layer.
        //     The event handler reads the value and enables the lens layer.
        //     The lens layer being enabled sends a lens layer event, which is handled by the minimap options.
        //     The minimap options sees that the checkbox is unchecked, and tries to check it, causing another event to be sent.
        if (wasChecked === this.isChecked) {
            return;
        }
        const value = this.value;
        // Signal change to radio button consumers.
        const valueChangeEvent = new ComponentValueChangeEvent({
            isChecked: this.isChecked,
            value
        });
        const cancelled = !this.Root.dispatchEvent(valueChangeEvent);
        if (cancelled) {
            this.isChecked = wasChecked;
            return;
        }
        const groupTag = this.groupTag;
        if (this.isChecked && groupTag) {
            // Signals other radio buttons in the group to unselect themselves.
            window.dispatchEvent(new RadioButtonGroupChangeEvent({ value, groupTag }));
        }
        this.updateRadioButtonElements();
    }
    updateRadioButtonElements() {
        this.ballElement.classList.toggle('opacity-0', !this.isChecked);
        this.highlightElement.classList.toggle('img-radio-button-focus', !this.isChecked);
        this.highlightElement.classList.toggle('img-radio-button-on-focus', this.isChecked);
        const disabled = this.disabled;
        this.Root.classList.toggle('cursor-not-allowed', disabled);
        this.Root.classList.toggle('cursor-pointer', !disabled);
        this.highlightElement.classList.toggle('hidden', disabled);
    }
    render() {
        const isMobileViewExperience = UI.getViewExperience() == UIViewExperience.Mobile;
        this.Root.classList.add('group', 'relative', 'flex', 'justify-center', 'items-center', 'img-radio-button', 'cursor-pointer', 'pointer-events-auto');
        if (this.isTiny) {
            this.Root.classList.add("size-4");
        }
        else if (isMobileViewExperience) {
            this.Root.classList.add("size-10");
        }
        else {
            this.Root.classList.add("size-8");
        }
        this.Root.classList.add(this.isTiny ? "size-4" : "size-8");
        this.ballElement.classList.value = !this.isTiny && isMobileViewExperience ? 'img-radio-button-ball-lg' : 'img-radio-button-ball';
        this.highlightElement.classList.value = 'absolute inset-0 opacity-0 group-hover\\:opacity-100 group-focus\\:opacity-100 transition-opacity';
        this.Root.appendChild(this.ballElement);
        this.Root.appendChild(this.highlightElement);
        this.updateRadioButtonElements();
    }
}
Controls.define('fxs-radio-button', {
    createInstance: FxsRadioButton,
    description: 'A radio-button primitive',
    classNames: ['fxs-radio-button'],
    attributes: [
        {
            name: "disabled"
        },
        {
            name: "selected",
            description: "Whether or not the radio button is 'ticked'."
        }
    ],
    images: [
        'fs://game/base_radio-bg.png',
        'fs://game/base_radio-ball.png',
        'fs://game/base_radio-bg-focus.png',
        'fs://game/base_radio-bg-on-focus.png'
    ]
});

//# sourceMappingURL=file:///core/ui/components/fxs-radio-button.js.map
