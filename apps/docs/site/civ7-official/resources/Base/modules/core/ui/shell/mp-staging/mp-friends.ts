/**
 * @file mp-friends.ts		
 * @copyright 2023-2024, Firaxis Games
 * @description Multiplayer Friends and Blocked Players lists
 */

import { TabSelectedEvent } from '/core/ui/components/fxs-tab-bar.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { InputEngineEvent } from '/core/ui/input/input-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel, { AnchorType } from '/core/ui/panel-support.js';
import MPFriendsModel, { MPFriendsPlayerData, MPRefreshDataFlags } from '/core/ui/shell/mp-staging/model-mp-friends.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
import DialogManager from '/core/ui/dialog-box/manager-dialog-box.js';
import SocialNotificationsManager, { SocialNotificationIndicatorType } from '/core/ui/social-notifications/social-notifications-manager.js'
import { NetworkUtilities } from '/core/ui/utilities/utilities-network.js';
import { getPlayerCardInfo } from '/core/ui/utilities/utilities-liveops.js';
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js';

interface FriendOptionsData {
	friendId1p: string | null;
	friendIdT2gp: string | null; // already T2GP friends
	playerIdT2gp?: string | null; // first party friends only need t2gp for sending requests
	gamertag1p: string | null;
	gamertagT2gp: string | null;
	currentTab: string | null;
	playerIdLobby: string | null;
	platform: string | null;
	isGameInvite: string | null;
}

export enum TabNameTypes {
	LobbyTab,
	SearchResutsTab,
	FriendsListTab,
	NotificationsTab,
	RecentlyMetTab,
	BlockTab,
}

export const TabNames = [
	"lobby-list-tab",
	"search-results-list-tab",
	"friends-list-tab",
	"notifications-list-tab",
	"recently-met-players-list-tab",
	"blocked-players-list-tab",
] as const;

export const SocialPanelOpenEventName = 'social-panel-open' as const;
class SocialPanelOpenEvent extends CustomEvent<{}> {
	constructor() {
		super(SocialPanelOpenEventName, { bubbles: false, cancelable: true });
	}
}

type CancellationToken = { isCancelled: boolean };

class PanelMPPlayerOptions extends Panel {

	private engineInputListener = this.onEngineInput.bind(this);
	private closeButtonListener = this.onClose.bind(this);

	private friendRowEngineInputListener = this.onFriendRowEngineInput.bind(this);
	private blockedPlayerRowEngineInputListener = this.onBlockedPlayerRowEngineInput.bind(this);
	private recentlyMetPlayerRowEngineInputListener = this.onRecentlyMetPlayerRowEngineInput.bind(this);
	private searchResultsRowEngineInputListener = this.onSearchResultsRowEngineInput.bind(this);
	private lobbyRowEngineInputListener = this.onLobbyRowEngineInput.bind(this);
	private notificationsInputListener = this.onNotificationsRowEngineInput.bind(this);
	private openSearchButtonListener = this.onOpenSearch.bind(this);
	private openPlayerActionsButtonListener = this.onOpenPlayerActions.bind(this);
	private dataUpdateListener = this.onDataUpdate.bind(this);
	private searchingStatusListener = this.onSearchingStatusUpdate.bind(this);
	private updateLobbyTabListener = this.updateLobbyTab.bind(this);
	private userInfoUpdatedListener = this.onUserInfoUpdated.bind(this);
	private searchingCancelDialogBoxId: number = 0;
	private tabInitialized = false;
	private defaultTab = TabNameTypes.FriendsListTab;
	private updateGate = new UpdateGate(this.onUpdate.bind(this));
	private updateFlags: MPRefreshDataFlags = MPRefreshDataFlags.None;

	private frame!: HTMLElement;
	private tabBar!: HTMLElement;
	private header!: HTMLElement;
	private slotGroup!: HTMLElement;
	private currentTab: string = "";

