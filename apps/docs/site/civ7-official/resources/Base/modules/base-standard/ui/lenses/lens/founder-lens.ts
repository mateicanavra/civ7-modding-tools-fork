/**
 * @file founder-lens.ts
 * @copyright 2024, Firaxis Games
 * @description Lens shown when a founder is selected
 */

import LensManager, { ILens, LensLayerName } from '/core/ui/lenses/lens-manager.js';
import { TutorialLevel } from '/base-standard/ui/tutorial/tutorial-item.js'
export class FounderLens implements ILens {

	constructor() {
		const isTutorial = Configuration.getUser().tutorialLevel === TutorialLevel.TutorialOn

		// tutorial enables yield layer but we don't want to cache it
		this.ignoreEnabledLayers = !isTutorial;

		if (!isTutorial) {
			this.activeLayers.add('fxs-settlement-recommendations-layer');
		}
	}

	activeLayers = new Set<LensLayerName>([
	]);

	allowedLayers = new Set<LensLayerName>([
		'fxs-resource-layer',
		'fxs-yields-layer',
	]);
	ignoreEnabledLayers = true;
}

declare global {
	interface LensTypeMap {
		'fxs-founder-lens': FounderLens
	}
}

LensManager.registerLens('fxs-founder-lens', new FounderLens());