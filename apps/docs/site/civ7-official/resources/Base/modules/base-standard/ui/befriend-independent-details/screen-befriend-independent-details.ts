/**
* @file screen-befriend-independent-details.ts
* @copyright 2024, Firaxis Games
* @description Displays details about the befriend independent action
*/

import DiplomacyManager from '/base-standard/ui/diplomacy/diplomacy-manager.js';
import FxsProgressBar, { ProgressStepData } from '/core/ui/components/fxs-progress-bar.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { InputEngineEvent, InputEngineEventName } from '/core/ui/input/input-support.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import Panel from '/core/ui/panel-support.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import { Navigation } from '/core/ui/input/navigation-support.js';


class BefriendIndependentDetailsScreen extends Panel {
	private engineInputListener = this.onEngineInput.bind(this);
	private interfaceModeChangedListener = this.onInterfaceModeChanged.bind(this);

	private render() {
		this.Root.classList.value = "fullscreen";
		this.Root.innerHTML = `
		<div class="size-full relative">
			<div class="screen-befriend-independent-details absolute bottom-4 frame-box self-end flex flex-col w-200 p-4 left-16">
				<fxs-header class="befriend-independent-header uppercase mb-4 font-title text-lg text-secondary" title="LOC_DIPLOMACY_ACTION_GIVE_INFLUENCE_TOKEN_PROJECT_NAME" filigree-style="h4"></fxs-header>
				<div id="befriend-independent-progress-bar-container" class="flex flex-col mb-4"></div>
				<fxs-hslot id="befriend-independent-support-container" class="flex flex-row items-center justify-around"></fxs-hslot>
				<fxs-close-button class="absolute top-0 -right-1"></fxs-close-button>
			</div>
		</div>
		`;

		const closeButton = MustGetElement("fxs-close-button", this.Root);
		closeButton.addEventListener("action-activate", () => { this.close() });
	}

	onAttach() {
		super.onAttach();
		this.render();
		this.populateBefriendIndependentDetails();

		engine.on('DiplomacyEventSupportChanged', this.onSupportChanged, this);
		window.addEventListener('interface-mode-changed', this.interfaceModeChangedListener);
		this.Root.addEventListener(InputEngineEventName, this.engineInputListener);
	}

	onDetach() {
		engine.off('DiplomacyEventSupportChanged', this.onSupportChanged, this);
		window.removeEventListener('interface-mode-changed', this.interfaceModeChangedListener);
		this.Root.removeEventListener(InputEngineEventName, this.engineInputListener);
	}

	private onInterfaceModeChanged() {
		if (!InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_HUB")) {
			this.close();
		};
	}

