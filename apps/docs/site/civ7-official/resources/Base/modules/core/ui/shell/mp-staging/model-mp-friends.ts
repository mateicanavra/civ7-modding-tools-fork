/**
 * @file model-mp-friends.ts		
 * @copyright 2023-2025, Firaxis Games
 * @description Handles all of the data for the Multiplayer Friends and Blocked Players lists.  
 */

import SocialNotificationsManager, { SocialNotificationIndicatorType } from '/core/ui/social-notifications/social-notifications-manager.js'
import { Layout } from "/core/ui/utilities/utilities-layout.js";

type isSearchingChangeCallback = (isSearching: boolean) => void;

enum MPFriendsPlayerStatus {
	// MMG_TODO to find better names
	// MMG_TASK https://2kfxs.atlassian.net/browse/IGP-59728 [model-mp-friends] Better names for MPFriendsPlayerStatus and find a final name for the status art and cook the texture file
	GREEN,
	ORANGE,
	RED
}

export enum MPRefreshDataFlags {
	None = 0,
	Friends = 1 << 0,
	RecentlyMet = 1 << 1,
	SearchResult = 1 << 2,
	Notifications = 1 << 3,
	UserProfiles = 1 << 4,
	Blocked = 1 << 5,

	All = ~(~0 << 6)
}

enum MPFriendsActionState {
	TO_INVITE,
	INVITED,
	TO_UNBLOCK,
	ADD_FRIEND,
	NOTIFY_RECEIVE,
	NOTIFY_SENT,
	NOTIFY_JOIN_RECEIVE,
	NOTIFY_JOIN_SENT,
}

export class MPFriendsPlayerData {
	// Friend or Blocked player
	/* MMG_TODO To merge the T2GP status icon and status details with their matching 1P (but to keep the two IDs and names).
	For now we display both sets of name, status icon and status details. Each set is optional.
	Both names are displayed the same way for now. We may have a distinct visual according to the type
	(ie. as Lee Chidgey mentioned, in Lego 2K Drive, the 1P has a platform icon and is displayed in black,
	while the 2K has the 2K icon and is displayed in red) */
	// MMG_TASK https://2kfxs.atlassian.net/browse/IGP-59386 [model-mp-friends] Merge the T2GP status icon and status details with their matching 1P

	friendID1P = "";
	gamertag1P = "";
	statusIcon1P = "";
	statusDetails1P = "";

	friendIDT2gp = "";
	gamertagT2gp = "";
	statusIconT2gp = "";
	statusDetailsT2gp = "";

	isGameInvite = false;

	actionButtonLabel = "";
	disabledActionButton = false;
	isFilteredOut = false;
	platform = HostingType.HOSTING_TYPE_UNKNOWN;
	dateLastSeen = "";
	leaderId = "";
}

class MPFriendsDataModel {
	private static instance: MPFriendsDataModel;
	private onUpdate?: (model: MPFriendsDataModel) => void;

	private _friendsData: MPFriendsPlayerData[] = [];
	private _blockedPlayersData: MPFriendsPlayerData[] = [];
	private _recentlyMetPlayersData: MPFriendsPlayerData[] = [];
	private _searchResultsData: MPFriendsPlayerData[] = [];
	private _notificationsData: MPFriendsPlayerData[] = [];
	private _playerFilter: string = "";
	private _hasSearched = false;
	private _isSearching = false;
	private _eventNotificationUpdate: LiteEvent<void> = new LiteEvent<void>();
	private isSearchingChangeCallbacks: isSearchingChangeCallback[] = [];
	private _dataUpdated: MPRefreshDataFlags = 0;

	/**
	 * Singleton accessor 
	 */
	static getInstance() {
		if (!MPFriendsDataModel.instance) {
			MPFriendsDataModel.instance = new MPFriendsDataModel();
		}
		return MPFriendsDataModel.instance;
	}

	set updateCallback(callback: (model: MPFriendsDataModel) => void) {
		this.onUpdate = callback;
	}

	get eventNotificationUpdate() {
		return this._eventNotificationUpdate.expose();
	}

	get friendsData(): MPFriendsPlayerData[] {
		return this._friendsData;
	}

	get blockedPlayersData(): MPFriendsPlayerData[] {
		return this._blockedPlayersData;
	}

	get recentlyMetPlayersData(): MPFriendsPlayerData[] {
		return this._recentlyMetPlayersData;
	}

	get searchResultsData(): MPFriendsPlayerData[] {
		return this._searchResultsData;
	}

