/**
* @file panel-diplomacy-actions.ts
* @copyright 2022-2025, Firaxis Games
* @description Displays and handles interactions with ongoing diplomatic actions and a history of diplomatic actions
*/

import ContextManager from '/core/ui/context-manager/context-manager.js'
import DiplomacyManager, { DiplomacyActionOperationArgs, DiplomacyInputPanel } from '/base-standard/ui/diplomacy/diplomacy-manager.js';
import { RaiseDiplomacyEvent } from '/base-standard/ui/diplomacy/diplomacy-events.js';
import LeaderModelManager from '/base-standard/ui/diplomacy/leader-model-manager.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';

import { Audio } from '/core/ui/audio-base/audio-support.js';
import { FxsTabBar, TabSelectedEvent, TabItem } from '/core/ui/components/fxs-tab-bar.js';
import { Icon } from '/core/ui/utilities/utilities-image.js';
import { InputEngineEvent, NavigateInputEvent } from '/core/ui/input/input-support.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import { Navigation } from '/core/ui/input/navigation-support.js';
import DiploRibbonData from '/base-standard/ui/diplo-ribbon/model-diplo-ribbon.js';
import { RibbonStatsToggleStatus, UpdateDiploRibbonEvent } from '/base-standard/ui/diplo-ribbon/model-diplo-ribbon.js';
import { RelationshipBreakdown } from '/base-standard/ui/relationship-breakdown/relationship-breakdown.js'

type RelationshipWithOtherData = {
	leaderID: PlayerId;
	relationshipLevel: DiplomacyPlayerRelationships;
	portraitIcon: string;
	allied?: boolean;
	atWar?: boolean;
}

class DiplomacyActionPanel extends DiplomacyInputPanel {
	private interfaceModeChangedListener = this.onInterfaceModeChanged.bind(this);
	private selectedPlayerChangedListener = this.onSelectedPlayerChanged.bind(this);
	private supportChangedListener = this.onSupportChanged.bind(this);
	private viewReceiveFocusListener = this.onViewReceiveFocus.bind(this);
	private actionCanceledListener = this.onActionCanceled.bind(this);
	private diplomacyQueueChangedListener = this.onDiplomacyQueueChanged.bind(this);
	private gameCoreEventPlaybackCompleteListener = this.onGameCoreEventPlaybackCompleteListener.bind(this);
	private populateInitialDataTimerListener = this.onPopulateInitialDataTimerFinished.bind(this);
	private onHandleWarSupportClosedListener = this.onHandleWarSupportClosed.bind(this);

	protected majorActionsSlot?: HTMLElement;
	private leaderNameElement?: HTMLElement;
	private mementosHeaderElement?: HTMLElement;
	private civSymbol?: HTMLElement;
	private diploTint?: HTMLElement;
	private tabBar?: ComponentRoot<FxsTabBar>;
	private panels: HTMLElement[] = [];
	private slotGroup?: HTMLElement;
	protected initialLoadComplete = false;
	protected firstFocusSection: HTMLElement | null = null;

	protected ongoingActionPageNumber = 0;
	private diplomacyQueueChanged: boolean = false;

	private initDataPopulationTimerHandle: number = 0;

	private render() {
		this.Root.classList.add('flex-1');
		this.Root.innerHTML = `
		<fxs-hslot id="panel-diplomacy-actions__horizontal-container" data-navrule-left="wrap" class="-top-1 -bottom-8 absolute actions-horizontal-container">
			<fxs-vslot>
				<fxs-subsystem-frame box-style="b3" class="flex-auto">
					<fxs-header id="panel-diplomacy-actions__leader-name-header" filigree-style="none" data-slot="header" class="panel-diplomacy__leader-name-header leading-none flex uppercase self-center items-end font-bold text-center min-h-18 mt-4 pb-3 justify-center font-title text-2xl px-2 w-full" title="LOC_DIPLOMACY_SELECT_TARGET"></fxs-header>
					<fxs-header id="panel-diplomacy-actions__civ-name-header" font-fit-mode="shrink" wrap="nowrap" filigree-style="none" data-slot="header" class="panel-diplomacy__civ-name-header flex min-h-11 items-top self-center font-title text-sm text-secondary max-w-full" title="LOC_DIPLOMACY_SELECT_TARGET"></fxs-header>
					<div id="panel-diplomacy-actions__civ-symbol" data-slot="header" class="panel-diplomacy-actions__civ-icon absolute bg-center bg-contain self-center size-24"></div>
					<fxs-tab-bar alt-controls="false" rect-render="true" data-slot="header" class="mx-5 mt-16 mb-3 pb-1 bg-primary-4 border-primary-2 border-t-2" data-audio-group-ref="audio-diplo-project-reaction" data-audio-tab-selected="leader-tab-activate"></fxs-tab-bar>
					<fxs-hslot data-slot="footer" id="panel-diplomacy-actions__major-action-buttons" class="relative justify-around self-center pb-3 w-145"></fxs-hslot>
					<fxs-slot-group>
						<fxs-vslot id="diplomacy-tab-actions" class="flex-auto">
								<fxs-vslot id="available-projects-slot" disable-focus-allowed="true"></fxs-vslot>
						</fxs-vslot>
						<fxs-vslot id="diplomacy-tab-relationship" class="flex-auto">
							<fxs-vslot id="panel-diplomacy-actions__relationship-event-container"></fxs-vslot>
							<div class="flex flex-col mt-20 mb-4">
								<div id="panel-diplomacy-actions__other-relationships-header-name" class="font-title text-base text-center uppercase pointer-events-auto"></div>
								<fxs-header id="panel-diplomacy-actions__other-relationships-header" class="text-secondary uppercase font-title text-base" title="LOC_DIPLOMACY_ACTIONS_RELATIONSHIPS_HEADER" filigree-style="h4"></fxs-header>
							</div>
							<fxs-inner-frame id="panel-diplomacy-actions__other-relationships-frame" class="w-128 self-center">
								<div id="panel-diplomacy-actions__other-relationships-container"class="flex flex-col w-full"></div>
							</fxs-inner-frame>
						</fxs-vslot>
						<fxs-vslot id="diplomacy-tab-government" class="flex-auto">
							<fxs-vslot id="panel-diplomacy-actions__government-container" class="text-center"></fxs-vslot>
						</fxs-vslot>
						<fxs-vslot id="diplomacy-tab-info" class="flex-auto">
							<fxs-vslot id="panel-diplomacy-actions__info-container"></fxs-vslot>
						</fxs-vslot>
					</fxs-slot-group><fxs-hslot data-slot="footer" id="panel-diplomacy-actions__major-action-buttons" class="relative justify-around self-stretch pb-3"></fxs-hslot>
				</fxs-subsystem-frame>
			</fxs-vslot>
			<fxs-vslot class="panel-diplomacy-actions__ongoing-actions-list">
				<fxs-scrollable class="w-40 h-0 -left-8 panel-diplomacy-actions__ongoing-actions-scrollable" handle-gamepad-pan="true" attached-scrollbar="true">
				<fxs-vslot id="panel-diplomacy-actions__ongoing-actions-container" class="absolute h-auto w-auto">
				</fxs-vslot>
				</fxs-scrollable>
			</fxs-vslot>
		</fxs-hslot>
		`;

		const subsystemPanel = MustGetElement("fxs-subsystem-frame", this.Root);
		subsystemPanel.addEventListener('subsystem-frame-close', () => { this.close(); });
		subsystemPanel.setAttribute("data-audio-close-group-ref", "leader-panel");

		this.leaderNameElement = MustGetElement("#panel-diplomacy-actions__leader-name-header", this.Root);
		this.mementosHeaderElement = MustGetElement("#panel-diplomacy-actions__civ-name-header", this.Root);
		this.civSymbol = MustGetElement("#panel-diplomacy-actions__civ-symbol", this.Root);
		this.majorActionsSlot = MustGetElement("#panel-diplomacy-actions__major-action-buttons", this.Root);
		if (Players.get(DiplomacyManager.selectedPlayerID)?.isIndependent) {
			this.majorActionsSlot.classList.add("hidden");
		}

		this.tabBar = MustGetElement("fxs-tab-bar", this.Root);
		this.slotGroup = MustGetElement("fxs-slot-group", this.Root);

		const actionsPanel = MustGetElement("#diplomacy-tab-actions", this.Root);
		this.panels.push(actionsPanel);

		const playerObject: PlayerLibrary | null = Players.get(DiplomacyManager.selectedPlayerID);
		if (!playerObject) {
			console.error("panel-diplomacy-actions: Unable to get player object for selected player!");
			return;
		}

		if (playerObject.isMajor) {
			this.leaderNameElement?.setAttribute('title', Locale.compose(playerObject.leaderName));
			this.mementosHeaderElement?.setAttribute('title', Locale.compose("LOC_DIPLOMACY_CIV_NAME", playerObject.civilizationAdjective));
		}
		else {
			this.leaderNameElement?.setAttribute('title', Locale.compose(playerObject.civilizationAdjective));
			if (playerObject.civilizationAdjective != playerObject.name) {
				this.mementosHeaderElement?.setAttribute('title', Locale.compose("LOC_DIPLOMACY_INDEPENDENT_CIV_NAME", playerObject.name));
			}
			else {
				this.mementosHeaderElement?.setAttribute('title', Locale.compose(""));
			}
		}
		this.civSymbol!.style.backgroundImage = `url("${Icon.getCivIconForDiplomacyHeader(playerObject.civilizationType)}")`;

		this.Root.classList.toggle("independent", !playerObject.isMajor);

		this.refreshTabItems(playerObject);
		this.tabBar.addEventListener("tab-selected", this.onOptionsTabSelected.bind(this));
		this.slotGroup.setAttribute('selected-slot', "diplomacy-tab-actions");

		waitForLayout(() => {
			this.diploTint = MustGetElement(".subsystem-frame__diplo-tint", this.Root);
			this.diploTint?.style.setProperty("fxs-background-image-tint", UI.Player.getPrimaryColorValueAsString(playerObject.id));
		});
	}

	private populateInitialData() {
		this.refreshFullData();

		//If selectedActionID is valid, we are coming from clicking a notification for a specific action, open the details screen
		if (DiplomacyManager.selectedActionID != -1) {
			const actionData: DiplomaticEventHeader = Game.Diplomacy.getDiplomaticEventData(DiplomacyManager.selectedActionID);
			if (!actionData) {
				console.log("panel-diplomacy-actions: Unable to get action data for action with ID: " + DiplomacyManager.selectedActionID);
				return;
			}

			DiplomacyManager.shouldQuickClose = true;
			if (!(actionData.actionType == DiplomacyActionTypes.DIPLOMACY_ACTION_GIVE_INFLUENCE_TOKEN && DiplomacyManager.selectedPlayerID == actionData.targetPlayer)) {
				this.showBefriendIndependentDetails();
			} else {
				const infIndepData: InfluenceIndependentData = Game.Diplomacy.getInfluenceIndependentData(actionData.uniqueID);
				Camera.lookAtPlot(infIndepData.location);
			}
		}


		this.initialLoadComplete = true;
	}

	/**
	 * Refresh all data (warning: VERY expensive!)
	 */
	private refreshFullData() {
		this.refreshPartialData();
		this.populateGovernmentInfo();
		this.populatePlayerCivInfo();
		this.showLeaderModel();
		this.populateAvailableActions();
		waitForLayout(() => this.realizeInitialFocus());
	}

	/**
	 * Refresh dynamic data (expensive!)
	 */
	private refreshPartialData() {
		this.populateOngoingProjects();
		this.populateActionsPanel();
		this.populateRelationshipInfo();
	}

	/**
	 * Refresh after a war support change.
	 */
	private refreshSupportData() {
		this.populateOngoingProjects();
		this.populateRelationshipInfo();
	}


	onAttach() {
		super.onAttach();

		this.render();

		this.Root.addEventListener('view-receive-focus', this.viewReceiveFocusListener);
		window.addEventListener('interface-mode-changed', this.interfaceModeChangedListener);
		window.addEventListener('diplomacy-selected-player-changed', this.selectedPlayerChangedListener);

		engine.on('DiplomacyEventSupportChanged', this.supportChangedListener);
		engine.on('DiplomacyEventCanceled', this.actionCanceledListener);
		engine.on('DiplomacyQueueChanged', this.diplomacyQueueChangedListener);
		engine.on('GameCoreEventPlaybackComplete', this.gameCoreEventPlaybackCompleteListener);

		if (this.checkShouldShowPanel()) {
			// To improve player visual feedback, show the outer frame as fast as possible, then show the inner content later.
			this.initDataPopulationTimerHandle = setTimeout(this.populateInitialDataTimerListener, 83);
		} else {
			// If the panel is not being displayed, mark it as loaded
			this.initialLoadComplete = true;
		}
	}

	onDetach() {
		super.onDetach();

		this.Root.removeEventListener('view-receive-focus', this.viewReceiveFocusListener);
		window.removeEventListener('interface-mode-changed', this.interfaceModeChangedListener);
		window.removeEventListener('diplomacy-selected-player-changed', this.selectedPlayerChangedListener);

		engine.off('DiplomacyEventSupportChanged', this.supportChangedListener);
		engine.off('DiplomacyEventCanceled', this.actionCanceledListener);
		engine.off('DiplomacyQueueChanged', this.diplomacyQueueChangedListener);
		engine.off('GameCoreEventPlaybackComplete', this.gameCoreEventPlaybackCompleteListener);

		if (this.initDataPopulationTimerHandle != 0) {
			clearTimeout(this.initDataPopulationTimerHandle);
			this.initDataPopulationTimerHandle = 0;
		}
	}

	onPopulateInitialDataTimerFinished() {
		this.populateInitialData();

		if (this.initDataPopulationTimerHandle != 0) {
			clearTimeout(this.initDataPopulationTimerHandle);
			this.initDataPopulationTimerHandle = 0;
		}
	}

