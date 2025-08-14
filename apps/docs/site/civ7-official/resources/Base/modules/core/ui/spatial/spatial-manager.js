/**
 * @file spatial-manager.ts
 * @copyright 2022, Firaxis Games
 * @description An object to abstract the functionality provided by the spatial_navigation.js library
 */
import SpatialWrap from '/core/ui/external/js-spatial-navigation/spatial-wrapper.js';
class SpatialManager {
    constructor() {
        this.directionMap = new Map([
            [InputNavigationAction.UP, "up"],
            [InputNavigationAction.DOWN, "down"],
            [InputNavigationAction.RIGHT, "right"],
            [InputNavigationAction.LEFT, "left"]
        ]);
        engine.whenReady.then(() => { this.onReady(); });
    }
    /**
     * Singleton accessor
     */
    static getInstance() {
        if (!SpatialManager._Instance) {
            SpatialManager._Instance = new SpatialManager();
        }
        return SpatialManager._Instance;
    }
    onReady() {
        SpatialWrap.init();
    }
    getDirection(inputDirection) {
        return this.directionMap.get(inputDirection);
    }
    navigate(sectionId, elements, direction) {
        return SpatialWrap.navigate(sectionId, elements, direction);
    }
}
const Spatial = SpatialManager.getInstance();
export { Spatial as default };

//# sourceMappingURL=file:///core/ui/spatial/spatial-manager.js.map
