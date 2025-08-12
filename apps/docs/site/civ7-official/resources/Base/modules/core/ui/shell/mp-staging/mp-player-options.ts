/**
 * @file mp-player-options.ts		
 * @copyright 2023, Firaxis Games
 * @description Multiplayer Lobby Player Options  
 */

import FocusManager from '/core/ui/input/focus-manager.js';
import { InputEngineEvent } from '/core/ui/input/input-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel, { AnchorType } from '/core/ui/panel-support.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import DialogManager, { DialogBoxOption } from '/core/ui/dialog-box/manager-dialog-box.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
import { abuseReasonToName } from '/core/ui/utilities/utilities-online.js';

class PanelMPPlayerOptions extends Panel {

	private engineInputListener: EventListener = (inputEvent: InputEngineEvent) => { this.onEngineInput(inputEvent); };
	private closeButtonListener: EventListener = (_event: Event) => { this.onClose(); }

	private reportButtonListener: EventListener = (_event: Event) => { this.onReport(); };
	private blockButtonListener: EventListener = (_event: Event) => { this.onBlock(); };

	private reportButton: HTMLElement | null = null;
	private blockButton: HTMLElement | null = null;

	private networkFriendID: string = "";
	private t2gpFriendID: string = "";

	constructor(root: ComponentRoot) {
		super(root);
		this.animateInType = this.animateOutType = AnchorType.RelativeToRight;
	}

	onAttach() {
		super.onAttach();

		const frame: HTMLElement = MustGetElement(".mp-player-options-frame", this.Root);
		const mainContainer: HTMLElement = MustGetElement(".main-container", frame);
		const leaderPortrait: HTMLElement = MustGetElement(".leader-portrait", mainContainer);
		this.reportButton = MustGetElement(".report", mainContainer);
		this.blockButton = MustGetElement(".block", mainContainer);
		const addPlatFriendButton: HTMLElement = MustGetElement(".add-Plat-Friend", mainContainer);
		const add2KFriendButton: HTMLElement = MustGetElement(".add-2K-Friend", mainContainer);
		const closeButton: HTMLElement = MustGetElement("fxs-close-button", frame);

		const playerIdAttribute: string | null = this.Root.getAttribute('playerId');
		if (!playerIdAttribute) {
			console.error("mp-player-options: onAttach(): Missing 'playerId' attribute");
			return;
		}

		this.Root.addEventListener('engine-input', this.engineInputListener);

		const playerID: number = parseInt(playerIdAttribute);
		const playerConfig: ConfigurationPlayerAccessor = Configuration.getPlayer(playerID);

		frame.setAttribute('title', playerConfig.slotName);

		this.networkFriendID = Online.Social.getPlayerFriendID_Network(playerID);
		this.t2gpFriendID = Online.Social.getPlayerFriendID_T2GP(playerID);

		// You can only make network platform friends with players on the same platform.
		const localPlatform: HostingType = Network.getLocalHostingPlatform();
		let playerPlatform: HostingType = Network.getPlayerHostingPlatform(playerID);
		if (this.networkFriendID == "" || localPlatform != playerPlatform || Online.Social.isUserFriend(this.networkFriendID)) {
			addPlatFriendButton.classList.add("hidden");
		}
		else {
			addPlatFriendButton.addEventListener('action-activate', () => { this.onAddFriend(this.networkFriendID) });
		}

		if (this.t2gpFriendID == "" || Online.Social.isUserFriend(this.t2gpFriendID)) {
			add2KFriendButton.classList.add("hidden");
		}
		else {
			add2KFriendButton.addEventListener('action-activate', () => { this.onAddFriend(this.t2gpFriendID) });
		}

		// hide the block/report actions when the player's t2gp friendId is unavailable. This might happen in local
		// multiplayer matches (LAN, Wireless, etc).
		if (this.t2gpFriendID == "") {
			this.reportButton.classList.add("hidden");
			this.blockButton.classList.add("hidden");
		}
		else {
			this.reportButton.addEventListener('action-activate', this.reportButtonListener);
			this.blockButton.addEventListener('action-activate', this.blockButtonListener);
		}

		closeButton.addEventListener('action-activate', this.closeButtonListener);

		// block button defaults to block text.
		if (Online.Social.isPlayerBlocked(playerID)) {
			this.blockButton.setAttribute('caption', Locale.compose("LOC_UI_MP_PLAYER_OPTIONS_UNBLOCK"));
		}

		let leaderPortraitURL: string | null = "";
		if (playerConfig.leaderTypeName) {
			leaderPortraitURL = UI.getIconURL(playerConfig.leaderTypeName != "RANDOM" ? playerConfig.leaderTypeName : "UNKNOWN_LEADER");
		}
		leaderPortrait.style.backgroundImage = `url(${leaderPortraitURL})`;
	}

