/**
 * @file spatial-wrapper.ts
 * @copyright 2022, Firaxis Games
 * @description A wrapper for the JS spatial_navigation library
 */
import SpatialNavigation from '/core/ui/external/js-spatial-navigation/spatial_navigation.js';
import FocusManager from '/core/ui/input/focus-manager.js';
class SpatialWrapper {
    /**
     * Singleton accessor
     */
    static getInstance() {
        if (!SpatialWrapper._Instance) {
            SpatialWrapper._Instance = new SpatialWrapper();
        }
        return SpatialWrapper._Instance;
    }
    init() {
        SpatialNavigation.init();
    }
    /**
     * Navigate within a spatial section given its focusable children and a direction.
     * @param sectionId The section ID of the shared parent slot.
     * @param focusableChildren Children Elements that are assumed to be focusable.
     * @param direction The movement direction
     * @returns true if still live, false if input should stop (the navigation was effective).
     */
    navigate(sectionId, focusableChildren, direction) {
        if (focusableChildren.length == 0) {
            console.error('spatial-wrapper: navigateFromElementWithinElements(): None focusable child, navigation is impossible');
            return false;
        }
        const priorFocus = FocusManager.getFocus();
        // Currently the section for a parent slot is updated whenever
        // one of its navigable elements is navigated from.
        // TODO? We should probably do it only on attach and when the children change.
        // (-> in FxsSpatialSlot.onAttach() and FxsSpatialSlot.onChildrenChanged())
        SpatialNavigation.remove(sectionId);
        // @ts-expect-error -- Code was written to pass an array of Elements, but the type definition specifies a Configuration object.
        SpatialNavigation.add(sectionId, focusableChildren);
        SpatialNavigation.set(sectionId, { restrict: 'self-only' }); // only try to navigate in the current section
        SpatialNavigation.move(direction);
        SpatialNavigation.remove(sectionId); // section is no more needed (we do not bother with the enabled/disabled sections feature)
        return priorFocus == FocusManager.getFocus(); // return true if the spatial navigation library didn't change the focus
    }
}
const SpatialWrap = SpatialWrapper.getInstance();
export { SpatialWrap as default };

//# sourceMappingURL=file:///core/ui/external/js-spatial-navigation/spatial-wrapper.js.map
