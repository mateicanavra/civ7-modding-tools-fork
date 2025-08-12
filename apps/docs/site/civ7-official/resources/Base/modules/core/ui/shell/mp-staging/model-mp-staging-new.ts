/**
 * @file model-mp-staging-new.ts		
 * @copyright 2023, Firaxis Games
 * @description Multiplayer lobby screen data mdoel.  
 */

import { DropdownItem, DropdownSelectionChangeEvent } from '/core/ui/components/fxs-dropdown.js';
import DialogManager, { DialogBoxAction, DialogBoxCallbackSignature, DialogBoxID } from '/core/ui/dialog-box/manager-dialog-box.js';
import MultiplayerShellManager from '/core/ui/shell/mp-shell-logic/mp-shell-logic.js';
import { NetworkUtilities } from '/core/ui/utilities/utilities-network.js';
import { getLeaderData, LeaderData } from '/core/ui/shell/create-panels/leader-select-model.js';
import { CivData, GetCivilizationData } from '/core/ui/shell/create-panels/age-civ-select-model.js';
import { IconDropdownItem } from '/core/ui/shell/shell-components/icon-dropdown.js';
import { getPlayerCardInfo } from '/core/ui/utilities/utilities-liveops.js';
import LiveEventManager from "/core/ui/shell/live-event-logic/live-event-logic.js";
import { Audio } from '/core/ui/audio-base/audio-support.js';

enum MPLobbyDropdownType { // Enum with string values since we are doing casts and reverse lookups
	TEAM = "DROPDOWN_TYPE_TEAM",
	PLAYER_PARAM = "DROPDOWN_TYPE_PLAYER_PARAM",
	SLOT_ACTION = "DROPDOWN_TYPE_SLOT_ACTION"
}

enum MPLobbySlotActionType { // Enum with string values since we are doing casts and reverse lookups
	NONE = "SLOT_ACTION_TYPE_NONE",
	OPEN = "SLOT_ACTION_TYPE_OPEN",
	CLOSE = "SLOT_ACTION_TYPE_CLOSE",
	AI = "SLOT_ACTION_TYPE_AI",
	SWAP = "SLOT_ACTION_TYPE_SWAP",
	VIEW = "SLOT_ACTION_TYPE_VIEW"
}

export enum MPLobbyReadyStatus {
	INIT = "INIT",
	NOT_READY = "NOT_READY",
	WAITING_FOR_OTHERS = "WAITING_FOR_OTHERS",
	STARTING_GAME = "STARTING_GAME",
	WAITING_FOR_HOST = "WAITING_FOR_HOST",
}

export enum PlayerParamDropdownTypes {
	PLAYER_SLOT_ACTION = "PLAYER_SLOT_ACTION",
	PLAYER_TEAM = "PLAYER_TEAM",
	PLAYER_CIV = "PLAYER_CIV",
	PLAYER_LEADER = "PLAYER_LEADER",
	PLAYER_MEMENTO = "PLAYER_MEMENTO"
}

interface MPLobbySlotActionData {
	actionType: MPLobbySlotActionType;
	displayName: string;
	showCheckCallback: MPLobbySlotActionShowCheckCallback;
	slotStatus?: SlotStatus; // The target slot status of the action.
}

enum MPLobbyPlayerConnectionStatus {
	CONNECTED,
	DISCONNECTED
}

type MPLobbyDropdownCallback = (event: DropdownSelectionChangeEvent) => void;
type MPLobbySlotActionShowCheckCallback = (playerID: number, actionOption: MPLobbySlotActionData) => boolean;

export interface MPLobbyPlayerData {
	playerID: string;

	isHost: boolean;
	isLocal: boolean;

	statusIcon: string;
	statusIconTooltip: string;

	isReady: boolean;

	platformIcon: string;
	platformIconTooltip: string;

	leaderPortrait: string;
	leaderName: string;

	foundationLevel: number;
	badgeURL: string;
	backgroundURL: string;
	playerTitle: string;

	civName: string;

	gamertag: string;
	firstPartyName: string;
	twoKName: string;
	samePlatformAsLocalPlayer: boolean

	playerInfoDropdown: MPLobbyDropdownOptionData | null;
	civilizationDropdown: MPLobbyDropdownOptionData | null;
	teamDropdown: MPLobbyDropdownOptionData | null;
	leaderDropdown: MPLobbyDropdownOptionData | null;
	mementos: string[];

	isParticipant: boolean;
	isHuman: boolean;
	isDistantHuman: boolean; // Human not Local player. Must be true to have Player Options on that player and also to be able to mute them.

	isConnected: boolean;

	canEverBeKicked: boolean; // Can this player be kicked in general?
	canBeKickedNow: boolean; // Can this player be kicked in the current context?
	// TODO FIRAXIS https://2kfxs.atlassian.net/browse/IGP-60969 [model-mp-staging-new.ts][TODO] Prevent Kick Vote Spamming
	/** TODO Since canBeKickedNow is a sub part of canEverBeKicked (<-> it is impossible to have canBeKickedNow true if canEverBeKicked is false),
	 *  this should be an enum { canEverBeKicked ; canBeKickedNow ; canNotBeKickedNow }
	 */
	kickTooltip: string;
	isKickVoteTarget: boolean;

	isMuted: boolean;
	muteTooltip: string;
}

export class MPLobbyDropdownOptionData {
	id: string = ""; //UNIQUE id
	type: PlayerParamDropdownTypes = PlayerParamDropdownTypes.PLAYER_SLOT_ACTION;
	label: string = "";
	description?: string;
	isDisabled?: boolean;
	iconURL?: string;
	showLabelOnSelectedItem?: boolean;

	selectedItemIndex?: number; // Key to the selection in the itemList 
	selectedItemTooltip?: string; // Tooltip to the selection in the itemList 
	itemList?: IconDropdownItem[];

	dropdownType?: string;
	playerParamName?: string; //[optional] the name of the player parameter being manipulated in this dropdown.
	tooltip?: string; //tooltip for the dropdown itself

	get serializedItemList(): string {
		if (this.itemList == undefined) return "[]";

		return JSON.stringify(this.itemList);
	}
}

type TeamDropdownItem = DropdownItem & { teamID: number };
type SlotActionDropdownItem = DropdownItem & { slotActionType: MPLobbySlotActionType };
type PlayerParamDropdownItem = IconDropdownItem & { paramID: string };

type DialogBoxIDPerPlayerIDMap = Map<PlayerId, DialogBoxID>;

export const LobbyUpdateEventName = 'model-mp-staging-update' as const;
export class LobbyUpdateEvent extends CustomEvent<{}> {
	constructor() {
		super('model-mp-staging-update', { bubbles: false, cancelable: true });
	}
}

export class MPLobbyDataModel {
	private static instance: MPLobbyDataModel;
	private onUpdate?: (model: MPLobbyDataModel) => void;
	private playersData: MPLobbyPlayerData[] = [];
	localPlayerData?: MPLobbyPlayerData;

	allReadyCountdownRemainingSeconds: number = 0;
	allReadyCountdownRemainingPercentage: number = 0;
	readyButtonCaption: string = "";
	private static ALL_READY_COUNTDOWN: number = 10 * 1000; // milli seconds before starting the game after all players are ready
	private static ALL_READY_COUNTDOWN_STEP: number = 1 * 1000; // milli seconds between two updates of the All Ready countdown
	readonly SMALL_SCREEN_MODE_MAX_HEIGHT = 900;
	readonly SMALL_SCREEN_MODE_MAX_WIDTH = 1700;
	private readyStatus: MPLobbyReadyStatus = MPLobbyReadyStatus.INIT;
	private allReadyCountdownIntervalHandle: number = 0;
	private startGameRemainingTime: number = MPLobbyDataModel.ALL_READY_COUNTDOWN;

