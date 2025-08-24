/**
 * @file continent-lens.ts
 * @copyright 2024, Firaxis Games
 * @description Lens shown when a settler is selected (different from a "founder," which is the first settler)
 */
import LensManager from '/core/ui/lenses/lens-manager.js';
class ContinentLens {
    constructor() {
        this.activeLayers = new Set([
            'fxs-continent-layer',
            'fxs-hexgrid-layer',
            'fxs-culture-borders-layer',
            'fxs-resource-layer'
        ]);
        this.allowedLayers = new Set([]);
    }
}
LensManager.registerLens('fxs-continent-lens', new ContinentLens());

//# sourceMappingURL=file:///base-standard/ui/lenses/lens/continent-lens.js.map
