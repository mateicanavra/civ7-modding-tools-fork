/**
 * @file continent-layer
 * @copyright 2024, Firaxis Games
 * @description Lens layer to show settling appeal of a plots
 */

import LensManager, { ILensLayer } from '/core/ui/lenses/lens-manager.js'
import PlotIconsManager from '/core/ui/plot-icons/plot-icons-manager.js';
import { OVERLAY_PRIORITY } from '/base-standard/ui/utilities/utilities-overlay.js';

export type ContinentPlotList = {
	continent: ContinentType,
	plotList: PlotCoord[],
	availableResources: number,
	totalResources: number,
	isDistant: boolean,
	color: number
}

type PlotResource = {
	plotCoord: PlotCoord,
	resourceDef: ResourceDefinition
}

// Default style - Only used to initialize the BorderOverlay
const availableStyle: WorldUI.BorderStyle = {
	style: "CultureBorder_Closed",
	primaryColor: 0xFFFFFFFF,
	secondaryColor: 0x00FFFFFF
};

const ownedStyle: WorldUI.BorderStyle = {
	style: "CultureBorder_CityState_Closed",
	primaryColor: 0xFFFFFFFF,
	secondaryColor: 0x00AAAAAA
};

// currently max of 6 continents per game
// Hex ABGR format that works with WorldUI
export const CONTINENT_COLORS = <const>[
	0x4d01d8f7, // 0x4d -> ~0.3 alpha
	0x4d1281ff,
	0x59cd006d, // 0x59 -> ~0.35 alpha
	0x4d00bb4d,
	0x66cd5000, // 0x66 -> 0.4 alpha
	0x4d0100cc
]

export const ToggleContinentPanelEventName = 'raise-continent-panel' as const;
export class ToggleContinentPanelEvent extends CustomEvent<{ enabled: boolean }> {
	constructor(enabled: boolean) {
		super(ToggleContinentPanelEventName, { bubbles: true, cancelable: true, detail: { enabled } });
	}
}

export class ContinentLensLayer implements ILensLayer {
	static readonly instance = new ContinentLensLayer();

	private continentOverlayGroup = WorldUI.createOverlayGroup("ContinentOverlayGroup", OVERLAY_PRIORITY.CONTINENT_LENS);
	private continentOverlay = this.continentOverlayGroup.addPlotOverlay();
	// TODO unless they need to overlap, combine BorderOverlays into one with different group styles
	private resourceOverlay: WorldUI.BorderOverlay = this.continentOverlayGroup.addBorderOverlay(availableStyle);
	private unavailableResourceOverlay: WorldUI.BorderOverlay = this.continentOverlayGroup.addBorderOverlay(ownedStyle);
	private ownedResourceOverlay: WorldUI.BorderOverlay = this.continentOverlayGroup.addBorderOverlay(ownedStyle);
	private textOverlay = this.continentOverlayGroup.addSpriteOverlay();

	private continentCoords: ContinentPlotList[] = [];
	private treasureCoords: PlotResource[] = [];
	private naturalWonderCoords: PlotCoord[] = [];

	private get isExplorationAge() {
		return Game.age == Game.getHash("AGE_EXPLORATION");
	}

	private get isModernAge() {
		return Game.age == Game.getHash("AGE_MODERN");
	}

	private clearOverlay() {
		this.continentOverlayGroup.clearAll();
		this.continentOverlay.clear();
		this.resourceOverlay.clear();
		this.unavailableResourceOverlay.clear();
	}

	// Note: copied from tooltips with minor changes, consider moving elsewhere
	private getContinentName(continentType: ContinentType): string {
		if (continentType != -1) {
			const continent = GameInfo.Continents.lookup(continentType);
			if (continent == null) {
				console.error("Error retrieving continent name for lens!");
				return Locale.compose("LOC_TERM_NONE");
			} else {
				return Locale.compose(continent.Description ? continent.Description : "LOC_TERM_NONE");
			}
		}
		else {
			// Expected case for tiles which are not part of a continent like oceans
			return Locale.compose("LOC_TERM_NONE");
		}
	}

	public get continentsList() {
		return this.continentCoords;
	}

