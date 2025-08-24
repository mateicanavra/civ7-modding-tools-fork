/**
 * @file panel-city-details.ts
 * @copyright 2024, Firaxis Games
 * @description Detailed break down of a cities status
 */

import { Audio } from '/core/ui/audio-base/audio-support.js';
import CityDetails, { DistrictData, ConstructibleData, YieldData, UpdateCityDetailsEventName } from "/base-standard/ui/city-details/model-city-details.js";
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
import { TabItem, TabSelectedEvent } from "/core/ui/components/fxs-tab-bar.js";
import { InputEngineEvent } from "/core/ui/input/input-support.js";
import NavTray from "/core/ui/navigation-tray/model-navigation-tray.js";
import Panel from "/core/ui/panel-support.js";
import { MustGetElement } from "/core/ui/utilities/utilities-dom.js";
import FocusManager from '/core/ui/input/focus-manager.js';
import Databind from '/core/ui/utilities/utilities-core-databinding.js';
import { GetPrevCityID, GetNextCityID } from '/base-standard/ui/production-chooser/production-chooser-helpers.js';
import { OVERLAY_PRIORITY } from '/base-standard/ui/utilities/utilities-overlay.js';

export const ShowCityDetailsEventName = "show-city-details" as const;
type ShowCityDetailsEventDetail = {
	shouldShow: "toggle" | boolean;
}
export class ShowCityDetailsEvent extends CustomEvent<ShowCityDetailsEventDetail> {
	constructor(detail: ShowCityDetailsEventDetail) {
		super(ShowCityDetailsEventName, { bubbles: false, detail });
	}
}

export const CityDetailsClosedEventName = "city-details-closed" as const;
export class CityDetailsClosedEvent extends CustomEvent<void> {
	constructor() {
		super(CityDetailsClosedEventName, { bubbles: false });
	}
}

enum cityDetailTabID {
	growth = "city-details-tab-growth",
	buildings = "city-details-tab-buildings",
	yields = "city-details-tab-yields"
}

type CityDetailsTabItem = TabItem & {
	headerText: string
}

const cityDetailTabItems: CityDetailsTabItem[] = [
	{
		id: cityDetailTabID.growth,
		icon: {
			default: UI.getIconBLP("CITY_CITIZENS"),
			hover: UI.getIconBLP("CITY_CITIZENS_HI"),
			focus: UI.getIconBLP("CITY_CITIZENS_HI")
		},
		iconClass: "size-16",
		headerText: "LOC_UI_CITY_DETAILS_GROWTH_TAB"
	},
	{
		id: cityDetailTabID.buildings,
		icon: {
			default: UI.getIconBLP("CITY_BUILDINGS"),
			hover: UI.getIconBLP("CITY_BUILDINGS_HI"),
			focus: UI.getIconBLP("CITY_BUILDINGS_HI")
		},
		iconClass: "size-16",
		headerText: "LOC_UI_CITY_DETAILS_BUILDINGS_TAB"
	},
	{
		id: cityDetailTabID.yields,
		icon: {
			default: UI.getIconBLP("CITY_YIELDS"),
			hover: UI.getIconBLP("CITY_YIELDS_HI"),
			focus: UI.getIconBLP("CITY_YIELDS_HI")
		},
		iconClass: "size-16",
		headerText: "LOC_UI_CITY_DETAILS_YIELDS_TAB"
	}
]

export class PanelCityDetails extends Panel {

	// #region Element References
	private readonly frame = document.createElement("fxs-subsystem-frame");
	private readonly headerElement = document.createElement("fxs-header");
	private readonly tabHeaderElement = document.createElement("fxs-header");
	private readonly tabBar = document.createElement("fxs-tab-bar");
	private readonly slotGroup = document.createElement("fxs-slot-group");

	private readonly prevCityButton = document.createElement("fxs-activatable");
	private readonly nextCityButton = document.createElement("fxs-activatable");

	private growthSlot!: HTMLDivElement;
	private specialistContainer!: HTMLDivElement;
	private specialistText!: HTMLDivElement;
	private currentCitizenCount!: HTMLDivElement;
	private turnToNextCitizenText!: HTMLDivElement;
	private happinessStatusText!: HTMLDivElement;
	private happinessIcon!: HTMLDivElement;
	private happinessPerTurn!: HTMLDivElement;
	private foodPerTurn!: HTMLDivElement;
	private foodNeededToGrow!: HTMLDivElement;
	private connectedToContainer!: HTMLDivElement;

	private constructibleSlot!: HTMLDivElement;
	private buildingsCategory!: HTMLDivElement;
	private buildingsList!: HTMLDivElement;
	private improvementsCategory!: HTMLDivElement;
	private improvementsList!: HTMLDivElement;
	private wondersCategory!: HTMLDivElement;
	private wondersList!: HTMLDivElement;

	private yieldsSlot!: HTMLDivElement;
	private yieldsContainer!: HTMLDivElement;

	private beingRazedContainer!: HTMLDivElement;
	private razedTurnsText!: HTMLDivElement;

	private treasureFleetContainer!: HTMLDivElement;
	private treasureFleetText!: HTMLDivElement;
	// #endregion

	private readonly LANDMARK_BORDER_STYLE: WorldUI.BorderStyle = {
		style: "CultureBorder_Closed",
		primaryColor: { x: 1, y: 1, z: 1, w: 5 },
		secondaryColor: { x: 1, y: 1, z: 1, w: 5 }
	};

	private readonly HIGHLIGHT_BORDER_STYLE: WorldUI.BorderStyle = {
		style: "CultureBorder_Closed",
		primaryColor: { x: 1, y: 1, z: 1, w: 1 },
		secondaryColor: { x: 0, y: 0, z: 0, w: 0 }
	};


