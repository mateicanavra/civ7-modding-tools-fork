/**
 * @file model-save-load.ts
 * @copyright 2021-2024, Firaxis Games
 * @description data for the save/load menu shared script
 */

import DialogManager from '/core/ui/dialog-box/manager-dialog-box.js';
import UpdateGate from "/core/ui/utilities/utilities-update-gate.js";

const QUICK_SAVE_PARAMS = {
	Location: SaveLocations.LOCAL_STORAGE,
	LocationCategories: SaveLocationCategories.QUICKSAVE,
	Type: GameStateStorage.getGameConfigurationSaveType(),
	ContentType: SaveFileTypes.GAME_STATE,
	FileName: Locale.compose("LOC_QUICK_SAVE_NAME"),
	Overwrite: true,
}

const DEFAULT_FILE_QUERY_ENTRY: FileQueryEntry = {
	ID: NaN,
	displayName: "",
	fileName: "",
	type: SaveTypes.DEFAULT,
	location: SaveLocations.DEFAULT,
	locationCategories: SaveLocationCategories.NORMAL,
	contentType: SaveFileTypes.GAME_STATE,
	slot: 0,
	additionalInfo: "",
	accountReference: 0,
	path: "",
	isAutosave: false,
	isQuicksave: false,
	isPrevious: false,
	isDirectory: false,
	isPlayerSave: true,
	createdByVersion: "",
	createdTime: 0,
	displayCreatedTime: "",
	savedByVersion: "",
	saveTime: 0,
	displaySaveTime: "",
	gameGUID: "",
	gameType: 0,
	hostCivilization: "",
	hostCivilizationName: "",
	hostLeader: "",
	hostLeaderName: "",
	hostForegroundColorValue: 0,
	hostBackgroundColorValue: 0,
	hostDifficulty: "",
	hostDifficultyName: "",
	hostAge: "",
	hostAgeName: "",
	startAge: "",
	startAgeName: "",
	startingMajorPlayerCount: 0,
	startingMinorPlayerCount: 0,
	currentTurn: 0,
	currentTurnDate: "",
	gameSpeed: "",
	gameSpeedName: "",
	mapSize: "",
	mapSizeName: "",
	mapScript: "",
	mapScriptName: "",
	ruleset: "",
	rulesetName: "",
	enabledGameModes: "",
	scenarioName: "",
	scenarioDescription: "",
	enabledMods: [],
	requiredMods: []
}

export interface SaveGameInfo extends FileQueryEntry {
	saveTimeDayName: string;
	saveTimeHourName: string;
	saveActionName: string;
	leaderIconUrl: string;
	civIconUrl: string;
	civForegroundColor: string;
	civBackgroundColor: string;
	gameName: string,
	requiredModsString: string,
	missingMods: string[],
	unownedMods: string[],
	isCurrentGame: boolean,
	isLiveEventGame: boolean,
}

export const DEFAULT_SAVE_GAME_INFO: SaveGameInfo = {
	saveTimeDayName: "",
	saveTimeHourName: "",
	saveActionName: "",
	leaderIconUrl: "fs://game/leader_portrait_unknown.png",
	civIconUrl: "fs://game/civ_sym_unknown.png",
	civForegroundColor: "rgb(0,0,0)",
	civBackgroundColor: "rgb(0,0,0)",
	gameName: "",
	requiredModsString: "",
	missingMods: [],
	unownedMods: [],
	isCurrentGame: false,
	isLiveEventGame: false,
	...DEFAULT_FILE_QUERY_ENTRY

}

type SaveLoadModelPartial = {
	[P in keyof SaveLoadModel]?: SaveLoadModel[P];
};

export const LoadCompleteEventName = 'model-save-load-load-complete' as const;
export class LoadCompleteEvent extends CustomEvent<LoadSaveResultData> {
	constructor(detail: LoadSaveResultData) {
		super(LoadCompleteEventName, { bubbles: false, cancelable: true, detail });
	}
}

export const SaveDoneEventName = 'model-save-load-save-done' as const;
export class SaveDoneEvent extends CustomEvent<LoadSaveResultData> {
	constructor(detail: LoadSaveResultData) {
		super('model-save-load-save-done', { bubbles: false, cancelable: true, detail });
	}
}

export const QueryDoneEventName = 'model-save-load-query-done' as const;
export class QueryDoneEvent extends CustomEvent<{ queryId: number, fileList: FileQueryEntry[] }> {
	constructor(detail: { queryId: number, fileList: FileQueryEntry[] }) {
		super('model-save-load-query-done', { bubbles: false, cancelable: true, detail });
	}
}

