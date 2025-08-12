/**
 * @file building-placement-layer
 * @copyright 2023-2025, Firaxis Games
 * @description Lens layer to show yield deltas and adjacencies from placing a building
 */

import BuildingPlacementManager, { YieldPillData, BuildingPlacementHoveredPlotChangedEventName } from '/base-standard/ui/building-placement/building-placement-manager.js';
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js'
import LensManager, { ILensLayer } from '/core/ui/lenses/lens-manager.js';
import { SortYields } from '/base-standard/ui/utilities/utilities-city-yields.js'

interface BuildingSlotData {
	iconURL: string;
	/** Denotes a building slot that has a building currently being built in it */
	turnsToCompletion?: number;
	/** Denotes a building froma previous age that can be replaced by the current building */
	replaceable?: boolean;
}

const adjacencyIcons: Map<DirectionTypes, string> = new Map<DirectionTypes, string>([
	[DirectionTypes.DIRECTION_EAST, "adjacencyarrow_east"],
	[DirectionTypes.DIRECTION_NORTHEAST, "adjacencyarrow_northeast"],
	[DirectionTypes.DIRECTION_NORTHWEST, "adjacencyarrow_northwest"],
	[DirectionTypes.DIRECTION_SOUTHEAST, "adjacencyarrow_southeast"],
	[DirectionTypes.DIRECTION_SOUTHWEST, "adjacencyarrow_southwest"],
	[DirectionTypes.DIRECTION_WEST, "adjacencyarrow_west"]
]);

class WorkerYieldsLensLayer implements ILensLayer {

	private BUILD_SLOT_SPRITE_PADDING: number = 12;
	private YIELD_SPRITE_PADDING: number = 11;
	private YIELD_WRAP_AT: number = 3;
	private YIELD_WRAPPED_ROW_OFFSET: number = 8;

	private yieldSpriteGrid: WorldUI.SpriteGrid = WorldUI.createSpriteGrid("BuildingPlacementYields_SpriteGroup", true);
	private adjacenciesSpriteGrid: WorldUI.SpriteGrid = WorldUI.createSpriteGrid("Adjacencies_SpriteGroup", true);

	private buildingPlacementPlotChangedListener = this.onBuildingPlacementPlotChanged.bind(this);

	initLayer() {
		this.yieldSpriteGrid.setVisible(false);
		this.adjacenciesSpriteGrid.setVisible(false);
	}

	applyLayer() {
		this.realizeBuidlingPlacementSprites();
		this.yieldSpriteGrid.setVisible(true);

		window.addEventListener(BuildingPlacementHoveredPlotChangedEventName, this.buildingPlacementPlotChangedListener);
	}

	removeLayer() {
		this.yieldSpriteGrid.clear();
		this.yieldSpriteGrid.setVisible(false);
		this.adjacenciesSpriteGrid.clear();
		this.adjacenciesSpriteGrid.setVisible(false);

		window.removeEventListener(BuildingPlacementHoveredPlotChangedEventName, this.buildingPlacementPlotChangedListener)
	}

