/**
* @file panel-diplomacy-peace-deal.ts
* @copyright 2023, Firaxis Games
* @description Displays and handles modifying and proposing of peace deals
*/

import ContextManager from '/core/ui/context-manager/context-manager.js'
import DiplomacyManager, { DiplomacyInputPanel } from '/base-standard/ui/diplomacy/diplomacy-manager.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import LeaderModelManager from '/base-standard/ui/diplomacy/leader-model-manager.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';

import { Icon } from '/core/ui/utilities/utilities-image.js'
import { InputEngineEvent } from '/core/ui/input/input-support.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import DialogManager, { DialogBoxAction } from '/core/ui/dialog-box/manager-dialog-box.js'
import { Layout } from '/core/ui/utilities/utilities-layout.js';



class DiplomacyPeaceDealPanel extends DiplomacyInputPanel {
	private interfaceModeChangedListener = this.onInterfaceModeChanged.bind(this);
	private diplomacyDialogRequestCloseListener: EventListener = () => { this.onRequestClose() };
	private diplomacyDealProposalResponseListener: EventListener = (eventData: CustomEvent) => { this.onDealProposalResponse(eventData.detail) };
	private viewReceiveFocusListener = this.onViewReceiveFocus.bind(this);
	private onResizeEventListener = this.resizeFonts.bind(this);

	private closeButton: HTMLElement | null = null;
	private ourLeaderAndCivContainer: HTMLElement | null = null;
	private ourLeaderNameContainer: HTMLElement | null = null;
	private theirLeaderAndCivContainer: HTMLElement | null = null;
	private theirLeaderNameContainer: HTMLElement | null = null;
	private ourLeaderNameText: HTMLElement | null = null;
	private ourCivNameText: HTMLElement | null = null;
	private theirLeaderNameText: HTMLElement | null = null;
	private theirCivNameText: HTMLElement | null = null;
	private ourPlayerPortrait: HTMLElement | null = null;
	private theirPlayerPortrait: HTMLElement | null = null;
	private ourPlayerCivIcon: HTMLElement | null = null;
	private theirPlayerCivIcon: HTMLElement | null = null;
	private ourYourDealItemsContainer: HTMLElement | null = null;
	private ourTheirDealItemsContainer: HTMLElement | null = null
	private theirTheirDealItemsContainer: HTMLElement | null = null;
	private theirYourDealItemsContainer: HTMLElement | null = null;
	private localPlayerDealContainer: HTMLElement | null = null;
	private otherPlayerDealContainer: HTMLElement | null = null;
	private peaceDealNavigationContainer: HTMLElement | null = null;
	private peaceDealOfferContainer: HTMLElement | null = null;
	private peaceDealOfferHeader: HTMLElement | null = null;
	private localPlayerReceivesTitleWrapper: HTMLElement | null = null;
	private otherPlayerReceivesTitleWrapper: HTMLElement | null = null;
	private localPlayerReceivesTitle: HTMLElement | null = null;
	private otherPlayerReceivesTitle: HTMLElement | null = null;

	private proposeButton: HTMLElement | null = null;
	private rejectButton: HTMLElement | null = null;

	private warHeader: DiplomaticEventHeader | null = null;
	private isNewDeal: boolean = false;
	private isAI: boolean = false;
	private isWaitingForStatement: boolean = false;
	private currentWorkingDealID: DiplomacyWorkingDealId | null = null;
	private needsUpdate: boolean = false;
	private positiveReactionPlayed: boolean = false;
	private negativeReactionPlayed: boolean = false;

	private pendingDealAdditions: DiplomacyDealItem[] = [];
	private pendingDealRemovals: DiplomacyDealItem[] = [];
	private dealHasBeenModified: boolean = false;
	private dealSessionID: number | undefined;


	onAttach(): void {
		window.addEventListener('interface-mode-changed', this.interfaceModeChangedListener);
		window.addEventListener("diplomacy-dialog-request-close", this.diplomacyDialogRequestCloseListener);
		window.addEventListener("diplomacy-deal-proposal-response", this.diplomacyDealProposalResponseListener);
		window.addEventListener("resize", this.onResizeEventListener);

		this.Root.addEventListener('view-receive-focus', this.viewReceiveFocusListener);

		this.closeButton = this.Root.querySelector('fxs-close-button');
		if (!this.closeButton) {
			console.error("panel-diplomacy-peace-deal: Unable to find element: fxs-close-button")
		}
		else {
			this.closeButton?.addEventListener("action-activate", this.closeDealWithoutResponse.bind(this));
		}

		this.ourLeaderAndCivContainer = this.Root.querySelector(".local-player-leader-civ");
		if (!this.ourLeaderAndCivContainer) {
			console.error("panel-diplomacy-peace-deal: Unable to find element with class: local-player-leader-civ");
			return;
		}

		this.ourLeaderNameContainer = this.Root.querySelector(".local-player-leader-name");
		if (!this.ourLeaderNameContainer) {
			console.error("panel-diplomacy-peace-deal: Unable to find element with class: local-player-leader-name");
			return;
		}

		this.theirLeaderAndCivContainer = this.Root.querySelector(".other-player-leader-civ");
		if (!this.theirLeaderAndCivContainer) {
			console.error("panel-diplomacy-peace-deal: Unable to find element with class: other-player-leader-civ");
			return;
		}

		this.theirLeaderNameContainer = this.Root.querySelector(".other-player-leader-name");
		if (!this.theirLeaderNameContainer) {
			console.error("panel-diplomacy-peace-deal: Unable to find element with class: other-player-leader-name");
			return;
		}

		this.ourLeaderNameText = this.ourLeaderNameContainer.querySelector(".player-info__leader-name-text");

		this.ourCivNameText = this.ourLeaderAndCivContainer.querySelector(".peace-deal__civ-name-text");
		this.theirLeaderNameText = this.theirLeaderNameContainer.querySelector(".player-info__leader-name-text");

		this.theirCivNameText = this.theirLeaderAndCivContainer.querySelector(".peace-deal__civ-name-text");
		this.ourPlayerPortrait = this.ourLeaderAndCivContainer.querySelector(".peace-deal__portrait-image");
		this.theirPlayerPortrait = this.theirLeaderAndCivContainer.querySelector(".peace-deal__portrait-image");
		this.ourPlayerCivIcon = this.ourLeaderAndCivContainer.querySelector(".peace-deal__civ-icon-image");
		this.theirPlayerCivIcon = this.theirLeaderAndCivContainer.querySelector(".peace-deal__civ-icon-image");

		this.localPlayerReceivesTitleWrapper = this.Root.querySelector(".peace-deal__local-player-receives-title-wrapper");
		this.otherPlayerReceivesTitleWrapper = this.Root.querySelector(".peace-deal__other-player-receives-title-wrapper");

		const peaceDealTitle: HTMLElement | null = this.Root.querySelector(".peace-deal__title");
		if (!peaceDealTitle) {
			console.error("panel-diplomacy-peace-deal: Unable to find element with class .peace-deal__title");
			return;
		}
		peaceDealTitle.innerHTML = Locale.compose("LOC_DIPLOMACY_DEAL_PEACE_TITLE");

		const peaceDealToEndText: HTMLElement | null = this.Root.querySelector(".peace-deal__to-end");
		if (!peaceDealToEndText) {
			console.error("panel-diplomacy-peace-deal: Unable to find element with class .peace-deal__to-end");
			return;
		}
		peaceDealToEndText.innerHTML = Locale.compose("LOC_DIPLOMACY_PEACE_DEAL_TO_END");

		this.proposeButton = this.Root.querySelector(".peace-deal__propose-deal-button");
		this.rejectButton = this.Root.querySelector(".peace-deal__reject-deal-button");

		this.proposeButton?.addEventListener("action-activate", () => { this.clickProposeButton() });
		this.proposeButton?.setAttribute("data-audio-activate-ref", "none");
		this.rejectButton?.addEventListener("action-activate", () => { this.clickRejectButton() });


		this.peaceDealNavigationContainer = this.Root.querySelector(".peace-deal__navigation-container");
		if (!this.peaceDealNavigationContainer) {
			console.error("navigationcontainer couldn't be found");
			return;
		}
		this.localPlayerDealContainer = this.peaceDealNavigationContainer.querySelector(".local-player-deal-container");

		this.otherPlayerDealContainer = this.peaceDealNavigationContainer.querySelector(".other-player-deal-container");

		if (!this.otherPlayerDealContainer || !this.localPlayerDealContainer) {
			console.error("panel-diplomacy-peace-deal: Unable to find one or more player settlement containers!");
			return;
		}

		this.peaceDealOfferContainer = MustGetElement(".peace-deal__offer-container", this.peaceDealNavigationContainer);
		this.peaceDealOfferHeader = MustGetElement(".peace-deal__offer-header", this.Root);
		this.peaceDealOfferHeader.innerHTML = Locale.compose("LOC_DIPLOMACY_PEACE_DEAL_OFFER");

		this.localPlayerReceivesTitle = MustGetElement(".peace-deal__local-player-receives-title", this.peaceDealOfferContainer);
		const localPlayerLibrary: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (!localPlayerLibrary) {
			console.error("panel-diplomacy-peace-deal: No valid PlayerLibrary for local player!");
			return;
		}

		const ourPlayer = Configuration.getPlayer(localPlayerLibrary.id);
		if (!ourPlayer.leaderTypeName) {
			console.error("panel-diplomacy-peace-deal: Attempting to assign player leader icon, but no valid leaderTypeName!");
			return;
		}


		const ourReceivesIcon = document.createElement("leader-icon");
		ourReceivesIcon.classList.add("w-8", "h-8", "pointer-events-auto");
		ourReceivesIcon.setAttribute("leader", ourPlayer.leaderTypeName);
		ourReceivesIcon.setAttribute("bg-color", UI.Player.getPrimaryColorValueAsString(localPlayerLibrary.id));
		ourReceivesIcon.setAttribute("fg-color", "white");

		const localPlayerReceivesTitleWrapper = MustGetElement(".peace-deal__local-player-receives-title-wrapper", this.Root);
		const localPlayerReceivesIconWrapper = MustGetElement(".peace-deal__local-player-receives-icon-wrapper", this.Root);

		localPlayerReceivesTitleWrapper.style.setProperty("--local-player-color", UI.Player.getPrimaryColorValueAsString(localPlayerLibrary.id));
		this.localPlayerReceivesTitle.innerHTML = Locale.compose(localPlayerLibrary.leaderName) + " " + Locale.compose("LOC_DIPLOMACY_PEACE_DEAL_RECEIVES");
		localPlayerReceivesIconWrapper.appendChild(ourReceivesIcon);

		this.ourYourDealItemsContainer = MustGetElement(".peace-deal__deal-items", this.localPlayerDealContainer);
		this.theirTheirDealItemsContainer = MustGetElement(".peace-deal__deal-items", this.otherPlayerDealContainer);

		this.ourTheirDealItemsContainer = MustGetElement(".peace-deal__local-player-receives-settlements", this.peaceDealOfferContainer);
		this.theirYourDealItemsContainer = MustGetElement(".peace-deal__other-player-receives-settlements", this.peaceDealOfferContainer);



		if (!this.checkShouldShowPanel()) {
			return;
		}

		this.queueUpdate();

	}