	private landmarkOverlayGroup = WorldUI.createOverlayGroup("landmarkOverlayGroup", OVERLAY_PRIORITY.PLOT_HIGHLIGHT);
	private landmarkOverlay = this.landmarkOverlayGroup.addLandmarkOverlay();
	private highlightOverlay = this.landmarkOverlayGroup.addBorderOverlay(this.HIGHLIGHT_BORDER_STYLE)

	private engineInputListener = this.onEngineInput.bind(this);
	private updateCityDetailersListener = this.update.bind(this);

	private onNextCityButtonListener = this.onNextCityButton.bind(this);
	private onPrevCityButtonListener = this.onPrevCityButton.bind(this);

	onInitialize(): void {
		super.onInitialize();
		this.render();
	}

	onAttach() {
		super.onAttach();

		window.addEventListener(ShowCityDetailsEventName, this.onShowCityDetailsEvent);
		window.addEventListener(UpdateCityDetailsEventName, this.updateCityDetailersListener);
		this.frame.addEventListener("subsystem-frame-close", this.requestClose);
		this.tabBar.addEventListener("tab-selected", this.onTabSelected);
		this.Root.addEventListener("engine-input", this.engineInputListener);
		this.Root.addEventListener("focus", this.onFocus);

		this.nextCityButton.addEventListener('action-activate', this.onNextCityButtonListener);
		this.prevCityButton.addEventListener('action-activate', this.onPrevCityButtonListener);

		this.growthSlot = MustGetElement(`#${cityDetailTabID.growth}`, this.Root);
		this.specialistContainer = MustGetElement(".specialist-container", this.Root);
		this.specialistText = MustGetElement(".specialist-text", this.Root);
		this.currentCitizenCount = MustGetElement(".current-citizens-count", this.Root);
		this.turnToNextCitizenText = MustGetElement(".new-citizen-text", this.Root);
		this.happinessStatusText = MustGetElement(".happiness-status-text", this.Root);
		this.happinessIcon = MustGetElement(".happiness-icon", this.Root);
		this.happinessPerTurn = MustGetElement(".happiness-per-turn", this.Root);
		this.foodPerTurn = MustGetElement(".food-per-turn", this.Root);
		this.foodNeededToGrow = MustGetElement(".food-needed-to-grow", this.Root);
		this.connectedToContainer = MustGetElement(".connected-to-container", this.Root);

		this.constructibleSlot = MustGetElement(`#${cityDetailTabID.buildings}`, this.Root);
		this.buildingsCategory = MustGetElement(".buildings-category", this.Root);
		this.buildingsList = MustGetElement(".buildings-list", this.Root);
		this.improvementsCategory = MustGetElement(".improvements-category", this.Root);
		this.improvementsList = MustGetElement(".improvements-list", this.Root);
		this.wondersCategory = MustGetElement(".wonders-category", this.Root);
		this.wondersList = MustGetElement(".wonders-list", this.Root);

		this.yieldsSlot = MustGetElement(`#${cityDetailTabID.yields}`, this.Root);
		this.yieldsContainer = MustGetElement(".yields-container", this.Root);

		this.beingRazedContainer = MustGetElement(".being-razed-container", this.Root);
		this.razedTurnsText = MustGetElement(".razed-turns-text", this.Root);

		this.treasureFleetContainer = MustGetElement(".treasure-fleet-container", this.Root);
		this.treasureFleetText = MustGetElement(".treasure-fleet-text", this.Root);


		this.update();
	}

	onDetach() {
		window.removeEventListener(ShowCityDetailsEventName, this.onShowCityDetailsEvent);
		window.removeEventListener(UpdateCityDetailsEventName, this.updateCityDetailersListener);
		this.frame.removeEventListener("subsystem-frame-close", this.requestClose);
		this.tabBar.removeEventListener("tab-selected", this.onTabSelected);
		this.Root.removeEventListener("engine-input", this.engineInputListener);
		this.Root.removeEventListener("focus", this.onFocus);

		this.nextCityButton.removeEventListener('action-activate', this.onNextCityButtonListener);
		this.prevCityButton.removeEventListener('action-activate', this.onPrevCityButtonListener);

		this.removeBuildingHighlight();

		super.onDetach();
	}

	private onPrevCityButton() {
		this.selectPrevCity();
	}

	private onNextCityButton() {
		this.selectNextCity();
	}

	private onTabSelected = (e: TabSelectedEvent<CityDetailsTabItem>) => {
		this.slotGroup.setAttribute("selected-slot", e.detail.selectedItem.id);
		this.tabHeaderElement.setAttribute("title", e.detail.selectedItem.headerText);
	}

	private onEngineInput(inputEvent: InputEngineEvent) {
		const live = this.handleEngineInput(inputEvent);
		if (!live) {
			inputEvent.preventDefault();
			inputEvent.stopImmediatePropagation();
		}
	}


	private handleEngineInput(inputEvent: InputEngineEvent) {
		const { name, status } = inputEvent.detail;
		if (status != InputActionStatuses.FINISH) {
			// don't allow zooming in/out while in this screen
			return !(name === 'camera-zoom-in' || name === 'camera-zoom-out');
		}

		switch (inputEvent.detail.name) {
			case "nav-shell-prev":
			case "camera-zoom-out":
				this.selectPrevCity();
				return false;
			case "nav-shell-next":
			case "camera-zoom-in":
				this.selectNextCity();
				return false;
			case "cancel":
				this.toggleClose(true);
				return false;
		}

		return true;
	}

	private selectPrevCity() {
		const selectedCity = UI.Player.getHeadSelectedCity();
		if (!selectedCity) {
			console.error(`panel-city-details: selectPrevCity() failed to get head selected city!`);
			return;
		}

		const prevCityId = GetPrevCityID(selectedCity);
		if (ComponentID.isValid(prevCityId)) {
			UI.Player.selectCity(prevCityId);
		}
	}