	/** Add the yield deltas and building slots to each valid plot for the current building */
	private realizeBuidlingPlacementSprites() {
		if (!BuildingPlacementManager.cityID) {
			console.error("building-placement-layer: No assigned cityID in the BuildingPlacementManager when attempting to realizeBuildingPlacementSprites");
			return;
		}

		if (!BuildingPlacementManager.currentConstructible) {
			console.error("building-placement-layer: No assigned currentConstructible in the BuildingPlacementManager when attempting to realizeBuildingPlacementSprites");
			return;
		}

		const city: City | null = Cities.get(BuildingPlacementManager.cityID)
		if (!city) {
			console.error("building-placement-layer: No valid city with city ID: " + ComponentID.toLogString(BuildingPlacementManager.cityID));
			return;
		}

		if (!city.Yields) {
			console.error("building-placement-layer: No valid Yields object attached to city with city ID: " + ComponentID.toLogString(BuildingPlacementManager.cityID));
			return;
		}

		const validPlots: PlotIndex[] = BuildingPlacementManager.expandablePlots.concat(BuildingPlacementManager.developedPlots.concat(BuildingPlacementManager.urbanPlots));
		for (let i: number = 0; i < validPlots.length; i++) {
			const plotYieldGainPills: YieldPillData[] = [];
			const plotYieldLossPills: YieldPillData[] = [];

			//Add the yield gain and loss pills
			BuildingPlacementManager.getTotalYieldChanges(validPlots[i])?.forEach((yieldChangeInfo) => {
				if (yieldChangeInfo.yieldChange != 0) {
					const yieldPillData: YieldPillData = {
						iconURL: BuildingPlacementManager.getYieldPillIcon(yieldChangeInfo.yieldType.toString(), yieldChangeInfo.yieldChange, yieldChangeInfo.isMainYield),
						yieldDelta: yieldChangeInfo.yieldChange,
						yieldType: yieldChangeInfo.yieldType,
						isMainYield: yieldChangeInfo.isMainYield
					}

					if (yieldChangeInfo.yieldChange > 0) {
						plotYieldGainPills.push(yieldPillData);
					} else {
						plotYieldLossPills.push(yieldPillData);
					}
				}
			})

			SortYields(plotYieldGainPills);
			SortYields(plotYieldLossPills);

			const pillOffsets = this.getXYOffsetForPill(plotYieldGainPills.length + plotYieldLossPills.length);

			const location: PlotCoord = GameplayMap.getLocationFromIndex(validPlots[i]);
			plotYieldGainPills.forEach((yieldPillData: YieldPillData, i: number) => {
				const pillOffset = pillOffsets[i];
				this.yieldSpriteGrid.addSprite(location, yieldPillData.iconURL, { x: pillOffset.x, y: pillOffset.y, z: 5 });
				this.yieldSpriteGrid.addText(location, yieldPillData.yieldDelta.toString(), { x: pillOffset.x, y: (pillOffset.y - 3), z: 5 }, { fonts: ["TitleFont"], fontSize: 4, faceCamera: true });
			})

			plotYieldLossPills.forEach((yieldPillData: YieldPillData, i: number) => {
				const pillOffset = pillOffsets[i + plotYieldGainPills.length];
				this.yieldSpriteGrid.addSprite(location, yieldPillData.iconURL, { x: pillOffset.x, y: pillOffset.y, z: 5 });
				this.yieldSpriteGrid.addText(location, yieldPillData.yieldDelta.toString(), { x: pillOffset.x, y: (pillOffset.y - 3), z: 5 }, { fonts: ["TitleFont"], fontSize: 4, faceCamera: true });
			})

			//Add any filled or open building slots
			const district: District | null = Districts.getAtLocation(validPlots[i]);
			if (district) {
				this.realizeBuildSlots(district);
			}
		}
	}

	/**
	 * Returns an array of offsets for yield pills for totalPills count passed in
	 * Will wrap to 2 lines once hitting a limit but won't wrap more than once
	 * @param totalPills total number of yield pills that will be displayed on the tile
	 * @returns array of offsets indexed to the sourced array of pills. ie: 3rd pill (index of 2) offset at offsetArray[2]
	 */
	private getXYOffsetForPill(totalPills: number): float2[] {
		let offsets: float2[] = [];

		// Determine if we should wrap and if so how many pills in the top and bottom rows
		const shouldWrap: boolean = totalPills > this.YIELD_WRAP_AT;
		const numPillsBottomRow: number = shouldWrap ? Math.trunc(totalPills / 2) : 0;
		const numPillsTopRow: number = totalPills - numPillsBottomRow;

		// Group width based on top row which should always be the longest row
		const groupWidth: number = (numPillsTopRow - 1) * this.YIELD_SPRITE_PADDING;

		for (let i = 0; i < totalPills; i++) {
			const isPillInTopRow: boolean = (i + 1) <= numPillsTopRow;

			// If this pill is in the bottom row base the index for positioning off relative index within the bottom row
			const rowPosition: number = isPillInTopRow ? i : i - numPillsTopRow;

			// Generate y offset based on if we need to wrap and what row the pill is in
			let yOffset: number = 0;
			if (shouldWrap) {
				yOffset = isPillInTopRow ? this.YIELD_WRAPPED_ROW_OFFSET : -this.YIELD_WRAPPED_ROW_OFFSET;
			}

			const offset: float2 = {
				x: (rowPosition * this.YIELD_SPRITE_PADDING) + (groupWidth / 2) - groupWidth,
				y: yOffset
			}
			offsets.push(offset);
		}

		return offsets;
	}