	onDetach(): void {
		window.removeEventListener('interface-mode-changed', this.interfaceModeChangedListener);
		window.removeEventListener("diplomacy-dialog-request-close", this.diplomacyDialogRequestCloseListener);
		window.removeEventListener("diplomacy-deal-proposal-response", this.diplomacyDealProposalResponseListener);
		window.removeEventListener("resize", this.onResizeEventListener);

		this.Root.removeEventListener('view-receive-focus', this.viewReceiveFocusListener);
	}

	private onRequestClose(): void {
		this.closeCurrentDeal();
	}

	private onViewReceiveFocus() {
		this.realizeInitialFocus();
	}

	private resizeFonts(): void {
		if (this.ourLeaderNameText) {
			this.ourLeaderNameText.classList.toggle('text-lg', window.innerHeight > Layout.pixelsToScreenPixels(1000));
			this.ourLeaderNameText.classList.toggle('text-base', window.innerHeight < Layout.pixelsToScreenPixels(1000));
		}

		if (this.theirLeaderNameText) {
			this.theirLeaderNameText.classList.toggle('text-lg', window.innerHeight > Layout.pixelsToScreenPixels(1000));
			this.theirLeaderNameText.classList.toggle('text-base', window.innerHeight < Layout.pixelsToScreenPixels(1000));
		}

		const warNameText: HTMLElement | null = this.Root.querySelector(".peace-deal__war-name");
		if (!warNameText) {
			console.error("panel-diplomacy-peace-deal: Can not find element with class .peace-deal__war-name");
			return;
		}
		warNameText.classList.toggle('text-base', window.innerHeight < Layout.pixelsToScreenPixels(1000));
		warNameText.classList.toggle('text-lg', window.innerHeight > Layout.pixelsToScreenPixels(1000));

		const peaceDealItems = this.Root.querySelectorAll(".peace-deal__deal-item-settlement-info");
		if (!peaceDealItems) {
			console.error("panel-diplomacy-peace-deal: Can not find element with class .peace-deal__deal-item-settlement-info");
			return;
		}
		peaceDealItems.forEach(dealItem => {
			dealItem.classList.toggle('text-xs', window.innerHeight < Layout.pixelsToScreenPixels(1000));
			dealItem.classList.toggle('text-sm', window.innerHeight > Layout.pixelsToScreenPixels(1000));
		});

		if (this.peaceDealOfferHeader) {
			this.peaceDealOfferHeader.classList.toggle('text-base', window.innerHeight < Layout.pixelsToScreenPixels(1000));
			this.peaceDealOfferHeader.classList.toggle('text-lg', window.innerHeight > Layout.pixelsToScreenPixels(1000));
		}

		const peaceDealTitle: HTMLElement | null = this.Root.querySelector(".peace-deal__title");
		if (!peaceDealTitle) {
			console.error("panel-diplomacy-peace-deal: Unable to find element with class .peace-deal__title");
			return;
		}
		peaceDealTitle.classList.toggle('text-base', window.innerHeight < Layout.pixelsToScreenPixels(1000));
	}

