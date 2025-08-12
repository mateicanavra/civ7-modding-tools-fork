/**
 * @file view-unit-promotion.ts
 * @copyright 2022-2024, Firaxis Games
 * @description Viewing and assigning unit promotions.
 */

import { IGameView, UISystem, ViewCallback, ViewRules } from '/core/ui/views/view-manager.js';
import ViewManager from '/core/ui/views/view-manager.js';

export class UnitPromotionView implements IGameView {
	getName(): string { return "UnitPromotion"; }

	getInputContext(): InputContext { return InputContext.Dual; }

	getHarnessTemplate(): string { return "unit-promotion"; }

	enterView() {
	}

	exitView() {
	}

	handleReceiveFocus() {
		const promotionPanel = document.querySelector("panel-unit-promotion");
		if (promotionPanel) {
			promotionPanel.dispatchEvent(new CustomEvent('view-receive-focus'));
		}
	}

	handleLoseFocus() {
	}

	addEnterCallback(_func: ViewCallback) {
		//add callback here, if it needs a callback (don't forget to call in enterView)
	}

	addExitCallback(_func: ViewCallback) {
		//add callback here, if it needs a callback (don't forget to call in exitView)
	}

	getRules(): ViewRules[] {
		return [
			{ name: "harness", type: UISystem.HUD, visible: "true" },
			{ name: "city-banners", type: UISystem.World, visible: "false" },
			{ name: "district-health-bars", type: UISystem.World, visible: "false" },
			{ name: "plot-icons", type: UISystem.World, visible: "false" },
			{ name: "plot-tooltips", type: UISystem.World, visible: "false" },
			{ name: "plot-vfx", type: UISystem.World, visible: "true" },
			{ name: "unit-flags", type: UISystem.World, visible: "false" },
			{ name: "small-narratives", type: UISystem.World, visible: "false" },
			{ name: "unit-info-panel", type: UISystem.World, visible: "true" }
		];
	}
}

ViewManager.addHandler(new UnitPromotionView());
