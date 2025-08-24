/**
 * @file settler-lens.ts
 * @copyright 2022-2024, Firaxis Games
 * @description Lens shown when a settler is selected (different from a "founder," which is the first settler)
 */

import LensManager, { ILens, LensLayerName } from '/core/ui/lenses/lens-manager.js';

class SettlerLens implements ILens {

	activeLayers = new Set<LensLayerName>([
		'fxs-appeal-layer',
		'fxs-hexgrid-layer',
		'fxs-resource-layer',
		'fxs-random-events-layer',
		'fxs-settlement-recommendations-layer',
		'fxs-yields-layer',
		'fxs-culture-borders-layer'
	]);

	allowedLayers = new Set<LensLayerName>();
}

declare global {
	interface LensTypeMap {
		'fxs-settler-lens': SettlerLens
	}
}

LensManager.registerLens('fxs-settler-lens', new SettlerLens());