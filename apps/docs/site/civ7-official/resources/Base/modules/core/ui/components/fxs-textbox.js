/**
 * @file fxs-textbox.ts
 * @copyright 2022 - 2025, Firaxis Games
 * @description A textbox primitive.
 */
import { ActionActivateEvent } from '/core/ui/components/fxs-activatable.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { NavigateInputEventName } from '/core/ui/input/input-support.js';
export class FxsTextboxValidateVirtualKeyboard extends CustomEvent {
    constructor(detail) {
        super('fxs-textbox-validate-virtual-keyboard', { bubbles: false, cancelable: true, detail });
    }
}
export const TextBoxTextChangedEventName = 'text-changed';
export class TextBoxTextChangedEvent extends CustomEvent {
    constructor(newStr) {
        super(TextBoxTextChangedEventName, { bubbles: false, cancelable: true, detail: { newStr } });
    }
}
export const TextBoxTextEditStopEventName = 'text-edit-stop';
export class TextBoxTextEditStopEvent extends CustomEvent {
    constructor(confirmed, inputEventName) {
        super(TextBoxTextEditStopEventName, { bubbles: false, cancelable: true, detail: { confirmed, inputEventName } });
    }
}
var FxsTextBoxCaseMode;
(function (FxsTextBoxCaseMode) {
    FxsTextBoxCaseMode[FxsTextBoxCaseMode["NO_CASE"] = 0] = "NO_CASE";
    FxsTextBoxCaseMode[FxsTextBoxCaseMode["UPPERCASE"] = 1] = "UPPERCASE";
    FxsTextBoxCaseMode[FxsTextBoxCaseMode["LOWERCASE"] = 2] = "LOWERCASE";
})(FxsTextBoxCaseMode || (FxsTextBoxCaseMode = {}));
class FxsTextbox extends ChangeNotificationComponent {
    constructor() {
        super(...arguments);
        this.textInput = document.createElement('input');
        this.textInputListener = this.onTextInput.bind(this);
        this.textInputFocusListener = this.onTextInputFocus.bind(this);
        this.focusListener = this.onFocus.bind(this);
        this.focusOutListener = this.onFocusOut.bind(this);
        this.engineInputListener = this.onEngineInput.bind(this);
        this.navigateInputListener = this.onNavigateInput.bind(this);
        this.handleDoubleClick = this.onDoubleClick.bind(this);
        this.keyUpListener = this.onKeyUp.bind(this);
        // The HTMLInputElement.placeholder does not seems to be supported by Coherent yet.
        // We have to use the HTMLInputElement.value in the meantime.
        // <-> We can NOT change the this.textInput.placeholder directly so we change the this.textInput.value
        this.placeholder = "";
        this.isPlaceholderActive = true;
        this.overrideText = true;
        this.showKeyboardOnActivate = true;
        this.caseMode = FxsTextBoxCaseMode.NO_CASE;
    }
    onInitialize() {
        this.Root.classList.add("flow-row", "flex-auto", "items-center", "bg-accent-6", "pointer-events-auto");
        this.textInput.classList.add("py-1", "px-1\\.5", "flex-auto", "border-1", "border-primary-1", "hover\\:border-secondary", "focus\\:border-secondary", "transition-border-color", "bg-transparent");
        this.textInput.type = this.Root.getAttribute('type') ?? "text";
        this.textInput.setAttribute('consume-keyboard-input', 'true'); // Note: This prevents the onEngineInput() from responding to Keyboard events!
        this.Root.appendChild(this.textInput);
        this.Root.role = "textbox";
    }
    onAttach() {
        super.onAttach();
        this.Root.addEventListener('mouseenter', this.playSound.bind(this, 'data-audio-focus', 'data-audio-focus-ref'));
        this.textInput.addEventListener("input", this.textInputListener);
        this.textInput.addEventListener("focus", this.textInputFocusListener);
        this.Root.addEventListener("focusout", this.focusOutListener);
        this.Root.addEventListener("focus", this.focusListener);
        this.Root.addEventListener('engine-input', this.engineInputListener);
        this.Root.addEventListener(NavigateInputEventName, this.navigateInputListener);
        this.Root.ondblclick = this.handleDoubleClick;
        this.Root.addEventListener("keyup", this.keyUpListener);
    }
    onDetach() {
        this.textInput.removeEventListener("input", this.textInputListener);
        this.textInput.removeEventListener("focus", this.textInputFocusListener);
        this.Root.removeEventListener("focusout", this.focusOutListener);
        this.Root.removeEventListener("focus", this.focusListener);
        this.Root.removeEventListener('engine-input', this.engineInputListener);
        this.Root.removeEventListener(NavigateInputEventName, this.navigateInputListener);
        this.Root.removeEventListener("keyup", this.keyUpListener);
        super.onDetach();
    }
    //react to keyboard inputs when active, to go around issues where onEngineInput fails when focused on the text input
    onKeyUp(event) {
        if (this.Root.getAttribute("enabled") == "true") {
            if (event.code == 'Enter') {
                this.Root.dispatchEvent(new TextBoxTextEditStopEvent(true, "keyboard-enter"));
            }
            if (event.code == 'Escape') {
                this.Root.dispatchEvent(new TextBoxTextEditStopEvent(false, "keyboard-escape"));
            }
        }
    }
    //standard function for input handling
    onEngineInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        if (inputEvent.detail.name == "accept" && this.Root.getAttribute("enabled") == 'true') {
            this.Root.dispatchEvent(new TextBoxTextEditStopEvent(true, inputEvent.detail.name));
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
        else if (inputEvent.isCancelInput() && this.Root.getAttribute("enabled") == 'true') {
            this.Root.dispatchEvent(new TextBoxTextEditStopEvent(false, inputEvent.detail.name));
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
        if ((inputEvent.detail.name == 'mousebutton-left' || inputEvent.detail.name == 'accept' || inputEvent.detail.name == 'touch-tap')) {
            this.onActivate(inputEvent);
        }
    }
    //navigation handling.
    onNavigateInput(inputEvent) {
        if (this.Root.getAttribute("enabled") == 'true') {
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
    }
    //highlight all text when ouble clicking
    onDoubleClick() {
        // selection of all characters within the textfield (0 - start index, -1 - end index)
        if (this.textInput.style.pointerEvents != "none") {
            this.textInput.setSelectionRange(0, -1);
        }
    }
    //handle text input. Apply casing if applicable
    onTextInput() {
        this.overrideText = false;
        switch (this.caseMode) {
            case FxsTextBoxCaseMode.UPPERCASE:
                this.Root.setAttribute("value", this.value.toUpperCase());
                break;
            case FxsTextBoxCaseMode.LOWERCASE:
                this.Root.setAttribute("value", this.value.toLowerCase());
                break;
            default:
                this.Root.setAttribute("value", this.value);
                break;
        }
        this.Root.dispatchEvent(new TextBoxTextChangedEvent(this.value));
    }
    onTextInputFocus(_event) {
        this.tryRemovePlaceholder();
    }
    tryRemovePlaceholder() {
        if (this.isPlaceholderActive) {
            this.textInput.value = "";
        }
        this.isPlaceholderActive = false;
    }
    tryFallbackOnPlaceholderValue() {
        if (this.value != "") {
            // Keep the value entered by the user
            return;
        }
        this.textInput.value = this.placeholder;
        this.isPlaceholderActive = true; // reset
    }
    //add different color to border when text input focused
    onFocus() {
        this.textInput.classList.add('border-secondary');
    }
    //revert to default color when unfocused
    onFocusOut() {
        this.textInput.classList.remove('border-secondary');
        this.tryFallbackOnPlaceholderValue();
    }
    onActivate(inputEvent) {
        this.playSound('data-audio-activate', 'data-audio-activate-ref');
        this.tryRemovePlaceholder();
        // Register Virtual Keyboard callbacks
        if (UI.canDisplayKeyboard() && this.showKeyboardOnActivate) {
            engine.on("IMEValidated", this.onVirtualKeyboardTextEntered, this);
            engine.on("IMECanceled", this.onVirtualKeyboardTextCanceled, this);
            UI.displayKeyboard(this.value, this.textInput.getAttribute("type") == "password", Number.parseInt(this.Root.getAttribute("max-length") ?? "-1"));
        }
        window.dispatchEvent(new SetActivatedComponentEvent(null));
        if (inputEvent) {
            this.Root.dispatchEvent(new ActionActivateEvent(inputEvent.detail.x, inputEvent.detail.y));
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
        this.Root.removeAttribute('activated'); // reset
    }
    //function triggered when confirming text entry on a virtual keyboard (applicable to consoles)
    onVirtualKeyboardTextEntered(text) {
        // for now text is GenericData<std::string>
        let value = UI.getIMEConfirmationValueLocation() == IMEConfirmationValueLocation.Element ? this.textInput.value : text.data;
        if (this.Root.hasAttribute("max-length")) {
            const maxLength = Number.parseInt(this.Root.getAttribute("max-length") ?? "-1");
            if (maxLength > 0 && value.length > maxLength) {
                value = value.substring(0, maxLength);
            }
        }
        this.Root.setAttribute("value", value);
        this.Root.dispatchEvent(new FxsTextboxValidateVirtualKeyboard({ value }));
        // we the text and IME will close, clear callbacks now
        this.clearVirtualKeyboardCallbacks();
        this.Root.dispatchEvent(new TextBoxTextEditStopEvent(true));
    }
    //function triggered when canceling text entry on a virtual keyboard (applicable to consoles)
    onVirtualKeyboardTextCanceled() {
        this.clearVirtualKeyboardCallbacks();
        this.Root.dispatchEvent(new TextBoxTextEditStopEvent(false));
    }
    //clear listeners for virtual keyboard text entry
    clearVirtualKeyboardCallbacks() {
        engine.off("IMEValidated", this.onVirtualKeyboardTextEntered, this);
        engine.off("IMECanceled", this.onVirtualKeyboardTextCanceled, this);
    }
    onAttributeChanged(name, oldValue, newValue) {
        switch (name) {
            case "type":
                this.textInput.type = newValue ?? "text";
                break;
            case "value":
                this.isPlaceholderActive = false;
                //we don't want to set the value of the text if we're just typing stuff in
                //if we set this value then the view of the textbox goes to the beginning
                //which causes the view of the text box to not follow the cursor as we type
                if (this.overrideText) {
                    this.textInput.value = newValue ?? "";
                }
                this.overrideText = true;
                if (oldValue != newValue) {
                    this.sendValueChange(new CustomEvent("component-value-changed", {
                        bubbles: true,
                        cancelable: true,
                        detail: {
                            value: newValue,
                        }
                    }));
                }
                break;
            case "placeholder":
                this.placeholder = newValue ?? "";
                if (this.isPlaceholderActive) {
                    this.textInput.value = this.placeholder;
                } // Else: keep the value entered by the user
                break;
            case "activated":
                if (newValue === "true") {
                    this.onActivate();
                }
                break;
            case "max-length":
                this.textInput.maxLength = Number(newValue);
                break;
            case "enabled":
                this.textInput.readOnly = (newValue == "true");
                this.textInput.style.pointerEvents = (newValue == "true") ? "auto" : "none";
                if (newValue == "true") {
                    this.textInput.setAttribute("tabindex", "-1");
                    FocusManager.setFocus(this.textInput);
                    this.textInput.focus();
                    this.textInput.setSelectionRange(0, -1);
                }
                else {
                    this.textInput.removeAttribute("tabindex");
                    this.textInput.blur();
                }
                break;
            case "has-border":
                this.textInput.classList.toggle("border-1", newValue != "false");
                this.textInput.classList.toggle("py-1", newValue != "false");
                this.textInput.classList.toggle("border-0", newValue == "false");
                break;
            case 'has-background':
                this.Root.classList.toggle("bg-accent-6", newValue != "false");
                this.Root.classList.toggle("bg-transparent", newValue == "false");
                this.Root.classList.toggle("no-background", newValue == "false");
                break;
            case "show-keyboard-on-activate":
                this.showKeyboardOnActivate = (newValue == "true");
                break;
            case "case-mode":
                if (newValue == "uppercase") {
                    this.caseMode = FxsTextBoxCaseMode.UPPERCASE;
                }
                else if (newValue == "lowercase") {
                    this.caseMode = FxsTextBoxCaseMode.LOWERCASE;
                }
                else {
                    this.caseMode = FxsTextBoxCaseMode.NO_CASE;
                }
                this.Root.classList.toggle("uppercase", this.caseMode == FxsTextBoxCaseMode.UPPERCASE);
                this.Root.classList.toggle("lowercase", this.caseMode == FxsTextBoxCaseMode.LOWERCASE);
                break;
        }
    }
    get value() {
        const newValue = Locale.plainText(this.textInput.value);
        return newValue;
    }
}
Controls.define('fxs-textbox', {
    createInstance: FxsTextbox,
    description: 'A text input',
    classNames: ['fxs-textbox'],
    attributes: [
        {
            name: "type",
            description: "The type of text input"
        },
        {
            name: "value",
            description: "The value of the text input"
        },
        {
            name: "placeholder",
            description: "The input field hint text"
        },
        {
            name: "activated",
            description: "Simulate that the text box was clicked"
        },
        {
            name: "max-length",
            description: "Maximum amount of characters allowed in the text box"
        },
        {
            name: "inner-text-class",
            description: "CSS Styling class to give inner text"
        },
        {
            name: "enabled",
            description: "Whether or not text input is enabled"
        },
        {
            name: "has-border",
            description: "Whether or not text input have a border style (default: 'true')"
        },
        {
            name: "has-background",
            description: "Whether or not text input have a black background (default: 'true')"
        },
        {
            name: "show-keyboard-on-activate",
            description: "If virtual keyboard should open when activating the textbox"
        },
        {
            name: "case-mode",
            description: "If the textbox text should be all uppercase, lowercase, or neither"
        }
    ],
    tabIndex: -1
});
export { FxsTextbox as default };

//# sourceMappingURL=file:///core/ui/components/fxs-textbox.js.map