	handleInput(inputEvent: InputEngineEvent) {
		const currentTarget = ContextManager.getCurrentTarget();
		if ((!InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_HUB") && !DiplomacyManager.isFirstMeetDiplomacyOpen) || (currentTarget != undefined && currentTarget.nodeName != "SCREEN-BEFRIEND-INDEPENDENT-DETAILS")) {
			return false;
		}

		if (!this.checkShouldShowPanel()) {
			return true;
		}

		const inputEventName = inputEvent.detail.name;
		switch (inputEventName) {
			case 'cancel':
			case 'keyboard-escape':
			case 'mousebutton-right':
				this.close();
				inputEvent.stopPropagation();
				inputEvent.preventDefault();
				return false;
			case 'shell-action-2':
				this.trySupportBefriendIndependent();
				inputEvent.stopPropagation();
				inputEvent.preventDefault();
				return false;
		}

		return true;
	}

	private trySupportBefriendIndependent() {
		const ongoingActions: DiplomaticEventHeader[] = Game.Diplomacy.getPlayerEvents(DiplomacyManager.selectedPlayerID).filter((action) => {
			return action.initialPlayer == GameContext.localPlayerID && action.actionType == DiplomacyActionTypes.DIPLOMACY_ACTION_GIVE_INFLUENCE_TOKEN;
		});
		if (ongoingActions.length == 0) {
			return;
		}

		const supportArgs: object = {
			ID: ongoingActions[0].uniqueID,
			Type: DiplomacyTokenTypes.DIPLOMACY_TOKEN_GLOBAL,
			Amount: 1,
			SubType: true
		}

		const supportResult: OperationResult = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.SUPPORT_DIPLOMATIC_ACTION, supportArgs, false);
		if (!supportResult.Success) {
			return;
		}

		Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.SUPPORT_DIPLOMATIC_ACTION, supportArgs);
		Audio.playSound("data-audio-activate", "befriend-independent-details");
	}

	handleNavigation(navigateInput: NavigateInputEvent): boolean {
		const currentTarget = ContextManager.getCurrentTarget();
		if ((!InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_HUB") && !DiplomacyManager.isFirstMeetDiplomacyOpen) || (currentTarget != undefined && currentTarget.nodeName != "SCREEN-BEFRIEND-INDEPENDENT-DETAILS")) {
			return false;
		}

		if (!this.checkShouldShowPanel()) {
			return true;
		}

		const direction = navigateInput.getDirection();
		switch (direction) {
			case InputNavigationAction.SHELL_PREVIOUS:
			case InputNavigationAction.SHELL_NEXT:
				if (DiplomacyManager.isFirstMeetDiplomacyOpen) {
					return false;
				}
				const diploRibbon = document.querySelector(".diplo-ribbon");
				diploRibbon?.dispatchEvent(navigateInput);
				navigateInput.stopPropagation();
				navigateInput.preventDefault();
				return false;
			case InputNavigationAction.PREVIOUS:
			case InputNavigationAction.NEXT:
				this.tabBar?.dispatchEvent(navigateInput);
				return false;
			case InputNavigationAction.LEFT:
			case InputNavigationAction.RIGHT:
				//don't try to navigate out of the diplo view to somewhere else
				navigateInput.stopPropagation();
				navigateInput.preventDefault();
				return false;
		}

		return true;
	}

	private onViewReceiveFocus() {
		if (!this.checkShouldShowPanel()) {
			return;
		}

		if (DiplomacyManager.selectedActionID != -1 || DiplomacyManager.currentDiplomacyDealData != null) {
			//If we are coming from a notification or incoming peace deal, they will handle the navtray and focus
			return;
		}
		this.populateAvailableActions();
		this.realizeInitialFocus();
		this.realizeNavTray();
	}

	protected realizeNavTray() {
		NavTray.clear();
		NavTray.addOrUpdateGenericBack();
		const player = Players.get(DiplomacyManager.selectedPlayerID);
		if (player && player.isIndependent) {
			const ongoingActions: DiplomaticEventHeader[] = Game.Diplomacy.getPlayerEvents(DiplomacyManager.selectedPlayerID).filter((action) => {
				return action.initialPlayer == GameContext.localPlayerID && action.actionType == DiplomacyActionTypes.DIPLOMACY_ACTION_GIVE_INFLUENCE_TOKEN;
			});
			if (ongoingActions.length != 0) {
				NavTray.addOrUpdateShellAction1(Locale.compose("LOC_DIPLOMACY_SUPPORT_INDEPENDENT"));
			}
		}
	}

	protected populateOngoingProjects() {
		const ongoingProjectContainer = MustGetElement('#panel-diplomacy-actions__ongoing-actions-container', this.Root);
		while (ongoingProjectContainer.hasChildNodes()) {
			ongoingProjectContainer.removeChild(ongoingProjectContainer.lastChild!);
		}

		let ongoingActions: DiplomaticEventHeader[] = Game.Diplomacy.getPlayerEvents(DiplomacyManager.selectedPlayerID);
		ongoingActions = ongoingActions.filter((action) => {
			return action.initialPlayer == GameContext.localPlayerID || (action.targetPlayer == GameContext.localPlayerID && action.revealed);
		})

		ongoingActions.sort((a, b) => ((Game.Diplomacy.getCompletionData(a.uniqueID) && Game.Diplomacy.getCompletionData(b.uniqueID)) && Game.Diplomacy.getCompletionData(a.uniqueID).turnsToCompletion > Game.Diplomacy.getCompletionData(b.uniqueID).turnsToCompletion) ? 1 : -1);

		const myActions: DiplomaticEventHeader[] = ongoingActions.filter((action) => { return action.initialPlayer == GameContext.localPlayerID && action.actionType != DiplomacyActionTypes.DIPLOMACY_ACTION_DECLARE_WAR && action.actionType != DiplomacyActionTypes.DIPLOMACY_ACTION_FORM_ALLIANCE });
		const theirActions: DiplomaticEventHeader[] = ongoingActions.filter((action) => { return action.initialPlayer != GameContext.localPlayerID && action.actionType != DiplomacyActionTypes.DIPLOMACY_ACTION_DECLARE_WAR && action.actionType != DiplomacyActionTypes.DIPLOMACY_ACTION_FORM_ALLIANCE });

		if (myActions.length > 0) {
			const myActionsHeader = document.createElement("div");
			myActionsHeader.classList.value = ("queued-title flex justify-center font-title uppercase text-xs mt-5 py-2");
			myActionsHeader.innerHTML = Locale.compose("LOC_DIPLOMACY_MY_ACTIONS_HEADER");
			ongoingProjectContainer.appendChild(myActionsHeader);
		}
		myActions.forEach(myAction => {

			const ongoingActionItem: HTMLElement | null = this.createOngoingActionItem(myAction);
			if (ongoingActionItem) {
				ongoingProjectContainer.appendChild(ongoingActionItem);
			}
		});

		if (theirActions.length > 0) {
			const theirActionsHeader = document.createElement("div");
			theirActionsHeader.classList.value = ("queued-title flex justify-center font-title uppercase text-xs mt-5 py-2");
			theirActionsHeader.innerHTML = Locale.compose("LOC_DIPLOMACY_THEIR_ACTIONS_HEADER");
			ongoingProjectContainer.appendChild(theirActionsHeader);
		}
		theirActions.forEach(theirAction => {

			const ongoingActionItem: HTMLElement | null = this.createOngoingActionItem(theirAction);
			if (ongoingActionItem) {
				ongoingProjectContainer.appendChild(ongoingActionItem);
			}
		});
		this.setOngoingActionsScrollablePosition();
	}

	private createOngoingActionItem(action: DiplomaticEventHeader): HTMLElement | null {
		const actionData: DiplomaticProjectUIData | undefined = Game.Diplomacy.getProjectDataForUI(action.initialPlayer, -1, DiplomacyActionTargetTypes.NO_DIPLOMACY_TARGET, DiplomacyActionGroups.NO_DIPLOMACY_ACTION_GROUP, -1, DiplomacyActionTargetTypes.NO_DIPLOMACY_TARGET).find(project => project.actionID == action.uniqueID);
		if (action.hidden && !action.revealed && action.initialPlayer != GameContext.localPlayerID && actionData?.actionGroup == DiplomacyActionGroups.DIPLOMACY_ACTION_GROUP_ESPIONAGE) {
			return null;
		}

		const ongoingActionItem = document.createElement("chooser-item");
		ongoingActionItem.classList.add("chooser-item_unlocked", "w-36", "h-18", "flex", "flex-row", "pt-1", "pointer-events-auto");
		ongoingActionItem.setAttribute("tabindex", "-1");

		const actionDef = GameInfo.DiplomacyActions.lookup(action.actionType);
		if (!actionDef) {
			console.error("panel-diplomacy-actions: Unable to get definition for diplomacy action with type: " + action.actionTypeName);
			return null;
		}

		let progressPercent = 0
		let progressString = "";

		const progressTurnsContainer = document.createElement('div');
		progressTurnsContainer.classList.add('relative', 'flex', 'flex-col', "grow", "justify-center", "items-center", "min-w-16", "m-1");

		const progressBar: HTMLDivElement = document.createElement('div');
		progressBar.classList.add("build-queue__item-progress-bar", "relative", "p-0\\.5", "flex", "flex-col-reverse", "h-10", "w-4");

		const progressBarFill: HTMLElement = document.createElement('div');
		progressBarFill.classList.add("build-queue__progress-bar-fill", "relative", "bg-contain", "w-3");

		progressTurnsContainer.appendChild(progressBar);

		ongoingActionItem.appendChild(progressTurnsContainer);

		const actionDetailsContainer = document.createElement("div");
		actionDetailsContainer.classList.add("grow", "relative");
		ongoingActionItem.appendChild(actionDetailsContainer);

		const iconContainer = document.createElement("div");
		iconContainer.classList.value = "chooser-item__icon flex self-center items-center justify-center pointer-events-none relative";
		ongoingActionItem.appendChild(iconContainer);

		const iconImage = document.createElement("div");
		iconImage.classList.value = "chooser-item__icon-image relative flex flex-col items-center justify-center";
		iconContainer.appendChild(iconImage);

		const completionData = Game.Diplomacy.getCompletionData(action.uniqueID);
		progressBar.appendChild(progressBarFill);

		if (actionData?.actionType == DiplomacyActionTypes.DIPLOMACY_ACTION_GIVE_INFLUENCE_TOKEN) {
			ongoingActionItem.addEventListener("action-activate", () => { this.showBefriendIndependentDetails() });
			const infIndepData: InfluenceIndependentData = Game.Diplomacy.getInfluenceIndependentData(action.uniqueID);
			const villageID: number = infIndepData.independentPlayerID;
			let villageName = "";
			const locVillageName = Game.IndependentPowers.independentName(villageID)?.toString();
			if (locVillageName != undefined) {
				villageName = Locale.compose(locVillageName);
			}
			ongoingActionItem.setAttribute("data-tooltip-content", Locale.compose(action.name, villageName));
			const currentProgress = (completionData.requiredProgress - (completionData.turnsToCompletion * completionData.progressPerTurn)) / completionData.requiredProgress;
			progressPercent = currentProgress * 100;
			progressString = Game.Diplomacy.getCompletionData(action.uniqueID).turnsToCompletion.toString();
		}
		else if (actionData?.actionGroup == DiplomacyActionGroups.DIPLOMACY_ACTION_GROUP_ESPIONAGE && actionData.actionType != DiplomacyActionTypes.DIPLOMACY_ACTION_COUNTER_SPY) {
			const stageData = Game.Diplomacy.getActiveStage(action.uniqueID);
			const stages = Game.Diplomacy.getStages(action.uniqueID);
			if (stageData.stageType == stages[0].stageType) {
				const projectDefinition: DiplomacyActionDefinition | null = GameInfo.DiplomacyActions.lookup(actionData.actionType);
				if (!projectDefinition) {
					console.error("panel-diplomacy-actions: Unable to get project definition for project of type " + actionData.actionTypeName);
					return null;
				}

				//  Data from projectDefinitions are at Standard speed so needs to be modified. completionScore and lastStageDuration is already factoring Game Speed;
				const stage1MaxTurns = action.completionScore - action.lastStageDuration;
				const stage1MinTurns = stage1MaxTurns - Game.Diplomacy.modifyByGameSpeed(projectDefinition.RandomInitialProgress);
				ongoingActionItem.setAttribute("data-tooltip-content", Locale.stylize(Locale.compose(action.name) + "[N]" + Locale.compose(action.description) + "[N]" + Locale.stylize("LOC_DIPLOMACY_ACTION_ESPIONAGE_ONGOING", stage1MinTurns, stage1MaxTurns, Game.turn - action.gameTurnStart) + "[N]" + Locale.compose("LOC_DIPLOMACY_SUCCESS_CHANCE", actionDef.SuccessChance) + "[N]" + Locale.compose("LOC_DIPLOMACY_REVEAL_CHANCE", actionDef.RevealChance)));
				progressString = (Game.turn - action.gameTurnStart).toString() + "/" + stage1MaxTurns.toString();
				progressPercent = (Game.turn - action.gameTurnStart) / stage1MaxTurns * 100;
			} else {
				if (!action.hidden && DiplomacyManager.selectedPlayerID == GameContext.localPlayerID && action.targetPlayer == GameContext.localPlayerID) {
					//We know about the ongoing espionage effect, but not who did it. We only show these when looking at our action panel
					ongoingActionItem.setAttribute("data-tooltip-content", Locale.stylize(Locale.compose(action.name) + "[N]" + Locale.compose(action.description + "_TARGET", "LOC_DIPLOMACY_UNKNOWN_PLAYER") + "[N]" + Locale.compose("LOC_DIPLOMACY_ACTION_ACTIVE_FOR_TURNS", Game.Diplomacy.getCompletionData(action.uniqueID).turnsToCompletion.toString())));
				} else if (action.revealed && action.targetPlayer == GameContext.localPlayerID) {
					//We know about the ongoing espionage effect and who did it.
					ongoingActionItem.setAttribute("data-tooltip-content", Locale.stylize(Locale.compose(action.name) + "[N]" + Locale.compose(action.description + "_TARGET", "LOC_DIPLOMACY_UNKNOWN_PLAYER") + "[N]" + Locale.compose("LOC_DIPLOMACY_ACTION_ACTIVE_FOR_TURNS", Game.Diplomacy.getCompletionData(action.uniqueID).turnsToCompletion.toString())));
				} else {
					ongoingActionItem.setAttribute("data-tooltip-content", Locale.stylize(Locale.compose(action.name) + "[N]" + Locale.compose(action.description) + "[N]" + Locale.compose("LOC_DIPLOMACY_ACTION_ACTIVE_FOR_TURNS", Game.Diplomacy.getCompletionData(action.uniqueID).turnsToCompletion.toString())));
				}
				const currentProgress = (completionData.requiredProgress - (completionData.turnsToCompletion * completionData.progressPerTurn)) / completionData.requiredProgress;
				progressPercent = currentProgress * 100;
				progressString = Game.Diplomacy.getCompletionData(action.uniqueID).turnsToCompletion.toString();
			}
		} else {
			const currentProgress = (completionData.requiredProgress - (completionData.turnsToCompletion * completionData.progressPerTurn)) / completionData.requiredProgress;
			ongoingActionItem.setAttribute("data-tooltip-content", Locale.stylize(Locale.compose(action.name) + "[N]" + Locale.compose(action.description) + "[N]" + Locale.compose("LOC_DIPLOMACY_ACTION_ACTIVE_FOR_TURNS", Game.Diplomacy.getCompletionData(action.uniqueID).turnsToCompletion.toString())));
			progressPercent = currentProgress * 100;
			progressString = Game.Diplomacy.getCompletionData(action.uniqueID).turnsToCompletion.toString();
		}
		if (progressPercent > 99) {
			progressPercent = 100;
			progressBarFill.classList.add("build-queue__progress-bar-fill-negative")
		}
		progressBarFill.style.height = progressPercent.toString() + "%";
		iconImage.style.backgroundImage = `url("${actionDef.UIIconPath}")`;

		const turns = document.createElement("div");

		turns.classList.add("build-queue__turn", "relative", "bottom-0", "right-0", "flex", "items-center");
		const turnsClockIcon = document.createElement("div");
		turnsClockIcon.classList.add("build-queue__turn-icon", "size-8", "relative");
		turns.appendChild(turnsClockIcon);

		const turnLabel = document.createElement("div");
		turnLabel.classList.add("build-queue__turn-value", "relative", "text-base", "font-fit-shrink", "w-9");
		turnLabel.innerHTML = progressString;
		turns.appendChild(turnLabel);
		progressTurnsContainer.appendChild(turns);

		return ongoingActionItem;
	}

	/**
	 * This says "action", (at base game) the only actions are war support.
	 * @param actionID 
	 */
	protected clickOngoingAction(actionID: DiplomacyActionEventId) {
		DiplomacyManager.selectedActionID = actionID;
		ContextManager.push("screen-diplomacy-action-details", { createMouseGuard: true, singleton: true });
		window.addEventListener('diplomacy-action-details-closed', this.onHandleWarSupportClosedListener);
	}

	/**
	 * Signaled when the war support popup dialog has been dismissed.
	 */
	private onHandleWarSupportClosed() {
		window.removeEventListener('diplomacy-action-details-closed', this.onHandleWarSupportClosedListener);
		this.populateActionsPanel();	// Ensure any changes in values from choosing war support are updated.
	}

	protected refreshTabItems(playerObject: PlayerLibrary) {
		if (!this.tabBar) {
			console.error(`panel-diplomacy-actions: refreshTabItems - no tab bar to refresh!`);
			return;
		}
		if (!playerObject.isMajor) {
			this.tabBar.setAttribute("tab-items", JSON.stringify([{
				id: "diplomacy-tab-actions",
				icon: "fs://game/projects_normal-tab-button",
				iconClass: "size-13",
				highlight: true
			}]));
		} else {
			const playerDiplomacy: PlayerDiplomacy | undefined = playerObject.Diplomacy;
			if (!playerDiplomacy) {
				console.error(`panel-diplomacy-actions: refreshTabItems - playerObject with playerID ${playerObject.id} has no diplomacy library!`);
				return;
			}
			const tabItems: TabItem[] = [];
			tabItems.push({
				id: "diplomacy-tab-actions",
				icon: "fs://game/projects_normal-tab-button",
				className: "",
				iconClass: "size-13",
				highlight: true
			});
			tabItems.push({
				id: "diplomacy-tab-relationship",
				icon: "fs://game/relationships_normal-tab-button",
				className: "",
				iconClass: "size-13",
				highlight: true
			});
			tabItems.push({
				id: "diplomacy-tab-government",
				icon: "fs://game/govtreligion_normal-tab-button",
				className: "",
				iconClass: "size-13",
				highlight: true
			});
			tabItems.push({
				id: "diplomacy-tab-info",
				icon: "fs://game/lore_normal-tab-button",
				className: "",
				iconClass: "size-13",
				highlight: true
			});
			this.tabBar.setAttribute("tab-items", JSON.stringify(tabItems));

			const { playerId, section } = DiploRibbonData.sectionSelected;
			if (isNaN(playerId) || playerId == PlayerIds.NO_PLAYER) {
				return;
			}

			if (section == "relationship") {
				const tabIndex = tabItems.findIndex(tab => tab.id == "diplomacy-tab-relationship");
				if (tabIndex != -1) {
					this.tabBar.setAttribute("selected-tab-index", `${tabIndex}`);
				}
			}

			// Reset
			DiploRibbonData.sectionSelected = {
				playerId: PlayerIds.NO_PLAYER,
				section: "unset"
			}
		}
	}

	protected populatePlayerCivInfo() {
		const infoContainer = MustGetElement("#panel-diplomacy-actions__info-container", this.Root);
		while (infoContainer.hasChildNodes()) {
			infoContainer.removeChild(infoContainer.lastChild!);
		}

		const playerObject: PlayerLibrary | null = Players.get(DiplomacyManager.selectedPlayerID);
		if (!playerObject) {
			console.error("panel-diplomacy-actions: Unable to get player object for selected player while trying to show civ and leader info!");
			return;
		}

		const leaderDefinition: LeaderDefinition | null = GameInfo.Leaders.lookup(playerObject.leaderType);
		if (!leaderDefinition) {
			console.error("panel-diplomacy-actions: Unable to get leader definition for selected player");
			return;
		}

		const civDefinition: CivilizationDefinition | null = GameInfo.Civilizations.lookup(playerObject.civilizationType);
		if (!civDefinition) {
			console.error("panel-diplomacy-actions: Unable to get civilization definition for selected player");
			return;
		}

		const leaderAbilitiesTitle = document.createElement("fxs-header");
		leaderAbilitiesTitle.classList.add("uppercase", "mb-4", "text-secondary", "font-title", "text-base")
		leaderAbilitiesTitle.setAttribute("title", "LOC_DIPLOMACY_ACTIONS_LEADER_ABILITIES_TITLE")
		leaderAbilitiesTitle.setAttribute("filigree-style", "h4");
		infoContainer.appendChild(leaderAbilitiesTitle);

		const leaderBonusItems: Database.DbRow[] | undefined = Database.query('config', 'select * from LeaderItems order by SortIndex')?.filter(item => item.LeaderType == leaderDefinition.LeaderType);
		const leaderTrait: Database.DbRow | undefined = leaderBonusItems?.find(item => item.Kind as string == "KIND_TRAIT");
		const leaderAbilityName = leaderTrait?.Name as string;
		const leaderAbilityDescription = leaderTrait?.Description as string;

		const leaderAbilityItem = document.createElement("div");
		leaderAbilityItem.classList.value = "flex flex-row items-center";
		infoContainer.appendChild(leaderAbilityItem);

		const leaderPortrait = this.createBorderedIcon(Icon.getLeaderPortraitIcon(playerObject.leaderType));
		leaderAbilityItem.appendChild(leaderPortrait);

		const leaderAbilityText = document.createElement("div")
		leaderAbilityText.classList.value = "flex flex-col flex-auto ml-1 justify-center items-start"
		leaderAbilityItem.appendChild(leaderAbilityText);

		const leaderAbilityNameElement = document.createElement("div");
		leaderAbilityNameElement.role = "paragraph";
		leaderAbilityNameElement.classList.value = "font-title text-base uppercase pointer-events-auto";
		leaderAbilityNameElement.innerHTML = Locale.stylize(leaderAbilityName);
		leaderAbilityText.appendChild(leaderAbilityNameElement);

		const divider = document.createElement("div");
		divider.classList.value = "w-72 filigree-divider-inner-frame my-2";
		leaderAbilityText.appendChild(divider);

		const leaderAbilityDescriptionElement = document.createElement("div");
		leaderAbilityNameElement.role = "paragraph";
		leaderAbilityDescriptionElement.classList.value = "font-body text-sm w-full pointer-events-auto";
		leaderAbilityDescriptionElement.innerHTML = Locale.stylize(leaderAbilityDescription);
		leaderAbilityText.appendChild(leaderAbilityDescriptionElement);

		const player = Players.get(DiplomacyManager.selectedPlayerID);
		// Ideology!
		if (player?.Culture != null) {
			const playerIdeology = player.Culture.getChosenIdeology();
			if (playerIdeology != -1) {
				const ideologyDef = GameInfo.Ideologies.find((item: IdeologyDefinition): boolean => {
					return Database.makeHash(item.IdeologyType) == playerIdeology;
				});
				if (ideologyDef != null) {
					const ideologyTitle = document.createElement("fxs-header");
					ideologyTitle.classList.add("uppercase", "mt-12", "mb-4", "text-secondary", "font-title", "text-base");
					ideologyTitle.setAttribute("title", "LOC_IDEOLOGY");
					ideologyTitle.setAttribute("filigree-style", "h4");
					infoContainer.appendChild(ideologyTitle);

					const ideologyItem = document.createElement("div");
					ideologyItem.classList.value = "flex flex-row items-center";
					infoContainer.appendChild(ideologyItem);

					const leaderPortrait = this.createBorderedIcon(Icon.getLeaderPortraitIcon(playerObject.leaderType));
					ideologyItem.appendChild(leaderPortrait);

					const ideologyText = document.createElement("div");
					ideologyText.role = "paragraph";
					ideologyText.classList.value = "flex flex-col flex-auto ml-1 justify-center items-start pointer-events-auto";
					ideologyItem.appendChild(ideologyText);

					const ideologyName = document.createElement("div");
					ideologyName.classList.value = "font-title text-sm uppercase";
					ideologyName.innerHTML = Locale.stylize(ideologyDef.Name);
					ideologyText.appendChild(ideologyName);

					ideologyText.appendChild(divider.cloneNode(true));
				}
			}
		}

		//Agenda!
		const agendaNames: string[] = Game.Diplomacy.getAgendaNames(DiplomacyManager.selectedPlayerID);
		if (player != null && player.isAI && agendaNames.length > 0) {
			const agendaDescs: string[] = Game.Diplomacy.getAgendaDescriptions(DiplomacyManager.selectedPlayerID);

			const agendaTitle = document.createElement("fxs-header");
			agendaTitle.classList.add("uppercase", "mt-12", "mb-4", "text-secondary", "font-title", "text-base");
			agendaTitle.setAttribute("title", "LOC_DIPLOMACY_AGENDA_TITLE");
			agendaTitle.setAttribute("filigree-style", "h4");
			infoContainer.appendChild(agendaTitle);

			const leaderAgendaItem = document.createElement("div");
			leaderAgendaItem.classList.value = "flex flex-row items-center";
			infoContainer.appendChild(leaderAgendaItem);

			const leaderPortrait = this.createBorderedIcon(Icon.getLeaderPortraitIcon(playerObject.leaderType));
			leaderAgendaItem.appendChild(leaderPortrait);

			const agendaText = document.createElement("div");
			agendaText.role = "paragraph";
			agendaText.classList.value = "flex flex-col flex-auto ml-1 justify-center items-start pointer-events-auto";
			leaderAgendaItem.appendChild(agendaText);

			for (let i = 0; i < agendaNames.length && i < agendaDescs.length; i++) {
				const agendaName = document.createElement("div");
				agendaName.classList.value = "font-title text-sm  uppercase";
				if (i > 0) {
					agendaName.classList.value += " mt-6";
				}
				agendaName.innerHTML = Locale.stylize(agendaNames[i]);
				agendaText.appendChild(agendaName);

				agendaText.appendChild(divider.cloneNode(true));

				const agendaDesc = document.createElement("div");
				agendaDesc.classList.value = "font-body text-sm ";
				agendaDesc.innerHTML = Locale.stylize(agendaDescs[i]);
				agendaText.appendChild(agendaDesc);
			}
		}

		const mementosHeader = document.createElement("fxs-header");
		mementosHeader.classList.add("uppercase", "mt-12", "mb-4", "text-secondary", "font-title", "text-base")
		mementosHeader.setAttribute("title", civDefinition.FullName)
		mementosHeader.setAttribute("filigree-style", "h4");
		infoContainer.appendChild(mementosHeader);

		const civBonusItems: Database.DbRow[] | undefined = Database.query('config', 'select * from CivilizationItems order by SortIndex')?.filter(item => item.CivilizationType == civDefinition.CivilizationType);
		const civTrait: Database.DbRow | undefined = civBonusItems?.find(item => item.Kind as string == "KIND_TRAIT");
		const civAbilityName = civTrait?.Name as string;
		const civAbilityDescription = civTrait?.Description as string;

		const civUniqueItems: Database.DbRow[] | undefined = civBonusItems?.filter(item => item.Kind == 'KIND_BUILDING' || item.Kind == 'KIND_IMPROVEMENT' || item.Kind == 'KIND_UNIT' || item.Kind == "KIND_QUARTER")

		const civBonusItem = document.createElement("div");
		civBonusItem.classList.value = "flex flex-row items-center mb-4";
		infoContainer.appendChild(civBonusItem);

		const civBonusIcon = document.createElement("fxs-icon");
		civBonusIcon.classList.add("size-12");
		civBonusIcon.setAttribute("data-icon-context", "DEFAULT");
		civBonusIcon.setAttribute("data-icon-id", civDefinition.CivilizationType);
		civBonusItem.appendChild(civBonusIcon);

		const civBonusText = document.createElement("div");
		civBonusText.classList.value = "flex flex-col flex-auto ml-1 justify-center items-start";
		civBonusItem.appendChild(civBonusText);

		const abilityNameElement = document.createElement("div");
		abilityNameElement.classList.value = "font-title text-sm  uppercase";
		abilityNameElement.innerHTML = Locale.stylize(civAbilityName);
		civBonusText.appendChild(abilityNameElement);

		civBonusText.appendChild(divider.cloneNode(true));

		const abilityDescriptionElement = document.createElement("div");
		abilityDescriptionElement.classList.value = "font-body text-sm w-full";
		abilityDescriptionElement.innerHTML = Locale.stylize(civAbilityDescription);
		civBonusText.appendChild(abilityDescriptionElement);

		civUniqueItems?.forEach(uniqueItem => {
			const civBonusItem = document.createElement("div");
			civBonusItem.classList.value = "flex flex-row items-center mb-4";
			infoContainer.appendChild(civBonusItem);

			let iconName = "";
			let typeName = "";
			switch (uniqueItem.Kind) {
				case 'KIND_UNIT':
					iconName = uniqueItem.Type as string;
					typeName = Locale.stylize("LOC_UNIT_UNIQUE_TITLE");
					break;
				case 'KIND_IMPROVEMENT':
					iconName = uniqueItem.Type as string;
					//Synonymous with building and referred to as buildings in text
					typeName = Locale.stylize("LOC_BUILDING_UNIQUE_TITLE");
					break;
				case 'KIND_BUILDING':
					iconName = uniqueItem.Type as string;
					typeName = Locale.stylize("LOC_BUILDING_UNIQUE_TITLE");
					break;
				case 'KIND_QUARTER':
					typeName = Locale.compose("LOC_UI_PRODUCTION_UNIQUE_QUARTER");
					iconName = "CITY_UNIQUE_QUARTER";
					break;
				default:
					break;
			}

			const itemIcon = document.createElement("fxs-icon");
			itemIcon.classList.add("size-12");
			itemIcon.setAttribute("data-icon-context", "DEFAULT");
			itemIcon.setAttribute("data-icon-id", iconName);
			civBonusItem.appendChild(itemIcon);

			const itemText = document.createElement("div");
			itemText.classList.value = "flex flex-col flex-auto ml-1 justify-center items-start";

			const itemName = document.createElement("div");
			itemName.role = "paragraph";
			itemName.classList.value = "font-title text-sm mt-4 uppercase pointer-events-auto";
			itemName.innerHTML = Locale.stylize(uniqueItem.Name as string);
			itemText.appendChild(itemName);

			itemText.appendChild(divider.cloneNode(true));

			const itemTypeName = document.createElement("div");
			itemTypeName.role = "paragraph";
			itemTypeName.classList.value = "font-body font-bold pointer-events-auto";
			itemTypeName.innerHTML = typeName;
			itemText.appendChild(itemTypeName);

			const itemDescription = document.createElement("div");
			itemDescription.role = "paragraph";
			itemDescription.classList.value = "font-body text-sm w-full pointer-events-auto";
			itemDescription.innerHTML = Locale.stylize(uniqueItem.Description as string);
			itemText.appendChild(itemDescription);

			civBonusItem.appendChild(itemText);
			infoContainer.appendChild(civBonusItem);
		});

		const mementosData = Online.Metaprogression.getEquippedMementos(DiplomacyManager.selectedPlayerID);
		if (mementosData.length > 0) {
			const mementosHeader = document.createElement("fxs-header");
			mementosHeader.classList.add("uppercase", "mt-12", "mb-4", "text-secondary", "font-title", "text-base")
			mementosHeader.setAttribute("title", "LOC_LEADER_MEMENTOS_TITLE")
			mementosHeader.setAttribute("filigree-style", "h4");
			infoContainer.appendChild(mementosHeader);

			mementosData.forEach(memento => {
				const mementoItem = document.createElement("div");
				mementoItem.role = "paragraph";
				mementoItem.classList.value = "flex flex-row items-center mb-4 pointer-events-auto";
				infoContainer.appendChild(mementoItem);

				const itemIcon = document.createElement("div");
				itemIcon.classList.value = "relative size-18 bg-center bg-contain bg-no-repeat";
				itemIcon.style.backgroundImage = `url("fs://game/${memento.isMajorTier ? "mem_maj_leader" : "mem_min_leader"}.png")`;
				mementoItem.appendChild(itemIcon);

				const itemText = document.createElement("div");
				itemText.classList.value = "flex flex-col flex-auto ml-1 justify-center items-start";

				const itemName = document.createElement("div");
				itemName.classList.value = "font-title text-sm mt-4  uppercase";
				itemName.innerHTML = Locale.stylize(memento.mementoName);
				itemText.appendChild(itemName);

				itemText.appendChild(divider.cloneNode(true));

				const itemDescription = document.createElement("div");
				itemDescription.classList.value = "font-body text-sm w-full";
				itemDescription.innerHTML = Locale.stylize(memento.functionalTextDesc);
				itemText.appendChild(itemDescription);

				mementoItem.appendChild(itemText);
				infoContainer.appendChild(mementoItem);
			});
		}
	}

	protected populateGovernmentInfo() {
		const governmentContainer = MustGetElement("#panel-diplomacy-actions__government-container", this.Root);
		while (governmentContainer.hasChildNodes()) {
			governmentContainer.removeChild(governmentContainer.lastChild!);
		}

		const playerObject: PlayerLibrary | null = Players.get(DiplomacyManager.selectedPlayerID);
		if (!playerObject) {
			console.error("panel-diplomacy-actions: Unable to get player object for selected player while trying to government info!");
			return;
		}

		if (!playerObject.Culture) {
			console.error("panel-diplomacy-actions: No valid culture object attached to selected player!");
			return;
		}

		const governmentDefinition: GovernmentDefinition | null = GameInfo.Governments.lookup(playerObject.Culture.getGovernmentType());
		if (!governmentDefinition) {
			console.error("panel-diplomacy-actions: No valid GovernmentDefinition for selected player!");
			return;
		}

		if (!governmentDefinition.Description) {
			console.error("panel-diplomacy-actions: No description for government: " + governmentDefinition.GovernmentType);
			return;
		}

		const governmentTitle = document.createElement("fxs-header");
		governmentTitle.classList.add("uppercase", "mb-4", "font-title", "text-base", "text-secondary");
		governmentTitle.setAttribute("title", governmentDefinition.Name)
		governmentTitle.setAttribute("filigree-style", "h4");
		governmentContainer.appendChild(governmentTitle);

		const governmentDescription = document.createElement("p");
		governmentDescription.classList.add("font-body", "text-sm", "mb-2");
		governmentDescription.innerHTML = Locale.compose(governmentDefinition.Description);
		governmentContainer.appendChild(governmentDescription);

		const governmentCelebrationTypes: string[] = Game.Culture.GetCelebrationTypesForGovernment(governmentDefinition.GovernmentType);

		const playerHappiness: PlayerHappiness | undefined = playerObject.Happiness;
		if (playerHappiness != undefined) {

			for (const celebrationChoice of governmentCelebrationTypes) {
				const celebrationItemDef: GoldenAgeDefinition | null = GameInfo.GoldenAges.lookup(celebrationChoice);
				if (!celebrationItemDef) {
					console.error(`screen-government-picker: render - No golden age definition found for ${celebrationChoice}!`);
					continue;
				}
				const celebrationChoiceContainer = document.createElement("div");
				celebrationChoiceContainer.classList.value = "flex items-center mb-3 max-w-3\\/4 text-sm";

				const celebrationItemImage = document.createElement("div");
				celebrationItemImage.classList.value = "bg-no-repeat bg-center bg-contain size-8 mr-3";
				celebrationItemImage.style.backgroundImage = `url(${UI.getIconURL(celebrationItemDef.GoldenAgeType)})`;
				celebrationChoiceContainer.appendChild(celebrationItemImage);

				const celebrationItemDesc = document.createElement("div");
				celebrationItemDesc.classList.value = "font-body text-sm";
				celebrationItemDesc.innerHTML = Locale.stylize(celebrationItemDef.Description, playerHappiness.getGoldenAgeDuration());
				celebrationChoiceContainer.appendChild(celebrationItemDesc);
				governmentContainer.appendChild(celebrationChoiceContainer);
			}
		}

		if (!playerObject.Religion) {
			console.error("panel-diplomacy-actionss: no valid PlayerReligion attached to player!")
			return;
		}

		const playerPantheons: BeliefType[] = playerObject.Religion.getPantheons();

		if (playerPantheons.length > 0) {
			let religionTitleText = playerObject.Religion!.getReligionName();
			if (religionTitleText == "") {
				religionTitleText = "LOC_TUTORIAL_PANTHEON_UNLOCKED_TITLE";
			}
			const religionTitle = document.createElement("fxs-header");
			religionTitle.classList.add("uppercase", "mt-6", "mb-1", "font-title", "text-base", "text-secondary");
			religionTitle.setAttribute("title", religionTitleText)
			religionTitle.setAttribute("filigree-style", "h4");
			governmentContainer.appendChild(religionTitle);
		}
		playerPantheons.forEach((pantheon, index) => {
			const pantheonDef = GameInfo.Beliefs.lookup(pantheon);
			if (!pantheonDef) {
				console.error(`screen-diplomacy-actions: populateGovernmentInfo - No belief def found for type ${pantheon}`);
				return;
			}

			if (index > 0) {
				const divider = document.createElement("div");
				divider.classList.add("w-60", "filigree-divider-inner-frame", "self-center", "mb-2");
				governmentContainer.appendChild(divider);
			}

			const pantheonItem = document.createElement("div");
			pantheonItem.classList.value = "flex flex-row items-center";

			const pantheonIconContainer = document.createElement("img");
			pantheonIconContainer.classList.value = "size-19 flex items-center justify-center pointer-events-none";
			pantheonIconContainer.src = "fs://game/hud_civics-icon_frame.png";
			pantheonItem.appendChild(pantheonIconContainer);

			const pantheonIcon = document.createElement("img");
			pantheonIcon.classList.value = "relative flex flex-col items-center size-14 bg-center";
			pantheonIcon.src = UI.getIcon(pantheonDef.BeliefType, "PANTHEONS");
			pantheonIconContainer.appendChild(pantheonIcon);

			const pantheonInfoContainer = document.createElement("div");
			pantheonInfoContainer.classList.value = "flex flex-col flex-auto ml-1 justify-center items-start";
			pantheonItem.appendChild(pantheonInfoContainer);

			const pantheonTitle = document.createElement("div");
			pantheonTitle.role = "paragraph";
			pantheonTitle.classList.value = "font-title text-base pointer-events-auto";
			pantheonTitle.innerHTML = Locale.stylize(pantheonDef.Name);
			pantheonInfoContainer.appendChild(pantheonTitle);

			const pantheonDescription = document.createElement("div");
			pantheonDescription.role = "paragraph";
			pantheonDescription.classList.value = "font-body text-sm flex flex-col pointer-events-auto";
			pantheonDescription.innerHTML = Locale.stylize(pantheonDef.Description);
			pantheonInfoContainer.appendChild(pantheonDescription);
			governmentContainer.appendChild(pantheonItem);
		});
	}

	protected populateRelationshipInfo() {
		if (!this.checkShouldShowPanel()) {
			return;
		}
		const relationshipEventContainer = MustGetElement("#panel-diplomacy-actions__relationship-event-container", this.Root);
		while (relationshipEventContainer.hasChildNodes()) {
			relationshipEventContainer.removeChild(relationshipEventContainer.lastChild!);
		}


		const playerLibrary = Players.get(DiplomacyManager.selectedPlayerID);
		if (!playerLibrary) {
			console.error("panel-diplomacy-actions: Unable to get player library for player with id: " + DiplomacyManager.selectedPlayerID);
			return;
		}
		const playerDiplomacy = playerLibrary.Diplomacy;
		if (playerDiplomacy === undefined) {
			console.error("panel-diplomacy-actions: Attempting to update relationship info screen, but unable to get selected player diplomacy library");
			return;
		}

		const relationshipBreakdown = new RelationshipBreakdown(DiplomacyManager.selectedPlayerID, GameContext.localPlayerID);
		relationshipBreakdown.root.classList.add("w-128", "self-center");
		relationshipEventContainer.appendChild(relationshipBreakdown.root);
		relationshipBreakdown.update(DiplomacyManager.selectedPlayerID, GameContext.localPlayerID);

		const localPlayerDiplomacy = Players.get(GameContext.localPlayerID)?.Diplomacy;
		if (!localPlayerDiplomacy) {
			console.error("panel-diplomacy-actions: Unable to get PlayerLibrary for local player!");
			return;
		}

		const otherRelationships: RelationshipWithOtherData[] = [];

		for (const id of Players.getAliveIds()) {
			const playerLibrary = Players.get(id);
			if (!playerLibrary || !playerLibrary.isMajor || (id != GameContext.localPlayerID && !playerDiplomacy.hasMet(id))) {
				continue;
			}

			const otherRelationshipData: RelationshipWithOtherData = {
				leaderID: id,
				relationshipLevel: playerDiplomacy.getRelationshipEnum(id),
				portraitIcon: (localPlayerDiplomacy.hasMet(id) || GameContext.localPlayerID == id) ? Icon.getLeaderPortraitIcon(playerLibrary!.leaderType) : "fs://game/base-standard/leader_portrait_unknown.png"
			}
			if (playerDiplomacy.isAtWarWith(id)) {
				otherRelationshipData.atWar = true;
			} else if (playerDiplomacy.hasAllied(id)) {
				otherRelationshipData.allied = true;
			}

			otherRelationships.push(otherRelationshipData);
		}

		const otherRelationshipsHeader = MustGetElement("#panel-diplomacy-actions__other-relationships-header-name", this.Root);
		otherRelationshipsHeader.role = "header";
		otherRelationshipsHeader.innerHTML = Locale.compose(playerLibrary.leaderName);

		const otherRelationshipsContainer = MustGetElement("#panel-diplomacy-actions__other-relationships-container", this.Root);
		while (otherRelationshipsContainer.hasChildNodes()) {
			otherRelationshipsContainer.removeChild(otherRelationshipsContainer.lastChild!);
		}
		otherRelationships.forEach(relationship => {

			const row = this.getRelationshipRow(relationship);
			if (!row) {
				console.error("Panel-diplomacy-actions: Unable to find relationship row for relationship type: " + relationship.relationshipLevel);
				return;
			}
			const iconRow = MustGetElement("#relationship-icon-row", row)
			iconRow.appendChild(this.createBorderedIcon(relationship.portraitIcon, relationship.leaderID));

			otherRelationshipsContainer.appendChild(row);
		});
		const relationshipAmountValue = playerDiplomacy.getRelationshipLevel(GameContext.localPlayerID);
		waitForLayout(() => {
			const relationshipButton = this.Root.querySelector<HTMLElement>("#diplomacy-tab-relationship-tab-item");
			if (relationshipButton) {
				let relationshipButtonNumber = relationshipButton.querySelector("#relationship-button-number");
				if (!relationshipButtonNumber) {
					const relationshipButtonImg = MustGetElement("fxs-stateful-icon", relationshipButton);
					relationshipButtonImg.classList.add("flex", "justify-center");
					relationshipButtonNumber = document.createElement("div");
					relationshipButtonNumber.setAttribute("id", "relationship-button-number");
					relationshipButtonNumber.classList.value = "font-title text-xs text-center self-center font-bold absolute";
					relationshipButtonImg.appendChild(relationshipButtonNumber);
				}
				let relationshipAmountString = relationshipAmountValue.toString();
				if (relationshipAmountValue < 0) {
					relationshipAmountString = (relationshipAmountValue * -1).toString();
				}
				relationshipButtonNumber.innerHTML = relationshipAmountString;
				relationshipButtonNumber.classList.toggle("text-positive-dark", relationshipAmountValue > 0);
				relationshipButtonNumber.classList.toggle("text-negative-dark", relationshipAmountValue < 0);
			}
		});
	}

	private createBorderedIcon(iconURL: string, leaderID?: PlayerId): HTMLElement {
		const portrait = document.createElement("div");
		portrait.classList.add("panel-diplomacy-actions__ongoing-action-portrait", "pointer-events-auto");

		const portraitBG = document.createElement("div");
		portraitBG.classList.add("panel-diplomacy-actions__ongoing-actions-portrait-bg");
		portrait.appendChild(portraitBG);

		const portraitBGInner = document.createElement("div");
		portraitBGInner.classList.add("panel-diplomacy-actions__ongoing-actions-portrait-bg-inner");
		portrait.appendChild(portraitBGInner);

		const portraitIcon = document.createElement("div");
		portraitIcon.classList.add("panel-diplomacy-actions__ongoing-actions-portrait-image");
		portraitIcon.style.backgroundImage = `url(${iconURL})`;
		portrait.appendChild(portraitIcon);

		if (leaderID != undefined) {
			const otherLeaderLibrary: PlayerLibrary | null = Players.get(leaderID);
			if (!otherLeaderLibrary) {
				console.error(`panel-diplomacy-action: createBorderedIcon - no player library found for player ID ${leaderID}`);
				return portrait;
			}

			const localPlayer: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (!localPlayer) {
				console.error(`panel-diplomacy-action: createBorderedIcon - no local player library found!`);
				return portrait;
			}

			const localPlayerDiplomacy: PlayerDiplomacy | undefined = localPlayer.Diplomacy;
			if (!localPlayerDiplomacy) {
				console.error(`panel-diplomacy-action: createBorderedIcon - no local player diplomacy library found!`);
				return portrait;
			}

			if (localPlayerDiplomacy.hasMet(leaderID) || GameContext.localPlayerID == leaderID) {
				portrait.setAttribute("data-tooltip-content", Locale.compose(otherLeaderLibrary.name));
			}
			else {
				portrait.setAttribute("data-tooltip-content", Locale.compose("LOC_LEADER_UNMET_NAME"));
			}

		}
		return portrait;
	}

	private getRelationshipRow(relationship: RelationshipWithOtherData): HTMLElement | null {
		if (relationship.atWar) {
			return this.findOrCreateRelationshipRow("at-war", "LOC_PLAYER_RELATIONSHIP_AT_WAR")
		} else if (relationship.allied) {
			return this.findOrCreateRelationshipRow("allied", "LOC_PLAYER_RELATIONSHIP_ALLIANCE")
		} else {
			switch (relationship.relationshipLevel) {
				case DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_FRIENDLY:
					return this.findOrCreateRelationshipRow(DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_FRIENDLY.toString(), "LOC_PLAYER_RELATIONSHIP_FRIENDLY");
				case DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_HELPFUL:
					return this.findOrCreateRelationshipRow(DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_HELPFUL.toString(), "LOC_PLAYER_RELATIONSHIP_HELPFUL");
				case DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_HOSTILE:
					return this.findOrCreateRelationshipRow(DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_HOSTILE.toString(), "LOC_PLAYER_RELATIONSHIP_HOSTILE");
				case DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_UNFRIENDLY:
					return this.findOrCreateRelationshipRow(DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_UNFRIENDLY.toString(), "LOC_PLAYER_RELATIONSHIP_UNFRIENDLY");
				case DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_NEUTRAL:
					return this.findOrCreateRelationshipRow(DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_NEUTRAL.toString(), "LOC_PLAYER_RELATIONSHIP_NEUTRAL");
				default:
					return null
			}
		}
	}

	private findOrCreateRelationshipRow(id: string, titleString: string): HTMLElement {
		let relatioshipRowWrapper: HTMLElement | null = this.Root.querySelector(`#panel-diplomacy-actions__relationship-row-${id}`);
		if (!relatioshipRowWrapper) {
			relatioshipRowWrapper = document.createElement('div')
			relatioshipRowWrapper.setAttribute("id", `panel-diplomacy-actions__relationship-row-${id}`);
			const relationshipRow = document.createElement("div");
			relationshipRow.role = "paragraph";
			// relationshipRow.setAttribute("id", `panel-diplomacy-actions__relationship-row-${id}`);
			relationshipRow.classList.add("flex", "flex-row", "h-15", "items-center", "mt-2", "border-b-accent", "pointer-events-auto");
			const title = document.createElement("div");
			title.classList.value = "font-body text-sm ml-2 w-24 font-fit-shrink";
			title.innerHTML = Locale.compose(titleString);
			const iconRow = document.createElement("div");
			iconRow.classList.value = "flex-wrap flex flex-auto relative flex-row";
			iconRow.setAttribute("id", "relationship-icon-row");
			relationshipRow.appendChild(title);
			relationshipRow.appendChild(iconRow);
			relatioshipRowWrapper.appendChild(relationshipRow)
			const divider = document.createElement("div");
			divider.classList.add("w-60", "filigree-divider-inner-frame", "self-center");
			relatioshipRowWrapper.appendChild(divider);
		}
		return relatioshipRowWrapper;
	}
	setOngoingActionsScrollablePosition() {
		const ongoingActionsScrollable = MustGetElement('.panel-diplomacy-actions__ongoing-actions-scrollable', this.Root);
		const ribbonStats = Configuration.getUser().getValue("RibbonStats");
		if (ribbonStats == RibbonStatsToggleStatus.RibbonStatsShowing) {
			ongoingActionsScrollable.classList.add('panel-diplomacy-actions__ribbons-showing');
			ongoingActionsScrollable.classList.remove('panel-diplomacy-actions__ribbons-not-showing');
		} else {
			ongoingActionsScrollable.classList.add('panel-diplomacy-actions__ribbons-not-showing');
			ongoingActionsScrollable.classList.remove('panel-diplomacy-actions__ribbons-showing');
		}
	}
	//TODO: May not need here depending on design of city state diplo
	// protected populateCityStateInfo(){
	// 	const cityStateLibrary: PlayerLibrary | null = Players.get(DiplomacyManager.selectedPlayerID);
	// 	if (!cityStateLibrary) {
	// 		console.error("panel-diplomacy-actionss: Attempting to show chosen city state bonus info, but can't get valid PlayerLibrary!");
	// 		return;
	// 	}

	// 	const bonusType: CityStateBonusType = Game.CityStates.getBonusType(cityStateLibrary.id);
	// 	const bonusDefinition: CityStateBonusDefinition | undefined = GameInfo.CityStateBonuses.find(t => t.$hash == bonusType);
	// 	if (!bonusDefinition) {
	// 		console.error("panel-diplomacy-actionss: Attempting to show chosen city state bonus info, but can't get valid CityStateBonusDefinition!");
	// 		return;
	// 	}

	// 	const mementosHeader= document.createElement("div");
	// 	mementosHeader.classList.add("panel-diplomacy-actions__info-header");
	// 	mementosHeader.innerHTML = Locale.stylize("LOC_DIPLOMACY_CHOSEN_BONUS_TITLE");
	// 	this.infoContainer.appendChild(mementosHeader);

	// 	const itemElement = document.createElement("div");
	// 	itemElement.classList.add("panel-diplomacy-actions__trait-container");

	// 	const bonusIconURL= UI.getIconCSS(bonusDefinition.CityStateBonusType, "CITY_STATE_BONUS");
	// 	const itemIcon = document.createElement("div");
	// 	itemIcon.classList.add("panel-diplomacy-actions__trait-icon");
	// 	itemIcon.style.backgroundImage = bonusIconURL;
	// 	itemElement.appendChild(itemIcon);

	// 	const itemTextContainer = document.createElement("div");
	// 	itemTextContainer.classList.add("panel-diplomacy-actions__trait-text-container");

	// 	const itemName = document.createElement("div");
	// 	itemName.classList.add("panel-diplomacy-actions__trait-name");
	// 	itemName.innerHTML = Locale.stylize(bonusDefinition.Name);
	// 	itemTextContainer.appendChild(itemName);

	// 	const itemDescription = document.createElement("div");
	// 	itemDescription.classList.add("panel-diplomacy-actions__trait-description");
	// 	itemDescription.innerHTML = Locale.stylize(bonusDefinition.Description);
	// 	itemTextContainer.appendChild(itemDescription);

	// 	itemElement.appendChild(itemTextContainer);
	// 	this.infoContainer.appendChild(itemElement);
	// }

	protected onCollapseActionSection(collapseButton: HTMLElement, actionsContainer: HTMLElement) {
		//TODO: Animations once height transition is figured out
		const type = collapseButton.getAttribute("type");
		if (type == "minus") {
			collapseButton.setAttribute("type", "plus");
			actionsContainer.classList.add("hidden");
			Audio.playSound("data-audio-dropdown-close");
		} else {
			collapseButton.setAttribute("type", "minus");
			actionsContainer.classList.remove("hidden");
			Audio.playSound("data-audio-dropdown-open");
		}
	}

	protected populateActionsPanel() {
		if (DiplomacyManager.selectedPlayerID == PlayerIds.NO_PLAYER) {
			console.error("panel-diplomacy-actions: Trying to view ongoing diplomatic actions without a valid player selected!");
			this.close();
			return;
		}

		const availableProjectsSlot = MustGetElement("#available-projects-slot", this.Root);
		while (availableProjectsSlot.hasChildNodes()) {
			availableProjectsSlot.removeChild(availableProjectsSlot.lastChild!);
		}

		const wars: DiplomaticEventHeader[] = [];
		const otherPlayer = Players.get(DiplomacyManager.selectedPlayerID);
		if (otherPlayer != null && otherPlayer.isMajor) {
			const theirWars: DiplomaticEventHeader[] = Game.Diplomacy.getPlayerEvents(DiplomacyManager.selectedPlayerID).filter((action) => { return action.actionType == DiplomacyActionTypes.DIPLOMACY_ACTION_DECLARE_WAR });
			theirWars.forEach(war => {
				if ((war.targetPlayer == GameContext.localPlayerID || war.initialPlayer == GameContext.localPlayerID) && (war.targetPlayer == DiplomacyManager.selectedPlayerID || war.initialPlayer == DiplomacyManager.selectedPlayerID) && !wars.find((w) => war.uniqueID == w.uniqueID)) {
					wars.push(war);
				}
			});
		}

		this.firstFocusSection = null;
		if (wars.length > 0) {
			const header = document.createElement("fxs-header");
			header.classList.add('relative');
			header.setAttribute('title', "LOC_DIPLOMACY_WAR_HEADER");
			header.setAttribute('filigree-style', 'h3');
			availableProjectsSlot.appendChild(header);

			const collapseButton = document.createElement("fxs-minus-plus");
			collapseButton.classList.add("absolute", "top-1", "right-5");
			collapseButton.setAttribute("type", "minus");
			collapseButton.setAttribute("tabindex", "-1");
			header.appendChild(collapseButton);

			this.firstFocusSection = collapseButton;

			const actionsContainer = document.createElement("fxs-vslot");
			actionsContainer.classList.add("overflow-hidden", "h-auto", "w-auto", "transition-all", "duration-100", "scale-y-100", "origin-top");

			wars.forEach(war => {
				const warChooserItem = document.createElement("war-chooser-item");
				warChooserItem.componentCreatedEvent.on((chooser) => {
					chooser.warChooserData = war;
				});
				actionsContainer.appendChild(warChooserItem);
				warChooserItem.addEventListener("action-activate", () => { this.clickOngoingAction(war.uniqueID) });
			});

			collapseButton.addEventListener("action-activate", () => { this.onCollapseActionSection(collapseButton, actionsContainer) });
			availableProjectsSlot.appendChild(actionsContainer);
		}

		DiplomacyManager.queryAvailableProjectData(DiplomacyManager.selectedPlayerID);

		let hasAvailableProjects = false;

		if (DiplomacyManager.availableTreaties.length > 0) {
			const header = document.createElement("fxs-header");
			header.classList.add('relative');
			header.setAttribute('title', "LOC_DIPLOMACY_ACTIONS_AVAILABLE_TREATIES");
			header.setAttribute('filigree-style', 'h3');
			availableProjectsSlot.appendChild(header);

			const collapseButton = document.createElement("fxs-minus-plus");
			collapseButton.classList.add("absolute", "top-1", "right-5");
			collapseButton.setAttribute("type", "minus");
			collapseButton.setAttribute("tabindex", "-1");
			header.appendChild(collapseButton);

			if (this.firstFocusSection == null) {
				this.firstFocusSection = collapseButton;
			}

			const actionsContainer = document.createElement("fxs-vslot");
			actionsContainer.classList.add("overflow-hidden", "transition-all", "duration-100", "scale-y-100", "origin-top");

			DiplomacyManager.availableTreaties.forEach(project => {
				const newItem = this.createStartActionListItem(project);
				actionsContainer.appendChild(newItem);
			});

			collapseButton.addEventListener("action-activate", () => { this.onCollapseActionSection(collapseButton, actionsContainer) })
			availableProjectsSlot.appendChild(actionsContainer);
		}

		if (DiplomacyManager.availableProjects.length > 0) {
			hasAvailableProjects = true;
			const header = document.createElement("fxs-header");
			header.classList.add('relative');
			header.setAttribute('title', "LOC_DIPLOMACY_ACTIONS_AVAILABLE_PROJECTS");
			header.setAttribute('filigree-style', 'h3');
			availableProjectsSlot.appendChild(header);

			const collapseButton = document.createElement("fxs-minus-plus");
			collapseButton.classList.add("absolute", "top-1", "right-5");
			collapseButton.setAttribute("type", "minus");
			collapseButton.setAttribute("tabindex", "-1");
			header.appendChild(collapseButton);

			if (this.firstFocusSection == null) {
				this.firstFocusSection = collapseButton;
			}

			const actionsContainer = document.createElement("fxs-vslot");
			actionsContainer.classList.add("overflow-hidden", "transition-all", "duration-100", "scale-y-100", "origin-top");

			DiplomacyManager.availableProjects.forEach(project => {
				const newItem = this.createStartActionListItem(project);
				actionsContainer.appendChild(newItem);
			});

			collapseButton.addEventListener("action-activate", () => { this.onCollapseActionSection(collapseButton, actionsContainer) })
			availableProjectsSlot.appendChild(actionsContainer);
		}

		if (DiplomacyManager.availableEndeavors.length > 0) {
			hasAvailableProjects = true
			const header = document.createElement("fxs-header");
			header.classList.add('relative');
			header.setAttribute('title', "LOC_DIPLOMACY_ACTIONS_AVAILABLE_ENDEAVORS");
			header.setAttribute('filigree-style', 'h3');
			availableProjectsSlot.appendChild(header);

			const collapseButton = document.createElement("fxs-minus-plus");
			collapseButton.classList.add("absolute", "top-1", "right-5");
			collapseButton.setAttribute("type", "minus");
			collapseButton.setAttribute("tabindex", "-1");
			header.appendChild(collapseButton);

			if (this.firstFocusSection == null) {
				this.firstFocusSection = collapseButton;
			}

			const actionsContainer = document.createElement("fxs-vslot");
			actionsContainer.classList.add("overflow-hidden", "transition-all", "duration-100", "scale-y-100", "origin-top");

			DiplomacyManager.availableEndeavors.forEach(project => {
				const newItem = this.createStartActionListItem(project);
				actionsContainer.appendChild(newItem);
			});

			collapseButton.addEventListener("action-activate", () => { this.onCollapseActionSection(collapseButton, actionsContainer) })
			availableProjectsSlot.appendChild(actionsContainer);
		}

		if (DiplomacyManager.availableSanctions.length > 0) {
			hasAvailableProjects = true;
			const header = document.createElement("fxs-header");
			header.classList.add('relative');
			header.setAttribute('title', "LOC_DIPLOMACY_ACTIONS_AVAILABLE_SANCTIONS");
			header.setAttribute('filigree-style', 'h3');
			availableProjectsSlot.appendChild(header);

			const collapseButton = document.createElement("fxs-minus-plus");
			collapseButton.classList.add("absolute", "top-1", "right-5");
			collapseButton.setAttribute("type", "minus");
			collapseButton.setAttribute("tabindex", "-1");
			header.appendChild(collapseButton);

			if (this.firstFocusSection == null) {
				this.firstFocusSection = collapseButton;
			}

			const actionsContainer = document.createElement("fxs-vslot");
			actionsContainer.classList.add("overflow-hidden", "transition-all", "duration-100", "scale-y-100", "origin-top");

			DiplomacyManager.availableSanctions.forEach(project => {
				const newItem = this.createStartActionListItem(project);
				actionsContainer.appendChild(newItem);
			});

			collapseButton.addEventListener("action-activate", () => { this.onCollapseActionSection(collapseButton, actionsContainer) })
			availableProjectsSlot.appendChild(actionsContainer);
		}

		if (DiplomacyManager.availableEspionage.length > 0) {
			hasAvailableProjects = true;
			const header = document.createElement("fxs-header");
			header.classList.add('relative');
			header.setAttribute('title', "LOC_DIPLOMACY_ACTIONS_AVAILABLE_ESPIONAGE");
			header.setAttribute('filigree-style', 'h3');
			availableProjectsSlot.appendChild(header);

			const collapseButton = document.createElement("fxs-minus-plus");
			collapseButton.classList.add("absolute", "top-1", "right-4");
			collapseButton.setAttribute("type", "minus");
			collapseButton.setAttribute("tabindex", "-1");
			header.appendChild(collapseButton);

			if (this.firstFocusSection == null) {
				this.firstFocusSection = collapseButton;
			}

			const actionsContainer = document.createElement("fxs-vslot");
			actionsContainer.classList.add("overflow-hidden", "transition-all", "duration-100", "scale-y-100", "origin-top");

			DiplomacyManager.availableEspionage.forEach(project => {
				const newItem = this.createStartActionListItem(project);
				actionsContainer.appendChild(newItem);
			});

			collapseButton.addEventListener("action-activate", () => { this.onCollapseActionSection(collapseButton, actionsContainer) })
			availableProjectsSlot.appendChild(actionsContainer);
		}

		if (!hasAvailableProjects) {
			const noAvailableProjectsElement = document.createElement("p");
			noAvailableProjectsElement.classList.value = "mt-16 font-title text-2xl text-center";
			noAvailableProjectsElement.innerHTML = Locale.compose("LOC_DIPLOMACY_NO_AVAILABLE_PROJECTS");
			availableProjectsSlot.appendChild(noAvailableProjectsElement);
		}

	}

	protected onOptionsTabSelected(e: TabSelectedEvent) {
		e.stopPropagation();

		const player = Players.get(DiplomacyManager.selectedPlayerID);
		if (player?.isMajor && DiplomacyManager.selectedPlayerID != GameContext.localPlayerID) {
			this.majorActionsSlot?.classList.toggle("hidden", e.detail.selectedItem.id != "diplomacy-tab-actions");
		}
		this.slotGroup?.setAttribute('selected-slot', e.detail.selectedItem.id);
	}

	private onInterfaceModeChanged() {
		if (this.checkShouldShowPanel() && InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_HUB")) {
			//We are coming back from a dialog or peace deal, reset the focus!
			this.checkRefesh();					// Check if we need to refresh anything
			this.realizeInitialFocus();
		};
	}

	protected onSelectedPlayerChanged() {
		Audio.playSound("data-audio-showing", "leader-panel");
		if (this.checkShouldShowPanel()) {
			const playerObject: PlayerLibrary | null = Players.get(DiplomacyManager.selectedPlayerID);
			if (!playerObject) {
				console.error("panel-diplomacy-actions: Unable to get player object for selected player!");
				return;
			}

			if (playerObject.isMajor) {
				this.leaderNameElement?.setAttribute('title', Locale.compose(playerObject.leaderName));
				this.mementosHeaderElement?.setAttribute('title', Locale.compose("LOC_DIPLOMACY_CIV_NAME", playerObject.civilizationAdjective));
			}
			else {
				this.leaderNameElement?.setAttribute('title', Locale.compose(playerObject.civilizationAdjective));
				if (playerObject.civilizationAdjective != playerObject.name) {
					this.mementosHeaderElement?.setAttribute('title', Locale.compose("LOC_DIPLOMACY_INDEPENDENT_CIV_NAME", playerObject.name));
				}
				else {
					this.mementosHeaderElement?.setAttribute('title', Locale.compose(""));
				}
			}

			this.civSymbol!.style.backgroundImage = `url("${Icon.getCivIconForDiplomacyHeader(playerObject.civilizationType)}")`;
			this.diploTint?.style.setProperty("fxs-background-image-tint", UI.Player.getPrimaryColorValueAsString(playerObject.id));
			this.Root.classList.toggle("independent", !playerObject.isMajor);
			this.refreshTabItems(playerObject);

			if (this.initialLoadComplete) {
				this.refreshFullData();
			}

			this.realizeNavTray();
		}
	}

	protected realizeInitialFocus() {
		const props: Navigation.Properties = { isDisableFocusAllowed: false, direction: InputNavigationAction.NONE };
		if (this.firstFocusSection) {
			FocusManager.setFocus(this.firstFocusSection);
		} else {
			const focusableElement: Element | null = Navigation.getLastFocusableElement(this.Root, props);
			if (focusableElement) {
				FocusManager.setFocus(focusableElement);
			}
		}
	}

	private onActionCanceled(data: DiplomacyEventCanceled_EventData) {
		const actionData: DiplomaticEventHeader = Game.Diplomacy.getDiplomaticEventData(data.actionID);

		//Only update if the currently selected leader is involved
		if ((actionData.initialPlayer == DiplomacyManager.selectedPlayerID || actionData.targetPlayer == DiplomacyManager.selectedPlayerID) && this.checkShouldShowPanel() && this.initialLoadComplete) {
			this.refreshPartialData();
		}
	}

	protected onSupportChanged(data: DiplomacyEventSupportChanged_EventData) {
		const actionData: DiplomaticEventHeader = Game.Diplomacy.getDiplomaticEventData(data.actionID);
		let bRefreshData: boolean = false;

		// Don't refresh ever in Project Reaction.  Always refresh in Diplomacy Hub.  Otherwise
		// only refresh if one of the players being shown is involved.
		if (!InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_PROJECT_REACTION")) {
			if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_HUB")) {
				bRefreshData = true;
			} else {
				// Only update if the currently selected leader is involved
				if ((actionData.initialPlayer == DiplomacyManager.selectedPlayerID || actionData.targetPlayer == DiplomacyManager.selectedPlayerID) && this.checkShouldShowPanel() && this.initialLoadComplete) {
					bRefreshData = true;
				}
			}
		}

		if (bRefreshData) {
			this.refreshSupportData();
			waitForLayout(() => {
				if (DiplomacyManager.selectedActionID == null) {
					//Only re-set focus if we are not in diplomacy-action-details (War support)
					this.realizeInitialFocus();
				}
			})
		}

		if (!InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_PROJECT_REACTION")) {
			this.showBefriendIndependentDetails();
		}
	}

	// ------------------------------------------------------------------------
	// Handle diplomacy queue changed event
	private onDiplomacyQueueChanged(data: DiplomacyQueueChanged_EventData) {

		if (data.player1 == GameContext.localPlayerID || data.player2 == GameContext.localPlayerID) {
			this.diplomacyQueueChanged = true;
		}
	}

	// ------------------------------------------------------------------------
	// Handle the event stream completing
	private onGameCoreEventPlaybackCompleteListener() {
		this.checkRefesh();
	}

	// ------------------------------------------------------------------------
	// Check to see if anything needs a refresh
	private checkRefesh() {

		if (this.diplomacyQueueChanged) {
			this.diplomacyQueueChanged = false;
			// This is probably doing too much, the main thing is we want to have the Propose Peace button to enable / disable
			DiplomacyManager.populateDiplomacyActions();
			this.populateActionsPanel();
			this.populateAvailableActions();
		}
	}

	protected checkShouldShowPanel(): boolean {
		//Check if we are in the proper state to show this panel
		//Stub for override
		return true;
	}

	protected showLeaderModel() {
		//Stub for override
	}

	protected getCostFromTargetList(projectData: DiplomaticProjectUIData): number {
		let cost = -1;
		projectData.targetList1.forEach(targetData => {
			if (targetData.targetID == DiplomacyManager.selectedPlayerID) {
				cost = targetData.costYieldD;
			}
		});
		return cost;
	}

	protected createStartActionListItem(projectData: DiplomaticProjectUIData, recentlyCompletedData?: RecentDiplomaticActions): HTMLElement {
		const startActionItem = document.createElement("chooser-item");
		startActionItem.classList.add("chooser-item_unlocked", "min-h-19", "w-full", "flex", "flex-row", "justify-start", "items-start", "mb-2");
		startActionItem.setAttribute('tabindex', "-1");
		startActionItem.setAttribute("data-tooltip-content", Locale.compose(projectData.projectDescription));

		startActionItem.setAttribute("data-audio-group-ref", "audio-diplo-project-reaction");

		const iconContainer = document.createElement("div");
		iconContainer.classList.value = "chooser-item__icon flex self-center items-center justify-center pointer-events-none relative";
		startActionItem.appendChild(iconContainer);

		const iconImage = document.createElement("div");
		iconImage.classList.value = "chooser-item__icon-image relative flex flex-col items-center justify-center";
		iconContainer.appendChild(iconImage);

		if (recentlyCompletedData) {
			const repeatIcon = document.createElement("img");
			repeatIcon.src = "fs://game/dip_renew_project.png";
			iconImage.appendChild(repeatIcon);
			const target = Configuration.getPlayer(recentlyCompletedData.playerTarget);
			if (target?.leaderTypeName) {
				const targetIcon = document.createElement("leader-icon");
				targetIcon.classList.add("mr-2", "mt-1", "w-16", "h-16", "relative");
				targetIcon.setAttribute("leader", target.leaderTypeName);
				targetIcon.setAttribute("bg-color", UI.Player.getPrimaryColorValueAsString(recentlyCompletedData.playerTarget))
				startActionItem.appendChild(targetIcon);
			}
		}

		const actionDef = GameInfo.DiplomacyActions.lookup(projectData.actionType);
		if (!actionDef) {
			console.error("panel-diplomacy-actions: Unable to get definition for diplomacy action with type: " + projectData.actionTypeName);
			iconImage.style.backgroundImage = `url("fs://game/yield_influence")`;
		} else {
			iconImage.style.backgroundImage = `url("${actionDef.UIIconPath}")`;
		}

		const actionDetailsContainer = document.createElement("div");
		actionDetailsContainer.classList.add("flex-auto", "flex", "flex-col", "justify-between", "items-start", "self-center", "relative");

		const actionName = document.createElement("div");
		actionName.classList.add("font-title", "text-sm", "mb-1", "mt-1", "pointer-events-none", "font-fit-shrink");
		if (projectData.actionTypeName == "DIPLOMACY_ACTION_GIVE_INFLUENCE_TOKEN") {
			actionName.innerHTML = Locale.compose("LOC_DIPLOMACY_ACTION_GIVE_INFLUENCE_TOKEN_START_ACTION_NAME");
		} else {
			actionName.innerHTML = Locale.compose(projectData.actionDisplayName);
		}
		actionDetailsContainer.appendChild(actionName);
		startActionItem.appendChild(actionDetailsContainer);

		const target = recentlyCompletedData ? recentlyCompletedData.playerTarget : DiplomacyManager.selectedPlayerID;
		const relationshipDeltas: number[] = Game.Diplomacy.getActionRelationshipDelta(target, projectData.actionType);

		if (projectData.projectStatus != DiplomacyProjectStatus.PROJECT_AVAILABLE) {
			const turnsToComplete = Game.Diplomacy.getBaseDiplomaticActionDuration(projectData.actionType);
			let tooltip = Locale.stylize(projectData.projectDescription + "[N]" + Locale.compose("LOC_DIPLOMACY_ACTION_LASTS_FOR_TURNS", turnsToComplete));
			if (relationshipDeltas[0] != 0) {
				const acceptedRelationshipTooltip = Locale.compose("LOC_DIPLOMACY_RELATIONSHIP_CHANGE_ACCEPTED", relationshipDeltas[0]);
				tooltip = tooltip + Locale.stylize("[N]" + acceptedRelationshipTooltip);
			}
			if (relationshipDeltas[1] != 0) {
				const supportedRelationshipTooltip = Locale.compose("LOC_DIPLOMACY_RELATIONSHIP_CHANGE_SUPPORTED", relationshipDeltas[1]);
				tooltip = tooltip + Locale.stylize("[N]" + supportedRelationshipTooltip);
			}
			startActionItem.setAttribute("data-tooltip-content", tooltip);
			startActionItem.setAttribute("disabled", "true");

			const disabledReason = document.createElement("div");
			disabledReason.classList.add("font-body", "text-2xs", "mb-1", "text-negative");

			let failureString = "";
			projectData.resultData.FailureReasons?.forEach((reason, index) => {
				if (index > 0) {
					failureString += "[N]";
				}
				failureString += reason;
			});
			disabledReason.innerHTML = Locale.stylize(failureString);

			actionDetailsContainer.appendChild(disabledReason);
		} else {
			const turnsToComplete = Game.Diplomacy.getBaseDiplomaticActionDuration(projectData.actionType);
			let tooltip = Locale.stylize(projectData.projectDescription + "[N]" + Locale.compose("LOC_DIPLOMACY_ACTION_LASTS_FOR_TURNS", turnsToComplete));
			if (relationshipDeltas[0] != 0) {
				const acceptedRelationshipTooltip = Locale.stylize("LOC_DIPLOMACY_RELATIONSHIP_CHANGE_ACCEPTED", relationshipDeltas[0]);
				tooltip = tooltip + Locale.stylize("[N]" + acceptedRelationshipTooltip);
			}
			if (relationshipDeltas[1] != 0) {
				const supportedRelationshipTooltip = Locale.stylize("LOC_DIPLOMACY_RELATIONSHIP_CHANGE_SUPPORTED", relationshipDeltas[1]);
				tooltip = tooltip + Locale.stylize("[N]" + supportedRelationshipTooltip);
			}
			startActionItem.setAttribute("data-tooltip-content", tooltip);
		}

		if (projectData.actionGroup == DiplomacyActionGroups.DIPLOMACY_ACTION_GROUP_ESPIONAGE && projectData.actionType != DiplomacyActionTypes.DIPLOMACY_ACTION_COUNTER_SPY) {
			const projectDefinition: DiplomacyActionDefinition | null = GameInfo.DiplomacyActions.lookup(projectData.actionType);
			if (projectDefinition) {
				const chanceContainer = document.createElement("div");
				chanceContainer.classList.add("flex", "flex-row");
				actionDetailsContainer.appendChild(chanceContainer);

				const successChance = document.createElement("div");
				successChance.classList.add("font-body", "text-2xs", "mr-3", "font-bold");
				successChance.innerHTML = Locale.compose("LOC_DIPLOMACY_SUCCESS_REVEAL_CHANCE", projectDefinition.SuccessChance, projectDefinition.RevealChance);
				chanceContainer.appendChild(successChance);

				const penalty = Game.Diplomacy.getEspionagePenaltyForReveal(projectData.actionType, GameContext.localPlayerID);
				if (penalty.influence != 0) {
					const penaltyContainer = document.createElement("div");
					penaltyContainer.classList.add("flex", "flex-row");
					actionDetailsContainer.appendChild(penaltyContainer);

					const influencePenalty = document.createElement("div");
					influencePenalty.classList.add("font-body", "mb-1", "text-2xs", "font-bold");
					influencePenalty.innerHTML = Locale.stylize("LOC_DIPLOMACY_ESPIONAGE_PENALTY", penalty.influence, penalty.turns);
					penaltyContainer.appendChild(influencePenalty);
				}

				//  Data from projectDefinitions are at Standard speed so needs to be modified. lastStageDuration is already factoring Game Speed;
				const stage1MaxTurns = Game.Diplomacy.modifyByGameSpeed(projectDefinition.BaseDuration) - projectData.lastStageDuration;
				const stage1MinTurns = stage1MaxTurns - Game.Diplomacy.modifyByGameSpeed(projectDefinition.RandomInitialProgress);

				let additionalDescriptionString = "";
				if (projectData.lastStageDuration > 0) {
					additionalDescriptionString = Locale.compose("LOC_DIPLOMACY_ACTION_ESPIONAGE_TURNS_AND_DURATION", stage1MinTurns, stage1MaxTurns, projectData.lastStageDuration);
				} else {
					additionalDescriptionString = Locale.compose("LOC_DIPLOMACY_ACTION_ESPIONAGE_TURNS", stage1MinTurns, stage1MaxTurns);
				}

				startActionItem.setAttribute("data-tooltip-content", Locale.stylize(projectData.projectDescription + "[N]" + additionalDescriptionString));
			}
		}

		if (projectData.targetList2.length > 0 && !recentlyCompletedData) {
			startActionItem.addEventListener("action-activate", () => { this.clickStartActionItem(projectData) });

			const selectTargetButton = document.createElement("fxs-button");
			selectTargetButton.classList.add("min-w-16", "self-center", "mr-3", "relative");
			selectTargetButton.removeAttribute("tabindex");
			selectTargetButton.setAttribute("caption", Locale.compose("LOC_DIPLOMACY_SELECT_TARGET"));
			selectTargetButton.addEventListener("action-activate", () => { this.clickStartActionItem(projectData) });
			selectTargetButton.setAttribute("data-audio-group-ref", "audio-diplo-project-reaction");
			if (projectData.projectStatus != DiplomacyProjectStatus.PROJECT_AVAILABLE) {
				selectTargetButton.setAttribute("disabled", "true");
			}

			startActionItem.appendChild(selectTargetButton);
		} else {
			const soundTuple = DiplomacyManager.getAudioIdForDiploAction(projectData);
			startActionItem.setAttribute(soundTuple[0], soundTuple[1]);
			if (recentlyCompletedData) {
				startActionItem.addEventListener("action-activate", () => { this.clickQuickStartActionItem(projectData, recentlyCompletedData) });

				const actionOperationArguments: DiplomacyActionOperationArgs = {
					Amount: 1,
					Player1: GameContext.localPlayerID,
					Type: projectData.actionType
				}

				if (recentlyCompletedData.independentTarget != -1) {
					actionOperationArguments.ID = recentlyCompletedData.independentTarget;
				}
				if (recentlyCompletedData.playerTarget != -1) {
					actionOperationArguments.Player2 = recentlyCompletedData.playerTarget;
				}
				if (recentlyCompletedData.playerTarget2 != -1) {
					actionOperationArguments.Player3 = recentlyCompletedData.playerTarget2;
				}
				if (recentlyCompletedData.targetSettlement != -1) {
					actionOperationArguments.City = recentlyCompletedData.targetSettlement;
				}
				if (recentlyCompletedData.targetUnit != -1) {
					actionOperationArguments.Unit = recentlyCompletedData.targetUnit;
				}

				const results: OperationResult = Game.PlayerOperations.canStart(GameContext.localPlayerID, projectData.operationType, actionOperationArguments, false);
				if (!results.Success) {
					startActionItem.classList.add("disabled");
				}
			} else {
				startActionItem.addEventListener("action-activate", () => { this.clickQuickStartActionItem(projectData) });
			}
			const influenceContainer = document.createElement("div");
			influenceContainer.classList.add("flex", "flex-row", "self-center", "panel-diplomacy-actions__influence-container", "pointer-events-none", "pr-3", "relative");

			const influenceIcon = document.createElement("img");
			influenceIcon.classList.add("w-8", "h-8");
			influenceIcon.src = "fs://game/yield_influence";
			influenceContainer.appendChild(influenceIcon);

			const influenceCostText = document.createElement("div");
			influenceCostText.classList.add("font-body", "text-sm", "self-center");
			if (projectData.projectStatus != DiplomacyProjectStatus.PROJECT_AVAILABLE) {
				influenceCostText.classList.add("text-negative");
			}
			influenceCostText.innerHTML = this.getCostFromTargetList(projectData).toString();
			influenceContainer.appendChild(influenceCostText);

			const navHelp = document.createElement("fxs-nav-help");
			navHelp.setAttribute("action-key", "inline-accept");
			influenceContainer.appendChild(navHelp);
			startActionItem.appendChild(influenceContainer);
		}

		return startActionItem;
	}

	private clickStartActionItem(projectData: DiplomaticProjectUIData) {
		DiplomacyManager.clickStartProject(projectData);
	}

	private clickQuickStartActionItem(projectData: DiplomaticProjectUIData, recentlyCompletedData?: RecentDiplomaticActions) {
		const actionOperationArguments: DiplomacyActionOperationArgs = {
			Amount: 1,
			Player1: GameContext.localPlayerID,
			Type: projectData.actionType
		}

		if (recentlyCompletedData) {
			if (recentlyCompletedData.independentTarget != -1) {
				actionOperationArguments.ID = recentlyCompletedData.independentTarget;
			}
			if (recentlyCompletedData.playerTarget != -1) {
				actionOperationArguments.Player2 = recentlyCompletedData.playerTarget;
			}
			if (recentlyCompletedData.playerTarget2 != -1) {
				actionOperationArguments.Player3 = recentlyCompletedData.playerTarget2;
			}
			if (recentlyCompletedData.targetSettlement != -1) {
				actionOperationArguments.City = recentlyCompletedData.targetSettlement;
			}
			if (recentlyCompletedData.targetUnit != -1) {
				actionOperationArguments.Unit = recentlyCompletedData.targetUnit;
			}
		} else if (DiplomacyManager.selectedPlayerID != GameContext.localPlayerID) {
			actionOperationArguments.Player2 = DiplomacyManager.selectedPlayerID;
			actionOperationArguments.ID = DiplomacyManager.selectedPlayerID;
		}

		const results: OperationResult = Game.PlayerOperations.canStart(GameContext.localPlayerID, projectData.operationType, actionOperationArguments, false);
		if (results.Success) {
			Game.PlayerOperations.sendRequest(GameContext.localPlayerID, projectData.operationType, actionOperationArguments);
		}
	}

	protected populateAvailableActions(): void {
		//Stub for override
	}

	protected close() {
		if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_HUB")) {
			DiplomacyManager.selectedActionID = -1;
			if (DiplomacyManager.currentProjectReactionRequest) {
				const closeToDiploHub = false;
				DiplomacyManager.closeCurrentDiplomacyProject(closeToDiploHub);
			}
			DiplomacyManager.lowerDiplomacyHub();
		} else {
			// On the edge cases that the diplomacy hub is closed due to other events, the leader is still removed
			LeaderModelManager.clear();
		}

		if (this.initDataPopulationTimerHandle != 0) {
			clearTimeout(this.initDataPopulationTimerHandle);
			this.initDataPopulationTimerHandle = 0;
		}
	}

	protected showBefriendIndependentDetails() {
		if (Players.get(DiplomacyManager.selectedPlayerID)?.isIndependent) {
			const ourActions: DiplomaticEventHeader[] = Game.Diplomacy.getPlayerEvents(DiplomacyManager.selectedPlayerID).filter((action) => {
				return action.initialPlayer == GameContext.localPlayerID && action.actionType == DiplomacyActionTypes.DIPLOMACY_ACTION_GIVE_INFLUENCE_TOKEN;
			});
			let befriendIndependentActionID = -1;
			if (ourActions.length > 0) {
				befriendIndependentActionID = ourActions[0].uniqueID;
			}

			if (befriendIndependentActionID == -1) {
				const otherActions: DiplomaticEventHeader[] = Game.Diplomacy.getPlayerEvents(DiplomacyManager.selectedPlayerID).filter((action) => {
					return action.actionType == DiplomacyActionTypes.DIPLOMACY_ACTION_GIVE_INFLUENCE_TOKEN;
				});

				if (otherActions.length > 0) {
					befriendIndependentActionID = otherActions[0].uniqueID;
				}
			}

			if (befriendIndependentActionID == -1) {
				return;
			}

			DiplomacyManager.selectedActionID = befriendIndependentActionID;
			ContextManager.push("screen-befriend-independent-details", { singleton: true });
			if (this.checkShouldShowPanel()) {
				waitForLayout(() => { this.realizeInitialFocus(); })
			}
		}
	}
}


