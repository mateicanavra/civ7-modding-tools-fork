/**
 * @file view-placement.ts
 * @copyright 2021 - 2024, Firaxis Games
 * @description The view when placing an object on a map (e.g., build, selecting plot, etc...)
 */
import ViewManager, { UISystem } from '/core/ui/views/view-manager.js';
export class PlacementView {
    getName() { return "Placement"; }
    getInputContext() { return InputContext.World; }
    getHarnessTemplate() { return "placement"; }
    enterView() {
    }
    exitView() {
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
            { name: "city-banners", type: UISystem.World, visible: "false" },
            { name: "district-health-bars", type: UISystem.World, visible: "false" },
            { name: "plot-icons", type: UISystem.World, visible: "true" },
            { name: "plot-tooltips", type: UISystem.World, visible: "true" },
            { name: "plot-vfx", type: UISystem.World, visible: "true" },
            { name: "unit-flags", type: UISystem.World, visible: "false" },
            { name: "small-narratives", type: UISystem.World, visible: "false" }
        ];
    }
}
ViewManager.addHandler(new PlacementView());
//# sourceMappingURL=file:///base-standard/ui/views/view-placement.js.map
