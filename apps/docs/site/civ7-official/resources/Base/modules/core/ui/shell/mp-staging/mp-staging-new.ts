/**
 * @file mp-staging-new.ts		
 * @copyright 2023, Firaxis Games
 * @description Multiplayer lobby screen.  
 */

import { DropdownSelectionChangeEvent, DropdownSelectionChangeEventName } from '/core/ui/components/fxs-dropdown.js';
import ContextManager, { ContextManagerEvents } from '/core/ui/context-manager/context-manager.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { InputEngineEvent, NavigateInputEvent } from '/core/ui/input/input-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel, { AnchorType } from '/core/ui/panel-support.js';
import MultiplayerShellManager from '/core/ui/shell/mp-shell-logic/mp-shell-logic.js';
import MPLobbyModel, { LobbyUpdateEventName } from '/core/ui/shell/mp-staging/model-mp-staging-new.js';
import { StartCampaignEvent, SendCampaignSetupTelemetryEvent } from '/core/ui/events/shell-events.js';
import Databind from '/core/ui/utilities/utilities-core-databinding.js';
import { MustGetElement, MustGetElements } from '/core/ui/utilities/utilities-dom.js';
import { ProfileAccountLoggedOutEvent, ProfileAccountLoggedOutEventName } from '/core/ui/profile-header/profile-header.js';
import ActionHandler, { ActiveDeviceTypeChangedEvent, ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';
import { FxsScrollable } from '/core/ui/components/fxs-scrollable.js';
import { ActionActivateEvent, ActionActivateEventName } from '/core/ui/components/fxs-activatable.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';
import { FlipbookDefinition, FlipbookFrame } from '/core/ui/components/fxs-flipbook.js';
import { Layout } from '/core/ui/utilities/utilities-layout.js';

enum FocusState {
	PLAYER_SLOT = "PLAYER_SLOT",
	CHAT = "CHAT",
	CHAT_DIALOG = "CHAT_DIALOG",
}

class PanelMPLobby extends Panel {
	private frame!: HTMLElement;
	private readyButton!: HTMLElement;
	private readyButtonContainer!: HTMLElement;
	private readyDescriptionContainer!: HTMLElement;
	private readyButtonLoadingContainer!: HTMLElement;
	private toggleChatButton!: HTMLElement;
	private backButton!: HTMLElement;
	private chatNavHelp?: HTMLElement;
	private chat?: HTMLElement;
	private chatFrame!: HTMLElement;
	private showJoinCodeButtonTop!: HTMLElement;
	private showJoinCodeButtonBot!: HTMLElement;
	private viewAllRulesButtonTop!: HTMLElement;
	private viewAllRulesButtonBot!: HTMLElement;
	private viewAllRulesButtonFarBot!: HTMLElement;
	private leftSectionTop!: HTMLElement;
	private botSection!: HTMLElement;
	private botSection2!: HTMLElement;
	private leftSectionHeader!: HTMLElement;
	private leftSectionContent!: HTMLElement;
	private playerInfoSlot!: HTMLElement;
	private headerSpacings!: NodeListOf<HTMLElement>;
	private profileHeader?: HTMLElement;
	private profileHeaderContainer!: HTMLElement;
	private kickHeader: HTMLElement = MustGetElement(".mp-staging__kick-header", this.Root);

	private joinCodeShown: boolean = false;
	private focusState: FocusState = FocusState.PLAYER_SLOT;

	constructor(root: ComponentRoot) {
		super(root);
		this.animateInType = this.animateOutType = AnchorType.RelativeToRight;
	}

	private mementosButtonActivateListener = this.onMementosButtonActivate.bind(this);
	private resizeListener = this.onResize.bind(this);
	private toggleChatActivateListener = this.onToggleChatActivate.bind(this);
	private lobbyUpdateListener = this.onLobbyUpdate.bind(this);
	private chatFocusListener = this.onChatFocus.bind(this);
	private chatEngineInputListener = this.onChatEngineInput.bind(this);
	private profileAccountLoggedOutListener = this.onProfileAccountLoggedOut.bind(this);
	private activeDeviceTypeChangeListener = this.onActiveDeviceTypeChange.bind(this);
	private readyIndicatorActivateListener = this.onReadyIndicatorActivate.bind(this);

	onAttach() {
		this.enableOpenSound = true;
		this.enableCloseSound = true;
		this.Root.setAttribute("data-audio-group-ref", "multiplayer-lobby");

		super.onAttach();

		window.addEventListener('resize', this.resizeListener);
		window.addEventListener(LobbyUpdateEventName, this.lobbyUpdateListener);
		window.addEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeChangeListener);
		engine.on(ContextManagerEvents.OnChanged, this.onContextChange, this);

		this.frame = MustGetElement(".mp-staging__frame", this.Root);

		this.showJoinCodeButtonTop = MustGetElement(".show-join-code-button-top", this.Root);
		this.showJoinCodeButtonTop.setAttribute("data-audio-group-ref", "multiplayer-lobby");
		this.showJoinCodeButtonTop.setAttribute("data-audio-activate-ref", "data-audio-show-code-activate");

		this.showJoinCodeButtonBot = MustGetElement(".show-join-code-button-bot", this.Root);
		this.showJoinCodeButtonBot.setAttribute("data-audio-group-ref", "multiplayer-lobby");
		this.showJoinCodeButtonBot.setAttribute("data-audio-activate-ref", "data-audio-show-code-activate");

		this.leftSectionTop = MustGetElement(".mp-staging__left-section-top", this.Root);
		this.botSection = MustGetElement(".mp-staging__bot-section", this.Root);
		this.botSection2 = MustGetElement(".mp-staging__bot-section2", this.Root);
		this.leftSectionHeader = MustGetElement(".mp-staging__left-section-header", this.Root);
		this.leftSectionContent = MustGetElement(".mp-staging__left-section-content", this.Root);
		this.toggleChatButton = MustGetElement(".mp-staging__toggle-chat", this.Root);
		this.chatFrame = MustGetElement(".mp-staging__chat-frame", this.Root);

		if (Network.hasCommunicationsPrivilege(false)) {
			this.chat = document.createElement("screen-mp-chat");
			this.chat.classList.add("flex-auto");
			this.chatNavHelp = document.createElement("fxs-nav-help");
			this.chatNavHelp.classList.add("mp-staging__chat-navhelp absolute -top-1 -right-4");
			this.chatFrame.appendChild(this.chat);
			this.chatFrame.appendChild(this.chatNavHelp);

			this.chat.addEventListener("focus", this.chatFocusListener);
			this.chat.addEventListener("engine-input", this.chatEngineInputListener);
		}
		else {
			this.toggleChatButton.classList.add("hidden");
			this.chatFrame.classList.add("hidden");
		}

		this.headerSpacings = MustGetElements(".mp-staging__header-spacing", this.Root);
		this.profileHeaderContainer = MustGetElement(".mp-staging__profile-header-container", this.Root);
		if (Network.supportsSSO() || Online.Metaprogression.supportsMemento()) {
			this.profileHeader = document.createElement("profile-header");
			this.profileHeader.setAttribute("hide-giftbox", "true");
			this.profileHeader.setAttribute("hide-social", Network.supportsSSO() ? "false" : "true");
			this.profileHeader.classList.add("mp-staging__profile-header", "flow-row", "flex-auto", "trigger-nav-help");
			this.profileHeader.setAttribute("profile-for", "screen-mp-lobby");
			this.profileHeader.addEventListener(ProfileAccountLoggedOutEventName, this.profileAccountLoggedOutListener);

			this.profileHeaderContainer.appendChild(this.profileHeader);
		}
		this.playerInfoSlot = MustGetElement(".player-info-slot", this.Root);
		this.playerInfoSlot.addEventListener("engine-input", this.onPlayerInfoEngineInput.bind(this));
		this.playerInfoSlot.addEventListener("navigate-input", this.onPlayerInfoNavigateInput.bind(this));
		this.playerInfoSlot.addEventListener('focus', this.onPlayerInfoFocus);
		this.backButton = MustGetElement(".back-button", this.Root);
		Databind.if(this.backButton, `!{{g_NavTray.isTrayRequired}}`);
		const mementosButton: HTMLElement = MustGetElement(".memento-button", this.Root);
		if (UI.getViewExperience() == UIViewExperience.Mobile) {
			mementosButton.setAttribute("caption", "LOC_LEADER_MEMENTOS_TITLE");
		}
		this.viewAllRulesButtonTop = MustGetElement(".rules-top", this.Root);
		this.viewAllRulesButtonBot = MustGetElement(".rules-bot", this.Root);
		this.viewAllRulesButtonFarBot = MustGetElement(".rules-bot2", this.Root);
		this.readyButton = MustGetElement(".ready-button", this.Root);
		this.readyButtonContainer = MustGetElement(".mp-staging__ready-button-container", this.Root);
		this.readyDescriptionContainer = MustGetElement(".mp-staging__ready-description-container", this.Root);

		this.updateHeaderSpacing();
		this.updateLeftSection();
		this.updateReadyButtonContainer();
		this.updateReadyDescriptionContainer();
		this.updateBotSection();
		this.updateBotSection2();
		this.updateShowJoinCodeButton();
		this.updateViewAllRulesFarBot();
		this.updateViewRuleButton();
		this.updateFrame();

		// --- Top container ---

		this.showJoinCodeButtonTop.addEventListener('action-activate', this.onShowJoinCode.bind(this));
		this.showJoinCodeButtonBot.addEventListener('action-activate', this.onShowJoinCode.bind(this));
		this.refreshShowJoinCodeCaption();

		this.toggleChatButton.addEventListener("action-activate", this.toggleChatActivateListener);
		Databind.if(this.toggleChatButton, `!{{g_NavTray.isTrayRequired}}`);

		// ----- Player status
		const playerInfoScrollable: ComponentRoot<FxsScrollable> = document.createElement("fxs-scrollable");
		playerInfoScrollable.classList.add("mp-staging__player-info-scrollable", "flex-auto", "-ml-2");
		playerInfoScrollable.setAttribute("handle-gamepad-pan", "true");
		waitForLayout(() => playerInfoScrollable.component.setEngineInputProxy(this.playerInfoSlot));

		const playerInfoContainer: HTMLElement = document.createElement("div");
		playerInfoContainer.classList.add("flow-column", "-mb-1", "ml-2");

		const playerInfo: HTMLElement = document.createElement("div");
		playerInfo.classList.add("mp-staging__slot-row", "flow-row", "w-full", "mb-3");
		Databind.for(playerInfo, "g_MPLobbyModel.playersData", "rowIndex, player");
		{
			const playerInfoFrame = document.createElement("fxs-inner-frame");
			playerInfoFrame.classList.add("items-stretch", "flow-row", "flex-auto", "ml-4");
			const closeRow = document.createElement("div");
			Databind.attribute(closeRow, "index", "rowIndex");
			closeRow.classList.add("mp-staging__focusable-row", "items-center", "w-full", "flow-row");
			const playerRow = document.createElement("div");
			playerRow.classList.add("mp-staging__focusable-row", "player-info", "items-center", "w-full", "flow-row");
			Databind.attribute(playerRow, "index", "rowIndex");

			{
				const closeHeaderDropdownAndDivider: HTMLElement = document.createElement('div');
				closeHeaderDropdownAndDivider.classList.add("dropdown-and-divider", "flex-3", "flow-row", "items-stretch", "-my-px");

				const closedHeaderDropdown: HTMLElement = document.createElement('lobby-playerinfocard-dropdown');
				closedHeaderDropdown.setAttribute('data-tooltip-anchor', 'left');
				closedHeaderDropdown.classList.add("mp-staging__focusable-slot", "my-0\\.5", "flex");
				closedHeaderDropdown.setAttribute("container-class", "border-accent-5 border");
				closedHeaderDropdown.setAttribute("bg-class", "bg-primary-5 opacity-50");

				Databind.attribute(closedHeaderDropdown, 'optionID', "player.playerInfoDropdown.id");
				Databind.attribute(closedHeaderDropdown, 'dropdown-items', "player.playerInfoDropdown.serializedItemList");
				Databind.attribute(closedHeaderDropdown, 'selected-item-index', "player.playerInfoDropdown.selectedItemIndex");
				Databind.attribute(closedHeaderDropdown, 'items-tooltips', "player.playerInfoDropdown.serializedItemTooltips");
				Databind.attribute(closedHeaderDropdown, 'disabled', "player.playerInfoDropdown.isDisabled");
				Databind.attribute(closedHeaderDropdown, 'data-player-id', "player.playerID");
				Databind.attribute(closedHeaderDropdown, 'data-dropdown-type', "player.playerInfoDropdown.dropdownType");
				Databind.attribute(closedHeaderDropdown, 'data-player-param', "player.playerInfoDropdown.playerParamName");
				closedHeaderDropdown.addEventListener(DropdownSelectionChangeEventName, this.onSlotDropdownSelectionChange.bind(this));

				closeHeaderDropdownAndDivider.appendChild(closedHeaderDropdown);
				closeRow.appendChild(closeHeaderDropdownAndDivider);
			}

			const closeTeamParamSpace = document.createElement("div");
			closeTeamParamSpace.classList.add("flex-1");
			closeRow.appendChild(closeTeamParamSpace);
			const closeCivParamSpace = document.createElement("div");
			closeCivParamSpace.classList.add("flex-1");
			closeRow.appendChild(closeCivParamSpace);
			const closeLeaderParamSpace = document.createElement("div");
			closeLeaderParamSpace.classList.add("flex-2");
			closeRow.appendChild(closeLeaderParamSpace);
			const closeReadySpace = document.createElement("div");
			closeReadySpace.classList.add("mp-staging__ready-slot");
			closeRow.appendChild(closeReadySpace);
			const closeKickSpace = document.createElement("div");
			closeKickSpace.classList.add("mp-staging__kick-slot");
			Databind.classToggle(closeKickSpace, "hidden", "{{g_MPLobbyModel.isKickOptionHidden}}");
			closeRow.appendChild(closeKickSpace);

			{
				const playerInfoDropdownAndDivider: HTMLElement = document.createElement('div');
				playerInfoDropdownAndDivider.classList.add("dropdown-and-divider", "flex-3", "flow-row", "items-stretch", "-my-px", "relative", "-ml-4");

				const playerInfoDropdown: HTMLElement = document.createElement('lobby-playerinfocard-dropdown');
				playerInfoDropdown.setAttribute('data-tooltip-anchor', 'left');
				playerInfoDropdown.setAttribute('has-background', 'false');
				playerInfoDropdown.classList.add("mp-staging__focusable-slot", "my-0\\.5", "flex");
				playerInfoDropdown.setAttribute("container-class", "border-accent-5 border");

				Databind.attribute(playerInfoDropdown, 'optionID', "player.playerInfoDropdown.id");
				Databind.attribute(playerInfoDropdown, 'dropdown-items', "player.playerInfoDropdown.serializedItemList");
				Databind.attribute(playerInfoDropdown, 'selected-item-index', "player.playerInfoDropdown.selectedItemIndex");
				Databind.attribute(playerInfoDropdown, 'items-tooltips', "player.playerInfoDropdown.serializedItemTooltips");
				Databind.attribute(playerInfoDropdown, 'disabled', "player.playerInfoDropdown.isDisabled");
				Databind.attribute(playerInfoDropdown, 'data-player-id', "player.playerID");
				Databind.attribute(playerInfoDropdown, 'data-dropdown-type', "player.playerInfoDropdown.dropdownType");
				Databind.attribute(playerInfoDropdown, 'data-player-param', "player.playerInfoDropdown.playerParamName");
				Databind.attribute(playerInfoDropdown, 'is-local', "player.isLocal");
				Databind.attribute(playerInfoDropdown, 'tooltip', "player.playerInfoDropdown.tooltip");
				playerInfoDropdown.addEventListener(DropdownSelectionChangeEventName, this.onSlotDropdownSelectionChange.bind(this));

				playerInfoDropdownAndDivider.appendChild(playerInfoDropdown);
				playerInfoFrame.appendChild(playerInfoDropdownAndDivider);
			}

			{
				const teamDropdownAndDivider = document.createElement('div');
				teamDropdownAndDivider.classList.add("team-dropdown-and-divider", "flex-1", "flow-row", "items-stretch", "relative");

				const teamDropdown: HTMLElement = document.createElement('team-dropdown');
				teamDropdown.setAttribute('data-tooltip-anchor', 'left');
				teamDropdown.setAttribute('has-border', 'false');
				teamDropdown.setAttribute('has-background', 'false');
				teamDropdown.classList.add("mp-staging__focusable-slot", "my-1", "mx-0\\.5", "flex", "flex-auto");
				teamDropdown.setAttribute("index", "1");
				teamDropdown.setAttribute("no-selection-caption", " ");
				Databind.attribute(teamDropdown, 'optionID', "player.teamDropdown.id");
				Databind.attribute(teamDropdown, 'dropdown-items', "player.teamDropdown.serializedItemList");
				Databind.attribute(teamDropdown, 'selected-item-index', "player.teamDropdown.selectedItemIndex");
				Databind.attribute(teamDropdown, 'items-tooltips', "player.teamDropdown.serializedItemTooltips");
				Databind.attribute(teamDropdown, 'data-tooltip-content', "player.teamDropdown.selectedItemTooltip");
				Databind.attribute(teamDropdown, 'disabled', "player.teamDropdown.isDisabled");
				Databind.attribute(teamDropdown, 'data-player-id', "player.playerID");
				Databind.attribute(teamDropdown, 'data-dropdown-type', "player.teamDropdown.dropdownType");
				Databind.attribute(teamDropdown, 'data-player-param', "player.teamDropdown.playerParamName");
				Databind.attribute(teamDropdown, 'show-label-on-selected-item', "player.teamDropdown.showLabelOnSelectedItem");
				teamDropdown.addEventListener(DropdownSelectionChangeEventName, this.onSlotDropdownSelectionChange.bind(this));

				teamDropdownAndDivider.appendChild(teamDropdown);
				this.createDivider(teamDropdownAndDivider);
				playerInfoFrame.appendChild(teamDropdownAndDivider);
			}

			{
				const civilizationDropdownAndDivider: HTMLElement = document.createElement('div');
				civilizationDropdownAndDivider.classList.add("civ-dropdown-and-divider", "flex-1", "flow-row", "items-stretch", "relative");

				const civilizationDropdown: HTMLElement = document.createElement('lobby-dropdown');
				civilizationDropdown.setAttribute('data-tooltip-anchor', 'left');
				civilizationDropdown.setAttribute('has-border', 'false');
				civilizationDropdown.setAttribute('has-background', 'false');
				civilizationDropdown.classList.add("mp-staging__focusable-slot", "my-1", "mx-0\\.5", "flex", "flex-auto");
				civilizationDropdown.setAttribute("index", "1");
				civilizationDropdown.setAttribute("icon-container-innerhtml", "<div class='img-prof-btn-bg absolute w-16 h-16'></div>");

				Databind.attribute(civilizationDropdown, 'optionID', "player.civilizationDropdown.id");
				Databind.attribute(civilizationDropdown, 'dropdown-items', "player.civilizationDropdown.serializedItemList");
				Databind.attribute(civilizationDropdown, 'selected-item-index', "player.civilizationDropdown.selectedItemIndex");
				Databind.attribute(civilizationDropdown, 'items-tooltips', "player.civilizationDropdown.serializedItemTooltips");
				Databind.attribute(civilizationDropdown, 'data-tooltip-content', "player.civilizationDropdown.selectedItemTooltip");
				Databind.attribute(civilizationDropdown, 'disabled', "player.civilizationDropdown.isDisabled");
				Databind.attribute(civilizationDropdown, 'data-player-id', "player.playerID");
				Databind.attribute(civilizationDropdown, 'data-dropdown-type', "player.civilizationDropdown.dropdownType");
				Databind.attribute(civilizationDropdown, 'data-player-param', "player.civilizationDropdown.playerParamName");
				Databind.attribute(civilizationDropdown, 'show-label-on-selected-item', "player.civilizationDropdown.showLabelOnSelectedItem");
				civilizationDropdown.addEventListener(DropdownSelectionChangeEventName, this.onSlotDropdownSelectionChange.bind(this));

				civilizationDropdownAndDivider.appendChild(civilizationDropdown);
				this.createDivider(civilizationDropdownAndDivider);
				playerInfoFrame.appendChild(civilizationDropdownAndDivider);
			}

			{
				const leaderDropdownAndDivider: HTMLElement = document.createElement('div');
				leaderDropdownAndDivider.classList.add("dropdown-and-divider", "flex", "flow-row", "items-stretch", "flex-2", "relative");

				const leaderDropdown: HTMLElement = document.createElement('leader-dropdown');
				leaderDropdown.setAttribute('data-tooltip-anchor', 'left');
				leaderDropdown.setAttribute('has-border', 'false');
				leaderDropdown.setAttribute('has-background', 'false');
				leaderDropdown.classList.add("mp-staging__focusable-slot", "my-1", "mx-0\\.5", 'flex', 'flex-auto');
				leaderDropdown.setAttribute("index", "2");
				leaderDropdown.setAttribute("icon-container-innerhtml", "<div class='img-shell_base-ring-focus absolute w-16 h-16 tint-bg-primary-3'></div><div class='img-shell_leader-xp-ring absolute w-16 h-16 tint-bg-primary-1'></div>");

				Databind.attribute(leaderDropdown, 'optionID', "player.leaderDropdown.id");
				Databind.attribute(leaderDropdown, 'dropdown-items', "player.leaderDropdown.serializedItemList");
				Databind.attribute(leaderDropdown, 'selected-item-index', "player.leaderDropdown.selectedItemIndex");
				Databind.attribute(leaderDropdown, 'items-tooltips', "player.leaderDropdown.serializedItemTooltips");
				Databind.attribute(leaderDropdown, 'data-tooltip-content', "player.leaderDropdown.selectedItemTooltip");
				Databind.attribute(leaderDropdown, 'disabled', "player.leaderDropdown.isDisabled");
				Databind.attribute(leaderDropdown, 'data-player-id', "player.playerID");
				Databind.attribute(leaderDropdown, 'data-dropdown-type', "player.leaderDropdown.dropdownType");
				Databind.attribute(leaderDropdown, 'data-player-param', "player.leaderDropdown.playerParamName");
				Databind.attribute(leaderDropdown, 'show-label-on-selected-item', "player.leaderDropdown.showLabelOnSelectedItem");
				Databind.attribute(leaderDropdown, 'mementos', 'player.mementos');
				Databind.attribute(leaderDropdown, 'has-memento', 'player.isMementoEnabled');
				leaderDropdown.addEventListener(DropdownSelectionChangeEventName, this.onSlotDropdownSelectionChange.bind(this));

				leaderDropdownAndDivider.appendChild(leaderDropdown);
				this.createDivider(leaderDropdownAndDivider);
				playerInfoFrame.appendChild(leaderDropdownAndDivider);
			}

			const readyIndicatorContainer = document.createElement("div");
			readyIndicatorContainer.classList.add("flow-row", "justify-center", "mp-staging__ready-slot", "items-center");
			const readyIndicator: HTMLElement = document.createElement('fxs-activatable');
			readyIndicator.classList.add("w-12", "h-12", "group", "relative", "mp-staging__focusable-slot");
			readyIndicator.setAttribute("tabindex", "-1");
			readyIndicator.setAttribute("data-bind-attributes", "{'disabled':({{player.isLocal}}&&{{g_MPLobbyModel.readyStatus}}!='WAITING_FOR_HOST')?'false':'true'}");
			readyIndicator.addEventListener(ActionActivateEventName, this.readyIndicatorActivateListener);
			const readyIndicatorReady: HTMLElement = document.createElement('div');
			readyIndicatorReady.classList.add("img-hud-civic-complete", "absolute", "-inset-1");
			Databind.classToggle(readyIndicatorReady, "hidden", "!{{player.isReady}} && {{player.isHuman}}");
			const readyIndicatorNotReady: HTMLElement = document.createElement('div');
			readyIndicatorNotReady.classList.add("img-civics-icon-frame", "absolute", "-inset-1");
			Databind.classToggle(readyIndicatorNotReady, "hidden", "{{player.isReady}} || !{{player.isHuman}}");
			const readyIndicatorNotReadyHover: HTMLElement = document.createElement('div');
			readyIndicatorNotReadyHover.classList.add("techtree-icon-empty-highlight", "absolute", "-inset-0\\.5", "transition-opacity", "opacity-0", "group-hover\\:opacity-100", "group-focus\\:opacity-100");
			Databind.classToggle(readyIndicatorNotReadyHover, "hidden", "{{player.isReady}} || !{{player.isHuman}}");
			const readyIndicatorContainerHighlight = document.createElement("div");
			readyIndicatorContainerHighlight.classList.add("absolute", "-inset-6", "pointer-events-none", "img-popup_icon_glow", "opacity-0", "transition-opacity", "group-hover\\:opacity-100", "group-focus\\:opacity-100");
			readyIndicator.appendChild(readyIndicatorContainerHighlight);
			readyIndicator.appendChild(readyIndicatorNotReady);
			readyIndicator.appendChild(readyIndicatorNotReadyHover);
			readyIndicator.appendChild(readyIndicatorReady);
			readyIndicatorContainer.appendChild(readyIndicator);
			playerInfoFrame.appendChild(readyIndicatorContainer);

			playerRow.appendChild(playerInfoFrame)

			const kickButtonContainer = document.createElement("div");
			kickButtonContainer.classList.add("flow-row", "justify-center", "mp-staging__kick-slot");
			const kickButton: HTMLElement = document.createElement('fxs-activatable');
			kickButton.classList.add("mp-staging__focusable-slot", "w-8", "h-8", "relative", "group");
			Databind.if(kickButton, "player.canEverBeKicked");
			{
				kickButton.classList.add("kick-button");
				kickButton.setAttribute("data-bind-attributes", "{'disabled':{{player.canBeKickedNow}}?'false':'true'}");

				kickButton.setAttribute('tabindex', "-1");
				Databind.attribute(kickButton, 'data-player-id', "player.playerID");
				Databind.attribute(kickButton, 'is-target', "player.isKickVoteTarget");
				Databind.attribute(kickButton, 'data-tooltip-content', "player.kickTooltip");

				kickButton.addEventListener('action-activate', this.onKick.bind(this));
			}
			const kickButtonBg = document.createElement("div");
			kickButtonBg.classList.add("img-close-button", "absolute", "inset-0");
			Databind.classToggle(kickButtonBg, "tint-bg-accent-5", "!{{player.canBeKickedNow}}");
			const kickButtonHighlight = document.createElement("div");
			kickButtonHighlight.classList.add("absolute", "inset-0", "img-dropdown-box-focus", "opacity-0", "group-focus\\:opacity-100", "group-hover\\:opacity-100", "transition-opacity");
			Databind.if(kickButtonHighlight, "g_NavTray.isTrayRequired");

			kickButton.appendChild(kickButtonBg);
			kickButton.appendChild(kickButtonHighlight);

			kickButtonContainer.appendChild(kickButton);

			playerRow.appendChild(kickButtonContainer);
			Databind.classToggle(kickButtonContainer, "hidden", "{{g_MPLobbyModel.isKickOptionHidden}}");

			playerInfo.appendChild(closeRow);
			Databind.if(closeRow, "!{{player.isParticipant}}");

			playerInfo.appendChild(playerRow);
			Databind.if(playerRow, "player.isParticipant");
		}

		playerInfoContainer.appendChild(playerInfo);

		playerInfoScrollable.appendChild(playerInfoContainer);

		this.playerInfoSlot.appendChild(playerInfoScrollable);

		// --- Bottom container ---
		this.backButton.addEventListener('action-activate', this.close.bind(this));

		mementosButton.addEventListener('action-activate', this.mementosButtonActivateListener);
		mementosButton.classList.toggle("hidden", !Configuration.getGame().isMementosEnabled);
		Databind.if(mementosButton, `!{{g_NavTray.isTrayRequired}}`);

		Databind.classToggle(this.kickHeader, "hidden", "{{g_MPLobbyModel.isKickOptionHidden}}");

		this.viewAllRulesButtonTop.addEventListener('action-activate', this.onViewAllRules.bind(this));
		Databind.if(this.viewAllRulesButtonTop, `!{{g_NavTray.isTrayRequired}}`);
		this.viewAllRulesButtonBot.addEventListener('action-activate', this.onViewAllRules.bind(this));
		Databind.if(this.viewAllRulesButtonFarBot, `!{{g_NavTray.isTrayRequired}}`);
		this.viewAllRulesButtonFarBot.addEventListener('action-activate', this.onViewAllRules.bind(this));

		// TODO BVHR https://2kfxs.atlassian.net/browse/IGP-60974 [mp-staging-new.ts][TODO] 3 TODOs: leaderIcon, 'bg-color' | display a text distinct from the readyButton.caption | display a (decreasing) gauge
		// TODO To use g_MPLobbyModel.allReadyCountdownRemainingSeconds to display a text distinct from the readyButton.caption
		// TODO To use g_MPLobbyModel.allReadyCountdownRemainingPercentage to display a (decreasing) gauge (ie. element.style.width = percentage + "%")
		this.readyButton.addEventListener('action-activate', this.onReady.bind(this));
		this.readyButton.setAttribute("data-audio-group-ref", "multiplayer-lobby");
		this.readyButton.setAttribute("data-audio-press-ref", "data-audio-ready-button-press");
		this.readyButton.setAttribute("data-audio-activate-ref", "data-audio-ready-button-activate");

		this.readyButtonLoadingContainer = MustGetElement(".mp-staging__ring-meter__loading", this.Root);
		this.createLoadingAnimation(this.readyButtonLoadingContainer);

		this.updatePlayerInfoSlot();

		MPLobbyModel.updateGlobalCountdownData();
		MPLobbyModel.updateTooltipData();

		if (ContextManager.hasInstanceOf("screen-save-load")) {
			ContextManager.pop("screen-save-load");
		}

		Network.isMultiplayerLobbyShown(true);
	}

	onDetach(): void {
		super.onDetach();

		window.removeEventListener('resize', this.resizeListener);
		window.removeEventListener(LobbyUpdateEventName, this.lobbyUpdateListener);
		window.removeEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeChangeListener);
		engine.off(ContextManagerEvents.OnChanged, this.onContextChange, this);
		Network.isMultiplayerLobbyShown(false);
	}

	onReceiveFocus() {
		super.onReceiveFocus();

		switch (this.focusState) {
			case FocusState.CHAT:
				if (this.chat) {
					FocusManager.setFocus(this.chat);
				}
				this.updateFocusState();
				break;
			case FocusState.PLAYER_SLOT:
			case FocusState.CHAT_DIALOG:
				waitForLayout(() => { // wait needed for the databind to update the list
					if (!ContextManager.hasInstanceOf("screen-mp-lobby") || ContextManager.getCurrentTarget() != this.Root) {
						return;
					}
					FocusManager.setFocus(this.playerInfoSlot);
					this.updateFocusState();
				});
				break;
		}

		this.updateToggleNavHelp();
		this.updateChatNavHelp();
		this.updateNavTray();
	}

	onLoseFocus() {
		NavTray.clear();

		super.onLoseFocus();
	}

	private isSmallScreen() {
		return window.innerHeight <= Layout.pixelsToScreenPixels(MPLobbyModel.SMALL_SCREEN_MODE_MAX_HEIGHT) || window.innerWidth <= Layout.pixelsToScreenPixels(MPLobbyModel.SMALL_SCREEN_MODE_MAX_WIDTH);
	}

	private onPlayerInfoFocus = () => {
		FocusManager.setFocus(this.playerInfoSlot);
		this.updateFocusState();
		this.updateChatNavHelp();
		this.updateNavTray();
		this.updateToggleNavHelp();
	}

	private createDivider(parent: HTMLElement) {
		const dividerContainer = document.createElement('div');
		dividerContainer.classList.add('items-center', 'flow-row');

		const divider = document.createElement("div");
		divider.classList.add("img-seperator-col-accent-5", "h-0\\.5", "w-10", "-mx-5");
		dividerContainer.appendChild(divider);

		parent.appendChild(dividerContainer);
	}

	private createLoadingAnimation(parent: HTMLElement) {
		const flipbook = document.createElement("fxs-flipbook");
		flipbook.setAttribute("data-bind-if", "{{g_MPLobbyModel.readyStatus}}=='WAITING_FOR_HOST'");
		const atlas: FlipbookFrame[] = [
			{
				src: 'fs://game/hourglasses01.png',
				spriteWidth: 64,
				spriteHeight: 64,
				size: 256
			},
			{
				src: 'fs://game/hourglasses02.png',
				spriteWidth: 64,
				spriteHeight: 64,
				size: 256
			},
			{
				src: 'fs://game/hourglasses03.png',
				spriteWidth: 64,
				spriteHeight: 64,
				size: 512,
				nFrames: 13
			}
		]
		const flipbookDefinition: FlipbookDefinition = {
			fps: 30,
			preload: true,
			atlas: atlas
		};
		flipbook.setAttribute("data-flipbook-definition", JSON.stringify(flipbookDefinition));
		parent.appendChild(flipbook);
	}

	private onPlayerInfoEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		switch (inputEvent.detail.name) {
			case 'cancel':
				this.close();
				inputEvent.stopPropagation();
				inputEvent.preventDefault();
				break;

			case 'shell-action-1':
				if (Configuration.getGame().isMementosEnabled && !MPLobbyModel.isLocalPlayerReady) {
					this.openMementos();
					inputEvent.stopPropagation();
					inputEvent.preventDefault();
				}
				break;

			case 'shell-action-2':
				this.viewAllRules(inputEvent);
				break;

			case 'shell-action-3':
				if (Network.hasCommunicationsPrivilege(false)) {
					if (this.isSmallScreen()) {
						this.openChat();
						inputEvent.stopPropagation();
						inputEvent.preventDefault();
					} else {
						if (this.chat) {
							FocusManager.setFocus(this.chat);
						}
						this.updateFocusState();
						this.updateToggleNavHelp();
						inputEvent.stopPropagation();
						inputEvent.preventDefault();
					}
				}
				break;

		}
	}

	onPlayerInfoNavigateInput(navigationEvent: NavigateInputEvent) {
		const live = this.handlePlayerInfoNavigation(navigationEvent);
		if (!live) {
			navigationEvent.preventDefault();
			navigationEvent.stopImmediatePropagation();
		}
	}

	/**
	 * @returns true if still live, false if input should stop.
	 */
	handlePlayerInfoNavigation(navigationEvent: NavigateInputEvent) {
		let live = true;
		if (navigationEvent.detail.status != InputActionStatuses.FINISH) {
			return live;
		}
		const direction = navigationEvent.getDirection();
		switch (direction) {
			case InputNavigationAction.SHELL_PREVIOUS:
				if (Network.supportsSSO()) {
					this.showJoinCode();
					Audio.playSound("data-audio-show-code-activate", "multiplayer-lobby");
					live = false;
				}
				break;
			case InputNavigationAction.SHELL_NEXT:
				this.updateReadyStatus();
				live = false;
				Audio.playSound("data-audio-ready-button-activate", "multiplayer-lobby");
				break;
		}
		return live;
	}

	private refreshShowJoinCodeCaption() {
		this.showJoinCodeButtonTop.setAttribute('caption', this.joinCodeShown
			? MPLobbyModel.joinCode
			: "LOC_UI_MP_LOBBY_SHOW_JOIN_CODE");
		this.showJoinCodeButtonBot.setAttribute('caption', this.joinCodeShown
			? MPLobbyModel.joinCode
			: "LOC_UI_MP_LOBBY_SHOW_JOIN_CODE");
	}

	private showJoinCode(inputEvent?: InputEngineEvent) {
		if (inputEvent) {
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		}

		this.joinCodeShown = !this.joinCodeShown;
		this.refreshShowJoinCodeCaption();
	}

	private onShowJoinCode() {
		this.showJoinCode();
	}

	private onSlotDropdownSelectionChange(event: DropdownSelectionChangeEvent) {
		MPLobbyModel.onLobbyDropdown(event);
	}

	private onKick(event: Event) {
		const target: HTMLElement | null = event.target as HTMLElement;
		if (target == null) {
			console.error("mp-staging-new: onKick(): Invalid event target. It should be an HTMLElement");
			return;
		}

		const kickPlayerIDStr: string | null = target.getAttribute("data-player-id");
		if (kickPlayerIDStr == null) {
			console.error("mp-staging-new: onKick(): Invalid data-player-id attribute");
			return;
		}

		const kickPlayerID: number = parseInt(kickPlayerIDStr);
		MPLobbyModel.kick(kickPlayerID);
	}

	private viewAllRules(inputEvent?: InputEngineEvent) {
		if (inputEvent) {
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		}

		ContextManager.push('screen-mp-game-rules', { singleton: true, createMouseGuard: true, attributes: { blackOut: true } });
	}

	private onViewAllRules() {
		this.viewAllRules();
	}

	private updateReadyStatus(inputEvent?: InputEngineEvent) {
		if (inputEvent) {
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		}

		MPLobbyModel.onGameReady();
	}

	private onReadyIndicatorActivate(_event: ActionActivateEvent) {
		this.onReady();
	}

	private onReady() {
		this.updateReadyStatus();

		window.dispatchEvent(new StartCampaignEvent());
	}

	private onResize() {
		this.updateHeaderSpacing();
		this.updateLeftSection();
		this.updateNavTray();
		this.updatePlayerInfoSlot();
		this.updateReadyButtonContainer();
		this.updateReadyDescriptionContainer();
		this.updateBotSection();
		this.updateBotSection2();
		this.updateShowJoinCodeButton();
		this.updateViewAllRulesFarBot();
		this.updateViewRuleButton();
		this.updateFrame();
	}

	private updateLeftSection() {
		this.leftSectionTop.classList.toggle("hidden", !this.isSmallScreen());
		this.leftSectionHeader.classList.toggle("hidden", this.isSmallScreen());
		this.leftSectionContent.classList.toggle("hidden", this.isSmallScreen());
	}

	private updateHeaderSpacing() {
		this.headerSpacings.forEach(headerSpacing => {
			headerSpacing.classList.toggle("w-84", this.isSmallScreen());
			headerSpacing.classList.toggle("w-128", !this.isSmallScreen());
		});
	}

	private updateBotSection() {
		this.botSection.classList.toggle("justify-between", !this.isSmallScreen());
		this.botSection.classList.toggle("justify-start", this.isSmallScreen());
	}

	private updateBotSection2() {
		this.botSection2.classList.toggle("flex-auto", this.isSmallScreen());
	}

	private updateReadyButtonContainer() {
		this.readyButtonContainer.classList.toggle("justify-center", !this.isSmallScreen());
		this.readyButtonContainer.classList.toggle("justify-end", this.isSmallScreen());
		this.readyButtonContainer.classList.toggle("right-28", this.isSmallScreen());
		this.readyButtonContainer.classList.toggle("-bottom-3", this.isSmallScreen());
		this.readyButtonContainer.classList.toggle("hidden", this.isSmallScreen() && UI.getViewExperience() == UIViewExperience.Mobile);
	}

	private updateReadyDescriptionContainer() {
		this.readyDescriptionContainer.classList.toggle("hidden", !this.isSmallScreen() || UI.getViewExperience() != UIViewExperience.Mobile);
	}

	private updateShowJoinCodeButton() {
		this.showJoinCodeButtonTop.classList.toggle("hidden", !this.isSmallScreen() || !Network.supportsSSO());
		this.showJoinCodeButtonBot.classList.toggle("hidden", this.isSmallScreen() || !Network.supportsSSO());
	}

	private updateViewAllRulesFarBot() {
		this.viewAllRulesButtonFarBot.classList.toggle("hidden", !this.isSmallScreen());
	}

	private updateFrame() {
		this.frame.setAttribute("outside-safezone-mode", this.isSmallScreen() ? "full" : "vertical");
	}

	private onMementosButtonActivate() {
		this.openMementos();
	}

	private openMementos() {
		ContextManager.push('memento-editor', { singleton: true, createMouseGuard: true, attributes: { blackOut: true } });
	}

	private onToggleChatActivate() {
		this.openChat();
	}

	private openChat() {
		ContextManager.push("panel-mp-lobby-chat", { singleton: true, createMouseGuard: true });
		this.updateFocusState();
		this.updateToggleNavHelp();
	}


	private onLobbyUpdate() {
		waitForLayout(() => { // wait needed for the databind to update the list
			this.updateNavTray();
			if (this.focusState != FocusState.PLAYER_SLOT || ContextManager.getCurrentTarget() != this.Root) {
				return;
			}
			if (!this.playerInfoSlot.contains(FocusManager.getFocus())) {
				FocusManager.setFocus(this.playerInfoSlot);
			}
		});
	}

	private onChatFocus(_event: FocusEvent) {
		waitForLayout(() => {
			this.updateFocusState();
			this.updateChatNavHelp();
			this.updateNavTray();
			this.updateToggleNavHelp();
		});
	}

	private onContextChange(_event: CustomEvent) {
		this.updateToggleNavHelp();
	}

	private onActiveDeviceTypeChange(_event: ActiveDeviceTypeChangedEvent) {
		this.updatePlayerInfoSlot();
	}

	private onProfileAccountLoggedOut(_event: ProfileAccountLoggedOutEvent) {
		this.close();
	}

	private onChatEngineInput(event: InputEngineEvent) {
		if (this.handleChatEngineInput(event)) {
			event.preventDefault();
			event.stopPropagation();
		}
	}

	private handleChatEngineInput({ detail: { status, name } }: InputEngineEvent) {
		if (status != InputActionStatuses.FINISH) {
			return false;
		}

		switch (name) {
			case 'cancel':
				FocusManager.setFocus(this.playerInfoSlot);
				this.updateFocusState();
				this.updateToggleNavHelp();
				return true;
		}

		return false;
	}

	private updateToggleNavHelp() {
		this.Root.classList.toggle("trigger-nav-help", this.focusState == FocusState.PLAYER_SLOT);
		this.chatFrame.classList.toggle("trigger-nav-help", this.focusState == FocusState.CHAT && !ContextManager.hasInstanceOf("send-to-panel") && !ContextManager.hasInstanceOf("emoticon-panel"));
	}

	private updateChatNavHelp() {
		const currentFocus = FocusManager.getFocus();
		this.chatNavHelp?.setAttribute("action-key", this.chat == currentFocus || this.chat?.contains(FocusManager.getFocus()) ? "inline-cancel" : "inline-shell-action-3");
	}

	private updatePlayerInfoSlot() {
		this.playerInfoSlot.classList.toggle("mb-28", !this.isSmallScreen() && !ActionHandler.isGamepadActive);
		this.playerInfoSlot.classList.toggle("mb-40", !this.isSmallScreen() && ActionHandler.isGamepadActive);
		this.playerInfoSlot.classList.toggle("mb-36", this.isSmallScreen() && ActionHandler.isGamepadActive && UI.getViewExperience() != UIViewExperience.Mobile);
		this.playerInfoSlot.classList.toggle("mb-24", this.isSmallScreen() && !ActionHandler.isGamepadActive && UI.getViewExperience() != UIViewExperience.Mobile);
		this.playerInfoSlot.classList.toggle("mb-0", this.isSmallScreen() && UI.getViewExperience() == UIViewExperience.Mobile);
	}

	private updateViewRuleButton() {
		this.viewAllRulesButtonTop.classList.toggle("hidden", !this.isSmallScreen() || UI.getViewExperience() == UIViewExperience.Mobile);
		this.viewAllRulesButtonFarBot.classList.toggle("hidden", !this.isSmallScreen() || UI.getViewExperience() != UIViewExperience.Mobile);
		this.viewAllRulesButtonBot.classList.toggle("hidden", this.isSmallScreen());
		if (UI.getViewExperience() == UIViewExperience.Mobile) {
			this.viewAllRulesButtonTop.setAttribute("caption", "LOC_UI_MP_HEADER_RULES");
			this.viewAllRulesButtonFarBot.setAttribute("caption", "LOC_UI_MP_HEADER_RULES");
			this.viewAllRulesButtonBot.setAttribute("caption", "LOC_UI_MP_HEADER_RULES");
		}
	}

	private updateFocusState() {
		if (ContextManager.hasInstanceOf("panel-mp-lobby-chat")) {
			this.focusState = FocusState.CHAT_DIALOG;
		} else {
			this.focusState = this.chat?.contains(FocusManager.getFocus()) ? FocusState.CHAT : FocusState.PLAYER_SLOT;
		}
	}

	private updateNavTray() {
		NavTray.clear();
		if (this.focusState == FocusState.CHAT) {
			return;
		}
		NavTray.addOrUpdateGenericBack();

		if (Configuration.getGame().isMementosEnabled) {
			NavTray.addOrUpdateShellAction1("LOC_UI_MP_MEMENTO");
		}

		if (this.isSmallScreen()) {
			NavTray.addOrUpdateShellAction2("LOC_UI_MP_LOBBY_RULES");
			if (Network.hasCommunicationsPrivilege(false)) {
				NavTray.addOrUpdateShellAction3("LOC_UI_MP_CHAT");
			}
			if (UI.getViewExperience() == UIViewExperience.Mobile) {
				if (MPLobbyModel.isLocalPlayerReady) {
					NavTray.addOrUpdateNavShellNext("LOC_UI_MP_LOBBY_NAVTRAY_UNREADY");
				} else {
					NavTray.addOrUpdateNavShellNext("LOC_UI_MP_LOBBY_NAVTRAY_READY");
				}
			}
		}
	}

	public close() {
		MPLobbyModel.cancelGlobalCountdown();

		// We need to leave the multiplayer game before pushing the next screen as that screen might
		// need to use a lobby instance immediately (like the games browser). 
		Network.leaveMultiplayerGame();

		// exitMPGame pops the staging screen off the stack.
		MultiplayerShellManager.exitMPGame("", "");

		// caching last human count (for telemetry)
		let lastHumanCount = 0;
		let lastParticipantCount = 0;
		MPLobbyModel.lobbyPlayersData.forEach(playerData => {
			if (playerData.isHuman) {
				lastHumanCount++;
			}
			if (playerData.isParticipant) {
				lastParticipantCount++;
			}
		});

		window.dispatchEvent(new SendCampaignSetupTelemetryEvent(CampaignSetupType.Abandon, lastHumanCount, lastParticipantCount));

		super.close();
	}
}

