/**
 * @file interface-mode-city-purchase.ts
 * @copyright 2022, Firaxis Games
 * @description Interface mode to handle visualization when a city or town is purchasing production
 */

import { CityDecorationSupport } from '/base-standard/ui/interface-modes/support-city-decoration.js';
import { InputEngineEvent } from '/core/ui/input/input-support.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js'
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js'

interface CityPurchaseInterfaceModeContext extends InterfaceMode.Context {
	CityID: ComponentID;
}

class CityPurchaseInterfaceMode implements InterfaceMode.Handler {

	private requestedCityID: ComponentID | null = null;
	private citySelectionChangedListener = () => { this.onCitySelectionChanged(); }

	constructor() {
		CityDecorationSupport.manager.initializeOverlay();
	}

	transitionTo(_oldMode: InterfaceMode.ModeId, _newMode: InterfaceMode.ModeId, context?: object) {
		this.requestedCityID = null;

		const cityPurchaseContext = context as CityPurchaseInterfaceModeContext;
		if (cityPurchaseContext == undefined) {
			console.error("Failed to pass context object into the CityPurchaseInterfaceMode context.");
			InterfaceMode.switchToDefault();
			return;
		}
		if (cityPurchaseContext.CityID == undefined || ComponentID.isInvalid(cityPurchaseContext.CityID)) {
			console.error("Failed to pass CityID into the CityPurchaseInterfaceMode context.");
			InterfaceMode.switchToDefault();
			return;
		}

		this.requestedCityID = cityPurchaseContext.CityID;
		this.updateDisplay();

		engine.on('CitySelectionChanged', this.citySelectionChangedListener);
	}

	private updateDisplay() {

		if (this.requestedCityID != null && ComponentID.isValid(this.requestedCityID)) {
			CityDecorationSupport.manager.decoratePlots(this.requestedCityID);
		}
	}

	private onCitySelectionChanged() {
		let selectedCityID = UI.Player.getHeadSelectedCity();
		if (selectedCityID) {
			this.updateDisplay();
		}
	}

	transitionFrom(_oldMode: InterfaceMode.ModeId, _newMode: InterfaceMode.ModeId) {
		CityDecorationSupport.manager.clearDecorations();

		engine.off('CitySelectionChanged', this.citySelectionChangedListener);
	}

	/** @interface Handler  */
	canEnterMode(parameters: any): boolean {
		const cityID: ComponentID = parameters?.CityID;
		return (cityID && ComponentID.isValid(cityID));
	}

	handleInput(inputEvent: InputEngineEvent): boolean {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return true;
		}

		switch (inputEvent.detail.name) {
			case "shell-action-2":
				InterfaceMode.switchTo("INTERFACEMODE_CITY_PRODUCTION", { CityID: UI.Player.getHeadSelectedCity() });
				return false;
		}

		return true;
	}
}

InterfaceMode.addHandler('INTERFACEMODE_CITY_PURCHASE', new CityPurchaseInterfaceMode());