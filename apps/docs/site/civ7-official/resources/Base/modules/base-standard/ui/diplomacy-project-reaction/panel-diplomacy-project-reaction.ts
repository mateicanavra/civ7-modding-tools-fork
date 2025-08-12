/**
* @file panel-diplomacy-project-reaction.ts
* @copyright 2023-2025, Firaxis Games
* @description Handles player's response to incoming diplomacy actions
*/

import { AnchorType } from '/core/ui/panel-support.js';
import DialogManager, { DialogBoxAction, DialogBoxCallbackSignature } from '/core/ui/dialog-box/manager-dialog-box.js'
import DiplomacyManager, { DiplomacyInputPanel } from '/base-standard/ui/diplomacy/diplomacy-manager.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import LeaderModelManager from '/base-standard/ui/diplomacy/leader-model-manager.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js'
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import { InputEngineEvent } from '/core/ui/input/input-support.js';
import { DisplayQueueManager } from '/core/ui/context-manager/display-queue-manager.js';


class DiplomacyProjectReactionPanel extends DiplomacyInputPanel {
	private firstMeetOpenReactionsListener = this.onFirstMeetOpenReactions.bind(this);
	private diplomacyEventResponseListener = this.onDiploEventResponse.bind(this);
	private diplomacyDialogUpdateResponseListener = this.hideShowDialog.bind(this);
	private viewReceiveFocusListener = this.onViewReceiveFocus.bind(this);
	private interfaceModeChangedListener = this.onInterfaceModeChanged.bind(this);

	private responseButtons: HTMLElement[] = [];
	private dialogHide: HTMLElement | null = null;
	private containerHide: HTMLElement | null = null;
	private panelHide: HTMLElement | null = null;
	private influenceContainer: HTMLElement | null = null;
	private influenceDiplomacyBalanceContainer: HTMLElement | null = null;
	private influenceContainerImg: HTMLElement | null = null;
	private diploEventResponseTimeoutCallback: number = 0;

	constructor(root: ComponentRoot) {
		super(root);
		this.animateInType = this.animateOutType = AnchorType.RelativeToBottom;
	}
	//#region Bindings
	onAttach(): void {
		this.Root.listenForEngineEvent('LocalPlayerTurnEnd', this.onLocalPlayerTurnEnd, this);
		this.Root.listenForWindowEvent("diplomacy-first-meet-open-reactions", this.firstMeetOpenReactionsListener);
		this.Root.listenForWindowEvent("diplomacy-dialog-update-response", this.diplomacyDialogUpdateResponseListener);
		this.Root.listenForWindowEvent('interface-mode-changed', this.interfaceModeChangedListener);
		this.Root.addEventListener('view-receive-focus', this.viewReceiveFocusListener);

		const closeButton = document.createElement('fxs-close-button');
		closeButton.classList.add("t-0", "r-0");
		closeButton.addEventListener('action-activate', () => {
			this.close();
		});

		const panelDiplomacyMainContainer = MustGetElement(".panel-diplomacy-project-reaction__main-container", this.Root)

		panelDiplomacyMainContainer.appendChild(closeButton);
		closeButton.classList.add("self-end", "relative");

		const projectDetailsContainer = document.createElement("div");
		projectDetailsContainer.classList.add("panel-diplomacy-project-reaction__project-details-container", "h-20", "w-full", "pt-1", "pb-24", "flex", "flex-col", "self-center", "text-center");

		panelDiplomacyMainContainer.appendChild(projectDetailsContainer);

		const projectName = document.createElement("fxs-header");
		projectName.classList.add("panel-diplomacy-project-reaction__project-name", "px-10", "font-title", "uppercase", "text-lg", "mt-2", "mb-0\\.5", "text-center");
		projectName.setAttribute('filigree-style', 'h4');
		projectDetailsContainer.appendChild(projectName);

		const responseContainer = document.createElement("fxs-hslot");
		responseContainer.classList.add("panel-diplomacy-project-reaction__response-container", "min-h-60", "w-full", "flow-row", "justify-around", "pb-5");

		panelDiplomacyMainContainer.appendChild(responseContainer);

		this.dialogHide = MustGetElement(".panel-diplomacy-project-reaction__project-dialog-container", this.Root);
		this.containerHide = MustGetElement(".panel-diplomacy-project-reaction__main-container", this.Root);

		if (!this.checkShouldShowPanel()) {
			return;
		}

		if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_PROJECT_REACTION")) {
			const influenceContainer = document.createElement("div");
			influenceContainer.classList.add("panel-diplomacy-project-reaction__influence-container", "w-auto", "flow-row", "px-10", "font-title", "uppercase", "text-xs", "text-primary-1", "tracking-150", "my-2", "text-center", "self-center");
			projectDetailsContainer.appendChild(influenceContainer);

			this.Root.listenForEngineEvent("DiplomacyEventResponse", this.diplomacyEventResponseListener);
			this.populateProjectResponses();
		} else {
			this.populateCallToArmsOptions();
		}

