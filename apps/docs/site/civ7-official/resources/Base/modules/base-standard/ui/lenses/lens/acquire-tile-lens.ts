/**
 * @file acquire-tile-lens
 * @copyright 2022, Firaxis Games
 * @description Lens used when selecting a tile to acquire or worker placement
 */

import LensManager, { ILens, LensLayerName } from '/core/ui/lenses/lens-manager.js';

class AcquireTileLens implements ILens {

	activeLayers = new Set<LensLayerName>([
		'fxs-hexgrid-layer',
		'fxs-resource-layer',
		'fxs-worker-yields-layer',
		'fxs-city-borders-layer',
		'fxs-city-growth-improvements-layer'
	]);

	allowedLayers = new Set<LensLayerName>([
		'fxs-appeal-layer'
	]);
}

declare global {
	interface LensTypeMap {
		'fxs-acquire-tile-lens': AcquireTileLens
	}
}

LensManager.registerLens('fxs-acquire-tile-lens', new AcquireTileLens());