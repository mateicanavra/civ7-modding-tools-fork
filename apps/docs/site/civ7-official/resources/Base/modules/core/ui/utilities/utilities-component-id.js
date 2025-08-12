/**
 * @file utilities-component-id.ts
 * @copyright 2021-2022, Firaxis Games
 * @description Utilties for working with ComponentIDs
 */
export var ComponentID;
(function (ComponentID) {
    // Component IDs that only live in the UI.  These start at 1000, well above the engine enums.
    const UIBase = 1000;
    let UITypes;
    (function (UITypes) {
        UITypes[UITypes["IndependentBanner"] = 1000] = "IndependentBanner"; // Used for 3D world items that don't have a gamecore CID to track (e.g., villages)
    })(UITypes = ComponentID.UITypes || (ComponentID.UITypes = {}));
    ComponentID.cid_type = 30;
    function toString(id) {
        if (id) {
            if (id.type) { // type is optional
                let str = id.owner + ";" + id.id + ";" + id.type;
                return str;
            }
            else {
                let str = id.owner + ";" + id.id;
                return str;
            }
        }
        else {
            return "";
        }
    }
    ComponentID.toString = toString;
    function fromString(str) {
        if (str) {
            const strs = str.split(';');
            if (strs.length >= 2) {
                const owner = parseInt(strs[0]);
                const id = parseInt(strs[1]);
                const type = (strs.length > 2) ? parseInt(strs[2]) : -1;
                const retVal = make(owner, type, id);
                if (!isNaN(retVal.owner) && !isNaN(retVal.id) && !isNaN(retVal.type)) {
                    return retVal;
                }
            }
            console.error("Invalid ComponentID parsed from string: ", str);
        }
        else {
            console.error("Cannot convert ComponentID from an empty string.");
        }
        return getInvalidID();
    }
    ComponentID.fromString = fromString;
    /**
     * Do two component IDs match? Assumes both are non-null.
     * @param {ComponentID | null} id1 non-null ComponentID
     * @param {ComponentID | null} id2 non-null ComponentID
     * @returns {boolean} true if both ComponentIDs contain the same values, false otherwise.
     */
    function isMatch(id1, id2) {
        if (id1 && id2) {
            // TODO: May want to have it match if type types are undefined or maybe even if one of them is.
            if (id1.owner == id2.owner && id1.id == id2.id && id1.type == id2.type) {
                return true;
            }
        }
        return false;
    }
    ComponentID.isMatch = isMatch;
    /**
     * Does a component ID (CID) exist within an array of CIDs?
     * @param {ComponentId[]} ids array of CIDs to check
     * @param {ComponentId} id the CID to look for
     * @returns {boolean} true if CID is in array, false otherwise
     */
    function isMatchInArray(ids, id) {
        for (let i = 0; i < ids.length; i++) { // Optimized: Using for() over some() to prevent lambda scope.
            const other = ids[i];
            if (id.owner == other.owner && id.id == other.id && id.type == other.type) {
                return true;
            }
        }
        return false;
    }
    ComponentID.isMatchInArray = isMatchInArray;
    /// Is an object an instance of a ComponentID
    function isInstanceOf(thing) {
        if (thing && thing.hasOwnProperty("owner") && thing.hasOwnProperty("id")) { // type is optional
            return true;
        }
        return false;
    }
    ComponentID.isInstanceOf = isInstanceOf;
    /// Add an id to an array, if it is not already in the array.
    function addToArray(ids, id) {
        if (ids && id) {
            for (const check of ids) {
                if (isMatch(check, id)) {
                    return false;
                }
            }
            ids.push(id);
            return true;
        }
        return false;
    }
    ComponentID.addToArray = addToArray;
    /// Remove an id from an array.
    function removeFromArray(ids, id) {
        if (ids && id) {
            for (let i = 0; i < ids.length; ++i) {
                if (isMatch(ids[i], id)) {
                    ids.splice(i, 1);
                    return true;
                }
            }
        }
        return false;
    }
    ComponentID.removeFromArray = removeFromArray;
    /**
     * Check if a component ID is anything but an unset value.
     * Technically only check if set (not checking validity against gamecore.)
     * @param {ComponentID} componentID - target component ID to check
     * @return true if unset/null/empty component ID, false if set or null passed in
     */
    function isInvalid(id) {
        return id && (id.owner == -1 && id.id == -1);
    }
    ComponentID.isInvalid = isInvalid;
    /**
     * Check if a component ID is valid.
     * @param {ComponentID} componentID - target component ID to check
     * @return true if likely a valid component id.
     */
    function isValid(id) {
        return (id != null) && (id.owner != -1 && id.id != -1);
    }
    ComponentID.isValid = isValid;
    /**
     * Get a ComponentID that represents not being attached to anything in the game.
     * @returns a ComponentID which is considered to be unset.
     */
    const invalidID = Object.freeze({ owner: -1, id: -1, type: 0 });
    function getInvalidID() {
        return invalidID;
    }
    ComponentID.getInvalidID = getInvalidID;
    /**
     * @description Convert a ComponentID into it's 64-bit bitfield representation.
     *  ________________________________________________________________
     * | owner 16-bits | type 16-bits  |           id 32-bits           |
     * |_______________|_______________|________________________________|
     *
     * @note Cannot just immediate bit shift 32 or 48 spaces, after 31 javascript say nope so getting tricky with powers.
     */
    function toBitfield(componentID) {
        const a = componentID.owner * Math.pow(2, 48); // << 48
        const b = componentID.type * Math.pow(2, 32);
        const c = componentID.id;
        return a + b + c;
    }
    ComponentID.toBitfield = toBitfield;
    /**
     * Restore a ComponentID from it's single 64-bit bitfield representation.
     * @param bitfield A packed bitfield created with toBitfield
     * @returns The expanded ComponentID number.
     */
    function fromBitfield(bitfield) {
        const owner = (bitfield / Math.pow(2, 48)) & 0xffff;
        return {
            owner: (owner < 65535) ? owner : -1,
            type: (bitfield / Math.pow(2, 32)) & 0xffff,
            id: (bitfield & 0xffffffff)
        };
    }
    ComponentID.fromBitfield = fromBitfield;
    /**
     * @description Convert a ComponentID into it's 64-bit bitfield representation.
     *  ________________________________________________________________
     * |               |               |          (id 32-bits)          |
     * | owner 16-bits | type 16-bits  |    x 16-bits   |   y 16-bits   |
     * |_______________|_______________|________________|_______________|
     *
     * @note Cannot just immediate bit shift 32 or 48 spaces, after 31 javascript say nope so getting tricky with powers.
     */
    function fromPlot(owner, coordinates, type) {
        const id = (coordinates.x * Math.pow(2, 16)) + coordinates.y;
        return {
            owner: owner,
            type: type,
            id: id
        };
    }
    ComponentID.fromPlot = fromPlot;
    /**
     * Converts component ID into human readable info
     * For debugging, log messages, etc... only.
     * Type enums from GameCore_PlayerComponentID.h,
     * @param {ComponentID} id - The component ID
     * @return a string representing a debug view of the component ID
     */
    function toLogString(id) {
        if (id == null) {
            return "NULL";
        }
        if (ComponentID.isInvalid(id)) {
            return "InvalidCID";
        }
        function typeToString(type) {
            switch (type) {
                case 0: return "UNDEFINED";
                case 1: return "CITY";
                case 2: return "CONSTRUCTIBLE";
                case 3: return "DIPLOMACY";
                case 4: return "DISTRICT";
                case 5: return "DROUGHT";
                case 6: return "FIRE";
                case 7: return "FORMATION";
                case 8: return "GAME";
                case 9: return "GAME_CONFIGURATION";
                case 10: return "GAME_NOTIFICATION";
                case 11: return "GOVERNOR";
                case 12: return "IMPROVEMENT";
                case 13: return "MAP_CONFIGURATION";
                case 14: return "MODIFIER_DYNAMIC";
                case 15: return "NATIONALPARK";
                case 16: return "ONEOFF_EVENT";
                case 17: return "PLAYER";
                case 18: return "PLAYER_CONFIGURATION";
                case 19: return "PLAYER_MANAGER";
                case 20: return "PLAYER_NOTIFICATION";
                case 21: return "PLAYER_VISIBILITY";
                case 22: return "PLOT";
                case 23: return "RELIGION";
                case 24: return "RESOURCE";
                case 25: return "STORM";
                case 26: return "UNIT";
                case 27: return "AI_CONTROL_MANAGER";
                case 28: return "AI_BEHAVIORTREEMANAGER";
                case 29: return "ARMY";
                case 30: return "UI"; // cid_type
                case 31: return "TRADEROUTE";
                case 32: return "SPECIALIST";
                case 33: return "MINOR_INDEPENDENT_MANAGER";
                // Enums that start at a high number (e.g., 1000) which are UI-created, and UI-specific.  (Engine has no concept of it).
                case UITypes.IndependentBanner: return "UI-INDEPENDENT_BANNER";
            }
            return "unknown-type(" + type.toString() + ")";
        }
        return typeToString(id.type) + ":" + id.owner.toString() + ":" + id.id.toString();
    }
    ComponentID.toLogString = toLogString;
    /**
     * Determine if a cid is engine specific or UI specific.
     * @param cid A componentID
     * @returns true if the cid is specific to the user interface and not tracked by the engine.
     */
    function isUI(cid) {
        return (cid.type >= UIBase);
    }
    ComponentID.isUI = isUI;
    /**
     * Create a ComponentID from an owner, type, and id.
     * @param {number} owner Player number
     * @param {number} type (-1) The type of component being created
     * @param {number} id 	Unique ID
     * @returns {ComponentID} A fully formed ComponentID.
     */
    function make(owner, type = -1, id) {
        return {
            owner: owner,
            type: type,
            id: id
        };
    }
    ComponentID.make = make;
})(ComponentID || (ComponentID = {}));

//# sourceMappingURL=file:///core/ui/utilities/utilities-component-id.js.map
