/**
 * model-great-works.ts
 * @copyright 2022 - 2023, Firaxis Games
 * @description Gathers Great Works data for the active player
 */

import ContextManager from '/core/ui/context-manager/context-manager.js'
import { Icon } from '/core/ui/utilities/utilities-image.js'
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';

export interface GreatWorkDetails {
	iconURL: string;
	name: string;
}

export interface GreatWorkBuildingYields {
	type: YieldType;
	iconURL: string;
	amount: number;
}

export interface GreatWorkTotalYields {
	type: YieldType;
	amount: number;
}

export interface GreatWorkData {
	cityName: string;
	buildingName: string;
	totalSlots: number;
	yields: GreatWorkBuildingYields[];
	details: GreatWorkDetails[];
}

class GreatWorksModel {
	private onUpdate?: (model: GreatWorksModel) => void;

	private selectedGreatWork: number = -1;
	private selectedGreatWorkLocation = -1;

	private greatWorkCreatedListener = () => { this.update(); };
	private greatWorkArchivedListener = () => { this.update(); };
	private greatWorkMovedListener = () => { this.update(); };
	private cityProductionCompletedListener = () => { this.update(); };
	private greatWorksHotkeyListener: EventListener = () => { this.onGreatWorksHotkey() };
	private greatWorkSlotCreatedListener = () => { this.update(); };

	GreatWorks: GreatWorkData[] = [];
	private isGreatWorksInit: boolean = false;
	YieldTotals: GreatWorkTotalYields[] = [];
	GreatWorkBuildings: GreatWorkBuilding[] = [];
	WorksInArchive: number = 0;
	private TotalGreatWorks: number = 0;
	private LocalPlayer: PlayerLibrary | null = null;
	private TotalGreatWorkSlots: number = 0;

	private LatestGreatWorkDetails: GreatWorkDetails | null = null;

	private updateGate: UpdateGate = new UpdateGate(() => { this.update(); });

	constructor() {
		this.updateGate.call('constructor');

		engine.on('GreatWorkCreated', () => { this.greatWorkCreatedListener() });
		engine.on('GreatWorkArchived', () => { this.greatWorkArchivedListener() });
		engine.on('GreatWorkMoved', () => { this.greatWorkMovedListener() });
		engine.on('CityProductionCompleted', () => { this.cityProductionCompletedListener(); });
		engine.on('GreatWorkSlotCreated', () => { this.greatWorkSlotCreatedListener(); });


		window.addEventListener('hotkey-open-greatworks', this.greatWorksHotkeyListener);
		const localPlayerID: PlayerId = GameContext.localPlayerID;
		this.LocalPlayer = Players.get(localPlayerID);
		if (!this.LocalPlayer) {
			return;
		}
	}

	set updateCallback(callback: (model: GreatWorksModel) => void) {
		this.onUpdate = callback;
	}

	get playerId(): PlayerId {
		return GameContext.localPlayerID;
	}

	get allGreatWorks() {
		return this.GreatWorks;
	}

	// this is the same as get allGreatWorks
	get allGreatWorkBuildings() {
		return this.GreatWorks;
	}

	get totalGreatWorks() {
		return this.TotalGreatWorks;
	}

	get totalSlots() {
		return this.TotalGreatWorkSlots;
	}

	get localPlayer() {
		return this.LocalPlayer;
	}

	get selectedWork() {
		return this.selectedGreatWork;
	}

	get latestGreatWorkDetails() {
		return this.LatestGreatWorkDetails;
	}

	hasSelectedGreatWork(): boolean {
		return (this.selectedGreatWork != -1);
	}

	clearSelectedGreatWork() {
		this.selectedGreatWork = -1;
		this.selectedGreatWorkLocation = -1;
	}

