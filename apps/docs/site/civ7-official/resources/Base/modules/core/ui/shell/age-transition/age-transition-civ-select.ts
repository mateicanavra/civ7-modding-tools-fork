/**
 * @file age-transition-civ-select.ts
 * @copyright 2021-2025, Firaxis Games
 * @description Allows the player to select a new civilization between era transitions
 */

import { ActionActivateEvent } from "/core/ui/components/fxs-activatable.js";
import FxsRadioButton from "/core/ui/components/fxs-radio-button.js";
import ContextManager from "/core/ui/context-manager/context-manager.js";
import { ActiveDeviceTypeChangedEvent, ActiveDeviceTypeChangedEventName } from "/core/ui/input/action-handler.js";
import FocusManager from "/core/ui/input/focus-manager.js";
import { InputEngineEvent, NavigateInputEvent } from "/core/ui/input/input-support.js";
import NavTray from "/core/ui/navigation-tray/model-navigation-tray.js";
import Panel from "/core/ui/panel-support.js";
import { ScreenProfilePageExternalStatus } from "/core/ui/profile-page/screen-profile-page.js";
import { AgeTransitionCivCard } from "/core/ui/shell/age-transition/age-transition-civ-card.js";
import { CivilizationInfoTooltipModel } from "/core/ui/shell/age-transition/civilization-info-tooltip.js";
import { CivData, GetAgeMap, GetCivilizationData } from "/core/ui/shell/create-panels/age-civ-select-model.js";
import { CivSelectBonus } from "/core/ui/shell/create-panels/civ-select-bonus.js";
import { getPlayerCardInfo } from "/core/ui/utilities/utilities-liveops.js";
import { Audio } from "/core/ui/audio-base/audio-support.js";

class AgeTransitionCivSelect extends Panel {
	private civData: CivData[];
	private ageMap = GetAgeMap();

	private cardsPanel = document.createElement("div");
	private civCardsEle = document.createElement("fxs-spatial-slot");
	private civCards: ComponentRoot<AgeTransitionCivCard>[] = [];
	private civBonuses: HTMLElement[] = [];

	private detailsPanel = document.createElement("div");
	private detailsPanelBg = document.createElement("div");
	private civIcon = document.createElement("div");
	private civName = document.createElement("fxs-header");
	private civTraits = document.createElement("p");
	private civHistoricalChoice = document.createElement("div");
	private historicalChoiceText = document.createElement("p");
	private civLeaderIcon = document.createElement("fxs-icon");
	private civAbilityTitle = document.createElement("p");
	private civAbilityText = document.createElement("div");
	private civBonusesScroll = document.createElement("fxs-scrollable");
	private civBonusesContainer = document.createElement("div");
	private civLockIcon = document.createElement("div");
	private unlockByInfo = document.createElement("div");
	private chooseCivButton = document.createElement("fxs-hero-button");
	private ageUnlockPanel = document.createElement("div");
	private ageUnlockItems = document.createElement("div");

	private civStepper = document.createElement("div");
	private leftStepperArrow = document.createElement('fxs-activatable');
	private rightStepperArrow = document.createElement('fxs-activatable');
	private civStepperButtons: ComponentRoot<FxsRadioButton>[] = [];

	private selectedCard?: ComponentRoot<AgeTransitionCivCard>;
	private selectedCivInfo?: CivData;
	private isInDetails = false;
	private isProgressionShown = false;

	private engineInputEventListener = this.onEngineInput.bind(this);
	private navigateInputListener = this.onNavigateInput.bind(this);
	private activeDeviceTypeListener: EventListener = this.onActiveDeviceTypeChanged.bind(this);

	constructor(root: ComponentRoot<AgeTransitionCivSelect>) {
		super(root);

		const unsortedCivData = GetCivilizationData();

		// Sort by not locked first, then by name
		this.civData = unsortedCivData
			.filter(civ => civ.civID !== "RANDOM")
			.sort((a, b) => {
				return (a.isLocked != b.isLocked
					? Number(a.isLocked) - Number(b.isLocked)
					: Locale.compare(a.name, b.name));
			});

		this.render();
	}

