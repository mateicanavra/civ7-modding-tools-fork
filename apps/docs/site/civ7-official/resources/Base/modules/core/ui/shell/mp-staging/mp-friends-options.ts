/**
 * @file mp-friends-options.ts		
 * @copyright 2023, Firaxis Games
 * @description Multiplayer Lobby Player Options  
 */

import { DropdownItem, DropdownSelectionChangeEvent, DropdownSelectionChangeEventName } from '/core/ui/components/fxs-dropdown.js';
import { InputEngineEvent } from '/core/ui/input/input-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel, { AnchorType } from '/core/ui/panel-support.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import DialogManager, { DialogBoxAction, DialogBoxCallbackSignature } from '/core/ui/dialog-box/manager-dialog-box.js';
import { Focus } from '/core/ui/input/focus-support.js';
import { abuseReasonToName, abuseReasonToTooltip } from '/core/ui/utilities/utilities-online.js';
import { TabNameTypes, TabNames } from '/core/ui/shell/mp-staging/mp-friends.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
import MPFriendsModel from '/core/ui/shell/mp-staging/model-mp-friends.js';

enum SocialButtonTypes {
	VIEW_PROFILE,
	INVITE_TO_JOIN,
	ADD_FRIEND_REQUEST,
	ACCEPT_FRIEND_ADD_REQUEST,
	CANCEL_FRIEND_ADD_REQUEST,
	DECLINE_FRIEND_ADD_REQUEST,
	ACCEPT_GAME_INVITE,
	DECLINE_GAME_INVITE,
	BLOCK,
	UNBLOCK,
	REMOVE_FRIEND,
	REPORT,
	KICK,
	MUTE,
	UNMUTE,
	NUM_SOCIAL_BUTTON_TYPES
}

type AbuseDropdownItem = DropdownItem & { key: string; }

class PanelMPFriendOptions extends Panel {

	private engineInputListener: EventListener = (inputEvent: InputEngineEvent) => { this.onEngineInput(inputEvent); };
	private closeButtonListener: EventListener = (_event: Event) => { this.onClose(); }

	private socialButtonListener: EventListener[] = [
		this.onViewProfile.bind(this),
		this.onInviteToJoin.bind(this),
		this.onAddFriend.bind(this),
		this.onAcceptRequest.bind(this),
		this.onCancelRequest.bind(this),
		this.onDeclineRequest.bind(this),
		this.onAcceptGameInvite.bind(this),
		this.onDeclineGameInvite.bind(this),
		this.onBlock.bind(this),
		this.onUnBlock.bind(this),
		this.onRemoveFriend.bind(this),
		this.onReport.bind(this),
		this.onKick.bind(this),
		this.onMute.bind(this),
		this.onUnMute.bind(this)
	];

	private buttonElements: string[] = [
		".view-profile",
		".invite-to-join",
		".add-friend",
		".accept-friend-request",
		".cancel-friend-request",
		".decline-friend-request",
		".accept-game-invite",
		".decline-game-invite",
		".block",
		".unblock",
		".remove-friend",
		".report",
		".kick",
		".mute",
		".unmute"
	];

	private supportConfirmation: boolean[] = [
		false,			// view profile
		false,			// invite to join
		false,			// add friend
		false,			// accept friend request
		true,			// cancel friend request
		false,			// decline friend request
		false,			// accept game invite request
		false,			// decline game invite request
		true,			// block
		true,			// unblock
		true,			// remove friend
		false,			// report
		true,			// kick
		false,			// mute
		false			// unmute
	];

	private mainContainer: HTMLElement;
	private socialButtons: HTMLElement[] = [];

	private friendId1p: string = "";
	private friendIdT2gp: string = "";
	private playerIdT2gp: string = "";
	private gamertag1p: string = "";
	private gamertagT2gp: string = "";
	private lobbyPlayerId: number = -1;
	private platform: HostingType = HostingType.HOSTING_TYPE_UNKNOWN;

	private is1stParty: boolean = false;
	private isT2GP: boolean = false;

	private isGameInvite: boolean = false;

	private reportDropdownItems: AbuseDropdownItem[] = [];