	private onDealProposalResponse(detail: any): void {
		if (detail) {
			if (this.isNewDeal) {
				this.dealSessionID = detail.eventData.sessionId;
			}
			const otherPlayerID: PlayerId = DiplomacyManager.currentDiplomacyDealData ? DiplomacyManager.currentDiplomacyDealData.OtherPlayer : DiplomacyManager.selectedPlayerID;
			const otherPlayerLibrary: PlayerLibrary | null = Players.get(otherPlayerID);
			const forced = true;
			const posNegTimerOtherAlreadyPlayed = 500;
			const posNegTimerOtherHasntPlayed = 100;
			if (detail.eventData.values?.RespondingToDealAction == DiplomacyDealProposalActions.INSPECT && otherPlayerLibrary) {
				if (detail.eventData.values?.DealAction == DiplomacyDealProposalActions.ACCEPTED) {
					if (!this.isNewDeal) {
						this.updateButtonStates();
					}
					if (this.positiveReactionPlayed == false) {
						if (this.negativeReactionPlayed == true) {
							setTimeout(() => {
								LeaderModelManager.beginAcknowledgePositiveOtherSequence(forced);
							}, posNegTimerOtherAlreadyPlayed);
						}
						else {
							setTimeout(() => {
								LeaderModelManager.beginAcknowledgePositiveOtherSequence(forced);
							}, posNegTimerOtherHasntPlayed);
						}
						this.negativeReactionPlayed = false;
						this.positiveReactionPlayed = true;
					}
					const inspectWrapper = MustGetElement(".panel-diplomacy-peace-deal__inspect-wrapper", this.Root);
					inspectWrapper.innerHTML = "";
					const inspectPosNegImgWrapper = document.createElement("div");
					inspectPosNegImgWrapper.classList.value = "peace-deal__radial-bg flex bg-cover size-9";
					const inspectPosNegImg = document.createElement("img");
					inspectPosNegImg.classList.add("justify-center", "panel-diplomacy-peace-deal__pos-neg-preview-image", "size-8", "ml-0\\.5", "mt-0\\.5");
					inspectPosNegImg.src = "fs://game/dip_esp_success_icon.png";
					inspectPosNegImgWrapper.appendChild(inspectPosNegImg);
					inspectWrapper.appendChild(inspectPosNegImgWrapper);
					const inspectPosNegTextWrapper = document.createElement("div");
					inspectPosNegTextWrapper.classList.value = "justify-center items-center flex text-base";
					const inspectPosNegText = Locale.stylize("LOC_DIPLOMACY_PEACE_DEAL_WILL_ACCEPT", otherPlayerLibrary.name);
					inspectPosNegTextWrapper.innerHTML = inspectPosNegText;
					inspectWrapper.appendChild(inspectPosNegTextWrapper);
					this.pendingDealAdditions = [];
					this.pendingDealRemovals = [];
				}
				else {
					if (this.negativeReactionPlayed == false) {
						if (this.positiveReactionPlayed == true) {
							setTimeout(() => {
								LeaderModelManager.beginAcknowledgeNegativeOtherSequence(forced);
							}, posNegTimerOtherAlreadyPlayed);
						}
						else {
							setTimeout(() => {
								LeaderModelManager.beginAcknowledgeNegativeOtherSequence(forced);
							}, posNegTimerOtherHasntPlayed);
						}
						this.negativeReactionPlayed = true;
						this.positiveReactionPlayed = false;
					}
					const inspectWrapper = MustGetElement(".panel-diplomacy-peace-deal__inspect-wrapper", this.Root);
					inspectWrapper.innerHTML = "";
					const inspectPosNegImgWrapper = document.createElement("div");
					inspectPosNegImgWrapper.classList.value = "peace-deal__radial-bg flex bg-cover size-9";
					const inspectPosNegImg = document.createElement("img");
					inspectPosNegImg.classList.add("justify-center", "panel-diplomacy-peace-deal__pos-neg-preview-image", "size-8", "ml-0\\.5", "mt-0\\.5");
					inspectPosNegImg.src = "fs://game/dip_esp_fail_icon.png";
					inspectPosNegImgWrapper.appendChild(inspectPosNegImg);
					inspectWrapper.appendChild(inspectPosNegImgWrapper);
					const inspectPosNegTextWrapper = document.createElement("div");
					inspectPosNegTextWrapper.classList.value = "justify-center items-center flex text-base";
					const inspectPosNegText = Locale.stylize("LOC_DIPLOMACY_PEACE_DEAL_WILL_REJECT", otherPlayerLibrary.name);
					inspectPosNegTextWrapper.innerHTML = inspectPosNegText;
					inspectWrapper.appendChild(inspectPosNegTextWrapper);
					this.pendingDealAdditions = [];
					this.pendingDealRemovals = [];
				}
			}
		}
	}

	private queueUpdate() {
		if (!this.needsUpdate) {
			this.needsUpdate = true;
			requestAnimationFrame(() => {
				this.populatePeaceDeal();
				this.needsUpdate = false;
			});
		}
	}