	update() {
		this.YieldTotals = [];
		this.GreatWorkBuildings = [];
		this.WorksInArchive = 0;
		this.TotalGreatWorks = 0;
		this.TotalGreatWorkSlots = 0;

		this.YieldTotals.push({ type: YieldTypes.YIELD_CULTURE, amount: 0 });
		this.YieldTotals.push({ type: YieldTypes.YIELD_GOLD, amount: 0 });
		this.YieldTotals.push({ type: YieldTypes.YIELD_PRODUCTION, amount: 0 });
		this.YieldTotals.push({ type: YieldTypes.YIELD_FOOD, amount: 0 });
		this.YieldTotals.push({ type: YieldTypes.YIELD_SCIENCE, amount: 0 });
		this.YieldTotals.push({ type: YieldTypes.YIELD_HAPPINESS, amount: 0 });

		const nextGreatWorks: GreatWorkData[] = [];

		if (!this.LocalPlayer) {
			console.error("model-great-works: update() - no local player found!");
			return;
		}

		const { Culture } = this.localPlayer ?? {};

		this.WorksInArchive = Culture ? Culture.getNumWorksInArchive() : 0;

		for (let i = 0; i < this.WorksInArchive; i++) {
			const greatWorkIndex: number = Culture!.getArchivedGreatWork(i);
			const gwType = Game.Culture.getGreatWorkType(greatWorkIndex);
			const greatWork: GreatWorkDefinition | null = GameInfo.GreatWorks.lookup(gwType);
			if (greatWork) {
				nextGreatWorks.push({
					cityName: "",
					buildingName: "",
					totalSlots: 0,
					yields: [],
					details: [{
						name: Locale.compose(greatWork.Name),
						iconURL: greatWork.Image || ""
					}]
				});
				this.TotalGreatWorks += 1;
			}
		}

		const cities: PlayerCities | undefined = this.LocalPlayer.Cities;
		if (cities) {
			const cityIds: ComponentID[] = cities.getCityIds();

			cityIds.forEach(cityId => {
				if (cityId) {
					const city: City | null = Cities.get(cityId);

					if (city) {
						if (city.Constructibles) {
							const gwBuildings: GreatWorkBuilding[] = city.Constructibles.getGreatWorkBuildings();

							// walk the list of the user's buildings that can contain Great Works
							if (gwBuildings) {
								gwBuildings.forEach(greatWorkBuilding => {
									let gwEntry: GreatWorkData = {
										cityName: Locale.compose(city.name),
										buildingName: "",
										totalSlots: 0,
										yields: [],
										details: []
									};

									// Get the building's name
									const buildingInstance: Constructible | null = Constructibles.getByComponentID(greatWorkBuilding.constructibleID);
									if (buildingInstance) {
										const info: ConstructibleDefinition | null = GameInfo.Constructibles.lookup(buildingInstance.type);
										if (info) {
											gwEntry.buildingName = Locale.compose(info.Name);
										} else {
											gwEntry.buildingName = buildingInstance.type.toString();
										}

										// Add the Great Works contained in the building, if any
										greatWorkBuilding.slots.forEach(greatWorkSlot => {
											let gwType = Game.Culture.getGreatWorkType(greatWorkSlot.greatWorkIndex);
											const greatWork: GreatWorkDefinition | null = GameInfo.GreatWorks.lookup(gwType);

											if (greatWork && info) {
												let gwDetails: GreatWorkDetails = {
													name: Locale.compose(greatWork.Name),
													// TODO: fix this when Great Works icons are available
													iconURL: UI.getIconCSS(info.ConstructibleType, "BUILDING")
												}
												gwEntry.details.push(gwDetails);
											}
										});

										// Get the yields for this building.
										if (city.Constructibles) {
											this.handleYield(gwEntry, city, greatWorkBuilding, YieldTypes.YIELD_CULTURE);
											this.handleYield(gwEntry, city, greatWorkBuilding, YieldTypes.YIELD_GOLD);
											this.handleYield(gwEntry, city, greatWorkBuilding, YieldTypes.YIELD_PRODUCTION);
											this.handleYield(gwEntry, city, greatWorkBuilding, YieldTypes.YIELD_FOOD);
											this.handleYield(gwEntry, city, greatWorkBuilding, YieldTypes.YIELD_SCIENCE);
											this.handleYield(gwEntry, city, greatWorkBuilding, YieldTypes.YIELD_HAPPINESS);

											gwEntry.totalSlots = city.Constructibles.getNumGreatWorkSlots(greatWorkBuilding.constructibleID);
											this.TotalGreatWorks += gwEntry.details.length;
											this.TotalGreatWorkSlots += gwEntry.totalSlots;
										}

										// Push this building
										nextGreatWorks.push(gwEntry);
									}
									this.GreatWorkBuildings.push(greatWorkBuilding);
								});
							}
						}
					}
				}
			});
		}

		const nextGreatWorksDetails = nextGreatWorks.map(({ details }) => details).flat();
		const GreatWorksDetails = this.GreatWorks.map(({ details }) => details).flat();
		const addedGreatWorkDetails = nextGreatWorksDetails.filter(({ name }) => !GreatWorksDetails.map(({ name }) => name).includes(name));
		const removedGreatWorkDetails = GreatWorksDetails.filter(({ name }) => !nextGreatWorksDetails.map(({ name }) => name).includes(name));

		// change the latest greatwork only if we have initialized the GreatWorks, and that a greatwork was added or the current latest was removed
		if (this.isGreatWorksInit && (addedGreatWorkDetails.length || removedGreatWorkDetails.length && removedGreatWorkDetails.pop()?.name == this.LatestGreatWorkDetails?.name)) {
			this.LatestGreatWorkDetails = addedGreatWorkDetails.pop() ?? null;
		}

		this.GreatWorks = nextGreatWorks;
		this.isGreatWorksInit = true;

		if (this.onUpdate) {
			this.onUpdate(this);
		}

		window.dispatchEvent(new CustomEvent('model-great-works-rebuild-panel'));
	}