	constructor(root: ComponentRoot) {
		super(root);
		this.animateInType = this.animateOutType = AnchorType.RelativeToRight;

		this.mainContainer = MustGetElement(".main-container", this.Root);

		//this.enableOpenSound is false intentionally
		this.enableCloseSound = true;
		this.Root.setAttribute("data-audio-group-ref", "audio-mp-friends-popups");
	}

	onAttach() {
		super.onAttach();


		const frame: HTMLElement = MustGetElement(".mp-friends-options-frame", this.Root);
		const closeButton: HTMLElement = MustGetElement("fxs-close-button", frame);
		closeButton.setAttribute("data-audio-group-ref", "audio-mp-friends-popups");


		const friendId1pAttribute: string | null = this.Root.getAttribute('friendId1p');
		if (friendId1pAttribute) {
			this.friendId1p = friendId1pAttribute;
		}

		const friendIdT2gpAttribute: string | null = this.Root.getAttribute('friendIdT2gp');
		if (friendIdT2gpAttribute) {
			this.friendIdT2gp = friendIdT2gpAttribute;
		}

		const playerIdT2gpAttribute: string | null = this.Root.getAttribute('playerIdT2gp');
		if (playerIdT2gpAttribute) {
			this.playerIdT2gp = playerIdT2gpAttribute;
		}

		const gametag1pAttribute: string | null = this.Root.getAttribute('gamertag1p');
		if (gametag1pAttribute) {
			this.gamertag1p = gametag1pAttribute;
		}

		const gametagT2gpAttribute: string | null = this.Root.getAttribute('gamertagT2gp');
		if (gametagT2gpAttribute) {
			this.gamertagT2gp = gametagT2gpAttribute;
		}

		if (gametagT2gpAttribute) {
			this.gamertagT2gp = gametagT2gpAttribute;
		}
		const lobbyPlayerIdAttribute: string | null = this.Root.getAttribute('playerIdLobby');
		if (lobbyPlayerIdAttribute) {
			this.lobbyPlayerId = Number(lobbyPlayerIdAttribute);
		}

		const platformAttribute: string | null = this.Root.getAttribute('platform');
		if (platformAttribute) {
			this.platform = Number(platformAttribute);
		}

		const gameInviteAttribute: string | null = this.Root.getAttribute('isGameInvite');
		if (gameInviteAttribute) {
			this.isGameInvite = (gameInviteAttribute == "true");
		}

		const currentTab: string | null = this.Root.getAttribute('currentTab');

		frame.setAttribute('title', this.gamertagT2gp);

		const localHostPlatform: HostingType = Network.getLocalHostingPlatform();
		let playerHostPlatform: HostingType = Number.isNaN(this.lobbyPlayerId) ? HostingType.HOSTING_TYPE_UNKNOWN : Network.getPlayerHostingPlatform(this.lobbyPlayerId);

		// hide the block/report actions when the player's t2gp friendId is unavailable. This might happen in local
		// multiplayer matches (LAN, Wireless, etc).

		for (let i = 0; i < SocialButtonTypes.NUM_SOCIAL_BUTTON_TYPES; i++) {
			this.socialButtons[i] = MustGetElement(this.buttonElements[i], this.mainContainer);
			// Turn off all buttons by default
			this.setButtonActivate(i, false);
		}

		this.is1stParty = (this.friendId1p && this.friendId1p != "" && this.platform == localHostPlatform) ? true : false;
		this.isT2GP = (this.friendIdT2gp && this.friendIdT2gp != "" && (this.platform != localHostPlatform)) ? true : false;

		const gameConfig: ConfigurationGameAccessor = Configuration.getGame();
		const screenCheck = !(ContextManager.hasInstanceOf("main-menu"));
		const lobbyCheck = ContextManager.hasInstanceOf("screen-mp-lobby");

		engine.on('MultiplayerPostPlayerDisconnected', this.onPlayerDisconnected, this);

		// Most tabs will have block and report functionality
		if (this.isT2GP) {
			if (playerHostPlatform != localHostPlatform) {
				if (!Online.Social.isUserBlocked(this.friendIdT2gp, true)) {
					this.setButtonActivate(SocialButtonTypes.BLOCK, true);
				} else {
					this.setButtonActivate(SocialButtonTypes.UNBLOCK, true);
				}
			}
			this.setButtonActivate(SocialButtonTypes.REPORT, true);

			if (currentTab == TabNames[TabNameTypes.FriendsListTab]) {
				if ((screenCheck || lobbyCheck) && gameConfig.isInternetMultiplayer) {
					this.setButtonActivate(SocialButtonTypes.INVITE_TO_JOIN, true);
				}
				this.addFriendInviteButtons(this.friendIdT2gp);
			} else if (currentTab == TabNames[TabNameTypes.BlockTab]) {

			} else if (currentTab == TabNames[TabNameTypes.RecentlyMetTab]) {
				this.addFriendInviteButtons(this.friendIdT2gp);
			} else if (currentTab == TabNames[TabNameTypes.SearchResutsTab]) {
				this.addFriendInviteButtons(this.friendIdT2gp);
			} else if (currentTab == TabNames[TabNameTypes.NotificationsTab]) {
				if (this.isGameInvite) {
					this.setButtonActivate(SocialButtonTypes.ACCEPT_GAME_INVITE, true);
					this.setButtonActivate(SocialButtonTypes.DECLINE_GAME_INVITE, true);
				} else {
					if (Online.Social.hasFriendInviteFromUser(this.friendIdT2gp)) {
						this.setButtonActivate(SocialButtonTypes.ACCEPT_FRIEND_ADD_REQUEST, true);
						this.setButtonActivate(SocialButtonTypes.DECLINE_FRIEND_ADD_REQUEST, true);
					} else {
						this.setButtonActivate(SocialButtonTypes.CANCEL_FRIEND_ADD_REQUEST, true);
					}
				}

			} else if (currentTab == TabNames[TabNameTypes.LobbyTab]) {
				// Add friends
				this.addFriendInviteButtons(this.friendIdT2gp);

				if (lobbyCheck || gameConfig.isInternetMultiplayer) {

					const gameConfig: ConfigurationGameAccessor = Configuration.getGame();
					const isKickVote: boolean = gameConfig.isKickVoting; // Kick Vote (true) or Direct Kick mode?

					if (isKickVote || Network.getHostPlayerId() == GameContext.localPlayerID) {
						this.setButtonActivate(SocialButtonTypes.KICK, true);
					}

					if (this.lobbyPlayerId != -1) {
						if (Network.isPlayerMuted(this.lobbyPlayerId)) {
							this.setButtonActivate(SocialButtonTypes.UNMUTE, true);
						} else {
							this.setButtonActivate(SocialButtonTypes.MUTE, true);
						}
					}
				}
			}
		} else if (this.is1stParty) {
			if (currentTab == TabNames[TabNameTypes.FriendsListTab]) {
				if ((screenCheck || lobbyCheck) && gameConfig.isInternetMultiplayer) {
					this.setButtonActivate(SocialButtonTypes.INVITE_TO_JOIN, true);
				}

				if (this.playerIdT2gp) {
					this.addFriendInviteButtons(this.playerIdT2gp);
				}
			} else if (currentTab == TabNames[TabNameTypes.LobbyTab]) {
				// Add friends
				this.addFriendInviteButtons(this.playerIdT2gp);

				if (lobbyCheck || gameConfig.isInternetMultiplayer) {

					const gameConfig: ConfigurationGameAccessor = Configuration.getGame();
					const isKickVote: boolean = gameConfig.isKickVoting; // Kick Vote (true) or Direct Kick mode?

					if (isKickVote || Network.getHostPlayerId() == GameContext.localPlayerID) {
						this.setButtonActivate(SocialButtonTypes.KICK, true);
					}

					if (this.lobbyPlayerId != -1) {
						if (Network.isPlayerMuted(this.lobbyPlayerId)) {
							this.setButtonActivate(SocialButtonTypes.UNMUTE, true);
						} else {
							this.setButtonActivate(SocialButtonTypes.MUTE, true);
						}
					}
				}
			}
		}

		if (Online.Social.canViewProfileWithFriendId(this.friendId1p, this.friendIdT2gp)) {
			this.setButtonActivate(SocialButtonTypes.VIEW_PROFILE, true);
		}

		this.Root.addEventListener('engine-input', this.engineInputListener);
		closeButton.addEventListener('action-activate', this.closeButtonListener);
	}

