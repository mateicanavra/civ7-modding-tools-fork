/**
 * @file fxs-nav-help.ts
 * @copyright 2021, Firaxis Games
 * @description Provide navigation input help.
 */
import ActionHandler, { ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';
import { Icon } from '/core/ui/utilities/utilities-image.js';
import { Layout } from '/core/ui/utilities/utilities-layout.js';
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js';
/**
 * Mapping of input action names to gamepad action names.
 * key: action, value: action in config
 */
const actionButtonMap = new Map([
    ["inline-confirm", "accept"],
    ["inline-accept", "accept"],
    ["confirm", "accept"],
    ["cancel", "cancel"],
    ["inline-cancel", "cancel"],
    ["back", "cancel"],
    ["exit", "cancel"],
    ["inline-next-action", "next-action"],
    ["inline-shell-action-1", "shell-action-1"],
    ["inline-shell-action-2", "shell-action-2"],
    ["inline-shell-action-3", "shell-action-3"],
    ["inline-toggle-tooltip", "toggle-tooltip"],
    ["inline-shell-action-5", "shell-action-5"],
    ["inline-swap-plot-selection", "swap-plot-selection"],
    ["inline-notification", "notification"],
    ["pause", "sys-menu"],
    ["sys-menu", "sys-menu"],
    ["inline-sys-menu", "sys-menu"],
    ["inline-nav-shell-previous", "nav-shell-previous"],
    ["inline-nav-shell-next", "nav-shell-next"],
    ["cycle-next", "nav-next"],
    ["inline-cycle-next", "nav-next"],
    ["inline-nav-next", "nav-next"],
    ["cycle-prev", "nav-previous"],
    ["cycle-previous", "nav-previous"],
    ["inline-cycle-prev", "nav-previous"],
    ["inline-cycle-previous", "nav-previous"],
    ["inline-nav-previous", "nav-previous"],
    ["unit-city-list", "nav-right"],
    ["inline-unit-city-list", "nav-right"],
    ["diplomacy-panel", "nav-left"],
    ["inline-diplomacy-panel", "nav-left"],
    ["inline-nav-down", "nav-down"],
    ["zoom", "camera-zoom-out"],
    ["inline-next-city", "camera-zoom-in"],
    ["inline-prev-city", "camera-zoom-out"],
    ["inline-zoom", "camera-zoom-out"],
    ["inline-nav-move", "nav-move"],
    ["inline-camera-pan", "camera-pan"],
    ["inline-scroll-pan", "scroll-pan"],
    ["inline-center-plot-cursor", "center-plot-cursor"],
    ["inline-toggle-diplo", "toggle-diplo"],
    ["inline-nav-up", "nav-up"],
    ["inline-toggle-chat", "toggle-chat"],
    ["inline-open-lens-panel", "open-lens-panel"],
    ["inline-toggle-quest", "toggle-quest"],
    ["inline-toggle-radial-menu", "toggle-radial-menu"],
    ["inline-navigate-yields", "navigate-yields"],
    ["inline-nav-right", "nav-right"],
]);
var DecorationMode;
(function (DecorationMode) {
    DecorationMode["NONE"] = "none";
    DecorationMode["BORDER"] = "border";
})(DecorationMode || (DecorationMode = {}));
/**
 * Translates an key in to a platform-specific button icon url, suitable for displaying in an img object.
 * @param queryAction
 * @returns an image path, including url() wrapper
 */
const getTextHelpForAction = (queryAction) => {
    let buttonIcon = "";
    //TODO: when we can identify which platform's gamepad images to show, we needd to add additional checks in here.
    //TODO: when we have keymapping, we need to translate action in to proper assigned buttons
    //TODO: this lookup is not extendable in it's current form. Needs fixin'! 
    switch (queryAction.toUpperCase()) {
        case "CONFIRM":
            buttonIcon = "[ENTER]";
            break;
        case "CANCEL":
        case "BACK":
        case "EXIT":
            buttonIcon = "[ESC]";
            break;
        case "CYCLE-NEXT":
            buttonIcon = "[TAB]";
            break;
        case "CYCLE-PREV":
        case "CYCLE-PREVIOUS":
            buttonIcon = "[CTRL]+[TAB]";
            break;
        case "ZOOM":
            buttonIcon = "[MOUSEWHEEL]";
            break;
    }
    return buttonIcon;
};
const ICON_SIZE = Layout.pixels(32);
const BORDER_IMAGE_SIZE = Layout.pixels(42);
// the image is 52x52, but includes 10px of empty space, so we need to adjust the background position to center it
const BORDER_POS_X = Layout.pixels(((52 - 42) / -2) + 1); // offset by 1 to center the icon
const BORDER_POS_Y = Layout.pixels(((52 - 42) / -2) - 2); // offset by 2 to center the icon
const BORDER_SIZE = Layout.pixels(52);
const PS4_OPTIONS_TEXT = "OPTIONS";
const PS4_SHARE_TEXT = "SHARE";
const mapIconToText = {
    "ps4_icon_start": PS4_OPTIONS_TEXT,
    "ps4_icon_share": PS4_SHARE_TEXT,
};
/**
 * A container that fills with navigation button icon and label.
 */
export class FxsNavHelp extends Component {
    constructor() {
        super(...arguments);
        this.label = document.createElement('div');
        this.activeDeviceTypeListener = this.onActiveDeviceTypeChanged.bind(this);
        this.actionKey = "";
        this.altActionKey = "";
        this.decorationMode = DecorationMode.NONE;
        this.caption = "";
        // possibly add more properties here to avoid setting styles to the same values in update
        this.prevState = {
            isGamepadActive: ActionHandler.isGamepadActive
        };
        this.updateGate = new UpdateGate(this.onUpdate.bind(this));
    }
    /**
     * Get the matching Gamepad action name of an Input action name
     * @param actionKey Input action name
     */
    static getGamepadActionName(actionKey) {
        return actionButtonMap.get(actionKey.toLowerCase());
    }
    onInitialize() {
        if (this.actionKey == "") {
            const attr = this.Root.getAttribute("action-key");
            this.actionKey = attr ? attr : "";
        }
        if (this.altActionKey == "") {
            const attr = this.Root.getAttribute("alt-action-key");
            this.altActionKey = attr ? attr : "";
        }
        if (this.caption == "") {
            const attr = this.Root.getAttribute("caption");
            this.caption = attr ? attr : "";
        }
        // If a parent is an 'hover-only-trigger', it is assumed that it is to display the Nav Help only on hover.
        const hasHoverOnlyTriggerParent = this.Root.closest('[hover-only-trigger="true"]') != null;
        this.Root.classList.toggle('hover-only-display', hasHoverOnlyTriggerParent);
        this.Root.classList.add('hidden', 'flex-row', 'items-center', 'justify-center', 'pointer-events-none');
        this.label.classList.add('mx-1');
        this.iconStartText = document.createElement("div");
        this.iconStartText.classList.add("text-accent-1", "text-shadow", "text-2xs");
        this.refreshContainers();
    }
    onAttach() {
        super.onAttach();
        this.updateGate.call('onAttach');
        window.addEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener, true);
        engine.on('InputContextChanged', this.onActiveContextChanged, this);
        engine.on('InputActionBinded', this.onInputActionBinded, this);
        engine.on('InputPreferencesLoaded', this.onPreferencesLoaded, this);
    }
    onDetach() {
        window.removeEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener, true);
        engine.off('InputContextChanged', this.onActiveContextChanged, this);
        engine.off('InputActionBinded', this.onInputActionBinded, this);
        engine.off('InputPreferencesLoaded', this.onPreferencesLoaded, this);
        super.onDetach();
    }
    onActiveContextChanged() {
        this.updateGate.call('onActiveContextChanged');
    }
    onInputActionBinded() {
        this.updateGate.call('onInputActionBinded');
    }
    onPreferencesLoaded() {
        this.updateGate.call('onPreferencesLoaded');
    }
    onActiveDeviceTypeChanged() {
        // Ignore event.detail.gamepadActive payload as the environment will query current input device.
        this.updateGate.call('onActiveDeviceTypeChanged');
    }
    refreshContainers() {
        while (this.Root.hasChildNodes()) {
            this.Root.removeChild(this.Root.lastChild);
        }
        this.iconElement = undefined;
        this.textHelp = undefined;
        if (ActionHandler.isGamepadActive) {
            this.iconElement = document.createElement("div");
            this.iconElement.classList.add("relative");
            this.label.classList.add('mx-1');
            this.Root.append(this.iconElement, this.label, this.iconStartText);
        }
        else {
            this.textHelp = document.createElement('div');
            this.textHelp.classList.add('self-stretch', 'mx-1');
            this.Root.append(this.textHelp, this.label);
        }
    }
    onAttributeChanged(name, _oldValue, newValue) {
        if (name == "action-key") {
            if (newValue != this.actionKey) {
                this.actionKey = newValue;
                this.updateGate.call('onAttributeChanged');
            }
        }
        else if (name = "decoration-mode") {
            if (newValue != this.decorationMode && [DecorationMode.NONE, DecorationMode.BORDER].includes(newValue)) {
                this.decorationMode = newValue;
                this.updateGate.call('onAttributeChanged');
            }
        }
        else if (name == "alt-action-key") {
            if (newValue != this.altActionKey) {
                this.altActionKey = newValue;
            }
        }
        else if (this.label && name == "caption") {
            if (newValue) {
                this.label.setAttribute('data-l10n-id', newValue);
            }
            else {
                this.label.removeAttribute('data-l10n-id');
            }
            this.updateGate.call('onAttributeChanged');
        }
    }
    onUpdate() {
        const prevState = this.prevState;
        const actionName = FxsNavHelp.getGamepadActionName(this.actionKey);
        const actionId = actionName ? Input.getActionIdByName(actionName) : null;
        const isAllowed = actionId != null && Input.isActionAllowed(actionId, Input.getActiveContext());
        const isIconTextSpace = this.Root.getAttribute('is-icon-text-space') == 'true';
        if (this.Root.getAttribute('hide-if-not-allowed') == 'true' && !isAllowed) {
            this.Root.style.display = 'none';
        }
        else {
            this.Root.style.display = '';
        }
        if (prevState.isGamepadActive != ActionHandler.isGamepadActive) {
            prevState.isGamepadActive = ActionHandler.isGamepadActive;
            this.refreshContainers();
        }
        let imagePath = "";
        let textHelp = "";
        if (this.actionKey != "") {
            if (ActionHandler.isGamepadActive) {
                //TODO: handle action with no assigned key. Use a default "missing key" icon ?
                imagePath = Icon.getIconFromActionName(FxsNavHelp.getGamepadActionName(this.actionKey)) ?? "";
            }
            else {
                textHelp = getTextHelpForAction(this.actionKey);
            }
        }
        // Try to use alt action key if main key failed
        if ((imagePath == "" || imagePath.includes("icon_mapping_unknown")) && this.altActionKey != "") {
            if (ActionHandler.isGamepadActive) {
                //Try to get a valid action icon from the backup
                imagePath = Icon.getIconFromActionName(FxsNavHelp.getGamepadActionName(this.altActionKey)) ?? "";
            }
        }
        // The this.Root.style.display is handled in the default.scss, cf. .fxs-nav-help occurrences
        // so it must not be handled in this class directly.
        // But we can show/hide sub elements such as this.iconElement and this.textHelp.
        if (this.iconElement) {
            if (imagePath != "") {
                // set the border image and icon image on the same element, this way we can avoid creating extra elements for non bordered nav helps
                if (this.decorationMode === DecorationMode.BORDER) {
                    this.iconElement.style.backgroundImage = `url(${imagePath}), url("fs://game/hud_navhelp_bk.png")`;
                    this.iconElement.style.backgroundRepeat = "no-repeat, no-repeat";
                    this.iconElement.style.backgroundSize = `${ICON_SIZE} auto, ${BORDER_SIZE} auto`;
                    this.iconElement.style.backgroundPosition = `center, ${BORDER_POS_X} ${BORDER_POS_Y}`;
                    this.iconElement.style.width = BORDER_IMAGE_SIZE;
                    this.iconElement.style.height = BORDER_IMAGE_SIZE;
                }
                else {
                    this.iconElement.style.backgroundImage = `url(${imagePath})`;
                    this.iconElement.classList.add('size-8', 'bg-no-repeat', 'bg-contain', 'bg-center');
                }
                this.iconElement.classList.add("justify-center");
                this.iconElement.style.display = "flex";
                this.iconStartText.innerHTML = mapIconToText[imagePath] ?? "";
                this.iconStartText.classList.toggle("hidden", !["ps4_icon_start", "ps4_icon_share"].includes(imagePath));
                this.iconStartText.classList.toggle("bottom-7", !isIconTextSpace);
                this.iconStartText.classList.toggle("absolute", !isIconTextSpace);
                this.iconStartText.classList.toggle("-mb-2\\.5", isIconTextSpace);
                this.iconStartText.classList.toggle("relative", isIconTextSpace);
                this.Root.classList.toggle("flex-col-reverse", ["ps4_icon_start", "ps4_icon_share"].includes(imagePath) && isIconTextSpace);
            }
            else {
                //prevent it from taking up any space when it's empty 
                this.iconElement.style.display = "none";
            }
        }
        if (this.textHelp) {
            if (textHelp != "" && this.label) {
                this.textHelp.innerHTML = textHelp;
                this.textHelp.style.display = "flex";
            }
            else {
                //prevent it from taking up any space when it's empty 
                this.textHelp.style.display = "none";
            }
        }
        if (imagePath != "" && this.caption != "") {
            this.label.setAttribute('data-l10n-id', this.caption);
            this.label.classList.remove('hidden');
        }
        else {
            this.label.removeAttribute('data-l10n-id');
            this.label.classList.add('hidden');
        }
    }
}
Controls.define('fxs-nav-help', {
    createInstance: FxsNavHelp,
    description: 'A container that fills with navigation button icon ',
    classNames: ['fxs-nav-help', 'relative'],
    attributes: [
        {
            name: "action-key",
            description: "The string key that will be converted to platform-specific button image. "
        },
        {
            name: "alt-action-key",
            description: "Backup if the action-key is not valid in the current context"
        },
        {
            name: "decoration-mode",
            description: "none | border"
        },
        {
            name: 'caption'
        },
        {
            name: "is-icon-text-space",
            description: "is the icon text going to extend the width & height of the nav help",
        }
    ]
});
export { FxsNavHelp as default };

//# sourceMappingURL=file:///core/ui/components/fxs-nav-help.js.map
