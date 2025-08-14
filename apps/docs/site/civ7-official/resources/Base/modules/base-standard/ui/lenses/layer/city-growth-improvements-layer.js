/**
 * @file city-growth-improvements-layer
 * @copyright 2024, Firaxis Games
 * @description Lens layer which shows which improvements will be built when expanding to new Rural plots
 */
import LensManager from '/core/ui/lenses/lens-manager.js';
import PlacePopulation from '/base-standard/ui/place-population/model-place-population.js';
class CityGrowthImprovementsLensLayer {
    constructor() {
        this.spriteOffset = { x: 0, y: -15, z: 5 };
        this.spriteScale = 1;
        this.improvementSpriteGrid = WorldUI.createSpriteGrid("CityGrowthImprovements_SpriteGroup", true);
        this.expandPlotDataUpdatedEventListener = this.updateImprovementIcons.bind(this);
    }
    initLayer() {
        this.improvementSpriteGrid.setVisible(false);
    }
    applyLayer() {
        this.updateImprovementIcons(PlacePopulation.getExpandPlots());
        PlacePopulation.ExpandPlotDataUpdatedEvent.on(this.expandPlotDataUpdatedEventListener);
        this.improvementSpriteGrid.setVisible(true);
    }
    removeLayer() {
        PlacePopulation.ExpandPlotDataUpdatedEvent.off(this.expandPlotDataUpdatedEventListener);
        this.improvementSpriteGrid.clear();
        this.improvementSpriteGrid.setVisible(false);
    }
    updateImprovementIcons(data) {
        this.improvementSpriteGrid.clear();
        for (const entry of data) {
            if (entry.constructibleType) {
                const constructibleDefinition = GameInfo.Constructibles.lookup(entry.constructibleType);
                if (constructibleDefinition) {
                    const icon = UI.getIconBLP(constructibleDefinition.ConstructibleType, "BUILDING");
                    this.improvementSpriteGrid.addSprite(entry.plotIndex, icon, this.spriteOffset, { scale: this.spriteScale });
                }
            }
        }
    }
}
LensManager.registerLensLayer('fxs-city-growth-improvements-layer', new CityGrowthImprovementsLensLayer());

//# sourceMappingURL=file:///base-standard/ui/lenses/layer/city-growth-improvements-layer.js.map
