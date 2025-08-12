/**
 * @file oob-experience-mgr.ts
 * @copyright 2020-2025, Firaxis Games
 * @description Initial boot-up screens and out-of-box experience/first time user experience
 */
import ContextManager from '/core/ui/context-manager/context-manager.js';
import DialogManager, { DialogBoxAction, DialogSource } from '/core/ui/dialog-box/manager-dialog-box.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { FxsSlider } from '/core/ui/components/fxs-slider.js';
import { InputEngineEventName } from '/core/ui/input/input-support.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import { CreateGameModel } from '/core/ui/shell/create-panels/create-game-model.js';
import { parseLegalDocument } from '/core/ui/utilities/utilities-liveops.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import { LegalDocsPlacementAcceptName } from '/core/ui/shell/mp-legal/mp-legal.js';
import { LoginResults } from '/core/ui/utilities/utilities-network-constants.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';
import { Layout } from '/core/ui/utilities/utilities-layout.js';
import { DisplayQueueManager } from '/core/ui/context-manager/display-queue-manager.js';
const audioDynamicRanges = [
    { label: "LOC_OPTIONS_AUDIO_DYNAMIC_RANGE_WIDE" },
    { label: "LOC_OPTIONS_AUDIO_DYNAMIC_RANGE_STANDARD" },
    { label: "LOC_OPTIONS_AUDIO_DYNAMIC_RANGE_NARROW" }
];
const a11yItemList = [
    { label: "LOC_OPTIONS_ACCESSIBILITY_COLORBLIND_NONE" },
    { label: "LOC_OPTIONS_ACCESSIBILITY_COLORBLIND_PROTANOPIA" },
    { label: "LOC_OPTIONS_ACCESSIBILITY_COLORBLIND_DEUTERANOPIA" },
    { label: "LOC_OPTIONS_ACCESSIBILITY_COLORBLIND_TRITANOPIA" }
];
/* enum of sub-screens.  Must match subscreenList. */
var SubScreens;
(function (SubScreens) {
    SubScreens[SubScreens["SUB_SCREEN_LEGAL_DOCUMENTS"] = 0] = "SUB_SCREEN_LEGAL_DOCUMENTS";
    // start of the navigable list
    SubScreens[SubScreens["SUB_SCREEN_LIST_START"] = 1] = "SUB_SCREEN_LIST_START";
    SubScreens[SubScreens["SUB_SCREEN_DISPLAY_SETTINGS"] = 1] = "SUB_SCREEN_DISPLAY_SETTINGS";
    SubScreens[SubScreens["SUB_SCREEN_AUDIO_SETTINGS"] = 2] = "SUB_SCREEN_AUDIO_SETTINGS";
    SubScreens[SubScreens["SUB_SCREEN_AUTOSAVE"] = 3] = "SUB_SCREEN_AUTOSAVE";
    SubScreens[SubScreens["SUB_SCREEN_MOVIES"] = 4] = "SUB_SCREEN_MOVIES";
    // end of the navigable list
    SubScreens[SubScreens["SUB_SCREEN_LIST_END"] = 4] = "SUB_SCREEN_LIST_END";
})(SubScreens || (SubScreens = {}));
;
/* list of sub-screens in order, not including the initial splash screen with legal text/middleware logos */
const subscreenList = [
    ".oobe-legal-documents-container", ".oobe-display-container", ".oobe-audio-container", ".oobe-autosave-container"
];
var LogoTrainMovies;
(function (LogoTrainMovies) {
    LogoTrainMovies[LogoTrainMovies["LOGO_TRAIN_START"] = 0] = "LOGO_TRAIN_START";
    LogoTrainMovies[LogoTrainMovies["LOGO_TRAIN_INTEL"] = 1] = "LOGO_TRAIN_INTEL";
    LogoTrainMovies[LogoTrainMovies["LOGO_TRAIN_2K_FIRAXIS"] = 2] = "LOGO_TRAIN_2K_FIRAXIS";
    LogoTrainMovies[LogoTrainMovies["LOGO_TRAIN_MAIN_INTRO"] = 3] = "LOGO_TRAIN_MAIN_INTRO";
    LogoTrainMovies[LogoTrainMovies["LOGO_TRAIN_END"] = 4] = "LOGO_TRAIN_END";
})(LogoTrainMovies || (LogoTrainMovies = {}));
;
/**
 * The Out Of Box Experience Manager - handles initial startup screens and
 * the "true OOBE" first boot sequence.
 */
