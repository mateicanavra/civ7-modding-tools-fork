/**
 * @file view-world.ts
 * @copyright 2021-2024, Firaxis Games
 * @description The most common view for when playing the default game, exploring the world.
 */
import ViewManager, { UISystem } from '/core/ui/views/view-manager.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
import ActionHandler, { ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';
import DiploRibbonData from '/base-standard/ui/diplo-ribbon/model-diplo-ribbon.js';
import { RibbonStatsToggleStatus, UpdateDiploRibbonEvent } from '/base-standard/ui/diplo-ribbon/model-diplo-ribbon.js';
export class WorldView {
    constructor() {
        this.deviceTypeChangedListener = this.onDeviceTypeChanged.bind(this);
    }
    getName() { return "World"; }
    getInputContext() { return InputContext.World; }
    getHarnessTemplate() { return "world"; }
    enterView() {
        ViewManager.getHarness()?.classList.add("trigger-nav-help");
        window.addEventListener(ActiveDeviceTypeChangedEventName, this.deviceTypeChangedListener);
    }
    exitView() {
        ViewManager.getHarness()?.classList.remove("trigger-nav-help");
        window.removeEventListener(ActiveDeviceTypeChangedEventName, this.deviceTypeChangedListener);
    }
    addEnterCallback(_func) {
        // add callback here, if it needs a callback (don't forget to call in enterView)
    }
    addExitCallback(_func) {
        // add callback here, if it needs a callback (don't forget to call in exitView)
    }
    getRules() {
        return [
            { name: "harness", type: UISystem.HUD, visible: "true" },
            { name: "city-banners", type: UISystem.World, visible: "true" },
            { name: "district-health-bars", type: UISystem.World, visible: "true" },
            { name: "plot-icons", type: UISystem.World, visible: "true" },
            { name: "plot-tooltips", type: UISystem.World, visible: "true" },
            { name: "plot-vfx", type: UISystem.World, visible: "false" },
            { name: "unit-flags", type: UISystem.World, visible: "true" },
            { name: "unit-info-panel", type: UISystem.World, visible: "true" },
            { name: "small-narratives", type: UISystem.World, visible: "true" },
            { name: "units", type: UISystem.Events, selectable: true },
            { name: "cities", type: UISystem.Events, selectable: true },
            { name: "radial-selection", type: UISystem.Events, selectable: true },
            { name: "world-input", type: UISystem.World, selectable: true },
        ];
    }
    handleLoseFocus() {
        ViewManager.getHarness()?.classList.remove("trigger-nav-help");
        if (ActionHandler.isGamepadActive) {
            window.dispatchEvent(new CustomEvent('ui-hide-plot-vfx', { bubbles: false }));
        }
    }
    handleReceiveFocus() {
        NavTray.clear();
        FocusManager.SetWorldFocused();
        ViewManager.getHarness()?.classList.add("trigger-nav-help");
        window.dispatchEvent(new CustomEvent('ui-show-plot-vfx', { bubbles: false }));
    }
    readInputEvent(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return true;
        }
        if (!ContextManager.isEmpty) {
            return true;
        }
        switch (inputEvent.detail.name) {
            case 'toggle-diplo':
                DiploRibbonData.userDiploRibbonsToggled = DiploRibbonData.userDiploRibbonsToggled == RibbonStatsToggleStatus.RibbonStatsShowing ? RibbonStatsToggleStatus.RibbonStatsHidden : RibbonStatsToggleStatus.RibbonStatsShowing;
                window.dispatchEvent(new UpdateDiploRibbonEvent());
                return false;
            case 'toggle-quest':
                const questList = document.querySelector("quest-list");
                questList?.component.listVisibilityToggle();
                return false;
            case 'toggle-chat':
                const miniMap = document.querySelector(".mini-map");
                miniMap?.component.toggleChatPanel();
                return false;
            case 'open-lens-panel':
                const miniMapComponent = document.querySelector(".mini-map");
                miniMapComponent?.component.toggleLensPanel();
                return false;
            case 'navigate-yields':
                ContextManager.push("player-yields-report-screen", { singleton: true, createMouseGuard: true });
                return false;
            case 'notification':
                window.dispatchEvent(new Event('focus-notifications'));
                return false;
        }
        return true;
    }
    onDeviceTypeChanged(event) {
        if (event.detail.gamepadActive && !ContextManager.isEmpty) {
            window.dispatchEvent(new CustomEvent('ui-hide-plot-vfx'));
        }
        else {
            window.dispatchEvent(new CustomEvent('ui-show-plot-vfx'));
        }
        if (!event.detail.gamepadActive) {
            DiploRibbonData.userDiploRibbonsToggled = RibbonStatsToggleStatus.RibbonStatsHidden;
            window.dispatchEvent(new UpdateDiploRibbonEvent());
        }
    }
}
ViewManager.addHandler(new WorldView());

//# sourceMappingURL=file:///base-standard/ui/views/view-world.js.map