	private addFriendInviteButtons(friendId: string) {
		if (Online.Social.isUserPendingFriend(friendId)) {
			if (Online.Social.hasFriendInviteFromUser(friendId)) {
				this.setButtonActivate(SocialButtonTypes.ACCEPT_FRIEND_ADD_REQUEST, true);
				this.setButtonActivate(SocialButtonTypes.DECLINE_FRIEND_ADD_REQUEST, true);
			} else {
				this.setButtonActivate(SocialButtonTypes.CANCEL_FRIEND_ADD_REQUEST, true);
			}
		} else if (!Online.Social.isUserFriend(friendId)) {
			this.setButtonActivate(SocialButtonTypes.ADD_FRIEND_REQUEST, true);
		} else {
			this.setButtonActivate(SocialButtonTypes.REMOVE_FRIEND, true);
		}
	}

	private setButtonActivate(buttonType: SocialButtonTypes, buttonActive: boolean) {
		if (buttonActive) {
			this.socialButtons[buttonType].classList.remove("disabled");
			this.socialButtons[buttonType].classList.remove("hidden");
			this.socialButtons[buttonType].addEventListener('action-activate', this.socialButtonListener[buttonType]);
		} else {
			this.socialButtons[buttonType].classList.add("disabled");
			this.socialButtons[buttonType].classList.add("hidden");
			this.socialButtons[buttonType].removeEventListener('action-activate', this.socialButtonListener[buttonType]);
		}
	}

