/**
 * @file input-filter.ts
 * @copyright 2025, Firaxis Games
 * @description Input handler for input exceptions.
*/
class InputFilterSingleton {
    constructor() {
        this._allowFilters = false; // quick way to turn on/off all filters without deleting them	
        this.activeFilters = []; // If the name for an input is contained in activeFilters, this manager will block the input
    }
    get allowFilters() {
        return this._allowFilters;
    }
    set allowFilters(newValue) {
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
    handleInput(inputEvent) {
        const status = inputEvent.detail.status;
        const name = inputEvent.detail.name;
        if (status != InputActionStatuses.FINISH) {
            return true;
        }
        // if there are no filters or the filters are not active allow all input to pass
        if (this.activeFilters.length <= 0 || !this.allowFilters) {
            return true;
        }
        const filter = this.activeFilters.find(filter => filter.inputName == name);
        // filter found -> don't allow the input to pass
        if (filter) {
            return false;
        }
        return true;
    }
    /**
     * Input filter doesn't handle navigation input events
     */
    handleNavigation() {
        return true; // It means the input is still "live" and not yet cancelled
    }
    /**
     * Adds a filter
     * @param inputFilter
     * @returns true if the filter was added
     */
    addInputFilter(inputFilter) {
        const existingEntryIndex = this.activeFilters.findIndex(entry => entry.inputName == inputFilter.inputName);
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
    removeInputFilter(inputFilter) {
        const existingEntryIndex = this.activeFilters.findIndex(entry => entry.inputName == inputFilter.inputName);
        if (existingEntryIndex == -1) {
            return false;
        }
        this.activeFilters.splice(existingEntryIndex, 1);
        return true;
    }
    /**
     * Cleanup the manager from all current filters
     */
    removeAllInputFilters() {
        this.activeFilters = [];
    }
}
const InputFilterManager = InputFilterSingleton.getInstance();
export { InputFilterManager as default };
//# sourceMappingURL=file:///core/ui/input/input-filter.js.map
