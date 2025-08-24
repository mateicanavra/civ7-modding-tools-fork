/**
 * @file settler-lens.ts
 * @copyright 2022-2024, Firaxis Games
 * @description Lens shown when a settler is selected (different from a "founder," which is the first settler)
 */
import LensManager from '/core/ui/lenses/lens-manager.js';
class SettlerLens {
    constructor() {
        this.activeLayers = new Set([
            'fxs-appeal-layer',
            'fxs-hexgrid-layer',
            'fxs-resource-layer',
            'fxs-random-events-layer',
            'fxs-settlement-recommendations-layer',
            'fxs-yields-layer',
            'fxs-culture-borders-layer'
        ]);
        this.allowedLayers = new Set();
    }
}
LensManager.registerLens('fxs-settler-lens', new SettlerLens());

//# sourceMappingURL=file:///base-standard/ui/lenses/lens/settler-lens.js.map