	get notificationsData(): MPFriendsPlayerData[] {
		return this._notificationsData;
	}

	set playerFilter(value: string) {
		this._playerFilter = value;
		this.update();
	}

	public hasSearched(): boolean {
		return this._hasSearched;
	}

	public searched(value: boolean) {
		this._hasSearched = value;
	}

	public searching(value: boolean) {
		this._isSearching = value;
		this.notifyIsSearchingChange();
	}

	public getUpdatedDataFlag() {
		return this._dataUpdated;
	}

	public isSearching(): boolean {
		return this._isSearching;
	}

	public onIsSearchingChange(callback: isSearchingChangeCallback): void {
		this.isSearchingChangeCallbacks.push(callback);
	}

	public offIsSearchingChange(callback: isSearchingChangeCallback): void {
		const index = this.isSearchingChangeCallbacks.findIndex(e => e == callback);

		if (index >= 0) {
			this.isSearchingChangeCallbacks.splice(index, 1);
		}
	}

	private notifyIsSearchingChange(): void {
		this.isSearchingChangeCallbacks.forEach(callback => callback(this._isSearching));
	}

	private constructor() {
		engine.whenReady.then(() => {
			this.setupListeners();
			this.update();
		});
	}

	private setupListeners() {
		engine.on("FriendListUpdated", this.updateFriends, this);
		engine.on("RecentlyMetPlayerListUpdated", this.updateRecentlyMet, this);
		engine.on("NotificationListUpdated", this.updateNotifications, this);
		engine.on("FriendSearchResultsUpdated", this.updateSearchResult, this);
		engine.on("UserProfilesUpdated", this.updateUserProfiles, this);
		engine.on("BlockedListUpdated", this.updateBlocked, this);
	}

	private updateFriends() {
		this.update(MPRefreshDataFlags.Friends);
	}

	private updateRecentlyMet() {
		this.update(MPRefreshDataFlags.RecentlyMet);
	}

	private updateNotifications() {
		this.update(MPRefreshDataFlags.Notifications);
	}

	private updateSearchResult() {
		this.update(MPRefreshDataFlags.SearchResult);
	}

	private updateUserProfiles() {
		this.update(MPRefreshDataFlags.UserProfiles);
	}

	private updateBlocked() {
		this.update(MPRefreshDataFlags.Blocked);
	}

	public updateAll() {
		this.update();
	}

