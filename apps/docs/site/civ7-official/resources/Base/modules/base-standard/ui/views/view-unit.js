/**
 * @file view-unit.ts
 * @copyright 2021-2023, Firaxis Games
 * @description When viewing a particular unit.
 */
import ViewManager, { UISystem } from '/core/ui/views/view-manager.js';
export class UnitView {
    getName() { return "Unit"; }
    getInputContext() { return InputContext.Unit; }
    getHarnessTemplate() { return "world"; }
    enterView() {
        ViewManager.getHarness()?.querySelector(".action-panel")?.classList.add("trigger-nav-help");
    }
    exitView() {
        ViewManager.getHarness()?.querySelector(".action-panel")?.classList.remove("trigger-nav-help");
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
            { name: "plot-vfx", type: UISystem.World, visible: "true" },
            { name: "unit-flags", type: UISystem.World, visible: "true" },
            { name: "unit-info-panel", type: UISystem.World, visible: "true" },
            { name: "small-narratives", type: UISystem.World, visible: "true" },
            { name: "radial-selection", type: UISystem.Events, selectable: true },
        ];
    }
    handleReceiveFocus() {
        const unitInfoPanel = document.querySelector('unit-actions');
        if (unitInfoPanel) {
            unitInfoPanel.dispatchEvent(new CustomEvent('view-received-focus'));
        }
    }
}
ViewManager.addHandler(new UnitView());
//# sourceMappingURL=file:///base-standard/ui/views/view-unit.js.map
