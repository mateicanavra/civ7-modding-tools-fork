/**
* @file screen-diplomacy-action-details.ts
* @copyright 2022 - 2025, Firaxis Games
* @description Displays more details and handles deeper interactions with an ongoing diplomatic action
*/

import DiplomacyManager from '/base-standard/ui/diplomacy/diplomacy-manager.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel, { AnchorType } from '/core/ui/panel-support.js';
import { InputEngineEvent, InputEngineEventName } from '/core/ui/input/input-support.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';

class DiplomacyActionDetailsScreen extends Panel {

	private supportChangedListener = (data: DiplomacyEventSupportChanged_EventData) => { this.onSupportChanged(data); }
	private engineInputListener: EventListener = (inputEvent: InputEngineEvent) => { this.onEngineInput(inputEvent); };

	private yourWarContentContainer: HTMLElement | null = null;
	private supportWarContentContainer: HTMLElement | null = null;
	private actionContentColumn: HTMLElement | null = null;
	private titleProgressBarContainer: HTMLElement | null = null;
	private mainPledgeContainer: HTMLElement | null = null;
	private leftPledgeButton: HTMLElement | null = null;
	private rightPledgeButton: HTMLElement | null = null;
	private supportYourselfButton: HTMLElement | null = null;
	private leftPledgePlayers: PlayerId[] = [];
	private rightPledgePlayers: PlayerId[] = [];
	private focusableElements: (HTMLElement | null)[] = [];

	onAttach() {
		this.animateInType = AnchorType.RelativeToBottom;
		this.animateOutType = this.animateInType;
		super.onAttach();

		const closeButton = MustGetElement('fxs-close-button', this.Root);
		closeButton.addEventListener('action-activate', () => {
			this.onClose();
		});

		window.addEventListener(InputEngineEventName, this.engineInputListener);

		engine.on('DiplomacyEventSupportChanged', this.supportChangedListener);

		this.populateActionDetails();
	}

	onDetach() {
		window.removeEventListener(InputEngineEventName, this.engineInputListener);

		engine.off('DiplomacyEventSupportChanged', this.supportChangedListener);

		super.onDetach();
	}

	onReceiveFocus(): void {
		super.onReceiveFocus();
		this.realizeFocus();
		this.realizeNavtray();
	}

	onLoseFocus() {
		NavTray.clear();
		super.onLoseFocus();
	}