class PlayerDiplomacyActionPanel extends DiplomacyActionPanel {
	onAttach(): void {
		super.onAttach();

		const horizontalContainer = MustGetElement("#panel-diplomacy-actions__horizontal-container", this.Root);
		horizontalContainer.classList.add("right-0", "flex-row-reverse");

		const relationshipHeader = MustGetElement("#panel-diplomacy-actions__other-relationships-header", this.Root);
		relationshipHeader.classList.add("hidden");

		const otherRelationsContainer = MustGetElement("#panel-diplomacy-actions__other-relationships-frame", this.Root);
		otherRelationsContainer.classList.add("hidden");

		if (!this.checkShouldShowPanel()) {
			return;
		}
	}

	checkShouldShowPanel(): boolean {
		if (!InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_HUB") || DiplomacyManager.selectedPlayerID != GameContext.localPlayerID) {
			if (!this.Root.classList.contains("hidden")) {
				//Hide if we are in dialog or viewing actions for a different player;
				this.Root.classList.add("hidden");
			}
			return false;
		}

		this.Root.classList.remove("hidden");

		return true;
	}

	protected populateOngoingProjects(): void {
		//Do nothing, Player's ongoing actions are kept in the main actions panel

	}

	protected populateActionsPanel(): void {
		const availableProjectsSlot = MustGetElement("#available-projects-slot", this.Root);
		while (availableProjectsSlot.hasChildNodes()) {
			availableProjectsSlot.removeChild(availableProjectsSlot.lastChild!);
		}

		const wars: DiplomaticEventHeader[] = [];
		const localPlayerDiplomacy = Players.get(GameContext.localPlayerID)?.Diplomacy;
		Players.getAliveIds().forEach(playerID => {
			const otherPlayer = Players.get(playerID);
			if (localPlayerDiplomacy?.hasMet(playerID) && otherPlayer != null && otherPlayer.isMajor) {
				const theirWars: DiplomaticEventHeader[] = Game.Diplomacy.getPlayerEvents(playerID).filter((action) => { return action.actionType == DiplomacyActionTypes.DIPLOMACY_ACTION_DECLARE_WAR });
				theirWars.forEach(war => {
					if (((localPlayerDiplomacy?.hasMet(war.targetPlayer) && localPlayerDiplomacy.hasMet(war.initialPlayer)) || war.targetPlayer == GameContext.localPlayerID || war.initialPlayer == GameContext.localPlayerID) && !wars.find((w) => war.uniqueID == w.uniqueID)) {
						wars.push(war);
					}
				});
			}
		});

		if (wars.length > 0) {
			const header = document.createElement("fxs-header");
			header.classList.add('relative');
			header.setAttribute('title', "LOC_DIPLOMACY_WARS_HEADER");
			header.setAttribute('filigree-style', 'h3');
			availableProjectsSlot.appendChild(header);

			const collapseButton = document.createElement("fxs-minus-plus");
			collapseButton.classList.add("absolute", "top-1", "right-5");
			collapseButton.setAttribute("type", "minus");
			collapseButton.setAttribute("tabindex", "-1");
			header.appendChild(collapseButton);

			this.firstFocusSection = collapseButton;

			const actionsContainer = document.createElement("fxs-vslot");
			actionsContainer.classList.add("overflow-hidden", "h-auto", "w-auto", "transition-all", "duration-100", "scale-y-100", "origin-top");

			wars.forEach(war => {
				const warChooserItem = document.createElement("war-chooser-item");
				warChooserItem.componentCreatedEvent.on((chooser) => {
					chooser.warChooserData = war;
				});
				actionsContainer.appendChild(warChooserItem);
				warChooserItem.addEventListener("action-activate", () => { this.clickOngoingAction(war.uniqueID) });
			});

			collapseButton.addEventListener("action-activate", () => { this.onCollapseActionSection(collapseButton, actionsContainer) });
			availableProjectsSlot.appendChild(actionsContainer);
		}

		const recentlyCompletedActions = Game.Diplomacy.getRecentlyEndedDiplomaticEvents(GameContext.localPlayerID).filter((action) => { return action.actionType != DiplomacyActionTypes.DIPLOMACY_ACTION_FORM_ALLIANCE });

		if (recentlyCompletedActions.length > 0) {
			const header = document.createElement("fxs-header");
			header.classList.add('relative');
			header.setAttribute('title', "LOC_DIPLOMACY_ACTIONS_RECENTLY_ENDED");
			header.setAttribute('filigree-style', 'h3');
			availableProjectsSlot.appendChild(header);

			const collapseButton = document.createElement("fxs-minus-plus");
			collapseButton.classList.add("absolute", "top-1", "right-5");
			collapseButton.setAttribute("type", "minus");
			collapseButton.setAttribute("tabindex", "-1");
			header.appendChild(collapseButton);

			if (this.firstFocusSection == null) {
				this.firstFocusSection = collapseButton;
			}

			const actionsContainer = document.createElement("fxs-vslot");
			actionsContainer.classList.add("overflow-hidden", "h-auto", "w-auto", "transition-all", "duration-100", "scale-y-100", "origin-top");

			recentlyCompletedActions.forEach(project => {
				const projectUIData = Game.Diplomacy.getProjectDataForUI(GameContext.localPlayerID, project.playerTarget, DiplomacyActionTargetTypes.NO_DIPLOMACY_TARGET, DiplomacyActionGroups.NO_DIPLOMACY_ACTION_GROUP, -1, DiplomacyActionTargetTypes.NO_DIPLOMACY_TARGET).find(p => p.actionType == project.actionType);
				if (!projectUIData) {
					if (project.playerTarget != -1 && project.playerTarget2 != -1 && project.independentTarget != -1) {
						console.error("panel-diplomacy-actions: Unable to get DiplomaticProjectUIData for recently completed project of type: " + project.actionType);
					}
					return;
				}
				const newItem = this.createStartActionListItem(projectUIData, project);
				newItem.setAttribute("disabled", "true");
				const targetButton = newItem.querySelector("fxs-button");
				const influenceCost = newItem.querySelector(".panel-diplomacy-actions__influence-container");
				if (targetButton) {
					targetButton.setAttribute("disabled", "true");
				}
				if (influenceCost) {
					influenceCost.classList.add("hidden");
				}

				actionsContainer.appendChild(newItem);
			});

			collapseButton.addEventListener("action-activate", () => { this.onCollapseActionSection(collapseButton, actionsContainer) });
			availableProjectsSlot.appendChild(actionsContainer);
		}

		let ongoingActions: DiplomaticEventHeader[] = Game.Diplomacy.getPlayerEvents(DiplomacyManager.selectedPlayerID);
		ongoingActions = ongoingActions.filter((action) => {
			return (action.initialPlayer == GameContext.localPlayerID || ((action.targetPlayer == GameContext.localPlayerID) && (action.revealed))) && action.actionType != DiplomacyActionTypes.DIPLOMACY_ACTION_DECLARE_WAR && action.actionType != DiplomacyActionTypes.DIPLOMACY_ACTION_FORM_ALLIANCE;
		});

		if (ongoingActions.length > 0) {
			ongoingActions.sort((a, b) => ((Game.Diplomacy.getCompletionData(a.uniqueID) && Game.Diplomacy.getCompletionData(b.uniqueID)) && Game.Diplomacy.getCompletionData(a.uniqueID).turnsToCompletion > Game.Diplomacy.getCompletionData(b.uniqueID).turnsToCompletion) ? 1 : -1);

			const header = document.createElement("fxs-header");
			header.classList.add('relative');
			header.setAttribute('title', "LOC_DIPLOMACY_ACTIONS_ONGOING");
			header.setAttribute('filigree-style', 'h3');
			availableProjectsSlot.appendChild(header);

			const collapseButton = document.createElement("fxs-minus-plus");
			collapseButton.classList.add("absolute", "top-1", "right-5");
			collapseButton.setAttribute("type", "minus");
			collapseButton.setAttribute("tabindex", "-1");
			header.appendChild(collapseButton);

			if (this.firstFocusSection == null) {
				this.firstFocusSection = collapseButton;
			}

			const actionsContainer = document.createElement("fxs-vslot");
			actionsContainer.classList.add("overflow-hidden", "h-auto", "w-auto", "transition-all", "duration-100", "scale-y-100", "origin-top");

			ongoingActions.forEach(action => {
				actionsContainer.appendChild(this.createOngoingActionListItem(action));
			});

			collapseButton.addEventListener("action-activate", () => { this.onCollapseActionSection(collapseButton, actionsContainer) });
			availableProjectsSlot.appendChild(actionsContainer);
		}
	}

