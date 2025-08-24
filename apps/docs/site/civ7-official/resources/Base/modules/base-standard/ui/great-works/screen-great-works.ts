/**
 * @file screen-great-works.ts
 * @copyright 2020-2023, Firaxis Games
 * @description Great Works screen
 */

import GreatWorks from '/base-standard/ui/great-works/model-great-works.js';
import { ActionActivateEvent } from '/core/ui/components/fxs-activatable.js';
import { TabItem, TabSelectedEvent } from '/core/ui/components/fxs-tab-bar.js';
import ActionHandler, { ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { InputEngineEvent, InputEngineEventName, NavigateInputEvent } from '/core/ui/input/input-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel from '/core/ui/panel-support.js';
import { realizePlayerColors } from '/core/ui/utilities/utilities-color.js';
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';

class ScreenGreatWorks extends Panel {

	private activeDeviceTypeListener: EventListener = (event: CustomEvent) => { this.onActiveDeviceTypeChanged(event); }
	private onGreatWorkUnhovered: EventListener = () => { this.onFocusOut(); }
	private greatWorkSelectedListener: EventListener = (event: ActionActivateEvent) => { this.onGreatWorkSelected(event); }
	private emptySlotSelectedListener: EventListener = (event: ActionActivateEvent) => { this.onEmptySlotSelected(event); }
	private engineInputListener: EventListener = (inputEvent: InputEngineEvent) => { this.onEngineInput(inputEvent); };
	private rebuildGreatWorksListener: EventListener = () => { this.rebuildGreatWorksPanel(); }
	private navigateInputListener: EventListener = (navigationEvent: NavigateInputEvent) => { this.onNavigateInput(navigationEvent) };

	private currentlySelectedWork: HTMLElement | null = null;
	private lastSelectedElementId: string = "";

	private settlementFilter: string = "all";

	constructor(root: ComponentRoot) {
		super(root);
		this.enableOpenSound = true;
		this.enableCloseSound = true;
		this.Root.setAttribute("data-audio-group-ref", "great-works");
	}

	private showcaseList: HTMLElement | null = null;

	private settlementTabBar: HTMLElement = document.createElement('fxs-tab-bar');
	private settlementTabData: TabItem[] = [
		{ label: 'LOC_UI_SETTLEMENT_TAB_BAR_CITIES', id: 'city' },
		{ label: 'LOC_UI_SETTLEMENT_TAB_BAR_TOWNS', id: 'town' },
		{ label: 'LOC_UI_SETTLEMENT_TAB_BAR_ALL', id: 'all' }
	];
	private settlementTabBarListener = this.onSettlementTabBarSelected.bind(this);

	onInitialize() {
		super.onInitialize();
		this.Root.classList.add('fixed', 'inset-0', 'h-full');
	}

	onAttach() {
		super.onAttach();

		this.Root.addEventListener(InputEngineEventName, this.engineInputListener);
		this.Root.addEventListener('navigate-input', this.navigateInputListener);
		window.addEventListener('model-great-works-rebuild-panel', this.rebuildGreatWorksListener);
		window.addEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener, true);

		// Close Button
		const closeButton = MustGetElement("fxs-close-button", this.Root);
		closeButton.addEventListener('action-activate', () => {
			this.requestClose();
		});

		const frame = MustGetElement("fxs-frame", this.Root);
		frame.setAttribute("outside-safezone-mode", "full");

		const uiViewExperience = UI.getViewExperience();
		if (uiViewExperience == UIViewExperience.Mobile) {
			frame.setAttribute("frame-style", "f1");
			frame.setAttribute("no-filigree", "true");
			frame.setAttribute("override-styling", "relative flex size-full");

			const topFiligree = MustGetElement('.great-works-top-border', this.Root);
			topFiligree.classList.add('hidden');

			const header = MustGetElement('.great-works-header', this.Root);
			if (frame.children.length > 0) {
				frame.insertBefore(header, frame.children[0]);
			} else {
				frame.appendChild(header);
			}
		}

		this.updateAll();

		const player: PlayerId = GameContext.localPlayerID;
		if (Players.isValid(player)) {
			realizePlayerColors(this.Root, player);
		}

		this.setGamepadControlsVisible(ActionHandler.isGamepadActive);

		// Settlement Tab Bar
		this.buildSettlementTabBar();
	}

	onDetach() {
		this.Root.removeEventListener(InputEngineEventName, this.engineInputListener);
		this.Root.removeEventListener('navigate-input', this.navigateInputListener);
		window.removeEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener, true);
		window.removeEventListener('model-great-works-rebuild-panel', this.rebuildGreatWorksListener);

		GreatWorks.clearSelectedGreatWork();

		super.onDetach();
	}

	rebuildGreatWorksPanel() {
		const archivedGreatWorksList: HTMLElement | null = this.Root.querySelector<HTMLElement>('.archived-great-works-list');
		if (!archivedGreatWorksList) {
			console.error('screen-great-works: onAttach(): Failed to find archived-great-works-list!');
			return;
		}

		const citySlotsGreatWorksList: HTMLElement | null = this.Root.querySelector<HTMLElement>('.city-slots-displayed-list');
		if (!citySlotsGreatWorksList) {
			console.error('screen-great-works: onAttach(): Failed to find city-slots-displayed-list!');
			return;
		}

		this.showcaseList = this.Root.querySelector<HTMLElement>('.showcase-list')
		if (!this.showcaseList) {
			console.error('screen-great-works: rebuildGreatWorksPanel(): Failed to find showcase-list!');
			return;
		}

		this.buildArchivedGreatWorks(archivedGreatWorksList);

		// Remove all Great Works from Showcase first
		while (this.showcaseList?.firstChild) {
			this.showcaseList.firstChild.remove();
		}

		this.buildSlotsBox(citySlotsGreatWorksList);

		const lastSelectedElement: HTMLElement | null = document.getElementById(this.lastSelectedElementId);
		if (lastSelectedElement) {
			window.requestAnimationFrame(() => {
				window.requestAnimationFrame(() => {
					FocusManager.setFocus(lastSelectedElement);
				});
			});
		}

		this.filterSettlementByType(this.settlementFilter);
	}

	private onActiveDeviceTypeChanged(event: CustomEvent) {
		this.setGamepadControlsVisible(event.detail?.gamepadActive);
	}

	private onNavigateInput(navigationEvent: NavigateInputEvent) {
		if (navigationEvent.detail.status != InputActionStatuses.FINISH) {
			// Ignore everything but FINISH events
			return;
		}
		if (navigationEvent.getDirection() == InputNavigationAction.RIGHT) {
			if (FocusManager.getFocus().classList.contains("great-work-container")) {
				const citySlotsGreatWorksList: HTMLElement | null = this.Root.querySelector<HTMLElement>('.city-slots-displayed-list');
				if (citySlotsGreatWorksList) {
					FocusManager.setFocus(citySlotsGreatWorksList);
				}
			}
		}
	}

	private setGamepadControlsVisible(isVisible: boolean) {
		if (isVisible) {
			NavTray.addOrUpdateGenericBack();
			NavTray.addOrUpdateGenericSelect();
		}
		else {
			NavTray.clear();
		}
	}

	private updateAll() {
		engine.updateWholeModel(GreatWorks);
		GreatWorks.update();
	}

	private determineInitialFocus() {
		//don't focus lists that are empty
		const archiveList: HTMLElement = MustGetElement('.archived-great-works-list', this.Root);
		if (archiveList.hasChildNodes()) {
			FocusManager.setFocus(archiveList);
			return;
		}
		const showcaseList: HTMLElement = MustGetElement('.showcase-list', this.Root);
		if (showcaseList.hasChildNodes()) {
			FocusManager.setFocus(showcaseList);
			return;
		}
		const cityList: HTMLElement = MustGetElement('.city-slots-displayed-list', this.Root);
		if (cityList.hasChildNodes()) {
			FocusManager.setFocus(cityList);
			return;
		}
		else {
			const focusElement: HTMLElement = MustGetElement('.great-works-columns', this.Root);
			if (focusElement) {
				FocusManager.setFocus(focusElement);
			}
		}
	}

	onReceiveFocus() {
		super.onReceiveFocus();
		this.determineInitialFocus();
	}

	private buildSettlementTabBar(): void {

		const settlementTypeBox: HTMLElement | null = this.Root.querySelector<HTMLElement>('.settlement-tab-bar-container');
		if (!settlementTypeBox) {
			console.error('screen-resource-allocation: buildSettlementTabBar(): Failed to find settlement-tab-bar-container');
			return;
		}

		// settlement tab bar
		this.settlementTabBar.classList.add('settlement_nav', 'w-full', 'font-title', 'text-sm');
		this.settlementTabBar.setAttribute("tab-item-class", "font-title text-xs");
		this.settlementTabBar.setAttribute("tab-items", JSON.stringify(this.settlementTabData));
		this.settlementTabBar.setAttribute("selected-tab-index", "2");
		this.settlementTabBar.addEventListener("tab-selected", this.settlementTabBarListener);

		// Nav Help position
		if (UI.getViewExperience() != UIViewExperience.Mobile) {
			this.settlementTabBar.setAttribute('nav-help-right-class', 'relative right-0');
			this.settlementTabBar.setAttribute('nav-help-left-class', 'relative left-0');
		}

		settlementTypeBox.appendChild(this.settlementTabBar);
	}

	private onFocusOut() {
		const tooltipLocationArchive: HTMLElement | null = this.Root.querySelector<HTMLElement>('.tooltip-location-archive');
		if (tooltipLocationArchive) {
			tooltipLocationArchive.innerHTML = "";
		}
		const tooltipLocationSlotsbox: HTMLElement | null = this.Root.querySelector<HTMLElement>('.tooltip-location-slotsbox');
		if (tooltipLocationSlotsbox) {
			tooltipLocationSlotsbox.innerHTML = "";
		}
	}

	private onGreatWorkSelected(event: ActionActivateEvent) {
		if (!(event.target instanceof HTMLElement)) {
			return;
		}

		const greatWorkIndexAttribute: string | null = event.target.getAttribute('data-greatwork-index');
		if (!greatWorkIndexAttribute) {
			console.error('screen-great-works: onArchivedGreatWorkSelected(): Failed to find data-greatwork-index!');
			return;
		}

		const greatWorkIndex: number = parseInt(greatWorkIndexAttribute);

		const greatWorkCityAttribute: string | null = event.target.getAttribute('data-greatwork-city');
		let greatWorkCityID = -1;
		if (greatWorkCityAttribute) {
			greatWorkCityID = parseInt(greatWorkCityAttribute);
		}

		GreatWorks.selectGreatWork(greatWorkIndex, greatWorkCityID);
		if (GreatWorks.hasSelectedGreatWork()) {
			if (this.currentlySelectedWork) {
				this.currentlySelectedWork.classList.remove("great-work-selected");
			}
			this.currentlySelectedWork = event.target;
			this.currentlySelectedWork.classList.add("great-work-selected");
		}
		else {
			if (this.currentlySelectedWork) {
				this.currentlySelectedWork.classList.remove("great-work-selected");
			}
		}
	}

	private onEmptySlotSelected(event: ActionActivateEvent) {
		if (!(event.target instanceof HTMLElement)) {
			return;
		}
		const cityIdAttribute: string | null = event.target.getAttribute('data-greatwork-city');
		if (!cityIdAttribute) {
			console.error('screen-great-works: onEmptySlotSelected(): Failed to find data-greatwork-city!');
			return;
		}
		const buildingIdAttribute: string | null = event.target.getAttribute('data-greatwork-building');
		if (!buildingIdAttribute) {
			console.error('screen-great-works: onEmptySlotSelected(): Failed to find data-greatwork-building!');
			return;
		}

		const greatWorkCityId: number = parseInt(cityIdAttribute);
		const greatWorkBuildingId: number = parseInt(buildingIdAttribute);

		GreatWorks.selectEmptySlot(greatWorkCityId, greatWorkBuildingId);
		this.currentlySelectedWork = event.target;
		this.lastSelectedElementId = event.target.id;

	}

	private onEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		if (inputEvent.isCancelInput() || inputEvent.detail.name == 'sys-menu') {
			this.close();
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		}
	}

	protected requestClose(inputEvent?: InputEngineEvent): void {
		if (inputEvent) {
			inputEvent.stopPropagation();
			inputEvent.stopImmediatePropagation;
		}

		this.close();
	}

	private buildArchivedGreatWorks(parent: HTMLElement) {
		const playerCulture = GreatWorks.localPlayer?.Culture;
		if (!playerCulture) {
			console.error("screen-great-works: buildArchivedGreatWorks - no player culture found!");
			return;
		}
		parent.innerHTML = "";
		const numArchivedWorks: number = playerCulture.getNumWorksInArchive();
		for (let i = 0; i < numArchivedWorks; i++) {
			const greatWorkIndex: number = playerCulture.getArchivedGreatWork(i);
			let gwType = Game.Culture.getGreatWorkType(greatWorkIndex);
			const greatWork: GreatWorkDefinition | null = GameInfo.GreatWorks.lookup(gwType);
			if (greatWork) {
				const greatWorkContainer: HTMLElement = document.createElement("div");
				greatWorkContainer.classList.add("great-work-container-entry", 'relative', 'flex');

				// Activatable
				const greatWorkContainerFrame: HTMLElement = document.createElement('fxs-activatable');
				greatWorkContainerFrame.classList.add('great-work-frame', 'm-1', 'p-2', 'flex', 'relative', 'grow', 'shrink',
					"hover\\:bg-secondary", "focus\\:bg-secondary", "active\\:bg-secondary"
				);
				greatWorkContainerFrame.setAttribute("tabindex", "-1");
				greatWorkContainerFrame.id = `archivedWork${i}`;
				greatWorkContainerFrame.setAttribute('data-greatwork-index', greatWorkIndex.toString())
				greatWorkContainerFrame.addEventListener('action-activate', this.greatWorkSelectedListener);
				greatWorkContainer.appendChild(greatWorkContainerFrame);

				// Icon
				const greatWorkIcon: HTMLElement = document.createElement("fxs-icon");
				greatWorkIcon.classList.add("great-work-icon", 'size-16');

				// TODO: Remove greatWorkImage when the Great Works Icons are registered. Use greatWorkIcon instead.
				const greatWorkImage: HTMLElement = document.createElement("img");
				greatWorkImage.classList.add("great-work-icon", 'size-16');

				greatWorkIcon.setAttribute('data-icon-context', 'DEFAULT');

				const iconID: string | undefined = greatWork.GreatWorkType;
				const imageURL: string | undefined = greatWork.Image;

				if (imageURL) {
					greatWorkImage.setAttribute('src', imageURL);
				}
				else {
					greatWorkImage.setAttribute('src', "unitflag_missingicon.png");
				}

				if (iconID) {
					greatWorkIcon.setAttribute('data-icon-id', iconID);
				}

				// TODO: change greatWorkImage to greatWorkIcon once icons are registered.
				greatWorkContainerFrame.appendChild(greatWorkImage);

				// Text
				const textContainer: HTMLElement = document.createElement('div');
				textContainer.classList.add('great-work-text-container', 'shrink', 'flex', 'flex-col');
				greatWorkContainerFrame.appendChild(textContainer);

				// Name
				const greatWorkName: HTMLElement = document.createElement('div');
				greatWorkName.classList.value = 'font-title text-sm text-secondary uppercase mb-2 flex flex-wrap relative';
				let title: string = "";
				if (playerCulture.isArtifact(greatWork.GreatWorkType)) {
					const extraText = playerCulture.getArtifactCulture(greatWork.GreatWorkType);
					if (extraText !== "") {
						title = Locale.compose("LOC_UI_GREAT_WORKS_NAME_CIVILIZATION", extraText, greatWork.Name)
					}
					else {
						title = Locale.compose("LOC_UI_GREAT_WORKS_NAME", greatWork.Name)
					}
				}
				else {
					title = Locale.compose("LOC_UI_GREAT_WORKS_UNIQUE_NAME", greatWork.Name)
				}


				greatWorkName.setAttribute('data-l10n-id', title);
				textContainer.appendChild(greatWorkName);

				// Bonus
				const greatWorkBonus: HTMLElement = document.createElement('div');
				greatWorkBonus.classList.add('great-work-bonus', 'font-body', 'text-sm');
				const greatWorkBonusText: string | undefined = greatWork.Description;
				if (greatWorkBonusText) {
					greatWorkBonus.innerHTML = Locale.stylize(greatWorkBonusText);
				}
				textContainer.appendChild(greatWorkBonus);

				parent.appendChild(greatWorkContainer);
			}
		}
	}

	private buildSlotsBox(parent: HTMLElement) {
		if (!GreatWorks.localPlayer) {
			console.error("screen-great-works: buildSlotsBox() - no local player found!");
			return;
		}
		parent.innerHTML = "";
		const cities: PlayerCities | undefined = GreatWorks.localPlayer.Cities;
		if (!cities) {
			console.error("screen-great-works: buildSlotsBox() - local player has no cities!");
			return;
		}
		const cityIds: ComponentID[] = cities.getCityIds();

		let i = 0;
		cityIds.forEach(cityId => {
			if (ComponentID.isInvalid(cityId)) {
				console.error(`screen-great-works.ts: buildSlotsBox() - cityId ${cityId.id} is invalid!`);
				return;
			}
			const city: City | null = Cities.get(cityId);
			if (!city) {
				console.error(`screen-great-works.ts: buildSlotsBox() - no city found for cityID ${cityId.id}`);
				return;
			}
			if (!(city.Constructibles)) {
				console.error(`screen-great-works.ts: buildSlotsBox() - no city constructibles found for cityID ${cityId.id}`);
				return;
			}
			const gwBuildings: GreatWorkBuilding[] = city.Constructibles.getGreatWorkBuildings();
			if (!gwBuildings || gwBuildings.length == 0) {
				//no buildings that can hold great works in city
				return;
			}
			const cityEntryContainer: HTMLElement | null = document.createElement('div');
			cityEntryContainer.classList.add('city-entry-container', 'w-1\\/2');
			cityEntryContainer.setAttribute('settlement-type', 'city');
			const settlementIcon = document.createElement('img');
			settlementIcon.classList.add('relative', 'size-8', 'mx-1');
			settlementIcon.setAttribute('src', 'Yield_Cities');

			if (city.isCapital) {
				cityEntryContainer.setAttribute('settlement-type', 'capital');
				settlementIcon.setAttribute('src', 'res_capital');
			}
			else if (city.isTown) {
				cityEntryContainer.setAttribute('settlement-type', 'town');
				settlementIcon.setAttribute('src', 'Yield_Towns');
			}

			const cityEntryFrame: HTMLElement | null = document.createElement('div');
			cityEntryFrame.classList.add('great-work-frame', 'm-1', 'p-2', 'flex-auto');
			cityEntryContainer.appendChild(cityEntryFrame);
			this.createSlotsBoxCityHeader(cityEntryFrame, city, settlementIcon);

			const buildingContainer: HTMLElement | null = document.createElement('div');
			buildingContainer.classList.add('flex-wrap', 'flex');
			cityEntryFrame.appendChild(buildingContainer);

			gwBuildings.forEach(greatWorkBuilding => {
				const buildingInstance: Constructible | null = Constructibles.getByComponentID(greatWorkBuilding.constructibleID);
				if (buildingInstance) {
					const info: ConstructibleDefinition | null = GameInfo.Constructibles.lookup(buildingInstance.type);
					if (!info) {
						console.error("screen-great-works.ts: buildSlotsBox() - couldn't find constructible definition from constructible!");
						return;
					}
					const buildingPillaged: boolean = buildingInstance.damaged;

					const buildingEntry: HTMLElement = document.createElement('div');
					buildingEntry.classList.add('building-entry', 'mr-3', "h-26", "flex", "flex-col");

					buildingContainer.appendChild(buildingEntry);

					this.createSlotsBoxBuildingSubHeader(buildingEntry, buildingPillaged, info.Name);

					const buildingSlotsContainer: HTMLElement = document.createElement('div');
					buildingSlotsContainer.classList.add('flex-wrap', 'flex');
					buildingEntry.appendChild(buildingSlotsContainer);

					greatWorkBuilding.slots.forEach(slot => {
						const gwType = Game.Culture.getGreatWorkType(slot.greatWorkIndex);
						const greatWork: GreatWorkDefinition | null = GameInfo.GreatWorks.lookup(gwType);
						this.createSlotsBoxGreatWorkEntry(buildingSlotsContainer, greatWork, city, buildingInstance, slot.greatWorkIndex, i);
						i++;
					});
				}
			});

			parent.appendChild(cityEntryContainer);
		});
	}

	private createSlotsBoxCityHeader(parent: HTMLElement, city: City, icon: HTMLElement) {
		const slotsBoxCityHeader: HTMLElement = document.createElement("div");
		slotsBoxCityHeader.classList.add("slots-box-city-header", "items-center", "mb-2", "flex");

		const cityHeaderFocusButton = document.createElement("fxs-activatable");
		cityHeaderFocusButton.classList.add('more-info-toggle', 'mr-1', 'size-5',
			"hover\\:bg-secondary", "focus\\:bg-secondary", "active\\:bg-secondary"
		);
		cityHeaderFocusButton.setAttribute("tabindex", "-1");
		slotsBoxCityHeader.appendChild(cityHeaderFocusButton);
		slotsBoxCityHeader.appendChild(icon);

		cityHeaderFocusButton.addEventListener('action-activate', () => {
			UI.Player.lookAtID(city.id);
		});

		const slotsBoxCityHeaderText: HTMLElement = document.createElement("div");
		slotsBoxCityHeaderText.classList.add("truncate", "flex-auto", "uppercase", "tracking-100", "text-gradient-secondary", "font-title", "text-lg");
		slotsBoxCityHeaderText.setAttribute("data-l10n-id", city.name);
		slotsBoxCityHeader.appendChild(slotsBoxCityHeaderText);

		parent.appendChild(slotsBoxCityHeader);
	}

	private createSlotsBoxBuildingSubHeader(parent: HTMLElement, isDamaged: boolean, buildingName: string) {
		const slotsBoxCityHeader: HTMLElement = document.createElement("div");
		slotsBoxCityHeader.classList.add("slots-box-building-subheader", "flex", "items-center");

		const slotsBoxCityHeaderName: HTMLElement = document.createElement("fxs-header");
		slotsBoxCityHeaderName.classList.add("slots-box-building-name");
		slotsBoxCityHeaderName.setAttribute('class', 'font-title text-2xs uppercase my-1 mx-1');
		slotsBoxCityHeaderName.setAttribute('filigree-style', 'none');
		slotsBoxCityHeaderName.setAttribute('title', buildingName);
		slotsBoxCityHeader.appendChild(slotsBoxCityHeaderName);

		if (isDamaged) {
			const slotsBoxCityPillagedNotification: HTMLElement = document.createElement("div");
			slotsBoxCityPillagedNotification.classList.add("slots-box-building-pillaged", "text-2xs", "ml-1");
			slotsBoxCityPillagedNotification.innerHTML = Locale.compose("LOC_UI_GREAT_WORKS_DISPLAY_PILLAGED");
			slotsBoxCityHeader.appendChild(slotsBoxCityPillagedNotification);
		}

		parent.appendChild(slotsBoxCityHeader);
	}

	private createSlotsBoxGreatWorkEntry(parent: HTMLElement, greatWork: GreatWorkDefinition | null, city: City, building: Constructible, listIndex: GreatWorkListIndex, slotIndex: number) {
		const slotsBoxGreatWorkEntryContainer: HTMLElement = document.createElement("div");
		slotsBoxGreatWorkEntryContainer.classList.add("slots-box-entry-container");

		const greatWorkContainer: HTMLElement = document.createElement("fxs-activatable");
		greatWorkContainer.classList.add("great-work-container");
		greatWorkContainer.setAttribute("tabindex", "-1");
		greatWorkContainer.id = `slot${slotIndex}`;
		greatWorkContainer.setAttribute('data-greatwork-city', city.id.id.toString());
		greatWorkContainer.setAttribute('data-greatwork-building', building.type.toString());
		greatWorkContainer.classList.add('pointer-events-auto',
			"hover\\:bg-secondary", "focus\\:bg-secondary", "active\\:bg-secondary");

		if (building.damaged) {
			greatWorkContainer.style.backgroundColor = "red";
			return;
		}

		const greatWorkContainerFrame: HTMLElement = document.createElement("div");
		greatWorkContainerFrame.classList.add("great-work-container-frame");
		greatWorkContainer.appendChild(greatWorkContainerFrame);

		const greatWorkContainerImage: HTMLElement = document.createElement("div");
		greatWorkContainerImage.classList.add("great-work-container-image");

		greatWorkContainerFrame.appendChild(greatWorkContainerImage);

		slotsBoxGreatWorkEntryContainer.appendChild(greatWorkContainer);

		const slotsBoxEntryDescription: HTMLElement = document.createElement("div");
		slotsBoxEntryDescription.classList.add("slots-box-entry-description");

		const slotsBoxEntryDescriptionTitle: HTMLElement = document.createElement("div");
		slotsBoxEntryDescriptionTitle.classList.add("slots-box-entry-description-title");
		slotsBoxEntryDescription.appendChild(slotsBoxEntryDescriptionTitle);

		const slotsBoxEntryDescriptionText: HTMLElement = document.createElement("div");
		slotsBoxEntryDescriptionText.classList.add("slots-box-entry-description-text");
		slotsBoxEntryDescription.appendChild(slotsBoxEntryDescriptionText);

		slotsBoxGreatWorkEntryContainer.appendChild(slotsBoxEntryDescription);

		if (greatWork) {
			// Icon
			const playerCulture = GreatWorks.localPlayer?.Culture;
			if (!playerCulture) {
				console.error("screen-great-works: createSlotsBoxGreatWorkEntry - no player culture found!");
				return;
			}

			// Format Tooltip
			let title: string = "";
			if (playerCulture.isArtifact(greatWork.GreatWorkType)) {
				const extraText = playerCulture.getArtifactCulture(greatWork.GreatWorkType);
				if (extraText !== "") {
					title = Locale.compose("LOC_UI_GREAT_WORKS_NAME_CIVILIZATION", extraText, greatWork.Name)
				}
				else {
					title = Locale.compose("LOC_UI_GREAT_WORKS_NAME", greatWork.Name)
				}
			}
			else {
				title = Locale.compose("LOC_UI_GREAT_WORKS_UNIQUE_NAME", greatWork.Name)
			}
			const description: string = this.getGreatWorkDescription(greatWork, city);

			greatWorkContainer.setAttribute('data-tooltip-content', title + " " + description);

			const greatWorkIcon: HTMLElement = document.createElement("fxs-icon");
			greatWorkIcon.classList.add("great-work-icon", 'size-16');

			greatWorkIcon.setAttribute('data-icon-context', 'DEFAULT');

			// TODO: Remove greatWorkImage when the Great Works Icons are registered. Use greatWorkIcon instead.
			const greatWorkImage: HTMLElement = document.createElement("img");
			greatWorkImage.classList.add("great-work-icon", 'size-16');

			greatWorkIcon.setAttribute('data-icon-context', 'DEFAULT');

			const iconID: string | undefined = greatWork.GreatWorkType;
			const imageURL: string | undefined = greatWork.Image;

			if (imageURL) {
				greatWorkImage.setAttribute('src', imageURL);
			}
			else {
				greatWorkImage.setAttribute('src', "unitflag_missingicon.png");
			}

			if (iconID) {
				greatWorkIcon.setAttribute('data-icon-id', iconID);
			}

			// TODO: change greatWorkImage to greatWorkIcon once icons are registered.
			greatWorkContainerFrame.appendChild(greatWorkImage);

			// Add all Great Works to Showcase
			this.showcaseList?.appendChild(greatWorkContainer.cloneNode(true));

			// Only add event listeners to the activatables in the city entries
			greatWorkContainer.addEventListener('blur', this.onGreatWorkUnhovered);
			greatWorkContainer.addEventListener('mouseleave', this.onGreatWorkUnhovered);
			greatWorkContainer.addEventListener('action-activate', this.greatWorkSelectedListener);
			greatWorkContainer.setAttribute('data-greatwork-index', listIndex.toString());
		}

		// Empty Slots
		else {
			const emptySlotImage: HTMLElement = document.createElement('img');
			emptySlotImage.classList.add('size-16');
			emptySlotImage.setAttribute('src', 'base_empty-slot-mini_add');
			greatWorkContainer.appendChild(emptySlotImage);
			greatWorkContainer.addEventListener('action-activate', this.emptySlotSelectedListener);
		}
		parent.appendChild(slotsBoxGreatWorkEntryContainer);
	}

	private getGreatWorkDescription(greatWork: GreatWorkDefinition, city?: City): string {
		if (greatWork.Description) {
			return Locale.compose(greatWork.Description);
		}
		else if (greatWork.Generic) {
			let returnString = "";
			if (city?.Constructibles) {
				for (const yieldType in YieldTypes) {
					const totalYield: number = city.Constructibles.getYieldFromGreatWork(yieldType, greatWork.$index);
					if (totalYield > 0) {
						returnString += "<p>" + Locale.compose("LOC_UI_POS_YIELD", totalYield, "LOC_" + yieldType) + "</p>";
					}
				}
			}
			else {
				const gwYieldChange: GreatWork_YieldChangeDefinition | null = GameInfo.GreatWork_YieldChanges.lookup(greatWork.$index);
				if (gwYieldChange) {
					returnString = Locale.compose("LOC_UI_POS_YIELD", gwYieldChange.YieldChange, "LOC_" + gwYieldChange.YieldType);
				}
			}
			return returnString;
		}
		return "Missing description!";
	}

	private onSettlementTabBarSelected(event: TabSelectedEvent) {
		this.settlementFilter = event.detail.selectedItem.id;
		this.filterSettlementByType(this.settlementFilter);
	}

	private filterSettlementByType(settlementTypeFilter: string): void {

		const cityList: HTMLElement | null = this.Root.querySelector<HTMLElement>('.city-slots-displayed-list');
		if (!cityList) {
			console.error('screen-resource-allocation: onAttach(): Failed to find city-slots-displayed-list!');
			return;
		}

		const settlements = cityList.children;

		let needRefocus: boolean = true;
		for (let i = 0; i < settlements.length; i++) {
			const settlement = settlements[i] as HTMLElement;

			if (settlement.hasAttribute("settlement-type")) {
				const settlementType = settlement.getAttribute("settlement-type");

				if (settlementType === settlementTypeFilter || settlementTypeFilter === "all") {
					settlement.classList.remove('hidden');
					needRefocus = false;
				}
				else {
					settlement.classList.add('hidden');
				}

				// Capitals are treated as cities
				if (settlementTypeFilter === "city" && settlementType === "capital") {
					settlement.classList.remove('hidden');
				}
			}
		}
		if (needRefocus) {
			this.determineInitialFocus();
		}
	}
}

Controls.define('screen-great-works', {
	createInstance: ScreenGreatWorks,
	description: 'Great Works screen.',
	classNames: ['screen-great-works-bounds'],
	styles: ['fs://game/base-standard/ui/great-works/screen-great-works.css'],
	content: ['fs://game/base-standard/ui/great-works/screen-great-works.html'],
	attributes: []
});