	override onInitialize(): void {
		super.onInitialize();

		this.Root.classList.add("fullscreen", "age-transition-civ-select", "trigger-nav-help");
	}

	onReceiveFocus(): void {
		super.onReceiveFocus();

		FocusManager.setFocus(this.civCardsEle);
		NavTray.clear();
	}

	override onAttach(): void {
		super.onAttach();

		CivilizationInfoTooltipModel.civData = this.civData;

		this.Root.addEventListener('engine-input', this.engineInputEventListener);
		this.Root.addEventListener('navigate-input', this.navigateInputListener);
		window.addEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener, true);
	}

	override onDetach(): void {
		super.onDetach();

		CivilizationInfoTooltipModel.clear();

		NavTray.clear();

		this.Root.removeEventListener('engine-input', this.engineInputEventListener);
		this.Root.removeEventListener('navigate-input', this.navigateInputListener);
		window.removeEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener, true);
	}

	//handle input
	private onEngineInput(inputEvent: InputEngineEvent): void {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		switch (inputEvent.detail.name) {
			case "cancel":
			case "keyboard-escape":
			case "mousebutton-right":
				if (this.isInDetails) {
					this.closeAdditionalInfoPanel();
					inputEvent.stopPropagation();
					inputEvent.preventDefault();
				}
				break;

			case "sys-menu":
				this.showProgression();
				inputEvent.stopPropagation();
				inputEvent.preventDefault();
				break;

			case "shell-action-1":
				if (this.isInDetails) {
					this.startGame();
					Audio.playSound("data-audio-choose-civ-activate", "new-civ-select");
					inputEvent.stopPropagation();
					inputEvent.preventDefault();
				}
				break;

			case "shell-action-2":
				if (!this.isInDetails) {
					this.openMementoEditor()
					Audio.playSound("data-audio-popup-open");
					inputEvent.stopPropagation();
					inputEvent.preventDefault();
				}
				break;
		}
	}

	//handle navigation
	private onNavigateInput(navigationEvent: NavigateInputEvent) {
		if (navigationEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		if (this.isInDetails) {
			switch (navigationEvent.detail.name) {
				case 'nav-next':
					this.handleNavNext();
					navigationEvent.stopPropagation();
					navigationEvent.preventDefault();
					break;

				case 'nav-previous':
					this.handleNavPrev();
					navigationEvent.stopPropagation();
					navigationEvent.preventDefault();
					break;
			}
		}
	}

	//handle swapping between gamepad and kbm
	private onActiveDeviceTypeChanged(event: ActiveDeviceTypeChangedEvent) {
		const gamepadActive = event.detail?.gamepadActive;
		this.leftStepperArrow.classList.toggle("hidden", gamepadActive);
		this.rightStepperArrow.classList.toggle("hidden", gamepadActive);
	}


	protected showProgression() {
		if (this.isProgressionShown && Network.isMetagamingAvailable()) {
			ScreenProfilePageExternalStatus.isGameCreationDomainInitialized = true;
			ContextManager.push("screen-profile-page", { singleton: true, createMouseGuard: true, panelOptions: { onlyChallenges: false, onlyLeaderboards: false } });
		}
	}

	private render() {
		const fragment = document.createDocumentFragment();

		const filigreeLeft = document.createElement("div");
		filigreeLeft.classList.add("age-transition-filigree", "img-frame-filigree", "w-187", "h-187", "top-8", "left-8", "pointer-events-none", "absolute");
		fragment.appendChild(filigreeLeft);

		const filigreeRight = document.createElement("div");
		filigreeRight.classList.add("age-transition-filigree", "img-frame-filigree", "w-187", "h-187", "-scale-x-100", "top-8", "right-8", "pointer-events-none", "absolute");
		fragment.appendChild(filigreeRight);

		this.renderHeader(fragment);
		this.renderCards(fragment);
		this.renderDetails(fragment);
		this.renderStepper();

		this.Root.appendChild(fragment);
	}

	protected renderHeader(fragment: DocumentFragment) {
		const header = document.createElement("div");
		header.classList.add("flex", "flex-row", "relative", "items-center", "justify-center");

		const ageHeader = document.createElement("div");
		ageHeader.classList.add("flex", "flex-col", "justify-center", "items-center", "mt-5");
		header.appendChild(ageHeader);

		const ageType = GameSetup.findGameParameter('Age')?.value.value?.toString() ?? "";
		const ageTitle = document.createElement("fxs-header");
		ageTitle.classList.add("font-title-2xl", "uppercase");
		ageTitle.setAttribute("filigree-style", "none");
		ageTitle.setAttribute("title", Locale.compose("LOC_CREATE_GAME_AGE_TITLE", this.ageMap.get(ageType)?.name ?? ""));
		ageHeader.appendChild(ageTitle);

		const ageDesc = document.createElement("fxs-header");
		ageDesc.classList.add("font-title-lg", "uppercase");
		ageDesc.setAttribute("filigree-style", "h3");
		ageDesc.setAttribute("title", "LOC_AGE_TRANSITION_SCREEN_TITLE");
		ageHeader.appendChild(ageDesc);

		if (Network.supportsSSO() && Network.isMetagamingAvailable()) {
			const playerInfo = getPlayerCardInfo();
			this.isProgressionShown = true;

			const progressionBadgeBg = document.createElement('fxs-activatable');
			progressionBadgeBg.classList.add("absolute", "right-12", "top-12", "w-22", "h-22");
			progressionBadgeBg.addEventListener('action-activate', this.showProgression.bind(this));
			header.appendChild(progressionBadgeBg);

			progressionBadgeBg.innerHTML = `
				<div class="w-22 h-22 img-prof-btn-bg pointer-events-auto relative transition-transform hover\\:scale-110 focus\\:scale-110" data-tooltip-content="${playerInfo.twoKName}">
					<div class="absolute inset-0 opacity-30" style="background-color: ${playerInfo.BackgroundColor}"></div>
					<progression-badge class="absolute inset-y-0 -inset-x-0\\.5" badge-size="base" data-badge-url="${playerInfo.BadgeURL}" data-badge-progression-level="${playerInfo.FoundationLevel}"></progression-badge>
				</div>
			`;

			const progressionBadgeNavHelp = document.createElement("fxs-nav-help");
			progressionBadgeNavHelp.classList.add("absolute", "-bottom-3", "-right-6");
			progressionBadgeNavHelp.setAttribute("action-key", "inline-sys-menu");
			progressionBadgeBg.appendChild(progressionBadgeNavHelp);
		}

		fragment.appendChild(header);
	}

	private renderCards(fragment: DocumentFragment) {
		this.cardsPanel.classList.add("age-transition-civ-select-cards", "relative", "top-0", "justify-center");
		fragment.appendChild(this.cardsPanel);

		const cardContent = document.createElement("fxs-scrollable");
		cardContent.classList.add("age-transition-civ-select-scrollable", "relative", "left-12");
		cardContent.setAttribute("attached-scrollbar", "true");
		this.cardsPanel.appendChild(cardContent);

		this.civCardsEle.classList.add("inset-0", "m-2", "flex", "flex-row", "flex-wrap", "items-start");
		cardContent.appendChild(this.civCardsEle);

		for (const civData of this.civData) {
			const civCard = document.createElement("age-transition-civ-card");
			civCard.componentCreatedEvent.on((card) => card.setCivData(civData));
			civCard.addEventListener("action-activate", this.handleCardSelected.bind(this));

			this.civCardsEle.appendChild(civCard);
			this.civCards.push(civCard);
		}

		const mementosButton = document.createElement("fxs-button");
		mementosButton.classList.add("absolute", "bottom-4", "left-7");
		mementosButton.setAttribute("caption", "LOC_AGE_TRANSITION_EDIT_MEMENTOS");
		mementosButton.setAttribute("action-key", "inline-shell-action-2");
		mementosButton.setAttribute("data-audio-activate-ref", "data-audio-popup-open");
		mementosButton.addEventListener("action-activate", this.openMementoEditor);
		this.cardsPanel.appendChild(mementosButton);
	}

	private renderDetails(fragment: DocumentFragment) {
		this.detailsPanel.classList.add("img-unit-panelbox", "bg-cover", "absolute", "top-36", "left-14", "right-14", "bottom-10", "flex", "items-stretch", "justify-stretch", "hidden");
		fragment.appendChild(this.detailsPanel);

		this.detailsPanelBg.classList.add("bg-cover", "bg-bottom", "flex-auto", "my-1", "mx-0\\.5", "relative", "flex", "flex-row");
		this.detailsPanel.appendChild(this.detailsPanelBg);

		const closeButton = document.createElement("fxs-close-button");
		closeButton.classList.add("absolute", "top-0\\.5", "right-0\\.5");
		closeButton.addEventListener("action-activate", this.closeAdditionalInfoPanel.bind(this));
		this.detailsPanelBg.appendChild(closeButton);

		const detailsPanelContent = document.createElement("div");
		detailsPanelContent.classList.add("age-transition-civ-details-section", "img-unit-panelbox", "bg-cover", "flex", "flex-col", "items-center", "-ml-1", "-my-1");
		this.detailsPanelBg.appendChild(detailsPanelContent);

		const civTitle = document.createElement("div");
		civTitle.classList.add("flex", "flex-row", "justify-center", "items-center", "uppercase", "mt-4");
		detailsPanelContent.appendChild(civTitle);

		this.civIcon.classList.add("age-transition-civ-details-icon", "size-16", "bg-contain", "mr-2");
		civTitle.appendChild(this.civIcon);

		this.civName.setAttribute("filigree-style", "none");
		this.civName.classList.add("age-transition-civ-details-name", "font-title");
		civTitle.appendChild(this.civName);

		this.civTraits.classList.add("font-body-base", "text-accent-1", "mb-2");
		detailsPanelContent.appendChild(this.civTraits);

		this.civHistoricalChoice.classList.add("flex", "flex-row", "items-center", "mb-2", "pointer-events-auto", "hidden");
		detailsPanelContent.appendChild(this.civHistoricalChoice);

		const civHistoricalChoiceIcon = document.createElement("div");
		civHistoricalChoiceIcon.classList.add("img-historical-choice", "w-8", "h-8", "mr-1\\.5", "relative");
		this.civHistoricalChoice.appendChild(civHistoricalChoiceIcon);

		this.civLeaderIcon.classList.add("absolute", "-inset-1\\.5", "w-auto", "h-auto");
		this.civLeaderIcon.setAttribute("data-icon-context", "LEADER");
		civHistoricalChoiceIcon.appendChild(this.civLeaderIcon);

		this.historicalChoiceText.classList.add("font-body-lg", "text-accent-3");
		this.historicalChoiceText.setAttribute("data-l10n-id", "LOC_CREATE_GAME_RECOMMENDED_CHOICE")
		this.civHistoricalChoice.appendChild(this.historicalChoiceText);

		this.civBonusesScroll.setAttribute("attached-scrollbar", "true");
		this.civBonusesScroll.setAttribute("handle-gamepad-pan", "true");
		this.civBonusesScroll.classList.add("flex-auto", "mx-4", "mb-4", "self-stretch");
		this.civBonusesScroll.componentCreatedEvent.on(component => component.setEngineInputProxy(this.Root));
		detailsPanelContent.appendChild(this.civBonusesScroll);

		this.civBonusesContainer.classList.add("flex", "flex-col", "w-full");
		this.civBonusesScroll.appendChild(this.civBonusesContainer);

		this.civAbilityTitle.classList.add("font-body-base", "text-accent-2", "font-bold", "mt-2");
		this.civBonusesContainer.appendChild(this.civAbilityTitle);

		this.civAbilityText.classList.add("font-body-base", "text-accent-2", "mx-8");
		this.civBonusesContainer.appendChild(this.civAbilityText);

		const bonusesHeader = document.createElement("fxs-header");
		bonusesHeader.setAttribute("title", "LOC_CREATE_CIV_UNIQUE_BONUSES_SUBTITLE");
		bonusesHeader.setAttribute("filigree-style", "small");
		bonusesHeader.classList.add("mt-4", "uppercase", "font-title-base");
		this.civBonusesContainer.appendChild(bonusesHeader);

		const detailsPanelSpacer = document.createElement("div");
		detailsPanelSpacer.classList.add("age-transition-details-spacer", "flex-auto", "hidden");
		this.detailsPanelBg.appendChild(detailsPanelSpacer);

		const detailsPanelLayout = document.createElement("div");
		detailsPanelLayout.classList.add("age-transition-layout-panel", "flex-auto", "flex", "flex-row");
		this.detailsPanelBg.appendChild(detailsPanelLayout);

		const detailsPanelCenter = document.createElement("div");
		detailsPanelCenter.classList.add("age-transition-civ-details-section", "flex", "flex-col", "items-stretch", "justify-end", "pl-12", "pr-4");
		detailsPanelLayout.appendChild(detailsPanelCenter);

		const unlockByPanel = document.createElement("div");
		unlockByPanel.classList.add("age-transition-unlock-panel", "flex", "flex-row", "items-center", "justify-center", "p-2");
		detailsPanelCenter.appendChild(unlockByPanel);

		this.civLockIcon.classList.add("img-lock", "size-12");
		unlockByPanel.appendChild(this.civLockIcon);

		this.unlockByInfo.classList.add("flex", "flex-col", "items-start");
		unlockByPanel.appendChild(this.unlockByInfo);

		this.chooseCivButton.classList.add("my-2", "mt-8");
		this.chooseCivButton.setAttribute("data-audio-group-ref", "new-civ-select");
		this.chooseCivButton.setAttribute("data-audio-activate-ref", "data-audio-choose-civ-activate");

		this.chooseCivButton.addEventListener("action-activate", this.startGame.bind(this));
		detailsPanelCenter.appendChild(this.chooseCivButton);

		this.civStepper.classList.add("my-2", "flex", "flex-row", "justify-center", "items-center");
		detailsPanelCenter.appendChild(this.civStepper);

		this.ageUnlockPanel.classList.add("flex-auto", "flex", "flex-col", "justify-center", "items-end", "mr-4");
		detailsPanelLayout.appendChild(this.ageUnlockPanel);

		const ageUnlocksHeader = document.createElement("fxs-header");
		ageUnlocksHeader.setAttribute("title", "LOC_CREATE_GAME_AGE_UNLOCK_TITLE")
		ageUnlocksHeader.setAttribute("filigree-style", "none");
		ageUnlocksHeader.classList.add("age-transition-civ-select-name", "font-title-lg", "text-shadow", "uppercase");
		this.ageUnlockPanel.appendChild(ageUnlocksHeader);

		const ageUnlocksFiligree = document.createElement("div");
		ageUnlocksFiligree.classList.add("img-unit-panel-divider", "-scale-y-100", "-mt-3");
		this.ageUnlockPanel.appendChild(ageUnlocksFiligree);

		this.ageUnlockItems.classList.add("flex", "flex-col", "items-end");
		this.ageUnlockPanel.appendChild(this.ageUnlockItems);
	}

	private renderStepper() {
		this.leftStepperArrow.classList.add("img-arrow", "ml-2");
		this.leftStepperArrow.setAttribute("data-audio-group-ref", "audio-pager");
		this.leftStepperArrow.addEventListener("action-activate", this.handleNavPrev.bind(this));
		this.civStepper.appendChild(this.leftStepperArrow);

		const leftNavHelp = document.createElement('fxs-nav-help');
		leftNavHelp.setAttribute("action-key", "inline-cycle-previous");
		this.civStepper.appendChild(leftNavHelp);

		for (let civIndex = 0; civIndex < this.civCards.length; ++civIndex) {
			const civStepperButton = document.createElement("fxs-radio-button");
			civStepperButton.classList.add("age-transition-stepper-pip");
			civStepperButton.setAttribute("group-tag", "civ-stepper");
			civStepperButton.setAttribute("selected", "false");
			civStepperButton.setAttribute("value", civIndex.toString());
			civStepperButton.setAttribute("data-civ-info-index", civIndex.toString());
			civStepperButton.setAttribute("data-tooltip-style", "civilization-info");
			civStepperButton.addEventListener("action-activate", () => this.handleNavTo(civIndex));

			this.civStepperButtons.push(civStepperButton);
			this.civStepper.appendChild(civStepperButton);
		}

		const rightNavHelp = document.createElement('fxs-nav-help');
		rightNavHelp.classList.add("ml-1");
		rightNavHelp.setAttribute("action-key", "inline-cycle-next");
		this.civStepper.appendChild(rightNavHelp);

		this.rightStepperArrow.classList.add("img-arrow", "-scale-x-100", "mr-2");
		this.rightStepperArrow.setAttribute("data-audio-group-ref", "audio-pager");
		this.rightStepperArrow.addEventListener("action-activate", this.handleNavNext.bind(this));
		this.civStepper.appendChild(this.rightStepperArrow);
	}

	private updateDetails() {
		if (!this.selectedCivInfo) {
			return;
		}

		const isLocked = this.selectedCivInfo.isLocked
		const civNameOnly = this.selectedCivInfo.civID.replace("CIVILIZATION_", "").toLowerCase();
		this.detailsPanelBg.style.backgroundImage = `url('fs://game/bg-panel-${civNameOnly}.png')`;

		this.civIcon.style.backgroundImage = `url("${this.selectedCivInfo.icon}")`;
		this.civName.setAttribute("title", this.selectedCivInfo.name);
		this.civTraits.innerHTML = this.selectedCivInfo.tags.join(", ");
		this.civAbilityTitle.innerHTML = this.selectedCivInfo.abilityTitle;
		this.civAbilityText.innerHTML = this.selectedCivInfo.abilityText;

		this.civHistoricalChoice.classList.toggle("hidden", !this.selectedCivInfo.isHistoricalChoice);

		if (this.selectedCivInfo.isHistoricalChoice) {
			this.civHistoricalChoice.setAttribute("data-tooltip-content", this.selectedCivInfo.historicalChoiceReason ?? "");
			this.historicalChoiceText.setAttribute("data-l10n-id", this.selectedCivInfo.historicalChoiceType ?? "");

			const leaderParameter = GameSetup.findPlayerParameter(GameContext.localPlayerID, 'PlayerLeader');
			const leaderIcon = leaderParameter ? GameSetup.resolveString(leaderParameter.value.icon) : "";
			this.civLeaderIcon.setAttribute("data-icon-id", leaderIcon ?? "");
		}

		for (const oldBonus of this.civBonuses) {
			oldBonus.remove();
		}

		for (const bonus of this.selectedCivInfo.bonuses) {
			const bonusEle = document.createElement('civ-select-bonus');
			bonusEle.classList.add("m-4");
			bonusEle.componentCreatedEvent.on((ele: CivSelectBonus) => ele.setBonusData(bonus));
			this.civBonuses.push(bonusEle);
			this.civBonusesContainer.appendChild(bonusEle);
		}

		this.civBonusesScroll.setAttribute("scrollpercent", "1");
		this.civBonusesScroll.setAttribute("scrollpercent", "0");

		this.civLockIcon.classList.toggle("hidden", !isLocked);

		this.unlockByInfo.innerHTML = "";
		for (const unlockByReason of this.selectedCivInfo.unlockedBy) {
			const fullReason = document.createElement("div");
			fullReason.classList.add("flex", "flex-row", "justify-center", "items-center", "m-0\\.5");

			if (!isLocked) {
				const checkbox = document.createElement("span");
				checkbox.classList.add("mr-2", "size-8")
				checkbox.classList.add(unlockByReason.isUnlocked ? "img-checkbox-on" : "img-checkbox-off");
				fullReason.appendChild(checkbox);
			}

			const reason = document.createElement("span");
			reason.classList.add("font-body-base");
			reason.innerHTML = Locale.stylize(unlockByReason.text);
			fullReason.appendChild(reason);

			this.unlockByInfo.appendChild(fullReason);
		}

		const buttonText = isLocked
			? "LOC_AGE_TRANSITION_CIV_LOCKED"
			: Locale.compose("LOC_AGE_TRANSITION_CHOOSE_CIV", this.selectedCivInfo.name);
		this.chooseCivButton.setAttribute("caption", buttonText);
		this.chooseCivButton.setAttribute("disabled", isLocked.toString());

		if (!isLocked) {
			NavTray.addOrUpdateShellAction1("LOC_GENERIC_ACCEPT");
		}

		this.ageUnlockPanel.classList.toggle("hidden", this.selectedCivInfo.unlocks.length === 0);
		this.ageUnlockItems.innerHTML = "";
		for (const unlock of this.selectedCivInfo.unlocks) {
			const unlockEle = document.createElement("div");
			unlockEle.classList.add("mb-2", "font-body-base", "text-shadow", "text-right");
			unlockEle.innerHTML = Locale.stylize(unlock);
			this.ageUnlockItems.appendChild(unlockEle);
		}
		UI.sendAudioEvent("civ-details-release");
	}

	private handleNavTo(index: number) {
		if (index >= this.civCards.length || index < 0) {
			return;
		}

		this.openAdditionalInfoPanel(this.civCards[index]);
	}

	private handleNavNext() {
		if (!this.selectedCard) {
			this.openAdditionalInfoPanel(this.civCards[0]);
			return;
		}

		const nextCardIndex = this.civCards.indexOf(this.selectedCard) + 1;
		if (nextCardIndex >= this.civCards.length) {
			return;
		}

		this.openAdditionalInfoPanel(this.civCards[nextCardIndex]);
	}

	private handleNavPrev() {
		if (!this.selectedCard) {
			this.openAdditionalInfoPanel(this.civCards[0]);
			return;
		}

		const prevCardIndex = this.civCards.indexOf(this.selectedCard) - 1;
		if (prevCardIndex < 0) {
			return;
		}

		this.openAdditionalInfoPanel(this.civCards[prevCardIndex]);
	}

	private handleCardSelected(event: ActionActivateEvent) {
		this.openAdditionalInfoPanel(event.target as ComponentRoot<AgeTransitionCivCard>);
	}

	private openAdditionalInfoPanel(selectedCard: ComponentRoot<AgeTransitionCivCard>) {
		NavTray.addOrUpdateGenericBack();

		this.selectedCard = selectedCard;
		this.selectedCivInfo = selectedCard.component.getCivData();
		const cardIndex = this.civCards.indexOf(this.selectedCard);
		this.civStepperButtons[cardIndex].setAttribute("selected", "true");

		this.updateDetails();

		this.isInDetails = true;
		this.cardsPanel.classList.add("hidden");
		this.detailsPanel.classList.remove("hidden");

		FocusManager.setFocus(this.Root);
	}

	private closeAdditionalInfoPanel() {
		NavTray.clear();

		this.isInDetails = false;
		this.cardsPanel.classList.remove("hidden");
		this.detailsPanel.classList.add("hidden");

		if (this.selectedCard) {
			FocusManager.setFocus(this.selectedCard);
		}
	}

	//new civ selected. Start the next age
	private startGame() {
		if (!this.selectedCivInfo || this.selectedCivInfo?.isLocked) {
			return;
		}

		const civName: string = this.selectedCivInfo.civID.slice(13).toLowerCase();	// cut the first 13 characters for "CIVILIZATION_" to get just the civ name
		UI.sendAudioEvent("age-end-civ-select" + civName);
		Sound.onNextCivSelect(civName);
		GameSetup.setPlayerParameterValue(GameContext.localPlayerID, 'PlayerCivilization', this.selectedCivInfo.civID);
		engine.call('startGame');
	}

	//open memento editor
	private openMementoEditor() {
		ContextManager.push("memento-editor", { singleton: true, createMouseGuard: true });
	}
}

Controls.define('age-transition-civ-select', {
	createInstance: AgeTransitionCivSelect,
	description: 'Single-player era transition civ select screen.',
	styles: ["fs://game/core/ui/shell/age-transition/age-transition-civ-select.css"],
	tabIndex: -1,
});

export { AgeTransitionCivSelect as default };