	private selectNextCity() {
		const selectedCity = UI.Player.getHeadSelectedCity();
		if (!selectedCity) {
			console.error(`panel-city-details: selectNextCity() failed to get head selected city!`);
			return;
		}

		const nextCityId = GetNextCityID(selectedCity);
		if (ComponentID.isValid(nextCityId)) {
			UI.Player.selectCity(nextCityId);
		}
	}

	private onFocus = () => {
		NavTray.clear();
		NavTray.addOrUpdateGenericBack();
		this.tabBar.setAttribute("selected-tab-index", "0");
		this.slotGroup.setAttribute("selected-slot", cityDetailTabID.growth);
		const growthSlot = this.Root.querySelector(`#${cityDetailTabID.growth}`);
		if (growthSlot) {
			FocusManager.setFocus(growthSlot);
		}
	}

	private onShowCityDetailsEvent = (event: ShowCityDetailsEvent) => {
		if (event.detail.shouldShow == "toggle") {
			this.toggleClose();
		} else {
			this.toggleClose(!event.detail.shouldShow);
		}
	}

	protected requestClose = () => {
		this.toggleClose(true);
	}

	private toggleClose(force?: boolean) {
		let hidden = force == undefined ? !this.Root.classList.contains("hidden") : force;
		this.setHidden(hidden);
		if (hidden) {
			window.dispatchEvent(new CityDetailsClosedEvent());
		}
	}

	private setHidden(hidden: boolean) {
		this.Root.classList.toggle("hidden", hidden);
		const audioEvent = hidden ? "data-audio-city-details-exit" : "data-audio-city-details-enter";
		UI.sendAudioEvent(Audio.getSoundTag(audioEvent, 'city-actions'));
	}

	private render() {
		this.Root.classList.add("flex-col");

		const headerWrapper = document.createElement("div");
		headerWrapper.classList.add("flex", "items-center", "justify-center", "px-10");
		headerWrapper.dataset.slot = "header";

		this.prevCityButton.classList.add('flex', 'flex-row', 'items-center');
		this.prevCityButton.setAttribute('action-key', 'inline-prev-city');
		const prevCityButtonArrow = document.createElement('div');
		prevCityButtonArrow.classList.add('img-arrow', 'w-8', 'h-12');
		Databind.classToggle(prevCityButtonArrow, "hidden", "{{g_NavTray.isTrayRequired}}");
		this.prevCityButton.appendChild(prevCityButtonArrow);
		headerWrapper.appendChild(this.prevCityButton);

		this.headerElement.classList.add("px-4", "uppercase", "tracking-100");
		this.headerElement.setAttribute("title", "LOC_UI_CITY_DETAILS_HEADER");
		headerWrapper.appendChild(this.headerElement);

		this.nextCityButton.classList.add('flex', 'flex-row-reverse', 'items-center');
		this.nextCityButton.setAttribute('action-key', 'inline-next-city');
		const nextCityButtonArrow = document.createElement('div');
		nextCityButtonArrow.classList.add('img-arrow', 'w-8', 'h-12', '-scale-x-100');
		Databind.classToggle(nextCityButtonArrow, "hidden", "{{g_NavTray.isTrayRequired}}");
		this.nextCityButton.appendChild(nextCityButtonArrow);
		headerWrapper.appendChild(this.nextCityButton);

		this.frame.appendChild(headerWrapper);

		const tabHeaderWrapper = document.createElement("div");
		tabHeaderWrapper.classList.add("flex", "items-center", "justify-center", "mb-2");
		this.frame.appendChild(tabHeaderWrapper);

		this.tabHeaderElement.classList.add("px-3", "uppercase", "tracking-100");
		this.tabHeaderElement.setAttribute("filigree-style", "none");
		this.tabHeaderElement.setAttribute("font-fit-mode", "shrink");
		tabHeaderWrapper.appendChild(this.tabHeaderElement);

		this.tabBar.classList.add("px-2");
		this.tabBar.setAttribute("tab-for", "fxs-subsystem-frame");
		this.tabBar.setAttribute("rect-render", "true");
		this.tabBar.setAttribute("data-audio-group-ref", "city-actions");
		this.tabBar.setAttribute('nav-help-left-class', 'pl-2');
		this.tabBar.setAttribute('nav-help-right-class', 'pr-2');
		this.tabBar.setAttribute("tab-items", JSON.stringify(cityDetailTabItems));

		this.frame.appendChild(this.tabBar);

		this.renderGrowthSlot();
		this.renderBuildingSlot();
		this.renderYieldsSlot();

		this.frame.classList.add("flex-auto");
		this.frame.setAttribute("no-scroll", "true")
		this.frame.dataset.headerClass = "px-3 mx-0\\.5";
		this.frame.dataset.footerClass = "px-5 mx-0\\.5";
		this.frame.insertAdjacentHTML("beforeend", `
				<div class="flex self-stretch justify-center px-3 pb-1" data-slot="header">
				</div>
		`);
		Databind.classToggle(this.frame, "mb-16", "{{g_NavTray.isTrayRequired}}");

		this.tabBar.addEventListener("tab-selected", (e: TabSelectedEvent) => {
			this.slotGroup.setAttribute("selected-slot", e.detail.selectedItem.id)
		});

		this.slotGroup.classList.add("flex", "flex-auto", "flex-col");

		this.frame.appendChild(this.slotGroup);

		this.Root.appendChild(this.frame);
	}