	private update(dataToRefresh: MPRefreshDataFlags = MPRefreshDataFlags.All) {
		if (Network.unitTestModeEnabled) {
			this.pushDummyData();
		} else {
			if ((dataToRefresh & MPRefreshDataFlags.Friends) > 0) {
				// --- Friends ---

				this._friendsData = [];

				const friendsNum: number = Online.Social.getFriendCount(FriendListTypes.Immediate);
				for (let i: number = 0; i < friendsNum; ++i) {
					const friendInfo: FriendInfo | null = Online.Social.getFriendInfoByIndex(i, FriendListTypes.Immediate);
					if (!friendInfo) {
						console.error("model-mp-friends: update(): Invalid friendInfo for index " + i);
						continue;
					}

					if (friendInfo.is1PBlocked) {
						continue;
					}

					let playerStatus1P: MPFriendsPlayerStatus = MPFriendsPlayerStatus.RED;
					let statusIcon1P: string = "";
					let statusDetails1P: string = "";
					if (friendInfo.friendID1P != "") {
						// MMG_TODO Mapping to confirm
						// MMG_TASK https://2kfxs.atlassian.net/browse/IGP-59414 [model-mp-friends] Mapping to Other states Invited, Offline, Away, Snooze, Date of Block
						switch (friendInfo.state1P) {
							case FriendStateTypes.Online:
								playerStatus1P = MPFriendsPlayerStatus.GREEN;
								break;

							case FriendStateTypes.Busy:
								playerStatus1P = MPFriendsPlayerStatus.ORANGE;
								break;

							// MMG_TODO Other states being: .Offline / .Away / .Snooze / .LookngToTrade / .LookingToPlay
							// MMG_TASK https://2kfxs.atlassian.net/browse/IGP-59414 [model-mp-friends] Mapping to Other states Invited, Offline, Away, Snooze, Date of Block
							default:
								break;
						}

						statusIcon1P = this.getStatusIconPath(playerStatus1P);
						statusDetails1P = Online.Social.getRichPresence(friendInfo.friendID1P, "civPresence");
					}

					let playerStatusT2gp: MPFriendsPlayerStatus = MPFriendsPlayerStatus.RED;
					let statusIconT2gp: string = "";
					let statusDetailsT2gp: string = "";
					if (friendInfo.friendIDT2gp != "") {
						// MMG_TODO Mapping to confirm
						switch (friendInfo.stateT2gp) {
							case FriendStateTypes.Offline:
								playerStatusT2gp = MPFriendsPlayerStatus.RED;
								break;

							// MMG_TODO Other states being: .Online / .Busy / .Away / .Snooze / .LookngToTrade / .LookingToPlay
							// MMG_TASK https://2kfxs.atlassian.net/browse/IGP-59414 [model-mp-friends] Mapping to Other states Invited, Offline, Away, Snooze, Date of Block
							default:
								playerStatusT2gp = MPFriendsPlayerStatus.GREEN;
								break;
						}

						statusIconT2gp = this.getStatusIconPath(playerStatusT2gp);
						statusDetailsT2gp = Online.Social.getRichPresence(friendInfo.friendIDT2gp, "civPresence");
					}

					const actionState: MPFriendsActionState = MPFriendsActionState.TO_INVITE; // MMG_TODO To find a way to set it to .INVITED when already requested (to disable the Action button)
					// MMG_TASK https://2kfxs.atlassian.net/browse/IGP-59414 [model-mp-friends] Mapping to Other states Invited, Offline, Away, Snooze, Date of Block

					const friendData = new MPFriendsPlayerData();
					friendData.friendID1P = friendInfo.friendID1P;
					friendData.gamertag1P = friendInfo.playerName1P;
					friendData.statusIcon1P = statusIcon1P;
					friendData.statusDetails1P = statusDetails1P;

					friendData.friendIDT2gp = friendInfo.friendIDT2gp;
					friendData.gamertagT2gp = friendInfo.playerNameT2gp;
					friendData.statusIconT2gp = statusIconT2gp;
					friendData.statusDetailsT2gp = statusDetailsT2gp;

					friendData.actionButtonLabel = this.getActionStateButtonLabel(actionState);
					friendData.disabledActionButton = this.isActionButtonDisabled(actionState);
					friendData.isFilteredOut = this.filterOut(friendInfo.playerName1P);
					friendData.platform = friendInfo.platform;

					this._friendsData.push(friendData);
				}
			}

			if ((dataToRefresh & MPRefreshDataFlags.Blocked) > 0) {
				// --- Blocked players ---

				this._blockedPlayersData = [];

				const blockedPlayersNum: number = Online.Social.getFriendCount(FriendListTypes.Blocked);
				for (let i: number = 0; i < blockedPlayersNum; ++i) {
					const blockedPlayerInfo: FriendInfo | null = Online.Social.getFriendInfoByIndex(i, FriendListTypes.Blocked);
					if (!blockedPlayerInfo) {
						console.error("model-mp-friends: update(): Invalid blockedPlayerInfo for index " + i);
						continue;
					}

					if (blockedPlayerInfo.is1PBlocked) {
						continue;
					}

					let playerStatus1P: MPFriendsPlayerStatus = MPFriendsPlayerStatus.RED;
					let statusIcon1P: string = "";
					let statusDetails1P: string = "";
					if (blockedPlayerInfo.friendID1P != "") {
						// MMG_TODO Mapping to confirm
						// MMG_TASK https://2kfxs.atlassian.net/browse/IGP-59414 [model-mp-friends] Mapping to Other states Invited, Offline, Away, Snooze, Date of Block
						playerStatus1P = blockedPlayerInfo.state1P == FriendStateTypes.Offline
							? MPFriendsPlayerStatus.RED
							: MPFriendsPlayerStatus.GREEN;

						statusIcon1P = this.getStatusIconPath(playerStatus1P);
						statusDetails1P = ""; // MMG_TODO To get the date since when the player is blocked
						// MMG_TASK https://2kfxs.atlassian.net/browse/IGP-59414 [model-mp-friends] Mapping to Other states Invited, Offline, Away, Snooze, Date of Block
					}

					let playerStatusT2gp: MPFriendsPlayerStatus = MPFriendsPlayerStatus.RED;
					let statusIconT2gp: string = "";
					let statusDetailsT2gp: string = "";
					if (blockedPlayerInfo.friendID1P != "") {
						// MMG_TODO Mapping to confirm
						// MMG_TASK https://2kfxs.atlassian.net/browse/IGP-59414 [model-mp-friends] Mapping to Other states Invited, Offline, Away, Snooze, Date of Block

						playerStatusT2gp = blockedPlayerInfo.stateT2gp == FriendStateTypes.Offline
							? MPFriendsPlayerStatus.RED
							: MPFriendsPlayerStatus.GREEN;

						statusIconT2gp = this.getStatusIconPath(playerStatusT2gp);
						statusDetailsT2gp = ""; // MMG_TODO To get the date since when the player is blocked;
						// MMG_TASK https://2kfxs.atlassian.net/browse/IGP-59414 [model-mp-friends] Mapping to Other states Invited, Offline, Away, Snooze, Date of Block
					}

					const actionState: MPFriendsActionState = MPFriendsActionState.TO_UNBLOCK;

					const blockedPlayerData = new MPFriendsPlayerData();
					blockedPlayerData.friendID1P = blockedPlayerInfo.friendID1P;
					blockedPlayerData.gamertag1P = blockedPlayerInfo.playerName1P;
					blockedPlayerData.statusIcon1P = statusIcon1P;
					blockedPlayerData.statusDetails1P = statusDetails1P;

					blockedPlayerData.friendIDT2gp = blockedPlayerInfo.friendIDT2gp;
					blockedPlayerData.gamertagT2gp = blockedPlayerInfo.playerNameT2gp;
					blockedPlayerData.statusIconT2gp = statusIconT2gp;
					blockedPlayerData.statusDetailsT2gp = statusDetailsT2gp;


					blockedPlayerData.actionButtonLabel = this.getActionStateButtonLabel(actionState);
					blockedPlayerData.disabledActionButton = this.isActionButtonDisabled(actionState);
					blockedPlayerData.platform = blockedPlayerInfo.platform;

					this.blockedPlayersData.push(blockedPlayerData);
				}
			}

			if ((dataToRefresh & MPRefreshDataFlags.RecentlyMet) > 0) {
				this._recentlyMetPlayersData = [];

				// --- Recent players ---

				const recentlyMetPlayers: FriendInfo[] = Online.Social.getRecentlyMetPlayers();
				for (let i: number = 0; i < recentlyMetPlayers.length; ++i) {
					const recentlyMetPlayer = recentlyMetPlayers[i];

					if (recentlyMetPlayer.is1PBlocked) {
						continue;
					}

					const actionState: MPFriendsActionState = MPFriendsActionState.ADD_FRIEND;

					// its only T2GP players
					const recentlyMetPlayerData = new MPFriendsPlayerData();
					recentlyMetPlayerData.friendID1P = recentlyMetPlayer.friendID1P;
					recentlyMetPlayerData.gamertag1P = recentlyMetPlayer.playerName1P;
					recentlyMetPlayerData.friendIDT2gp = recentlyMetPlayer.friendIDT2gp;
					recentlyMetPlayerData.gamertagT2gp = recentlyMetPlayer.playerNameT2gp;
					recentlyMetPlayerData.actionButtonLabel = this.getActionStateButtonLabel(actionState);
					recentlyMetPlayerData.platform = recentlyMetPlayer.platform;

					this.recentlyMetPlayersData.push(recentlyMetPlayerData);
				}
			}

			if ((dataToRefresh & MPRefreshDataFlags.SearchResult) > 0) {
				// --- Search Results ---

				this._searchResultsData = [];
				const searchResults: FriendInfo[] = Online.Social.getFriendSearchResults();
				for (let i: number = 0; i < Math.min(searchResults.length, Online.Social.getMaxFriendSearchResults()); ++i) {
					const searchResult = searchResults[i];

					if (searchResult.is1PBlocked) {
						continue;
					}

					const actionState: MPFriendsActionState = MPFriendsActionState.ADD_FRIEND;

					// its only T2GP players
					const searchResultData = new MPFriendsPlayerData();
					searchResultData.friendIDT2gp = searchResult.friendIDT2gp;
					searchResultData.gamertagT2gp = searchResult.playerNameT2gp;
					searchResultData.actionButtonLabel = this.getActionStateButtonLabel(actionState);
					searchResultData.platform = searchResult.platform;

					this.searchResultsData.push(searchResultData);
				}
			}

			if ((dataToRefresh & MPRefreshDataFlags.Notifications) > 0) {
				// --- Notifications ---

				this._notificationsData = [];
				const notificationJoins: FriendInfo[] = Online.Social.getNotificationJoins();

				let i: number;
				let maxNotifications: number = Online.Social.getMaxNotifications();
				for (i = 0; i < Math.min(notificationJoins.length, maxNotifications); ++i) {
					const notificationJoin = notificationJoins[i];

					if (notificationJoin.is1PBlocked) {
						continue;
					}

					const actionState: MPFriendsActionState = MPFriendsActionState.NOTIFY_JOIN_RECEIVE;

					// its only T2GP players
					const notificationJoinData = new MPFriendsPlayerData();
					notificationJoinData.friendID1P = notificationJoin.friendID1P;
					notificationJoinData.gamertag1P = notificationJoin.playerName1P;

					notificationJoinData.friendIDT2gp = notificationJoin.friendIDT2gp;
					notificationJoinData.gamertagT2gp = notificationJoin.playerNameT2gp;

					notificationJoinData.statusDetailsT2gp = Locale.compose("LOC_SOCIAL_NOTIFICATION_GAME_INVITE_RECEIVED");

					notificationJoinData.isGameInvite = true;

					notificationJoinData.actionButtonLabel = this.getActionStateButtonLabel(actionState);
					notificationJoinData.platform = HostingType.HOSTING_TYPE_T2GP;

					this.notificationsData.push(notificationJoinData);
				}
				maxNotifications -= i;

				const notifications: FriendInfo[] = Online.Social.getNotifications();
				for (i = 0; i < Math.min(notifications.length, maxNotifications); ++i) {
					const notification = notifications[i];

					if (notification.is1PBlocked) {
						continue;
					}

					const actionState: MPFriendsActionState = notification.invitee ? MPFriendsActionState.NOTIFY_RECEIVE : MPFriendsActionState.NOTIFY_SENT;

					// its only T2GP players
					const notificationData = new MPFriendsPlayerData();
					notificationData.friendID1P = notification.friendID1P;
					notificationData.gamertag1P = notification.playerName1P;

					notificationData.friendIDT2gp = notification.friendIDT2gp;
					notificationData.gamertagT2gp = notification.playerNameT2gp;

					notificationData.statusDetailsT2gp = notification.invitee ? Locale.compose("LOC_SOCIAL_NOTIFICATION_FRIEND_INVITE_RECEIVED") : Locale.compose("LOC_SOCIAL_NOTIFICATION_FRIEND_INVITE_SENT");

					notificationData.actionButtonLabel = this.getActionStateButtonLabel(actionState);

					notificationData.platform = notification.platform;

					this.notificationsData.push(notificationData);
				}
			}
		}

		this._dataUpdated = dataToRefresh;

		if (this.onUpdate) {
			this.onUpdate(this);
		}

		this._eventNotificationUpdate.trigger();

		// clear the data after finishing the trigger
		this._dataUpdated = MPRefreshDataFlags.None;
	}

