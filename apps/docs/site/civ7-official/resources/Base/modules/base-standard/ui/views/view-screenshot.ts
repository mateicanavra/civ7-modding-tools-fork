/**
 * @file view-screenshot.ts
 * @copyright 2021, Firaxis Games
 * @description Marketing view for screenshots and other non-game functions.
 */

import FocusManager from '/core/ui/input/focus-manager.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import ViewManager, { IGameView, ViewCallback, ViewRules, UISystem } from '/core/ui/views/view-manager.js';

export class ScreenshotView implements IGameView {
	getName(): string { return "Screenshot"; }

	getInputContext(): InputContext { return InputContext.World; }

	getHarnessTemplate(): string { return ""; } // TODO add a proper harness template

	enterView() {
		this.populateHarness();
	}

	// TODO: replace with proper view harness swapping
	private populateHarness() {
		const harness: HTMLElement | null = ViewManager.getHarness();
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
		})
	}

	private addButtonTo(harness: HTMLElement, classNamesString: string, caption: string): HTMLElement {
		const button: HTMLElement = document.createElement("fxs-button");
		button.setAttribute("caption", caption);

		const slot: HTMLElement | null = harness.querySelector<HTMLElement>(classNamesString);
		if (slot) {
			slot.appendChild(button);
		} else {
			console.error("view-screenshot: addButtonTo() : Missing slot with '" + classNamesString + "'");
		}

		return button;
	}

	exitView() {
		// TODO: Add World harness back
	}

	addEnterCallback(_func: ViewCallback) {
		// add callback here, if it needs a callback (don't forget to call in enterView)
	}

	addExitCallback(_func: ViewCallback) {
		// add callback here, if it needs a callback (don't forget to call in exitView)
	}

	getRules(): ViewRules[] {
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