	private onEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		switch (inputEvent.detail.name) {
			case 'cancel':
			case 'mousebutton-right':
				this.close();
				inputEvent.stopPropagation();
				inputEvent.preventDefault();
				break;
			case 'keyboard-escape':
			case 'sys-menu':
				this.closeFromPauseSignal();
				inputEvent.stopPropagation();
				inputEvent.preventDefault();
				break;
		}
	}

	private createPledgeButton(isInitial: boolean): HTMLElement {
		const responseButton: HTMLElement = document.createElement("fxs-activatable");
		responseButton.setAttribute("action-key", "inline-confirm");
		responseButton.setAttribute("nav-help-class", "absolute left-9");
		responseButton.setAttribute("tabindex", "-1");
		responseButton.classList.remove("font-title-base", "font-bold");
		responseButton.classList.add("pledge-support-button", "text-sm", "min-h-56", "w-56", "mx-12", "relative", "pb-3", "group", "flow-col", "justify-start");

		const buttonHoverOverlay = document.createElement("div");
		buttonHoverOverlay.classList.add("panel-diplomacy-project-reaction__response-item-hovered", "min-h-56", "pb-3", "grow", "flow-col", "justify-start", "absolute", "inset-0", "group-focus\\:opacity-100", "group-hover\\:opacity-100", "group-active\\:opacity-100", "group", "opacity-0", "-mt-0\\.5");
		responseButton.appendChild(buttonHoverOverlay);

		const buttonIdleOverlay = document.createElement("div");
		buttonIdleOverlay.classList.add("panel-diplomacy-project-reaction__response-item-bg", "min-h-56", "pb-3", "grow", "flow-col", "justify-start", "absolute", "inset-0",
			"focus\\:opacity-0", "group-hover\\:opacity-0", "group-active\\:opacity-0", "opacity-100", "group", "-mt-0\\.5");
		responseButton.appendChild(buttonIdleOverlay);

		const buttonContentOverlay = document.createElement("div");
		buttonContentOverlay.classList.add("support-war-button-content", "pointer-events-none", "min-h-56", "pb-3", "grow", "flex", "flex-col", "justify-start", "relative", "inset-0")
		responseButton.appendChild(buttonContentOverlay);

		const cardTopWrapper = document.createElement("div");
		cardTopWrapper.classList.add("panel-diplomacy-project-reaction__card-top-wrapper", "flow-row");

		const responseDescription: HTMLElement = document.createElement("div");
		responseDescription.classList.add("panel-diplomacy-project-reaction__response-description", "flex", "items-center", "justify-center", "grow", "min-h-36", "w-full", "font-body", "text-xs", "mb-2", "px-2", "self-center", "text-center", "break-words");

		const costWrapper = document.createElement("div");
		costWrapper.classList.add("flow-row", "grow", "justify-center", "mb-2");
		const relationshipIconContainer = document.createElement("div");
		relationshipIconContainer.classList.add("absolute", "flow-row");

		relationshipIconContainer.classList.add("panel-diplomacy-project-reaction__icon-container", "size-16", "-left-6", "-top-3");

		const supportYourselfIcon = document.createElement("div");
		supportYourselfIcon.classList.add("panel-diplomacy-project-reaction__support-yourself", "size-16", "bg-contain", "bg-no-repeat");
		relationshipIconContainer.appendChild(supportYourselfIcon);

		cardTopWrapper.appendChild(relationshipIconContainer);

		const influenceIconWrapper = document.createElement("div");
		influenceIconWrapper.classList.add("self-end");
		const influenceIcon = document.createElement("img");
		influenceIcon.classList.add("w-8", "h-8");
		influenceIcon.src = "fs://game/yield_influence";
		influenceIconWrapper.appendChild(influenceIcon);
		costWrapper.appendChild(influenceIconWrapper);

		const actionData: DiplomaticEventHeader = Game.Diplomacy.getDiplomaticEventData(DiplomacyManager.selectedActionID);
		const influenceCost = Game.Diplomacy.getInfluenceForNextSupport(actionData.uniqueID, GameContext.localPlayerID, isInitial);

		const costDescription = document.createElement("div");
		costDescription.id = "#support-war-cost";
		costDescription.setAttribute("data-l10n-id", influenceCost.toString());
		costDescription.classList.add("self-end", "mb-1");
		costWrapper.appendChild(costDescription);

		cardTopWrapper.appendChild(costWrapper);

		buttonContentOverlay.appendChild(cardTopWrapper);

		const responseTitle = document.createElement("div");
		responseTitle.classList.add("panel-diplomacy-project-reaction__card-title", "pledge-button-caption", "w-52", "font-title", "text-xs", "text-secondary", "uppercase", "pb-2", "mt-2", "text-center", "tracking-100");
		responseTitle.setAttribute("data-l10n-id", "LOC_SUPPORT_WAR_SELF");
		responseDescription.appendChild(responseTitle);

		buttonContentOverlay.appendChild(responseDescription);

		buttonContentOverlay.classList.add("font-title", "text-sm");

		return responseButton;
	}

	private createPledgeGroup(): HTMLElement {
		const pledgeGroup: HTMLElement = document.createElement('div');
		pledgeGroup.classList.add('diplomacy-action-details__pledge-group');
		const pledgeGroupFrame: HTMLElement = document.createElement('div');
		pledgeGroupFrame.classList.add('diplomacy-action-details__pledge-group-frame');
		pledgeGroup.appendChild(pledgeGroupFrame);
		const pledgeTotal: HTMLElement = document.createElement('div');
		pledgeTotal.classList.add('diplomacy-action-details__pledge-total-bg');
		pledgeGroup.appendChild(pledgeTotal);
		return pledgeGroup
	}

	private createPledgeGroupValues(value: number): HTMLElement | null {
		const pledgeTotalNumber: HTMLElement = document.createElement('fxs-hslot');
		if (value <= 0) {
			// return the empty slot so it can occupy the space.
			return pledgeTotalNumber;
		}

		pledgeTotalNumber.classList.add('diplomacy-action-details__pledge-total-number', 'justify-center', 'font-title', 'text-xl');
		const pledgeTotalPrefix: HTMLElement = document.createElement('div');
		pledgeTotalPrefix.classList.add('diplomacy-action-details__pledge-total-prefix');
		const pledgeTotalSpan: HTMLElement = document.createElement('span');
		pledgeTotalSpan.textContent = Math.abs(value).toString();
		pledgeTotalPrefix.textContent = value == 0 ? "" : value > 0 ? "+" : "-";
		pledgeTotalNumber.appendChild(pledgeTotalPrefix);
		pledgeTotalNumber.appendChild(pledgeTotalSpan);
		return pledgeTotalNumber
	}

	private createPledgeGroupLocalTotal(value: number): HTMLElement {
		let pledgeSlots: number = value;
		let remainingSlots: number = 20 - pledgeSlots;

		const totalSlotsContainer = document.createElement('fxs-hslot');
		totalSlotsContainer.classList.add('total-slots-container', 'grow');

		if (pledgeSlots > 0) {
			const pledgeSlotContainer = document.createElement('fxs-hslot');
			pledgeSlotContainer.classList.add('pledge-slots-container', 'grow');
			totalSlotsContainer.appendChild(pledgeSlotContainer);

			for (let i = 1; i <= pledgeSlots; i++) {
				const pledgeSlot = document.createElement('fxs-hslot');
				pledgeSlot.classList.add('pledge-slot', 'h-5', 'w-5', 'grow');
				pledgeSlotContainer.appendChild(pledgeSlot);
			}
		}

		const remainingSlotContainer = document.createElement('fxs-hslot');
		remainingSlotContainer.classList.add('remaining-slots-container', 'grow');
		totalSlotsContainer.appendChild(remainingSlotContainer);

		for (let i = 1; i <= remainingSlots; i++) {
			const remainingSlot = document.createElement('fxs-hslot');
			remainingSlot.classList.add('remaining-slot', 'h-5', 'w-5', 'grow');
			remainingSlotContainer.appendChild(remainingSlot);
		}

		const pledgeGroupTotal: HTMLElement = document.createElement('fxs-hslot');
		pledgeGroupTotal.classList.add('diplomacy-action-details__pledge-group-total');
		pledgeGroupTotal.textContent = value.toString();

		const slotsDivider = document.createElement('div');
		slotsDivider.classList.add('absolute', 'right-1\\/2', 'w-0\\.5', 'h-full', 'bg-primary-2');
		totalSlotsContainer.appendChild(slotsDivider);

		return totalSlotsContainer;
	}

	private createPledgeGroupStatus(actionData: DiplomaticEventHeader): HTMLElement {
		const pledgeStatus: HTMLElement = document.createElement('div');
		pledgeStatus.classList.add('diplomacy-action-details__pledge-status');
		pledgeStatus.setAttribute('data-l10n-id', this.determinePledgeStatus(actionData, pledgeStatus));
		return pledgeStatus
	}

	private determinePledgeStatus(actionData: DiplomaticEventHeader, target: HTMLElement): string {
		let locString: string = "";

		if (actionData.completionScore > 0) {
			const completionData: DiplomacyEventCompletionData = Game.Diplomacy.getCompletionData(DiplomacyManager.selectedActionID);
			if (completionData) {
				if (completionData.bWillComplete) {
					locString = Locale.compose("LOC_DIPLOMACY_ACTION_TURNS_UNTIL_COMPLETION", completionData.turnsToCompletion);
				} else if (completionData.turnsToNextStage >= 0) {
					locString = Locale.compose("LOC_DIPLOMACY_ACTION_TURNS_UNTIL_NEXT_STAGE", completionData.turnsToNextStage);
				} else if (completionData.bWillCancel) {
					locString = Locale.compose("LOC_DIPLOMACY_ACTION_TURNS_UNTIL_CANCELED", completionData.turnsToCompletion);
					target.classList.add('status-reverse');
				} else if (completionData.progressPerTurn == 0) {
					locString = Locale.compose("LOC_DIPLOMACY_ACTION_HAS_STALLED", completionData.turnsToCompletion);
					target.classList.add('status-stalled');
				} else {
					locString = Locale.compose("LOC_DIPLOMACY_ACTION_AT_RISK");
					target.classList.add('status-reverse');
				}
			} else {
				console.error("screen-diplomacy-action-details: Unable to retrieve DiplomacyEventCompletionData for selected action with ID: " + DiplomacyManager.selectedActionID);
				const turnsToCompletion: number = Math.max(Math.ceil((actionData.completionScore - actionData.progressScore) / actionData.support), 1);
				locString = Locale.compose("LOC_DIPLOMACY_ACTION_TURNS_UNTIL_COMPLETION", turnsToCompletion);
			}
		}
		return locString
	}

	private determineLeftPlayer(actionData: DiplomaticEventHeader): PlayerId {
		// If the target player is the local player, we put him in the left. Othwerise, the target always goes to the right.
		return actionData.targetPlayer == GameContext.localPlayerID ? actionData.targetPlayer : actionData.initialPlayer;
	}

	private determineRightPlayer(actionData: DiplomaticEventHeader): PlayerId {
		// Make sure the Local Player is always to the left.
		return actionData.targetPlayer == GameContext.localPlayerID ? actionData.initialPlayer : actionData.targetPlayer;
	}

	private determineLocalPlayerSupport(actionData: DiplomaticEventHeader): number {
		this.leftPledgePlayers = Game.Diplomacy.getSupportingPlayersWithBonusEnvoys(actionData.uniqueID);
		this.rightPledgePlayers = Game.Diplomacy.getOpposingPlayersWithBonusEnvoys(actionData.uniqueID);
		return this.leftPledgePlayers.filter((id) => id == GameContext.localPlayerID).length - this.rightPledgePlayers.filter((id) => id == GameContext.localPlayerID).length;
	}

	private updatePlayerGroups(actionData: DiplomaticEventHeader, leftPlayer: PlayerId): void {
		if (actionData.initialPlayer == leftPlayer) {
			this.leftPledgePlayers = Game.Diplomacy.getSupportingPlayersWithBonusEnvoys(actionData.uniqueID);
			this.rightPledgePlayers = Game.Diplomacy.getOpposingPlayersWithBonusEnvoys(actionData.uniqueID);
		}
		else {
			this.leftPledgePlayers = Game.Diplomacy.getOpposingPlayersWithBonusEnvoys(actionData.uniqueID);
			this.rightPledgePlayers = Game.Diplomacy.getSupportingPlayersWithBonusEnvoys(actionData.uniqueID);
		}
	}

	private createPledgeGroups(actionData: DiplomaticEventHeader, completionData: DiplomacyEventCompletionData, localPlayerDiplomacy: PlayerDiplomacy): void {
		const leftPlayer: PlayerId = this.determineLeftPlayer(actionData); // Pass these in?
		const rightPlayer: PlayerId = this.determineRightPlayer(actionData); // Pass these in?
		this.updatePlayerGroups(actionData, leftPlayer);

		const leftPledgeGroup: HTMLElement = document.createElement('fxs-hslot');
		const rightPledgeGroup: HTMLElement = document.createElement('fxs-hslot');

		if (leftPlayer != PlayerIds.NO_PLAYER && rightPlayer != PlayerIds.NO_PLAYER) {
			// Only show player colors if it's a head-to-head diplomacy action
			leftPledgeGroup.classList.add('is-player');
			rightPledgeGroup.classList.add('is-player');
		}

		let opposingPledgeGroup: HTMLElement;
		let supportPledgeGroup: HTMLElement;

		if (actionData.initialPlayer == leftPlayer) {
			opposingPledgeGroup = rightPledgeGroup;
			supportPledgeGroup = leftPledgeGroup;
		}
		else {
			opposingPledgeGroup = leftPledgeGroup;
			supportPledgeGroup = rightPledgeGroup;
		}

		// Will hold the Progress Bar Container, Pledge Values Container and Leaders Container
		if (!this.mainPledgeContainer) {
			this.mainPledgeContainer = document.createElement('fxs-vslot');
			this.mainPledgeContainer.classList.add('main-pledge-container', 'w-full');
			this.titleProgressBarContainer?.appendChild(this.mainPledgeContainer);
		}

		while (this.mainPledgeContainer.hasChildNodes()) {
			this.mainPledgeContainer.removeChild(this.mainPledgeContainer.lastChild!);
		}

		// BEGIN Bar Container
		const pledgeBarContainer: HTMLElement = document.createElement('fxs-hslot');
		pledgeBarContainer.classList.add('pledge-bar-container', 'grow', 'justify-center', 'mt-3');
		this.mainPledgeContainer.appendChild(pledgeBarContainer);

		const leftSupport = this.leftPledgePlayers.length;
		const rightSupport = this.rightPledgePlayers.length;
		let leftValue = 0;
		let rightValue = 0;

		if (leftSupport > rightSupport) {
			leftValue = leftSupport - rightSupport;
		}
		else {
			rightValue = rightSupport - leftSupport;
		}

		const leftPledgeLocalTotal: HTMLElement = this.createPledgeGroupLocalTotal(leftValue);
		// Need to reverse the order of this container
		leftPledgeLocalTotal.classList.add('-scale-x-100');
		pledgeBarContainer.appendChild(leftPledgeLocalTotal);

		const rightPledgeLocalTotal: HTMLElement = this.createPledgeGroupLocalTotal(rightValue);
		pledgeBarContainer.appendChild(rightPledgeLocalTotal);

		const rightPledgeRemainingSlotsContainer: HTMLElement = MustGetElement(".remaining-slots-container", rightPledgeLocalTotal);
		const rightPledgeBottomBar: HTMLElement = document.createElement('div');
		rightPledgeBottomBar.classList.add('w-full', 'absolute', 'h-1', 'bg-negative', 'bottom-0');
		rightPledgeRemainingSlotsContainer.appendChild(rightPledgeBottomBar);
		// END Bar Container

		// BEGIN Pledge Values
		const pledgeValuesContainer: HTMLElement = document.createElement('fxs-hslot');
		pledgeValuesContainer.classList.add('pledge-values-container', 'w-full');
		this.mainPledgeContainer.appendChild(pledgeValuesContainer);

		const leftPledgeTotal = this.createPledgeGroupValues(leftValue);
		if (leftPledgeTotal) {
			leftPledgeTotal.classList.add('grow');
			pledgeValuesContainer.appendChild(leftPledgeTotal);
		}

		const rightPledgeTotal = this.createPledgeGroupValues(rightValue);
		if (rightPledgeTotal) {
			rightPledgeTotal.classList.add('grow');
			pledgeValuesContainer.appendChild(rightPledgeTotal);
		}

		// END Pledge Values

		// BEGIN Leaders
		const uiViewExperience = UI.getViewExperience();
		const leadersContainer: HTMLElement = document.createElement('fxs-hslot');
		if (uiViewExperience != UIViewExperience.Mobile) {
			leadersContainer.classList.add('leaders-container', 'grow', 'justify-between');
			this.mainPledgeContainer.appendChild(leadersContainer);
		}

		leftPledgeGroup.classList.add('left-pledge-group', 'grow', 'flex-wrap', 'max-w-1\\/2');
		if (uiViewExperience == UIViewExperience.Mobile) {
			leftPledgeGroup.classList.add('justify-center');
			if (pledgeBarContainer.children.length > 0) {
				pledgeBarContainer.insertBefore(leftPledgeGroup, pledgeBarContainer.children[0]);
			} else {
				pledgeBarContainer.appendChild(leftPledgeGroup);
			}
		} else {
			leadersContainer.appendChild(leftPledgeGroup);
		}
		let leftPledgeTotals: { numVotes: number, playerID: number }[] = []
		this.leftPledgePlayers.forEach(playerID => {

			const index = leftPledgeTotals.findIndex(pledge => playerID == pledge.playerID);
			if (index == -1) {
				leftPledgeTotals.push({ numVotes: 1, playerID: playerID });
			} else {
				leftPledgeTotals[index].numVotes++;
			}
		});

		leftPledgeTotals.forEach(total => {
			const pledgeLeaderIcon: HTMLElement | null = this.createPledgeLeaderIcon(total.playerID, localPlayerDiplomacy);
			if (!pledgeLeaderIcon) {
				return;
			}
			leftPledgeGroup.appendChild(pledgeLeaderIcon);
			waitForLayout(() => {
				if (total.numVotes > 1) {
					const numVotesElement = document.createElement("div");
					numVotesElement.classList.value = "absolute self-center -bottom-2 rounded-xl size-6 text-base font-base bg-primary-3 text-secondary text-center"
					numVotesElement.setAttribute("data-l10n-id", total.numVotes.toString());
					pledgeLeaderIcon.appendChild(numVotesElement);
				}
			})
		});

		rightPledgeGroup.classList.add('right-pledge-group', 'grow', 'flex-wrap', 'max-w-1\\/2');
		rightPledgeGroup.classList.toggle('justify-end', uiViewExperience != UIViewExperience.Mobile);
		if (uiViewExperience == UIViewExperience.Mobile) {
			rightPledgeGroup.classList.add('justify-center');
			pledgeBarContainer.appendChild(rightPledgeGroup);
		} else {
			leadersContainer.appendChild(rightPledgeGroup);
		}
		let rightPledgeTotals: { numVotes: number, playerID: number }[] = []
		this.rightPledgePlayers.forEach(playerID => {

			const index = rightPledgeTotals.findIndex(pledge => playerID == pledge.playerID);
			if (index == -1) {
				rightPledgeTotals.push({ numVotes: 1, playerID: playerID });
			} else {
				rightPledgeTotals[index].numVotes++;
			}
		});

		rightPledgeTotals.forEach(total => {
			const pledgeLeaderIcon: HTMLElement | null = this.createPledgeLeaderIcon(total.playerID, localPlayerDiplomacy);
			if (!pledgeLeaderIcon) {
				return;
			}
			rightPledgeGroup.appendChild(pledgeLeaderIcon);
			waitForLayout(() => {
				if (total.numVotes > 1) {
					const numVotesElement = document.createElement("div");
					numVotesElement.classList.value = "absolute self-center -bottom-2 rounded-xl size-6 text-base font-base bg-primary-3 text-secondary text-center"
					numVotesElement.setAttribute("data-l10n-id", total.numVotes.toString());
					pledgeLeaderIcon.appendChild(numVotesElement);
				}
			})
		});
		// END Leaders

		opposingPledgeGroup.classList.add('is-negative');
		supportPledgeGroup.classList.add('is-positive');
		opposingPledgeGroup.classList.toggle('lower-group', completionData.progressPerTurn > 0);
		opposingPledgeGroup.classList.toggle('neutral', completionData.progressPerTurn == 0);
		supportPledgeGroup.classList.toggle('lower-group', completionData.progressPerTurn < 0);
		supportPledgeGroup.classList.toggle('neutral', completionData.progressPerTurn == 0);
	}

	private createSupportWarItem(actionData: DiplomaticEventHeader): void {

		while (this.supportWarContentContainer && this.supportWarContentContainer.hasChildNodes()) {
			this.supportWarContentContainer.removeChild(this.supportWarContentContainer.lastChild!);
		}
		const leftPlayerLibrary: PlayerLibrary | null = Players.get(this.determineLeftPlayer(actionData));
		const rightPlayerLibrary: PlayerLibrary | null = Players.get(this.determineRightPlayer(actionData));
		if (!leftPlayerLibrary || !rightPlayerLibrary) {
			console.error("screen-diplomacy-action-details: failed to determine left and right players");
			this.close();
		}
		else {
			if (leftPlayerLibrary.id == actionData.initialPlayer) {
				this.leftPledgeButton = this.createPledgeButton(true);
			}
			else {
				this.leftPledgeButton = this.createPledgeButton(false);
			}
			this.leftPledgeButton.classList.add('pledge-left-button');
			this.leftPledgeButton.setAttribute("has-diploaction-focus-priority", "true");
			this.leftPledgeButton.setAttribute('action-key', 'inline-cycle-prev');
			this.leftPledgeButton.setAttribute("data-audio-group-ref", "support-other-war-button");
			if (rightPlayerLibrary.id == actionData.initialPlayer) {
				this.rightPledgeButton = this.createPledgeButton(true);
			}
			else {
				this.rightPledgeButton = this.createPledgeButton(false);
			}
			this.rightPledgeButton.classList.add('pledge-right-button');
			this.rightPledgeButton.setAttribute("has-diploaction-focus-priority", "true");
			this.rightPledgeButton.setAttribute('action-key', 'inline-cycle-next');
			this.rightPledgeButton.setAttribute("data-audio-group-ref", "support-other-war-button");
		}

		const localPlayer = Players.get(GameContext.localPlayerID);
		if (!localPlayer) {
			console.error("screen-diplomacy-action-details: failed to determine local player");
			return;
		}

		const localPlayerDiplomacy = localPlayer.Diplomacy;
		if (!localPlayerDiplomacy) {
			console.error("screen-diplomacy-action-details: failed to determine local player diplomacy");
			return;
		}
		if (!leftPlayerLibrary || !rightPlayerLibrary) {
			console.error("screen-diplomacy-action-details: failed to determine left and right players");
			this.close();
		} else {
			if (this.leftPledgeButton && this.rightPledgeButton) {
				this.changeSupportWarButton(this.leftPledgeButton, Locale.compose("LOC_DIPLOMACY_ACTIONS_SUPPORT_CAPTION") + " " + Locale.compose(leftPlayerLibrary.name), this.determineLeftPlayer(actionData), localPlayerDiplomacy);
				this.changeSupportWarButton(this.rightPledgeButton, Locale.compose("LOC_DIPLOMACY_ACTIONS_SUPPORT_CAPTION") + " " + Locale.compose(rightPlayerLibrary.name), this.determineRightPlayer(actionData), localPlayerDiplomacy);


				this.leftPledgeButton.addEventListener("action-activate", () => { this.addLeftSupport(actionData) });
				this.rightPledgeButton.addEventListener("action-activate", () => { this.addRightSupport(actionData) });

				if (!this.supportWarContentContainer) {
					console.error("screen-diplomacy-action-details: no support-war-content-container found!");
					return;
				}

				this.supportWarContentContainer.appendChild(this.leftPledgeButton);

				const pledgeStatus: HTMLElement = this.createPledgeGroupStatus(actionData);
				this.supportWarContentContainer.appendChild(pledgeStatus);

				this.supportWarContentContainer.appendChild(this.rightPledgeButton);
			}
			else {
				console.error("screen-diplomacy-action-details: no left or right pledge button found");
				return;
			}
		}
	}

	private createSupportYourselfItem(actionData: DiplomaticEventHeader) {
		const responseItem: HTMLElement = document.createElement("fxs-vslot");
		responseItem.classList.add("panel-diplomacy-project-reaction__response-item", "h-full", "flex", "w-56", "flex", "flex-col", "self-center");

		const responseButton: HTMLElement = document.createElement("fxs-activatable");
		responseButton.setAttribute("data-audio-group-ref", "support-your-war-button");
		responseButton.setAttribute("action-key", "inline-confirm");
		responseButton.setAttribute("nav-help-class", "absolute left-9");
		responseButton.setAttribute("tabindex", "-1");
		responseButton.classList.remove("font-title-base", "font-bold");
		responseButton.classList.add("support-your-war-button", "panel-diplomacy-project-reaction__response-item-bg", "z-0", "relative", "flex", "flex-col", "justify-start", "grow", "min-h-56", "w-full", "text-sm", "pb-3", "group-focus\\:opacity-0", "group-hover\\:opacity-0", "group-active\\:opacity-0", "group");

		const hoveredResponseButtonBg = document.createElement("div");
		hoveredResponseButtonBg.classList.add("panel-diplomacy-project-reaction__response-item-hovered", "-z-1", "absolute", "inset-0", "flex", "flex-col", "justify-start", "min-h-56", "w-full", "grow", "text-sm", "pb-3", "opacity-0", "-mt-0\\.5", "group-focus\\:opacity-100", "group-hover\\:opacity-100", "group-active\\:opacity-100", "transition-opacity");

		const cardTopWrapper = document.createElement("div");
		cardTopWrapper.classList.add("flex", "flex-row");

		const responseDescription: HTMLElement = document.createElement("div");
		responseDescription.classList.add("panel-diplomacy-project-reaction__response-description", "grow", "min-h-36", "w-full", "font-body", "text-xs", "mb-2", "px-2", "self-center", "text-center", "break-words");

		const relationshipIconContainer = document.createElement("div");
		relationshipIconContainer.classList.add("flex", "flex-row");

		const supportYourselfIcon = document.createElement("div");
		supportYourselfIcon.classList.add("panel-diplomacy-project-reaction__support-yourself", "-mt-2", "size-13", "bg-cover");
		relationshipIconContainer.appendChild(supportYourselfIcon);

		cardTopWrapper.appendChild(relationshipIconContainer);

		const responseTitle = document.createElement("div");
		responseTitle.classList.add("panel-diplomacy-project-reaction__card-title", "w-52", "font-title", "text-xs", "text-secondary", "uppercase", "pb-2", "mt-2", "text-center", "tracking-100");
		responseTitle.setAttribute("data-l10n-id", "LOC_SUPPORT_WAR_SELF");
		responseButton.appendChild(cardTopWrapper);

		const responseText = document.createElement("div");
		responseText.classList.add('panel-diplomacy-project-reaction__card-subtitle', 'text-center', 'w-52');
		responseText.setAttribute("data-l10n-id", "LOC_DIPLOMACY_SEND_ENVOY");

		const descriptionText = document.createElement("div");
		descriptionText.classList.add("p-2", "break-words");
		descriptionText.setAttribute("data-l10n-id", "LOC_DIPLOMACY_ACTION_WAR_DETAILS_LIGHT_WW");
		responseDescription.appendChild(responseTitle);
		responseDescription.appendChild(responseText);
		responseDescription.appendChild(descriptionText);

		responseButton.appendChild(responseDescription);

		const costWrapper = document.createElement("div");
		costWrapper.classList.add("flow-row", "grow", "justify-center", "mb-4");

		const influenceIconWrapper = document.createElement("div");
		influenceIconWrapper.classList.add("self-end");
		const influenceIcon = document.createElement("img");
		influenceIcon.classList.add("w-8", "h-8");
		influenceIcon.src = "fs://game/yield_influence";
		influenceIconWrapper.appendChild(influenceIcon);
		costWrapper.appendChild(influenceIconWrapper);

		if (actionData.initialPlayer != GameContext.localPlayerID && actionData.targetPlayer != GameContext.localPlayerID) {
			const leftPlayerLibrary: PlayerLibrary | null = Players.get(this.determineLeftPlayer(actionData));
			if (!leftPlayerLibrary) {
				console.error("screen-diplomacy-action-details: failed to determine left and right players");
				this.close();
			}

			const rightPlayerLibrary: PlayerLibrary | null = Players.get(this.determineRightPlayer(actionData));
			if (!rightPlayerLibrary) {
				console.error("screen-diplomacy-action-details: failed to determine left and right players");
				this.close();
			}
			if (leftPlayerLibrary && rightPlayerLibrary) {
				if (this.leftPledgePlayers.includes(GameContext.localPlayerID)) {
					if (leftPlayerLibrary.id == actionData.targetPlayer) {
						const influenceCost = Game.Diplomacy.getInfluenceForNextSupport(actionData.uniqueID, GameContext.localPlayerID, false);
						const costDescription = document.createElement("div");
						costDescription.id = "support-war-cost";
						costDescription.setAttribute("data-l10n-id", influenceCost.toString());
						costDescription.classList.add("self-end", "mb-1");
						costWrapper.appendChild(costDescription);
					}
					else {
						const influenceCost = Game.Diplomacy.getInfluenceForNextSupport(actionData.uniqueID, GameContext.localPlayerID, true);
						const costDescription = document.createElement("div");
						costDescription.id = "support-war-cost";
						costDescription.setAttribute("data-l10n-id", influenceCost.toString());
						costDescription.classList.add("self-end", "mb-1");
						costWrapper.appendChild(costDescription);
					}
				}
				else {
					if (this.rightPledgePlayers.includes(GameContext.localPlayerID)) {
						if (rightPlayerLibrary.id == actionData.targetPlayer) {
							const influenceCost = Game.Diplomacy.getInfluenceForNextSupport(actionData.uniqueID, GameContext.localPlayerID, false);
							const costDescription = document.createElement("div");
							costDescription.id = "support-war-cost";
							costDescription.setAttribute("data-l10n-id", influenceCost.toString());
							costDescription.classList.add("self-end", "mb-1");
							costWrapper.appendChild(costDescription);
						}
						else {
							const influenceCost = Game.Diplomacy.getInfluenceForNextSupport(actionData.uniqueID, GameContext.localPlayerID, true);
							const costDescription = document.createElement("div");
							costDescription.id = "support-war-cost";
							costDescription.setAttribute("data-l10n-id", influenceCost.toString());
							costDescription.classList.add("self-end", "mb-1");
							costWrapper.appendChild(costDescription);
						}
					}
				}
			}
		}
		else {
			const influenceCost = Game.Diplomacy.getInfluenceForNextSupport(actionData.uniqueID, GameContext.localPlayerID, (actionData.initialPlayer == GameContext.localPlayerID));
			const costDescription = document.createElement("div");
			costDescription.id = "support-war-cost";
			costDescription.setAttribute("data-l10n-id", influenceCost.toString());
			costDescription.classList.add("self-end", "mb-1");
			costWrapper.appendChild(costDescription);
		}


		cardTopWrapper.appendChild(costWrapper);
		responseButton.appendChild(hoveredResponseButtonBg);

		responseItem.appendChild(responseButton);

		const yourWarActionsContainer = document.createElement('fxs-hslot');
		yourWarActionsContainer.classList.add('your-war-actions-container', 'justify-between', 'grow');
		yourWarActionsContainer.appendChild(responseItem);

		const optionLimitedByWarColumn = document.createElement('fxs-vslot');
		optionLimitedByWarColumn.classList.add('option-limited-by-war-column', 'justify-center', 'w-56', 'h-64');
		const optionLimitedByWarBackground = document.createElement('div');
		optionLimitedByWarBackground.classList.add('option-limited-by-war-bg', 'absolute', 'w-full', 'h-full', 'bg-cover', 'bg-center', 'opacity-20');
		optionLimitedByWarColumn.appendChild(optionLimitedByWarBackground);
		const optionLimitedByWarText = document.createElement('fxs-vslot');
		optionLimitedByWarText.classList.add('option-limited-by-war-text', 'justify-center', 'items-center');
		optionLimitedByWarText.setAttribute('data-l10n-id', 'LOC_DIPLOMACY_OPTION_LIMITED_BY_WAR');
		optionLimitedByWarColumn.appendChild(optionLimitedByWarText);

		yourWarActionsContainer.appendChild(optionLimitedByWarColumn);
		yourWarActionsContainer.appendChild(optionLimitedByWarColumn.cloneNode(true));

		return yourWarActionsContainer;
	}

	private updateButtonsAndEditor(actionData: DiplomaticEventHeader): void {
		if (actionData.actionType == DiplomacyActionTypes.DIPLOMACY_ACTION_DECLARE_WAR) {
			// WAR!!!
			const initialPlayer: PlayerLibrary | null = Players.get(actionData.initialPlayer);
			const targetPlayer: PlayerLibrary | null = Players.get(actionData.targetPlayer);

			if (!initialPlayer || !targetPlayer) {
				console.error("screen-diplomacy-action-details: unable to get player structures for involved players!");
				this.close();
				return;
			}

			this.yourWarContentContainer = MustGetElement(".your-war-content-container", this.Root);
			this.supportWarContentContainer = MustGetElement('.support-war-content-container', this.Root);

			const localPlayer = Players.get(GameContext.localPlayerID);
			if (!localPlayer) {
				console.error("screen-diplomacy-action-details: updateButtonsAndEditor(): No local player!");
				return;
			}
			let availableDiplomacyYield: number = 0;
			if (localPlayer.DiplomacyTreasury) {
				availableDiplomacyYield = localPlayer.DiplomacyTreasury?.diplomacyBalance;
			}
			const diplomacyBalance = MustGetElement(".screen-diplomacy-action-details__accumulated-influence", this.Root);
			diplomacyBalance.textContent = Math.floor(availableDiplomacyYield).toString();

			while (this.yourWarContentContainer.hasChildNodes()) {
				this.yourWarContentContainer.removeChild(this.yourWarContentContainer.lastChild!);
			}

			// Populate Your War
			const yourWarContent: HTMLElement = this.createSupportYourselfItem(actionData);
			yourWarContent.setAttribute("has-diploaction-focus-priority", "true");
			yourWarContent.setAttribute('action-key', 'inline-cycle-next');
			this.yourWarContentContainer.appendChild(yourWarContent);
			const supportWarButton = MustGetElement(".support-your-war-button", yourWarContent);

			// Populate Support War
			this.createSupportWarItem(actionData);

			if (this.leftPledgeButton == null || this.rightPledgeButton == null) {
				console.error("screen-diplomacy-action-details: failed to source pledge buttons for war!");
				this.close();
				return;
			}

			if (this.leftPledgePlayers.includes(GameContext.localPlayerID) || this.rightPledgePlayers.includes(GameContext.localPlayerID) || this.determineRightPlayer(actionData) == GameContext.localPlayerID || this.determineLeftPlayer(actionData) == GameContext.localPlayerID) {
				//If we are already involved in this war(supporting or one of the sides), hide the pick sides buttons
				this.supportWarContentContainer.classList.add("hidden");

				if (Game.Diplomacy.getOpposingPlayers(actionData.uniqueID).includes(GameContext.localPlayerID) || actionData.targetPlayer == GameContext.localPlayerID) {
					let supportButtonString: string = "";
					// Support Yourself
					if (actionData.targetPlayer == GameContext.localPlayerID) {
						supportButtonString = Locale.compose("LOC_SUPPORT_WAR_SELF");
					} else {

						// Support Target Player
						const playerName: string | undefined = Players.get(actionData.targetPlayer)?.name;
						if (!playerName) {
							return;
						}
						supportButtonString = Locale.compose("LOC_SUPPORT_WAR_BUTTON", Locale.compose(playerName));
					}
					if (!localPlayer.Diplomacy) {
						return;
					}
					this.changeSupportWarButton(supportWarButton, supportButtonString, actionData.targetPlayer, localPlayer.Diplomacy)

					const supportArgs = {
						ID: DiplomacyManager.selectedActionID,
						Type: DiplomacyTokenTypes.DIPLOMACY_TOKEN_GLOBAL,
						Amount: 1,
						SubType: false, // TRUE: INITIAL. FALSE: TARGET
					}

					const supportResult: OperationResult = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.SUPPORT_DIPLOMATIC_ACTION, supportArgs, false);
					if (supportResult.Success) {
						supportWarButton.setAttribute("disabled", "false");
						supportWarButton.addEventListener("action-activate", () => {
							Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.SUPPORT_DIPLOMATIC_ACTION, supportArgs);
						})
					} else {
						supportWarButton.setAttribute("disabled", "true");
						const influenceText = MustGetElement("#support-war-cost", supportWarButton);
						influenceText.classList.add("text-negative");
					}
				} else {
					let supportButtonString: string = "";
					if (actionData.initialPlayer == GameContext.localPlayerID) {
						supportButtonString = Locale.compose("LOC_SUPPORT_WAR_SELF");
					} else {
						const playerName: string | undefined = Players.get(actionData.initialPlayer)?.name;
						if (!playerName) {
							return;
						}
						supportButtonString = Locale.compose("LOC_SUPPORT_WAR_BUTTON", Locale.compose(playerName));

					}
					if (!localPlayer.Diplomacy) {
						return;
					}
					this.changeSupportWarButton(supportWarButton, supportButtonString, actionData.initialPlayer, localPlayer.Diplomacy)

					const supportArgs: object = {
						ID: DiplomacyManager.selectedActionID,
						Type: DiplomacyTokenTypes.DIPLOMACY_TOKEN_GLOBAL,
						Amount: 1,
						SubType: true, // TRUE: INITIAL. FALSE: TARGET
					}

					const supportResult: OperationResult = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.SUPPORT_DIPLOMATIC_ACTION, supportArgs, false);
					if (supportResult.Success) {
						supportWarButton.setAttribute("disabled", "false");
						supportWarButton.addEventListener("action-activate", () => {
							Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.SUPPORT_DIPLOMATIC_ACTION, supportArgs);
							this.updateButtonsAndEditor(actionData);
						})
					} else {
						supportWarButton.setAttribute("disabled", "true");
						const influenceText = MustGetElement("#support-war-cost", supportWarButton);
						influenceText.classList.add("text-negative");
						let failureReasonsString: string = "";
						if (supportResult.FailureReasons) {

							supportResult.FailureReasons.forEach((reason) => {
								failureReasonsString += Locale.stylize(reason)
							});
							supportWarButton.setAttribute("data-tooltip-content", failureReasonsString);
						}
					}
				}
			} else {
				if (!this.yourWarContentContainer) {
					console.error("screen-diplomacy-action-details.ts at updateButtonsAndEditor: No your-war-content-container was found!");
					return;
				}

				// Player is not involved in this war
				this.yourWarContentContainer.classList.add("hidden");

				// Player can see both sides as options
				this.supportWarContentContainer.classList.remove("hidden");

				// Attempt to enable support for Initial (true)
				if (!this.canSupportSide(true)) {
					this.leftPledgeButton.setAttribute("disabled", "true");
					const influenceText = MustGetElement("#support-war-cost", this.leftPledgeButton);
					influenceText.classList.add("text-negative");
				}

				// Attempt to enable support for Target (false)
				if (!this.canSupportSide(false)) {
					this.rightPledgeButton.setAttribute("disabled", "true");
					const influenceText = MustGetElement("#support-war-cost", this.rightPledgeButton);
					influenceText.classList.add("text-negative");
				}
			}
		} else {
			if (this.leftPledgeButton && this.rightPledgeButton) {
				// Hide the support buttons in any situation besides WAR!!!
				this.supportWarContentContainer?.classList.add("hidden");
			}
		}
	}

	private changeSupportWarButton(supportWarButton: HTMLElement, supportPlayerString: string, playerID: PlayerId, localPlayerDiplomacy: PlayerDiplomacy): void {
		// Don't need to change the button if it's Your War.
		if (playerID == GameContext.localPlayerID) {
			return;
		}

		const supportWarButtonTitle = MustGetElement(".panel-diplomacy-project-reaction__card-title", supportWarButton);
		// support yourself button doesn't have an icon container so make the query optional.
		const supportWarButtonIconContainer = supportWarButton.querySelector(".panel-diplomacy-project-reaction__icon-container");
		const supportWarButtonIcon = MustGetElement(".panel-diplomacy-project-reaction__support-yourself", supportWarButton);

		supportWarButtonTitle.setAttribute("data-l10n-id", supportPlayerString);

		const supportLeaderIcon = this.createPledgeLeaderIcon(playerID, localPlayerDiplomacy);
		if (!supportLeaderIcon) {
			return;
		}

		supportWarButtonIcon.classList.add("opacity-0");
		supportLeaderIcon.classList.add("-left-0\\.5", "-top-2", "absolute");
		supportWarButtonIconContainer?.appendChild(supportLeaderIcon);
	}

	//Initial setup of screen
	private populateActionDetails() {
		//  If action has been canceled then don't show.
		if (Game.Diplomacy.isProjectCanceled(DiplomacyManager.selectedActionID)) {
			this.close();
			return;
		}

		const actionData: DiplomaticEventHeader = Game.Diplomacy.getDiplomaticEventData(DiplomacyManager.selectedActionID);
		if (!actionData) {
			console.error("screen-diplomacy-action-details: Unable to retrieve DiplomaticEventHeader for selected action with ID: " + DiplomacyManager.selectedActionID);
			this.close();
			return;
		}

		if (actionData.actionType == DiplomacyActionTypes.DIPLOMACY_ACTION_GIVE_INFLUENCE_TOKEN && actionData.targetPlayer == DiplomacyManager.selectedPlayerID) {
			this.Root.classList.add("befriend-independant");
		}

		const completionData: DiplomacyEventCompletionData = Game.Diplomacy.getCompletionData(DiplomacyManager.selectedActionID);
		if (!completionData) {
			console.error("screen-diplomacy-action-details: Unable to retrieve DiplomacyEventCompletionData for selected action with ID: " + DiplomacyManager.selectedActionID);
			this.close();
			return;
		}

		this.titleProgressBarContainer = MustGetElement(".title-progress-bar-container", this.Root);

		this.yourWarContentContainer = MustGetElement(".your-war-content-container", this.Root);

		while (this.yourWarContentContainer && this.yourWarContentContainer.hasChildNodes()) {
			this.yourWarContentContainer.removeChild(this.yourWarContentContainer.lastChild!);
		}


		const localPlayer: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (!localPlayer) {
			console.error("screen-diplomacy-action-details: Unable to get player object for local player!")
			this.close();
			return;
		}

		const localPlayerDiplomacy: PlayerDiplomacy | undefined = localPlayer.Diplomacy;
		if (!localPlayerDiplomacy) {
			console.error("screen-diplomacy-action-details: Unable to find local player diplomacy!");
			this.close();
			return;
		}

		// Determine player sides
		const leftPlayer: PlayerId = this.determineLeftPlayer(actionData);

		// Title + name
		const actionName: HTMLElement = document.createElement("fxs-header");
		actionName.classList.add("action-name", "uppercase", "font-title", "text-base");
		actionName.setAttribute('filigree-style', 'h4');

		if (actionData.actionType == DiplomacyActionTypes.DIPLOMACY_ACTION_DECLARE_WAR) {
			actionName.classList.add("war");

			const warData: WarData = Game.Diplomacy.getWarData(actionData.uniqueID, GameContext.localPlayerID);
			actionName.setAttribute('title', warData.warName);

		} else if (actionData.actionType == DiplomacyActionTypes.DIPLOMACY_ACTION_GIVE_INFLUENCE_TOKEN) {
			const village: PlayerLibrary | null = Players.get(actionData.targetPlayer);
			if (village != null) {
				actionName.setAttribute('title', Locale.compose(actionData.name, village.name));
			} else {
				actionName.setAttribute('title', "LOC_DIPLOMACY_ACTION_GIVE_INFLUENCE_TOKEN_PROJECT_NAME");
			}
			this.yourWarContentContainer.classList.add("not-war");
		} else {
			actionName.setAttribute('title', actionData.name);
			this.yourWarContentContainer.classList.add("not-war");
		}
		this.titleProgressBarContainer.appendChild(actionName);

		// Middle Area
		const detailsContainer: HTMLElement = document.createElement("div");
		detailsContainer.classList.add('diplomacy-action-details__details-container');

		// Progress Bar & Info
		const progressContainer: HTMLElement = document.createElement('div');
		progressContainer.classList.add('diplomacy-action-details__progress-container');
		detailsContainer.appendChild(progressContainer);

		if (this.actionContentColumn) {
			this.actionContentColumn.appendChild(detailsContainer);
		}

		// Create pledge groups for befriend independents
		if (actionData.actionType == DiplomacyActionTypes.DIPLOMACY_ACTION_GIVE_INFLUENCE_TOKEN) {
			const supportContainer: HTMLElement = document.createElement('div');
			supportContainer.classList.add('diplomacy-action-details__support-container');

			const supportGroupContainer: HTMLElement = document.createElement('div');
			supportGroupContainer.classList.add('diplomacy-action-details__pledge-group-container');
			this.titleProgressBarContainer.appendChild(supportGroupContainer);

			const pledgeContainer: HTMLElement = this.createPledgeGroup();
			pledgeContainer.classList.add("left-pledge-group");
			pledgeContainer.classList.add("is-positive");
			pledgeContainer.classList.add("befriend-group-left");
			supportGroupContainer.appendChild(pledgeContainer);

			const pledgeContainerRight: HTMLElement = this.createPledgeGroup();
			pledgeContainerRight.classList.add("right-pledge-group");
			pledgeContainerRight.classList.add("is-negative");
			pledgeContainerRight.classList.add("befriend-group-right");
			supportGroupContainer.appendChild(pledgeContainerRight);

			const pledgeIconContainer: HTMLElement = document.createElement("div");
			pledgeIconContainer.classList.add("diplomacy-action-details__pledge-group-icon-container");
			pledgeContainer.appendChild(pledgeIconContainer);

			// Update this.left/rightPledgePlayers
			this.updatePlayerGroups(actionData, leftPlayer);

			this.leftPledgePlayers.forEach(playerID => {
				const pledgeLeaderIcon: HTMLElement | null = this.createPledgeLeaderIcon(playerID, localPlayerDiplomacy);
				if (!pledgeLeaderIcon) {
					return;
				}
				pledgeIconContainer.appendChild(pledgeLeaderIcon);
			});

			// Add text
			const pledgeContainerTitle = this.createPledgeGroupValues(Math.abs(this.determineLocalPlayerSupport(actionData)));
			if (pledgeContainerTitle) {
				pledgeContainer.appendChild(pledgeContainerTitle);
			}

			progressContainer.appendChild(supportContainer);

			detailsContainer.classList.add("is-befriend-independent");
		}

		const projectData: DiplomaticProjectUIData | undefined = Game.Diplomacy.getProjectDataForUI(actionData.initialPlayer, -1, DiplomacyActionTargetTypes.NO_DIPLOMACY_TARGET, DiplomacyActionGroups.NO_DIPLOMACY_ACTION_GROUP, -1, DiplomacyActionTargetTypes.NO_DIPLOMACY_TARGET).find(project => project.actionID == DiplomacyManager.selectedActionID);
		if (projectData && (projectData.actionGroup == DiplomacyActionGroups.DIPLOMACY_ACTION_GROUP_PROJECT || projectData.actionGroup == DiplomacyActionGroups.DIPLOMACY_ACTION_GROUP_ENDEAVOR || projectData.actionGroup == DiplomacyActionGroups.DIPLOMACY_ACTION_GROUP_SANCTION) && projectData.actionType != DiplomacyActionTypes.DIPLOMACY_ACTION_GIVE_INFLUENCE_TOKEN) {
			const projectDescriptionContainer: HTMLElement = document.createElement('div');
			projectDescriptionContainer.classList.add("diplomacy-action-details__project-description-container");
			projectDescriptionContainer.setAttribute('data-l10n-id', projectData.projectDescription);
			detailsContainer.appendChild(projectDescriptionContainer);
		}

		// Create pledge groups
		if (actionData.actionType == DiplomacyActionTypes.DIPLOMACY_ACTION_DECLARE_WAR) {
			this.createPledgeGroups(actionData, completionData, localPlayerDiplomacy);
		}

		this.updateButtonsAndEditor(actionData);
	}

	private updateActionDetails(): void {
		//  If action has been canceled then don't show.
		if (Game.Diplomacy.isProjectCanceled(DiplomacyManager.selectedActionID)) {
			this.close();
			return;
		}

		const actionData: DiplomaticEventHeader = Game.Diplomacy.getDiplomaticEventData(DiplomacyManager.selectedActionID);
		if (!actionData) {
			console.error("screen-diplomacy-action-details: Unable to retrieve DiplomaticEventHeader for selected action with ID: " + DiplomacyManager.selectedActionID);
			this.close();
			return;
		}

		const leftPlayer: PlayerId = this.determineLeftPlayer(actionData);
		this.updatePlayerGroups(actionData, leftPlayer);

		const completionData: DiplomacyEventCompletionData = Game.Diplomacy.getCompletionData(DiplomacyManager.selectedActionID);
		if (!completionData) {
			console.error("screen-diplomacy-action-details: Unable to retrieve DiplomacyEventCompletionData for selected action with ID: " + DiplomacyManager.selectedActionID);
			this.close();
			return;
		}

		const localPlayer: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (!localPlayer) {
			console.error("screen-diplomacy-action-details: Unable to get player object for local player!")
			this.close();
			return;
		}

		const localPlayerDiplomacy: PlayerDiplomacy | undefined = localPlayer.Diplomacy;
		if (!localPlayerDiplomacy) {
			console.error("screen-diplomacy-action-details: Unable to find local player diplomacy!");
			this.close();
			return;
		}

		if (this.yourWarContentContainer) {
			const oldSupportContainer: HTMLElement | null = this.yourWarContentContainer.querySelector(".diplomacy-action-details__support-container");
			if (oldSupportContainer) {
				this.yourWarContentContainer.removeChild(oldSupportContainer);
			}
			if (actionData.actionType == DiplomacyActionTypes.DIPLOMACY_ACTION_DECLARE_WAR) {
				this.createPledgeGroups(actionData, completionData, localPlayerDiplomacy);
			}

			this.updateButtonsAndEditor(actionData);
		}
	}

	private disablePledgeButtons(): void {
		if (this.leftPledgeButton && this.rightPledgeButton) {
			this.leftPledgeButton.classList.add("disabled");
			this.rightPledgeButton.classList.add("disabled");
		}
	}

	private supportSide(initial: boolean): boolean {
		const globalOpposeArgs: object = {
			ID: DiplomacyManager.selectedActionID,
			Type: DiplomacyTokenTypes.DIPLOMACY_TOKEN_GLOBAL,
			Amount: 1,
			SubType: initial, // TRUE: INITIAL. FALSE: TARGET
		}

		const globalOpposeResults: OperationResult = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.SUPPORT_DIPLOMATIC_ACTION, globalOpposeArgs, false);

		if (Game.Diplomacy.isProjectCanceled(DiplomacyManager.selectedActionID)) {
			return false;
		}

		const actionData: DiplomaticEventHeader = Game.Diplomacy.getDiplomaticEventData(DiplomacyManager.selectedActionID);
		if (!actionData) {
			console.error("screen-diplomacy-action-details: Unable to retrieve DiplomaticEventHeader for selected action with ID: " + DiplomacyManager.selectedActionID);
			return false;
		}

		if (globalOpposeResults.Success) {
			Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.SUPPORT_DIPLOMATIC_ACTION, globalOpposeArgs);
			this.disablePledgeButtons();
			return true;
		} else {
			return false;
		}
	}

	private addLeftSupport(actionData: DiplomaticEventHeader): boolean {
		const leftPlayer: PlayerId = this.determineLeftPlayer(actionData);
		this.updateButtonsAndEditor(actionData);
		return this.supportSide(leftPlayer == actionData.initialPlayer);
	}

	private addRightSupport(actionData: DiplomaticEventHeader): boolean {
		const leftPlayer: PlayerId = this.determineLeftPlayer(actionData);
		this.updateButtonsAndEditor(actionData);
		return this.supportSide(leftPlayer != actionData.initialPlayer);
	}

	private canSupportSide(initial: boolean): boolean {
		const supportArgs: object = {
			ID: DiplomacyManager.selectedActionID,
			Type: DiplomacyTokenTypes.DIPLOMACY_TOKEN_GLOBAL,
			Amount: 1,
			SubType: initial, // TRUE: INITIAL. FALSE: TARGET.
		}
		const results: OperationResult = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.SUPPORT_DIPLOMATIC_ACTION, supportArgs, false);

		if (!results.FailureReasons) {
			return results.Success;
		}

		if (results.FailureReasons.length <= 0) {
			return results.Success;
		}

		if (!this.leftPledgeButton || !this.rightPledgeButton) {
			return results.Success;
		}

		const tooltipTargetButton = initial ? this.leftPledgeButton : this.rightPledgeButton;
		if (!tooltipTargetButton) {
			return results.Success;
		}

		let failureReasonsString: string = "";
		results.FailureReasons.forEach((reason) => {
			failureReasonsString += Locale.stylize(reason);
		});

		tooltipTargetButton.setAttribute("data-tooltip-content", failureReasonsString);

		return results.Success;
	}

	private createPledgeLeaderIcon(playerID: PlayerId, localPlayerDiplomacy: PlayerDiplomacy): HTMLElement | null {

		const target = Configuration.getPlayer(playerID);
		if (target?.leaderTypeName) {
			const targetIcon = document.createElement("leader-icon");
			targetIcon.classList.add("mr-2", "mt-1", "w-16", "h-16", "relative", "pointer-events-auto");

			if (playerID == GameContext.localPlayerID || localPlayerDiplomacy.hasMet(playerID)) {
				const player: PlayerLibrary | null = Players.get(playerID);
				if (!player) {
					console.error("screen-diplomacy-action-details: Unable to get player object for player with id: " + playerID);
					return null;
				}
				targetIcon.setAttribute("data-tooltip-content", Locale.compose("LOC_DIPLOMACY_ACTIONS_SUPPORTING_TOKEN_FROM_PLAYER", Locale.compose(player.name)));
				targetIcon.setAttribute("leader", target.leaderTypeName);
				targetIcon.setAttribute("bg-color", UI.Player.getPrimaryColorValueAsString(playerID))
			} else {
				targetIcon.setAttribute("data-tooltip-content", Locale.compose("LOC_DIPLOMACY_ACTIONS_SUPPORTING_TOKEN_FROM_UNMET_PLAYER"));
			}
			return targetIcon;
		}

		return null;
	}

	private onSupportChanged(data: DiplomacyEventSupportChanged_EventData) {
		if (data.actionID == DiplomacyManager.selectedActionID) {
			this.updateActionDetails();
			waitUntilValue(() => this.Root.querySelector('.pledge-right-button')).then(() => {
				this.realizeFocus();
				this.realizeNavtray();
			});
			if (Game.Diplomacy.isProjectCanceled(DiplomacyManager.selectedActionID)) {
				this.close();
			}
		}
	}

	private onClose() {
		this.close();
	}

	private closeFromPauseSignal() {
		DiplomacyManager.shouldQuickClose = false;
		this.close();
	}

	protected close() {
		DiplomacyManager.selectedActionID = -1;
		if (DiplomacyManager.shouldQuickClose) {
			DiplomacyManager.shouldQuickClose = false;
			DiplomacyManager.lowerDiplomacyHub();
		}
		window.dispatchEvent(new CustomEvent('diplomacy-action-details-closed'));
		super.close();
	}

	private realizeNavtray() {
		NavTray.clear();
		NavTray.addOrUpdateGenericBack();
	}

	private realizeFocus() {
		if (this.supportWarContentContainer?.classList.contains("hidden")) {
			this.focusableElements = [this.supportYourselfButton];
		}
		else {
			this.focusableElements = [this.leftPledgeButton, this.rightPledgeButton];
		}

		// Only keep elements that are set to be focused via a custom tag: "has-diploaction-focus-priority"
		const availableElements: (HTMLElement | null)[] = this.focusableElements.filter(
			(element) => element?.getAttribute("has-diploaction-focus-priority") == "true"
		);

		// Get first non-disabled element.  If all are disabled then the first element.
		const focusElement: HTMLElement | null | undefined = availableElements.find(
			(element) => !element?.classList.contains("disabled")) ?? availableElements.find(() => true
			);

		// Only attempt to set focus if a value is set.
		if (focusElement) {
			FocusManager.setFocus(focusElement);
		} else {
			// TODO: can this be omitted? Yes if focus is guaranteed to be being handled on a higher level.
			if (this.yourWarContentContainer) {
				FocusManager.setFocus(this.yourWarContentContainer);
			}
		}

	}
}

Controls.define('screen-diplomacy-action-details', {
	createInstance: DiplomacyActionDetailsScreen,
	description: 'Diplomacy Action Details screen.',
	styles: ['fs://game/base-standard/ui/diplomacy-action-details/screen-diplomacy-action-details.css'],
	content: ['fs://game/base-standard/ui/diplomacy-action-details/screen-diplomacy-action-details.html'],
	classNames: ['screen-diplomacy-action-details', 'w-full', 'h-full', 'flex', 'justify-center', 'items-center'],
	attributes: []
});
