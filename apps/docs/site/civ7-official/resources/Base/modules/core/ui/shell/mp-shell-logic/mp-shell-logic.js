/**
 * @file mp-logic.ts
 * @copyright 2021, Firaxis Games
 * @description An object to catch mp messages and orchestrate UI responses.
 */
import ContextManager from '/core/ui/context-manager/context-manager.js';
import DialogManager from '/core/ui/dialog-box/manager-dialog-box.js';
import { NetworkUtilities } from '/core/ui/utilities/utilities-network.js';
import { joinGameErrorTypeToErrorBody, lobbyErrorTypeToErrorBody } from '/core/ui/utilities/utilities-network-constants.js';
import { SuspendCloseListenerEvent, ResumeCloseListenerEvent } from '/core/ui/events/shell-events.js';
import { GameCreatorOpenedEvent } from '/core/ui/events/shell-events.js';
import { ScreenProfilePageExternalStatus } from '/core/ui/profile-page/screen-profile-page.js';
import { MainMenuReturnEvent } from '/core/ui/events/shell-events.js';
export const MultiplayerMatchMakeCompleteEventName = 'mp-game-match-make-complete';
export class MultiplayerMatchMakeCompleteEvent extends CustomEvent {
    constructor() {
        super('mp-game-match-make-complete', { bubbles: false, cancelable: true });
    }
}
export const MultiplayerMatchMakeFailEventName = 'mp-game-match-make-fail';
export class MultiplayerMatchMakeFailEvent extends CustomEvent {
    constructor() {
        super('mp-game-match-make-fail', { bubbles: false, cancelable: true });
    }
}
export const MultiplayerJoinCompleteEventName = 'mp-game-join-complete';
export class MultiplayerJoinCompleteEvent extends CustomEvent {
    constructor() {
        super('mp-game-join-complete', { bubbles: false, cancelable: true });
    }
}
export const MultiplayerJoinFailEventName = 'mp-game-join-fail';
export class MultiplayerJoinFailEvent extends CustomEvent {
    constructor(error) {
        super('mp-game-join-fail', { bubbles: false, cancelable: true, detail: { error } });
    }
}
export const MultiplayerCreateCompleteEventName = 'mp-game-create-complete';
export class MultiplayerCreateCompleteEvent extends CustomEvent {
    constructor() {
        super('mp-game-create-complete', { bubbles: false, cancelable: true });
    }
}
export const MultiplayerCreateFailEventName = 'mp-game-create-fail';
export class MultiplayerCreateFailEvent extends CustomEvent {
    constructor(result) {
        super('mp-game-create-fail', { bubbles: false, cancelable: true, detail: { result } });
    }
}
export const MultiplayerCreateAttemptEventName = 'mp-game-create-attempt';
export class MultiplayerCreateAttemptEvent extends CustomEvent {
    constructor() {
        super('mp-game-create-attempt', { bubbles: false, cancelable: true });
    }
}
export const MultiplayerGameAbandonedEventName = 'mp-game-abandoned';
export class MultiplayerGameAbandonedEvent extends CustomEvent {
    constructor(reason) {
        super('mp-game-abandoned', { bubbles: false, cancelable: true, detail: { reason } });
    }
}
class MultiplayerShellManagerSingleton {
    constructor() {
        this.serverType = ServerType.SERVER_TYPE_NONE;
        this.skipToGameCreator = false; // Landing dialog will select Internet and go straight to Host MP game (Sony activity Flow)
        this.waitingForParentalPermissions = false;
        this.needToDisplayExitGameErrorDialog = false;
        this.canMPDialogShow = true;
        this.savedErrorTitle = "";
        this.savedErrorBody = "";
        this.multiplayerGameAbandonedListener = (data) => { this.onMultiplayerGameAbandoned(data); };
        this.childNoPermissionsDialogListener = () => { this.onChildNoPermissionsDialog(); };
        this.parentalPermissionListener = this.openChildMultiplayer.bind(this);
        engine.whenReady.then(() => {
            engine.on('error_unplugged_network_cable_EXAMPLE', (data) => {
                // Dialog with one option, generic confirm: 
                DialogManager.createDialog_Confirm({
                    body: data.dialogBody,
                    title: data.dialogTitle,
                    callback: data.dialogCallback
                });
            });
            engine.on('error_generic_EXAMPLE', (data) => {
                // Dialog with one option, generic confirm.
                // In this set up, as long as the error bring event data with relevant strings for 
                // different errors, you could route multiple errors through here to trigger a dialog popup.
                DialogManager.createDialog_Confirm({
                    body: data.dialogBody,
                    title: data.dialogTitle,
                    callback: data.dialogCallback
                });
            });
            engine.on('error_search_is_taking_a_long_time_EXAMPLE', () => {
                this.onError_SearchIsTakingALongTime();
            });
            engine.on('PremiumServiceCheckComplete', (data) => { this.onPremiumServiceCheckComplete(data); });
            engine.on('MultiplayerJoinRoomAttempt', () => { this.onJoiningInProgress(); });
            engine.on('MultiplayerJoinGameComplete', () => { this.onJoinSuccess(); });
            engine.on('MultiplayerJoinRoomFailed', (data) => { this.onMultiplayerJoinRoomFailed(data); });
            engine.on("MultiplayerGameAbandoned", this.multiplayerGameAbandonedListener);
            engine.on('MultiplayerLobbyCreated', () => { this.onLobbyCreated(); });
            engine.on('MultiplayerLobbyError', this.onLobbyError);
            engine.on("ChildNoPermissionDialog", this.childNoPermissionsDialogListener);
            engine.on("COPPACheckComplete", this.parentalPermissionListener);
            engine.on("ExitToMainMenu", this.exitToMainMenu, this);
        });
    }
    /**
     * Singleton accessor
     */
    static getInstance() {
        if (!MultiplayerShellManagerSingleton._Instance) {
            MultiplayerShellManagerSingleton._Instance = new MultiplayerShellManagerSingleton();
        }
        return MultiplayerShellManagerSingleton._Instance;
    }
    /**
     * Example of a more complicated / customized dialog box.
     */
    onError_SearchIsTakingALongTime() {
        if (this.searchTimeoutDialogBoxID != undefined) {
            return;
        }
        // Example: "Search is taking a long time; do you want to continue to wait or return back to MP lobby?"
        // Option 1: continue waiting 
        const continueWaitingCallback = () => {
            this.searchTimeoutDialogBoxID = undefined;
        };
        let continueWaitingOption = {
            actions: ["accept"],
            label: "LOC_MP_ERROR_CONTINUE_WAITING",
            callback: continueWaitingCallback,
        };
        // Option 2: return to lobby
        const returnToLobbyCallback = () => {
            this.searchTimeoutDialogBoxID = undefined;
        };
        let returnToLobbyOption = {
            actions: ["cancel", "keyboard-escape"],
            label: "LOC_MP_ERROR_RETURN_TO_LOBBY",
            callback: returnToLobbyCallback,
        };
        // Raise dialog
        const options = [continueWaitingOption, returnToLobbyOption];
        this.searchTimeoutDialogBoxID = DialogManager.createDialog_MultiOption({
            body: "LOC_MP_ERROR_SEARCH_TIMEOUT_BODY",
            title: "LOC_MP_ERROR_SEARCH_TIMEOUT_TITLE",
            options: options
        });
    }
    /**
     * Show a pop up while joining a game, with only a [Cancel] option available.
     */
    onJoiningInProgress() {
        window.dispatchEvent(new SuspendCloseListenerEvent());
        if (this.clientMatchmakingGameDialogBoxId != undefined) {
            DialogManager.closeDialogBox(this.clientMatchmakingGameDialogBoxId);
            this.clientMatchmakingGameDialogBoxId = undefined;
            window.dispatchEvent(new MultiplayerMatchMakeCompleteEvent());
        }
        console.log("=============> MP Shell logic ON JOIN IN PROGRESS");
        // Make sure we have the correct serverType cached for when we go back to the browser.
        // This might not be set correctly if we bypassed the landing page with a game invite.
        this.serverType = Network.getServerType();
        // If we are joining a game without the games browser on the stack, we accepted a game invite from
        // potentially anywhere on the frontend (create game flow, age transition flow, etc) 
        // We need to pop back to the main menu so that the user won't go
        // back to stale screens if they exit the multiplayer match.
        if (!ContextManager.hasInstanceOf("screen-mp-browser")) {
            ContextManager.popUntil('main-menu');
            // Make sure we have the browser on the page stack so we will return to it if the 
            // player backs out of the game (manually or due to error) before going ingame.
            // Games running with a GameCenter do not use the games browser at all.
            if (Network.getLocalHostingPlatform() != HostingType.HOSTING_TYPE_GAMECENTER) {
                this.onGameBrowse(this.serverType);
            }
        }
        else {
            if (!ContextManager.isCurrentClass("screen-mp-browser")) {
                ContextManager.popUntil("screen-mp-browser");
            }
        }
        if (this.clientJoiningGameDialogBoxID != undefined) {
            return;
        }
        // Joining Game popup
        const cancelWaitingCallback = () => {
            this.clientJoiningGameDialogBoxID = undefined;
            Network.leaveMultiplayerGame();
            window.dispatchEvent(new MultiplayerJoinFailEvent("cancel"));
        };
        this.clientJoiningGameDialogBoxID = DialogManager.createDialog_Cancel({
            body: "LOC_MP_JOINING_GAME_BODY",
            title: "LOC_MP_JOINING_GAME_TITLE",
            callback: cancelWaitingCallback
        });
        if (MultiplayerShellManager.unitTestMP) {
            setTimeout(() => {
                this.onJoinSuccess();
            }, 1000);
        }
    }
    onJoinSuccess() {
        console.log("=============> MP Shell logic ON JOIN SUCCESS");
        if (this.hostCreatingGameDialogBoxID != undefined) {
            DialogManager.closeDialogBox(this.hostCreatingGameDialogBoxID);
            this.hostCreatingGameDialogBoxID = undefined;
        }
        if (this.clientJoiningGameDialogBoxID != undefined) {
            DialogManager.closeDialogBox(this.clientJoiningGameDialogBoxID);
            this.clientJoiningGameDialogBoxID = undefined;
        }
        ContextManager.pop("screen-mp-browser");
        ContextManager.push("screen-mp-lobby", { singleton: true, createMouseGuard: true });
        window.dispatchEvent(new ResumeCloseListenerEvent());
        window.dispatchEvent(new MultiplayerJoinCompleteEvent());
    }
    onMultiplayerJoinRoomFailed(data) {
        let joinErrorStr = "LOC_JOIN_GAME_ROOM_UNKNOWN_ERROR";
        let dataErrorStr = joinGameErrorTypeToErrorBody.get(data.error);
        if (dataErrorStr) {
            joinErrorStr = dataErrorStr;
        }
        this.onJoiningFail(joinErrorStr);
        window.dispatchEvent(new ResumeCloseListenerEvent());
        window.dispatchEvent(new MultiplayerJoinFailEvent(joinErrorStr));
    }
    onJoiningFail(errorMessage) {
        if (this.hostCreatingGameDialogBoxID != undefined) {
            DialogManager.closeDialogBox(this.hostCreatingGameDialogBoxID);
            this.hostCreatingGameDialogBoxID = undefined;
        }
        if (this.clientJoiningGameDialogBoxID != undefined) {
            DialogManager.closeDialogBox(this.clientJoiningGameDialogBoxID);
            this.clientJoiningGameDialogBoxID = undefined;
        }
        this.exitMPGame("LOC_MP_JOINING_ERROR_TITLE", errorMessage);
    }
    onChildNoPermissionsDialog() {
        if (this.noChildPermissionDialogBoxID != undefined) {
            return;
        }
        this.noChildPermissionDialogBoxID = DialogManager.createDialog_Confirm({
            body: Locale.compose("LOC_JOIN_GAME_CHILD_ACCOUNT"),
            title: Locale.compose("LOC_UI_LINK_ACCOUNT_SUBTITLE"),
            callback: this.noChildPermissionDialogBoxID = undefined
        });
    }
    onPremiumServiceCheckComplete(event) {
        if (this.premiumWaitDialogBoxID != undefined) {
            DialogManager.closeDialogBox(this.premiumWaitDialogBoxID);
        }
        if (!event.hasPremiumServices) {
            if (this.needToDisplayExitGameErrorDialog && this.savedErrorBody != "" && this.savedErrorBody != "" && this.exitGameErrorDialogBoxID == undefined) {
                this.exitGameErrorDialogBoxID = DialogManager.createDialog_Confirm({
                    title: this.savedErrorTitle,
                    body: this.savedErrorBody,
                    callback: () => this.exitGameErrorDialogBoxID = undefined
                });
                this.needToDisplayExitGameErrorDialog = false;
            }
            if (this.noPremiumDialogBoxID == undefined) {
                this.noPremiumDialogBoxID = DialogManager.createDialog_Confirm({
                    body: event.errorMessage,
                    title: "LOC_MP_CANT_PLAY_ONLINE_ERROR_TITLE",
                    callback: () => {
                        this.noPremiumDialogBoxID = undefined;
                        Network.clearPremiumError();
                        window.dispatchEvent(new MainMenuReturnEvent());
                    }
                });
            }
        }
        else if (this.premiumWaitDialogBoxID != undefined) {
            // only continue the flow only if we had a wait premium check dialog box indicating we requested to open the game browser
            if (this.skipToGameCreator) {
                // This flow is for Sony's Activities only (straight into Create Game page)
                ContextManager.push('screen-mp-create-game', { singleton: true, createMouseGuard: true });
                window.dispatchEvent(new GameCreatorOpenedEvent());
            }
            else {
                ContextManager.push("screen-mp-browser", { singleton: true, createMouseGuard: true, attributes: { "server-type": this.serverType } });
            }
        }
        this.premiumWaitDialogBoxID = undefined;
        if (this.needToDisplayExitGameErrorDialog && this.savedErrorBody != "" && this.savedErrorBody != "" && this.exitGameErrorDialogBoxID == undefined) {
            this.exitGameErrorDialogBoxID = DialogManager.createDialog_Confirm({
                title: this.savedErrorTitle,
                body: this.savedErrorBody,
                callback: () => this.exitGameErrorDialogBoxID = undefined
            });
            this.needToDisplayExitGameErrorDialog = false;
        }
        window.dispatchEvent(new ResumeCloseListenerEvent());
    }
    onMatchMakingInProgress() {
        if (this.clientMatchmakingGameDialogBoxId != undefined) {
            return;
        }
        const cancelWaitingCallback = () => {
            Network.leaveMultiplayerGame();
            this.clientMatchmakingGameDialogBoxId = undefined;
            window.dispatchEvent(new MultiplayerMatchMakeFailEvent());
        };
        // Raise dialog
        this.clientMatchmakingGameDialogBoxId = DialogManager.createDialog_Cancel({
            body: "",
            title: "LOC_MP_MATCHMAKING_GAME_TITLE",
            displayHourGlass: true,
            callback: cancelWaitingCallback
        });
        // unitTestMP manually pushes the join fail/success trigger.
        if (MultiplayerShellManager.unitTestMP) {
            setTimeout(() => {
                this.onJoiningFail("UnitTestMP Test Error!");
                this.clientMatchmakingGameDialogBoxId = undefined;
            }, 1000);
        }
        // If we're doing this for real, the model-mp-landing will moves us 
        // to the next stage on MultiplayerJoinRoomComplete or MultiplayerJoinRoomFailed.
    }
    hasSupportForLANLikeServerTypes() {
        const isLANServerTypeSupported = Network.hasCapability(NetworkCapabilityTypes.LANServerType);
        const isWirelessServerTypeSupported = Network.hasCapability(NetworkCapabilityTypes.WirelessServerType);
        return isLANServerTypeSupported || isWirelessServerTypeSupported;
    }
    onGameBrowse(serverType, skipToGameCreator = false) {
        this.serverType = serverType;
        this.skipToGameCreator = skipToGameCreator;
        if (serverType == ServerType.SERVER_TYPE_LAN || serverType == ServerType.SERVER_TYPE_WIRELESS) {
            ContextManager.push("screen-mp-browser", { singleton: true, createMouseGuard: true, attributes: { "server-type": serverType } });
            return;
        }
        if (serverType == ServerType.SERVER_TYPE_INTERNET) {
            const isUserInput = true;
            if (!this.ensureInternetConnection(isUserInput)) {
                return;
            }
            const isOnline = Network.isConnectedToSSO() || Network.isAuthenticated();
            if (!isOnline && !Network.isBanned()) {
                Network.tryConnect(true);
                DialogManager.createDialog_Confirm({
                    body: Locale.compose("LOC_UI_CONNECTION_FAILED"),
                    title: Locale.compose("LOC_UI_OFFLINE_ACCOUNT_TITLE")
                });
                this.tellMainMenuWereBack();
                return;
            }
            else if (Network.isBanned()) {
                let banInfo = Network.getBanInfo();
                if (banInfo != "") {
                    DialogManager.createDialog_Confirm({
                        body: banInfo,
                        title: Locale.compose("LOC_UI_OFFLINE_ACCOUNT_TITLE")
                    });
                }
                else {
                    DialogManager.createDialog_Confirm({
                        body: Locale.compose("LOC_UI_ACCOUNT_BANNED"),
                        title: Locale.compose("LOC_UI_OFFLINE_ACCOUNT_TITLE")
                    });
                }
                this.tellMainMenuWereBack();
                return;
            }
            if (!this.canMPDialogShow) {
                this.tellMainMenuWereBack();
                return;
            }
            if (!Network.isLoggedIn()) {
                Network.tryConnect(false);
                DialogManager.createDialog_Confirm({
                    body: Locale.compose("LOC_UI_ACCOUNT_LOGIN_PROMPT"),
                    title: Locale.compose("LOC_UI_LOGIN_ACCOUNT_TITLE")
                });
                this.tellMainMenuWereBack();
                return;
            }
            if (Network.isAccountLinked() && !Network.isAccountComplete()) {
                if (Network.canDisplayQRCode()) {
                    ContextManager.push("screen-mp-link-account", { singleton: true, createMouseGuard: true });
                }
                this.tellMainMenuWereBack();
                return;
            }
            if (!Network.isFullAccountLinked()) {
                this.canMPDialogShow = false;
                DialogManager.createDialog_Confirm({
                    body: Locale.compose("LOC_UI_LINK_ACCOUNT_REQUIRED"),
                    title: Locale.compose("LOC_UI_LINK_ACCOUNT_TITLE"),
                    callback: () => {
                        this.canMPDialogShow = true;
                    }
                });
                this.tellMainMenuWereBack();
                return;
            }
            if (Network.isBanned()) {
                DialogManager.createDialog_Confirm({
                    body: Locale.compose("LOC_JOIN_GAME_BANNED_BODY"),
                    title: Locale.compose("LOC_JOIN_GAME_BANNED_TITLE")
                });
                this.tellMainMenuWereBack();
                return;
            }
            if (Network.isChildAccount()) {
                Network.sendParentalStatusQuery();
                this.waitingForParentalPermissions = true;
            }
            else {
                this.sendPremiumCheckRequest();
            }
        }
    }
    onLanding() {
        ContextManager.push("screen-mp-landing", { singleton: true, createMouseGuard: true });
    }
    tellMainMenuWereBack() {
        window.dispatchEvent(new MainMenuReturnEvent());
    }
    sendPremiumCheckRequest() {
        if (this.premiumWaitDialogBoxID != undefined) {
            return;
        }
        window.dispatchEvent(new SuspendCloseListenerEvent());
        // Display the loading popup before launching the async code
        this.premiumWaitDialogBoxID = DialogManager.createDialog_MultiOption({
            body: "LOC_MAIN_MENU_PREMIUM_SERVICES_RETRIEVING_DATA",
            title: "LOC_MAIN_MENU_PREMIUM_SERVICES_RETRIEVING_DATA_TITLE",
            options: [],
            canClose: false,
            displayHourGlass: true,
        });
        // Triggering the check for the existence of premium services
        // Next step is in onPremiumServiceCheckComplete().
        Network.sendPremiumCheckRequest();
    }
    openChildMultiplayer() {
        if (this.waitingForParentalPermissions) {
            this.waitingForParentalPermissions = false;
            if (Network.isChildOnlinePermissionsGranted()) {
                // We requested permission and got it, move on to final check:
                this.sendPremiumCheckRequest();
            }
            else { // child but no online permissions
                DialogManager.createDialog_Confirm({
                    body: Locale.compose("LOC_MP_JOIN_PARENT_PERMISSIONS_DISABLED"),
                    title: Locale.compose("LOC_MP_PARENT_PERMISSIONS_TITLE"),
                    callback: () => {
                        window.dispatchEvent(new MainMenuReturnEvent());
                    }
                });
            }
        }
    }
    onGameMode() {
        const isUserInput = true;
        if (!this.ensureInternetConnection(isUserInput)) {
            return;
        }
        if (Network.isFullAccountLinked()) {
            this.serverType = ServerType.SERVER_TYPE_INTERNET;
            ContextManager.push("screen-mp-game-mode", { singleton: true, createMouseGuard: true });
        }
        else if (this.accountNotLinkedDialogBoxID == undefined) {
            this.accountNotLinkedDialogBoxID = DialogManager.createDialog_Confirm({
                body: Locale.compose("LOC_UI_GAME_CENTER_REQUIRED"),
                title: Locale.compose("LOC_UI_GAME_CENTER_TITLE"),
                callback: () => {
                    this.accountNotLinkedDialogBoxID = undefined;
                    window.dispatchEvent(new MainMenuReturnEvent());
                }
            });
        }
    }
    ensureInternetConnection(isUserInput) {
        const result = Network.triggerNetworkCheck(isUserInput);
        if (result.wasErrorDisplayedOnFirstParty) {
            this.tellMainMenuWereBack();
            return false;
        }
        const isConnectedToInternet = result.networkResult != NetworkResult.NETWORKRESULT_NO_NETWORK;
        if (!isConnectedToInternet) {
            DialogManager.createDialog_Confirm({
                body: "LOC_UI_MP_LANDING_ERROR_NO_CONNECTION",
                title: "LOC_UI_NO_INTERNET_CONNECTION_TITLE"
            });
            this.tellMainMenuWereBack();
            return false;
        }
        return true;
    }
    onAutomatch(matchAgeID) {
        let success = true;
        if (!MultiplayerShellManager.unitTestMP) {
            // matchMakeMultiplayerGame() handles the game configuration setup for us.
            success = Network.matchMakeMultiplayerGame(MultiplayerShellManager.serverType, matchAgeID);
        }
        if (success) {
            //Tell the shell manager to bring up the matchmaking dialog.
            MultiplayerShellManager.onMatchMakingInProgress();
        }
        else {
            let matchmakeErrMsg = Locale.compose("LOC_UI_MP_LANDING_MATCHMAKE_START_ERROR");
            MultiplayerShellManager.onJoiningFail(matchmakeErrMsg);
        }
    }
    /* Main Menu calls this to transition the user to the staging room for a multiplayer age transition. */
    onAgeTransition() {
        console.log("=============> MP Shell logic ON AGE TRANSITION");
        // Make sure we have the correct serverType cached for when we go back to the browser.
        // This will have been reset while we were at the worldview.
        this.serverType = Network.getServerType();
        ContextManager.push("screen-mp-lobby", { singleton: true, createMouseGuard: true });
    }
    /**
     * Show a pop up when an MP game was abandoned
     */
    onMultiplayerGameAbandoned(data) {
        const abandonPopup = NetworkUtilities.multiplayerAbandonReasonToPopup(data.reason);
        window.dispatchEvent(new MultiplayerGameAbandonedEvent(abandonPopup));
        this.exitMPGame(abandonPopup.title, abandonPopup.body);
    }
    exitToMainMenu() {
        Network.onExitPremium();
        ContextManager.popUntil("main-menu");
        ScreenProfilePageExternalStatus.isGameCreationDomainInitialized = false;
        window.dispatchEvent(new MainMenuReturnEvent());
    }
    /**
      * We have left a multiplayer game and need to return to the games browser.
      * Display an error popup if errorTitle and errorBody are non-empty.
    */
    exitMPGame(errorTitle, errorBody) {
        if ((errorTitle != "" && errorBody == "") || (errorTitle == "" && errorBody != "")) {
            console.warn("exitMPGame(): error dialog only works with both errorTitle and errorBody being non-empty. errorTitle=${errorTitle}, errorBody=${errorBody}");
        }
        // Pop any popup dialogs (like the joining-in-progress or matchmaking dialogs)
        if (this.hostCreatingGameDialogBoxID != undefined) {
            DialogManager.closeDialogBox(this.hostCreatingGameDialogBoxID);
            this.hostCreatingGameDialogBoxID = undefined;
        }
        if (this.clientJoiningGameDialogBoxID != undefined) {
            DialogManager.closeDialogBox(this.clientJoiningGameDialogBoxID);
            this.clientJoiningGameDialogBoxID = undefined;
        }
        if (this.clientMatchmakingGameDialogBoxId != undefined) {
            DialogManager.closeDialogBox(this.clientMatchmakingGameDialogBoxId);
            this.clientMatchmakingGameDialogBoxId = undefined;
        }
        this.returnToBaseToPanel();
        // The current UX flow for returnToBaseToPanel drops the player all the way to the main menu and then pushes back to the browser.
        // This triggers a premium services check that conflicts with the game exit error dialog but only with internet multiplayer. 
        // The offline multiplayer modes do not trigger the premium services check and should trigger the game exit error dialog immediately.   
        // See IGP-101386.
        if (errorTitle != "" && errorBody != "" && this.exitGameErrorDialogBoxID == undefined) {
            const gameConfig = Configuration.getGame();
            if (gameConfig.isInternetMultiplayer && ContextManager.getCurrentTarget()?.tagName != "SCREEN-MP-BROWSER") {
                // delay the actual error dialog callback until premium check is done from returning to mp game screen
                // other wise the premium check can wipe away the error dialog
                this.needToDisplayExitGameErrorDialog = true;
                this.savedErrorTitle = errorTitle;
                this.savedErrorBody = errorBody;
            }
            // Trigger the dialog directly for offline multiplayer modes.
            else {
                this.exitGameErrorDialogBoxID = DialogManager.createDialog_Confirm({
                    title: errorTitle,
                    body: errorBody,
                    callback: () => this.exitGameErrorDialogBoxID = undefined
                });
                this.needToDisplayExitGameErrorDialog = false;
            }
        }
    }
    /* The games browser needs to exit to the main menu due to an error */
    browserExitError(errorTitle, errorBody) {
        this.exitToMainMenu();
        // in case we end up here while the close listener was suspended
        window.dispatchEvent(new ResumeCloseListenerEvent());
        if (this.exitBrowserDialogBoxID != undefined) {
            return;
        }
        this.exitBrowserDialogBoxID = DialogManager.createDialog_Confirm({
            title: errorTitle,
            body: errorBody,
            callback: () => this.exitBrowserDialogBoxID = undefined
        });
    }
    hostMultiplayerGame(eServerType) {
        if (this.hostCreatingGameDialogBoxID != undefined) {
            return;
        }
        ScreenProfilePageExternalStatus.isGameCreationDomainInitialized = true;
        window.dispatchEvent(new SuspendCloseListenerEvent());
        window.dispatchEvent(new MultiplayerCreateAttemptEvent());
        // Creating Game popup
        const cancelCreateGameCallback = () => {
            this.hostCreatingGameDialogBoxID = undefined;
            Network.leaveMultiplayerGame();
            window.dispatchEvent(new ResumeCloseListenerEvent());
            window.dispatchEvent(new MultiplayerCreateFailEvent(NetworkResult.NETWORKRESULT_NONE));
        };
        this.hostCreatingGameDialogBoxID = DialogManager.createDialog_Cancel({
            body: "LOC_MP_CREATE_GAME_WAITING_BODY",
            title: "LOC_MP_CREATE_GAME_WAITING_TITLE",
            callback: cancelCreateGameCallback
        });
        const result = Network.hostMultiplayerGame(eServerType);
        if (![NetworkResult.NETWORKRESULT_OK, NetworkResult.NETWORKRESULT_PENDING].includes(result)) {
            window.dispatchEvent(new MultiplayerCreateFailEvent(result));
            this.hostCreatingGameDialogBoxID = undefined;
            Network.leaveMultiplayerGame();
        }
    }
    onLobbyCreated() {
        if (this.hostCreatingGameDialogBoxID != undefined) {
            DialogManager.closeDialogBox(this.hostCreatingGameDialogBoxID);
            this.hostCreatingGameDialogBoxID = undefined;
        }
        window.dispatchEvent(new MultiplayerCreateCompleteEvent());
    }
    onLobbyError({ errorCode }) {
        if (ContextManager.hasInstanceOf("screen-mp-browser") || ContextManager.hasInstanceOf("screen-mp-lobby")) {
            this.browserExitError("LOC_LOBBY_ERROR_TITLE", lobbyErrorTypeToErrorBody.get(errorCode) ?? "LOC_LOBBY_ERROR_UNKNOWN_ERROR");
        }
    }
    handleInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return true;
        }
        // let isShiftDown = Input.isCtrlDown();
        if ((inputEvent.detail.name == "center-plot-cursor" || //TODO: Right stick press placeholder until gamepad can support input combinations
            inputEvent.detail.name == "open-techs") //TODO: Requires new action for 'R' key on KBM
            && Network.supportsSSO()) {
            ContextManager.push('screen-mp-friends', { singleton: true, createMouseGuard: true });
            inputEvent.preventDefault();
            inputEvent.stopImmediatePropagation();
            return false;
        }
        return true;
    }
    handleNavigation(navigationEvent) {
        if (navigationEvent) {
            // Do not handle navigation here.
        }
        return true;
    }
    get unitTestMP() {
        return Network.unitTestModeEnabled;
    }
    /**
     * Delay executing a function for the given number of frames.
     * TODO: Remove function if Gameface is able to resolve earlier OR move to a global function for all places to call. Cf. also other existing delayByFrame() functions.
     * @param func The function to call
     * @param frames The number of frames to wait for
     */
    delayExecute(func, frames = 2) {
        if (frames == 0) {
            func();
        }
        else {
            window.requestAnimationFrame(() => {
                this.delayExecute(func, frames - 1);
            });
        }
    }
    /**
     * return to the game browser panel when available, otherwise return to the main menu
     */
    returnToBaseToPanel() {
        ScreenProfilePageExternalStatus.isGameCreationDomainInitialized = false;
        if (Network.getLocalHostingPlatform() != HostingType.HOSTING_TYPE_GAMECENTER) {
            if (ContextManager.getCurrentTarget()?.tagName != "SCREEN-MP-BROWSER") {
                ContextManager.popUntil('main-menu');
                ContextManager.push("screen-mp-browser", { singleton: true, createMouseGuard: true, attributes: { "server-type": this.serverType } });
                window.dispatchEvent(new ResumeCloseListenerEvent());
            }
        }
        else {
            window.dispatchEvent(new MainMenuReturnEvent());
            ContextManager.popUntil('main-menu');
        }
    }
}
const MultiplayerShellManager = MultiplayerShellManagerSingleton.getInstance();
export { MultiplayerShellManager as default };

//# sourceMappingURL=file:///core/ui/shell/mp-shell-logic/mp-shell-logic.js.map
