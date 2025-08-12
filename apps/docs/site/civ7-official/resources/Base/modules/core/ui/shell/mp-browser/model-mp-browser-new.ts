/**
 * @file model-mp-browser-new.ts		
 * @copyright 2023, Firaxis Games
 * @description Multiplayer browser screen data mdoel.  
 */

import MultiplayerShellManager from '/core/ui/shell/mp-shell-logic/mp-shell-logic.js';
import UpdateGate from "/core/ui/utilities/utilities-update-gate.js";

export const MultiplayerGameListQueryCompleteEventName = 'mp-game-list-query-complete' as const;
export class MultiplayerGameListQueryCompleteEvent extends CustomEvent<MultiplayerGameListCompleteData> {
	constructor(detail: MultiplayerGameListCompleteData) {
		super('mp-game-list-query-complete', { bubbles: false, cancelable: true, detail });
	}
}

export const MultiplayerGameListQueryDoneEventName = 'mp-game-list-query-done' as const;
export class MultiplayerGameListQueryDoneEvent extends CustomEvent<MultiplayerGameListCompleteData> {
	constructor(detail: MultiplayerGameListCompleteData) {
		super('mp-game-list-query-done', { bubbles: false, cancelable: true, detail });
	}
}

export const MultiplayerGameListQueryErrorEventName = 'mp-game-list-query-error' as const;
export class MultiplayerGameListQueryErrorEvent extends CustomEvent<GenericDataInt32> {
	constructor(detail: GenericDataInt32) {
		super('mp-game-list-query-error', { bubbles: false, cancelable: true, detail });
	}
}

export interface MPGameListInfo {
	roomID: number;
	serverNameOriginal: string;
	serverNameDisplay: string;
	numPlayers: number;
	maxPlayers: number;
	gameSpeedName: string;
	gameSpeed: number;
	mapDisplayName: string;
	mapSizeName: string;
	mapSizeType: number;
	ruleSetName: string;
	savedGame: boolean;
	liveEvent: string;
	disabledContent: ModInfo[];
	mods: ModConfiguration[];
	hostingPlatform: HostingType;
	hostFriendID_Native: string;
	hostFriendID_T2GP: string;
	hostName_1P: string;
	hostName_2K: string;
}

type MPBrowserDataModelPartial = {
	[P in keyof MPBrowserDataModel]?: MPBrowserDataModel[P];
};

class MPBrowserDataModel {
	private static instance: MPBrowserDataModel;

	GameList: MPGameListInfo[] = [];
	installedMods: Map<string, ModInfo> = new Map();
	modulesToExclude: Set<string> = new Set();

	constructor() {
		engine.on('MultiplayerGameListClear', this.onMultiplayerGameListClear, this);
		engine.on('MultiplayerGameListUpdated', this.onMultiplayerGameListUpdated, this);
		engine.on('MultiplayerGameListComplete', this.onMultiplayerGameListComplete, this);
		engine.on('MultiplayerGameListError', this.onMultiplayerGameListError, this);

		// Generate a set of base game mods.
		// These will be excluded from any lists since everyone is guarenteed to have them.
		const excludedModIds = Modding.getModulesToExclude();
		for (const mod of excludedModIds) {
			this.modulesToExclude.add(mod);
		}
	}

	/**
	 * Using an update gate for the model so it isn't set to be updated on the same
	 * frame as when a possible update just occurred, as this can cause lock up from
	 * an infinitiely dirty model.
	 */
	updateGate = new UpdateGate(() => {
		engine.updateWholeModel(this);
	});

	update(props: MPBrowserDataModelPartial) {
		let tagForUpdateGate = "nothing_set";
		let isSet = false;
		Object.keys(props).forEach((key: keyof MPBrowserDataModel) => {
			(<any>this)[key] = props[key];
			if (!isSet) {					// record first key as reason for update
				tagForUpdateGate = key;
				isSet = true;
			}
		});
		this.updateGate.call(tagForUpdateGate);
	}

	/**
	 * Singleton accessor 
	 */
	static getInstance() {

		if (!MPBrowserDataModel.instance) {
			MPBrowserDataModel.instance = new MPBrowserDataModel();
		}
		return MPBrowserDataModel.instance;
	}

