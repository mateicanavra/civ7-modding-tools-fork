/**
 * @file model-diplo-ribbon.ts
 * @copyright 2021-2025, Firaxis Games
 * @description All of the data for the diplomacy ribbon
 */

import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import { getPlayerColorValues, isPrimaryColorLighter } from '/core/ui/utilities/utilities-color.js';
import { Icon } from '/core/ui/utilities/utilities-image.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';

import DiplomacyManager from '/base-standard/ui/diplomacy/diplomacy-manager.js';
import VictoryProgress, { PlayerScore } from '/base-standard/ui/victory-progress/model-victory-progress.js';

export enum RibbonStatsToggleStatus {
	RibbonStatsHidden = 0,
	RibbonStatsShowing = 1
}

export enum RibbonDisplayType {
	Yields = 1,
	Size = 2,
	Scores = 3
}

export enum RibbonYieldType {
	Default = 'default',
	Gold = 'gold',
	Culture = 'culture',
	Science = 'science',
	Happiness = 'happiness',
	Diplomacy = 'diplomacy',
	Trade = 'trade',

	Settlements = 'settlements',
	Property = 'property',
	Victory = 'victory'
}

type PlayerTradeYields = {
	currentTradesWithCiv: number
	maxTradeLimitWithCiv: number
}

type PlayerDataYields = {
	type?: RibbonYieldType,
	label: string;
	value: string;
	img: string;
	details: string;
	rawValue: number;
	warningThreshold: number;
}

export interface PlayerDataObject {
	id: PlayerId;
	shortName: string;
	name: string;
	alwaysShow: boolean;
	leaderType: string;
	portraitContext: string;
	civName: string;
	civSymbol: string;
	civLine: string;
	playerColors?: string;
	isPrimaryLighter?: boolean;
	primaryColor: string;
	secondaryColor: string;
	displayItems: PlayerDataYields[];

	yields: PlayerDataYields[];
	size: PlayerDataYields[];
	scores: PlayerDataYields[];
	canClick: boolean;
	selected: boolean;
	isTurnActive: boolean;
	dealIds: DiplomacyDealId[];
	relationshipIcon: string;
	relationshipLevel: number;
	relationshipTooltip: string;
	warSupport: number;
	isAtWar: boolean;
}

const RibbonDisplayOptionNames: Map<RibbonDisplayType, string> = new Map([
	[RibbonDisplayType.Scores, "RibbonShowScores"],
	[RibbonDisplayType.Size, "RibbonShowSize"],
	[RibbonDisplayType.Yields, "RibbonShowYields"]
]);

type RelationshipData = {
	relationshipType: DiplomacyPlayerRelationships,
	relationshipLevel: number,
	relationshipTooltip: string
}

type DiploSectionSelected = {
	playerId: PlayerId,
	section: "relationship" | "unset"
}


export const UpdateDiploRibbonEventName = 'update-diplo-ribbon' as const;
export class UpdateDiploRibbonEvent extends CustomEvent<{}> {
	constructor() {
		super(UpdateDiploRibbonEventName, { bubbles: false });
	}
}

class PlayerUpdateQueue {
	public queue = new Set<PlayerId>();

	// Add a player and return true if it was added, false if it was already there
	add(playerId: PlayerId): boolean {
		if (this.queue.has(playerId) == false) {
			this.queue.add(playerId);
			return true;
		}
		return false;
	}

	clear() {
		this.queue.clear();
	}
};

class DiploRibbonModel {
	private static _Instance: DiploRibbonModel;
	private onUpdate?: (model: DiploRibbonModel) => void;
	private updateQueued: boolean = false;

	private _playerData: PlayerDataObject[] = [];
	private _localPlayerStats: PlayerDataYields[] = [];
	private _diploStatementPlayerData: PlayerDataObject[] = [];

	private refDataModelChangedQueue: number = 0;
	private playerYieldUpdateQueue: PlayerUpdateQueue = new PlayerUpdateQueue;
	private playerScoreUpdateQueue: PlayerUpdateQueue = new PlayerUpdateQueue;
	private playerSizeUpdateQueue: PlayerUpdateQueue = new PlayerUpdateQueue;
	private playerGlobalTokensUpdateQueue: PlayerUpdateQueue = new PlayerUpdateQueue;
	private playerSanctionUpdateQueue: PlayerUpdateQueue = new PlayerUpdateQueue;
	private playerWarUpdateQueue: PlayerUpdateQueue = new PlayerUpdateQueue;
	private selected: boolean = false;
	private canClick: boolean = false;

	private _sectionSelected: DiploSectionSelected = {
		playerId: PlayerIds.NO_PLAYER,
		section: "unset"
	};

	private _ribbonDisplayTypes: RibbonDisplayType[] = [RibbonDisplayType.Yields];
	private previousDisplayTypes: RibbonDisplayType[] = this._ribbonDisplayTypes;

	private RIBBON_DISPLAY_OPTION_SET: string = 'user';
	private RIBBON_DISPLAY_OPTION_TYPE: string = "Interface";

	private _alwaysShowYields: RibbonStatsToggleStatus = RibbonStatsToggleStatus.RibbonStatsHidden;
	private _userDiploRibbonsToggled: RibbonStatsToggleStatus = RibbonStatsToggleStatus.RibbonStatsHidden;

	private _eventNotificationRefresh: LiteEvent<void> = new LiteEvent<void>();

	private updateDiploRibbonListener: EventListener = this.queueUpdate.bind(this);
	private interfaceModeChangedListener: EventListener = this.onInterfaceModeChanged.bind(this);
	private diplomacyDialogNextListener: EventListener = this.updateDiploStatementPlayerData.bind(this);

