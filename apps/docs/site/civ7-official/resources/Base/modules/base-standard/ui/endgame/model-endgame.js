/**
 * @file model-endgame.ts
 * @copyright 2023, Firaxis Games
 * @description Data model for end of game screen
 */
import { Icon } from '/core/ui/utilities/utilities-image.js';
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js';
class EndGameModel {
    get playerScores() {
        return this._playerScores;
    }
    set updateCallback(callback) {
        this.onUpdate = callback;
    }
    constructor() {
        this.updateGate = new UpdateGate(() => { this.update(); });
        this.ageOverListener = () => { this.onAgeOver(); };
        this.cityAddedToMapListener = () => { this.onCityAddedToMap(); };
        this.cityRemovedRemovedMapListener = () => { this.onCityRemovedFromMap(); };
        this.teamVictoryListener = () => { this.onTeamVictory(); };
        this.tradeRouteChangeListener = () => { this.onTradeRouteUpdate(); };
        this.greatWorkCreatedListener = () => { this.onGreatWorkCreated(); };
        this.wonderCompletedListener = () => { this.onWonderCompleted(); };
        this._playerScores = [];
        engine.on('GameAgeEnded', this.ageOverListener);
        engine.on('CityAddedToMap', this.cityAddedToMapListener);
        engine.on('CityRemovedFromMap', this.cityRemovedRemovedMapListener);
        engine.on('TeamVictory', this.teamVictoryListener);
        engine.on('TradeRouteAddedToMap', this.tradeRouteChangeListener);
        engine.on('TradeRouteChanged', this.tradeRouteChangeListener);
        engine.on('TradeRouteRemovedFromMap', this.tradeRouteChangeListener);
        engine.on('GreatWorkCreated', this.greatWorkCreatedListener);
        engine.on('WonderCompleted', this.wonderCompletedListener);
        this.updateGate.call('constructor');
    }
    update() {
        const playerList = Players.getEverAlive();
        const localPlayerID = GameContext.localPlayerID;
        const localPlayer = playerList[localPlayerID];
        if (!localPlayer) {
            return;
        }
        const localPlayerDiplomacy = localPlayer.Diplomacy;
        if (localPlayerDiplomacy === undefined) {
            console.error("model-endgame: Unable to get local player diplomacy!");
            return;
        }
        const victoryManager = Game.VictoryManager;
        const enabledVictories = victoryManager.getConfiguration().enabledVictories;
        const claimedVictories = victoryManager.getVictories();
        let playerScoreList = [];
        const playerDeadList = [];
        playerList.forEach((player) => {
            const hasMet = localPlayerDiplomacy.hasMet(player.id) || localPlayerID == player.id;
            const leaderName = hasMet ? player.name : "LOC_LEADER_UNMET_NAME";
            const leaderPortrait = hasMet ? Icon.getLeaderPortraitIcon(player.leaderType) : "fs://game/leader_portrait_unknown.png"; // TODO - Replace magic string with icon manager exposure.
            const victories = [];
            enabledVictories.forEach((victoryType) => {
                let claimed = false;
                let place = 0;
                const score = 0;
                // TODO - Assume a victory is unclaimed if no one has placed 1st. Hook up to game core when exposure becomes available.
                claimed = claimedVictories.find(victory => victory.victory == victoryType
                    && victory.place == 1) ? true : false;
                const victory = claimedVictories.find(victory => victory.team == player.team
                    && victory.victory == victoryType
                    && victory.place != 0);
                if (victory) {
                    place = victory.place;
                }
                victories.push({
                    victoryType,
                    claimed,
                    place,
                    score,
                });
            });
            const playerScore = {
                id: player.id,
                leaderName,
                leaderPortrait,
                currentAgeScore: 0,
                previousAgesScore: 0,
                totalScore: 0,
                isAlive: Players.isAlive(player.id),
                victories
            };
            if (player.isMajor) {
                if (playerScore.isAlive) {
                    playerScoreList.push(playerScore);
                }
                else {
                    playerDeadList.push(playerScore);
                }
            }
        });
        playerScoreList.sort((a, b) => { return a.currentAgeScore >= b.currentAgeScore ? -1 : 1; });
        playerDeadList.sort((a, b) => { return a.currentAgeScore >= b.currentAgeScore ? -1 : 1; });
        playerScoreList = playerScoreList.concat(playerDeadList);
        this._playerScores = playerScoreList;
        if (this.onUpdate) {
            this.onUpdate(this);
        }
        window.dispatchEvent(new CustomEvent('model-endgame-rebuild-age-rankings'));
    }
    onAgeOver() {
        this.updateGate.call('onAgeOver');
    }
    onCityAddedToMap() {
        this.updateGate.call('onCityAddedToMap');
    }
    onCityRemovedFromMap() {
        this.updateGate.call('onCityRemoveToMap');
    }
    onTeamVictory() {
        this.updateGate.call('onTeamVictory');
    }
    onTradeRouteUpdate() {
        this.updateGate.call('onTradeRouteUpdate');
    }
    onGreatWorkCreated() {
        this.updateGate.call('onGreatWorkCreated');
    }
    onWonderCompleted() {
        this.updateGate.call('onWonderCompleted');
    }
    getVictoryIconByVictoryClass(victoryType) {
        const definition = GameInfo.Victories.lookup(victoryType);
        if (!definition) {
            console.error('model-endgame: getVictoryIconByVictoryClass(): Failed to find victory definition!');
            return 'fs://game/victory_scientific_icon.png';
        }
        //! TODO Replace hard-coded list of victory classes with definition enumeration.
        //! TODO Replace hard-coded icon strings with use of Icon Manager.
        switch (definition.VictoryClassType) {
            case 'VICTORY_CLASS_CULTURE':
                return 'fs://game/victory_cultural_icon.png';
            case 'VICTORY_CLASS_ECONOMIC':
                return 'fs://game/victory_economic_icon.png';
            case 'VICTORY_CLASS_MILITARY':
                return 'fs://game/victory_militaristic_icon.png';
            case 'VICTORY_CLASS_SCIENCE':
                return 'fs://game/victory_scientific_icon.png';
        }
        return 'fs://game/victory_scientific_icon.png';
    }
}
const EndGame = new EndGameModel();
engine.whenReady.then(() => {
    const updateModel = () => {
        engine.updateWholeModel(EndGame);
    };
    engine.createJSModel('g_EndGameModel', EndGame);
    EndGame.updateCallback = updateModel;
});
export { EndGame as default };

//# sourceMappingURL=file:///base-standard/ui/endgame/model-endgame.js.map
