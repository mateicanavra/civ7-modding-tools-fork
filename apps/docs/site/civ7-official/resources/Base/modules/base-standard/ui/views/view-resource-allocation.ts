/**
 * @file view-resource-allocation.ts
 * @copyright 2021, Firaxis Games
 * @description Resource Allocation View
 */

import { IGameView, ViewCallback, ViewRules, UISystem } from '/core/ui/views/view-manager.js';
import ViewManager from '/core/ui/views/view-manager.js';

export class ResourceAllocationView implements IGameView {

	/// IGameView
	getName(): string { return "ResourceAllocation"; }

	getInputContext(): InputContext { return InputContext.Shell; }

	getHarnessTemplate(): string { return "resource-allocation"; }

	/// IGameView
	enterView() {
	}

	/// IGameView
	exitView() {
		// Do not selected cities here: may be entering mode that requires a
		// selected city (e.g., placement)
	}

	/// IGameView
	addEnterCallback(_func: ViewCallback) {
		// add callback here, if it needs a callback (don't forget to call in enterView)
	}

	/// IGameView
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
			{ name: "unit-flags", type: UISystem.World, visible: "false" },
			{ name: "unit-info-panel", type: UISystem.World, visible: "false" },
			{ name: "small-narratives", type: UISystem.World, visible: "false" },
			{ name: "world", type: UISystem.Events, selectable: false }
		];
	}

	handleReceiveFocus() {
		const screen: Element | null = document.querySelector('screen-resource-allocation');
		if (screen) {
			screen.dispatchEvent(new CustomEvent('view-receive-focus'));
		} else {
			console.error('view-resource-allocation: View received focus but failed to find screen-resource-allocation!');
		}
	}

	handleLoseFocus() {
		const screen: Element | null = document.querySelector('screen-resource-allocation');
		if (screen) {
			screen.dispatchEvent(new CustomEvent('view-lose-focus'));
		} else {
			console.error('view-resource-allocation: View lost focus but failed to find screen-resource-allocation!');
		}
	}
}

ViewManager.addHandler(new ResourceAllocationView());