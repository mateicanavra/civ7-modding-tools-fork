/**
 * @file building-placement-lens
 * @copyright 2023, Firaxis Games
 * @description Lens used when selecting a tile to construct a new building
 */

import LensManager, { ILens, LensLayerName } from '/core/ui/lenses/lens-manager.js';

class BuildingPlacementLens implements ILens {

	activeLayers = new Set<LensLayerName>([
		'fxs-hexgrid-layer',
		'fxs-resource-layer',
		'fxs-building-placement-layer',
		'fxs-city-borders-layer'
	]);

	allowedLayers = new Set<LensLayerName>([
		'fxs-appeal-layer'
	]);
}

declare global {
	interface LensTypeMap {
		'fxs-building-placement-lens': BuildingPlacementLens
	}
}

LensManager.registerLens('fxs-building-placement-lens', new BuildingPlacementLens());