	private populatePeaceDeal() {
		this.otherPlayerReceivesTitle = MustGetElement(".peace-deal__other-player-receives-title", this.Root);
		const otherPlayerID: PlayerId = DiplomacyManager.currentDiplomacyDealData ? DiplomacyManager.currentDiplomacyDealData.OtherPlayer : DiplomacyManager.selectedPlayerID;
		const otherPlayerLibrary: PlayerLibrary | null = Players.get(otherPlayerID);
		if (!otherPlayerLibrary) {
			console.error("panel-diplomacy-peace-deal: No valid PlayerLibrary for other player!");
			return;
		}

		const theirPlayer = Configuration.getPlayer(otherPlayerLibrary.id);
		if (!theirPlayer.leaderTypeName) {
			console.error("panel-diplomacy-peace-deal: Attempting to assign player leader icon, but no valid leaderTypeName!");
			return;
		}

		const otherPlayerReceivesIconWrapper = MustGetElement(".peace-deal__other-player-receives-icon-wrapper", this.Root);
		while (otherPlayerReceivesIconWrapper.hasChildNodes()) {
			otherPlayerReceivesIconWrapper.removeChild(otherPlayerReceivesIconWrapper.lastChild!);
		}
		const otherPlayerReceivesTitleWrapper = MustGetElement(".peace-deal__other-player-receives-title-wrapper", this.Root);

		const theirReceivesIcon = document.createElement("leader-icon");
		theirReceivesIcon.classList.add("w-8", "h-8", "pointer-events-auto");
		theirReceivesIcon.setAttribute("leader", theirPlayer.leaderTypeName);
		theirReceivesIcon.setAttribute("bg-color", UI.Player.getPrimaryColorValueAsString(otherPlayerLibrary.id));
		theirReceivesIcon.setAttribute("fg-color", "white");
		otherPlayerReceivesTitleWrapper.style.setProperty("--other-player-color", UI.Player.getPrimaryColorValueAsString(otherPlayerLibrary.id));
		this.otherPlayerReceivesTitle.innerHTML = Locale.compose(otherPlayerLibrary.leaderName) + " " + Locale.compose("LOC_DIPLOMACY_PEACE_DEAL_RECEIVES");
		otherPlayerReceivesIconWrapper.appendChild(theirReceivesIcon);

		this.proposeButton?.classList.remove("disabled");
		this.rejectButton?.classList.remove("disabled");

		while (this.ourYourDealItemsContainer?.hasChildNodes()) {
			this.ourYourDealItemsContainer.removeChild(this.ourYourDealItemsContainer.lastChild!)
		}
		while (this.theirTheirDealItemsContainer?.hasChildNodes()) {
			this.theirTheirDealItemsContainer.removeChild(this.theirTheirDealItemsContainer.lastChild!)
		}

		while (this.ourTheirDealItemsContainer?.hasChildNodes()) {
			this.ourTheirDealItemsContainer.removeChild(this.ourTheirDealItemsContainer.lastChild!)
		}
		while (this.theirYourDealItemsContainer?.hasChildNodes()) {
			this.theirYourDealItemsContainer.removeChild(this.theirYourDealItemsContainer.lastChild!)
		}

		const localPlayerLibrary: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (!localPlayerLibrary) {
			console.error("panel-diplomacy-peace-deal: No valid PlayerLibrary for local player!");
			return;
		}

		this.realizePlayerVisuals(localPlayerLibrary, otherPlayerLibrary);
		const acceptRejectWrapper = MustGetElement(".panel-diplomacy-peace-deal__inspect-wrapper", this.Root);
		if (!document.querySelector(".panel-diplomacy-peace-deal__accept-reject-status")) {
			const acceptRejectValues = document.createElement("div");
			acceptRejectValues.classList.value = "text-center flow-row";
			const acceptRejectIcon = document.createElement("div");
			acceptRejectIcon.classList.value = "size-12";
			acceptRejectValues.appendChild(acceptRejectIcon);
			const acceptRejectText = document.createElement("div");
			acceptRejectText.classList.value = "font-body text-xs";
			const acceptRejectLeader = document.createElement("div");
			acceptRejectLeader.classList.value = "panel-diplomacy-peace-deal_accept-reject-leader justify-center";
			acceptRejectText.appendChild(acceptRejectLeader);
			const acceptRejectStatus = document.createElement("div");
			acceptRejectStatus.classList.value = "panel-diplomacy-peace-deal__accept-reject-status";
			acceptRejectText.appendChild(acceptRejectStatus);
			acceptRejectValues.appendChild(acceptRejectText);
			acceptRejectWrapper.appendChild(acceptRejectValues);
		}

		const jointEvents: DiplomaticEventHeader[] = Game.Diplomacy.getJointEvents(GameContext.localPlayerID, otherPlayerID, false);
		if (jointEvents.length > 0) {
			jointEvents.forEach(jointEvent => {
				if (jointEvent.actionTypeName == "DIPLOMACY_ACTION_DECLARE_WAR") {
					this.warHeader = jointEvent;
				};
			});
		}

		if (this.warHeader === null) {
			console.error("panel-diplomacy-peace-deal: Can not populate peace deal as there is no war between local player and player with ID: " + otherPlayerID);
			return;
		}

		const warData: WarData = Game.Diplomacy.getWarData(this.warHeader.uniqueID, GameContext.localPlayerID);
		const warUIData: DiplomaticProjectUIData | undefined = Game.Diplomacy.getProjectDataForUI(this.warHeader.initialPlayer, -1, DiplomacyActionTargetTypes.NO_DIPLOMACY_TARGET, DiplomacyActionGroups.NO_DIPLOMACY_ACTION_GROUP, -1, DiplomacyActionTargetTypes.NO_DIPLOMACY_TARGET).find(project => project.actionID == this.warHeader?.uniqueID);
		if (warUIData == undefined) {
			console.error("panel-diplomacy-peace-deal: Attempting to get war data, but there is no valid DiplomaticProjectUIData for the war diplomatic event");
			return;
		}

		const warNameText: HTMLElement | null = this.Root.querySelector(".peace-deal__war-name");
		if (!warNameText) {
			console.error("panel-diplomacy-peace-deal: Can not find element with class .peace-deal__war-name");
			return;
		}
		warNameText.innerHTML = warData.warName;

		const selectSettlementText: HTMLElement | null = this.Root.querySelector(".peace-deal__select-settlements");
		if (!selectSettlementText) {
			console.error("panel-diplomacy-peace-deal: Can not find element with class .peace-deal__select-settlements");
		}
		selectSettlementText?.setAttribute("data-l10n-id", "LOC_DIPLOMACY_PEACE_DEAL_SELECT_SETTLEMENTS");

		const workingDealId: DiplomacyWorkingDealId = DiplomacyManager.currentDiplomacyDealData ? DiplomacyManager.currentDiplomacyDealData.WorkingDealID : {
			direction: DiplomacyDealDirection.OUTGOING,
			player1: GameContext.localPlayerID,
			player2: DiplomacyManager.selectedPlayerID
		};

		// Set our deal ID and some other metadata
		this.setWorkingDealID(workingDealId);

		if (!DiplomacyManager.currentDiplomacyDealData) {
			this.isNewDeal = true;
			Game.DiplomacyDeals.clearWorkingDeal(workingDealId);

			const initialPeaceDealItem: object = {
				type: DiplomacyDealItemTypes.AGREEMENTS,
				agreementType: DiplomacyDealItemAgreementTypes.MAKE_PEACE
			}

			//Add an initial item that just has the agreement type
			Game.DiplomacyDeals.addItemToWorkingDeal(workingDealId, initialPeaceDealItem);

			this.proposeButton?.setAttribute("caption", Locale.compose("LOC_DIPLOMACY_DEAL_PROPOSE"));
			this.rejectButton?.setAttribute("caption", Locale.compose("LOC_GENERIC_CANCEL"));
		} else {
			this.proposeButton?.setAttribute("caption", Locale.compose("LOC_GENERIC_ACCEPT"));
			this.rejectButton?.setAttribute("caption", Locale.compose("LOC_DIPLOMACY_DEAL_REJECT"));
		}

		//Check if the player already has a pending deal with the other player
		const workingDeal: DiplomacyDeal | null = Game.DiplomacyDeals.getWorkingDeal(workingDealId);
		if (!workingDeal) {
			console.error("scree-diplomacy-peace-deal: onAttach(): Unable to get the working deal between local player with id: " + GameContext.localPlayerID + " and other player with id: " + DiplomacyManager.selectedPlayerID);
			return;
		}
		//Populate cities already in the deal
		workingDeal?.itemIds.forEach(itemID => {
			const dealItem: DiplomacyDealItem | null = Game.DiplomacyDeals.getWorkingDealItem(workingDealId, itemID);
			if (!dealItem || !dealItem.cityId || dealItem.cityId.id == -1) {
				console.error("we didn't get any deal items");
				return;
			}
			const city: City | null = Cities.get(dealItem.cityId);
			if (!city) {
				console.error("screen-diplomacy-peace-deal: onAttach(): Unable to get City with ID: " + dealItem.cityId.id);
				return;
			}

			const cityDealItemElement = this.createCityDealItem(city, dealItem.cityTransferType);
			cityDealItemElement.addEventListener("action-activate", () => { this.moveDealItem(dealItem, dealItem.to, true, cityDealItemElement) });


			if (city.owner == GameContext.localPlayerID) {
				this.theirYourDealItemsContainer?.appendChild(cityDealItemElement);
				this.otherPlayerReceivesTitleWrapper?.classList.remove("hidden");
			} else {
				this.ourTheirDealItemsContainer?.appendChild(cityDealItemElement);
				this.localPlayerReceivesTitleWrapper?.classList.remove("hidden");
			}
		});

		//Populate possible cities to add to the deal
		const citiesFromLocalPlayer: DiplomacyDealItem[] = Game.DiplomacyDeals.getPossibleWorkingDealItems(workingDealId, GameContext.localPlayerID, DiplomacyDealItemTypes.CITIES);
		citiesFromLocalPlayer.forEach(dealItem => {
			if (!dealItem.cityId) {
				return;
			}

			// Check to see if the item is for OFFER, we are not showing any CEDE_OCCUPIED items
			if (dealItem.subType != DiplomacyDealItemCityTransferTypes.OFFER) {
				return;
			}

			let alreadyInDeal: boolean = false;
			workingDeal?.itemIds.forEach(itemID => {
				const workingDealItem: DiplomacyDealItem | null = Game.DiplomacyDeals.getWorkingDealItem(workingDealId, itemID);
				if (workingDealItem?.cityId?.id == dealItem.cityId?.id) {
					alreadyInDeal = true;
					return;
				}
			});

			if (alreadyInDeal) {
				return;
			}

			const city: City | null = Cities.get(dealItem.cityId);
			if (!city) {
				console.error("screen-diplomacy-peace-deal: onAttach(): Unable to get City with ID: " + dealItem.cityId.id);
				return;
			}

			if (city.originalOwner == GameContext.localPlayerID && city.owner != GameContext.localPlayerID) {
				return;
			}

			const cityDealItemElement = this.createCityDealItem(city);

			cityDealItemElement.addEventListener("action-activate", () => { this.moveDealItem(dealItem, GameContext.localPlayerID, false, cityDealItemElement) });


			this.ourYourDealItemsContainer?.appendChild(cityDealItemElement);
		});

		const citiesFromOtherPlayer: DiplomacyDealItem[] = Game.DiplomacyDeals.getPossibleWorkingDealItems(workingDealId, otherPlayerID, DiplomacyDealItemTypes.CITIES);
		citiesFromOtherPlayer.forEach(dealItem => {
			if (!dealItem.cityId) {
				return;
			}

			// Check to see if the item is for OFFER, we are not showing any CEDE_OCCUPIED items
			if (dealItem.subType != DiplomacyDealItemCityTransferTypes.OFFER) {
				return;
			}

			let alreadyInDeal: boolean = false;
			workingDeal?.itemIds.forEach(itemID => {
				const workingDealItem: DiplomacyDealItem | null = Game.DiplomacyDeals.getWorkingDealItem(workingDealId, itemID);
				if (workingDealItem?.cityId?.id == dealItem.cityId?.id) {
					alreadyInDeal = true;
					return;
				}
			});

			if (alreadyInDeal) {
				return;
			}

			const city: City | null = Cities.get(dealItem.cityId);
			if (!city) {
				console.error("screen-diplomacy-peace-deal: onAttach(): Unable to get City with ID: " + dealItem.cityId.id);
				return;
			}

			if (city.originalOwner == otherPlayerID && city.owner != otherPlayerID) {
				return;
			}

			const cityDealItemElement = this.createCityDealItem(city);
			cityDealItemElement.addEventListener("action-activate", () => { this.moveDealItem(dealItem, otherPlayerID, false, cityDealItemElement) });

			this.theirTheirDealItemsContainer?.appendChild(cityDealItemElement);
		});

		this.updateButtonStates();
		this.showLeaderModel();
		const isOtherPlayerHuman = otherPlayerLibrary?.isHuman;
		if (this.isNewDeal || this.pendingDealAdditions.length > 0 || this.pendingDealRemovals.length > 0) {
			this.inspectCurrentDeal(isOtherPlayerHuman);
		}

		// check to make sure our middle sections aren't empty
		if (!this.ourTheirDealItemsContainer?.hasChildNodes()) {
			this.localPlayerReceivesTitleWrapper?.classList.add("hidden");
		}
		if (!this.theirYourDealItemsContainer?.hasChildNodes()) {
			this.otherPlayerReceivesTitleWrapper?.classList.add("hidden");
		}
	}


