/**
 * @file view-screenshot.ts
 * @copyright 2021, Firaxis Games
 * @description Marketing view for screenshots and other non-game functions.
 */
import FocusManager from '/core/ui/input/focus-manager.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import ViewManager, { UISystem } from '/core/ui/views/view-manager.js';
export class ScreenshotView {
    getName() { return "Screenshot"; }
    getInputContext() { return InputContext.World; }
    getHarnessTemplate() { return ""; } // TODO add a proper harness template
    enterView() {
        this.populateHarness();
    }
    // TODO: replace with proper view harness swapping
    populateHarness() {
        const harness = ViewManager.getHarness();
        if (harness == null) {
            console.error("View screenshot: Unable to obtain harness!");
            return;
        }
        // Populate, give focus.
        FocusManager.setFocus(this.addButtonTo(harness, ".top.left", "foo"));
        this.addButtonTo(harness, ".top.center", "bar");
        const quitButton = this.addButtonTo(harness, ".top.right", "Quit");
        quitButton.addEventListener('action-activate', () => {
            InterfaceMode.switchToDefault();
        });
    }
    addButtonTo(harness, classNamesString, caption) {
        const button = document.createElement("fxs-button");
        button.setAttribute("caption", caption);
        const slot = harness.querySelector(classNamesString);
        if (slot) {
            slot.appendChild(button);
        }
        else {
            console.error("view-screenshot: addButtonTo() : Missing slot with '" + classNamesString + "'");
        }
        return button;
    }
    exitView() {
        // TODO: Add World harness back
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
            { name: "small-narratives", type: UISystem.World, visible: "true" }
        ];
    }
}
ViewManager.addHandler(new ScreenshotView());
//# sourceMappingURL=file:///base-standard/ui/views/view-screenshot.js.map
