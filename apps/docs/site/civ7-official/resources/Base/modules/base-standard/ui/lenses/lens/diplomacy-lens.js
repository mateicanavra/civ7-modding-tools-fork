/**
 * @file diplomacy-lens
 * @copyright 2023, Firaxis Games
 * @description Lens used when in diplomacy modes
 */
import LensManager from '/core/ui/lenses/lens-manager.js';
class DiplomacyLens {
    constructor() {
        this.activeLayers = new Set([]);
        this.allowedLayers = new Set([
            'fxs-hexgrid-layer'
        ]);
    }
}
LensManager.registerLens('fxs-diplomacy-lens', new DiplomacyLens());

//# sourceMappingURL=file:///base-standard/ui/lenses/lens/diplomacy-lens.js.map
