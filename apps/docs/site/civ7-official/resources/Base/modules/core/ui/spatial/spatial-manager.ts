/**
 * @file spatial-manager.ts
 * @copyright 2022, Firaxis Games
 * @description An object to abstract the functionality provided by the spatial_navigation.js library
 */

import SpatialWrap from '/core/ui/external/js-spatial-navigation/spatial-wrapper.js';

class SpatialManager {
	private static _Instance: SpatialManager;

	private directionMap: Map<InputNavigationAction, string> = new Map<InputNavigationAction, string>([
		[InputNavigationAction.UP, "up"],
		[InputNavigationAction.DOWN, "down"],
		[InputNavigationAction.RIGHT, "right"],
		[InputNavigationAction.LEFT, "left"]
	]);

	private constructor() {
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

	private onReady() {
		SpatialWrap.init();
	}

	getDirection(inputDirection: InputNavigationAction): string | undefined {
		return this.directionMap.get(inputDirection);
	}

	navigate(sectionId: string, elements: Array<Element>, direction: string): boolean {
		return SpatialWrap.navigate(sectionId, elements, direction);
	}
}

const Spatial = SpatialManager.getInstance();
export { Spatial as default };