Controls.define('screen-mp-lobby', {
	createInstance: PanelMPLobby,
	description: 'lobby screen for multiplayer.',
	classNames: ['mp-lobby', 'fullscreen', 'flow-row', 'justify-center', 'items-center', 'flex-1'],
	content: ['fs://game/core/ui/shell/mp-staging/mp-staging-new.html'],
	attributes: []
});

class PanelMPChat extends Panel {
	private closeButton!: HTMLElement;
	private chat!: HTMLElement;

	private closeButtonActivateListener = this.onCloseButtonActivate.bind(this);
	private engineInputListener = this.onEngineInput.bind(this);

	constructor(root: ComponentRoot) {
		super(root);
		this.animateInType = this.animateOutType = AnchorType.RelativeToLeft;
	}

	onInitialize(): void {
		super.onInitialize();

		this.Root.innerHTML = `
			<div class="flex-auto relative pl-2 pt-3 pb-3 mp-staging__chat-panel w-full h-full" data-bind-class-toggle="pb-16:{{g_NavTray.isTrayRequired}}">
				<screen-mp-chat class="flex-auto"></screen-mp-chat>
				<fxs-close-button></fxs-close-button>
			</div>
		`

		this.closeButton = MustGetElement("fxs-close-button", this.Root);
		this.closeButton.classList.add("top-3");
		this.chat = MustGetElement("screen-mp-chat", this.Root);
		this.enableOpenSound = true;
		this.enableCloseSound = true;
	}