export const DeleteDoneEventName = 'model-save-load-delete-done' as const;
export class DeleteDoneEvent extends CustomEvent<LoadSaveResultData> {
	constructor(detail: LoadSaveResultData) {
		super('model-save-load-delete-done', { bubbles: false, cancelable: true, detail });
	}
}

export const QueryCompleteEventName = 'model-save-load-query-complete' as const;
export class QueryCompleteEvent extends CustomEvent<LoadSaveResultData> {
	constructor(detail: LoadSaveResultData) {
		super('model-save-load-query-complete', { bubbles: false, cancelable: true, detail });
	}
}

export const QuickSaveDoneEventName = 'model-save-load-quick-save-done' as const;
export class QuickSaveDoneEvent extends CustomEvent<LoadSaveResultData> {
	constructor(detail: LoadSaveResultData) {
		super('model-save-load-quick-save-done', { bubbles: true, cancelable: false, detail });
	}
}

class SaveLoadModel {
	private static _Instance: SaveLoadModel;
	/**
	 * Singleton accessor 
	 */
	static getInstance() {

		if (!SaveLoadModel._Instance) {
			SaveLoadModel._Instance = new SaveLoadModel();
		}
		return SaveLoadModel._Instance;
	}

	private queryIds: number[] = [];

	private _saves: SaveGameInfo[] = [];
	get saves(): SaveGameInfo[] {
		return this._saves;
	}
	set saves(value: SaveGameInfo[]) {
		if (this._saves !== value) {
			this._saves = value;
		}
	}

	constructor() {
		// TODO: refactor these events to be in screen-save-load for performance
		engine.on('FileListQueryResults', this.onFileListQueryResults, this);
		engine.on('QueryComplete', this.onQueryComplete, this);
		engine.on('SaveComplete', this.onSaveComplete, this);
		engine.on('LoadComplete', this.onLoadComplete, this);
		engine.on('RemoveComplete', this.onRemoveComplete, this);
	}

	/**
	 * Using an update gate for the model so it isn't set to be updated on the same
	 * frame as when a possible update just occurred, as this can cause lock up from
	 * an infinitiely dirty model.
	 */
	updateGate = new UpdateGate(() => {
		engine.updateWholeModel(this);
	});

	update(props: SaveLoadModelPartial) {
		let tagForUpdateGate = "nothing_set";
		let isSet = false;
		Object.keys(props).forEach((key: keyof SaveLoadModel) => {
			(<any>this)[key] = props[key];
			if (!isSet) {					// record first key as reason for update
				tagForUpdateGate = key;
				isSet = true;
			}
		});
		this.updateGate.call(tagForUpdateGate);
	}

	clearQueries(id?: number) {
		if (id != undefined) {
			GameStateStorage.closeFileListQuery(id);
		}
		else {
			GameStateStorage.closeAllFileListQueries();
		}
	}

	querySaveGameList(saveLocation: SaveLocations, saveType: SaveTypes, locationOption: SaveLocationCategories, saveFileType: SaveFileTypes, options?: { isOverwriteQueryIds?: boolean }) {
		if (options?.isOverwriteQueryIds) {
			this.queryIds = [];
			this.clearQueries();
		}
		this.queryIds.push(
			GameStateStorage.querySaveGameList({
				Location: saveLocation,
				Type: saveType,
				LocationOptions: locationOption,
				ContentType: saveFileType,
				ForceRefresh: true,
			})
		);
	}

	onFileListQueryResults(queryId: number, fileList: FileQueryEntry[]) {
		const queryIdIndex = this.queryIds.findIndex(id => id == queryId);
		if (queryIdIndex != -1) {
			this.updateSavesWithFileQueryEntries(fileList);
			window.dispatchEvent(new QueryDoneEvent({ queryId, fileList }));
			this.queryIds.splice(queryIdIndex, 1);
			this.clearQueries(queryId);
		}
	}

