/**
* @file screen-diplomacy-call-to-arms.ts
* @copyright 2023, Firaxis Games
* @description Handles players going to war when their allies declare war 
*/

import { AnchorType } from '/core/ui/panel-support.js';
import DiplomacyManager, { DiplomacyInputPanel } from '/base-standard/ui/diplomacy/diplomacy-manager.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { Icon } from '/core/ui/utilities/utilities-image.js'
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import LeaderModelManager from '/base-standard/ui/diplomacy/leader-model-manager.js';
import { InputEngineEvent } from '/core/ui/input/input-support.js';

class DiplomacyCallToArmsScreen extends DiplomacyInputPanel {

	private declineButton: HTMLElement | null = null;

	constructor(root: ComponentRoot) {
		super(root);
		this.animateInType = this.animateOutType = AnchorType.RelativeToBottom;
	}

	onAttach(): void {
		const closeButton: HTMLElement = document.createElement('fxs-close-button');
		closeButton.addEventListener('action-activate', () => {
			this.close();
		});
		this.Root.appendChild(closeButton);

		if (!this.checkShouldShowPanel()) {
			return;
		}

		this.populateCallToArmsInfo();
	}

	private populateCallToArmsInfo() {
		if (!DiplomacyManager.currentAllyWarData) {
			console.error("screen-diplomacy-call-to-arms: Attempting to populate call to arms screen but no valid war data!");
			this.close();
			return;
		}

		const callToArmsTitleText: HTMLElement | null = this.Root.querySelector(".call-to-arms__title-text");
		if (!callToArmsTitleText) {
			console.error("screen-diplomacy-call-to-arms: Unable to find element with class call-to-arms__title-text!");
			this.close();
			return;
		}

		const callToArmsBodyText: HTMLElement | null = this.Root.querySelector(".call-to-arms__body-text");
		if (!callToArmsBodyText) {
			console.error("screen-diplomacy-call-to-arms: Unable to find element with class call-to-arms__body-text!");
			this.close();
			return;
		}

		const localPlayerDiplomacy: PlayerDiplomacy | undefined = Players.get(GameContext.localPlayerID)?.Diplomacy;
		if (!localPlayerDiplomacy) {
			console.error("screen-diplomacy-call-to-arms: No valid Diplomacy Library attached to the local player object");
			return;
		}

		const pickSidesButtonContainer: HTMLElement | null = this.Root.querySelector(".call-to-arms__pick-side-button-container");
		if (!pickSidesButtonContainer) {
			console.error("screen-diplomacy-call-to-arms: Unable to find element with class call-to-arms__pick-side-button-container");
			return;
		}

		const buttonContainer: HTMLElement | null = this.Root.querySelector(".call-to-arms__button-container");

		const targetPlayer: PlayerLibrary | null = Players.get(DiplomacyManager.currentAllyWarData.targetPlayer);
		const initiatorPlayer: PlayerLibrary | null = Players.get(DiplomacyManager.currentAllyWarData.initialPlayer);

		if (!targetPlayer || !initiatorPlayer) {
			console.error("screen-diplomacy-call-to-ars: Unable to get PlayerLibraries for involved players!");
			return;
		}

		const targetPlayerIcon: HTMLElement | null = this.Root.querySelector(".target-player-icon");
		const initiatorPlayerIcon: HTMLElement | null = this.Root.querySelector(".initiator-player-icon");

		if (!targetPlayerIcon || !initiatorPlayerIcon) {
			console.error("screen-diplomacy-call-to-ars: Unable to find player icon elements!");
			return;
		}

		targetPlayerIcon.style.backgroundImage = `url(${Icon.getLeaderPortraitIcon(targetPlayer.leaderType)})`;
		initiatorPlayerIcon.style.backgroundImage = `url(${Icon.getLeaderPortraitIcon(initiatorPlayer.leaderType)})`;

		const targetRelationshipIcon: HTMLElement | null = this.Root.querySelector(".target-relationship-icon");
		const initiatorRelationshipIcon: HTMLElement | null = this.Root.querySelector(".initiator-relationship-icon");
		if (!targetRelationshipIcon || !initiatorRelationshipIcon) {
			console.error("screen-diplomacy-call-to-ars: Unable to find relationship icon elements!");
			return;
		}

		LeaderModelManager.showLeaderModels(targetPlayer.id, initiatorPlayer.id);

		if (localPlayerDiplomacy.hasAllied(DiplomacyManager.currentAllyWarData.targetPlayer) && localPlayerDiplomacy.hasAllied(DiplomacyManager.currentAllyWarData.initialPlayer)) {
			//Both are allies, choose a side or break both alliances
			callToArmsTitleText.innerHTML = Locale.compose("LOC_DIPLOMACY_ALLY_WAR_PICK_ALLEGIENCE_TITLE");
			callToArmsBodyText.innerHTML = Locale.compose("LOC_DIPLOMACY_ALLY_WAR_BOTH_ALLIES", Locale.compose(initiatorPlayer.name), Locale.compose(targetPlayer.name));
			this.Root.classList.add("pick-side");

			const sideButtonOne: HTMLElement = document.createElement("fxs-button");
			sideButtonOne.classList.add("side-button");
			sideButtonOne.setAttribute("caption", Locale.compose(initiatorPlayer.name));
			sideButtonOne.setAttribute("action-key", "inline-accept");
			sideButtonOne.addEventListener("action-activate", () => { this.acceptCallToArms(DiplomacyManager.currentAllyWarData!.targetPlayer) });

			const sideButtonTwo: HTMLElement = document.createElement("fxs-button");
			sideButtonTwo.classList.add("side-button");
			sideButtonTwo.setAttribute("caption", Locale.compose(targetPlayer.name));
			sideButtonTwo.setAttribute("action-key", "inline-accept");
			sideButtonTwo.addEventListener("action-activate", () => { this.acceptCallToArms(DiplomacyManager.currentAllyWarData!.initialPlayer) });

			pickSidesButtonContainer.appendChild(sideButtonTwo);
			pickSidesButtonContainer.appendChild(sideButtonOne);
			FocusManager.setFocus(pickSidesButtonContainer);

			targetRelationshipIcon.style.backgroundImage = `url(${UI.getIcon("PLAYER_RELATIONSHIP_ALLIANCE", "PLAYER_RELATIONSHIP")})`
			initiatorRelationshipIcon.style.backgroundImage = `url(${UI.getIcon("PLAYER_RELATIONSHIP_ALLIANCE", "PLAYER_RELATIONSHIP")})`
		} else {
			callToArmsTitleText.innerHTML = Locale.compose("LOC_DIPLOMACY_ALLY_WAR_TITLE");
			pickSidesButtonContainer.classList.add("hidden");

			const acceptButton: HTMLElement = document.createElement("fxs-button");
			acceptButton.setAttribute("caption", Locale.compose("LOC_ACCEPT"));
			acceptButton.setAttribute("action-key", "inline-accept");

			if (localPlayerDiplomacy.hasAllied(DiplomacyManager.currentAllyWarData.targetPlayer)) {
				callToArmsBodyText.innerHTML = Locale.compose("LOC_DIPLOMACY_ALLY_WAR_BODY_TEXT", Locale.compose(targetPlayer.name), Locale.compose(initiatorPlayer.name));
				acceptButton.addEventListener("action-activate", () => { this.acceptCallToArms(DiplomacyManager.currentAllyWarData!.initialPlayer) });

				targetRelationshipIcon.style.backgroundImage = `url(${UI.getIcon("PLAYER_RELATIONSHIP_ALLIANCE", "PLAYER_RELATIONSHIP")})`

				const relationshipWithInitiator: DiplomacyPlayerRelationships = localPlayerDiplomacy.getRelationshipEnum(initiatorPlayer.id);
				initiatorRelationshipIcon.style.backgroundImage = `url(${UI.getIcon(DiplomacyManager.getRelationshipTypeString(relationshipWithInitiator), "PLAYER_RELATIONSHIP")}`;
			} else {
				callToArmsBodyText.innerHTML = Locale.compose("LOC_DIPLOMACY_ALLY_WAR_BODY_TEXT", Locale.compose(initiatorPlayer.name), Locale.compose(targetPlayer.name));
				acceptButton.addEventListener("action-activate", () => { this.acceptCallToArms(DiplomacyManager.currentAllyWarData!.targetPlayer) });

				initiatorRelationshipIcon.style.backgroundImage = `url(${UI.getIcon("PLAYER_RELATIONSHIP_ALLIANCE", "PLAYER_RELATIONSHIP")})`

				const relationshipWithTarget: DiplomacyPlayerRelationships = localPlayerDiplomacy.getRelationshipEnum(targetPlayer.id);
				targetRelationshipIcon.style.backgroundImage = `url(${UI.getIcon(DiplomacyManager.getRelationshipTypeString(relationshipWithTarget), "PLAYER_RELATIONSHIP")})`;
			}

			buttonContainer?.appendChild(acceptButton);
			FocusManager.setFocus(acceptButton);
		}

		const hideButton: HTMLElement = document.createElement("fxs-button");
		hideButton.setAttribute("caption", Locale.compose("LOC_DIPLOMACY_ALLY_WAR_HIDE"));
		hideButton.addEventListener("action-activate", () => { this.close() })
		hideButton.setAttribute("tabindex", "");
		hideButton.setAttribute("action-key", "inline-cancel");
		buttonContainer?.appendChild(hideButton);

		this.declineButton = document.createElement("fxs-button");
		this.declineButton.setAttribute("caption", Locale.compose("LOC_SYSTEM_MESSAGE_GAME_INVITE_DECLINE"));
		this.declineButton.addEventListener("action-activate", () => { this.declineCallToArms(localPlayerDiplomacy, DiplomacyManager.currentAllyWarData!.targetPlayer, DiplomacyManager.currentAllyWarData!.initialPlayer) });
		this.declineButton.setAttribute("tabindex", "");
		this.declineButton.setAttribute("action-key", "inline-shell-action-1");
		buttonContainer?.appendChild(this.declineButton);
	}

