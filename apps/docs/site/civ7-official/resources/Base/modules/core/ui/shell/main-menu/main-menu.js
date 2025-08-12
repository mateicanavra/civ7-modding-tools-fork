/**
 * @file main-menu.ts
 * @copyright 2020-2025, Firaxis Games
 */
import { Audio } from '/core/ui/audio-base/audio-support.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
import DialogManager, { DialogBoxAction } from '/core/ui/dialog-box/manager-dialog-box.js';
import { DisplayQueueManager } from '/core/ui/context-manager/display-queue-manager.js';
import ActionHandler, { ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { InputEngineEventName } from '/core/ui/input/input-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import { ScreenCreditsOpenedEventName, ScreenCreditsClosedEventName } from '/core/ui/shell/credits/screen-credits.js';
import { EventsScreenGoMultiPlayerEventName, EventsScreenGoSinglePlayerEventName, EventsScreenLoadEventName, EventsScreenContinueEventName } from '/core/ui/shell/events/screen-events.js';
import { LegalDocsAcceptedEventName } from '/core/ui/shell/mp-legal/mp-legal.js';
import MultiplayerShellManager from '/core/ui/shell/mp-shell-logic/mp-shell-logic.js';
import { GameCreatorOpenedEventName, GameCreatorClosedEventName, StartCampaignEventName, SendCampaignSetupTelemetryEventName } from '/core/ui/events/shell-events.js';
import * as Animations from '/core/ui/utilities/animations.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import { NetworkUtilities } from '/core/ui/utilities/utilities-network.js';
import SaveLoadData, { QueryCompleteEventName } from '/core/ui/save-load/model-save-load.js';
import { SaveLoadClosedEventName, fixupNNBSP } from '/core/ui/save-load/screen-save-load.js';
import { getLeaderData } from '/core/ui/shell/create-panels/leader-select-model.js';
import { getPlayerCardInfo, updatePlayerProfile } from '/core/ui/utilities/utilities-liveops.js';
import { ProfileTabType } from '/core/ui/profile-page/screen-profile-page.js';
import { EditorCalibrateHDRClosedEventName, EditorCalibrateHDROpenedEventName } from '/core/ui/options/editors/index.js';
import { displayRequestUniqueId } from '/core/ui/context-manager/display-handler.js';
import { MainMenuReturnEventName, SendCampaignSetupTelemetryEvent } from '/core/ui/events/shell-events.js';
import { Focus } from '/core/ui/input/focus-support.js';
import { LegalDocsPlacementAcceptName } from '/core/ui/shell/mp-legal/mp-legal.js';
import { giftboxButtonName } from '/core/ui/profile-header/profile-header.js';
import { ActionActivateEventName } from '/core/ui/components/fxs-activatable.js';
import { GetCivilizationData } from '/core/ui/shell/create-panels/age-civ-select-model.js';
var CarouselActionTypes;
(function (CarouselActionTypes) {
    CarouselActionTypes[CarouselActionTypes["NO_ACTION"] = 0] = "NO_ACTION";
    CarouselActionTypes[CarouselActionTypes["PROCESS_PROMO"] = 1] = "PROCESS_PROMO";
})(CarouselActionTypes || (CarouselActionTypes = {}));
/**
 * NOTE: Used to distinguish starting the game from the Events panel or directly from Create Game/Multiplayer
 */
export let isLiveEventGame = false;
const accountDialogId = displayRequestUniqueId();
const getKickDialogId = displayRequestUniqueId();
const bForceShowPromoLoadingSpinner = false; // PROMO_TODO: remove this when promo loading spinner is fully implemented by UI.
/**
 * The main menu
 */
class MainMenu extends Component {
    constructor(root) {
        super(root);
        this.carouselSliderId = -1;
        this.engineInputListener = this.onEngineInput.bind(this);
        this.carouselEngineInputListener = this.onCarouselEngineInput.bind(this);
        this.navigateInputListener = this.onNavigateInput.bind(this);
        this.qrCompletedListener = this.onAccountUpdated.bind(this);
        this.accountUpdatedListener = this.onAccountUpdated.bind(this);
        this.accountLoggedOutListener = this.onLogoutResults.bind(this);
        this.accountUnlinkedListener = this.onAccountUpdated.bind(this);
        this.accountIconListener = this.onClickedAccount.bind(this);
        this.creditsOpenedListener = this.onCreditsOpened.bind(this);
        this.creditsClosedListener = this.onCreditsClosed.bind(this);
        this.returnToMainMenuListener = this.returnedToMainMenu.bind(this);
        this.sendCampaignSetupTelemetryListener = this.sendCampaignSetupTelemetry.bind(this);
        this.calibrateHDROpenedListener = this.onCalibrateHDROpened.bind(this);
        this.calibrateHDRClosedListener = this.onCalibrateHDRClosed.bind(this);
        this.eventsGoSinglePlayerListener = this.onEventsGoSP.bind(this);
        this.eventsGoMultiPlayerListener = this.onEventsGoMP.bind(this);
        this.eventsGoLoadListener = this.onEventsGoLoad.bind(this);
        this.eventsGoContinueListener = this.onEventsGoContinue.bind(this);
        this.gameCreatorOpenedListener = this.onGameCreatorOpened.bind(this);
        this.gameCreatorClosedListener = this.onGameCreatorClosed.bind(this);
        this.startNewCampaignListener = this.onNewCampaignStart.bind(this);
        this.motdCompletedListener = this.gotMOTD.bind(this);
        this.promosDataReceivedListener = this.resolvePromoDataReceived.bind(this);
        this.refreshPromosListener = this.refreshPromos.bind(this);
        this.startGameSectionListener = this.startSection.bind(this);
        this.spoPCompleteListener = this.onSPoPComplete.bind(this);
        this.spoPKickPromptCheckListener = this.onSPoPKickPromptCheck.bind(this);
        this.spopHeartBeatReceivedListener = this.onSPoPHeartBeatReceived.bind(this);
        this.onLaunchHostMPGameListener = this.onLaunchToHostMPGame.bind(this);
        this.queryCompleteListener = this.onQueryComplete.bind(this);
        this.saveLoadClosedListener = this.onSaveLoadClosed.bind(this);
        this.connectionStatusChangedListener = this.onConnectionStatusChanged.bind(this);
        this.liveEventsSettingsChangeListener = this.onLiveEventsSettingsChanged.bind(this);
        this.endStateListener = this.onAccountUpdated.bind(this);
        this.rewardReceivedListener = this.onRewardRecieved.bind(this);
        this.ssoRecheckTimeBufferReachedListener = this.onRecheckSSO.bind(this);
        this.odrDownloadButtonActivateListener = this.onOdrButtonActivate.bind(this);
        this.continueSave = null;
        this.MainMenuSceneModels = null;
        this.currentPreloadingAsset = null;
        this.hasPreloadingBegun = false;
        this.leaderIndexToPreload = 0;
        this.campaignSetupTimestamp = 0;
        this.campaignSetupId = null;
        this.carouselItems = [];
        this.selectedCarouselItem = 0;
        this.areLegalDocsAccepted = false;
        this.bootLoaded = false;
        this.toggleCarouselAdded = false;
        this.nextPromoAdded = false;
        this.previousPromoAdded = false;
        this.isUserInitiatedLogout = false;
        this.firstLaunchTutorialPending = false;
        this.inSubScreen = false;
        this.leaderModelSetup = false;
        this.mainMenuActivated = false;
        this.mainMenuButtons = [];
        this.needKickDecision = false;
        // Some subscreens requires the profile header while the hdr is not one of them
        this.hdrCalibrationMenuOpen = false;
        this.bShowRewardsScreen = false;
        this.bPendingSSOCheck = false;
        this.pendingSSODialogBoxID = -1;
        this.forceOfflineLegalFlow = false;
        this.onCarouselBack = (_event) => {
            this.toggleCarouselMode();
        };
        this.onCarouselInteract = (_event) => {
            this.interactWithSelectedPromo();
        };
        this.onActiveDeviceTypeChanged = (_event) => {
            this.updatePromoButtonsVisibility();
        };
        this.onLegalDocsAccepted = (event) => {
            this.areLegalDocsAccepted = event.detail.accepted;
            if (this.areLegalDocsAccepted && this.firstLaunchTutorialPending) {
                this.firstLaunchTutorialPending = false;
                this.openCreateGame();
            }
        };
        // bind to this as soon as possible (before OnAttach or OnInitialize)
        // Currently only used by PS5 Activities
        engine.on("LaunchToHostMPGame", this.onLaunchHostMPGameListener);
    }
    onInitialize() {
        if (Network.supportsSSO()) {
            this.carouselMain = document.createElement("fxs-vslot");
            this.carouselMain.classList.value = "carousel absolute hidden text-accent-2 self-center";
            this.carouselMain.setAttribute("tabindex", "-1");
            this.carouselMain.innerHTML = `
			<fxs-vslot class="carousel-outer w-full">
					<fxs-hslot class="carousel-main-hslot">
						<div class="carousel-close-button-div absolute top-2 right-2 hidden">
							<fxs-close-button class="carousel-close-button"></fxs-close-button>
						</div>
						<fxs-hslot class="carousel-top-filigree decoration w-full justify-center items-center absolute -top-9">
							<div class="img-top-filigree-left grow"></div>
							<div class="img-top-filigree-center"></div>
							<div class="img-top-filigree-right grow"></div>
						</fxs-hslot>
						<div
							 class="carousel-content relative pointer-events-auto flex flex-col font-body text-base text-accent-2">
							<div class="carousel-title justify-center">
								<fxs-hslot class="justify-center">
								<fxs-activatable
									class="carousel-expanded-bumper carousel-clickable carousel-left-bumper carousel-bumper relative pointer-events-auto align-center bg-no-repeat bg-cover w-12 h-14 self-center">
										<fxs-nav-help action-key='inline-nav-shell-previous'></fxs-nav-help>
								</fxs-activatable>
								<div
								 	class="carousel-text relative flex self-center text-center font-title text-accent-2">
								</div>
								<fxs-activatable
										 class="carousel-expanded-bumper carousel-clickable carousel-right-bumper carousel-bumper -scale-x-100 relative pointer-events-auto align-center bg-no-repeat bg-cover w-12 h-14 self-center">
									<fxs-nav-help class='-scale-x-100' action-key='inline-nav-shell-next'></fxs-nav-help>
								</fxs-activatable>
								</fxs-hslot>
								<div class="carousel-title-filigree filigree-divider-h3 w-80 self-center mb-2"></div>
							</div>
							<fxs-activatable class="carousel-image-container"></fxs-activatable>
							<fxs-scrollable class="carousel-text-only-scrollable w-full py-2 px-4 mx-6 relative flex self-center justify-center" handle-gamepad-pan="true" tabindex="-1">
								<div
								 	class="carousel-text-content text-justify text-accent-2 font-normal">
								</div>
							</fxs-scrollable>
							<fxs-hslot class="carousel-standard-layout realtive hidden hidden ml-4 mt-4">
								<div class="carousel-standard-layout-image flex flex-auto"></div>
								<fxs-scrollable class="carousel-standard-layout-text px-8 -mt-36 flex flex-auto self-center justify-center" handle-gamepad-pan="true" tabindex="-1">
									<div
								 		class="carousel-standard-text-content text-accent-2 font-normal text-lg">
									</div>
								</fxs-scrollable>
							</fxs-hslot>
						</div>
						<fxs-activatable
										 class="carousel-clickable carousel-thumbnail-bumper carousel-left-bumper carousel-bumper absolute pointer-events-auto align-center bg-no-repeat bg-cover w-12 h-14 self-center left-2">
							<fxs-nav-help action-key='inline-nav-shell-previous'></fxs-nav-help>
						</fxs-activatable>
						<fxs-activatable
										 class="carousel-clickable carousel-thumbnail-bumper carousel-right-bumper carousel-bumper -scale-x-100 absolute pointer-events-auto align-center bg-no-repeat bg-cover w-12 h-14 self-center right-2">
							<fxs-nav-help class='-scale-x-100' action-key='inline-nav-shell-next'></fxs-nav-help>
						</fxs-activatable>
					</fxs-hslot>
					<fxs-hslot class="carousel-breadcrumb-bar justify-center absolute bottom-2"></fxs-hslot>
					<div class="carousel-back-button-container flex flex-row justify-center w-full">
						<fxs-nav-help class="carousel-content-help flex absolute w-0\.5 -top-4 right-4"
									  action-key='inline-shell-action-1'></fxs-nav-help>
						<fxs-button class="carousel-back-button hidden" caption="LOC_GENERIC_BACK"></fxs-button>
						<fxs-button class="carousel-interact-button hidden" caption="LOC_GENERIC_GO"></fxs-button>
					</div>
				</fxs-vslot>
				<div class="carousel-thumb-bg carousel-outer w-full bg-primary-4">
					<p class="carousel-thumb-title mt-2 font-title text-lg text-shadow self-center font-fit-shrink whitespace-nowrap"></p>
				</div>`;
            this.carouselMain.addEventListener(InputEngineEventName, this.carouselEngineInputListener);
            this.Root.appendChild(this.carouselMain);
            this.carouselBreadcrumbs = MustGetElement(".carousel-breadcrumb-bar", this.carouselMain);
            this.carouselContent = MustGetElement(".carousel-content", this.carouselMain);
            this.carouselBackButton = MustGetElement(".carousel-back-button", this.carouselMain);
            this.carouselInteractButton = MustGetElement(".carousel-interact-button", this.carouselMain);
            this.carouselText = MustGetElement(".carousel-text", this.carouselMain);
            this.carouselContentText = MustGetElement(".carousel-text-content", this.carouselMain);
            this.carouselTextScrollable = MustGetElement(".carousel-text-only-scrollable", this.carouselMain);
            this.carouselTextScrollable.whenComponentCreated(c => c.setEngineInputProxy(this.carouselMain));
            this.carouselStandardTextScrollable = MustGetElement(".carousel-standard-layout-text", this.carouselMain);
            this.carouselStandardTextScrollable.whenComponentCreated(c => c.setEngineInputProxy(this.carouselMain));
            this.carouselBaseLayout = MustGetElement(".carousel-standard-layout", this.carouselMain);
            this.carouselImageContainer = MustGetElement(".carousel-image-container", this.carouselMain);
            this.carouselBaseLayoutImage = MustGetElement(".carousel-standard-layout-image", this.carouselMain);
            this.carouselBaseLayoutText = MustGetElement(".carousel-standard-text-content", this.carouselMain);
            this.connStatus = document.createElement('div');
            this.connStatus.role = "status";
            this.connStatus.classList.value = "connection-status hidden absolute flex bottom-8 left-32";
            this.Root.appendChild(this.connStatus);
            const closeButton = document.querySelector('.carousel-close-button');
            closeButton?.addEventListener('action-activate', () => {
                this.toggleCarouselMode();
            });
            this.accountStatusNavHelp = document.createElement('fxs-nav-help');
            this.accountStatusNavHelp.setAttribute("action-key", "inline-shell-action-2");
            this.accountStatusNavHelp.classList.add("absolute", "top-2", "left-2");
        }
        this.profileHeaderContainer = MustGetElement(".main-menu__profile-header-container", this.Root);
        // Update the current version.
        this.buildInfo = document.createElement('div');
        this.buildInfo.role = "paragraph";
        this.buildInfo.classList.value = "main-menu-build-info absolute font-body-sm text-accent-2";
        this.buildInfo.innerHTML = Locale.compose('LOC_SHELL_BUILD_INFO', BuildInfo.version.display);
        this.Root.appendChild(this.buildInfo);
        this.odrDownload = document.createElement('div');
        this.odrDownload.classList.add("ml-2", "relative", "main-menu_odr-download", "hidden");
        const odrDownloadButton = document.createElement('fxs-activatable');
        odrDownloadButton.addEventListener(ActionActivateEventName, this.odrDownloadButtonActivateListener);
        odrDownloadButton.classList.add("main-menu_odr-download-button", "img-prof-btn-bg", "pointer-events-auto", "flow-column", "justify-center", "items-center", "w-16", "h-16", "transition-transform", "hover\\:scale-110", "focus\\:scale-110");
        odrDownloadButton.innerHTML = `
			<div class="img-icon-download pointer-events-none w-10 h-10"></div>
			<fxs-nav-help class="absolute -top-3 -right-4" action-key="inline-shell-action-5"></fxs-nav-help>
		`;
        this.odrDownload.appendChild(odrDownloadButton);
        this.profileHeaderContainer.appendChild(this.odrDownload);
        this.updateOdrDownload();
        if (Network.supportsSSO()) {
            this.profileHeader = document.createElement("profile-header");
            this.profileHeader.classList.add("main-menu__profile-header");
            this.profileHeader.setAttribute("profile-for", "main-menu");
            this.profileHeader.setAttribute("hide-giftbox", (Online.UserProfile.getRewardsEnabledConfiguration() ? "false" : "true"));
            this.profileHeaderContainer.appendChild(this.profileHeader);
            this.motdDisplay = document.createElement("div");
            this.motdDisplay.role = "paragraph";
            this.motdDisplay.classList.value = "motd-box absolute flex bottom-0 l-0 w-full justify-center font-body-sm text-accent-2 text-center";
            this.Root.appendChild(this.motdDisplay);
            this.bShowRewardsScreen = Online.UserProfile.getNewlyUnlockedItems().length > 0;
        }
        else if (Online.Metaprogression.supportsMemento()) {
            this.profileHeader = document.createElement("profile-header");
            this.profileHeader.classList.add("main-menu__profile-header");
            this.profileHeader.setAttribute("profile-for", "main-menu");
            this.profileHeader.setAttribute("hide-progression-header", Online.Metaprogression.supportsMemento() ? "false" : "true");
            this.profileHeader.setAttribute("hide-giftbox", "true");
            this.profileHeader.setAttribute("hide-social", "true");
            this.profileHeaderContainer.appendChild(this.profileHeader);
        }
        this.movieContainer = document.createElement("div");
        this.movieContainer.classList.value = "movie-container pointer-events-none absolute inset-0";
        this.Root.appendChild(this.movieContainer);
        this.shroud = document.createElement("div");
        this.shroud.classList.value = "menu-shroud pointer-events-none absolute inset-0";
        this.Root.appendChild(this.shroud);
    }
    onAttach() {
        super.onAttach();
        engine.on("SPoPComplete", this.spoPCompleteListener);
        engine.on("AccountUpdated", this.accountUpdatedListener);
        engine.on("SPoPKickPromptCheck", this.spoPKickPromptCheckListener);
        engine.on("LogoutCompleted", this.accountLoggedOutListener);
        engine.on("SPoPHeartbeatReceived", this.spopHeartBeatReceivedListener);
        engine.on("LiveEventsSettingsChanged", this.liveEventsSettingsChangeListener);
        engine.on("EndStateReached", this.endStateListener);
        engine.on("EntitlementsUpdated", this.rewardReceivedListener);
        this.bgContainer = MustGetElement('.main-menu-bg-container', this.Root);
        this.Root.addEventListener(InputEngineEventName, this.engineInputListener);
        this.Root.addEventListener('navigate-input', this.navigateInputListener);
        this.slot = MustGetElement("#MainMenuSlot", this.Root);
        this.slot.setAttribute('data-navrule-up', 'wrap');
        this.slot.setAttribute('data-navrule-down', 'wrap');
        this.leaderModelSetup = false;
        Input.setActiveContext(InputContext.Shell);
        let mpAgeTransition = false;
        let ageTransition = false;
        let transitionState = Modding.getTransitionInProgress();
        if (transitionState == TransitionType.Age) {
            ageTransition = true;
            if (Configuration.getGame().isNetworkMultiplayer) {
                mpAgeTransition = true;
            }
        }
        const buttonList = [];
        buttonList.push({ name: "LOC_MAIN_MENU_CONTINUE", audio: "continue", buttonListener: () => { if (this.canPerformInputs())
                this.goContinue(); }, extraClass: "continue-item", disabled: true, separator: true });
        buttonList.push({ name: "LOC_MAIN_MENU_NEW_GAME", audio: "create-game", buttonListener: () => { if (this.canPerformInputs())
                this.openCreateGame(); }, extraClass: "create-game-item" });
        buttonList.push({ name: "LOC_MAIN_MENU_LOAD_GAME", audio: "load-game", buttonListener: () => { if (this.canPerformInputs())
                this.openLoadGame(); } });
        if (UI.isNetworkBuild() && UI.supportsMultiplayer()) {
            buttonList.push({ name: "LOC_MAIN_MENU_MULTIPLAYER", audio: "multiplayer", buttonListener: () => { if (this.canPerformInputs())
                    this.openMultiplayer(); }, separator: true });
        }
        if (UI.supportsDLC() && UI.isNetworkBuild()) {
            buttonList.push({ name: "LOC_UI_STORE_LAUNCHER_TITLE", audio: "store", buttonListener: () => { if (this.canPerformInputs())
                    this.openStore(); }, disabled: !UI.isNetworkBuild() });
        }
        if (UI.shouldShowAdditionalContent()) {
            buttonList.push({ name: "LOC_MAIN_MENU_ADDITIONAL_CONTENT", audio: "additional-content", buttonListener: () => { if (this.canPerformInputs())
                    this.openExtras(); } });
        }
        else {
            buttonList.push({ name: "LOC_MAIN_MENU_CREDITS", audio: "additional-content", buttonListener: () => { if (this.canPerformInputs())
                    this.onCredits(); } });
        }
        buttonList.push({ name: "LOC_MAIN_MENU_OPTIONS", audio: "options", buttonListener: () => { if (this.canPerformInputs())
                this.openOptions(); } });
        // Register debug widget.
        const toggleTestScene = {
            id: 'toggleTestScene',
            category: 'Shell',
            caption: 'Toggle Test Scene',
            domainType: 'iota',
            value: false,
        };
        UI.Debug.registerWidget(toggleTestScene);
        engine.on('DebugWidgetUpdated', (id, _value) => {
            if (id == 'toggleTestScene') {
                this.build3DScene();
            }
        });
        if (UI.canExitToDesktop()) {
            buttonList.push({ name: "LOC_MAIN_MENU_EXIT", audio: "exit", buttonListener: () => { if (this.canPerformInputs())
                    this.exitToDesktop(); } });
        }
        let firstButton = true;
        buttonList.forEach((button) => {
            const newButton = document.createElement("fxs-text-button");
            newButton.setAttribute("type", "big");
            newButton.setAttribute("highlight-style", "decorative");
            newButton.setAttribute("caption", Locale.stylize(button.name).toUpperCase());
            newButton.setAttribute("data-tooltip-style", "none"); // no tooltip
            newButton.setAttribute("data-audio-group-ref", "main-menu-audio");
            newButton.setAttribute("data-audio-activate-ref", "data-audio-clicked-" + button.audio);
            if (firstButton) {
                newButton.classList.add("-mt-4");
                firstButton = false;
            }
            newButton.addEventListener('action-activate', () => {
                if (this.canPerformInputs()) {
                    Telemetry.sendUIMenuAction({ Menu: TelemetryMenuType.MainMenu, MenuAction: TelemetryMenuActionType.Select, Item: button.name });
                }
            });
            newButton.addEventListener('action-activate', button.buttonListener, {});
            this.slot.appendChild(newButton);
            if (button.separator) {
                const separator = document.createElement("div");
                separator.classList.add("main-menu-filigree-divider", "h-4", "mt-1", "min-w-96", "bg-center", "bg-contain", "bg-no-repeat", "self-center", "min-w-96");
                this.slot.appendChild(separator);
            }
            if (button.disabled) {
                newButton.classList.add('disabled');
                newButton.setAttribute("disabled", "true");
            }
            else {
                this.mainMenuButtons.push(newButton);
            }
            if (button.extraClass) {
                newButton.classList.add(button.extraClass);
            }
        });
        if (ageTransition) {
            this.slot.classList.add("hidden");
        }
        ContextManager.pushElement(this.Root);
        // Check for any modding error that we might want to show.
        this.checkForError();
        Network.onExitPremium();
        // Check for any Premium Errors that we want to show
        const lastPremiumError = Network.getLastPremiumError();
        Network.clearPremiumError();
        if (lastPremiumError != "") {
            DialogManager.createDialog_Confirm({
                title: "LOC_MP_CANT_PLAY_ONLINE_ERROR_TITLE",
                body: lastPremiumError
            });
        }
        engine.on("SSORecheckTimeBufferReached", this.ssoRecheckTimeBufferReachedListener);
        if (Network.hasProgressedPastLegalDocs()) {
            // should be the majority of the time unless experiencing network issues
            this.updateAreLegalDocsAccepted();
        }
        else {
            // the ui is ready before the network has finished fetching legal docs
            // first give some additional buffer time, the backend will inform us
            // when the timer is up and to recheck again, if it fails again, then 
            // show pending popup for network services. this keeps the timer on the backend
            this.bPendingSSOCheck = true;
            Network.startSSOLoginBufferTimer();
        }
        if (Network.supportsSSO()) {
            this.connIcon = document.createElement('div');
            this.connIcon.classList.add("connection-icon-img", "pointer-events-auto", "flex", "relative", "flex-col", "justify-center");
            this.connIcon.classList.add("align-center", "bg-contain", "bg-center", "bg-no-repeat", "w-18", "h-18");
            this.setConnectionIcon();
            this.connStatus.appendChild(this.connIcon);
            this.onLiveEventsSettingsChanged();
            this.accountIcon = document.createElement('div');
            this.accountIcon.classList.add("account-icon-img", "pointer-events-none", "flex", "relative", "flex-col");
            this.accountIcon.classList.add("justify-center", "align-center", "bg-contain", "bg-center", "bg-no-repeat", "w-28", "h-28");
            this.accountIcon.setAttribute("data-audio-press-ref", "data-audio-primary-button-press");
            this.accountIconActivatable = document.createElement("fxs-activatable");
            this.accountIconActivatable.classList.add("absolute", "inset-6");
            this.accountIcon.appendChild(this.accountIconActivatable);
            this.accountStatus = document.createElement('div');
            this.accountStatus.classList.value = "account-status hidden absolute flex left-10 bottom-3";
            this.accountStatus.appendChild(this.accountIcon);
            this.accountStatus.appendChild(this.accountStatusNavHelp);
            this.accountStatusAnim = document.createElement("div");
            this.accountStatusAnim.classList.add("connection-anim-container", "absolute", "hidden", "pointer-events-none");
            const statusAnim = document.createElement("fxs-flipbook");
            const atlas = [
                {
                    src: 'fs://game/my2k_connecting_anim.png',
                    spriteWidth: 128,
                    spriteHeight: 128,
                    size: 512,
                    nFrames: 8
                }
            ];
            const flipbookDefinition = {
                fps: 2,
                preload: true,
                atlas: atlas
            };
            statusAnim.classList.add("pointer-events-none");
            statusAnim.setAttribute("data-flipbook-definition", JSON.stringify(flipbookDefinition));
            this.accountStatusAnim.appendChild(statusAnim);
            this.accountStatus.appendChild(this.accountStatusAnim);
            this.Root.appendChild(this.accountStatus);
            this.setAccountIcon(this.isFullAccountLinkedAndConnected());
            this.accountStatusNavHelp.classList.toggle("hidden", Network.isWaitingForValidHeartbeat());
            if (!Network.isWaitingForValidHeartbeat()) {
                this.accountIconActivatable.addEventListener('action-activate', this.accountIconListener);
            }
            else {
                this.accountIcon.style.backgroundImage = "url('fs://game/core/ui/themes/default/img/my2k_connecting.png')";
                this.accountIconActivatable.setAttribute("data-tooltip-content", Locale.compose("LOC_UI_WAITING_SPOP_HEARTBEAT_OK"));
            }
            if (Network.isConnectedToSSO()) {
                engine.on("QrAccountLinked", this.qrCompletedListener);
                engine.on("AccountUnlinked", this.accountUnlinkedListener);
            }
            engine.on("DNAForceOfflineFromEmptyResponse", this.checkDNAFatalError, this);
            engine.on("RequestPrimaryAccountSelection", this.checkPrimaryAccount, this);
            this.carouselBackButton.addEventListener("action-activate", this.onCarouselBack);
            this.carouselInteractButton.addEventListener("action-activate", this.onCarouselInteract);
            engine.on("MotDCompleted", this.motdCompletedListener);
            engine.on("PromosRetrievalCompleted", this.promosDataReceivedListener);
            engine.on("PromoRefresh", this.refreshPromosListener);
        }
        engine.on("ConnectionStatusChanged", this.connectionStatusChangedListener);
        engine.on("FetchedOnlineLegalDocsComplete", this.onRecheckSSO, this);
        engine.on("FetchedOfflineLegalDocsComplete", this.handleOfflineLegalDocFlow, this);
        engine.on("StartGameSection", this.startGameSectionListener);
        engine.on("LiveEventActiveUpdated", this.liveEventsSettingsChangeListener);
        engine.on("EntitlementsUpdated", this.rewardReceivedListener);
        if (ageTransition) {
            this.hideOnlineFeaturesUI();
            if (mpAgeTransition) {
                MultiplayerShellManager.onAgeTransition();
            }
            else {
                // Hide all of the shell things because we technically aren't in the shell here
                this.buildInfo.classList.add("hidden");
                ContextManager.push("age-transition-civ-select", { singleton: true, createMouseGuard: true });
            }
        }
        else {
            this.skipToMainMenu();
        }
        // unlock the cursor and force the standard arrow in case we're here from a loading error
        UI.lockCursor(false);
        UI.setCursorByType(UIHTMLCursorTypes.Default);
        // attach listeners for campaign setup (SP & MP)
        window.addEventListener(GameCreatorOpenedEventName, this.gameCreatorOpenedListener);
        window.addEventListener(GameCreatorClosedEventName, this.gameCreatorClosedListener);
        window.addEventListener(StartCampaignEventName, this.startNewCampaignListener);
        window.addEventListener(LegalDocsAcceptedEventName, this.onLegalDocsAccepted);
        window.addEventListener(SaveLoadClosedEventName, this.saveLoadClosedListener);
        // attach listener for credits
        window.addEventListener(ScreenCreditsOpenedEventName, this.creditsOpenedListener);
        // attach listener for HDR calibration
        window.addEventListener(EditorCalibrateHDROpenedEventName, this.calibrateHDROpenedListener);
        // attach listener for sub-screens returning to the main menu
        window.addEventListener(MainMenuReturnEventName, this.returnToMainMenuListener);
        // attach listener for sending campaign setup telemetry
        window.addEventListener(SendCampaignSetupTelemetryEventName, this.sendCampaignSetupTelemetryListener);
        // Start a query for save files to see if we can enable the Continue item
        this.onSaveLoadClosed();
        if (Network.requireSPoPKickPrompt()) {
            if (!this.checkForLegalDocs()) {
                this.getKickDecision();
            }
            else {
                this.needKickDecision = true;
            }
        }
        if (Network.checkAndClearDisplaySPoPLogout()) {
            DialogManager.createDialog_Confirm({ body: Locale.compose("LOC_UI_SPOP_LOGOUT_ACCOUNT"), title: Locale.compose("LOC_UI_LOGOUT_ACCOUNT_TITLE") });
        }
        if (Network.checkAndClearDisplayParentalPermissionChange()) {
            DialogManager.createDialog_Confirm({ body: Locale.compose("LOC_UI_PARENTAL_PERMISSION_REVOKED"), title: Locale.compose("LOC_UI_ACCOUNT_TITLE") });
        }
        if (Network.checkAndClearDisplayMPUnlink()) {
            DialogManager.createDialog_Confirm({ body: Locale.compose("LOC_UI_KICK_MP_UNLINK"), title: Locale.compose("LOC_UI_ACCOUNT_TITLE") });
        }
        // TODO: Find a better way to show the corresponding dialog
        if (!Network.isConnectedToNetwork() && Network.areLegalDocsCompleted()) {
            waitForLayout(() => engine.trigger("NetworkDisconnected"));
        }
        // Request Promos
        this.refreshPromos();
        const launchToHostMPGame = (this.Root.getAttribute('data-launch-to-host-MP-game') == 'true');
        if (launchToHostMPGame) {
            this.onLaunchToHostMPGame();
        }
        // Tell the network systems that is we are ready to accept game invites.
        // Only when we have finished waiting for anything SPoP related (this blocks SPoP bypasses)
        if (!Network.requireSPoPKickPrompt() && !Network.isWaitingForValidHeartbeat()) {
            Network.setMainMenuInviteReady(true);
        }
        this.onNewUserLogin();
        if (this.bShowRewardsScreen && !ageTransition && !mpAgeTransition) {
            this.showRewardsScreen();
        }
        if (UI.shouldShowHighEndAssetsDownloadOption()) {
            this.showDownloadAssetsDialogConfirm();
        }
    }
    onDetach() {
        this.mainMenuActivated = false;
        Telemetry.sendUIMenuAction({ Menu: TelemetryMenuType.MainMenu, MenuAction: TelemetryMenuActionType.Exit });
        this.Root.removeEventListener(InputEngineEventName, this.engineInputListener);
        this.Root.removeEventListener('navigate-input', this.navigateInputListener);
        window.removeEventListener(ActiveDeviceTypeChangedEventName, this.onActiveDeviceTypeChanged);
        window.removeEventListener(GameCreatorOpenedEventName, this.gameCreatorOpenedListener);
        window.removeEventListener(GameCreatorClosedEventName, this.gameCreatorClosedListener);
        window.removeEventListener(StartCampaignEventName, this.startNewCampaignListener);
        window.removeEventListener(LegalDocsAcceptedEventName, this.onLegalDocsAccepted);
        window.removeEventListener(SaveLoadClosedEventName, this.saveLoadClosedListener);
        window.removeEventListener(QueryCompleteEventName, this.queryCompleteListener);
        window.removeEventListener(ScreenCreditsOpenedEventName, this.creditsOpenedListener);
        window.removeEventListener(EditorCalibrateHDROpenedEventName, this.calibrateHDROpenedListener);
        window.removeEventListener(MainMenuReturnEventName, this.returnToMainMenuListener);
        window.removeEventListener(SendCampaignSetupTelemetryEventName, this.sendCampaignSetupTelemetry);
        this.clear3DScene();
        super.onDetach();
    }
    onReceiveFocus() {
        super.onReceiveFocus();
        this.updateFoundationLevel();
        this.updateNavTray();
        UI.toggleGameCenterAccessPoint(true);
        if (this.isCarouselExpanded()) {
            Focus.setContextAwareFocus(this.carouselMain, this.Root);
        }
        else if (!this.hdrCalibrationMenuOpen) { // we dont show Online Features when the hdr calibration is open but is not the case for all subscreens
            Focus.setContextAwareFocus(this.slot, this.Root);
            this.showOnlineFeaturesUI(); // we don't show Online Features (MOTD, profile header, 2K Account when promo is expanded)
        }
        if (this.slot && !this.slot.classList.contains('hidden')) {
            this.updatePromoCarouselVisibility();
        }
        this.checkPrimaryAccount();
    }
    checkDNAFatalError() {
        if (!Network.isConnectedToSSO() && Network.isConnectedToNetwork() && Network.isForcedOfflineFromEmptyResponse()) {
            DialogManager.createDialog_Confirm({ body: Locale.compose("LOC_UI_FORCE_OFFLINE_ACCOUNT_BODY"), title: Locale.compose("LOC_UI_OFFLINE_ACCOUNT_TITLE") });
        }
    }
    checkPrimaryAccount() {
        if (Network.isWaitingForPrimaryAccountSelection()) {
            waitForLayout(() => {
                ContextManager.push("screen-mp-primary-account-select", { singleton: true, createMouseGuard: true });
            });
        }
        else {
            this.updateFoundationLevel();
        }
    }
    updatePromoCarouselVisibility() {
        if (Network.supportsSSO()) {
            this.carouselMain.classList.toggle("hidden", this.carouselItems.length === 0 || !Network.isConnectedToNetwork());
        }
    }
    onNewUserLogin() {
        //check if the user has a empty string as name
        if (!Network.supportsSSO() || !Network.isFullAccountLinked()) {
            return;
        }
        const { firstPartyName } = getPlayerCardInfo();
        if (firstPartyName == "") {
            updatePlayerProfile({});
        }
    }
    updateFoundationLevel() {
        const { FoundationLevel } = getPlayerCardInfo();
        const leaderData = Online.Metaprogression.getLegendPathsData().find((x => x.legendPathLoc.includes("FOUNDATION")));
        if (leaderData) {
            const { currentLevel } = leaderData;
            if (currentLevel > FoundationLevel) {
                updatePlayerProfile({ FoundationLevel: currentLevel });
            }
        }
    }
    onLoseFocus() {
        UI.toggleGameCenterAccessPoint(false);
        NavTray.clear();
        super.onLoseFocus();
    }
    isSelectedPromoInteractable() {
        return this.carouselItems[this.selectedCarouselItem]?.isInteractable ?? false;
    }
    updateNavTray() {
        if (ContextManager.getCurrentTarget() == this.Root) {
            NavTray.clear();
            if (this.isCarouselVisible() && this.isCarouselExpanded()) {
                NavTray.addOrUpdateGenericBack();
                if (this.isSelectedPromoInteractable()) {
                    NavTray.addOrUpdateAccept('LOC_GENERIC_GO');
                }
                else {
                    NavTray.removeAccept();
                }
            }
        }
    }
    openLoadGame(isFromEvent = false) {
        if (this.checkForLegalDocs()) {
            return;
        }
        Configuration.editGame()?.reset(GameModeTypes.SINGLEPLAYER);
        ContextManager.push("screen-save-load", { singleton: true, createMouseGuard: true, attributes: { "menu-type": "load", "server-type": ServerType.SERVER_TYPE_NONE, "save-type": SaveTypes.SINGLE_PLAYER, "from-event": isFromEvent } });
    }
    openMultiplayer() {
        // If either of the two screens this could launch are still in the process of closing, don't do anything
        if (ContextManager.hasInstanceOf("screen-mp-landing") || ContextManager.hasInstanceOf("screen-mp-browser")) {
            return;
        }
        if (this.checkForLegalDocs()) {
            return;
        }
        this.inSubScreen = true;
        // un-hide the main menu
        this.slot.classList.remove("hidden");
        if (Network.getLocalHostingPlatform() == HostingType.HOSTING_TYPE_GAMECENTER) {
            MultiplayerShellManager.onGameMode();
            return;
        }
        if (MultiplayerShellManager.hasSupportForLANLikeServerTypes()) {
            MultiplayerShellManager.onLanding();
        }
        else {
            MultiplayerShellManager.onGameBrowse(ServerType.SERVER_TYPE_INTERNET);
        }
    }
    onCredits() {
        ContextManager.push("screen-credits", { singleton: true, createMouseGuard: false });
        Telemetry.sendUIMenuAction({ Menu: TelemetryMenuType.AdditionalContent, MenuAction: TelemetryMenuActionType.Select, Item: "Credits" });
        this.onCreditsOpened();
    }
    onCreditsOpened() {
        this.inSubScreen = true;
        this.raiseShroud();
        this.clear3DScene();
        window.addEventListener(ScreenCreditsClosedEventName, this.creditsClosedListener);
        // Mark not ready as we are entering the Credits screen
        Network.setMainMenuInviteReady(false);
    }
    onCreditsClosed() {
        this.returnedToMainMenu();
        window.removeEventListener(ScreenCreditsClosedEventName, this.creditsClosedListener);
    }
    onCalibrateHDROpened() {
        this.raiseShroud();
        this.clear3DScene();
        this.inSubScreen = true;
        this.hdrCalibrationMenuOpen = true;
        this.profileHeader?.classList.add('hidden');
        window.addEventListener(EditorCalibrateHDRClosedEventName, this.calibrateHDRClosedListener);
    }
    onCalibrateHDRClosed() {
        this.returnedToMainMenu();
        this.profileHeader?.classList.remove('hidden');
        this.hdrCalibrationMenuOpen = false;
        window.removeEventListener(EditorCalibrateHDRClosedEventName, this.calibrateHDRClosedListener);
    }
    updateOdrDownload() {
        this.odrDownload?.classList.toggle("hidden", !UI.shouldShowHighEndAssetsDownloadOption());
    }
    returnedToMainMenu() {
        if (ContextManager.getCurrentTarget() == this.Root) {
            FocusManager.setFocus(this.slot);
        }
        this.updateOdrDownload();
        this.build3DScene();
        this.bgContainer.classList.remove("create");
        this.Root.classList.remove("hidden");
        this.slot.classList.remove("hidden");
        this.buildInfo.classList.remove("hidden");
        this.Root.classList.add("trigger-nav-help");
        if (Network.supportsSSO()) {
            this.onAccountUpdated();
            this.showOnlineFeaturesUI();
            this.updatePromoCarouselVisibility();
        }
        this.lowerShroud();
        this.inSubScreen = false;
        // Inform Audio that we returned to Main Menu.
        Sound.onGameplayEvent(GameplayEvent.MainMenu);
        if (this.needKickDecision) {
            this.needKickDecision = false;
            this.getKickDecision();
        }
        // We could be back from the game-creator screen, mark ready
        if (!Network.requireSPoPKickPrompt() && !Network.isWaitingForValidHeartbeat()) {
            Network.setMainMenuInviteReady(true);
        }
    }
    setConnectionIcon() {
        if (this.connIcon != null) {
            if (Network.isConnectedToNetwork()) {
                this.connIcon.style.backgroundImage = "url('fs://game/core/ui/themes/default/img/mp_connected.png')";
                if (Network.isAuthenticated()) {
                    this.connIcon.setAttribute("data-tooltip-content", "LOC_UI_CONNECTION_OK");
                }
                else {
                    this.connIcon.setAttribute("data-tooltip-content", "LOC_UI_NETWORK_CONNECTION_OK");
                }
            }
            else {
                this.connIcon.style.backgroundImage = "url('fs://game/core/ui/themes/default/img/mp_disconnected.png')";
                this.connIcon.setAttribute("data-tooltip-content", "LOC_UI_NETWORK_CONNECTION_FAILED");
            }
        }
    }
    setAccountIcon(status) {
        this.accountIcon?.setAttribute("data-audio-group-ref", "main-menu-audio");
        this.accountIcon?.setAttribute("data-audio-activate-ref", "data-audio-link-account");
        this.accountStatusAnim?.classList.add("hidden");
        if (this.accountIcon && Network.isConnecting()) {
            this.accountStatusAnim?.classList.remove("hidden");
        }
        else if (this.accountIcon && Network.isConnectedToNetwork() && Network.isConnectedToSSO()) {
            if (status) {
                this.accountIcon.style.backgroundImage = "url('fs://game/core/ui/themes/default/img/my2k_loggedin.png')";
                this.accountIconActivatable.setAttribute("data-tooltip-content", "LOC_UI_ACCOUNT_OK");
                this.accountStatusAnim?.classList.add("hidden");
            }
            else {
                if (Network.isAccountLinked() && !Network.isAccountComplete()) {
                    this.accountIcon.style.backgroundImage = "url('fs://game/core/ui/themes/default/img/my2k_incomplete.png')";
                    this.accountIconActivatable.setAttribute("data-tooltip-content", "LOC_UI_ACCOUNT_LOGGEDIN_INCOMPLETE");
                }
                else if (Network.isLoggedIn() && !Network.isAccountLinked()) {
                    this.accountIcon.style.backgroundImage = "url('fs://game/core/ui/themes/default/img/my2k_notlinked.png')";
                    this.accountIconActivatable.setAttribute("data-tooltip-content", "LOC_UI_ACCOUNT_LOGGEDIN_FAILED");
                    this.accountStatusAnim?.classList.add("hidden");
                }
                else {
                    this.accountIcon.style.backgroundImage = "url('fs://game/core/ui/themes/default/img/my2k_loggedout.png')";
                    this.accountIconActivatable.setAttribute("data-tooltip-content", "LOC_UI_ACCOUNT_LINKED_FAILED");
                    this.accountStatusAnim?.classList.add("hidden");
                }
            }
        }
        else if (this.accountIcon) {
            this.accountIcon.style.backgroundImage = "url('fs://game/core/ui/themes/default/img/my2k_notloggedin.png')";
            this.accountIconActivatable.setAttribute("data-tooltip-content", "LOC_UI_CONNECTION_FAILED");
        }
    }
    enableMainMenuButtonbyName(name, status, msg = "") {
        const resolvedName = Locale.stylize(name).toUpperCase(); // has to match stylized setup, see onAttach() buttonList
        this.mainMenuButtons.forEach((button) => {
            let buttonName = button.getAttribute("caption");
            if (buttonName != null && buttonName == resolvedName) {
                button.setAttribute("disabled", (!status).toString());
                button.setAttribute("data-tooltip-content", msg);
            }
        });
    }
    onRewardRecieved() {
        this.bShowRewardsScreen = true;
    }
    handleOfflineLegalDocFlow() {
        // Ui has been informed the offline legal docs are ready for parsing.
        this.forceOfflineLegalFlow = true;
        if (this.pendingSSODialogBoxID != -1) {
            DisplayQueueManager.closeMatching(this.pendingSSODialogBoxID);
            this.pendingSSODialogBoxID = -1;
        }
        this.updateAreLegalDocsAccepted();
        this.tryToHandleLegalDocs();
    }
    onRecheckSSO() {
        // We have been told recheck the legal doc status
        let hasProgressedPastLegalDocs = Network.hasProgressedPastLegalDocs();
        if (hasProgressedPastLegalDocs) {
            // the online legal docs are ready and accepted
            if (this.pendingSSODialogBoxID != -1) {
                DisplayQueueManager.closeMatching(this.pendingSSODialogBoxID);
                this.pendingSSODialogBoxID = -1;
            }
            if (this.bPendingSSOCheck) {
                this.bPendingSSOCheck = false;
                ;
            }
            this.updateAreLegalDocsAccepted();
            this.tryToHandleLegalDocs();
        }
        else {
            // the legal docs are still not ready, inform users sso is pending & allow users to skip
            const cancelWaitForSSOCallback = () => {
                this.handleOfflineLegalFlow();
            };
            this.pendingSSODialogBoxID = DialogManager.createDialog_Cancel({ displayHourGlass: true, title: Locale.compose("LOC_UI_SSO_CONNECTING_SUBTITLE"), callback: cancelWaitForSSOCallback });
        }
    }
    handleOfflineLegalFlow() {
        // We allow the users one last time to continue waiting or play offline
        const retryCallback = () => {
            this.onRecheckSSO();
        };
        const loadOfflineLegalDocs = (eAction) => {
            if (eAction == DialogBoxAction.Confirm) {
                // this will trigger a RestartDNABootFlow which will lead to offline legal docs fetching
                Network.loadOfflineLegalDocs();
            }
        };
        const logoutplayOfflineOption = {
            actions: ["accept"],
            label: "LOC_MAIN_MENU_CONTINUE",
            callback: loadOfflineLegalDocs,
        };
        const retryOption = {
            actions: ["cancel", "keyboard-escape"],
            label: "LOC_UI_SSO_RETRY",
            callback: retryCallback,
        };
        this.pendingSSODialogBoxID = DialogManager.createDialog_MultiOption({
            body: "LOC_UI_SSO_PLAY_OFFLINE_BODY",
            title: "LOC_UI_SSO_PLAY_OFFLINE",
            layout: "vertical",
            canClose: false,
            options: [logoutplayOfflineOption, retryOption]
        });
    }
    showRewardsScreen() {
        if (Online.UserProfile.getRewardsAutoPopupEnabledConfiguration()) {
            let flags = { isChildAccount: Network.isChildAccount(), isPermittedChild: Network.isChildOnlinePermissionsGranted(), ignoreChildPermissions: false };
            let popupProperties = { singleton: true, createMouseGuard: true };
            var blockReason = Network.getBlockedAccessReason(flags.isChildAccount, flags.isPermittedChild, flags.ignoreChildPermissions);
            if ((blockReason == "" || blockReason == Locale.compose("LOC_UI_LINK_ACCOUNT_REQUIRED"))) {
                if (this.Root.getAttribute("disabled") != "true" && ContextManager.getCurrentTarget() == this.Root && !Network.isWaitingForPrimaryAccountSelection()) {
                    FocusManager.setFocus(this.slot);
                    ContextManager.push(giftboxButtonName, popupProperties);
                }
            }
        }
        this.bShowRewardsScreen = false;
    }
    onAccountUpdated() {
        var NetworkStatus = this.isFullAccountLinkedAndConnected();
        this.setConnectionIcon();
        this.setAccountIcon(NetworkStatus);
        //setting the button status for events and your progress
        this.onLiveEventsSettingsChanged();
        this.profileHeader?.classList.toggle('disabled', !NetworkStatus);
    }
    onLogoutResults() {
        this.onLiveEventsSettingsChanged();
        this.setConnectionIcon();
        this.setAccountIcon(this.isFullAccountLinkedAndConnected());
        if (!this.isUserInitiatedLogout) {
            DialogManager.createDialog_Confirm({ body: Locale.compose("LOC_UI_SPOP_LOGOUT_ACCOUNT"), title: Locale.compose("LOC_UI_LOGOUT_ACCOUNT_TITLE") });
        }
        else {
            DialogManager.createDialog_Confirm({ body: Locale.compose("LOC_UI_USER_LOGOUT_ACCOUNT"), title: Locale.compose("LOC_UI_LOGOUT_ACCOUNT_TITLE") });
            this.isUserInitiatedLogout = false;
        }
    }
    onClickedAccount() {
        if (!this.canPerformInputs()) {
            return;
        }
        const isUserInput = true;
        const result = Network.triggerNetworkCheck(isUserInput);
        if (result.wasErrorDisplayedOnFirstParty) {
            return;
        }
        const isConnectedToNetwork = result.networkResult == NetworkResult.NETWORKRESULT_OK;
        const isBanned = Network.isBanned();
        if (isConnectedToNetwork && Network.isLoggedIn()) {
            if (Network.isAccountLinked() && Network.isAccountComplete()) {
                const twoKPortalCallBack = (eAction) => {
                    if (eAction == DialogBoxAction.Confirm) {
                        ContextManager.push("screen-mp-link-account", { singleton: true, createMouseGuard: true });
                    }
                };
                const logoutCallback = (eAction) => {
                    if (eAction == DialogBoxAction.Confirm) {
                        this.isUserInitiatedLogout = true;
                        Network.nonSpopLogout();
                    }
                };
                const resetPrimaryCallback = () => {
                    DialogManager.createDialog_ConfirmCancel({
                        body: "LOC_UI_PRIMARY_ACCOUNT_SELECT_WARNING",
                        title: "LOC_GENERIC_RESET_PRIMARY_ACCOUNT",
                        canClose: true,
                        callback: (eAction) => { if (eAction == DialogBoxAction.Confirm) {
                            Online.Metaprogression.resetPrimaryAccountSelection();
                        } }
                    });
                };
                const logoutOption = {
                    actions: ["accept"],
                    label: "LOC_GENERIC_LOGOUT",
                    callback: logoutCallback,
                };
                const twoKPortalOption = {
                    actions: ["shell-action-2"],
                    label: "LOC_GENERIC_TWOKPORTAL",
                    callback: twoKPortalCallBack,
                };
                const resetPrimaryOption = {
                    actions: ["shell-action-1"],
                    label: "LOC_GENERIC_RESET_PRIMARY_ACCOUNT",
                    callback: resetPrimaryCallback,
                };
                const cancelOption = {
                    actions: ["cancel", "keyboard-escape"],
                    label: "LOC_GENERIC_CANCEL",
                };
                const options = [
                    logoutOption,
                    twoKPortalOption,
                    ...(Online.Metaprogression.canResetPrimaryAccount() ? [resetPrimaryOption] : []),
                    cancelOption, // always last
                ];
                DialogManager.createDialog_MultiOption({
                    body: "LOC_UI_SPOP_CONFIRM_LOGOUT",
                    title: "LOC_UI_LINK_ACCOUNT_SUBTITLE",
                    layout: "vertical",
                    canClose: false,
                    options: options,
                    dialogId: accountDialogId,
                });
            }
            else if (!Network.isAccountComplete()) {
                if (Network.canDisplayQRCode()) {
                    ContextManager.push("screen-mp-link-account", { singleton: true, createMouseGuard: true });
                }
            }
            else {
                if (Network.canDisplayQRCode()) {
                    ContextManager.push("screen-mp-link-account", { singleton: true, createMouseGuard: true });
                }
            }
        }
        else if (isBanned) {
            let banInfo = Network.getBanInfo();
            if (banInfo != "") {
                DialogManager.createDialog_Confirm({
                    body: banInfo,
                    title: Locale.compose("LOC_UI_LOGIN_ACCOUNT_TITLE")
                });
            }
            else {
                DialogManager.createDialog_Confirm({
                    body: Locale.compose("LOC_UI_ACCOUNT_BANNED"),
                    title: Locale.compose("LOC_UI_LOGIN_ACCOUNT_TITLE")
                });
            }
        }
        else {
            // Placeholder login logic. Will update to prompt user with window to login or not.
            // check if it's online/offline 
            if (!isConnectedToNetwork && !Network.isAuthenticated()) {
                DialogManager.createDialog_Confirm({ body: Locale.compose("LOC_UI_CONNECTION_FAILED"), title: Locale.compose("LOC_UI_OFFLINE_ACCOUNT_TITLE") });
            }
            else if (Network.isConnectedToSSO()) {
                DialogManager.createDialog_Confirm({ body: Locale.compose("LOC_UI_LOGIN_ACCOUNT"), title: Locale.compose("LOC_UI_LOGIN_ACCOUNT_TITLE") });
                Network.attemptLogin();
            }
            else {
                Network.tryConnect(true);
            }
        }
    }
    onQueryComplete(event) {
        switch (event.detail.result) {
            case SerializerResult.RESULT_PENDING:
                return;
            case SerializerResult.RESULT_OK:
                // Find the autosave with the highest saveTime (which is the newest)
                for (const save of SaveLoadData.saves) {
                    if (this.continueSave == null || this.continueSave.saveTime < save.saveTime) {
                        this.continueSave = save;
                    }
                }
                const hasMissingMods = (this.continueSave) ? this.continueSave.missingMods.length > 0 : false;
                const hasUnownedMods = (this.continueSave) ? this.continueSave.unownedMods.length > 0 : false;
                const continueItem = MustGetElement(".continue-item", this.Root);
                const isDisabled = this.continueSave == null || hasMissingMods || hasUnownedMods;
                continueItem.classList.toggle("disabled", isDisabled);
                continueItem.setAttribute("disabled", isDisabled ? "true" : "false");
                if (this.continueSave) {
                    const save = this.continueSave;
                    const tooltip = Locale.stylize("LOC_MAIN_MENU_CONTINUE_INFO", save.gameName, Locale.unpack(save.hostLeaderName), Locale.unpack(save.hostCivilizationName), save.currentTurn.toString(), Locale.unpack(save.hostAgeName), fixupNNBSP(save.displaySaveTime));
                    continueItem.setAttribute("data-tooltip-content", tooltip);
                }
                else {
                    continueItem.setAttribute("data-tooltip-content", "");
                }
                if (ContextManager.getCurrentTarget() == this.Root) {
                    FocusManager.setFocus(this.slot);
                }
                break;
            default:
                break;
        }
        window.removeEventListener(QueryCompleteEventName, this.queryCompleteListener);
        if (!this.inSubScreen) {
            // the player already opened another screen, skip for now
            // build3DScene will be called if they return to the main menu
            this.build3DScene();
        }
        event.preventDefault();
        event.stopPropagation();
    }
    onSaveLoadClosed() {
        if (!this.isShrouded) {
            window.addEventListener(QueryCompleteEventName, this.queryCompleteListener);
            const options = SaveLocationCategories.AUTOSAVE | SaveLocationCategories.NORMAL | SaveLocationCategories.QUICKSAVE | SaveLocationOptions.LOAD_METADATA;
            SaveLoadData.querySaveGameList(SaveLocations.LOCAL_STORAGE, SaveTypes.SINGLE_PLAYER, options, SaveFileTypes.GAME_STATE);
        }
    }
    onConnectionStatusChanged(data) {
        if (data.server == ServerType.SERVER_TYPE_INTERNET) {
            this.onAccountUpdated();
        }
        this.updatePromoCarouselVisibility();
    }
    onLiveEventsSettingsChanged() {
        const liveReqs = (Online.LiveEvent.isLiveEventActive() && Network.isMetagamingAvailable());
        this.enableMainMenuButtonbyName("LOC_MAIN_MENU_EVENTS", liveReqs, this.getAccountLinkPromptMsg());
    }
    getAccountLinkPromptMsg() {
        return Network.isFullAccountLinked() ? "" : "LOC_UI_ACCOUNT_LINKED_PROMPT";
    }
    goContinue() {
        if (this.continueSave && this.continueSave.missingMods.length == 0 && this.continueSave.unownedMods.length == 0) {
            UI.toggleGameCenterAccessPoint(false);
            // Loading a save currently responds to whatever the current configuration's game mode is using.
            // Reset the configuration since it may be contaminated by going into MP screens and setting the game mode as MP.
            Configuration.editGame()?.reset(GameModeTypes.SINGLEPLAYER);
            SaveLoadData.handleLoadSave(this.continueSave, ServerType.SERVER_TYPE_NONE);
        }
    }
    showLegalDocuments() {
        Animations.cancelAllChainedAnimations();
        if (!Automation.isActive) {
            ContextManager.push("screen-mp-legal", { singleton: true, createMouseGuard: true, panelOptions: { viewOnly: false } });
        }
    }
    gotMOTD() {
        if (!Network.supportsSSO()) {
            return;
        }
        if (Online.MOTD.isMOTDReady()) {
            const titles = Online.MOTD.getAllMOTDHeaders();
            titles.forEach((title) => {
                const msg = Online.MOTD.getMOTD(title);
                if (msg) {
                    console.log(title, ": ", msg);
                }
            });
            // display a msg
            const randIndex = Math.floor(Math.random() * titles.length);
            const msg = Online.MOTD.getMOTD(titles[randIndex]);
            if (msg) {
                this.motdDisplay.innerHTML = msg;
            }
        }
    }
    onSPoPComplete() {
        // Technically has SSO but may be waiting for heartbeat
        this.setConnectionIcon();
        if (Network.isWaitingForValidHeartbeat() && this.accountIcon) {
            // Disable the button until the 2k server responds with a valid heartbeat
            this.accountIcon.style.backgroundImage = "url('fs://game/core/ui/themes/default/img/my2k_connecting.png')";
            this.accountIconActivatable.setAttribute("data-tooltip-content", Locale.compose("LOC_UI_WAITING_SPOP_HEARTBEAT_OK"));
            this.accountIconActivatable.removeAttribute('action-key');
            this.accountIconActivatable.removeEventListener('action-activate', this.accountIconListener);
        }
        else {
            this.onAccountUpdated();
        }
    }
    onSPoPHeartBeatReceived() {
        this.onAccountUpdated();
        this.accountStatusNavHelp.classList.toggle("hidden", true);
        this.accountIconActivatable.addEventListener('action-activate', this.accountIconListener);
        // SPoP conflict on startup meant network possibly did not have SSO earlier
        if (Network.isConnectedToSSO()) {
            engine.on("QrAccountLinked", this.qrCompletedListener);
            engine.on("AccountUnlinked", this.accountUnlinkedListener);
        }
        if (!Network.requireSPoPKickPrompt() && !Network.isWaitingForValidHeartbeat()) {
            // We finished SPoP, users can now receive invites
            Network.setMainMenuInviteReady(true);
        }
    }
    onSPoPKickPromptCheck() {
        if (Network.requireSPoPKickPrompt()) {
            this.getKickDecision();
        }
    }
    getKickDecision() {
        const kickOtherSessionCallback = () => {
            Network.kickOtherSession();
        };
        const exitCallback = () => {
            Network.spopLogout();
        };
        DialogManager.createDialog_MultiOption({
            body: Locale.compose("LOC_UI_KICK_SESSION_BODY"),
            title: Locale.compose("LOC_UI_KICK_SESSION_TITTLE"),
            canClose: false,
            options: [
                {
                    actions: ["accept"],
                    label: Locale.compose("LOC_UI_TERMINATE_SESSION"),
                    callback: kickOtherSessionCallback,
                },
                {
                    actions: ["cancel", "keyboard-escape"],
                    label: Locale.compose("LOC_UI_SPOP_LOGOUT_GAME"),
                    callback: exitCallback,
                }
            ],
            dialogId: getKickDialogId,
        });
    }
    // Check to see if the modding system is in an error state, and show the error.
    checkForError() {
        const lastError = Modding.getLastLoadError();
        if (lastError != null) {
            let errorTitle = "";
            let errorBody = "";
            if (lastError == LoadErrorCause.MOD_CONTENT) {
                errorTitle = "LOC_LOAD_GAME_ERROR_MOD_CONTENT";
                errorBody = Modding.getLastErrorString();
            }
            else if (lastError == LoadErrorCause.GAME_ABANDONED) {
                let popupReason = KickReason.KICK_NONE;
                const lastReason = Modding.getLastLoadErrorReason();
                if (lastReason) {
                    popupReason = lastReason;
                }
                const abandonPopup = NetworkUtilities.multiplayerAbandonReasonToPopup(popupReason);
                errorTitle = abandonPopup.title;
                errorBody = abandonPopup.body;
            }
            else if (lastError == LoadErrorCause.REQUIRES_LINKED_ACCOUNT) {
                errorTitle = "LOC_LOAD_GAME_ERROR_LINKED_ACCOUNT";
            }
            else if (lastError == LoadErrorCause.UNKNOWN_VERSION) {
                errorTitle = "LOC_LOAD_GAME_ERROR_UNKNOWN_VERSION";
            }
            else if (lastError == LoadErrorCause.BAD_MAPSIZE) {
                errorTitle = "LOC_LOAD_GAME_ERROR_BAD_MAPSIZE_TITLE";
                errorBody = "LOC_LOAD_GAME_ERROR_BAD_MAPSIZE_BODY";
            }
            else if (lastError == LoadErrorCause.MOD_OWNERSHIP) {
                errorTitle = "LOC_LOAD_GAME_ERROR_MOD_CONFIG";
                errorBody = Locale.compose("LOC_LOAD_GAME_ERROR_MOD_OWNERSHIP");
                let ownershipErrors = Modding.getLastOwnershipCheck();
                const packageIds = [];
                if (ownershipErrors.length > 0) {
                    errorBody += "[N][BLIST]";
                    for (const entry of ownershipErrors) {
                        if (entry.allowance == ModAllowance.None) {
                            let packages = Modding.getOwnershipItemPackages(entry.type, entry.key);
                            if (packages.length > 0) {
                                for (const packageId of packages) {
                                    // Create a unique list
                                    if (packageIds.includes(packageId) == false) {
                                        packageIds.push(packageId);
                                    }
                                }
                            }
                            else {
                                // Only showing the entry, if we can resolve the key.
                                let displayName = Modding.getOwnershipItemDisplayName(entry.type, entry.key);
                                if (displayName && Locale.keyExists(displayName)) {
                                    errorBody += "[LI]";
                                    errorBody += Locale.compose(displayName);
                                }
                            }
                        }
                    }
                    const packageNames = [];
                    for (const packageId of packageIds) {
                        let packageName = Modding.getOwnershipPackageDisplayName(packageId);
                        if (packageName) {
                            // Some packages, share the same name (they are sub-packages)
                            // We don't want to repeat the names, so keep unique list
                            if (packageNames.includes(packageName) == false) {
                                packageNames.push(packageName);
                                // Only showing the entry, if we can resolve the key.
                                if (Locale.keyExists(packageName)) {
                                    errorBody += "[LI]";
                                    errorBody += Locale.compose(packageName);
                                }
                            }
                        }
                    }
                }
            }
            else if (lastError == LoadErrorCause.MOD_CONFIG) {
                errorTitle = "LOC_LOAD_GAME_ERROR_MOD_CONFIG";
                errorBody = Modding.getLastErrorString();
            }
            else if (lastError == LoadErrorCause.SCRIPT_PROCESSING) {
                errorTitle = "LOC_LOAD_GAME_ERROR_SCRIPT_PROCESSING";
                errorBody = Modding.getLastErrorString();
            }
            else if (lastError == LoadErrorCause.MOD_VALIDATION) {
                errorTitle = "LOC_LOAD_GAME_ERROR_MOD_VALIDATION";
                errorBody = Modding.getLastErrorString();
            }
            else {
                errorTitle = "LOC_LOAD_GAME_ERROR_UNKNOWN";
                errorBody = lastError.toString();
            }
            DialogManager.createDialog_Confirm({
                title: errorTitle,
                body: errorBody
            });
        }
    }
    startSection(data) {
        switch (data) {
            case "multiplayer":
                this.openMultiplayer();
                break;
            case "events":
                this.toggleCarouselMode();
                this.openEvents();
                break;
            case "playNow":
                this.startGame();
                break;
            case "collection":
                this.openStore();
                break;
            case "metaprogression":
                if (Network.isMetagamingAvailable()) {
                    this.showProfilePage(ProfileTabType.CHALLENGES); // MMG_TODO: proof of concept now, parse specific page from promo
                }
                else {
                    var blockReason = Network.getBlockedAccessReason(false, true, true);
                    DialogManager.createDialog_Confirm({ body: Locale.compose(blockReason), title: Locale.compose("LOC_UI_ACCOUNT_TITLE") });
                }
                break;
            case "accountLink":
                if (Network.canDisplayQRCode()) {
                    ContextManager.push("screen-mp-link-account", { singleton: true, createMouseGuard: true });
                }
                break;
            default: console.error("Unknown GameSection to start:" + data);
        }
    }
    resolvePromoDataReceived(data) {
        if (!Online.Promo.isPromoReady()) {
            console.error("Promo is not ready! CreateCarousel skipped");
            return;
        }
        if (data.placement == "mainmenu_primary") {
            // only reset (false) bootLoaded when boot had been loaded (== true) and we're performing a full refresh
            // bootLoaded + data.fullRefresh > bootLoaded
            // false + false > false 
            // false + true  > false 
            // true  + false > true  
            // true  + true  > false 
            this.bootLoaded = this.bootLoaded && !data.fullRefresh;
            this.createCarousel(data);
        }
    }
    appendPromoToCarousel(promo, itemIndex) {
        if (itemIndex < 0) {
            console.error("Invalid promo index");
            return;
        }
        if (promo == null)
            return;
        // update if the promo is already in the carousel
        for (let i = 0; i < this.carouselItems.length; i++) {
            if (this.carouselItems[i].promoId == promo.promoID) {
                this.carouselItems[i].carouselImageUrl = promo.secondaryImageUrl;
                this.carouselItems[i].modalImageUrl = promo.primaryImageUrl;
                this.carouselItems[i].isInteractable = promo.isInteractable;
                this.carouselItems[i].autoRedeemOnShow = promo.autoRedeemOnShow;
                return;
            }
        }
        this.carouselItems.push({
            carouselTitle: promo.localizedCarouselTitle,
            title: promo.localizedTitle,
            content: promo.localizedContent,
            carouselImageUrl: promo.secondaryImageUrl,
            modalImageUrl: promo.primaryImageUrl,
            promoId: promo.promoID,
            isInteractable: promo.isInteractable,
            autoRedeemOnShow: promo.autoRedeemOnShow,
            layout: promo.promoLayout,
        });
        const item = document.createElement("fxs-radio-button");
        item.classList.add("relative", "pointer-events-auto", "flex", "bg-no-repeat", "bg-cover");
        if (itemIndex > 0) {
            item.classList.add('ml-2');
        }
        item.setAttribute("data-item-id", itemIndex.toString());
        item.setAttribute("group-tag", "carousel-breadcrumbs");
        item.setAttribute("value", itemIndex.toString());
        item.addEventListener("action-activate", () => {
            if (this.selectedCarouselItem != itemIndex) {
                Audio.playSound("data-audio-activate", "audio-pager");
            }
            this.selectedCarouselItem = itemIndex;
            this.updateCarousel();
        });
        this.carouselBreadcrumbs.appendChild(item);
    }
    createCarousel(data) {
        if (!Network.supportsSSO()) {
            return;
        }
        if (data.fullRefresh) {
            // clear any existing children (shouldn't be any as things stand, but we may want to live-refresh this later on)
            while (this.carouselBreadcrumbs.children.length > 0) {
                this.carouselBreadcrumbs.removeChild(this.carouselBreadcrumbs.children[0]);
            }
            this.carouselItems = [];
            if (this.selectedCarouselItem > 0) {
                if (this.selectedCarouselItem >= data.promoCount)
                    this.selectedCarouselItem = data.promoCount - 1;
            }
        }
        let bootItemIndex = -1;
        for (let itemIndex = 0; itemIndex < data.promoCount; itemIndex += 1) {
            let promo = data.promos[itemIndex];
            this.appendPromoToCarousel(promo, itemIndex);
            if (promo.isBootPromo && !promo.isBootShown && bootItemIndex <= -1 && data.fullRefresh) {
                bootItemIndex = itemIndex;
            }
        }
        this.updatePromoCarouselVisibility();
        if (!this.toggleCarouselAdded) {
            this.carouselImageContainer.addEventListener("action-activate", () => {
                this.toggleCarouselMode();
            });
            this.toggleCarouselAdded = true;
        }
        const leftBumpers = document.querySelectorAll('.carousel-left-bumper');
        if (leftBumpers && !this.previousPromoAdded) {
            leftBumpers.forEach(bumper => {
                bumper.addEventListener("action-activate", () => {
                    this.carouselPrevious();
                });
                bumper.setAttribute("data-audio-group-ref", "audio-pager");
                bumper.setAttribute("data-audio-activate-ref", "none");
            });
            this.previousPromoAdded = true;
        }
        const rightBumpers = document.querySelectorAll('.carousel-right-bumper');
        if (rightBumpers && !this.nextPromoAdded) {
            rightBumpers.forEach(bumper => {
                bumper.addEventListener("action-activate", () => {
                    this.carouselNext();
                });
                bumper.setAttribute("data-audio-group-ref", "audio-pager");
                bumper.setAttribute("data-audio-activate-ref", "none");
            });
            this.nextPromoAdded = true;
        }
        this.updateCarousel(CarouselActionTypes.NO_ACTION);
        if (data.fullRefresh && !this.bootLoaded && bootItemIndex >= 0) {
            this.selectedCarouselItem = bootItemIndex;
            this.toggleCarouselMode();
            this.bootLoaded = true;
        }
        this.resetCarouselSlider();
    }
    carouselPrevious() {
        if (this.selectedCarouselItem > 0) {
            this.selectedCarouselItem -= 1;
            this.updateCarousel();
            this.resetCarouselSlider();
            Audio.playSound("data-audio-activate", "audio-pager");
        }
    }
    carouselNext() {
        if (this.selectedCarouselItem < (this.carouselItems.length - 1)) {
            this.selectedCarouselItem += 1;
            this.updateCarousel();
            this.resetCarouselSlider();
            Audio.playSound("data-audio-activate", "audio-pager");
        }
    }
    interactWithPromo(promoId, promoLocation) {
        Online.Promo.interactWithPromo(PromoAction.Interact, promoId, promoLocation, this.selectedCarouselItem);
    }
    telemetryPromoAction(promoAction, promoId, promoLocation, interactionDestination) {
        Online.Promo.telemetryPromoAction(promoAction, promoId, promoLocation, this.selectedCarouselItem, interactionDestination);
    }
    interactWithSelectedPromo() {
        if (!Network.supportsSSO()) {
            return;
        }
        this.interactWithPromo(this.carouselItems[this.selectedCarouselItem]?.promoId, "Expanded Carousel");
    }
    setPromoBackButtonVisibility(isVisible) {
        if (!Network.supportsSSO()) {
            return;
        }
        this.carouselBackButton.classList.toggle("hidden", !isVisible);
    }
    setPromoInteractButtonVisibility(isVisible) {
        if (!Network.supportsSSO()) {
            return;
        }
        this.carouselInteractButton.classList.toggle("hidden", !isVisible);
    }
    updatePromoButtonsVisibility() {
        if (!Network.supportsSSO()) {
            return;
        }
        let isBackVisible = false;
        let isInteractVisible = false;
        if (!ActionHandler.isGamepadActive) {
            if (this.isCarouselVisible() && this.isCarouselExpanded()) {
                isBackVisible = true;
                isInteractVisible = this.isSelectedPromoInteractable();
            }
        }
        this.setPromoBackButtonVisibility(isBackVisible);
        this.setPromoInteractButtonVisibility(isInteractVisible);
    }
    processSelectedPromo() {
        const selectedPromo = this.carouselItems[this.selectedCarouselItem];
        if (selectedPromo) {
            Online.Promo.viewPromo(selectedPromo.promoId);
            this.updatePromoButtonsVisibility();
            this.updateNavTray();
            if (selectedPromo.autoRedeemOnShow) {
                this.interactWithPromo(selectedPromo.promoId, "Expanded Carousel");
                selectedPromo.autoRedeemOnShow = false;
            }
        }
    }
    toggleCarouselMode() {
        // Two modes: minimized (in the bottom left corner of the screen) or expanded panel (over the menu)
        if (!Network.supportsSSO() || this.carouselItems.length == 0) {
            return;
        }
        this.carouselMain.classList.toggle("carousel-expanded");
        this.updateNavTray();
        // Expanded
        if (this.isCarouselExpanded()) {
            Audio.playSound("data-audio-window-overlay-open");
            window.addEventListener(ActiveDeviceTypeChangedEventName, this.onActiveDeviceTypeChanged);
            this.hideOnlineFeaturesUI();
            // hideOnlineFeaturesUI will also hide the carousel, which is not exactly what we want
            this.carouselMain.classList.remove("hidden");
            this.carouselText.classList.toggle("hidden", false);
            document.querySelector(".carousel-thumb-title").textContent = "";
            document.querySelector(".carousel-top-filigree")?.classList.remove("hidden");
            document.querySelectorAll(".carousel-expanded-bumper").forEach((bumper) => bumper.classList.remove("hidden"));
            document.querySelectorAll(".carousel-thumbnail-bumper").forEach((bumper) => bumper.classList.add("hidden"));
            document.querySelector(".carousel-close-button-div")?.classList.remove("hidden");
            this.carouselBreadcrumbs.classList.add("hidden");
            const selectedCarousel = this.carouselItems[this.selectedCarouselItem];
            // small carousel was interacted to get to Expanded one
            this.telemetryPromoAction(PromoAction.Interact, selectedCarousel?.promoId, "Main Menu Carousel", "Expanded Carousel"); // to expanded
            // user bring up the promo modal.
            this.processSelectedPromo();
            this.carouselContent.classList.add("carousel-content-large");
            if (selectedCarousel?.modalImageUrl && !bForceShowPromoLoadingSpinner) {
                this.carouselImageContainer.innerHTML = `<img src="${selectedCarousel.modalImageUrl}" class="carousel-image relative w-full h-full pointer-events-auto self-center" > `;
                if (selectedCarousel.layout == DNAPromoLayout.TextHeavy) {
                    this.carouselImageContainer.classList.add("hidden");
                    this.carouselTextScrollable.classList.remove("hidden");
                    this.carouselContentText.innerHTML = Locale.stylize(selectedCarousel.content);
                    Focus.setContextAwareFocus(this.carouselTextScrollable, this.carouselMain);
                }
                else if (selectedCarousel.layout == DNAPromoLayout.Standard) {
                    this.carouselImageContainer.classList.add("hidden");
                    this.carouselBaseLayout.classList.remove("hidden");
                    this.carouselTextScrollable.classList.add("hidden");
                    this.carouselBaseLayoutImage.style.backgroundImage = `url(${selectedCarousel.modalImageUrl})`;
                    this.carouselBaseLayoutText.innerHTML = Locale.stylize(selectedCarousel.content);
                    // this.carouselBase = Locale.stylize(selectedCarousel.textContent!);
                    Focus.setContextAwareFocus(this.carouselStandardTextScrollable, this.carouselMain);
                }
                else {
                    this.carouselTextScrollable.classList.add("hidden");
                    Focus.setContextAwareFocus(this.carouselStandardTextScrollable, this.carouselMain);
                }
                if (selectedCarousel.title) {
                    this.Root.querySelector(".carousel-title-filigree")?.classList.remove("hidden");
                    this.carouselText.innerHTML = Locale.stylize(selectedCarousel.title);
                }
                else {
                    document.querySelector(".carousel-title-filigree")?.classList.add("hidden");
                    this.carouselText.innerHTML = "";
                }
            }
            else {
                this.showPromoLoadingSpinner();
                Online.Promo.checkPromoUIData("mainmenu_primary", selectedCarousel?.promoId ?? "");
            }
            //stop cycle when expanded
            clearInterval(this.carouselSliderId);
        }
        else { // Minimized			
            Audio.playSound("data-audio-window-overlay-close");
            window.removeEventListener(ActiveDeviceTypeChangedEventName, this.onActiveDeviceTypeChanged);
            this.carouselText.classList.toggle("hidden", true);
            document.querySelector(".carousel-thumb-title").textContent = Locale.stylize(this.carouselItems[this.selectedCarouselItem]?.carouselTitle);
            this.Root.querySelector(".carousel-title-filigree")?.classList.add("hidden");
            document.querySelector(".carousel-top-filigree")?.classList.add("hidden");
            document.querySelector(".carousel-close-button-div")?.classList.add("hidden");
            if (ContextManager.getCurrentTarget() == this.Root) {
                FocusManager.setFocus(this.slot);
            }
            this.showOnlineFeaturesUI();
            document.querySelectorAll(".carousel-expanded-bumper").forEach((bumper) => bumper.classList.add("hidden"));
            document.querySelectorAll(".carousel-thumbnail-bumper").forEach((bumper) => bumper.classList.remove("hidden"));
            this.carouselImageContainer.classList.remove("hidden");
            this.carouselBaseLayout.classList.add("hidden");
            this.carouselTextScrollable.classList.add("hidden");
            this.carouselBreadcrumbs.classList.remove("hidden");
            this.carouselImageContainer.innerHTML = `<img src="${this.carouselItems[this.selectedCarouselItem]?.carouselImageUrl ?? ""}" class="carousel-image relative pointer-events-auto bg-cover bg-no-repeat self-center" > </div>`;
            if (this.carouselItems[this.selectedCarouselItem]?.carouselTitle) {
                this.carouselText.innerHTML = Locale.stylize(this.carouselItems[this.selectedCarouselItem]?.carouselTitle);
            }
            else {
                this.carouselText.innerHTML = "";
            }
            this.carouselContent.classList.remove("carousel-content-large");
            this.setPromoBackButtonVisibility(false);
            this.setPromoInteractButtonVisibility(false);
            //initialize automatic slider 
            this.resetCarouselSlider();
        }
    }
    resetCarouselSlider() {
        const secondsForAutomaticSlide = Online.Promo.getPromoCarouselAutoSlideTime();
        //clears the previous timer and resets it
        clearInterval(this.carouselSliderId);
        // if there's no promo or only one promo in the carousel, don't update the carousel cause that's causing the flashes
        if (this.carouselItems.length <= 1) {
            return;
        }
        if (!this.isCarouselExpanded()) {
            this.carouselSliderId = setInterval(() => {
                this.selectedCarouselItem = Math.abs(this.selectedCarouselItem + 1) % this.carouselItems.length;
                this.updateCarousel();
            }, secondsForAutomaticSlide * 1000);
        }
    }
    // PROMO_TODO: We will want to make this animated like the one in loading screen. Waiting on UI/UX design and implementation: https://2kfxs.atlassian.net/browse/IGP-103673
    showPromoLoadingSpinner() {
        console.log("showing Promo loading spinner!");
        // here we need to pass in if we're in modal or carousel cause the spinner will show differently.
        const isCarouselExpanded = this.isCarouselExpanded();
        if (isCarouselExpanded) {
        }
        else {
        }
    }
    // PROMO_TODO: We will want to make this animated like the one in loading screen. Waiting on UI/UX design and implementation: https://2kfxs.atlassian.net/browse/IGP-103673
    hidePromoLoadingSpinner() {
        console.log("hiding Promo loading spinner!");
        const isCarouselExpanded = this.isCarouselExpanded();
        if (isCarouselExpanded) {
            // hide modal loading spinner
        }
        else {
            // hide carousel loading spinner
        }
    }
    refreshPromos() {
        if (!Network.supportsSSO()) {
            return;
        }
        // if fetch promotion failed during SSO flow. force reload here again. 
        if (Online.Promo.hasFetchPromotionFailed()) {
            Online.Promo.reloadPromos();
            return;
        }
        const data = Online.Promo.getPlacementUIData("mainmenu_primary");
        if (data.placement == "mainmenu_primary") {
            // only reset (false) bootLoaded when boot had been loaded (== true) and we're performing a full refresh
            // bootLoaded + data.fullRefresh > bootLoaded
            // false + false > false 
            // false + true  > false 
            // true  + false > true  
            // true  + true  > false 
            this.bootLoaded = this.bootLoaded && !data.fullRefresh;
            this.createCarousel(data);
        }
    }
    updateCarousel(action = CarouselActionTypes.PROCESS_PROMO) {
        // If not showing (e.g., credits or something else has hidden it), ignore this update.
        if (getComputedStyle(this.carouselMain).visibility == "hidden") {
            return;
        }
        const isCarouselExpanded = this.isCarouselExpanded();
        for (let i = 0; i < this.carouselBreadcrumbs.children.length; i++) {
            // if this is the selected item, feature it in the content area and highlight this breadcrumb
            if (i == this.selectedCarouselItem) {
                this.carouselBreadcrumbs.children[i].setAttribute("selected", "true");
                // if the modal is up and updateCarousel is called. Call processSelectedPromo()
                if (isCarouselExpanded && action == CarouselActionTypes.PROCESS_PROMO) {
                    this.processSelectedPromo();
                }
                // if carouselImageUrl (used for both carousel and modal expect when modal image is specified differently) is valid. 
                if (this.carouselItems[i].carouselImageUrl && !bForceShowPromoLoadingSpinner) {
                    this.carouselText.classList.remove("carousel-text-only");
                    this.hidePromoLoadingSpinner();
                    // telemetry calls
                    if (isCarouselExpanded) {
                        this.telemetryPromoAction(PromoAction.View, this.carouselItems[this.selectedCarouselItem]?.promoId, "Expanded Carousel", "");
                    }
                    else if (this.isCarouselVisible()) {
                        this.telemetryPromoAction(PromoAction.View, this.carouselItems[this.selectedCarouselItem]?.promoId, "Main Menu Carousel", "");
                    }
                    // modal
                    if (isCarouselExpanded) {
                        this.carouselText.classList.toggle("hidden", false);
                        document.querySelector(".carousel-thumb-title").textContent = "";
                        document.querySelector(".carousel-top-filigree")?.classList.remove("hidden");
                        this.carouselBreadcrumbs.classList.add("hidden");
                        document.querySelectorAll(".carousel-expanded-bumper").forEach((bumper) => bumper.classList.remove("hidden"));
                        document.querySelectorAll(".carousel-thumbnail-bumper").forEach((bumper) => bumper.classList.add("hidden"));
                        document.querySelector(".carousel-close-button-div")?.classList.remove("hidden");
                        // is there text *and* an image?
                        this.carouselImageContainer.innerHTML = `<img src="${this.carouselItems[i].carouselImageUrl}" class="carousel-image relative pointer-events-auto bg-cover bg-no-repeat self-center"></div>`;
                        if (this.carouselItems[i].layout == DNAPromoLayout.TextHeavy) {
                            this.carouselImageContainer.classList.add("hidden");
                            this.carouselContentText.innerHTML = Locale.stylize(this.carouselItems[i].content);
                            this.carouselTextScrollable.classList.remove("hidden");
                            this.carouselTextScrollable.component.scrollToPercentage(0);
                            this.carouselBaseLayout.classList.add("hidden");
                            Focus.setContextAwareFocus(this.carouselTextScrollable, this.carouselMain);
                        }
                        else if (this.carouselItems[i].layout == DNAPromoLayout.Standard) {
                            this.carouselImageContainer.classList.add("hidden");
                            this.carouselBaseLayout.classList.remove("hidden");
                            this.carouselTextScrollable.classList.add("hidden");
                            this.carouselBaseLayoutImage.style.backgroundImage = `url(${this.carouselItems[i].modalImageUrl})`;
                            this.carouselBaseLayoutText.innerHTML = Locale.stylize(this.carouselItems[i].content);
                            Focus.setContextAwareFocus(this.carouselStandardTextScrollable, this.carouselMain);
                            this.carouselStandardTextScrollable.component.scrollToPercentage(0);
                        }
                        else {
                            this.carouselImageContainer.classList.remove("hidden");
                            this.carouselTextScrollable.classList.add("hidden");
                            this.carouselBaseLayout.classList.add("hidden");
                            Focus.setContextAwareFocus(this.carouselStandardTextScrollable, this.carouselMain);
                        }
                        if (this.carouselItems[i].title) {
                            this.Root.querySelector(".carousel-title-filigree")?.classList.remove("hidden");
                            this.carouselText.innerHTML = Locale.stylize(this.carouselItems[i].title);
                        }
                        else {
                            this.Root.querySelector(".carousel-title-filigree")?.classList.remove("hidden");
                            this.carouselText.innerHTML = "";
                        }
                    }
                    // thumbnail
                    else {
                        document.querySelector(".carousel-title-filigree")?.classList.add("hidden");
                        document.querySelector(".carousel-top-filigree")?.classList.add("hidden");
                        this.carouselBreadcrumbs.classList.remove("hidden");
                        this.carouselBaseLayout.classList.add("hidden");
                        this.carouselImageContainer.classList.remove("hidden");
                        this.carouselTextScrollable.classList.add("hidden");
                        document.querySelector(".carousel-close-button-div")?.classList.add("hidden");
                        document.querySelectorAll(".carousel-expanded-bumper").forEach((bumper) => bumper.classList.add("hidden"));
                        document.querySelectorAll(".carousel-thumbnail-bumper").forEach((bumper) => bumper.classList.remove("hidden"));
                        this.carouselImageContainer.innerHTML = `<div class="carousel-image relative bg-cover bg-no-repeat pointer-events-auto self-center" style="background-image: url('${this.carouselItems[i].carouselImageUrl}')"></div>`;
                        if (this.carouselItems[i].carouselTitle) {
                            this.carouselText.classList.toggle("hidden", true);
                            document.querySelector(".carousel-thumb-title").textContent = Locale.stylize(this.carouselItems[i].carouselTitle);
                        }
                        else {
                            this.carouselText.innerHTML = "";
                        }
                    }
                }
                // no carouselImage url found: image is not ready, still downloading... show spinner.
                else {
                    this.carouselImageContainer.innerHTML = "";
                    if (this.carouselItems[i].title) {
                        this.carouselText.innerHTML = Locale.stylize(this.carouselItems[i].title);
                        this.carouselText.classList.add("carousel-text-only");
                    }
                    else {
                        console.error(`main-menu: Selected carousel item ${i} has neither an image nor text`);
                    }
                    this.showPromoLoadingSpinner();
                    Online.Promo.checkPromoUIData("mainmenu_primary", this.carouselItems[i].promoId);
                }
            }
        }
        const leftBumpers = this.carouselMain.querySelectorAll('.carousel-left-bumper');
        leftBumpers.forEach((leftBumper) => {
            if (this.selectedCarouselItem > 0) {
                leftBumper.classList.remove("carousel-bumper-disabled");
            }
            else {
                leftBumper.classList.add("carousel-bumper-disabled");
            }
        });
        const rightBumper = this.carouselMain.querySelectorAll('.carousel-right-bumper');
        rightBumper.forEach(bumper => {
            if (this.selectedCarouselItem < (this.carouselItems.length - 1)) {
                bumper.classList.remove("carousel-bumper-disabled");
            }
            else {
                bumper.classList.add("carousel-bumper-disabled");
            }
        });
        this.updatePromoButtonsVisibility();
    }
    isCarouselVisible() {
        if (!Network.supportsSSO()) {
            return false;
        }
        return !this.carouselMain.classList.contains("hidden");
    }
    isCarouselExpanded() {
        if (!Network.supportsSSO()) {
            return false;
        }
        return this.carouselMain.classList.contains("carousel-expanded");
        // Note that it can expanded but hidden (during intro animations for instance)
        // It is intended to NOT have merged the two functions because some things as the data update should happen even while the carousel is hidden.
    }
    canPerformInputs() {
        // if the movie is displaying, we count it to lock out all inputs (so the gamepad can skip the movie without triggering a menu item)
        if (this.movieContainer.children.length > 0) {
            this.trySkipMenuAnimations();
            return false;
        }
        // if the carousel is expanded, don't allow inputs
        if (this.isCarouselExpanded()) {
            return false;
        }
        // if we're in any sub-screen, don't allow inputs
        if (this.inSubScreen) {
            return false;
        }
        return true;
    }
    activateMainMenu() {
        // TODO - This is a temporary measure due to too many things attempting to activate the main menu multiple times.
        if (this.mainMenuActivated) {
            return;
        }
        this.mainMenuActivated = true;
        Telemetry.sendUIMenuAction({ Menu: TelemetryMenuType.MainMenu, MenuAction: TelemetryMenuActionType.Load });
        // Signal to audio that the main menu has been activated.
        UI.sendAudioEvent(Audio.getSoundTag('data-audio-main-menu-activated', 'main-menu-audio'));
        Sound.onGameplayEvent(GameplayEvent.MainMenu);
        // Some screen could still be open (eg mp-landing) and we don't want to steal the focus
        // so only set the focus if current focus is this.Root or document.body
        if (this.slot && (this.Root == FocusManager.getFocus() || FocusManager.isWorldFocused())) {
            FocusManager.setFocus(this.slot); // this focus the main menu button we come from (the first one by default)
        }
        // check for new MotD from the server and display them if necessary
        this.motdCompletedListener();
        // show the online-related stuff
        this.showOnlineFeaturesUI();
        this.setMainMenuButtonsEnabled(true);
        this.checkDNAFatalError(); // activate after legal docs accepted to prevent possible focus issues
    }
    trySkipMenuAnimations() {
        this.skipToMainMenu();
    }
    onEngineInput(inputEvent) {
        // don't handle inputs while we're in a sub-screen flow
        if (this.inSubScreen) {
            return;
        }
        if (this.bgContainer?.classList.contains('create')) {
            // Don't handle engine input here if create game is open.
            // We can receive inputs if the input is sent when the focus is changing,
            // if the focus is cleared and not set yet the context manager will sent the event to the current target,
            // main-menu in this case
            return;
        }
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        // if the movie is playing
        if (this.movieContainer.children.length > 0) {
            switch (inputEvent.detail.name) {
                case 'accept':
                case 'mousebutton-left':
                case 'touch-tap':
                case 'shell-action-1':
                case 'shell-action-2':
                    this.trySkipMenuAnimations();
                    inputEvent.preventDefault();
                    inputEvent.stopImmediatePropagation();
                    return;
            }
        }
        let live = true;
        switch (inputEvent.detail.name) {
            case 'accept':
                this.trySkipMenuAnimations();
                live = false;
                break;
            case 'mousebutton-left':
            case 'touch-tap':
                if (!this.inSubScreen) {
                    this.trySkipMenuAnimations();
                    live = false;
                }
                break;
            case 'shell-action-2':
                if (this.canPerformInputs() && Network.supportsSSO() && !Network.isWaitingForValidHeartbeat()) {
                    this.onClickedAccount();
                    live = false;
                }
                break;
            case 'shell-action-1':
                if (this.isCarouselVisible()) {
                    this.toggleCarouselMode();
                }
                live = false;
                break;
            case 'shell-action-5':
                if (!this.canPerformInputs()) {
                    live = false; // block input from bubble up to profile-header
                }
                else if (UI.shouldShowHighEndAssetsDownloadOption()) {
                    this.showDownloadAssetsDialogConfirm();
                    live = false;
                }
                break;
            case 'sys-menu':
                if (!this.canPerformInputs()) {
                    live = false; // block input from bubble up to profile-header
                }
                break;
        }
        if (live && inputEvent.isCancelInput()) {
            if (this.movieContainer.children.length > 0) {
                this.trySkipMenuAnimations();
                live = false;
            }
        }
        if (!live) {
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
    }
    onCarouselEngineInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        let live = true;
        switch (inputEvent.detail.name) {
            case 'accept':
                this.onCarouselInteract(inputEvent);
                live = false;
                break;
            case 'shell-action-1':
                this.toggleCarouselMode();
                live = false;
                break;
        }
        if (live && inputEvent.isCancelInput()) {
            this.onCarouselBack(inputEvent);
            live = false;
        }
        if (!live) {
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
    }
    onNavigateInput(navigationEvent) {
        const live = this.handleNavigation(navigationEvent);
        if (!live) {
            navigationEvent.preventDefault();
            navigationEvent.stopImmediatePropagation();
        }
    }
    /**
     * @returns true if still live, false if input should stop.
     */
    handleNavigation(navigationEvent) {
        let live = true;
        if (navigationEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        const direction = navigationEvent.getDirection();
        switch (direction) {
            case InputNavigationAction.SHELL_PREVIOUS:
                this.carouselPrevious();
                live = false;
                break;
            case InputNavigationAction.SHELL_NEXT:
                this.carouselNext();
                live = false;
                break;
            case InputNavigationAction.NEXT:
                if (!this.canPerformInputs()) {
                    live = false; // block input from bubble up to profile-header
                }
                break;
        }
        return live;
    }
    onVideoEnded() {
        // remove the movie from the DOM
        this.movieContainer.innerHTML = '';
        this.skipToMainMenu();
    }
    skipToMainMenu() {
        if (this.isCarouselExpanded()) {
            return;
        }
        // TODO - This is a kludge due to the current 'skip' workflow.
        // This should be addressed when we switch to fxs-movie which has built in 'skipping' logic.
        if (this.movieContainer.childElementCount > 0) {
            this.onVideoEnded();
        }
        this.tryToHandleLegalDocs();
    }
    tryToHandleLegalDocs() {
        // This must be done after the main menu is active or focus does not work
        if ((!this.bPendingSSOCheck && Network.hasProgressedPastLegalDocs()) || this.forceOfflineLegalFlow) {
            this.forceOfflineLegalFlow = false;
            let legalDocsCheck = false;
            const legalDocuments = Network.getLegalDocuments(LegalDocsPlacementAcceptName);
            if (legalDocuments && legalDocuments.length > 0) {
                legalDocsCheck = Network.areAllLegalDocumentsConfirmed();
            }
            else {
                // No documents to check - online no manifest since we accepted all documents from Identity
                legalDocsCheck = true;
            }
            if (legalDocsCheck) {
                // legal docs gate functionality on main menu until online docs or offline docs are accepted
                this.activateMainMenu();
                this.showOnlineFeaturesUI();
                this.lowerShroud();
            }
            if (Network.isConnectedToSSO() && Network.isConnectedToNetwork() && !Network.isAccountComplete() && legalDocsCheck) {
                const isFirstBoot = this.Root.getAttribute("data-is-first-boot");
                if (isFirstBoot == "true") {
                    if (Network.canDisplayQRCode()) {
                        ContextManager.push("screen-mp-link-account", { singleton: true, createMouseGuard: true });
                    }
                    this.Root.removeAttribute("data-is-first-boot");
                }
            }
        }
    }
    showOnlineFeaturesUI() {
        if (Online.Metaprogression.supportsMemento()) {
            this.profileHeader?.classList.remove("hidden");
        }
        if (!Network.supportsSSO()) {
            return;
        }
        this.connStatus?.classList.remove('hidden');
        this.accountStatus?.classList.remove('hidden');
        this.motdDisplay.classList.remove("hidden");
        this.profileHeader?.classList.remove("hidden");
        this.updateNavTray();
    }
    hideOnlineFeaturesUI() {
        if (Online.Metaprogression.supportsMemento()) {
            this.profileHeader?.classList.add("hidden");
        }
        if (!Network.supportsSSO()) {
            return;
        }
        this.connStatus?.classList.add('hidden');
        this.accountStatus?.classList.add('hidden');
        this.motdDisplay.classList.add("hidden");
        this.carouselMain.classList.add('hidden');
        this.profileHeader?.classList.add("hidden");
        this.updateNavTray();
    }
    updateAreLegalDocsAccepted() {
        this.areLegalDocsAccepted = NetworkUtilities.areLegalDocumentsConfirmed(this.showLegalDocuments);
    }
    setMainMenuButtonsEnabled(bEnabled) {
        this.mainMenuButtons.forEach(button => {
            button.classList.toggle('disabled', !bEnabled);
        });
    }
    initializeCampaignSetupId() {
        this.campaignSetupId = Telemetry.generateGUID();
        // also store campaign setup id
        let gameConfig = Configuration.editGame();
        if (gameConfig) {
            gameConfig.setCampaignSetupGUID(this.campaignSetupId);
        }
    }
    startGame() {
        if (this.checkForLegalDocs()) {
            return;
        }
        if (Network.supportsSSO()) {
            // the flag has to be cleared before resetting the configuration
            Online.LiveEvent.clearLiveEventGameFlag();
        }
        // Doing a 'Play Now'.  Reset the configuration to single player to ensure that no lingering settings have been hit.
        // We want to persist the map seed since that may have been set via the debug interface.
        const seed = Configuration.getMap().mapSeed;
        Configuration.editGame()?.reset(GameModeTypes.SINGLEPLAYER);
        Configuration.editMap()?.setMapSeed(seed);
        this.initializeCampaignSetupId();
        let campaignSetupData = {
            Status: CampaignSetupType.Complete,
            TimeInCampaignSetup: 0,
            CampaignSetupId: this.campaignSetupId,
        };
        Telemetry.sendCampaignSetup(campaignSetupData);
        engine.call('startGame');
    }
    openCreateGame() {
        if (this.checkForLegalDocs()) {
            return;
        }
        // When the 'Create Game' flow begins, reset the configuration to the proper game mode.
        Configuration.editGame()?.reset(GameModeTypes.SINGLEPLAYER);
        ContextManager.popUntil("main-menu");
        Animations.cancelAllChainedAnimations();
        this.clear3DScene();
        this.raiseShroud();
        this.inSubScreen = true;
        this.bgContainer.classList.add("create");
        this.Root.classList.add("hidden");
        ContextManager.push("create-game-sp", { singleton: true, createMouseGuard: false });
        // Mark main menu not ready for invites, because we need to exit the game-creator flow first
        Network.setMainMenuInviteReady(false);
        this.onGameCreatorOpened(); // sends up campaign setup telemetry
    }
    showProfilePage(profileTabToFocus) {
        Animations.cancelAllChainedAnimations();
        ContextManager.push("screen-profile-page", {
            singleton: true, createMouseGuard: true,
            panelOptions: { onlyChallenges: false, onlyLeaderboards: false, focusTab: profileTabToFocus }
        });
    }
    onGameCreatorOpened() {
        this.initializeCampaignSetupId();
        let campaignSetupData = {
            Status: CampaignSetupType.Start,
            TimeInCampaignSetup: 0,
            CampaignSetupId: this.campaignSetupId,
        };
        Telemetry.sendCampaignSetup(campaignSetupData);
        this.campaignSetupTimestamp = Date.now();
    }
    onGameCreatorClosed() {
        this.returnedToMainMenu();
        if (Network.supportsSSO()) {
            Online.LiveEvent.clearLiveEventGameFlag();
            Online.LiveEvent.clearLiveEventConfigKeys();
        }
        window.dispatchEvent(new SendCampaignSetupTelemetryEvent(CampaignSetupType.Abandon));
    }
    sendCampaignSetupTelemetry(event) {
        if (!this.campaignSetupId)
            return;
        let timeInCampaignSetup = (Date.now() - this.campaignSetupTimestamp) / 1000; // in seconds
        let campaignSetupData = {
            Status: event.detail.event,
            TimeInCampaignSetup: timeInCampaignSetup,
            CampaignSetupId: this.campaignSetupId,
            HumanCount: event.detail.humanCount ? event.detail.humanCount : -1,
            ParticipantCount: event.detail.participantCount ? event.detail.participantCount : -1,
        };
        Telemetry.sendCampaignSetup(campaignSetupData);
        this.campaignSetupId = null; //reset
    }
    openEvents() {
        ContextManager.popUntil("main-menu");
        Animations.cancelAllChainedAnimations();
        window.addEventListener(EventsScreenGoSinglePlayerEventName, this.eventsGoSinglePlayerListener);
        window.addEventListener(EventsScreenGoMultiPlayerEventName, this.eventsGoMultiPlayerListener);
        window.addEventListener(EventsScreenLoadEventName, this.eventsGoLoadListener);
        window.addEventListener(EventsScreenContinueEventName, this.eventsGoContinueListener);
        this.slot.classList.add("hidden");
        this.clear3DScene();
        ContextManager.push("screen-events", { singleton: true, createMouseGuard: true });
    }
    clearEventsListeners() {
        window.removeEventListener(EventsScreenGoSinglePlayerEventName, this.eventsGoSinglePlayerListener);
        window.removeEventListener(EventsScreenGoMultiPlayerEventName, this.eventsGoMultiPlayerListener);
        window.removeEventListener(EventsScreenLoadEventName, this.eventsGoLoadListener);
        window.removeEventListener(EventsScreenContinueEventName, this.eventsGoContinueListener);
    }
    onEventsGoSP() {
        this.clearEventsListeners();
        if (ContextManager.getCurrentTarget() == this.Root) {
            FocusManager.setFocus(this.slot);
        }
        this.openCreateGame();
    }
    onEventsGoLoad() {
        this.clearEventsListeners();
        if (ContextManager.getCurrentTarget() == this.Root) {
            FocusManager.setFocus(this.slot);
        }
        this.openLoadGame(true);
    }
    onEventsGoContinue() {
        this.clearEventsListeners();
        if (ContextManager.getCurrentTarget() == this.Root) {
            FocusManager.setFocus(this.slot);
        }
        this.goContinue();
    }
    onEventsGoMP() {
        this.returnedToMainMenu();
        if (ContextManager.getCurrentTarget() == this.Root) {
            FocusManager.setFocus(this.slot);
        }
        this.openMultiplayer();
    }
    openExtras() {
        ContextManager.popUntil("main-menu");
        Animations.cancelAllChainedAnimations();
        ContextManager.push("screen-extras", { singleton: true, createMouseGuard: true });
    }
    openStore() {
        const isUserInput = true;
        const result = Network.triggerNetworkCheck(isUserInput);
        if (result.wasErrorDisplayedOnFirstParty) {
            return;
        }
        if (result.networkResult == NetworkResult.NETWORKRESULT_NO_NETWORK) {
            DialogManager.createDialog_Confirm({ body: Locale.compose("LOC_UI_CONNECTION_FAILED"), title: Locale.compose("LOC_UI_OFFLINE_ACCOUNT_TITLE") });
            return;
        }
        ContextManager.popUntil("main-menu");
        Animations.cancelAllChainedAnimations();
        ContextManager.push("screen-store-launcher", { singleton: true, createMouseGuard: true });
    }
    onNewCampaignStart() {
        let timeInCampaignSetup = (Date.now() - this.campaignSetupTimestamp) / 1000; // in seconds
        let campaignSetupData = {
            Status: CampaignSetupType.Complete,
            TimeInCampaignSetup: timeInCampaignSetup,
            CampaignSetupId: this.campaignSetupId,
        };
        Telemetry.sendCampaignSetup(campaignSetupData);
    }
    openOptions() {
        if (this.checkForLegalDocs()) {
            return;
        }
        Animations.cancelAllChainedAnimations();
        ContextManager.push("screen-options", { singleton: true, createMouseGuard: true });
    }
    checkForLegalDocs() {
        if (this.areLegalDocsAccepted) {
            return false;
        }
        this.updateAreLegalDocsAccepted();
        return !this.areLegalDocsAccepted;
    }
    build3DScene() {
        if (this.leaderModelSetup) {
            return;
        }
        this.clear3DScene();
        Camera.pushCamera(MainMenu.VO_CAMERA_POSITION, { x: MainMenu.VO_CAMERA_TARGET.x, y: MainMenu.VO_CAMERA_TARGET.y, z: MainMenu.VO_CAMERA_TARGET.z });
        const leaderData = getLeaderData().filter(l => l.isOwned);
        const civData = GetCivilizationData().filter(l => l.isOwned);
        // and display them with a spotlight
        this.MainMenuSceneModels = WorldUI.createModelGroup("MainMenuScene");
        let mainMenuAssetID = null;
        for (let attemptsLeft = 3; attemptsLeft >= 0; attemptsLeft--) {
            // select the last player leader (the one that's selected on the continue save)
            let leaderIndex = -1;
            let civIndex = -1;
            if (this.continueSave) {
                const lastLeader = this.continueSave.hostLeader;
                leaderIndex = leaderData.findIndex(l => l.leaderID == lastLeader);
                const lastCiv = this.continueSave.hostCivilization;
                civIndex = civData.findIndex(l => l.civID == lastCiv);
            }
            if (leaderIndex == -1) {
                // choose a random leader
                leaderIndex = leaderData.length > 0 ? UI.randomInt(0, leaderData.length - 1) : -1;
            }
            if (civIndex == -1) {
                // choose a random civ
                civIndex = civData.length > 0 ? UI.randomInt(0, civData.length - 1) : -1;
            }
            let assetName = "LEADER_FALLBACK_GAME_ASSET";
            if (leaderIndex != -1) {
                if (!leaderData[leaderIndex].isLocked && leaderData[leaderIndex].isOwned) {
                    assetName = leaderData[leaderIndex].leaderID + "_GAME_ASSET";
                }
                else if (attemptsLeft != 0) {
                    continue;
                }
            }
            else {
                console.warn("main-menu build3DScene: leaderData is empty");
            }
            const leader = this.MainMenuSceneModels.addModelAtPos(assetName, { x: 0, y: 0, z: 0 }, { angle: 0, initialState: "IDLE_CharSelect", triggerCallbacks: true });
            // we picked a leader with no model available?
            if (leader) {
                this.MainMenuSceneModels.addModelAtPos("LEADER_LIGHTING_SCENE_CHAR_SELECT_GAME_ASSET", { x: 0, y: 0, z: 0 }, { angle: 0 });
                mainMenuAssetID = WorldUI.loadAsset(assetName);
                WorldUI.addBackgroundLayer("mm_bg_ramp", {}); // default values are correct, Fill/CenterX/CenterY
                if (civIndex != -1) {
                    const backgroundName = `bg-panel-${civData[civIndex].civID.replace("CIVILIZATION_", "").toLowerCase()}`;
                    WorldUI.addMaskedBackgroundLayer(backgroundName, "mm_bg_mask", { stretch: StretchMode.UniformFill, alignY: AlignMode.Maximum }); // uniform anchored at bottom
                }
                else {
                    console.warn("main-menu build3DScene: civData is empty");
                }
                break;
            }
        }
        this.leaderModelSetup = true;
        // Preload all of the leader models in the background one at a time so that we can reduce pop-in on the character selection screen.
        this.leaderIndexToPreload = 0;
        this.beginPreloadingForNextLeader(mainMenuAssetID);
    }
    clear3DScene() {
        if (this.MainMenuSceneModels) {
            this.MainMenuSceneModels.destroy();
            this.MainMenuSceneModels = null;
            WorldUI.clearBackground();
            Camera.popCamera();
            this.leaderModelSetup = false;
        }
    }
    beginPreloadingForNextLeader(assetToWaitFor) {
        const leaderData = getLeaderData();
        if (this.leaderIndexToPreload >= leaderData.length) {
            this.leaderIndexToPreload = -1;
            return;
        }
        this.hasPreloadingBegun = false;
        this.currentPreloadingAsset = assetToWaitFor;
        window.requestAnimationFrame(() => { this.onUpdate(); });
    }
    preloadLeaderModels(index) {
        const leaderData = getLeaderData();
        if (index >= leaderData.length || index < 0) {
            this.leaderIndexToPreload = -1;
            this.hasPreloadingBegun = true;
            return;
        }
        let assetName = leaderData[index].leaderID + "_GAME_ASSET";
        this.beginPreloadingForNextLeader(WorldUI.loadAsset(assetName));
        this.leaderIndexToPreload += 1;
        return;
    }
    onUpdate() {
        if (!this.hasPreloadingBegun) {
            if (this.currentPreloadingAsset == null || WorldUI.isAssetLoaded(this.currentPreloadingAsset)) {
                this.preloadLeaderModels(this.leaderIndexToPreload);
            }
            else {
                window.requestAnimationFrame(() => { this.onUpdate(); });
            }
        }
    }
    get isShrouded() {
        return this.slot.classList.contains('hidden');
    }
    // blank out main menu
    raiseShroud() {
        this.slot.classList.add("hidden");
        this.buildInfo.classList.add("hidden");
        this.hideOnlineFeaturesUI();
        this.clear3DScene();
    }
    // show main menu
    lowerShroud() {
        this.slot.classList.remove("hidden");
        this.shroud.style.display = "none";
    }
    exitToDesktop() {
        engine.call('exitToDesktop');
    }
    onLaunchToHostMPGame() {
        this.trySkipMenuAnimations();
        // this flow is currently ONLY for PS5's Activities
        if (this.checkForLegalDocs()) {
            return;
        }
        const skipToGameCreator = true;
        MultiplayerShellManager.onGameBrowse(ServerType.SERVER_TYPE_INTERNET, skipToGameCreator);
    }
    isFullAccountLinkedAndConnected() {
        return Network.isConnectedToNetwork() && Network.isLoggedIn() && Network.isFullAccountLinked();
    }
    onOdrButtonActivate() {
        this.showDownloadAssetsDialogConfirm();
    }
    showDownloadAssetsDialogConfirm() {
        DialogManager.createDialog_MultiOption({
            body: "LOC_UI_HIGH_END_DOWNLOAD_BODY",
            title: "LOC_UI_HIGH_END_DOWNLOAD_TITLE",
            canClose: false,
            options: [
                {
                    actions: ["cancel", "keyboard-escape"],
                    label: "LOC_GENERIC_CANCEL",
                },
                {
                    actions: ["accept"],
                    label: "LOC_GENERIC_CONFIRM",
                    callback: (eAction) => {
                        if (eAction == DialogBoxAction.Confirm) {
                            UI.startHighEndAssetsDownload();
                            ContextManager.push("odr-download", { singleton: true });
                        }
                    }
                }
            ],
        });
    }
}
MainMenu.VO_CAMERA_POSITION = { x: -1.834, y: -23.0713, z: 15.2000 };
MainMenu.VO_CAMERA_TARGET = { x: -2.7588, y: -17.4867, z: 14.8042 };
// ---------------------------------------------------------------------------
Loading.runWhenFinished(() => {
    // Start automation scripts only once we reached main menu
    // Otherwise it is started too soon and this engine.whenReady will reset gameConfig after it is set by automation
    Automation.start();
});
Controls.define('main-menu', {
    createInstance: MainMenu,
    description: 'Main Menu',
    classNames: ['relative'],
    attributes: [
        {
            name: 'data-is-first-boot',
            description: 'Whether or not this is the first boot.'
        },
        {
            name: 'data-launch-to-host-MP-game',
            description: 'Whether to launch the host MP flow.'
        }
    ],
    styles: ['fs://game/core/ui/shell/main-menu/main-menu.css'],
    content: ['fs://game/core/ui/shell/main-menu/main-menu.html'],
    tabIndex: -1,
});

//# sourceMappingURL=file:///core/ui/shell/main-menu/main-menu.js.map
