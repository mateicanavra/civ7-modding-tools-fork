/**
 * @file city-borders-layer
 * @copyright 2024, Firaxis Games
 * @description Lens layer for city borders where individual city bounds are represented if two cities are adjacent
 */

import { ComponentID } from '/core/ui/utilities/utilities-component-id.js'
import LensManager, { ILensLayer } from '/core/ui/lenses/lens-manager.js'
import { OVERLAY_PRIORITY } from '/base-standard/ui/utilities/utilities-overlay.js';

enum BorderStyleTypes {
	Closed = "CultureBorder_Closed",
	CityStateClosed = "CultureBorder_CityState_Closed",
	CityStateOpen = "CultureBorder_CityState_Open"
}

// TODO: Pull from database or gamecore when implemented
const independentPrimaryColor = 0xFF333333;
const independentSecondaryColor = 0xFFCCFFFF;

/** Default style - Only used to initialize the BorderOverlay */
const defaultStyle: WorldUI.BorderStyle = {
	style: BorderStyleTypes.CityStateOpen,
	primaryColor: independentPrimaryColor,
	secondaryColor: independentSecondaryColor
};

const thicknessZoomMultiplier: number = 3;

class CityBordersLayer implements ILensLayer {

	private cityOverlayGroup: WorldUI.OverlayGroup = WorldUI.createOverlayGroup("CityBorderOverlayGroup", OVERLAY_PRIORITY.CULTURE_BORDER);

	/** Map of border overlays keyed by the PlotIndex of the city */
	private borderOverlayMap: Map<PlotIndex, WorldUI.BorderOverlay> = new Map<PlotIndex, WorldUI.BorderOverlay>();

	/** Map of city center plot indexes keyed by plot indexes owned by that city */
	private ownedPlotMap: Map<PlotIndex, PlotIndex> = new Map<PlotIndex, PlotIndex>();

	private lastZoomLevel = -1;

	initLayer() {
		const alivePlayers = Players.getAlive();
		alivePlayers.forEach((player) => {
			if (player.isIndependent) {
				this.initBordersForIndependent(player);
			} else {
				this.initBordersForPlayer(player);
			}
		})

		engine.on('CameraChanged', this.onCameraChanged);
		engine.on('PlotOwnershipChanged', this.onPlotOwnershipChanged);

		this.cityOverlayGroup.setVisible(false);
	}

	private getBorderOverlay(plotIndex: PlotIndex): WorldUI.BorderOverlay {
		// First assuming we're looking for the border overlay by city center plot index
		const borderOverlay = this.borderOverlayMap.get(plotIndex);
		if (borderOverlay) {
			return borderOverlay;
		}

		// If that fails see if this plot index is tied to an existing border overlay
		const owningPlot = this.ownedPlotMap.get(plotIndex);
		if (owningPlot) {
			const borderOverlay = this.borderOverlayMap.get(owningPlot);
			if (borderOverlay) {
				return borderOverlay;
			}
		}

		return this.createBorderOverlay(plotIndex);
	}

	private createBorderOverlay(plotIndex: PlotIndex): WorldUI.BorderOverlay {
		const borderOverlay = this.cityOverlayGroup.addBorderOverlay(defaultStyle);

		// Find the owning player for this plot index
		const plotLocation = GameplayMap.getLocationFromIndex(plotIndex);
		const ownerId = GameplayMap.getOwner(plotLocation.x, plotLocation.y);
		const owner = Players.get(ownerId);
		if (!owner) {
			console.error(`city-borders-layer: createBorderOverlay failed to create overlay for plotIndex ${plotIndex}`);
			return borderOverlay;
		}

		// Set border group style
		const primary = UI.Player.getPrimaryColorValueAsHex(owner.id);
		const secondary = UI.Player.getSecondaryColorValueAsHex(owner.id);
		const borderStyle: WorldUI.BorderStyle = {
			style: BorderStyleTypes.Closed,
			primaryColor: primary,
			secondaryColor: secondary
		};

		// Check if we want to use city-state or independent styles
		if (owner.isIndependent) {
			borderStyle.style = BorderStyleTypes.CityStateOpen;
			borderStyle.primaryColor = independentPrimaryColor;
			borderStyle.secondaryColor = independentSecondaryColor;
		} else if (!owner.isMajor) {
			borderStyle.style = BorderStyleTypes.CityStateClosed;
		}

		borderOverlay.setDefaultStyle(borderStyle);

		this.borderOverlayMap.set(plotIndex, borderOverlay);
		return borderOverlay;
	}

	private initBordersForPlayer(player: PlayerLibrary) {
		const playerCities = player.Cities?.getCities();
		if (!playerCities) {
			console.error(`city-borders-layer: initLayer() failed to find cities for PlayerID ${player.id}`);
			return;
		}

		// Find all the plots owned by the player
		playerCities.forEach((city) => {
			const cityPlots = city.getPurchasedPlots();
			if (cityPlots.length > 0) {
				const cityPlotIndex = GameplayMap.getIndexFromLocation(city.location);
				this.ownedPlotMap.set(cityPlotIndex, cityPlotIndex);
				const borderOverlay = this.getBorderOverlay(cityPlotIndex);
				borderOverlay.setPlotGroups(cityPlots, 0);

				cityPlots.forEach((plotIndex) => {
					this.ownedPlotMap.set(plotIndex, cityPlotIndex);
				});
			}
		})
	}

