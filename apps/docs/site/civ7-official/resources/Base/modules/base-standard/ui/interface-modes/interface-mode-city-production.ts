/**
 * @file interface-mode-city-production.ts
 * @copyright 2022, Firaxis Games
 * @description Interface mode to handle visualization when a viewing city production
 */

import { CityDecorationSupport } from '/base-standard/ui/interface-modes/support-city-decoration.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js'
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js'

interface CityProductionInterfaceModeContext extends InterfaceMode.Context {
	CityID: ComponentID;
}

class CityProductionInterfaceMode implements InterfaceMode.Handler {

	private requestedCityID: ComponentID | null = null;
	private citySelectionChangedListener = (data: CitySelectionChangedData) => { this.onCitySelectionChanged(data); }

	constructor() {
		CityDecorationSupport.manager.initializeOverlay();
	}

	canEnterMode(context?: object): boolean {
		const cityProductionContext = context as CityProductionInterfaceModeContext;
		if (cityProductionContext == undefined) {
			console.error("Failed to pass context object into the CityProductionInterfaceMode context!");
			return false;
		}
		if (cityProductionContext.CityID == undefined || ComponentID.isInvalid(cityProductionContext.CityID)) {
			console.error("Failed to pass CityID into the CityProductionInterfaceMode context!");
			return false;
		}
		return true;
	}

	transitionTo(_oldMode: InterfaceMode.ModeId, _newMode: InterfaceMode.ModeId, context?: object) {
		this.requestedCityID = null;

		const cityProductionContext = context as CityProductionInterfaceModeContext;
		if (cityProductionContext == undefined) {
			console.error("Failed to pass context object into the CityProductionInterfaceMode context!");
			return;
		}
		if (cityProductionContext.CityID == undefined || ComponentID.isInvalid(cityProductionContext.CityID)) {
			console.error("Failed to pass CityID into the CityProductionInterfaceMode context!");
			return;
		}

		this.requestedCityID = cityProductionContext.CityID;
		this.updateDisplay();

		engine.on('CitySelectionChanged', this.citySelectionChangedListener);
	}

	private updateDisplay() {
		if (ComponentID.isValid(this.requestedCityID)) {
			CityDecorationSupport.manager.decoratePlots(this.requestedCityID);
		}
		else {
			console.error("Failed find a head city in CityProductionInterfaceMode.updateDisplay().");
		}
	}

	private onCitySelectionChanged(data: CitySelectionChangedData) {
		this.requestedCityID = UI.Player.getHeadSelectedCity();	// Will be null if not selected
		if (data.selected) {
			this.updateDisplay();
		}
	}

	transitionFrom(_oldMode: InterfaceMode.ModeId, _newMode: InterfaceMode.ModeId) {
		CityDecorationSupport.manager.clearDecorations();
		engine.off('CitySelectionChanged', this.citySelectionChangedListener);
	}
}

InterfaceMode.addHandler('INTERFACEMODE_CITY_PRODUCTION', new CityProductionInterfaceMode());