/**
 * @file default-lens
 * @copyright 2022-2023, Firaxis Games
 * @description Default lens most often active during gameplay
 */
import LensManager from '/core/ui/lenses/lens-manager.js';
class DefaultLens {
    constructor() {
        this.activeLayers = new Set([
            'fxs-hexgrid-layer',
            'fxs-resource-layer',
            'fxs-culture-borders-layer',
            'fxs-operation-target-layer'
        ]);
        this.allowedLayers = new Set([]);
    }
}
LensManager.registerLens('fxs-default-lens', new DefaultLens());
//# sourceMappingURL=file:///base-standard/ui/lenses/lens/default-lens.js.map