	private getStatusIconPath(status: MPFriendsPlayerStatus): string {
		let statusIconPath: string = "";

		switch (status) {
			case MPFriendsPlayerStatus.GREEN: statusIconPath = "fs://game/core/mpicon_playerstatus_green.png"; break; // MMG_TODO To find a final name and cook the texture file
			case MPFriendsPlayerStatus.ORANGE: statusIconPath = "fs://game/core/mpicon_playerstatus_orange.png"; break; // MMG_TODO To find a final name and cook the texture file
			case MPFriendsPlayerStatus.RED: statusIconPath = "fs://game/core/mpicon_playerstatus_red.png"; break; // MMG_TODO To find a final name and cook the texture file
			// MMG_TASK https://2kfxs.atlassian.net/browse/IGP-59728 [model-mp-friends] Better names for MPFriendsPlayerStatus and find a final name for the status art and cook the texture file
			default:
				console.error("model-mp-friends: getStatusIconPath(): Invalid status");
				break;
		}

		return statusIconPath;
	}

	private getActionStateButtonLabel(actionState: MPFriendsActionState): string {
		let actionButtonLabel: string = "";

		switch (actionState) {
			case MPFriendsActionState.TO_INVITE: actionButtonLabel = "LOC_UI_MP_FRIENDS_ACTION_INVITE"; break;
			case MPFriendsActionState.INVITED: actionButtonLabel = "LOC_UI_MP_FRIENDS_ACTION_INVITED"; break;
			case MPFriendsActionState.TO_UNBLOCK: actionButtonLabel = "LOC_UI_MP_FRIENDS_ACTION_UNBLOCK"; break;
			case MPFriendsActionState.ADD_FRIEND: actionButtonLabel = "LOC_UI_MP_FRIENDS_ACTION_ADD_FRIEND"; break;
			case MPFriendsActionState.NOTIFY_RECEIVE: actionButtonLabel = "LOC_UI_MP_FRIENDS_ACTION_NOTIFICATIONS_RECEIVED"; break;
			case MPFriendsActionState.NOTIFY_SENT: actionButtonLabel = "LOC_UI_MP_FRIENDS_ACTION_NOTIFICATIONS_SENT"; break;
			default:
				console.error("model-mp-friends: getActionButtonLabel(): Invalid action state");
				break;
		}

		return actionButtonLabel;
	}

