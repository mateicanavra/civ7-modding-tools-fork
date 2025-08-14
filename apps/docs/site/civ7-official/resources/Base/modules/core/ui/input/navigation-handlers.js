/**
 * @file navigation-handlers.ts
 * @copyright 2022, Firaxis Games
 * @description Handler functions for various navigation rules
 */
import FocusManager from '/core/ui/input/focus-manager.js';
import { Navigation } from '/core/ui/input/navigation-support.js';
import Spatial from '/core/ui/spatial/spatial-manager.js';
export var NavigationHandlers;
(function (NavigationHandlers) {
    /**
     * Ignore the input and keep it live.
     * @returns Always returns true, that the input is still live.
     */
    function handlerIgnore() {
        return true;
    }
    NavigationHandlers.handlerIgnore = handlerIgnore;
    /**
     * Ignore the input and prevent it from propagating.
     * @returns Always returns false, that the input is always consumed.
     */
    function handlerStop() {
        return false;
    }
    NavigationHandlers.handlerStop = handlerStop;
    function handlerEscapeNext(focusElement, props) {
        const sibling = Navigation.getNextFocusableElement(focusElement, props);
        if (sibling != null) {
            FocusManager.setFocus(sibling);
            return false;
        }
        return true;
    }
    NavigationHandlers.handlerEscapeNext = handlerEscapeNext;
    function handlerStopNext(focusElement, props) {
        const sibling = Navigation.getNextFocusableElement(focusElement, props);
        if (sibling != null) {
            FocusManager.setFocus(sibling);
        }
        return false;
    }
    NavigationHandlers.handlerStopNext = handlerStopNext;
    function handlerWrapNext(focusElement, props) {
        const sibling = Navigation.getNextFocusableElement(focusElement, props);
        if (sibling != null) {
            FocusManager.setFocus(sibling);
            return false;
        }
        let parentSlot = Navigation.getParentSlot(focusElement);
        if (!parentSlot) {
            console.error("navigation-support: handlerWrapNext(): no parent slot was found");
            return false;
        }
        const wrapSibling = Navigation.getFirstFocusableElement(parentSlot, props);
        if (wrapSibling != null) {
            FocusManager.setFocus(wrapSibling);
        }
        return false;
    }
    NavigationHandlers.handlerWrapNext = handlerWrapNext;
    function handlerEscapePrevious(focusElement, props) {
        const sibling = Navigation.getPreviousFocusableElement(focusElement, props);
        if (sibling != null) {
            FocusManager.setFocus(sibling);
            return false;
        }
        return true;
    }
    NavigationHandlers.handlerEscapePrevious = handlerEscapePrevious;
    function handlerStopPrevious(focusElement, props) {
        const sibling = Navigation.getPreviousFocusableElement(focusElement, props);
        if (sibling != null) {
            FocusManager.setFocus(sibling);
        }
        return false;
    }
    NavigationHandlers.handlerStopPrevious = handlerStopPrevious;
    function handlerWrapPrevious(focusElement, props) {
        const sibling = Navigation.getPreviousFocusableElement(focusElement, props);
        if (sibling != null) {
            FocusManager.setFocus(sibling);
            return false;
        }
        let parentSlot = Navigation.getParentSlot(focusElement);
        if (!parentSlot) {
            console.error("navigation-support: handlerWrapPrevious(): no parent slot was found");
            return false;
        }
        const wrapSibling = Navigation.getLastFocusableElement(parentSlot, props);
        if (wrapSibling != null) {
            FocusManager.setFocus(wrapSibling);
        }
        return false;
    }
    NavigationHandlers.handlerWrapPrevious = handlerWrapPrevious;
    function handlerEscapeSpatial(focusElement, props) {
        // Route to the Spatial Manager to determine how to handle this
        const direction = Spatial.getDirection(props.direction);
        if (direction == undefined) {
            console.error("spatial-manager: handlerSpatial(): Failed to get a valid navigation direction");
            return false;
        }
        const parentSlot = Navigation.getParentSlot(focusElement);
        if (!parentSlot) {
            console.error("spatial-manager: handlerSpatial(): No parent slot was found");
            return false;
        }
        const sectionId = parentSlot.getAttribute('sectionId');
        if (sectionId == null) {
            console.error('spatial-manager: handlerSpatial(): Failed to find sectionId attribute');
            return false;
        }
        const focusableChildren = Navigation.getFocusableChildren(parentSlot, props);
        return Spatial.navigate(sectionId, focusableChildren, direction);
    }
    NavigationHandlers.handlerEscapeSpatial = handlerEscapeSpatial;
    function handlerWrapSpatial(_focusElement, _props) {
        console.error('navigation-support: No wrap handler has been implemented for spatial slots!');
        return true;
    }
    NavigationHandlers.handlerWrapSpatial = handlerWrapSpatial;
    function handlerStopSpatial(focusElement, props) {
        // Route to the Spatial Manager to determine how to handle this
        handlerEscapeSpatial(focusElement, props);
        return false;
    }
    NavigationHandlers.handlerStopSpatial = handlerStopSpatial;
})(NavigationHandlers || (NavigationHandlers = {}));

//# sourceMappingURL=file:///core/ui/input/navigation-handlers.js.map
