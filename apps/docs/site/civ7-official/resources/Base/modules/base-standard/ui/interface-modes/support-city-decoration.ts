/**
 * @file City Decoration support
 * @copyright 2022, Firaxis Games
 * @description City Decoration support for interface modes (city-selected, city-production, city-growth, city-info)
 */

import { ComponentID } from '/core/ui/utilities/utilities-component-id.js'
import { OVERLAY_PRIORITY } from '/base-standard/ui/utilities/utilities-overlay.js';

export namespace CityDecorationSupport {

	// TODO: Pull from assets/engine so there is an opportunity to get color correct values (HDR, colorblind, etc...)
	export enum HighlightColors {
		citySelection = 0xFFBF9C7A,
		urbanSelection = 0xFFBF9C7A,
		ruralSelection = 0xFF4DB50C,
	}

	class Instance {

		private cityOverlayGroup: WorldUI.OverlayGroup | null = null;
		private cityOverlay: WorldUI.PlotOverlay | null = null;

		private beforeUnloadListener = () => { this.onUnload(); }

		initializeOverlay() {
			this.cityOverlayGroup = WorldUI.createOverlayGroup("CityOverlayGroup", OVERLAY_PRIORITY.PLOT_HIGHLIGHT);
			this.cityOverlay = this.cityOverlayGroup.addPlotOverlay();

			engine.on('BeforeUnload', this.beforeUnloadListener);

		}

		decoratePlots(cityID: ComponentID) {

			this.cityOverlayGroup?.clearAll();

			const city: City | null = Cities.get(cityID);
			if (!city) {
				console.error(`City Decoration support: Failed to find city (${ComponentID.toLogString(cityID)})!`);
				return;
			}

			this.cityOverlay?.addPlots(city.location, { edgeColor: HighlightColors.citySelection });

			const cityDistricts: CityDistricts | undefined = city.Districts;
			if (cityDistricts) {
				// Highlight the rural districts
				const districtIdsRural = cityDistricts.getIdsOfType(DistrictTypes.RURAL);
				if (districtIdsRural.length > 0) {
					const locations: PlotCoord[] = Districts.getLocations(districtIdsRural);
					if (locations.length > 0) {
						this.cityOverlay?.addPlots(locations, { edgeColor: HighlightColors.ruralSelection });
					}
				}
				// Highlight the urban districts
				const districtIdsUrban = cityDistricts.getIdsOfTypes([DistrictTypes.URBAN, DistrictTypes.CITY_CENTER]);
				if (districtIdsUrban.length > 0) {
					const locations: PlotCoord[] = Districts.getLocations(districtIdsUrban);
					if (locations.length > 0) {
						this.cityOverlay?.addPlots(locations, { edgeColor: HighlightColors.urbanSelection });
					}
				}
			}
		}

		onUnload() {
			this.clearDecorations();
		}

		clearDecorations() {
			this.cityOverlayGroup?.clearAll();
		}
	}
	export const manager = new Instance();
}
