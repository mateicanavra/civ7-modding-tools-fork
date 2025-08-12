/**
 * @file mp-friends-options.ts
 * @copyright 2023, Firaxis Games
 * @description Multiplayer Lobby Player Options
 */
import { DropdownSelectionChangeEventName } from '/core/ui/components/fxs-dropdown.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel, { AnchorType } from '/core/ui/panel-support.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import DialogManager, { DialogBoxAction } from '/core/ui/dialog-box/manager-dialog-box.js';
import { Focus } from '/core/ui/input/focus-support.js';
import { abuseReasonToName, abuseReasonToTooltip } from '/core/ui/utilities/utilities-online.js';
import { TabNameTypes, TabNames } from '/core/ui/shell/mp-staging/mp-friends.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
import MPFriendsModel from '/core/ui/shell/mp-staging/model-mp-friends.js';
var SocialButtonTypes;
(function (SocialButtonTypes) {
    SocialButtonTypes[SocialButtonTypes["VIEW_PROFILE"] = 0] = "VIEW_PROFILE";
    SocialButtonTypes[SocialButtonTypes["INVITE_TO_JOIN"] = 1] = "INVITE_TO_JOIN";
    SocialButtonTypes[SocialButtonTypes["ADD_FRIEND_REQUEST"] = 2] = "ADD_FRIEND_REQUEST";
    SocialButtonTypes[SocialButtonTypes["ACCEPT_FRIEND_ADD_REQUEST"] = 3] = "ACCEPT_FRIEND_ADD_REQUEST";
    SocialButtonTypes[SocialButtonTypes["CANCEL_FRIEND_ADD_REQUEST"] = 4] = "CANCEL_FRIEND_ADD_REQUEST";
    SocialButtonTypes[SocialButtonTypes["DECLINE_FRIEND_ADD_REQUEST"] = 5] = "DECLINE_FRIEND_ADD_REQUEST";
    SocialButtonTypes[SocialButtonTypes["ACCEPT_GAME_INVITE"] = 6] = "ACCEPT_GAME_INVITE";
    SocialButtonTypes[SocialButtonTypes["DECLINE_GAME_INVITE"] = 7] = "DECLINE_GAME_INVITE";
    SocialButtonTypes[SocialButtonTypes["BLOCK"] = 8] = "BLOCK";
    SocialButtonTypes[SocialButtonTypes["UNBLOCK"] = 9] = "UNBLOCK";
    SocialButtonTypes[SocialButtonTypes["REMOVE_FRIEND"] = 10] = "REMOVE_FRIEND";
    SocialButtonTypes[SocialButtonTypes["REPORT"] = 11] = "REPORT";
    SocialButtonTypes[SocialButtonTypes["KICK"] = 12] = "KICK";
    SocialButtonTypes[SocialButtonTypes["MUTE"] = 13] = "MUTE";
    SocialButtonTypes[SocialButtonTypes["UNMUTE"] = 14] = "UNMUTE";
    SocialButtonTypes[SocialButtonTypes["NUM_SOCIAL_BUTTON_TYPES"] = 15] = "NUM_SOCIAL_BUTTON_TYPES";
})(SocialButtonTypes || (SocialButtonTypes = {}));
class PanelMPFriendOptions extends Panel {
    constructor(root) {
        super(root);
        this.engineInputListener = (inputEvent) => { this.onEngineInput(inputEvent); };
        this.closeButtonListener = (_event) => { this.onClose(); };
        this.socialButtonListener = [
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
        this.buttonElements = [
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
        this.supportConfirmation = [
            false,
            false,
            false,
            false,
            true,
            false,
            false,
            false,
            true,
            true,
            true,
            false,
            true,
            false,
            false // unmute
        ];
        this.socialButtons = [];
        this.friendId1p = "";
        this.friendIdT2gp = "";
        this.playerIdT2gp = "";
        this.gamertag1p = "";
        this.gamertagT2gp = "";
        this.lobbyPlayerId = -1;
        this.platform = HostingType.HOSTING_TYPE_UNKNOWN;
        this.is1stParty = false;
        this.isT2GP = false;
        this.isGameInvite = false;
        this.reportDropdownItems = [];
        this.animateInType = this.animateOutType = AnchorType.RelativeToRight;
        this.mainContainer = MustGetElement(".main-container", this.Root);
        //this.enableOpenSound is false intentionally
        this.enableCloseSound = true;
        this.Root.setAttribute("data-audio-group-ref", "audio-mp-friends-popups");
    }
    onAttach() {
        super.onAttach();
        const frame = MustGetElement(".mp-friends-options-frame", this.Root);
        const closeButton = MustGetElement("fxs-close-button", frame);
        closeButton.setAttribute("data-audio-group-ref", "audio-mp-friends-popups");
        const friendId1pAttribute = this.Root.getAttribute('friendId1p');
        if (friendId1pAttribute) {
            this.friendId1p = friendId1pAttribute;
        }
        const friendIdT2gpAttribute = this.Root.getAttribute('friendIdT2gp');
        if (friendIdT2gpAttribute) {
            this.friendIdT2gp = friendIdT2gpAttribute;
        }
        const playerIdT2gpAttribute = this.Root.getAttribute('playerIdT2gp');
        if (playerIdT2gpAttribute) {
            this.playerIdT2gp = playerIdT2gpAttribute;
        }
        const gametag1pAttribute = this.Root.getAttribute('gamertag1p');
        if (gametag1pAttribute) {
            this.gamertag1p = gametag1pAttribute;
        }
        const gametagT2gpAttribute = this.Root.getAttribute('gamertagT2gp');
        if (gametagT2gpAttribute) {
            this.gamertagT2gp = gametagT2gpAttribute;
        }
        if (gametagT2gpAttribute) {
            this.gamertagT2gp = gametagT2gpAttribute;
        }
        const lobbyPlayerIdAttribute = this.Root.getAttribute('playerIdLobby');
        if (lobbyPlayerIdAttribute) {
            this.lobbyPlayerId = Number(lobbyPlayerIdAttribute);
        }
        const platformAttribute = this.Root.getAttribute('platform');
        if (platformAttribute) {
            this.platform = Number(platformAttribute);
        }
        const gameInviteAttribute = this.Root.getAttribute('isGameInvite');
        if (gameInviteAttribute) {
            this.isGameInvite = (gameInviteAttribute == "true");
        }
        const currentTab = this.Root.getAttribute('currentTab');
        frame.setAttribute('title', this.gamertagT2gp);
        const localHostPlatform = Network.getLocalHostingPlatform();
        let playerHostPlatform = Number.isNaN(this.lobbyPlayerId) ? HostingType.HOSTING_TYPE_UNKNOWN : Network.getPlayerHostingPlatform(this.lobbyPlayerId);
        // hide the block/report actions when the player's t2gp friendId is unavailable. This might happen in local
        // multiplayer matches (LAN, Wireless, etc).
        for (let i = 0; i < SocialButtonTypes.NUM_SOCIAL_BUTTON_TYPES; i++) {
            this.socialButtons[i] = MustGetElement(this.buttonElements[i], this.mainContainer);
            // Turn off all buttons by default
            this.setButtonActivate(i, false);
        }
        this.is1stParty = (this.friendId1p && this.friendId1p != "" && this.platform == localHostPlatform) ? true : false;
        this.isT2GP = (this.friendIdT2gp && this.friendIdT2gp != "" && (this.platform != localHostPlatform)) ? true : false;
        const gameConfig = Configuration.getGame();
        const screenCheck = !(ContextManager.hasInstanceOf("main-menu"));
        const lobbyCheck = ContextManager.hasInstanceOf("screen-mp-lobby");
        engine.on('MultiplayerPostPlayerDisconnected', this.onPlayerDisconnected, this);
        // Most tabs will have block and report functionality
        if (this.isT2GP) {
            if (playerHostPlatform != localHostPlatform) {
                if (!Online.Social.isUserBlocked(this.friendIdT2gp, true)) {
                    this.setButtonActivate(SocialButtonTypes.BLOCK, true);
                }
                else {
                    this.setButtonActivate(SocialButtonTypes.UNBLOCK, true);
                }
            }
            this.setButtonActivate(SocialButtonTypes.REPORT, true);
            if (currentTab == TabNames[TabNameTypes.FriendsListTab]) {
                if ((screenCheck || lobbyCheck) && gameConfig.isInternetMultiplayer) {
                    this.setButtonActivate(SocialButtonTypes.INVITE_TO_JOIN, true);
                }
                this.addFriendInviteButtons(this.friendIdT2gp);
            }
            else if (currentTab == TabNames[TabNameTypes.BlockTab]) {
            }
            else if (currentTab == TabNames[TabNameTypes.RecentlyMetTab]) {
                this.addFriendInviteButtons(this.friendIdT2gp);
            }
            else if (currentTab == TabNames[TabNameTypes.SearchResutsTab]) {
                this.addFriendInviteButtons(this.friendIdT2gp);
            }
            else if (currentTab == TabNames[TabNameTypes.NotificationsTab]) {
                if (this.isGameInvite) {
                    this.setButtonActivate(SocialButtonTypes.ACCEPT_GAME_INVITE, true);
                    this.setButtonActivate(SocialButtonTypes.DECLINE_GAME_INVITE, true);
                }
                else {
                    if (Online.Social.hasFriendInviteFromUser(this.friendIdT2gp)) {
                        this.setButtonActivate(SocialButtonTypes.ACCEPT_FRIEND_ADD_REQUEST, true);
                        this.setButtonActivate(SocialButtonTypes.DECLINE_FRIEND_ADD_REQUEST, true);
                    }
                    else {
                        this.setButtonActivate(SocialButtonTypes.CANCEL_FRIEND_ADD_REQUEST, true);
                    }
                }
            }
            else if (currentTab == TabNames[TabNameTypes.LobbyTab]) {
                // Add friends
                this.addFriendInviteButtons(this.friendIdT2gp);
                if (lobbyCheck || gameConfig.isInternetMultiplayer) {
                    const gameConfig = Configuration.getGame();
                    const isKickVote = gameConfig.isKickVoting; // Kick Vote (true) or Direct Kick mode?
                    if (isKickVote || Network.getHostPlayerId() == GameContext.localPlayerID) {
                        this.setButtonActivate(SocialButtonTypes.KICK, true);
                    }
                    if (this.lobbyPlayerId != -1) {
                        if (Network.isPlayerMuted(this.lobbyPlayerId)) {
                            this.setButtonActivate(SocialButtonTypes.UNMUTE, true);
                        }
                        else {
                            this.setButtonActivate(SocialButtonTypes.MUTE, true);
                        }
                    }
                }
            }
        }
        else if (this.is1stParty) {
            if (currentTab == TabNames[TabNameTypes.FriendsListTab]) {
                if ((screenCheck || lobbyCheck) && gameConfig.isInternetMultiplayer) {
                    this.setButtonActivate(SocialButtonTypes.INVITE_TO_JOIN, true);
                }
                if (this.playerIdT2gp) {
                    this.addFriendInviteButtons(this.playerIdT2gp);
                }
            }
            else if (currentTab == TabNames[TabNameTypes.LobbyTab]) {
                // Add friends
                this.addFriendInviteButtons(this.playerIdT2gp);
                if (lobbyCheck || gameConfig.isInternetMultiplayer) {
                    const gameConfig = Configuration.getGame();
                    const isKickVote = gameConfig.isKickVoting; // Kick Vote (true) or Direct Kick mode?
                    if (isKickVote || Network.getHostPlayerId() == GameContext.localPlayerID) {
                        this.setButtonActivate(SocialButtonTypes.KICK, true);
                    }
                    if (this.lobbyPlayerId != -1) {
                        if (Network.isPlayerMuted(this.lobbyPlayerId)) {
                            this.setButtonActivate(SocialButtonTypes.UNMUTE, true);
                        }
                        else {
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
    addFriendInviteButtons(friendId) {
        if (Online.Social.isUserPendingFriend(friendId)) {
            if (Online.Social.hasFriendInviteFromUser(friendId)) {
                this.setButtonActivate(SocialButtonTypes.ACCEPT_FRIEND_ADD_REQUEST, true);
                this.setButtonActivate(SocialButtonTypes.DECLINE_FRIEND_ADD_REQUEST, true);
            }
            else {
                this.setButtonActivate(SocialButtonTypes.CANCEL_FRIEND_ADD_REQUEST, true);
            }
        }
        else if (!Online.Social.isUserFriend(friendId)) {
            this.setButtonActivate(SocialButtonTypes.ADD_FRIEND_REQUEST, true);
        }
        else {
            this.setButtonActivate(SocialButtonTypes.REMOVE_FRIEND, true);
        }
    }
    setButtonActivate(buttonType, buttonActive) {
        if (buttonActive) {
            this.socialButtons[buttonType].classList.remove("disabled");
            this.socialButtons[buttonType].classList.remove("hidden");
            this.socialButtons[buttonType].addEventListener('action-activate', this.socialButtonListener[buttonType]);
        }
        else {
            this.socialButtons[buttonType].classList.add("disabled");
            this.socialButtons[buttonType].classList.add("hidden");
            this.socialButtons[buttonType].removeEventListener('action-activate', this.socialButtonListener[buttonType]);
        }
    }
    onDetach() {
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
        }
        else {
            const popupButtonContainer = MustGetElement(".mp-options-popup-button-container", this.Root);
            Focus.setContextAwareFocus(popupButtonContainer, this.Root);
        }
    }
    onLoseFocus() {
        NavTray.clear();
        super.onLoseFocus();
    }
    onEngineInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        if (inputEvent.isCancelInput()) {
            const popupTop = MustGetElement(".mp-friends-options-frame", this.Root);
            const popupOuter = MustGetElement(".mp-options-popup", this.Root);
            if (popupOuter.classList.contains("hidden")) {
                this.onClose(inputEvent);
            }
            else {
                popupOuter.classList.add("hidden");
                popupTop.classList.remove("hidden");
                Focus.setContextAwareFocus(this.mainContainer, this.Root);
            }
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
    }
    onClose(inputEvent) {
        this.close();
        if (inputEvent) {
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
    }
    // Only first party functionality we want to provide
    onViewProfile() {
        if (this.supportConfirmation[SocialButtonTypes.VIEW_PROFILE]) {
        }
        else {
            Online.Social.viewProfile(this.friendId1p, this.friendIdT2gp);
            this.close();
        }
    }
    onInviteToJoin() {
        if (this.supportConfirmation[SocialButtonTypes.INVITE_TO_JOIN]) {
            DialogManager.createDialog_ConfirmCancel({
                title: "LOC_UI_MP_FRIENDS_CONFIRM_GAME_INVITE_TITLE",
                body: Locale.compose("LOC_UI_MP_FRIENDS_CONFIRM_GAME_INVITE", this.getGamerTag()),
                canClose: false,
                callback: (eAction) => {
                    if (eAction == DialogBoxAction.Confirm) {
                        this.confirmInviteToJoin();
                        this.close();
                    }
                }
            });
        }
        else {
            this.confirmInviteToJoin();
            this.close();
        }
    }
    // T2GP only
    onAddFriend() {
        let twoKId = this.getT2GPFriendId();
        if (this.supportConfirmation[SocialButtonTypes.ADD_FRIEND_REQUEST]) {
            DialogManager.createDialog_ConfirmCancel({
                title: "LOC_UI_MP_FRIENDS_CONFIRM_REQUEST_TITLE",
                body: Locale.compose("LOC_UI_MP_FRIENDS_CONFIRM_REQUEST", this.getGamerTag()),
                canClose: false,
                callback: (eAction) => {
                    if (eAction == DialogBoxAction.Confirm) {
                        this.confirmAddFriend(twoKId);
                        this.close();
                    }
                }
            });
        }
        else {
            this.confirmAddFriend(twoKId);
            this.close();
        }
    }
    getT2GPFriendId() {
        if (this.playerIdT2gp && this.playerIdT2gp != "")
            return this.playerIdT2gp;
        return this.friendIdT2gp;
    }
    // T2GP only
    onCancelRequest() {
        let twoKId = this.getT2GPFriendId();
        if (this.supportConfirmation[SocialButtonTypes.CANCEL_FRIEND_ADD_REQUEST]) {
            DialogManager.createDialog_ConfirmCancel({
                title: "LOC_UI_MP_FRIENDS_CONFIRM_CANCEL_REQUEST_TITLE",
                body: Locale.compose("LOC_UI_MP_FRIENDS_CONFIRM_CANCEL_REQUEST", this.getGamerTag()),
                canClose: false,
                callback: (eAction) => {
                    if (eAction == DialogBoxAction.Confirm) {
                        Online.Social.rejectFriendRequest(twoKId);
                        this.close();
                    }
                }
            });
        }
        else {
            Online.Social.rejectFriendRequest(twoKId);
            this.close();
        }
    }
    // T2GP only
    onAcceptRequest() {
        if (this.supportConfirmation[SocialButtonTypes.ACCEPT_FRIEND_ADD_REQUEST]) {
            DialogManager.createDialog_ConfirmCancel({
                title: "LOC_UI_MP_FRIENDS_CONFIRM_ACCEPT_REQUEST_TITLE",
                body: Locale.compose("LOC_UI_MP_FRIENDS_CONFIRM_ACCEPT_REQUEST", this.getGamerTag()),
                canClose: false,
                callback: (eAction) => {
                    if (eAction == DialogBoxAction.Confirm) {
                        Online.Social.acceptFriendRequest(this.friendIdT2gp);
                        this.close();
                    }
                }
            });
        }
        else {
            Online.Social.acceptFriendRequest(this.friendIdT2gp);
            this.close();
        }
    }
    // T2GP only
    onDeclineRequest() {
        if (this.supportConfirmation[SocialButtonTypes.DECLINE_FRIEND_ADD_REQUEST]) {
            DialogManager.createDialog_ConfirmCancel({
                title: "LOC_UI_MP_FRIENDS_CONFIRM_DECLINE_REQUEST_TITLE",
                body: Locale.compose("LOC_UI_MP_FRIENDS_CONFIRM_DECLINE_REQUEST", this.getGamerTag()),
                canClose: false,
                callback: (eAction) => {
                    if (eAction == DialogBoxAction.Confirm) {
                        Online.Social.rejectFriendRequest(this.friendIdT2gp);
                        this.close();
                    }
                }
            });
        }
        else {
            Online.Social.rejectFriendRequest(this.friendIdT2gp);
            this.close();
        }
    }
    // T2GP only
    onAcceptGameInvite() {
        if (this.supportConfirmation[SocialButtonTypes.ACCEPT_GAME_INVITE]) {
            DialogManager.createDialog_ConfirmCancel({
                title: "LOC_UI_MP_FRIENDS_CONFIRM_ACCEPT_INVITE_TITLE",
                body: Locale.compose("LOC_UI_MP_FRIENDS_CONFIRM_ACCEPT_INVITE", this.getGamerTag()),
                canClose: false,
                callback: (eAction) => {
                    if (eAction == DialogBoxAction.Confirm) {
                        Online.Social.acceptGameInvite(this.gamertagT2gp);
                        this.close();
                    }
                }
            });
        }
        else {
            Online.Social.acceptGameInvite(this.gamertagT2gp);
            this.close();
        }
    }
    // T2GP only
    onDeclineGameInvite() {
        if (this.supportConfirmation[SocialButtonTypes.DECLINE_GAME_INVITE]) {
            DialogManager.createDialog_ConfirmCancel({
                title: "LOC_UI_MP_FRIENDS_CONFIRM_DECLINE_INVITE_TITLE",
                body: Locale.compose("LOC_UI_MP_FRIENDS_CONFIRM_DECLINE_INVITE", this.getGamerTag()),
                canClose: false,
                callback: (eAction) => {
                    if (eAction == DialogBoxAction.Confirm) {
                        Online.Social.declineGameInvite(this.gamertagT2gp);
                        this.close();
                    }
                }
            });
        }
        else {
            Online.Social.declineGameInvite(this.gamertagT2gp);
            this.close();
        }
    }
    // T2GP only
    onReport() {
        if (this.supportConfirmation[SocialButtonTypes.REPORT]) {
        }
        else {
            const popupTop = MustGetElement(".mp-friends-options-frame", this.Root);
            const popupOuter = MustGetElement(".mp-options-popup", this.Root);
            const popupButtonContainer = MustGetElement(".mp-options-popup-button-container", this.Root);
            while (popupButtonContainer.children.length > 0) {
                popupButtonContainer.removeChild(popupButtonContainer.children[0]);
            }
            //Clear the list before adding the items to it
            this.reportDropdownItems = [];
            //Add a temporary option for 'Select a Reason' tile
            const chooseAnOptionItem = {
                key: "",
                label: Locale.compose("LOC_ABUSE_REPORT_SELECT_REASON"),
                disabled: true
            };
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
    onReportDropdownSelection(event) {
        const selection = this.reportDropdownItems[event.detail.selectedIndex];
        //Remove the 'Select a Reason' option from the dropdown list once a player had made their initial selection.
        if (this.reportDropdownItems.find((reportItem) => {
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
    buildReportReasonsDropdown() {
        abuseReasonToName.forEach((value, key) => {
            const newItem = {
                key: key,
                label: value,
                tooltip: abuseReasonToTooltip.get(key)
            };
            this.reportDropdownItems.push(newItem);
        });
    }
    // T2GP only
    onRemoveFriend() {
        if (this.supportConfirmation[SocialButtonTypes.REMOVE_FRIEND]) {
            DialogManager.createDialog_ConfirmCancel({
                title: "LOC_UI_MP_FRIENDS_REMOVE_FRIEND_TITLE",
                body: Locale.compose("LOC_UI_MP_FRIENDS_REMOVE_FRIEND", this.getGamerTag()),
                canClose: false,
                callback: (eAction) => {
                    if (eAction == DialogBoxAction.Confirm) {
                        Online.Social.removeFriend(this.friendIdT2gp);
                        this.close();
                    }
                }
            });
        }
        else {
            Online.Social.removeFriend(this.friendIdT2gp);
            this.close();
        }
    }
    onKick() {
        if (this.lobbyPlayerId != -1) {
            this.kick(this.lobbyPlayerId);
        }
        this.close();
    }
    onMute() {
        if (this.lobbyPlayerId != -1) {
            this.mute(this.lobbyPlayerId, true);
        }
        this.close();
    }
    onUnMute() {
        if (this.lobbyPlayerId != -1) {
            this.mute(this.lobbyPlayerId, false);
        }
        this.close();
    }
    // Reference from: ui\shell\mp-staging\model-mp-staging-new.ts
    kick(kickPlayerID) {
        if (this.supportConfirmation[SocialButtonTypes.KICK]) {
            const gameConfig = Configuration.getGame();
            const isKickVote = gameConfig.isKickVoting; // Kick Vote (true) or Direct Kick mode?
            const dialogCallback = (eAction) => {
                if (eAction == DialogBoxAction.Confirm) {
                    if (isKickVote) {
                        const yesVote = true; // vote to kick the target player
                        Network.kickVotePlayer(kickPlayerID, yesVote, KickVoteReasonType.KICKVOTE_NONE);
                    }
                    else {
                        Network.directKickPlayer(kickPlayerID);
                    }
                }
                // Else: Kick was given up
            };
            const dialogBody = isKickVote ? "LOC_KICK_VOTE_CONFIRM_DIALOG" : "LOC_DIRECT_KICK_CONFIRM_DIALOG";
            const kickPlayerConfig = Configuration.getPlayer(kickPlayerID);
            const kickPlayerName = Locale.compose(kickPlayerConfig.slotName);
            DialogManager.createDialog_ConfirmCancel({
                body: Locale.compose(dialogBody, kickPlayerName),
                title: "LOC_KICK_DIALOG_TITLE",
                callback: dialogCallback
            });
        }
        else {
            const gameConfig = Configuration.getGame();
            const isKickVote = gameConfig.isKickVoting; // Kick Vote (true) or Direct Kick mode?
            if (isKickVote) {
                const yesVote = true; // vote to kick the target player
                Network.kickVotePlayer(kickPlayerID, yesVote, KickVoteReasonType.KICKVOTE_NONE);
            }
            else {
                Network.directKickPlayer(kickPlayerID);
            }
        }
    }
    // Reference from: ui\shell\mp-staging\model-mp-staging-new.ts
    mute(mutePlayerID, mute) {
        if ((mute && this.supportConfirmation[SocialButtonTypes.MUTE]) || (!mute && this.supportConfirmation[SocialButtonTypes.UNMUTE])) {
            const dialogCallback = (eAction) => {
                if (eAction == DialogBoxAction.Confirm) {
                    Network.setPlayerMuted(mutePlayerID, mute);
                    engine.trigger('staging-mute-changed');
                }
            };
            const mutePlayerConfig = Configuration.getPlayer(mutePlayerID);
            const mutePlayerName = Locale.compose(mutePlayerConfig.slotName);
            DialogManager.createDialog_ConfirmCancel({
                body: Locale.compose(mute ? "LOC_DIRECT_MUTE_CONFIRM_DIALOG" : "LOC_DIRECT_UNMUTE_CONFIRM_DIALOG", mutePlayerName),
                title: mute ? "LOC_MUTE_DIALOG_TITLE" : "LOC_UNMUTE_DIALOG_TITLE",
                callback: dialogCallback
            });
        }
        else {
            Network.setPlayerMuted(mutePlayerID, mute);
            engine.trigger('staging-mute-changed');
        }
    }
    onPlayerDisconnected() {
        MPFriendsModel.refreshFriendList();
    }
    getFriendID() {
        if (this.isT2GP) {
            return this.friendIdT2gp;
        }
        else if (this.is1stParty) {
            return this.friendId1p;
        }
        return "";
    }
    getGamerTag() {
        if (this.gamertagT2gp && this.gamertagT2gp != "") {
            return this.gamertagT2gp;
        }
        else if (this.gamertag1p && this.gamertag1p != "") {
            return this.gamertag1p;
        }
        return "";
    }
    // T2GP only
    onBlock() {
        let friendID = this.getFriendID();
        let gamerTag = this.getGamerTag();
        if (friendID != "") {
            DialogManager.createDialog_ConfirmCancel({
                title: "LOC_UI_MP_FRIENDS_CONFIRM_BLOCK_TITLE",
                body: Locale.compose("LOC_UI_MP_FRIENDS_CONFIRM_BLOCK", gamerTag),
                callback: (eAction) => {
                    if (eAction == DialogBoxAction.Confirm) {
                        Online.Social.blockUser(friendID);
                        DialogManager.createDialog_Confirm({
                            title: "LOC_UI_MP_FRIENDS_CONFIRM_BLOCK_TITLE",
                            body: Locale.compose("LOC_UI_MP_FRIENDS_FEEDBACK_BLOCK", gamerTag)
                        });
                    }
                }
            });
            this.close(); //Close so we don't have to worry about the status of the block button.
        }
        else {
            console.error("mp-friends-options: unblockPlayer(): None valid Friend ID (1P or T2GP) so nothing happened");
        }
    }
    onUnBlock() {
        let friendID = this.getFriendID();
        let gamerTag = this.getGamerTag();
        if (friendID != "") {
            DialogManager.createDialog_ConfirmCancel({
                title: "LOC_UI_MP_FRIENDS_CONFIRM_UNBLOCK_TITLE",
                body: Locale.compose("LOC_UI_MP_FRIENDS_CONFIRM_UNBLOCK", gamerTag),
                callback: (eAction) => {
                    if (eAction == DialogBoxAction.Confirm) {
                        Online.Social.unblockUser(friendID);
                        DialogManager.createDialog_Confirm({
                            title: "LOC_UI_MP_FRIENDS_CONFIRM_UNBLOCK_TITLE",
                            body: Locale.compose("LOC_UI_MP_FRIENDS_FEEDBACK_UNBLOCK", gamerTag)
                        });
                    }
                }
            });
        }
        this.close(); //Close so we don't have to worry about the status of the block button.
    }
    createReportDialog(reason) {
        ContextManager.push("screen-mp-report", { singleton: true, createMouseGuard: true, attributes: { blackOut: true, reportUserId: this.friendIdT2gp, reportUserGamertag: this.getGamerTag(), reportReason: reason } });
    }
    confirmInviteToJoin() {
        const friendID = this.getFriendID();
        const friendData = MPFriendsModel.getFriendDataFromID(friendID);
        if (friendID && friendData && !friendData.disabledActionButton) {
            MPFriendsModel.invite(friendID, friendData);
            DialogManager.createDialog_Confirm({
                title: "LOC_UI_MP_FRIENDS_FEEDBACK_INVITE_TO_JOIN_TITLE",
                body: Locale.compose("LOC_UI_MP_FRIENDS_FEEDBACK_INVITE_TO_JOIN", this.getGamerTag())
            });
        }
        else {
            console.error("mp-friends: invitePlayer(): Invalid friendID or friendData");
        }
    }
    confirmAddFriend(friendID) {
        Online.Social.sendFriendRequest(friendID);
        DialogManager.createDialog_Confirm({
            title: "LOC_UI_MP_FRIENDS_FEEDBACK_ADD_FRIEND_TITLE",
            body: Locale.compose("LOC_UI_MP_FRIENDS_FEEDBACK_ADD_FRIEND", this.getGamerTag())
        });
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

//# sourceMappingURL=file:///core/ui/shell/mp-staging/mp-friends-options.js.map