	initLayer() {
		const player = Players.get(GameContext.localPlayerID);
		if (!player) {
			console.error(`continent-layer: Failed to find local player!`);
			return;
		}

		// initialize continent info. We only need to do this once since continents won't change.
		let nextColorIndex = 0;
		const width = GameplayMap.getGridWidth();
		const height = GameplayMap.getGridHeight();
		for (let x = 0; x < width; x++) {
			for (let y = 0; y < height; y++) {
				const plotCoord: PlotCoord = { x, y };

				// if the map contains this continent add the coord to the associated continent
				let inMap = false;
				const currentContinent = GameplayMap.getContinentType(plotCoord.x, plotCoord.y);
				// If we do not have a valid continent we do not care about this plot. Note that we do want to tint lakes and navigeable rivers so checking for water will not work.
				if (GameplayMap.isNaturalWonder(plotCoord.x, plotCoord.y) && currentContinent == -1) {
					this.naturalWonderCoords.push(plotCoord);
				}

				if (currentContinent == -1) {
					continue;
				}

				for (const continentPlotList of this.continentCoords) {
					if (continentPlotList.continent == currentContinent) {
						continentPlotList.plotList.push(plotCoord);
						inMap = true;
					}
				}

				if (!inMap) {
					this.continentCoords.push({ continent: currentContinent, plotList: [plotCoord], availableResources: 0, totalResources: 0, isDistant: true, color: CONTINENT_COLORS[nextColorIndex] });
					nextColorIndex++;
					if (nextColorIndex >= CONTINENT_COLORS.length) {
						console.error("continent-layer: nextColorIndex greater than number of colors in CONTINENT_COLORS");
					}
				}

				if (this.isExplorationAge) {
					// Treasure Resource Check
					const resource = GameplayMap.getResourceType(plotCoord.x, plotCoord.y);
					if (resource) {
						const resourceDef = GameInfo.Resources.lookup(resource);
						if (resourceDef && resourceDef.ResourceClassType == "RESOURCECLASS_TREASURE") {
							this.treasureCoords.push({ plotCoord, resourceDef });
						}
					}

					// Distant Lands Check
					if (!player.isDistantLands(plotCoord)) {
						const continent = this.continentCoords.find((continent) => { return continent.continent == currentContinent; });
						if (continent) {
							continent.isDistant = false;
						}
					}
				}
			}
		}

	}