	private renderGrowthSlot() {
		const slot = document.createElement("fxs-vslot");
		slot.classList.add("mt-3", "pr-4");
		slot.setAttribute("data-navrule-left", "stop");
		slot.setAttribute("data-navrule-right", "stop");
		slot.id = cityDetailTabID.growth;

		slot.innerHTML = `
		<fxs-scrollable class="flex-auto">
			<div class="being-razed-container flex flex-col m-1 w-full">
				<div class="font-title uppercase self-center text-negative text-xl" data-l10n-id="LOC_UI_CITY_DETAILS_CITY_BEING_RAZED"></div>
				<div class="razed-turns-text self-center text-negative text-large" data-l10n-id="LOC_UI_CITY_DETAILS_CITY_BEING_RAZED"></div>
				<div class="flex w-96 self-center">
					<div class="w-1\\/2 h-5 bg-cover bg-no-repeat city-details-half-divider"></div>
					<div class="w-1\\/2 h-5 bg-cover bg-no-repeat city-details-half-divider -scale-x-100"></div>
				</div>
			</div>
			<div class="specialist-container flex flex-col m-1">
				<p class="specialist-text self-center mt-1 mb-1 ml-8 mr-8"></p>
				<div class="flex w-96 self-center">
					<div class="w-1\\/2 h-5 bg-cover bg-no-repeat city-details-half-divider"></div>
					<div class="w-1\\/2 h-5 bg-cover bg-no-repeat city-details-half-divider -scale-x-100"></div>
				</div>
			</div>
			<div class="growth-entry flex justify-between m-1" tabindex="-1">
				<div class="flex">
					<fxs-icon class="size-12 m-1" data-icon-id="CITY_CITIZENS_LIST"></fxs-icon>
					<div role="paragraph" class="flex-col self-center ml-2 pointer-evetns-auto">
						<div class="current-citizens-count"></div>
						<div class="font-title text-gradient-secondary uppercase" data-l10n-id="LOC_UI_CITY_DETAILS_CITIZENS"></div>
					</div>
				</div>
				<p class="new-citizen-text self-end mr-4 max-w-48"></p>
			</div>
			<div class="flex w-96 self-center">
				<div class="w-1\\/2 h-5 bg-cover bg-no-repeat city-details-half-divider"></div>
				<div class="w-1\\/2 h-5 bg-cover bg-no-repeat city-details-half-divider -scale-x-100"></div>
			</div>
			<div class="flex m-1">
				<fxs-icon class="happiness-icon size-12 m-1" data-icon-context="YIELD" data-icon-id="YIELD_HAPPINESS"></fxs-icon>
				<div class="flex-col self-center">
					<p class="happiness-status-text font-title ml-2 uppercase"></p>
					<p class="font-title ml-2 uppercase text-gradient-secondary" data-l10n-id="LOC_UI_CITY_DETAILS_HAPPINESS_STATUS"></p>
				</div>
			</div>
			<div role="paragraph" class="growth-entry flex justify-between m-1 pointer-events-auto" tabindex="-1">
				<div class="ml-4" data-l10n-id="LOC_UI_CITY_DETAILS_HAPPINESS_PER_TURN"></div>
				<div class="happiness-per-turn mr-4"></div>
			</div>
			<div class="flex w-96 self-center">
				<div class="w-1\\/2 h-5 bg-cover bg-no-repeat city-details-half-divider"></div>
				<div class="w-1\\/2 h-5 bg-cover bg-no-repeat city-details-half-divider -scale-x-100"></div>
			</div>
			<div class="flex m-1">
				<fxs-icon class="size-12 m-1" data-icon-id="CITY_FOOD_LIST"></fxs-icon>
				<p class="self-center font-title ml-2 uppercase text-gradient-secondary" data-l10n-id="LOC_UI_CITY_DETAILS_FOOD"></p>
			</div>
			<div role="paragraph" class="growth-entry flex justify-between m-1 pointer-events-auto" tabindex="-1">
				<div class="ml-4" data-l10n-id="LOC_UI_CITY_DETAILS_FOOD_PER_TURN"></div>
				<div class="food-per-turn mr-4"></div>
			</div>
			<div class="connected-to-container">
			</div>
			<div role="paragraph" class="growth-entry flex justify-between m-1 pointer-events-auto" tabindex="-1">
				<div class="ml-4" data-l10n-id="LOC_UI_CITY_DETAILS_FOOD_NEEDED_TO_GROW"></div>
				<div class="food-needed-to-grow mr-4"></div>
			</div>
			<div class="flex w-96 self-center">
				<div class="w-1\\/2 h-5 bg-cover bg-no-repeat city-details-half-divider"></div>
				<div class="w-1\\/2 h-5 bg-cover bg-no-repeat city-details-half-divider -scale-x-100"></div>
			</div>
			<div class="treasure-fleet-container flex flex-col m-1">
				<p class="font-title ml-4 mb-2 uppercase text-gradient-secondary" data-l10n-id="LOC_UI_CITY_DETAILS_TREASURE_FLEET"></p>
				<div role="paragraph" class="treasure-fleet-text ml-4 pointer-events-auto"></div>
				<div class="flex w-96 self-center">
					<div class="w-1\\/2 h-5 bg-cover bg-no-repeat city-details-half-divider"></div>
					<div class="w-1\\/2 h-5 bg-cover bg-no-repeat city-details-half-divider -scale-x-100"></div>
				</div>
			</div>
		</fxs-scrollable>
		`;

		this.slotGroup.appendChild(slot);
	}

