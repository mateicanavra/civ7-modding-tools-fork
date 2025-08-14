/**
 * @file city-lens
 * @copyright 2022, Firaxis Games
 * @description Lens used when focused on a city
 */

import LensManager, { ILens, LensLayerName } from '/core/ui/lenses/lens-manager.js';

class CityLens implements ILens {

	activeLayers = new Set<LensLayerName>([
		'fxs-hexgrid-layer',
		'fxs-resource-layer',
		'fxs-yields-layer',
		'fxs-city-borders-layer'
	]);

	allowedLayers = new Set<LensLayerName>([
		'fxs-appeal-layer'
	]);
}

declare global {
	interface LensTypeMap {
		'fxs-city-lens': CityLens
	}
}

LensManager.registerLens('fxs-city-lens', new CityLens());