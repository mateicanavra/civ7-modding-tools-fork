/**
 * @file panel-diplomacy-hub.ts
 * @copyright 2021-2025, Firaxis Games
 * @description Handles the player initiated actions and incoming statements for diplomacy
 */

import DiplomacyManager, { DiplomacyInputPanel } from '/base-standard/ui/diplomacy/diplomacy-manager.js';
import LeaderModelManager from '/base-standard/ui/diplomacy/leader-model-manager.js';
import { LeaderSequenceData } from '/base-standard/ui/diplomacy/leader-model-manager.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { InputEngineEvent } from '/core/ui/input/input-support.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import { AnchorType } from '/core/ui/panel-support.js';
import ActionHandler, { ActiveDeviceTypeChangedEvent, ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js'
import ContextManager from '/core/ui/context-manager/context-manager.js';

const FirstMeetOpenReactions: CustomEvent = new CustomEvent("diplomacy-first-meet-open-reactions")

class DiplomacyHubPanel extends DiplomacyInputPanel {

	private interfaceModeChangedListener: EventListener = () => { this.onInterfaceModeChanged() };
	private diplomacyDialogNextListener: EventListener = () => { this.onNextDiplomacyDialog() };
	private diplomacyDialogUpdateResponseListener: EventListener = () => { this.onUpdateResponse() };
	private diplomacyAnimationFinishedListener: EventListener = (event: CustomEvent) => { this.onDiplomacyAnimationFinished(event) };
	private viewReceiveFocusListener: EventListener = () => { this.onViewReceiveFocus(); };
	private diplomacyEventResponseListener = (eventData: DiplomacyEventResponse_EventData) => { this.onDiplomacyEventResponse(eventData) }

	private isSkipAllowed: boolean = false;
	private hasSkipped: boolean = false;

	private isShowingActionResponse: boolean = false;

	constructor(root: ComponentRoot) {
		super(root);
		this.animateInType = this.animateOutType = AnchorType.RelativeToBottom;
	}

	onAttach() {
		//TODO Implement the current use case for the custom dialog box as a custom component and then pull out the changes made here for custom dialogs
		super.onAttach();

		window.addEventListener('diplomacy-dialog-next', this.diplomacyDialogNextListener);
		window.addEventListener('diplomacy-dialog-update-response', this.diplomacyDialogUpdateResponseListener);
		window.addEventListener('interface-mode-changed', this.interfaceModeChangedListener);
		window.addEventListener(ActiveDeviceTypeChangedEventName, this.updateSkipLabel);

		this.Root.addEventListener('view-receive-focus', this.viewReceiveFocusListener);

		engine.on("DiplomacyEventResponse", this.diplomacyEventResponseListener);

		if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_DIALOG")) {
			this.populateDialog();
		} else {
			this.Root.classList.add("hidden");
		}

		this.isSkipAllowed = false;
	}

	onDetach() {
		window.removeEventListener('diplomacy-dialog-next', this.diplomacyDialogNextListener);
		window.removeEventListener('diplomacy-dialog-update-response', this.diplomacyDialogUpdateResponseListener);
		window.removeEventListener('interface-mode-changed', this.interfaceModeChangedListener);
		window.removeEventListener(ActiveDeviceTypeChangedEventName, this.updateSkipLabel);

		this.Root.removeEventListener('view-receive-focus', this.viewReceiveFocusListener);

		engine.off("DiplomacyEventResponse", this.diplomacyEventResponseListener);

		NavTray.clear();

		super.onDetach();
	}

	private onViewReceiveFocus() {
		// if we lose focus on the acknowledge button, we need to focus on it again
		const acceptButtons = this.Root.querySelector(".panel-diplomacy-hub__button-acknowledge");
		if (acceptButtons) {
			FocusManager.setFocus(acceptButtons);
		}
		this.populateNavTray();
	}

	private populateNavTray() {
		NavTray.clear();
		if (this.Root.classList.contains("initial-subtitles") && this.isSkipAllowed) {
			NavTray.addOrUpdateCancel("LOC_DIPLOMACY_SKIP_DIALOG");
			return;
		}
	}

	// ------------------------------------------------------------------------
	// Populate the leader dialog, based on the the data in 
	// DiplomacyManager.currentDiplomacyDialogData
	private populateDialog() {
		if (!DiplomacyManager.currentDiplomacyDialogData) {
			console.error("panel-diplomacy-dialog: populateDialog(): Invalid currentDiplomacyDialogData, closing current dialog!")
			DiplomacyManager.closeCurrentDiplomacyDialog();
			return;
		}
		this.isShowingActionResponse = false;
		this.Root.classList.remove("action-response");
		this.Root.classList.remove("fade-action-response");
		this.Root.classList.remove("hidden");
		this.Root.classList.add("initial-subtitles");

		//const statementType: string = Game.DiplomacySessions.getKeyNameOrNumber(data.values.StatementType);

		const dialogTextElement: HTMLElement | null = this.Root.querySelector<HTMLElement>(".dialog-text");
		if (!dialogTextElement) {
			console.error("panel-diplomacy-hub: populateDialog(): Missing dialogTextElement with '.dialog-text'");
			DiplomacyManager.closeCurrentDiplomacyDialog();
			return;
		}

		const dialogOptionsContainer: HTMLElement | null = this.Root.querySelector<HTMLElement>(".diplomacy-options");
		if (!dialogOptionsContainer) {
			console.error("panel-diplomacy-hub: populateDialog(): Missing dialogOptionsContainer with '.diplomacy-options'");
			DiplomacyManager.closeCurrentDiplomacyDialog();
			return;
		}

		while (dialogOptionsContainer.hasChildNodes()) {
			dialogOptionsContainer.removeChild(dialogOptionsContainer.lastChild!);
		}

		// Is there something we should look at?

		let focusLocation: PlotCoord | undefined;

		const focusUnit = Units.get(DiplomacyManager.currentDiplomacyDialogData.FocusID);
		if (focusUnit) {
			focusLocation = focusUnit.location;
		}

		if (DiplomacyManager.currentDiplomacyDialogData.StatementTypeDef) {
			const params: LeaderSequenceData = {
				sequenceType: DiplomacyManager.currentDiplomacyDialogData.StatementTypeDef.GroupType,
				sequenceSubType: "",
				player1: GameContext.localPlayerID,
				player2: DiplomacyManager.currentDiplomacyDialogData.OtherPlayerID,
				initiatingPlayer: DiplomacyManager.currentDiplomacyDialogData.InitiatingPlayerID,
				focusID: DiplomacyManager.currentDiplomacyDialogData.FocusID,
				focusLocation: focusLocation
			};
			if (DiplomacyManager.currentDiplomacyDialogData.DealAction) {
				if (DiplomacyManager.currentDiplomacyDialogData.DealAction == DiplomacyDealProposalActions.ACCEPTED) {
					params.sequenceType = "ACCEPT_PEACE";
				} else if (DiplomacyManager.currentDiplomacyDialogData.DealAction == DiplomacyDealProposalActions.REJECTED) {
					params.sequenceType = "REJECT_PEACE";
				}
			}
			//Show 3D leader models
			if (LeaderModelManager.showLeaderSequence(params)) {
				// Setup an event handler to catch when the sequence is complete
				window.addEventListener('diplomacy-animation-finished', this.diplomacyAnimationFinishedListener);
			}
			else {
				console.error("panel-diplomacy-hub: populateDialog(): Unknown Statement Group, unable to determine what leader scene to show");
				DiplomacyManager.closeCurrentDiplomacyDialog();
				return;
			}
		}

		dialogTextElement.innerHTML = DiplomacyManager.currentDiplomacyDialogData.Message;
		dialogTextElement.classList.add("font-body", "text-base", "text-center");
		const diploDialogWrapper = MustGetElement(".diplomacy-dialog-content", this.Root);

		/// create a wrapper for the chooser buttons
		diploDialogWrapper.classList.add("panel-diplomacy-hub__dialog-declare-war");
		const postDeclareWarOptions = MustGetElement(".diplomacy-options", this.Root);
		const postDeclareWarWrapper = document.createElement("fxs-hslot");
		postDeclareWarOptions.appendChild(postDeclareWarWrapper);
		if (DiplomacyManager.isDeclareWarDiplomacyOpen || DiplomacyManager.currentDiplomacyDialogData.StatementTypeDef?.GroupType == "WAR") {
			/// Create a chooser button for each dialog option

			DiplomacyManager.currentDiplomacyDialogData.Choices.forEach((dialogOption, index) => {

				if (dialogOption.ChoiceType == "CHOICE_EXIT") {
					const ackButton = document.createElement("chooser-item");
					ackButton.addEventListener('action-activate', () => {
						const otherButtons = dialogOptionsContainer.querySelectorAll("chooser-item");
						otherButtons.forEach(dialogButton => {
							dialogButton.classList.add("disabled");
							dialogButton.setAttribute("disabled", "true");
						});
						dialogOption.Callback();
					});
					ackButton.classList.add("panel-diplomacy-hub__button-acknowledge", "chooser-item_unlocked", "font-title", "uppercase", "tracking-150", "text-secondary-1", "text-xs", "self-center", "min-h-16", "w-72", "p-4", "ml-4", "flow-row");
					postDeclareWarWrapper.appendChild(ackButton);

					const radialBG = document.createElement("div");
					radialBG.classList.add("panel-diplomacy-hub__radial-bg", "absolute", "self-center", "bg-cover", "size-16", "group-focus\\:opacity-0", "group-hover\\:opacity-0", "group-active\\:opacity-0", "opacity-1");
					const radialBGHover = document.createElement("div");
					radialBGHover.classList.add("panel-diplomacy-hub__radial-bg-hover", "absolute", "self-center", "opacity-0", "bg-cover", "size-16", "group-focus\\:opacity-100", "group-hover\\:opacity-100", "group-active\\:opacity-100");

					const closeDealButton = MustGetElement('.panel-diplomacy-hub__button-acknowledge', this.Root);
					closeDealButton.appendChild(radialBG);
					closeDealButton.appendChild(radialBGHover);
					const closeDealIconWrapper = document.createElement("div");
					closeDealIconWrapper.classList.add("absolute", "size-16", "self-center", "bg-cover", "panel-diplomacy-project-reaction__close-icon");
					let acknowledgeIcon = document.createElement("img");
					acknowledgeIcon.classList.add("flex", "self-center", "mt-4", "size-9");

					acknowledgeIcon.setAttribute("src", UI.getIconURL("DIPLOMACY_ESP_SUCCESS"));
					closeDealIconWrapper.appendChild(acknowledgeIcon);
					closeDealButton.appendChild(closeDealIconWrapper);
					const closeDealDescription = document.createElement("div");
					closeDealDescription.classList.add("relative", "ml-18", "self-center", "max-w-56");
					closeDealDescription.setAttribute('data-l10n-id', dialogOption.ChoiceString);
					ackButton.setAttribute('tabindex', index.toString());
					closeDealButton.appendChild(closeDealDescription);
				}
				else {
					const warDetailsButton = document.createElement("chooser-item");
					warDetailsButton.addEventListener('action-activate', () => {
						const otherButtons = dialogOptionsContainer.querySelectorAll("chooser-item");
						otherButtons.forEach(dialogButton => {
							dialogButton.classList.add("disabled");
							dialogButton.setAttribute("disabled", "true");
						});
						dialogOption.Callback();
					});
					warDetailsButton.classList.add("panel-diplomacy-hub__button-open-war", "chooser-item_unlocked", "font-title", "uppercase", "tracking-150", "text-secondary-1", "text-xs", "self-center", "min-h-16", "w-72", "p-4", "mx-4", "flow-row");
					postDeclareWarWrapper.appendChild(warDetailsButton);

					const radialBGWar = document.createElement("div");
					radialBGWar.classList.add("panel-diplomacy-hub__radial-bg", "absolute", "self-center", "bg-cover", "size-16", "group-focus\\:opacity-0", "group-hover\\:opacity-0", "group-active\\:opacity-0", "opacity-1");
					const radialBGWarHover = document.createElement("div");
					radialBGWarHover.classList.add("panel-diplomacy-hub__radial-bg-hover", "absolute", "self-center", "opacity-0", "bg-cover", "size-16", "group-focus\\:opacity-100", "group-hover\\:opacity-100", "group-active\\:opacity-100");

					const diplomacyOptions = MustGetElement(".panel-diplomacy-hub__button-open-war", this.Root);
					diplomacyOptions.appendChild(radialBGWar);
					diplomacyOptions.appendChild(radialBGWarHover);

					const openDiploIconWrapper = document.createElement("div");
					openDiploIconWrapper.classList.add("absolute", "size-16", "self-center");
					let diploIcon = document.createElement("img");
					diploIcon.classList.add("flex", "self-center", "mt-2", "size-12", "panel-diplomacy-hub__diplo-icon");
					let diploPath: string = UI.getIconURL("NOTIFICATION_DIPLOMATIC_ACTION");
					diploIcon.setAttribute("src", diploPath);
					openDiploIconWrapper.appendChild(diploIcon);
					diplomacyOptions.appendChild(openDiploIconWrapper);
					const openDiploDescription = document.createElement("div");
					openDiploDescription.classList.add("relative", "ml-18", "max-w-56", "self-center");
					openDiploDescription.innerHTML = Locale.compose(dialogOption.ChoiceString);
					diplomacyOptions.appendChild(openDiploDescription);
				}
			});
		}
		else {
			dialogTextElement.classList.remove("font-title");
			//Create a button for each dialog option
			//There will always be at least one choice (choice exit)
			DiplomacyManager.currentDiplomacyDialogData.Choices.forEach((dialogOption, index) => {
				const dialogOptionButton: HTMLElement = document.createElement('fxs-button');
				dialogOptionButton.classList.add("mb-2");
				dialogOptionButton.setAttribute('caption', dialogOption.ChoiceString);
				dialogOptionButton.setAttribute('tabindex', index.toString());
				dialogOptionButton.addEventListener('action-activate', () => {
					const otherButtons = dialogOptionsContainer.querySelectorAll("fxs-button");
					otherButtons.forEach(dialogButton => {
						dialogButton.classList.add("disabled");
						dialogButton.setAttribute("disabled", "true");
					});
					dialogOption.Callback();
				});
				dialogOptionsContainer.appendChild(dialogOptionButton);
			});
		}
		//Don't allow the user to skip the dialog for the first 2 seconds

		setTimeout(() => { this.allowSkip() }, 0);

		FocusManager.setFocus(dialogTextElement);

		NavTray.clear();

		if (Configuration.getXR()) {
			// in XR,  the skipDialog is not called because the flat-game leader-scene is bypassed.
			// This is a temporary solution to show the next screen directly
			this.skipDialog();
		}
	}

	// ------------------------------------------------------------------------
	private onNextDiplomacyDialog() {
		this.Root.classList.remove("hidden");
		LeaderModelManager.exitLeaderScene();
		this.hasSkipped = false;
		this.isSkipAllowed = false;
		//Don't allow the user to skip the dialog for the first 2 seconds
		setTimeout(() => { this.allowSkip() }, 0);
		const dialogContainer = MustGetElement(".panel-diplomacy-project-reaction__project-dialog-container", document);
		const reactionContainer = MustGetElement(".panel-diplomacy-project-reaction__main-container", document);
		dialogContainer.classList.add("hidden");
		reactionContainer.classList.add("hidden");
		//TODO: check on suspend/resume focus and pause behavior
		this.populateDialog()
	}

	// ------------------------------------------------------------------------
	private onUpdateResponse() {
		this.populateDialog();
	}

	// ------------------------------------------------------------------------
	private onInterfaceModeChanged() {
		if (InterfaceMode.getCurrent() == "INTERFACEMODE_DIPLOMACY_DIALOG") {
			this.hasSkipped = false;
			this.isSkipAllowed = false;
			//Don't allow the user to skip the dialog for the first 2 seconds
			setTimeout(() => { this.allowSkip() }, 0);
			this.populateDialog();
		}
	}

	handleInput(inputEvent: InputEngineEvent): boolean {
		if (inputEvent.isCancelInput()) {
			if (this.isSkipAllowed && !this.hasSkipped) {
				this.skipDialog();
			}
			return false;
		}
		return true;
	}

	// ------------------------------------------------------------------------
	private skipDialog() {
		window.removeEventListener('diplomacy-animation-finished', this.diplomacyAnimationFinishedListener);
		this.Root.classList.remove("initial-subtitles");

		this.populateNavTray();

		const skipDialogText: HTMLElement | null = this.Root.querySelector(".skip-dialog-text");
		if (!skipDialogText) {
			console.error("panel-diplomacy-hub: Unable to find skip-dialog-text element!");
			return;
		}

		this.hasSkipped = true;
		skipDialogText.classList.remove("skippable");
		this.isSkipAllowed = false;

		const dialogOptionsContainer: HTMLElement | null = this.Root.querySelector<HTMLElement>(".diplomacy-options");
		if (!dialogOptionsContainer) {
			console.error("panel-diplomacy-hub: Unable to find dialog-options element!");
			return;
		}
		FocusManager.setFocus(dialogOptionsContainer);

		if (DiplomacyManager.currentDiplomacyDialogData?.StatementTypeDef?.GroupType == "MEET") {
			// make sure the first Meet window is hidden if we're in the skippable dialog section
			const dialogContainer = MustGetElement(".panel-diplomacy-project-reaction__project-dialog-container", document);
			const reactionContainer = MustGetElement(".panel-diplomacy-project-reaction__main-container", document);
			dialogContainer.classList.add("hidden");
			reactionContainer.classList.add("hidden");
			window.dispatchEvent(FirstMeetOpenReactions);
			this.Root.classList.add("hidden")
		}
	}

	// ------------------------------------------------------------------------
	private onDiplomacyAnimationFinished(event: CustomEvent) {
		// TODO merge onDiplomacyAnimationFinished and skipDialog 

		if (event.detail?.isVO == true) {
			// Remove any sub-titles.
			if (this.Root.classList.contains("initial-subtitles")) {
				this.Root.classList.remove("initial-subtitles");

				this.populateNavTray();
			}
		}

		const skipDialogText: HTMLElement | null = this.Root.querySelector(".skip-dialog-text");
		if (!skipDialogText) {
			console.error("panel-diplomacy-hub: Unable to find skip-dialog-text element!");
			return;
		}
		this.hasSkipped = true;
		this.isSkipAllowed = false;
		skipDialogText.classList.remove("skippable");

		const dialogOptionsContainer: HTMLElement | null = this.Root.querySelector<HTMLElement>(".diplomacy-options");
		if (!dialogOptionsContainer) {
			console.error("panel-diplomacy-hub: Unable to find dialog-options element!");
			return;
		}
		if (ContextManager.isEmpty) {
			FocusManager.setFocus(dialogOptionsContainer);
		}

		window.removeEventListener('diplomacy-animation-finished', this.diplomacyAnimationFinishedListener);

		if (DiplomacyManager.currentDiplomacyDialogData?.StatementTypeDef?.GroupType == "MEET") {
			window.dispatchEvent(FirstMeetOpenReactions);
			this.Root.classList.add("hidden")
		}
	}

	// ------------------------------------------------------------------------
	private allowSkip() {
		this.isSkipAllowed = true;
		this.populateNavTray();

		if (ActionHandler.deviceType != InputDeviceType.Mouse && ActionHandler.deviceType != InputDeviceType.Keyboard) {
			// display MKB skip dialog instruction for mouse and Keyboard only
			return;
		}

		const skipDialogText: HTMLElement | null = this.Root.querySelector(".skip-dialog-text");
		if (!skipDialogText) {
			console.error("panel-diplomacy-hub: Unable to find skip-dialog-text element!");
			return;
		}


		skipDialogText.innerHTML = Locale.compose("LOC_DIPLOMACY_SKIP_DIALOG_INSTRUCTIONS");
		skipDialogText.classList.add("skippable");
	}

	private onDiplomacyEventResponse(eventData: DiplomacyEventResponse_EventData) {
		if (eventData.targetPlayer == GameContext.localPlayerID) {
			return;
		}

		const actionData: DiplomaticEventHeader = Game.Diplomacy.getDiplomaticEventData(eventData.actionID);
		if (actionData.initialPlayer != GameContext.localPlayerID && actionData.targetPlayer != GameContext.localPlayerID) {
			return;
		}

		this.isShowingActionResponse = true;
		this.Root.classList.remove("hidden");
		this.Root.classList.add("action-response");

		const dialogTextElement: HTMLElement = MustGetElement<HTMLDivElement>('.dialog-text', this.Root);


		const cooldown: number = Game.Diplomacy.modifyByGameSpeed(10);

		switch (eventData.response) {
			case DiplomaticResponseTypes.DIPLOMACY_RESPONSE_REJECT:
				//  projectData won't work here since getProjectDataForUI will only find active projects and if the project has been rejected it's already been moved to the completed list.
				if (actionData.actionGroup == DiplomacyActionGroups.DIPLOMACY_ACTION_GROUP_SANCTION) {
					dialogTextElement.innerHTML = Locale.stylize("LOC_DIPLOMACY_SANCTION_RESPONSE_REJECT", actionData.name);
				}
				else if (actionData.actionType == DiplomacyActionTypes.DIPLOMACY_ACTION_FORM_ALLIANCE) {
					dialogTextElement.innerHTML = Locale.stylize("LOC_DIPLOMACY_ALLIANCE_RESPONSE_REJECT", actionData.name, cooldown);
				}
				else if (actionData.actionGroup == DiplomacyActionGroups.DIPLOMACY_ACTION_GROUP_TREATY) {
					dialogTextElement.innerHTML = Locale.stylize("LOC_DIPLOMACY_TREATY_RESPONSE_REJECT", actionData.name, cooldown);
				}
				else {
					dialogTextElement.innerHTML = Locale.stylize("LOC_DIPLOMACY_ACTION_RESPONSE_REJECT", actionData.name, cooldown);
				}
				LeaderModelManager.beginAcknowledgeNegativeOtherSequence();
				break;
			case DiplomaticResponseTypes.DIPLOMACY_RESPONSE_SUPPORT:
				dialogTextElement.innerHTML = Locale.stylize("LOC_DIPLOMACY_ACTION_RESPONSE_SUPPORT", actionData.name);
				LeaderModelManager.beginAcknowledgePositiveOtherSequence();
				break;
			default:
				if (actionData.actionType == DiplomacyActionTypes.DIPLOMACY_ACTION_SEND_DELEGATION) {
					dialogTextElement.innerHTML = Locale.stylize("LOC_DIPLOMACY_ACTION_RESPONSE_ACCEPT", actionData.name);
					LeaderModelManager.beginAcknowledgePositiveOtherSequence();
				} else if (actionData.actionGroup == DiplomacyActionGroups.DIPLOMACY_ACTION_GROUP_SANCTION) {
					dialogTextElement.innerHTML = Locale.stylize("LOC_DIPLOMACY_SANCTION_RESPONSE_ACCEPT", actionData.name);
					LeaderModelManager.beginAcknowledgeNegativeOtherSequence();
				} else {
					dialogTextElement.innerHTML = Locale.stylize("LOC_DIPLOMACY_ACTION_RESPONSE_ACCEPT", actionData.name);
					LeaderModelManager.beginAcknowledgeOtherSequence();
				}
		}

		setTimeout(() => {
			if (this.isShowingActionResponse) {
				this.Root.classList.add("fade-action-response");
				setTimeout(() => {
					if (this.isShowingActionResponse) {
						this.isShowingActionResponse = false;
						this.Root.classList.add("hidden");
						this.Root.classList.remove("action-response");
						this.Root.classList.remove("fade-action-response");
					}
				}, 1000);
			}
		}, 3500);
	}

	private updateSkipLabel = (event: ActiveDeviceTypeChangedEvent) => {
		if (!this.isSkipAllowed) {
			return;
		}

		const skipDialogText: HTMLElement | null = this.Root.querySelector(".skip-dialog-text");
		if (!skipDialogText) {
			console.error("panel-diplomacy-hub: Unable to find skip-dialog-text element!");
			return;
		}

		const isMKB = event.detail.deviceType == InputDeviceType.Mouse || event.detail.deviceType == InputDeviceType.Keyboard;

		skipDialogText.innerHTML = isMKB ? Locale.compose("LOC_DIPLOMACY_SKIP_DIALOG_INSTRUCTIONS") : "";
		skipDialogText.classList.toggle("skippable", isMKB);
	}
}

Controls.define('panel-diplomacy-hub', {
	createInstance: DiplomacyHubPanel,
	description: 'Area for dialog and dialog options during diplomacy',
	classNames: ['diplomacy-container', 'trigger-nav-help', 'max-height-80', 'h-auto', 'flex', 'flex-col', 'min-w-84', "space-between"],
	styles: ['fs://game/base-standard/ui/diplomacy-hub/panel-diplomacy-hub.css'],
	content: ['fs://game/base-standard/ui/diplomacy-hub/panel-diplomacy-hub.html'],
	tabIndex: -1
});