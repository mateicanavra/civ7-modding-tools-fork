/**
 * @file view-diplomacy.ts
 * @copyright 2021-2024, Firaxis Games
 * @description Entering diplomatic conversations.
 */
import { UISystem } from '/core/ui/views/view-manager.js';
import { InputEngineEventName } from '/core/ui/input/input-support.js';
import DiplomacyManager, { DiplomacyInputPanel } from '/base-standard/ui/diplomacy/diplomacy-manager.js';
import ViewManager from '/core/ui/views/view-manager.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';
export class DiplomacyView {
    getName() { return "Diplomacy"; }
    getInputContext() { return InputContext.Shell; }
    getHarnessTemplate() { return "diplomacy"; }
    enterView() {
        Audio.playSound("data-audio-showing", "leader-panel");
    }
    exitView() {
    }
    addEnterCallback(_func) {
        // add callback here, if it needs a callback (don't forget to call in enterView)
    }
    addExitCallback(_func) {
        // add callback here, if it needs a callback (don't forget to call in exitView)
    }
    /**
     * @returns true if still live, false if input should stop.
     */
    readInputEvent(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return true;
        }
        if (inputEvent.detail.name == "cancel" || inputEvent.detail.name == "keyboard-escape") {
            Audio.playSound("data-audio-hiding", "leader-panel");
        }
        if (inputEvent.type != InputEngineEventName) {
            console.warn(`VM: Attempt to handle engine input event failed since '${inputEvent.type}' is not '${InputEngineEventName}'.`);
            return true;
        }
        let isLive = true;
        // First check to see if there is a modal in front of the diplomacy screens to close
        const screens = this.getCurrentScreens();
        for (let i = 0; i < screens.length; i++) {
            const screen = screens[i];
            if (screen instanceof ComponentRoot) {
                if (screen.component instanceof DiplomacyInputPanel) {
                    isLive = screen.component.handleInput(inputEvent);
                }
                if (!isLive) {
                    return false;
                }
            }
        }
        // If we are still 'live' here than no diplomacy 'screens' are open and we can check for open panels to close
        const panels = this.getCurrentPanels();
        for (let i = 0; i < panels.length; i++) {
            const panel = panels[i];
            if (panel instanceof ComponentRoot) {
                if (panel.component instanceof DiplomacyInputPanel) {
                    isLive = panel.component.handleInput(inputEvent);
                }
                if (!isLive) {
                    return false;
                }
            }
        }
        return true;
    }
    handleNavigation(navigationEvent) {
        let isLive = true;
        // First check to see if there is a modal in front of the diplomacy screens to close
        const screens = this.getCurrentScreens();
        for (let i = 0; i < screens.length; i++) {
            const screen = screens[i];
            if (screen instanceof ComponentRoot) {
                if (screen.component instanceof DiplomacyInputPanel) {
                    isLive = screen.component.handleNavigation(navigationEvent);
                }
                if (!isLive) {
                    return false;
                }
            }
        }
        // If we are still 'live' here than no diplomacy 'screens' are open and we can check for open panels to close
        const panels = this.getCurrentPanels();
        for (let i = 0; i < panels.length; i++) {
            const panel = panels[i];
            if (panel instanceof ComponentRoot) {
                if (panel.component instanceof DiplomacyInputPanel) {
                    isLive = panel.component.handleNavigation(navigationEvent);
                }
                if (!isLive) {
                    return false;
                }
            }
        }
        return true;
    }
    getRules() {
        return [
            { name: "harness", type: UISystem.HUD, visible: "true" },
            { name: "city-banners", type: UISystem.World, visible: "false" },
            { name: "unit-info-panel", type: UISystem.World, visible: "false" },
            { name: "plot-icons", type: UISystem.World, visible: "false" },
            { name: "plot-tooltips", type: UISystem.World, visible: "false" },
            { name: "plot-vfx", type: UISystem.World, visible: "false" },
            { name: "units", type: UISystem.Events, selectable: false },
            { name: "unit-flags", type: UISystem.World, visible: "false" },
            { name: "small-narratives", type: UISystem.World, visible: "false" },
            { name: "world", type: UISystem.Events, selectable: false },
            { name: "world-input", type: UISystem.World, selectable: false },
            { name: "district-health-bars", type: UISystem.World, visible: "false" },
        ];
    }
    handleReceiveFocus() {
        ViewManager.getHarness()?.classList.add("trigger-nav-help");
        const panels = this.getCurrentPanels();
        panels.forEach(panel => {
            panel.dispatchEvent(new CustomEvent('view-receive-focus'));
        });
    }
    handleLoseFocus() {
        ViewManager.getHarness()?.classList.remove("trigger-nav-help");
        NavTray.clear();
    }
    getCurrentPanels() {
        // This is not a mistake, hub interface mode uses the actions panel and the dialog interface mode uses the hub panel
        // TODO rename the elements so they match the interface mode
        let diplomacyPanels;
        const interMode = InterfaceMode.getCurrent();
        if (DiplomacyManager.isFirstMeetDiplomacyOpen) {
            return document.querySelectorAll(".panel-diplomacy-actions");
        }
        switch (interMode) {
            case "INTERFACEMODE_DIPLOMACY_HUB":
                diplomacyPanels = document.querySelectorAll(".panel-diplomacy-actions");
                break;
            case "INTERFACEMODE_PEACE_DEAL":
                diplomacyPanels = document.querySelectorAll(".panel-diplomacy-peace-deal");
                break;
            case "INTERFACEMODE_CALL_TO_ARMS":
                diplomacyPanels = document.querySelectorAll(".screen-diplomacy-call-to-arms");
                break;
            case "INTERFACEMODE_DIPLOMACY_PROJECT_REACTION":
                diplomacyPanels = document.querySelectorAll(".panel-diplomacy-project-reaction");
                break;
            case "INTERFACEMODE_DIPLOMACY_DIALOG":
                if (document.querySelector("panel-diplomacy-hub")?.classList.contains("hidden")) {
                    diplomacyPanels = document.querySelectorAll(".panel-diplomacy-project-reaction");
                }
                else {
                    diplomacyPanels = document.querySelectorAll("panel-diplomacy-hub");
                }
                break;
            default:
                diplomacyPanels = document.querySelectorAll("panel-diplomacy-hub");
                break;
        }
        return diplomacyPanels;
    }
    getCurrentScreens() {
        return document.querySelectorAll(".screen-diplomacy-target-select");
    }
}
ViewManager.addHandler(new DiplomacyView());
//# sourceMappingURL=file:///base-standard/ui/views/view-diplomacy.js.map
