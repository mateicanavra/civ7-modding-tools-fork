/**
 * @file system-message-manager.ts
 * @copyright 2022, Firaxis Games
 * @description Manages the data and queue for important system messages
 */

import ContextManager from '/core/ui/context-manager/context-manager.js'
import { IDisplayRequestBase, DisplayHandlerBase } from '/core/ui/context-manager/display-handler.js'
import { DisplayQueueManager } from '/core/ui/context-manager/display-queue-manager.js'
import DialogManager, { DialogBoxOption, DialogBoxAction, DialogBoxCallbackSignature } from '/core/ui/dialog-box/manager-dialog-box.js'

interface SystemMessageData {
	systemMessageTitle: string,
	systemMessageContent: string,
	buttonData: SystemMessageButtonData[],
	queueToOverride?: string
}

interface SystemMessageButtonData {
	callback(): void,
	caption: string
}

interface DisplayMessage {
	title: string;
	message: string;
}

interface SystemMessageRequest extends SystemMessageData, IDisplayRequestBase { }

class SystemMessageManagerClass extends DisplayHandlerBase<SystemMessageRequest> {
	private showInviteListener = (data: ShowInvitePopup_EventData) => { this.onShowInvite(data) }
	private OnlineErrorListener = (data: OnlineErrorData) => { this.DisplayOnlineError(data); }
	private LoadLatestSaveGameListener: EventListener = this.onActivityLoadLastSaveGame.bind(this);
	private HostMPGameListener: EventListener = this.onActivityHostMPGame.bind(this);

	private pendingInviteJoinCode: string = "";
	private pendingInviteInviterName: string = "";

	currentSystemMessage: SystemMessageData | null = null;

	private errorMessagesCodes: { [key in OnlineErrorType]: DisplayMessage } = {
		[OnlineErrorType.ONLINE_PROMO_REDEEM_FAILED]: { title: "LOC_ONLINE_REDEEM_ERROR_TITLE", message: "LOC_ONLINE_REDEEM_ERROR_BODY" },
	}

	constructor() {
		super("SystemMessage", 3000);

		engine.on("ShowInvitePopup", this.showInviteListener)
		engine.on("DNAErrorOccurred", this.OnlineErrorListener);
		engine.on("LaunchToLoadLastSaveGame", this.LoadLatestSaveGameListener);
		engine.on("RequestConfirmHostMPGame", this.HostMPGameListener);
	}

	private onShowInvite(data: ShowInvitePopup_EventData) {
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

	showInvitePopup(inviterName: string, joinCode: string) {
		const joinButtonData: SystemMessageButtonData = {
			callback: () => {
				if (UI.isInGame()) {
					//If we are already in game, give the player a chance to save their game before joining the new one
					const okOption: DialogBoxOption = {
						actions: ["accept"],
						label: Locale.compose("LOC_GENERIC_OK"),
						callback: () => {
							const configSaveType: SaveTypes = GameStateStorage.getGameConfigurationSaveType();
							const configServerType: ServerType = Network.getServerType();

							ContextManager.push("screen-save-load", { singleton: true, createMouseGuard: true, attributes: { "menu-type": "save", "server-type": configServerType, "save-type": configSaveType, "from-invite": true } });
						}
					};

					const cancelOption: DialogBoxOption = {
						actions: ["cancel", "keyboard-escape"],
						label: Locale.compose("LOC_GENERIC_NO"),
						callback: () => {
							Network.acceptInvite(joinCode);
						}
					}

					DialogManager.createDialog_MultiOption({
						body: "LOC_SYSTEM_MESSAGE_GAME_INVITE_SAVE_GAME_CONTENT",
						title: "LOC_SYSTEM_MESSAGE_GAME_INVITE_SAVE_GAME_TITLE",
						options: [okOption, cancelOption]
					});
				} else {
					Network.acceptInvite(joinCode);
				}
			},
			caption: Locale.compose("LOC_SYSTEM_MESSAGE_GAME_INVITE_JOIN")
		}

		const declineButtonData: SystemMessageButtonData = {
			callback: () => {
				Network.declineInvite(joinCode);
			},
			caption: Locale.compose("LOC_SYSTEM_MESSAGE_GAME_INVITE_DECLINE")
		}

		const systemMessageData: SystemMessageData = {
			systemMessageTitle: Locale.compose("LOC_SYSTEM_MESSAGE_GAME_INVITE_TITLE", inviterName),
			systemMessageContent: UI.isInGame() ? Locale.compose("LOC_SYSTEM_MESSAGE_GAME_INVITE_CONTENT_IN_GAME", inviterName) : Locale.compose("LOC_SYSTEM_MESSAGE_GAME_INVITE_CONTENT", inviterName),
			buttonData: [joinButtonData, declineButtonData]
		}

		this.addDisplayRequest(systemMessageData, true);
	}

	public show(): void {
		if (DialogManager.isDialogBoxOpen || !this.currentSystemMessage) {
			return;
		}

		ContextManager.push("screen-system-message", { singleton: true, createMouseGuard: true });
	}

	public hide(): void {
		ContextManager.pop("screen-system-message");
	}

	public showPendingInvitePopup() {
		this.showInvitePopup(this.pendingInviteInviterName, this.pendingInviteJoinCode);
	}

	public acceptInviteAfterSaveComplete() {
		if (this.pendingInviteJoinCode == "") {
			console.error("system-message-manager: Attempting to accept game invite after succesful save but pendingInviteJoinCode is invalid!");
			return;
		}

		Network.acceptInvite(this.pendingInviteJoinCode);
	}

	private DisplayOnlineError(data: OnlineErrorData) {
		let translation = this.errorMessagesCodes[data.ErrorType];

		if (translation == undefined) {
			console.log("Missing translation for error: ", data.ErrorType);
			return;
		}

		this.displayMessage(translation.title, translation.message);
	}

	private displayMessage(messageTitle: string, messageBody: string) {
		if ((messageTitle != "" && messageBody == "") || (messageTitle == "" && messageBody != "")) {
			console.warn("displayError(): error dialog only works with both errorTitle and errorBody being non-empty. errorTitle=${errorTitle}, errorBody=${errorBody}");
		}
		// Pop any popup dialogs
		ContextManager.pop('screen-dialog-box');

		if (Network.getLocalHostingPlatform() != HostingType.HOSTING_TYPE_GAMECENTER) {
			ContextManager.popUntil("screen-mp-browser");
		} else {
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

	private onActivityLoadLastSaveGame() {
		if (UI.isInGame()) {
			const dbCallback: DialogBoxCallbackSignature = (eAction: DialogBoxAction) => {
				if (eAction == DialogBoxAction.Confirm) {
					UI.activityLoadLastSaveGameConfirmed();
				}
			}
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

	private onActivityHostMPGame() {
		if (UI.isInGame()) {
			const dbCallback: DialogBoxCallbackSignature = (eAction: DialogBoxAction) => {
				if (eAction == DialogBoxAction.Confirm) {
					UI.activityHostMPGameConfirmed();
					engine.call('exitToMainMenu');
				}
			}
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
export { SystemMessageManager as default }

DisplayQueueManager.registerHandler(SystemMessageManager);