	createCityDealItem(city: City, transferType?: DiplomacyDealItemCityTransferTypes): HTMLElement {
		const dealItem = document.createElement("chooser-item");

		/** The player/owner of the object. */

		const theCityID = city.id.owner.toString() + ";" + city.id.id.toString() + ";" + city.id.type.toString() + ";";

		dealItem.classList.add("peace-deal__deal-item", "chooser-item_unlocked", "relative", "w-full", "min-h-22", "flex", "flex-row", "pointer-events-auto", "mt-2");
		dealItem.setAttribute("tabindex", "-1");
		dealItem.setAttribute("disabled", "false");

		dealItem.setAttribute("action-key", "inline-confirm");
		dealItem.setAttribute('data-tooltip-style', 'peaceDeal');
		if (transferType == DiplomacyDealItemCityTransferTypes.CEDE_OCCUPIED) {
			dealItem.setAttribute("occupied", "true");
		}
		else {
			dealItem.setAttribute("occupied", "false");
		}

		dealItem.setAttribute("componentid", theCityID);
		dealItem.setAttribute("node-id", city.name);
		if (transferType == DiplomacyDealItemCityTransferTypes.CEDE_OCCUPIED) {
			dealItem.setAttribute("occupied", "true");
		}
		else {
			dealItem.setAttribute("occupied", "false");
		}
		dealItem.setAttribute("node-id", city.name);
		dealItem.setAttribute("componentid", theCityID);
		dealItem.setAttribute("data-audio-group-ref", "peace-deal-item");

		const owner: PlayerLibrary | null = Players.get(city.owner);
		if (!owner) {
			console.error("panel-diplomacy-peace-deal: Unable to get player library for owner of city! City ID: " + city.id + "  Owner ID: " + city.owner)
			return dealItem;
		}


		const settlementIconBGOuter = document.createElement("div");
		settlementIconBGOuter.classList.add("peace-deal__settlement-icon-bg-outer", "relative", "size-25", "self-center", "pointer-events-none", "bg-contain", "bg-no-repeat", "ml-0");
		settlementIconBGOuter.style.setProperty("--owner-color-primary", UI.Player.getPrimaryColorValueAsString(city.originalOwner));


		const settlementIconBGInner = document.createElement("div");
		settlementIconBGInner.classList.add("peace-deal__settlement-icon-bg-inner", "size-18", "self-center", "pointer-events-none", "bg-contain", "bg-no-repeat", "ml-0");
		settlementIconBGInner.style.setProperty("--owner-color-primary", UI.Player.getPrimaryColorValueAsString(city.originalOwner));
		settlementIconBGInner.style.setProperty("--owner-color-secondary", UI.Player.getSecondaryColorValueAsString(city.originalOwner));

		const settlementIconBG = document.createElement("div");
		settlementIconBG.classList.add("peace-deal__settlement-icon-bg", "h-18", "w-18", "relative", "self-center", "pointer-events-none", "bg-contain", "bg-no-repeat", "ml-0", "mt-3");
		settlementIconBG.style.setProperty("--owner-color-primary", UI.Player.getPrimaryColorValueAsString(city.originalOwner));

		const settlementIcon = document.createElement("div");
		settlementIcon.classList.add("peace-deal__settlement-icon-image", "size-16", "-mt-18", "bg-center", "bg-no-repeat", "bg-contain", "self-center", "relative");
		if (city.isTown) {
			settlementIcon.style.backgroundImage = `url(blp:Yield_Towns)`;
		} else {
			settlementIcon.style.backgroundImage = `url(blp:Yield_Cities)`;
		}
		const populationBackground = document.createElement("div");
		populationBackground.classList.value = "peace-deal__settlement-population-bg self-end h-10 w-20 -left-0\\.5 top-2\\/3 relative opacity-50";


		const settlementPopulation = document.createElement("div");
		settlementPopulation.classList.add("self-center", "font-title", "text-sm", "text-center", "w-7", "peace-deal__deal-item-settlement-population", "relative", "mt-1");

		settlementIconBGOuter.appendChild(settlementIconBG);
		settlementIconBGOuter.appendChild(settlementIconBGInner);

		settlementIconBGOuter.appendChild(settlementIcon);
		settlementIcon.appendChild(populationBackground);



		settlementIcon.appendChild(settlementPopulation);
		settlementPopulation.setAttribute("data-l10n-id", city.population.toString());
		dealItem.appendChild(settlementIconBGOuter);

		/// if there are wonders or the settlement is occupied, we need a container created

		let numberWondersCount = 0;
		if (city.Constructibles?.getNumWonders()) {
			if (city.Constructibles?.getNumWonders() > 0) {
				numberWondersCount = city.Constructibles?.getNumWonders();
			}
		}
		const settlementInfoWrapper = document.createElement("div");
		settlementInfoWrapper.classList.add("flex", "flex-col", "justify-center", "relative");

		const settlementInfo = document.createElement("div");
		settlementInfo.classList.add("peace-deal__deal-item-settlement-info", "flex", "flex-col", "justify-center", "font-base", "text-sm");
		if ((city.owner != city.originalOwner && (city.originalOwner == GameContext.localPlayerID || city.originalOwner == DiplomacyManager.currentDiplomacyDealData?.OtherPlayer || city.originalOwner == DiplomacyManager.selectedPlayerID)) || transferType) {
			settlementInfo.classList.add("pl-0", "max-w-32");
		}
		else {
			settlementInfo.classList.add("max-w-48");
		}
		if (transferType == DiplomacyDealItemCityTransferTypes.OFFER) {
			settlementInfo.innerHTML = Locale.compose(city.name) + " " + Locale.compose("LOC_DIPLOMACY_PEACE_DEAL_CITY_NEW");
		}
		else if (transferType == DiplomacyDealItemCityTransferTypes.CEDE_OCCUPIED) {
			settlementInfo.setAttribute("data-l10n-id", city.name);
		}
		else {
			settlementInfo.setAttribute("data-l10n-id", city.name);
		}
		settlementInfoWrapper.appendChild(settlementInfo);

		dealItem.appendChild(settlementInfoWrapper);
		settlementInfoWrapper.setAttribute("node-id", city.name);
		settlementInfoWrapper.setAttribute("componentid", theCityID);
		if (transferType == DiplomacyDealItemCityTransferTypes.CEDE_OCCUPIED) {
			settlementInfoWrapper.setAttribute("occupied", "true");
		}
		else {
			settlementInfoWrapper.setAttribute("occupied", "false");
		}
		const settlementStatusWonders = document.createElement("div");
		if (transferType == DiplomacyDealItemCityTransferTypes.CEDE_OCCUPIED || numberWondersCount > 0) {

			settlementStatusWonders.classList.add("flex", "flex-row", "pb-1");

			if (transferType == DiplomacyDealItemCityTransferTypes.CEDE_OCCUPIED) {
				const settlementStatus = document.createElement("div");
				settlementStatus.classList.add("size-8", "bg-contain");
				settlementStatus.style.backgroundImage = `url(fs://game/dip_icon_conquered.png)`;
				settlementStatusWonders.appendChild(settlementStatus);
			}

			if (numberWondersCount > 0) {
				const settlementWonders = document.createElement("div");
				settlementWonders.classList.add("size-8", "bg-contain");
				settlementWonders.style.backgroundImage = `url(fs://game/city_wonders_hi.png)`;
				settlementStatusWonders.appendChild(settlementWonders);
			}
			settlementInfoWrapper.appendChild(settlementStatusWonders);
		}

		return dealItem;
	}

