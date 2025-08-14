/**
 * @file cinematic-lens
 * @copyright 2022, Firaxis Games
 * @description Lens used cinematics are playing
 */
import LensManager from '/core/ui/lenses/lens-manager.js';
class CinematicLens {
    constructor() {
        this.activeLayers = new Set([]);
        this.allowedLayers = new Set([]);
    }
}
LensManager.registerLens('fxs-cinematic-lens', new CinematicLens());

//# sourceMappingURL=file:///base-standard/ui/lenses/lens/cinematic-lens.js.map
