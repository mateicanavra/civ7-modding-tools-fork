/**
 * @file cinematic-lens
 * @copyright 2022, Firaxis Games
 * @description Lens used cinematics are playing
 */

import LensManager, { ILens, LensLayerName } from '/core/ui/lenses/lens-manager.js';

class CinematicLens implements ILens {

	activeLayers = new Set<LensLayerName>([
	]);

	allowedLayers = new Set<LensLayerName>([
	]);
}

declare global {
	interface LensTypeMap {
		'fxs-cinematic-lens': CinematicLens
	}
}

LensManager.registerLens('fxs-cinematic-lens', new CinematicLens());