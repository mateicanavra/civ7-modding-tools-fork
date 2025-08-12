/**
 * @file continent-lens.ts
 * @copyright 2024, Firaxis Games
 * @description Lens shown when a settler is selected (different from a "founder," which is the first settler)
 */

import LensManager, { ILens, LensLayerName } from '/core/ui/lenses/lens-manager.js';

class ContinentLens implements ILens {

	activeLayers = new Set<LensLayerName>([
		'fxs-continent-layer',
		'fxs-hexgrid-layer',
		'fxs-culture-borders-layer',
		'fxs-resource-layer'
	]);

	allowedLayers = new Set<LensLayerName>([
	]);
}

declare global {
	interface LensTypeMap {
		'fxs-continent-lens': ContinentLens
	}
}

LensManager.registerLens('fxs-continent-lens', new ContinentLens());