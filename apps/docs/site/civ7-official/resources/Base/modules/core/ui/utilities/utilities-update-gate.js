/**
 * utilities-update-gate.ts
 * @copyright 2022-2024, Firaxis Games
 * @description Utility class serves to easily implement an update() function that can only be called once per frame
 */
export default class UpdateGate {
    /// What triggered this update.
    get callTriggers() {
        return this.callers.toString();
    }
    /**
     * @param updateFunction Actually perform update against any queued calls.
     */
    constructor(updateFunction) {
        // Tracks the request id from the last requestAnimationFrame calls to prevent duplicate calls
        this.updateRequest = 0;
        // Store the strings passed into call(caller: string) so we can track who requested updates most recently
        this.callers = [];
        this.updateHandler = () => {
            console.error('utilities-update-gate: Attempted to call before valid update function was set!');
        };
        this.updateHandler = () => {
            const p = UI.beginProfiling(`UpdateGate-${this.callers.toString()}`);
            updateFunction();
            UI.endProfiling(p);
            // After the function has been updated then clear out stats.
            // Don't do thie beforehand because the updateFunction may want to display this
            // information as an error if it fails.
            this.updateRequest = 0;
            this.callers = [];
        };
    }
    /**
     * Queue a request to call the update function during the next animation frame
     * @param caller A string used to identify where this call request is coming from. Ideally unique between call locations.
     */
    call(caller) {
        if (caller != '') {
            this.callers.push(caller);
        }
        else {
            console.error('utilities-update-gate: Invalid/empty caller string passed into call()!');
            return;
        }
        if (this.updateRequest == 0) {
            this.updateRequest = window.requestAnimationFrame(this.updateHandler);
        }
    }
}

//# sourceMappingURL=file:///core/ui/utilities/utilities-update-gate.js.map