	private renderBuildingSlot() {
		const slot = document.createElement("fxs-vslot");
		slot.classList.add("pr-4");
		slot.setAttribute("data-navrule-left", "stop");
		slot.setAttribute("data-navrule-right", "stop");
		slot.id = cityDetailTabID.buildings;

		slot.innerHTML = `
		<fxs-scrollable>
			<div class="flex flex-col w-full">
				<div class="buildings-category flex m-1">
					<fxs-icon class="size-16 m-1" data-icon-id="CITY_BUILDINGS_LIST"></fxs-icon>
					<div class="self-center font-title text-lg uppercase ml-2 text-gradient-secondary" data-l10n-id="LOC_UI_CITY_DETAILS_BUILDINGS"></div>
				</div>
				<div class="buildings-list flex-col m-1"></div>
				<div class="improvements-category flex m-1">
					<fxs-icon class="size-16 m-1" data-icon-id="CITY_IMPROVEMENTS_LIST"></fxs-icon>
					<div class="self-center font-title text-lg uppercase ml-2 text-gradient-secondary" data-l10n-id="LOC_UI_CITY_DETAILS_IMPROVEMENTS"></div>
				</div>
				<div class="improvements-list flex-col m-1"></div>
				<div class="wonders-category flex m-1">
					<fxs-icon class="size-16 m-1" data-icon-id="CITY_WONDERS_LIST"></fxs-icon>
					<div class="self-center font-title text-lg uppercase ml-2 text-gradient-secondary" data-l10n-id="LOC_UI_CITY_DETAILS_WONDERS"></div>
				</div>
				<div class="wonders-list flex-col m-1"></div>
			</div>
		</fxs-scrollable>
		`;

		this.slotGroup.appendChild(slot);
	}

	private renderYieldsSlot() {
		const slot = document.createElement("fxs-vslot");
		slot.classList.add("pr-4");
		slot.setAttribute("data-navrule-left", "stop");
		slot.setAttribute("data-navrule-right", "stop");
		slot.id = cityDetailTabID.yields;

		slot.innerHTML = `
			<fxs-scrollable class="yields-scrollable">
				<div class="yields-container w-full"></div>
			</div>
		`;

		this.slotGroup.appendChild(slot);
	}

	public update() {

		if (CityDetails.isTown) {
			this.headerElement.setAttribute("title", "LOC_UI_TOWN_DETAILS_HEADER");
		} else {
			this.headerElement.setAttribute("title", "LOC_UI_CITY_DETAILS_HEADER");
		}

		// Citizen Growth

		// Flag so we can give the growth back focus after updating
		const growthHasFocus = this.growthSlot.contains(FocusManager.getFocus());

		if (CityDetails.isTown) {
			this.specialistContainer.classList.add('hidden');
		} else {
			this.specialistContainer.classList.remove('hidden');
			this.specialistText.textContent = Locale.compose("LOC_UI_CITY_DETAILS_SPECIALIST_PER_TILE", CityDetails.specialistPerTile);
		}
		this.currentCitizenCount.textContent = CityDetails.currentCitizens.toString();

		if (CityDetails.hasTownFocus) {
			// TODO - Add string to explain this case
			this.turnToNextCitizenText.textContent = "";
		} else if (CityDetails.turnsToNextCitizen >= 0) {
			this.turnToNextCitizenText.textContent = Locale.compose("LOC_UI_CITY_DETAILS_NEW_CITIZEN_IN_TURNS", CityDetails.turnsToNextCitizen);
		} else {
			this.turnToNextCitizenText.textContent = Locale.compose("LOC_UI_CITY_DETAILS_STARVATION");
		}

		this.foodPerTurn.textContent = Locale.compose("LOC_UI_CITY_DETAILS_YIELD_ONE_DECIMAL", CityDetails.foodPerTurn);
		this.foodNeededToGrow.textContent = Locale.compose("LOC_UI_YIELD_ONE_DECIMAL_NO_PLUS", CityDetails.foodToGrow);

		this.connectedToContainer.innerHTML = "";
		for (const settlementData of CityDetails.connectedSettlementFood) {
			this.addConnectedToEntry(settlementData.name, settlementData.amount);
		}

		// Happiness
		if (CityDetails.hasUnrest) {
			this.happinessStatusText.textContent = Locale.compose('LOC_CITY_UNREST');
			this.happinessStatusText.classList.add("text-negative");
			this.happinessStatusText.classList.remove("text-positive");
			this.happinessIcon.setAttribute("data-icon-id", "YIELD_ANGRY");
		} else if (CityDetails.happinessPerTurn < -10) {
			this.happinessStatusText.textContent = Locale.compose('LOC_UI_CITY_DETAILS_ANGRY');
			this.happinessStatusText.classList.add("text-negative");
			this.happinessStatusText.classList.remove("text-positive");
			this.happinessIcon.setAttribute("data-icon-id", "YIELD_ANGRY");
		} else if (CityDetails.happinessPerTurn <= 0) {
			this.happinessStatusText.textContent = Locale.compose('LOC_UI_CITY_DETAILS_UNHAPPY');
			this.happinessStatusText.classList.add("text-negative");
			this.happinessStatusText.classList.remove("text-positive");
			this.happinessIcon.setAttribute("data-icon-id", "YIELD_UNHAPPINESS");
		} else {
			this.happinessStatusText.textContent = Locale.compose('LOC_UI_CITY_DETAILS_HAPPY');
			this.happinessStatusText.classList.remove("text-negative");
			this.happinessStatusText.classList.add("text-positive");
			this.happinessIcon.setAttribute("data-icon-id", "YIELD_HAPPINESS");
		}

		this.happinessPerTurn.textContent = Locale.compose("LOC_UI_CITY_DETAILS_YIELD_ONE_DECIMAL", CityDetails.happinessPerTurn);

		if (growthHasFocus) {
			FocusManager.setFocus(this.growthSlot);
		}

		// Flag so we can give the constructibles back focus after updating
		const constructiblesHaveFocus = this.constructibleSlot.contains(FocusManager.getFocus());

		// Buildings
		const shouldShowBuildings = CityDetails.buildings.length > 0;
		this.buildingsCategory.classList.toggle("hidden", !shouldShowBuildings);

		this.buildingsList.innerHTML = "";
		for (const building of CityDetails.buildings) {
			this.buildingsList.appendChild(this.addDistrictData(building));
			this.buildingsList.appendChild(this.createDivider());
		}

		// Improvements
		const shouldShowImprovements = CityDetails.improvements.length > 0;
		this.improvementsCategory.classList.toggle("hidden", !shouldShowImprovements);

		this.improvementsList.innerHTML = "";
		for (const improvement of CityDetails.improvements) {
			this.improvementsList.appendChild(this.addConstructibleData(improvement));
			this.improvementsList.appendChild(this.createDivider());
		}

		// Wonders
		const shouldShowWonders = CityDetails.wonders.length > 0;
		this.wondersCategory.classList.toggle("hidden", !shouldShowWonders);

		this.wondersList.innerHTML = "";
		for (const wonder of CityDetails.wonders) {
			this.wondersList.appendChild(this.addConstructibleData(wonder));
			this.wondersList.appendChild(this.createDivider());
		}

		if (constructiblesHaveFocus) {
			FocusManager.setFocus(this.constructibleSlot);
		}

		// Flag so we can give the yields back focus after updating
		const yieldsHaveFocus = this.yieldsSlot.contains(FocusManager.getFocus());

		this.updateYields();

		if (yieldsHaveFocus) {
			FocusManager.setFocus(this.yieldsSlot);
		}

		this.beingRazedContainer.classList.toggle("hidden", !CityDetails.isBeingRazed);
		this.razedTurnsText.textContent = Locale.compose("LOC_UI_CITY_DETAILS_CITY_TURNS_TILL_RAZED", CityDetails.getTurnsUntilRazed);

		// Treasure Fleet
		if (CityDetails.treasureFleetText != "") {
			this.treasureFleetContainer.classList.remove("hidden");
			this.treasureFleetText.textContent = CityDetails.treasureFleetText;
		} else {
			this.treasureFleetContainer.classList.add("hidden");
		}
	}

