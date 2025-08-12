/**
 * @file fxs-activatable.ts
 * @copyright 2022-2023, Firaxis Games
 * @description Base activatable component.
 */
import FocusManager from '/core/ui/input/focus-manager.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';
export const ActionActivateEventName = 'action-activate';
export class ActionActivateEvent extends CustomEvent {
    constructor(x, y) {
        super('action-activate', { bubbles: false, cancelable: true, detail: { x, y } });
    }
}
/** @description A component that you can activate */
export class FxsActivatable extends Component {
    constructor() {
        super(...arguments);
        this.actionKey = null;
        this.isFeedbackEnabled = false;
        this.isSoundEnabled = true;
        this.onActivatableEngineInputEventListener = this.onActivatableEngineInput.bind(this);
        this.onActivatableFocusEventListener = this.onActivatableFocus.bind(this);
        this.onActivatableBlurEventListener = this.onActivatableBlur.bind(this);
        this.onActivatableMouseLeaveEventListener = this.onActivatableMouseLeave.bind(this);
        this.shouldPlayErrorSound = false;
    }
    get disabledCursorAllowed() {
        const value = this.Root.getAttribute('disabled-cursor-allowed');
        return value == null || value === 'true';
    }
    set disabledCursorAllowed(value) {
        this.Root.setAttribute('disabled-cursor-allowed', value.toString());
    }
    get disabled() {
        return this.Root.getAttribute('disabled') === 'true';
    }
    set disabled(value) {
        this.Root.setAttribute('disabled', value.toString());
    }
    onActivatableMouseLeave() {
        // This counter acts the :focus that is given to an element when it recieves a mousedown event
        // if that event counters what the focus manager currently thinks is focus
        if (document.activeElement == this.Root && FocusManager.getFocus() != this.Root) {
            this.Root.blur();
        }
    }
    onActivatableFocus() {
        if (this.isFeedbackEnabled) {
            Input.triggerForceFeedback(FxsActivatable.FEEDBACK_LOW, FxsActivatable.FEEDBACK_HIGH, FxsActivatable.FEEDBACK_DURATION);
        }
    }
    onActivatableBlur() { }
    onActivatableEngineInput(inputEvent) {
        if (!(inputEvent.detail.status == InputActionStatuses.FINISH ||
            inputEvent.detail.status == InputActionStatuses.START)) {
            return;
        }
        if (inputEvent.detail.name == 'touch-touch') {
            this.Root.classList.add('pressed');
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
            return;
        }
        if (this.disabled) {
            if (inputEvent.detail.name == 'mousebutton-left' || inputEvent.detail.name == 'accept' || inputEvent.detail.name == 'touch-tap' || inputEvent.detail.name == 'keyboard-enter') {
                if (inputEvent.detail.status == InputActionStatuses.START && this.isSoundEnabled) {
                    this.playErrorPressedSound();
                }
                return;
            }
        }
        if (inputEvent.detail.name == 'mousebutton-left' || inputEvent.detail.name == 'accept' || inputEvent.detail.name == 'touch-tap' || inputEvent.detail.name == 'keyboard-enter') {
            if (inputEvent.detail.status == InputActionStatuses.START && this.isSoundEnabled) {
                if (this.shouldPlayErrorSound) {
                    this.playErrorPressedSound();
                }
                else {
                    this.playPressedSound();
                }
            }
            if (inputEvent.detail.status == InputActionStatuses.FINISH) {
                if (this.isSoundEnabled && !this.shouldPlayErrorSound) {
                    this.playActivateSound();
                }
                window.dispatchEvent(new ActivatedComponentChangeEvent(null));
                this.Root.dispatchEvent(new ActionActivateEvent(inputEvent.detail.x, inputEvent.detail.y));
                inputEvent.stopPropagation();
                inputEvent.preventDefault();
            }
        }
    }
    playActivateSound() {
        this.playSound('data-audio-activate', 'data-audio-activate-ref');
    }
    playPressedSound() {
        this.playSound('data-audio-press', 'data-audio-press-ref');
    }
    playErrorPressedSound() {
        Audio.playSound("data-audio-error-press");
    }
    updateDisabledStyle() {
        this.Root.classList.toggle('disabled', this.disabled);
        this.Root.classList.toggle('cursor-not-allowed', this.disabled && this.disabledCursorAllowed);
        this.Root.classList.toggle('cursor-pointer', !this.disabled || this.disabledCursorAllowed);
        this.addOrRemoveNavHelpElement(this.Root, this.actionKey);
    }
    onInitialize() {
        super.onInitialize();
        this.Root.role = "button";
        this.Root.classList.add('pointer-events-auto');
        this.updateDisabledStyle();
    }
    onAttach() {
        super.onAttach();
        this.Root.addEventListener('mouseenter', this.playFocusSound.bind(this));
        this.Root.addEventListener('engine-input', this.onActivatableEngineInputEventListener);
        this.Root.listenForWindowEvent('engine-input', (inputEvent) => {
            if (inputEvent.detail.name == "touch-complete" && this.Root.classList.contains("pressed")) {
                this.Root.classList.remove("pressed");
            }
        }, true);
        this.Root.addEventListener('focus', this.onActivatableFocusEventListener);
        this.Root.addEventListener('blur', this.onActivatableBlurEventListener);
        this.Root.addEventListener('mouseleave', this.onActivatableMouseLeaveEventListener);
    }
    onDetach() {
        this.Root.removeEventListener('engine-input', this.onActivatableEngineInputEventListener);
        this.Root.removeEventListener('focus', this.onActivatableFocusEventListener);
        this.Root.removeEventListener('blur', this.onActivatableBlurEventListener);
        this.Root.removeEventListener('mouseleave', this.onActivatableMouseLeaveEventListener);
        super.onDetach();
    }
    playFocusSound() {
        if (this.isSoundEnabled) {
            this.playSound("data-audio-focus", "data-audio-focus-ref");
        }
    }
    addOrRemoveNavHelpElement(parent, value) {
        this.actionKey = value;
        if (value && !this.disabled) {
            const navHelpReversed = this.Root.getAttribute('nav-help-side-reversed');
            if (this.navHelp == undefined) {
                this.navHelp = document.createElement('fxs-nav-help');
                this.navHelp.classList.toggle("mr-2", !navHelpReversed);
                const navHelpClassName = this.Root.getAttribute('nav-help-class');
                if (navHelpClassName) {
                    this.navHelp.classList.add(...navHelpClassName.split(' '));
                }
            }
            if (!this.navHelp.isConnected) {
                parent.insertAdjacentElement(navHelpReversed ? "beforeend" : "afterbegin", this.navHelp);
            }
            this.navHelp.setAttribute("action-key", value);
            this.navHelp.setAttribute("is-icon-text-space", "true");
            const altActionIcon = this.Root.getAttribute("nav-help-alt-action-key");
            if (altActionIcon && altActionIcon != "") {
                this.navHelp.setAttribute("alt-action-key", altActionIcon);
            }
        }
        else if (this.navHelp) {
            this.Root.removeChild(this.navHelp);
        }
    }
    /**
     * @override
     */
    onAttributeChanged(name, oldValue, newValue) {
        super.onAttributeChanged(name, oldValue, newValue);
        switch (name) {
            case "sound-disabled":
                if (newValue) {
                    this.isSoundEnabled = newValue.toLowerCase() === "false";
                }
                break;
            case "action-key":
                this.addOrRemoveNavHelpElement(this.Root, newValue);
                break;
            case "disabled":
                this.updateDisabledStyle();
                break;
            case "disabled-cursor-allowed":
                this.updateDisabledStyle();
                break;
            case "play-error-sound":
                if (newValue) {
                    this.shouldPlayErrorSound = newValue.toLowerCase() === "true";
                }
        }
    }
}
FxsActivatable.FEEDBACK_LOW = 20;
FxsActivatable.FEEDBACK_HIGH = 20;
FxsActivatable.FEEDBACK_DURATION = 100;
/**
 * Updates the button state and captions in response to an OperationResult.
 *
 * @example
 * ```
 * const button = document.querySelector('.my-fxs-button');
 * const result = Game.PlayerOperations.canStart(playerID, operationType);
 * UpdateFromOperationResult(button, result);
 * ```
 * @param element The button to update. This is an element where the component is an FxsActivatable.
 * @param result The OperationResult to process.
 */
