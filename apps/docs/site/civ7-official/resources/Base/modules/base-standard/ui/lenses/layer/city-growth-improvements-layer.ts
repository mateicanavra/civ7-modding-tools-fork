/**
 * @file city-growth-improvements-layer
 * @copyright 2024, Firaxis Games
 * @description Lens layer which shows which improvements will be built when expanding to new Rural plots
 */

import LensManager, { ILensLayer } from '/core/ui/lenses/lens-manager.js';
import PlacePopulation, { ExpandPlotData } from '/base-standard/ui/place-population/model-place-population.js';

class CityGrowthImprovementsLensLayer implements ILensLayer {

	private readonly spriteOffset: float3 = { x: 0, y: -15, z: 5 };
	private readonly spriteScale: number = 1;

	private improvementSpriteGrid: WorldUI.SpriteGrid = WorldUI.createSpriteGrid("CityGrowthImprovements_SpriteGroup", true);

	private expandPlotDataUpdatedEventListener = this.updateImprovementIcons.bind(this);

	initLayer() {
		this.improvementSpriteGrid.setVisible(false);
	}

	applyLayer() {
		this.updateImprovementIcons(PlacePopulation.getExpandPlots())

		PlacePopulation.ExpandPlotDataUpdatedEvent.on(this.expandPlotDataUpdatedEventListener)

		this.improvementSpriteGrid.setVisible(true);
	}

	removeLayer() {

		PlacePopulation.ExpandPlotDataUpdatedEvent.off(this.expandPlotDataUpdatedEventListener)

		this.improvementSpriteGrid.clear();
		this.improvementSpriteGrid.setVisible(false);
	}

	private updateImprovementIcons(data: ExpandPlotData[]) {
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

declare global {
	interface LensLayerTypeMap {
		'fxs-city-growth-improvements-layer': CityGrowthImprovementsLensLayer
	}
}

LensManager.registerLensLayer('fxs-city-growth-improvements-layer', new CityGrowthImprovementsLensLayer());