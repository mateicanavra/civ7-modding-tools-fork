/**
 * victory-manager.ts
 * @copyright 2024, Firaxis Games
 * @description Queries and caches data from the VictoryManagerLibrary to be used by various UI
 */
import { Icon } from '/core/ui/utilities/utilities-image.js';
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js';
class VictoryManagerImpl {
    constructor() {
        this.claimedVictories = [];
        this.victoryEnabledPlayers = [];
        this.victoryProgress = [];
        this.enabledLegacyPathDefinitions = [];
        this.processedVictoryData = new Map();
        this.processedScoreData = [];
        this.totalLegacyPointsEarned = 0;
        this.victoryManagerUpdateEvent = new LiteEvent();
        this.updateGate = new UpdateGate(() => {
            const victoryManager = Game.VictoryManager;
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
        });
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
    processVictoryData() {
        this.processedVictoryData = new Map();
        const currentAge = GameInfo.Ages.lookup(Game.age);
        if (!currentAge) {
            console.error(`victory-manager: Failed to get current age for hash ${Game.age}`);
            return;
        }
        const currentAgeVictoryData = [];
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
            const victoryData = {
                Name: d.Name,
                Description: d.Description ? d.Description : "",
                Icon: Icon.getLegacyPathIcon(d),
                Type: d.LegacyPathType,
                ClassType: d.LegacyPathClassType,
                playerData: []
            };
            for (const playerID of this.victoryEnabledPlayers) {
                const player = Players.get(playerID);
                if (!player) {
                    console.error(`victory-manager: Failed to find player library for playerID ${playerID}`);
                    continue;
                }
                const score = player.LegacyPaths?.getScore(d.LegacyPathType) ?? 0;
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
                    const playerData = {
                        playerID: playerID,
                        playerName: leaderName,
                        leaderPortrait: leaderPortraitsrc,
                        civIcon: civIconSrc,
                        currentScore: score,
                        maxScore: maxScore,
                        isLocalPlayer: playerID === localPlayerID,
                    };
                    victoryData.playerData.push(playerData);
                }
            }
            victoryData.playerData.sort(this.playerSorter);
            currentAgeVictoryData.push(victoryData);
        }
        this.processedVictoryData.set(currentAge.AgeType, currentAgeVictoryData);
    }
    processScoreData() {
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
        let hostHostingIcon = null;
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
                let totalAgeScore = 0;
                for (const legacy of legacyPointsEarned) {
                    totalAgeScore += legacy.value;
                }
                const playerScoreData = {
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
                };
                // See if this player has claimed any victories this age and if so get the score achieved
                for (const claimedVictory of this.claimedVictories) {
                    if (player.team == claimedVictory.team) {
                        const victoryDefinition = GameInfo.Victories.lookup(claimedVictory.victory);
                        if (!victoryDefinition) {
                            console.error(`victory-manager: Failed to find definition for claimed victory ${claimedVictory.victory}`);
                            return;
                        }
                        const playerVictoryScoreData = {
                            name: victoryDefinition.Name,
                            description: victoryDefinition.Description ? victoryDefinition.Description : "",
                            icon: Icon.getVictoryIcon(victoryDefinition),
                            score: 0,
                        };
                        playerScoreData.victoryScoreData.push(playerVictoryScoreData);
                    }
                }
                this.processedScoreData.push(playerScoreData);
            }
        }
    }
    getHighestAmountOfLegacyEarned() {
        let prevLegacyTotal = 1;
        for (const player of Players.getAlive()) {
            const leader = Players.get(player.id);
            const legacyPointsEarned = leader?.AdvancedStart?.getHistoricalLegacyPoints();
            if (legacyPointsEarned) {
                let totalLegacy = 0;
                for (const legacyPoints of legacyPointsEarned) {
                    totalLegacy += legacyPoints.value;
                }
                prevLegacyTotal = prevLegacyTotal < totalLegacy ? totalLegacy : prevLegacyTotal;
            }
        }
        return prevLegacyTotal;
    }
    processLegacyPoints(playerId) {
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
    playerSorter(a, b) {
        return b.currentScore - a.currentScore;
    }
    onCityAddedToMap() {
        this.updateGate.call('CityAddedToMap');
    }
    onCityRemovedFromMap() {
        this.updateGate.call('CityRemovedFromMap');
    }
    onGreatWorkCreated() {
        this.updateGate.call('GreatWorkCreated');
    }
    onGreatWorkMoved() {
        this.updateGate.call('GreatWorkMoved');
    }
    onGreatWorkArchived() {
        this.updateGate.call('GreatWorkArchived');
    }
    onTradeRouteAddedToMap() {
        this.updateGate.call('TradeRouteAddedToMap');
    }
    onTradeRouteRemovedFromMap() {
        this.updateGate.call('TradeRouteRemovedFromMap');
    }
    onTradeRouteChanged() {
        this.updateGate.call('TradeRouteChanged');
    }
    onConstructibleAddedToMap() {
        this.updateGate.call('ConstructibleAddedToMap');
    }
    onConstructibleChanged() {
        this.updateGate.call('ConstructibleChanged');
    }
    onConstructibleRemovedFromMap() {
        this.updateGate.call('ConstructibleRemovedFromMap');
    }
    onWonderCompleted() {
        this.updateGate.call('WonderCompleted');
    }
    onVPChanged() {
        this.updateGate.call('VPChanged');
    }
}
const VictoryManager = new VictoryManagerImpl();
export { VictoryManager as default };

//# sourceMappingURL=file:///base-standard/ui/victory-manager/victory-manager.js.map
