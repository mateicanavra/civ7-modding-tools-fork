/**
 * @file system-message-manager.ts
 * @copyright 2022, Firaxis Games
 * @description Manages the data and queue for important system messages
 */
import ContextManager from '/core/ui/context-manager/context-manager.js';
import { DisplayHandlerBase } from '/core/ui/context-manager/display-handler.js';
import { DisplayQueueManager } from '/core/ui/context-manager/display-queue-manager.js';
import DialogManager, { DialogBoxAction } from '/core/ui/dialog-box/manager-dialog-box.js';
class SystemMessageManagerClass extends DisplayHandlerBase {
    constructor() {
        super("SystemMessage", 3000);
        this.showInviteListener = (data) => { this.onShowInvite(data); };
        this.OnlineErrorListener = (data) => { this.DisplayOnlineError(data); };
        this.LoadLatestSaveGameListener = this.onActivityLoadLastSaveGame.bind(this);
        this.HostMPGameListener = this.onActivityHostMPGame.bind(this);
        this.pendingInviteJoinCode = "";
        this.pendingInviteInviterName = "";
        this.currentSystemMessage = null;
        this.errorMessagesCodes = {
            [OnlineErrorType.ONLINE_PROMO_REDEEM_FAILED]: { title: "LOC_ONLINE_REDEEM_ERROR_TITLE", message: "LOC_ONLINE_REDEEM_ERROR_BODY" },
        };
        engine.on("ShowInvitePopup", this.showInviteListener);
        engine.on("DNAErrorOccurred", this.OnlineErrorListener);
        engine.on("LaunchToLoadLastSaveGame", this.LoadLatestSaveGameListener);
        engine.on("RequestConfirmHostMPGame", this.HostMPGameListener);
    }
    onShowInvite(data) {
        // When InGame, gamecore sends a notification instead of a direct popup.
        // The notification handler will call showPendingInvitePopup()
        // and we will display the dialog from there.
        this.pendingInviteInviterName = data.playerName;
        this.pendingInviteJoinCode = data.inviteId;
        if (UI.isInGame()) {
            return;
        }
        this.showInvitePopup(data.playerName, data.inviteId);
    }
    showInvitePopup(inviterName, joinCode) {
        const joinButtonData = {
            callback: () => {
                if (UI.isInGame()) {
                    //If we are already in game, give the player a chance to save their game before joining the new one
                    const okOption = {
                        actions: ["accept"],
                        label: Locale.compose("LOC_GENERIC_OK"),
                        callback: () => {
                            const configSaveType = GameStateStorage.getGameConfigurationSaveType();
                            const configServerType = Network.getServerType();
                            ContextManager.push("screen-save-load", { singleton: true, createMouseGuard: true, attributes: { "menu-type": "save", "server-type": configServerType, "save-type": configSaveType, "from-invite": true } });
                        }
                    };
                    const cancelOption = {
                        actions: ["cancel", "keyboard-escape"],
                        label: Locale.compose("LOC_GENERIC_NO"),
                        callback: () => {
                            Network.acceptInvite(joinCode);
                        }
                    };
                    DialogManager.createDialog_MultiOption({
                        body: "LOC_SYSTEM_MESSAGE_GAME_INVITE_SAVE_GAME_CONTENT",
                        title: "LOC_SYSTEM_MESSAGE_GAME_INVITE_SAVE_GAME_TITLE",
                        options: [okOption, cancelOption]
                    });
                }
                else {
                    Network.acceptInvite(joinCode);
                }
            },
            caption: Locale.compose("LOC_SYSTEM_MESSAGE_GAME_INVITE_JOIN")
        };
        const declineButtonData = {
            callback: () => {
                Network.declineInvite(joinCode);
            },
            caption: Locale.compose("LOC_SYSTEM_MESSAGE_GAME_INVITE_DECLINE")
        };
        const systemMessageData = {
            systemMessageTitle: Locale.compose("LOC_SYSTEM_MESSAGE_GAME_INVITE_TITLE", inviterName),
            systemMessageContent: UI.isInGame() ? Locale.compose("LOC_SYSTEM_MESSAGE_GAME_INVITE_CONTENT_IN_GAME", inviterName) : Locale.compose("LOC_SYSTEM_MESSAGE_GAME_INVITE_CONTENT", inviterName),
            buttonData: [joinButtonData, declineButtonData]
        };
        this.addDisplayRequest(systemMessageData, true);
    }
    show() {
        if (DialogManager.isDialogBoxOpen || !this.currentSystemMessage) {
            return;
        }
        ContextManager.push("screen-system-message", { singleton: true, createMouseGuard: true });
    }
    hide() {
        ContextManager.pop("screen-system-message");
    }
    showPendingInvitePopup() {
        this.showInvitePopup(this.pendingInviteInviterName, this.pendingInviteJoinCode);
    }
    acceptInviteAfterSaveComplete() {
        if (this.pendingInviteJoinCode == "") {
            console.error("system-message-manager: Attempting to accept game invite after succesful save but pendingInviteJoinCode is invalid!");
            return;
        }
        Network.acceptInvite(this.pendingInviteJoinCode);
    }
    DisplayOnlineError(data) {
        let translation = this.errorMessagesCodes[data.ErrorType];
        if (translation == undefined) {
            console.log("Missing translation for error: ", data.ErrorType);
            return;
        }
        this.displayMessage(translation.title, translation.message);
    }
    displayMessage(messageTitle, messageBody) {
        if ((messageTitle != "" && messageBody == "") || (messageTitle == "" && messageBody != "")) {
            console.warn("displayError(): error dialog only works with both errorTitle and errorBody being non-empty. errorTitle=${errorTitle}, errorBody=${errorBody}");
        }
        // Pop any popup dialogs
        ContextManager.pop('screen-dialog-box');
        if (Network.getLocalHostingPlatform() != HostingType.HOSTING_TYPE_GAMECENTER) {
            ContextManager.popUntil("screen-mp-browser");
        }
        else {
            ContextManager.clear();
        }
        if (messageTitle != "" && messageBody != "") {
            const gameErrorDialogCallback = () => {
            };
            DialogManager.createDialog_Confirm({
                title: messageTitle,
                body: messageBody,
                callback: gameErrorDialogCallback
            });
        }
    }
    onActivityLoadLastSaveGame() {
        if (UI.isInGame()) {
            const dbCallback = (eAction) => {
                if (eAction == DialogBoxAction.Confirm) {
                    UI.activityLoadLastSaveGameConfirmed();
                }
            };
            DialogManager.createDialog_ConfirmCancel({
                body: "LOC_UI_ACTIVITY_LAST_SAVE_DESC",
                title: UI.isMultiplayer() ? "LOC_UI_ACTIVITY_LEAVE_MP_GAME_TITLE" : "LOC_UI_ACTIVITY_LEAVE_GAME_TITLE",
                displayQueue: "SystemMessage",
                canClose: false,
                callback: dbCallback
            });
        }
        else {
            UI.activityLoadLastSaveGameConfirmed();
        }
    }
    onActivityHostMPGame() {
        if (UI.isInGame()) {
            const dbCallback = (eAction) => {
                if (eAction == DialogBoxAction.Confirm) {
                    UI.activityHostMPGameConfirmed();
                    engine.call('exitToMainMenu');
                }
            };
            DialogManager.createDialog_ConfirmCancel({
                body: "LOC_UI_ACTIVITY_HOST_MP_DESC",
                title: UI.isMultiplayer() ? "LOC_UI_ACTIVITY_LEAVE_MP_GAME_TITLE" : "LOC_UI_ACTIVITY_LEAVE_GAME_TITLE",
                displayQueue: "SystemMessage",
                canClose: false,
                callback: dbCallback
            });
        }
        else {
            UI.activityHostMPGameConfirmed();
        }
    }
}
const SystemMessageManager = new SystemMessageManagerClass();
export { SystemMessageManager as default };
DisplayQueueManager.registerHandler(SystemMessageManager);

//# sourceMappingURL=file:///core/ui/system-message/system-message-manager.js.map
