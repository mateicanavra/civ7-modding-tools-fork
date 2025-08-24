/**
 * @file default-lens
 * @copyright 2022-2023, Firaxis Games
 * @description Default lens most often active during gameplay
 */

import LensManager, { ILens, LensLayerName } from '/core/ui/lenses/lens-manager.js';

class DefaultLens implements ILens {

	activeLayers = new Set<LensLayerName>([
		'fxs-hexgrid-layer',
		'fxs-resource-layer',
		'fxs-culture-borders-layer',
		'fxs-operation-target-layer'
	]);

	allowedLayers = new Set<LensLayerName>([
	]);
}

declare global {
	interface LensTypeMap {
		'fxs-default-lens': DefaultLens
	}
}

LensManager.registerLens('fxs-default-lens', new DefaultLens());