/**
 * @file model-mp-browser-new.ts
 * @copyright 2023, Firaxis Games
 * @description Multiplayer browser screen data mdoel.
 */
import MultiplayerShellManager from '/core/ui/shell/mp-shell-logic/mp-shell-logic.js';
import UpdateGate from "/core/ui/utilities/utilities-update-gate.js";
export const MultiplayerGameListQueryCompleteEventName = 'mp-game-list-query-complete';
export class MultiplayerGameListQueryCompleteEvent extends CustomEvent {
    constructor(detail) {
        super('mp-game-list-query-complete', { bubbles: false, cancelable: true, detail });
    }
}
export const MultiplayerGameListQueryDoneEventName = 'mp-game-list-query-done';
export class MultiplayerGameListQueryDoneEvent extends CustomEvent {
    constructor(detail) {
        super('mp-game-list-query-done', { bubbles: false, cancelable: true, detail });
    }
}
export const MultiplayerGameListQueryErrorEventName = 'mp-game-list-query-error';
export class MultiplayerGameListQueryErrorEvent extends CustomEvent {
    constructor(detail) {
        super('mp-game-list-query-error', { bubbles: false, cancelable: true, detail });
    }
}
class MPBrowserDataModel {
    constructor() {
        this.GameList = [];
        this.installedMods = new Map();
        this.modulesToExclude = new Set();
        /**
         * Using an update gate for the model so it isn't set to be updated on the same
         * frame as when a possible update just occurred, as this can cause lock up from
         * an infinitiely dirty model.
         */
        this.updateGate = new UpdateGate(() => {
            engine.updateWholeModel(this);
        });
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
        for (let i = 0; i < 10; i++) {
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
    initGameList(serverType) {
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
    onMultiplayerGameListClear(_data) {
        this.GameList = [];
        if (MultiplayerShellManager.unitTestMP) {
            this.pushDummyGameList();
        }
    }
    onMultiplayerGameListUpdated(data) {
        const { roomID = 0, serverNameOriginal = "", serverNameDisplay = "", numPlayers = 0, maxPlayers = 0, gameSpeedName = "", gameSpeed = 0, mapDisplayName = "", mapSizeName = "", mapSizeType = 0, ruleSetName = "", savedGame = false, liveEvent = "", enabledMods = [], hostingPlatform = HostingType.HOSTING_TYPE_UNKNOWN, hostFriendID_Native = "", hostFriendID_T2GP = "", hostName_1P = "", hostName_2K = "", } = Network.getGameListEntry(data.idLobby) ?? {};
        // Remove any mods that needn't be shown in the list (e.g mods that everyone is guarenteed to have).
        let filteredMods = enabledMods.filter(mod => !this.modulesToExclude.has(mod.modID));
        let filteredInstalledMods = new Map([...this.installedMods].filter(mod => !this.modulesToExclude.has(mod[1].id) && Modding.getModProperty(mod[1].handle, "ShowInBrowser") != "0"));
        let disabledContent = [];
        let mods = [];
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
    onMultiplayerGameListComplete(data) {
        window.dispatchEvent(new MultiplayerGameListQueryCompleteEvent(data));
    }
    onMultiplayerGameListError(data) {
        window.dispatchEvent(new MultiplayerGameListQueryErrorEvent(data));
    }
}
const MPBrowserModel = MPBrowserDataModel.getInstance();
engine.whenReady.then(() => {
    engine.createJSModel('g_MPBrowserModel', MPBrowserModel);
});
export { MPBrowserModel as default };

//# sourceMappingURL=file:///core/ui/shell/mp-browser/model-mp-browser-new.js.map