	/* Cache the participating player count on each update() to avoid hammering 
	the calculation every time we call canChangeSlotStatus(). */
	private participatingCount: number = 0;

	private kickTimerListener = this.kickTimerExpired.bind(this);
	private kickTimerReference: number = 0;
	private kickVoteLockout: boolean = false;

	// The matchmaker generates full or partial games atomically so all players are coming into the match
	// at the same time.  We still need a bit of slop to account for some players taking longer to join
	// the match than others.  We also want this timer to be reasonably short to keep the game moving along.
	private static GLOBAL_COUNTDOWN: number = 2 * 60 * 1000; // milli seconds before forcing starting the All Ready countdown (the players being really ready or not)
	private static GLOBAL_COUNTDOWN_STEP: number = 1 * 1000; // milli seconds between two updates of the Global countdown
	private static KICK_VOTE_COOLDOWN: number = 30 * 1000;	// milli seconds enforced between kick vote starts
	private globalCountdownRemainingSeconds: number = 0;
	private globalCountdownIntervalHandle: number = 0;

	private PlayerLeaderStringHandle = GameSetup.makeString('PlayerLeader');
	private PlayerCivilizationStringHandle = GameSetup.makeString('PlayerCivilization');
	private PlayerTeamStringHandle = GameSetup.makeString('PlayerTeam')
	private MapSizeStringHandle = GameSetup.makeString('MapSize');
	private GameSpeedsStringHandle = GameSetup.makeString('GameSpeeds');
	private RulesetStringHandle = GameSetup.makeString('Ruleset');
	private AgeStringHandle = GameSetup.makeString('Age');
	private PlayerMementoMajorSlotStringHandle = GameSetup.makeString('PlayerMementoMajorSlot');
	private PlayerMementoMinorSlot1StringHandle = GameSetup.makeString('PlayerMementoMinorSlot1');

	// Memoize leader civilization bias data.
	private cacheLeaderCivilizationBias = new Map<string, Map<string, string>>();

	// Memoize the parameters rather than fetch them from C++ each time (which duplicates data).
	private playerParameterCache = new Map<PlayerId, Map<GameSetupStringHandle, GameSetupParameter>>();
	private gameParameterCache = new Map<GameSetupStringHandle, GameSetupParameter>();

	// Cache tooltip strings.  In the case of civilization tooltips, just cache a fragment that will be combined with leader bias.
	private cachedCivilizationTooltipFragments = new Map<CivilizationType, string>();
	private cachedLeaderTooltips = new Map<LeaderType, string>();

	private dropdownCallbacks = new Map<MPLobbyDropdownType, MPLobbyDropdownCallback>([
		[MPLobbyDropdownType.TEAM, this.onTeamDropdown.bind(this)],
		[MPLobbyDropdownType.PLAYER_PARAM, this.onPlayerParamDropdown.bind(this)],
		[MPLobbyDropdownType.SLOT_ACTION, this.onSlotActionDropdown.bind(this)],
	]);

	private voteDialogBoxIDPerKickPlayerID: DialogBoxIDPerPlayerIDMap = new Map<PlayerId, DialogBoxID>();

	private changeSlotStatusShowCheckCallback: MPLobbySlotActionShowCheckCallback = (playerID: number, actionOption: MPLobbySlotActionData) => { return this.canChangeSlotStatus(playerID, actionOption); }
	private swapShowCheckCallback: MPLobbySlotActionShowCheckCallback = (playerID: number, _actionOption: MPLobbySlotActionData) => { return this.canSwap(playerID); }
	private viewProfileCheckCallback: MPLobbySlotActionShowCheckCallback = (playerID: number, _actionOption: MPLobbySlotActionData) => { return Online.Social.canViewProfileWithLobbyPlayerId(playerID); }

	slotActionsData = new Map<MPLobbySlotActionType, MPLobbySlotActionData>([
		[MPLobbySlotActionType.VIEW, { actionType: MPLobbySlotActionType.VIEW, displayName: Locale.compose("LOC_UI_MP_PLAYER_OPTIONS_VIEW_PROFILE"), showCheckCallback: this.viewProfileCheckCallback }],
		[MPLobbySlotActionType.OPEN, { actionType: MPLobbySlotActionType.OPEN, displayName: Locale.compose("LOC_SLOT_ACTION_OPEN"), showCheckCallback: this.changeSlotStatusShowCheckCallback, slotStatus: SlotStatus.SS_OPEN }],
		[MPLobbySlotActionType.CLOSE, { actionType: MPLobbySlotActionType.CLOSE, displayName: Locale.compose("LOC_SLOT_ACTION_CLOSE"), showCheckCallback: this.changeSlotStatusShowCheckCallback, slotStatus: SlotStatus.SS_CLOSED }],
		[MPLobbySlotActionType.AI, { actionType: MPLobbySlotActionType.AI, displayName: Locale.compose("LOC_SLOT_ACTION_AI"), showCheckCallback: this.changeSlotStatusShowCheckCallback, slotStatus: SlotStatus.SS_COMPUTER }],
		[MPLobbySlotActionType.SWAP, { actionType: MPLobbySlotActionType.SWAP, displayName: Locale.compose("LOC_SLOT_ACTION_SWAP_REQUEST"), showCheckCallback: this.swapShowCheckCallback }],
	]);

	private leaderData: LeaderData[] = getLeaderData();
	private civData: CivData[] = GetCivilizationData();

	get gameName(): string {
		const gameConfig: ConfigurationGameAccessor = Configuration.getGame();
		return gameConfig.gameName ?? "DBG Missing Name of game";
	}

	get joinCode(): string {
		return Network.getJoinCode();
	}

	get timeRemainingTimer(): string {
		return `${this.formatDateToMinutes(this.globalCountdownRemainingSeconds)} ${Locale.compose("LOC_UI_MP_LOBBY_TIME_REMAINING")}`;
	}

	get canToggleReady(): boolean {
		// Global countdown has elapsed.
		if (this.isUsingGlobalCountdown && this.globalCountdownRemainingSeconds <= 0 || this.readyStatus == MPLobbyReadyStatus.WAITING_FOR_HOST) {
			return false;
		}

		return true;
	}

	get isLocalPlayerReady(): boolean {
		return Network.isPlayerStartReady(GameContext.localPlayerID);
	}

	get canEditMementos(): boolean {
		return !this.isLocalPlayerReady && MPLobbyDataModel.isNewGame;
	}

	get summaryMapSize(): string {
		const mapSizeName: number | undefined = this.findGameParameter(this.MapSizeStringHandle)?.value.name;
		const mapSize: string | null = mapSizeName != undefined ? GameSetup.resolveString(mapSizeName) : null;
		return mapSize ?? "DBG Missing Map size";
	}

	get summarySpeed(): string {
		const speedName: number | undefined = this.findGameParameter(this.GameSpeedsStringHandle)?.value.name;
		const speed: string | null = speedName != undefined ? GameSetup.resolveString(speedName) : null;
		return speed ?? "DBG Missing Speed name";
	}

