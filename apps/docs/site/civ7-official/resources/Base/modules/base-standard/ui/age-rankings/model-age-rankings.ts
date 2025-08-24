/**
 * model-age-rankings.ts
 * @copyright 2023-2024, Firaxis Games
 * @description Age Rankings data model
 */

import UpdateGate from '/core/ui/utilities/utilities-update-gate.js'
import VictoryManager, { VictoryData } from '/base-standard/ui/victory-manager/victory-manager.js';

class AgeRankingsModel {

	victoryData: Map<string, VictoryData[]> = new Map();

	private onUpdate?: (model: AgeRankingsModel) => void;

	constructor() {
		VictoryManager.victoryManagerUpdateEvent.on(this.onVictoryManagerUpdate.bind(this));

		this.updateGate.call('constructor');
	}

	set updateCallback(callback: (model: AgeRankingsModel) => void) {
		this.onUpdate = callback;
	}

	private updateGate = new UpdateGate(() => {

		this.victoryData = VictoryManager.processedVictoryData;

		if (this.onUpdate) {
			this.onUpdate(this);
		}
	})

	private onVictoryManagerUpdate() {
		this.updateGate.call('onVictoryManagerUpdate');
	}

	getMilestonesCompleted(legacyPathType: string): number {
		const progressMileStones = GameInfo.AgeProgressionMilestones.filter(milestone => milestone.LegacyPathType == legacyPathType);
		let mileStonesReached: number = 0;
		for (const milestone of progressMileStones) {
			mileStonesReached = Game.AgeProgressManager.isMilestoneComplete(milestone.AgeProgressionMilestoneType) ? mileStonesReached + milestone.AgeProgressionAmount : mileStonesReached;
		}
		return mileStonesReached;
	}

	getMaxMilestoneProgressionTotal(legacyPathType: string): number {
		const progressMileStones = GameInfo.AgeProgressionMilestones.filter(milestone => milestone.LegacyPathType == legacyPathType);
		let mileStonesReached: number = 0;
		for (const milestone of progressMileStones) {
			mileStonesReached = mileStonesReached + milestone.AgeProgressionAmount;
		}
		return mileStonesReached;
	}

	getMilestoneBarPercentages(legacyPathType: string): number[] {
		const progressMileStones = GameInfo.AgeProgressionMilestones.filter(milestone => milestone.LegacyPathType == legacyPathType);
		let mileStonePercentage: number[] = [];
		for (const milestone of progressMileStones) {
			const finalMilestone = progressMileStones.find(stone => stone.FinalMilestone);
			const finalMileStoneRequiredPoints = finalMilestone?.RequiredPathPoints ? finalMilestone?.RequiredPathPoints : milestone.RequiredPathPoints;
			const percent = milestone.RequiredPathPoints / finalMileStoneRequiredPoints;
			mileStonePercentage.push(percent);
		}
		return mileStonePercentage
	}
}

const AgeRankings = new AgeRankingsModel();
engine.whenReady.then(() => {

	const updateModel = () => {
		engine.updateWholeModel(AgeRankings);
	}

	engine.createJSModel('g_AgeRankingsModel', AgeRankings);
	AgeRankings.updateCallback = updateModel;
});

export { AgeRankings as default };