	private isActionButtonDisabled(actionState: MPFriendsActionState): boolean {
		return (actionState == MPFriendsActionState.ADD_FRIEND);
	}

	invite(friendID: string, _friendData: MPFriendsPlayerData) {
		Online.Social.inviteFriendToGame(friendID);

		if (this.onUpdate) {
			this.onUpdate(this);
		}
	}

	unblock(friendID: string) {
		Online.Social.unblockUser(friendID);
	}

	addFriend(friendID: string, _friendData: MPFriendsPlayerData) {
		Online.Social.sendFriendRequest(friendID);

		if (this.onUpdate) {
			this.onUpdate(this);
		}
	}

	getFriendDataFromID(friendID?: string): MPFriendsPlayerData | undefined {
		if (friendID == null || friendID == "") {
			return;
		}

		const friendData = MPFriendsModel.friendsData.find(x => x.friendID1P == friendID || x.friendIDT2gp == friendID);
		return friendData;
	}

	getRecentlyMetPlayerdDataFromID(friendID?: string): MPFriendsPlayerData | undefined {
		if (friendID == null || friendID == "") {
			return;
		}

		const friendData = MPFriendsModel.recentlyMetPlayersData.find(x => x.friendID1P == friendID || x.friendIDT2gp == friendID);
		return friendData;
	}