	private createOngoingActionListItem(action: DiplomaticEventHeader): HTMLElement {
		const ongoingActionElement = document.createElement("chooser-item");
		ongoingActionElement.classList.add("chooser-item_unlocked", "flex", "flex-row", "justify-start", "items-center", "mb-2");
		ongoingActionElement.setAttribute('tabindex', "-1");
		ongoingActionElement.setAttribute("data-tooltip-content", Locale.compose(action.description));

		ongoingActionElement.setAttribute("data-audio-group-ref", "audio-diplo-project-reaction");
		ongoingActionElement.setAttribute("data-audio-activate-ref", "data-audio-leader-response");

		const iconContainer = document.createElement("div");
		iconContainer.classList.value = "chooser-item__icon flex self-center items-center justify-center pointer-events-none relative";
		ongoingActionElement.appendChild(iconContainer);

		const iconImage = document.createElement("div");
		iconImage.classList.value = "chooser-item__icon-image relative flex flex-col items-center justify-center";
		iconContainer.appendChild(iconImage);

		const projectDefinition: DiplomacyActionDefinition | null = GameInfo.DiplomacyActions.lookup(action.actionType);
		if (projectDefinition && action.actionGroup == DiplomacyActionGroups.DIPLOMACY_ACTION_GROUP_ESPIONAGE && action.actionType != DiplomacyActionTypes.DIPLOMACY_ACTION_COUNTER_SPY) {
			const stage1MaxTurns = Game.Diplomacy.modifyByGameSpeed(projectDefinition.BaseDuration) - Game.Diplomacy.modifyByGameSpeed(action.lastStageDuration);
			const stage1MinTurns = stage1MaxTurns - Game.Diplomacy.modifyByGameSpeed(projectDefinition.RandomInitialProgress);
			ongoingActionElement.setAttribute("data-tooltip-content", Locale.stylize(
				Locale.compose(action.description) +
				"[N]" +
				Locale.stylize("LOC_DIPLOMACY_ACTION_ESPIONAGE_ONGOING", stage1MinTurns, stage1MaxTurns, Game.turn - action.gameTurnStart) +
				"[N]" +
				Locale.compose("LOC_DIPLOMACY_SUCCESS_CHANCE", projectDefinition.SuccessChance) +
				"[N]" +
				Locale.compose("LOC_DIPLOMACY_REVEAL_CHANCE", projectDefinition.RevealChance)));
		}


		//  If we're not dealing with the target player then show them.  Otherwise show the initial player so you see who is the other Leader involved in the action.
		if (action.targetPlayer != DiplomacyManager.selectedPlayerID) {
			const target = Configuration.getPlayer(action.targetPlayer);
			if (target.leaderTypeName) {
				const targetIcon = document.createElement("leader-icon");
				targetIcon.classList.add("mr-2", "w-16", "h-16");
				targetIcon.setAttribute("leader", target.leaderTypeName);
				targetIcon.setAttribute("bg-color", UI.Player.getPrimaryColorValueAsString(action.targetPlayer))
				ongoingActionElement.appendChild(targetIcon);
			}
		}
		else {
			const initial = Configuration.getPlayer(action.initialPlayer);
			if (initial.leaderTypeName) {
				const initialIcon = document.createElement("leader-icon");
				initialIcon.classList.add("mr-2", "w-16", "h-16");
				initialIcon.setAttribute("leader", initial.leaderTypeName);
				initialIcon.setAttribute("bg-color", UI.Player.getPrimaryColorValueAsString(action.initialPlayer))
				ongoingActionElement.appendChild(initialIcon);
			}
		}

		const actionDef = GameInfo.DiplomacyActions.lookup(action.actionType);
		if (!actionDef) {
			console.error("panel-diplomacy-actions: Unable to get definition for diplomacy action with type: " + action.actionTypeName);
			iconImage.style.backgroundImage = `url("fs://game/yield_influence")`;
		} else {
			iconImage.style.backgroundImage = `url("${actionDef.UIIconPath}")`;
		}

		const actionName = document.createElement("div");
		actionName.classList.value = "font-title text-sm mb-1 pointer-events-none font-fit-shrink flex-auto relative";
		if (action.actionTypeName == "DIPLOMACY_ACTION_GIVE_INFLUENCE_TOKEN") {
			actionName.innerHTML = Locale.compose("LOC_DIPLOMACY_ACTION_GIVE_INFLUENCE_TOKEN_START_ACTION_NAME");
		} else {
			actionName.innerHTML = Locale.compose(action.name);
		}
		ongoingActionElement.appendChild(actionName);

		const turnContainer = document.createElement("div");
		turnContainer.classList.value = "panel-diplomacy-actions__ongoing-action-turn-container relative flex items-center pr-2";
		ongoingActionElement.appendChild(turnContainer);

		const turnTimer = document.createElement("div");
		turnTimer.classList.add("panel-diplomacy-actions__ongoing-action-turn-timer");
		turnContainer.appendChild(turnTimer);

		const turnCount = document.createElement("div");
		turnCount.classList.value = "text-sm font-body pr-1";

		const actionData: DiplomaticProjectUIData | undefined = Game.Diplomacy.getProjectDataForUI(action.initialPlayer, -1, DiplomacyActionTargetTypes.NO_DIPLOMACY_TARGET, DiplomacyActionGroups.NO_DIPLOMACY_ACTION_GROUP, -1, DiplomacyActionTargetTypes.NO_DIPLOMACY_TARGET).find(project => project.actionID == action.uniqueID);
		if (actionData && actionData.actionGroup == DiplomacyActionGroups.DIPLOMACY_ACTION_GROUP_ESPIONAGE && action.actionType != DiplomacyActionTypes.DIPLOMACY_ACTION_COUNTER_SPY) {
			const stage1MaxTurns = action.completionScore - action.lastStageDuration;
			turnCount.innerHTML = (Game.turn - action.gameTurnStart).toString() + "/" + stage1MaxTurns.toString();
		} else {
			turnCount.innerHTML = Game.Diplomacy.getCompletionData(action.uniqueID).turnsToCompletion.toString();
		}
		turnContainer.appendChild(turnCount);

		if (action.targetPlayer == DiplomacyManager.selectedPlayerID) {
			ongoingActionElement.addEventListener("action-activate", () => {
				window.dispatchEvent(new RaiseDiplomacyEvent(action.initialPlayer));
				window.dispatchEvent(new UpdateDiploRibbonEvent());
			});
		}
		else {
			ongoingActionElement.addEventListener("action-activate", () => {
				window.dispatchEvent(new RaiseDiplomacyEvent(action.targetPlayer));
				window.dispatchEvent(new UpdateDiploRibbonEvent());
			});
		}

		return ongoingActionElement;
	}