	private populateBefriendIndependentDetails() {
		if (DiplomacyManager.selectedActionID == -1) {
			console.error("screen-befriend-independent-details: No valid selectedActionID in the DiplomacyManager!");
			return;
		}

		const independentPlayer = Players.get(DiplomacyManager.selectedPlayerID);
		if (!independentPlayer) {
			console.error("screen-befriend-independent-details: No valid player library for selected player!");
			return;
		}

		const completionData: DiplomacyEventCompletionData = Game.Diplomacy.getCompletionData(DiplomacyManager.selectedActionID);
		if (!completionData) {
			console.error("screen-befriend-independent-details: Unable to retrieve DiplomacyEventCompletionData for selected action with ID: " + DiplomacyManager.selectedActionID);
			this.close();
			return;
		}

		const independentNameHeader = MustGetElement("fxs-header", this.Root);
		independentNameHeader.setAttribute("title", Locale.compose("LOC_DIPLOMACY_ACTION_GIVE_INFLUENCE_TOKEN_NAME", independentPlayer.civilizationFullName));

		const actionHeader = Game.Diplomacy.getDiplomaticEventData(DiplomacyManager.selectedActionID);
		// Get the target's player ID
		const targetIndependent: PlayerId = actionHeader.targetPlayer;

		// Find the other active events
		const activeEvents = Game.Diplomacy.getPlayerEvents(targetIndependent).filter((event) => {
			if (event.actionType == DiplomacyActionTypes.DIPLOMACY_ACTION_GIVE_INFLUENCE_TOKEN) {
				return event.initialPlayer != GameContext.localPlayerID;
			}
			return false;
		}).sort((event) => { return event.progressScore });

		const barContainer = MustGetElement("#befriend-independent-progress-bar-container", this.Root);
		while (barContainer.hasChildNodes()) {
			barContainer.removeChild(barContainer.lastChild!);
		}

		const progressBar = document.createElement("fxs-progress-bar");
		progressBar.classList.add("progress-bar", "is-befriend-independent", "flex-auto", "h-2", "mb-8");

		const barRow = document.createElement("div");
		barRow.classList.value = "flex flex-row items-center mb-7 -ml-1 max-w-full";


		const normalizedProgress: number = (actionHeader.progressScore / actionHeader.completionScore);
		progressBar.setAttribute("value", normalizedProgress.toString());
		progressBar.setAttribute("caption-color", "gold");

		waitUntilValue(() => { return progressBar.maybeComponent }).then(() => {
			this.addBefriendIndependentProgressSteps(progressBar, actionHeader, completionData);
		});

		if (activeEvents.length > 0) {
			//There is another civ racing us for this action!
			const ourConfiguration = Configuration.getPlayer(GameContext.localPlayerID);
			if (ourConfiguration.leaderTypeName) {
				const ourIcon = document.createElement("leader-icon");
				ourIcon.classList.add("mr-2", "w-16", "h-16");
				ourIcon.setAttribute("leader", ourConfiguration.leaderTypeName);
				ourIcon.setAttribute("bg-color", UI.Player.getPrimaryColorValueAsString(GameContext.localPlayerID));
				if (ourConfiguration.leaderName) {
					ourIcon.setAttribute("data-tooltip-content", Locale.compose(ourConfiguration.leaderName));
				}
				barRow.appendChild(ourIcon);
			}

			const ourPlaceText = document.createElement("div");
			ourPlaceText.classList.value = "font-body text-xs mr-4";
			barRow.appendChild(ourPlaceText);

			const otherProgressBar = document.createElement("fxs-progress-bar");
			otherProgressBar.classList.add("progress-bar", "flex-auto", "h-2", "mb-8");

			const otherBarRow = document.createElement("div");
			otherBarRow.classList.value = "flex flex-row items-center mb-5 -ml-1 max-w-full";

			const otherConfiguration = Configuration.getPlayer(activeEvents[0].initialPlayer);
			if (otherConfiguration.leaderTypeName) {
				const otherIcon = document.createElement("leader-icon");
				otherIcon.classList.add("mr-2", "w-16", "h-16");
				otherIcon.setAttribute("leader", otherConfiguration.leaderTypeName);
				otherIcon.setAttribute("bg-color", UI.Player.getPrimaryColorValueAsString(activeEvents[0].initialPlayer))
				if (otherConfiguration.leaderName) {
					otherIcon.setAttribute("data-tooltip-content", Locale.compose(otherConfiguration.leaderName));
				}
				otherBarRow.appendChild(otherIcon);
			}

			const otherPlaceText = document.createElement("div");
			otherPlaceText.classList.value = "font-body text-xs mr-4";
			otherBarRow.appendChild(otherPlaceText);

			otherBarRow.appendChild(otherProgressBar);

			const normalizedProgress: number = (activeEvents[0].progressScore / activeEvents[0].completionScore);
			otherProgressBar.setAttribute("value", normalizedProgress.toString());
			otherProgressBar.setAttribute("caption-color", "gold");
			otherProgressBar.classList.add('other-tracker');

			const otherCompletionData: DiplomacyEventCompletionData = Game.Diplomacy.getCompletionData(activeEvents[0].uniqueID);
			if (!otherCompletionData) {
				console.error("screen-befriend-independent-details: Unable to retrieve DiplomacyEventCompletionData for selected action with ID: " + activeEvents[0].uniqueID);
				this.close();
				return;
			}

			if (otherCompletionData.turnsToCompletion < completionData.turnsToCompletion || actionHeader.initialPlayer != GameContext.localPlayerID) {
				otherPlaceText.innerHTML = Locale.compose("LOC_AGE_SCORE_PLACE_1");
				ourPlaceText.innerHTML = Locale.compose("LOC_AGE_SCORE_PLACE_2");
			} else {
				ourPlaceText.innerHTML = Locale.compose("LOC_AGE_SCORE_PLACE_1");
				otherPlaceText.innerHTML = Locale.compose("LOC_AGE_SCORE_PLACE_2");
			}

			waitUntilValue(() => { return otherProgressBar.maybeComponent }).then(() => {
				this.addBefriendIndependentProgressSteps(otherProgressBar, activeEvents[0], otherCompletionData);
			});
			if (otherCompletionData.turnsToCompletion < completionData.turnsToCompletion) {
				barContainer.appendChild(otherBarRow);
				barContainer.appendChild(barRow);
			}
			else {
				barContainer.appendChild(barRow);
				barContainer.appendChild(otherBarRow);
			}
		}
		else {
			barContainer.appendChild(barRow);
		}

		barRow.appendChild(progressBar);

		const supportContainer = MustGetElement("#befriend-independent-support-container", this.Root);
		while (supportContainer.hasChildNodes()) {
			supportContainer.removeChild(supportContainer.lastChild!);
		}

		const supportStringContainer = document.createElement('div');
		supportStringContainer.classList.value = "flex flex-auto flex-row flex-wrap items-center";

		const supportTitle = document.createElement("div");
		supportTitle.classList.value = "font-title text-xs uppercase mr-1";
		supportTitle.innerHTML = Locale.compose("LOC_DIPLOMACY_ACTION_DETAILS_YOUR_PROGRESS");
		supportStringContainer.appendChild(supportTitle);

		const supportAmount = document.createElement("div");
		supportAmount.classList.value = "font-body text-secondary text-sm"
		supportAmount.innerHTML = Locale.compose("LOC_DIPLOMACY_BEFRIEND_INDEPENDENT_PROGRESS", actionHeader.progressScore, actionHeader.completionScore, actionHeader.support);
		supportStringContainer.appendChild(supportAmount);

		supportContainer.appendChild(supportStringContainer);

		const supportButton = document.createElement("chooser-item");
		supportButton.classList.add("chooser-item_unlocked", "h-16", "flex", "self-end", "flex-row");
		supportButton.setAttribute("data-audio-group-ref", "befriend-independent-details");

		const supportIconContainer = document.createElement("div");
		supportIconContainer.classList.value = "chooser-item__icon flex self-center items-center justify-center pointer-events-none relative";
		supportButton.appendChild(supportIconContainer);

		const supportIconImage = document.createElement("div");
		supportIconImage.classList.value = "chooser-item__icon-image relative bg-center bg-contain befriend-independent-details-support-icon";
		supportIconContainer.appendChild(supportIconImage);

		const supportString = document.createElement("div");
		supportString.id = 'befriend-inpendent-details_support-string'
		supportString.classList.add("font-title", "text-sm", "mb-1", "pointer-events-none", "font-fit-shrink", "self-center", "relative", "pr-2");
		supportString.innerHTML = Locale.stylize("LOC_DIPLOMACY_ACTION_ADD_SUPPORT", Game.Diplomacy.getInfluenceForNextSupport(actionHeader.uniqueID, GameContext.localPlayerID, true));
		supportButton.appendChild(supportString);

		supportContainer.appendChild(supportButton);
		supportButton.setAttribute("hover-only-trigger", 'false');
		const navHelp = document.createElement('fxs-nav-help');
		navHelp.setAttribute("action-key", "inline-shell-action-2");
		supportButton.appendChild(navHelp);

		let supportArgs: object = {
			ID: DiplomacyManager.selectedActionID,
			Type: DiplomacyTokenTypes.DIPLOMACY_TOKEN_GLOBAL,
			Amount: 1,
			SubType: true
		}

		let supportResult: OperationResult = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.SUPPORT_DIPLOMATIC_ACTION, supportArgs, false);
		if (!supportResult.Success) {
			supportButton.setAttribute("disabled", "true");
		}