	onAttach(): void {
		this.playAnimateInSound();
		this.closeButton.addEventListener("action-activate", this.closeButtonActivateListener);
		this.Root.addEventListener("engine-input", this.engineInputListener);
	}

	onDetach() {
		super.onDetach();
	}

	onReceiveFocus() {
		super.onReceiveFocus();

		FocusManager.setFocus(this.chat);

		this.updateNavTray();
	}

	onLoseFocus() {
		NavTray.clear();

		super.onLoseFocus();
	}

	private onCloseButtonActivate() {
		this.close();
	}

	private onEngineInput(event: InputEngineEvent) {
		if (this.handleEngineInput(event)) {
			event.preventDefault();
			event.stopPropagation();
		}
	}

	private handleEngineInput({ detail: { status, name } }: InputEngineEvent) {
		if (status != InputActionStatuses.FINISH) {
			return false;
		}
		switch (name) {
			case 'cancel':
			case 'keyboard-escape':
				this.close();
				return true;
		}
		return false;
	}

	private updateNavTray() {
		NavTray.clear();
		NavTray.addOrUpdateGenericBack();
	}
}

Controls.define('panel-mp-lobby-chat', {
	createInstance: PanelMPChat,
	description: 'lobby screen for multiplayer.',
	classNames: ['panel-mp-lobby-chat', 'fullscreen', 'flow-row', 'items-start', 'flex-1'],
	styles: ['fs://game/core/ui/shell/mp-staging/mp-staging-new.css'],
	attributes: [],
	tabIndex: -1,
});