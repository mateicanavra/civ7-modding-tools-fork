/**
 * @file hotkey-manager.ts
 * @copyright 2022-2025, Firaxis Games
 * @description Handles catching keyboard hotkeys and triggering events to handle that hotkey functionality
 */
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import ActionHandler from '/core/ui/input/action-handler.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
import SaveLoadData from '/core/ui/save-load/model-save-load.js';
export class UnitHotkeyEvent extends CustomEvent {
    constructor(eventName) {
        super('unit-hotkey', { detail: { name: eventName }, bubbles: false });
    }
}
export class LayerHotkeyEvent extends CustomEvent {
    constructor(eventName) {
        super('layer-hotkey', { detail: { name: eventName }, bubbles: false });
    }
}
class HotkeyManagerSingleton {
    /**
     * Singleton accessor
     */
    static getInstance() {
        if (!HotkeyManagerSingleton.Instance) {
            HotkeyManagerSingleton.Instance = new HotkeyManagerSingleton();
        }
        return HotkeyManagerSingleton.Instance;
    }
    /**
     * Handles touch inputs
     * @param {InputEngineEvent} inputEvent An input event
     * @returns true if the input is still "live" and not yet cancelled.
     * @implements InputEngineEvent
     */
    handleInput(inputEvent) {
        const status = inputEvent.detail.status;
        if (status == InputActionStatuses.FINISH) {
            const name = inputEvent.detail.name;
            switch (name) {
                case "toggle-frame-stats":
                    Input.toggleFrameStats();
                    return false;
                case "open-techs":
                case "open-civics":
                case "open-traditions":
                case "open-rankings":
                case "open-attributes":
                case "open-greatworks":
                case "open-civilopedia":
                    // Basic hotkeys where a single screen is listening for a single hotkey
                    this.sendHotkeyEvent(name);
                    return false;
                case "unit-ranged-attack":
                case "unit-move":
                case "unit-skip-turn":
                case "unit-sleep":
                case "unit-heal":
                case "unit-fortify":
                case "unit-alert":
                    // Unit hotkeys are grouped so they only need one listener
                    this.sendUnitHotkeyEvent(name);
                    return false;
                case "quick-save":
                    this.quickSave();
                    return false;
                case "quick-load":
                    this.quickLoad();
                    return false;
                case "next-action":
                case "keyboard-enter":
                    this.nextAction();
                    return false;
                case "toggle-grid-layer":
                case "toggle-yields-layer":
                case "toggle-resources-layer":
                    this.sendLayerHotkeyEvent(name);
                    return false;
                case "cycle-next":
                case "cycle-prev":
                    this.sendCycleHotkeyEvent(name);
                    return false;
            }
        }
        return true;
    }
    /**
     * Hotkey manager doesn't handle navigation input events
     */
    handleNavigation() {
        return true; // It means the input is still "live" and not yet cancelled
    }
    /**
     * Sends out an event to window in the style of 'hotkey-{input action name}'
     * @param {String} inputActionName Name of the input action to be appended to 'hotkey-'
     */
    sendHotkeyEvent(inputActionName) {
        if (InterfaceMode.allowsHotKeys()) {
            window.dispatchEvent(new CustomEvent('hotkey-' + inputActionName));
        }
    }
    /**
     * Sends out an event to window for unit interaction hotkeys
     * @param {UnitHotkeyEventName} inputActionName Name of the unit interaction hotkey send through the detail parameter
     */
    sendUnitHotkeyEvent(inputActionName) {
        window.dispatchEvent(new UnitHotkeyEvent(inputActionName));
    }
    /**
     * Sends a cycle hotkey event out based on input context
     * @param inputActionName
     */
    sendCycleHotkeyEvent(inputActionName) {
        if (Input.getActiveContext() == InputContext.Unit) {
            // If this was a unit event, dispatch it as a unit hotkey event
            this.sendUnitHotkeyEvent(inputActionName);
        }
        else if (InterfaceMode.getCurrent() == "INTERFACEMODE_CITY_PRODUCTION") {
            window.dispatchEvent(new CustomEvent(`hotkey-${inputActionName}-city`));
        }
        else if (!ActionHandler.isGamepadActive && Input.getActiveContext() == InputContext.World) {
            // If using keyboard and in the world, allow next/previous on units.
            this.sendUnitHotkeyEvent(inputActionName);
        }
    }
    /**
     * Saves a locally store quick save using basic params
     */
    quickSave() {
        if (ContextManager.canSaveGame() && !ContextManager.hasInstanceOf("screen-save-load")) {
            SaveLoadData.handleQuickSave();
        }
    }
    /**
     * Loads the locally store quick save using basic params
     */
    quickLoad() {
        if (ContextManager.canLoadGame() && !UI.isMultiplayer() && !ContextManager.hasInstanceOf("screen-save-load")) {
            SaveLoadData.handleQuickLoad();
        }
    }
    nextAction() {
        if (InterfaceMode.allowsHotKeys() && !(ContextManager.getTarget("mouse-guard")))
            window.dispatchEvent(new CustomEvent('hotkey-next-action'));
    }
    sendLayerHotkeyEvent(inputActionName) {
        window.dispatchEvent(new LayerHotkeyEvent(inputActionName));
    }
}
const HotkeyManager = HotkeyManagerSingleton.getInstance();
export { HotkeyManager as default };

//# sourceMappingURL=file:///core/ui/input/hotkey-manager.js.map