	protected populateAvailableActions(): void {
		while (this.majorActionsSlot?.hasChildNodes()) {
			this.majorActionsSlot?.removeChild(this.majorActionsSlot?.lastChild!);
		}

		const attributesButton = document.createElement("fxs-hero-button");
		attributesButton.setAttribute("caption", Locale.stylize("LOC_DIPLOMACY_ATTRIBUTES_BUTTON_NAME"));
		attributesButton.classList.add("panel-diplomacy-actions__attribute-button", "mt-2");
		attributesButton.setAttribute("data-audio-group-ref", "audio-diplo-project-reaction");

		const localPlayerIdentity = Players.get(GameContext.localPlayerID)?.Identity;
		if (!localPlayerIdentity) {
			console.error("panel-diplomacy-actions: No valid PlayerIdentity for local player");
			return;
		}

		let numAvailableAttributes = 0;
		for (let attributeDef of GameInfo.Attributes) {
			numAvailableAttributes += localPlayerIdentity.getAvailableAttributePoints(attributeDef.AttributeType);
		}
		if (numAvailableAttributes > 0) {
			waitForLayout(() => {
				const attributePointsElement = document.createElement("div");
				attributePointsElement.classList.value = "panel-diplomacy-actions__attribute-button-icon -top-4 -right-3 bottom-3 h-10 absolute flex items-center justify-center";
				attributesButton.appendChild(attributePointsElement);

				const attributePointsText = document.createElement("div");
				attributePointsText.classList.value = "font-body text-sm mt-2 px-4"
				attributePointsText.innerHTML = numAvailableAttributes.toString();
				attributePointsElement.appendChild(attributePointsText);
			})
		}

		this.majorActionsSlot?.appendChild(attributesButton);

		attributesButton.addEventListener("action-activate", () => { ContextManager.push("screen-attribute-trees", { createMouseGuard: true, singleton: true }) });
	}

