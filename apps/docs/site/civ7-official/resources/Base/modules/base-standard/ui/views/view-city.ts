/**
 * @file view-city.ts
 * @copyright 2021 - 2024, Firaxis Games
 * @description When viewing a particular city.
 */

import { IGameView, ViewCallback, ViewRules, UISystem } from '/core/ui/views/view-manager.js';
import { InputEngineEvent, InputEngineEventName } from '/core/ui/input/input-support.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import ViewManager from '/core/ui/views/view-manager.js';

export const FocusCityViewEventName = 'focus-city-view' as const;
type FocusCityViewEventDetail = {
	source: 'right' | 'left';
	destination: 'left' | 'left-queue' | 'center' | 'right';
}
export class FocusCityViewEvent extends CustomEvent<FocusCityViewEventDetail> {
	constructor(detail: FocusCityViewEventDetail) {
		super(FocusCityViewEventName, { bubbles: false, detail });
	}
}

export class CityView implements IGameView {

	/// IGameView
	getName(): string { return "City"; }

	getInputContext(): InputContext { return InputContext.Dual; }

	getHarnessTemplate(): string { return "city"; }

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

	/**
	 * @returns true if still live, false if input should stop.
	 */
	readInputEvent(inputEvent: InputEngineEvent): boolean {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			// Ignore everything but FINISH events
			return true;
		}

		if (inputEvent.type != InputEngineEventName) {
			console.warn(`VM: Attempt to handle engine input event failed since '${inputEvent.type}' is not '${InputEngineEventName}'.`);
			return true;
		}

		if (inputEvent.isCancelInput() || inputEvent.detail.name == 'sys-menu') {
			InterfaceMode.switchToDefault();
			return false;
		}

		return true;
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
			{ name: "unit-info-panel", type: UISystem.World, visible: "false" },
			{ name: "small-narratives", type: UISystem.World, visible: "false" },
			{ name: "world", type: UISystem.Events, selectable: false }
		];
	}

	handleReceiveFocus() {

		let panelName: string = "";

		switch (InterfaceMode.getCurrent()) {
			case 'INTERFACEMODE_CITY_PURCHASE':
			case 'INTERFACEMODE_CITY_PRODUCTION':
				const selectedCityID: ComponentID | null = UI.Player.getHeadSelectedCity();
				if (!selectedCityID) {
					return;
				}

				const city: City | null = Cities.get(selectedCityID);
				if (!city) {
					return;
				}

				if (city.isJustConqueredFrom || city.isBeingRazed) {
					panelName = "panel-city-capture-chooser";
				} else {
					panelName = 'panel-production-chooser';
				}

				break;
			default:
				console.error('view-city: view received focus but interface mode is not handled');
		}

		if (panelName) {
			const panel = document.querySelector(panelName);

			if (panel) {
				panel.dispatchEvent(new CustomEvent('view-receive-focus'));
			} else {
				console.error(`view-city: handleReceiveFocus could not find panel "${panelName}"`);
			}
		}
	}
}

ViewManager.addHandler(new CityView());

declare global {
	interface WindowEventMap {
		'focus-city-view': FocusCityViewEvent;
	}
}