	refreshFriendList() {
		Online.Social.refreshFriendList();
	}

	private pushDummyData() {
		// --- Friends ---

		// Display all friends
		this._playerFilter = "";

		// Display no friends
		//this._playerFilter = "qwertyuiopasdfghjkl";

		// Display only Red Viper
		//this._playerFilter = "Red";

		// Display the WWWW players
		//this._playerFilter = "WWWW";

		let gamerTag = "9Tiger9";
		const dummyFriendData0 = new MPFriendsPlayerData();
		dummyFriendData0.friendID1P = "0";
		dummyFriendData0.gamertag1P = gamerTag + " Native";
		dummyFriendData0.statusIcon1P = this.getStatusIconPath(MPFriendsPlayerStatus.GREEN);
		dummyFriendData0.statusDetails1P = "Main Menu";
		dummyFriendData0.friendIDT2gp = "99";
		dummyFriendData0.gamertagT2gp = gamerTag + " T2GP";
		dummyFriendData0.statusIconT2gp = this.getStatusIconPath(MPFriendsPlayerStatus.RED);
		dummyFriendData0.actionButtonLabel = this.getActionStateButtonLabel(MPFriendsActionState.INVITED);
		dummyFriendData0.disabledActionButton = this.isActionButtonDisabled(MPFriendsActionState.INVITED);
		dummyFriendData0.isFilteredOut = this.filterOut(gamerTag + " Native");

		this._friendsData.push(dummyFriendData0);

		gamerTag = "RedViper";
		const dummyFriendData1 = new MPFriendsPlayerData();
		dummyFriendData1.friendID1P = "1";
		dummyFriendData1.gamertag1P = gamerTag + " Native";
		dummyFriendData1.statusIcon1P = this.getStatusIconPath(MPFriendsPlayerStatus.GREEN);
		dummyFriendData1.statusDetails1P = "Settings";
		dummyFriendData1.actionButtonLabel = this.getActionStateButtonLabel(MPFriendsActionState.TO_INVITE);
		dummyFriendData1.disabledActionButton = this.isActionButtonDisabled(MPFriendsActionState.TO_INVITE);
		dummyFriendData1.isFilteredOut = this.filterOut(gamerTag + " Native");

		this._friendsData.push(dummyFriendData1);

		gamerTag = "Nesprespro";
		const dummyFriendData2 = new MPFriendsPlayerData();
		dummyFriendData2.friendIDT2gp = "2";
		dummyFriendData2.gamertagT2gp = gamerTag + " T2GP";
		dummyFriendData2.statusIconT2gp = this.getStatusIconPath(MPFriendsPlayerStatus.GREEN);
		dummyFriendData2.statusDetailsT2gp = "Single Player";
		dummyFriendData2.actionButtonLabel = this.getActionStateButtonLabel(MPFriendsActionState.TO_INVITE);
		dummyFriendData2.disabledActionButton = this.isActionButtonDisabled(MPFriendsActionState.TO_INVITE);
		dummyFriendData2.isFilteredOut = this.filterOut("");

		this._friendsData.push(dummyFriendData2);

		gamerTag = "BarrelGerald";
		const dummyFriendData3 = new MPFriendsPlayerData();
		dummyFriendData3.friendID1P = "3";
		dummyFriendData3.gamertag1P = gamerTag;
		dummyFriendData3.statusIcon1P = this.getStatusIconPath(MPFriendsPlayerStatus.ORANGE);
		dummyFriendData3.statusDetails1P = "Paused";
		dummyFriendData3.actionButtonLabel = this.getActionStateButtonLabel(MPFriendsActionState.TO_INVITE);
		dummyFriendData3.disabledActionButton = this.isActionButtonDisabled(MPFriendsActionState.TO_INVITE);
		dummyFriendData3.isFilteredOut = this.filterOut(gamerTag);

		this._friendsData.push(dummyFriendData3);

		gamerTag = "Bu_Bbles";
		const dummyFriendData4 = new MPFriendsPlayerData();
		dummyFriendData4.friendID1P = "4";
		dummyFriendData4.gamertag1P = gamerTag;
		dummyFriendData4.statusIcon1P = this.getStatusIconPath(MPFriendsPlayerStatus.RED);
		dummyFriendData4.statusDetails1P = "Away";
		dummyFriendData4.actionButtonLabel = this.getActionStateButtonLabel(MPFriendsActionState.TO_INVITE);
		dummyFriendData4.disabledActionButton = this.isActionButtonDisabled(MPFriendsActionState.TO_INVITE);
		dummyFriendData4.isFilteredOut = this.filterOut(gamerTag);

		this._friendsData.push(dummyFriendData4);

		gamerTag = "WWWWWWWWWWWWWWWW";
		for (let i = 0; i < 7; ++i) { // max to adapt to test the scrolling

			const dummyFriendData = new MPFriendsPlayerData();
			dummyFriendData.friendID1P = (5 + i).toString();
			dummyFriendData.gamertag1P = gamerTag;
			dummyFriendData.statusIcon1P = this.getStatusIconPath(MPFriendsPlayerStatus.RED);
			dummyFriendData.statusDetails1P = "Away";
			dummyFriendData.actionButtonLabel = this.getActionStateButtonLabel(MPFriendsActionState.TO_INVITE);
			dummyFriendData.disabledActionButton = this.isActionButtonDisabled(MPFriendsActionState.TO_INVITE);
			dummyFriendData.isFilteredOut = this.filterOut(gamerTag);

			this._friendsData.push(dummyFriendData);
		}

		// --- Blocked players ---

		gamerTag = "Pwr_Ju1c3";
		const dummyBlockedData0 = new MPFriendsPlayerData();
		dummyBlockedData0.friendID1P = "8";
		dummyBlockedData0.gamertag1P = gamerTag;
		dummyBlockedData0.statusIcon1P = this.getStatusIconPath(MPFriendsPlayerStatus.RED);
		dummyBlockedData0.statusDetails1P = "Blocked 01/05/2023";
		dummyBlockedData0.actionButtonLabel = this.getActionStateButtonLabel(MPFriendsActionState.TO_UNBLOCK);
		dummyBlockedData0.disabledActionButton = this.isActionButtonDisabled(MPFriendsActionState.TO_UNBLOCK);
		dummyBlockedData0.isFilteredOut = this.filterOut(gamerTag);

		this._blockedPlayersData.push(dummyBlockedData0);

		gamerTag = "Xx_456-xX";
		const dummyBlockedData1 = new MPFriendsPlayerData();
		dummyBlockedData1.friendID1P = "9";
		dummyBlockedData1.gamertag1P = gamerTag;
		dummyBlockedData1.statusIcon1P = this.getStatusIconPath(MPFriendsPlayerStatus.RED);
		dummyBlockedData1.statusDetails1P = "Blocked 11/08/2021";
		dummyBlockedData1.actionButtonLabel = this.getActionStateButtonLabel(MPFriendsActionState.TO_UNBLOCK);
		dummyBlockedData1.disabledActionButton = this.isActionButtonDisabled(MPFriendsActionState.TO_UNBLOCK);
		dummyBlockedData1.isFilteredOut = this.filterOut(gamerTag);

		this._blockedPlayersData.push(dummyBlockedData1);

		gamerTag = "HarleyD";
		const dummyBlockedData2 = new MPFriendsPlayerData();
		dummyBlockedData2.friendID1P = "10";
		dummyBlockedData2.gamertag1P = gamerTag;
		dummyBlockedData2.statusIcon1P = this.getStatusIconPath(MPFriendsPlayerStatus.RED);
		dummyBlockedData2.statusDetails1P = "Blocked 12/06/2020";
		dummyBlockedData2.actionButtonLabel = this.getActionStateButtonLabel(MPFriendsActionState.TO_UNBLOCK);
		dummyBlockedData2.disabledActionButton = this.isActionButtonDisabled(MPFriendsActionState.TO_UNBLOCK);
		dummyBlockedData2.isFilteredOut = this.filterOut(gamerTag);

		this._blockedPlayersData.push(dummyBlockedData2);

		gamerTag = "Recent 1";
		const dummyRecentData0 = new MPFriendsPlayerData();
		dummyRecentData0.friendIDT2gp = "100";
		dummyRecentData0.gamertagT2gp = gamerTag;
		dummyRecentData0.actionButtonLabel = this.getActionStateButtonLabel(MPFriendsActionState.ADD_FRIEND);

		this._recentlyMetPlayersData.push(dummyRecentData0);

		gamerTag = "Recent 2";
		const dummyRecentData1 = new MPFriendsPlayerData();
		dummyRecentData1.friendIDT2gp = "100";
		dummyRecentData1.gamertagT2gp = gamerTag;
		dummyRecentData1.actionButtonLabel = this.getActionStateButtonLabel(MPFriendsActionState.ADD_FRIEND);

		this._recentlyMetPlayersData.push(dummyRecentData1);
	}