	/*Show building slots below each tile*/
	private realizeBuildSlots(district: District) {

		const districtDefinition: DistrictDefinition | null = GameInfo.Districts.lookup(district.type);
		if (!districtDefinition) {
			console.error("building-placement-layer: Unable to retrieve a valid DistrictDefinition with DistrictType: " + district.type);
			return;
		}
		const constructibles: ComponentID[] = MapConstructibles.getConstructibles(district.location.x, district.location.y).filter((constructibleID) => {
			const constructible = Constructibles.getByComponentID(constructibleID);
			if (!constructible) {
				console.error(`building-placement-layer: realizeBuildSlots - no constructible found for component id ${constructibleID}`);
				return false;
			}
			const constructibleDefinition = GameInfo.Constructibles.lookup(constructible.type);
			if (!constructibleDefinition) {
				console.error(`building-placement-layer: realizeBuildSlots - no constructible definition found for component id ${constructibleID}`);
				return false;
			}
			if (constructibleDefinition.ExistingDistrictOnly) {
				return false;
			}
			return true;
		});

		const buildingSlots: BuildingSlotData[] = [];
		for (let i: number = 0; i < constructibles.length; i++) {
			const constructibleID: ComponentID = constructibles[i];
			const existingConstructible: Constructible | null = Constructibles.getByComponentID(constructibleID);
			if (!existingConstructible) {
				console.error("building-placement-layer: Unable to find a valid Constructible with ComponentID: " + ComponentID.toLogString(constructibleID));
				continue;
			}
			const constructibleDefinition: ConstructibleDefinition | null = GameInfo.Constructibles.lookup(existingConstructible.type);
			if (!constructibleDefinition) {
				console.error("building-placement-layer: Unable to find a valid ConstructibleDefinition with type: " + existingConstructible.type);
				continue;
			}
			//TODO: add completion turns to in progress buildings once asset is implemented
			//TODO: add replaceable once asset is implemented

			const iconString: string | undefined = UI.getIconBLP(constructibleDefinition.ConstructibleType);
			buildingSlots.push({ iconURL: iconString ? iconString : "" });
		}

		for (let i: number = 0; i < districtDefinition.MaxConstructibles; i++) {
			const groupWidth: number = (districtDefinition.MaxConstructibles - 1) * this.BUILD_SLOT_SPRITE_PADDING;
			const xPos: number = (i * this.BUILD_SLOT_SPRITE_PADDING) + (groupWidth / 2) - groupWidth;
			this.yieldSpriteGrid.addSprite(district.location, UI.getIconBLP('BUILDING_UNFILLED'), { x: xPos, y: -28, z: 0 },);
			if (buildingSlots[i]) {
				this.yieldSpriteGrid.addSprite(district.location, buildingSlots[i].iconURL, { x: xPos, y: -27.5, z: 0 }, { scale: 0.7 });
			}
		}
	}