	private constructor() {
		this.updateAll();

		engine.on('PlayerYieldChanged', this.onPlayerYieldChanged, this);
		engine.on('CultureYieldChanged', this.onCultureYieldChanged, this);
		engine.on('ScienceYieldChanged', this.onResearchYieldChanged, this);
		engine.on('TreasuryChanged', this.onTreasuryChanged, this);
		engine.on('DiplomacyTreasuryChanged', this.onDiplomacyTreasuryChanged, this);
		engine.on('CityPopulationChanged', this.onCityPopulationChanged, this);
		engine.on('CityYieldChanged', this.onCityYieldChanged, this);
		engine.on('PlayerSettlementCapChanged', this.onPlayerSettlementCapChanged, this);
		engine.on('PlayerTurnActivated', this.onPlayerTurnActivated, this);
		engine.on('PlayerTurnDeactivated', this.onPlayerTurnDeactivated, this);
		engine.on('DiplomacyDeclareWar', this.onDiplomacyDeclareWar, this);
		engine.on('DiplomacyMakePeace', this.onDiplomacyMakePeace, this);
		engine.on('DiplomacyMeet', this.onDiplomacyMeet, this);
		engine.on('DiplomacyMeetMajors', this.onDiplomacyMeet, this);
		engine.on('DiplomacyGlobalTokensChanged', this.onGlobalTokensChanged, this);
		engine.on('DiplomacyRelationshipStatusChanged', this.onRelationshipStatusChanged, this);
		engine.on('WonderCompleted', this.onWonderCompleted, this);
		engine.on('MultiplayerPostPlayerDisconnected', this.onPlayerPostDisconnected, this);
		engine.on('PlayerAgeTransitionComplete', this.onPlayerAgeTransitionComplete, this);
		engine.on('AutoplayEnded', this.onAutoplayEnd, this);
		engine.on('AutoplayStarted', this.onAutoplayStarted, this);
		engine.on('DiplomacyEventSupportChanged', this.onSupportChanged, this);
		engine.on('DiplomacyEventCanceled', this.onActionCanceled, this);
		engine.on('TraditionChanged', this.onPolicyChanged, this);
		engine.on('AdvancedStartEffectUsed', this.effectUsedListener, this);
		engine.on('AttributeNodeCompleted', this.onAttributeNodeCompleted, this);

		//TODO: more targeted update
		engine.on('DiplomacyRelationshipLevelChanged', this.queueUpdate, this);

		// TODO: Are these events needed?
		engine.on('DiplomacyEventStarted', this.queueUpdate, this);
		engine.on('DiplomacyEventEnded', this.queueUpdate, this);
		engine.on('GoodyHutReward', this.queueUpdate, this);

		// main-menu-return fires on exiting the options menu
		window.addEventListener('main-menu-return', this.updateDiploRibbonListener);
		window.addEventListener('update-diplo-ribbon', this.updateDiploRibbonListener);
		window.addEventListener('interface-mode-changed', this.interfaceModeChangedListener);
		window.addEventListener('diplomacy-dialog-next', this.diplomacyDialogNextListener);

	}

	static getInstance() {

		if (!DiploRibbonModel._Instance) {
			DiploRibbonModel._Instance = new DiploRibbonModel();
		}
		return DiploRibbonModel._Instance;
	}

	get playerData(): Readonly<PlayerDataObject[]> {
		return this._playerData;
	}

	get diploStatementPlayerData(): Readonly<PlayerDataObject[]> {
		return this._diploStatementPlayerData;
	}

	get localPlayerStats(): Readonly<PlayerDataYields[]> {
		return this._localPlayerStats;
	}

	set sectionSelected(value: DiploSectionSelected) {
		this._sectionSelected = value;
	}

	get sectionSelected(): DiploSectionSelected {
		return this._sectionSelected;
	}

	get ribbonDisplayTypes(): Readonly<RibbonDisplayType[]> {
		return this._ribbonDisplayTypes;
	}

	get eventNotificationRefresh() {
		return this._eventNotificationRefresh.expose();
	}

	get areRibbonYieldsStuckOnScreen() {
		return this._alwaysShowYields == RibbonStatsToggleStatus.RibbonStatsShowing || this._userDiploRibbonsToggled == RibbonStatsToggleStatus.RibbonStatsShowing;
	}

	set userDiploRibbonsToggled(newStatus: RibbonStatsToggleStatus) {
		this._userDiploRibbonsToggled = newStatus;
	}

	get userDiploRibbonsToggled() {
		return this._userDiploRibbonsToggled;
	}


	setRibbonDisplayOption(type: RibbonDisplayType, value: number) {
		const optionName: string | undefined = RibbonDisplayOptionNames.get(type);
		if (!optionName) {
			console.error("model-diplo-ribbon: Unable to get optionName with RibbonDisplayType: " + type);
			return;
		}
		UI.setOption(this.RIBBON_DISPLAY_OPTION_SET, this.RIBBON_DISPLAY_OPTION_TYPE, optionName, value);

		//TODO: Change to specific, more targeted function, only need to update the yields
		this.queueUpdate();
	}

	set updateCallback(callback: (model: DiploRibbonModel) => void) {
		this.onUpdate = callback;
	}

	private updateAll() {
		this.getRibbonDisplayTypesFromUserOptions();

		VictoryProgress.update();
		const playerList: PlayerLibrary[] = Players.getAlive();
		const localPlayerID: PlayerId = GameContext.localPlayerID;
		const localPlayer: PlayerLibrary | null = Players.get(localPlayerID);

		if (!localPlayer) {
			console.error("model-diplo-ribbon: Unable to find local player library, can't update player data!");
			return;
		}

		const localPlayerDiplomacy: PlayerDiplomacy | undefined = localPlayer.Diplomacy;
		if (!localPlayerDiplomacy) {
			console.error("model-diplo-ribbon: Unable to find local player diplomacy, can't update player data!");
			return;
		}

		this._playerData = [];
		const localPlayerData: PlayerDataObject = this.createPlayerData(localPlayer, localPlayerDiplomacy, true);
		this._playerData.push(localPlayerData)

		for (const p of playerList) {
			if (p.isMajor && p.id != localPlayerID && (localPlayerDiplomacy.hasMet(p.id) || p.isHuman)) {
				const playerDiplomacy: PlayerDiplomacy | undefined = p.Diplomacy;
				if (!playerDiplomacy) {
					console.error("model-diplo-ribbon: unable to find PlayerDiplomacy for player with id: " + p.id);
					return;
				}
				const relationShipData: RelationshipData = {
					relationshipType: playerDiplomacy.getRelationshipEnum(localPlayerID),
					relationshipLevel: playerDiplomacy.getRelationshipLevel(localPlayerID),
					relationshipTooltip: Locale.compose(playerDiplomacy.getRelationshipLevelName(localPlayerID))
				}
				const playerData: PlayerDataObject = this.createPlayerData(p, playerDiplomacy, localPlayerDiplomacy.hasMet(p.id), relationShipData);
				if (localPlayerDiplomacy.isAtWarWith(playerData.id)) {
					playerData.relationshipIcon = UI.getIcon("PLAYER_RELATIONSHIP_AT_WAR", "PLAYER_RELATIONSHIP");
				} else if (localPlayerDiplomacy.hasAllied(playerData.id)) {
					playerData.relationshipIcon = UI.getIcon("PLAYER_RELATIONSHIP_ALLIANCE", "PLAYER_RELATIONSHIP");
				}

				this._playerData.push(playerData);
				this.updatePlayerWarSupport(p.id);
			}
		}

		this._alwaysShowYields = Configuration.getUser().getValue("RibbonStats");
		if (this._alwaysShowYields) {
			Audio.playSound("data-audio-focus", "audio-panel-diplo-ribbon");
		}
		this.onUpdate?.(this);
		// Signal the panel that the model data has changed
		this._eventNotificationRefresh.trigger();
	}

