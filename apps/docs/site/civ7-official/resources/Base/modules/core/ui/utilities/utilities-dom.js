/**
 * @file utilities-dom.ts
 * @copyright 2023, Firaxis Games
 * @description Utilties for working with DOM elements
 */
export const MAX_UI_SCALE = 200;
export const MIN_UI_SCALE = 50;
export var FontScale;
(function (FontScale) {
    FontScale[FontScale["XSmall"] = 0] = "XSmall";
    FontScale[FontScale["Small"] = 1] = "Small";
    FontScale[FontScale["Medium"] = 2] = "Medium";
    FontScale[FontScale["Large"] = 3] = "Large";
    FontScale[FontScale["XLarge"] = 4] = "XLarge";
})(FontScale || (FontScale = {}));
/**
 * CreateElementTable returns a table of elements that lazily evaluates selectors and caches the retrieved elements via get/set.
 *
 * @description for each kvp in init, create two properties on the returned object:
 * 1. An underscore-prefixed field that holds the element. Undefined until the getter is called. Null if the element is not found.
 * 2. A non-prefixed field with a getter and setter. The getter will return the element if it exists, or invoke the setter to query for the element.
 *
 *
 * @param root root element to use for looking up selectors
 * @param init object of kvp's where the key is the name of the element and the value is the selector
 */
export const CreateElementTable = (root, init) => {
    const table = {};
    for (const key in init) {
        const _key = `_${key}`;
        Object.defineProperty(table, _key, { value: undefined, writable: true, enumerable: false, configurable: true });
        Object.defineProperty(table, key, {
            get: function () {
                if (this[_key] === undefined) {
                    if (!root.isConnected) {
                        console.error(`CreateElementTable: attempted to access element ${key} on a root that is not yet connected to the DOM.`);
                    }
                    this[_key] = root.querySelector(init[key]);
                }
                if (this[_key] === null) {
                    throw new Error(`CreateElementTable: element ${key} not found in root element.`);
                }
                // TypeScript doesn't seem to know that this[_key] is not null/undefined at this point
                return this[_key];
            },
            set: function (value) {
                this[`_${key}`] = value;
            },
            enumerable: true,
            configurable: true
        });
    }
    return table;
};
/**
 * Creates a string representation of an element that can be used for debugging.
 */
export const ElementToDebugString = (element) => {
    const tag = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : '';
    const classes = element.classList.length > 0 ? `.${Array.from(element.classList).join('.')}` : '';
    return `${tag}${id}${classes}`;
};
/**
 * MustGetElement queries for the element and throws an error if it is not found.
 *
 * @param selector selector to query for
 * @param element optional root element to use for the query. Defaults to document.
 */
export const MustGetElement = (selector, element) => {
    const result = element.querySelector(selector);
    if (!result) {
        const parent = element instanceof HTMLElement ? ElementToDebugString(element) : "document";
        throw new Error(`MustGetElement: element ${selector} not found in ${parent}.`);
    }
    return result;
};
/**
 * MustGetElements queries for all elements and throws an error if it is not found.
 *
 * @param selector selector to query for
 * @param element optional root element to use for the query. Defaults to document.
 */
export const MustGetElements = (selector, element) => {
    const result = element.querySelectorAll(selector);
    if (!result.length) {
        const parent = element instanceof HTMLElement ? ElementToDebugString(element) : "document";
        throw new Error(`MustGetElements: elements ${selector} not found in ${parent}.`);
    }
    return result;
};
/**
 * RecursiveGetAttribute retrieves an attribute from an element or its parent recursively.
 *
 * @param target element to start the search from
 * @param attr attribute to retrieve
 */
export const RecursiveGetAttribute = (target, attr) => {
    if (target == null || target == document.body) {
        return null;
    }
    return target.getAttribute(attr) ?? RecursiveGetAttribute(target.parentElement, attr);
};
/**
 * IsElement is a type guard for checking if an element is of a specific tag name
 *
 * @example
 * if (IsElement(element, 'fxs-button')) {
 *   element; // element is inferred as ComponentRoot<FxsButton>
 * }
 * @param element element to check
 * @param tagName tag name to compare against
 */
export const IsElement = (element, tagName) => element instanceof HTMLElement && element.tagName.toLowerCase() === tagName;
/**
 * PassThroughAttributes sets the attributes of element a on element b.
 */
export const PassThroughAttributes = (a, b, ...attributes) => {
    attributes.forEach(attr => {
        const value = a.getAttribute(attr);
        if (value) {
            b.setAttribute(attr, value);
        }
    });
};

//# sourceMappingURL=file:///core/ui/utilities/utilities-dom.js.map
