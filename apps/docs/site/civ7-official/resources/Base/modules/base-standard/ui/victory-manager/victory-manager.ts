/**
 * victory-manager.ts
 * @copyright 2024, Firaxis Games
 * @description Queries and caches data from the VictoryManagerLibrary to be used by various UI
 */

import { Icon } from '/core/ui/utilities/utilities-image.js';
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js'

export type VictoryData = {
	Name: string;
	Description: string;
	Icon: string;
	Type: string;
	ClassType: string;
	playerData: PlayerData[];
}

export type PlayerData = {
	playerID: PlayerId;
	playerName: string;
	leaderPortrait: string;
	civIcon: string;
	currentScore: number;
	maxScore: number;
	isLocalPlayer: boolean;
}

export type PlayerScoreData = {
	playerID: PlayerId;
	playerName: string;
	playerNameFirstParty: string;
	playerNameT2GP: string;
	playerHostingIcon: string;
	leaderPortrait: string;
	civIcon: string;
	isSameHostPlatform: boolean;
	isLocalPlayer: boolean;
	isHumanPlayer: boolean;
	previousAgeScore: number;
	totalAgeScore: number;
	victoryScoreData: PlayerVictoryScoreData[];
	legactPointData: CardCategoryInstance[];
}

export type PlayerVictoryScoreData = {
	name: string;
	description: string;
	icon: string;
	score: number;
}

class VictoryManagerImpl {

	claimedVictories: VictoryManagerLibrary_VictoryInfo[] = [];
	victoryEnabledPlayers: PlayerId[] = [];
	victoryProgress: VictoryManagerLibrary_VictoryProgress[] = [];
	enabledLegacyPathDefinitions: LegacyPathDefinition[] = [];

	processedVictoryData: Map<string, VictoryData[]> = new Map();
	processedScoreData: PlayerScoreData[] = [];
	totalLegacyPointsEarned: number = 0;

	victoryManagerUpdateEvent: LiteEvent<void> = new LiteEvent();

	constructor() {
		// TODO All of these, other than 'VPChanged' are likely unnecessary as VPChanged will dispatch any time the points are updated.
		engine.on('CityAddedToMap', this.onCityAddedToMap, this);
		engine.on('CityRemovedFromMap', this.onCityRemovedFromMap, this);
		engine.on('GreatWorkCreated', this.onGreatWorkCreated, this);
		engine.on('GreatWorkMoved', this.onGreatWorkMoved, this);
		engine.on('GreatWorkArchived', this.onGreatWorkArchived, this);
		engine.on('TradeRouteAddedToMap', this.onTradeRouteAddedToMap, this);
		engine.on('TradeRouteRemovedFromMap', this.onTradeRouteRemovedFromMap, this);
		engine.on('TradeRouteChanged', this.onTradeRouteChanged, this);
		engine.on('ConstructibleAddedToMap', this.onConstructibleAddedToMap, this);
		engine.on('ConstructibleChanged', this.onConstructibleChanged, this);
		engine.on('ConstructibleRemovedFromMap', this.onConstructibleRemovedFromMap, this);
		engine.on('WonderCompleted', this.onWonderCompleted, this);
		engine.on('VPChanged', this.onVPChanged, this);

		this.updateGate.call('constructor');
	}

	private updateGate = new UpdateGate(() => {
		const victoryManager: VictoryManagerLibrary = Game.VictoryManager;

		// TODO - Victory/LegacyPath refactor.
		// this.victoryEnabledPlayers = victoryManager.getVictoryEnabledPlayers();
		this.victoryEnabledPlayers = [];
		const players = Players.getAlive();
		for (const player of players) {
			if (player.isMajor) {
				this.victoryEnabledPlayers.push(player.id);
			}
		}


		this.claimedVictories = victoryManager.getVictories();
		this.victoryProgress = victoryManager.getVictoryProgress();
		this.enabledLegacyPathDefinitions = [];
		for (const legacyPathDefinition of GameInfo.LegacyPaths) {
			if (legacyPathDefinition.EnabledByDefault) {
				this.enabledLegacyPathDefinitions.push(legacyPathDefinition);
			}
		}

		this.processVictoryData();
		this.processScoreData();

		this.victoryManagerUpdateEvent.trigger();
	})