	onDetach(): void {
		this.Root.removeEventListener('engine-input', this.engineInputListener);
		engine.off('MultiplayerPostPlayerDisconnected', this.onPlayerDisconnected, this);
		super.onDetach();
	}

	onReceiveFocus() {
		super.onReceiveFocus();

		NavTray.clear();
		NavTray.addOrUpdateGenericBack();

		const popupOuter = MustGetElement(".mp-options-popup", this.Root);
		if (popupOuter.classList.contains("hidden")) {
			Focus.setContextAwareFocus(this.mainContainer, this.Root);
		} else {
			const popupButtonContainer = MustGetElement(".mp-options-popup-button-container", this.Root);
			Focus.setContextAwareFocus(popupButtonContainer, this.Root);
		}
	}

	onLoseFocus() {
		NavTray.clear();

		super.onLoseFocus();
	}

	private onEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		if (inputEvent.isCancelInput()) {
			const popupTop = MustGetElement(".mp-friends-options-frame", this.Root);
			const popupOuter = MustGetElement(".mp-options-popup", this.Root);
			if (popupOuter.classList.contains("hidden")) {
				this.onClose(inputEvent);
			} else {
				popupOuter.classList.add("hidden");
				popupTop.classList.remove("hidden");
				Focus.setContextAwareFocus(this.mainContainer, this.Root);
			}
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		}
	}

	private onClose(inputEvent?: InputEngineEvent) {
		this.close();

		if (inputEvent) {
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		}
	}


	// Only first party functionality we want to provide
	private onViewProfile() {
		if (this.supportConfirmation[SocialButtonTypes.VIEW_PROFILE]) {
		} else {
			Online.Social.viewProfile(this.friendId1p, this.friendIdT2gp);
			this.close();
		}
	}

	private onInviteToJoin() {
		if (this.supportConfirmation[SocialButtonTypes.INVITE_TO_JOIN]) {
			DialogManager.createDialog_ConfirmCancel({
				title: "LOC_UI_MP_FRIENDS_CONFIRM_GAME_INVITE_TITLE",
				body: Locale.compose("LOC_UI_MP_FRIENDS_CONFIRM_GAME_INVITE", this.getGamerTag()),
				canClose: false,
				callback: (eAction: DialogBoxAction) => {
					if (eAction == DialogBoxAction.Confirm) {
						this.confirmInviteToJoin();
						this.close();
					}
				}
			});
		} else {
			this.confirmInviteToJoin();
			this.close();
		}
	}

	// T2GP only
	private onAddFriend() {
		let twoKId = this.getT2GPFriendId();

		if (this.supportConfirmation[SocialButtonTypes.ADD_FRIEND_REQUEST]) {
			DialogManager.createDialog_ConfirmCancel({
				title: "LOC_UI_MP_FRIENDS_CONFIRM_REQUEST_TITLE",
				body: Locale.compose("LOC_UI_MP_FRIENDS_CONFIRM_REQUEST", this.getGamerTag()),
				canClose: false,
				callback: (eAction: DialogBoxAction) => {
					if (eAction == DialogBoxAction.Confirm) {
						this.confirmAddFriend(twoKId);
						this.close();
					}
				}
			});
		} else {
			this.confirmAddFriend(twoKId);
			this.close();
		}
	}

	private getT2GPFriendId() {
		if (this.playerIdT2gp && this.playerIdT2gp != "") return this.playerIdT2gp;

		return this.friendIdT2gp;
	}

	// T2GP only
	private onCancelRequest() {
		let twoKId = this.getT2GPFriendId();

		if (this.supportConfirmation[SocialButtonTypes.CANCEL_FRIEND_ADD_REQUEST]) {
			DialogManager.createDialog_ConfirmCancel({
				title: "LOC_UI_MP_FRIENDS_CONFIRM_CANCEL_REQUEST_TITLE",
				body: Locale.compose("LOC_UI_MP_FRIENDS_CONFIRM_CANCEL_REQUEST", this.getGamerTag()),
				canClose: false,
				callback: (eAction: DialogBoxAction) => {
					if (eAction == DialogBoxAction.Confirm) {
						Online.Social.rejectFriendRequest(twoKId);
						this.close();
					}
				}
			});
		} else {
			Online.Social.rejectFriendRequest(twoKId);
			this.close();
		}
	}

	// T2GP only
	private onAcceptRequest() {
		if (this.supportConfirmation[SocialButtonTypes.ACCEPT_FRIEND_ADD_REQUEST]) {
			DialogManager.createDialog_ConfirmCancel({
				title: "LOC_UI_MP_FRIENDS_CONFIRM_ACCEPT_REQUEST_TITLE",
				body: Locale.compose("LOC_UI_MP_FRIENDS_CONFIRM_ACCEPT_REQUEST", this.getGamerTag()),
				canClose: false,
				callback: (eAction: DialogBoxAction) => {
					if (eAction == DialogBoxAction.Confirm) {
						Online.Social.acceptFriendRequest(this.friendIdT2gp);
						this.close();
					}
				}
			});
		} else {
			Online.Social.acceptFriendRequest(this.friendIdT2gp);
			this.close();
		}

	}

	// T2GP only
	private onDeclineRequest() {
		if (this.supportConfirmation[SocialButtonTypes.DECLINE_FRIEND_ADD_REQUEST]) {
			DialogManager.createDialog_ConfirmCancel({
				title: "LOC_UI_MP_FRIENDS_CONFIRM_DECLINE_REQUEST_TITLE",
				body: Locale.compose("LOC_UI_MP_FRIENDS_CONFIRM_DECLINE_REQUEST", this.getGamerTag()),
				canClose: false,
				callback: (eAction: DialogBoxAction) => {
					if (eAction == DialogBoxAction.Confirm) {
						Online.Social.rejectFriendRequest(this.friendIdT2gp);
						this.close();
					}
				}
			});
		} else {
			Online.Social.rejectFriendRequest(this.friendIdT2gp);
			this.close();
		}
	}

	// T2GP only
	private onAcceptGameInvite() {
		if (this.supportConfirmation[SocialButtonTypes.ACCEPT_GAME_INVITE]) {
			DialogManager.createDialog_ConfirmCancel({
				title: "LOC_UI_MP_FRIENDS_CONFIRM_ACCEPT_INVITE_TITLE",
				body: Locale.compose("LOC_UI_MP_FRIENDS_CONFIRM_ACCEPT_INVITE", this.getGamerTag()),
				canClose: false,
				callback: (eAction: DialogBoxAction) => {
					if (eAction == DialogBoxAction.Confirm) {
						Online.Social.acceptGameInvite(this.gamertagT2gp);
						this.close();
					}
				}
			});
		} else {
			Online.Social.acceptGameInvite(this.gamertagT2gp);
			this.close();
		}
	}

	// T2GP only
	private onDeclineGameInvite() {
		if (this.supportConfirmation[SocialButtonTypes.DECLINE_GAME_INVITE]) {
			DialogManager.createDialog_ConfirmCancel({
				title: "LOC_UI_MP_FRIENDS_CONFIRM_DECLINE_INVITE_TITLE",
				body: Locale.compose("LOC_UI_MP_FRIENDS_CONFIRM_DECLINE_INVITE", this.getGamerTag()),
				canClose: false,
				callback: (eAction: DialogBoxAction) => {
					if (eAction == DialogBoxAction.Confirm) {
						Online.Social.declineGameInvite(this.gamertagT2gp);
						this.close();
					}
				}
			});
		} else {
			Online.Social.declineGameInvite(this.gamertagT2gp);
			this.close();
		}
	}

	// T2GP only
	private onReport() {
		if (this.supportConfirmation[SocialButtonTypes.REPORT]) {
		} else {
			const popupTop = MustGetElement(".mp-friends-options-frame", this.Root);
			const popupOuter = MustGetElement(".mp-options-popup", this.Root);
			const popupButtonContainer = MustGetElement(".mp-options-popup-button-container", this.Root);

			while (popupButtonContainer.children.length > 0) {
				popupButtonContainer.removeChild(popupButtonContainer.children[0]);
			}

			//Clear the list before adding the items to it
			this.reportDropdownItems = [];

			//Add a temporary option for 'Select a Reason' tile
			const chooseAnOptionItem: AbuseDropdownItem = {
				key: "",
				label: Locale.compose("LOC_ABUSE_REPORT_SELECT_REASON"),
				disabled: true
			}
			this.reportDropdownItems.push(chooseAnOptionItem);

			//Populate the rest of the list
			this.buildReportReasonsDropdown();

			const dropdown = document.createElement("fxs-dropdown");
			dropdown.addEventListener(DropdownSelectionChangeEventName, this.onReportDropdownSelection.bind(this));
			dropdown.setAttribute("dropdown-items", JSON.stringify(this.reportDropdownItems));
			dropdown.setAttribute("selected-item-index", "0");
			dropdown.classList.add("h-12", "mb-4", "w-128");
			popupButtonContainer.appendChild(dropdown);
			Focus.setContextAwareFocus(popupButtonContainer, this.Root);

			const cancelButton = document.createElement("fxs-button");
			cancelButton.setAttribute("caption", "LOC_GENERIC_CANCEL");
			cancelButton.addEventListener("action-activate", () => {
				popupOuter.classList.add("hidden");
				popupTop.classList.remove("hidden");
				Focus.setContextAwareFocus(this.mainContainer, this.Root);
			});
			popupButtonContainer.appendChild(cancelButton);
			popupOuter.classList.remove("hidden");
			popupTop.classList.add("hidden");
		}
	}

	private onReportDropdownSelection(event: DropdownSelectionChangeEvent) {
		const selection = this.reportDropdownItems[event.detail.selectedIndex];

		//Remove the 'Select a Reason' option from the dropdown list once a player had made their initial selection.
		if (this.reportDropdownItems.find((reportItem: AbuseDropdownItem) => {
			return reportItem.label == Locale.compose("LOC_ABUSE_REPORT_SELECT_REASON");
		})) {
			this.reportDropdownItems = [];
			this.buildReportReasonsDropdown();
			const dropdown = MustGetElement(".fxs-dropdown", this.Root);
			dropdown.setAttribute("dropdown-items", JSON.stringify(this.reportDropdownItems));

			//Reduce selected item index by 1 since we just removed one option from the list
			let indexNum = event.detail.selectedIndex - 1;
			if (indexNum < 0) {
				indexNum = 0;
			}
			event.detail.selectedIndex = indexNum;
			dropdown.setAttribute("selected-item-index", indexNum.toString());
		}

		this.createReportDialog(selection.key);
	}

	private buildReportReasonsDropdown() {
		abuseReasonToName.forEach((value: string, key: string) => {
			const newItem: AbuseDropdownItem = {
				key: key,
				label: value,
				tooltip: abuseReasonToTooltip.get(key)
			}
			this.reportDropdownItems.push(newItem);
		});
	}

	// T2GP only
	private onRemoveFriend() {
		if (this.supportConfirmation[SocialButtonTypes.REMOVE_FRIEND]) {
			DialogManager.createDialog_ConfirmCancel({
				title: "LOC_UI_MP_FRIENDS_REMOVE_FRIEND_TITLE",
				body: Locale.compose("LOC_UI_MP_FRIENDS_REMOVE_FRIEND", this.getGamerTag()),
				canClose: false,
				callback: (eAction: DialogBoxAction) => {
					if (eAction == DialogBoxAction.Confirm) {
						Online.Social.removeFriend(this.friendIdT2gp);
						this.close();
					}
				}
			});
		} else {
			Online.Social.removeFriend(this.friendIdT2gp);
			this.close();
		}
	}

	private onKick() {
		if (this.lobbyPlayerId != -1) {
			this.kick(this.lobbyPlayerId);
		}
		this.close();
	}

	private onMute() {
		if (this.lobbyPlayerId != -1) {
			this.mute(this.lobbyPlayerId, true);
		}
		this.close();
	}

	private onUnMute() {
		if (this.lobbyPlayerId != -1) {
			this.mute(this.lobbyPlayerId, false);
		}
		this.close();
	}

	// Reference from: ui\shell\mp-staging\model-mp-staging-new.ts
	kick(kickPlayerID: number) {
		if (this.supportConfirmation[SocialButtonTypes.KICK]) {

			const gameConfig: ConfigurationGameAccessor = Configuration.getGame();
			const isKickVote: boolean = gameConfig.isKickVoting; // Kick Vote (true) or Direct Kick mode?

			const dialogCallback: DialogBoxCallbackSignature = (eAction: DialogBoxAction) => {
				if (eAction == DialogBoxAction.Confirm) {
					if (isKickVote) {
						const yesVote: boolean = true; // vote to kick the target player
						Network.kickVotePlayer(kickPlayerID, yesVote, KickVoteReasonType.KICKVOTE_NONE);
					} else {
						Network.directKickPlayer(kickPlayerID);
					}
				}
				// Else: Kick was given up
			}

			const dialogBody: string = isKickVote ? "LOC_KICK_VOTE_CONFIRM_DIALOG" : "LOC_DIRECT_KICK_CONFIRM_DIALOG";

			const kickPlayerConfig: ConfigurationPlayerAccessor = Configuration.getPlayer(kickPlayerID);
			const kickPlayerName: string = Locale.compose(kickPlayerConfig.slotName);

			DialogManager.createDialog_ConfirmCancel({
				body: Locale.compose(dialogBody, kickPlayerName),
				title: "LOC_KICK_DIALOG_TITLE",
				callback: dialogCallback
			});
		} else {
			const gameConfig: ConfigurationGameAccessor = Configuration.getGame();
			const isKickVote: boolean = gameConfig.isKickVoting; // Kick Vote (true) or Direct Kick mode?

			if (isKickVote) {
				const yesVote: boolean = true; // vote to kick the target player
				Network.kickVotePlayer(kickPlayerID, yesVote, KickVoteReasonType.KICKVOTE_NONE);
			} else {
				Network.directKickPlayer(kickPlayerID);
			}
		}
	}

	// Reference from: ui\shell\mp-staging\model-mp-staging-new.ts
	private mute(mutePlayerID: number, mute: boolean) {
		if ((mute && this.supportConfirmation[SocialButtonTypes.MUTE]) || (!mute && this.supportConfirmation[SocialButtonTypes.UNMUTE])) {
			const dialogCallback: DialogBoxCallbackSignature = (eAction: DialogBoxAction) => {
				if (eAction == DialogBoxAction.Confirm) {
					Network.setPlayerMuted(mutePlayerID, mute);
					engine.trigger('staging-mute-changed');
				}
			}

			const mutePlayerConfig: ConfigurationPlayerAccessor = Configuration.getPlayer(mutePlayerID);
			const mutePlayerName: string = Locale.compose(mutePlayerConfig.slotName);

			DialogManager.createDialog_ConfirmCancel({
				body: Locale.compose(mute ? "LOC_DIRECT_MUTE_CONFIRM_DIALOG" : "LOC_DIRECT_UNMUTE_CONFIRM_DIALOG", mutePlayerName),
				title: mute ? "LOC_MUTE_DIALOG_TITLE" : "LOC_UNMUTE_DIALOG_TITLE",
				callback: dialogCallback
			});
		} else {
			Network.setPlayerMuted(mutePlayerID, mute);
			engine.trigger('staging-mute-changed');
		}
	}

	private onPlayerDisconnected() {
		MPFriendsModel.refreshFriendList();
	}

	private getFriendID(): string {
		if (this.isT2GP) {
			return this.friendIdT2gp;
		}
		else if (this.is1stParty) {
			return this.friendId1p;
		}
		return "";
	}

	private getGamerTag(): string {
		if (this.gamertagT2gp && this.gamertagT2gp != "") {
			return this.gamertagT2gp;
		}
		else if (this.gamertag1p && this.gamertag1p != "") {
			return this.gamertag1p;
		}
		return "";
	}

	// T2GP only
	private onBlock() {
		let friendID: string = this.getFriendID();
		let gamerTag: string = this.getGamerTag();

		if (friendID != "") {
			DialogManager.createDialog_ConfirmCancel({
				title: "LOC_UI_MP_FRIENDS_CONFIRM_BLOCK_TITLE",
				body: Locale.compose("LOC_UI_MP_FRIENDS_CONFIRM_BLOCK", gamerTag),
				callback: (eAction: DialogBoxAction) => {
					if (eAction == DialogBoxAction.Confirm) {
						Online.Social.blockUser(friendID);
						DialogManager.createDialog_Confirm({
							title: "LOC_UI_MP_FRIENDS_CONFIRM_BLOCK_TITLE",
							body: Locale.compose("LOC_UI_MP_FRIENDS_FEEDBACK_BLOCK", gamerTag)
						})
					}
				}
			});
			this.close(); //Close so we don't have to worry about the status of the block button.
		} else {
			console.error("mp-friends-options: unblockPlayer(): None valid Friend ID (1P or T2GP) so nothing happened");
		}
	}

	private onUnBlock() {
		let friendID: string = this.getFriendID();
		let gamerTag: string = this.getGamerTag();

		if (friendID != "") {
			DialogManager.createDialog_ConfirmCancel({
				title: "LOC_UI_MP_FRIENDS_CONFIRM_UNBLOCK_TITLE",
				body: Locale.compose("LOC_UI_MP_FRIENDS_CONFIRM_UNBLOCK", gamerTag),
				callback: (eAction: DialogBoxAction) => {
					if (eAction == DialogBoxAction.Confirm) {
						Online.Social.unblockUser(friendID);
						DialogManager.createDialog_Confirm({
							title: "LOC_UI_MP_FRIENDS_CONFIRM_UNBLOCK_TITLE",
							body: Locale.compose("LOC_UI_MP_FRIENDS_FEEDBACK_UNBLOCK", gamerTag)
						})
					}
				}
			});
		}
		this.close(); //Close so we don't have to worry about the status of the block button.
	}

	private createReportDialog(reason: string) {
		ContextManager.push("screen-mp-report", { singleton: true, createMouseGuard: true, attributes: { blackOut: true, reportUserId: this.friendIdT2gp, reportUserGamertag: this.getGamerTag(), reportReason: reason } });
	}

	private confirmInviteToJoin() {
		const friendID = this.getFriendID();
		const friendData = MPFriendsModel.getFriendDataFromID(friendID);
		if (friendID && friendData && !friendData.disabledActionButton) {
			MPFriendsModel.invite(friendID, friendData);
			DialogManager.createDialog_Confirm({
				title: "LOC_UI_MP_FRIENDS_FEEDBACK_INVITE_TO_JOIN_TITLE",
				body: Locale.compose("LOC_UI_MP_FRIENDS_FEEDBACK_INVITE_TO_JOIN", this.getGamerTag())
			})
		}
		else {
			console.error("mp-friends: invitePlayer(): Invalid friendID or friendData");
		}
	}

	private confirmAddFriend(friendID: string) {
		Online.Social.sendFriendRequest(friendID);
		DialogManager.createDialog_Confirm({
			title: "LOC_UI_MP_FRIENDS_FEEDBACK_ADD_FRIEND_TITLE",
			body: Locale.compose("LOC_UI_MP_FRIENDS_FEEDBACK_ADD_FRIEND", this.getGamerTag())
		})
	}
}

Controls.define('screen-mp-friends-options', {
	createInstance: PanelMPFriendOptions,
	description: 'Create popup for Multiplayer Lobby Player Options.',
	classNames: ['mp-friends-options'],
	styles: ['fs://game/core/ui/shell/mp-staging/mp-friends-options.css'],
	content: ['fs://game/core/ui/shell/mp-staging/mp-friends-options.html'],
	attributes: [
		{
			name: 'friendId1p',
		},
		{
			name: 'friendIdT2gp',
		},
	]
});
