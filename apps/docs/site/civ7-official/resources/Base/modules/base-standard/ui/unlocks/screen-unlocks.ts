/**
 * @file screen-unlocks.ts
 * @copyright 2021-2024, Firaxis Games
 * @description Shows a list of unlocks the player can pursue.
 */

import PlayerUnlocks, { AgelessConstructs } from '/base-standard/ui/unlocks/model-unlocks.js';
import { TabItem, TabSelectedEvent } from '/core/ui/components/fxs-tab-bar.js';
import { InputEngineEvent, NavigateInputEvent, InputEngineEventName } from '/core/ui/input/input-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel from '/core/ui/panel-support.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import PopupSequencer from '/base-standard/ui/popup-sequencer/popup-sequencer.js';
import Databind from '/core/ui/utilities/utilities-core-databinding.js';
import ActionHandler from '/core/ui/input/action-handler.js';
import { ActiveDeviceTypeChangedEvent, ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { Layout } from '/core/ui/utilities/utilities-layout.js';

type UnlockRewardsOptions = {
	navigateToPage: string;
}

class ScreenUnlocks extends Panel {

	private closeButtonListener = this.askForClose.bind(this)
	private playerUnlockChangedListener = this.onPlayerUnlockChanged.bind(this)
	private playerUnlockProgressChangedListener = this.onPlayerUnlockProgressChanged.bind(this)
	private navigateInputListener = this.onNavigateInput.bind(this);
	private engineInputListener = this.onEngineInput.bind(this);
	private tabBarListener = this.onTabBarSelected.bind(this);
	private civShowDetailsListener = this.onShowDetailActivate.bind(this);
	private activeDeviceChangedListener = this.onActiveDeviceChange.bind(this);

	private refreshHandle: number = 0;
	private refreshCallback = () => { this.onRefresh(); }
	private readonly playerUnlockContent = document.createElement('fxs-slot-group');
	private civUnlockScrollSlots: HTMLElement | null = null;
	private showAllRequirements: boolean = false;
	private extraRequirements: HTMLElement[] = [];

	private showAllRequirementsCheckbox: HTMLElement = document.createElement('fxs-checkbox');
	private showDetailsText: HTMLElement = document.createElement('h3');

	private agelessBackgroundImage: HTMLElement | null = null;

	private agelessBackgroundContainer: HTMLElement | null = null;

	private availableUnlockItems: HTMLElement[] = [];

	private ageChronology: Map<AgeType, number> = new Map();
	private curAgeChrono: number;
	private lastAgeChrono: number;

	private lastAgeTabItems = [
		{ label: 'LOC_UI_PLAYER_UNLOCKS_CIVILIZATIONS', id: 'civilizations', disabled: true },
		{ label: 'LOC_VICTORY_PROGRESS_REWARDS', id: 'rewards', disabled: true },
		{ label: 'LOC_UI_PLAYER_UNLOCKS_AGELESS', id: 'ageless' },
	] as const satisfies ReadonlyArray<TabItem>;

	private tabItems = [
		{ label: 'LOC_UI_PLAYER_UNLOCKS_CIVILIZATIONS', id: 'civilizations' },
		{ label: 'LOC_VICTORY_PROGRESS_REWARDS', id: 'rewards' },
		{ label: 'LOC_UI_PLAYER_UNLOCKS_AGELESS', id: 'ageless' },
	] as const satisfies ReadonlyArray<TabItem>

	private readonly tabBar = document.createElement('fxs-tab-bar');

	constructor(root: ComponentRoot) {
		super(root);

		let maxAgeChrono = -1;
		for (const e of GameInfo.Ages) {
			this.ageChronology.set(e.AgeType, e.ChronologyIndex);
			if (e.ChronologyIndex > maxAgeChrono) {
				maxAgeChrono = e.ChronologyIndex;
			}
		}

		this.curAgeChrono = GameInfo.Ages.lookup(Game.age)?.ChronologyIndex ?? -1;
		this.lastAgeChrono = maxAgeChrono;
		this.enableOpenSound = true;
		this.enableCloseSound = true;
	}

	onAttach() {
		super.onAttach();

		// TODO KEEP FOR NOW BUT DIG INTO LATER
		this.Root.addEventListener(InputEngineEventName, this.engineInputListener);
		this.Root.addEventListener('navigate-input', this.navigateInputListener);

		const primaryWindow: HTMLElement | null = MustGetElement('.primary-window', this.Root);
		if (!primaryWindow) {
			console.error('screen-unlocks: buildHeader(): Failed to find primary-window');
			return;
		}

		const agelessBackgroundImageURL = this.getAgelessPageBackground();

		this.agelessBackgroundContainer = MustGetElement(".ageless-background-container", this.Root);

		this.agelessBackgroundImage = MustGetElement('.ageless-background-image', this.Root);
		this.agelessBackgroundImage.style.backgroundImage = `url(${agelessBackgroundImageURL})`;

		this.playerUnlockContent.classList.add('unlock-content-wrapper', 'flow-column', 'h-full', 'w-full', 'shrink',);

		const civUnlocksPage = this.buildCivUnlocksPage();
		this.playerUnlockContent.appendChild(civUnlocksPage);

		const panelPlayerRewards = document.createElement('panel-player-rewards');
		panelPlayerRewards.id = "rewards";
		this.playerUnlockContent.appendChild(panelPlayerRewards);

		const agelessPage = this.buildAgelessPage();
		this.playerUnlockContent.appendChild(agelessPage);

		primaryWindow.appendChild(this.buildHeader());
		primaryWindow.appendChild(this.playerUnlockContent);

		engine.on('PlayerUnlockChanged', this.playerUnlockChangedListener)
		engine.on('PlayerUnlockProgressChanged', this.playerUnlockProgressChangedListener);

		const uiViewExperience = UI.getViewExperience();

		const frame = MustGetElement("fxs-frame", this.Root);
		frame.setAttribute("outside-safezone-mode", "full");

		const closeButton: HTMLElement = document.createElement('fxs-close-button');
		closeButton.addEventListener('action-activate', this.closeButtonListener);

		if (uiViewExperience == UIViewExperience.Mobile) {
			frame.appendChild(closeButton);
		} else {
			this.Root.appendChild(closeButton);
		}

		Databind.classToggle(this.showAllRequirementsCheckbox, 'hidden', `g_NavTray.isTrayRequired`);
		window.addEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceChangedListener);
	}

	onDetach() {
		engine.off('PlayerUnlockChanged', this.playerUnlockChangedListener);
		engine.off('PlayerUnlockProgressChanged', this.playerUnlockProgressChangedListener);

		this.Root.removeEventListener('navigate-input', this.navigateInputListener);
		this.Root.removeEventListener(InputEngineEventName, this.engineInputListener);

		window.removeEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceChangedListener);

		super.onDetach();
	}

	onReceiveFocus() {
		super.onReceiveFocus();

		NavTray.clear();
		NavTray.addOrUpdateGenericBack();

		const selectedSlot: string | null = this.playerUnlockContent.getAttribute('selected-slot');
		switch (selectedSlot) {
			case 'civilizations':
				FocusManager.setFocus(MustGetElement(".screen-unlocks-content-root", this.Root));
				break;
			case 'rewards':
				FocusManager.setFocus(MustGetElement("panel-player-rewards", this.Root));
				break;
			case 'ageless':
				FocusManager.setFocus(MustGetElement(".ageless-scrollable-content", this.Root));
				break;
			default:
				break;
		}
	}

	onLoseFocus() {
		NavTray.clear();

		super.onLoseFocus();
	}

	setPanelOptions(options: UnlockRewardsOptions) {
		if (this.tabBar) {
			const pageToShowIndex = this.tabItems.findIndex(tab => tab.id == options.navigateToPage);
			if (pageToShowIndex != -1) {
				this.tabBar.setAttribute('selected-tab-index', `${pageToShowIndex}`);
			}
		} else {
			console.error("screen-advanced-start: couldn't find adv-start__header-title and/or adv-start__subtext");
		}
	}

	private clearList(root: HTMLElement) {
		let child: Node | undefined | null = null;
		while (child = root.lastChild) {
			root.removeChild(child);
		}
	}

	private buildHeader(): HTMLElement {
		// create header of progression screen
		const progressionHeader: HTMLElement = document.createElement('div');
		progressionHeader.classList.add('unlocks_header-wrapper', 'w-full', 'flow-column', 'items-center', 'pb-7')
		const progressionTitle: HTMLElement = document.createElement('p');
		progressionTitle.classList.add('font-title', 'uppercase', 'text-2xl', 'bold', 'text-center', 'p-2\\.5')
		progressionTitle.setAttribute('data-l10n-id', 'LOC_UI_PLAYER_UNLOCKS_TITLE');

		// top tab bar
		const isLastAge = this.curAgeChrono === this.lastAgeChrono;
		const tabIndex = isLastAge ? 2 : 0;
		const tabItems = isLastAge ? this.lastAgeTabItems : this.tabItems;
		const tabId = tabItems[tabIndex].id;
		this.tabBar.classList.add('unlock__nav', 'w-200');
		this.tabBar.setAttribute("tab-items", JSON.stringify(tabItems));
		this.tabBar.setAttribute("selected-tab-index", tabIndex.toString());
		this.tabBar.setAttribute("data-audio-group-ref", "audio-screen-unlocks");
		this.tabBar.setAttribute("data-audio-tab-selected", "unlocks-tab-select");
		this.tabBar.setAttribute("data-audio-focus-ref", "none");
		this.tabBar.addEventListener("tab-selected", this.tabBarListener);
		this.playerUnlockContent.setAttribute('selected-slot', tabId);
		progressionHeader.appendChild(progressionTitle);
		progressionHeader.appendChild(this.tabBar);
		return progressionHeader;
	}

	private buildCivUnlocksPage(): HTMLElement {
		const civUnlockPage = document.createElement('fxs-vslot');
		civUnlockPage.classList.add('unlock__civilizations-content', 'flow-column', 'w-full', 'h-full', 'items-center');
		civUnlockPage.id = 'civilizations';

		const civUnlockText = document.createElement('p');
		civUnlockText.classList.add('text-base', 'font-body', 'w-full', 'text-center', 'mb-2');
		civUnlockText.innerHTML = Locale.compose("LOC_UI_PLAYER_UNLOCKS_COMPLETE_LISTED_REQUIREMENTS_CIVILIZATIONS");
		// checkbox
		const showRequirementsWrapper = document.createElement('div');
		showRequirementsWrapper.classList.add('unlock__show-requirements-wrapper', 'flow-row', 'items-center', 'justify-end', 'w-full');
		this.showAllRequirementsCheckbox.setAttribute('selected', `${this.showAllRequirements}`);
		this.showAllRequirementsCheckbox.classList.add('unlock__checkbox', 'ml-4');
		this.showAllRequirementsCheckbox.addEventListener('action-activate', this.civShowDetailsListener);
		this.showDetailsText.classList.add('font-body-sm', 'uppercase', 'tracking-150', "pointer-events-auto");
		this.showDetailsText.setAttribute('data-l10n-id', 'LOC_UI_PLAYER_UNLOCKS_SHOW_ALL_REQUIREMENTS');
		showRequirementsWrapper.appendChild(this.showDetailsText);
		showRequirementsWrapper.appendChild(this.showAllRequirementsCheckbox);

		const showRequirementsNavHelp = document.createElement("fxs-nav-help");
		showRequirementsNavHelp.setAttribute("action-key", "inline-shell-action-2");
		showRequirementsNavHelp.classList.add("ml-1");
		showRequirementsWrapper.appendChild(showRequirementsNavHelp);

		// Scroll
		const civUnlockScrollable = document.createElement('fxs-scrollable');
		civUnlockScrollable.setAttribute("handle-gamepad-pan", "true");
		civUnlockScrollable.classList.add('civilizations-scrollable', 'w-full', 'shrink', 'px-4', 'py-6');
		this.civUnlockScrollSlots = document.createElement('fxs-vslot');
		this.civUnlockScrollSlots.classList.add('screen-unlocks-content-root', 'flex', 'flow-column');
		this.populateCivList(this.civUnlockScrollSlots);

		civUnlockScrollable.appendChild(this.civUnlockScrollSlots);

		civUnlockPage.appendChild(civUnlockText);
		civUnlockPage.appendChild(showRequirementsWrapper);
		civUnlockPage.appendChild(civUnlockScrollable);
		return civUnlockPage;
	}

	private buildAgelessPage(): HTMLElement {
		const uiViewExperience = UI.getViewExperience();

		const agelessPage = document.createElement('fxs-vslot');
		agelessPage.classList.add('unlock__ageless-content', 'flow-column', 'h-full');
		agelessPage.id = 'ageless'

		const agelessDescription = document.createElement('p');
		agelessDescription.classList.add('text-base', 'font-body', 'w-full', 'text-center', 'mb-6')
		agelessDescription.innerHTML = Locale.compose("LOC_UI_PLAYER_UNLOCKS_VIEW_AGELESS_ITEMS");

		const agelessContentWrapper = document.createElement('div');
		agelessContentWrapper.classList.add('w-full', 'flow-row', 'shrink');
		const leftSideScrollable = document.createElement('div');
		leftSideScrollable.classList.add('ageless-scrollable-wrapper');
		leftSideScrollable.classList.toggle('pb-3', uiViewExperience == UIViewExperience.Mobile);
		const agelessScrollable = document.createElement('fxs-scrollable');
		agelessScrollable.setAttribute("handle-gamepad-pan", "true");
		const agelessScrollSlot = document.createElement('fxs-vslot');
		agelessScrollSlot.classList.add('ageless-scrollable-content', 'mr-12', 'pt-13');

		this.populateAgeless(agelessScrollSlot);
		agelessScrollable.appendChild(agelessScrollSlot);

		leftSideScrollable.appendChild(agelessScrollable)

		const rightSideDetails = document.createElement('div');

		agelessContentWrapper.appendChild(leftSideScrollable);
		agelessContentWrapper.appendChild(rightSideDetails);


		agelessPage.appendChild(agelessDescription);
		agelessPage.appendChild(agelessContentWrapper);
		return agelessPage;
	}

	private getAgelessPageBackground(): string {
		const gameConfig = Configuration.getGame();
		const playerConfig = Configuration.getPlayer(GameContext.localPlayerID);
		if (!gameConfig || !playerConfig) {
			return "";
		}

		const civTypeName = playerConfig.civilizationTypeName;

		if (civTypeName) {
			let civilizationInfos = GameInfo.LoadingInfo_Civilizations.filter(info => {

				return info.CivilizationType == civTypeName;
			});

			// Take the first value.
			if (civilizationInfos.length > 0) {
				const civilizationImagePath: string | undefined = window.innerWidth >= Layout.pixelsToScreenPixels(1080) ? civilizationInfos[0].BackgroundImageHigh : civilizationInfos[0].BackgroundImageLow;
				if (civilizationImagePath) {
					return civilizationImagePath;
				}
				return "";
			}
		}

		return "";
	}

	private populateCivList(root: HTMLElement) {
		this.clearList(root);
		this.extraRequirements = [];
		const civUnlocks = GameInfo.UnlockRewards.filter(reward => reward.UnlockRewardKind == "KIND_CIVILIZATION");

		// There is no reliable way to get the age of a civ when in-game, so sort by description, this may break when more ages are added
		civUnlocks.sort((a, b) => Locale.compare(a.Description ?? "", b.Description ?? ""));

		for (const reward of civUnlocks) {

			if (reward.UnlockRewardType == null) {
				continue;
			}

			const civId = reward.UnlockRewardType;

			// Try to get age from legacy civ info, if its not in there, its a future age
			const civAge = GameInfo.LegacyCivilizations.find(c => c.CivilizationType == civId)?.Age ?? "";
			const civChrono = this.ageChronology.get(civAge) ?? this.lastAgeChrono;

			// Filter off civilizations that are not in a future age
			if (this.curAgeChrono >= civChrono) {
				continue;
			}

			const state = Game.Unlocks.getProgressForPlayer(reward.UnlockType, GameContext.localPlayerID);
			const fragment = document.createDocumentFragment();
			const uiViewExperience = UI.getViewExperience();

			const unlocksItem: HTMLElement = document.createElement('fxs-activatable');
			// TODO: Add back when unlock requirements tracking system is supported fully
			// unlocksItem.addEventListener('action-activate', (event: CustomEvent) => { this.onButtonActivated(event) });
			unlocksItem.classList.add('screen-unlocks__item', 'flow-row', 'flex-auto', 'min-h-32', 'w-full', 'my-1', 'bg-primary', 'justify-between',
				'bg-center', 'relative', "bg-cover", "group"
			);
			unlocksItem.setAttribute("data-audio-group-ref", "audio-screen-unlocks");
			unlocksItem.setAttribute("data-audio-activate-ref", "data-audio-activate");
			unlocksItem.setAttribute("tabindex", "-1");

			// icon and text wrapper
			this.availableUnlockItems.push(unlocksItem);
			const unlockDetailWrapper = document.createElement('div');
			unlockDetailWrapper.classList.add('icon-text-container', 'flex', 'w-1\\/2', 'items-center');

			// icon
			const unlockIcon = document.createElement("img");
			unlockIcon.classList.add('civilization-icon');
			unlockIcon.classList.toggle('p-5', uiViewExperience != UIViewExperience.Mobile);
			unlockIcon.classList.toggle('p-2', uiViewExperience == UIViewExperience.Mobile);
			unlockIcon.classList.toggle('size-32', uiViewExperience == UIViewExperience.Mobile);
			if (reward.Icon && UI.getIconURL(reward.Icon)) {
				unlockIcon.src = UI.getIconURL(reward.Icon)
			} else {
				unlockIcon.src = 'fs://game/icon_unlock.png';
			}

			// background
			if (reward.Icon) {
				unlocksItem.style.backgroundImage = UI.getIconCSS(reward.Icon, "BACKGROUND");
			}

			// background overlay
			const backgroundOverlay: HTMLElement = document.createElement('div');
			backgroundOverlay.classList.add('unlock-frame', 'absolute', 'w-full', 'h-full', 'opacity-70');
			unlocksItem.appendChild(backgroundOverlay);

			// background overlay hover
			const backgroundOverlayHover: HTMLElement = document.createElement('div');
			backgroundOverlayHover.classList.add('unlock-frame-hover', 'absolute', 'w-full', 'h-full', 'opacity-0',
				"group-hover\\:opacity-100", "group-focus\\:opacity-100"
			);
			backgroundOverlayHover.setAttribute("tabindex", "-1")
			unlocksItem.appendChild(backgroundOverlayHover);

			// content wrapper
			const contentWrapper: HTMLElement = document.createElement('fxs-hslot');
			contentWrapper.classList.add('unlock-content-wrapper', 'w-full', 'h-full', 'justify-between');
			unlocksItem.appendChild(contentWrapper);

			// title
			const unlocksItemTitle: HTMLDivElement = document.createElement("div");
			unlocksItemTitle.classList.add('font-title', 'text-lg');
			unlocksItemTitle.setAttribute('data-l10n-id', reward.Name);

			// detail
			const unlockItemDescription = document.createElement('div');
			unlockItemDescription.classList.add('font-body', 'text-base');
			unlockItemDescription.setAttribute('data-l10n-id', reward.Description || '');

			const unlockTextWrapper = document.createElement('div');
			unlockTextWrapper.classList.add('unlock-item-text-wrapper', 'flow-column', 'items-start', 'shrink');
			unlockTextWrapper.appendChild(unlocksItemTitle);
			unlockTextWrapper.appendChild(unlockItemDescription);

			unlockDetailWrapper.appendChild(unlockIcon);
			unlockDetailWrapper.appendChild(unlockTextWrapper);

			contentWrapper.appendChild(unlockDetailWrapper);

			const requirements = GameInfo.UnlockRequirements.filter(req => req.UnlockType == reward.UnlockType);
			const noCivUnlocks = Configuration.getGame().isNoCivilizationUnlocks;
			if (noCivUnlocks || requirements.length > 0) {
				const unlocksItemRequirements: HTMLElement = document.createElement("fxs-vslot");
				unlocksItemRequirements.classList.add('unlock-requirements', 'justify-center', 'font-body', 'text-sm', 'items-end', 'w-1\\/2', 'p-2');

				// Include a "All Civilizations Unlocked" checkbox to communicate that the civ is unlocked.
				if (noCivUnlocks) {
					const requirementTextContainer = document.createElement('fxs-hslot');
					requirementTextContainer.classList.add('requirement-text-container', 'items-center', 'justify-end', 'w-full');
					requirementTextContainer.setAttribute("data-l10n-id", "LOC_UNLOCK_NO_CIVILIZATION_UNLOCKS")
					const completedCheck = document.createElement('img');
					completedCheck.classList.add('size-6', 'ml-1');
					completedCheck.setAttribute('src', 'shell_circle-checkmark');
					requirementTextContainer.appendChild(completedCheck);
					unlocksItemRequirements.appendChild(requirementTextContainer)
				}

				requirements.forEach(r => {
					if (r.Description) {
						const requirementTextContainer = document.createElement('fxs-hslot');
						requirementTextContainer.classList.add('requirement-text-container', 'items-center', 'justify-end', 'w-full');
						const p = state?.progress.find(p => p.requirementSetId == r.RequirementSetId);
						if (p && (p.state == RequirementState.AlwaysMet || p.state == RequirementState.Met)) {
							requirementTextContainer.innerHTML = Locale.stylize(r.Description);
							const completedCheck = document.createElement('img');
							completedCheck.classList.add('size-6', 'ml-1');
							completedCheck.setAttribute('src', 'shell_circle-checkmark');
							requirementTextContainer.appendChild(completedCheck);
							unlocksItemRequirements.appendChild(requirementTextContainer)
						}
						else if (p && p.state == RequirementState.NeverMet) {
							// Hide the extra requirements by default
							requirementTextContainer.classList.add('extra-requirement', 'hidden');

							requirementTextContainer.innerHTML = Locale.stylize(r.Description);
							unlocksItemRequirements.appendChild(requirementTextContainer)
							const completedCheck = document.createElement('img');
							completedCheck.classList.add('size-6', 'ml-1', 'opacity-0');
							completedCheck.setAttribute('src', 'shell_circle-checkmark');
							requirementTextContainer.appendChild(completedCheck);
							unlocksItemRequirements.appendChild(requirementTextContainer)

							this.extraRequirements.push(requirementTextContainer);
						}
						else {
							requirementTextContainer.innerHTML = Locale.stylize(r.Description);
							unlocksItemRequirements.appendChild(requirementTextContainer)
							const completedCheck = document.createElement('img');
							completedCheck.classList.add('size-6', 'ml-1', 'opacity-0');
							completedCheck.setAttribute('src', 'shell_circle-checkmark');
							requirementTextContainer.appendChild(completedCheck);
							unlocksItemRequirements.appendChild(requirementTextContainer)
						}
					}
				});
				contentWrapper.appendChild(unlocksItemRequirements);
			}

			fragment.appendChild(unlocksItem);
			root.appendChild(fragment);
		}
	}

	private buildAgelessHeader(loc: string, collapseItems: HTMLElement): HTMLElement {
		const headerContainer = document.createElement('div');
		headerContainer.classList.value = 'screen-unlock__ageless-header flex flex-col relative items-center mb-4 pointer-events-none';

		const headerTextContainer: HTMLElement = document.createElement('div');
		headerTextContainer.classList.value = 'ageless-item-header-text-container flex flex-col items-center grow';

		const headerText: HTMLElement = document.createElement('p');
		headerText.classList.value = 'ageless-item-header-text fxs-header text-secondary font-title text-base uppercase';
		headerText.innerHTML = loc;

		const filigree = document.createElement('img');
		filigree.src = 'fs://game/shell_small-filigree.png';
		filigree.classList.add('h-4', 'w-84', 'mt-1');

		headerTextContainer.appendChild(headerText);
		headerTextContainer.appendChild(filigree);

		const textMinusPlusContainer: HTMLElement = document.createElement('div');
		textMinusPlusContainer.classList.value = 'text-minus-plus-container w-full flex items-center';
		textMinusPlusContainer.appendChild(headerTextContainer);

		const toggle = document.createElement('fxs-minus-plus');
		toggle.setAttribute("type", "minus");
		toggle.setAttribute("data-audio-activate-ref", "data-audio-dropdown-close");
		toggle.setAttribute("tabindex", "-1");
		toggle.addEventListener('action-activate', () => { this.collapseAgelessSection(toggle, collapseItems) });

		textMinusPlusContainer.appendChild(toggle);
		headerContainer.appendChild(textMinusPlusContainer);

		return headerContainer;
	}

	private buildAgelessItem(name: string, description: string, icon: string, type?: string, tooltipStyle?: string): HTMLElement {
		const unlocksItem: HTMLElement = document.createElement('div');
		unlocksItem.role = "paragraph"
		unlocksItem.classList.add('screen-unlocks__ageless-item', 'flex', 'mb-6', 'relative', 'pointer-events-auto');

		this.availableUnlockItems.push(unlocksItem);

		const unlocksItemTitle: HTMLDivElement = document.createElement("p");
		unlocksItemTitle.classList.add('screen-unlocks__ageless-item-title', 'font-title', 'text-base', 'uppercase', 'pl-2', 'relative', 'shrink', 'grow');

		const unlocksItemNameContainer: HTMLDivElement = document.createElement("div");
		unlocksItemNameContainer.classList.add('screen-unlocks__ageless-item-name-container', 'flex', 'flex-row');
		unlocksItemTitle.appendChild(unlocksItemNameContainer);

		const unlocksItemName: HTMLDivElement = document.createElement("p");
		unlocksItemName.classList.add('screen-unlocks__ageless-item-name', 'flex', 'grow');
		unlocksItemName.innerHTML = `${Locale.compose(name)}`;
		unlocksItemNameContainer.appendChild(unlocksItemName);

		if (type) {
			unlocksItem.setAttribute("data-type", type);
		}

		if (tooltipStyle) {
			unlocksItem.setAttribute("data-tooltip-style", tooltipStyle);
		}

		if (description) {
			const unlockItemDescription: HTMLDivElement = document.createElement("div");
			unlockItemDescription.classList.add('font-body', 'text-xs', 'normal-case', 'mr-8');
			unlockItemDescription.innerHTML = `${Locale.stylize(description)}`;
			unlocksItemTitle.appendChild(unlockItemDescription);
		}

		const unlockItemIcon = document.createElement('fxs-icon');
		unlockItemIcon.classList.add('size-16', 'bg-no-repeat', 'bg-center', 'bg-cover');
		unlockItemIcon.setAttribute("data-icon-id", icon);
		unlocksItem.appendChild(unlockItemIcon);

		unlocksItem.appendChild(unlocksItemTitle);
		return unlocksItem;
	}

	private populateAgeless(root: HTMLElement) {
		const commanderWrapper = document.createElement('div');
		commanderWrapper.classList.add("overflow-hidden", "transition-all", "duration-100", "scale-y-100", "origin-top");
		const commanderHeader = this.buildAgelessHeader(Locale.compose("LOC_UI_PLAYER_UNLOCKS_COMMANDER_HEADER"), commanderWrapper);
		root.appendChild(commanderHeader);
		const commanders = PlayerUnlocks.getAgelessCommanderItems();
		//COMMANDERS
		for (const commander of commanders) {
			const desc = Locale.compose("LOC_END_GAME_ADD_LEVEL", commander.level);
			const item = this.buildAgelessItem(commander.unitTypeName, desc, commander.type);

			commanderWrapper.appendChild(item);
		}
		root.appendChild(commanderWrapper);

		//traditions
		const traditionsWrapper = document.createElement('fxs-vslot');
		traditionsWrapper.classList.add("overflow-hidden", "transition-all", "duration-100", "scale-y-100", "origin-top");
		const traditionsHeader = this.buildAgelessHeader(Locale.compose("LOC_UI_PLAYER_UNLOCKS_TRADITIONS_HEADER"), traditionsWrapper);
		root.appendChild(traditionsHeader);
		const traditions = PlayerUnlocks.getAgelessTraditions();
		for (const tradition of traditions) {
			const item = this.buildAgelessItem(tradition.Name, tradition.Description ?? "", tradition.TraitType!.replace("TRAIT_", "CIVILIZATION_"));
			traditionsWrapper.appendChild(item);
		}
		root.appendChild(traditionsWrapper);

		//wonders
		const wondersWrapper = document.createElement('fxs-vslot');
		wondersWrapper.classList.add("overflow-hidden", "transition-all", "duration-100", "scale-y-100", "origin-top");
		const wondersHeader = this.buildAgelessHeader(Locale.compose("LOC_UI_PLAYER_UNLOCKS_WONDERS_HEADER"), wondersWrapper);
		root.appendChild(wondersHeader);
		const wonders = PlayerUnlocks.getAgelessWonders();
		for (const wonder of wonders) {
			const item = this.buildAgelessItem(wonder.Name, wonder.Description ?? "", wonder.ConstructibleType, wonder.ConstructibleType, "ageless-construction-tooltip");
			wondersWrapper.appendChild(item);
		}
		root.appendChild(wondersWrapper);

		// buildings and improvementes
		const buildingWrapper = document.createElement('fxs-vslot');
		buildingWrapper.classList.add("overflow-hidden", "transition-all", "duration-100", "scale-y-100", "origin-top");
		const buildingHeader = this.buildAgelessHeader(Locale.compose("LOC_UI_PLAYER_UNLOCKS_BUILDING_AND_IMPROVEMENTS"), buildingWrapper);
		root.appendChild(buildingHeader);
		const buildingsAndImprovements: AgelessConstructs[] = PlayerUnlocks.getAgelessConstructsAndImprovements();
		for (const building of buildingsAndImprovements) {
			const item = this.buildAgelessItem(building.name, building.description, building.type, building.type, "ageless-construction-tooltip");
			const title = MustGetElement('.screen-unlocks__ageless-item-name-container', item);
			if (building.quantity > 1) {
				const multiple = document.createElement('div');
				multiple.classList.add('font-body', 'text-base', 'flex', 'justify-end', 'normal-case');
				multiple.innerHTML = `x${building.quantity}`
				title.appendChild(multiple);
			}
			buildingWrapper.appendChild(item);
		}
		root.appendChild(buildingWrapper);
	}

	private onNavigateInput(navigationEvent: NavigateInputEvent) {
		const live: boolean = this.handleNavigation(navigationEvent);
		if (!live) {
			navigationEvent.preventDefault();
			navigationEvent.stopImmediatePropagation();
		}
	}

	/**
	 * @returns true if still live, false if input should stop.
	 */
	private handleNavigation(_navigationEvent: NavigateInputEvent): boolean {
		return true;
	}

	private onEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		if (inputEvent.isCancelInput() || inputEvent.detail.name == 'sys-menu') {
			this.askForClose();
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		}
		const slotGroup = MustGetElement('.unlock-content-wrapper', this.Root);
		if (inputEvent.detail.name == "shell-action-2" && slotGroup.getAttribute('selected-slot') == "civilizations") {
			this.showAllRequirements = !this.showAllRequirements;
			this.showAllRequirementsCheckbox.setAttribute("selected", this.showAllRequirements.toString());
			this.toggleExtraRequirements();
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
			Audio.playSound("data-audio-checkbox-press");
		}
	}

	private onActiveDeviceChange(event: ActiveDeviceTypeChangedEvent) {
		if (!event.detail.gamepadActive) {
			this.showDetailsText.setAttribute("data-l10n-id", "LOC_UI_PLAYER_UNLOCKS_SHOW_ALL_REQUIREMENTS");
		}
		else {
			if (this.showAllRequirements) {
				this.showDetailsText.setAttribute("data-l10n-id", "LOC_UI_PLAYER_UNLOCKS_HIDE_ALL_REQUIREMENTS");
			}
			else {
				this.showDetailsText.setAttribute("data-l10n-id", "LOC_UI_PLAYER_UNLOCKS_SHOW_ALL_REQUIREMENTS");
			}
		}
	}

	private queueRefresh() {
		if (this.refreshHandle == 0) {
			this.refreshHandle = requestAnimationFrame(this.refreshCallback)
		}
	}

	private onPlayerUnlockChanged(data: PlayerUnlockChanged_EventData) {
		if (data.player == GameContext.localPlayerID) {
			this.queueRefresh();
		}
	}

	private onPlayerUnlockProgressChanged(data: PlayerUnlockProgressChanged_EventData) {
		if (data.player == GameContext.localPlayerID) {
			this.queueRefresh();
		}
	}

	private onRefresh() {
		this.refreshHandle = 0;
		if (this.Root.isConnected && this.civUnlockScrollSlots) {
			this.populateCivList(this.civUnlockScrollSlots);
		}
	}

	// TODO: Add back when unlock requirements tracking system is supported fully
	// private onButtonActivated(event: CustomEvent) {
	// 	// create quest item based on item clicked
	// 	if (event.target instanceof HTMLElement) {
	// 		const buttonIndex = this.availableUnlockItems.indexOf(event.target);

	// 		// TODO: Implement progress when design is updated.
	// 		const questToCheck: QuestItem = {
	// 			id: GameInfo.UnlockRewards[buttonIndex].Name,
	// 			system: "ageless",
	// 			title: Locale.compose(GameInfo.UnlockRewards[buttonIndex].Name),
	// 			description: Locale.compose(GameInfo.UnlockRewards[buttonIndex].Description ?? ""),
	// 			// to calc
	// 			getCurrentProgress: () => { return "" },
	// 			progressType: ""
	// 		}
	// 		if (QuestTracker.has(questToCheck.id, questToCheck.system)) {
	// 			QuestTracker.remove(questToCheck.id, "ageless");
	// 		}
	// 		else {
	// 			QuestTracker.add(questToCheck);
	// 		}
	// 	}
	// }

	private onTabBarSelected(event: TabSelectedEvent) {
		const selectedID = event.detail.selectedItem.id;
		this.agelessBackgroundContainer?.classList.toggle('hidden', selectedID != "ageless");
		this.playerUnlockContent.setAttribute('selected-slot', selectedID);
	}

	private onShowDetailActivate(event: CustomEvent): void {
		if (event.target instanceof HTMLElement) {
			const isCurrentlyTracked: string | null = event.target.getAttribute('selected');
			this.showAllRequirements = isCurrentlyTracked === 'true' ? true : false;

			this.toggleExtraRequirements();
		}
	}

	private toggleExtraRequirements() {
		for (const extraRequirement of this.extraRequirements) {
			if (this.showAllRequirements) {
				extraRequirement.classList.remove('hidden');
			}
			else {
				extraRequirement.classList.add('hidden');
			}
			if (ActionHandler.isGamepadActive) {
				this.showDetailsText.setAttribute("data-l10n-id", this.showAllRequirements ? "LOC_UI_PLAYER_UNLOCKS_HIDE_ALL_REQUIREMENTS" : "LOC_UI_PLAYER_UNLOCKS_SHOW_ALL_REQUIREMENTS");
			}
		}
	}

	protected collapseAgelessSection(collapseButton: HTMLElement, agelessSection: HTMLElement) {
		const type = collapseButton.getAttribute("type");
		if (type == "minus") {
			collapseButton.setAttribute("type", "plus");
			agelessSection.classList.add("hidden");
			collapseButton.setAttribute("data-audio-activate-ref", "data-audio-dropdown-open");
		} else {
			collapseButton.setAttribute("type", "minus");
			agelessSection.classList.remove("hidden");
			collapseButton.setAttribute("data-audio-activate-ref", "data-audio-dropdown-close");

		}
	}

	private askForClose() {
		PopupSequencer.closePopup("screen-unlocks");
	}

	close() {
		super.close();
	}
}

Controls.define('screen-unlocks', {
	createInstance: ScreenUnlocks,
	description: 'Dialog to show various player-driven unlocks.',
	classNames: ['screen-unlocks--popup-medium', 'w-full', 'h-full'],
	styles: ['fs://game/base-standard/ui/unlocks/screen-unlocks.css'],
	content: ['fs://game/base-standard/ui/unlocks/screen-unlocks.html']
});