	protected populateRelationshipInfo(): void {
		const localPlayerDiplomacy = Players.get(GameContext.localPlayerID)?.Diplomacy;
		if (!localPlayerDiplomacy) {
			console.error("panel-diplomacy-actions: Attempting to populate citystate/independent relationships, but no player diplomacy object for local player.");
			return;
		}
		const relationshipContainer = MustGetElement("#panel-diplomacy-actions__relationship-event-container", this.Root);
		while (relationshipContainer.hasChildNodes()) {
			relationshipContainer.removeChild(relationshipContainer.lastChild!);
		}

		const relationshipHeader = document.createElement("div");
		relationshipHeader.classList.add("flex", "flex-col", "justify-center", "items-center");

		const relationshipTitle = document.createElement("fxs-header");
		relationshipTitle.classList.add("text-secondary", "uppercase", "mb-2", "font-title", "text-base");
		relationshipTitle.setAttribute("title", "LOC_DIPLOMACY_ACTIONS_RELATIONSHIPS_HEADER");
		relationshipTitle.setAttribute("filigree-style", "h4");
		relationshipHeader.appendChild(relationshipTitle);

		const relationshipName = document.createElement("div");
		relationshipName.classList.add("font-title", "text-base");
		relationshipName.innerHTML = Locale.stylize("LOC_DIPLOMACY_ACTIONS_INDEPENDENTS_AND_CITY_STATES");
		relationshipHeader.appendChild(relationshipName);

		const metCityStates: PlayerLibrary[] = [];
		const metIndependents: PlayerLibrary[] = [];

		Players.getAlive().forEach(player => {
			if (player.isIndependent && localPlayerDiplomacy.hasMet(player.id)) {
				if (!Players.get(player.id)?.Diplomacy?.hasBeenDispersed()) {
					metIndependents.push(player);
				}
			} else if (player.isMinor && localPlayerDiplomacy.hasMet(player.id)) {
				metCityStates.push(player);
			}
		});

		if (metCityStates.length > 0) {
			const header = document.createElement("fxs-header");
			header.classList.add('relative');
			header.setAttribute('title', "LOC_UI_CITYSTATE_BONUS_CHOOSER_SUBTITLE");
			header.setAttribute('filigree-style', 'h3');
			relationshipContainer.appendChild(header);

			const collapseButton = document.createElement("fxs-minus-plus");
			collapseButton.classList.add("absolute", "top-1", "right-5");
			collapseButton.setAttribute("type", "minus");
			collapseButton.setAttribute("tabindex", "-1");
			header.appendChild(collapseButton);

			if (this.firstFocusSection == null) {
				this.firstFocusSection = collapseButton;
			}

			const itemContainer = document.createElement("fxs-vslot");
			itemContainer.classList.add("overflow-hidden", "transition-all", "duration-100", "scale-y-100", "origin-top");

			metCityStates.forEach(player => {
				itemContainer.appendChild(this.createMinorPlayerListItem(player));
			});

			collapseButton.addEventListener("action-activate", () => { this.onCollapseActionSection(collapseButton, itemContainer) })
			relationshipContainer.appendChild(itemContainer);
		}

		if (metIndependents.length > 0) {
			const header = document.createElement("fxs-header");
			header.classList.add('relative');
			header.setAttribute('title', "LOC_DIPLOMACY_ACTIONS_INDEPENDENTS_HEADER");
			header.setAttribute('filigree-style', 'h3');
			relationshipContainer.appendChild(header);

			const collapseButton = document.createElement("fxs-minus-plus");
			collapseButton.classList.add("absolute", "top-1", "right-5");
			collapseButton.setAttribute("type", "minus");
			collapseButton.setAttribute("tabindex", "-1");
			header.appendChild(collapseButton);

			if (this.firstFocusSection == null) {
				this.firstFocusSection = collapseButton;
			}

			const itemContainer = document.createElement("fxs-vslot");
			itemContainer.classList.add("overflow-hidden", "transition-all", "duration-100", "scale-y-100", "origin-top");

			metIndependents.forEach(player => {
				itemContainer.appendChild(this.createMinorPlayerListItem(player));
			});

			collapseButton.addEventListener("action-activate", () => { this.onCollapseActionSection(collapseButton, itemContainer) })
			relationshipContainer.appendChild(itemContainer);
		}
	}

