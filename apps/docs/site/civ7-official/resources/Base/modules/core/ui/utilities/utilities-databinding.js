/**
 * Databinding utility functions
 * @copyright 2020-2022, Firaxis Games
 *
 * Helpers for formatting, injecting, and extracting infomation from the databinding attribute.
 */
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
import Databind from '/core/ui/utilities/utilities-core-databinding.js';
/**
 * Packaged a component ID up as a string in a target's attributes.
 * Useful for smuggling an ID across to an async HTML object.
 * @param target
 * @param baseComponentID
 * @param verbose
 */
export function databindComponentID(target, baseComponentID, verbose) {
    //something isn't respecting capitalization here, so making it all lowercase for consistency.
    Databind.attribute(target, 'componentid', `${baseComponentID}`, verbose);
}
/**
 * @param {HTMLElement} target DOM element that has componentid attribute on it.
 * @returns {ComponentID} The ComponentID set on the element, or InvalidID if missing or poorly formatted.
 */
export function databindRetrieveComponentID(target) {
    const foundID = target.getAttribute('componentid');
    if (foundID == null || foundID == "") {
        return ComponentID.getInvalidID();
    }
    else {
        return ComponentID.fromString(foundID);
    }
}
/**
 * @param {HTMLElement} target DOM element that has componentid attribute on it.
 * @returns A serialized version of a componentid or the empty string if none (or poorly formatted.)
 */
export function databindRetrieveComponentIDSerial(target) {
    const foundID = target.getAttribute('componentid');
    return foundID ?? "";
}

//# sourceMappingURL=file:///core/ui/utilities/utilities-databinding.js.map
