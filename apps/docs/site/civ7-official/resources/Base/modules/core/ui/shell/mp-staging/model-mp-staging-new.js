/**
 * @file model-mp-staging-new.ts
 * @copyright 2023, Firaxis Games
 * @description Multiplayer lobby screen data mdoel.
 */
import DialogManager, { DialogBoxAction } from '/core/ui/dialog-box/manager-dialog-box.js';
import MultiplayerShellManager from '/core/ui/shell/mp-shell-logic/mp-shell-logic.js';
import { NetworkUtilities } from '/core/ui/utilities/utilities-network.js';
import { getLeaderData } from '/core/ui/shell/create-panels/leader-select-model.js';
import { GetCivilizationData } from '/core/ui/shell/create-panels/age-civ-select-model.js';
import { getPlayerCardInfo } from '/core/ui/utilities/utilities-liveops.js';
import LiveEventManager from "/core/ui/shell/live-event-logic/live-event-logic.js";
import { Audio } from '/core/ui/audio-base/audio-support.js';
var MPLobbyDropdownType;
(function (MPLobbyDropdownType) {
    MPLobbyDropdownType["TEAM"] = "DROPDOWN_TYPE_TEAM";
    MPLobbyDropdownType["PLAYER_PARAM"] = "DROPDOWN_TYPE_PLAYER_PARAM";
    MPLobbyDropdownType["SLOT_ACTION"] = "DROPDOWN_TYPE_SLOT_ACTION";
})(MPLobbyDropdownType || (MPLobbyDropdownType = {}));
var MPLobbySlotActionType;
(function (MPLobbySlotActionType) {
    MPLobbySlotActionType["NONE"] = "SLOT_ACTION_TYPE_NONE";
    MPLobbySlotActionType["OPEN"] = "SLOT_ACTION_TYPE_OPEN";
    MPLobbySlotActionType["CLOSE"] = "SLOT_ACTION_TYPE_CLOSE";
    MPLobbySlotActionType["AI"] = "SLOT_ACTION_TYPE_AI";
    MPLobbySlotActionType["SWAP"] = "SLOT_ACTION_TYPE_SWAP";
    MPLobbySlotActionType["VIEW"] = "SLOT_ACTION_TYPE_VIEW";
})(MPLobbySlotActionType || (MPLobbySlotActionType = {}));
export var MPLobbyReadyStatus;
(function (MPLobbyReadyStatus) {
    MPLobbyReadyStatus["INIT"] = "INIT";
    MPLobbyReadyStatus["NOT_READY"] = "NOT_READY";
    MPLobbyReadyStatus["WAITING_FOR_OTHERS"] = "WAITING_FOR_OTHERS";
    MPLobbyReadyStatus["STARTING_GAME"] = "STARTING_GAME";
    MPLobbyReadyStatus["WAITING_FOR_HOST"] = "WAITING_FOR_HOST";
})(MPLobbyReadyStatus || (MPLobbyReadyStatus = {}));
export var PlayerParamDropdownTypes;
(function (PlayerParamDropdownTypes) {
    PlayerParamDropdownTypes["PLAYER_SLOT_ACTION"] = "PLAYER_SLOT_ACTION";
    PlayerParamDropdownTypes["PLAYER_TEAM"] = "PLAYER_TEAM";
    PlayerParamDropdownTypes["PLAYER_CIV"] = "PLAYER_CIV";
    PlayerParamDropdownTypes["PLAYER_LEADER"] = "PLAYER_LEADER";
    PlayerParamDropdownTypes["PLAYER_MEMENTO"] = "PLAYER_MEMENTO";
})(PlayerParamDropdownTypes || (PlayerParamDropdownTypes = {}));
var MPLobbyPlayerConnectionStatus;
(function (MPLobbyPlayerConnectionStatus) {
    MPLobbyPlayerConnectionStatus[MPLobbyPlayerConnectionStatus["CONNECTED"] = 0] = "CONNECTED";
    MPLobbyPlayerConnectionStatus[MPLobbyPlayerConnectionStatus["DISCONNECTED"] = 1] = "DISCONNECTED";
})(MPLobbyPlayerConnectionStatus || (MPLobbyPlayerConnectionStatus = {}));
export class MPLobbyDropdownOptionData {
    constructor() {
        this.id = ""; //UNIQUE id
        this.type = PlayerParamDropdownTypes.PLAYER_SLOT_ACTION;
        this.label = "";
    }
    get serializedItemList() {
        if (this.itemList == undefined)
            return "[]";
        return JSON.stringify(this.itemList);
    }
}
export const LobbyUpdateEventName = 'model-mp-staging-update';
export class LobbyUpdateEvent extends CustomEvent {
    constructor() {
        super('model-mp-staging-update', { bubbles: false, cancelable: true });
    }
}
export class MPLobbyDataModel {
    get gameName() {
        const gameConfig = Configuration.getGame();
        return gameConfig.gameName ?? "DBG Missing Name of game";
    }
    get joinCode() {
        return Network.getJoinCode();
    }
    get timeRemainingTimer() {
        return `${this.formatDateToMinutes(this.globalCountdownRemainingSeconds)} ${Locale.compose("LOC_UI_MP_LOBBY_TIME_REMAINING")}`;
    }
    get canToggleReady() {
        // Global countdown has elapsed.
        if (this.isUsingGlobalCountdown && this.globalCountdownRemainingSeconds <= 0 || this.readyStatus == MPLobbyReadyStatus.WAITING_FOR_HOST) {
            return false;
        }
        return true;
    }
    get isLocalPlayerReady() {
        return Network.isPlayerStartReady(GameContext.localPlayerID);
    }
    get canEditMementos() {
        return !this.isLocalPlayerReady && MPLobbyDataModel.isNewGame;
    }
    get summaryMapSize() {
        const mapSizeName = this.findGameParameter(this.MapSizeStringHandle)?.value.name;
        const mapSize = mapSizeName != undefined ? GameSetup.resolveString(mapSizeName) : null;
        return mapSize ?? "DBG Missing Map size";
    }
    get summarySpeed() {
        const speedName = this.findGameParameter(this.GameSpeedsStringHandle)?.value.name;
        const speed = speedName != undefined ? GameSetup.resolveString(speedName) : null;
        return speed ?? "DBG Missing Speed name";
    }
    get summaryMapType() {
        const mapConfig = Configuration.getMap();
        return mapConfig.mapName ?? "DBG Missing Map type";
    }
    get summaryMapRuleSet() {
        const ruleSetName = this.findGameParameter(this.RulesetStringHandle)?.value.name;
        const ruleSet = ruleSetName != undefined ? GameSetup.resolveString(ruleSetName) : null;
        return ruleSet ?? "DBG Missing Rule set";
    }
    get ageBannerSrc() {
        let bannerSrc = "Skyline_Sm";
        const ageParameter = this.findGameParameter(this.AgeStringHandle);
        if (ageParameter) {
            const bannerName = GameSetup.findString('Banner');
            if (bannerName != GAMESETUP_INVALID_STRING) {
                // Note: the 'Banner' field is in the additional properties since it is not an attribute of the DomainValue struct
                const currentAgeBanner = ageParameter.value.additionalProperties?.find((additionalProperty) => additionalProperty.name == bannerName)?.value;
                if (typeof (currentAgeBanner) == 'string') {
                    bannerSrc = currentAgeBanner;
                }
                else {
                    console.warn("model-mp-staging-new: ageBannerSrc(): the 'Banner' additional property is not a string!");
                }
            }
            else {
                // No banners are declared anywhere in game setup so there's no real point looking.
                console.warn("model-mp-staging-new: ageBannerSrc(): no 'Banner' are declared in game setup!");
            }
        }
        else {
            console.warn("model-mp-staging-new: ageBannerSrc(): ageParameter is null!");
        }
        return `fs://game/${bannerSrc}`;
    }
    get difficulty() {
        const gameConfig = Configuration.getGame();
        return (gameConfig.difficultyName ?? "?");
    }
    get playerCounters() {
        const { humanPlayerCount, maxJoinablePlayerCount } = Configuration.getGame();
        return Locale.compose('LOC_UI_MP_LOBBY_PLAYERS', `${humanPlayerCount}`, `${maxJoinablePlayerCount}`);
    }
    get isUsingGlobalCountdown() {
        // Hot joiners do not use the global countdown.
        if (Network.isPlayerHotJoining(GameContext.localPlayerID)) {
            return false;
        }
        // Only matchmaker games use the global countdown.
        const gameConfig = Configuration.getGame();
        if (!gameConfig.isMatchMaking) {
            return false;
        }
        return true;
    }
    get isKickOptionHidden() {
        return !Configuration.getGame().isKickVoting && Network.getHostPlayerId() != GameContext.localPlayerID;
    }
    get lobbyPlayersData() {
        return this.playersData;
    }
    addVoteDialogBox(kickPlayerID, dialogBoxID) {
        if (this.voteDialogBoxIDPerKickPlayerID.has(kickPlayerID)) {
            console.error("model-mp-staging-new: addVoteDialogBox(): There is already a Vote dialog box for that player! " + kickPlayerID);
            return;
        }
        this.voteDialogBoxIDPerKickPlayerID.set(kickPlayerID, dialogBoxID);
    }
    removeVoteDialogBox(kickPlayerID) {
        if (!this.voteDialogBoxIDPerKickPlayerID.has(kickPlayerID)) {
            console.warn("model-mp-staging-new: removeVoteDialogBox(): There is none Vote dialog box for that player. " + kickPlayerID);
            return;
        }
        this.voteDialogBoxIDPerKickPlayerID.delete(kickPlayerID);
    }
    kick(kickPlayerID) {
        // Starting a Kick (both Kick Vote and Direct Kick modes)
        // It is assumed the target can be kicked here.
        const gameConfig = Configuration.getGame();
        const isKickVote = gameConfig.isKickVoting; // Kick Vote (true) or Direct Kick mode?
        const dialogCallback = (eAction) => {
            if (eAction == DialogBoxAction.Confirm) {
                if (isKickVote) {
                    const yesVote = true; // vote to kick the target player
                    Network.kickVotePlayer(kickPlayerID, yesVote, KickVoteReasonType.KICKVOTE_NONE);
                    this.kickTimerReference = window.setTimeout(this.kickTimerListener, MPLobbyDataModel.KICK_VOTE_COOLDOWN);
                    this.kickVoteLockout = true;
                }
                else {
                    Network.directKickPlayer(kickPlayerID);
                }
            }
            // Else: Kick was given up
        };
        if (this.kickVoteLockout) {
            DialogManager.createDialog_Confirm({
                body: "LOC_KICK_DIALOG_TIMEOUT",
                title: "LOC_KICK_DIALOG_TITLE"
            });
        }
        else {
            const kickPlayerConfig = Configuration.getPlayer(kickPlayerID);
            const kickPlayerName = Locale.compose(kickPlayerConfig.slotName);
            const dialogBoxID = DialogManager.createDialog_ConfirmCancel({
                body: Locale.compose(isKickVote ? "LOC_KICK_VOTE_CONFIRM_DIALOG" : "LOC_DIRECT_KICK_CONFIRM_DIALOG", kickPlayerName),
                title: "LOC_KICK_DIALOG_TITLE",
                callback: dialogCallback
            });
            this.addVoteDialogBox(kickPlayerID, dialogBoxID);
        }
    }
    mute(mutePlayerID, mute) {
        // It is assumed the target can be muted here.
        Network.setPlayerMuted(mutePlayerID, mute);
        engine.trigger('staging-mute-changed');
    }
    /**
     * Singleton accessor
     */
    static getInstance() {
        if (!MPLobbyDataModel.instance) {
            MPLobbyDataModel.instance = new MPLobbyDataModel();
        }
        return MPLobbyDataModel.instance;
    }
    set updateCallback(callback) {
        this.onUpdate = callback;
    }
    constructor() {
        this.playersData = [];
        this.allReadyCountdownRemainingSeconds = 0;
        this.allReadyCountdownRemainingPercentage = 0;
        this.readyButtonCaption = "";
        this.SMALL_SCREEN_MODE_MAX_HEIGHT = 900;
        this.SMALL_SCREEN_MODE_MAX_WIDTH = 1700;
        this.readyStatus = MPLobbyReadyStatus.INIT;
        this.allReadyCountdownIntervalHandle = 0;
        this.startGameRemainingTime = MPLobbyDataModel.ALL_READY_COUNTDOWN;
        /* Cache the participating player count on each update() to avoid hammering
        the calculation every time we call canChangeSlotStatus(). */
        this.participatingCount = 0;
        this.kickTimerListener = this.kickTimerExpired.bind(this);
        this.kickTimerReference = 0;
        this.kickVoteLockout = false;
        this.globalCountdownRemainingSeconds = 0;
        this.globalCountdownIntervalHandle = 0;
        this.PlayerLeaderStringHandle = GameSetup.makeString('PlayerLeader');
        this.PlayerCivilizationStringHandle = GameSetup.makeString('PlayerCivilization');
        this.PlayerTeamStringHandle = GameSetup.makeString('PlayerTeam');
        this.MapSizeStringHandle = GameSetup.makeString('MapSize');
        this.GameSpeedsStringHandle = GameSetup.makeString('GameSpeeds');
        this.RulesetStringHandle = GameSetup.makeString('Ruleset');
        this.AgeStringHandle = GameSetup.makeString('Age');
        this.PlayerMementoMajorSlotStringHandle = GameSetup.makeString('PlayerMementoMajorSlot');
        this.PlayerMementoMinorSlot1StringHandle = GameSetup.makeString('PlayerMementoMinorSlot1');
        // Memoize leader civilization bias data.
        this.cacheLeaderCivilizationBias = new Map();
        // Memoize the parameters rather than fetch them from C++ each time (which duplicates data).
        this.playerParameterCache = new Map();
        this.gameParameterCache = new Map();
        // Cache tooltip strings.  In the case of civilization tooltips, just cache a fragment that will be combined with leader bias.
        this.cachedCivilizationTooltipFragments = new Map();
        this.cachedLeaderTooltips = new Map();
        this.dropdownCallbacks = new Map([
            [MPLobbyDropdownType.TEAM, this.onTeamDropdown.bind(this)],
            [MPLobbyDropdownType.PLAYER_PARAM, this.onPlayerParamDropdown.bind(this)],
            [MPLobbyDropdownType.SLOT_ACTION, this.onSlotActionDropdown.bind(this)],
        ]);
        this.voteDialogBoxIDPerKickPlayerID = new Map();
        this.changeSlotStatusShowCheckCallback = (playerID, actionOption) => { return this.canChangeSlotStatus(playerID, actionOption); };
        this.swapShowCheckCallback = (playerID, _actionOption) => { return this.canSwap(playerID); };
        this.viewProfileCheckCallback = (playerID, _actionOption) => { return Online.Social.canViewProfileWithLobbyPlayerId(playerID); };
        this.slotActionsData = new Map([
            [MPLobbySlotActionType.VIEW, { actionType: MPLobbySlotActionType.VIEW, displayName: Locale.compose("LOC_UI_MP_PLAYER_OPTIONS_VIEW_PROFILE"), showCheckCallback: this.viewProfileCheckCallback }],
            [MPLobbySlotActionType.OPEN, { actionType: MPLobbySlotActionType.OPEN, displayName: Locale.compose("LOC_SLOT_ACTION_OPEN"), showCheckCallback: this.changeSlotStatusShowCheckCallback, slotStatus: SlotStatus.SS_OPEN }],
            [MPLobbySlotActionType.CLOSE, { actionType: MPLobbySlotActionType.CLOSE, displayName: Locale.compose("LOC_SLOT_ACTION_CLOSE"), showCheckCallback: this.changeSlotStatusShowCheckCallback, slotStatus: SlotStatus.SS_CLOSED }],
            [MPLobbySlotActionType.AI, { actionType: MPLobbySlotActionType.AI, displayName: Locale.compose("LOC_SLOT_ACTION_AI"), showCheckCallback: this.changeSlotStatusShowCheckCallback, slotStatus: SlotStatus.SS_COMPUTER }],
            [MPLobbySlotActionType.SWAP, { actionType: MPLobbySlotActionType.SWAP, displayName: Locale.compose("LOC_SLOT_ACTION_SWAP_REQUEST"), showCheckCallback: this.swapShowCheckCallback }],
        ]);
        this.leaderData = getLeaderData();
        this.civData = GetCivilizationData();
        this.civIconURLGetter = (id, showLockIcon) => {
            if (showLockIcon) {
                return "fs://game/core/mp_locked.png";
            }
            const civId = id.value;
            return UI.getIconURL(civId == "RANDOM" ? "CIVILIZATION_RANDOM" : civId, "");
        };
        this.leaderIconURLGetter = (id, showLockIcon) => {
            if (showLockIcon) {
                return "fs://game/core/mp_locked.png";
            }
            const leaderId = GameSetup.resolveString(id.icon) ?? "";
            const iconURL = UI.getIconURL(leaderId, "CIRCLE_MASK");
            return iconURL;
        };
        engine.whenReady.then(() => {
            this.setupListeners();
            this.initialize();
            this.update();
        });
    }
    /**
     * isHostPlayer
     * @param playerId
     * @returns if a given player is the host
     */
    static isHostPlayer(playerId) {
        return playerId == Network.getHostPlayerId();
    }
    /**
     * isLocalPlayer
     * @param playerId
     * @returns if a given player is local
     */
    static isLocalPlayer(playerId) {
        return playerId == GameContext.localPlayerID;
    }
    /**
     * isLocalHostPlayer
     * @returns if our own player is the (local) host
     */
    static isLocalHostPlayer() {
        return Network.getHostPlayerId() == GameContext.localPlayerID;
    }
    static get isNewGame() {
        const gameConfig = Configuration.getGame();
        return gameConfig.gameState == GameStateTypes.GAMESTATE_PREGAME; // note that it is NOT true when loading a game (GAMESTATE_LOAD_PREGAME)
    }
    findPlayerParameter(player, paramName) {
        let cache = this.playerParameterCache.get(player);
        if (cache == null) {
            cache = new Map();
            this.playerParameterCache.set(player, cache);
        }
        let param = cache.get(paramName);
        if (param) {
            return param;
        }
        else {
            let p = GameSetup.findPlayerParameter(player, paramName);
            if (p) {
                cache.set(paramName, p);
                return p;
            }
        }
        return null;
    }
    findGameParameter(paramName) {
        let param = this.gameParameterCache.get(paramName);
        if (param) {
            return param;
        }
        else {
            let p = GameSetup.findGameParameter(paramName);
            if (p) {
                this.gameParameterCache.set(paramName, p);
                return p;
            }
        }
        return null;
    }
    initialize() {
        const civBiasData = Database.query('config', 'SELECT CivilizationType, LeaderType, ReasonType FROM LeaderCivilizationBias');
        if (civBiasData) {
            for (let row of civBiasData) {
                const civilizationType = row[0];
                const leaderType = row[1];
                const reason = row[2];
                let leaderCache = this.cacheLeaderCivilizationBias.get(leaderType);
                if (leaderCache == null) {
                    leaderCache = new Map();
                    this.cacheLeaderCivilizationBias.set(leaderType, leaderCache);
                }
                leaderCache.set(civilizationType, reason);
            }
        }
    }
    update() {
        this.playersData.length = 0;
        this.localPlayerData = undefined;
        this.playerParameterCache.clear();
        this.gameParameterCache.clear();
        const localPlatform = Network.getLocalHostingPlatform();
        if (MultiplayerShellManager.unitTestMP) {
            this.pushDummyPlayersData();
        }
        else {
            const numPlayers = Configuration.getMap().maxMajorPlayers;
            const gameConfig = Configuration.getGame();
            //Cache the participating player count for later use.
            const bFullCivsOnly = true;
            const bAliveCivsOnly = true;
            const bUnlockedCivsOnly = true;
            const bCanBeHumanOnly = true;
            this.participatingCount = gameConfig.getParticipatingPlayerCount(bFullCivsOnly, !bAliveCivsOnly, !bUnlockedCivsOnly, bCanBeHumanOnly);
            const isKickVote = gameConfig.isKickVoting; // Kick Vote (true) or Direct Kick mode?
            const canLocalPlayerEverKick = ((isKickVote && Network.canPlayerEverKickVote(GameContext.localPlayerID)) // Kick Vote conditions
                || (!isKickVote && Network.canPlayerEverDirectKick(GameContext.localPlayerID))); // Direct Kick conditions
            for (let curPlayerID = 0; curPlayerID < numPlayers; curPlayerID++) {
                const playerConfig = Configuration.getPlayer(curPlayerID);
                // Not Full Civ participants (like city states and tribes) are skipped (neither editable nor swapable) when the game has already begun
                if (!MPLobbyDataModel.isNewGame
                    && playerConfig.isParticipant
                    && playerConfig.civilizationLevelTypeID != CivilizationLevelTypes.CIVILIZATION_LEVEL_FULL_CIV) {
                    continue;
                }
                // Don't show dead players. Human controlled dead players should have disconnected as soon as they clicked thru
                // their end game screen.
                if (playerConfig.isParticipant && !playerConfig.isAlive) {
                    continue;
                }
                const isParticipant = playerConfig.isParticipant;
                const isHost = MPLobbyDataModel.isHostPlayer(curPlayerID);
                const isLocal = MPLobbyDataModel.isLocalPlayer(curPlayerID);
                // Host / Locked / Local player status icon
                let statusIcon = "none";
                let statusIconTooltip = "";
                if (isHost) {
                    statusIcon = "fs://game/core/mpicon_host.png";
                    statusIconTooltip = Locale.compose("LOC_UI_MP_HOST");
                }
                else if (playerConfig.isLocked) {
                    statusIcon = "fs://game/core/mp_locked.png";
                    statusIconTooltip = Locale.compose("LOC_UI_MP_LOCKED_PLAYER");
                }
                else if (!playerConfig.canBeHuman) {
                    statusIcon = "fs://game/core/mp_locked.png";
                    statusIconTooltip = Locale.compose("LOC_UI_MP_CANT_BE_HUMAN");
                }
                else if (isLocal) {
                    statusIcon = "fs://game/core/mpicon_localplayer.png";
                    statusIconTooltip = Locale.compose("LOC_UI_MP_LOCAL_PLAYER");
                }
                // Ready
                const isReady = Network.isPlayerStartReady(curPlayerID);
                const isHuman = playerConfig.isHuman || playerConfig.isObserver; // slots taken by humans or observer slots
                const isDistantHuman = (!isLocal && isHuman);
                // Platform icon
                let platformIcon = "none";
                let platformIconTooltip = "";
                const curPlatform = Network.getPlayerHostingPlatform(curPlayerID);
                if (isHuman) {
                    let tempIcon = NetworkUtilities.getHostingTypeURL(curPlatform);
                    if (tempIcon) {
                        platformIcon = tempIcon;
                    }
                    let tempTooltip = NetworkUtilities.getHostingTypeTooltip(curPlatform);
                    if (tempTooltip) {
                        platformIconTooltip = tempTooltip;
                    }
                }
                // Leader portrait
                // we have Player Options only on human players that are not ourselves so isDistantHuman will be checked to choose the leader portrait version (a button or a simple div)
                let leaderPortrait = "";
                if (playerConfig.isParticipant && playerConfig.leaderTypeName) {
                    leaderPortrait = playerConfig.leaderTypeName != "RANDOM" ? playerConfig.leaderTypeName : "UNKNOWN_LEADER";
                }
                let leaderName = "";
                let civName = "";
                if (playerConfig.isParticipant
                    && playerConfig.leaderTypeName
                    && playerConfig.civilizationTypeName) {
                    leaderName = playerConfig.leaderTypeName;
                    civName = playerConfig.civilizationTypeName;
                }
                // Dropdowns
                let playerInfoDropdown = null;
                let civilizationDropdown = null;
                let teamDropdown = null;
                let leaderDropdown = null;
                let mementos = [];
                const localPlayerReady = Network.isPlayerStartReady(GameContext.localPlayerID);
                const isLocalPlayerHost = MPLobbyDataModel.isHostPlayer(GameContext.localPlayerID);
                const gamertag = Locale.stylize(playerConfig.slotName);
                const twoKName = playerConfig.nickName_T2GP;
                const firstPartyName = playerConfig.nickName_1P;
                const isPlayerInfoSlotDisabled = localPlayerReady || !isLocalPlayerHost && [SlotStatus.SS_CLOSED, SlotStatus.SS_OPEN].includes(playerConfig.slotStatus) || isLocal;
                const lobbyPlayerConnectionStatus = this.GetMPLobbyPlayerConnectionStatus(playerConfig);
                playerInfoDropdown = this.createSlotActionsDropdown(curPlayerID, gamertag, isPlayerInfoSlotDisabled, lobbyPlayerConnectionStatus);
                if (playerConfig.isParticipant) {
                    const canEditSlot = !localPlayerReady // no more edition allowed when ready
                        && (isLocal // we can edit our own slot...
                            || (playerConfig.isAI && MPLobbyDataModel.isLocalHostPlayer())); // ... OR an AI one but only if we are the host
                    // Can we edit stuff that we should only be able to edit during the pregame?
                    const canEditSlot_PreGame = canEditSlot && MPLobbyDataModel.isNewGame;
                    // Can we edit stuff that we should only edit during age transitions or the pregame?
                    const canEditSlot_AgeTrans = canEditSlot
                        && (Modding.getTransitionInProgress() == TransitionType.Age
                            || MPLobbyDataModel.isNewGame);
                    civilizationDropdown = this.createPlayerParamDropdown(curPlayerID, 'civ_selector_0', PlayerParamDropdownTypes.PLAYER_CIV, PlayerParamDropdownTypes.PLAYER_CIV, Locale.compose("LOC_UI_MP_LOBBY_DROPDOWN_CIV_DESC"), this.PlayerCivilizationStringHandle, !canEditSlot_AgeTrans, false, this.civIconURLGetter);
                    teamDropdown = this.createTeamParamDropdown(curPlayerID, 'team_selector_0', PlayerParamDropdownTypes.PLAYER_TEAM, PlayerParamDropdownTypes.PLAYER_TEAM, Locale.compose("LOC_UI_MP_LOBBY_DROPDOWN_TEAM_DESC"), this.PlayerTeamStringHandle, !canEditSlot_AgeTrans, true);
                    leaderDropdown = this.createPlayerParamDropdown(curPlayerID, 'leader_selector_0', PlayerParamDropdownTypes.PLAYER_LEADER, PlayerParamDropdownTypes.PLAYER_LEADER, Locale.compose("LOC_UI_MP_LOBBY_DROPDOWN_LEADER_DESC"), this.PlayerLeaderStringHandle, !canEditSlot_PreGame, true, this.leaderIconURLGetter);
                    if (gameConfig.isMementosEnabled && isHuman) {
                        mementos = [
                            this.findPlayerParameter(curPlayerID, this.PlayerMementoMajorSlotStringHandle)?.value.value,
                            this.findPlayerParameter(curPlayerID, this.PlayerMementoMinorSlot1StringHandle)?.value.value,
                        ];
                    }
                }
                const isConnected = Network.isPlayerConnected(curPlayerID);
                // Kick
                const isKickVoteTarget = (isKickVote && Network.isKickVoteTarget(curPlayerID));
                const canEverBeKicked = canLocalPlayerEverKick && Network.canEverKickPlayer(curPlayerID);
                const canBeKickedNow = canEverBeKicked
                    && ((isKickVote && Network.canKickVotePlayerNow(curPlayerID) && !isKickVoteTarget) // Kick Vote conditions
                        || (!isKickVote && Network.canDirectKickPlayerNow(curPlayerID))); // Direct Kick conditions
                const kickTooltip = (canEverBeKicked
                    ? (Locale.compose(canBeKickedNow
                        ? "LOC_SLOT_ACTION_KICK_PLAYER"
                        : "LOC_SLOT_ACTION_KICK_PLAYER_DISABLED"))
                    : "");
                // TODO BVHR https://2kfxs.atlassian.net/browse/IGP-60970 [model-mp-staging-new.ts][TODO] Upgrading The Kick Button Tooltip
                /** TODO? Kick tooltip rework
                 * - A distinct tooltip for Kick Vote versus Direct Kick?
                 * - To give the precise reason why the option is visible but disabled?
                 * 		- if we are the Kick Vote target
                 *      - other reason
                 */
                // Mute
                const isMuted = Network.isPlayerMuted(curPlayerID);
                // Reminder: can be muted <-> is a distant human
                const muteTooltip = isDistantHuman
                    ? Locale.compose(isMuted
                        ? "LOC_SLOT_ACTION_UNMUTE"
                        : "LOC_SLOT_ACTION_MUTE")
                    : "";
                const curFriendId = Network.supportsSSO() ? Online.Social.getPlayerFriendID_T2GP(curPlayerID) : Online.Social.getPlayerFriendID_Network(curPlayerID);
                const playerInfo = curFriendId ? getPlayerCardInfo(isLocal ? undefined : curFriendId, isLocal ? undefined : twoKName, true) : undefined;
                let backgroundURL = "";
                let badgeURL = "";
                let foundationLevel = 0;
                let playerTitle = "";
                if (playerInfo) {
                    backgroundURL = playerInfo.BackgroundURL;
                    badgeURL = playerInfo.BadgeURL;
                    foundationLevel = playerInfo.FoundationLevel;
                    playerTitle = playerInfo.playerTitle;
                }
                const samePlatformAsLocalPlayer = curPlatform == localPlatform;
                const playerData = {
                    playerID: curPlayerID.toString(),
                    isParticipant: isParticipant,
                    isHost: isHost,
                    isLocal: isLocal,
                    statusIcon: statusIcon,
                    statusIconTooltip: statusIconTooltip,
                    isReady: isReady,
                    platformIcon: platformIcon,
                    platformIconTooltip: platformIconTooltip,
                    leaderPortrait: leaderPortrait,
                    leaderName: leaderName,
                    foundationLevel: foundationLevel,
                    badgeURL: badgeURL,
                    backgroundURL: backgroundURL,
                    playerTitle: playerTitle,
                    civName: civName,
                    gamertag: gamertag,
                    firstPartyName: firstPartyName,
                    twoKName: twoKName,
                    playerInfoDropdown: playerInfoDropdown,
                    civilizationDropdown: civilizationDropdown,
                    teamDropdown: teamDropdown,
                    leaderDropdown: leaderDropdown,
                    mementos: mementos,
                    isHuman: isHuman,
                    isDistantHuman: isDistantHuman,
                    isConnected: isConnected,
                    canEverBeKicked: canEverBeKicked,
                    canBeKickedNow: canBeKickedNow,
                    kickTooltip: kickTooltip,
                    isKickVoteTarget: isKickVoteTarget,
                    isMuted: isMuted,
                    muteTooltip: muteTooltip,
                    samePlatformAsLocalPlayer: samePlatformAsLocalPlayer
                };
                this.playersData.push(playerData);
            }
            this.localPlayerData = this.playersData.find(({ isLocal }) => isLocal);
        }
        // Update the ready button status for the local player.
        // This has to be done after the update player loop as playersData needs 
        // to be fully populated for updateReadyButtonData to check player start ready status.
        this.updateReadyButtonData(GameContext.localPlayerID);
        if (this.onUpdate) {
            this.onUpdate(this);
        }
        window.dispatchEvent(new LobbyUpdateEvent());
    }
    stringify(player) {
        return JSON.stringify(player);
    }
    GetMPLobbyPlayerConnectionStatus(playerConfig) {
        return !Network.isPlayerConnected(playerConfig.id) && !playerConfig.isAI ? MPLobbyPlayerConnectionStatus.DISCONNECTED : MPLobbyPlayerConnectionStatus.CONNECTED;
    }
    formatDateToMinutes(seconds) {
        const date = new Date(seconds * 1000);
        // Format: "00:00"
        // .slice(-2) gives us the last two characters of the string so no matter if the number has 1 or more digits, we can add "0"
        // 9  -> "09"  --> "09"
        // 10 -> "010" --> "10"
        return ('0' + date.getMinutes()).slice(-2) + ':' + ('0' + date.getSeconds()).slice(-2);
    }
    getTooltip(paramNameHandle, paramID, playerID) {
        switch (paramNameHandle) {
            case this.PlayerCivilizationStringHandle:
                return this.getCivilizationTooltip(paramID, playerID);
            case this.PlayerLeaderStringHandle:
                return this.getLeaderTooltip(paramID);
        }
        return;
    }
    getCivilizationTooltip(civilizationType, playerID) {
        let tt = this.cachedCivilizationTooltipFragments.get(civilizationType);
        if (tt == null) {
            const civData = this.civData.find(data => {
                return data.civID == civilizationType;
            });
            if (!civData) {
                console.error(`model-map-staging-new: Failed to find civData for ${civilizationType}`);
                return;
            }
            tt = `
			[STYLE:text-secondary][STYLE:font-title-lg]${Locale.compose(civData.name)}[/S][/S][N]
			${civData.tags && civData.tags.length > 0 ? `[N][B]${Locale.compose(civData.tags.join(", "))}[/B]` : ""}
			${civData.description && civData.description != "" ? `[N]${Locale.compose(civData.description)}` : ""}
			${civData.bonuses && civData.bonuses.length > 0 ? `[N][STYLE:text-secondary][STYLE:font-title-base]${Locale.compose("LOC_CREATE_CIV_UNIQUE_BONUSES_SUBTITLE")}[/S][/S]
				[N]${civData.bonuses.map((bonus) => { return Locale.compose(bonus.description); }).join("[N]")}` : ""}
			`;
            this.cachedCivilizationTooltipFragments.set(civilizationType, tt);
        }
        let civLeaderReasonType = "";
        const leaderParam = this.findPlayerParameter(playerID, this.PlayerLeaderStringHandle);
        if (leaderParam) {
            const leaderType = leaderParam.value.value;
            const leaderCache = this.cacheLeaderCivilizationBias.get(leaderType);
            if (leaderCache) {
                const reason = leaderCache.get(civilizationType);
                if (reason) {
                    civLeaderReasonType = `[N]${Locale.compose(reason)}`;
                }
            }
        }
        else {
            console.error(`model-map-staging-new: Couldn't find Leader Parameters for player with ID: ${playerID}`);
        }
        return tt + civLeaderReasonType;
    }
    getLeaderTooltip(leaderType) {
        let tt = this.cachedLeaderTooltips.get(leaderType);
        if (tt == null) {
            const leaderData = this.leaderData.find(data => {
                return data.leaderID == leaderType;
            });
            if (!leaderData) {
                console.error(`model-map-staging-new: Failed to find leaderData for ${leaderType}`);
                return;
            }
            tt = `
			[STYLE:text-secondary][STYLE:font-title-lg]${Locale.compose(leaderData.name)}[/S][/S]
			${leaderData.tags ? `[N]${leaderData.tags.map(tag => `[B]${Locale.compose(tag)}[/B]`).join(', ')}` : ""}
			${leaderData.description ? `[N]${Locale.compose(leaderData.description)}` : ""}
			`;
            this.cachedLeaderTooltips.set(leaderType, tt);
        }
        return tt;
    }
    updateStartingGameReadyButtonData(totalCountdown, remainingTime, skipUpdate = false) {
        this.allReadyCountdownRemainingSeconds = Math.round(remainingTime / 1000);
        this.allReadyCountdownRemainingPercentage = remainingTime / totalCountdown * 100;
        this.readyButtonCaption = Locale.compose("LOC_UI_MP_LOBBY_READY_BUTTON_STARTING_GAME");
        // TODO BVHR https://2kfxs.atlassian.net/browse/IGP-60974 [mp-staging-new.ts][TODO] 3 TODOs: leaderIcon, 'bg-color' | display a text distinct from the readyButton.caption | display a (decreasing) gauge
        if (!skipUpdate && this.onUpdate) {
            this.onUpdate(this);
        }
    }
    updateGlobalCountdownRemainingSecondsData(remainingTime, skipUpdate = false) {
        this.globalCountdownRemainingSeconds = Math.round(remainingTime / 1000);
        if (!skipUpdate && this.onUpdate) {
            this.onUpdate(this);
        }
    }
    getRemainingGlobalCountdown() {
        return MPLobbyDataModel.GLOBAL_COUNTDOWN - (Network.getSecondsSinceSessionCreation() * 1000);
    }
    cancelGlobalCountdown() {
        // cancel both kinds of countdowns
        clearInterval(this.globalCountdownIntervalHandle);
        clearInterval(this.allReadyCountdownIntervalHandle);
        this.globalCountdownRemainingSeconds = 0;
    }
    updateGlobalCountdownData() {
        clearInterval(this.globalCountdownIntervalHandle); // reset previous countdown if any
        this.globalCountdownRemainingSeconds = 0; // reset
        if (!this.isUsingGlobalCountdown) {
            // not using the global countdown, we don't want to start the interval checking.
            return;
        }
        const skipUpdate = true; // already handled in update() here
        this.updateGlobalCountdownRemainingSecondsData(this.getRemainingGlobalCountdown(), skipUpdate);
        this.globalCountdownIntervalHandle = setInterval(() => {
            const remainingTime = this.getRemainingGlobalCountdown();
            if (remainingTime <= 0) {
                this.updateGlobalCountdownRemainingSecondsData(0);
                clearInterval(this.globalCountdownIntervalHandle);
                // Set the player to StartReady so they can't make any more changes and that all players
                // will be StartReady when the game launches.
                if (!Network.isPlayerStartReady(GameContext.localPlayerID)) {
                    Network.toggleLocalPlayerStartReady();
                }
                Audio.playSound("data-audio-timer-final-tick", "multiplayer-lobby");
                // Forces the start of the All Ready countdown (which leads to the start of the game)
                this.updateReadyButtonData(GameContext.localPlayerID, MPLobbyReadyStatus.STARTING_GAME);
            }
            else {
                Audio.playSound("data-audio-timer-tick", "multiplayer-lobby");
                this.updateGlobalCountdownRemainingSecondsData(remainingTime);
            }
        }, MPLobbyDataModel.GLOBAL_COUNTDOWN_STEP);
    }
    updateTooltipData() {
        this.civData = GetCivilizationData();
    }
    areAllPlayersReady() {
        let allReady = true;
        this.playersData.forEach(playerData => {
            if (playerData.isHuman
                && (!Network.isPlayerStartReady(parseInt(playerData.playerID))
                    || !Network.isPlayerModReady(parseInt(playerData.playerID)))) {
                allReady = false;
                return;
            }
        });
        return allReady;
    }
    getReadyStatus(localPlayerId) {
        let readyStatus = MPLobbyReadyStatus.NOT_READY;
        if (Network.isPlayerStartReady(localPlayerId)) {
            // In case of hot joining, the launching of the game is dictated by the NetSnapshot message
            // We don't want to show a timer in that case, because the time to launch depends on how fast 
            // the host loads and it's not cancellable
            if (Network.isPlayerHotJoining(GameContext.localPlayerID)) {
                return MPLobbyReadyStatus.WAITING_FOR_HOST;
            }
            const allReady = this.areAllPlayersReady();
            if (allReady) {
                if (this.startGameRemainingTime <= 0 && !MPLobbyDataModel.isLocalHostPlayer()) {
                    readyStatus = MPLobbyReadyStatus.WAITING_FOR_HOST;
                }
                else {
                    readyStatus = MPLobbyReadyStatus.STARTING_GAME;
                }
            }
            else {
                readyStatus = MPLobbyReadyStatus.WAITING_FOR_OTHERS;
            }
        }
        return readyStatus;
    }
    updateReadyButtonData(localPlayerId, forcedStatus) {
        const newReadyStatus = forcedStatus ?? this.getReadyStatus(localPlayerId);
        if (this.readyStatus === newReadyStatus) {
            // Nothing to do since the status hasn't changed
            return;
        }
        this.readyStatus = newReadyStatus;
        clearInterval(this.allReadyCountdownIntervalHandle); // reset previous countdown if any
        if (![MPLobbyReadyStatus.WAITING_FOR_HOST, MPLobbyReadyStatus.STARTING_GAME].includes(this.readyStatus)) {
            this.allReadyCountdownRemainingSeconds = 0; // reset
            this.allReadyCountdownRemainingPercentage = 0; // reset
            this.startGameRemainingTime = MPLobbyDataModel.ALL_READY_COUNTDOWN; // reset
        }
        switch (this.readyStatus) {
            case MPLobbyReadyStatus.NOT_READY:
                if (window.innerHeight <= MPLobbyModel.SMALL_SCREEN_MODE_MAX_HEIGHT && UI.getViewExperience() == UIViewExperience.Mobile) {
                    this.readyButtonCaption = "";
                }
                else {
                    this.readyButtonCaption = Locale.compose("LOC_UI_MP_LOBBY_READY_BUTTON_NOT_READY");
                }
                break;
            case MPLobbyReadyStatus.WAITING_FOR_OTHERS:
                this.readyButtonCaption = Locale.compose("LOC_UI_MP_LOBBY_READY_BUTTON_WAITING_FOR_OTHERS");
                break;
            case MPLobbyReadyStatus.STARTING_GAME: {
                const skipUpdate = true; // already handled in update() here
                this.updateStartingGameReadyButtonData(MPLobbyDataModel.ALL_READY_COUNTDOWN, this.startGameRemainingTime, skipUpdate);
                this.allReadyCountdownIntervalHandle = setInterval(() => {
                    this.startGameRemainingTime -= MPLobbyDataModel.ALL_READY_COUNTDOWN_STEP;
                    if (this.startGameRemainingTime <= 0) {
                        this.updateStartingGameReadyButtonData(MPLobbyDataModel.ALL_READY_COUNTDOWN, 0);
                        clearInterval(this.allReadyCountdownIntervalHandle);
                        if (MPLobbyDataModel.isLocalHostPlayer()) {
                            Network.startGame();
                        }
                        setTimeout(() => {
                            this.updateReadyButtonData(GameContext.localPlayerID, MPLobbyReadyStatus.WAITING_FOR_HOST);
                            if (this.onUpdate) {
                                this.onUpdate(this);
                            }
                        }, 1000);
                        Audio.playSound("data-audio-timer-final-tick", "multiplayer-lobby");
                    }
                    else {
                        this.updateStartingGameReadyButtonData(MPLobbyDataModel.ALL_READY_COUNTDOWN, this.startGameRemainingTime);
                        Audio.playSound("data-audio-timer-tick", "multiplayer-lobby");
                    }
                }, MPLobbyDataModel.ALL_READY_COUNTDOWN_STEP);
                break;
            }
            case MPLobbyReadyStatus.WAITING_FOR_HOST:
                this.readyButtonCaption = Locale.compose("LOC_MP_JOINING_GAME_BODY");
                break;
            default:
                console.error("model-mp-staging-new: updateReadyButtonData(): Invalid this.readyStatus");
                break;
        }
    }
    createPlayerParamDropdown(playerID, dropID, type, dropLabel, dropDesc, paramNameHandle, isDisabled, showLabelOnSelectedItem, getIconURLFunc) {
        const dropdownData = new MPLobbyDropdownOptionData();
        dropdownData.dropdownType = MPLobbyDropdownType.PLAYER_PARAM;
        dropdownData.id = dropID;
        dropdownData.type = type;
        dropdownData.label = dropLabel;
        dropdownData.description = dropDesc;
        dropdownData.isDisabled = isDisabled;
        dropdownData.showLabelOnSelectedItem = showLabelOnSelectedItem;
        dropdownData.playerParamName = GameSetup.resolveString(paramNameHandle) ?? undefined;
        const playerParamsData = [];
        const playerParameter = this.findPlayerParameter(playerID, paramNameHandle);
        if (playerParameter) {
            playerParameter.domain.possibleValues?.forEach((v) => {
                if (v.invalidReason != GameSetupDomainValueInvalidReason.NotValid) {
                    const paramID = v.value?.toString();
                    const nameKey = GameSetup.resolveString(v.name);
                    const locked = v.invalidReason != GameSetupDomainValueInvalidReason.Valid;
                    const notOwned = v.invalidReason == GameSetupDomainValueInvalidReason.NotValidOwnership;
                    const showLockIcon = v.invalidReason == GameSetupDomainValueInvalidReason.NotValidOwnership && (MPLobbyDataModel.isLocalPlayer(playerID) || MPLobbyDataModel.isLocalHostPlayer() && Configuration.getPlayer(playerID).isAI);
                    const iconURL = getIconURLFunc ? getIconURLFunc(v, showLockIcon) : "";
                    // special case for leader live event
                    if (LiveEventManager.restrictToPreferredCivs()) {
                        if (paramNameHandle == this.PlayerLeaderStringHandle && paramID == "RANDOM") {
                            return; // don't show random for restricted leader-civs case
                        }
                        if (paramNameHandle == this.PlayerCivilizationStringHandle) {
                            const currentLeaderID = this.findPlayerParameter(playerID, this.PlayerLeaderStringHandle)?.value?.value;
                            const civLeaderPairingData = (Database.query('config', 'select * from LeaderCivParings') ?? []);
                            const civFixed = civLeaderPairingData.find(row => row.LeaderType == currentLeaderID);
                            const civID = civFixed?.CivilizationType ?? '';
                            if (paramID != civID) {
                                return; // to only show the current leader's fixed civ
                            }
                        }
                    }
                    if (paramID != null && nameKey != null) {
                        const showUnownedContent = Configuration.getUser().showUnownedContent;
                        if (showUnownedContent || !notOwned) {
                            playerParamsData.push({ label: Locale.compose(nameKey), paramID: paramID, iconURL: iconURL, tooltip: this.getTooltip(paramNameHandle, paramID, playerID), disabled: locked });
                        }
                    }
                }
            });
            playerParamsData.sort((a, b) => a.paramID == "RANDOM" ? -1 : b.paramID == "RANDOM" ? 1 : Locale.compare(a.label, b.label));
            if (typeof playerParameter.value.value == 'string') {
                dropdownData.selectedItemIndex = playerParamsData.findIndex(({ paramID }) => paramID === playerParameter.value.value);
                dropdownData.selectedItemTooltip = playerParamsData.find(({ paramID }) => paramID === playerParameter.value.value)?.tooltip;
            }
        }
        else {
            console.error("model-mp-staging-new: createPlayerParamDropdown(): Failed to find the paramName: " + GameSetup.resolveString(paramNameHandle) + " for playerID: " + playerID);
        }
        dropdownData.itemList = playerParamsData;
        return dropdownData;
    }
    createTeamParamDropdown(playerID, dropID, type, dropLabel, dropDesc, paramNameHandle, isDisabled, showLabelOnSelectedItem) {
        const dropdownData = new MPLobbyDropdownOptionData();
        dropdownData.dropdownType = MPLobbyDropdownType.TEAM;
        dropdownData.id = dropID;
        dropdownData.type = type;
        dropdownData.label = dropLabel;
        dropdownData.description = dropDesc;
        dropdownData.isDisabled = isDisabled;
        dropdownData.showLabelOnSelectedItem = showLabelOnSelectedItem;
        dropdownData.playerParamName = GameSetup.resolveString(paramNameHandle) ?? undefined;
        const playerParamsData = [];
        playerParamsData.push({ label: "", teamID: -1, tooltip: "LOC_UI_MP_LOBBY_DROPDOWN_TEAM_DESC", disabled: false });
        for (let i = 0; i < 8; i++) {
            playerParamsData.push({ label: Locale.compose("LOC_UI_MP_LOBBY_TEAM", i + 1), teamID: i, tooltip: "LOC_UI_MP_LOBBY_DROPDOWN_TEAM_DESC", disabled: false });
        }
        const playerConfig = Configuration.getPlayer(playerID);
        dropdownData.selectedItemIndex = playerConfig.team + 1; // config returns -1 for no team, 0 for team 1, etc.  We have 0 for no team, 1 for team 1, etc.
        dropdownData.itemList = playerParamsData;
        return dropdownData;
    }
    createSlotActionsDropdown(playerID, gamertag, isDisabled, lobbyPlayerConnectionStatus) {
        const slotActionsData = [{ label: gamertag, slotActionType: MPLobbySlotActionType.NONE }];
        for (let [_actionKey, actionOption] of this.slotActionsData) {
            if (actionOption.showCheckCallback(playerID, actionOption)) {
                slotActionsData.push({ label: actionOption.displayName, slotActionType: actionOption.actionType });
            }
        }
        const dropdownData = new MPLobbyDropdownOptionData();
        dropdownData.dropdownType = MPLobbyDropdownType.SLOT_ACTION;
        dropdownData.id = 'action_selector_0';
        dropdownData.type = PlayerParamDropdownTypes.PLAYER_SLOT_ACTION;
        dropdownData.label = PlayerParamDropdownTypes.PLAYER_SLOT_ACTION;
        dropdownData.description = Locale.compose("LOC_UI_MP_LOBBY_DROPDOWN_ACTION_DESC");
        dropdownData.itemList = slotActionsData;
        dropdownData.selectedItemIndex = 0;
        dropdownData.isDisabled = isDisabled;
        dropdownData.tooltip = lobbyPlayerConnectionStatus == MPLobbyPlayerConnectionStatus.DISCONNECTED ? Locale.compose("LOC_UI_MP_NOT_CONNECTED_TO_LOBBY") : undefined;
        return dropdownData;
    }
    onGameReady() {
        Network.toggleLocalPlayerStartReady();
    }
    setupListeners() {
        engine.on('MultiplayerHostMigrated', this.onMultiplayerHostMigrated, this);
        engine.on('PlayerInfoChanged', this.update, this);
        engine.on('PlayerStartReadyChanged', this.update, this);
        engine.on('MultiplayerJoinGameComplete', this.update, this); //Update Join Code when we join a game.
        engine.on('staging-mute-changed', this.update, this);
        engine.on('KickVoteStarted', this.onKickVoteStarted, this);
        engine.on('KickVoteComplete', this.onKickVoteComplete, this);
        engine.on("DNAUserProfileCacheReady", this.update, this);
        engine.on("UserProfilesUpdated", this.update, this);
        window.addEventListener('user-profile-updated', this.update.bind(this));
    }
    onKickVoteStarted(data) {
        // Voting to a Kick Vote
        this.update();
        if (MPLobbyDataModel.isLocalPlayer(data.kickPlayerID) || MPLobbyDataModel.isLocalPlayer(data.kickerPlayerID)) {
            // Don't show popup if people want to kick us or if we instigated the vote kick
            return;
        }
        const dialogCallback = (eAction) => {
            if (eAction == DialogBoxAction.Confirm
                || eAction == DialogBoxAction.Cancel
                || eAction == DialogBoxAction.Close) {
                Network.kickVotePlayer(data.kickPlayerID, eAction == DialogBoxAction.Confirm, data.kickReason);
            }
            else {
                console.error("model-mp-staging-new: onKickVoteStarted(): Invalid dialog action (" + eAction + ")");
            }
        };
        const kickPlayerConfig = Configuration.getPlayer(data.kickPlayerID);
        const kickPlayerName = Locale.compose(kickPlayerConfig.slotName);
        const kickerPlayerConfig = Configuration.getPlayer(data.kickerPlayerID);
        const kickerPlayerName = Locale.compose(kickerPlayerConfig.slotName);
        const dialogBoxID = DialogManager.createDialog_ConfirmCancel({
            body: Locale.compose("LOC_KICK_VOTE_CHOICE_DIALOG", kickPlayerName, kickerPlayerName),
            title: "LOC_KICK_DIALOG_TITLE",
            callback: dialogCallback
        });
        this.addVoteDialogBox(data.kickPlayerID, dialogBoxID);
    }
    onMultiplayerHostMigrated(_data) {
        if (this.startGameRemainingTime <= 0 && MPLobbyDataModel.isLocalHostPlayer()) {
            Network.startGame();
        }
    }
    onKickVoteComplete(data) {
        if (data.kickResult == KickVoteResultType.KICKVOTERESULT_PENDING) {
            console.log("model-mp-staging-new: onKickVoteComplete(): Vote in progress, not everyone voted yet...");
            // Vote in progress, not everyone voted yet...
            return;
        }
        let voteWasCancelled = false;
        switch (data.kickResult) {
            case KickVoteResultType.KICKVOTERESULT_NOT_ENOUGH_PLAYERS:
            case KickVoteResultType.KICKVOTERESULT_TARGET_INVALID:
            case KickVoteResultType.KICKVOTERESULT_TIME_ELAPSED:
                voteWasCancelled = true;
                break;
            case KickVoteResultType.KICKVOTERESULT_VOTE_PASSED:
            case KickVoteResultType.KICKVOTERESULT_VOTED_NO_KICK:
                break;
            //case KickVoteResultType.KICKVOTERESULT_PENDING is already handled
            default:
                console.error("model-mp-staging-new: onKickVoteComplete(): Unhandled result type: " + data.kickResult);
                break;
        }
        if (voteWasCancelled) {
            // Player didn't vote, we need to force close the Vote dialog box for this kick player ID
            // (but to keep the potential other vote dialog boxes)
            const dialogBoxID = this.voteDialogBoxIDPerKickPlayerID.get(data.kickPlayerID);
            if (!dialogBoxID) {
                console.error("model-mp-staging-new: onKickVoteComplete(): No dialog box found for kick vote player ID: " + data.kickPlayerID);
            }
            else {
                DialogManager.closeDialogBox(dialogBoxID);
            }
        }
        this.removeVoteDialogBox(data.kickPlayerID);
        this.update();
    }
    kickTimerExpired() {
        window.clearTimeout(this.kickTimerReference);
        this.kickVoteLockout = false;
    }
    pushDummyPlayersData() {
        const kickTooltip = Locale.compose("LOC_SLOT_ACTION_KICK_PLAYER");
        const muteTooltip = Locale.compose("LOC_SLOT_ACTION_MUTE");
        const unmuteTooltip = Locale.compose("LOC_SLOT_ACTION_UNMUTE");
        const hostPlayerId = 0;
        const isLocalHost = true; // Is the Local player also the Host? Any case they are human.
        const isKickVote = true; // Kick Vote (true) or Direct Kick mode?
        this.updateReadyButtonData(hostPlayerId, MPLobbyReadyStatus.NOT_READY);
        const canLocalPlayerEverKick = isKickVote || isLocalHost;
        // Host player, potentially also the Local player
        const gamertag1 = "Catpcha";
        this.playersData.push({
            playerID: hostPlayerId.toString(),
            isParticipant: true,
            isHost: true,
            isLocal: isLocalHost,
            statusIcon: "fs://game/core/mpicon_host.png",
            statusIconTooltip: Locale.compose("LOC_UI_MP_HOST"),
            isReady: false,
            isConnected: true,
            platformIcon: "fs://game/core/mp_console_pc.png",
            platformIconTooltip: Locale.compose("LOC_PLATFORM_ICON_GENERIC_CROSSPLAY"),
            leaderPortrait: "LEADER_AMINA",
            leaderName: "Amina",
            foundationLevel: 99,
            badgeURL: "fs://game/ba_default.png",
            backgroundURL: "fs://game/bn_lafayette.png",
            playerTitle: "",
            civName: "Aksum",
            gamertag: gamertag1,
            firstPartyName: gamertag1,
            twoKName: gamertag1,
            playerInfoDropdown: this.createSlotActionsDropdown(0, gamertag1, false, MPLobbyPlayerConnectionStatus.CONNECTED),
            civilizationDropdown: this.createPlayerParamDropdown(0, 'civ_selector_0', PlayerParamDropdownTypes.PLAYER_CIV, PlayerParamDropdownTypes.PLAYER_CIV, Locale.compose("LOC_UI_MP_LOBBY_DROPDOWN_CIV_DESC"), this.PlayerCivilizationStringHandle, false, false, this.civIconURLGetter),
            teamDropdown: this.createTeamParamDropdown(0, 'team_selector_0', PlayerParamDropdownTypes.PLAYER_TEAM, PlayerParamDropdownTypes.PLAYER_TEAM, Locale.compose("LOC_UI_MP_LOBBY_DROPDOWN_TEAM_DESC"), this.PlayerTeamStringHandle, false, false),
            leaderDropdown: this.createPlayerParamDropdown(0, 'leader_selector_0', PlayerParamDropdownTypes.PLAYER_LEADER, PlayerParamDropdownTypes.PLAYER_LEADER, Locale.compose("LOC_UI_MP_LOBBY_DROPDOWN_LEADER_DESC"), this.PlayerLeaderStringHandle, false, true, this.leaderIconURLGetter),
            isHuman: true,
            isDistantHuman: !isLocalHost,
            canEverBeKicked: canLocalPlayerEverKick && !isLocalHost,
            canBeKickedNow: canLocalPlayerEverKick && !isLocalHost,
            kickTooltip: kickTooltip,
            isKickVoteTarget: false,
            isMuted: false,
            muteTooltip: muteTooltip,
            mementos: [],
            samePlatformAsLocalPlayer: true
        });
        // Other human players
        // Alternative Local player (if it is not the host)
        const gamertag2 = "Civ_King45";
        this.playersData.push({
            playerID: "1",
            isParticipant: true,
            isHost: false,
            isLocal: !isLocalHost,
            statusIcon: !isLocalHost ? "fs://game/core/mpicon_localplayer.png" : "none",
            statusIconTooltip: !isLocalHost ? Locale.compose("LOC_UI_MP_LOCAL_PLAYER") : "",
            isReady: false,
            isConnected: true,
            platformIcon: "fs://game/mp_console_xbox.png",
            platformIconTooltip: Locale.compose("LOC_PLATFORM_ICON_GENERIC_CROSSPLAY"),
            leaderPortrait: "LEADER_CHARLEMAGNE",
            leaderName: "Charlemagne",
            foundationLevel: 99,
            badgeURL: "fs://game/ba_default.png",
            backgroundURL: "fs://game/bn_lafayette.png",
            playerTitle: "",
            civName: "RANDOM",
            gamertag: gamertag2,
            firstPartyName: gamertag2,
            twoKName: gamertag2,
            playerInfoDropdown: this.createSlotActionsDropdown(0, gamertag1, false, MPLobbyPlayerConnectionStatus.CONNECTED),
            civilizationDropdown: this.createPlayerParamDropdown(1, 'civ_selector_0', PlayerParamDropdownTypes.PLAYER_CIV, PlayerParamDropdownTypes.PLAYER_CIV, Locale.compose("LOC_UI_MP_LOBBY_DROPDOWN_CIV_DESC"), this.PlayerCivilizationStringHandle, false, false, this.civIconURLGetter),
            teamDropdown: this.createTeamParamDropdown(1, 'team_selector_0', PlayerParamDropdownTypes.PLAYER_TEAM, PlayerParamDropdownTypes.PLAYER_TEAM, Locale.compose("LOC_UI_MP_LOBBY_DROPDOWN_TEAM_DESC"), this.PlayerTeamStringHandle, false, false),
            leaderDropdown: this.createPlayerParamDropdown(1, 'leader_selector_0', PlayerParamDropdownTypes.PLAYER_LEADER, PlayerParamDropdownTypes.PLAYER_LEADER, Locale.compose("LOC_UI_MP_LOBBY_DROPDOWN_LEADER_DESC"), this.PlayerLeaderStringHandle, false, true, this.leaderIconURLGetter),
            isHuman: true,
            isDistantHuman: isLocalHost,
            canEverBeKicked: canLocalPlayerEverKick && isLocalHost,
            canBeKickedNow: canLocalPlayerEverKick && isLocalHost,
            kickTooltip: kickTooltip,
            isKickVoteTarget: false,
            isMuted: false,
            muteTooltip: muteTooltip,
            mementos: [],
            samePlatformAsLocalPlayer: true
        });
        //    The non local players
        const gamertag3 = "CoffeeAnt";
        this.playersData.push({
            playerID: "2",
            isParticipant: true,
            isHost: false,
            isLocal: false,
            statusIcon: "none",
            statusIconTooltip: "",
            isReady: true,
            isConnected: true,
            platformIcon: "fs://game/mp_console_switch.png",
            platformIconTooltip: Locale.compose("LOC_PLATFORM_ICON_GENERIC_CROSSPLAY"),
            leaderPortrait: "LEADER_AUGUSTUS",
            leaderName: "Augustus",
            foundationLevel: 99,
            badgeURL: "fs://game/ba_default.png",
            backgroundURL: "fs://game/bn_lafayette.png",
            playerTitle: "",
            civName: "Khan",
            gamertag: gamertag3,
            firstPartyName: gamertag3,
            twoKName: gamertag3,
            playerInfoDropdown: this.createSlotActionsDropdown(0, gamertag1, false, MPLobbyPlayerConnectionStatus.CONNECTED),
            civilizationDropdown: this.createPlayerParamDropdown(2, 'civ_selector_0', PlayerParamDropdownTypes.PLAYER_CIV, PlayerParamDropdownTypes.PLAYER_CIV, Locale.compose("LOC_UI_MP_LOBBY_DROPDOWN_CIV_DESC"), this.PlayerCivilizationStringHandle, false, false, this.civIconURLGetter),
            teamDropdown: this.createTeamParamDropdown(2, 'team_selector_0', PlayerParamDropdownTypes.PLAYER_TEAM, PlayerParamDropdownTypes.PLAYER_TEAM, Locale.compose("LOC_UI_MP_LOBBY_DROPDOWN_TEAM_DESC"), this.PlayerTeamStringHandle, false, false),
            leaderDropdown: this.createPlayerParamDropdown(2, 'leader_selector_0', PlayerParamDropdownTypes.PLAYER_LEADER, PlayerParamDropdownTypes.PLAYER_LEADER, Locale.compose("LOC_UI_MP_LOBBY_DROPDOWN_LEADER_DESC"), this.PlayerLeaderStringHandle, false, true, this.leaderIconURLGetter),
            isHuman: true,
            isDistantHuman: true,
            canEverBeKicked: canLocalPlayerEverKick,
            canBeKickedNow: false,
            kickTooltip: kickTooltip,
            isKickVoteTarget: false,
            isMuted: false,
            muteTooltip: muteTooltip,
            mementos: [],
            samePlatformAsLocalPlayer: false
        });
        const gamertag4 = "OrionBird"; //= "WWWWWWWWWWWWWWWW";
        this.playersData.push({
            playerID: "3",
            isParticipant: true,
            isHost: false,
            isLocal: false,
            statusIcon: "fs://game/core/mp_locked.png",
            statusIconTooltip: Locale.compose("LOC_UI_MP_LOCKED_PLAYER"),
            isReady: true,
            isConnected: true,
            platformIcon: "fs://game/mp_console_playstation.png",
            platformIconTooltip: Locale.compose("LOC_PLATFORM_ICON_GENERIC_CROSSPLAY"),
            leaderPortrait: "UNKNOWN_LEADER",
            leaderName: "RANDOM",
            foundationLevel: 99,
            badgeURL: "fs://game/ba_default.png",
            backgroundURL: "fs://game/bn_lafayette.png",
            playerTitle: "",
            civName: "RANDOM",
            gamertag: gamertag4,
            firstPartyName: gamertag4,
            twoKName: gamertag4,
            playerInfoDropdown: this.createSlotActionsDropdown(0, gamertag1, false, MPLobbyPlayerConnectionStatus.CONNECTED),
            civilizationDropdown: this.createPlayerParamDropdown(3, 'civ_selector_0', PlayerParamDropdownTypes.PLAYER_CIV, PlayerParamDropdownTypes.PLAYER_CIV, Locale.compose("LOC_UI_MP_LOBBY_DROPDOWN_CIV_DESC"), this.PlayerCivilizationStringHandle, false, false, this.civIconURLGetter),
            teamDropdown: this.createTeamParamDropdown(3, 'team_selector_0', PlayerParamDropdownTypes.PLAYER_TEAM, PlayerParamDropdownTypes.PLAYER_TEAM, Locale.compose("LOC_UI_MP_LOBBY_DROPDOWN_TEAM_DESC"), this.PlayerTeamStringHandle, false, false),
            leaderDropdown: this.createPlayerParamDropdown(3, 'leader_selector_0', PlayerParamDropdownTypes.PLAYER_LEADER, PlayerParamDropdownTypes.PLAYER_LEADER, Locale.compose("LOC_UI_MP_LOBBY_DROPDOWN_LEADER_DESC"), this.PlayerLeaderStringHandle, false, true, this.leaderIconURLGetter),
            isHuman: true,
            isDistantHuman: true,
            canEverBeKicked: canLocalPlayerEverKick,
            canBeKickedNow: !isKickVote,
            kickTooltip: kickTooltip,
            isKickVoteTarget: isKickVote,
            isMuted: true,
            muteTooltip: unmuteTooltip,
            mementos: [],
            samePlatformAsLocalPlayer: true
        });
        // AI slot
        const gamertagRandom = "Random Leader";
        this.playersData.push({
            playerID: "4",
            isParticipant: true,
            isHost: false,
            isLocal: false,
            statusIcon: "none",
            statusIconTooltip: "",
            isReady: true,
            isConnected: true,
            platformIcon: "none",
            platformIconTooltip: "",
            leaderPortrait: "UNKNOWN_LEADER",
            leaderName: "RANDOM",
            foundationLevel: 99,
            badgeURL: "fs://game/ba_default.png",
            backgroundURL: "fs://game/bn_lafayette.png",
            playerTitle: "",
            civName: "RANDOM",
            gamertag: gamertagRandom,
            twoKName: gamertagRandom,
            firstPartyName: "",
            playerInfoDropdown: this.createSlotActionsDropdown(0, gamertag1, false, MPLobbyPlayerConnectionStatus.CONNECTED),
            civilizationDropdown: this.createPlayerParamDropdown(4, 'civ_selector_0', PlayerParamDropdownTypes.PLAYER_CIV, PlayerParamDropdownTypes.PLAYER_CIV, Locale.compose("LOC_UI_MP_LOBBY_DROPDOWN_CIV_DESC"), this.PlayerCivilizationStringHandle, false, false, this.civIconURLGetter),
            teamDropdown: this.createTeamParamDropdown(4, 'team_selector_0', PlayerParamDropdownTypes.PLAYER_TEAM, PlayerParamDropdownTypes.PLAYER_TEAM, Locale.compose("LOC_UI_MP_LOBBY_DROPDOWN_TEAM_DESC"), this.PlayerTeamStringHandle, false, false),
            leaderDropdown: this.createPlayerParamDropdown(4, 'leader_selector_0', PlayerParamDropdownTypes.PLAYER_LEADER, PlayerParamDropdownTypes.PLAYER_LEADER, Locale.compose("LOC_UI_MP_LOBBY_DROPDOWN_LEADER_DESC"), this.PlayerLeaderStringHandle, false, true, this.leaderIconURLGetter),
            isHuman: false,
            isDistantHuman: false,
            canEverBeKicked: false,
            canBeKickedNow: false,
            kickTooltip: kickTooltip,
            isKickVoteTarget: false,
            isMuted: false,
            muteTooltip: muteTooltip,
            mementos: [],
            samePlatformAsLocalPlayer: false
        });
        // Close slot
        const gamertagClose = "Closed";
        this.playersData.push({
            playerID: "5",
            isParticipant: false,
            isHost: false,
            isLocal: false,
            statusIcon: "none",
            statusIconTooltip: "",
            isReady: false,
            isConnected: true,
            platformIcon: "none",
            platformIconTooltip: "",
            leaderPortrait: "",
            leaderName: "",
            foundationLevel: -1,
            badgeURL: "",
            backgroundURL: "",
            playerTitle: "",
            civName: "RANDOM",
            gamertag: gamertagClose,
            twoKName: gamertagClose,
            firstPartyName: "",
            playerInfoDropdown: this.createSlotActionsDropdown(0, gamertag1, false, MPLobbyPlayerConnectionStatus.CONNECTED),
            civilizationDropdown: this.createPlayerParamDropdown(5, 'civ_selector_0', PlayerParamDropdownTypes.PLAYER_CIV, PlayerParamDropdownTypes.PLAYER_CIV, Locale.compose("LOC_UI_MP_LOBBY_DROPDOWN_CIV_DESC"), this.PlayerCivilizationStringHandle, false, false, this.civIconURLGetter),
            teamDropdown: this.createTeamParamDropdown(5, 'team_selector_0', PlayerParamDropdownTypes.PLAYER_TEAM, PlayerParamDropdownTypes.PLAYER_TEAM, Locale.compose("LOC_UI_MP_LOBBY_DROPDOWN_TEAM_DESC"), this.PlayerTeamStringHandle, false, false),
            leaderDropdown: this.createPlayerParamDropdown(5, 'leader_selector_0', PlayerParamDropdownTypes.PLAYER_LEADER, PlayerParamDropdownTypes.PLAYER_LEADER, Locale.compose("LOC_UI_MP_LOBBY_DROPDOWN_LEADER_DESC"), this.PlayerLeaderStringHandle, false, true, this.leaderIconURLGetter),
            isHuman: false,
            isDistantHuman: false,
            canEverBeKicked: false,
            canBeKickedNow: false,
            kickTooltip: kickTooltip,
            isKickVoteTarget: false,
            isMuted: false,
            muteTooltip: muteTooltip,
            mementos: [],
            samePlatformAsLocalPlayer: false
        });
        // Removing the Slot Actions dropdown for the Local player
        this.playersData.forEach(playerData => { if (playerData.isLocal && playerData.playerInfoDropdown)
            playerData.playerInfoDropdown.itemList = []; });
    }
    onLobbyDropdown(event) {
        const dropdown = event.target;
        if (!(dropdown instanceof HTMLElement)) {
            return;
        }
        const dropdownTypeAttribute = dropdown.getAttribute("data-dropdown-type");
        if (dropdownTypeAttribute) {
            const dropdownType = dropdownTypeAttribute;
            const dropdownCallback = this.dropdownCallbacks.get(dropdownType);
            if (dropdownCallback) {
                dropdownCallback(event);
            }
            else {
                console.error(`model-mp-staging-new: onLobbyDropdown(): Failed to find callback function for callback name ${dropdownType}`);
            }
        }
    }
    onTeamDropdown(event) {
        const dropdown = event.target;
        if (!(dropdown instanceof HTMLElement)) {
            return;
        }
        const { teamID } = event.detail.selectedItem;
        const playerIDStr = dropdown.getAttribute("data-player-id");
        if (playerIDStr) {
            const playerID = parseInt(playerIDStr);
            const playerConfig = Configuration.editPlayer(playerID);
            playerConfig?.setTeam(teamID);
        }
    }
    onPlayerParamDropdown(event) {
        const dropdown = event.target;
        if (!(dropdown instanceof HTMLElement)) {
            return;
        }
        const { paramID } = event.detail.selectedItem;
        const playerIDStr = dropdown.getAttribute("data-player-id");
        const playerParam = dropdown.getAttribute("data-player-param");
        if (paramID && playerIDStr && playerParam) {
            const playerID = parseInt(playerIDStr);
            // special case for leader live event
            if (playerParam == "PlayerLeader" && LiveEventManager.restrictToPreferredCivs()) {
                const civLeaderPairingData = (Database.query('config', 'select * from LeaderCivParings') ?? []);
                const civFixed = civLeaderPairingData.find(row => row.LeaderType == paramID);
                const civID = civFixed?.CivilizationType ?? '';
                GameSetup.setPlayerParameterValue(playerID, "PlayerCivilization", civID);
            }
            GameSetup.setPlayerParameterValue(playerID, playerParam, paramID);
        }
    }
    onSlotActionDropdown(event) {
        const dropdown = event.target;
        if (!(dropdown instanceof HTMLElement)) {
            return;
        }
        const { slotActionType } = event.detail.selectedItem;
        const playerIDStr = dropdown.getAttribute("data-player-id");
        if (playerIDStr) {
            const playerID = parseInt(playerIDStr);
            switch (slotActionType) {
                case MPLobbySlotActionType.CLOSE:
                case MPLobbySlotActionType.OPEN:
                case MPLobbySlotActionType.AI:
                    {
                        const slotActionData = MPLobbyModel.slotActionsData.get(slotActionType);
                        if (slotActionData && slotActionData.slotStatus != undefined) {
                            const playerConfig = Configuration.editPlayer(playerID);
                            if (playerConfig) {
                                playerConfig.setSlotStatus(slotActionData.slotStatus);
                            }
                            else {
                                console.warn("model-mp-staging-new: onSlotActionDropdown(): No playerConfig found for this playerID: " + playerID);
                            }
                        }
                        else {
                            console.warn("model-mp-staging-new: onSlotActionDropdown(): No valid slotActionData found for this slotActionType: " + slotActionType);
                        }
                    }
                    break;
                case MPLobbySlotActionType.SWAP:
                    Network.requestSlotSwap(playerID);
                    break;
                case MPLobbySlotActionType.VIEW:
                    const nativeId = Online.Social.getPlayerFriendID_Network(playerID);
                    const t2gpId = Online.Social.getPlayerFriendID_T2GP(playerID);
                    Online.Social.viewProfile(nativeId, t2gpId);
                    // Update to reset the selected index, otherwise it won't work the next time
                    this.update();
                    break;
            }
        }
    }
    canChangeSlotStatus(targetPlayerID, slotActionData) {
        if (slotActionData.slotStatus == undefined) {
            return false;
        }
        // only the host can change slot statuses
        if (!MPLobbyDataModel.isLocalHostPlayer()) {
            return false;
        }
        // Only SWAP actions are allowed once the game has been started.
        if (!MPLobbyDataModel.isNewGame && (slotActionData.actionType != MPLobbySlotActionType.SWAP)) {
            return false;
        }
        const newStatus = slotActionData.slotStatus;
        const targetPlayerConfig = Configuration.getPlayer(targetPlayerID);
        // Disallow human related actions for slots that can't be human.
        if (!targetPlayerConfig.canBeHuman
            && slotActionData.actionType != MPLobbySlotActionType.CLOSE
            && slotActionData.actionType != MPLobbySlotActionType.AI) {
            return false;
        }
        // Disallow close/open actions on CanBeHuman participant slots while we are at min player count for the map.
        // Gameplay and victories depend on there being at least two Homeland Civilizations.
        if (targetPlayerConfig.isParticipant
            && targetPlayerConfig.canBeHuman
            && (slotActionData.actionType == MPLobbySlotActionType.CLOSE
                || slotActionData.actionType == MPLobbySlotActionType.OPEN)) {
            const mapConfig = Configuration.getMap();
            if (mapConfig) {
                if (this.participatingCount <= mapConfig.minMajorPlayers) {
                    return false;
                }
            }
        }
        return (!targetPlayerConfig.isHuman // can only change a slot status where there is no human player yet
            && targetPlayerConfig.slotStatus != newStatus); // effective new slot status
    }
    canSwap(targetPlayerID) {
        if (MPLobbyDataModel.isLocalPlayer(targetPlayerID)) { // we can not swap with our own slot!
            return false;
        }
        const targetPlayerConfig = Configuration.getPlayer(targetPlayerID);
        // the target slot must be occupable by human players.
        return (!targetPlayerConfig.isLocked
            && targetPlayerConfig.canBeHuman
            && targetPlayerConfig.slotStatus != SlotStatus.SS_CLOSED);
    }
}
MPLobbyDataModel.ALL_READY_COUNTDOWN = 10 * 1000; // milli seconds before starting the game after all players are ready
MPLobbyDataModel.ALL_READY_COUNTDOWN_STEP = 1 * 1000; // milli seconds between two updates of the All Ready countdown
// The matchmaker generates full or partial games atomically so all players are coming into the match
// at the same time.  We still need a bit of slop to account for some players taking longer to join
// the match than others.  We also want this timer to be reasonably short to keep the game moving along.
MPLobbyDataModel.GLOBAL_COUNTDOWN = 2 * 60 * 1000; // milli seconds before forcing starting the All Ready countdown (the players being really ready or not)
MPLobbyDataModel.GLOBAL_COUNTDOWN_STEP = 1 * 1000; // milli seconds between two updates of the Global countdown
MPLobbyDataModel.KICK_VOTE_COOLDOWN = 30 * 1000; // milli seconds enforced between kick vote starts
const MPLobbyModel = MPLobbyDataModel.getInstance();
engine.whenReady.then(() => {
    const updateModel = () => {
        engine.updateWholeModel(MPLobbyModel);
    };
    engine.createJSModel('g_MPLobbyModel', MPLobbyModel);
    MPLobbyModel.updateCallback = updateModel;
});
export { MPLobbyModel as default };

//# sourceMappingURL=file:///core/ui/shell/mp-staging/model-mp-staging-new.js.map
