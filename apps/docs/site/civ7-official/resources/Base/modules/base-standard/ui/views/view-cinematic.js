/**
 * @file view-cinematic.ts
 * @copyright 2021, Firaxis Games
 * @description The view for cinematics and other full-screen things that don't want other UI showing.
 */
import { UISystem } from '/core/ui/views/view-manager.js';
import ViewManager from '/core/ui/views/view-manager.js';
export class CinematicView {
    getName() { return "Cinematic"; }
    getInputContext() { return InputContext.Shell; }
    getHarnessTemplate() { return "cinematic"; }
    enterView() {
        WorldUI.setUnitVisibility(false);
    }
    exitView() {
        WorldUI.setUnitVisibility(true);
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
            { name: "city-banners", type: UISystem.World, visible: "false" },
            { name: "district-health-bars", type: UISystem.World, visible: "false" },
            { name: "plot-icons", type: UISystem.World, visible: "false" },
            { name: "plot-tooltips", type: UISystem.World, visible: "false" },
            { name: "plot-vfx", type: UISystem.World, visible: "false" },
            { name: "unit-flags", type: UISystem.World, visible: "false" },
            { name: "unit-info-panel", type: UISystem.World, visible: "false" },
            { name: "small-narratives", type: UISystem.World, visible: "false" },
            { name: "units", type: UISystem.Events, selectable: true },
            { name: "cities", type: UISystem.Events, selectable: false },
        ];
    }
}
ViewManager.addHandler(new CinematicView());
//# sourceMappingURL=file:///base-standard/ui/views/view-cinematic.js.map