	private processVictoryData() {
		this.processedVictoryData = new Map();

		const currentAge = GameInfo.Ages.lookup(Game.age);
		if (!currentAge) {
			console.error(`victory-manager: Failed to get current age for hash ${Game.age}`);
			return;
		}

		const currentAgeVictoryData: VictoryData[] = [];

		const localPlayerID = GameContext.localPlayerID;
		const localPlayer = Players.get(localPlayerID);
		if (!localPlayer) {
			console.error("victory-manager: Unable to get local player!");
			return;
		}

		const localPlayerDiplomacy = localPlayer.Diplomacy;
		if (localPlayerDiplomacy === undefined) {
			console.error("victory-manager: Unable to get local player diplomacy!");
			return;
		}

		for (const d of VictoryManager.enabledLegacyPathDefinitions) {
			const victoryData: VictoryData = {
				Name: d.Name,
				Description: d.Description ? d.Description : "",
				Icon: Icon.getLegacyPathIcon(d),
				Type: d.LegacyPathType,
				ClassType: d.LegacyPathClassType,
				playerData: []
			}

			for (const playerID of this.victoryEnabledPlayers) {
				const player = Players.get(playerID);
				if (!player) {
					console.error(`victory-manager: Failed to find player library for playerID ${playerID}`);
					continue;
				}

				const score = player.LegacyPaths?.getScore(d.LegacyPathType) ?? 0
				let maxScore = 0;
				for (const milestone of GameInfo.AgeProgressionMilestones) {
					if (milestone.FinalMilestone && milestone.LegacyPathType == d.LegacyPathType) {
						maxScore = milestone.RequiredPathPoints;
					}
				}

				if (localPlayerDiplomacy.hasMet(player.id) || localPlayerID == player.id || player.isHuman) {
					const leaderName = player.name;
					const leaderPortraitsrc = Icon.getLeaderPortraitIcon(player.leaderType);
					const civIconSrc = Icon.getCivSymbolFromCivilizationType(player.civilizationType);

					// Place gets set to 9999 unless victory is claimed
					const playerData: PlayerData = {
						playerID: playerID,
						playerName: leaderName,
						leaderPortrait: leaderPortraitsrc,
						civIcon: civIconSrc,
						currentScore: score,
						maxScore: maxScore,
						isLocalPlayer: playerID === localPlayerID,
					}

					victoryData.playerData.push(playerData);
				}
			}

			victoryData.playerData.sort(this.playerSorter);

			currentAgeVictoryData.push(victoryData);
		}

		this.processedVictoryData.set(currentAge.AgeType, currentAgeVictoryData);
	}

