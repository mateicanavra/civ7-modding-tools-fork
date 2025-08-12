/**
 * @file view-bonus-placement.ts
 * @copyright 2023, Firaxis Games
 * @description The view for the placement part of the advanced start flow.
 */
import { UISystem } from '/core/ui/views/view-manager.js';
import ViewManager from '/core/ui/views/view-manager.js';
export class BonusPlacementView {
    getName() { return "BonusPlacement"; }
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
            { name: "plot-tooltips", type: UISystem.World, visible: "true" },
            { name: "plot-vfx", type: UISystem.World, visible: "true" },
            { name: "unit-flags", type: UISystem.World, visible: "true" },
            { name: "unit-info-panel", type: UISystem.World, visible: "false" },
            { name: "small-narratives", type: UISystem.World, visible: "false" },
            { name: "units", type: UISystem.Events, selectable: false },
            { name: "cities", type: UISystem.Events, selectable: false }
        ];
    }
}
ViewManager.addHandler(new BonusPlacementView());
//# sourceMappingURL=file:///base-standard/ui/views/view-bonus-placement.js.map