	private createMinorPlayerListItem(player: PlayerLibrary): HTMLElement {
		const playerListItem = document.createElement("chooser-item");

		playerListItem.classList.add("chooser-item_unlocked", "py-2", "flex", "grow", "flex-row", "justify-start", "items-center", "mb-2", "w-136");
		playerListItem.setAttribute('tabindex', "-1");

		playerListItem.setAttribute("data-audio-group-ref", "audio-diplo-project-reaction");
		playerListItem.setAttribute("data-audio-activate-ref", "data-audio-leader-response");

		const iconContainer = document.createElement("div");
		iconContainer.classList.value = "chooser-item__icon flex self-center items-center justify-center pointer-events-none relative";
		playerListItem.appendChild(iconContainer);

		const iconImage = document.createElement("div");
		iconImage.classList.value = "chooser-item__icon-image relative flex flex-col items-center justify-center";
		iconContainer.appendChild(iconImage);

		iconImage.style.backgroundImage = `url("fs://game/leader_portrait_independent")`;

		if (player.Influence && player.Influence.getSuzerain() != -1) {
			const suzerain = Configuration.getPlayer(player.Influence.getSuzerain());
			if (suzerain.leaderTypeName) {
				const localPlayerDiplomacy = Players.get(GameContext.localPlayerID)?.Diplomacy;
				if (!localPlayerDiplomacy) {
					console.error("panel-diplomacy-actions: Attempting to create a suzerain icon, but no Diplomacy library for local player!");
					return playerListItem;
				}
				const suzerainIcon = document.createElement("leader-icon");
				suzerainIcon.classList.add("mr-2", "mt-1", "w-16", "h-16");
				if (localPlayerDiplomacy.hasMet(suzerain.id) || GameContext.localPlayerID == suzerain.id) {
					suzerainIcon.setAttribute("leader", suzerain.leaderTypeName);
					suzerainIcon.setAttribute("bg-color", UI.Player.getPrimaryColorValueAsString(player.Influence.getSuzerain()));
				}
				else {
					suzerainIcon.setAttribute("leader", "LEADER_UNMET");
				}
				playerListItem.appendChild(suzerainIcon);
			}
		}

		const independentName = document.createElement("div");
		independentName.classList.add("font-title", "text-sm", "mb-1", "pointer-events-none", "font-fit-shrink", "relative");
		independentName.innerHTML = Locale.stylize(player.civilizationFullName);
		playerListItem.appendChild(independentName);

		playerListItem.addEventListener("action-activate", () => {
			window.dispatchEvent(new RaiseDiplomacyEvent(player.id));
			window.dispatchEvent(new UpdateDiploRibbonEvent());
		});

		return playerListItem;
	}