export const UpdateFromOperationResult = (element, result) => {
    UpdateActivatableDisabledState({
        element,
        disabled: !result.Success,
        disabledReasons: result.FailureReasons
    });
};
/**
 * UpdateActivatableDisabledState updates the disabled state of an activatable element.
 *
 */
export const UpdateActivatableDisabledState = ({ element, disabled, disabledReasons = [] }) => {
    element.classList.toggle('disabled', disabled);
    if (disabled) {
        const failureReasonsTooltip = GetFailureReasonsTooltipHTML(disabledReasons);
        element.setAttribute('data-tooltip-content', failureReasonsTooltip);
    }
    else {
        element.removeAttribute('data-tooltip-content');
    }
};
/**
 * GetFailureReasonsTooltipHTML converts a list of failure reasons into a tooltip HTML string.
 * @param reasons The list of failure reasons.
 */
const GetFailureReasonsTooltipHTML = (reasons) => {
    if (reasons.length == 0) {
        return '';
    }
    let html = '<div class="failure-reasons">';
    for (const reason of reasons) {
        html += `<div class="failure-reason">${reason}</div>`;
    }
    html += '</div>';
    return html;
};
Controls.define('fxs-activatable', {
    createInstance: FxsActivatable,
    description: 'A basic button primitive',
    classNames: [],
    attributes: [
        {
            name: "caption",
            description: "The text label of the button."
        },
        {
            name: "action-key",
            description: "The action key for inline nav help, usually translated to a button icon."
        },
        {
            name: "nav-help-side-reversed",
            description: "inline nav help will be displayed after the content instead of before (default: false)"
        },
        {
            name: "nav-help-alt-action-key",
            description: "The backup button icon for inline nav help, in case the action-key is not valid in the current context"
        },
        {
            name: "disabled",
            description: "Whether the activatable is disabled."
        },
        {
            name: "disabled-cursor-allowed",
            description: "Set to true for the cursor to be a pointer always"
        },
        {
            name: "sound-disabled",
            description: "Set to prevent the default activate sound from being played"
        },
        {
            name: "play-error-sound",
            description: "Set to tell this element to play the error click sound instead of its press/release sounds"
        }
    ]
});
export { FxsActivatable as default };

//# sourceMappingURL=file:///core/ui/components/fxs-activatable.js.map