	pushDummyGameList() {
		this.GameList = [];
		for (let i: number = 0; i < 10; i++) {
			this.GameList.push({
				roomID: i + 100,
				serverNameOriginal: "Bradley's Game " + i,
				serverNameDisplay: "Bradley's Game " + i,
				numPlayers: 3,
				maxPlayers: 6,
				gameSpeedName: "Online",
				gameSpeed: 0,
				mapDisplayName: "SomeMapScript",
				mapSizeName: "TeenyTiny",
				mapSizeType: 0,
				ruleSetName: "BaseGameDawg",
				savedGame: false,
				liveEvent: "",
				disabledContent: [],
				mods: [],
				hostingPlatform: HostingType.HOSTING_TYPE_UNKNOWN,
				hostFriendID_Native: "",
				hostFriendID_T2GP: "",
				hostName_1P: "",
				hostName_2K: "",
			});
		}
	}

	initGameList(serverType: ServerType) {
		return Network.initGameList(serverType);
	}

	refreshGameList() {
		const mods = Modding.getInstalledMods();
		this.installedMods.clear();
		for (const mod of mods) {
			this.installedMods.set(mod.id, mod);
		}

		return Network.refreshGameList();
	}

	onMultiplayerGameListClear(_data: MultiplayerGameListClearData) {
		this.GameList = [];

		if (MultiplayerShellManager.unitTestMP) {
			this.pushDummyGameList();
		}
	}

	onMultiplayerGameListUpdated(data: MultiplayerGameListUpdatedData) {
		const {
			roomID = 0,
			serverNameOriginal = "",
			serverNameDisplay = "",
			numPlayers = 0,
			maxPlayers = 0,
			gameSpeedName = "",
			gameSpeed = 0,
			mapDisplayName = "",
			mapSizeName = "",
			mapSizeType = 0,
			ruleSetName = "",
			savedGame = false,
			liveEvent = "",
			enabledMods = [],
			hostingPlatform = HostingType.HOSTING_TYPE_UNKNOWN,
			hostFriendID_Native = "",
			hostFriendID_T2GP = "",
			hostName_1P = "",
			hostName_2K = "",
		} = Network.getGameListEntry(data.idLobby) ?? {};

		// Remove any mods that needn't be shown in the list (e.g mods that everyone is guarenteed to have).
		let filteredMods = enabledMods.filter(mod => !this.modulesToExclude.has(mod.modID));
		let filteredInstalledMods = new Map([...this.installedMods].filter(mod => !this.modulesToExclude.has(mod[1].id) && Modding.getModProperty(mod[1].handle, "ShowInBrowser") != "0"));
		let disabledContent: ModInfo[] = [];
		let mods: ModConfiguration[] = [];
		for (const mod of filteredMods) {
			let installedMod = filteredInstalledMods.get(mod.modID);
			if (!installedMod || !installedMod.official) {
				mods.push(mod);
			}
		}
		filteredInstalledMods.forEach(installedMod => {
			if (installedMod.official && !filteredMods.find(enabledMod => enabledMod.modID == installedMod.id)) {
				disabledContent.push(installedMod);
			}
		});

		disabledContent.sort((a, b) => Locale.compare(a.name, b.name));
		mods.sort((a, b) => Locale.compare(a.name, b.name));

		this.GameList.push({
			roomID,
			serverNameOriginal: serverNameOriginal,
			serverNameDisplay: serverNameDisplay,
			numPlayers,
			maxPlayers,
			gameSpeedName,
			gameSpeed,
			mapDisplayName,
			mapSizeName,
			mapSizeType,
			ruleSetName,
			savedGame,
			liveEvent,
			disabledContent,
			mods,
			hostingPlatform,
			hostFriendID_Native,
			hostFriendID_T2GP,
			hostName_1P,
			hostName_2K,
		});

		window.dispatchEvent(new MultiplayerGameListQueryDoneEvent(data));
	}

	onMultiplayerGameListComplete(data: MultiplayerGameListCompleteData) {
		window.dispatchEvent(new MultiplayerGameListQueryCompleteEvent(data));
	}

	onMultiplayerGameListError(data: GenericDataInt32) {
		window.dispatchEvent(new MultiplayerGameListQueryErrorEvent(data));
	}
}

const MPBrowserModel: MPBrowserDataModel = MPBrowserDataModel.getInstance();

engine.whenReady.then(() => {
	engine.createJSModel('g_MPBrowserModel', MPBrowserModel);
});
export { MPBrowserModel as default }

declare global {
	interface HTMLElementEventMap {
		[MultiplayerGameListQueryCompleteEventName]: MultiplayerGameListQueryCompleteEvent;
		[MultiplayerGameListQueryDoneEventName]: MultiplayerGameListQueryDoneEvent;
		[MultiplayerGameListQueryErrorEventName]: MultiplayerGameListQueryErrorEvent;
	}
}