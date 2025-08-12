/**
 * @file city-lens
 * @copyright 2022, Firaxis Games
 * @description Lens used when focused on a city
 */
import LensManager from '/core/ui/lenses/lens-manager.js';
class CityLens {
    constructor() {
        this.activeLayers = new Set([
            'fxs-hexgrid-layer',
            'fxs-resource-layer',
            'fxs-yields-layer',
            'fxs-city-borders-layer'
        ]);
        this.allowedLayers = new Set([
            'fxs-appeal-layer'
        ]);
    }
}
LensManager.registerLens('fxs-city-lens', new CityLens());

//# sourceMappingURL=file:///base-standard/ui/lenses/lens/city-lens.js.map
