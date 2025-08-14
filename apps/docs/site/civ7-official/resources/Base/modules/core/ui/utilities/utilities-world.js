/**
 * @file utilities-world.ts
 * @copyright 2021, Firaxis Games
 * @description Helpers for common routines in interacting with the world map.
 */
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
/**
 * Utilities that operate on the world map.
 */
export var WorldUtil;
(function (WorldUtil) {
    /**
     * Obtain a unit at a give plot.
     * May be overly extensive checking but this should work (in theory) if a single plot was hosting multiple units from multiple players.
     * @param {PlotCoord} location the X/Y map coordinates
     * @param {GetUnitParameters?} requirements an optional set of requirements when selecting the unit from the plot.
     * @returns {ComponentID} CID of the unit at the hex or Invalid CID otherwise
     */
    function getUnit(location, requirements) {
        if (requirements == undefined) {
            requirements = { revealed: true, local: true, previousID: undefined }; // defaults in non are specified
        }
        if (requirements.revealed != undefined && requirements.revealed == true) {
            const revealedState = GameplayMap.getRevealedState(GameContext.localPlayerID, location.x, location.y);
            if (revealedState != RevealedStates.VISIBLE) {
                return ComponentID.getInvalidID();
            }
        }
        const units = MapUnits.getUnits(location.x, location.y);
        if (units.length == 0) {
            return ComponentID.getInvalidID(); // no units on the plot
        }
        if (requirements.previousID == undefined) {
            if (requirements.local == undefined || requirements.local == false) {
                return units[0];
            }
            if (units[0].owner == GameContext.localPlayerID) {
                return units[0];
            }
            return ComponentID.getInvalidID(); // local requirement but no local units
        }
        // Additional checks if using a componentID
        if (!ComponentID.isValid(requirements.previousID)) {
            console.error(`Unable to get a unit at '${location.x},${location.y}' because its requirement of selecting after an invalid unit id.`);
            return ComponentID.getInvalidID();
        }
        const localPlayerID = GameContext.localPlayerID;
        if (requirements.local != undefined && requirements.local == true) {
            if (requirements.previousID.owner != GameContext.localPlayerID) {
                console.error(`Attempt to get a local player's unit at '${location.x},${location.y}' but after '${ComponentID.toLogString(requirements.previousID)}' which isn't local player '${localPlayerID}'.`);
            }
        }
        // Get index of previous ID
        let targetIndex = 0;
        units.some((unitID, index) => {
            if (ComponentID.isMatch(unitID, requirements.previousID)) {
                targetIndex = index + 1;
                return true;
            }
            return false;
        });
        if (targetIndex > units.length - 1) {
            targetIndex = 0; // wrap around
        }
        if (requirements.local == undefined || requirements.local == false) {
            return units[targetIndex];
        }
        // Loop through for however many units exist on the plot,  If it gets to length-1 it should be return the same previousID passed in.
        for (let i = 0; i < units.length; i++) {
            if (units[targetIndex].owner == localPlayerID) {
                return units[targetIndex];
            }
            targetIndex = (targetIndex++ % units.length);
        }
        console.error(`Somehow got to end of getUnit( '${location.x},${location.y}') without selection or proper non-selection.  revealed: ${requirements.revealed}, local: ${requirements.local} (localID: ${localPlayerID}), previousID: ${ComponentID.toLogString(requirements.previousID)}.`);
        return ComponentID.getInvalidID();
    }
    WorldUtil.getUnit = getUnit;
})(WorldUtil || (WorldUtil = {}));

//# sourceMappingURL=file:///core/ui/utilities/utilities-world.js.map