	get summaryMapType(): string {
		const mapConfig: ConfigurationMapAccessor = Configuration.getMap();
		return mapConfig.mapName ?? "DBG Missing Map type";
	}

	get summaryMapRuleSet(): string {
		const ruleSetName: number | undefined = this.findGameParameter(this.RulesetStringHandle)?.value.name;
		const ruleSet: string | null = ruleSetName != undefined ? GameSetup.resolveString(ruleSetName) : null;
		return ruleSet ?? "DBG Missing Rule set";
	}

	get ageBannerSrc(): string {
		let bannerSrc: string = "Skyline_Sm";

		const ageParameter = this.findGameParameter(this.AgeStringHandle);
		if (ageParameter) {
			const bannerName = GameSetup.findString('Banner');
			if (bannerName != GAMESETUP_INVALID_STRING) {
				// Note: the 'Banner' field is in the additional properties since it is not an attribute of the DomainValue struct
				const currentAgeBanner = ageParameter.value.additionalProperties?.find((additionalProperty) => additionalProperty.name == bannerName)?.value;
				if (typeof (currentAgeBanner) == 'string') {
					bannerSrc = currentAgeBanner;
				} else {
					console.warn("model-mp-staging-new: ageBannerSrc(): the 'Banner' additional property is not a string!");
				}
			} else {
				// No banners are declared anywhere in game setup so there's no real point looking.
				console.warn("model-mp-staging-new: ageBannerSrc(): no 'Banner' are declared in game setup!");
			}
		} else {
			console.warn("model-mp-staging-new: ageBannerSrc(): ageParameter is null!");
		}

		return `fs://game/${bannerSrc}`;
	}

	get difficulty(): string {
		const gameConfig: ConfigurationGameAccessor = Configuration.getGame();
		return (gameConfig.difficultyName ?? "?");
	}

	get playerCounters(): string {
		const { humanPlayerCount, maxJoinablePlayerCount }: ConfigurationGameAccessor = Configuration.getGame();
		return Locale.compose('LOC_UI_MP_LOBBY_PLAYERS', `${humanPlayerCount}`, `${maxJoinablePlayerCount}`);
	}

	get isUsingGlobalCountdown(): boolean {
		// Hot joiners do not use the global countdown.
		if (Network.isPlayerHotJoining(GameContext.localPlayerID)) {
			return false;
		}

		// Only matchmaker games use the global countdown.
		const gameConfig: ConfigurationGameAccessor = Configuration.getGame();
		if (!gameConfig.isMatchMaking) {
			return false;
		}

		return true;
	}

	get isKickOptionHidden(): boolean {
		return !Configuration.getGame().isKickVoting && Network.getHostPlayerId() != GameContext.localPlayerID;
	}

	get lobbyPlayersData(): MPLobbyPlayerData[] {
		return this.playersData;
	}

	private addVoteDialogBox(kickPlayerID: PlayerId, dialogBoxID: DialogBoxID) {
		if (this.voteDialogBoxIDPerKickPlayerID.has(kickPlayerID)) {
			console.error("model-mp-staging-new: addVoteDialogBox(): There is already a Vote dialog box for that player! " + kickPlayerID);
			return;
		}

		this.voteDialogBoxIDPerKickPlayerID.set(kickPlayerID, dialogBoxID);
	}

	private removeVoteDialogBox(kickPlayerID: PlayerId) {
		if (!this.voteDialogBoxIDPerKickPlayerID.has(kickPlayerID)) {
			console.warn("model-mp-staging-new: removeVoteDialogBox(): There is none Vote dialog box for that player. " + kickPlayerID);
			return;
		}

		this.voteDialogBoxIDPerKickPlayerID.delete(kickPlayerID);
	}

	kick(kickPlayerID: number) {
		// Starting a Kick (both Kick Vote and Direct Kick modes)

		// It is assumed the target can be kicked here.

		const gameConfig: ConfigurationGameAccessor = Configuration.getGame();
		const isKickVote: boolean = gameConfig.isKickVoting; // Kick Vote (true) or Direct Kick mode?

		const dialogCallback: DialogBoxCallbackSignature = (eAction: DialogBoxAction) => {
			if (eAction == DialogBoxAction.Confirm) {
				if (isKickVote) {
					const yesVote: boolean = true; // vote to kick the target player
					Network.kickVotePlayer(kickPlayerID, yesVote, KickVoteReasonType.KICKVOTE_NONE);
					this.kickTimerReference = window.setTimeout(this.kickTimerListener, MPLobbyDataModel.KICK_VOTE_COOLDOWN);
					this.kickVoteLockout = true;
				} else {
					Network.directKickPlayer(kickPlayerID);
				}
			}
			// Else: Kick was given up
		}

		if (this.kickVoteLockout) {
			DialogManager.createDialog_Confirm({
				body: "LOC_KICK_DIALOG_TIMEOUT",
				title: "LOC_KICK_DIALOG_TITLE"
			});
		} else {
			const kickPlayerConfig: ConfigurationPlayerAccessor = Configuration.getPlayer(kickPlayerID);
			const kickPlayerName: string = Locale.compose(kickPlayerConfig.slotName);

			const dialogBoxID: DialogBoxID = DialogManager.createDialog_ConfirmCancel({
				body: Locale.compose(isKickVote ? "LOC_KICK_VOTE_CONFIRM_DIALOG" : "LOC_DIRECT_KICK_CONFIRM_DIALOG", kickPlayerName),
				title: "LOC_KICK_DIALOG_TITLE",
				callback: dialogCallback
			});

			this.addVoteDialogBox(kickPlayerID, dialogBoxID);
		}
	}

