/**
 * @file mp-friends.ts
 * @copyright 2023-2024, Firaxis Games
 * @description Multiplayer Friends and Blocked Players lists
 */
import FocusManager from '/core/ui/input/focus-manager.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel, { AnchorType } from '/core/ui/panel-support.js';
import MPFriendsModel, { MPFriendsPlayerData, MPRefreshDataFlags } from '/core/ui/shell/mp-staging/model-mp-friends.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
import DialogManager from '/core/ui/dialog-box/manager-dialog-box.js';
import SocialNotificationsManager, { SocialNotificationIndicatorType } from '/core/ui/social-notifications/social-notifications-manager.js';
import { NetworkUtilities } from '/core/ui/utilities/utilities-network.js';
import { getPlayerCardInfo } from '/core/ui/utilities/utilities-liveops.js';
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js';
export var TabNameTypes;
(function (TabNameTypes) {
    TabNameTypes[TabNameTypes["LobbyTab"] = 0] = "LobbyTab";
    TabNameTypes[TabNameTypes["SearchResutsTab"] = 1] = "SearchResutsTab";
    TabNameTypes[TabNameTypes["FriendsListTab"] = 2] = "FriendsListTab";
    TabNameTypes[TabNameTypes["NotificationsTab"] = 3] = "NotificationsTab";
    TabNameTypes[TabNameTypes["RecentlyMetTab"] = 4] = "RecentlyMetTab";
    TabNameTypes[TabNameTypes["BlockTab"] = 5] = "BlockTab";
})(TabNameTypes || (TabNameTypes = {}));
export const TabNames = [
    "lobby-list-tab",
    "search-results-list-tab",
    "friends-list-tab",
    "notifications-list-tab",
    "recently-met-players-list-tab",
    "blocked-players-list-tab",
];
export const SocialPanelOpenEventName = 'social-panel-open';
class SocialPanelOpenEvent extends CustomEvent {
    constructor() {
        super(SocialPanelOpenEventName, { bubbles: false, cancelable: true });
    }
}
class PanelMPPlayerOptions extends Panel {
    constructor(root) {
        super(root);
        this.engineInputListener = this.onEngineInput.bind(this);
        this.closeButtonListener = this.onClose.bind(this);
        this.friendRowEngineInputListener = this.onFriendRowEngineInput.bind(this);
        this.blockedPlayerRowEngineInputListener = this.onBlockedPlayerRowEngineInput.bind(this);
        this.recentlyMetPlayerRowEngineInputListener = this.onRecentlyMetPlayerRowEngineInput.bind(this);
        this.searchResultsRowEngineInputListener = this.onSearchResultsRowEngineInput.bind(this);
        this.lobbyRowEngineInputListener = this.onLobbyRowEngineInput.bind(this);
        this.notificationsInputListener = this.onNotificationsRowEngineInput.bind(this);
        this.openSearchButtonListener = this.onOpenSearch.bind(this);
        this.openPlayerActionsButtonListener = this.onOpenPlayerActions.bind(this);
        this.dataUpdateListener = this.onDataUpdate.bind(this);
        this.searchingStatusListener = this.onSearchingStatusUpdate.bind(this);
        this.updateLobbyTabListener = this.updateLobbyTab.bind(this);
        this.userInfoUpdatedListener = this.onUserInfoUpdated.bind(this);
        this.searchingCancelDialogBoxId = 0;
        this.tabInitialized = false;
        this.defaultTab = TabNameTypes.FriendsListTab;
        this.updateGate = new UpdateGate(this.onUpdate.bind(this));
        this.updateFlags = MPRefreshDataFlags.None;
        this.currentTab = "";
        this.pendingAdds = new Map();
        this.pendingUpdates = new Map();
        this.animateInType = this.animateOutType = AnchorType.None;
        this.enableOpenSound = true;
        this.enableCloseSound = true;
        this.Root.setAttribute("data-audio-group-ref", "audio-mp-friends");
    }
    onAttach() {
        super.onAttach();
        window.dispatchEvent(new SocialPanelOpenEvent());
        engine.on('PlayerInfoChanged', this.updateLobbyTabListener);
        engine.on("UserInfoUpdated", this.userInfoUpdatedListener);
        this.frame = MustGetElement(".mp-friends-frame", this.Root);
        const closeButton = MustGetElement("fxs-close-button", this.frame);
        const mainContainer = MustGetElement(".main-container", this.frame);
        this.tabBar = MustGetElement("fxs-tab-bar", mainContainer);
        this.header = MustGetElement("fxs-header", mainContainer);
        this.slotGroup = MustGetElement('fxs-slot-group', mainContainer);
        this.Root.classList.add("absolute");
        const platformName = MustGetElement(".mp-friends-platform-name", this.Root);
        platformName.setAttribute("data-l10n-id", Network.getLocal1PPlayerName());
        const platformIcon = MustGetElement(".mp-friends-platform-icon", this.Root);
        const iconStr = NetworkUtilities.getHostingTypeURL(Network.getLocalHostingPlatform());
        platformIcon.style.backgroundImage = `url('${iconStr}')`;
        const twoKIcon = MustGetElement(".mp-friends-2k-icon", this.Root);
        const twoKName = MustGetElement(".mp-friends-2k-name", this.Root);
        twoKName.setAttribute("data-l10n-id", Online.UserProfile.getMyDisplayName());
        twoKIcon.style.backgroundImage = `url('fs://game/prof_2k_logo.png')`;
        this.Root.addEventListener('engine-input', this.engineInputListener);
        closeButton.addEventListener('action-activate', this.closeButtonListener);
        this.tabBar.addEventListener("tab-selected", this.onTabBarSelected.bind(this));
        const openSearchButton = this.Root.querySelector('.open-search-button');
        if (openSearchButton) {
            openSearchButton.setAttribute("data-audio-group-ref", "audio-mp-friends");
            openSearchButton.addEventListener('action-activate', this.openSearchButtonListener);
        }
        MPFriendsModel.eventNotificationUpdate.on(this.dataUpdateListener);
        MPFriendsModel.onIsSearchingChange(this.searchingStatusListener);
        this.updateLobbyTab();
        // force to render UI tabs, when we got already friends data
        this.updateFlags = MPRefreshDataFlags.All;
        this.onUpdate();
        delayByFrame(() => {
            this.postAttachTabNotification();
        }, 2);
        UI.screenTypeAction(UIScreenAction.OPEN, UIOnlineScreenType.SOCIAL);
    }
    onDetach() {
        engine.off("UserInfoUpdated", this.userInfoUpdatedListener);
        engine.off("PlayerInfoChanged", this.updateLobbyTab);
        this.Root.removeEventListener('engine-input', this.engineInputListener);
        UI.screenTypeAction(UIScreenAction.CLOSE, UIOnlineScreenType.SOCIAL);
        MPFriendsModel.eventNotificationUpdate.off(this.dataUpdateListener);
        MPFriendsModel.offIsSearchingChange(this.searchingStatusListener);
        NavTray.clear();
        super.onDetach();
    }
    onAttributeChanged(name, _oldValue, _newValue) {
        if (name == "tab") {
            switch (_newValue) {
                case "notifications-list-tab":
                    this.tabBar?.setAttribute("selected-tab-index", TabNameTypes.NotificationsTab.toString());
                    this.tabInitialized = true;
                    break;
            }
        }
    }
    updateLobbyTab() {
        const lobbyTabList = MustGetElement(".lobby-list", this.slotGroup);
        this.buildLobbyPlayerRow(lobbyTabList, this.lobbyRowEngineInputListener, this.openPlayerActionsButtonListener, "LOC_UI_MP_FRIENDS_LOBBY_LIST");
    }
    onDataUpdate() {
        this.updateFlags |= MPFriendsModel.getUpdatedDataFlag();
        this.updateGate.call('data-update');
    }
    onUpdate() {
        MPFriendsModel.searching(false);
        if ((this.updateFlags & MPRefreshDataFlags.SearchResult) > 0) {
            const searchResultsList = MustGetElement(".search-results-list", this.slotGroup);
            this.cancelPendingAdd(searchResultsList);
            this.buildPlayerRow(MPFriendsModel.searchResultsData, searchResultsList, this.searchResultsRowEngineInputListener, this.openPlayerActionsButtonListener, "LOC_UI_MP_FRIENDS_SEARCH_RESULTS_LIST");
        }
        if ((this.updateFlags & MPRefreshDataFlags.Friends) > 0) {
            const friendsList = MustGetElement(".friends-list", this.slotGroup);
            this.cancelPendingAdd(friendsList);
            this.buildPlayerRow(MPFriendsModel.friendsData, friendsList, this.friendRowEngineInputListener, this.openPlayerActionsButtonListener, "LOC_UI_MP_FRIENDS_FRIENDS_LIST");
        }
        if ((this.updateFlags & MPRefreshDataFlags.Blocked) > 0) {
            const blockedPlayersList = MustGetElement(".blocked-players-list", this.slotGroup);
            this.cancelPendingAdd(blockedPlayersList);
            this.buildPlayerRow(MPFriendsModel.blockedPlayersData, blockedPlayersList, this.blockedPlayerRowEngineInputListener, this.openPlayerActionsButtonListener, "LOC_UI_MP_FRIENDS_UNBLOCK_LIST");
        }
        if ((this.updateFlags & MPRefreshDataFlags.Notifications) > 0) {
            const notificationsList = MustGetElement(".notifications-list", this.slotGroup);
            this.cancelPendingAdd(notificationsList);
            this.buildPlayerRow(MPFriendsModel.notificationsData, notificationsList, this.notificationsInputListener, this.openPlayerActionsButtonListener, "LOC_UI_MP_FRIENDS_NOTIFICATIONS_LIST");
        }
        if ((this.updateFlags & MPRefreshDataFlags.RecentlyMet) > 0) {
            const recentlyMetPlayersList = MustGetElement(".recently-met-players-list", this.slotGroup);
            this.cancelPendingAdd(recentlyMetPlayersList);
            this.buildPlayerRow(MPFriendsModel.recentlyMetPlayersData, recentlyMetPlayersList, this.recentlyMetPlayerRowEngineInputListener, this.openPlayerActionsButtonListener, "LOC_UI_MP_FRIENDS_RECENT_LIST");
        }
        if ((this.updateFlags & MPRefreshDataFlags.UserProfiles) > 0) {
            const friendsList = MustGetElement(".friends-list", this.slotGroup);
            this.cancelPendingUpdate(friendsList);
            this.updateUserProfiles(MPFriendsModel.friendsData, friendsList);
            const recentlyMetPlayersList = MustGetElement(".recently-met-players-list", this.slotGroup);
            this.cancelPendingUpdate(recentlyMetPlayersList);
            this.updateUserProfiles(MPFriendsModel.recentlyMetPlayersData, recentlyMetPlayersList);
            const notificationsList = MustGetElement(".notifications-list", this.slotGroup);
            this.cancelPendingUpdate(notificationsList);
            this.updateUserProfiles(MPFriendsModel.notificationsData, notificationsList);
            this.updateLobbyUserProfiles();
        }
        this.updateFlags = MPRefreshDataFlags.None;
        // reset the focus since we just blew away whatever probably had it before, but only if we're topmost
        if (ContextManager.isCurrentClass("screen-mp-friends")) {
            FocusManager.setFocus(this.slotGroup);
        }
    }
    onSearchingStatusUpdate(isSearching) {
        if (isSearching) {
            const searchResultsList = MustGetElement(".search-results-list", this.slotGroup);
            this.buildPlayerRow([], searchResultsList, this.searchResultsRowEngineInputListener, this.openPlayerActionsButtonListener, "LOC_UI_MP_FRIENDS_SEARCH_RESULTS_LIST");
            this.searchingCancelDialogBoxId = DialogManager.createDialog_Confirm({
                body: "",
                title: "LOC_UI_MP_FRIENDS_SEARCHING",
                displayHourGlass: true,
            });
        }
        else {
            DialogManager.closeDialogBox(this.searchingCancelDialogBoxId);
        }
    }
    onUserInfoUpdated() {
        const twoKName = MustGetElement(".mp-friends-2k-name", this.Root);
        twoKName.setAttribute("data-l10n-id", Online.UserProfile.getMyDisplayName());
    }
    // fxs-tab-item is not created until postAttach so this is a delayed call
    postAttachTabNotification() {
        MPFriendsModel.postAttachTabNotification(TabNameTypes.NotificationsTab);
    }
    updateLobbyUserProfiles() {
        // error reminder, you need to be in multiplayer mode
        const gameConfig = Configuration.getGame();
        let screenCheck = !(ContextManager.hasInstanceOf("main-menu"));
        let lobbyCheck = ContextManager.hasInstanceOf("screen-mp-lobby");
        if (!((screenCheck || lobbyCheck) && gameConfig.isInternetMultiplayer)) {
            return;
        }
        const numPlayers = gameConfig.humanPlayerCount;
        if (numPlayers <= 1)
            return; // 1 for local player
        const localPlatform = Network.getLocalHostingPlatform();
        MPFriendsModel.searching(false);
        const playerData = [];
        for (const playerID of gameConfig.humanPlayerIDs) {
            const playerConfig = Configuration.getPlayer(playerID);
            if (!playerConfig.isHuman ||
                (playerConfig.isParticipant && !playerConfig.isAlive) ||
                playerID == GameContext.localPlayerID) {
                continue;
            }
            const playerFirstPartyType = Network.getPlayerHostingPlatform(playerID);
            // Only show first party names if we are on the same platform. 
            //We do this to avoid profanity filtering player names from other platforms.
            let playerFirstPartyName = "";
            if (localPlatform == playerFirstPartyType) {
                playerFirstPartyName = playerConfig.nickName_1P;
            }
            const firstPartyID = Online.Social.getPlayerFriendID_Network(playerID);
            const t2gpID = Online.Social.getPlayerFriendID_T2GP(playerID);
            const friendData = new MPFriendsPlayerData();
            friendData.friendID1P = firstPartyID;
            friendData.gamertag1P = playerFirstPartyName;
            friendData.friendIDT2gp = t2gpID;
            friendData.gamertagT2gp = playerConfig.nickName_T2GP;
            friendData.platform = playerFirstPartyType;
            friendData.leaderId = playerConfig.leaderTypeName != null && playerConfig.leaderTypeName != "RANDOM" ? playerConfig.leaderTypeName : "UNKNOWN_LEADER";
            playerData.push(friendData);
        }
        const lobbyTabList = MustGetElement(".lobby-list", this.slotGroup);
        this.updateUserProfiles(playerData, lobbyTabList);
    }
    buildLobbyPlayerRow(appendRow, playerRowEventListener, actionButtonListener, listName) {
        appendRow.innerHTML = "";
        // error reminder, you need to be in multiplayer mode
        const gameConfig = Configuration.getGame();
        let screenCheck = !(ContextManager.hasInstanceOf("main-menu"));
        let lobbyCheck = ContextManager.hasInstanceOf("screen-mp-lobby");
        if (!((screenCheck || lobbyCheck) && gameConfig.isInternetMultiplayer)) {
            let displayText = "LOC_UI_MP_FRIENDS_LOBBY_MULTIPLYER_REMINDER";
            appendRow.innerHTML = `
				<fxs-vslot class="w-full h-full justify-center align-center">
					<div class="font-body font-normal text-base self-center">${Locale.stylize(displayText, listName)}</div>
				</fxs-vslot>
			`;
            return;
        }
        const localPlatform = Network.getLocalHostingPlatform();
        const numPlayers = Configuration.getMap().maxMajorPlayers;
        let playerFound = false;
        MPFriendsModel.searching(false);
        for (let playerID = 0; playerID < numPlayers; playerID++) {
            if (Network.isPlayerConnected(playerID)) {
                const playerConfig = Configuration.getPlayer(playerID);
                if (!playerConfig.isHuman ||
                    (playerConfig.isParticipant && !playerConfig.isAlive) ||
                    playerID == GameContext.localPlayerID) {
                    continue;
                }
                playerFound = true;
                const friendItem = document.createElement("progression-header");
                friendItem.setAttribute("player-card-style", "social");
                friendItem.addEventListener('engine-input', playerRowEventListener);
                friendItem.setAttribute('tabindex', "-1");
                let playerFirstPartyType = Network.getPlayerHostingPlatform(playerID);
                // Only show first party names if we are on the same platform. 
                //We do this to avoid profanity filtering player names from other platforms.
                let playerFirstPartyName = "";
                if (localPlatform == playerFirstPartyType) {
                    playerFirstPartyName = playerConfig.nickName_1P;
                }
                const firstPartyID = Online.Social.getPlayerFriendID_Network(playerID);
                const t2gpID = Online.Social.getPlayerFriendID_T2GP(playerID);
                const friendData = new MPFriendsPlayerData();
                friendData.friendID1P = firstPartyID;
                friendData.gamertag1P = playerFirstPartyName;
                friendData.friendIDT2gp = t2gpID;
                friendData.gamertagT2gp = playerConfig.nickName_T2GP;
                friendData.platform = playerFirstPartyType;
                friendData.leaderId = playerConfig.leaderTypeName != null && playerConfig.leaderTypeName != "RANDOM" ? playerConfig.leaderTypeName : "UNKNOWN_LEADER";
                let userProfileId = this.getUserProfileId(t2gpID, firstPartyID);
                this.updateFriendItem(friendData, friendItem, userProfileId, true);
                friendItem.setAttribute('userProfileId', userProfileId);
                friendItem.setAttribute('data-player-id-lobby', playerID.toString());
                friendItem.setAttribute('caption', "");
                friendItem.addEventListener('action-activate', actionButtonListener);
                appendRow.appendChild(friendItem);
            }
            if (!playerFound) {
                let displayText = "LOC_UI_MP_FRIENDS_NO_RESULTS";
                appendRow.innerHTML = `
				<fxs-vslot class="w-full h-full justify-center align-center">
					<div class="font-body font-normal text-base self-center">${Locale.stylize(displayText, listName)}</div>
				</fxs-vslot>
			`;
            }
        }
    }
    cancelAllPendingAddsAndUpdates() {
        for (const update of this.pendingUpdates.values()) {
            update.isCancelled = true;
        }
        for (const add of this.pendingAdds.values()) {
            add.isCancelled = true;
        }
    }
    cancelPendingAdd(itemList) {
        const cancelToken = this.pendingAdds.get(itemList);
        if (cancelToken) {
            cancelToken.isCancelled = true;
        }
    }
    buildPlayerRow(playerData, appendRow, playerRowEventListener, actionButtonListener, listName, isChunkLoad = false) {
        if (!isChunkLoad) {
            appendRow.innerHTML = "";
        }
        if (playerData.length == 0) {
            let displayText = "LOC_UI_MP_FRIENDS_NO_RESULTS";
            if (MPFriendsModel.isSearching()) {
                displayText = "LOC_UI_MP_FRIENDS_SEARCHING";
            }
            appendRow.innerHTML = `
				<fxs-vslot class="w-full h-full justify-center align-center">
					<div class="font-body font-normal text-base self-center">${Locale.stylize(displayText, listName)}</div>
				</fxs-vslot>
			`;
        }
        else {
            const MAX_PER_ADD = 20;
            const numberToAdd = Math.min(playerData.length, MAX_PER_ADD);
            let showUserProfile = (playerRowEventListener != this.searchResultsRowEngineInputListener) && (playerRowEventListener != this.blockedPlayerRowEngineInputListener);
            const fragment = document.createDocumentFragment();
            MPFriendsModel.searching(false);
            for (let i = 0; i < numberToAdd; i++) {
                const friendItem = document.createElement("progression-header");
                friendItem.setAttribute("player-card-style", "social");
                friendItem.addEventListener('engine-input', playerRowEventListener);
                friendItem.setAttribute('tabindex', "-1");
                friendItem.setAttribute("data-audio-group-ref", "audio-mp-friends");
                let userProfileId = playerData[i].friendIDT2gp;
                if (userProfileId == "")
                    userProfileId = playerData[i].friendID1P;
                if (showUserProfile)
                    friendItem.setAttribute('userProfileId', userProfileId);
                this.updateFriendItem(playerData[i], friendItem, userProfileId, showUserProfile);
                if (!playerData[i].disabledActionButton) {
                    friendItem.addEventListener('action-activate', actionButtonListener);
                }
                fragment.appendChild(friendItem);
            }
            appendRow.appendChild(fragment);
            // If the number of items was large, add them in chunks
            // TODO: Change this to virtualized scrolling in the future
            if (numberToAdd < playerData.length) {
                playerData = playerData.slice(numberToAdd);
                const cancelToken = { isCancelled: false };
                delayByFrame(() => {
                    if (!cancelToken.isCancelled) {
                        this.buildPlayerRow(playerData, appendRow, playerRowEventListener, actionButtonListener, listName, true);
                    }
                    ;
                }, MAX_PER_ADD);
                this.pendingAdds.set(appendRow, cancelToken);
            }
        }
    }
    getUserProfileId(t2gpId, platformId) {
        if (t2gpId && t2gpId != "")
            return t2gpId;
        return platformId;
    }
    updateFriendItem(playerData, friendItem, userProfileId, showUserProfile) {
        const T2GPStatus = (playerData.platform == HostingType.HOSTING_TYPE_T2GP);
        let playerInfo = null;
        if (!showUserProfile) { // getPlayerCardInfo will request user profiles from DNA, we don't wat to request for search results
            playerInfo = {
                TitleLocKey: "",
                BackgroundURL: "fs://game/bn_default",
                BadgeId: "",
                BadgeURL: "",
                BannerId: "",
                BorderURL: "",
                twoKName: playerData.gamertagT2gp,
                twoKId: "",
                playerTitle: "",
                BackgroundColor: "rgb(0, 0, 0)",
                firstPartyType: playerData.platform,
                firstPartyName: playerData.gamertag1P,
                LeaderID: "",
                Status: T2GPStatus ? playerData.statusDetailsT2gp : playerData.statusDetails1P,
                InfoIconURL: T2GPStatus ? playerData.statusIconT2gp : playerData.statusIcon1P,
                LastSeen: "",
                PortraitBorder: "",
                LeaderLevel: 1,
                FoundationLevel: 1,
            };
        }
        else {
            // TODO: need to get a lot more of this data from the server
            const cardInfo = getPlayerCardInfo(userProfileId, userProfileId == playerData.friendIDT2gp ? playerData.gamertagT2gp : playerData.gamertag1P, true);
            playerInfo = {
                ...cardInfo,
                Status: T2GPStatus ? playerData.statusDetailsT2gp : playerData.statusDetails1P,
                InfoIconURL: T2GPStatus ? playerData.statusIconT2gp : playerData.statusIcon1P,
                twoKName: cardInfo.twoKName || playerData.gamertagT2gp,
                twoKId: cardInfo.twoKId || playerData.friendIDT2gp,
                firstPartyType: playerData.platform,
                firstPartyName: playerData.gamertag1P,
                LastSeen: "",
                BadgeURL: cardInfo.BadgeURL,
                LeaderID: playerData.leaderId
            };
        }
        friendItem.setAttribute('data-friend-id-1p', playerData.friendID1P);
        friendItem.setAttribute('data-friend-id-t2gp', playerData.friendIDT2gp);
        friendItem.setAttribute('data-player-id-t2gp', playerInfo.twoKId); // data-friend-id-t2gp = we are already friends, this value is to send friend request
        friendItem.setAttribute('player-name-1p', playerInfo.firstPartyName);
        friendItem.setAttribute('player-name-t2gp', playerInfo.twoKName);
        friendItem.setAttribute('player-platform', playerInfo.firstPartyType.toString());
        friendItem.setAttribute('player-game-invite', playerData.isGameInvite.toString());
        friendItem.setAttribute('caption', playerData.actionButtonLabel);
        friendItem.setAttribute('data-player-info', JSON.stringify(playerInfo));
    }
    cancelPendingUpdate(itemList) {
        const cancelToken = this.pendingUpdates.get(itemList);
        if (cancelToken) {
            cancelToken.isCancelled = true;
        }
    }
    updateUserProfiles(playerData, itemList) {
        let itemCount = itemList.childElementCount;
        const MAX_PER_UPDATE = 10;
        if (playerData.length <= 0 || itemCount <= 0)
            return;
        const numberToUpdate = Math.min(playerData.length, MAX_PER_UPDATE);
        for (let i = 0; i < numberToUpdate; i++) {
            for (let k = 0; k < itemCount; k++) {
                let friendItem = itemList.children[k];
                if (friendItem) {
                    let userProfileId = this.getUserProfileId(playerData[i].friendIDT2gp, playerData[i].friendID1P);
                    let itemProfileId = friendItem.getAttribute("userProfileId");
                    if (itemProfileId != userProfileId)
                        continue;
                    this.updateFriendItem(playerData[i], friendItem, userProfileId, true);
                    break;
                }
            }
        }
        // If the number of items was large, update them in chunks
        if (numberToUpdate < playerData.length) {
            playerData = playerData.slice(numberToUpdate);
            const cancelToken = { isCancelled: false };
            waitForLayout(() => {
                if (!cancelToken.isCancelled) {
                    this.updateUserProfiles(playerData, itemList);
                }
                ;
            });
            this.pendingUpdates.set(itemList, cancelToken);
        }
    }
    onReceiveFocus() {
        super.onReceiveFocus();
        NavTray.clear();
        NavTray.addOrUpdateGenericBack();
        NavTray.addOrUpdateShellAction2("LOC_UI_FRIENDS_OPEN_SEARCH");
        if (this.currentTab != TabNames[TabNameTypes.SearchResutsTab] && MPFriendsModel.hasSearched()) {
            this.tabBar?.setAttribute("selected-tab-index", TabNameTypes.SearchResutsTab.toString());
            MPFriendsModel.searched(false);
        }
        else {
            FocusManager.setFocus(this.slotGroup); // This gives the focus to the first tab list: the Friends list
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
        switch (inputEvent.detail.name) {
            case 'keyboard-enter':
                this.navigateSearch();
                inputEvent.stopPropagation();
                inputEvent.preventDefault();
                break;
            case 'shell-action-2':
                this.createSearchDialog();
                inputEvent.stopPropagation();
                inputEvent.preventDefault();
                break;
            case 'cancel':
            case 'keyboard-escape':
            case 'mousebutton-right':
                this.onClose();
                inputEvent.stopPropagation();
                inputEvent.preventDefault();
                break;
        }
    }
    onClose() {
        this.cancelAllPendingAddsAndUpdates();
        this.close();
    }
    navigateSearch() {
        if (ContextManager.hasInstanceOf("screen-mp-search") && this.currentTab != TabNames[TabNameTypes.SearchResutsTab]) {
            this.tabBar?.setAttribute("selected-tab-index", TabNameTypes.SearchResutsTab.toString());
        }
    }
    onTabBarSelected(event) {
        event.stopPropagation();
        const { index } = event.detail;
        let tabName = "";
        let label = "";
        switch (index) {
            case TabNameTypes.BlockTab:
                tabName = TabNames[TabNameTypes.BlockTab];
                label = "LOC_UI_MP_FRIENDS_TAB_UNBLOCK";
                break;
            case TabNameTypes.RecentlyMetTab:
                tabName = TabNames[TabNameTypes.RecentlyMetTab];
                label = "LOC_UI_MP_FRIENDS_TAB_RECENT";
                break;
            case TabNameTypes.SearchResutsTab:
                tabName = TabNames[TabNameTypes.SearchResutsTab];
                label = "LOC_UI_MP_FRIENDS_TAB_SEARCH";
                break;
            case TabNameTypes.LobbyTab:
                tabName = TabNames[TabNameTypes.LobbyTab];
                label = "LOC_UI_MP_FRIENDS_TAB_LOBBY";
                break;
            case TabNameTypes.NotificationsTab:
                tabName = TabNames[TabNameTypes.NotificationsTab];
                label = "LOC_UI_MP_FRIENDS_TAB_NOTIFICATIONS";
                break;
            case TabNameTypes.FriendsListTab:
            default:
                label = "LOC_UI_MP_FRIENDS_TAB_INVITE";
                tabName = TabNames[TabNameTypes.FriendsListTab];
                break;
        }
        this.currentTab = tabName;
        if (!this.tabInitialized) {
            const gameConfig = Configuration.getGame();
            const screenCheck = !(ContextManager.hasInstanceOf("main-menu"));
            const lobbyCheck = ContextManager.hasInstanceOf("screen-mp-lobby");
            if ((screenCheck || lobbyCheck) && gameConfig.isInternetMultiplayer) {
                this.tabBar?.setAttribute("selected-tab-index", TabNameTypes.LobbyTab.toString());
            }
            else {
                this.tabBar?.setAttribute("selected-tab-index", this.defaultTab.toString());
            }
            this.tabInitialized = true;
        }
        else {
            this.tabBar?.setAttribute("selected-tab-index", index.toString());
        }
        if (tabName == TabNames[TabNameTypes.NotificationsTab] && SocialNotificationsManager.isNotificationVisible(SocialNotificationIndicatorType.SOCIALTAB_BADGE)) {
            SocialNotificationsManager.setNotificationVisibility(SocialNotificationIndicatorType.ALL_INDICATORS, false);
        }
        this.slotGroup.setAttribute('selected-slot', tabName);
        this.header.setAttribute('title', label);
        FocusManager.setFocus(this.slotGroup);
    }
    getFriendID1PFromElement(target) {
        if (target == null) {
            console.error("mp-friends: getFriendID1PFromElement(): Invalid target. It should be an HTMLElement");
            return null;
        }
        const friendID = target.getAttribute("data-friend-id-1p");
        if (friendID == null) {
            console.error("mp-friends: getFriendID1PFromElement(): Invalid data-friend-id-1p attribute");
            return null;
        }
        return friendID;
    }
    getFriendIDT2gpFromElement(target) {
        if (target == null) {
            console.error("mp-friends: getFriendIDT2gpFromElement(): Invalid target. It should be an HTMLElement");
            return null;
        }
        const friendID = target.getAttribute("data-friend-id-t2gp");
        if (friendID == null) {
            console.error("mp-friends: getFriendIDT2gpFromElement(): Invalid data-friend-id-t2gp attribute");
            return null;
        }
        return friendID;
    }
    getDisplayName1PFromElement(target) {
        if (target == null) {
            console.error("mp-friends: getDisplayName1PFromElement(): Invalid target. It should be an HTMLElement");
            return null;
        }
        const displayName = target.getAttribute("player-name-1p");
        if (displayName == null) {
            console.error("mp-friends: getDisplayName1PFromElement(): Invalid player-name-1p attribute");
            return null;
        }
        return displayName;
    }
    getDisplayNameT2gpFromElement(target) {
        if (target == null) {
            console.error("mp-friends: getDisplayNameT2gpFromElement(): Invalid target. It should be an HTMLElement");
            return null;
        }
        const displayName = target.getAttribute("player-name-t2gp");
        if (displayName == null) {
            console.error("mp-friends: getDisplayNameT2gpFromElement(): Invalid player-name-t2gp attribute");
            return null;
        }
        return displayName;
    }
    onFriendRowEngineInput(inputEvent) {
        if (inputEvent.detail.name == 'accept') {
            const playerRow = inputEvent.target;
            const button = playerRow.querySelector('fxs-button');
            this.invitePlayer(button);
        }
    }
    onBlockedPlayerRowEngineInput(inputEvent) {
        if (inputEvent.detail.name == 'accept') {
            const playerRow = inputEvent.target;
            const button = playerRow.querySelector('fxs-button');
            this.unblockPlayer(button);
        }
    }
    onRecentlyMetPlayerRowEngineInput(inputEvent) {
        if (inputEvent.detail.name == 'accept') {
            const playerRow = inputEvent.target;
            const button = playerRow.querySelector('fxs-button');
            this.addFriend(button);
        }
    }
    onSearchResultsRowEngineInput(inputEvent) {
        if (inputEvent.detail.name == 'accept') {
            const playerRow = inputEvent.target;
            const button = playerRow.querySelector('fxs-button');
            this.addFriend(button);
        }
    }
    onLobbyRowEngineInput(inputEvent) {
        if (inputEvent.detail.name == 'accept') {
            const playerRow = inputEvent.target;
            const button = playerRow.querySelector('fxs-button');
            this.addFriend(button);
        }
    }
    onNotificationsRowEngineInput(inputEvent) {
        if (inputEvent.detail.name == 'accept') {
            const playerRow = inputEvent.target;
            const button = playerRow.querySelector('fxs-button');
            this.addFriend(button);
        }
    }
    getFriendIDFromElement(target) {
        if (target == null) {
            console.error("mp-friends: getFriendIdFromElement(): Invalid target. It should be an HTMLElement");
            return "";
        }
        return this.getFriendID1PFromElement(target) || this.getFriendIDT2gpFromElement(target) || "";
    }
    getNameFromElement(target) {
        if (target == null) {
            console.error("mp-friends: getNameFromElement(): Invalid target. It should be an HTMLElement");
            return "";
        }
        return this.getDisplayName1PFromElement(target) || this.getDisplayNameT2gpFromElement(target) || "";
    }
    invitePlayer(target) {
        if (target == null) {
            console.error("mp-friends: invitePlayer(): Invalid target. It should be an HTMLElement");
            return;
        }
        const friendID = this.getFriendIDFromElement(target);
        const friendData = MPFriendsModel.getFriendDataFromID(friendID);
        if (friendID && friendData && !friendData.disabledActionButton) {
            MPFriendsModel.invite(friendID, friendData);
        }
        else {
            console.error("mp-friends: invitePlayer(): Invalid friendID or friendData");
        }
        const playerName = this.getNameFromElement(target);
        DialogManager.createDialog_Confirm({
            title: Locale.compose("LOC_UI_MP_FRIENDS_FEEDBACK_INVITE_TITLE", playerName),
            body: Locale.compose("LOC_UI_MP_FRIENDS_FEEDBACK_INVITE", playerName)
        });
    }
    unblockPlayer(target) {
        if (target == null) {
            console.error("mp-friends: unblockPlayer(): Invalid target. It should be an HTMLElement");
            return;
        }
        // Unblock the player on the platform they are blocked on.
        // If blocked on both 1st party and T2gp, prioritize T2gp.
        const friendID1P = this.getFriendID1PFromElement(target);
        const friendIDT2gp = this.getFriendIDT2gpFromElement(target);
        let friendID = "";
        const platSpecific = true;
        if (friendIDT2gp && friendIDT2gp != "" && Online.Social.isUserBlocked(friendIDT2gp, platSpecific)) {
            friendID = friendIDT2gp;
        }
        else if (friendID1P && friendID1P != "" && Online.Social.isUserBlocked(friendID1P, platSpecific)) {
            friendID = friendID1P;
        }
        if (friendID != "") {
            MPFriendsModel.unblock(friendID);
        }
        else {
            console.error("mp-friends: unblockPlayer(): None valid Friend ID (1P or T2GP) so nothing happened");
        }
        const playerName = this.getNameFromElement(target);
        DialogManager.createDialog_Confirm({
            title: Locale.compose("LOC_UI_MP_FRIENDS_FEEDBACK_UNBLOCK_TITLE", playerName),
            body: Locale.compose("LOC_UI_MP_FRIENDS_FEEDBACK_UNBLOCK", playerName)
        });
    }
    addFriend(target) {
        if (target == null) {
            console.error("mp-friends: addFriend(): Invalid target. It should be an HTMLElement");
            return;
        }
        const friendID = this.getFriendIDFromElement(target);
        const friendData = MPFriendsModel.getRecentlyMetPlayerdDataFromID(friendID);
        if (friendID && friendData && !friendData.disabledActionButton) {
            MPFriendsModel.addFriend(friendID, friendData);
        }
        else {
            console.error("mp-friends: addFriend(): Invalid friendID or friendData");
        }
        const playerName = this.getNameFromElement(target);
        DialogManager.createDialog_Confirm({
            title: Locale.compose("LOC_UI_MP_FRIENDS_FEEDBACK_ADD_FRIEND_TITLE", playerName),
            body: Locale.compose("LOC_UI_MP_FRIENDS_FEEDBACK_ADD_FRIEND", playerName)
        });
    }
    createSearchDialog() {
        ContextManager.push("screen-mp-search", { singleton: true, createMouseGuard: true, attributes: { blackOut: true } });
    }
    onOpenSearch() {
        this.createSearchDialog();
    }
    onOpenPlayerActions(event) {
        if (!(event.target instanceof HTMLElement)) {
            return;
        }
        // check already friends
        const friendId1p = event.target.getAttribute('data-friend-id-1p');
        const friendIdT2gp = event.target.getAttribute('data-friend-id-T2gp');
        const playerIdT2gp = event.target.getAttribute('data-player-id-t2gp');
        const gamertag1p = event.target.getAttribute('player-name-1p');
        const gamertagT2gp = event.target.getAttribute('player-name-t2gp');
        const playerIdLobby = event.target.getAttribute('data-player-id-lobby');
        const platform = event.target.getAttribute('player-platform');
        const gameInvite = event.target.getAttribute('player-game-invite');
        if (this.currentTab == "search-results-list-tab") {
            if ((friendId1p && Online.Social.isUserFriendOnPlatform(friendId1p, FriendListTypes.Immediate)) || (friendIdT2gp && (Online.Social.isUserFriendOnPlatform(friendIdT2gp, FriendListTypes.Immediate) || Online.Social.isUserFriendOnPlatform(friendIdT2gp, FriendListTypes.Hidden)))) {
                let message = "";
                if (gamertag1p) {
                    message = Locale.compose("LOC_UI_ALREADY_FRIEND", gamertag1p);
                }
                else if (gamertagT2gp) {
                    message = Locale.compose("LOC_UI_ALREADY_FRIEND", gamertagT2gp);
                }
                else {
                    message = Locale.compose("LOC_UI_ALREADY_FRIEND");
                }
                DialogManager.createDialog_Confirm({ body: message });
                return;
            }
        }
        if (!friendId1p && !friendIdT2gp) {
            console.error("mp-friends.ts: onOpenPlayerActions(): Failed to find data-friend-id-1p or data-friend-id-T2gp from target!");
            return;
        }
        const data = { friendId1p: friendId1p, friendIdT2gp: friendIdT2gp, gamertag1p: gamertag1p, gamertagT2gp: gamertagT2gp, currentTab: this.currentTab, playerIdLobby: playerIdLobby, platform: platform, isGameInvite: gameInvite };
        if (playerIdT2gp != null) {
            data.playerIdT2gp = playerIdT2gp;
        }
        ContextManager.push('screen-mp-friends-options', { singleton: true, createMouseGuard: true, attributes: data });
    }
}
Controls.define('screen-mp-friends', {
    createInstance: PanelMPPlayerOptions,
    description: 'Create popup for Multiplayer Lobby Player Options.',
    classNames: ['mp-friends'],
    styles: ['fs://game/core/ui/shell/mp-staging/mp-friends.css'],
    content: ['fs://game/core/ui/shell/mp-staging/mp-friends.html'],
    attributes: [
        {
            name: 'tab'
        }
    ]
});

//# sourceMappingURL=file:///core/ui/shell/mp-staging/mp-friends.js.map