	protected showLeaderModel(): void {
		LeaderModelManager.showLeftLeaderModel(DiplomacyManager.selectedPlayerID);
	}
}

class OtherPlayerDiplomacyActionPanel extends DiplomacyActionPanel {
	private diplomacyWarPeaceListener = (data: DiplomacyStatement_EventData) => { this.onDiplomacyWarPeace(data) };
	private relationshipChangedListener: (eventData: DiplomacyRelationshipChanged_EventData) => void = (eventData: DiplomacyRelationshipChanged_EventData) => { this.onRelationShipChanged(eventData) };

	onAttach() {
		super.onAttach();

		engine.on('DiplomacyDeclareWar', this.diplomacyWarPeaceListener);
		engine.on('DiplomacyMakePeace', this.diplomacyWarPeaceListener);
		engine.on('DiplomacyRelationshipChanged', this.relationshipChangedListener);
		engine.on('PlayerTurnActivated', this.onPlayerTurnBegin, this);
		engine.on('LocalPlayerTurnEnd', this.onLocalPlayerTurnEnd, this);

		if (!this.checkShouldShowPanel()) {
			return;
		}

		if (Players.get(DiplomacyManager.selectedPlayerID)?.isIndependent) {
			this.showBefriendIndependentDetails();
		}

	}

	onDetach(): void {
		engine.off('DiplomacyDeclareWar', this.diplomacyWarPeaceListener);
		engine.off('DiplomacyMakePeace', this.diplomacyWarPeaceListener);
		engine.off('DiplomacyRelationshipChanged', this.relationshipChangedListener);
		engine.off('PlayerTurnActivated', this.onPlayerTurnBegin, this);
		engine.off('LocalPlayerTurnEnd', this.onLocalPlayerTurnEnd, this);

		super.onDetach();
	}

	checkShouldShowPanel(): boolean {
		if ((!InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_HUB") && !DiplomacyManager.isFirstMeetDiplomacyOpen) || DiplomacyManager.selectedPlayerID == GameContext.localPlayerID) {
			if (!this.Root.classList.contains("hidden")) {
				//Hide if we are in dialog or viewing actions for a different player
				this.Root.classList.add("hidden");
				ContextManager.pop("screen-befriend-independent-details");
			}
			return false;
		}

		this.Root.classList.remove("hidden");
		return true;
	}

	protected onSelectedPlayerChanged(): void {
		super.onSelectedPlayerChanged();
		if (this.checkShouldShowPanel()) {
			this.realizeInitialFocus();
			this.showLeaderModel();
			this.showBefriendIndependentDetails();

			if (Players.get(DiplomacyManager.selectedPlayerID)?.isIndependent) {
				this.majorActionsSlot?.classList.add("hidden");
				this.showBefriendIndependentDetails();
			}
		}
	}

	protected showLeaderModel(): void {
		const playerEntry: PlayerLibrary | null = Players.get(DiplomacyManager.selectedPlayerID);
		if (playerEntry == null) {
			console.error("Player is not valid, not displaying a 3d model")
			return;
		}

		if (playerEntry.isMinor || playerEntry.isIndependent || playerEntry.isBarbarian) {
			LeaderModelManager.showRightIndLeaderModel(DiplomacyManager.selectedPlayerID);
		} else {
			LeaderModelManager.showRightLeaderModel(DiplomacyManager.selectedPlayerID);
		}
	}

	protected populateAvailableActions() {
		while (this.majorActionsSlot?.hasChildNodes()) {
			this.majorActionsSlot?.removeChild(this.majorActionsSlot?.lastChild!);
		}
		DiplomacyManager.populateDiplomacyActions();
		DiplomacyManager.diplomacyActions.forEach((action, index) => {
			const diplomacyActionButton = document.createElement('fxs-button');
			diplomacyActionButton.setAttribute('caption', action.actionString);
			diplomacyActionButton.setAttribute('tabindex', index.toString());
			diplomacyActionButton.setAttribute("data-audio-group-ref", "audio-diplo-project-reaction");
			if (action.audioString) {
				diplomacyActionButton.setAttribute("data-audio-activate-ref", action.audioString);
			}
			diplomacyActionButton.classList.add("h-9", "mt-2", "mr-4", "w-70");

			const allyPlayer = Players.get(DiplomacyManager.selectedPlayerID);
			if (!allyPlayer) {
				console.error("panel-diplomacy-actions: Failed to get ally player library");
				return;
			}


			if (!action.available) {
				// Allow controller to select it and show the tooltip the reason why they cannot make peace
				diplomacyActionButton.setAttribute("disabled-focusable", "true");
				diplomacyActionButton.setAttribute("data-tooltip-content", action.disabledTooltip);
			} else {
				diplomacyActionButton.addEventListener('action-activate', () => {
					action.Callback();
				});

				let enemyString = "";
				if (action.actionString === Locale.compose("LOC_DIPLOMACY_ACTION_FORM_ALLIANCE_NAME")) {
					Players.getAliveMajorIds().forEach(playerId => {
						if (allyPlayer.Diplomacy && allyPlayer.Diplomacy.isAtWarWith(playerId)) {
							//The player we want to check is at war with this playerId
							const newEnemy = Players.get(playerId);
							if (newEnemy) {
								enemyString = (enemyString.length > 0 ? enemyString + ", " : enemyString) + Locale.compose(newEnemy.name);
							}
						}
					});
					if (enemyString !== "") {
						diplomacyActionButton.setAttribute("data-tooltip-content", Locale.compose("LOC_DIPLOMACY_FORM_ALLIANCE_TOOL_TIP", enemyString));
					}
				}
			}

			this.majorActionsSlot?.appendChild(diplomacyActionButton);
		});
	}

	private onDiplomacyWarPeace(data: DiplomacyStatement_EventData) {
		if ((data.actingPlayer == DiplomacyManager.selectedPlayerID || data.reactingPlayer == DiplomacyManager.selectedPlayerID) && this.checkShouldShowPanel() && this.initialLoadComplete) {
			this.populateAvailableActions();
			this.populateActionsPanel();
			this.populateOngoingProjects();
			this.populatePlayerCivInfo();
			this.populateGovernmentInfo();
			this.populateRelationshipInfo();
			this.realizeInitialFocus();
		}
	}

	private onRelationShipChanged(eventData: DiplomacyRelationshipChanged_EventData) {
		if ((eventData.player1 == GameContext.localPlayerID || eventData.player2 == GameContext.localPlayerID) && this.initialLoadComplete) {
			this.populateAvailableActions();
			this.populateRelationshipInfo();
		}
	}

	protected onSupportChanged(data: DiplomacyEventSupportChanged_EventData) {

		// Data needed for check
		const actionData: DiplomaticEventHeader = Game.Diplomacy.getDiplomaticEventData(data.actionID);
		const isIndependent: boolean = Players.get(DiplomacyManager.selectedPlayerID)?.isIndependent ?? false;
		const isInvolved: boolean = (
			(actionData.initialPlayer == DiplomacyManager.selectedPlayerID) ||
			(actionData.targetPlayer == DiplomacyManager.selectedPlayerID) ||
			actionData.actionType == DiplomacyActionTypes.DIPLOMACY_ACTION_DECLARE_WAR ||
			(actionData.actionTypeName == "DIPLOMACY_ACTION_GIVE_INFLUENCE_TOKEN" && isIndependent)
		);

		// Only update items if the above criteria is met, otherwise the super may want to perform an update based on it's criteria.
		if (this.initialLoadComplete && this.checkShouldShowPanel() && isInvolved) {
			DiplomacyManager.queryAvailableProjectData(DiplomacyManager.selectedPlayerID);
			this.populateAvailableActions();
			this.populateActionsPanel();
			this.populateOngoingProjects();
			this.populatePlayerCivInfo();
			this.populateGovernmentInfo();
			this.populateRelationshipInfo();
			this.realizeInitialFocus();
		} else {
			super.onSupportChanged(data);
		}
	}

	private onPlayerTurnBegin(data: PlayerTurnActivated_EventData) {
		if (data.player == GameContext.localPlayerID && this.checkShouldShowPanel()) {
			DiplomacyManager.populateDiplomacyActions();
			this.populateActionsPanel();
		}
	}

	private onLocalPlayerTurnEnd() {
		if (this.checkShouldShowPanel()) {
			DiplomacyManager.populateDiplomacyActions();
			this.populateActionsPanel();
		}
	}
}

Controls.define('panel-player-diplomacy-actions', {
	createInstance: PlayerDiplomacyActionPanel,
	description: 'Area for ongoing and completed diplomacy actions for the player',
	styles: ['fs://game/base-standard/ui/diplomacy-actions/panel-diplomacy-actions.css'],
	images: ['fs://game/dip_panel_bg', 'fs://game/dip_panel_tint_this.png'],
	classNames: ['panel-diplomacy-actions', 'player-panel']
});

Controls.define('panel-other-player-diplomacy-actions', {
	createInstance: OtherPlayerDiplomacyActionPanel,
	description: 'Area for ongoing and completed diplomacy actions for other players',
	styles: ['fs://game/base-standard/ui/diplomacy-actions/panel-diplomacy-actions.css'],
	images: ['fs://game/dip_panel_bg', 'fs://game/dip_panel_tint_this.png'],
	classNames: ['panel-diplomacy-actions', 'other-player-panel']
})