	private addConnectedToEntry(cityName: string, amount: number) {
		const connectedToEntry = document.createElement("div");
		connectedToEntry.classList.add("growth-entry", "flex", "justify-between", "ml-4", "mr-1", "pointer-events-auto");
		connectedToEntry.setAttribute("tabindex", "-1");
		connectedToEntry.setAttribute("role", "paragraph");

		const connectedToCityName = document.createElement("div");
		connectedToCityName.classList.add("ml-4");
		connectedToCityName.textContent = Locale.compose(cityName);
		connectedToEntry.appendChild(connectedToCityName);

		const connectedToAmount = document.createElement("div");
		connectedToAmount.classList.add("mr-4");
		connectedToAmount.textContent = Locale.compose("LOC_UI_CITY_DETAILS_YIELD_ONE_DECIMAL", amount);
		connectedToEntry.appendChild(connectedToAmount);

		this.connectedToContainer.appendChild(connectedToEntry);
	}

	private updateYields() {
		this.yieldsContainer.innerHTML = ``;

		for (const currentYield of CityDetails.yields) {
			this.addTopYieldButton(this.yieldsContainer, currentYield);
		}
	}

	private addTopYieldButton(parent: Element, yieldData: YieldData) {
		const yieldButton = document.createElement("fxs-activatable");
		yieldButton.classList.add("yield-button", "h-16", "flex", "flex-auto", "hud_sidepanel_list-bg", "mr-1");
		yieldButton.setAttribute("tabindex", "-1");

		const columnContainer = document.createElement("div");
		columnContainer.classList.add("yield-button-highlight", "flex", "flex-auto", "flex-col", "justify-center", "hud_sidepanel_list-bg-no-fill");

		const rowContainer = document.createElement("div");
		rowContainer.classList.add("flex", "justify-between");

		const leftContainer = document.createElement("div");
		leftContainer.classList.add("flex", "items-center");
		rowContainer.appendChild(leftContainer);

		if (yieldData.icon && yieldData.iconContext) {
			const yieldIcon = document.createElement("fxs-icon");
			yieldIcon.setAttribute("data-icon-context", yieldData.iconContext);
			yieldIcon.setAttribute("data-icon-id", yieldData.icon);
			yieldIcon.classList.add("ml-2", "size-12");
			leftContainer.appendChild(yieldIcon);
		}

		const yieldName = document.createElement("div");
		yieldName.textContent = yieldData.name;
		yieldName.classList.add("ml-2", "self-center", "font-title", "uppercase");
		leftContainer.appendChild(yieldName);

		const rightContainer = document.createElement("div");
		rightContainer.classList.add("flex", "mr-4");
		rowContainer.appendChild(rightContainer);

		const yieldValue = document.createElement("div");
		yieldValue.textContent = Locale.compose("LOC_UI_CITY_DETAILS_YIELD_ONE_DECIMAL", yieldData.value);
		yieldValue.classList.add("self-center");
		rightContainer.appendChild(yieldValue);

		const arrowImg = document.createElement("div");
		arrowImg.classList.add("img-arrow", "-rotate-90", "ml-2", "hidden");
		rightContainer.appendChild(arrowImg);

		columnContainer.appendChild(rowContainer)
		yieldButton.appendChild(columnContainer);
		parent.appendChild(yieldButton);

		if (yieldData.children.length > 0) {
			arrowImg.classList.remove("hidden");

			const childrenContainer = document.createElement("div");
			childrenContainer.classList.add("flex-col", "ml-4", "hidden");

			for (const childYield of yieldData.children) {
				this.addChildYieldButton(childrenContainer, childYield);
			}

			yieldButton.addEventListener("action-activate", () => {
				arrowImg.classList.toggle("-rotate-90");
				arrowImg.classList.toggle("rotate-90");
				const hidden = childrenContainer.classList.toggle("hidden");
				const audioId = hidden ? "data-audio-dropdown-close" : "data-audio-dropdown-open";
				Audio.playSound(audioId);
			})

			parent.appendChild(childrenContainer);
		}
	}

