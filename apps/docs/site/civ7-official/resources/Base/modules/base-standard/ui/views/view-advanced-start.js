/**
 * @file view-advanced-start.ts
 * @copyright 2023, Firaxis Games
 * @description The view for behind the advanced start/era change bonus selection.
 */
import { UISystem } from '/core/ui/views/view-manager.js';
import ViewManager from '/core/ui/views/view-manager.js';
export class AdvancedStartView {
    getName() { return "AdvancedStart"; }
    getInputContext() { return InputContext.World; }
    getHarnessTemplate() { return ""; }
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
            { name: "harness", type: UISystem.HUD, visible: "false" },
            { name: "city-banners", type: UISystem.World, visible: "true" },
            { name: "district-health-bars", type: UISystem.World, visible: "true" },
            { name: "plot-icons", type: UISystem.World, visible: "true" },
            { name: "plot-tooltips", type: UISystem.World, visible: "false" },
            { name: "plot-vfx", type: UISystem.World, visible: "false" },
            { name: "unit-flags", type: UISystem.World, visible: "true" },
            { name: "unit-info-panel", type: UISystem.World, visible: "false" },
            { name: "small-narratives", type: UISystem.World, visible: "false" },
            { name: "units", type: UISystem.Events, selectable: false },
            { name: "cities", type: UISystem.Events, selectable: false }
        ];
    }
}
ViewManager.addHandler(new AdvancedStartView());
//# sourceMappingURL=file:///base-standard/ui/views/view-advanced-start.js.map