	private getRibbonDisplayTypesFromUserOptions() {
		this._ribbonDisplayTypes = [];
		const showYieldsOption: number | null = UI.getOption(this.RIBBON_DISPLAY_OPTION_SET, this.RIBBON_DISPLAY_OPTION_TYPE, "RibbonShowYields");
		if (showYieldsOption == null) {
			//Default to show yields in diplo ribbon
			UI.setOption(this.RIBBON_DISPLAY_OPTION_SET, this.RIBBON_DISPLAY_OPTION_TYPE, "RibbonShowYields", 1);
			this._ribbonDisplayTypes.push(RibbonDisplayType.Yields);
		} else if (showYieldsOption == 1) {
			this._ribbonDisplayTypes.push(RibbonDisplayType.Yields);
		}

		const showScoresOption: number | null = UI.getOption(this.RIBBON_DISPLAY_OPTION_SET, this.RIBBON_DISPLAY_OPTION_TYPE, "RibbonShowScores");
		if (showScoresOption == null) {
			UI.setOption(this.RIBBON_DISPLAY_OPTION_SET, this.RIBBON_DISPLAY_OPTION_TYPE, "RibbonShowScores", 0);
		} else if (showScoresOption == 1) {
			this._ribbonDisplayTypes.push(RibbonDisplayType.Scores);
		}

		const showSizeOption: number | null = UI.getOption(this.RIBBON_DISPLAY_OPTION_SET, this.RIBBON_DISPLAY_OPTION_TYPE, "RibbonShowSize");
		if (showSizeOption == null) {
			UI.setOption(this.RIBBON_DISPLAY_OPTION_SET, this.RIBBON_DISPLAY_OPTION_TYPE, "RibbonShowSize", 0);
		} else if (showSizeOption == 1) {
			this._ribbonDisplayTypes.push(RibbonDisplayType.Size);
		}
	}

	private updateDiploStatementPlayerData() {
		if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_DIALOG") && !DiplomacyManager.currentDiplomacyDialogData) {
			console.error("model-diplo-ribbon: Invalid currentDiplomacyDialogData!");
			return;
		}

