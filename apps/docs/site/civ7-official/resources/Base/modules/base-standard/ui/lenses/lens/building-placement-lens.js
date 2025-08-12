/**
 * @file building-placement-lens
 * @copyright 2023, Firaxis Games
 * @description Lens used when selecting a tile to construct a new building
 */
import LensManager from '/core/ui/lenses/lens-manager.js';
class BuildingPlacementLens {
    constructor() {
        this.activeLayers = new Set([
            'fxs-hexgrid-layer',
            'fxs-resource-layer',
            'fxs-building-placement-layer',
            'fxs-city-borders-layer'
        ]);
        this.allowedLayers = new Set([
            'fxs-appeal-layer'
        ]);
    }
}
LensManager.registerLens('fxs-building-placement-lens', new BuildingPlacementLens());

//# sourceMappingURL=file:///base-standard/ui/lenses/lens/building-placement-lens.js.map