	/* Update displayed info when hovering a new plot */
	private onBuildingPlacementPlotChanged() {
		this.adjacenciesSpriteGrid.clear();
		this.adjacenciesSpriteGrid.setVisible(false);

		if (!BuildingPlacementManager.cityID) {
			console.error("building-placement-layer: No assigned cityID in the BuildingPlacementManager when attempting to realizeBuildingPlacementSprites");
			return;
		}

		if (!BuildingPlacementManager.currentConstructible) {
			console.error("building-placement-layer: No assigned currentConstructible in the BuildingPlacementManager when attempting to realizeBuildingPlacementSprites");
			return;
		}

		const city: City | null = Cities.get(BuildingPlacementManager.cityID)
		if (!city) {
			console.error("building-placement-layer: No valid city with city ID: " + ComponentID.toLogString(BuildingPlacementManager.cityID));
			return;
		}

		if (!city.Yields) {
			console.error("building-placement-layer: No valid Yields object attached to city with city ID: " + ComponentID.toLogString(BuildingPlacementManager.cityID));
			return;
		}

		if (!BuildingPlacementManager.hoveredPlotIndex || !BuildingPlacementManager.isValidPlacementPlot(BuildingPlacementManager.hoveredPlotIndex)) {
			return;
		}

		const yieldAdjacencies: YieldChangeData[] = city.Yields.calculateAllAdjacencyYieldsForConstructible(BuildingPlacementManager.currentConstructible.ConstructibleType, BuildingPlacementManager.hoveredPlotIndex);
		if (yieldAdjacencies.length <= 0) {
			return;
		}

		// TODO use SpriteGroup for small things like this, SpriteGrid uses instancing
		// For now, defer icons so they are drawn after all adjacency arrow instances
		type YieldInstance = {
			icon: string;
			location: float2;
			offset: float3;
		};
		const yieldIcons: YieldInstance[] = [];

		yieldAdjacencies.forEach(adjacency => {
			const yieldDef: YieldDefinition | null = GameInfo.Yields.lookup(adjacency.yieldType);
			if (!yieldDef) {
				console.error("building-placement-layer: No valid yield definition for yield type: " + adjacency.yieldType.toString());
				return;
			}

			const adjacencyLocation: float2 = GameplayMap.getLocationFromIndex(adjacency.sourcePlotIndex);
			const buildingLocation: float2 = GameplayMap.getLocationFromIndex(BuildingPlacementManager.hoveredPlotIndex!);
			const adjacencyDirection: DirectionTypes = GameplayMap.getDirectionToPlot(buildingLocation, adjacencyLocation);
			const adjacencyIcon: string | undefined = adjacencyIcons.get(adjacencyDirection);
			if (adjacencyIcon === undefined) {
				console.error("building-placement-layer: No valid adjacency icon for direction: " + adjacencyDirection.toString());
				return;
			}

			const iconOffset: float2 = this.calculateAdjacencyDirectionOffsetLocation(adjacencyDirection);

			//scale -1 to flip the arrows to indicate incoming adjacencies
			this.adjacenciesSpriteGrid.addSprite(buildingLocation, adjacencyIcon, { x: iconOffset.x, y: iconOffset.y, z: 0 }, { scale: -1 });
			yieldIcons.push({ icon: UI.getIconBLP(yieldDef.YieldType + "_1", "YIELD"), location: buildingLocation, offset: { x: iconOffset.x, y: iconOffset.y, z: 1 } });

			//TODO: outgoing adjacencies once implemented in GameCore
		});

		for (let i = 0; i < yieldIcons.length; i++) {
			this.adjacenciesSpriteGrid.addSprite(yieldIcons[i].location, yieldIcons[i].icon, yieldIcons[i].offset, { scale: 1 });
		}

		this.adjacenciesSpriteGrid.setVisible(true);
	}

	/* Determine where adjacency arrows should go based on adjacency location */
	private calculateAdjacencyDirectionOffsetLocation(adjacencyDirection: DirectionTypes): float2 {
		//TODO: Will need to be shifted once outgoing adjacencies are displayed
		switch (adjacencyDirection) {
			case DirectionTypes.DIRECTION_EAST:
				return { x: 32, y: 0 }
			case DirectionTypes.DIRECTION_WEST:
				return { x: -32, y: 0 }
			case DirectionTypes.DIRECTION_NORTHEAST:
				return { x: 16, y: 28 }
			case DirectionTypes.DIRECTION_NORTHWEST:
				return { x: -16, y: 28 }
			case DirectionTypes.DIRECTION_SOUTHEAST:
				return { x: 16, y: -28 }
			case DirectionTypes.DIRECTION_SOUTHWEST:
				return { x: -16, y: -28 }
			default:
				return { x: 32, y: 0 }
		}
	}
}

declare global {
	interface LensLayerTypeMap {
		'fxs-building-placement-layer': WorkerYieldsLensLayer
	}
}

LensManager.registerLensLayer('fxs-building-placement-layer', new WorkerYieldsLensLayer());