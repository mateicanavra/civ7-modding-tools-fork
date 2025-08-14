/**
 * @file view-reinforcement.ts
 * @copyright 2023, Firaxis Games
 * @description Commander Reinforcement View
 */
import { UISystem } from '/core/ui/views/view-manager.js';
import ViewManager from '/core/ui/views/view-manager.js';
export class ReinforcementView {
    /// IGameView
    getName() { return "Reinforcement"; }
    getInputContext() { return InputContext.World; }
    getHarnessTemplate() { return ""; }
    /// IGameView
    enterView() {
    }
    /// IGameView
    exitView() {
    }
    /// IGameView
    addEnterCallback(_func) {
        // add callback here, if it needs a callback (don't forget to call in enterView)
    }
    /// IGameView
    addExitCallback(_func) {
        // add callback here, if it needs a callback (don't forget to call in exitView)
    }
    getRules() {
        return [
            { name: "harness", type: UISystem.HUD, visible: "false" },
            { name: "city-banners", type: UISystem.World, visible: "true" },
            { name: "district-health-bars", type: UISystem.World, visible: "true" },
            { name: "plot-icons", type: UISystem.World, visible: "false" },
            { name: "plot-tooltips", type: UISystem.World, visible: "false" },
            { name: "plot-vfx", type: UISystem.World, visible: "false" },
            { name: "unit-flags", type: UISystem.World, visible: "true" },
            { name: "unit-info-panel", type: UISystem.World, visible: "false" },
            { name: "small-narratives", type: UISystem.World, visible: "false" },
            { name: "world", type: UISystem.Events, selectable: true }
        ];
    }
}
ViewManager.addHandler(new ReinforcementView());
//# sourceMappingURL=file:///base-standard/ui/views/view-reinforcement.js.map