	private initBordersForIndependent(player: PlayerLibrary) {
		let villagePlotIndex: PlotIndex = -1;
		let plotIndexes: PlotIndex[] = [];

		player.Constructibles?.getConstructibles().forEach(construct => {
			const constructDef: ConstructibleDefinition | null = GameInfo.Constructibles.lookup(construct.type);
			if (constructDef) {
				if (constructDef.ConstructibleType == "IMPROVEMENT_VILLAGE" || constructDef.ConstructibleType == "IMPROVEMENT_ENCAMPMENT") {
					villagePlotIndex = GameplayMap.getIndexFromLocation(construct.location);
					plotIndexes = plotIndexes.concat(villagePlotIndex);

					const adjacentPlotDirection: DirectionTypes[] = [
						DirectionTypes.DIRECTION_NORTHEAST,
						DirectionTypes.DIRECTION_EAST,
						DirectionTypes.DIRECTION_SOUTHEAST,
						DirectionTypes.DIRECTION_SOUTHWEST,
						DirectionTypes.DIRECTION_WEST,
						DirectionTypes.DIRECTION_NORTHWEST
					];

					// Loop through each direction type, and if they are not hidden and owned, add.
					for (let directionIndex: number = 0; directionIndex < adjacentPlotDirection.length; directionIndex++) {
						let plot: PlotCoord = GameplayMap.getAdjacentPlotLocation(construct.location, adjacentPlotDirection[directionIndex]);
						let owner: number = GameplayMap.getOwner(plot.x, plot.y);
						if (owner == player.id) {
							plotIndexes = plotIndexes.concat(GameplayMap.getIndexFromLocation(plot));
						}
					}
				}
			}
		});

		if (plotIndexes.length > 0) {
			const borderOverlay = this.getBorderOverlay(villagePlotIndex);
			borderOverlay.setPlotGroups(plotIndexes, 0);
		}
	}

	private onPlotOwnershipChanged = (data: PlotOwnershipChanged_EventData) => {
		const plotIndex = GameplayMap.getIndexFromLocation(data.location);

		// Remove plot from prior owner if valid
		if (data.priorOwner != PlayerIds.NO_PLAYER) {
			const previousOverlay = this.getBorderOverlay(plotIndex);
			previousOverlay.clearPlotGroups(plotIndex);
			this.ownedPlotMap.delete(plotIndex);
		}

		// Add plot to new owner
		if (data.owner != PlayerIds.NO_PLAYER) {
			this.ownedPlotMap.set(plotIndex, this.findCityCenterIndexForPlotIndex(plotIndex));
			const newOverlay = this.getBorderOverlay(plotIndex);
			newOverlay.setPlotGroups(plotIndex, 0);
		}
	}

	private findCityCenterIndexForPlotIndex(plotIndex: PlotIndex): PlotIndex {
		const plotCoord = GameplayMap.getLocationFromIndex(plotIndex);
		const owningCityId = GameplayMap.getOwningCityFromXY(plotCoord.x, plotCoord.y);
		if (!owningCityId) {
			return -1;		// off the map
		}

		const player = Players.get(owningCityId.owner);
		if (!player) {
			console.error(`city-borders-layer: findCityCenterIndexForPlotIndex failed to find owning player for plotIndex ${plotIndex}`);
			return -1;
		}

		if (player.isIndependent) {
			let villagePlotIndex = -1;
			player.Constructibles?.getConstructibles().forEach(construct => {
				const constructDef: ConstructibleDefinition | null = GameInfo.Constructibles.lookup(construct.type);
				if (constructDef) {
					if (constructDef.ConstructibleType == "IMPROVEMENT_VILLAGE") {
						villagePlotIndex = GameplayMap.getIndexFromLocation(construct.location);
					}
				}
			});
			if (villagePlotIndex == -1) {
				console.error(`city-borders-layer: findCityCenterIndexForPlotIndex failed to find villagePlotIndex for plotIndex ${plotIndex}`);
			}
			return villagePlotIndex;
		}

		const owningCity: City | undefined = player.Cities?.getCities().find((city) => {
			return ComponentID.isMatch(city.id, owningCityId);
		})

		if (!owningCity) {
			console.error(`city-borders-layer: findCityCenterIndexForPlotIndex failed to find owningCity for plotIndex ${plotIndex}`);
			return -1;
		}

		return GameplayMap.getIndexFromLocation(owningCity.location);
	}

	private onCameraChanged = (camera: CameraState) => {
		if (this.lastZoomLevel != camera.zoomLevel) {
			this.lastZoomLevel = camera.zoomLevel;
			this.borderOverlayMap.forEach((borderOverlay) => {
				borderOverlay.setThicknessScale(camera.zoomLevel * thicknessZoomMultiplier);	// Set thickness to 0 when zoomed all the way in.
			})
		}
	}

	applyLayer() {
		this.cityOverlayGroup.setVisible(true);
	}

	removeLayer() {
		this.cityOverlayGroup.setVisible(false);
	}


}

declare global {
	interface LensLayerTypeMap {
		'fxs-city-borders-layer': CityBordersLayer
	}
}

LensManager.registerLensLayer('fxs-city-borders-layer', new CityBordersLayer());