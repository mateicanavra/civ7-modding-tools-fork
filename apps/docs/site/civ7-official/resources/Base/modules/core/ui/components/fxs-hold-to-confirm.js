/**
 * @file fxs-hold-to-confirm.ts
 * @copyright 2023, Firaxis Games
 * @description Hold to confirm.
 *
 * Set the `action-key` attribute to the action key to display the icon for and have the ring respond to.
 * Set the `caption` attribute to set the text you want to display
 * Set the `disabled` attribute to disable this component.
 *
 */
import { ActionActivateEvent } from "/core/ui/components/fxs-activatable.js";
import FxsNavHelp from "/core/ui/components/fxs-nav-help.js";
import { ActiveDeviceTypeChangedEventName } from "/core/ui/input/action-handler.js";
import { Icon } from "/core/ui/utilities/utilities-image.js";
/** @description The hold to confirm primitive; makes a circle appear out of nowhere, like magic. */
export class FxsHoldToConfirm extends Component {
    get disabled() {
        return this.Root.classList.contains('disabled');
    }
    set disabled(value) {
        this.Root.setAttribute('disabled', value.toString());
    }
    get actionKey() {
        return this.Root.getAttribute('action-key');
    }
    constructor(root) {
        super(root);
        this.DEFAULT_HOLD_SECS = 3;
        this.engineInputEventListener = this.onEngineInput.bind(this);
        this.updateIconEventListener = this.updateIcon.bind(this);
    }
    onInitialize() {
        super.onInitialize();
        this.render();
    }
    onAttach() {
        super.onAttach();
        this.Root.addEventListener('engine-input', this.engineInputEventListener);
        window.addEventListener(ActiveDeviceTypeChangedEventName, this.updateIconEventListener, true);
    }
    onDetach() {
        window.removeEventListener(ActiveDeviceTypeChangedEventName, this.updateIconEventListener, true);
        this.Root.removeEventListener('engine-input', this.engineInputEventListener);
        super.onDetach();
    }
    onAttributeChanged(name, oldValue, newValue) {
        switch (name) {
            case 'caption': {
                if (this.labelElement) {
                    if (newValue) {
                        this.labelElement.setAttribute('data-l10n-id', newValue);
                    }
                    else {
                        this.labelElement.removeAttribute('data-l10n-id');
                    }
                }
                break;
            }
            case 'action-key': {
                this.updateIcon();
                break;
            }
            case 'disabled': {
                this.ringElement?.classList.remove("active");
                break;
            }
            default:
                super.onAttributeChanged(name, oldValue, newValue);
                break;
        }
    }
    onEngineInput(inputEvent) {
        if (this.disabled) {
            return;
        }
        if (inputEvent.detail.name == this.actionKey) {
            this.playSound('data-audio-activate', 'data-audio-activate-ref');
            if (inputEvent.detail.status == InputActionStatuses.START) {
                if (this.ringElement) {
                    this.ringElement.component.value = 100;
                }
            }
            else if (inputEvent.detail.status == InputActionStatuses.HOLD) {
                window.dispatchEvent(new ActivatedComponentChangeEvent(null));
                this.Root.dispatchEvent(new ActionActivateEvent(inputEvent.detail.x, inputEvent.detail.y));
            }
            else if (inputEvent.detail.status == InputActionStatuses.FINISH) {
                if (this.ringElement) {
                    this.ringElement.component.value = 0;
                }
            }
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
    }
    updateIcon() {
        if (this.iconElement) {
            const actionName = FxsNavHelp.getGamepadActionName(this.actionKey ?? "") || this.actionKey || "";
            const imagePath = Icon.getIconFromActionName(actionName) ?? "";
            this.iconElement.style.backgroundImage = `url(${imagePath})`;
        }
    }
    render() {
        const holdTimeSeconds = UI.getApplicationOption("Input", "InputActionHoldTime") || this.DEFAULT_HOLD_SECS;
        this.iconElement = document.createElement("div");
        this.iconElement.classList.add("fxs-hold-to-confirm__icon");
        this.ringElement = document.createElement('fxs-ring-meter');
        this.ringElement.classList.add("fxs-hold-to-confirm__ring");
        this.ringElement.setAttribute("animation-duration", `${holdTimeSeconds * 1000}`);
        this.ringElement.setAttribute("value", "0");
        this.ringElement.appendChild(this.iconElement);
        this.labelElement = document.createElement("div");
        this.labelElement.classList.add("fxs-hold-to-confirm__label", "font-title", "text-gap-0");
        const content = document.createElement("div");
        content.classList.add("fxs-button__content");
        content.appendChild(this.labelElement);
        this.Root.appendChild(this.ringElement);
        this.Root.appendChild(content);
    }
}
Controls.define('fxs-hold-to-confirm', {
    createInstance: FxsHoldToConfirm,
    description: 'A hold to confirm primitive',
    classNames: ['fxs-hold-to-confirm'],
    attributes: [
        {
            name: "action-key",
            description: "The action that causes the ring to fill when pressed."
        },
        {
            name: "caption",
            description: "The text label to display."
        }
    ],
    images: [],
    tabIndex: -1
});
export { FxsHoldToConfirm as default };

//# sourceMappingURL=file:///core/ui/components/fxs-hold-to-confirm.js.map