class OutOfBoxExperienceManager extends Component {
    constructor() {
        super(...arguments);
        this.engineInputListener = this.onEngineInput.bind(this);
        this.legalDocsEngineInputListener = this.onLegalDocsEngineInput.bind(this);
        this.subScreenInputListener = this.onSubScreenInput.bind(this);
        this.logoTrainEngineInputListener = this.onEngineInputLogoTrain.bind(this);
        this.logoTrainVideoEndedListener = this.doNextLogo.bind(this);
        this.legalDocumentAcceptedResultListener = this.onServerAcceptResults.bind(this);
        this.legalTimeoutListener = this.onLegalTimeout.bind(this);
        this.goToMainMenuListener = this.goToMainMenu.bind(this);
        this.onLaunchHostMPGameListener = this.onLaunchToHostMPGame.bind(this);
        this.logoTrainMovie = LogoTrainMovies.LOGO_TRAIN_START;
        this.legalContainer = null;
        this.isFirstBoot = false;
        this.isSessionStartup = false;
        this.isLaunchToHostMP = false;
        this.currentDocumentId = "";
        this.currentFocus = this.Root;
        this.subscreenIndex = -1; // illegal value to make the nav tray update not show anything on the initial splash
        this.installedInputHandler = false;
        this.pendingSSODialogBoxID = -1;
        this.alreadyDidLegalDocs = false;
        this.forcingOfflineLegalDocs = false;
        this.notWaitingLegalTimeout = false;
        this.displayContainer = MustGetElement(".oobe-display-container", this.Root);
        this.gfxQuality = document.createElement("fxs-dropdown");
        this.accessibility = document.createElement("fxs-dropdown");
        this.origSetting = -1;
        this.ddProfileItems = [];
        this.hasGraphicsOptions = false;
        this.audioContainer = MustGetElement(".oobe-audio-container", this.Root);
        this.dynRange = document.createElement("fxs-dropdown");
        this.subTitles = document.createElement("fxs-checkbox");
    }
    onLaunchToHostMPGame() {
        this.isLaunchToHostMP = true;
        this.goToMainMenu();
    }
    onAttach() {
        super.onAttach();
        // Currently only used by PS5 Activities
        engine.on("LaunchToHostMPGame", this.onLaunchHostMPGameListener);
        // Calling this will return if it's the first boot, and then clear the option flag
        this.isFirstBoot = UI.isFirstBoot();
        CreateGameModel.isFirstTimeCreateGame = this.isFirstBoot;
        if (this.isFirstBoot) {
            engine.on("FetchedOnlineLegalDocsComplete", this.doPendingLegalDocs, this);
            engine.on("FetchedOfflineLegalDocsComplete", this.doOfflineLegalDocs, this);
        }
        //! Careful with use of `UI.isSessionStartup()` as it will only return true *once*.
        this.isSessionStartup = UI.isSessionStartup();
        const intelLogo = MustGetElement(".oob-intel-logo", this.Root);
        if (UI.isHostAPC()) {
            intelLogo.classList.remove("hidden");
        }
        this.legalContainer = MustGetElement('.oobe-legal-container', this.Root);
        Input.setActiveContext(InputContext.Shell);
        ContextManager.pushElement(this.Root);
        UI.panelStart("first-boot", "", UIViewChangeMethod.Unknown, true);
        DialogManager.setSource(DialogSource.Shell);
        this.setupDisplaySettings();
        this.setupAudioSettings();
        const prevButton = MustGetElement(".oobe-prev-subscreen", this.Root);
        prevButton.addEventListener("action-activate", this.previousSubScreen.bind(this));
        const nextButton = MustGetElement(".oobe-next-subscreen", this.Root);
        nextButton.addEventListener("action-activate", this.nextSubScreen.bind(this));
        document.body.classList.add("visible");
        document.body.style.opacity = "1";
        // if we're restarting due to a graphics quality change in the first-time setup flow, resume on the next sub-screen
        if (UI.getOOBEGraphicsRestart()) {
            this.nextSubScreen();
        }
        else {
            if (UI.isShowIntroSequences() && this.isSessionStartup && !Automation.isActive) {
                if (this.legalContainer) {
                    this.legalContainer.classList.remove("hidden");
                    setTimeout(this.legalTimeoutListener, 2000);
                }
            }
            else {
                // wait a short time before advancing, GameFace doesn't like us detaching ourselves during onAttach()
                setTimeout(this.goToMainMenuListener, 100);
            }
        }
    }
    onDetach() {
        super.onDetach();
        engine.off("LaunchToHostMPGame");
        if (this.isFirstBoot) {
            engine.off("FetchedOnlineLegalDocsComplete", this.doPendingLegalDocs, this);
            engine.off("FetchedOfflineLegalDocsComplete", this.doOfflineLegalDocs, this);
        }
    }
    onReceiveFocus() {
        super.onReceiveFocus();
        this.updateNavTray();
        FocusManager.setFocus(this.currentFocus);
    }
    onLoseFocus() {
        NavTray.clear();
        super.onLoseFocus();
    }
    updateNavTray() {
        NavTray.clear();
        switch (this.subscreenIndex) {
            case SubScreens.SUB_SCREEN_LEGAL_DOCUMENTS:
                NavTray.addOrUpdateGenericAccept();
                break;
            case SubScreens.SUB_SCREEN_AUTOSAVE:
                NavTray.addOrUpdateCancel("LOC_GENERIC_BACK");
                NavTray.addOrUpdateGenericAccept();
                break;
            case SubScreens.SUB_SCREEN_DISPLAY_SETTINGS:
                NavTray.addOrUpdateShellAction1("LOC_GENERIC_CONTINUE");
                break;
            case SubScreens.SUB_SCREEN_AUDIO_SETTINGS:
                NavTray.addOrUpdateCancel("LOC_GENERIC_BACK");
                NavTray.addOrUpdateShellAction1("LOC_GENERIC_CONTINUE");
                break;
            // no nav tray for movies
            case SubScreens.SUB_SCREEN_MOVIES:
                break;
        }
    }
    onLegalTimeout() {
        this.notWaitingLegalTimeout = true;
        if (this.legalContainer) {
            this.legalContainer.classList.add("hidden");
            if (this.isFirstBoot) {
                const buttonBar = MustGetElement(".oobe-button-bar", this.Root);
                buttonBar.classList.remove("hidden");
                this.subscreenIndex = SubScreens.SUB_SCREEN_LEGAL_DOCUMENTS;
                this.launchSubScreen();
            }
            else {
                this.logoTrainMovie = LogoTrainMovies.LOGO_TRAIN_START;
                this.doLogoTrain();
            }
        }
    }
    onEngineInputLogoTrain(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        if (inputEvent.detail.name == 'accept' ||
            inputEvent.detail.name == 'shell-action-1' ||
            inputEvent.detail.name == 'shell-action-2' ||
            inputEvent.detail.name == 'sys-menu' ||
            inputEvent.detail.name == 'mousebutton-left' ||
            inputEvent.detail.name == 'touch-tap' ||
            inputEvent.detail.name == 'cancel') {
            this.doNextLogo();
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
    }
    doLogoTrain() {
        const movieContainer = MustGetElement('.intro-movie-container', this.Root);
        const oobeContainer = MustGetElement('.oobe-container', this.Root);
        oobeContainer.classList.add("h-full");
        // clear any existing children
        while (movieContainer.childNodes.length > 0) {
            movieContainer.removeChild(movieContainer.childNodes[0]);
        }
        // if not a PC, don't show the Intel logo movie
        if (this.logoTrainMovie == LogoTrainMovies.LOGO_TRAIN_START) {
            if (UI.isHostAPC()) {
                this.logoTrainMovie = LogoTrainMovies.LOGO_TRAIN_INTEL;
            }
            else {
                this.logoTrainMovie = LogoTrainMovies.LOGO_TRAIN_2K_FIRAXIS;
            }
            this.Root.addEventListener(InputEngineEventName, this.logoTrainEngineInputListener);
        }
        let movieId = '';
        // Determine what movie id to use based on configuration database.
        const results = Database.query('config', 'SELECT MainMenuTransition FROM Logos ORDER BY Priority DESC LIMIT 1');
        if (results && results.length > 0) {
            const transitionId = results[0].MainMenuTransition;
            if (typeof transitionId == 'string') {
                movieId = transitionId;
            }
        }
        if (movieId && !Automation.isActive) {
            const movie = document.createElement("fxs-movie");
            movie.classList.add('absolute', 'inset-0');
            if (UI.getViewExperience() == UIViewExperience.Mobile && Layout.isCompact()) {
                movie.setAttribute("data-movie-fit-mode", "cover");
            }
            switch (this.logoTrainMovie) {
                case LogoTrainMovies.LOGO_TRAIN_INTEL:
                    movie.setAttribute('data-movie-id', 'MOVIE_BASE_INTELARC');
                    break;
                case LogoTrainMovies.LOGO_TRAIN_2K_FIRAXIS:
                    movie.setAttribute('data-movie-id', 'MOVIE_BASE_LOGOTRAIN');
                    break;
                case LogoTrainMovies.LOGO_TRAIN_MAIN_INTRO:
                    movie.setAttribute('data-movie-id', 'MOVIE_BASE_INTRO');
                    break;
            }
            movie.addEventListener("movie-ended", this.logoTrainVideoEndedListener);
            movieContainer.appendChild(movie);
            movieContainer.classList.remove("hidden");
        }
        else {
            // There will almost always be a movie available, but in the event there is none.  Skip to the main menu.
            this.goToMainMenu();
        }
    }
    doNextLogo() {
        this.logoTrainMovie++;
        if (this.logoTrainMovie >= LogoTrainMovies.LOGO_TRAIN_END) {
            this.Root.removeEventListener(InputEngineEventName, this.logoTrainEngineInputListener);
            this.goToMainMenu();
        }
        else {
            this.doLogoTrain();
        }
    }
    handleOfflineLegalFlow() {
        // We allow the users one last time to continue waiting or play offline
        const retryCallback = () => {
            this.doPendingLegalDocs();
        };
        const loadOfflineLegalDocs = (eAction) => {
            if (eAction == DialogBoxAction.Confirm) {
                // this will trigger a RestartDNABootFlow which will lead to offline legal docs fetching
                Network.loadOfflineLegalDocs();
                // ui still needs to check for the offline docs
                // FetchedOfflineLegalDocsComplete will be published when it's ready
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
    doPendingLegalDocs() {
        // We have been told recheck the legal doc status
        if (this.notWaitingLegalTimeout) {
            if (Network.hasProgressedPastLegalDocs()) {
                // the online legal docs are ready and accepted
                if (this.pendingSSODialogBoxID != -1) {
                    DisplayQueueManager.closeMatching(this.pendingSSODialogBoxID);
                    this.pendingSSODialogBoxID = -1;
                }
                this.subscreenIndex = SubScreens.SUB_SCREEN_LEGAL_DOCUMENTS;
                this.launchSubScreen();
            }
            else {
                // the legal docs are still not ready, inform users sso is pending & allow users to skip
                const cancelWaitForSSOCallback = () => {
                    this.handleOfflineLegalFlow();
                };
                this.pendingSSODialogBoxID = DialogManager.createDialog_Cancel({ displayHourGlass: true, title: Locale.compose("LOC_UI_SSO_CONNECTING_SUBTITLE"), callback: cancelWaitForSSOCallback });
            }
        }
    }
    doOfflineLegalDocs() {
        this.forcingOfflineLegalDocs = true;
        this.doLegalDocs();
    }
    doLegalDocs() {
        const legalDocuments = Network.getLegalDocuments(LegalDocsPlacementAcceptName);
        if (legalDocuments && (this.forcingOfflineLegalDocs || !this.alreadyDidLegalDocs)) {
            if (legalDocuments.length > 0) {
                // Are any of the documents unaccepted?  If so, the user must see them.
                let anyDocumentsUnaccepted = false;
                legalDocuments.forEach(document => {
                    if (document.state != LegalState.ACCEPT_CONFIRMED) {
                        anyDocumentsUnaccepted = true;
                    }
                });
                if (!anyDocumentsUnaccepted) {
                    this.nextSubScreen();
                }
                else {
                    const textField = MustGetElement(".oobe-legal-documents-text-content", this.Root);
                    const textTitle = MustGetElement(".oobe-legal-documents-title", this.Root);
                    const scrollable = MustGetElement(".oobe-legal-documents-scrollable", this.Root);
                    let documentType = 0;
                    for (let documentNum = 0; documentNum < legalDocuments.length; documentNum++) {
                        if (legalDocuments[documentNum].state != LegalState.ACCEPT_CONFIRMED) {
                            textTitle.innerHTML = legalDocuments[documentNum].title;
                            scrollable.setAttribute("scrollpercent", "1");
                            scrollable.setAttribute("scrollpercent", "0");
                            parseLegalDocument(textField, legalDocuments[documentNum].content);
                            this.currentDocumentId = legalDocuments[documentNum].documentId;
                            documentType = legalDocuments[documentNum].type;
                            break;
                        }
                    }
                    const legalContinue = MustGetElement(".oobe-legal-documents-continue", this.Root);
                    const privacyInstructions = MustGetElement(".oobe-privacy-notice-instructions", this.Root);
                    legalContinue.setAttribute("caption", "LOC_TUTORIAL_NEXT_PAGE");
                    NavTray.clear();
                    NavTray.addOrUpdateAccept("LOC_TUTORIAL_NEXT_PAGE");
                    if (documentType == 2) {
                        privacyInstructions.classList.remove("hidden");
                    }
                    else {
                        privacyInstructions.classList.add("hidden");
                        if (documentType == 1) {
                            legalContinue.setAttribute("caption", "LOC_GENERIC_ACCEPT");
                            NavTray.clear();
                            NavTray.addOrUpdateGenericAccept();
                        }
                    }
                    legalContinue.addEventListener("action-activate", () => {
                        // Tell the server we accepted the document.
                        Network.legalDocumentResponse(this.currentDocumentId, true);
                        engine.on("LegalDocumentAcceptedResult", this.legalDocumentAcceptedResultListener);
                        // remove the event listener to avoid a possible race condition
                        this.Root.removeEventListener(InputEngineEventName, this.legalDocsEngineInputListener);
                    });
                    this.Root.addEventListener(InputEngineEventName, this.legalDocsEngineInputListener);
                    window.requestAnimationFrame(() => {
                        window.requestAnimationFrame(() => {
                            const scrollableField = MustGetElement(".oobe-legal-documents-scrollable", this.Root);
                            this.currentFocus = scrollableField;
                            FocusManager.setFocus(scrollableField);
                        });
                    });
                }
            }
            else {
                this.nextSubScreen();
            }
        }
        else {
            this.nextSubScreen();
        }
        this.alreadyDidLegalDocs = true;
    }
    onLegalDocsEngineInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        switch (inputEvent.detail.name) {
            case "accept":
                // Tell the server we accepted the document.
                Network.legalDocumentResponse(this.currentDocumentId, true);
                engine.on("LegalDocumentAcceptedResult", this.legalDocumentAcceptedResultListener);
                this.Root.removeEventListener(InputEngineEventName, this.legalDocsEngineInputListener);
                inputEvent.stopPropagation();
                inputEvent.preventDefault();
                break;
        }
    }
    onSubScreenInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        switch (inputEvent.detail.name) {
            case "cancel":
                this.previousSubScreen();
                inputEvent.stopPropagation();
                inputEvent.preventDefault();
                Audio.playSound("data-audio-primary-button-press");
                break;
            case "shell-action-1":
                if (this.subscreenIndex != SubScreens.SUB_SCREEN_AUTOSAVE) {
                    this.nextSubScreen();
                    inputEvent.stopPropagation();
                    inputEvent.preventDefault();
                    Audio.playSound("data-audio-primary-button-press");
                }
                break;
            case "accept":
                if (this.subscreenIndex == SubScreens.SUB_SCREEN_AUTOSAVE) {
                    this.nextSubScreen();
                    inputEvent.stopPropagation();
                    inputEvent.preventDefault();
                    Audio.playSound("data-audio-primary-button-press");
                }
                break;
        }
    }
    onServerAcceptResults(data) {
        engine.off("LegalDocumentAcceptedResult", this.legalDocumentAcceptedResultListener);
        this.Root.removeEventListener(InputEngineEventName, this.legalDocsEngineInputListener);
        if (data.data == LoginResults.SUCCESS) {
            const legalDocuments = Network.getLegalDocuments(LegalDocsPlacementAcceptName);
            const textField = MustGetElement(".oobe-legal-documents-text-content", this.Root);
            const textTitle = MustGetElement(".oobe-legal-documents-title", this.Root);
            const scrollable = MustGetElement(".oobe-legal-documents-scrollable", this.Root);
            let wasDocumentFound = false;
            let documentType = 0;
            for (let documentNum = 0; documentNum < legalDocuments.length; documentNum++) {
                if (legalDocuments[documentNum].state != LegalState.ACCEPT_CONFIRMED) {
                    textTitle.innerHTML = legalDocuments[documentNum].title;
                    scrollable.setAttribute("scrollpercent", "1");
                    scrollable.setAttribute("scrollpercent", "0");
                    parseLegalDocument(textField, legalDocuments[documentNum].content);
                    this.currentDocumentId = legalDocuments[documentNum].documentId;
                    documentType = legalDocuments[documentNum].type;
                    wasDocumentFound = true;
                    this.Root.addEventListener(InputEngineEventName, this.legalDocsEngineInputListener);
                    break;
                }
            }
            if (!wasDocumentFound) {
                this.nextSubScreen();
            }
            else {
                const legalContinue = MustGetElement(".oobe-legal-documents-continue", this.Root);
                const privacyInstructions = MustGetElement(".oobe-privacy-notice-instructions", this.Root);
                legalContinue.setAttribute("caption", "LOC_TUTORIAL_NEXT_PAGE");
                NavTray.clear();
                NavTray.addOrUpdateAccept("LOC_TUTORIAL_NEXT_PAGE");
                if (documentType == 2) {
                    privacyInstructions.classList.remove("hidden");
                }
                else {
                    privacyInstructions.classList.add("hidden");
                    if (documentType == 1) {
                        legalContinue.setAttribute("caption", "LOC_GENERIC_ACCEPT");
                        NavTray.clear();
                        NavTray.addOrUpdateGenericAccept();
                    }
                }
            }
        }
        else {
            DialogManager.createDialog_Confirm({
                body: Locale.compose("LOC_UI_LEGAL_ERROR", data.data),
                title: "LOC_UI_LEGAL_ACCEPT"
            });
        }
    }
    setupDisplaySettings() {
        const displayControls = MustGetElement(".oobe-display-controls", this.displayContainer);
        const supportedOptions = GraphicsOptions.getSupportedOptions();
        this.hasGraphicsOptions = supportedOptions.profiles.length > 1;
        while (displayControls.children.length > 0) {
            displayControls.removeChild(displayControls.children[0]);
        }
        if (this.hasGraphicsOptions) {
            for (let i = 0; i < supportedOptions.profiles.length; i++) {
                const profile = supportedOptions.profiles[i];
                const name = UI.getGraphicsProfile(profile);
                const label = "LOC_OPTIONS_GFX_PROFILE_" + name.toUpperCase();
                this.ddProfileItems.push({ label, name, profile });
            }
        }
        // we create this dropdown even if the platform has no options to simplify the code
        this.gfxQuality.setAttribute("dropdown-items", JSON.stringify(this.ddProfileItems));
        this.gfxQuality.classList.add("gfx-quality", "h-10", "max-w-0");
        const profile = UI.getCurrentGraphicsProfile();
        for (let i = 0; i < this.ddProfileItems.length; i++) {
            if (this.ddProfileItems[i].name == profile) {
                this.gfxQuality.setAttribute("selected-item-index", i.toString());
                this.origSetting = i;
                break;
            }
        }
        // if the setting is corrupt, pick a default
        if (this.origSetting == -1) {
            this.gfxQuality.setAttribute("selected-item-index", "0");
        }
        if (this.hasGraphicsOptions) {
            const qualityContainer = document.createElement("div");
            qualityContainer.classList.add("flex", "flex-row", "justify-between", "items-end", "mb-4");
            const qualityTitle = document.createElement("div");
            qualityTitle.classList.add("font-body", "text-xl", "text-white");
            qualityTitle.innerHTML = Locale.compose("LOC_OPTIONS_GFX_PROFILE");
            qualityContainer.appendChild(qualityTitle);
            qualityContainer.appendChild(this.gfxQuality);
            displayControls.appendChild(qualityContainer);
        }
        const accessibilityContainer = document.createElement("div");
        accessibilityContainer.classList.add("flex", "flex-row", "justify-between", "items-end", "mb-4");
        const accessTitle = document.createElement("div");
        accessTitle.classList.add("font-body", "text-xl", "text-white");
        accessTitle.innerHTML = Locale.compose("LOC_OPTIONS_ACCESSIBILITY_COLORBLIND");
        accessibilityContainer.appendChild(accessTitle);
        this.accessibility.setAttribute("dropdown-items", JSON.stringify(a11yItemList));
        this.accessibility.classList.add("gfx-accessibility", "h-10", "max-w-0");
        this.accessibility.setAttribute("selected-item-index", Configuration.getUser().colorblindAdaptation.toString());
        accessibilityContainer.appendChild(this.accessibility);
        displayControls.appendChild(accessibilityContainer);
    }
    doDisplaySettings() {
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                if (this.hasGraphicsOptions) {
                    this.currentFocus = this.gfxQuality;
                }
                else {
                    this.currentFocus = this.accessibility;
                }
                FocusManager.setFocus(this.currentFocus);
                // if an fxs-popup is open, its focus loss handler will steal the focus, so take it back.
                FocusManager.setFocus(this.currentFocus);
            });
        });
    }
    displayContinue() {
        const profSelection = this.gfxQuality.getAttribute("selected-item-index");
        const accessibiltySelection = this.accessibility.getAttribute("selected-item-index");
        if ((profSelection || !this.hasGraphicsOptions) && accessibiltySelection) {
            const accessibilityNumber = parseInt(accessibiltySelection);
            Configuration.getUser().setColorblindAdaptation(accessibilityNumber);
            if (this.hasGraphicsOptions && profSelection) {
                const profSelNumber = parseInt(profSelection);
                // if we're going to restart due to a new setting, don't continue
                if (this.origSetting != profSelNumber) {
                    UI.setOOBEGraphicsRestart();
                    let graphicsOptions = GraphicsOptions.getCurrentOptions();
                    graphicsOptions = GraphicsOptions.fillAdvancedOptions(graphicsOptions);
                    graphicsOptions.profile = this.ddProfileItems[profSelNumber].profile;
                    GraphicsOptions.applyOptions(graphicsOptions);
                    UI.reloadUI();
                }
            }
            UI.commitApplicationOptions();
        }
    }
    setupAudioSettings() {
        const audioControls = MustGetElement(".oobe-audio-controls", this.audioContainer);
        const dynRangeContainer = document.createElement("div");
        dynRangeContainer.classList.add("flex", "flex-row", "justify-between", "items-end", "mb-4");
        const dynRangeTitle = document.createElement("div");
        dynRangeTitle.classList.add("font-body", "text-xl", "text-white");
        dynRangeTitle.innerHTML = Locale.compose("LOC_OPTIONS_AUDIO_DYNAMIC_RANGE");
        dynRangeContainer.appendChild(dynRangeTitle);
        this.dynRange.setAttribute("dropdown-items", JSON.stringify(audioDynamicRanges));
        this.dynRange.setAttribute("selected-item-index", Sound.getDynamicRangeOption().toString());
        this.dynRange.classList.add("h-10", "max-w-0");
        dynRangeContainer.appendChild(this.dynRange);
        audioControls.appendChild(dynRangeContainer);
        const masterVolumeContainer = document.createElement("div");
        masterVolumeContainer.classList.add("flex", "flex-row", "justify-between", "items-end", "mb-4");
        const mVolTitle = document.createElement("div");
        mVolTitle.classList.add("font-body", "text-xl", "text-white");
        mVolTitle.innerHTML = Locale.compose("LOC_OPTIONS_AUDIO_VOLUME_MASTER");
        masterVolumeContainer.appendChild(mVolTitle);
        const masterVolume = document.createElement("fxs-slider");
        masterVolume.setAttribute("value", `${Sound.volumeGetMaster() * 100}`);
        masterVolume.setAttribute("min", `0`);
        masterVolume.setAttribute("max", `100`);
        masterVolume.setAttribute("steps", `20`);
        audioControls.appendChild(masterVolume);
        masterVolumeContainer.appendChild(masterVolume);
        audioControls.appendChild(masterVolumeContainer);
        // Get the slider control's component so we can do live updates.
        // @ts-expect-error - gameface custom element initialization is broken when appending custom elements to other custom elements
        masterVolume.initialize();
        if (masterVolume.component instanceof FxsSlider) {
            masterVolume.component.Root.addEventListener(ComponentValueChangeEventName, (event) => {
                Sound.volumeSetMaster(event.detail.value / 100);
            });
        }
        const subtitlesContainer = document.createElement("div");
        subtitlesContainer.classList.add("flex", "flex-row", "justify-between", "items-end");
        const subtitlesTitle = document.createElement("div");
        subtitlesTitle.classList.add("font-body", "text-xl", "text-white");
        subtitlesTitle.innerHTML = Locale.compose("LOC_OPTIONS_SUBTITLES");
        subtitlesContainer.appendChild(subtitlesTitle);
        this.subTitles.setAttribute("selected", `${Sound.getSubtitles()}`);
        subtitlesContainer.appendChild(this.subTitles);
        audioControls.appendChild(subtitlesContainer);
    }
    doAudioSettings() {
        this.currentFocus = this.dynRange;
        // set the focus now.  If a popup is in the open state, it will change the focus out from under us, at which point the delayed focus set below will fix it.
        FocusManager.setFocus(this.currentFocus);
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                FocusManager.setFocus(this.currentFocus);
            });
        });
    }
    audioContinue() {
        const dynRangeSelection = this.dynRange.getAttribute("selected-item-index");
        if (dynRangeSelection) {
            Sound.setDynamicRangeOption(parseInt(dynRangeSelection));
        }
        const subtitlesChecked = this.subTitles.getAttribute("selected");
        Sound.setSubtitles(subtitlesChecked == "true");
        Sound.volumeWriteSettings();
        UI.setApplicationOption("Shell", "FirstBoot", 0);
        UI.commitApplicationOptions();
        Configuration.getUser().saveCheckpoint();
    }
    doAutosaveIndicator() {
        this.currentFocus = this.Root;
        // set the focus now.  If a popup is in the open state, it will change the focus out from under us, at which point the delayed focus set below will fix it.
        FocusManager.setFocus(this.currentFocus);
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                FocusManager.setFocus(this.currentFocus);
            });
        });
    }
    onEngineInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        if (inputEvent.detail.name == 'accept' ||
            inputEvent.detail.name == 'shell-action-1' ||
            inputEvent.detail.name == 'shell-action-2' ||
            inputEvent.detail.name == 'sys-menu' ||
            inputEvent.detail.name == 'mousebutton-left' ||
            inputEvent.detail.name == 'touch-tap' ||
            inputEvent.detail.name == 'cancel') {
            this.Root.removeEventListener(InputEngineEventName, this.engineInputListener);
            this.goToMainMenu();
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
    }
    goToMainMenu() {
        // Hide the legal screen to make sure no visual glitches happen when we remove our root.
        if (this.legalContainer) {
            this.legalContainer.classList.add("hidden");
        }
        const rootElement = document.querySelector("#roots");
        if (rootElement) {
            rootElement.removeChild(this.Root);
            ContextManager.pop(this.Root);
            const mainMenu = document.createElement(Configuration.getXR() ? 'xr-main-menu' : 'main-menu');
            mainMenu.setAttribute('data-is-first-boot', this.isFirstBoot ? "true" : "false");
            if (this.isLaunchToHostMP) {
                mainMenu.setAttribute('data-launch-to-host-MP-game', 'true');
            }
            rootElement.appendChild(mainMenu);
        }
    }
    launchSubScreen() {
        const buttonBar = MustGetElement(".oobe-button-bar", this.Root);
        const prevContainer = MustGetElement(".oobe-prev-container", this.Root);
        // hide the button bar by default
        buttonBar.classList.add("hidden");
        // update the nav tray now, because the legal docs need to do some special trickery
        this.updateNavTray();
        if (this.subscreenIndex == SubScreens.SUB_SCREEN_MOVIES) {
            UI.panelDefault();
        }
        else {
            UI.panelStart("first-boot-options", "", UIViewChangeMethod.Unknown, true);
        }
        switch (this.subscreenIndex) {
            case SubScreens.SUB_SCREEN_LEGAL_DOCUMENTS:
                if (Network.hasProgressedPastLegalDocs()) {
                    this.doLegalDocs();
                }
                else {
                    this.doPendingLegalDocs();
                }
                break;
            case SubScreens.SUB_SCREEN_DISPLAY_SETTINGS:
                buttonBar.classList.remove("hidden");
                prevContainer.classList.add("hidden");
                this.doDisplaySettings();
                if (!this.installedInputHandler) {
                    this.Root.addEventListener(InputEngineEventName, this.subScreenInputListener);
                    this.installedInputHandler = true;
                }
                break;
            case SubScreens.SUB_SCREEN_AUDIO_SETTINGS:
                buttonBar.classList.remove("hidden");
                prevContainer.classList.remove("hidden");
                this.doAudioSettings();
                break;
            case SubScreens.SUB_SCREEN_AUTOSAVE:
                buttonBar.classList.remove("hidden");
                this.doAutosaveIndicator();
                break;
            case SubScreens.SUB_SCREEN_MOVIES:
                this.Root.removeEventListener(InputEngineEventName, this.subScreenInputListener);
                this.logoTrainMovie = LogoTrainMovies.LOGO_TRAIN_START;
                this.doLogoTrain();
                break;
        }
        // process the screen list and show/hide appropriately
        subscreenList.forEach((screenClass) => {
            const screen = MustGetElement(screenClass, this.Root);
            if (screenClass == subscreenList[this.subscreenIndex]) {
                screen.classList.remove("hidden");
            }
            else {
                screen.classList.add("hidden");
            }
        });
    }
    leavingSubScreen() {
        switch (this.subscreenIndex) {
            case SubScreens.SUB_SCREEN_DISPLAY_SETTINGS:
                this.displayContinue();
                break;
            case SubScreens.SUB_SCREEN_AUDIO_SETTINGS:
                this.audioContinue();
                break;
        }
    }
    previousSubScreen() {
        if (this.subscreenIndex > SubScreens.SUB_SCREEN_LIST_START) {
            this.leavingSubScreen();
            this.subscreenIndex--;
            this.launchSubScreen();
        }
    }
    nextSubScreen() {
        if (this.subscreenIndex < SubScreens.SUB_SCREEN_LIST_END) {
            this.leavingSubScreen();
            this.subscreenIndex++;
            this.launchSubScreen();
        }
    }
}
Controls.define('oob-experience-manager', {
    createInstance: OutOfBoxExperienceManager,
    description: 'Initial game launch and first-time user setup manager',
    styles: ['fs://game/core/ui/shell/oob-experience/oob-experience-mgr.css'],
    content: ['fs://game/core/ui/shell/oob-experience/oob-experience-mgr.html'],
    images: ['blp:shell_logo-full.png', 'blp:ba_default.png', 'blp:powered_by_wwise.png', 'blp:coherent-gt-white.png', 'blp:oodle_logo.png'],
    tabIndex: -1,
});

//# sourceMappingURL=file:///core/ui/shell/oob-experience/oob-experience-mgr.js.map
