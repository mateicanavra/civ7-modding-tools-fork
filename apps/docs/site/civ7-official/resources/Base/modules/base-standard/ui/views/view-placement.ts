/**
 * @file view-placement.ts
 * @copyright 2021 - 2024, Firaxis Games
 * @description The view when placing an object on a map (e.g., build, selecting plot, etc...)
 */

import ViewManager, { IGameView, ViewCallback, ViewRules, UISystem } from '/core/ui/views/view-manager.js';

export class PlacementView implements IGameView {
	getName(): string { return "Placement"; }

	getInputContext(): InputContext { return InputContext.World; }

	getHarnessTemplate(): string { return "placement"; }

	enterView() {
	}

	exitView() {
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