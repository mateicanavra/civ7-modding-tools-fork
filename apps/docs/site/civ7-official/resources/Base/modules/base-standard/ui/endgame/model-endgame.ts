/**
 * @file model-endgame.ts
 * @copyright 2023, Firaxis Games
 * @description Data model for end of game screen
 */

import { Icon } from '/core/ui/utilities/utilities-image.js';
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js';

export type PlayerVictory = {
	victoryType: VictoryType;
	claimed: boolean;
	place: number;
	score: number;
}

export type PlayerAgeScore = {
	id: PlayerId;
	leaderName: string;
	leaderPortrait: string;
	currentAgeScore: number;
	previousAgesScore: number;
	totalScore: number;
	isAlive: boolean;
	victories: PlayerVictory[];
}

class EndGameModel {

	private onUpdate?: (model: EndGameModel) => void;

	private updateGate: UpdateGate = new UpdateGate(() => { this.update(); });

	private ageOverListener = () => { this.onAgeOver(); };
	private cityAddedToMapListener = () => { this.onCityAddedToMap(); };
	private cityRemovedRemovedMapListener = () => { this.onCityRemovedFromMap(); };
	private teamVictoryListener = () => { this.onTeamVictory(); };
	private tradeRouteChangeListener = () => { this.onTradeRouteUpdate(); };
	private greatWorkCreatedListener = () => { this.onGreatWorkCreated(); };
	private wonderCompletedListener = () => { this.onWonderCompleted(); };

	private _playerScores: PlayerAgeScore[] = [];

	get playerScores(): PlayerAgeScore[] {
		return this._playerScores;
	}

	set updateCallback(callback: (model: EndGameModel) => void) {
		this.onUpdate = callback;
	}

	constructor() {
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

	private update() {

		const playerList: PlayerLibrary[] = Players.getEverAlive();
		const localPlayerID: PlayerId = GameContext.localPlayerID;
		const localPlayer: PlayerLibrary = playerList[localPlayerID];
		if (!localPlayer) {
			return;
		}

		const localPlayerDiplomacy: PlayerDiplomacy | undefined = localPlayer.Diplomacy;
		if (localPlayerDiplomacy === undefined) {
			console.error("model-endgame: Unable to get local player diplomacy!");
			return;
		}

		const victoryManager: VictoryManagerLibrary = Game.VictoryManager;
		const enabledVictories: VictoryType[] = victoryManager.getConfiguration().enabledVictories;
		const claimedVictories: VictoryManagerLibrary_VictoryInfo[] = victoryManager.getVictories();

		let playerScoreList: PlayerAgeScore[] = [];
		const playerDeadList: PlayerAgeScore[] = [];
		playerList.forEach((player: PlayerLibrary) => {

			const hasMet: boolean = localPlayerDiplomacy.hasMet(player.id) || localPlayerID == player.id;
			const leaderName: string = hasMet ? player.name : "LOC_LEADER_UNMET_NAME";
			const leaderPortrait: string = hasMet ? Icon.getLeaderPortraitIcon(player.leaderType) : "fs://game/leader_portrait_unknown.png"; // TODO - Replace magic string with icon manager exposure.

			const victories: PlayerVictory[] = [];

			enabledVictories.forEach((victoryType: VictoryType) => {
				let claimed: boolean = false;
				let place: number = 0;
				const score: number = 0;

				// TODO - Assume a victory is unclaimed if no one has placed 1st. Hook up to game core when exposure becomes available.
				claimed = claimedVictories.find(victory =>
					victory.victory == victoryType
					&& victory.place == 1) ? true : false;

				const victory: VictoryManagerLibrary_VictoryInfo | undefined = claimedVictories.find(victory =>
					victory.team == player.team
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
				})
			})

			const playerScore: PlayerAgeScore = {
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
		})

		playerScoreList.sort((a, b) => { return a.currentAgeScore >= b.currentAgeScore ? -1 : 1 });
		playerDeadList.sort((a, b) => { return a.currentAgeScore >= b.currentAgeScore ? -1 : 1 });
		playerScoreList = playerScoreList.concat(playerDeadList);

		this._playerScores = playerScoreList;

		if (this.onUpdate) {
			this.onUpdate(this);
		}

		window.dispatchEvent(new CustomEvent('model-endgame-rebuild-age-rankings'));
	}

	private onAgeOver() {
		this.updateGate.call('onAgeOver');
	}

	private onCityAddedToMap() {
		this.updateGate.call('onCityAddedToMap');
	}

	private onCityRemovedFromMap() {
		this.updateGate.call('onCityRemoveToMap');
	}

	private onTeamVictory() {
		this.updateGate.call('onTeamVictory');
	}

	private onTradeRouteUpdate() {
		this.updateGate.call('onTradeRouteUpdate');
	}

	private onGreatWorkCreated() {
		this.updateGate.call('onGreatWorkCreated');
	}

	private onWonderCompleted() {
		this.updateGate.call('onWonderCompleted');
	}

	getVictoryIconByVictoryClass(victoryType: VictoryType): string {

		const definition: VictoryDefinition | null = GameInfo.Victories.lookup(victoryType);
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
	}

	engine.createJSModel('g_EndGameModel', EndGame);
	EndGame.updateCallback = updateModel;
});

export { EndGame as default };