		this.populateNavtray();
	}

	onDetach(): void {
		this.Root.removeEventListener('view-receive-focus', this.viewReceiveFocusListener);

		if (this.diploEventResponseTimeoutCallback != 0) {
			clearTimeout(this.diploEventResponseTimeoutCallback);
		}
	}

	private onViewReceiveFocus() {
		FocusManager.setFocus(MustGetElement(".panel-diplomacy-project-reaction__response-container", this.Root));
	}

	//#endregion
	//#region Populate Project Responses
	private populateProjectResponses() {
		this.panelHide = MustGetElement(".panel-diplomacy-project-reaction__main-container", this.Root);
		this.dialogHide = MustGetElement(".panel-diplomacy-project-reaction__project-dialog-container", this.Root);
		this.panelHide.classList.remove("hidden");
		this.dialogHide.classList.remove("hidden");

		this.responseButtons = [];

		if (!DiplomacyManager.currentProjectReactionData) {
			console.error("panel-diplomacy-project-reaction: Attempting to populate project responses but there is no valid DiplomaticResponseUIData!");
			this.close();
			return;
		}

		const localPlayerInfluence: PlayerDiplomacyTreasury | undefined = Players.get(GameContext.localPlayerID)?.DiplomacyTreasury;
		if (!localPlayerInfluence) {
			console.error("panel-diplomacy-project-reaction: Unable to get PlayerDiplomacyTreasury object for local player!");
			return;
		}


		const projectName = MustGetElement(".panel-diplomacy-project-reaction__project-name", this.Root);
		projectName.setAttribute('title', DiplomacyManager.currentProjectReactionData.titleString);

		const initialPlayerName: string | undefined = Players.get(DiplomacyManager.currentProjectReactionData.initialPlayer)?.name;
		if (!initialPlayerName) {
			console.error("panel-diplomacy-project-reaction: Unable to get the name for leader with ID: " + DiplomacyManager.currentProjectReactionData.initialPlayer);
			return;
		}

		const projectLeaderNameContainer = MustGetElement(".panel-diplomacy-project-reaction_project-dialog-leader", this.Root);
		projectLeaderNameContainer.setAttribute('data-l10n-id', initialPlayerName);

		const projectDialogContainer = MustGetElement(".panel-diplomacy-project-reaction__project-dialog-info", this.Root);
		if (DiplomacyManager.currentProjectReactionData.requestString) {
			projectDialogContainer.innerHTML = Locale.stylize(DiplomacyManager.currentProjectReactionData.requestString, initialPlayerName);
		} else {
			projectDialogContainer.innerHTML = Locale.stylize(DiplomacyManager.currentProjectReactionData.descriptionString);
		}

		const responseContainer = MustGetElement(".panel-diplomacy-project-reaction__response-container", this.Root);
		DiplomacyManager.currentProjectReactionData.responseList.forEach(response => {
			responseContainer.appendChild(this.createResponseItem(response, DiplomacyManager.currentProjectReactionData!.actionID));
		});

		const firstSlot = MustGetElement(".panel-diplomacy-project-reaction__response-item", responseContainer);
		FocusManager.setFocus(firstSlot);


		LeaderModelManager.showLeaderModels(GameContext.localPlayerID, DiplomacyManager.currentProjectReactionData.initialPlayer);
	}
	//#endregion
	//#region RESPONSE ITEM
	private createResponseItem(responseData: DiplomaticResponseData, actionID: number) {
		const responseItem = document.createElement("fxs-vslot");
		responseItem.classList.add("panel-diplomacy-project-reaction__response-item", "h-full", "flex", "w-56", "mx-12", "flex", "flex-col", "self-center");
		responseItem.setAttribute("data-audio-group-ref", "audio-diplo-project-reaction");

		const responseButton = document.createElement("fxs-activatable");
		responseButton.setAttribute("action-key", "inline-accept");
		responseButton.setAttribute("nav-help-side-reversed", "true");
		responseButton.setAttribute("tabindex", "-1");
		responseButton.setAttribute("data-audio-group-ref", "audio-diplo-project-reaction");
		responseButton.classList.add("panel-diplomacy-project-reaction__response-item-bg", "z-0", "relative", "flex", "flex-col", "justify-start", "grow", "min-h-56", "w-full", "text-sm", "pb-3", "group-focus\\:opacity-0", "group-hover\\:opacity-0", "group-active\\:opacity-0", "group");

		const hoveredResponseButtonBg = document.createElement("div");
		hoveredResponseButtonBg.classList.add("panel-diplomacy-project-reaction__response-item-hovered", "-z-1", "absolute", "inset-0", "flex", "flex-col", "justify-start", "min-h-56", "w-full", "grow", "text-sm", "pb-3", "opacity-0", "-mt-0\\.5", "group-focus\\:opacity-100", "group-hover\\:opacity-100", "group-active\\:opacity-100", "transition-opacity");

		const cardTopWrapper = document.createElement("div");
		cardTopWrapper.classList.add("flex", "flex-row");

		const responseDescription: HTMLElement = document.createElement("div");
		responseDescription.classList.add("panel-diplomacy-project-reaction__response-description", "grow", "min-h-36", "w-full", "font-body", "text-xs", "mb-2", "px-3", "self-center", "text-center", "break-words");

		const relationshipIcon = document.createElement("div");
		relationshipIcon.classList.add("relative", "flex", "flex-row");

		if (responseData.responseName == Locale.compose("LOC_DIPLOMACY_RESPONSE_SUPPORT")) {
			relationshipIcon.classList.add("panel-diplomacy-project-reaction__pos-influence", "panel-diplomacy-project-reaction__influence", "-mt-3", "bg-cover");
			responseButton.setAttribute("data-audio-activate-ref", "data-audio-leader-response-positive");

		}
		else if (responseData.responseName == Locale.compose("LOC_DIPLOMACY_RESPONSE_ACCEPT")) {
			relationshipIcon.classList.add("panel-diplomacy-project-reaction__accept-influence", "-mt-2", "size-13", "bg-cover");
			responseButton.setAttribute("data-audio-activate-ref", "data-audio-leader-response-neutral");

		}
		else {
			relationshipIcon.classList.add("panel-diplomacy-project-reaction__neg-influence", "panel-diplomacy-project-reaction__influence", "-mt-3", "bg-cover");
			responseButton.setAttribute("data-audio-activate-ref", "data-audio-leader-response-negative");
		}

		cardTopWrapper.appendChild(relationshipIcon);

		const responseTitle = document.createElement("div");
		responseTitle.classList.add("panel-diplomacy-project-reaction__card-title", "font-title", "text-xs", "text-secondary", "uppercase", "pb-2", "mt-1", "w-52", "text-center", "tracking-150", "-ml-3");
		responseTitle.setAttribute("data-l10n-id", responseData.responseName);
		cardTopWrapper.appendChild(responseTitle);
		responseButton.appendChild(cardTopWrapper);

		const responseText = document.createElement("div");
		responseText.classList.add('flex', 'flex-col', 'text-center', 'w-52');
		responseText.setAttribute("data-l10n-id", responseData.responseDescription);
		responseDescription.appendChild(responseText);

		responseButton.appendChild(responseDescription);

		const costWrapper = document.createElement("div");
		costWrapper.classList.add("flow-row", "grow", "justify-end", "mt-4");

		const influenceIconWrapper = document.createElement("div");
		influenceIconWrapper.classList.add("self-end");
		const influenceIcon = document.createElement("img");
		influenceIcon.classList.add("w-8", "h-8");
		influenceIcon.src = "fs://game/yield_influence";
		influenceIconWrapper.appendChild(influenceIcon);
		costWrapper.appendChild(influenceIconWrapper);

		const costDescription = document.createElement("div");
		costDescription.setAttribute("data-l10n-id", responseData.cost.toLocaleString());
		costDescription.classList.add("self-end", "mb-1");
		costWrapper.appendChild(costDescription);

		responseDescription.appendChild(costWrapper);

		responseButton.classList.add("font-title", "text-sm");
		hoveredResponseButtonBg.classList.add("font-title", "text-sm");



		const args = {
			ID: DiplomacyManager.currentProjectReactionData?.actionID,
			Type: responseData.responseType
		}
		const result: OperationResult = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.RESPOND_DIPLOMATIC_ACTION, args, false);

		if (!result.Success) {
			responseButton.setAttribute("disabled", "true");
			costDescription.classList.add("text-negative");
			if (result.FailureReasons && result.FailureReasons.length > 0) {
				let failureTooltip: string = "";
				result.FailureReasons.forEach((reason, index) => {
					if (index > 0) {
						failureTooltip += Locale.stylize("[N]");
					}
					failureTooltip += Locale.compose(reason);
				});
				responseButton.setAttribute("data-tooltip-content", failureTooltip);
			}
		} else {
			responseButton.addEventListener("action-activate", () => {
				const actionData: DiplomaticEventHeader = Game.Diplomacy.getDiplomaticEventData(actionID);
				if (actionData.actionType == DiplomacyActionTypes.DIPLOMACY_ACTION_DENOUNCE_MILITARY_PRESENCE && responseData.responseType == DiplomaticResponseTypes.DIPLOMACY_RESPONSE_REJECT) {

					//DENOUNCE MILITARY PRESENCE REJECTION. If we are rejecting the DIPLOMACY_ACTION_DENOUNCE_MILITARY_PRESENCE, the player must go to war with the initiator
					const playerDiplomacy: PlayerDiplomacy | undefined = Players.get(GameContext.localPlayerID)?.Diplomacy;
					if (playerDiplomacy == undefined) {
						console.error("diplomacy-manager: Attempting to raise war type popup, but no valid player diplomacy library!");
						return;
					}
					const surpriseWarCallback: DialogBoxCallbackSignature = (eAction: DialogBoxAction) => {
						if (eAction == DialogBoxAction.Confirm) {
							Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.RESPOND_DIPLOMATIC_ACTION, args);
							DiplomacyManager.confirmDeclareWar(actionData.initialPlayer, DiplomacyActionTypes.DIPLOMACY_ACTION_DECLARE_WAR);
							this.close();
						}
					};
					const formalWarCallback: DialogBoxCallbackSignature = (eAction: DialogBoxAction) => {
						if (eAction == DialogBoxAction.Confirm) {
							Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.RESPOND_DIPLOMATIC_ACTION, args);
							DiplomacyManager.confirmDeclareWar(actionData.initialPlayer, DiplomacyActionTypes.DIPLOMACY_ACTION_DECLARE_FORMAL_WAR);
							this.close();
						}
					};

					const surpriseWarResults: DiplomacyQueryResult = playerDiplomacy.canDeclareWarOn(actionData.initialPlayer);
					const formalWarResults: DiplomacyQueryResult = playerDiplomacy.canDeclareWarOn(actionData.initialPlayer, WarTypes.FORMAL_WAR);

					//  Currently has changed to no Influence Cost for Formal Wars.  
					//  const formalWarCost: number = Game.Diplomacy.getInfluenceForBaseAction(DiplomacyActionTypes.DIPLOMACY_ACTION_DECLARE_FORMAL_WAR, GameContext.localPlayerID, actionData.initialPlayer);

					let ourWarSupport: number = playerDiplomacy.getTotalWarSupportBonusForPlayer(actionData.initialPlayer, formalWarResults.Success);
					let theirWarSupport: number = playerDiplomacy.getTotalWarSupportBonusForTarget(actionData.initialPlayer, formalWarResults.Success);
					let theirInfluenceBonus: number = playerDiplomacy.getWarInfluenceBonusTarget(actionData.initialPlayer, formalWarResults.Success);
					//  This tooltip was being used if there was no error, but information has been moved into the body.
					//		let tooltipInfo: string = Locale.compose("LOC_DIPLOMACY_BONUS_WAR_SUPPORT", ourWarSupport, theirWarSupport, theirInfluenceBonus);

					// information for the custom pop-up
					const declareWarWrapper = document.createElement("fxs-vslot");
					const customContent = document.createElement("fxs-vslot");
					const customTitle = document.createElement("fxs-header");
					customTitle.setAttribute('filigree-style', 'small');
					customTitle.setAttribute("title", "LOC_DIPLOMACY_CONFIRM_DECLARE_WAR_TITLE");
					customTitle.classList.add("uppercase", "-mt-4", "panel-diplomacy-declare-war__custom-header");

					customTitle.classList.add("font-title", "text-lg", "tracking-100");
					// If it's going to be a formal war we'll use this text
					const customTextFormal = document.createElement("fxs-inner-frame");
					customTextFormal.classList.add("mt-4", "p-4", "items-start");
					customTextFormal.innerHTML = Locale.stylize("LOC_DIPLOMACY_PICK_WAR_TYPE_FORMAL_BODY", ourWarSupport, theirWarSupport, theirInfluenceBonus);

					// If it's going to be a surprise war we'll use this text
					const customTextSurprise = document.createElement("fxs-inner-frame");
					customTextSurprise.classList.add("mt-4", "p-4", "items-start");
					customTextSurprise.innerHTML = Locale.stylize("LOC_DIPLOMACY_PICK_WAR_TYPE_SURPRISE_BODY", ourWarSupport, theirWarSupport, theirInfluenceBonus);

					customContent.appendChild(customTitle);

					if (formalWarResults.Success == true) {
						customContent.appendChild(customTextFormal);
					}
					else {
						customContent.appendChild(customTextSurprise);
					}


					declareWarWrapper.appendChild(customContent);
					declareWarWrapper.classList.add("h-3\\/4", "pl-40", "relative");

					const declareWarImageWrapper = document.createElement("fxs-vslot");
					declareWarImageWrapper.classList.add("w-1\\/3", "-top-26", "-left-22", "absolute");
					const shieldImage = document.createElement("div");
					shieldImage.classList.add("screen-dialog-box__declare-war-shield-bg", "size-72", "bg-cover", "bg-no-repeat");
					declareWarImageWrapper.appendChild(shieldImage);


					// chooser items
					const chooserButton = document.createElement("chooser-item");
					chooserButton.classList.add("panel-diplomacy-declare-war__button-declare-war", "chooser-item_unlocked", "w-1\\/2", "min-h-16", "flow-row", "py-2", "items-center");
					chooserButton.classList.add('mr-4');

					chooserButton.setAttribute('disabled', 'false');
					if (formalWarResults.FailureReasons) {
						if (formalWarResults.FailureReasons[0] != "") {
							chooserButton.setAttribute("data-tooltip-content", formalWarResults.FailureReasons[0]);
						}
						else {
							chooserButton.setAttribute("data-tooltip-content", Locale.stylize("LOC_DIPLOMACY_BONUS_WAR_SUPPORT", ourWarSupport, theirWarSupport, theirInfluenceBonus));
						}
					}
					else {
						chooserButton.setAttribute("data-tooltip-content", Locale.stylize("LOC_DIPLOMACY_BONUS_WAR_SUPPORT", ourWarSupport, theirWarSupport, theirInfluenceBonus));
					}
					waitForLayout(() => chooserButton.removeAttribute("tabindex"));

					// set the button information
					const radialBG = document.createElement("div");
					radialBG.classList.add("panel-diplomacy-declare-war__radial-bg", "absolute", "inset-0", "bg-cover", "size-16", "group-focus\\:opacity-0", "group-hover\\:opacity-0", "group-active\\:opacity-0", "opacity-1");
					const radialBGHover = document.createElement("div");
					radialBGHover.classList.add("panel-diplomacy-declare-war__radial-bg-hover", "absolute", "inset-0", "opacity-0", "bg-cover", "size-16", "group-focus\\:opacity-100", "group-hover\\:opacity-100", "group-active\\:opacity-100");

					chooserButton.appendChild(radialBG);
					chooserButton.appendChild(radialBGHover);
					const declareWarIconWrapper = document.createElement("div");
					declareWarIconWrapper.classList.add("absolute", "size-16", "bg-cover", "panel-diplomacy-declare-war__war-icon-wrapper");
					const declareWarIcon = document.createElement("img");
					declareWarIcon.classList.add("flex", "mt-2", "ml-2", "size-12");
					if (formalWarResults.Success == true) {
						declareWarIcon.setAttribute("src", UI.getIconURL("DIPLOMACY_DECLARE_FORMAL_WAR_ICON"));
					}
					else {
						declareWarIcon.setAttribute("src", UI.getIconURL("DIPLOMACY_DECLARE_SURPRISE_WAR_ICON"));
					}
					declareWarIconWrapper.appendChild(declareWarIcon);
					chooserButton.appendChild(declareWarIconWrapper);
					const declareWarDescription = document.createElement("div");
					declareWarDescription.classList.add("absolute", "ml-18", "self-center", "font-title", "uppercase", "font-normal", "tracking-100");
					if (formalWarResults.Success == true) {
						declareWarDescription.setAttribute('data-l10n-id', "LOC_DIPLOMACY_FORMAL_WAR");
					}
					else {
						declareWarDescription.setAttribute('data-l10n-id', "LOC_DIPLOMACY_SURPRISE_WAR");
					}
					// add cost info here
					const warCostWrapper = document.createElement("div");
					warCostWrapper.classList.add("panel-diplomacy-declare-war__cost-wrapper", "text-xs", "font-body", "text-center", "flow-row", "self-center");
					const warCost = document.createElement("div");
					warCost.classList.value = "font-body self-center";
					warCost.setAttribute("data-l10n-id", "LOC_DIPLOMACY_WAR_COST");
					warCostWrapper.appendChild(warCost);
					const influenceIcon = document.createElement("img");
					influenceIcon.classList.add("size-8");
					influenceIcon.src = "fs://game/yield_influence";
					const influenceText = document.createElement("div");
					influenceText.classList.add("self-center", "normal-case");
					influenceText.innerHTML = Locale.stylize("LOC_DIPLOMACY_INFLUENCE");
					declareWarDescription.appendChild(warCostWrapper);
					warCostWrapper.appendChild(influenceIcon);
					warCostWrapper.appendChild(influenceText);
					// end info cost
					chooserButton.appendChild(declareWarDescription);

					if (formalWarResults.Success == true) {
						DialogManager.createDialog_CustomOptions({
							body: Locale.compose("LOC_DIPLOMACY_PICK_WAR_TYPE_FORMAL_BODY", ourWarSupport, theirWarSupport, theirInfluenceBonus),
							title: "LOC_DIPLOMACY_CONFIRM_DECLARE_WAR_TITLE",
							canClose: true,
							displayQueue: "DiplomacyDialog",
							custom: true,
							styles: true,
							name: "declare-war",
							options: [
								{
									actions: [],
									label: Locale.stylize("LOC_DIPLOMACY_FORMAL_WAR"),
									callback: formalWarCallback,
									disabled: !formalWarResults.Success,
									tooltip: (formalWarResults.FailureReasons != undefined && formalWarResults.FailureReasons.length > 0) ? formalWarResults.FailureReasons[0] : undefined
								}
							],
							customOptions: [
								{
									layoutBodyWrapper: declareWarWrapper,
									layoutImageWrapper: declareWarImageWrapper,
									useChooserItem: true,
									chooserInfo: chooserButton,
									cancelChooser: true
								}]
						});
					}
					else {

						DialogManager.createDialog_CustomOptions({
							body: Locale.compose("LOC_DIPLOMACY_PICK_WAR_TYPE_SURPRISE_BODY", ourWarSupport, theirWarSupport, theirInfluenceBonus),
							title: "LOC_DIPLOMACY_CONFIRM_DECLARE_WAR_TITLE",
							canClose: true,
							displayQueue: "DiplomacyDialog",
							custom: true,
							styles: true,
							name: "declare-war",
							options: [
								{
									actions: [],
									label: Locale.stylize("LOC_DIPLOMACY_SURPRISE_WAR"),
									callback: surpriseWarCallback,
									disabled: !surpriseWarResults.Success,
									tooltip: (surpriseWarResults.FailureReasons != undefined && surpriseWarResults.FailureReasons.length > 0) ? surpriseWarResults.FailureReasons[0] : undefined
								}
							],
							customOptions: [
								{
									layoutBodyWrapper: declareWarWrapper,
									layoutImageWrapper: declareWarImageWrapper,
									useChooserItem: true,
									chooserInfo: chooserButton,
									cancelChooser: true
								}]
						});
					}

					//--DENOUNCE MILITARY PRESENCE REJECTION.

				} else {
					this.responseButtons.forEach(button => {
						button.setAttribute("disabled", "true");
					});

					Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.RESPOND_DIPLOMATIC_ACTION, args);
					LeaderModelManager.beginAcknowledgePlayerSequence();

					this.hideShowDialog();



				}
			})
		}

		responseButton.appendChild(hoveredResponseButtonBg);

		responseItem.appendChild(responseButton);
		this.responseButtons.push(responseButton);

		return responseItem;
	}

	private hideShowDialog() {
		if (this.dialogHide) {
			this.dialogHide.classList.add("hidden");
		}
		else {
			console.error("panel-diplomacy-project-reaction: Unable to find element: dialogHide");
			return;
		}

		if (this.containerHide) {
			this.containerHide.classList.add("hidden");
		}
		else {
			console.error("panel-diplomacy-project-reaction: Unable to find element: containerHide");
			return;
		}
	}

	private showOtherLeaderReaction(responseType: DiplomaticResponseTypes | DiplomacyPlayerFirstMeets) {
		switch (responseType) {
			case DiplomaticResponseTypes.DIPLOMACY_RESPONSE_SUPPORT:
			case DiplomacyPlayerFirstMeets.PLAYER_REALATIONSHIP_FIRSTMEET_FRIENDLY:
				LeaderModelManager.beginAcknowledgePositiveOtherSequence();
				break;
			case DiplomaticResponseTypes.DIPLOMACY_RESPONSE_REJECT:
			case DiplomacyPlayerFirstMeets.PLAYER_REALATIONSHIP_FIRSTMEET_UNFRIENDLY:
				LeaderModelManager.beginAcknowledgeNegativeOtherSequence();
				break;
			default:
				LeaderModelManager.beginAcknowledgeOtherSequence();
				break;
		}
	}

	private checkShouldShowPanel() {
		if (!InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_PROJECT_REACTION") && !InterfaceMode.isInInterfaceMode("INTERFACEMODE_CALL_TO_ARMS")) {
			this.Root.classList.add("hidden");
			return false;
		}

		return true;
	}

	private onDiploEventResponse(eventData: DiplomacyEventResponse_EventData) {
		//TODO: investigate leader animation sequences
		const actionData = Game.Diplomacy.getDiplomaticEventData(eventData.actionID);
		this.diploEventResponseTimeoutCallback = setTimeout(() => {
			switch (eventData.response) {
				case DiplomaticResponseTypes.DIPLOMACY_RESPONSE_REJECT:
					LeaderModelManager.beginAcknowledgeNegativeOtherSequence();
					break;
				case DiplomaticResponseTypes.DIPLOMACY_RESPONSE_SUPPORT:
					LeaderModelManager.beginAcknowledgePositiveOtherSequence();
					break;
				default:
					if (actionData.actionGroup == DiplomacyActionGroups.DIPLOMACY_ACTION_GROUP_SANCTION) {
						LeaderModelManager.beginAcknowledgeNegativeOtherSequence();
					} else {
						LeaderModelManager.beginAcknowledgeOtherSequence();
					}
			}
			setTimeout(() => {
				this.close();
			}, 2000);
		}, 1000);
	}

	close() {
		if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_PROJECT_REACTION") || InterfaceMode.isInInterfaceMode("INTERFACEMODE_CALL_TO_ARMS")) {
			const closeToDiploHub = false;
			DiplomacyManager.closeCurrentDiplomacyProject(closeToDiploHub);
			LeaderModelManager.exitLeaderScene();
			InterfaceMode.switchToDefault();
		}
	}

	private populateNavtray() {
		NavTray.clear();
		NavTray.addOrUpdateGenericBack();
	}

	handleInput(inputEvent: InputEngineEvent): boolean {
		if (inputEvent.isCancelInput()) {
			this.close();
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
			return false;
		}
		return true;
	}

	//#region First Meet
	private onFirstMeetOpenReactions() {
		this.Root.classList.remove("hidden");
		this.panelHide = MustGetElement(".panel-diplomacy-project-reaction__main-container", this.Root);
		this.dialogHide = MustGetElement(".panel-diplomacy-project-reaction__project-dialog-container", this.Root);
		this.panelHide.classList.remove("hidden");
		this.dialogHide.classList.remove("hidden");

		const closeButton = this.Root.querySelector("fxs-close-button");

		if (closeButton) {
			this.panelHide.removeChild(closeButton);
		}

		if (!DiplomacyManager.currentDiplomacyDialogData) {
			console.error("panel-diplomacy-project-reaction: No valid dialog data!")
			return;
		}

		const localPlayerInfluence: PlayerDiplomacyTreasury | undefined = Players.get(GameContext.localPlayerID)?.DiplomacyTreasury;
		if (!localPlayerInfluence) {
			console.error("panel-diplomacy-project-reaction: Unable to get PlayerDiplomacyTreasury object for local player!");
			return;
		}

		const otherPlayer: PlayerLibrary | null = Players.get(DiplomacyManager.currentDiplomacyDialogData.OtherPlayerID);
		if (!otherPlayer) {
			console.error("panel-diplomacy-project-reaction: Unable to get library for other player in first meet!")
			return;
		}

		const projectName = MustGetElement(".panel-diplomacy-project-reaction__project-name", this.Root);
		projectName.setAttribute('title', "LOC_HISTORICAL_EVENT_FIRST_MEET");

		if (!document.querySelector(".panel-diplomacy-project-reaction__influence-container")) {
			this.influenceContainer = document.createElement("div");
			this.influenceContainer.classList.add("panel-diplomacy-project-reaction__influence-container", "w-auto", "flow-row", "px-10", "font-title", "uppercase", "text-xs", "text-primary-1", "tracking-150", "my-2", "text-center", "self-center");
		}
		else {
			this.influenceContainer = MustGetElement(".panel-diplomacy-project-reaction__influence-container", this.Root);
		}
		const firstMeetContainer = MustGetElement(".panel-diplomacy-project-reaction__main-container", this.Root)
		firstMeetContainer.appendChild(this.influenceContainer);

		if (!document.querySelector(".panel-diplomacy-project-reaction__influence-container-img")) {
			this.influenceContainerImg = document.createElement("img");
			this.influenceContainerImg.setAttribute("src", "fs://game/yield_influence_5.png");
			this.influenceContainerImg.classList.value = "size-7 panel-diplomacy-project-reaction__influence-container-img";
			this.influenceContainer.appendChild(this.influenceContainerImg);
		}

		if (!this.influenceDiplomacyBalanceContainer) {
			this.influenceDiplomacyBalanceContainer = document.createElement("div");
			this.influenceDiplomacyBalanceContainer.classList.value = "flow-row self-center panel-diplomacy-project-reaction__influence-balance-container";
			this.influenceDiplomacyBalanceContainer.textContent = Math.trunc(localPlayerInfluence.diplomacyBalance).toString();
			this.influenceContainer.appendChild(this.influenceDiplomacyBalanceContainer);
		}
		else {
			this.influenceDiplomacyBalanceContainer.textContent = Math.trunc(localPlayerInfluence.diplomacyBalance).toString();
		}

		const projectLeaderNameContainer = MustGetElement(".panel-diplomacy-project-reaction_project-dialog-leader", this.Root);
		projectLeaderNameContainer.setAttribute("data-l10n-id", otherPlayer.name);

		const projectDescription = MustGetElement(".panel-diplomacy-project-reaction__project-dialog-info", this.Root);
		projectDescription.innerHTML = Locale.stylize(DiplomacyManager.currentDiplomacyDialogData.Message);

		const responseContainer = MustGetElement(".panel-diplomacy-project-reaction__response-container", this.Root);
		if (responseContainer.innerHTML != "") {
			responseContainer.innerHTML = "";
		}

		responseContainer.appendChild(this.createFirstMeetGreetingButton(DiplomacyPlayerFirstMeets.PLAYER_REALATIONSHIP_FIRSTMEET_FRIENDLY));
		responseContainer.appendChild(this.createFirstMeetGreetingButton(DiplomacyPlayerFirstMeets.PLAYER_REALATIONSHIP_FIRSTMEET_NEUTRAL));
		responseContainer.appendChild(this.createFirstMeetGreetingButton(DiplomacyPlayerFirstMeets.PLAYER_REALATIONSHIP_FIRSTMEET_UNFRIENDLY));

		const firstSlot = MustGetElement(".panel-diplomacy-project-reaction__response-item", responseContainer);
		FocusManager.setFocus(firstSlot);
	}

	private createFirstMeetGreetingButton(greetingType: DiplomacyPlayerFirstMeets): HTMLElement {
		const costAndRelationship: number[] = Game.Diplomacy.getFirstMeetResponseCostAndRelDelta(greetingType);
		const costString: string = costAndRelationship[0].toString();
		const relationShipDeltaString: string = costAndRelationship[1].toString();

		const responseItem = document.createElement("fxs-vslot");
		responseItem.classList.add("panel-diplomacy-project-reaction__response-item", "h-full", "w-56", "mx-12", "flex", "flex-col", "self-center", "mx-0");
		responseItem.setAttribute("tabindex", "-1");

		const responseButton = document.createElement("fxs-activatable");
		responseButton.setAttribute("action-key", "inline-accept");
		responseButton.setAttribute("nav-help-side-reversed", "true");
		responseButton.setAttribute("tabindex", "-1");
		responseButton.classList.add("panel-diplomacy-project-reaction__response-item-bg", "z-0", "relative", "flex", "flex-col", "justify-start", "grow", "min-h-56", "w-full", "text-sm", "pb-3", "group-focus\\:opacity-0", "group-hover\\:opacity-0", "group-active\\:opacity-0", "group");
		responseButton.setAttribute("data-audio-group-ref", "audio-diplo-project-reaction");

		const hoveredResponseButtonBg = document.createElement("div");
		hoveredResponseButtonBg.setAttribute("tabindex", "-1");
		hoveredResponseButtonBg.classList.add("panel-diplomacy-project-reaction__response-item-hovered", "-z-1", "absolute", "inset-0", "flex", "flex-col", "justify-start", "min-h-56", "w-full", "grow", "text-sm", "pb-3", "opacity-0", "-mt-0\\.5", "group-focus\\:opacity-100", "group-hover\\:opacity-100", "group-active\\:opacity-100", "transition-opacity");

		const cardTopWrapper = document.createElement("div");
		cardTopWrapper.classList.add("flow-row");

		const relationshipIcon = document.createElement("div");
		relationshipIcon.classList.add("relative", "flow-row");
		const responseCostWrapper = document.createElement("div");
		responseCostWrapper.classList.add("panel-diplomacy-project-reaction__card-header", "relative", "text-xs", "font-body", "ml-6", "-mt-4", "text-center", "flow-row", "self-center");
		responseCostWrapper.setAttribute("font-fit-mode", "shrink");
		const influenceIcon = document.createElement("img");
		influenceIcon.classList.add("size-8");
		influenceIcon.src = "fs://game/yield_influence_5";
		const influenceText = document.createElement("div");
		influenceText.classList.add("self-center");
		influenceText.innerHTML = Locale.stylize("LOC_DIPLOMACY_INFLUENCE");

		const args = {
			Player1: GameContext.localPlayerID,
			Player2: DiplomacyManager.currentDiplomacyDialogData?.OtherPlayerID,
			Type: greetingType
		}
		const result: OperationResult = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.RESPOND_DIPLOMATIC_FIRST_MEET, args, false);

		if (greetingType == DiplomacyPlayerFirstMeets.PLAYER_REALATIONSHIP_FIRSTMEET_FRIENDLY) {
			if (DiplomacyManager.currentDiplomacyDialogData != null) {
				responseButton.setAttribute("data-audio-activate-ref", "data-audio-leader-response-positive");
				const otherPlayer: PlayerId = DiplomacyManager.currentDiplomacyDialogData.OtherPlayerID;
				const capitalRevealedString: string = Game.Diplomacy.getFM_RevealCapitalsString(GameContext.localPlayerID, otherPlayer);

				relationshipIcon.classList.add("panel-diplomacy-project-reaction__pos-influence", "panel-diplomacy-project-reaction__influence", "-mt-3", "bg-cover");
				cardTopWrapper.appendChild(relationshipIcon);
				const firstMeetCostPos = document.createElement("div");
				firstMeetCostPos.classList.add("flow-row", "self-center");
				if (!result.Success) {
					firstMeetCostPos.classList.add("text-negative");
					influenceText.classList.add("text-negative");
				}
				firstMeetCostPos.innerHTML = costString;
				responseCostWrapper.appendChild(firstMeetCostPos);
				responseCostWrapper.appendChild(influenceIcon);
				responseCostWrapper.appendChild(influenceText);
				cardTopWrapper.appendChild(responseCostWrapper);
				responseButton.appendChild(cardTopWrapper);
				const greetingTitle = document.createElement("div");
				greetingTitle.classList.add("panel-diplomacy-project-reaction__card-title", "font-title", "text-xs", "text-secondary", "uppercase", "pb-2", "mt-4", "w-full", "tracking-150", "text-center");
				greetingTitle.setAttribute("data-l10n-id", "LOC_FIRST_MEET_FRIENDLY_GREETING_TITLE");
				responseButton.appendChild(greetingTitle);
				const friendlyDescription = document.createElement("div");
				friendlyDescription.classList.add("panel-diplomacy-project-reaction__card-description", "flex", "flex-col", "items-center", "max-w-full", "pl-0\\.5", "text-xs", "font-body", "text-center", "self-center", "break-words", "mb-2");
				friendlyDescription.innerHTML = Locale.stylize("LOC_FIRST_MEET_FRIENDLY_GREETING_DESCRIPTION", relationShipDeltaString, capitalRevealedString);

				responseButton.appendChild(friendlyDescription);
			}
		} else if (greetingType == DiplomacyPlayerFirstMeets.PLAYER_REALATIONSHIP_FIRSTMEET_UNFRIENDLY) {
			responseButton.setAttribute("data-audio-activate-ref", "data-audio-leader-response-negative");
			relationshipIcon.classList.add("panel-diplomacy-project-reaction__neg-influence", "panel-diplomacy-project-reaction__influence", "-mt-3", "bg-cover");
			cardTopWrapper.appendChild(relationshipIcon);
			const firstMeetCostNeg = document.createElement("div");
			firstMeetCostNeg.classList.add("flow-row", "self-center");
			if (!result.Success) {
				firstMeetCostNeg.classList.add("text-negative");
				influenceText.classList.add("text-negative");
			}
			firstMeetCostNeg.innerHTML = costString;
			responseCostWrapper.appendChild(firstMeetCostNeg);
			responseCostWrapper.appendChild(influenceIcon);
			responseCostWrapper.appendChild(influenceText);

			cardTopWrapper.appendChild(responseCostWrapper);
			responseButton.appendChild(cardTopWrapper);
			const hostileGreetingTitle = document.createElement("div");
			hostileGreetingTitle.classList.add("panel-diplomacy-project-reaction__card-title", "font-title", "text-xs", "text-secondary", "uppercase", "pb-2", "mt-4", "w-full", "tracking-150", "text-center");
			hostileGreetingTitle.setAttribute("data-l10n-id", "LOC_FIRST_MEET_HOSTILE_GREETING_TITLE");
			responseButton.appendChild(hostileGreetingTitle);
			const hostileDescription = document.createElement("div");
			hostileDescription.classList.add("panel-diplomacy-project-reaction__card-description", "max-w-full", "flex", "pl-0\\.5", "text-xs", "font-body", "text-center", "self-center", "break-words", "mb-2");
			hostileDescription.innerHTML = Locale.stylize("LOC_FIRST_MEET_HOSTILE_GREETING_DESCRIPTION", relationShipDeltaString);
			responseButton.appendChild(hostileDescription);
		} else {
			responseButton.setAttribute("data-audio-activate-ref", "data-audio-leader-response-neutral");
			relationshipIcon.classList.add("panel-diplomacy-project-reaction__neutral-influence", "panel-diplomacy-project-reaction__influence", "-mt-3", "bg-cover");
			cardTopWrapper.appendChild(relationshipIcon);
			const firstMeetCostNeutral = document.createElement("div");
			firstMeetCostNeutral.classList.add("flow-row", "self-center");
			if (!result.Success) {
				firstMeetCostNeutral.classList.add("text-negative");
				influenceText.classList.add("text-negative");
			}
			firstMeetCostNeutral.innerHTML = costString;
			responseCostWrapper.appendChild(firstMeetCostNeutral);
			responseCostWrapper.appendChild(influenceIcon);
			responseCostWrapper.appendChild(influenceText);

			cardTopWrapper.appendChild(responseCostWrapper);
			responseButton.appendChild(cardTopWrapper);
			const neutralGreetingTitle = document.createElement("div");
			neutralGreetingTitle.classList.add("panel-diplomacy-project-reaction__card-title", "font-title", "text-xs", "text-secondary", "uppercase", "pb-2", "mt-4", "w-full", "tracking-150", "text-center");
			neutralGreetingTitle.setAttribute("data-l10n-id", "LOC_FIRST_MEET_NEUTRAL_GREETING_TITLE");
			responseButton.appendChild(neutralGreetingTitle);
			const neutralDescription = document.createElement("div");
			neutralDescription.classList.add("panel-diplomacy-project-reaction__card-description", "max-w-full", "flex", "pl-0\\.5", "text-xs", "font-body", "text-center", "self-center", "break-words", "mb-2");
			neutralDescription.innerHTML = Locale.stylize("LOC_FIRST_MEET_NEUTRAL_GREETING_DESCRIPTION", relationShipDeltaString);
			responseButton.appendChild(neutralDescription);
		}

		if (!result.Success) {
			responseButton.setAttribute("disabled", "true");
			if (result.FailureReasons && result.FailureReasons.length > 0) {
				let failureTooltip: string = "";
				result.FailureReasons.forEach((reason, index) => {
					if (index > 0) {
						failureTooltip += Locale.stylize("[N]");
					}
					failureTooltip += Locale.compose(reason);
				});
				responseButton.setAttribute("data-tooltip-content", failureTooltip);
			}
		} else {
			responseButton.addEventListener("action-activate", () => {
				this.responseButtons.forEach(button => {
					button.setAttribute("disabled", "true");
				});

				Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.RESPOND_DIPLOMATIC_FIRST_MEET, args);
				if (greetingType == DiplomacyPlayerFirstMeets.PLAYER_REALATIONSHIP_FIRSTMEET_UNFRIENDLY) {
					console.info("Acknowledge Player Hostilely Detected. Play beginHostileAcknowledgePlayerSequence")
					LeaderModelManager.beginHostileAcknowledgePlayerSequence();
				}
				else {
					LeaderModelManager.beginAcknowledgePlayerSequence();
				}
				this.panelHide = MustGetElement(".panel-diplomacy-project-reaction__main-container", this.Root);
				this.dialogHide = MustGetElement(".panel-diplomacy-project-reaction__project-dialog-container", this.Root);
				if (DisplayQueueManager.findAll("DiplomacyDialog").length > 0 && DisplayQueueManager.findAll("DiplomaticResponseUIData").length < 1) {
					this.panelHide?.classList.add("hidden");
					this.dialogHide?.classList.add("hidden");
				}
				setTimeout(() => {
					this.showOtherLeaderReaction(greetingType);
					setTimeout(() => {
						DiplomacyManager.firstMeetPlayerID = DiplomacyManager.currentDiplomacyDialogData!.OtherPlayerID;
						DiplomacyManager.closeCurrentDiplomacyDialog();

					}, 2000);
				}, 1000);
			})
		}

		responseButton.appendChild(hoveredResponseButtonBg);

		responseItem.appendChild(responseButton);
		this.responseButtons.push(responseButton);
		return responseItem;
	}

	//#region Call To Arms
	private populateCallToArmsOptions() {
		if (!DiplomacyManager.currentAllyWarData) {
			console.error("screen-diplomacy-call-to-arms: Attempting to populate call to arms screen but no valid war data!");
			this.close();
			return;
		}

		this.dialogHide?.classList.add("hidden");

		const projectName = MustGetElement(".panel-diplomacy-project-reaction__project-name", this.Root);
		projectName.setAttribute('title', "LOC_DIPLOMACY_ALLY_WAR_TITLE");

		const responseContainer = MustGetElement(".panel-diplomacy-project-reaction__response-container", this.Root);
		responseContainer.classList.remove("pb-5");
		responseContainer.classList.add("pb-8");

		const localPlayerDiplomacy = Players.get(GameContext.localPlayerID)?.Diplomacy;
		if (!localPlayerDiplomacy) {
			console.error("panel-diplomacy-project-reactions: No valid diplomacy library attached to local player");
			return;
		}

		const targetName = Players.get(DiplomacyManager.currentAllyWarData.targetPlayer)?.leaderName;
		const initiatorName = Players.get(DiplomacyManager.currentAllyWarData.initialPlayer)?.leaderName;

		if (!targetName || !initiatorName) {
			console.error("panel-diplomacy-project-reactions: Unable to get target or initiator name!");
			return;
		}

		LeaderModelManager.showLeaderModels(DiplomacyManager.currentAllyWarData.targetPlayer, DiplomacyManager.currentAllyWarData.initialPlayer);

		if (localPlayerDiplomacy.hasAllied(DiplomacyManager.currentAllyWarData.targetPlayer) && localPlayerDiplomacy.hasAllied(DiplomacyManager.currentAllyWarData.initialPlayer)) {
			//We are allied with both players, pick a side or end both alliances.
			const supportTargetButton = this.createCallToArmsOption(Locale.compose("LOC_DIPLOMACY_ALLY_WAR_SUPPORT_ALLY", targetName), Locale.compose("LOC_DIPLOMACY_CALL_TO_ARMS_SUPPORT_ALLY_DESCRIPTION", initiatorName), false, DiplomacyManager.currentAllyWarData.initialPlayer);
			responseContainer.appendChild(supportTargetButton);

			const declineButton = this.createCallToArmsOption(Locale.compose("LOC_DIPLOMACY_CALL_TO_ARMS_STAY_NEUTRAL_TITLE"), Locale.compose("LOC_DIPLOMACY_CALL_TO_ARMS_STAY_NEUTRAL_BOTH_ALLIES"), true);
			responseContainer.appendChild(declineButton);

			const supportInitiatorButton = this.createCallToArmsOption(Locale.compose("LOC_DIPLOMACY_ALLY_WAR_SUPPORT_ALLY", initiatorName), Locale.compose("LOC_DIPLOMACY_CALL_TO_ARMS_SUPPORT_ALLY_DESCRIPTION", targetName), false, DiplomacyManager.currentAllyWarData.targetPlayer);
			responseContainer.appendChild(supportInitiatorButton);
		} else {
			//We are only allied with one of the players.
			if (localPlayerDiplomacy.hasAllied(DiplomacyManager.currentAllyWarData.targetPlayer)) {
				const supportTargetButton = this.createCallToArmsOption(Locale.compose("LOC_DIPLOMACY_ALLY_WAR_SUPPORT_ALLY", targetName), Locale.compose("LOC_DIPLOMACY_CALL_TO_ARMS_JOIN_WAR", targetName, initiatorName), false, DiplomacyManager.currentAllyWarData.initialPlayer);
				responseContainer.appendChild(supportTargetButton);

				const declineButton = this.createCallToArmsOption(Locale.compose("LOC_DIPLOMACY_CALL_TO_ARMS_STAY_NEUTRAL_TITLE"), Locale.compose("LOC_DIPLOMACY_CALL_TO_ARMS_STAY_NEUTRAL_ONE_ALLY", targetName), true)
				responseContainer.appendChild(declineButton);
			} else {
				const supportInitiatorButton = this.createCallToArmsOption(Locale.compose("LOC_DIPLOMACY_ALLY_WAR_SUPPORT_ALLY", initiatorName), Locale.compose("LOC_DIPLOMACY_CALL_TO_ARMS_JOIN_WAR", initiatorName, targetName), false, DiplomacyManager.currentAllyWarData.targetPlayer);
				responseContainer.appendChild(supportInitiatorButton);

				const declineButton = this.createCallToArmsOption(Locale.compose("LOC_DIPLOMACY_CALL_TO_ARMS_STAY_NEUTRAL_TITLE"), Locale.compose("LOC_DIPLOMACY_CALL_TO_ARMS_STAY_NEUTRAL_ONE_ALLY", initiatorName), true);
				responseContainer.appendChild(declineButton);
			}
		}

		const mainContainer = MustGetElement(".panel-diplomacy-project-reaction__main-container", this.Root);

		const hideButton = document.createElement("chooser-item");
		hideButton.classList.add("chooser-item_unlocked", "h-12", "flex", "flex-row", "w-60", "bg-black");
		hideButton.classList.add("absolute", "-bottom-8", "self-center", "justify-center", "items-center");

		hideButton.addEventListener("action-activate", () => { this.close() });
		hideButton.setAttribute("tabindex", "");
		hideButton.setAttribute("action-key", "inline-cancel");
		mainContainer.appendChild(hideButton);

		waitForLayout(() => {
			const hideText = document.createElement("div");
			hideText.classList.value = "font-title text-lg uppercase self-center relative";
			hideText.innerHTML = Locale.compose("LOC_DIPLOMACY_ALLY_WAR_BACK_TO_MAP");
			hideButton.appendChild(hideText);
			const firstSlot = MustGetElement(".panel-diplomacy-project-reaction__response-item", responseContainer);
			FocusManager.setFocus(firstSlot);
		})


	}

	private createCallToArmsOption(title: string, description: string, neutral: boolean, playerID?: PlayerId): HTMLElement {
		const optionItem = document.createElement("fxs-vslot");
		optionItem.classList.add("panel-diplomacy-project-reaction__response-item", "h-full", "w-56", "mx-12", "flex", "flex-col", "self-center", "mx-0");
		optionItem.setAttribute("tabindex", "-1");

		const optionButton = document.createElement("fxs-activatable");
		optionButton.setAttribute("action-key", "inline-accept");
		optionButton.setAttribute("nav-help-side-reversed", "true");
		optionButton.setAttribute("tabindex", "-1");
		optionButton.classList.add("panel-diplomacy-project-reaction__response-item-bg", "z-0", "relative", "flex", "flex-col", "justify-start", "grow", "min-h-56", "w-full", "text-sm", "pb-3", "group-focus\\:opacity-0", "group-hover\\:opacity-0", "group-active\\:opacity-0", "group");
		optionButton.setAttribute("data-audio-group-ref", "audio-diplo-project-reaction");

		const hoveredResponseButtonBg = document.createElement("div");
		hoveredResponseButtonBg.setAttribute("tabindex", "-1");
		hoveredResponseButtonBg.classList.add("panel-diplomacy-project-reaction__response-item-hovered", "-z-1", "absolute", "inset-0", "flex", "flex-col", "justify-start", "min-h-56", "w-full", "grow", "text-sm", "pb-3", "opacity-0", "-mt-0\\.5", "group-focus\\:opacity-100", "group-hover\\:opacity-100", "group-active\\:opacity-100", "transition-opacity");


		const cardTopWrapper = document.createElement("div");
		cardTopWrapper.classList.add("flex", "flex-row");

		const relationshipIcon = document.createElement("div");
		relationshipIcon.classList.add("relative", "flex", "flex-row");

		if (neutral) {
			relationshipIcon.classList.add("panel-diplomacy-project-reaction__neutral-influence", "panel-diplomacy-project-reaction__influence", "-mt-3", "bg-cover");
			optionButton.setAttribute("data-audio-activate-ref", "data-audio-leader-response-neutral");
		} else {
			relationshipIcon.classList.add("panel-diplomacy-project-reaction__accept-call-to-arms-icon", "panel-diplomacy-project-reaction__influence", "-mt-3", "bg-cover");
			optionButton.setAttribute("data-audio-activate-ref", "data-audio-leader-response-positive");
		}
		cardTopWrapper.appendChild(relationshipIcon);

		const responseDescription: HTMLElement = document.createElement("div");
		responseDescription.classList.add("panel-diplomacy-project-reaction__response-description", "grow", "min-h-36", "w-full", "font-body", "text-xs", "mb-2", "px-3", "self-center", "text-center", "break-words");

		const responseTitle = document.createElement("div");
		responseTitle.classList.add("panel-diplomacy-project-reaction__card-title", "font-title", "text-xs", "text-secondary", "uppercase", "pb-2", "w-52", "text-center", "tracking-150");
		responseTitle.setAttribute("data-l10n-id", title);
		responseDescription.appendChild(responseTitle);
		optionButton.appendChild(cardTopWrapper);

		const responseText = document.createElement("div");
		responseText.classList.add('flex', 'flex-col', 'text-center', 'w-52');
		responseText.setAttribute("data-l10n-id", description);
		responseDescription.appendChild(responseText);
		optionButton.classList.add("font-title", "text-sm");
		hoveredResponseButtonBg.classList.add("font-title", "text-sm");

		optionButton.appendChild(responseDescription);

		optionItem.appendChild(optionButton);
		optionButton.appendChild(hoveredResponseButtonBg);

		if (playerID) {
			optionButton.addEventListener("action-activate", () => { this.acceptCallToArms(playerID) });
			hoveredResponseButtonBg.addEventListener("action-activate", () => { this.acceptCallToArms(playerID) });
		} else {
			optionButton.addEventListener("action-activate", () => { this.declineCallToArms() });
			hoveredResponseButtonBg.addEventListener("action-activate", () => { this.declineCallToArms() });
		}

		return optionItem;
	}

	private declineCallToArms() {
		const localPlayerDiplomacy = Players.get(GameContext.localPlayerID)?.Diplomacy;
		if (!localPlayerDiplomacy) {
			console.error("panel-diplomacy-project-reactions: No valid diplomacy library attached to local player");
			return;
		}

		if (!DiplomacyManager.currentAllyWarData) {
			console.error("screen-diplomacy-call-to-arms: Attempting to populate call to arms screen but no valid war data!");
			this.close();
			return;
		}

		if (localPlayerDiplomacy.hasAllied(DiplomacyManager.currentAllyWarData.initialPlayer)) {
			const breakAllianceArgs = {
				Player1: GameContext.localPlayerID,
				Player2: DiplomacyManager.currentAllyWarData.initialPlayer,
				Type: DiplomacyActionTypes.DIPLOMACY_ACTION_FORM_ALLIANCE
			}

			Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.CANCEL_ALLIANCE, breakAllianceArgs);
		}

		if (localPlayerDiplomacy.hasAllied(DiplomacyManager.currentAllyWarData.targetPlayer)) {
			const breakAllianceArgs = {
				Player1: GameContext.localPlayerID,
				Player2: DiplomacyManager.currentAllyWarData.targetPlayer,
				Type: DiplomacyActionTypes.DIPLOMACY_ACTION_FORM_ALLIANCE
			}

			Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.CANCEL_ALLIANCE, breakAllianceArgs);
		}

		this.close();
	}

	private acceptCallToArms(warTarget: PlayerId) {
		DiplomacyManager.confirmDeclareWar(warTarget, DiplomacyActionTypes.DIPLOMACY_ACTION_DECLARE_WAR);
		this.close();
	}

	private onLocalPlayerTurnEnd() {
		DiplomacyManager.closeCurrentDiplomacyDialog();
	}

	private onInterfaceModeChanged() {
		this.checkShouldShowPanel();
	}
}
//#endregion
Controls.define('panel-diplomacy-project-reaction', {
	createInstance: DiplomacyProjectReactionPanel,
	description: 'Diplomacy Project Reaction Panel',
	styles: ['fs://game/base-standard/ui/diplomacy-project-reaction/panel-diplomacy-project-reaction.css'],
	content: ['fs://game/base-standard/ui/diplomacy-project-reaction/panel-diplomacy-project-reaction.html'],
	classNames: ['panel-diplomacy-project-reaction'],
	attributes: [],
	images: [
		"fs://game/hud_squarepanel-bg.png",
		"fs://game/dip_card_holder_bg.png",
		"fs://game/dip_card_idle.png"
	],
	tabIndex: -1
});