/**
 * model-age-scores.ts
 * @copyright 2023-2024, Firaxis Games
 * @description Age Scores data model
 */

import { Icon } from '/core/ui/utilities/utilities-image.js';
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js';
import VictoryManager from '/base-standard/ui/victory-manager/victory-manager.js';

export interface VictoryData {
	victoryName: string;
	victoryDescription: string;
	victoryType: string;
	victoryClass: string;
	victoryIcon: string;
	victoryBackground: string;
	scoreNeeded: number;
	localPlayerPercent: number;
	playerData: PlayerData[];
}

export interface PlayerData {
	playerID: PlayerId;
	leaderName: string;
	score: number;
	percentToVictory: number;
	leaderPortrait: string;
	civIcon: string;
	rank: number;
	rankString: string;
	primaryColor: string;
	secondaryColor: string;
}

class AgeScoresModel {

	private onUpdate?: (model: AgeScoresModel) => void;

	// Map of players scores keyed to victory class type
	private _victories: VictoryData[] = []

	get victories(): VictoryData[] {
		return this._victories;
	}

	constructor() {
		VictoryManager.victoryManagerUpdateEvent.on(this.onVictoryManagerUpdate.bind(this));

		this.updateGate.call('constructor');
	}

	private onVictoryManagerUpdate() {
		this.updateGate.call('onVictoryManagerUpdate');
	}

	set updateCallback(callback: (model: AgeScoresModel) => void) {
		this.onUpdate = callback;
	}

	private updateGate = new UpdateGate(() => {
		this._victories = [];

		const localPlayerID: PlayerId = GameContext.localPlayerID;
		const localPlayer: PlayerLibrary | null = Players.get(localPlayerID);
		if (!localPlayer) {
			return;
		}

		const localPlayerDiplomacy: PlayerDiplomacy | undefined = localPlayer.Diplomacy;
		if (localPlayerDiplomacy === undefined) {
			console.error("model-age-scores: Unable to get local player diplomacy!");
			return;
		}

		const victoryManager: VictoryManagerLibrary = Game.VictoryManager;
		const enabledVictories: VictoryType[] = victoryManager.getConfiguration().enabledVictories;
		const claimedVictories: VictoryManagerLibrary_VictoryInfo[] = victoryManager.getVictories();
		const victoryEnabledPlayers: PlayerId[] = victoryManager.getVictoryEnabledPlayers();
		const victoryProgress: VictoryManagerLibrary_VictoryProgress[] = victoryManager.getVictoryProgress();

		for (const v of enabledVictories) {
			const definition: VictoryDefinition | null = GameInfo.Victories.lookup(v);
			if (definition) {
				const victoryData: VictoryData = {
					victoryName: definition.Name,
					victoryDescription: definition.Description ?? '',
					victoryType: definition.VictoryType,
					victoryClass: definition.VictoryClassType,
					victoryIcon: Icon.getVictoryIcon(definition),
					victoryBackground: this.getBackdropByVictoryClass(definition.VictoryClassType),
					localPlayerPercent: 0,
					scoreNeeded: 0,
					playerData: []
				}

				for (const playerId of victoryEnabledPlayers) {
					const player: PlayerLibrary | null = Players.get(playerId);
					if (player && player.isMajor) {
						const team: TeamId = player.team;

						let place: number = 0;
						let currentProgress: number = 0;
						let totalProgress: number = 0;

						for (const cv of claimedVictories) {
							if (cv.team == team && cv.victory == v) {
								place = cv.place;
								break;
							}
						}

						for (const p of victoryProgress) {
							if (p.team == team && p.victory == v) {
								currentProgress = p.current;
								totalProgress = p.total;
							}
						}

						this.createPlayerData(player, localPlayerDiplomacy, place, currentProgress, totalProgress, victoryData);
					}
				}

				this._victories.push(victoryData);
			}
		}

		// Sort scores for each class
		const sorter = (a: PlayerData, b: PlayerData) => (
			a.rank > 0 ? a.rank - b.rank : 0 ||
				b.score - a.score ||
				a.leaderName.localeCompare(b.leaderName));
		for (let v of this._victories) {
			v.playerData.sort(sorter);
		}

		if (this.onUpdate) {
			this.onUpdate(this);
		}

		window.dispatchEvent(new CustomEvent('model-age-scores-rebuild-panel'));
	})

	private createPlayerData(player: PlayerLibrary, localPlayerDiplomacy: PlayerDiplomacy, victoryPlace: number, currentScore: number, totalScore: number, victoryData: VictoryData) {
		const localPlayerID: PlayerId = GameContext.localPlayerID;
		const hasMet: boolean = localPlayerDiplomacy.hasMet(player.id) || localPlayerID == player.id;
		const leaderName: string = hasMet ? player.name : "LOC_LEADER_UNMET_NAME";
		const leaderIconsrc: string = hasMet ? Icon.getLeaderPortraitIcon(player.leaderType) : "fs://game/leader_portrait_unknown.png"; // TODO - Replace magic string with icon manager exposure.
		const civIconSrc: string = hasMet ? Icon.getCivSymbolFromCivilizationType(player.civilizationType) : "fs://game/civ_sym_unknown.png"; // TODO - Replace magic string with icon manager exposure.		
		const playerColorPrimary: string = UI.Player.getPrimaryColorValueAsString(player.id);
		const playerColorSecondary: string = UI.Player.getSecondaryColorValueAsString(player.id);

		const currentScoreAdjusted = Math.min(currentScore, totalScore);
		const percentToVictory = (totalScore > 0) ? currentScoreAdjusted / totalScore : 0;

		victoryData.scoreNeeded = totalScore;

		const playerData: PlayerData = {
			playerID: player.id,
			leaderName: leaderName,
			leaderPortrait: leaderIconsrc,
			civIcon: civIconSrc,
			score: currentScoreAdjusted,
			rank: victoryPlace,
			rankString: this.madeRankString(victoryPlace),
			percentToVictory: percentToVictory,
			primaryColor: playerColorPrimary,
			secondaryColor: playerColorSecondary
		}

		// Update the local players percent to victory
		if (localPlayerID == player.id) {
			victoryData.localPlayerPercent = percentToVictory;
		}

		victoryData.playerData.push(playerData);
	}

	private getBackdropByVictoryClass(victoryClassType: string): string {
		//! TODO Replace hard-coded list of victory classes with definition enumeration.
		//! TODO Replace hard-coded image strings with use of Icon Manager or store url in definition.
		switch (victoryClassType) {
			case 'VICTORY_CLASS_CULTURE':
				return 'fs://game/antiquity_culture_victory.png';
			case 'VICTORY_CLASS_ECONOMIC':
				return 'fs://game/antiquity_economic_victory.png';
			case 'VICTORY_CLASS_MILITARY':
				return 'fs://game/antiquity_domination_victory.png';
			case 'VICTORY_CLASS_SCIENCE':
				return 'fs://game/antiquity_science_victory.png';
		}

		return 'fs://game/antiquity_science_victory.png';
	}

	private madeRankString(rank: number): string {
		return (rank > 0) ? `LOC_AGE_SCORE_PLACE_${rank}` : '';
	}
}

const AgeScores = new AgeScoresModel();
engine.whenReady.then(() => {

	const updateModel = () => {
		engine.updateWholeModel(AgeScores);
	}

	engine.createJSModel('g_AdvancedStartModel', AgeScores);
	AgeScores.updateCallback = updateModel;
});

export { AgeScores as default };
