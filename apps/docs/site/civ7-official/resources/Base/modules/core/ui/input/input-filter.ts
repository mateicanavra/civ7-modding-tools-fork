/**
 * @file input-filter.ts
 * @copyright 2025, Firaxis Games
 * @description Input handler for input exceptions.
*/

import { IEngineInputHandler, InputEngineEvent } from "/core/ui/input/input-support.js";

export type InputFilter = {
	inputName: string;
}

class InputFilterSingleton implements IEngineInputHandler {

	private static Instance: InputFilterSingleton; // Singleton
	private _allowFilters: boolean = false; // quick way to turn on/off all filters without deleting them	
	private activeFilters: InputFilter[] = []; // If the name for an input is contained in activeFilters, this manager will block the input

	get allowFilters(): boolean {
		return this._allowFilters;
	}

	set allowFilters(newValue: boolean) {
		if (this._allowFilters != newValue) {
			this._allowFilters = newValue;
		}
	}

	/**
	 * Singleton accessor 
	 */
	static getInstance() {
		if (!InputFilterSingleton.Instance) {
			InputFilterSingleton.Instance = new InputFilterSingleton();
		}
		return InputFilterSingleton.Instance;
	}

	/**
	 * Handles touch inputs
	 * @param {InputEngineEvent} inputEvent An input event
	 * @returns true if the input is still "live" and not yet cancelled.
	 * @implements InputEngineEvent
	*/
	handleInput(inputEvent: InputEngineEvent): boolean {
		const status: InputActionStatuses = inputEvent.detail.status;
		const name: string = inputEvent.detail.name;

		if (status != InputActionStatuses.FINISH) {
			return true;
		}

		// if there are no filters or the filters are not active allow all input to pass
		if (this.activeFilters.length <= 0 || !this.allowFilters) {
			return true;
		}

		const filter: InputFilter | undefined = this.activeFilters.find(filter => filter.inputName == name);
		// filter found -> don't allow the input to pass
		if (filter) {
			return false;
		}

		return true;
	}

	/**
	 * Input filter doesn't handle navigation input events
	 */
	handleNavigation(): boolean {
		return true; // It means the input is still "live" and not yet cancelled
	}

	/**
	 * Adds a filter
	 * @param inputFilter 
	 * @returns true if the filter was added
	 */
	public addInputFilter(inputFilter: InputFilter): boolean {
		const existingEntryIndex: number = this.activeFilters.findIndex(entry => entry.inputName == inputFilter.inputName);
		// if a filter exists don't add it again
		if (existingEntryIndex != -1) {
			return false;
		}

		this.activeFilters.push(inputFilter);
		return true;
	}

	/**
	 * Removes a given filter by name
	 * @param inputFilter the filter to remove
	 * @returns true if the filter was removed
	 */
	public removeInputFilter(inputFilter: InputFilter): boolean {
		const existingEntryIndex: number = this.activeFilters.findIndex(entry => entry.inputName == inputFilter.inputName);
		if (existingEntryIndex == -1) {
			return false;
		}

		this.activeFilters.splice(existingEntryIndex, 1);
		return true;
	}

	/**
	 * Cleanup the manager from all current filters
	 */
	public removeAllInputFilters() {
		this.activeFilters = [];
	}
}

const InputFilterManager = InputFilterSingleton.getInstance();
export { InputFilterManager as default };