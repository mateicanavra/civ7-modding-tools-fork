/**
 * @file stateful-icon.ts
 * @copyright 2024, Firaxis Games
 * @description Utilities for creating a stateful icon from a set of icons, where each icon represents a different state of interaction.
 */
export var IconState;
(function (IconState) {
    IconState["Default"] = "default";
    IconState["Hover"] = "hover";
    IconState["Focus"] = "focus";
    IconState["Active"] = "active";
    IconState["Disabled"] = "disabled";
})(IconState || (IconState = {}));
export const AttributeNames = Object.values(IconState).map(state => state === IconState.Default ? 'data-icon' : `data-icon-${state}`);
/** The default classes to apply to the icon element for each state */
const stateDefaultClassNameMap = {
    [IconState.Default]: ['opacity-100'],
    [IconState.Hover]: ['opacity-0', 'group-hover\\:opacity-100'],
    [IconState.Focus]: ['opacity-0', 'group-focus\\:opacity-100'],
    [IconState.Active]: ['opacity-0', 'group-active\\:opacity-100'],
    [IconState.Disabled]: ['opacity-0'],
};
/**
 * Controller is a class that manages the state of an icon group.
 *
 * It allows you to force the icon group into a specific state.
 */
export class Controller {
    /** disabled is a convenience method of setting  */
    set disabled(value) {
        this.state = value ? IconState.Disabled : IconState.Default;
    }
    set state(value) {
        // passed state may not be valid for this particular icon group
        if (!this.isValidState(value)) {
            console.error(`icon-group: no state exists for ${value}. Valid states are: ${Object.keys(this.elements).join(', ')}`);
        }
        for (const state in this.elements) {
            this.elements[state].classList.remove('opacity-100');
        }
        if (value === IconState.Default) {
            for (const state in this.elements) {
                const defaultClassNames = stateDefaultClassNameMap[state];
                this.elements[state].classList.add(...defaultClassNames);
            }
        }
        else {
            for (const state in this.elements) {
                if (state === value) {
                    this.elements[state].classList.add('opacity-100');
                }
                else {
                    const defaultClassNames = stateDefaultClassNameMap[state];
                    this.elements[state].classList.remove(...defaultClassNames);
                }
            }
        }
    }
    constructor(elements) {
        this.elements = elements;
    }
    /** isValidState validates that the icon group has an icon for this group */
    isValidState(state) {
        return typeof state === 'string' && state in this.elements;
    }
}
/**
 * Init initializes an icon group using an optional root element where each icon is a different state of the same icon.
 *
 * @returns a tuple containing the root element and the controller for the icon group
 */
export const Init = ({ root, iconStateUrlMap, noGroupClass }) => {
    root ?? (root = document.createElement('div'));
    root.classList.add('relative', 'pointer-events-auto');
    if (!noGroupClass) {
        root.classList.add('group');
    }
    const elements = {};
    //dedupe urls to avoid creating multiple elements for the case where multiple states share the same url
    const urlElementMap = {};
    for (const state in iconStateUrlMap) {
        const url = iconStateUrlMap[state];
        if (!url)
            continue;
        const element = urlElementMap[url] ?? (urlElementMap[url] = document.createElement('img'));
        element.src = iconStateUrlMap[state];
        if (state !== IconState.Default) {
            element.classList.add('absolute');
        }
        element.classList.add('transition-opacity');
        if (state in stateDefaultClassNameMap) {
            const defaultClassNames = stateDefaultClassNameMap[state];
            element.classList.add(...defaultClassNames);
        }
        elements[state] = element;
        root.appendChild(element);
    }
    return [root, new Controller(elements)];
};
/**
 * FromElement initializes an icon group based on the attributes of an existing element.
 *
 * @param element the element to use as the root of the icon group
 * @param noGroupClass will create the icon group without applying the '.group' class to the root element.
 *
 * @returns a tuple containing the root element and the controller for the icon group
 */
export const FromElement = (element, noGroupClass = false) => {
    const iconStateUrlMap = UrlMapFromElementAttributes(element);
    return Init({ root: element, iconStateUrlMap, noGroupClass });
};
/**
 * UrlMapFromElementAttributes extracts the icon URLs from the attributes of an element.
 *
 * The URLs are expected to be stored in the following attributes:
 * - data-icon: the base icon
 * - data-icon-hover: the icon when hovered
 * - data-icon-focus: the icon when focused
 * - data-icon-active: the icon when active
 * - data-icon-disabled: the icon when disabled
 *
 * @param element the element to extract the icon URLs from
 *
 * @returns a URLMap containing the URLs for each state of the icon
 */
export const UrlMapFromElementAttributes = (element) => {
    return Object.values(IconState).reduce((acc, state) => {
        const attributeName = state === IconState.Default ? 'data-icon' : `data-icon-${state}`;
        const iconUrl = element.getAttribute(attributeName);
        if (iconUrl) {
            acc[state] = iconUrl;
        }
        return acc;
    }, {});
};
/**
 * SetAttributes sets the icon URLs on an element based on the given URLMap.
 *
 * @param element the element to set the icon URLs on
 * @param stateUrlMap the string for the base icon state or URLMap containing the URLs for each state of the icon
 */
export const SetAttributes = (element, stateUrlMap) => {
    if (typeof stateUrlMap === 'string') {
        element.setAttribute('data-icon', stateUrlMap);
    }
    else {
        for (const state in stateUrlMap) {
            const attributeName = state === IconState.Default ? 'data-icon' : `data-icon-${state}`;
            // TODO: figure out why state is inferred as a string instead of keyof URLMap
            const url = stateUrlMap[state];
            if (url) {
                element.setAttribute(attributeName, url);
            }
        }
    }
};

//# sourceMappingURL=file:///core/ui/stateful-icon/stateful-icon.js.map