	updateSavesWithFileQueryEntries(fileList: FileQueryEntry[]) {
		const saveGameInfos: SaveGameInfo[] = [];

		const installedMods = Modding.getInstalledMods();

		// Some mods are pre-installed with the game and do not need to be included in the list.
		// We may still show them in debug builds.
		const ignoreMods = new Set<string>();
		const mods = Modding.getModulesToExclude();
		for (const m of mods) {
			ignoreMods.add(m);
		}

		// TODO In the future, it'd be nice to prefix the module name with some sort of icon showing where it came from.
		// The following code is fully functional but commented out due to current word-wrapping rules causing it to be
		// visually unappealing (it's wrapping at the icon rather than breaking up the text).
		const prefixModNameWithIcons = false;

		fileList.forEach(file => {
			let unownedMods = [];
			let unownedModsClean = [];
			let missingMods = [];
			let missingModsClean = [];
			let requiredMods = [];

			if (file.requiredMods.length > 0) {
				for (let mod of file.requiredMods) {
					let entry = "";
					const modID = mod.ID;
					const modInfo = installedMods.find((installedMod: ModInfo) => { return installedMod.id == modID; });
					const shouldIgnore = ignoreMods.has(modID);
					const inDebugBuild = BuildInfo.build == "Debug"
					if (!shouldIgnore || inDebugBuild) {

						if (shouldIgnore) {
							entry += "(DEBUG) ";
						}

						if (modInfo == null) {
							let title = Locale.unpack(mod.title);
							if (title == '' || title == null) {
								title = mod.title;
							}

							if (prefixModNameWithIcons && mod.subscriptionID != null) {
								title = `[icon:mod-workshop] ${title}`;
							}

							entry += Locale.compose('LOC_SAVE_GAME_MOD_NOT_INSTALLED', title);
							missingMods.push(entry);
							missingModsClean.push(title);
						}
						else if (modInfo.allowance != ModAllowance.Full) {
							entry += Locale.compose('LOC_SAVE_GAME_MOD_NOT_OWNED', modInfo.name);
							unownedMods.push(entry);
							unownedModsClean.push(modInfo.name);
						}
						else {
							if (prefixModNameWithIcons && modInfo.subscriptionType) {
								switch (modInfo.subscriptionType) {
									case "CommunityContent":
										entry += `[icon:mod] ${modInfo.name}`;
										break;
									case "SteamWorkshopContent":
										entry += `[icon:mod-workshop] ${modInfo.name}`;
										break;
									case "OfficialContent":
									default:
										entry += modInfo.name;
										break;
								}
							}
							else {
								entry += modInfo.name;
							}
							requiredMods.push(entry);
						}
					}
				}
			}

			// Sort containers.
			const sortFn = (a: string, b: string) => Locale.compare(a, b);
			requiredMods.sort(sortFn);
			missingMods.sort(sortFn);
			missingModsClean.sort(sortFn);
			unownedMods.sort(sortFn);
			unownedModsClean.sort(sortFn);


			const allMods = unownedMods.concat(missingMods, requiredMods);
			const requiredModsString = allMods.join("[N]");

			saveGameInfos.push({
				saveTimeDayName: Locale.compose("LOC_SAVE_LOAD_SAVE_DATE", file.saveTime),
				saveTimeHourName: Locale.compose("LOC_SAVE_LOAD_SAVE_TIME", file.saveTime),
				saveActionName: file.isQuicksave ? Locale.compose("LOC_SAVE_LOAD_SAVEACTION_QUICK") : file.isAutosave ? Locale.compose("LOC_SAVE_LOAD_SAVEACTION_AUTO") : Locale.compose("LOC_SAVE_LOAD_SAVEACTION_MANUAL"),
				leaderIconUrl: file.hostLeader,
				civIconUrl: file.hostCivilization ? "fs://game/core/ui/civ_sym_" + file.hostCivilization.slice(13).toLowerCase() : "fs://game/core/ui/civ_sym_unknown",
				civForegroundColor: `rgb(${(file.hostForegroundColorValue >> 0) & 0xff},${((file.hostForegroundColorValue) >> 8) & 0xff},${((file.hostForegroundColorValue) >> 16) & 0xff})`,
				civBackgroundColor: `rgb(${(file.hostBackgroundColorValue >> 0) & 0xff},${((file.hostBackgroundColorValue) >> 8) & 0xff},${((file.hostBackgroundColorValue) >> 16) & 0xff})`,
				gameName: file.displayName,
				requiredModsString: requiredModsString,
				missingMods: missingModsClean,
				unownedMods: unownedModsClean,
				isCurrentGame: false,
				isLiveEventGame: false,
				...file
			});
		});
		this.update({
			"saves": saveGameInfos
		});
	}

	private onQueryComplete(result: LoadSaveResultData) {
		window.dispatchEvent(new QueryCompleteEvent(result));
	}

	handleDelete(saveGame: SaveGameInfo) {
		if (saveGame == DEFAULT_SAVE_GAME_INFO) {
			console.error('model-save-load: handleDeleteCurrentSave(): cannot delete an empty save');
			return false;
		}

		const {
			location: Location,
			locationCategories: LocationCategories,
			type: Type,
			contentType: ContentType,
			fileName: FileName,
			displayName: DisplayName,
			slot: Slot,
			additionalInfo: AdditionalInfo,
		} = saveGame;

		return Network.deleteGame({
			Location,
			LocationCategories,
			Type,
			ContentType,
			FileName,
			DisplayName,
			Slot,
			AdditionalInfo,
		});
	}