	mute(mutePlayerID: number, mute: boolean) {
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

	set updateCallback(callback: (model: MPLobbyDataModel) => void) {
		this.onUpdate = callback;
	}

	private constructor() {
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
	static isHostPlayer(playerId: number): boolean {
		return playerId == Network.getHostPlayerId();
	}

	/**
	 * isLocalPlayer
	 * @param playerId 
	 * @returns if a given player is local
	 */
	static isLocalPlayer(playerId: number): boolean {
		return playerId == GameContext.localPlayerID;
	}

	/**
	 * isLocalHostPlayer
	 * @returns if our own player is the (local) host
	 */
	static isLocalHostPlayer(): boolean {
		return Network.getHostPlayerId() == GameContext.localPlayerID;
	}

	private static get isNewGame(): boolean {
		const gameConfig: ConfigurationGameAccessor = Configuration.getGame();
		return gameConfig.gameState == GameStateTypes.GAMESTATE_PREGAME; // note that it is NOT true when loading a game (GAMESTATE_LOAD_PREGAME)
	}

	private civIconURLGetter = (id: GameSetupDomainValue, showLockIcon: boolean) => {
		if (showLockIcon) {
			return "fs://game/core/mp_locked.png";
		}

		const civId = id.value as string;
		return UI.getIconURL(civId == "RANDOM" ? "CIVILIZATION_RANDOM" : civId, "");
	}

	private leaderIconURLGetter = (id: GameSetupDomainValue, showLockIcon: boolean) => {
		if (showLockIcon) {
			return "fs://game/core/mp_locked.png";
		}
		const leaderId: string = GameSetup.resolveString(id.icon) ?? "";
		const iconURL = UI.getIconURL(leaderId, "CIRCLE_MASK");
		return iconURL;
	}

	private findPlayerParameter(player: PlayerId, paramName: GameSetupStringHandle): GameSetupParameter | null {
		let cache = this.playerParameterCache.get(player);
		if (cache == null) {
			cache = new Map<GameSetupStringHandle, GameSetupParameter>()
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

	private findGameParameter(paramName: GameSetupStringHandle): GameSetupParameter | null {
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


	private initialize() {
		const civBiasData = Database.query('config', 'SELECT CivilizationType, LeaderType, ReasonType FROM LeaderCivilizationBias');
		if (civBiasData) {
			for (let row of civBiasData) {
				const civilizationType = row[0] as string;
				const leaderType = row[1] as string;
				const reason = row[2] as string;

				let leaderCache = this.cacheLeaderCivilizationBias.get(leaderType);
				if (leaderCache == null) {
					leaderCache = new Map<string, string>();
					this.cacheLeaderCivilizationBias.set(leaderType, leaderCache);
				}

				leaderCache.set(civilizationType, reason);
			}
		}
	}

	private update() {
		this.playersData.length = 0;
		this.localPlayerData = undefined

		this.playerParameterCache.clear();
		this.gameParameterCache.clear();

		const localPlatform: HostingType = Network.getLocalHostingPlatform();

		if (MultiplayerShellManager.unitTestMP) {
			this.pushDummyPlayersData();
		}
		else {
			const numPlayers: number = Configuration.getMap().maxMajorPlayers;
			const gameConfig: ConfigurationGameAccessor = Configuration.getGame();

			//Cache the participating player count for later use.
			const bFullCivsOnly: boolean = true;
			const bAliveCivsOnly: boolean = true;
			const bUnlockedCivsOnly: boolean = true;
			const bCanBeHumanOnly: boolean = true;
			this.participatingCount = gameConfig.getParticipatingPlayerCount(bFullCivsOnly, !bAliveCivsOnly, !bUnlockedCivsOnly, bCanBeHumanOnly);

			const isKickVote: boolean = gameConfig.isKickVoting; // Kick Vote (true) or Direct Kick mode?

			const canLocalPlayerEverKick: boolean = ((isKickVote && Network.canPlayerEverKickVote(GameContext.localPlayerID))	// Kick Vote conditions
				|| (!isKickVote && Network.canPlayerEverDirectKick(GameContext.localPlayerID)));								// Direct Kick conditions

			for (let curPlayerID: number = 0; curPlayerID < numPlayers; curPlayerID++) {
				const playerConfig: ConfigurationPlayerAccessor = Configuration.getPlayer(curPlayerID);

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

				const isParticipant: boolean = playerConfig.isParticipant;
				const isHost: boolean = MPLobbyDataModel.isHostPlayer(curPlayerID);
				const isLocal: boolean = MPLobbyDataModel.isLocalPlayer(curPlayerID);

				// Host / Locked / Local player status icon
				let statusIcon: string = "none";
				let statusIconTooltip: string = "";

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

				const isHuman: boolean = playerConfig.isHuman || playerConfig.isObserver; // slots taken by humans or observer slots
				const isDistantHuman: boolean = (!isLocal && isHuman);

				// Platform icon
				let platformIcon: string = "none";
				let platformIconTooltip: string = "";

				const curPlatform: HostingType = Network.getPlayerHostingPlatform(curPlayerID);

				if (isHuman) {
					let tempIcon: string | undefined = NetworkUtilities.getHostingTypeURL(curPlatform);
					if (tempIcon) {
						platformIcon = tempIcon;
					}

					let tempTooltip: string | undefined = NetworkUtilities.getHostingTypeTooltip(curPlatform);
					if (tempTooltip) {
						platformIconTooltip = tempTooltip;
					}
				}

				// Leader portrait

				// we have Player Options only on human players that are not ourselves so isDistantHuman will be checked to choose the leader portrait version (a button or a simple div)

				let leaderPortrait: string | null = "";
				if (playerConfig.isParticipant && playerConfig.leaderTypeName) {
					leaderPortrait = playerConfig.leaderTypeName != "RANDOM" ? playerConfig.leaderTypeName : "UNKNOWN_LEADER";
				}

				let leaderName: string = "";
				let civName: string = "";
				if (playerConfig.isParticipant
					&& playerConfig.leaderTypeName
					&& playerConfig.civilizationTypeName) {
					leaderName = playerConfig.leaderTypeName;
					civName = playerConfig.civilizationTypeName;
				}

				// Dropdowns

				let playerInfoDropdown: MPLobbyDropdownOptionData | null = null;
				let civilizationDropdown: MPLobbyDropdownOptionData | null = null;
				let teamDropdown: MPLobbyDropdownOptionData | null = null;
				let leaderDropdown: MPLobbyDropdownOptionData | null = null;

				let mementos: string[] = [];

				const localPlayerReady: boolean = Network.isPlayerStartReady(GameContext.localPlayerID);
				const isLocalPlayerHost: boolean = MPLobbyDataModel.isHostPlayer(GameContext.localPlayerID);

				const gamertag: string = Locale.stylize(playerConfig.slotName);
				const twoKName: string = playerConfig.nickName_T2GP;
				const firstPartyName: string = playerConfig.nickName_1P;
				const isPlayerInfoSlotDisabled = localPlayerReady || !isLocalPlayerHost && [SlotStatus.SS_CLOSED, SlotStatus.SS_OPEN].includes(playerConfig.slotStatus) || isLocal;
				const lobbyPlayerConnectionStatus: MPLobbyPlayerConnectionStatus = this.GetMPLobbyPlayerConnectionStatus(playerConfig);
				playerInfoDropdown = this.createSlotActionsDropdown(curPlayerID, gamertag, isPlayerInfoSlotDisabled, lobbyPlayerConnectionStatus);

				if (playerConfig.isParticipant) {

					const canEditSlot: boolean = !localPlayerReady								// no more edition allowed when ready
						&& (isLocal 															// we can edit our own slot...
							|| (playerConfig.isAI && MPLobbyDataModel.isLocalHostPlayer()));	// ... OR an AI one but only if we are the host

					// Can we edit stuff that we should only be able to edit during the pregame?
					const canEditSlot_PreGame: boolean = canEditSlot && MPLobbyDataModel.isNewGame;

					// Can we edit stuff that we should only edit during age transitions or the pregame?
					const canEditSlot_AgeTrans: boolean = canEditSlot
						&& (Modding.getTransitionInProgress() == TransitionType.Age
							|| MPLobbyDataModel.isNewGame);



					civilizationDropdown = this.createPlayerParamDropdown(curPlayerID, 'civ_selector_0', PlayerParamDropdownTypes.PLAYER_CIV, PlayerParamDropdownTypes.PLAYER_CIV, Locale.compose("LOC_UI_MP_LOBBY_DROPDOWN_CIV_DESC"), this.PlayerCivilizationStringHandle, !canEditSlot_AgeTrans, false, this.civIconURLGetter);
					teamDropdown = this.createTeamParamDropdown(curPlayerID, 'team_selector_0', PlayerParamDropdownTypes.PLAYER_TEAM, PlayerParamDropdownTypes.PLAYER_TEAM, Locale.compose("LOC_UI_MP_LOBBY_DROPDOWN_TEAM_DESC"), this.PlayerTeamStringHandle, !canEditSlot_AgeTrans, true);
					leaderDropdown = this.createPlayerParamDropdown(curPlayerID, 'leader_selector_0', PlayerParamDropdownTypes.PLAYER_LEADER, PlayerParamDropdownTypes.PLAYER_LEADER, Locale.compose("LOC_UI_MP_LOBBY_DROPDOWN_LEADER_DESC"), this.PlayerLeaderStringHandle, !canEditSlot_PreGame, true, this.leaderIconURLGetter);

					if (gameConfig.isMementosEnabled && isHuman) {
						mementos = [
							this.findPlayerParameter(curPlayerID, this.PlayerMementoMajorSlotStringHandle)?.value.value as string,
							this.findPlayerParameter(curPlayerID, this.PlayerMementoMinorSlot1StringHandle)?.value.value as string,
						]
					}
				}

				const isConnected: boolean = Network.isPlayerConnected(curPlayerID);

				// Kick

				const isKickVoteTarget: boolean = (isKickVote && Network.isKickVoteTarget(curPlayerID));

				const canEverBeKicked: boolean = canLocalPlayerEverKick && Network.canEverKickPlayer(curPlayerID)
				const canBeKickedNow: boolean = canEverBeKicked
					&& ((isKickVote && Network.canKickVotePlayerNow(curPlayerID) && !isKickVoteTarget)	// Kick Vote conditions
						|| (!isKickVote && Network.canDirectKickPlayerNow(curPlayerID)));				// Direct Kick conditions

				const kickTooltip: string = (canEverBeKicked
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

				const isMuted: boolean = Network.isPlayerMuted(curPlayerID);

				// Reminder: can be muted <-> is a distant human
				const muteTooltip: string = isDistantHuman
					? Locale.compose(isMuted
						? "LOC_SLOT_ACTION_UNMUTE"
						: "LOC_SLOT_ACTION_MUTE")
					: "";

				const curFriendId: string = Network.supportsSSO() ? Online.Social.getPlayerFriendID_T2GP(curPlayerID) : Online.Social.getPlayerFriendID_Network(curPlayerID);
				const playerInfo: DNAUserCardInfo | undefined = curFriendId ? getPlayerCardInfo(isLocal ? undefined : curFriendId, isLocal ? undefined : twoKName, true) : undefined;

				let backgroundURL: string = "";
				let badgeURL: string = "";
				let foundationLevel: number = 0;
				let playerTitle = "";

				if (playerInfo) {
					backgroundURL = playerInfo.BackgroundURL;
					badgeURL = playerInfo.BadgeURL;
					foundationLevel = playerInfo.FoundationLevel;
					playerTitle = playerInfo.playerTitle;
				}

				const samePlatformAsLocalPlayer: boolean = curPlatform == localPlatform;

				const playerData: MPLobbyPlayerData = {
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

	public stringify(player: MPLobbyPlayerData): string { //used in the databindings
		return JSON.stringify(player);
	}

	private GetMPLobbyPlayerConnectionStatus(playerConfig: ConfigurationPlayerAccessor): MPLobbyPlayerConnectionStatus {
		return !Network.isPlayerConnected(playerConfig.id) && !playerConfig.isAI ? MPLobbyPlayerConnectionStatus.DISCONNECTED : MPLobbyPlayerConnectionStatus.CONNECTED;
	}

	private formatDateToMinutes(seconds: number): string {
		const date: Date = new Date(seconds * 1000);

		// Format: "00:00"
		// .slice(-2) gives us the last two characters of the string so no matter if the number has 1 or more digits, we can add "0"
		// 9  -> "09"  --> "09"
		// 10 -> "010" --> "10"
		return ('0' + date.getMinutes()).slice(-2) + ':' + ('0' + date.getSeconds()).slice(-2);
	}

	private getTooltip(paramNameHandle: GameSetupStringHandle, paramID: string, playerID: PlayerId): string | undefined {
		switch (paramNameHandle) {
			case this.PlayerCivilizationStringHandle:
				return this.getCivilizationTooltip(paramID, playerID);
			case this.PlayerLeaderStringHandle:
				return this.getLeaderTooltip(paramID);
		}

		return;
	}

	private getCivilizationTooltip(civilizationType: string, playerID: PlayerId): string | undefined {
		let tt = this.cachedCivilizationTooltipFragments.get(civilizationType);
		if (tt == null) {
			const civData: CivData | undefined = this.civData.find(data => {
				return data.civID == civilizationType;
			})

			if (!civData) {
				console.error(`model-map-staging-new: Failed to find civData for ${civilizationType}`);
				return;
			}

			tt = `
			[STYLE:text-secondary][STYLE:font-title-lg]${Locale.compose(civData.name)}[/S][/S][N]
			${civData.tags && civData.tags.length > 0 ? `[N][B]${Locale.compose(civData.tags.join(", "))}[/B]` : ""}
			${civData.description && civData.description != "" ? `[N]${Locale.compose(civData.description)}` : ""}
			${civData.bonuses && civData.bonuses.length > 0 ? `[N][STYLE:text-secondary][STYLE:font-title-base]${Locale.compose("LOC_CREATE_CIV_UNIQUE_BONUSES_SUBTITLE")}[/S][/S]
				[N]${civData.bonuses.map((bonus) => { return Locale.compose(bonus.description) }).join("[N]")}` : ""}
			`;

			this.cachedCivilizationTooltipFragments.set(civilizationType, tt);
		}

		let civLeaderReasonType = "";
		const leaderParam = this.findPlayerParameter(playerID, this.PlayerLeaderStringHandle);
		if (leaderParam) {
			const leaderType = leaderParam.value.value as string;
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

	private getLeaderTooltip(leaderType: string): string | undefined {
		let tt = this.cachedLeaderTooltips.get(leaderType);
		if (tt == null) {
			const leaderData: LeaderData | undefined = this.leaderData.find(data => {
				return data.leaderID == leaderType;
			})

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

	private updateStartingGameReadyButtonData(totalCountdown: number, remainingTime: number, skipUpdate: boolean = false) {
		this.allReadyCountdownRemainingSeconds = Math.round(remainingTime / 1000);
		this.allReadyCountdownRemainingPercentage = remainingTime / totalCountdown * 100;

		this.readyButtonCaption = Locale.compose("LOC_UI_MP_LOBBY_READY_BUTTON_STARTING_GAME");
		// TODO BVHR https://2kfxs.atlassian.net/browse/IGP-60974 [mp-staging-new.ts][TODO] 3 TODOs: leaderIcon, 'bg-color' | display a text distinct from the readyButton.caption | display a (decreasing) gauge
		if (!skipUpdate && this.onUpdate) {
			this.onUpdate(this);
		}
	}

	private updateGlobalCountdownRemainingSecondsData(remainingTime: number, skipUpdate: boolean = false) {
		this.globalCountdownRemainingSeconds = Math.round(remainingTime / 1000);

		if (!skipUpdate && this.onUpdate) {
			this.onUpdate(this);
		}
	}

	private getRemainingGlobalCountdown(): number {
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

		const skipUpdate: boolean = true; // already handled in update() here
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
			} else {
				Audio.playSound("data-audio-timer-tick", "multiplayer-lobby");
				this.updateGlobalCountdownRemainingSecondsData(remainingTime);
			}
		}, MPLobbyDataModel.GLOBAL_COUNTDOWN_STEP);
	}

	updateTooltipData() {
		this.civData = GetCivilizationData();
	}

	private areAllPlayersReady(): boolean {
		let allReady: boolean = true;

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

	private getReadyStatus(localPlayerId: number): MPLobbyReadyStatus {
		let readyStatus: MPLobbyReadyStatus = MPLobbyReadyStatus.NOT_READY;

		if (Network.isPlayerStartReady(localPlayerId)) {
			// In case of hot joining, the launching of the game is dictated by the NetSnapshot message
			// We don't want to show a timer in that case, because the time to launch depends on how fast 
			// the host loads and it's not cancellable
			if (Network.isPlayerHotJoining(GameContext.localPlayerID)) {
				return MPLobbyReadyStatus.WAITING_FOR_HOST;
			}

			const allReady: boolean = this.areAllPlayersReady();
			if (allReady) {
				if (this.startGameRemainingTime <= 0 && !MPLobbyDataModel.isLocalHostPlayer()) {
					readyStatus = MPLobbyReadyStatus.WAITING_FOR_HOST;
				} else {
					readyStatus = MPLobbyReadyStatus.STARTING_GAME;
				}
			} else {
				readyStatus = MPLobbyReadyStatus.WAITING_FOR_OTHERS;
			}
		}

		return readyStatus;
	}

	private updateReadyButtonData(localPlayerId: number, forcedStatus?: MPLobbyReadyStatus) {
		const newReadyStatus: MPLobbyReadyStatus = forcedStatus ?? this.getReadyStatus(localPlayerId);
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
				} else {
					this.readyButtonCaption = Locale.compose("LOC_UI_MP_LOBBY_READY_BUTTON_NOT_READY");
				}
				break;

			case MPLobbyReadyStatus.WAITING_FOR_OTHERS:

				this.readyButtonCaption = Locale.compose("LOC_UI_MP_LOBBY_READY_BUTTON_WAITING_FOR_OTHERS");
				break;

			case MPLobbyReadyStatus.STARTING_GAME: {
				const skipUpdate: boolean = true; // already handled in update() here
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
					} else {
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

	private createPlayerParamDropdown(playerID: number, dropID: string, type: PlayerParamDropdownTypes, dropLabel: string, dropDesc: string, paramNameHandle: GameSetupStringHandle, isDisabled: boolean, showLabelOnSelectedItem: boolean, getIconURLFunc: (id: GameSetupDomainValue, locked: boolean) => string): MPLobbyDropdownOptionData {
		const dropdownData: MPLobbyDropdownOptionData = new MPLobbyDropdownOptionData();

		dropdownData.dropdownType = MPLobbyDropdownType.PLAYER_PARAM;
		dropdownData.id = dropID;
		dropdownData.type = type;
		dropdownData.label = dropLabel;
		dropdownData.description = dropDesc;
		dropdownData.isDisabled = isDisabled;
		dropdownData.showLabelOnSelectedItem = showLabelOnSelectedItem;
		dropdownData.playerParamName = GameSetup.resolveString(paramNameHandle) ?? undefined;

		const playerParamsData: PlayerParamDropdownItem[] = []

		const playerParameter: GameSetupParameter | null = this.findPlayerParameter(playerID, paramNameHandle);

		if (playerParameter) {
			playerParameter.domain.possibleValues?.forEach((v) => {
				if (v.invalidReason != GameSetupDomainValueInvalidReason.NotValid) {
					const paramID: string | undefined = v.value?.toString();
					const nameKey: string | null = GameSetup.resolveString(v.name);
					const locked: boolean = v.invalidReason != GameSetupDomainValueInvalidReason.Valid;
					const notOwned: boolean = v.invalidReason == GameSetupDomainValueInvalidReason.NotValidOwnership;
					const showLockIcon: boolean = v.invalidReason == GameSetupDomainValueInvalidReason.NotValidOwnership && (MPLobbyDataModel.isLocalPlayer(playerID) || MPLobbyDataModel.isLocalHostPlayer() && Configuration.getPlayer(playerID).isAI);
					const iconURL: string = getIconURLFunc ? getIconURLFunc(v, showLockIcon) : "";

					// special case for leader live event
					if (LiveEventManager.restrictToPreferredCivs()) {
						if (paramNameHandle == this.PlayerLeaderStringHandle && paramID == "RANDOM") {
							return; // don't show random for restricted leader-civs case
						}

						if (paramNameHandle == this.PlayerCivilizationStringHandle) {
							const currentLeaderID = this.findPlayerParameter(playerID, this.PlayerLeaderStringHandle)?.value?.value;
							const civLeaderPairingData = (Database.query('config', 'select * from LeaderCivParings') ?? []);
							const civFixed = civLeaderPairingData.find(row => row.LeaderType == currentLeaderID);
							const civID = civFixed?.CivilizationType as string ?? '';
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
		} else {
			console.error("model-mp-staging-new: createPlayerParamDropdown(): Failed to find the paramName: " + GameSetup.resolveString(paramNameHandle) + " for playerID: " + playerID);
		}

		dropdownData.itemList = playerParamsData;
		return dropdownData;
	}

	private createTeamParamDropdown(playerID: number, dropID: string, type: PlayerParamDropdownTypes, dropLabel: string, dropDesc: string, paramNameHandle: GameSetupStringHandle, isDisabled: boolean, showLabelOnSelectedItem: boolean): MPLobbyDropdownOptionData {
		const dropdownData: MPLobbyDropdownOptionData = new MPLobbyDropdownOptionData();

		dropdownData.dropdownType = MPLobbyDropdownType.TEAM;
		dropdownData.id = dropID;
		dropdownData.type = type;
		dropdownData.label = dropLabel;
		dropdownData.description = dropDesc;
		dropdownData.isDisabled = isDisabled;
		dropdownData.showLabelOnSelectedItem = showLabelOnSelectedItem;
		dropdownData.playerParamName = GameSetup.resolveString(paramNameHandle) ?? undefined;

		const playerParamsData: TeamDropdownItem[] = []

		playerParamsData.push({ label: "", teamID: -1, tooltip: "LOC_UI_MP_LOBBY_DROPDOWN_TEAM_DESC", disabled: false });

		for (let i: number = 0; i < 8; i++) {
			playerParamsData.push({ label: Locale.compose("LOC_UI_MP_LOBBY_TEAM", i + 1), teamID: i, tooltip: "LOC_UI_MP_LOBBY_DROPDOWN_TEAM_DESC", disabled: false });
		}

		const playerConfig: ConfigurationPlayerAccessor = Configuration.getPlayer(playerID);
		dropdownData.selectedItemIndex = playerConfig.team + 1;	// config returns -1 for no team, 0 for team 1, etc.  We have 0 for no team, 1 for team 1, etc.
		dropdownData.itemList = playerParamsData;
		return dropdownData;
	}

	private createSlotActionsDropdown(playerID: number, gamertag: string, isDisabled: boolean, lobbyPlayerConnectionStatus: MPLobbyPlayerConnectionStatus): MPLobbyDropdownOptionData | null {
		const slotActionsData: SlotActionDropdownItem[] = [{ label: gamertag, slotActionType: MPLobbySlotActionType.NONE }];

		for (let [_actionKey, actionOption] of this.slotActionsData) {
			if (actionOption.showCheckCallback(playerID, actionOption)) {
				slotActionsData.push({ label: actionOption.displayName, slotActionType: actionOption.actionType });
			}
		}

		const dropdownData: MPLobbyDropdownOptionData = new MPLobbyDropdownOptionData();

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

	private setupListeners() {
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

	private onKickVoteStarted(data: KickVoteStartedData): void {
		// Voting to a Kick Vote

		this.update();

		if (MPLobbyDataModel.isLocalPlayer(data.kickPlayerID) || MPLobbyDataModel.isLocalPlayer(data.kickerPlayerID)) {
			// Don't show popup if people want to kick us or if we instigated the vote kick
			return;
		}

		const dialogCallback: DialogBoxCallbackSignature = (eAction: DialogBoxAction) => {
			if (eAction == DialogBoxAction.Confirm
				|| eAction == DialogBoxAction.Cancel
				|| eAction == DialogBoxAction.Close) {
				Network.kickVotePlayer(data.kickPlayerID, eAction == DialogBoxAction.Confirm, data.kickReason);
			} else {
				console.error("model-mp-staging-new: onKickVoteStarted(): Invalid dialog action (" + eAction + ")");
			}
		};

		const kickPlayerConfig: ConfigurationPlayerAccessor = Configuration.getPlayer(data.kickPlayerID);
		const kickPlayerName: string = Locale.compose(kickPlayerConfig.slotName);
		const kickerPlayerConfig: ConfigurationPlayerAccessor = Configuration.getPlayer(data.kickerPlayerID);
		const kickerPlayerName: string = Locale.compose(kickerPlayerConfig.slotName);

		const dialogBoxID: DialogBoxID = DialogManager.createDialog_ConfirmCancel({
			body: Locale.compose("LOC_KICK_VOTE_CHOICE_DIALOG", kickPlayerName, kickerPlayerName),
			title: "LOC_KICK_DIALOG_TITLE",
			callback: dialogCallback
		});

		this.addVoteDialogBox(data.kickPlayerID, dialogBoxID);

	}

	private onMultiplayerHostMigrated(_data: MultiplayerHostMigratedData): void {
		if (this.startGameRemainingTime <= 0 && MPLobbyDataModel.isLocalHostPlayer()) {
			Network.startGame();
		}
	}

	private onKickVoteComplete(data: KickVoteCompleteData): void {
		if (data.kickResult == KickVoteResultType.KICKVOTERESULT_PENDING) {
			console.log("model-mp-staging-new: onKickVoteComplete(): Vote in progress, not everyone voted yet...");
			// Vote in progress, not everyone voted yet...
			return;
		}

		let voteWasCancelled: boolean = false;

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

			const dialogBoxID: DialogBoxID | undefined = this.voteDialogBoxIDPerKickPlayerID.get(data.kickPlayerID);
			if (!dialogBoxID) {
				console.error("model-mp-staging-new: onKickVoteComplete(): No dialog box found for kick vote player ID: " + data.kickPlayerID);
			} else {
				DialogManager.closeDialogBox(dialogBoxID);
			}
		}

		this.removeVoteDialogBox(data.kickPlayerID);

		this.update();
	}

	private kickTimerExpired() {
		window.clearTimeout(this.kickTimerReference);
		this.kickVoteLockout = false;
	}

	private pushDummyPlayersData() {
		const kickTooltip: string = Locale.compose("LOC_SLOT_ACTION_KICK_PLAYER");
		const muteTooltip: string = Locale.compose("LOC_SLOT_ACTION_MUTE");
		const unmuteTooltip: string = Locale.compose("LOC_SLOT_ACTION_UNMUTE");
		const hostPlayerId: number = 0;

		const isLocalHost: boolean = true; // Is the Local player also the Host? Any case they are human.
		const isKickVote: boolean = true; // Kick Vote (true) or Direct Kick mode?
		this.updateReadyButtonData(hostPlayerId, MPLobbyReadyStatus.NOT_READY);

		const canLocalPlayerEverKick: boolean = isKickVote || isLocalHost;

		// Host player, potentially also the Local player
		const gamertag1: string = "Catpcha";
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
			canEverBeKicked: canLocalPlayerEverKick && !isLocalHost, // simplified to: canLocalPlayerEverKick AND isDistantHuman
			canBeKickedNow: canLocalPlayerEverKick && !isLocalHost, // idem
			kickTooltip: kickTooltip,
			isKickVoteTarget: false,
			isMuted: false,
			muteTooltip: muteTooltip,
			mementos: [],
			samePlatformAsLocalPlayer: true
		});

		// Other human players

		// Alternative Local player (if it is not the host)
		const gamertag2: string = "Civ_King45";
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
			playerInfoDropdown: this.createSlotActionsDropdown(0, gamertag1, false, MPLobbyPlayerConnectionStatus.CONNECTED)!,
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

		const gamertag3: string = "CoffeeAnt";
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
			playerInfoDropdown: this.createSlotActionsDropdown(0, gamertag1, false, MPLobbyPlayerConnectionStatus.CONNECTED)!,
			civilizationDropdown: this.createPlayerParamDropdown(2, 'civ_selector_0', PlayerParamDropdownTypes.PLAYER_CIV, PlayerParamDropdownTypes.PLAYER_CIV, Locale.compose("LOC_UI_MP_LOBBY_DROPDOWN_CIV_DESC"), this.PlayerCivilizationStringHandle, false, false, this.civIconURLGetter),
			teamDropdown: this.createTeamParamDropdown(2, 'team_selector_0', PlayerParamDropdownTypes.PLAYER_TEAM, PlayerParamDropdownTypes.PLAYER_TEAM, Locale.compose("LOC_UI_MP_LOBBY_DROPDOWN_TEAM_DESC"), this.PlayerTeamStringHandle, false, false),
			leaderDropdown: this.createPlayerParamDropdown(2, 'leader_selector_0', PlayerParamDropdownTypes.PLAYER_LEADER, PlayerParamDropdownTypes.PLAYER_LEADER, Locale.compose("LOC_UI_MP_LOBBY_DROPDOWN_LEADER_DESC"), this.PlayerLeaderStringHandle, false, true, this.leaderIconURLGetter),
			isHuman: true,
			isDistantHuman: true,
			canEverBeKicked: canLocalPlayerEverKick,
			canBeKickedNow: false, // intentionally NOT equal to canEverBeKicked
			kickTooltip: kickTooltip,
			isKickVoteTarget: false,
			isMuted: false,
			muteTooltip: muteTooltip,
			mementos: [],
			samePlatformAsLocalPlayer: false
		});

		const gamertag4: string = "OrionBird";//= "WWWWWWWWWWWWWWWW";
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
			playerInfoDropdown: this.createSlotActionsDropdown(0, gamertag1, false, MPLobbyPlayerConnectionStatus.CONNECTED)!,
			civilizationDropdown: this.createPlayerParamDropdown(3, 'civ_selector_0', PlayerParamDropdownTypes.PLAYER_CIV, PlayerParamDropdownTypes.PLAYER_CIV, Locale.compose("LOC_UI_MP_LOBBY_DROPDOWN_CIV_DESC"), this.PlayerCivilizationStringHandle, false, false, this.civIconURLGetter),
			teamDropdown: this.createTeamParamDropdown(3, 'team_selector_0', PlayerParamDropdownTypes.PLAYER_TEAM, PlayerParamDropdownTypes.PLAYER_TEAM, Locale.compose("LOC_UI_MP_LOBBY_DROPDOWN_TEAM_DESC"), this.PlayerTeamStringHandle, false, false),
			leaderDropdown: this.createPlayerParamDropdown(3, 'leader_selector_0', PlayerParamDropdownTypes.PLAYER_LEADER, PlayerParamDropdownTypes.PLAYER_LEADER, Locale.compose("LOC_UI_MP_LOBBY_DROPDOWN_LEADER_DESC"), this.PlayerLeaderStringHandle, false, true, this.leaderIconURLGetter),
			isHuman: true,
			isDistantHuman: true,
			canEverBeKicked: canLocalPlayerEverKick,
			canBeKickedNow: !isKickVote, // opposed to isKickVoteTarget
			kickTooltip: kickTooltip,
			isKickVoteTarget: isKickVote,
			isMuted: true,
			muteTooltip: unmuteTooltip,
			mementos: [],
			samePlatformAsLocalPlayer: true
		});

		// AI slot
		const gamertagRandom: string = "Random Leader";
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
			playerInfoDropdown: this.createSlotActionsDropdown(0, gamertag1, false, MPLobbyPlayerConnectionStatus.CONNECTED)!,
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
		const gamertagClose: string = "Closed";
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
			playerInfoDropdown: this.createSlotActionsDropdown(0, gamertag1, false, MPLobbyPlayerConnectionStatus.CONNECTED)!,
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
		this.playersData.forEach(playerData => { if (playerData.isLocal && playerData.playerInfoDropdown) playerData.playerInfoDropdown.itemList = []; });
	}

	onLobbyDropdown(event: DropdownSelectionChangeEvent) {
		const dropdown = event.target;
		if (!(dropdown instanceof HTMLElement)) {
			return;
		}

		const dropdownTypeAttribute: string | null = dropdown.getAttribute("data-dropdown-type");
		if (dropdownTypeAttribute) {
			const dropdownType: MPLobbyDropdownType = dropdownTypeAttribute as MPLobbyDropdownType;
			const dropdownCallback: MPLobbyDropdownCallback | undefined = this.dropdownCallbacks.get(dropdownType);
			if (dropdownCallback) {
				dropdownCallback(event);
			}
			else {
				console.error(`model-mp-staging-new: onLobbyDropdown(): Failed to find callback function for callback name ${dropdownType}`);
			}
		}
	}

	private onTeamDropdown(event: DropdownSelectionChangeEvent) {
		const dropdown = event.target;
		if (!(dropdown instanceof HTMLElement)) {
			return;
		}

		const { teamID } = event.detail.selectedItem as TeamDropdownItem
		const playerIDStr: string | null = dropdown.getAttribute("data-player-id");
		if (playerIDStr) {
			const playerID: number = parseInt(playerIDStr);
			const playerConfig: ConfigurationPlayerMutator | null = Configuration.editPlayer(playerID);
			playerConfig?.setTeam(teamID);
		}
	}

	private onPlayerParamDropdown(event: DropdownSelectionChangeEvent) {
		const dropdown = event.target;
		if (!(dropdown instanceof HTMLElement)) {
			return;
		}

		const { paramID } = event.detail.selectedItem as PlayerParamDropdownItem;
		const playerIDStr: string | null = dropdown.getAttribute("data-player-id");
		const playerParam: string | null = dropdown.getAttribute("data-player-param");
		if (paramID && playerIDStr && playerParam) {
			const playerID: number = parseInt(playerIDStr);

			// special case for leader live event
			if (playerParam == "PlayerLeader" && LiveEventManager.restrictToPreferredCivs()) {
				const civLeaderPairingData = (Database.query('config', 'select * from LeaderCivParings') ?? []);
				const civFixed = civLeaderPairingData.find(row => row.LeaderType == paramID);
				const civID = civFixed?.CivilizationType as string ?? '';

				GameSetup.setPlayerParameterValue(playerID, "PlayerCivilization", civID);
			}

			GameSetup.setPlayerParameterValue(playerID, playerParam, paramID);
		}
	}

	private onSlotActionDropdown(event: DropdownSelectionChangeEvent) {
		const dropdown = event.target;
		if (!(dropdown instanceof HTMLElement)) {
			return;
		}

		const { slotActionType } = event.detail.selectedItem as SlotActionDropdownItem;
		const playerIDStr: string | null = dropdown.getAttribute("data-player-id");

		if (playerIDStr) {
			const playerID: number = parseInt(playerIDStr);
			switch (slotActionType) {
				case MPLobbySlotActionType.CLOSE:
				case MPLobbySlotActionType.OPEN:
				case MPLobbySlotActionType.AI:
					{
						const slotActionData: MPLobbySlotActionData | undefined = MPLobbyModel.slotActionsData.get(slotActionType);
						if (slotActionData && slotActionData.slotStatus != undefined) {
							const playerConfig: ConfigurationPlayerMutator | null = Configuration.editPlayer(playerID);
							if (playerConfig) {
								playerConfig.setSlotStatus(slotActionData.slotStatus);
							} else {
								console.warn("model-mp-staging-new: onSlotActionDropdown(): No playerConfig found for this playerID: " + playerID);
							}
						} else {
							console.warn("model-mp-staging-new: onSlotActionDropdown(): No valid slotActionData found for this slotActionType: " + slotActionType);
						}
					}

					break;
				case MPLobbySlotActionType.SWAP:
					Network.requestSlotSwap(playerID);
					break;
				case MPLobbySlotActionType.VIEW:
					const nativeId: string = Online.Social.getPlayerFriendID_Network(playerID);
					const t2gpId: string = Online.Social.getPlayerFriendID_T2GP(playerID);
					Online.Social.viewProfile(nativeId, t2gpId);

					// Update to reset the selected index, otherwise it won't work the next time
					this.update();
					break;
			}
		}
	}

	private canChangeSlotStatus(targetPlayerID: number, slotActionData: MPLobbySlotActionData): boolean {
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

		const newStatus: SlotStatus = slotActionData.slotStatus;
		const targetPlayerConfig: ConfigurationPlayerAccessor = Configuration.getPlayer(targetPlayerID);

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
			const mapConfig: ConfigurationMapAccessor = Configuration.getMap();
			if (mapConfig) {
				if (this.participatingCount <= mapConfig.minMajorPlayers) {
					return false;
				}
			}
		}

		return (!targetPlayerConfig.isHuman // can only change a slot status where there is no human player yet
			&& targetPlayerConfig.slotStatus != newStatus); // effective new slot status
	}

	private canSwap(targetPlayerID: number): boolean {
		if (MPLobbyDataModel.isLocalPlayer(targetPlayerID)) { // we can not swap with our own slot!
			return false;
		}

		const targetPlayerConfig: ConfigurationPlayerAccessor = Configuration.getPlayer(targetPlayerID);
		// the target slot must be occupable by human players.
		return (!targetPlayerConfig.isLocked
			&& targetPlayerConfig.canBeHuman
			&& targetPlayerConfig.slotStatus != SlotStatus.SS_CLOSED);
	}
}

const MPLobbyModel: MPLobbyDataModel = MPLobbyDataModel.getInstance();

engine.whenReady.then(() => {
	const updateModel = () => {
		engine.updateWholeModel(MPLobbyModel);
	}

	engine.createJSModel('g_MPLobbyModel', MPLobbyModel);
	MPLobbyModel.updateCallback = updateModel;
});
export { MPLobbyModel as default }

declare global {
	interface HTMLElementEventMap {
		[LobbyUpdateEventName]: LobbyUpdateEvent;
	}
}