	applyLayer() {
		this.clearOverlay();
		for (const continentPlotList of this.continentCoords) {
			continentPlotList.availableResources = 0;
			continentPlotList.totalResources = 0;

			// TODO after overlay FoW is updated, remove this for continent info, gameplay info like resources should still check visibility
			// Check if the plot is revealed
			const revealedPlots: PlotCoord[] = [];
			for (let coord = 0; coord < continentPlotList.plotList.length; coord++) {
				const revealedState = GameplayMap.getRevealedState(GameContext.localPlayerID, continentPlotList.plotList[coord].x, continentPlotList.plotList[coord].y);
				if (revealedState != RevealedStates.HIDDEN) {
					revealedPlots.push(continentPlotList.plotList[coord]);
				}
			}

			for (let coord = 0; coord < this.naturalWonderCoords.length; coord++) {
				const revealedState = GameplayMap.getRevealedState(GameContext.localPlayerID, this.naturalWonderCoords[coord].x, this.naturalWonderCoords[coord].y);
				if (revealedState != RevealedStates.HIDDEN) {
					revealedPlots.push(this.naturalWonderCoords[coord]);
				}
			}

			if (this.isExplorationAge) {
				const unavailablePlots: PlotCoord[] = [];
				const availablePlots: PlotCoord[] = [];
				const ownedPlots: PlotCoord[] = [];
				for (const plotToResource of this.treasureCoords) {
					if (continentPlotList.plotList.find((plotCoord) => { return plotCoord == plotToResource.plotCoord; })) {
						const revealedState = GameplayMap.getRevealedState(GameContext.localPlayerID, plotToResource.plotCoord.x, plotToResource.plotCoord.y);
						if (revealedState != RevealedStates.HIDDEN) {
							const ownerID = GameplayMap.getOwner(plotToResource.plotCoord.x, plotToResource.plotCoord.y);

							if (ownerID == -1) {
								availablePlots.push(plotToResource.plotCoord);
								continentPlotList.availableResources++;				// keep tally of available resources
							}
							else if (ownerID == GameContext.localPlayerID) {
								ownedPlots.push(plotToResource.plotCoord);
							}
							else {
								unavailablePlots.push(plotToResource.plotCoord);
							}
							continentPlotList.totalResources++;						// keep tally of total here to only show the player revealed resources
						}
					}
				}

				this.ownedResourceOverlay.setPlotGroups(ownedPlots, 2);
				this.unavailableResourceOverlay.setPlotGroups(unavailablePlots, 0);
				this.resourceOverlay.setPlotGroups(availablePlots, 1);
			}
			else if (this.isModernAge) {
				const ruinsPlots: PlotCoord[] = [];
				const researchPlots: PlotCoord[] = [];
				const naturalWonderPlots: PlotCoord[] = [];
				const researchNum = Players.get(GameContext.localPlayerID)?.Culture?.getNumAgesAvailableToResearch(continentPlotList.continent) ?? 0;
				continentPlotList.totalResources = Players.get(GameContext.localPlayerID)?.Culture?.getContinentRuralRuinCount(continentPlotList.continent) ?? 0;
				const player = Players.get(GameContext.localPlayerID);
				if (player) {
					const playerStats = player.Stats;
					if (playerStats) {
						for (const plotCoordinate of revealedPlots) {
							const constructibles = MapConstructibles.getHiddenFilteredConstructibles(plotCoordinate.x, plotCoordinate.y);
							constructibles.forEach((item) => {
								const instance = Constructibles.getByComponentID(item);
								if (instance) {
									const info = GameInfo.Constructibles.lookup(instance.type);
									if (info) {
										if (info.ConstructibleType == "IMPROVEMENT_RUINS") {
											ruinsPlots.push(plotCoordinate);
											continentPlotList.availableResources++;
											PlotIconsManager.addPlotIcon('plot-icon-archeology', plotCoordinate, new Map([['archeology', "IMPROVEMENT_RUINS"]]));
										}
										if (info.ConstructibleType == "BUILDING_MUSEUM" && instance.complete && !instance.damaged && researchNum > 0) {
											researchPlots.push(plotCoordinate);
											PlotIconsManager.addPlotIcon('plot-icon-archeology', plotCoordinate, new Map([['archeology', "BUILDING_MUSEUM"]]));
										}
										if ((info.ConstructibleType == "BUILDING_UNIVERSITY" || info.ConstructibleType == "BUILDING_UNIVERSITY_MO") && instance.complete && !instance.damaged && researchNum > 0) {
											researchPlots.push(plotCoordinate);
											PlotIconsManager.addPlotIcon('plot-icon-archeology', plotCoordinate, new Map([['archeology', "BUILDING_UNIVERSITY"]]));
										}
									}
								}
							});

							if (GameplayMap.isNaturalWonder(plotCoordinate.x, plotCoordinate.y)) {

								if (playerStats.hasNaturalWonderArtifact(GameplayMap.getFeatureType(plotCoordinate.x, plotCoordinate.y))) {
									naturalWonderPlots.push(plotCoordinate);
									PlotIconsManager.addPlotIcon('plot-icon-archeology', plotCoordinate, new Map([['archeology', "NATURAL_WONDER"]]));
								}
							}
						}
					}
				}
				this.resourceOverlay.setPlotGroups(ruinsPlots, 1);
				this.resourceOverlay.setPlotGroups(researchPlots, 0);
				this.resourceOverlay.setPlotGroups(naturalWonderPlots, 2)

			}

			if (revealedPlots.length > 0) {

				this.continentOverlay.addPlots(revealedPlots, { fillColor: continentPlotList.color });

				// Try to have approximately one label per 60 hexes, skipping regions with less than 8 hexes
				let continentName = this.getContinentName(continentPlotList.continent);
				this.textOverlay.addRegionText(continentName, revealedPlots, 60, 8, { fonts: TITLE_FONTS, fontSize: 20 });
			}
		}

		window.dispatchEvent(new ToggleContinentPanelEvent(true));
	}

	removeLayer() {
		window.dispatchEvent(new ToggleContinentPanelEvent(false));
		this.clearOverlay();
		PlotIconsManager.removePlotIcons('plot-icon-archeology');
	}


}

declare global {
	interface LensLayerTypeMap {
		'fxs-continent-layer': ContinentLensLayer
	}
}

LensManager.registerLensLayer('fxs-continent-layer', ContinentLensLayer.instance);