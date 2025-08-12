/**
 * @file navigation-support.ts
 * @copyright 2021-2022, Firaxis Games
 * @description Support to navigate between items (with a gamepad/keyboards)
 */
// TODO: remove (or implement) the commented out types
export var NavigationRule;
(function (NavigationRule) {
    NavigationRule[NavigationRule["Escape"] = 0] = "Escape";
    //Explicit,
    NavigationRule[NavigationRule["Wrap"] = 1] = "Wrap";
    NavigationRule[NavigationRule["Stop"] = 2] = "Stop";
    //Custom,
    //CustomBoundary,
    NavigationRule[NavigationRule["Invalid"] = 3] = "Invalid";
})(NavigationRule || (NavigationRule = {}));
export var Navigation;
(function (Navigation) {
    class Properties {
        constructor() {
            /// Can a "disabled" item still gain focus (typically a tooltip or some other way of expressing why it's disabled).
            this.isDisableFocusAllowed = false;
            this.direction = InputNavigationAction.NONE;
        }
    }
    Navigation.Properties = Properties;
    /**
     * Helper: Determine if the element passed in is focusable
     * @param element Element to check for focusability
     * @param {Properties} props Properties that may determine if the element is focusable
     * @returns True if the element can be focused
     */
    function isFocusable(element, props = new Properties()) {
        // Discards elements with no 'tabindex' attribute
        if (!element.hasAttribute('tabindex')) {
            return false;
        }
        // Discards disabled elements if this is not allowed
        if (!props.isDisableFocusAllowed && (element.classList.contains("disabled") || element.getAttribute("disabled") == "true")) {
            return false;
        }
        // Discards hidden elements
        if (isHidden(element)) {
            return false;
        }
        // Slots should only be focusable if they contain children which are focusable
        // Cf. ComponentDefinition warning about lack of inheritance and the special case of 'classNames'.
        if (element.hasAttribute('slot')) {
            // The isDisableFocusAllowed value must come from the element itself (not its parent)
            const slotProps = { isDisableFocusAllowed: element.getAttribute('disable-focus-allowed') == "true", direction: props.direction };
            if (getFirstFocusableElement(element, slotProps) == null) {
                return false;
            }
        }
        return true;
    }
    Navigation.isFocusable = isFocusable;
    /**
     * Check if a given element is hidden, in terms of class and style
     * @param element Element to check
    */
    function isHidden(element) {
        let isHidden = false;
        if (element.classList.contains("hidden") ||
            element.classList.contains("invisible") ||
            element.classList.contains("opactity-0")) {
            isHidden = true;
        }
        else if (element instanceof HTMLElement) {
            const style = window.getComputedStyle(element);
            isHidden = style.display == "none"
                || parseFloat(style.opacity) === 0
                || style.visibility == "hidden";
        }
        return isHidden;
    }
    /**
     * Check if the children of this element should be checked for focusability
     * @param element Parent element
    */
    function shouldCheckChildrenFocusable(element) {
        return (!element.hasAttribute('tabindex') && !isHidden(element));
    }
    Navigation.shouldCheckChildrenFocusable = shouldCheckChildrenFocusable;
    function getNextFocusableElementRecursive(element, props) {
        if (element == null) {
            return null;
        }
        if (isFocusable(element, props)) {
            return element;
        }
        else if (shouldCheckChildrenFocusable(element)) {
            const childFocusableElement = getFirstFocusableElement(element, props);
            if (childFocusableElement != null) {
                return childFocusableElement;
            }
        }
        return getNextFocusableElementRecursive(element.nextElementSibling, props);
    }
    /**
     * Helper: get next element that is focusable.
     * @param element Current element to key off of.
     * @param {Properties} props Properties that may change how navigation should occur.
     * @returns The next element in the DOM if one exists that can be focused, otherwise null.
     */
    function getNextFocusableElement(element, props) {
        let nextFocusableElement = null;
        let currentElement = element;
        do {
            nextFocusableElement = getNextFocusableElementRecursive(currentElement.nextElementSibling, props);
            currentElement = currentElement.parentElement;
        } while (nextFocusableElement == null && currentElement != null && !currentElement.hasAttribute('tabindex'));
        return nextFocusableElement;
    }
    Navigation.getNextFocusableElement = getNextFocusableElement;
    function getPreviousFocusableElementRecursive(element, props) {
        if (element == null) {
            return null;
        }
        if (isFocusable(element, props)) {
            return element;
        }
        else if (shouldCheckChildrenFocusable(element)) {
            const childFocusableElement = getPreviousFocusableElementRecursive(element.lastElementChild, props);
            if (childFocusableElement) {
                return childFocusableElement;
            }
        }
        return getPreviousFocusableElementRecursive(element.previousElementSibling, props);
    }
    /**
     * Helper: get previous element that is focusable.
     * @param element Current element to key off of.
     * @param {Properties} props Properties that may change how navigation should occur.
     * @returns The previous element in the DOM if one exists that can be focused, otherwise null.
     */
    function getPreviousFocusableElement(element, props) {
        let previousFocusableElement = null;
        let currentElement = element;
        do {
            previousFocusableElement = getPreviousFocusableElementRecursive(currentElement.previousElementSibling, props);
            currentElement = currentElement.parentElement;
        } while (previousFocusableElement == null && currentElement != null && !currentElement.hasAttribute('tabindex'));
        return previousFocusableElement;
    }
    Navigation.getPreviousFocusableElement = getPreviousFocusableElement;
    /**
     * Get the first focusable element starting from the first element and down the hierarchy
     * @param parent: Parent Element from where to start the research.
     * @param {Properties} props: Properties that may change how navigation should occur.
     * @return The first focusable Element starting from the first element and down the hierarchy. If one exists, otherwise null.
     */
    function getFirstFocusableElement(parent, props) {
        return getNextFocusableElementRecursive(parent.firstElementChild, props);
    }
    Navigation.getFirstFocusableElement = getFirstFocusableElement;
    /**
     * Get the first focusable element starting from the last element and up the hierarchy
     * @param parent: Parent Element from where to start the research.
     * @param {Properties} props: Properties that may change how navigation should occur.
     * @return The first focusable element starting from the last element and up the hierarchy. If one exists, otherwise null.
     */
    function getLastFocusableElement(parent, props) {
        return getPreviousFocusableElementRecursive(parent.lastElementChild, props);
    }
    Navigation.getLastFocusableElement = getLastFocusableElement;
    /**
     * Get the parent slot of a given node.
     * @param child Child Node from where to start the research.
     * @returns the closer parent that has a tabindex aka the parent slot.
     */
    function getParentSlot(child) {
        let parentSlot = child.parentElement;
        while (parentSlot && !parentSlot.hasAttribute('tabindex')) {
            parentSlot = parentSlot.parentElement;
        }
        return parentSlot;
    }
    Navigation.getParentSlot = getParentSlot;
    /**
     * Get the first level of children that are focusable.
     * It will not return deeper levels since they could have their own way to navigate.
     * @param parent Parent Element from where to start the search.
     * @param element Current Element (it is the parent when we are starting the search)
     * @param {Properties} props: Properties that may change how navigation should occur.
     * @returns the closest children that are focusable.
     */
    function getFocusableChildrenRecursive(parent, element, props) {
        if (element == null) {
            return [];
        }
        let focusableChildren = [];
        // Push the child if it is focusable or try the element children if this allowed
        if (element != parent && isFocusable(element, props)) {
            focusableChildren.push(element);
        }
        else if (element == parent || shouldCheckChildrenFocusable(element)) {
            for (let i = 0; i < element.children.length; ++i) {
                focusableChildren = focusableChildren.concat(getFocusableChildrenRecursive(parent, element.children[i], props));
            }
        }
        return focusableChildren;
    }
    /**
     * Get the first level of children that are focusable.
     * It will not return deeper levels since they could have their own way to navigate.
     * @param parent Parent Element from where to start the search.
     * @param {Properties} props: Properties that may change how navigation should occur.
     * @returns the closest children that are focusable.
     */
    function getFocusableChildren(parent, props) {
        return getFocusableChildrenRecursive(parent, parent, props); // Start the search with the parent itself
    }
    Navigation.getFocusableChildren = getFocusableChildren;
})(Navigation || (Navigation = {}));

//# sourceMappingURL=file:///core/ui/input/navigation-support.js.map
