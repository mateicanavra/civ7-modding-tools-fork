/**
 * @file trade-lens.ts
 * @copyright 2024 Firaxis Games
 * @description Lens which shows trade information
 */

import LensManager, { ILens, LensLayerName } from '/core/ui/lenses/lens-manager.js';

class TradeLens implements ILens {
	activeLayers = new Set<LensLayerName>([
		'fxs-hexgrid-layer',
		'fxs-resource-layer',
		'fxs-culture-borders-layer',
		'fxs-trade-layer'
	]);

	allowedLayers = new Set<LensLayerName>([]);
}

declare global {
	interface LensTypeMap {
		'fxs-trade-lens': TradeLens
	}
}

LensManager.registerLens('fxs-trade-lens', new TradeLens());