	private processScoreData() {
		this.processedScoreData = [];

		const localPlayerID = GameContext.localPlayerID;
		const localPlayer = Players.get(localPlayerID);
		if (!localPlayer) {
			console.error("victory-manager: processScoreData(): Unable to get local player!");
			return;
		}

		const localPlayerDiplomacy = localPlayer.Diplomacy;
		if (localPlayerDiplomacy === undefined) {
			console.error("victory-manager: processScoreData(): Unable to get local player diplomacy!");
			return;
		}

		// Cache the local player's hosting platform icon for quick comparisons with the other players.
		let hostHostingIcon: string | null = null;
		for (const player of Players.getAlive()) {
			if (!player.isMajor || localPlayerID != player.id) {
				continue;
			}

			hostHostingIcon = Configuration.getPlayer(player.id).hostIconStr;
		}


		for (const player of Players.getAlive()) {
			if (!player.isMajor) {
				continue;
			}

			const playerConfig = Configuration.getPlayer(player.id);
			if (localPlayerDiplomacy.hasMet(player.id) || localPlayerID == player.id || player.isHuman) {
				const leaderName = player.name;
				const leaderPortraitsrc = (playerConfig.leaderTypeName != null) ? playerConfig.leaderTypeName : "UNKNOWN_LEADER";
				const civIconSrc = Icon.getCivSymbolFromCivilizationType(player.civilizationType);
				const legacyPointsEarned = this.processLegacyPoints(player.id);
				const playerHostingIcon = Locale.stylize(`${playerConfig.hostIconStr}`);
				let previousAgeScore = 0;

				let totalAgeScore: number = 0;
				for (const legacy of legacyPointsEarned) {
					totalAgeScore += legacy.value;
				}

				const playerScoreData: PlayerScoreData = {
					playerID: player.id,
					playerName: leaderName,
					playerNameFirstParty: playerConfig.nickName_1P,
					playerNameT2GP: playerConfig.nickName_T2GP,
					playerHostingIcon: playerHostingIcon,
					leaderPortrait: leaderPortraitsrc,
					civIcon: civIconSrc,
					isLocalPlayer: player.id === localPlayerID,
					isHumanPlayer: player.isHuman,
					isSameHostPlatform: playerConfig.hostIconStr === hostHostingIcon,
					previousAgeScore,
					totalAgeScore,
					victoryScoreData: [],
					legactPointData: legacyPointsEarned
				}

				// See if this player has claimed any victories this age and if so get the score achieved
				for (const claimedVictory of this.claimedVictories) {
					if (player.team == claimedVictory.team) {
						const victoryDefinition = GameInfo.Victories.lookup(claimedVictory.victory);
						if (!victoryDefinition) {
							console.error(`victory-manager: Failed to find definition for claimed victory ${claimedVictory.victory}`);
							return;
						}

						const playerVictoryScoreData: PlayerVictoryScoreData = {
							name: victoryDefinition.Name,
							description: victoryDefinition.Description ? victoryDefinition.Description : "",
							icon: Icon.getVictoryIcon(victoryDefinition),
							score: 0,
						}

						playerScoreData.victoryScoreData.push(playerVictoryScoreData);
					}
				}

				this.processedScoreData.push(playerScoreData);
			}
		}
	}

	getHighestAmountOfLegacyEarned(): number {
		let prevLegacyTotal: number = 1;
		for (const player of Players.getAlive()) {
			const leader = Players.get(player.id);
			const legacyPointsEarned: CardCategoryInstance[] | undefined = leader?.AdvancedStart?.getHistoricalLegacyPoints();
			if (legacyPointsEarned) {
				let totalLegacy: number = 0
				for (const legacyPoints of legacyPointsEarned) {
					totalLegacy += legacyPoints.value;
				}
				prevLegacyTotal = prevLegacyTotal < totalLegacy ? totalLegacy : prevLegacyTotal;
			}
		}
		return prevLegacyTotal;
	}

	private processLegacyPoints(playerId: PlayerId): CardCategoryInstance[] {
		const leader = Players.get(playerId);
		if (!leader) {
			return [];
		}
		const legacyPointsEarned = leader.AdvancedStart?.getHistoricalLegacyPoints();
		if (!legacyPointsEarned) {
			return [];
		}
		return legacyPointsEarned;
	}

	private playerSorter(a: PlayerData, b: PlayerData): number {
		return b.currentScore - a.currentScore;
	}

	private onCityAddedToMap() {
		this.updateGate.call('CityAddedToMap');
	}

	private onCityRemovedFromMap() {
		this.updateGate.call('CityRemovedFromMap');
	}

	private onGreatWorkCreated() {
		this.updateGate.call('GreatWorkCreated');
	}

	private onGreatWorkMoved() {
		this.updateGate.call('GreatWorkMoved');
	}

	private onGreatWorkArchived() {
		this.updateGate.call('GreatWorkArchived');
	}

	private onTradeRouteAddedToMap() {
		this.updateGate.call('TradeRouteAddedToMap');
	}

	private onTradeRouteRemovedFromMap() {
		this.updateGate.call('TradeRouteRemovedFromMap');
	}

	private onTradeRouteChanged() {
		this.updateGate.call('TradeRouteChanged');
	}

	private onConstructibleAddedToMap() {
		this.updateGate.call('ConstructibleAddedToMap');
	}

	private onConstructibleChanged() {
		this.updateGate.call('ConstructibleChanged');
	}

	private onConstructibleRemovedFromMap() {
		this.updateGate.call('ConstructibleRemovedFromMap');
	}

	private onWonderCompleted() {
		this.updateGate.call('WonderCompleted');
	}

	private onVPChanged() {
		this.updateGate.call('VPChanged');
	}
}

const VictoryManager = new VictoryManagerImpl();

export { VictoryManager as default };
