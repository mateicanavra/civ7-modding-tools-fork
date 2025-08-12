/**
 * @file model-navigation-tray.ts
 * @copyright 2020-2022, Firaxis Games
 * @description Shows the button-hotkey association for activating items in a confined "tray" area.
 */
import ActionHandler, { ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';
import { Icon } from '/core/ui/utilities/utilities-image.js';
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js';
export var NavigationTrayOrientation;
(function (NavigationTrayOrientation) {
    NavigationTrayOrientation[NavigationTrayOrientation["Column"] = 0] = "Column";
    NavigationTrayOrientation[NavigationTrayOrientation["Row"] = 1] = "Row";
})(NavigationTrayOrientation || (NavigationTrayOrientation = {}));
const PS4_OPTIONS_TEXT = "OPTIONS";
const PS4_SHARE_TEXT = "SHARE";
const mapIconToText = {
    "ps4_icon_start": PS4_OPTIONS_TEXT,
    "ps4_icon_share": PS4_SHARE_TEXT,
};
class NavigationTrayModel {
    constructor() {
        // Will be connected to the input system. 
        this.isGamepadActive = false;
        this.activeDeviceTypeListener = (event) => { this.onActiveDeviceTypeChanged(event); };
        /** Map of actions keyed by the input action with value for the desired loc key */
        this.actions = new Map();
        this.entries = []; // Acts as a map with NavigationTrayEntry.icon as unique keys
        this.updateGate = new UpdateGate(() => {
            this.update();
        });
        engine.whenReady.then(() => {
            this.isGamepadActive = ActionHandler.isGamepadActive;
            window.addEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener);
            engine.on('InputContextChanged', this.onActiveContextChanged, this);
            engine.on('InputActionBinded', this.onInputActionBinded, this);
        });
    }
    get isTrayRequired() {
        return this.isGamepadActive;
    }
    get isTrayActive() {
        return this.isTrayRequired && !this.isEmpty();
    }
    isEmpty() {
        return this.entries.length == 0;
    }
    set updateCallback(callback) {
        this.onUpdate = callback;
    }
    addOrUpdateGenericAccept() {
        this.addOrUpdateAccept("LOC_GENERIC_ACCEPT");
    }
    removeGenericAccept() {
        this.removeAccept();
    }
    addOrUpdateGenericOK() {
        this.addOrUpdateAccept("LOC_GENERIC_OK");
    }
    removeGenericOK() {
        this.removeAccept();
    }
    addOrUpdateGenericSelect() {
        this.addOrUpdateAccept("LOC_GENERIC_SELECT");
    }
    addOrUpdateGenericDeselect() {
        this.addOrUpdateAccept("LOC_GENERIC_DESELECT");
    }
    removeGenericSelect() {
        this.removeAccept();
    }
    addOrUpdateGenericBack() {
        this.addOrUpdateCancel("LOC_GENERIC_BACK");
    }
    removeGenericBack() {
        this.removeCancel();
    }
    addOrUpdateGenericCancel() {
        this.addOrUpdateCancel("LOC_GENERIC_CANCEL");
    }
    removeGenericCancel() {
        this.removeCancel();
    }
    addOrUpdateGenericClose() {
        this.addOrUpdateCancel("LOC_GENERIC_CLOSE");
    }
    removeGenericClose() {
        this.removeCancel();
    }
    //---
    addOrUpdateAccept(key) {
        this.addOrUpdateEntry(key, "accept");
    }
    removeAccept() {
        this.removeEntry("accept");
    }
    addOrUpdateCancel(key) {
        this.addOrUpdateEntry(key, "cancel");
    }
    removeCancel() {
        this.removeEntry("cancel");
    }
    addOrUpdateShellAction1(key) {
        this.addOrUpdateEntry(key, "shell-action-1");
    }
    removeShellAction1() {
        this.removeEntry("shell-action-1");
    }
    addOrUpdateShellAction2(key) {
        this.addOrUpdateEntry(key, "shell-action-2");
    }
    removeShellAction2() {
        this.removeEntry("shell-action-2");
    }
    addOrUpdateShellAction3(key) {
        this.addOrUpdateEntry(key, "shell-action-3");
    }
    removeShellAction3() {
        this.removeEntry("shell-action-3");
    }
    addOrUpdateNextAction(key) {
        this.addOrUpdateEntry(key, "next-action");
    }
    removeNextAction() {
        this.removeEntry("next-action");
    }
    addOrUpdateNavPrevious(key) {
        this.addOrUpdateEntry(key, "nav-previous");
    }
    removeNavPrevious() {
        this.removeEntry("nav-previous");
    }
    addOrUpdateNavNext(key) {
        this.addOrUpdateEntry(key, "nav-next");
    }
    removeNavNext() {
        this.removeEntry("nav-next");
    }
    addOrUpdateNavShellPrevious(key) {
        this.addOrUpdateEntry(key, "nav-shell-previous");
    }
    removeNavShellPrevious() {
        this.removeEntry("nav-shell-previous");
    }
    addOrUpdateNavShellNext(key) {
        this.addOrUpdateEntry(key, "nav-shell-next");
    }
    removeNavShellNext() {
        this.removeEntry("nav-shell-next");
    }
    addOrUpdateNavMove(key) {
        this.addOrUpdateEntry(key, "nav-move");
    }
    removeNavMove() {
        this.removeEntry("nav-move");
    }
    addOrUpdateNavBeam(key) {
        this.addOrUpdateEntry(key, "nav-beam");
    }
    removeNavBeam() {
        this.removeEntry("nav-beam");
    }
    addOrUpdateToggleTooltip(key) {
        this.addOrUpdateEntry(key, "toggle-tooltip");
    }
    removeToggleTooltip() {
        this.removeEntry("toggle-tooltip");
    }
    addOrUpdateCameraPan(key) {
        this.addOrUpdateEntry(key, "camera-pan");
    }
    removeCameraPan() {
        this.removeEntry("camera-pan");
    }
    addOrUpdateSysMenu(key) {
        this.addOrUpdateEntry(key, "sys-menu");
    }
    addOrUpdateCenterPlotCursor(key) {
        this.addOrUpdateEntry(key, 'center-plot-cursor');
    }
    addOrUpdateNotification(key) {
        this.addOrUpdateEntry(key, "notification");
    }
    removeSysMenu() {
        this.removeEntry("sys-menu");
    }
    addOrUpdateEntry(key, action) {
        this.actions.set(action, key);
        this.updateGate.call('addOrUpdateEntry');
    }
    removeEntry(action) {
        this.actions.delete(action);
        this.updateGate.call('removeEntry');
    }
    clear() {
        this.actions.clear();
        this.updateGate.call('clear');
    }
    update() {
        this.entries = [];
        for (const action of this.actions) {
            const icon = Icon.getIconFromActionName(action[0], InputDeviceType.Controller);
            if (!icon) {
                console.error("model-navigation-tray: update(): Invalid icon to add this entry (action: " + action[0] + ")");
                continue;
            }
            let text = "";
            if (["ps4_icon_start", "ps4_icon_share"].includes(icon)) {
                text = mapIconToText[icon] ?? "";
            }
            this.entries.push({ description: Locale.compose(action[1]), icon: icon, text, action: action[0] });
        }
        if (this.onUpdate) {
            this.onUpdate(this);
        }
    }
    onActiveDeviceTypeChanged(event) {
        this.isGamepadActive = event.detail?.gamepadActive;
        this.updateGate.call('onActiveDeviceTypeChanged');
    }
    onActiveContextChanged() {
        this.updateGate.call('onActiveContextChanged');
    }
    onInputActionBinded() {
        this.updateGate.call('onInputActionBinded');
    }
}
const NavTray = new NavigationTrayModel();
engine.whenReady.then(() => {
    const updateModel = () => {
        engine.updateWholeModel(NavTray);
    };
    engine.createJSModel('g_NavTray', NavTray);
    NavTray.updateCallback = updateModel;
    engine.synchronizeModels();
});
export { NavTray as default };

//# sourceMappingURL=file:///core/ui/navigation-tray/model-navigation-tray.js.map
