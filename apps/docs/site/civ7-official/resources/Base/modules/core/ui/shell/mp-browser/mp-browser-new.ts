/**
 * @file mp-browser-new.ts		
 * @copyright 2023-2025, Firaxis Games
 * @description Multiplayer browser screen.  
 */

import { ActionActivateEvent } from '/core/ui/components/fxs-activatable.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
import DialogBoxManager, { DialogBoxAction } from '/core/ui/dialog-box/manager-dialog-box.js';
import ActionHandler, { ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { InputEngineEvent, NavigateInputEvent } from '/core/ui/input/input-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel, { AnchorType } from '/core/ui/panel-support.js';
import MPBrowserModel, { MPGameListInfo, MultiplayerGameListQueryCompleteEvent, MultiplayerGameListQueryCompleteEventName, MultiplayerGameListQueryDoneEvent, MultiplayerGameListQueryDoneEventName, MultiplayerGameListQueryErrorEvent, MultiplayerGameListQueryErrorEventName } from '/core/ui/shell/mp-browser/model-mp-browser-new.js';
import { ActionConfirmEvent, ActionConfirmEventName, SortOptions, mapSortOptionsToFlex } from '/core/ui/shell/mp-browser/mp-browser-chooser-item.js';
import MultiplayerShellManager, { MultiplayerCreateAttemptEvent, MultiplayerCreateAttemptEventName, MultiplayerCreateCompleteEvent, MultiplayerCreateCompleteEventName, MultiplayerCreateFailEvent, MultiplayerCreateFailEventName, MultiplayerGameAbandonedEvent, MultiplayerGameAbandonedEventName, MultiplayerJoinCompleteEvent, MultiplayerJoinCompleteEventName, MultiplayerJoinFailEvent, MultiplayerJoinFailEventName, MultiplayerMatchMakeCompleteEvent, MultiplayerMatchMakeCompleteEventName, MultiplayerMatchMakeFailEvent, MultiplayerMatchMakeFailEventName } from '/core/ui/shell/mp-shell-logic/mp-shell-logic.js';
import { GameCreatorOpenedEvent } from '/core/ui/events/shell-events.js';
import { MustGetElement, MustGetElements } from '/core/ui/utilities/utilities-dom.js';
import { gameListUpdateTypeToErrorBody, serverTypeToGameModeType } from '/core/ui/utilities/utilities-network-constants.js';
import { ProfileAccountLoggedOutEvent, ProfileAccountLoggedOutEventName } from '/core/ui/profile-header/profile-header.js';
import { Layout } from '/core/ui/utilities/utilities-layout.js';
import { FlipbookDefinition, FlipbookFrame } from '/core/ui/components/fxs-flipbook.js';
import { MainMenuReturnEvent } from '/core/ui/events/shell-events.js';

enum PanelOperation {
	None,
	Query,
	Create,
	Join,
	Search,
	CreateDialog,
}

const sortOptions = [SortOptions.GAME_NAME, SortOptions.RULE_SET, SortOptions.MAP_TYPE, SortOptions.GAME_SPEED, SortOptions.CONTENT, SortOptions.PLAYERS];

const mapServerTypeToTitle = {
	[ServerType.SERVER_TYPE_INTERNET]: "LOC_UI_MP_BROWSER_TITLE_INTERNET",
	[ServerType.SERVER_TYPE_LAN]: "LOC_UI_MP_BROWSER_TITLE_LAN",
	[ServerType.SERVER_TYPE_WIRELESS]: "LOC_UI_MP_BROWSER_TITLE_WIRELESS",
}

const mapSortOptionsToTitle = {
	[SortOptions.NONE]: "",
	[SortOptions.GAME_NAME]: "LOC_UI_MP_BROWSER_FILTER_GAME_NAME",
	[SortOptions.RULE_SET]: "LOC_UI_MP_BROWSER_FILTER_RULE",
	[SortOptions.MAP_TYPE]: "LOC_UI_MP_BROWSER_FILTER_MAP_TYPE",
	[SortOptions.GAME_SPEED]: "LOC_UI_MP_BROWSER_FILTER_GAME_SPEED",
	[SortOptions.CONTENT]: "LOC_UI_MP_BROWSER_FILTER_CONTENT",
	[SortOptions.PLAYERS]: "LOC_UI_MP_BROWSER_FILTER_PLAYERS",
}

enum SortOrder {
	NONE = 0,
	ASC = 1,
	DESC = 2
}

class PanelMPBrowser extends Panel {
	readonly REFRESH_BUFFER_TIME_MS = 1000;
	readonly SMALL_SCREEN_MODE_MAX_HEIGHT = 768;
	readonly SMALL_SCREEN_MODE_MAX_WIDTH = 1450;

	private backButtonListener = this.onBack.bind(this);
	private engineInputListener = this.onEngineInput.bind(this);
	private navigateInputListener = this.onNavigateInput.bind(this);
	private queryDoneListener = this.onQueryDone.bind(this);
	private queryCompleteListener = this.onQueryComplete.bind(this);
	private queryErrorListener = this.onQueryError.bind(this);
	private matchmakeCompleteListener = this.onMatchmakeComplete.bind(this);
	private matchmakeFailListener = this.onMatchmakeFail.bind(this);
	private joinCompleteListener = this.onJoinComplete.bind(this);
	private joinFailListener = this.onJoinFail.bind(this);
	private createCompleteListener = this.onCreateComplete.bind(this);
	private createFailListener = this.onCreateFail.bind(this);
	private createAttemptListener = this.onCreateAttempt.bind(this);
	private gameAbandonedListener = this.onGameAbandoned.bind(this);
	private lobbyShutdownListener = this.onLobbyShutdown.bind(this);
	private gameCardFocusListener = this.onGameCardFocus.bind(this);
	private gameCardActivateListener = this.onGameCardActivate.bind(this);
	private gameCardConfirmListener = this.onGameCardConfirm.bind(this);
	private filterButtonActivateListener = this.onFilterButtonActivate.bind(this);
	private filterButtonFocusListener = this.onFilterButtonFocus.bind(this);
	private filterButtonBlurListener = this.onFilterButtonBlur.bind(this);
	private refreshButtonActivateListener = this.onRefreshButtonActivate.bind(this);
	private joinCodeButtonActivateListener = this.onJoinCodeButtonActivate.bind(this);
	private loadGameButtonActivateListener = this.onLoadGameButtonActivate.bind(this);
	private quickJoinButtonActivateListener = this.onQuickJoinButtonActivate.bind(this);
	private createGameButtonActivateListener = this.onCreateGameButtonActivate.bind(this);
	private joinButtonActivateListener = this.onJoinButtonActivate.bind(this);
	private reportButtonActivateListener = this.onReportButtonActivate.bind(this);
	private reportButtonFocusListener = this.onReportButtonFocus.bind(this);
	private resizeListener = this.onResize.bind(this);
	private profileAccountLoggedOutListener = this.onProfileAccountLoggedOut.bind(this);
	private activeDeviceTypeListener = this.onActiveDeviceTypeChanged.bind(this);
	private accountLoggedOutListener = this.onAccountLoggedOut.bind(this);

	private sortedGameList: MPGameListInfo[] = [];
	private selectedGameIndex: number = -1;
	private currentSortOption: { value: SortOptions, order: SortOrder } = { value: SortOptions.NONE, order: SortOrder.NONE };
	private refreshStartTimestamp: Date = new Date(0);
	private isInitialRefreshDone: boolean = false;
	private gameSetupRevision: number = 0;

	private profileHeader?: HTMLElement;
	private currentPanelOperation: PanelOperation = PanelOperation.None;
	private headerSpacings!: NodeListOf<HTMLElement>;
	private header!: HTMLElement;
	private subtitle!: HTMLElement;
	private gameCards: HTMLElement[] = [];
	private gameReportButtons: HTMLElement[] = [];
	private list!: HTMLElement;
	private listContainer!: HTMLElement;
	private listScrollable!: HTMLElement;
	private loadingContainer!: HTMLElement;
	private loadingAnimationContainer!: HTMLElement;
	private loadingDescription!: HTMLElement;
	private sortContainer!: HTMLElement;
	private sortOptions: NodeListOf<HTMLElement> | null = null;
	private selectorIndicator!: HTMLElement;
	private refreshButton!: HTMLElement;
	private joinCodeButton!: HTMLElement;
	private loadGameButton!: HTMLElement;
	private quickJoinButtonTop!: HTMLElement;
	private quickJoinButtonBot!: HTMLElement;
	private createGameButton!: HTMLElement;
	private joinButton!: HTMLElement;
	private backButton!: HTMLElement;

	constructor(root: ComponentRoot) {
		super(root);
		this.animateInType = this.animateOutType = AnchorType.RelativeToRight;
	}

	onInitialize(): void {
		super.onInitialize();

		this.Root.innerHTML = this.render();

		this.profileHeader = this.Root.querySelector(".mp-browser__profile-header") ?? undefined;
		this.headerSpacings = MustGetElements<HTMLElement>(".mp-browser__header-spacing", this.Root);
		this.header = MustGetElement(".mp-browser__header", this.Root);
		this.subtitle = MustGetElement(".mp-browser__subtitle", this.Root);
		this.list = MustGetElement(".mp-browser__list", this.Root);
		this.listContainer = MustGetElement(".mp-browser__list-container", this.Root);
		this.listScrollable = MustGetElement(".mp-browser__content-container-scroll", this.Root);
		this.loadingContainer = MustGetElement(".mp-browser__loading", this.Root);
		this.loadingAnimationContainer = MustGetElement(".mp-browser__loading-animation-container", this.Root);
		this.loadingDescription = MustGetElement(".mp-browser__loading__description", this.Root);
		this.refreshButton = MustGetElement(".mp_browser__refresh-button", this.Root);
		this.refreshButton.setAttribute("data-audio-group-ref", "audio-mp-browser");
		this.refreshButton.setAttribute("data-audio-activate-ref", "data-audio-refresh-activate");
		this.joinCodeButton = MustGetElement(".mp_browser__code-button", this.Root);
		this.loadGameButton = MustGetElement(".mp_browser__load-button", this.Root);
		this.quickJoinButtonTop = MustGetElement(".mp_browser__quick-button-top", this.Root);
		this.quickJoinButtonBot = MustGetElement(".mp_browser__quick-button-bot", this.Root);
		this.createGameButton = MustGetElement(".mp_browser__create-button", this.Root);
		this.joinButton = MustGetElement(".mp_browser__join-button", this.Root);
		this.backButton = MustGetElement(".mp-browser__back-button", this.Root);

		this.sortContainer = MustGetElement(".mp_browser__sort-container", this.Root);
		this.sortOptions = MustGetElements<HTMLElement>("fxs-activatable", this.sortContainer);
		this.selectorIndicator = MustGetElement(".mp_browser__selection-indicator", this.Root);

		this.createLoadingAnimation();

		//enableCloseSound is false intentionally
		this.enableCloseSound = true;
		this.Root.setAttribute("data-audio-group-ref", "audio-mp-browser");
	}

	onAttach() {
		super.onAttach();

		window.addEventListener(MultiplayerGameListQueryCompleteEventName, this.queryCompleteListener);
		window.addEventListener(MultiplayerGameListQueryDoneEventName, this.queryDoneListener);
		window.addEventListener(MultiplayerGameListQueryErrorEventName, this.queryErrorListener);
		window.addEventListener(MultiplayerMatchMakeCompleteEventName, this.matchmakeCompleteListener);
		window.addEventListener(MultiplayerMatchMakeFailEventName, this.matchmakeFailListener);
		window.addEventListener(MultiplayerJoinCompleteEventName, this.joinCompleteListener);
		window.addEventListener(MultiplayerJoinFailEventName, this.joinFailListener);
		window.addEventListener(MultiplayerCreateCompleteEventName, this.createCompleteListener);
		window.addEventListener(MultiplayerCreateFailEventName, this.createFailListener);
		window.addEventListener(MultiplayerCreateAttemptEventName, this.createAttemptListener);
		window.addEventListener(MultiplayerGameAbandonedEventName, this.gameAbandonedListener);
		window.addEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener);
		window.addEventListener('resize', this.resizeListener);
		this.Root.addEventListener('engine-input', this.engineInputListener);
		this.Root.addEventListener('navigate-input', this.navigateInputListener);
		engine.on("LobbyShutdownComplete", this.lobbyShutdownListener);
		engine.on("LogoutCompleted", this.accountLoggedOutListener);
		this.backButton.addEventListener("action-activate", this.backButtonListener);
		this.sortOptions?.forEach(elem => {
			elem.addEventListener("action-activate", this.filterButtonActivateListener);
			elem.addEventListener("focus", this.filterButtonFocusListener);
			elem.addEventListener("blur", this.filterButtonBlurListener);
		})
		this.profileHeader?.addEventListener(ProfileAccountLoggedOutEventName, this.profileAccountLoggedOutListener);
		this.refreshButton.addEventListener("action-activate", this.refreshButtonActivateListener);
		this.joinCodeButton.addEventListener("action-activate", this.joinCodeButtonActivateListener);
		this.loadGameButton.addEventListener("action-activate", this.loadGameButtonActivateListener);
		this.quickJoinButtonTop.addEventListener("action-activate", this.quickJoinButtonActivateListener);
		this.quickJoinButtonBot.addEventListener("action-activate", this.quickJoinButtonActivateListener);
		this.createGameButton.addEventListener("action-activate", this.createGameButtonActivateListener);
		this.joinButton.addEventListener("action-activate", this.joinButtonActivateListener);

		const serverType = Number.parseInt(this.Root.getAttribute("server-type") ?? `${ServerType.SERVER_TYPE_INTERNET}`) as ServerType;

		Network.canBrowseMPGames(true);

		MPBrowserModel.initGameList(serverType);

		this.refreshGameListFilters();

		this.updateHeader();
		this.updateSubtitle();
		this.updateProfileHeader();
		this.updateHeaderSpacing();
		this.updateQuickJoinButton();
	}

	onDetach(): void {
		this.Root.removeEventListener('engine-input', this.engineInputListener);
		this.Root.removeEventListener('navigate-input', this.navigateInputListener);
		window.removeEventListener(MultiplayerGameListQueryCompleteEventName, this.queryCompleteListener);
		window.removeEventListener(MultiplayerGameListQueryDoneEventName, this.queryDoneListener);
		window.removeEventListener(MultiplayerGameListQueryErrorEventName, this.queryErrorListener);
		window.removeEventListener(MultiplayerMatchMakeCompleteEventName, this.matchmakeCompleteListener);
		window.removeEventListener(MultiplayerMatchMakeFailEventName, this.matchmakeFailListener);
		window.removeEventListener(MultiplayerJoinCompleteEventName, this.joinCompleteListener);
		window.removeEventListener(MultiplayerJoinFailEventName, this.joinFailListener);
		window.removeEventListener(MultiplayerCreateCompleteEventName, this.createCompleteListener);
		window.removeEventListener(MultiplayerCreateFailEventName, this.createFailListener);
		window.removeEventListener(MultiplayerCreateAttemptEventName, this.createAttemptListener);
		window.removeEventListener(MultiplayerGameAbandonedEventName, this.gameAbandonedListener);
		window.removeEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceTypeListener);
		window.removeEventListener('resize', this.resizeListener);
		engine.off("LobbyShutdownComplete", this.lobbyShutdownListener);
		engine.off("LogoutCompleted", this.accountLoggedOutListener);

		super.onDetach();
	}

	onReceiveFocus() {
		super.onReceiveFocus();

		this.updateProfileHeader();
		this.focusGameList();
	}

	onLoseFocus() {
		NavTray.clear();
		this.updateProfileHeader();

		super.onLoseFocus();
	}

	onAttributeChanged(name: string, _oldValue: string | null, _newValue: string | null) {
		switch (name) {
			case "server-type":
				this.updateNavTray();
				this.updateHeader();

				// Reset the game configuration defaults but only if we're not already in a session (autoplays or joining a game thru an invite).
				if (!Network.isInSession) {
					const serverType = Number.parseInt(this.Root.getAttribute("server-type") ?? `${ServerType.SERVER_TYPE_INTERNET}`) as ServerType;
					Configuration.editGame()?.reset(serverTypeToGameModeType.get(serverType));
				}

				this.startQuery();
				break;
		}
	}

	private renderGameCards(): HTMLElement[] {
		return this.sortedGameList.map(({ serverNameDisplay, ruleSetName, mapDisplayName, gameSpeedName, numPlayers, maxPlayers, savedGame, liveEvent, disabledContent, mods, hostingPlatform, hostFriendID_Native, hostFriendID_T2GP, hostName_1P, hostName_2K }, index) => {
			const elem = document.createElement("mp-browser-chooser-item");
			elem.classList.add("min-h-8");
			elem.setAttribute("index", `${index}`);
			elem.setAttribute("tabindex", "-1");
			elem.setAttribute("select-highlight", "true");
			elem.setAttribute("data-audio-group-ref", "audio-mp-browser");
			elem.setAttribute("node", JSON.stringify({
				gameName: serverNameDisplay, // This is the processed name for displaying
				eventName: liveEvent ? "LOC_" + Online.LiveEvent.getCurrentLiveEvent() : "",
				ruleSet: ruleSetName,
				mapType: mapDisplayName,
				gameSpeed: gameSpeedName,
				disabledContent,
				mods,
				players: `${numPlayers}/${maxPlayers}`,
				savedGame,
				hostingPlatform: hostingPlatform,
				hostDisplayName: hostingPlatform == Network.getLocalHostingPlatform() ? hostName_1P : hostName_2K,
				hostFriendID_Native,
				hostFriendID_T2GP,
			}));
			return elem;
		});
	}

	private renderReportButtons(): HTMLElement[] {
		return this.sortedGameList.map(({ }, index) => {
			const elem = document.createElement("fxs-activatable");
			elem.addEventListener("action-activate", this.reportButtonActivateListener);
			elem.addEventListener("focus", this.reportButtonFocusListener);
			elem.classList.add("absolute", "w-8", "h-8", "-right-1", "hidden", "group");
			elem.setAttribute("tabindex", "-1");
			elem.setAttribute("index", `${index}`);

			const icon = document.createElement("div");
			icon.classList.add("absolute", "inset-0", "img-mp-report");

			const highlight = document.createElement("div");
			highlight.classList.add("absolute", "inset-0\\.5", "border-2", "border-secondary", "opacity-0", "group-focus\\:opacity-100", "group-hover\\:opacity-100", "transition-opacity");

			elem.appendChild(icon);
			elem.appendChild(highlight);

			return elem;
		})
	}

	private render() {
		const serverType = Number.parseInt(this.Root.getAttribute("server-type") ?? `${ServerType.SERVER_TYPE_INTERNET}`) as ServerType;
		return `
			<fxs-frame class="mp_browser__frame flex-1 flow-column w-full h-full">
				<div class="flow-row">
					<div class="mp-browser__header-spacing mr-1"></div>
					<div class="flex-auto flow-column items-center">
						<fxs-header class="mp-browser__header font-title-2xl uppercase text-secondary" filigree-style="none" title="${mapServerTypeToTitle[serverType]}"></fxs-header>
						<div class="mp-browser__subtitle font-title-xl text-accent-2"></div>
					</div>
					<div class="mp-browser__header-spacing ml-1 relative flow-row justify-end items-center">
						${Network.supportsSSO() ? '<profile-header class="mp-browser__profile-header flow-row flex-auto" hide-giftbox="true" profile-for="screen-mp-browser"></profile-header>' : ''}
					</div>
				</div>
				<div class="mp-browser__header-buttons__container flow-row mb-3 mt-1">
					<fxs-button class="mp_browser__refresh-button mr-4" caption="LOC_UI_MP_BROWSER_REFRESH_BUTTON" action-key="inline-nav-shell-previous" data-audio-group-ref="audio-mp-browser" data-audio-activate="mp-browser-refresh"></fxs-button>
					<fxs-button class="mp_browser__code-button mr-4" caption="LOC_UI_MP_BROWSER_JOIN_BUTTON" action-key="inline-nav-shell-next" data-audio-group-ref="audio-mp-browser"></fxs-button>
					<fxs-button class="mp_browser__quick-button-top" data-bind-class-toggle="opacity-0:{{g_NavTray.isTrayRequired}}" caption="LOC_UI_MP_BROWSER_QUICK_JOIN" data-audio-group-ref="audio-mp-browser"></fxs-button>
				</div>
				<div class="relative flex-1 flow-column">
					<fxs-vslot class="mp-browser__content-container relative flex-1 flow-column">
						<fxs-hslot class="mp_browser__sort-container relative flow-row mx-1 mb-2 img-prof-btn-bg">
							<div class="pointer-events-none absolute inset-0 -left-1\\.5">
								<div class="absolute img-prof-tab-end left-0 w-3\\.5 top-0 bottom-0"></div>
							</div>
							<div class="pointer-events-none absolute inset-0 -right-1\\.5">
								<div class="absolute img-prof-tab-end right-0 w-3\\.5 top-0 bottom-0"></div>
							</div>
							<div class="mx-2 flow-row flex-1">
								${sortOptions.map((sortOption, index) => `
									<div class="flow-row items-center ${(index < sortOptions.length - 1) ? 'justify-start' : 'justify-end'} ${mapSortOptionsToFlex[sortOption]}">
										<fxs-activatable value="${sortOption}" class="px-3 py-3 relative" tabindex="-1" data-audio-group-ref="audio-mp-browser" data-audio-activate="mp-browser-sort-clicked">
											<div class="mp-browser__filter-button-glow absolute inset-0 img-radial-glow hidden"></div>
											<div class="mp-browser__filter-button-text uppercase text-accent-3 font-title-base font-fit-shrink whitespace-nowrap truncate" style="coh-font-fit-min-size:12px;">${Locale.compose(mapSortOptionsToTitle[sortOption])}</div>
										</fxs-activatable>
									</div>
								`).join("")}
							</div>
							<div class="absolute bottom-0 left-0 img-tab-selection-indicator bg-no-repeat bg-center min-h-6 bg-contain mp_browser__selection-indicator transition-left duration-150"></div>
						</fxs-hslot>
						<fxs-vslot class="mp-browser__list-container flex-1">
							<fxs-scrollable class="mp-browser__content-container-scroll flex-auto" handle-gamepad-pan="true">
								<div class="mp-browser__list mx-3"></div>
							</fxs-scrollable>
						</fxs-vslot>
					</fxs-vslot>
					<div class="mp-browser__loading pointer-events-none absolute inset-0 flow-column justify-center items-center transition-opacity opacity-0" tabindex="-1">
						<div class="absolute -inset-y-1 -inset-x-4 bg-accent-6 opacity-45" style="border-radius: ${Layout.pixels(4)};"></div>
						<div class="mp-browser__loading-animation-container relative inset-0 flow-row justify-center items-center"></div>
						<div class="mp-browser__loading__description font-body text-base text-center text-accent-2 mt-4 z-1"></div>
					</div>
				</div>
				<div class="flow-row justify-between items-end" data-bind-class-toggle="opacity-0:{{g_NavTray.isTrayRequired}};h-6:{{g_NavTray.isTrayRequired}}">
					<div class="flow-row">
						<fxs-button class="mp-browser__back-button mr-4" caption="LOC_GENERIC_BACK" data-audio-group-ref="audio-mp-browser" data-audio-activate="mp-browser-back"></fxs-button>
						<fxs-button class="mp_browser__load-button mr-4" caption="LOC_UI_MP_BROWSER_LOAD_GAME" data-audio-group-ref="audio-mp-browser" data-audio-activate="mp-browser-load"></fxs-button>
						<fxs-button class="mp_browser__quick-button-bot mr-4" caption="LOC_UI_MP_BROWSER_QUICK_JOIN" data-audio-group-ref="audio-mp-browser" data-audio-activate="mp-browser-quick-join"></fxs-button>
						<fxs-button class="mp_browser__create-button" caption="LOC_UI_MP_BROWSER_CREATE_GAME" data-audio-group-ref="audio-mp-browser" data-audio-activate="mp-browser-create-game"></fxs-button>
					</div>
					<div>
						<fxs-hero-button class="mp_browser__join-button" caption="LOC_UI_MP_BROWSER_JOIN_GAME" data-audio-group-ref="audio-mp-browser" data-audio-activate-ref="data-audio-mp-join"></fxs-hero-button>
					</div>
				</div>
			</fxs-frame>
		`
	}

	private isScreenSmallMode(): boolean {
		return window.innerHeight <= Layout.pixelsToScreenPixels(this.SMALL_SCREEN_MODE_MAX_HEIGHT) || window.innerWidth <= Layout.pixelsToScreenPixels(this.SMALL_SCREEN_MODE_MAX_WIDTH)
	}

	private onQueryDone(_event: MultiplayerGameListQueryDoneEvent) {

	}

	private onQueryComplete(_event: MultiplayerGameListQueryCompleteEvent) {
		const queryCompleteTimestamp = new Date();
		const bufferMs = this.REFRESH_BUFFER_TIME_MS - (queryCompleteTimestamp.getTime() - this.refreshStartTimestamp.getTime());
		setTimeout(() => {
			this.currentPanelOperation = PanelOperation.None;
			this.isInitialRefreshDone = true;
			this.sortGames();
			this.updateGameList();
			this.updateLoadingContainer();
			this.updateRefreshButton();
			this.updateJoinCodeButton();
			this.updateLoadGameButton();
			this.updateLoadButton();
			this.updateQuickJoinButton();
			this.updateCreateGameButton();
			this.updateBackButton();
			this.updateJoinButton();
			waitForLayout(() => {
				this.focusGameList();
			});
		}, bufferMs > 0 ? bufferMs : 0);
	}

	private onQueryError({ detail: { data } }: MultiplayerGameListQueryErrorEvent) {
		const errorType: GameListUpdateType = data;
		const updateErrorStr: string | undefined = gameListUpdateTypeToErrorBody.get(errorType);
		const body: string = (updateErrorStr) ? updateErrorStr : "LOC_GAME_LIST_ERROR_GENERAL";
		DialogBoxManager.createDialog_Confirm({
			body,
			title: "LOC_GAME_LIST_ERROR_TITLE",
			canClose: false,
		})
	}

	private onMatchmakeComplete(_event: MultiplayerMatchMakeCompleteEvent) {
		this.currentPanelOperation = PanelOperation.Join;
		this.updateByCurrentPanelOperationChange();
	}

	private onMatchmakeFail(_event: MultiplayerMatchMakeFailEvent) {
		this.currentPanelOperation = PanelOperation.None;
		this.updateByCurrentPanelOperationChange();
	}

	private onJoinComplete(_event: MultiplayerJoinCompleteEvent) {
		this.currentPanelOperation = PanelOperation.None;
		this.updateByCurrentPanelOperationChange();
	}

	private onJoinFail(_event: MultiplayerJoinFailEvent) {
		this.currentPanelOperation = PanelOperation.None;
		this.updateByCurrentPanelOperationChange();
	}

	private onCreateComplete(_event: MultiplayerCreateCompleteEvent) {
		this.currentPanelOperation = PanelOperation.Join;
		this.updateByCurrentPanelOperationChange();
	}

	private onCreateFail(_event: MultiplayerCreateFailEvent) {
		this.currentPanelOperation = PanelOperation.None;
		this.updateByCurrentPanelOperationChange();
	}

	private onCreateAttempt(_event: MultiplayerCreateAttemptEvent) {
		this.currentPanelOperation = PanelOperation.Create;
		this.updateByCurrentPanelOperationChange();
	}

	private onGameAbandoned(_event: MultiplayerGameAbandonedEvent) {
		this.currentPanelOperation = PanelOperation.None;
		this.updateByCurrentPanelOperationChange();
	}

	private onLobbyShutdown(_event: CustomEvent) {
		if (this.isInitialRefreshDone) {
			this.currentPanelOperation = PanelOperation.None;
		}
		this.startQuery();
	}

	private onEngineInput(inputEvent: InputEngineEvent) {
		if (this.handleEngineInput(inputEvent)) {
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		}
	}

	private handleEngineInput(inputEvent: InputEngineEvent) {
		switch (inputEvent.detail.name) {
			case 'scroll-pan':
				this.listScrollable.dispatchEvent(InputEngineEvent.CreateNewEvent(inputEvent));
				return false;
		}
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return false;
		}

		switch (inputEvent.detail.name) {
			case 'cancel':
			case 'keyboard-escape':
				this.onBack();
				return true;
			case 'shell-action-1':
				const serverType = Number.parseInt(this.Root.getAttribute("server-type") ?? `${ServerType.SERVER_TYPE_INTERNET}`) as ServerType;
				if (serverType == ServerType.SERVER_TYPE_INTERNET) {
					this.onQuickJoinButtonActivate();
				}
				return true;
			case 'shell-action-2':
				this.onLoadGameButtonActivate();
				return true;
			case 'shell-action-3':
				this.onCreateGameButtonActivate();
				return true;
		}
		return false;
	}

	onNavigateInput(navigationEvent: NavigateInputEvent) {
		if (this.handleNavigation(navigationEvent)) {
			navigationEvent.preventDefault();
			navigationEvent.stopImmediatePropagation();
		}
	}

	/**
	 * @returns true if still live, false if input should stop.
	 */
	handleNavigation(navigationEvent: NavigateInputEvent) {
		const direction = navigationEvent.getDirection();
		switch (direction) {
			case InputNavigationAction.SHELL_PREVIOUS:
				this.onRefreshButtonActivate();
				return true;
			case InputNavigationAction.SHELL_NEXT:
				this.onJoinCodeButtonActivate();
				return true;
		}
		return false;
	}

	private onLoadGameButtonActivate() {
		if (this.currentPanelOperation != PanelOperation.None) { return; }
		const serverType = Number.parseInt(this.Root.getAttribute("server-type") ?? `${ServerType.SERVER_TYPE_INTERNET}`) as ServerType;
		ContextManager.push("screen-save-load", { singleton: true, createMouseGuard: true, attributes: { "menu-type": "load", "server-type": serverType, "save-type": SaveTypes.NETWORK_MULTIPLAYER } });
	}

	private onCreateGameButtonActivate() {
		if (this.currentPanelOperation != PanelOperation.None) { return; }
		ContextManager.push('screen-mp-create-game', { singleton: true, createMouseGuard: true });
		window.dispatchEvent(new GameCreatorOpenedEvent());
	}

	private onRefreshButtonActivate() {
		if (this.currentPanelOperation != PanelOperation.None) { return; }
		this.refreshStartTimestamp = new Date();
		this.startQuery();
	}

	private getQuickJoinItemsData() {
		return GameSetup.findGameParameter("Age")?.domain.possibleValues?.map(({ value, name }) => ({
			label: Locale.compose(GameSetup.resolveString(name) ?? ""),
			type: value?.toString() ?? "",
		}));
	}

	private onQuickJoinButtonActivate() {
		if (this.currentPanelOperation != PanelOperation.None) { return; }
		const serverType = Number.parseInt(this.Root.getAttribute("server-type") ?? `${ServerType.SERVER_TYPE_INTERNET}`) as ServerType;
		Configuration.editGame()?.reset(serverTypeToGameModeType.get(serverType));
		this.gameSetupRevision = GameSetup.currentRevision;
		this.currentPanelOperation = PanelOperation.CreateDialog;
		DialogBoxManager.createDialog_MultiOption({
			extensions: { dropdowns: [{ id: 'mp-quick-join__option', dropdownItems: JSON.stringify(this.getQuickJoinItemsData()), label: "LOC_UI_MP_QUICK_JOIN_RULE_AGE" }] },
			title: Locale.compose("LOC_UI_MP_QUICK_JOIN_SUBTITLE"),
			canClose: false,
			options: [
				{
					actions: ["sys-menu"],
					label: "LOC_GENERIC_CONFIRM",
					valueCallback: (_id: string, newValue: string) => {
						const selectedOptionIndex = Number.parseInt(newValue);
						const selectedGameType = this.getQuickJoinItemsData()?.[selectedOptionIndex]?.type;
						if (selectedGameType) {
							if (!this.startOperation(PanelOperation.Search)) { return; }
							setTimeout(() => {
								MultiplayerShellManager.onAutomatch(selectedGameType);
							}, 200);
						}
					}
				},
				{
					actions: ["cancel", "keyboard-escape"],
					label: "LOC_GENERIC_CANCEL",
				}
			]
		});
		waitUntilValue(() => ContextManager.getTarget("screen-dialog-box") ?? null).then(elem => {
			const dropdown = elem.querySelector("#mp-quick-join__option");
			this.currentPanelOperation = PanelOperation.None;
			const checkGameSetup: any = () => {
				if (elem?.isConnected) {
					if (GameSetup.currentRevision != this.gameSetupRevision) {
						dropdown?.setAttribute("dropdown-items", JSON.stringify(this.getQuickJoinItemsData()));
						this.gameSetupRevision = GameSetup.currentRevision;
					}
					window.requestAnimationFrame(checkGameSetup);
				}
			};
			// TODO: replace this with an event from system on game setup changes (also to do in mp-create-game)
			window.requestAnimationFrame(checkGameSetup); // we need to update the age options at every game setup revision changes (similar to mp-create-game)
		});
	}

	private onJoinCodeButtonActivate() {
		if (this.currentPanelOperation != PanelOperation.None) { return; }
		this.currentPanelOperation = PanelOperation.CreateDialog;
		DialogBoxManager.createDialog_MultiOption({
			extensions: { textboxes: [{ id: 'mp-quick-join__code-textbox', placeholder: Locale.compose('LOC_UI_MP_JOIN_CODE_PLACEHOLDER'), maxLength: `${Network.joinCodeMaxLength}`, caseMode: "uppercase", editStopClose: true }] },
			title: Locale.compose("LOC_UI_MP_JOIN_CODE_TITLE"),
			canClose: false,
			options: [
				{
					actions: ["sys-menu", "keyboard-enter"],
					label: "LOC_GENERIC_CONFIRM",
					disabled: true,
					valueChangeCallback: (_id: string, newValue: string, option?: HTMLElement) => {
						option?.setAttribute("disabled", newValue ? "false" : "true");
					},
					valueCallback: (_id: string, newValue: string) => {
						if (newValue != "") {
							const serverType = Number.parseInt(this.Root.getAttribute("server-type") ?? `${ServerType.SERVER_TYPE_INTERNET}`) as ServerType;
							if (!this.startOperation(PanelOperation.Join)) { return; }
							setTimeout(() => {
								Network.joinMultiplayerGame(newValue ?? "", serverType);
							}, 200);
						}
					}
				},
				{
					actions: ["cancel", "keyboard-escape"],
					label: "LOC_GENERIC_CANCEL",
				}
			]
		});
		waitUntilValue(() => ContextManager.getTarget("screen-dialog-box") ?? null).then(elem => {
			if (!ActionHandler.isGamepadActive) {
				const textbox = elem.querySelector("fxs-textbox");
				const input = textbox?.querySelector("input");
				input?.focus();
			}

			this.currentPanelOperation = PanelOperation.None;
		});
	}

	private onJoinButtonActivate() {
		const { roomID } = MPBrowserModel.GameList[this.selectedGameIndex];
		Network.joinMultiplayerRoom(roomID);
	}

	private onReportButtonActivate({ target }: ActionActivateEvent) {
		const index = parseInt((target as HTMLElement).getAttribute("index") ?? "-1");
		if (index == -1) { return; }
		const { roomID = -1, hostFriendID_T2GP } = MPBrowserModel.GameList[index] ?? {};
		DialogBoxManager.createDialog_ConfirmCancel({
			title: "LOC_UI_MP_REPORT_TITLE",
			body: "LOC_UI_MP_REPORT_BODY",
			canClose: false,
			callback: (eAction: DialogBoxAction) => {
				if (eAction == DialogBoxAction.Confirm) {
					this.createReportDialog(roomID, hostFriendID_T2GP)
				}
			}
		})
	}

	private createReportDialog(roomId: number, userId: string) {
		ContextManager.push("screen-mp-report", { singleton: true, createMouseGuard: true, attributes: { blackOut: true, reportRoomId: roomId, reportUserId: userId, reportReason: "FoulLanguage" } });
	}

	private onReportButtonFocus() {
		this.updateCardSelection();
		this.updateReportButtons();
		this.updateNavTray();
	}

	private onGameCardFocus({ target }: FocusEvent) {
		this.handleGameCardFocus(target as HTMLElement);
	}

	private handleGameCardFocus(target: HTMLElement) {
		this.selectedGameIndex = parseInt((target).getAttribute("index") ?? '-1');
		this.updateReportButtons();
		this.updateCardSelection();
		this.updateJoinButton();
		this.updateNavTray();
	}

	private onGameCardActivate({ target }: ActionActivateEvent) {
		const isGrayed = (target as HTMLElement).getAttribute("grayed") == "true";
		if (ActionHandler.isGamepadActive && !isGrayed) {
			this.onJoinButtonActivate();
		} else {
			this.handleGameCardFocus(target as HTMLElement);
			FocusManager.setFocus(target as HTMLElement);
		}
	}

	private onGameCardConfirm({ target }: ActionConfirmEvent) {
		this.selectedGameIndex = parseInt(((target) as HTMLElement).getAttribute("index") ?? '-1');
		this.onJoinButtonActivate();
	}

	private onFilterButtonActivate({ target }: ActionActivateEvent) {
		const value = (parseInt((target as HTMLElement).getAttribute("value") ?? "0")) as SortOptions;
		const { value: currentValue, order: currentOrder } = this.currentSortOption;
		this.currentSortOption = {
			value,
			order: currentValue == value ? (currentOrder * 2 || 1) % (SortOrder.DESC * 2) : SortOrder.ASC,
		}
		this.updateSortOptions();
		this.updateSelectorIndicator();
		this.sortGames();
		this.updateGameList();
	}

	private onFilterButtonFocus({ target }: FocusEvent) {
		if (!ActionHandler.isGamepadActive) {
			return;
		}
		this.selectedGameIndex = -1;
		this.updateNavTray();
		this.updateCardSelection();
		this.updateReportButtons()
		this.updateJoinButton();
		(target as HTMLElement).querySelector(".mp-browser__filter-button-glow")?.classList.remove("hidden");
		const text = (target as HTMLElement).querySelector(".mp-browser__filter-button-text");
		text?.classList.remove("text-accent-3");
		text?.classList.add("text-accent-1");
	}

	private onFilterButtonBlur({ target }: FocusEvent) {
		(target as HTMLElement).querySelector(".mp-browser__filter-button-glow")?.classList.add("hidden");
		const text = (target as HTMLElement).querySelector(".mp-browser__filter-button-text");
		text?.classList.remove("text-accent-1");
		text?.classList.add("text-accent-3");
	}

	private onResize() {
		this.updateQuickJoinButton();
		this.updateHeader();
		this.updateHeaderSpacing();
	}

	private onProfileAccountLoggedOut(_event: ProfileAccountLoggedOutEvent) {
		this.close();
	}

	private onActiveDeviceTypeChanged() {
		this.updateCardSelection();
		this.updateReportButtons();
	}

	private refreshGameListFilters() {
		Network.clearGameListFilters();

		if (Online.LiveEvent.getLiveEventGameFlag()) {
			Network.addGameListFilter("LiveEvent", Online.LiveEvent.getActiveLiveEventKey(), BrowserFilterType.BROWSER_FILTER_EQUAL);
		}

		if (!Network.getLocalCrossPlay()) {
			Network.addGameListFilter("CrossPlay", "0", BrowserFilterType.BROWSER_FILTER_EQUAL);
			Network.addGameListFilter("HostingPlatform", Network.getLocalHostingPlatform().toString(), BrowserFilterType.BROWSER_FILTER_EQUAL);
		}

		const parameter: GameSetupParameter | null = GameSetup.findGameParameter("MapSize");

		if (parameter?.domain.possibleValues) {

			let mapSizeFilter = "";
			parameter?.domain.possibleValues.filter(value => mapSizeFilter += (mapSizeFilter == "" ? "" : ",") + GameSetup.resolveString(value.name));
			Network.addGameListFilter("MapSize", mapSizeFilter, BrowserFilterType.BROWSER_FILTER_IS_IN)
		}
	}

	private updateSortOptions() {
		const { value, order } = this.currentSortOption;
		Array.from(this.sortOptions ?? []).forEach(sortOption => {
			const isCurrentValue = (parseInt(sortOption.getAttribute("value") ?? "0")) == value;
			sortOption?.classList.toggle("text-accent-3", !isCurrentValue || order == SortOrder.NONE);
			sortOption?.classList.toggle("text-secondary", isCurrentValue && order != SortOrder.NONE);
		});
	}

	private updateSelectorIndicator() {
		const { value, order } = this.currentSortOption;
		const elem = Array.from(this.sortOptions ?? []).find(sortOption => parseInt(sortOption.getAttribute("value") ?? "0") == value);

		const rootRect = this.sortContainer.getBoundingClientRect();
		const tabRect = elem?.getBoundingClientRect();

		const lineTarget = (tabRect?.x ?? 0) - rootRect.x;

		this.selectorIndicator.style.setProperty('left', `${(lineTarget) / rootRect.width * 100}%`);
		this.selectorIndicator.style.setProperty('width', `${tabRect?.width ?? 0}px`);
		this.selectorIndicator.classList.toggle("opacity-0", order == SortOrder.NONE);
	}

	private updateByCurrentPanelOperationChange() {
		this.updateLoadingContainer();
		this.updateLoadingDescription();
		this.updateRefreshButton();
		this.updateJoinCodeButton();
		this.updateLoadButton();
		this.updateQuickJoinButton();
		this.updateLoadGameButton();
		this.updateCreateGameButton();
		this.updateJoinButton();
		this.updateBackButton();
		this.updateGameCards();
		this.updateReportButtons()
	}

	private updateLoadingContainer() {
		this.loadingContainer?.classList.toggle("opacity-100", this.currentPanelOperation == PanelOperation.Query);
		this.loadingContainer?.classList.toggle("opacity-0", this.currentPanelOperation != PanelOperation.Query);
	}

	private updateLoadingDescription() {
		switch (this.currentPanelOperation) {
			case PanelOperation.Query:
				this.loadingDescription.textContent = Locale.compose("LOC_UI_MP_BROWSER_REFRESH_MESSAGE");
				break;
			default:
				break;
		}
	}

	private updateNavTray() {
		waitForLayout(() => {

			if (ContextManager.getCurrentTarget() != this.Root) {
				return;
			}

			NavTray.clear();
			NavTray.addOrUpdateGenericBack();

			if (!ActionHandler.isGamepadActive) {
				return;
			}

			const serverType = Number.parseInt(this.Root.getAttribute("server-type") ?? `${ServerType.SERVER_TYPE_INTERNET}`) as ServerType;

			if (serverType == ServerType.SERVER_TYPE_INTERNET) {
				NavTray.addOrUpdateShellAction1("LOC_UI_MP_BROWSER_QUICK_JOIN_NAVTRAY");
			}
			NavTray.addOrUpdateShellAction2("LOC_UI_MP_BROWSER_LOAD_NAVTRAY");
			NavTray.addOrUpdateShellAction3("LOC_UI_MP_BROWSER_CREATE_NAVTRAY");
		});
	}

	private updateRefreshButton() {
		this.refreshButton.setAttribute("disabled", this.currentPanelOperation != PanelOperation.None ? "true" : "false");
	}

	private updateJoinCodeButton() {
		this.joinCodeButton.setAttribute("disabled", this.currentPanelOperation != PanelOperation.None ? "true" : "false");
	}

	private updateLoadButton() {
		this.loadGameButton.setAttribute("disabled", this.currentPanelOperation != PanelOperation.None ? "true" : "false");
	}

	private updateQuickJoinButton() {
		const serverType = Number.parseInt(this.Root.getAttribute("server-type") ?? `${ServerType.SERVER_TYPE_INTERNET}`) as ServerType;
		this.quickJoinButtonTop.setAttribute("disabled", this.currentPanelOperation != PanelOperation.None ? "true" : "false");
		this.quickJoinButtonTop.classList.toggle("hidden", serverType !== ServerType.SERVER_TYPE_INTERNET || !this.isScreenSmallMode());
		this.quickJoinButtonBot.setAttribute("disabled", this.currentPanelOperation != PanelOperation.None ? "true" : "false");
		this.quickJoinButtonBot.classList.toggle("hidden", serverType !== ServerType.SERVER_TYPE_INTERNET || this.isScreenSmallMode());
	}

	private updateLoadGameButton() {
		this.loadGameButton.setAttribute("disabled", this.currentPanelOperation != PanelOperation.None ? "true" : "false");
	}

	private updateCreateGameButton() {
		this.createGameButton.setAttribute("disabled", this.currentPanelOperation != PanelOperation.None ? "true" : "false");
	}

	private updateBackButton() {
		this.backButton.setAttribute("disabled", [PanelOperation.None, PanelOperation.Query].includes(this.currentPanelOperation) ? "false" : "true");
	}

	private updateJoinButton() {
		let isSelectedGameGrayed = false;
		if (this.selectedGameIndex > -1) {
			isSelectedGameGrayed = this.gameCards[this.selectedGameIndex]?.getAttribute("grayed") == "true";
		}
		this.joinButton.setAttribute("disabled", (this.currentPanelOperation != PanelOperation.None || this.selectedGameIndex == -1 || isSelectedGameGrayed) ? "true" : "false");
	}

	private updateHeaderSpacing() {
		this.headerSpacings.forEach(headerSpacing => {
			headerSpacing.classList.toggle("w-84", this.isScreenSmallMode());
			headerSpacing.classList.toggle("w-128", !this.isScreenSmallMode());
		});
	}

	private updateHeader() {
		const serverType = Number.parseInt(this.Root.getAttribute("server-type") ?? `${ServerType.SERVER_TYPE_INTERNET}`) as ServerType;
		this.header.setAttribute("title", !this.isScreenSmallMode() ? mapServerTypeToTitle[serverType] : "LOC_UI_MP_BROWSER_TITLE");
	}

	private updateSubtitle() {
		const isLiveEvent = Online.LiveEvent.getLiveEventGameFlag();
		const event = "LOC_" + Online.LiveEvent.getCurrentLiveEvent();
		this.subtitle.classList.toggle("invisible", !isLiveEvent);
		this.subtitle.setAttribute("data-l10n-id", event);
	}

	private updateGameList() {
		this.gameCards = this.renderGameCards();
		this.gameReportButtons = this.renderReportButtons();
		this.updateGameCards();
		this.updateReportButtons();
		this.list.innerHTML = "";
		this.gameCards.forEach((gameCard, index) => {
			const row = document.createElement("fxs-hslot");
			row.classList.toggle("mb-3", index < MPBrowserModel.GameList.length - 1);
			row.classList.add("items-center");
			row.setAttribute("ignore-prior-focus", "true");
			row.appendChild(gameCard);
			row.appendChild(this.gameReportButtons[index]);
			this.list.appendChild(row);
		});
	}

	private updateGameCards() {
		this.gameCards?.forEach(gameCard => {
			gameCard.setAttribute("disabled", this.currentPanelOperation != PanelOperation.None ? "true" : "false");
			gameCard.addEventListener("action-activate", this.gameCardActivateListener);
			gameCard.addEventListener(ActionConfirmEventName, this.gameCardConfirmListener);
			gameCard.addEventListener("focusin", this.gameCardFocusListener);
		});
		this.updateCardSelection();
		this.updateReportButtons();
	}

	private updateCardSelection() {
		const serverType = Number.parseInt(this.Root.getAttribute("server-type") ?? `${ServerType.SERVER_TYPE_INTERNET}`) as ServerType;
		this.gameCards?.forEach(gameCard => {
			gameCard.setAttribute("selected", (FocusManager.getFocus() == gameCard || !ActionHandler.isGamepadActive) && this.selectedGameIndex == Number.parseInt(gameCard.getAttribute("index") ?? "") ? "true" : "false");
			gameCard.setAttribute("show-report", this.selectedGameIndex == Number.parseInt(gameCard.getAttribute("index") ?? "") && serverType == ServerType.SERVER_TYPE_INTERNET ? "true" : "false");
		});
	}

	private updateReportButtons() {
		const serverType = Number.parseInt(this.Root.getAttribute("server-type") ?? `${ServerType.SERVER_TYPE_INTERNET}`) as ServerType;
		this.gameReportButtons?.forEach(reportButton => {
			reportButton.classList.toggle("hidden", serverType != ServerType.SERVER_TYPE_INTERNET || this.selectedGameIndex != Number.parseInt(reportButton.getAttribute("index") ?? ""));
			reportButton.setAttribute("disabled", this.currentPanelOperation != PanelOperation.None ? "true" : "false");
		})
	}

	private updateProfileHeader() {
		waitForLayout(() => {
			const currentTarget = ContextManager.getCurrentTarget();
			if (currentTarget == this.Root) {
				this.profileHeader?.setAttribute("disabled", "false");
			} else {
				this.profileHeader?.setAttribute("disabled", "true");
			}
		});
	}

	private focusGameList() {
		if (ContextManager.getCurrentTarget() != this.Root) {
			return;
		}

		if (this.sortedGameList.length) {
			FocusManager.setFocus(this.listContainer);
		} else {
			FocusManager.setFocus(this.sortContainer);
		}
		if (!ActionHandler.isGamepadActive && this.sortedGameList.length) {
			this.selectedGameIndex = 0;
			this.updateCardSelection();
			this.updateReportButtons();
			this.updateJoinButton();
		}
	}

	private startOperation(operation: PanelOperation): boolean {
		if (![PanelOperation.None].includes(this.currentPanelOperation)) { return false; }
		if (operation == PanelOperation.Query) {
			this.playSound("data-audio-start-query");
		}
		this.currentPanelOperation = operation;
		this.updateByCurrentPanelOperationChange();
		return true;
	}

	private startQuery() {
		if (!this.startOperation(PanelOperation.Query)) { return; }
		const serverType = Number.parseInt(this.Root.getAttribute("server-type") ?? `${ServerType.SERVER_TYPE_INTERNET}`) as ServerType;
		MPBrowserModel.initGameList(serverType);
		this.refreshGameListFilters();
		MPBrowserModel.refreshGameList();
		if (ContextManager.getCurrentTarget() == this.Root) {
			FocusManager.setFocus(this.loadingContainer!);
			this.updateNavTray();
		}
	}

	private sortGames() {
		const { value, order } = this.currentSortOption;
		this.sortedGameList = [...MPBrowserModel.GameList];
		this.sortedGameList.sort((a, b) => {
			const first = order == SortOrder.ASC ? a : b;
			const second = order == SortOrder.ASC ? b : a;
			switch (value) {
				case SortOptions.GAME_NAME:
					// Sort based on the original name, so all the processed servers won't be put altogether, since they are pure UGC, no need to call Locale.compose
					return order != SortOrder.NONE ? first.serverNameOriginal.localeCompare(second.serverNameOriginal) : 0;
				case SortOptions.RULE_SET:
					return order != SortOrder.NONE ? Locale.compose(first.ruleSetName).localeCompare(Locale.compose(second.ruleSetName)) : 0;
				case SortOptions.MAP_TYPE:
					return order != SortOrder.NONE ? Locale.compose(first.mapDisplayName).localeCompare(Locale.compose(second.mapDisplayName)) : 0;
				case SortOptions.GAME_SPEED:
					return order != SortOrder.NONE ? first.gameSpeed - second.gameSpeed : 0;
				case SortOptions.CONTENT:
					return order != SortOrder.NONE ? (first.mods.length * 100) - (second.mods.length * 100) : 0;
				case SortOptions.PLAYERS:
					return order != SortOrder.NONE ? second.numPlayers - first.numPlayers : 0;
				default:
					return 0;
			}
		});
	}

	private onAccountLoggedOut() {
		this.onBack();
	}

	private onBack(): void {
		engine.off("LobbyShutdownComplete", this.lobbyShutdownListener);
		Network.resetNetworkCommunication();
		Network.onExitPremium();

		this.close();
	}

	public close(): void {
		// Create, Join & Search have their own dialog that you can cancel anytime (and are created by mp-shell-logic.ts)
		if (![PanelOperation.None, PanelOperation.Query].includes(this.currentPanelOperation)) { return; }
		// clear the live event flag as effectively cancelling it
		if (Online.LiveEvent.getLiveEventGameFlag()) {
			Online.LiveEvent.clearLiveEventGameFlag();
		}
		Network.clearGameListFilters();
		window.dispatchEvent(new MainMenuReturnEvent());

		super.close();
	}

	private createLoadingAnimation() {
		const flipbook = document.createElement("fxs-flipbook");
		const atlas: FlipbookFrame[] = [
			{
				src: 'fs://game/hourglasses01.png',
				spriteWidth: 128,
				spriteHeight: 128,
				size: 512
			},
			{
				src: 'fs://game/hourglasses02.png',
				spriteWidth: 128,
				spriteHeight: 128,
				size: 512
			},
			{
				src: 'fs://game/hourglasses03.png',
				spriteWidth: 128,
				spriteHeight: 128,
				size: 1024,
				nFrames: 13
			}
		]
		const flipbookDefinition: FlipbookDefinition = {
			fps: 30,
			preload: true,
			atlas: atlas
		};
		flipbook.setAttribute("data-flipbook-definition", JSON.stringify(flipbookDefinition));
		this.loadingAnimationContainer.appendChild(flipbook);
	}
}

Controls.define('screen-mp-browser', {
	createInstance: PanelMPBrowser,
	description: 'games browser for multiplayer.',
	classNames: ['mp-browser', 'fullscreen', 'flow-row', 'justify-center', 'items-center', 'flex-1', 'trigger-nav-help'],
	styles: ['fs://game/core/ui/shell/mp-browser/mp-browser-new.css'],
	attributes: [
		{
			name: 'server-type'
		},
	],
	tabIndex: -1
});
