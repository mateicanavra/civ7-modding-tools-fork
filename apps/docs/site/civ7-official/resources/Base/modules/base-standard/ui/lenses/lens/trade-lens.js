/**
 * @file trade-lens.ts
 * @copyright 2024 Firaxis Games
 * @description Lens which shows trade information
 */
import LensManager from '/core/ui/lenses/lens-manager.js';
class TradeLens {
    constructor() {
        this.activeLayers = new Set([
            'fxs-hexgrid-layer',
            'fxs-resource-layer',
            'fxs-culture-borders-layer',
            'fxs-trade-layer'
        ]);
        this.allowedLayers = new Set([]);
    }
}
LensManager.registerLens('fxs-trade-lens', new TradeLens());

//# sourceMappingURL=file:///base-standard/ui/lenses/lens/trade-lens.js.map
