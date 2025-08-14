/**
 * @file founder-lens.ts
 * @copyright 2024, Firaxis Games
 * @description Lens shown when a founder is selected
 */
import LensManager from '/core/ui/lenses/lens-manager.js';
import { TutorialLevel } from '/base-standard/ui/tutorial/tutorial-item.js';
export class FounderLens {
    constructor() {
        this.activeLayers = new Set([]);
        this.allowedLayers = new Set([
            'fxs-resource-layer',
            'fxs-yields-layer',
        ]);
        this.ignoreEnabledLayers = true;
        const isTutorial = Configuration.getUser().tutorialLevel === TutorialLevel.TutorialOn;
        // tutorial enables yield layer but we don't want to cache it
        this.ignoreEnabledLayers = !isTutorial;
        if (!isTutorial) {
            this.activeLayers.add('fxs-settlement-recommendations-layer');
        }
    }
}
LensManager.registerLens('fxs-founder-lens', new FounderLens());

//# sourceMappingURL=file:///base-standard/ui/lenses/lens/founder-lens.js.map