	private setWorkingDealID(workingDealId: DiplomacyWorkingDealId): void {
		this.currentWorkingDealID = workingDealId;
		this.isAI = Configuration.getPlayer(this.currentWorkingDealID.player1).isAI || Configuration.getPlayer(this.currentWorkingDealID.player2).isAI;
		this.isWaitingForStatement = false;
	}

	private checkShouldShowPanel(): boolean {
		if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_PEACE_DEAL")) {
			this.Root.classList.remove("hidden");

			delayByFrame(() => {
				this.realizeInitialFocus();
			}, 1);

			return true;
		}

		this.Root.classList.add("hidden");
		return false;
	}

	private realizePlayerVisuals(localPlayerLibrary: PlayerLibrary, otherPlayerLibrary: PlayerLibrary) {
		this.ourLeaderNameText?.setAttribute('data-l10n-id', Locale.compose(localPlayerLibrary.leaderName));
		this.ourCivNameText?.setAttribute('data-l10n-id', Locale.compose("LOC_DIPLOMACY_CIV_NAME", localPlayerLibrary.civilizationAdjective));

		this.theirLeaderNameText?.setAttribute('data-l10n-id', Locale.compose(otherPlayerLibrary.leaderName));
		this.theirCivNameText?.setAttribute('data-l10n-id', Locale.compose("LOC_DIPLOMACY_CIV_NAME", otherPlayerLibrary.civilizationAdjective));

		const localPlayerColorPrimary: string = UI.Player.getPrimaryColorValueAsString(localPlayerLibrary.id);
		const localPlayerColorSecondary: string = UI.Player.getSecondaryColorValueAsString(localPlayerLibrary.id);

		this.ourLeaderAndCivContainer?.style.setProperty('--player-color-primary', localPlayerColorPrimary);
		this.ourLeaderAndCivContainer?.style.setProperty('--player-color-secondary', localPlayerColorSecondary);

		this.ourLeaderAndCivContainer?.style.setProperty('--player-pattern', Icon.getCivLineCSSFromCivilizationType(localPlayerLibrary.civilizationType));
		this.ourLeaderAndCivContainer?.style.setProperty('--player-symbol', Icon.getCivSymbolCSSFromCivilizationType(localPlayerLibrary.civilizationType));

		const otherPlayerColorPrimary: string = UI.Player.getPrimaryColorValueAsString(otherPlayerLibrary.id);
		const otherPlayerColorSecondary: string = UI.Player.getSecondaryColorValueAsString(otherPlayerLibrary.id);

		this.theirLeaderAndCivContainer?.style.setProperty('--player-color-primary', otherPlayerColorPrimary);
		this.theirLeaderAndCivContainer?.style.setProperty('--player-color-secondary', otherPlayerColorSecondary);

		this.theirLeaderAndCivContainer?.style.setProperty('--player-pattern', Icon.getCivLineCSSFromCivilizationType(otherPlayerLibrary.civilizationType));
		this.theirLeaderAndCivContainer?.style.setProperty('--player-symbol', Icon.getCivSymbolCSSFromCivilizationType(otherPlayerLibrary.civilizationType));

		if (!this.ourPlayerPortrait || !this.theirPlayerPortrait) {
			console.error("panel-diplomacy-peace-deal: Attempting to assign player portraits but unable to find appropriate HTMLElements!")
			return;
		}
		const ourPlayer = Configuration.getPlayer(localPlayerLibrary.id);
		if (!ourPlayer.leaderTypeName) {
			console.error("panel-diplomacy-peace-deal: Attempting to assign player leader icon, but no valid leaderTypeName!");
			return;
		}

		this.ourPlayerPortrait.innerHTML = "";
		const ourIcon = document.createElement("leader-icon");
		ourIcon.classList.add("mx-2", "w-16", "h-16", "my-3", "pointer-events-auto");
		ourIcon.setAttribute("leader", ourPlayer.leaderTypeName);
		ourIcon.setAttribute("civ-icon-url", Icon.getCivSymbolFromCivilizationType(localPlayerLibrary.civilizationType));
		ourIcon.setAttribute("bg-color", UI.Player.getPrimaryColorValueAsString(localPlayerLibrary.id));
		ourIcon.setAttribute("fg-color", "white");
		ourIcon.setAttribute("horizontal-banner-right", "true");

		this.ourPlayerPortrait.appendChild(ourIcon);

		const theirPlayer = Configuration.getPlayer(otherPlayerLibrary.id);
		if (!theirPlayer.leaderTypeName) {
			console.error("panel-diplomacy-peace-deal: Attempting to assign player leader icon, but no valid leaderTypeName!");
			return;
		}
		this.theirPlayerPortrait.innerHTML = "";
		const theirIcon = document.createElement("leader-icon");
		theirIcon.classList.add("mx-2", "w-16", "h-16", "my-3", "pointer-events-auto");
		theirIcon.setAttribute("leader", theirPlayer.leaderTypeName);
		theirIcon.setAttribute("civ-icon-url", Icon.getCivSymbolFromCivilizationType(otherPlayerLibrary.civilizationType));
		theirIcon.setAttribute("bg-color", UI.Player.getPrimaryColorValueAsString(otherPlayerLibrary.id));
		theirIcon.setAttribute("fg-color", "white");
		theirIcon.setAttribute("horizontal-banner-left", "true");
		this.theirPlayerPortrait.appendChild(theirIcon);


		if (!this.ourPlayerCivIcon || !this.theirPlayerCivIcon) {
			console.error("panel-diplomacy-peace-deal: Attempting to assign player civ icons but unable to find appropriate HTMLElements!")
			return;
		}

	}

	private proposeCurrentDeal() {
		if (!this.currentWorkingDealID) {
			console.error("screen-diplomacy-peace-deal: proposeCurrentDeal(): Trying to propose a deal with no valid currentWorkingDealID");
			return;
		}

		if (this.isNewDeal) {
			Game.DiplomacyDeals.sendWorkingDeal(this.currentWorkingDealID, DiplomacyDealProposalActions.PROPOSED);
		} else {
			Game.DiplomacyDeals.sendWorkingDeal(this.currentWorkingDealID, DiplomacyDealProposalActions.ADJUSTED);
		}
		// If we sent this off to the AI, we are waiting for a return statement, and we don't want to close the session.
		this.isWaitingForStatement = this.isAI;
		this.closeCurrentDeal();
	}

	// Populate the working deal, with an optional request for inspecting to the AI
	private inspectCurrentDeal(isOtherPlayerHuman: boolean, dealElement?: HTMLElement) {
		if (!this.currentWorkingDealID) {
			console.error("screen-diplomacy-peace-deal: proposeCurrentDeal(): Trying to propose a deal with no valid currentWorkingDealID");
			return;
		}

		this.pendingDealAdditions.forEach(dealItem => {
			const workingDealItemID = Game.DiplomacyDeals.addItemToWorkingDeal(this.currentWorkingDealID!, dealItem);
			dealItem.id = workingDealItemID;
			if (dealElement) {
				dealElement.classList.add("bg-positive");
				dealElement.addEventListener("action-activate", () => { this.moveDealItem(dealItem, GameContext.localPlayerID, true, dealElement) });
			}
		});

		this.pendingDealRemovals.forEach(dealItem => {
			Game.DiplomacyDeals.removeItemFromWorkingDeal(this.currentWorkingDealID!, dealItem.id);
			if (dealElement) {
				dealItem.id = 0;
				dealElement.addEventListener("action-activate", () => { this.moveDealItem(dealItem, GameContext.localPlayerID, false, dealElement) });
			}
		});

		// If the other player is not human, we send something off for the AI to give us immediate feedback
		if (isOtherPlayerHuman == false) {
			if (this.isNewDeal) {
				Game.DiplomacyDeals.sendWorkingDeal(this.currentWorkingDealID, DiplomacyDealProposalActions.INSPECT);
			} else {
				Game.DiplomacyDeals.sendWorkingDeal(this.currentWorkingDealID, DiplomacyDealProposalActions.INSPECT);
			}
		}
	}


	private acceptDeal() {
		if (!this.currentWorkingDealID) {
			console.error("screen-diplomacy-peace-deal: acceptDeal(): Trying to propose a deal with no valid currentWorkingDealID");
			return;
		}

		if (this.pendingDealAdditions.length > 0 || this.pendingDealRemovals.length > 0) {
			this.proposeCurrentDeal();
			return;
		}
		Game.DiplomacyDeals.sendWorkingDeal(this.currentWorkingDealID, DiplomacyDealProposalActions.ACCEPTED);
		this.closeCurrentDeal();
	}

	private rejectDeal() {
		if (!this.currentWorkingDealID) {
			console.error("screen-diplomacy-peace-deal: rejectDeal(): Trying to propose a deal with no valid currentWorkingDealID");
			return;
		}
		Game.DiplomacyDeals.sendWorkingDeal(this.currentWorkingDealID, DiplomacyDealProposalActions.REJECTED);

		if (Configuration.getXR()) {
			// Currently, the AI doesn't handle rejection (23/08/2023).
			// As a result, no Diplomacy event will be triggered for BE. 
			// Therefore call BE to transit back to the game instead.
			XR.Gameplay.transitBackToGame();
		}

		this.closeCurrentDeal();
	}

	private cancelDeal() {
		if (!this.currentWorkingDealID) {
			console.error("screen-diplomacy-peace-deal: cancelDeal(): Trying to cancel a deal with no valid currentWorkingDealID");
			return;
		}

		//Clear out any changes to the working deal if it was a new deal, otherwise let the player come back to it
		if (this.isNewDeal) {
			Game.DiplomacyDeals.clearWorkingDeal(this.currentWorkingDealID);
			this.closeCurrentDeal();
		}
	}

	private closeDealWithoutResponse() {
		/// make sure this is not a new deal and that it came from AI
		const otherPlayerID = DiplomacyManager.currentDiplomacyDealData ? DiplomacyManager.currentDiplomacyDealData.OtherPlayer : DiplomacyManager.selectedPlayerID;
		const otherPlayerLibrary: PlayerLibrary | null = Players.get(otherPlayerID);
		const isOtherPlayerHuman = otherPlayerLibrary?.isHuman;
		if (!this.isNewDeal && !isOtherPlayerHuman) {
			DialogManager.createDialog_ConfirmCancel({
				body: "LOC_DIPLOMACY_PEACE_DEAL_CLOSE_WILL_REJECT",
				title: "LOC_DIPLOMACY_CLOSE_PEACE_DEAL",
				callback: (eAction: DialogBoxAction) => {
					if (eAction == DialogBoxAction.Confirm) {
						this.closeCurrentDeal();
					}
				},
				canClose: false
			});
		}
		else {
			this.closeCurrentDeal();
		}
	}

	private closeCurrentDeal() {
		if (this.dealSessionID) {
			DiplomacyManager.closeCurrentDiplomacyDeal(this.isWaitingForStatement == false, this.dealSessionID);
		}
		else {
			DiplomacyManager.closeCurrentDiplomacyDeal(this.isWaitingForStatement == false);
		}
		if (this.isNewDeal) {
			InterfaceMode.switchTo("INTERFACEMODE_DIPLOMACY_HUB");
		}
		else {
			InterfaceMode.switchTo("INTERFACEMODE_DEFAULT");

		}
	}


	private onInterfaceModeChanged() {
		if (this.checkShouldShowPanel()) {
			this.queueUpdate();
		}
	}

	private moveDealItem(dealItem: DiplomacyDealItem, dealOwner: PlayerId, inDeal: boolean, target: HTMLElement): void {
		if (!dealItem.cityId) {
			console.error("panel-diplomacy-peace-deal: No cityID attached to dealItem!")
			return;
		}

		const city: City | null = Cities.get(dealItem.cityId);
		if (!city) {
			console.error("panel-diplomacy-peace-deal: Unable to get city from cityID attached to dealITem!")
			return;
		}

		if (inDeal) {
			const dealItemIndex = this.pendingDealAdditions.indexOf(dealItem);
			if (dealItemIndex > -1) {
				this.pendingDealAdditions.splice(dealItemIndex, 1);
			} else {
				this.pendingDealRemovals.push(dealItem);
			}


		} else {
			const dealItemIndex = this.pendingDealRemovals.indexOf(dealItem);
			if (dealItemIndex > -1) {
				this.pendingDealRemovals.splice(dealItemIndex, 1);
			} else {
				this.pendingDealAdditions.push(dealItem);
			}
		}

		let targetContainer: HTMLElement | null = null;
		let dealType: DiplomacyDealItemCityTransferTypes = DiplomacyDealItemCityTransferTypes.NONE;
		let newDealOwner: PlayerId = PlayerIds.NO_PLAYER;

		const otherPlayerID = DiplomacyManager.currentDiplomacyDealData ? DiplomacyManager.currentDiplomacyDealData.OtherPlayer : DiplomacyManager.selectedPlayerID;

		if (dealOwner == GameContext.localPlayerID) {
			if (city.owner == GameContext.localPlayerID) {
				targetContainer = this.theirYourDealItemsContainer;
				if (city.originalOwner != otherPlayerID) {
					dealType = DiplomacyDealItemCityTransferTypes.OFFER
				} else {
					dealType = DiplomacyDealItemCityTransferTypes.CEDE_OCCUPIED;
				}
			} else {
				targetContainer = this.theirTheirDealItemsContainer;
				if (city.originalOwner != GameContext.localPlayerID) {
					dealType = DiplomacyDealItemCityTransferTypes.NONE;
				} else {
					dealType = DiplomacyDealItemCityTransferTypes.OFFER;
				}
			}
			newDealOwner = otherPlayerID;
		} else {
			if (city.owner == GameContext.localPlayerID) {
				targetContainer = this.ourYourDealItemsContainer;
				if (city.originalOwner != otherPlayerID) {
					dealType = DiplomacyDealItemCityTransferTypes.NONE;
				} else {
					dealType = DiplomacyDealItemCityTransferTypes.OFFER;
				}
			} else {
				targetContainer = this.ourTheirDealItemsContainer;
				if (city.originalOwner != GameContext.localPlayerID) {
					dealType = DiplomacyDealItemCityTransferTypes.OFFER;
				} else {
					dealType = DiplomacyDealItemCityTransferTypes.CEDE_OCCUPIED;
				}
			}
			newDealOwner = GameContext.localPlayerID;
		}

		target.parentElement?.removeChild(target);

		let isFocusSet: boolean = false;
		//No siblings to focus! See if there are any children to focus in the other deal item container
		if (dealOwner == GameContext.localPlayerID) {
			if (target.parentElement != this.localPlayerDealContainer && this.peaceDealNavigationContainer && this.peaceDealNavigationContainer.childElementCount > 0) {
				FocusManager.setFocus(this.peaceDealNavigationContainer);
				isFocusSet = true;
			}
		} else {
			if (target.parentElement != this.otherPlayerDealContainer && this.peaceDealNavigationContainer && this.peaceDealNavigationContainer.childElementCount > 0) {
				FocusManager.setFocus(this.peaceDealNavigationContainer);
				isFocusSet = true;
			}
		}

		const dealItemElement = this.createCityDealItem(city, dealType);
		dealItemElement.addEventListener("action-activate", () => { this.moveDealItem(dealItem, newDealOwner, !inDeal, dealItemElement) });
		if (targetContainer?.hasChildNodes()) {
			//We want the most recently moved items at the top of the lists
			targetContainer?.insertBefore(dealItemElement, targetContainer?.firstChild);
		} else {
			targetContainer?.appendChild(dealItemElement);
		}

		if (!isFocusSet) {
			//Focus was not able to be set to any siblings, initialize focus to focus the first element on the other side of the deal
			this.realizeInitialFocus();
		}

		this.updateButtonStates();
		const otherPlayerLibrary: PlayerLibrary | null = Players.get(otherPlayerID);
		const isOtherPlayerHuman = (otherPlayerLibrary ? otherPlayerLibrary.isHuman : false);
		this.inspectCurrentDeal(isOtherPlayerHuman, target);
		this.dealHasBeenModified = true;

		// check to make sure our middle sections aren't empty
		if (!this.ourTheirDealItemsContainer?.hasChildNodes()) {
			this.localPlayerReceivesTitleWrapper?.classList.add("hidden");
		}
		else {
			this.localPlayerReceivesTitleWrapper?.classList.remove("hidden");
		}
		if (!this.theirYourDealItemsContainer?.hasChildNodes()) {
			this.otherPlayerReceivesTitleWrapper?.classList.add("hidden");
		}
		else {
			this.otherPlayerReceivesTitleWrapper?.classList.remove("hidden");
		}
	}

	private panToCity(location: float2) {
		Camera.lookAtPlot(location, { zoom: 0.8 });
	}

	private updateButtonStates() {
		if (this.pendingDealAdditions.length <= 0 && this.pendingDealRemovals.length <= 0) {
			if (!this.isNewDeal && this.currentWorkingDealID?.direction != DiplomacyDealDirection.OUTGOING) {
				this.proposeButton?.setAttribute("caption", Locale.compose("LOC_DIPLOMACY_DEAL_ACCEPT"));
				const inspectWrapper = MustGetElement(".panel-diplomacy-peace-deal__inspect-wrapper", this.Root);
				inspectWrapper.innerHTML = "";
			}
		} else {
			if (!this.isNewDeal) {
				this.proposeButton?.setAttribute("caption", Locale.compose("LOC_DIPLOMACY_DEAL_PROPOSE"));
			}
		}
	}

	private clickProposeButton() {
		if (this.proposeButton?.classList.contains("disabled")) {
			return;
		}
		this.proposeButton?.classList.add("disabled");
		this.rejectButton?.classList.add("disabled");
		if (this.isNewDeal || this.dealHasBeenModified) {
			//  Make sure AGREEMENTS>MAKE_PEACE is the last item.
			const workingDeal: DiplomacyDeal | null = Game.DiplomacyDeals.getWorkingDeal(this.currentWorkingDealID!);
			workingDeal?.itemIds.forEach(itemID => {
				const dealItem: DiplomacyDealItem | null = Game.DiplomacyDeals.getWorkingDealItem(this.currentWorkingDealID!, itemID);
				if (dealItem) {
					if ((dealItem.type == DiplomacyDealItemTypes.AGREEMENTS) && (dealItem.subType == DiplomacyDealItemAgreementTypes.MAKE_PEACE)) {
						Game.DiplomacyDeals.removeItemFromWorkingDeal(this.currentWorkingDealID!, dealItem.id);

						const initialPeaceDealItem: object = {
							type: DiplomacyDealItemTypes.AGREEMENTS,
							agreementType: DiplomacyDealItemAgreementTypes.MAKE_PEACE
						}

						//Add an initial item that just has the agreement type
						Game.DiplomacyDeals.addItemToWorkingDeal(this.currentWorkingDealID!, initialPeaceDealItem);
					}
				}
			});

			this.proposeCurrentDeal();
		} else {
			this.acceptDeal();
		}
	}

	private clickRejectButton() {
		if (this.rejectButton?.classList.contains("disabled")) {
			return;
		}
		this.proposeButton?.classList.add("disabled");
		this.rejectButton?.classList.add("disabled");
		if (this.isNewDeal) {
			this.cancelDeal();
		} else {
			this.rejectDeal();
		}
	}

	private realizeInitialFocus() {
		const localPlayerDealContainer: HTMLElement | null = this.Root.querySelector(".local-player-deal-container");
		if (!localPlayerDealContainer) {
			console.error("panel-diplomacy-peace-deal: Unable to find element with class: local-player-deal-container during initial focus!");
			return;
		}

		const otherPlayerDealContainer: HTMLElement | null = this.Root.querySelector(".other-player-deal-container");
		if (!otherPlayerDealContainer) {
			console.error("panel-diplomacy-peace-deal: Unable to find element with class: other-player-deal-container during initial focus");
			return;
		}

		const buttonContainer: HTMLElement | null = this.Root.querySelector(".peace-deal__button-container");
		if (!buttonContainer) {
			console.error("panel-diplomacy-peace-deal: Unable to find element with class: peace-deal__button-container during initial focus");
			return;
		}

		if ((this.ourYourDealItemsContainer && this.ourYourDealItemsContainer.childElementCount > 0)) {
			FocusManager.setFocus(localPlayerDealContainer);
		} else if ((this.theirTheirDealItemsContainer && this.theirTheirDealItemsContainer.childElementCount > 0)) {
			FocusManager.setFocus(otherPlayerDealContainer);
		} else {
			FocusManager.setFocus(buttonContainer);
		}

		// Need to remove the navtray Back prompt
		NavTray.clear();
	}

	private showLeaderModel(): void {
		const otherPlayerID: PlayerId = DiplomacyManager.currentDiplomacyDealData ? DiplomacyManager.currentDiplomacyDealData.OtherPlayer : DiplomacyManager.selectedPlayerID;
		const playerEntry: PlayerLibrary | null = Players.get(otherPlayerID);
		if (playerEntry == null) {
			console.error("Player is not valid, not displaying a 3d model")
			return;
		}
		else {
			if (!this.isNewDeal) {
				LeaderModelManager.showRightLeaderModel(otherPlayerID);
			}
		}
	}

	handleInput(inputEvent: InputEngineEvent) {
		if (!InterfaceMode.isInInterfaceMode("INTERFACEMODE_PEACE_DEAL") || ContextManager.getCurrentTarget()) {
			return true;
		}

		const inputEventName = inputEvent.detail.name;
		switch (inputEventName) {
			case 'cancel':
				this.closeButton?.dispatchEvent(new CustomEvent("action-activate"));
				return false;
			case 'shell-action-1':
				this.proposeButton?.dispatchEvent(new CustomEvent("action-activate"));
				return false;
			case 'keyboard-escape':
			case 'mousebutton-right':
				if (ContextManager.getCurrentTarget()) {
					//don't exit if we right click to exit a screen created by this panel
					return false;
				}
				this.closeButton?.dispatchEvent(new CustomEvent("action-activate"));
				return false;
			case 'shell-action-2':
				if (FocusManager.getFocus() && FocusManager.getFocus().hasAttribute("city-location-x")) {
					const locationXString: string | null = FocusManager.getFocus().getAttribute("city-location-x");
					const locationYString: string | null = FocusManager.getFocus().getAttribute("city-location-y");
					if (!locationXString || !locationYString) {
						console.error("panel-diplomacy-peace-deal: Unable to get a valid location for focused cityDealItemElement!");
						return false;
					}
					const location: float2 = { x: parseFloat(locationXString), y: parseFloat(locationYString) };
					this.panToCity(location);
				}
				return false;
		}

		return true;
	}
}

Controls.define('panel-diplomacy-peace-deal', {
	createInstance: DiplomacyPeaceDealPanel,
	description: 'Area for modifying and sending peace deals',
	styles: ['fs://game/base-standard/ui/diplomacy-peace-deal/panel-diplomacy-peace-deal.css'],
	content: ['fs://game/base-standard/ui/diplomacy-peace-deal/panel-diplomacy-peace-deal.html'],
	classNames: ['panel-diplomacy-peace-deal', 'trigger-nav-help']
});
