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
};
const DEFAULT_FILE_QUERY_ENTRY = {
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
};
export const DEFAULT_SAVE_GAME_INFO = {
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
};
export const LoadCompleteEventName = 'model-save-load-load-complete';
export class LoadCompleteEvent extends CustomEvent {
    constructor(detail) {
        super(LoadCompleteEventName, { bubbles: false, cancelable: true, detail });
    }
}
export const SaveDoneEventName = 'model-save-load-save-done';
export class SaveDoneEvent extends CustomEvent {
    constructor(detail) {
        super('model-save-load-save-done', { bubbles: false, cancelable: true, detail });
    }
}
export const QueryDoneEventName = 'model-save-load-query-done';
export class QueryDoneEvent extends CustomEvent {
    constructor(detail) {
        super('model-save-load-query-done', { bubbles: false, cancelable: true, detail });
    }
}
export const DeleteDoneEventName = 'model-save-load-delete-done';
export class DeleteDoneEvent extends CustomEvent {
    constructor(detail) {
        super('model-save-load-delete-done', { bubbles: false, cancelable: true, detail });
    }
}
export const QueryCompleteEventName = 'model-save-load-query-complete';
export class QueryCompleteEvent extends CustomEvent {
    constructor(detail) {
        super('model-save-load-query-complete', { bubbles: false, cancelable: true, detail });
    }
}
export const QuickSaveDoneEventName = 'model-save-load-quick-save-done';
export class QuickSaveDoneEvent extends CustomEvent {
    constructor(detail) {
        super('model-save-load-quick-save-done', { bubbles: true, cancelable: false, detail });
    }
}
class SaveLoadModel {
    /**
     * Singleton accessor
     */
    static getInstance() {
        if (!SaveLoadModel._Instance) {
            SaveLoadModel._Instance = new SaveLoadModel();
        }
        return SaveLoadModel._Instance;
    }
    get saves() {
        return this._saves;
    }
    set saves(value) {
        if (this._saves !== value) {
            this._saves = value;
        }
    }
    constructor() {
        this.queryIds = [];
        this._saves = [];
        /**
         * Using an update gate for the model so it isn't set to be updated on the same
         * frame as when a possible update just occurred, as this can cause lock up from
         * an infinitiely dirty model.
         */
        this.updateGate = new UpdateGate(() => {
            engine.updateWholeModel(this);
        });
        // TODO: refactor these events to be in screen-save-load for performance
        engine.on('FileListQueryResults', this.onFileListQueryResults, this);
        engine.on('QueryComplete', this.onQueryComplete, this);
        engine.on('SaveComplete', this.onSaveComplete, this);
        engine.on('LoadComplete', this.onLoadComplete, this);
        engine.on('RemoveComplete', this.onRemoveComplete, this);
    }
    update(props) {
        let tagForUpdateGate = "nothing_set";
        let isSet = false;
        Object.keys(props).forEach((key) => {
            this[key] = props[key];
            if (!isSet) { // record first key as reason for update
                tagForUpdateGate = key;
                isSet = true;
            }
        });
        this.updateGate.call(tagForUpdateGate);
    }
    clearQueries(id) {
        if (id != undefined) {
            GameStateStorage.closeFileListQuery(id);
        }
        else {
            GameStateStorage.closeAllFileListQueries();
        }
    }
    querySaveGameList(saveLocation, saveType, locationOption, saveFileType, options) {
        if (options?.isOverwriteQueryIds) {
            this.queryIds = [];
            this.clearQueries();
        }
        this.queryIds.push(GameStateStorage.querySaveGameList({
            Location: saveLocation,
            Type: saveType,
            LocationOptions: locationOption,
            ContentType: saveFileType,
            ForceRefresh: true,
        }));
    }
    onFileListQueryResults(queryId, fileList) {
        const queryIdIndex = this.queryIds.findIndex(id => id == queryId);
        if (queryIdIndex != -1) {
            this.updateSavesWithFileQueryEntries(fileList);
            window.dispatchEvent(new QueryDoneEvent({ queryId, fileList }));
            this.queryIds.splice(queryIdIndex, 1);
            this.clearQueries(queryId);
        }
    }
    updateSavesWithFileQueryEntries(fileList) {
        const saveGameInfos = [];
        const installedMods = Modding.getInstalledMods();
        // Some mods are pre-installed with the game and do not need to be included in the list.
        // We may still show them in debug builds.
        const ignoreMods = new Set();
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
                    const modInfo = installedMods.find((installedMod) => { return installedMod.id == modID; });
                    const shouldIgnore = ignoreMods.has(modID);
                    const inDebugBuild = BuildInfo.build == "Debug";
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
            const sortFn = (a, b) => Locale.compare(a, b);
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
    onQueryComplete(result) {
        window.dispatchEvent(new QueryCompleteEvent(result));
    }
    handleDelete(saveGame) {
        if (saveGame == DEFAULT_SAVE_GAME_INFO) {
            console.error('model-save-load: handleDeleteCurrentSave(): cannot delete an empty save');
            return false;
        }
        const { location: Location, locationCategories: LocationCategories, type: Type, contentType: ContentType, fileName: FileName, displayName: DisplayName, slot: Slot, additionalInfo: AdditionalInfo, } = saveGame;
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
    onRemoveComplete(result) {
        window.dispatchEvent(new DeleteDoneEvent(result));
    }
    handleSave(fileName, saveType, saveLocation, saveFileType) {
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
    handleOverwrite(fileName, saveType, saveLocation, saveFileType) {
        return Network.saveGame({
            Location: saveLocation,
            LocationCategories: SaveLocationCategories.NORMAL,
            Type: saveType,
            ContentType: saveFileType,
            Overwrite: true,
            FileName: fileName,
        });
    }
    onSaveComplete(result) {
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
    onLoadComplete(result) {
        window.dispatchEvent(new LoadCompleteEvent(result));
    }
    handleQuickLoad() {
        Network.loadGame(QUICK_SAVE_PARAMS, ServerType.SERVER_TYPE_NONE);
    }
    handleLoadSave(saveGame, serverType) {
        if (saveGame == DEFAULT_SAVE_GAME_INFO) {
            console.error('model-save-load: handleLoadCurrentSave(): cannot load an empty save');
            return false;
        }
        const { location: Location, locationCategories: LocationCategories, type: Type, contentType: ContentType, fileName: FileName, displayName: DisplayName, slot: Slot, additionalInfo: AdditionalInfo, } = saveGame;
        if (ContentType == SaveFileTypes.GAME_TRANSITION) {
            return Network.loadAgeTransition({
                Location,
                LocationCategories,
                Type,
                ContentType,
                FileName,
                DisplayName: FileName.substring(0, FileName.indexOf('.')),
                Slot,
                AdditionalInfo,
            });
        }
        else {
            return Network.loadGame({
                Location,
                LocationCategories,
                Type,
                ContentType,
                FileName,
                DisplayName,
                Slot,
                AdditionalInfo,
            }, serverType);
        }
    }
    createLocationFullConfirm() {
        DialogManager.createDialog_Confirm({
            body: "LOC_SAVE_LOAD_LOCATION_FULL_DIALOG",
            title: "LOC_SAVE_LOAD_LOCATION_FULL_DIALOG_TITLE",
        });
    }
    createQuotaExceededConfirm() {
        DialogManager.createDialog_Confirm({
            body: "LOC_SAVE_LOAD_QUOTA_EXCEEDED_DIALOG",
            title: "LOC_SAVE_LOAD_QUOTA_EXCEEDED_DIALOG_TITLE",
        });
    }
}
const SaveLoadData = SaveLoadModel.getInstance();
engine.whenReady.then(() => {
    engine.createJSModel('g_SaveGames', SaveLoadData);
});
export { SaveLoadData as default };

//# sourceMappingURL=file:///core/ui/save-load/model-save-load.js.map
