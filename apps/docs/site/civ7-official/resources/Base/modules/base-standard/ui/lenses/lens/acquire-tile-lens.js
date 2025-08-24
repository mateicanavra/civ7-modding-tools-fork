/**
 * @file acquire-tile-lens
 * @copyright 2022, Firaxis Games
 * @description Lens used when selecting a tile to acquire or worker placement
 */
import LensManager from '/core/ui/lenses/lens-manager.js';
class AcquireTileLens {
    constructor() {
        this.activeLayers = new Set([
            'fxs-hexgrid-layer',
            'fxs-resource-layer',
            'fxs-worker-yields-layer',
            'fxs-city-borders-layer',
            'fxs-city-growth-improvements-layer'
        ]);
        this.allowedLayers = new Set([
            'fxs-appeal-layer'
        ]);
    }
}
LensManager.registerLens('fxs-acquire-tile-lens', new AcquireTileLens());

//# sourceMappingURL=file:///base-standard/ui/lenses/lens/acquire-tile-lens.js.map
