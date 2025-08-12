/**
 * @file diplomacy-lens
 * @copyright 2023, Firaxis Games
 * @description Lens used when in diplomacy modes
 */

import LensManager, { ILens, LensLayerName } from '/core/ui/lenses/lens-manager.js';

class DiplomacyLens implements ILens {

	activeLayers = new Set<LensLayerName>([
	]);

	allowedLayers = new Set<LensLayerName>([
		'fxs-hexgrid-layer'
	]);
}

declare global {
	interface LensTypeMap {
		'fxs-diplomacy-lens': DiplomacyLens
	}
}

LensManager.registerLens('fxs-diplomacy-lens', new DiplomacyLens());