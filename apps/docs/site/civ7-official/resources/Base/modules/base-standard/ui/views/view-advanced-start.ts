/**
 * @file view-advanced-start.ts
 * @copyright 2023, Firaxis Games
 * @description The view for behind the advanced start/era change bonus selection.
 */

import { IGameView, ViewCallback, UISystem, ViewRules } from '/core/ui/views/view-manager.js';
import ViewManager from '/core/ui/views/view-manager.js';

export class AdvancedStartView implements IGameView {
	getName(): string { return "AdvancedStart"; }

	getInputContext(): InputContext { return InputContext.World; }

	getHarnessTemplate(): string { return ""; }

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