	private pendingAdds = new Map<HTMLElement, CancellationToken>();
	private pendingUpdates = new Map<HTMLElement, CancellationToken>();

	constructor(root: ComponentRoot) {
		super(root);
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

		const closeButton: HTMLElement = MustGetElement("fxs-close-button", this.frame);
		const mainContainer: HTMLElement = MustGetElement(".main-container", this.frame);

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

		const openSearchButton: HTMLElement | null = this.Root.querySelector<HTMLElement>('.open-search-button');
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

	onDetach(): void {
		engine.off("UserInfoUpdated", this.userInfoUpdatedListener);
		engine.off("PlayerInfoChanged", this.updateLobbyTab);

		this.Root.removeEventListener('engine-input', this.engineInputListener);

		UI.screenTypeAction(UIScreenAction.CLOSE, UIOnlineScreenType.SOCIAL);
		MPFriendsModel.eventNotificationUpdate.off(this.dataUpdateListener);
		MPFriendsModel.offIsSearchingChange(this.searchingStatusListener);

		NavTray.clear();

		super.onDetach();
	}

	onAttributeChanged(name: string, _oldValue: string | null, _newValue: string | null) {
		if (name == "tab") {
			switch (_newValue) {
				case "notifications-list-tab":
					this.tabBar?.setAttribute("selected-tab-index", TabNameTypes.NotificationsTab.toString());
					this.tabInitialized = true;
					break;
			}
		}
	}

	private updateLobbyTab() {
		const lobbyTabList: HTMLElement = MustGetElement(".lobby-list", this.slotGroup);
		this.buildLobbyPlayerRow(lobbyTabList, this.lobbyRowEngineInputListener, this.openPlayerActionsButtonListener, "LOC_UI_MP_FRIENDS_LOBBY_LIST");
	}

	private onDataUpdate() {
		this.updateFlags |= MPFriendsModel.getUpdatedDataFlag();
		this.updateGate.call('data-update');
	}

	private onUpdate() {
		MPFriendsModel.searching(false);

		if ((this.updateFlags & MPRefreshDataFlags.SearchResult) > 0) {
			const searchResultsList: HTMLElement = MustGetElement(".search-results-list", this.slotGroup);
			this.cancelPendingAdd(searchResultsList);
			this.buildPlayerRow(MPFriendsModel.searchResultsData, searchResultsList, this.searchResultsRowEngineInputListener, this.openPlayerActionsButtonListener, "LOC_UI_MP_FRIENDS_SEARCH_RESULTS_LIST");
		}

		if ((this.updateFlags & MPRefreshDataFlags.Friends) > 0) {
			const friendsList: HTMLElement = MustGetElement(".friends-list", this.slotGroup);
			this.cancelPendingAdd(friendsList);
			this.buildPlayerRow(MPFriendsModel.friendsData, friendsList, this.friendRowEngineInputListener, this.openPlayerActionsButtonListener, "LOC_UI_MP_FRIENDS_FRIENDS_LIST");
		}

		if ((this.updateFlags & MPRefreshDataFlags.Blocked) > 0) {

			const blockedPlayersList: HTMLElement = MustGetElement(".blocked-players-list", this.slotGroup);
			this.cancelPendingAdd(blockedPlayersList);
			this.buildPlayerRow(MPFriendsModel.blockedPlayersData, blockedPlayersList, this.blockedPlayerRowEngineInputListener, this.openPlayerActionsButtonListener, "LOC_UI_MP_FRIENDS_UNBLOCK_LIST");
		}

		if ((this.updateFlags & MPRefreshDataFlags.Notifications) > 0) {
			const notificationsList: HTMLElement = MustGetElement(".notifications-list", this.slotGroup);
			this.cancelPendingAdd(notificationsList);
			this.buildPlayerRow(MPFriendsModel.notificationsData, notificationsList, this.notificationsInputListener, this.openPlayerActionsButtonListener, "LOC_UI_MP_FRIENDS_NOTIFICATIONS_LIST");
		}

		if ((this.updateFlags & MPRefreshDataFlags.RecentlyMet) > 0) {
			const recentlyMetPlayersList: HTMLElement = MustGetElement(".recently-met-players-list", this.slotGroup);
			this.cancelPendingAdd(recentlyMetPlayersList);
			this.buildPlayerRow(MPFriendsModel.recentlyMetPlayersData, recentlyMetPlayersList, this.recentlyMetPlayerRowEngineInputListener, this.openPlayerActionsButtonListener, "LOC_UI_MP_FRIENDS_RECENT_LIST");
		}

		if ((this.updateFlags & MPRefreshDataFlags.UserProfiles) > 0) {
			const friendsList: HTMLElement = MustGetElement(".friends-list", this.slotGroup);
			this.cancelPendingUpdate(friendsList);
			this.updateUserProfiles(MPFriendsModel.friendsData, friendsList);

			const recentlyMetPlayersList: HTMLElement = MustGetElement(".recently-met-players-list", this.slotGroup);
			this.cancelPendingUpdate(recentlyMetPlayersList);
			this.updateUserProfiles(MPFriendsModel.recentlyMetPlayersData, recentlyMetPlayersList);

			const notificationsList: HTMLElement = MustGetElement(".notifications-list", this.slotGroup);
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

	private onSearchingStatusUpdate(isSearching: boolean) {
		if (isSearching) {
			const searchResultsList: HTMLElement = MustGetElement(".search-results-list", this.slotGroup);
			this.buildPlayerRow([], searchResultsList, this.searchResultsRowEngineInputListener, this.openPlayerActionsButtonListener, "LOC_UI_MP_FRIENDS_SEARCH_RESULTS_LIST");
			this.searchingCancelDialogBoxId = DialogManager.createDialog_Confirm({
				body: "",
				title: "LOC_UI_MP_FRIENDS_SEARCHING",
				displayHourGlass: true,
			});
		} else {
			DialogManager.closeDialogBox(this.searchingCancelDialogBoxId);
		}

	}

	private onUserInfoUpdated() {

		const twoKName = MustGetElement(".mp-friends-2k-name", this.Root);
		twoKName.setAttribute("data-l10n-id", Online.UserProfile.getMyDisplayName());
	}

	// fxs-tab-item is not created until postAttach so this is a delayed call
	private postAttachTabNotification() {
		MPFriendsModel.postAttachTabNotification(TabNameTypes.NotificationsTab);
	}

	private updateLobbyUserProfiles() {
		// error reminder, you need to be in multiplayer mode
		const gameConfig: ConfigurationGameAccessor = Configuration.getGame();
		let screenCheck = !(ContextManager.hasInstanceOf("main-menu"));
		let lobbyCheck = ContextManager.hasInstanceOf("screen-mp-lobby");
		if (!((screenCheck || lobbyCheck) && gameConfig.isInternetMultiplayer)) {
			return;
		}

		const numPlayers: number = gameConfig.humanPlayerCount;
		if (numPlayers <= 1) return; // 1 for local player

		const localPlatform: HostingType = Network.getLocalHostingPlatform();
		MPFriendsModel.searching(false);
		const playerData: MPFriendsPlayerData[] = [];
		for (const playerID of gameConfig.humanPlayerIDs) {

			const playerConfig: ConfigurationPlayerAccessor = Configuration.getPlayer(playerID);

			if (!playerConfig.isHuman ||
				(playerConfig.isParticipant && !playerConfig.isAlive) ||
				playerID == GameContext.localPlayerID) {
				continue;
			}

			const playerFirstPartyType: HostingType = Network.getPlayerHostingPlatform(playerID);

			// Only show first party names if we are on the same platform. 
			//We do this to avoid profanity filtering player names from other platforms.
			let playerFirstPartyName: string = "";
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
		const lobbyTabList: HTMLElement = MustGetElement(".lobby-list", this.slotGroup);
		this.updateUserProfiles(playerData, lobbyTabList);
	}

	private buildLobbyPlayerRow(appendRow: HTMLElement, playerRowEventListener: EventListener, actionButtonListener: EventListener, listName: string) {
		appendRow.innerHTML = "";

		// error reminder, you need to be in multiplayer mode
		const gameConfig: ConfigurationGameAccessor = Configuration.getGame();
		let screenCheck = !(ContextManager.hasInstanceOf("main-menu"));
		let lobbyCheck = ContextManager.hasInstanceOf("screen-mp-lobby");
		if (!((screenCheck || lobbyCheck) && gameConfig.isInternetMultiplayer)) {
			let displayText: string = "LOC_UI_MP_FRIENDS_LOBBY_MULTIPLYER_REMINDER";
			appendRow.innerHTML = `
				<fxs-vslot class="w-full h-full justify-center align-center">
					<div class="font-body font-normal text-base self-center">${Locale.stylize(displayText, listName)}</div>
				</fxs-vslot>
			`;

			return;
		}

		const localPlatform: HostingType = Network.getLocalHostingPlatform();
		const numPlayers: number = Configuration.getMap().maxMajorPlayers;
		let playerFound: boolean = false;
		MPFriendsModel.searching(false);
		for (let playerID: number = 0; playerID < numPlayers; playerID++) {

			if (Network.isPlayerConnected(playerID)) {
				const playerConfig: ConfigurationPlayerAccessor = Configuration.getPlayer(playerID);

				if (!playerConfig.isHuman ||
					(playerConfig.isParticipant && !playerConfig.isAlive) ||
					playerID == GameContext.localPlayerID) {
					continue;
				}

				playerFound = true;
				const friendItem: HTMLElement = document.createElement("progression-header");
				friendItem.setAttribute("player-card-style", "social");
				friendItem.addEventListener('engine-input', playerRowEventListener);
				friendItem.setAttribute('tabindex', "-1");

				let playerFirstPartyType: HostingType = Network.getPlayerHostingPlatform(playerID);

				// Only show first party names if we are on the same platform. 
				//We do this to avoid profanity filtering player names from other platforms.
				let playerFirstPartyName: string = "";
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
				let displayText: string = "LOC_UI_MP_FRIENDS_NO_RESULTS";

				appendRow.innerHTML = `
				<fxs-vslot class="w-full h-full justify-center align-center">
					<div class="font-body font-normal text-base self-center">${Locale.stylize(displayText, listName)}</div>
				</fxs-vslot>
			`;
			}
		}
	}

	private cancelAllPendingAddsAndUpdates() {
		for (const update of this.pendingUpdates.values()) {
			update.isCancelled = true;
		}

		for (const add of this.pendingAdds.values()) {
			add.isCancelled = true;
		}
	}

	private cancelPendingAdd(itemList: HTMLElement) {
		const cancelToken = this.pendingAdds.get(itemList);

		if (cancelToken) {
			cancelToken.isCancelled = true;
		}
	}

	private buildPlayerRow(playerData: MPFriendsPlayerData[], appendRow: HTMLElement, playerRowEventListener: EventListener, actionButtonListener: EventListener, listName: string, isChunkLoad = false) {
		if (!isChunkLoad) {
			appendRow.innerHTML = "";
		}

		if (playerData.length == 0) {
			let displayText: string = "LOC_UI_MP_FRIENDS_NO_RESULTS";
			if (MPFriendsModel.isSearching()) {
				displayText = "LOC_UI_MP_FRIENDS_SEARCHING";
			}

			appendRow.innerHTML = `
				<fxs-vslot class="w-full h-full justify-center align-center">
					<div class="font-body font-normal text-base self-center">${Locale.stylize(displayText, listName)}</div>
				</fxs-vslot>
			`;
		} else {
			const MAX_PER_ADD = 20;
			const numberToAdd = Math.min(playerData.length, MAX_PER_ADD);

			let showUserProfile = (playerRowEventListener != this.searchResultsRowEngineInputListener) && (playerRowEventListener != this.blockedPlayerRowEngineInputListener)

			const fragment = document.createDocumentFragment();

			MPFriendsModel.searching(false);
			for (let i: number = 0; i < numberToAdd; i++) {
				const friendItem: HTMLElement = document.createElement("progression-header");
				friendItem.setAttribute("player-card-style", "social");
				friendItem.addEventListener('engine-input', playerRowEventListener);
				friendItem.setAttribute('tabindex', "-1");
				friendItem.setAttribute("data-audio-group-ref", "audio-mp-friends");

				let userProfileId = playerData[i].friendIDT2gp;
				if (userProfileId == "") userProfileId = playerData[i].friendID1P;

				if (showUserProfile) friendItem.setAttribute('userProfileId', userProfileId);

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
					};
				}, MAX_PER_ADD);
				this.pendingAdds.set(appendRow, cancelToken);
			}
		}
	}

	private getUserProfileId(t2gpId: string, platformId: string) {
		if (t2gpId && t2gpId != "") return t2gpId;

		return platformId;
	}

	private updateFriendItem(playerData: MPFriendsPlayerData, friendItem: HTMLElement, userProfileId: string, showUserProfile: boolean) {
		const T2GPStatus = (playerData.platform == HostingType.HOSTING_TYPE_T2GP);
		let playerInfo: DNAUserCardInfo | null = null

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
		} else {
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

	private cancelPendingUpdate(itemList: HTMLElement) {
		const cancelToken = this.pendingUpdates.get(itemList);

		if (cancelToken) {
			cancelToken.isCancelled = true;
		}
	}

	private updateUserProfiles(playerData: MPFriendsPlayerData[], itemList: HTMLElement) {
		let itemCount = itemList.childElementCount;
		const MAX_PER_UPDATE = 10;

		if (playerData.length <= 0 || itemCount <= 0) return;

		const numberToUpdate = Math.min(playerData.length, MAX_PER_UPDATE);

		for (let i: number = 0; i < numberToUpdate; i++) {
			for (let k = 0; k < itemCount; k++) {
				let friendItem = itemList.children[k] as HTMLElement;
				if (friendItem) {
					let userProfileId = this.getUserProfileId(playerData[i].friendIDT2gp, playerData[i].friendID1P);

					let itemProfileId = friendItem.getAttribute("userProfileId");
					if (itemProfileId != userProfileId) continue;

					this.updateFriendItem(playerData[i], friendItem, userProfileId, true)

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
					this.updateUserProfiles(playerData, itemList)
				};
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

	private onEngineInput(inputEvent: InputEngineEvent) {
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

	private onClose() {
		this.cancelAllPendingAddsAndUpdates();
		this.close();
	}

	private navigateSearch() {
		if (ContextManager.hasInstanceOf("screen-mp-search") && this.currentTab != TabNames[TabNameTypes.SearchResutsTab]) {
			this.tabBar?.setAttribute("selected-tab-index", TabNameTypes.SearchResutsTab.toString());
		}
	}

	private onTabBarSelected(event: TabSelectedEvent) {
		event.stopPropagation();

		const { index } = event.detail;

		let tabName: string = "";
		let label: string = "";
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
			const gameConfig: ConfigurationGameAccessor = Configuration.getGame();
			const screenCheck: boolean = !(ContextManager.hasInstanceOf("main-menu"));
			const lobbyCheck: boolean = ContextManager.hasInstanceOf("screen-mp-lobby");
			if ((screenCheck || lobbyCheck) && gameConfig.isInternetMultiplayer) {
				this.tabBar?.setAttribute("selected-tab-index", TabNameTypes.LobbyTab.toString());
			} else {
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

	private getFriendID1PFromElement(target: HTMLElement | null): string | null {
		if (target == null) {
			console.error("mp-friends: getFriendID1PFromElement(): Invalid target. It should be an HTMLElement");
			return null;
		}

		const friendID: string | null = target.getAttribute("data-friend-id-1p");
		if (friendID == null) {
			console.error("mp-friends: getFriendID1PFromElement(): Invalid data-friend-id-1p attribute");
			return null;
		}

		return friendID;
	}

	private getFriendIDT2gpFromElement(target: HTMLElement | null): string | null {
		if (target == null) {
			console.error("mp-friends: getFriendIDT2gpFromElement(): Invalid target. It should be an HTMLElement");
			return null;
		}

		const friendID: string | null = target.getAttribute("data-friend-id-t2gp");
		if (friendID == null) {
			console.error("mp-friends: getFriendIDT2gpFromElement(): Invalid data-friend-id-t2gp attribute");
			return null;
		}

		return friendID;
	}

	private getDisplayName1PFromElement(target: HTMLElement | null): string | null {
		if (target == null) {
			console.error("mp-friends: getDisplayName1PFromElement(): Invalid target. It should be an HTMLElement");
			return null;
		}

		const displayName: string | null = target.getAttribute("player-name-1p");
		if (displayName == null) {
			console.error("mp-friends: getDisplayName1PFromElement(): Invalid player-name-1p attribute");
			return null;
		}

		return displayName;
	}

	private getDisplayNameT2gpFromElement(target: HTMLElement | null): string | null {
		if (target == null) {
			console.error("mp-friends: getDisplayNameT2gpFromElement(): Invalid target. It should be an HTMLElement");
			return null;
		}

		const displayName: string | null = target.getAttribute("player-name-t2gp");
		if (displayName == null) {
			console.error("mp-friends: getDisplayNameT2gpFromElement(): Invalid player-name-t2gp attribute");
			return null;
		}

		return displayName;
	}

	private onFriendRowEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.name == 'accept') {
			const playerRow = inputEvent.target as HTMLElement;
			const button: HTMLElement | null = playerRow.querySelector<HTMLElement>('fxs-button');
			this.invitePlayer(button);
		}
	}

	private onBlockedPlayerRowEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.name == 'accept') {
			const playerRow = inputEvent.target as HTMLElement;

			const button: HTMLElement | null = playerRow.querySelector<HTMLElement>('fxs-button');
			this.unblockPlayer(button);
		}
	}

	private onRecentlyMetPlayerRowEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.name == 'accept') {
			const playerRow = inputEvent.target as HTMLElement;

			const button: HTMLElement | null = playerRow.querySelector<HTMLElement>('fxs-button');
			this.addFriend(button);
		}
	}

	private onSearchResultsRowEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.name == 'accept') {
			const playerRow = inputEvent.target as HTMLElement;

			const button: HTMLElement | null = playerRow.querySelector<HTMLElement>('fxs-button');
			this.addFriend(button);
		}
	}

