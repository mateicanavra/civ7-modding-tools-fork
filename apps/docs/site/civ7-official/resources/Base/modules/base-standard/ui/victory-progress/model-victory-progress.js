/**
 * model-victory-progress.ts
 * @copyright 2021-2024, Firaxis Games
 * @description Gathers the score data for the era victory conditions
 */
import ContextManager from '/core/ui/context-manager/context-manager.js';
import { Icon } from '/core/ui/utilities/utilities-image.js';
import VictoryManager from '/base-standard/ui/victory-manager/victory-manager.js';
import { DisplayQueueManager } from '/core/ui/context-manager/display-queue-manager.js';
import { EndGameScreenCategory } from '/base-standard/ui/endgame/screen-endgame.js';
import CinematicManager from '/base-standard/ui/cinematic/cinematic-manager.js';
import { VictoryAchievedScreenCategory } from '/base-standard/ui/victory-progress/screen-victory-achieved.js';
class VictoryProgressModel {
    get advisorVictoryTab() {
        return this._advisorVictoryTab;
    }
    set updateAdvisorVictoryTab(index) {
        this._advisorVictoryTab = index;
    }
    constructor() {
        this.playerScores = [];
        this.rankingsHotkeyListener = this.onRankingsHotkey.bind(this);
        // keeps track of the last advisor page a player was on. The number here is AdvisorTypes
        this._advisorVictoryTab = 0;
        VictoryManager.victoryManagerUpdateEvent.on(this.onVictoryManagerUpdate.bind(this));
        engine.whenReady.then(() => {
            window.addEventListener('hotkey-open-rankings', this.rankingsHotkeyListener);
            engine.on('GameAgeEnded', this.onAgeEnded, this);
            engine.on('TeamVictory', this.onTeamVictory, this);
            engine.on('PlayerDefeat', this.onPlayerDefeated, this);
            engine.on('LegacyPathMilestoneCompleted', this.onLegacyPathMilestoneCompleted, this);
        });
    }
    onVictoryManagerUpdate() {
        this.update();
    }
    set updateCallback(callback) {
        this.onUpdate = callback;
    }
    onTeamVictory(event) {
        if (Game.AgeProgressManager.isExtendedGame) {
            const cinematicDef = GameInfo.VictoryCinematics.lookup(event.victory);
            if (cinematicDef && cinematicDef.VictoryCinematicType != VictoryCinematicTypes.NO_VICTORY_CINEMATIC_TYPE && GameplayMap.isValidLocation(event.location)) {
                CinematicManager.startEndOfGameCinematic(cinematicDef.VictoryCinematicType, cinematicDef.VictoryType, event.location);
            }
        }
    }
    onAgeEnded(event) {
        if (!Game.AgeProgressManager.isExtendedGame) {
            const cinematicDef = GameInfo.VictoryCinematics.lookup(event.victoryType);
            if (cinematicDef && cinematicDef.VictoryCinematicType != VictoryCinematicTypes.NO_VICTORY_CINEMATIC_TYPE && GameplayMap.isValidLocation(event.location)) {
                CinematicManager.startEndOfGameCinematic(cinematicDef.VictoryCinematicType, cinematicDef.VictoryType, event.location);
            }
            else {
                DisplayQueueManager.add({ category: EndGameScreenCategory, forceShow: true });
            }
        }
    }
    onPlayerDefeated(event) {
        if (event.player == GameContext.localPlayerID) {
            DisplayQueueManager.add({ category: EndGameScreenCategory, forceShow: true });
        }
    }
    onLegacyPathMilestoneCompleted(event) {
        if (event.player == GameContext.localPlayerID) {
            const milestoneDefinition = GameInfo.AgeProgressionMilestones.lookup(event.milestone);
            if (milestoneDefinition) {
                const victoryRequest = {
                    category: VictoryAchievedScreenCategory,
                    milestoneDefinition: milestoneDefinition,
                    forceShow: true
                };
                DisplayQueueManager.add(victoryRequest);
            }
        }
    }
    update() {
        this.playerScores = [];
        const localPlayerID = GameContext.localPlayerID;
        const localPlayer = Players.get(localPlayerID);
        if (!localPlayer) {
            return;
        }
        const localPlayerDiplomacy = localPlayer.Diplomacy;
        if (localPlayerDiplomacy === undefined) {
            console.error("model-victory-progress: Unable to get local player diplomacy!");
            return;
        }
        const victoryEnabledPlayers = VictoryManager.victoryEnabledPlayers;
        const placedVictories = VictoryManager.claimedVictories;
        const victoryProgress = VictoryManager.victoryProgress;
        const enabledLegacyPaths = [];
        for (const path of GameInfo.LegacyPaths) {
            if (path.EnabledByDefault) {
                enabledLegacyPaths.push(path);
            }
        }
        for (const p of victoryEnabledPlayers) {
            const player = Players.get(p);
            if (player?.isMajor) {
                const team = player.team;
                for (const v of enabledLegacyPaths) {
                    // High place number to start to ensure non-placed victories are sorted to the bottom
                    let place = 999;
                    let currentProgress = 0;
                    let totalProgress = 0;
                    for (const placedVictory of placedVictories) {
                        if (placedVictory.team == team && placedVictory.victory == v.$hash) {
                            place = placedVictory.place;
                            break;
                        }
                    }
                    for (const progress of victoryProgress) {
                        if (progress.team == team && progress.victory == v.$hash) {
                            currentProgress = progress.current;
                            totalProgress = progress.total;
                        }
                    }
                    this.createScoreData(player, localPlayerDiplomacy, v, place, currentProgress, totalProgress);
                }
            }
        }
        this.playerScores.sort(function (a, b) {
            //Sort by victory achieved then victory turn then score then name
            return (a.rank - b.rank
                || b.victoryTurn - a.victoryTurn
                || b.score - a.score
                || a.leaderName.localeCompare(b.leaderName));
        });
        if (this.onUpdate) {
            this.onUpdate(this);
        }
    }
    //Create some temporary score data until we can get the actual data from GameCore
    createScoreData(player, localPlayerDiplomacy, legacyPath, place, currentProgress, totalProgress) {
        const localPlayerID = GameContext.localPlayerID;
        const hasMet = localPlayerDiplomacy.hasMet(player.id) || localPlayerID == player.id;
        const leaderName = hasMet ? player.name : "LOC_LEADER_UNMET_NAME";
        const leaderIconsrc = hasMet ? Icon.getLeaderPortraitIcon(player.leaderType) : "fs://game/base-standard/ui/icons/leaders/leader_portrait_unknown.png"; // TODO - Replace magic string.
        const playerScore = {
            playerID: player.id,
            leaderName: leaderName,
            leaderPortrait: leaderIconsrc,
            score: currentProgress,
            scoreGoal: totalProgress,
            scoreIcon: Icon.getLegacyPathIcon(legacyPath),
            rank: place,
            rankIcon: "",
            victoryTurn: -1,
            victoryType: legacyPath.LegacyPathType,
            victoryClass: legacyPath.LegacyPathClassType,
            victoryAchieved: place > 0
        };
        this.playerScores.push(playerScore);
    }
    onRankingsHotkey() {
        if (ContextManager.isCurrentClass('screen-victory-progress')) {
            ContextManager.pop('screen-victory-progress');
        }
        else if (!ContextManager.hasInstanceOf('screen-pause-menu')) {
            ContextManager.push('screen-victory-progress');
        }
    }
    getBackdropByAdvisorType(advisorType) {
        // TODO - This needs to be part of an agnostic system that doesn't rely on string concatenations
        const lookup = {
            [Database.makeHash('ADVISOR_MILITARY')]: 'ADVISOR_BG_MILITARY',
            [Database.makeHash('ADVISOR_CULTURE')]: 'ADVISOR_BG_CULTURE',
            [Database.makeHash('ADVISOR_SCIENCE')]: 'ADVISOR_BG_SCIENCE',
            [Database.makeHash('ADVISOR_ECONOMIC')]: 'ADVISOR_BG_ECONOMIC',
        };
        const icon = lookup[advisorType];
        return (icon) ? UI.getIconURL(icon) : '';
    }
    getEnabledLegacyPaths() {
        const enabledLegacyPaths = [];
        for (const path of GameInfo.LegacyPaths) {
            if (path.EnabledByDefault) {
                enabledLegacyPaths.push(path);
            }
        }
        return enabledLegacyPaths;
    }
}
const VictoryProgress = new VictoryProgressModel();
export { VictoryProgress as default };

//# sourceMappingURL=file:///base-standard/ui/victory-progress/model-victory-progress.js.map