		if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_CALL_TO_ARMS") && !DiplomacyManager.currentAllyWarData) {
			console.error("model-diplo-ribbon: Invalid currentAllyWarData!");
			return;
		}

		this._diploStatementPlayerData = [];
		let leftPlayerID = InterfaceMode.isInInterfaceMode("INTERFACEMODE_CALL_TO_ARMS") ? DiplomacyManager.currentAllyWarData!.targetPlayer : GameContext.localPlayerID;
		let rightPlayerID = InterfaceMode.isInInterfaceMode("INTERFACEMODE_CALL_TO_ARMS") ? DiplomacyManager.currentAllyWarData!.initialPlayer : InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_PROJECT_REACTION") ? DiplomacyManager.currentProjectReactionRequest!.initialPlayer : DiplomacyManager.currentDiplomacyDialogData!.OtherPlayerID;
		const leftPlayer: PlayerLibrary | null = Players.get(leftPlayerID);
		const rightPlayer: PlayerLibrary | null = Players.get(rightPlayerID);
		if (!leftPlayer) {
			console.error("model-diplo-ribbon: can't find PlayerLibrary for local observer: " + GameContext.localObserverID);
			return;
		}

		if (!rightPlayer) {
			console.error("model-diplo-ribbon: can't find PlayerLibrary for otherPlayerID: " + rightPlayerID);
			return;
		}

		const leftPlayerDiplomacy: PlayerDiplomacy | undefined = leftPlayer.Diplomacy;
		if (!leftPlayerDiplomacy) {
			console.error("model-diplo-ribbon: Unable to find local player diplomacy, can't update player data!");
			return;
		}

		const rightPlayerDiplomacy: PlayerDiplomacy | undefined = rightPlayer.Diplomacy;
		if (!rightPlayerDiplomacy) {
			console.error("model-diplo-ribbon: unable to find PlayerDiplomacy for player with id: " + rightPlayer.id);
			return;
		}

		const leftPlayerData: PlayerDataObject = this.createPlayerData(leftPlayer, leftPlayerDiplomacy, true);
		this._diploStatementPlayerData.push(leftPlayerData);

		const rightPlayerData: PlayerDataObject = this.createPlayerData(rightPlayer, rightPlayerDiplomacy, true);
		this._diploStatementPlayerData.push(rightPlayerData);
		this.updatePlayerWarSupport(rightPlayerData.id);

		if (this.onUpdate) {
			this.onUpdate(this);
		}
		this._eventNotificationRefresh.trigger();
	}

	createPlayerData(player: PlayerLibrary, playerDiplomacy: PlayerDiplomacy, isKnownPlayer: boolean, relationshipData?: RelationshipData): PlayerDataObject {

		const isLocal: boolean = (GameContext.localObserverID == player.id);
		const theSelectedPlayer = Players.get(DiplomacyManager.selectedPlayerID);
		if (theSelectedPlayer) {
			this.selected = player.id == DiplomacyManager.selectedPlayerID && InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_HUB") || (isLocal && (theSelectedPlayer.isIndependent || theSelectedPlayer.isMinor));
		}
		else {
			this.selected = player.id == DiplomacyManager.selectedPlayerID && InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_HUB")
		}
		if (theSelectedPlayer) {
			this.canClick = (!this.selected && !InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_DIALOG") && !InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_PROJECT_REACTION") && !InterfaceMode.isInInterfaceMode("INTERFACEMODE_CALL_TO_ARMS") && isKnownPlayer) || (isLocal && (theSelectedPlayer?.isMinor || theSelectedPlayer?.isIndependent));
		}
		else {
			this.canClick = !this.selected && !InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_DIALOG") && !InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_PROJECT_REACTION") && !InterfaceMode.isInInterfaceMode("INTERFACEMODE_CALL_TO_ARMS") && isKnownPlayer;
		}
		const leader: LeaderDefinition | null = GameInfo.Leaders.lookup(player.leaderType);
		const leaderName: string = Locale.compose((leader == null) ? "LOC_LEADER_NONE_NAME" : leader.Name);

		let name: string = (!player.isHuman || isLocal) ? Locale.compose(player.name) : !isKnownPlayer ? Locale.compose("LOC_DIPLOMACY_RIBBON_HUMAN_PLAYER_UNMET_NAME", Locale.compose(player.name)) : Locale.compose("LOC_DIPLOMACY_RIBBON_HUMAN_PLAYER_MET_NAME", Locale.compose(player.name), leaderName);
		const shortName = name;
		name += "[n]" + Locale.compose(player.civilizationName);

		let portraitContext: string = "";
		switch (relationshipData?.relationshipType) {
			case DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_HOSTILE:
			case DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_UNFRIENDLY:
				portraitContext = "LEADER_ANGRY";
				break;
			case DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_FRIENDLY:
			case DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_HELPFUL:
				portraitContext = "LEADER_HAPPY"
				break;
			default:
				break;
		}

		const dataObj: PlayerDataObject = {
			id: player.id,
			shortName,
			name: name,
			alwaysShow: isLocal || player.isHuman,
			leaderType: isKnownPlayer ? (GameInfo.Leaders.lookup(player.leaderType)?.LeaderType ?? "UNKNOWN_LEADER") : "UNKNOWN_LEADER",
			portraitContext: portraitContext,
			civName: Locale.compose(player.civilizationFullName),
			civSymbol: "",
			civLine: "",
			playerColors: getPlayerColorValues(player.id),
			isPrimaryLighter: isPrimaryColorLighter(player.id),
			primaryColor: UI.Player.getPrimaryColorValueAsString(player.id),
			secondaryColor: UI.Player.getSecondaryColorValueAsString(player.id),
			displayItems: [],
			yields: [],
			size: [],
			scores: [],
			canClick: this.canClick,
			selected: this.selected,
			isTurnActive: player.isTurnActive,
			dealIds: [],
			relationshipLevel: 0,
			relationshipIcon: "",
			relationshipTooltip: "",
			warSupport: 0,
			isAtWar: false
		}
		if (GameContext.localObserverID == PlayerIds.NO_PLAYER) {
			console.error(`model-diplo-ribbon: Attempted to create player for a NOPLAYER.  Returning default object.`);
			return dataObj;
		}

		dataObj.civSymbol = Icon.getCivSymbolFromCivilizationType(player.civilizationType);
		dataObj.civLine = Icon.getCivLineFromCivilizationType(player.civilizationType);

		if (isKnownPlayer) {
			if (relationshipData && relationshipData.relationshipType != DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_UNKNOWN) {
				dataObj.relationshipIcon = UI.getIcon(DiplomacyManager.getRelationshipTypeString(relationshipData.relationshipType), "PLAYER_RELATIONSHIP");
				dataObj.relationshipTooltip = relationshipData.relationshipTooltip;
			}
			dataObj.relationshipLevel = relationshipData?.relationshipLevel ?? 0;
			dataObj.dealIds = Game.DiplomacyDeals.getDealIds(player.id) ?? [];
			dataObj.yields = this.createPlayerYieldsData(player, isLocal);
			dataObj.size = this.createPlayerSizeData(player, isLocal);
			dataObj.scores = this.createPlayerScoreData(player);
			dataObj.displayItems = dataObj.yields.concat(dataObj.size.concat(dataObj.scores));
			dataObj.isAtWar = playerDiplomacy.isAtWarWith(GameContext.localPlayerID);
		}

		if (isLocal) {
			this._localPlayerStats = dataObj.displayItems;
		}

		return dataObj;
	}

	private getPlayerTradeOpprotunities(playerLibrary: PlayerLibrary,): PlayerTradeYields | null {
		const localPlayer: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (!localPlayer) {
			console.error(`model-diplo-ribbon: Failed to retrieve PlayerLibrary for Player ${GameContext.localPlayerID}`);
			return null;
		}

		const currentTradesWithCiv = localPlayer.Trade?.countPlayerTradeRoutesTo(playerLibrary.id) ?? 0;
		const maxTradeLimitWithCiv = localPlayer.Trade?.getTradeCapacityFromPlayer(playerLibrary.id) ?? 0
		return {
			currentTradesWithCiv,
			maxTradeLimitWithCiv
		}
	}

	private createPlayerYieldsData(playerLibrary: PlayerLibrary, isLocal: boolean): PlayerDataYields[] {
		if (!this.shouldShowYieldType(RibbonDisplayType.Yields)) {
			return [];
		}

		const yieldGold: number = playerLibrary.Stats?.getNetYield(YieldTypes.YIELD_GOLD) ?? 0;
		const yieldCulture: number = playerLibrary.Stats?.getNetYield(YieldTypes.YIELD_CULTURE) ?? 0;
		const yieldScience: number = playerLibrary.Stats?.getNetYield(YieldTypes.YIELD_SCIENCE) ?? 0;
		const yieldHappiness: number = playerLibrary.Stats?.getNetYield(YieldTypes.YIELD_HAPPINESS) ?? 0;
		const yieldDiplomacy: number = playerLibrary.Stats?.getNetYield(YieldTypes.YIELD_DIPLOMACY) ?? 0;
		const yieldSettlements: number = playerLibrary.Stats?.numSettlements ?? 0;
		const settlementCap: number = playerLibrary.Stats?.settlementCap ?? 0;
		const tradeInfo = this.getPlayerTradeOpprotunities(playerLibrary);

		const yieldsData: PlayerDataYields[] = [
			{
				type: RibbonYieldType.Gold,
				label: Locale.compose("LOC_YIELD_GOLD"),
				value: (yieldGold >= 0 ? "+" : "") + (yieldGold > 100 ? Math.trunc(yieldGold) : Math.trunc(yieldGold * 10) / 10),
				img: this.getImg('YIELD_GOLD', isLocal),
				details: "",
				rawValue: yieldGold,
				warningThreshold: Infinity
			},
			{
				type: RibbonYieldType.Science,
				label: Locale.compose("LOC_YIELD_SCIENCE"),
				value: (yieldScience >= 0 ? "+" : "") + (yieldScience > 100 ? Math.trunc(yieldScience) : Math.trunc(yieldScience * 10) / 10),
				img: this.getImg('YIELD_SCIENCE', isLocal),
				details: "",
				rawValue: yieldScience,
				warningThreshold: Infinity
			},
			{
				type: RibbonYieldType.Culture,
				label: Locale.compose("LOC_YIELD_CULTURE"),
				value: (yieldCulture >= 0 ? "+" : "") + (yieldCulture > 100 ? Math.trunc(yieldCulture) : Math.trunc(yieldCulture * 10) / 10),
				img: this.getImg('YIELD_CULTURE', isLocal),
				details: "",
				rawValue: yieldCulture,
				warningThreshold: Infinity
			},
			{
				type: RibbonYieldType.Happiness,
				label: Locale.compose("LOC_YIELD_HAPPINESS"),
				value: (yieldHappiness >= 0 ? "+" : "") + (yieldHappiness > 100 ? Math.trunc(yieldHappiness) : Math.trunc(yieldHappiness * 10) / 10),
				img: this.getImg('YIELD_HAPPINESS', isLocal),
				details: "",
				rawValue: yieldHappiness,
				warningThreshold: Infinity
			},
			{
				type: RibbonYieldType.Diplomacy,
				label: Locale.compose("LOC_YIELD_DIPLOMACY"),
				value: (yieldDiplomacy >= 0 ? "+" : "") + (yieldDiplomacy > 100 ? Math.trunc(yieldDiplomacy) : Math.trunc(yieldDiplomacy * 10) / 10),
				img: this.getImg('YIELD_DIPLOMACY', isLocal),
				details: "",
				rawValue: yieldDiplomacy,
				warningThreshold: Infinity
			},
			{
				type: RibbonYieldType.Settlements,
				label: Locale.compose("LOC_YIELD_MAX_CITIES"),
				value: yieldSettlements.toString() + "/" + settlementCap.toString(),
				img: this.getImg('YIELD_CITIES', isLocal),
				details: "",
				rawValue: yieldSettlements,
				warningThreshold: settlementCap
			},
			{
				type: RibbonYieldType.Trade,
				label: Locale.compose("LOC_YIELD_MAX_TRADE"),
				value: tradeInfo ? (tradeInfo.currentTradesWithCiv + "/" + tradeInfo.maxTradeLimitWithCiv) : "0/0",
				img: this.getImg('YIELD_TRADES', isLocal),
				details: "",
				rawValue: tradeInfo?.currentTradesWithCiv ?? 0,
				warningThreshold: tradeInfo?.maxTradeLimitWithCiv ?? 0
			}
		];

		return yieldsData;
	}

	private createPlayerSizeData(playerLibrary: PlayerLibrary, isLocal: boolean): PlayerDataYields[] {
		if (!this.shouldShowYieldType(RibbonDisplayType.Size)) {
			return [];
		}

		const sizeData: PlayerDataYields[] = [{
			type: RibbonYieldType.Property,
			label: 'Cities',
			value: (playerLibrary.Stats?.numCities ?? 0).toFixed(0),
			img: this.getImg('YIELD_CITIES', isLocal),
			details: "",
			rawValue: (playerLibrary.Stats?.numCities ?? 0),
			warningThreshold: Infinity
		},
		{
			type: RibbonYieldType.Property,
			label: 'Towns',
			value: (playerLibrary.Stats?.numTowns ?? 0).toFixed(0),
			img: this.getImg('YIELD_TOWNS', isLocal),
			details: "",
			rawValue: (playerLibrary.Stats?.numTowns ?? 0),
			warningThreshold: Infinity
		},
		{
			type: RibbonYieldType.Property,
			label: 'Population',
			value: (playerLibrary.Stats?.totalPopulation ?? 0).toFixed(0),
			img: this.getImg('YIELD_POPULATION', isLocal),
			details: "",
			rawValue: (playerLibrary.Stats?.totalPopulation ?? 0),
			warningThreshold: Infinity
		},]

		return sizeData;
	}

	private createPlayerScoreData(playerLibrary: PlayerLibrary): PlayerDataYields[] {
		if (!this.shouldShowYieldType(RibbonDisplayType.Scores)) {
			return [];
		}

		const scoresData: PlayerDataYields[] = [];
		for (let i: number = 0; i < VictoryProgress.playerScores.length; i++) {
			if (VictoryProgress.playerScores[i].playerID == playerLibrary.id) {
				const playerScore: PlayerScore = VictoryProgress.playerScores[i];
				const victoryDefinition: VictoryDefinition | null = GameInfo.Victories.lookup(playerScore.victoryType);
				if (!victoryDefinition) {
					console.error("model-diplo-ribbon: Unable to find victory definition for victoryType: " + playerScore.victoryType);
					continue;
				}
				scoresData.push({
					type: RibbonYieldType.Victory,
					label: Locale.compose(victoryDefinition.Name),
					value: playerScore.score.toString() + "/" + playerScore.scoreGoal.toString(),
					img: "<img src='" + playerScore.scoreIcon + "'>",
					details: "",
					rawValue: playerScore.score,
					warningThreshold: Infinity
				})
			}
		}

		scoresData.sort((a, b) => a.label.localeCompare(b.label));

		return scoresData;
	}

	private getImg(label: string, isLocal: boolean): string {
		return "<img src='" + UI.getIconURL(label, (isLocal ? "YIELD" : "YIELD")) + "'>";
	}

	private queueUpdate() {
		if (this.updateQueued) return;

		this.updateQueued = true;
		const self = this;
		requestAnimationFrame(() => {
			self.updateAll();
			self.updateQueued = false;
		});
	}

	// Queue a data model changed update
	private queueDataModelChanged() {
		if (this.refDataModelChangedQueue == 0) {
			// Setting a request, that will loop through all the queued items 
			this.refDataModelChangedQueue = requestAnimationFrame(() => {

				// Do all the queues.
				// Not the most ideal way, as this has to be updated, if any queues are added
				// however, adding some kind of lamdba system would just be pushing the complexity somewhere else.

				// Size Update
				for (let playerID of this.playerSizeUpdateQueue.queue) {
					this.updatePlayerSize(playerID);
				}
				this.playerSizeUpdateQueue.clear();

				// Score update
				VictoryProgress.update();
				for (let playerID of this.playerScoreUpdateQueue.queue) {
					this.updatePlayerScores(playerID);
				}
				this.playerScoreUpdateQueue.clear();

				// Yield Update
				for (let playerID of this.playerYieldUpdateQueue.queue) {
					this.updatePlayerYields(playerID);
				}
				this.playerYieldUpdateQueue.clear();

				// Diplo Tokens Update
				for (let playerID of this.playerGlobalTokensUpdateQueue.queue) {
					this.updateGlobalTokens(playerID);
				}
				this.playerGlobalTokensUpdateQueue.clear();

				// War Support Update
				for (let playerId of this.playerWarUpdateQueue.queue) {
					this.updatePlayerWarSupport(playerId);
				}
				this.playerWarUpdateQueue.clear();

				// Signal the panel last!
				this.refDataModelChangedQueue = 0;
				this._eventNotificationRefresh.trigger();
			});
		}
	}

	private queueScoreUpdate(playerID: PlayerId) {
		if (this.playerScoreUpdateQueue.add(playerID)) {
			this.queueDataModelChanged();
		}
	}

	private queueYieldUpdate(playerID: PlayerId) {
		if (this.playerYieldUpdateQueue.add(playerID)) {
			this.queueDataModelChanged();
		}
	}

	private queueSizeUpdate(playerID: PlayerId) {
		if (this.playerSizeUpdateQueue.add(playerID)) {
			this.queueDataModelChanged();
		}
	}

	private queueGlobalTokensUpdate(playerID: PlayerId) {
		if (this.playerGlobalTokensUpdateQueue.add(playerID)) {
			this.queueDataModelChanged();
		}
	}

	private shouldShowYieldType(ribbonDisplayType: RibbonDisplayType): boolean {
		return this._ribbonDisplayTypes.includes(ribbonDisplayType);
	}

	private onInterfaceModeChanged(event: CustomEvent) {
		if (event?.detail?.newMode == "INTERFACEMODE_DIPLOMACY_HUB") {
			this.previousDisplayTypes = this._ribbonDisplayTypes;
			this._ribbonDisplayTypes = [];
			this.queueUpdate();
		} else if (event?.detail?.newMode == "INTERFACEMODE_DIPLOMACY_DIALOG" || event?.detail?.newMode == "INTERFACEMODE_CALL_TO_ARMS" || event?.detail?.newMode == "INTERFACEMODE_DIPLOMACY_PROJECT_REACTION") {
			if (event?.detail?.prevMode != "INTERFACEMODE_DIPLOMACY_HUB") {
				this.previousDisplayTypes = this._ribbonDisplayTypes;
				this._ribbonDisplayTypes = [];
			}
			this.updateDiploStatementPlayerData();
		} else if (event?.detail?.prevMode == "INTERFACEMODE_DIPLOMACY_HUB"
			|| event?.detail?.prevMode == "INTERFACEMODE_DIPLOMACY_DIALOG" || event?.detail?.prevMode == "INTERFACEMODE_DIPLOMACY_PROJECT_REACTION") {
			//Reset the ribbon display
			this._ribbonDisplayTypes = this.previousDisplayTypes;
			this.queueUpdate();
		}
	}

	private onPolicyChanged(data: Tradition_EventData) {
		if (this.playerData.some(o => o.id == data.player)) {
			this.queueYieldUpdate(data.player);
		}
	}

	private onPlayerYieldChanged(data: PlayerYieldChanged_EventData) {
		if (this.playerData.some(o => o.id == data.player)) {
			this.queueYieldUpdate(data.player);
		}
	}

	private onCultureYieldChanged(data: CultureYieldChanged_EventData) {
		if (this.playerData.some(o => o.id == data.player)) {
			this.queueYieldUpdate(data.player);
		}
	}

	private onResearchYieldChanged(data: ResearchYieldChanged_EventData) {
		if (this.playerData.some(o => o.id == data.player)) {
			this.queueYieldUpdate(data.player);
		}
	}

	private onTreasuryChanged(data: TreasuryChanged_EventData) {
		if (this.playerData.some(o => o.id == data.player)) {
			this.queueYieldUpdate(data.player);
		}
	}

	private onDiplomacyTreasuryChanged(data: DiplomacyTreasuryChanged_EventData) {
		if (this.playerData.some(o => o.id == data.player)) {
			this.queueYieldUpdate(data.player);
		}
	}

	private onCityYieldChanged(data: City_EventData) {
		if (this.playerData.some(o => o.id == data.cityID.owner)) {
			this.queueYieldUpdate(data.cityID.owner);
		}
	}

	private onPlayerSettlementCapChanged(data: Player_EventData) {
		this.queueYieldUpdate(data.player);
	}

	private onGlobalTokensChanged(data: DiplomacyTokensChanged_EventData) {
		if (this.playerData.some(o => o.id == data.owningPlayer)) {
			this.queueGlobalTokensUpdate(data.owningPlayer);
		}
	}

	private onRelationshipStatusChanged(data: DiplomacyRelationshipStatusChanged_EventData) {
		const localObserverID: PlayerId = GameContext.localObserverID;
		if (data.player1 == localObserverID) {
			this.queueYieldUpdate(data.player1);
		}
		else if (data.player2 == localObserverID) {
			this.queueYieldUpdate(data.player2);
		}
	}

	private onWonderCompleted(data: Constructible_EventData) {
		if (this.playerData.some(o => o.id == data.constructible.owner)) {
			this.queueScoreUpdate(data.constructible.owner);
		}
	}

	private onPlayerAgeTransitionComplete(data: PlayerAgeTransitionComplete_EventData) {
		if (this.playerData.some(o => o.id == data.player)) {
			this.queueYieldUpdate(data.player);
		}
	}

	private onDiplomacyWarUpdate(data: DiplomacyStatement_EventData, isWar: boolean) {
		const actingPlayerIndex = this.playerData.findIndex(o => o.id == data.actingPlayer);
		const reactingPlayerIndex = this.playerData.findIndex(o => o.id == data.reactingPlayer);
		if (actingPlayerIndex && reactingPlayerIndex) {
			if (data.reactingPlayer == GameContext.localPlayerID) { // Are we getting declared against?
				this.updatePlayerWarSupport(data.actingPlayer);
				const actingPlayer = this._playerData[actingPlayerIndex];
				if (actingPlayer) {
					if (isWar) {
						actingPlayer.relationshipIcon = UI.getIcon("PLAYER_RELATIONSHIP_AT_WAR", "PLAYER_RELATIONSHIP");
					} else {
						const localPlayerDiplomacy: PlayerDiplomacy | undefined = Players.get(GameContext.localPlayerID)?.Diplomacy;
						if (localPlayerDiplomacy === undefined) {
							console.error("model-diplo-ribbon: Updating war status, but can't find local player diplomacy object");
							return;
						}

						const relationship = localPlayerDiplomacy.getRelationshipEnum(actingPlayer.id);
						if (relationship == DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_UNKNOWN) {
							actingPlayer.relationshipIcon = "";
						} else {
							actingPlayer.relationshipIcon = UI.getIcon(DiplomacyManager.getRelationshipTypeString(relationship), "PLAYER_RELATIONSHIP");
						}
					}
					actingPlayer.isAtWar = isWar;
				}
				else {
					console.error("model-diplo-ribbon: Unable to find player with ID: " + data.actingPlayer + "! Can't update diplo ribbon.");
					return;
				}
			}
			else if (data.actingPlayer == GameContext.localPlayerID) { // Are declaring the war?
				this.updatePlayerWarSupport(data.reactingPlayer);
				const reactingPlayer = this._playerData[reactingPlayerIndex];
				if (reactingPlayer) {
					if (isWar) {
						reactingPlayer.relationshipIcon = UI.getIcon("PLAYER_RELATIONSHIP_AT_WAR", "PLAYER_RELATIONSHIP");
					} else {
						const localPlayerDiplomacy: PlayerDiplomacy | undefined = Players.get(GameContext.localPlayerID)?.Diplomacy;
						if (localPlayerDiplomacy === undefined) {
							console.error("model-diplo-ribbon: Updating war status, but can't find local player diplomacy object");
							return;
						}

						const relationship = localPlayerDiplomacy.getRelationshipEnum(reactingPlayer.id);
						if (relationship == DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_UNKNOWN) {
							reactingPlayer.relationshipIcon = "";
						} else {
							reactingPlayer.relationshipIcon = UI.getIcon(DiplomacyManager.getRelationshipTypeString(relationship), "PLAYER_RELATIONSHIP");
						}
					}
					reactingPlayer.isAtWar = isWar;
				}
				else {
					console.error("model-diplo-ribbon: Unable to find player with ID: " + data.reactingPlayer + "! Can't update diplo ribbon.");
					return;
				}
			}
		}
		this._eventNotificationRefresh.trigger();
	}

	private onDiplomacyDeclareWar(data: DiplomacyStatement_EventData) {
		this.onDiplomacyWarUpdate(data, true);
	}
	private onDiplomacyMakePeace(data: DiplomacyStatement_EventData) {
		this.onDiplomacyWarUpdate(data, false);
	}

	private onDiplomacyMeet(data: DiplomacyMeet_EventData) {

		let otherPlayer: PlayerLibrary | null = null;
		const localObserverID: PlayerId = GameContext.localObserverID;

		this.updateAll();

		if (data.player1 == localObserverID) { // Are we player 1?
			otherPlayer = Players.get(data.player2);
		}
		else if (data.player2 == localObserverID) { // Are we player 2?
			otherPlayer = Players.get(data.player1);
		}

		if (!otherPlayer) {
			console.error("model-diplo-ribbon: Not involved in diplomacy meeting, not updating diplo ribbon.");
			return;
		}

		for (let i = 0; i < this._playerData.length; i++) {
			if (this._playerData[i].id == otherPlayer.id) {
				return;
			}
		}

		if (!otherPlayer?.isMajor) {
			console.error("Not a Major player.  Probably an Independent turning into a city-state.");
			return;
		}

		const diplomacy = otherPlayer.Diplomacy;
		if (diplomacy) {
			const relationShipData: RelationshipData = {
				relationshipType: diplomacy.getRelationshipEnum(localObserverID),
				relationshipLevel: diplomacy.getRelationshipLevel(localObserverID),
				relationshipTooltip: Locale.compose(diplomacy.getRelationshipLevelName(localObserverID))
			}

			const otherPlayerData = this.createPlayerData(otherPlayer, diplomacy, true, relationShipData);
			this._playerData.splice(otherPlayerData.id, 0, otherPlayerData);
		}
		else {
			console.error("model-diplo-ribbon: No Diplomacy object for player, not updating diplo ribbon.");
			return;
		}
		this._eventNotificationRefresh.trigger();
	}

	private onAttributeNodeCompleted(data: AttributePoints_EventData) {
		if (data && data.player && data.player != GameContext.localPlayerID) {
			//Not us, we don't need to update
			return;
		}
		this.queueYieldUpdate(data.player);
	}

	private updatePlayerScores(playerID: PlayerId) {
		const index: number = this.playerData.findIndex(o => o.id == playerID);
		if (index == -1) {
			return;
		}

		const playerLibrary: PlayerLibrary | null = Players.get(playerID);
		if (!playerLibrary) {
			console.error("model-diplo-ribbon: Unable to find player with ID: " + playerID + "! Aborting update of player's scores!");
			return;
		}

		this._playerData[index].scores = this.createPlayerScoreData(playerLibrary);
		this._playerData[index].displayItems = this._playerData[index].yields.concat(this._playerData[index].size.concat(this._playerData[index].scores));
		if (playerID == GameContext.localPlayerID) {
			this._localPlayerStats = this._playerData[index].displayItems;
		}

		if (this.onUpdate) {
			this.onUpdate(this);
		}
	}

	private updatePlayerYields(playerID: PlayerId) {
		const index: number = this.playerData.findIndex(o => o.id == playerID);
		if (index == -1) {
			return;
		}

		const playerLibrary: PlayerLibrary | null = Players.get(playerID);
		if (!playerLibrary) {
			console.error("model-diplo-ribbon: Unable to find player with ID: " + playerID + "! Aborting update of player's yields!");
			return;
		}
		if (!playerLibrary.Diplomacy) {
			console.error("model-diplo-ribbon: Unable to find player diplomacy for player with ID: " + playerID + "! Aborting update of player's yields!");
			return;
		}
		const isLocal: boolean = playerID == GameContext.localPlayerID;
		this._playerData[index].yields = this.createPlayerYieldsData(playerLibrary, isLocal);
		this._playerData[index].displayItems = this._playerData[index].yields.concat(this._playerData[index].size.concat(this._playerData[index].scores));
		if (isLocal) {
			this._localPlayerStats = this._playerData[index].displayItems;
		}

		if (this.onUpdate) {
			this.onUpdate(this);
		}
	}

	private updatePlayerSize(playerID: PlayerId) {
		const index: number = this.playerData.findIndex(o => o.id == playerID);
		if (index == -1) {
			return;
		}

		const playerLibrary: PlayerLibrary | null = Players.get(playerID);
		if (!playerLibrary) {
			console.error("model-diplo-ribbon: Unable to find player with ID: " + playerID + "! Aborting update of player's yields!");
			return;
		}
		if (!playerLibrary.Diplomacy) {
			console.error("model-diplo-ribbon: Unable to find player diplomacy for player with ID: " + playerID + "! Aborting update of player's yields!");
			return;
		}
		const isLocal: boolean = playerID == GameContext.localPlayerID;
		this._playerData[index].size = this.createPlayerSizeData(playerLibrary, isLocal);
		this._playerData[index].displayItems = this._playerData[index].yields.concat(this._playerData[index].size.concat(this._playerData[index].scores));
		if (isLocal) {
			this._localPlayerStats = this._playerData[index].displayItems;
		}

		if (this.onUpdate) {
			this.onUpdate(this);
		}
	}

	private updateGlobalTokens(playerID: PlayerId) {
		this.queueYieldUpdate(playerID);
	}

	private onCityPopulationChanged(data: CityPopulationChanged_EventData) {
		if (this.playerData.some(o => o.id == data.cityID.owner)) {
			this.queueSizeUpdate(data.cityID.owner);
		}
	}

	private onPlayerPostDisconnected(data: GenericDataInt32) {
		if (this.playerData.some(o => o.id == data.data)) {
			this.queueUpdate();
		}
		this._eventNotificationRefresh.trigger();
	}

	private onPlayerTurnActivated(data: PlayerTurnActivated_EventData) {
		//Since all of the other data is updated whenever it changes, we do not need to update it again when the player starts their turn, only the turn active status
		const index: number = this.playerData.findIndex(o => o.id == data.player);

		if (index == PlayerIds.NO_PLAYER) {
			return;
		}
		this._playerData[index].isTurnActive = true;

		if (data.player == GameContext.localObserverID) {
			const player: PlayerLibrary | null = Players.get(data.player)
			if (!player || !player.Diplomacy) {
				console.error("mode-diplo-ribbon: Unable to retrieve player diplomacy object during turn start for local player");
				if (this.onUpdate) {
					this.onUpdate(this);
				}
				return;
			}
		}

		if (this.onUpdate) {
			this.onUpdate(this);
		}
		this._eventNotificationRefresh.trigger();
	}

	private onPlayerTurnDeactivated(data: PlayerTurnDeactivated_EventData) {
		const index: number = this.playerData.findIndex(o => o.id == data.player);
		if (index == -1) {
			return;
		}

		//give the start turn transition time to play before we do the end turn transition
		setTimeout(() => {
			this._playerData[index].isTurnActive = false;
		}, 250);

		if (this.onUpdate) {
			this.onUpdate(this);
		}
	}

	private onAutoplayEnd() {
		this.queueUpdate();
	}

	private onAutoplayStarted() {
		this._playerData = [];
		const localObserverID: PlayerId = GameContext.localObserverID;
		if (localObserverID === PlayerIds.NO_PLAYER || localObserverID === PlayerIds.OBSERVER_ID) {
			const PlayersIDs: PlayerLibrary[] = Players.getAlive();
			PlayersIDs.forEach((player) => {
				if (player.Diplomacy && player.isMajor) {
					const otherPlayerData: PlayerDataObject = this.createPlayerData(player, player.Diplomacy, true);
					this._playerData.push(otherPlayerData);
				}
			})
		}
		this.queueUpdate();
	}

	private onSupportChanged(data: DiplomacyEventSupportChanged_EventData) {
		const eventHeader: DiplomaticEventHeader = Game.Diplomacy.getDiplomaticEventData(data.actionID);
		this.checkForSanctionAndWarUpdate(eventHeader);
		this._eventNotificationRefresh.trigger();
	}

	private onActionCanceled(data: DiplomacyEventCanceled_EventData) {
		const eventHeader: DiplomaticEventHeader = Game.Diplomacy.getDiplomaticEventData(data.actionID);
		this.checkForSanctionAndWarUpdate(eventHeader);
		this._eventNotificationRefresh.trigger();
	}

	private checkForSanctionAndWarUpdate(eventHeader: DiplomaticEventHeader) {
		if (eventHeader.actionType == DiplomacyActionTypes.DIPLOMACY_ACTION_DECLARE_WAR) {
			if (eventHeader.initialPlayer == GameContext.localPlayerID) {
				this.queueWarUpdate(eventHeader.targetPlayer);
			} else if (eventHeader.targetPlayer == GameContext.localPlayerID) {
				this.queueWarUpdate(eventHeader.initialPlayer);
			}
			return;
		}

		if (eventHeader.actionGroup == DiplomacyActionGroups.DIPLOMACY_ACTION_GROUP_SANCTION && eventHeader.targetPlayer == GameContext.localPlayerID) {
			this.queueSanctionUpdate(eventHeader.initialPlayer);
		}
	}

	private queueWarUpdate(playerID: PlayerId) {
		if (this.playerWarUpdateQueue.add(playerID)) {
			this.queueDataModelChanged();
			return;
		}
	}

	private queueSanctionUpdate(playerID: PlayerId) {
		if (this.playerSanctionUpdateQueue.add(playerID)) {
			this.queueDataModelChanged();
			return;
		}
	}

	private updatePlayerWarSupport(playerID: PlayerId) {
		const index: number = this.playerData.findIndex(o => o.id == playerID);
		if (index == -1) {
			return;
		}

		// Get id of war and early out if none occurring.
		let warID: DiplomacyActionEventId = -1;
		const jointEvents: DiplomaticEventHeader[] = Game.Diplomacy.getJointEvents(GameContext.localPlayerID, playerID, false);
		if (jointEvents.length > 0) {
			jointEvents.forEach(jointEvent => {
				if (jointEvent.actionTypeName == "DIPLOMACY_ACTION_DECLARE_WAR") {
					warID = jointEvent.uniqueID;
				};
			});
		}
		if (warID == -1) {
			this.playerData[index].warSupport = 0;
			return;
		}

		const warEventHeader: DiplomaticEventHeader = Game.Diplomacy.getDiplomaticEventData(warID);
		const warData: DiplomaticProjectUIData | undefined = Game.Diplomacy.getProjectDataForUI(warEventHeader.initialPlayer, -1, DiplomacyActionTargetTypes.NO_DIPLOMACY_TARGET, DiplomacyActionGroups.NO_DIPLOMACY_ACTION_GROUP, -1, DiplomacyActionTargetTypes.NO_DIPLOMACY_TARGET).find(project => project.actionID == warID);
		if (warData == undefined) {
			console.error("model-diplo-ribbon: Attempting to get war data, but there is no valid DiplomaticProjectUIData for the war diplomatic event");
			this.playerData[index].warSupport = 0;
			return;
		}

		if (warEventHeader.initialPlayer == GameContext.localPlayerID) {
			this.playerData[index].warSupport = Game.Diplomacy.getSupportingPlayersWithBonusEnvoys(warEventHeader.uniqueID).length - Game.Diplomacy.getOpposingPlayersWithBonusEnvoys(warEventHeader.uniqueID).length;
		} else {
			this.playerData[index].warSupport = Game.Diplomacy.getOpposingPlayersWithBonusEnvoys(warEventHeader.uniqueID).length - Game.Diplomacy.getSupportingPlayersWithBonusEnvoys(warEventHeader.uniqueID).length;
		}
	}

	private effectUsedListener() {
		if (this.onUpdate) {
			this.onUpdate(this);
		}
	}
}

const DiploRibbonData = DiploRibbonModel.getInstance();
export { DiploRibbonData as default };

engine.whenReady.then(() => {

	const updateModel = () => {
		engine.updateWholeModel(DiploRibbonData);
	}

	engine.createJSModel('g_DiploRibbon', DiploRibbonData);
	DiploRibbonData.updateCallback = updateModel;
});