	private addChildYieldButton(parent: Element, yieldData: YieldData) {
		const yieldButton = document.createElement("fxs-activatable");
		yieldButton.classList.add("yield-button", "h-16", "flex", "flex-auto", "mr-1");
		yieldButton.setAttribute("tabindex", "-1");

		const columnContainer = document.createElement("div");
		columnContainer.classList.add("yield-button-highlight", "flex", "flex-auto", "flex-col", "justify-center");

		const rowContainer = document.createElement("div");
		rowContainer.classList.add("flex", "justify-between");

		const leftContainer = document.createElement("div");
		leftContainer.classList.add("flex", "items-center");
		rowContainer.appendChild(leftContainer);

		if (yieldData.icon && yieldData.iconContext) {
			const yieldIcon = document.createElement("fxs-icon");
			yieldIcon.setAttribute("data-icon-context", yieldData.iconContext);
			yieldIcon.setAttribute("data-icon-id", yieldData.icon);
			yieldIcon.classList.add("ml-2", "size-12");
			leftContainer.appendChild(yieldIcon);
		}

		const yieldName = document.createElement("div");
		yieldName.textContent = yieldData.name;
		yieldName.classList.add("ml-2", "self-center");
		leftContainer.appendChild(yieldName);

		const rightContainer = document.createElement("div");
		rightContainer.classList.add("flex", "mr-4");
		rowContainer.appendChild(rightContainer);

		const yieldValue = document.createElement("div");
		yieldValue.textContent = Locale.compose("LOC_UI_CITY_DETAILS_YIELD_ONE_DECIMAL", yieldData.value);
		yieldValue.classList.add("self-center");
		rightContainer.appendChild(yieldValue);

		const arrowImg = document.createElement("div");
		arrowImg.classList.add("img-arrow", "-rotate-90", "ml-2", "hidden");
		rightContainer.appendChild(arrowImg);

		columnContainer.appendChild(rowContainer)
		yieldButton.appendChild(columnContainer);
		parent.appendChild(yieldButton);

		if (yieldData.children.length > 0) {
			arrowImg.classList.remove("hidden");

			const childrenContainer = document.createElement("div");
			childrenContainer.classList.add("flex-col", "ml-4", "hidden");

			for (const childYield of yieldData.children) {
				this.addChildYieldButton(childrenContainer, childYield);
			}

			yieldButton.addEventListener("action-activate", () => {
				arrowImg.classList.toggle("-rotate-90");
				arrowImg.classList.toggle("rotate-90");
				const hidden = childrenContainer.classList.toggle("hidden");
				const audioId = hidden ? "data-audio-dropdown-close" : "data-audio-dropdown-open";
				Audio.playSound(audioId);
			})

			parent.appendChild(childrenContainer);
		}
	}

	private addDistrictData(districtData: DistrictData): HTMLDivElement {
		const mainDiv = document.createElement("div");
		mainDiv.classList.add("flex", "flex-col", "ml-4");

		if (districtData.name && districtData.description) {
			const uniqueQuarterContainer = document.createElement("div");
			uniqueQuarterContainer.classList.add("flex", "pl-6");
			mainDiv.appendChild(uniqueQuarterContainer);

			const uniqueQuarterIcon = document.createElement("fxs-icon");
			uniqueQuarterIcon.classList.add("size-12", "mr-2");
			uniqueQuarterIcon.setAttribute("data-icon-context", "DEFAULT");
			uniqueQuarterIcon.setAttribute("data-icon-id", "CITY_UNIQUE_QUARTER");
			uniqueQuarterContainer.appendChild(uniqueQuarterIcon);

			const uniqueQuarterTextContainer = document.createElement("div");
			uniqueQuarterTextContainer.classList.add("flex", "flex-col", "flex-auto", "pr-1");
			uniqueQuarterContainer.appendChild(uniqueQuarterTextContainer);

			const districtName = document.createElement("div");
			districtName.classList.add("mb-1", "font-title", "uppercase");
			districtName.innerHTML = districtData.name;
			uniqueQuarterTextContainer.appendChild(districtName);

			const districtDescription = document.createElement("div");
			districtDescription.classList.add("mb-1");
			districtDescription.innerHTML = districtData.description;
			uniqueQuarterTextContainer.appendChild(districtDescription);
		}

		for (const constructibleData of districtData.constructibleData) {
			mainDiv.appendChild(this.addConstructibleData(constructibleData));
		}

		return mainDiv;
	}