	private onLobbyRowEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.name == 'accept') {
			const playerRow = inputEvent.target as HTMLElement;

			const button: HTMLElement | null = playerRow.querySelector<HTMLElement>('fxs-button');
			this.addFriend(button);
		}
	}

	private onNotificationsRowEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.name == 'accept') {
			const playerRow = inputEvent.target as HTMLElement;

			const button: HTMLElement | null = playerRow.querySelector<HTMLElement>('fxs-button');
			this.addFriend(button);
		}
	}

	private getFriendIDFromElement(target: HTMLElement | null): string {
		if (target == null) {
			console.error("mp-friends: getFriendIdFromElement(): Invalid target. It should be an HTMLElement");
			return "";
		}

		return this.getFriendID1PFromElement(target) || this.getFriendIDT2gpFromElement(target) || "";
	}

	private getNameFromElement(target: HTMLElement | null): string {
		if (target == null) {
			console.error("mp-friends: getNameFromElement(): Invalid target. It should be an HTMLElement");
			return "";
		}

		return this.getDisplayName1PFromElement(target) || this.getDisplayNameT2gpFromElement(target) || "";
	}

	private invitePlayer(target: HTMLElement | null) {
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
		})
	}

	private unblockPlayer(target: HTMLElement | null) {
		if (target == null) {
			console.error("mp-friends: unblockPlayer(): Invalid target. It should be an HTMLElement");
			return;
		}

		// Unblock the player on the platform they are blocked on.
		// If blocked on both 1st party and T2gp, prioritize T2gp.

		const friendID1P: string | null = this.getFriendID1PFromElement(target);
		const friendIDT2gp: string | null = this.getFriendIDT2gpFromElement(target);

		let friendID: string = "";
		const platSpecific: boolean = true;
		if (friendIDT2gp && friendIDT2gp != "" && Online.Social.isUserBlocked(friendIDT2gp, platSpecific)) {
			friendID = friendIDT2gp;
		}
		else if (friendID1P && friendID1P != "" && Online.Social.isUserBlocked(friendID1P, platSpecific)) {
			friendID = friendID1P;
		}

		if (friendID != "") {
			MPFriendsModel.unblock(friendID);
		} else {
			console.error("mp-friends: unblockPlayer(): None valid Friend ID (1P or T2GP) so nothing happened");
		}

		const playerName = this.getNameFromElement(target);
		DialogManager.createDialog_Confirm({
			title: Locale.compose("LOC_UI_MP_FRIENDS_FEEDBACK_UNBLOCK_TITLE", playerName),
			body: Locale.compose("LOC_UI_MP_FRIENDS_FEEDBACK_UNBLOCK", playerName)
		})
	}

	private addFriend(target: HTMLElement | null) {
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
		})
	}

	private createSearchDialog() {
		ContextManager.push("screen-mp-search", { singleton: true, createMouseGuard: true, attributes: { blackOut: true } });
	}

	private onOpenSearch() {
		this.createSearchDialog();
	}

	private onOpenPlayerActions(event: Event) {
		if (!(event.target instanceof HTMLElement)) {
			return;
		}

		// check already friends
		const friendId1p: string | null = event.target.getAttribute('data-friend-id-1p');
		const friendIdT2gp: string | null = event.target.getAttribute('data-friend-id-T2gp');
		const playerIdT2gp: string | null = event.target.getAttribute('data-player-id-t2gp');

		const gamertag1p: string | null = event.target.getAttribute('player-name-1p');
		const gamertagT2gp: string | null = event.target.getAttribute('player-name-t2gp');
		const playerIdLobby: string | null = event.target.getAttribute('data-player-id-lobby');

		const platform: string | null = event.target.getAttribute('player-platform');
		const gameInvite: string | null = event.target.getAttribute('player-game-invite');

		if (this.currentTab == "search-results-list-tab") {
			if ((friendId1p && Online.Social.isUserFriendOnPlatform(friendId1p, FriendListTypes.Immediate)) || (friendIdT2gp && (Online.Social.isUserFriendOnPlatform(friendIdT2gp, FriendListTypes.Immediate) || Online.Social.isUserFriendOnPlatform(friendIdT2gp, FriendListTypes.Hidden)))) {
				let message: string = "";
				if (gamertag1p) {
					message = Locale.compose("LOC_UI_ALREADY_FRIEND", gamertag1p);
				} else if (gamertagT2gp) {
					message = Locale.compose("LOC_UI_ALREADY_FRIEND", gamertagT2gp);
				} else {
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

		const data: FriendOptionsData = { friendId1p: friendId1p, friendIdT2gp: friendIdT2gp, gamertag1p: gamertag1p, gamertagT2gp: gamertagT2gp, currentTab: this.currentTab, playerIdLobby: playerIdLobby, platform: platform, isGameInvite: gameInvite }
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
