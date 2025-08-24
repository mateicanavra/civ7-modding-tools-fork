/**
 * @file culture-borders-layer
 * @copyright 2024-2025, Firaxis Games
 * @description Lens layer that shows a civs/cultures city borders get merged with adjacent owned tiles
 */

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

// Default style - Only used to initialize the BorderOverlay
const defaultStyle: WorldUI.BorderStyle = {
	style: BorderStyleTypes.CityStateOpen,
	primaryColor: independentPrimaryColor,
	secondaryColor: independentSecondaryColor
};

const thicknessZoomMultiplier: number = 3;

class CultureBordersLayer implements ILensLayer {

	private cultureOverlayGroup: WorldUI.OverlayGroup = WorldUI.createOverlayGroup("CultureBorderOverlayGroup", OVERLAY_PRIORITY.CULTURE_BORDER);
	private cultureBorderOverlay: WorldUI.BorderOverlay = this.cultureOverlayGroup.addBorderOverlay(defaultStyle);

	private lastZoomLevel = -1;

	/**
	 * @implements ILensLayer
	 */
	initLayer() {
		const alivePlayers = Players.getAlive();
		alivePlayers.forEach((player) => {

			// For city-states and major players used city purchased plots to determine owned plots
			// For independents use constructible locations for owned plots
			const plotsForPlayer: WorldUI.PlotSet =
				player.isIndependent ?
					this.findPlotsForIndependent(player) :
					this.findPlotsForPlayerOrCityState(player);

			// Set border group style
			const primary = UI.Player.getPrimaryColorValueAsHex(player.id);
			const secondary = UI.Player.getSecondaryColorValueAsHex(player.id);
			const borderStyle: WorldUI.BorderStyle = {
				style: BorderStyleTypes.Closed,
				primaryColor: primary,
				secondaryColor: secondary
			};

			// Check if we want to use city-state or independent styles
			if (player.isIndependent) {
				borderStyle.style = BorderStyleTypes.CityStateOpen;
				borderStyle.primaryColor = independentPrimaryColor;
				borderStyle.secondaryColor = independentSecondaryColor;
			} else if (!player.isMajor) {
				borderStyle.style = BorderStyleTypes.CityStateClosed;
			}

			this.cultureBorderOverlay.setGroupStyle(player.id, borderStyle);

			// Set plots for player if they have any plots
			if (plotsForPlayer.length > 0) {
				this.cultureBorderOverlay.setPlotGroups(plotsForPlayer, player.id);
			}
		})

		this.cultureOverlayGroup.setVisible(false);	// Layer starts hidden until applied.

		engine.on('CameraChanged', this.onCameraChanged);
		engine.on('PlotOwnershipChanged', this.onPlotOwnershipChanged);
	}

	/**
	 * @implements ILensLayer
	 */
	applyLayer() {
		this.cultureOverlayGroup.setVisible(true);
	}

	/**
	 * @implements ILensLayer
	 */
	removeLayer() {
		this.cultureOverlayGroup.setVisible(false);
	}

	private findPlotsForPlayerOrCityState(player: PlayerLibrary): PlotIndex[] {
		let plotIndexes: PlotIndex[] = [];

		const playerCities = player.Cities?.getCities();
		if (!playerCities) {
			console.error(`city-borders-layer: initLayer() failed to find cities for PlayerID ${player.id}`);
			return plotIndexes;
		}

		// Find all the plots owned by the player
		playerCities.forEach((city) => {
			const cityPlots = city.getPurchasedPlots();
			plotIndexes = plotIndexes.concat(cityPlots);
		})

		return plotIndexes;
	}

	private findPlotsForIndependent(player: PlayerLibrary): PlotIndex[] {
		let plotIndexes: PlotIndex[] = [];

		player.Constructibles?.getConstructibles().forEach(construct => {
			const constructDef: ConstructibleDefinition | null = GameInfo.Constructibles.lookup(construct.type);
			if (constructDef) {
				if (constructDef.ConstructibleType == "IMPROVEMENT_VILLAGE" || constructDef.ConstructibleType == "IMPROVEMENT_ENCAMPMENT") {
					const villagePlotIndex = GameplayMap.getIndexFromLocation(construct.location);
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

		return plotIndexes;
	}

	private onPlotOwnershipChanged = (data: PlotOwnershipChanged_EventData) => {
		const plotIndex = GameplayMap.getIndexFromLocation(data.location);

		// Remove plot from prior owner if valid
		if (data.priorOwner != PlayerIds.NO_PLAYER) {
			this.cultureBorderOverlay.clearPlotGroups(plotIndex);
		}

		// Add plot to new owner
		if (data.owner != PlayerIds.NO_PLAYER) {
			this.cultureBorderOverlay.setPlotGroups(plotIndex, data.owner);
		}
	}

	private onCameraChanged = (camera: CameraState) => {
		if (this.lastZoomLevel != camera.zoomLevel) {
			this.lastZoomLevel = camera.zoomLevel;
			this.cultureBorderOverlay?.setThicknessScale(camera.zoomLevel * thicknessZoomMultiplier);	// Set thickness to 0 when zoomed all the way in.
		}
	}

}

declare global {
	interface LensLayerTypeMap {
		'fxs-culture-borders-layer': CultureBordersLayer
	}
}

LensManager.registerLensLayer('fxs-culture-borders-layer', new CultureBordersLayer());