	private onRemoveComplete(result: LoadSaveResultData) {
		window.dispatchEvent(new DeleteDoneEvent(result));
	}

	handleSave(fileName: string, saveType: SaveTypes, saveLocation: SaveLocations, saveFileType: SaveFileTypes) {
		return Network.saveGame({
			Location: saveLocation,
			LocationCategories: SaveLocationCategories.NORMAL,
			Type: saveType,
			ContentType: saveFileType,
			FileName: fileName,
		});
	}

	handleQuickSave() {
		return Network.saveGame(QUICK_SAVE_PARAMS);
	}

	handleOverwrite(fileName: string, saveType: SaveTypes, saveLocation: SaveLocations, saveFileType: SaveFileTypes) {
		return Network.saveGame({
			Location: saveLocation,
			LocationCategories: SaveLocationCategories.NORMAL,
			Type: saveType,
			ContentType: saveFileType,
			Overwrite: true,
			FileName: fileName,
		});
	}

	onSaveComplete(result: LoadSaveResultData) {
		if ((result.options & SaveLocationCategories.QUICKSAVE) &&
			(result.result == SerializerResult.RESULT_OK)) {
			window.dispatchEvent(new QuickSaveDoneEvent(result));
		}

		// Handle autosave/quicksave errors here
		if ((result.options & SaveLocationCategories.AUTOSAVE) ||
			(result.options & SaveLocationCategories.QUICKSAVE)) {
			switch (result.result) {
				case SerializerResult.RESULT_SAVE_LOCATION_FULL:
					this.createLocationFullConfirm();
					break;
				case SerializerResult.RESULT_SAVE_QUOTA_EXCEEDED:
					this.createQuotaExceededConfirm();
					break;
			}
		}

		window.dispatchEvent(new SaveDoneEvent(result));
	}

	onLoadComplete(result: LoadSaveResultData) {
		window.dispatchEvent(new LoadCompleteEvent(result));
	}

	handleQuickLoad() {
		Network.loadGame(QUICK_SAVE_PARAMS, ServerType.SERVER_TYPE_NONE);
	}

	handleLoadSave(saveGame: SaveGameInfo, serverType: ServerType) {
		if (saveGame == DEFAULT_SAVE_GAME_INFO) {
			console.error('model-save-load: handleLoadCurrentSave(): cannot load an empty save');
			return false;
		}

		const {
			location: Location,
			locationCategories: LocationCategories,
			type: Type,
			contentType: ContentType,
			fileName: FileName,
			displayName: DisplayName,
			slot: Slot,
			additionalInfo: AdditionalInfo,
		} = saveGame;

		if (ContentType == SaveFileTypes.GAME_TRANSITION) {
			return Network.loadAgeTransition(
				{
					Location,
					LocationCategories,
					Type,
					ContentType,
					FileName,
					DisplayName: FileName.substring(0, FileName.indexOf('.')),
					Slot,
					AdditionalInfo,
				}
			);
		} else {
			return Network.loadGame(
				{
					Location,
					LocationCategories,
					Type,
					ContentType,
					FileName,
					DisplayName,
					Slot,
					AdditionalInfo,
				},
				serverType
			);
		}
	}

	createLocationFullConfirm() {
		DialogManager.createDialog_Confirm({
			body: "LOC_SAVE_LOAD_LOCATION_FULL_DIALOG",
			title: "LOC_SAVE_LOAD_LOCATION_FULL_DIALOG_TITLE",
		})
	}

	createQuotaExceededConfirm() {
		DialogManager.createDialog_Confirm({
			body: "LOC_SAVE_LOAD_QUOTA_EXCEEDED_DIALOG",
			title: "LOC_SAVE_LOAD_QUOTA_EXCEEDED_DIALOG_TITLE",
		})
	}
}

const SaveLoadData = SaveLoadModel.getInstance();
engine.whenReady.then(() => {
	engine.createJSModel('g_SaveGames', SaveLoadData);
});

export { SaveLoadData as default };

declare global {
	interface HTMLElementEventMap {
		[QuickSaveDoneEventName]: QuickSaveDoneEvent;
		[SaveDoneEventName]: SaveDoneEvent;
		[QueryCompleteEventName]: QueryCompleteEvent;
		[QueryDoneEventName]: QueryDoneEvent;
		[DeleteDoneEventName]: DeleteDoneEvent;
	}
}