	private addConstructibleData(constructibleData: ConstructibleData): HTMLElement {
		const mainDiv = document.createElement("fxs-activatable");
		mainDiv.classList.add("constructible-entry", "flex", "flex-col");
		mainDiv.setAttribute("tabindex", "-1");
		mainDiv.setAttribute("data-type", constructibleData.type);
		mainDiv.setAttribute('data-tooltip-style', 'production-constructible-tooltip');

		const topDiv = document.createElement("div");
		topDiv.classList.add("constructible-entry-highlight", "flex", "ml-6", "mt-1", "mb-1", "pointer-events-none");

		const icon = document.createElement("fxs-icon");
		icon.classList.add("size-12");
		icon.setAttribute("data-icon-context", constructibleData.iconContext);
		icon.setAttribute("data-icon-id", constructibleData.icon);
		topDiv.appendChild(icon);

		const rightContainer = document.createElement("div");
		rightContainer.classList.add("flex", "flex-col");

		const nameContainer = document.createElement("div");
		nameContainer.classList.add("flex", "ml-2", "center")
		rightContainer.appendChild(nameContainer);

		const name = document.createElement("div");
		name.classList.add("mr-2", "font-title", "uppercase");
		name.textContent = Locale.compose(constructibleData.name);
		nameContainer.appendChild(name);

		if (constructibleData.damaged) {
			const damagedText = document.createElement("div");
			damagedText.classList.add("uppercase", "text-negative");
			damagedText.textContent = "LOC_UI_CITY_DETAILS_BUILDING_DAMAGED";
			nameContainer.appendChild(damagedText);
		}

		if (constructibleData.yieldMap) {
			const yieldContainer = document.createElement("div");
			yieldContainer.classList.add("flex", "flex-wrap", "max-w-96");

			for (const [_yieldType, yieldData] of constructibleData.yieldMap) {
				if (yieldData.icon && yieldData.iconContext) {
					const yieldEntry = document.createElement("div");
					yieldEntry.classList.add("flex");
					yieldContainer.appendChild(yieldEntry);

					const yieldIcon = document.createElement("fxs-icon");
					yieldIcon.setAttribute("data-icon-context", yieldData.iconContext);
					yieldIcon.setAttribute("data-icon-id", yieldData.icon);
					yieldIcon.classList.add("ml-2", "size-6");
					yieldEntry.appendChild(yieldIcon);

					const yieldValue = document.createElement("div");
					yieldValue.classList.add("text-sm", "self-center");
					yieldValue.textContent = Locale.compose("LOC_UI_CITY_DETAILS_YIELD_ONE_DECIMAL", yieldData.value);
					yieldEntry.appendChild(yieldValue);
				}
			}

			rightContainer.appendChild(yieldContainer);
		}

		if (constructibleData.maintenanceMap) {
			const maintenanceContainer = document.createElement("div");
			maintenanceContainer.classList.add("flex", "pl-2");

			const maintenanceText = document.createElement("div");
			maintenanceText.textContent = Locale.compose("LOC_UI_PRODUCTION_BUILDING_MAINTENANCE");
			maintenanceContainer.appendChild(maintenanceText);

			for (const [_maintenanceType, maintenanceData] of constructibleData.maintenanceMap) {
				if (maintenanceData.icon && maintenanceData.iconContext) {
					const maintenanceEntry = document.createElement("div");
					maintenanceEntry.classList.add("flex");
					maintenanceContainer.appendChild(maintenanceEntry);

					const maintenanceIcon = document.createElement("fxs-icon");
					maintenanceIcon.setAttribute("data-icon-context", maintenanceData.iconContext);
					maintenanceIcon.setAttribute("data-icon-id", maintenanceData.icon);
					maintenanceIcon.classList.add("ml-2", "size-6");
					maintenanceEntry.appendChild(maintenanceIcon);

					const maintenanceValue = document.createElement("div");
					maintenanceValue.classList.add("text-sm", "self-center", "text-negative-light");
					maintenanceValue.textContent = Locale.compose("LOC_UI_CITY_DETAILS_YIELD_ONE_DECIMAL", maintenanceData.value);
					maintenanceEntry.appendChild(maintenanceValue);
				}
			}

			rightContainer.appendChild(maintenanceContainer);
		}

		mainDiv.setAttribute("data-constructible-data", JSON.stringify(constructibleData));

		mainDiv.addEventListener("mouseover", this.mouseOverBuildingListener);
		mainDiv.addEventListener("mouseout", this.mouseOutBuildingListener);

		mainDiv.addEventListener("focus", this.focusBuildingListener);
		mainDiv.addEventListener("focusout", this.focusOutBuildingListener);

		mainDiv.addEventListener("action-activate", this.activateBuildingListener)

		topDiv.appendChild(rightContainer);
		mainDiv.appendChild(topDiv);
		return mainDiv;
	}

	private mouseOverBuildingListener = this.onMouseOverBuilding.bind(this);
	private mouseOutBuildingListener = this.onMouseOutBuilding.bind(this);
	private focusBuildingListener = this.onFocusBuilding.bind(this);
	private focusOutBuildingListener = this.onFocusOutBuilding.bind(this);
	private activateBuildingListener = this.activateBuilding.bind(this);

	private onMouseOverBuilding(event: Event) {
		this.addBuildingHighlight(event);
	}

	private onMouseOutBuilding(_event: Event) {
		this.removeBuildingHighlight();
	}

	private onFocusBuilding(event: Event) {
		this.addBuildingHighlight(event);
	}

	private onFocusOutBuilding() {
		this.removeBuildingHighlight();
	}

	private activateBuilding(event: Event) {
		if (event.target instanceof HTMLElement) {
			const constructibleDataAttribute = event.target.getAttribute("data-constructible-data");
			if (constructibleDataAttribute) {
				const constructibleData: ConstructibleData = JSON.parse(constructibleDataAttribute);
				Camera.lookAtPlot(constructibleData.location);
			}
		}
	}

	private addBuildingHighlight(event: Event) {
		if (event.target instanceof HTMLElement) {
			const constructibleDataAttribute = event.target.getAttribute("data-constructible-data");
			if (constructibleDataAttribute) {
				const constructibleData: ConstructibleData = JSON.parse(constructibleDataAttribute);

				this.landmarkOverlay.clear();
				this.landmarkOverlay.addLandmark(constructibleData.location, this.LANDMARK_BORDER_STYLE, constructibleData.id.id);

				this.highlightOverlay.clear();
				this.highlightOverlay.setPlotGroups(constructibleData.location, 0);
			}
		}
	}

	private removeBuildingHighlight() {
		this.landmarkOverlay.clear();
		this.highlightOverlay.clear();
	}

	private createDivider(): HTMLDivElement {
		const dividerDiv = document.createElement("div");
		dividerDiv.classList.add("flex", "w-96", "self-center");

		dividerDiv.innerHTML = `
			<div class="w-1\\/2 h-5 bg-cover bg-no-repeat city-details-half-divider"></div>
			<div class="w-1\\/2 h-5 bg-cover bg-no-repeat city-details-half-divider -scale-x-100"></div>
		`;

		return dividerDiv;
	}
}

Controls.define("panel-city-details", {
	createInstance: PanelCityDetails,
	description: "Panel which displays the detailed breakdown of city information",
	classNames: ["panel-city-details", "font-body", "text-base", "pointer-events-none", "trigger-nav-help", "h-full"],
	styles: ["fs://game/base-standard/ui/city-details/panel-city-details.css"],
	tabIndex: -1
});