	private filterOut(gamerTag1P: string): boolean {
		// MMG_TODO To handle the 1P versus T2gp cases (for now it is only working on 1P gamertags)
		// MMG_TASK https://2kfxs.atlassian.net/browse/IGP-59415 [model-mp-friends] Handle the 1P versus T2GP cases 
		return !gamerTag1P.includes(this._playerFilter);
	}

	postAttachTabNotification(notificationTabIndex: number) {

		const notificationBadge = document.createElement('div');

		notificationBadge.classList.add('notification-badge', 'relative', 'justify-center', 'items-center', 'flex', 'flex-col', 'bg-center', 'w-10', 'h-10', 'bg-center');
		notificationBadge.style.backgroundSize = Layout.pixels(35) + ' ' + Layout.pixels(35) + ', 100% 100%';

		//MMGTODO: add the multiplayer lobby check to adjust the badge size
		// const gameConfig: ConfigurationGameAccessor = Configuration.getGame();
		// let screenCheck = !(ContextManager.hasInstanceOf("main-menu"));
		// let lobbyCheck = ContextManager.hasInstanceOf("screen-mp-lobby");
		// if (!((screenCheck || lobbyCheck) && gameConfig.isInternetMultiplayer)) {
		// notificationBadge.style.right = '10px';
		// }

		notificationBadge.style.top = Layout.pixels(-10);
		notificationBadge.style.right = Layout.pixels(25);
		notificationBadge.style.transform = 'scale(0.7)';

		const notificationTabItem = (document.getElementsByTagName("fxs-tab-item")[notificationTabIndex] as HTMLElement);
		if (notificationTabItem) {
			notificationTabItem.appendChild(notificationBadge);
		}
		SocialNotificationsManager.setNotificationItem(SocialNotificationIndicatorType.SOCIALTAB_BADGE, notificationBadge);
		SocialNotificationsManager.setTabNotificationVisibilityBasedOnReminder();
	}
}

const MPFriendsModel: MPFriendsDataModel = MPFriendsDataModel.getInstance();

engine.whenReady.then(() => {
	const updateModel = () => {
		engine.updateWholeModel(MPFriendsModel);
	}

	engine.createJSModel('g_MPFriendsModel', MPFriendsModel);
	MPFriendsModel.updateCallback = updateModel;
});

export { MPFriendsModel as default }