	private checkShouldShowPanel() {
		this.Root.classList.add("hidden");
		return false;
	}

	private declineCallToArms(localPlayerDiplomacy: PlayerDiplomacy, initiator: PlayerId, target: PlayerId) {
		if (localPlayerDiplomacy.hasAllied(initiator)) {
			const breakAllianceArgs = {
				Player1: GameContext.localPlayerID,
				Player2: initiator,
				Type: DiplomacyActionTypes.DIPLOMACY_ACTION_FORM_ALLIANCE
			}

			Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.CANCEL_ALLIANCE, breakAllianceArgs);
		}

		if (localPlayerDiplomacy.hasAllied(target)) {
			const breakAllianceArgs = {
				Player1: GameContext.localPlayerID,
				Player2: target,
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

	protected close() {
		LeaderModelManager.exitLeaderScene();
		setTimeout(() => { InterfaceMode.switchToDefault(); }, LeaderModelManager.MAX_LENGTH_OF_ANIMATION_EXIT);
	}

	handleInput(inputEvent: InputEngineEvent) {
		if (!InterfaceMode.isInInterfaceMode("INTERFACEMODE_CALL_TO_ARMS")) {
			return true;
		}

		const inputEventName = inputEvent.detail.name;
		switch (inputEventName) {
			case 'cancel':
			case 'sys-menu':
			case 'keyboard-escape':
			case 'mousebutton-right':
				this.close();
				return false;
			case 'shell-action-1':
				this.declineButton?.dispatchEvent(new CustomEvent("action-activate"));
				return false;
		}

		return true;
	}
}

Controls.define('panel-diplomacy-call-to-arms', {
	createInstance: DiplomacyCallToArmsScreen,
	description: 'Diplomacy Call To Arms Screen.',
	styles: ['fs://game/base-standard/ui/diplomacy-call-to-arms/screen-diplomacy-call-to-arms.css'],
	content: ['fs://game/base-standard/ui/diplomacy-call-to-arms/screen-diplomacy-call-to-arms.html'],
	classNames: ['screen-diplomacy-call-to-arms'],
	attributes: []
});