		supportButton.addEventListener("action-activate", (event) => {
			Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.SUPPORT_DIPLOMATIC_ACTION, supportArgs);

			supportArgs = {
				ID: DiplomacyManager.selectedActionID,
				Type: DiplomacyTokenTypes.DIPLOMACY_TOKEN_GLOBAL,
				Amount: 1,
				SubType: true
			}

			const supportResult: OperationResult = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.SUPPORT_DIPLOMATIC_ACTION, supportArgs, false);
			if (!supportResult.Success) {
				supportButton.setAttribute("disabled", "true");
			}

			const actionHeader = Game.Diplomacy.getDiplomaticEventData(DiplomacyManager.selectedActionID);
			if (event.target) {
				const supportString = MustGetElement("#befriend-inpendent-details_support-string", this.Root);
				supportString.innerHTML = Locale.stylize("LOC_DIPLOMACY_ACTION_ADD_SUPPORT", Game.Diplomacy.getInfluenceForNextSupport(actionHeader.uniqueID, GameContext.localPlayerID, true));
			}
		})

		if (actionHeader.initialPlayer != GameContext.localPlayerID) {
			barRow.style.display = "none";
			supportContainer.style.display = "none";
		} else {
			barRow.style.display = "flex";
			supportContainer.style.display = "flex";
		}
	}

	private addBefriendIndependentProgressSteps(progressBar: ComponentRoot<FxsProgressBar>, actionData: DiplomaticEventHeader, completionData: DiplomacyEventCompletionData): void {
		const stages = Game.Diplomacy.getStages(actionData.uniqueID);
		const progressBarComponent = progressBar.component;
		const stepData: ProgressStepData[] = [];
		for (let i = 1; i < stages.length; i++) {
			const step: ProgressStepData = {
				icon: "url('" + stages[i].stageIconPath + "')",
				stepNumber: i,
				progressAmount: stages[i].requiredProgress / actionData.completionScore,
				progressUntilThisStep: completionData.stageTurnsToComplete[i],
				description: stages[i].stageToolTip
			}
			stepData.push(step);
		}
		progressBarComponent.stepData = stepData;
	}

	protected onSupportChanged(data: DiplomacyEventSupportChanged_EventData) {
		const actionData = Game.Diplomacy.getDiplomaticEventData(data.actionID);
		if (actionData.actionType == DiplomacyActionTypes.DIPLOMACY_ACTION_GIVE_INFLUENCE_TOKEN) {
			this.populateBefriendIndependentDetails();
		}
		const befriendingNavHelp = MustGetElement("fxs-nav-help", this.Root);
		befriendingNavHelp.classList.remove("hidden");
	}

	onReceiveFocus(): void {
		const element = MustGetElement("panel-other-player-diplomacy-actions", document);
		const props: Navigation.Properties = { isDisableFocusAllowed: false, direction: InputNavigationAction.NONE };
		const focusableElement: Element | null = Navigation.getFirstFocusableElement(element, props);
		if (focusableElement) {
			FocusManager.setFocus(focusableElement);
		}

		const befriendingNavHelp = MustGetElement("fxs-nav-help", this.Root);
		befriendingNavHelp.classList.remove("hidden");
	}

	private onEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.status != InputActionStatuses.FINISH && !(InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_HUB"))) {
			return true;
		}

		if (inputEvent.isCancelInput() || inputEvent.detail.name == 'sys-menu') {
			DiplomacyManager.lowerDiplomacyHub();
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
			return false;
		}

		return true;
	}
}


Controls.define('screen-befriend-independent-details', {
	createInstance: BefriendIndependentDetailsScreen,
	description: 'Befriend Independent Details Screen.',
	styles: ['fs://game/base-standard/ui/befriend-independent-details/screen-befriend-independent-details.css'],
	attributes: [],
	classNames: ['screen-befriend-independent-details', 'trigger-nav-help']
});