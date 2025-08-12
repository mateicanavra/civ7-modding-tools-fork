/**
 * @file city-selection.ts
 * @copyright 2020-2022, Firaxis Games
 * @description Handles interface mode activation when a city is
 * selected. UI for a selected city is handled in other files
 */

import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';

// TODO: Consider moving this into a file with a more generic name for helpers (e.g., city-support.ts)
export namespace City {

	/**
	 * Helper, determine if a queue is empty
	 * @param {ComponentID} cityID target city.
	 * @returns true if queue is empty
	 */
	export function isQueueEmpty(cityID: ComponentID | null): boolean {
		if (cityID && ComponentID.isValid(cityID)) {
			const city: City | null = Cities.get(cityID);
			if (city) {
				const numItemsInQueue: number = city.BuildQueue!.getQueue().length;
				return (numItemsInQueue == 0)
			} else {
				console.error(`Unable to determine if city queue is empty. city: '${ComponentID.toLogString(cityID)}'.`);
			}
		}
		return true;
	}

	/**
	 * Helper, is this city a "town"
	 * @param {ComponentID} cityID to check out.
	 * @returns true if city is currently a "town"
	 */
	export function isTown(cityID: ComponentID | null): boolean {
		if (cityID && ComponentID.isValid(cityID)) {
			const city: City | null = Cities.get(cityID);
			if (city) {
				return city.isTown;
			}
		}
		return false;
	}
}


export class CitySelection {

	private location: HEXVec_i = { i: -1, j: -1 };

	constructor() {
		engine.whenReady.then(() => { this.onReady(); });
	}

	onReady() {
		engine.on('CitySelectionChanged', (data: CitySelectionChangedData) => { this.onCitySelectionChanged(data) });
	}

	/**
	 * EVENT: selection has changed for a city in the game
	 * @param data 
	 * @returns 
	 */
	onCitySelectionChanged(data: CitySelectionChangedData) {
		let selectedCityID: ComponentID | null = UI.Player.getHeadSelectedCity();
		if (data.selected == false) {
			if (selectedCityID == null) {
				// We've unselected any city so do Unselect
				this.doUnselect();
				return;
			} else {
				// We've unselected the previous city but a new one is selected
				// Wait for event for new selected city
				return;
			}
		}

		this.location = data.location;
		this.doSelect(data.cityID);

		let localPlayer = GameContext.localPlayerID;
		if (selectedCityID) {
			const c = Cities.get(selectedCityID);
			if (!c || c.isTown || c.owner != localPlayer) {
				selectedCityID = null;
			}
		}
	}

	/**
	 * Select a city.
	 * @param {ComponentID} cityID City to be selected
	 */
	private doSelect(cityID: ComponentID) {
		let city: City | null = Cities.get(cityID);
		if (city == null) {
			console.error("Attempt to select a city but none found for cid: ", ComponentID.toLogString(cityID));
			return;
		}
		// Sanity checK:
		if (this.location.i != city.location.x || this.location.j != city.location.y) {
			console.warn("City selection event fired but the location (" + this.location.i + "," + this.location.j + ") is different from the city location (" + city.location.x + "," + city.location.y + ")");
		}

		if (this.shouldSwitchToCityView()) {
			// City production is the first step to enter the city view
			InterfaceMode.switchTo('INTERFACEMODE_CITY_PRODUCTION', { CityID: cityID });
		}
	}

	/**
	 * Determine if we should switch to INTERFACEMODE_CITY_PROUDCTION based on our
	 * current interface mode or stay in the current one
	 * @returns {boolean} If yes, we should switch to INTERFACEMODE_CITY_PROUDCTION
	 */
	private shouldSwitchToCityView(): boolean {
		switch (InterfaceMode.getCurrent()) {
			case 'INTERFACEMODE_CITY_PRODUCTION':
			case 'INTERFACEMODE_CITY_PURCHASE':
			case 'INTERFACEMODE_RESOURCE_ALLOCATION':
				return false;
		}

		return true;
	}

	/** Deselect a city */
	private doUnselect() {
		if (this.location.i < 0 || this.location.j < 0) {
			console.warn("Unselecting a city but existing selection is invalid (" + this.location.i + "," + this.location.j + ")");
		}

		InterfaceMode.switchToDefault();
		this.location = { i: -1, j: -1 };
	}
}

const citySelection: CitySelection = new CitySelection();
export { citySelection as default };