	// if the yield adjustment for a Great Work building is non-zero, add it to the list of yields
	private handleYield(gwEntry: GreatWorkData, city: City, building: GreatWorkBuilding, yieldType: YieldType) {
		if (city.Constructibles) {
			let yieldSlot: GreatWorkBuildingYields = {
				type: yieldType,
				iconURL: "",
				amount: 0
			};

			yieldSlot.amount = city.Constructibles.getBuildingYieldFromGreatWorks(yieldType, building.constructibleID);

			const icon = Icon.getYieldIcon(yieldType, true);
			yieldSlot.iconURL = (icon) ? `url('${icon}')` : '';

			gwEntry.yields.push(yieldSlot);

			// add the totals
			let yieldTotalItem: GreatWorkTotalYields | undefined = this.YieldTotals.find(item => item.type === yieldType);
			if (yieldTotalItem) {
				yieldTotalItem.amount += yieldSlot.amount;
			}
		}
	}

	private onGreatWorksHotkey() {
		if (ContextManager.isCurrentClass('screen-great-works')) {
			ContextManager.pop('screen-great-works');
		} else if (!ContextManager.hasInstanceOf('screen-pause-menu')) {
			ContextManager.push('screen-great-works', { singleton: true, createMouseGuard: true });
		}
	}

	selectGreatWork(greatWorkIndex: number, greatWorkCityID: number = -1) {
		if (greatWorkIndex == this.selectedGreatWork) {
			this.clearSelectedGreatWork();
		}
		else {
			this.selectedGreatWork = greatWorkIndex;
			this.selectedGreatWorkLocation = greatWorkCityID;
		}
	}

	selectEmptySlot(cityID: number, buildingID: number) {
		if (this.hasSelectedGreatWork()) {
			if (this.selectedGreatWorkLocation != -1) {
				const args = { Player1: GameContext.localPlayerID, GreatWorkIndex: this.selectedGreatWork, SourceCity: this.selectedGreatWorkLocation, DestinationCity: cityID, DestinationBuilding: buildingID };
				const result: OperationResult = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.MOVE_GREAT_WORK, args, false);
				if (result.Success) {
					Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.MOVE_GREAT_WORK, args);
					Audio.playSound("data-audio-assign", "great-works");
				}
			}
			else {
				const args = { Player1: GameContext.localPlayerID, GreatWorkIndex: this.selectedGreatWork, DestinationCity: cityID, DestinationBuilding: buildingID };
				const result: OperationResult = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.MOVE_GREAT_WORK, args, false);
				if (result.Success) {
					Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.MOVE_GREAT_WORK, args);
					Audio.playSound("data-audio-assign", "great-works");
				}
			}
			this.clearSelectedGreatWork();
		}
	}
}

const GreatWorks = new GreatWorksModel();
engine.whenReady.then(() => {

	const updateModel = () => {
		engine.updateWholeModel(GreatWorks);
	}

	engine.createJSModel('g_GreatWorksModel', GreatWorksModel);
	GreatWorks.updateCallback = updateModel;
});

export { GreatWorks as default };