	onDetach(): void {
		this.Root.removeEventListener('engine-input', this.engineInputListener);

		super.onDetach();
	}

	onReceiveFocus() {
		super.onReceiveFocus();

		NavTray.clear();
		NavTray.addOrUpdateGenericBack();

		FocusManager.setFocus(this.reportButton!);
	}

	onLoseFocus() {
		NavTray.clear();

		super.onLoseFocus();
	}

	private onEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		switch (inputEvent.detail.name) {
			case 'cancel':
			case 'keyboard-escape':
				this.onClose(inputEvent);
				break;
		}
	}

	private onClose(inputEvent?: InputEngineEvent) {
		this.close();

		if (inputEvent) {
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		}
	}

	private onAddFriend(friendID: string) {
		Online.Social.sendFriendRequest(friendID);
		this.close();
	}

	private onReport() {
		const playerIdAttribute: string | null = this.Root.getAttribute('playerId');
		if (playerIdAttribute) {
			const playerID: number = parseInt(playerIdAttribute);
			const reasons: string[] = Online.Social.getReportingReasonsPlayer(playerID);
			let reasonOptions: DialogBoxOption[] = [];
			for (let reasonNum: number = 0; reasonNum < reasons.length; reasonNum++) {
				let abuseReasonName: string | undefined = abuseReasonToName.get(reasons[reasonNum]);
				if (abuseReasonName != undefined) {
					const newReasonOption: DialogBoxOption = {
						actions: ["accept"],
						label: Locale.compose(abuseReasonName),
						callback: () => {
							this.createReportDialog(reasons[reasonNum]);
						}
					}

					reasonOptions.push(newReasonOption);
				}
			}

			const cancelOption: DialogBoxOption = {
				actions: ["cancel", "keyboard-escape"],
				label: "LOC_GENERIC_CANCEL"
			}
			reasonOptions.push(cancelOption);

			DialogManager.createDialog_MultiOption({
				title: "LOC_UI_MP_REPORT_PLAYER_TITLE",
				body: "LOC_UI_MP_REPORT_PLAYER_BODY",
				options: reasonOptions
			});
		}
	}

	private onBlock() {
		const playerIdAttribute: string | null = this.Root.getAttribute('playerId');
		if (playerIdAttribute) {
			const playerID: number = parseInt(playerIdAttribute);
			if (Online.Social.isPlayerBlocked(playerID)) {
				Online.Social.unblockPlayer(playerID);
				this.close(); //Close so we don't have to worry about the status of the block button.
			}
			else {
				Online.Social.blockPlayer(playerID);
				this.close(); //Close so we don't have to worry about the status of the block button.
			}
		}
	}

	private createReportDialog(reason: string) {
		ContextManager.push("screen-mp-report", { singleton: true, createMouseGuard: true, attributes: { blackOut: true, reportUserId: this.t2gpFriendID, reportReason: reason } });
	}
}

Controls.define('screen-mp-player-options', {
	createInstance: PanelMPPlayerOptions,
	description: 'Create popup for Multiplayer Lobby Player Options.',
	classNames: ['mp-player-options'],
	styles: ['fs://game/core/ui/shell/mp-staging/mp-player-options.css'],
	content: ['fs://game/core/ui/shell/mp-staging/mp-player-options.html'],
	attributes: [
		{
			name: 'playerId'
		}
	]
});