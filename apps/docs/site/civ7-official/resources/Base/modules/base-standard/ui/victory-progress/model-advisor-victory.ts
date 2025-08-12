/**
 * model-advisor-progress.ts
 * @copyright 2023-2024, Firaxis Games
 * @description Advisor Progress Data Model. This includes victory manager and tutorial for quest data
 */

import UpdateGate from '/core/ui/utilities/utilities-update-gate.js'
import VictoryManager, { PlayerData, VictoryData } from '/base-standard/ui/victory-manager/victory-manager.js';
import TutorialItem from '/base-standard/ui/tutorial/tutorial-item.js';
import { QuestItem, VictoryQuestState } from '/base-standard/ui/quest-tracker/quest-item.js';
import QuestTracker from '/base-standard/ui/quest-tracker/quest-tracker.js';
import { Layout } from '/core/ui/utilities/utilities-layout.js';

const AdvisorLegacyPathClasses = new Map<AdvisorType, string>();
AdvisorLegacyPathClasses.set(AdvisorTypes.SCIENCE, 'LEGACY_PATH_CLASS_SCIENCE');
AdvisorLegacyPathClasses.set(AdvisorTypes.MILITARY, 'LEGACY_PATH_CLASS_MILITARY');
AdvisorLegacyPathClasses.set(AdvisorTypes.CULTURE, 'LEGACY_PATH_CLASS_CULTURE');
AdvisorLegacyPathClasses.set(AdvisorTypes.ECONOMIC, 'LEGACY_PATH_CLASS_ECONOMIC');

const AgeStrings = new Map<string, string>();
AgeStrings.set('AGE_ANTIQUITY', 'ANTIQUITY');
AgeStrings.set('AGE_EXPLORATION', 'EXPLORATION');
AgeStrings.set('AGE_MODERN', 'MODERN');

type ageInfo = {
	age: string,
	pediaPageIds: { cultural: string, economic: string, military: string, scientific: string }
}

class AdvisorProgressModel {
	victoryData: Map<string, VictoryData[]> = new Map();
	playerData: PlayerData | null = null;
	questData: TutorialItem[] = [];
	mileStoneData: AgeProgressionMilestoneDefinition[] = [];
	advisorType: string = '';
	private onUpdate?: (model: AdvisorProgressModel) => void;

	//TODO: This should be moved to the database for maintainability. If we store all the data by advisor type we can pull out more of the switch cases.
	private ageInfoList: ageInfo[] = [
		{ age: 'AGE_ANTIQUITY', pediaPageIds: { cultural: "AGES_24", economic: "AGES_27", military: "AGES_25", scientific: "AGES_26" } },
		{ age: 'AGE_EXPLORATION', pediaPageIds: { cultural: "AGES_28", economic: "AGES_29", military: "AGES_30", scientific: "AGES_31" } },
		{ age: 'AGE_MODERN', pediaPageIds: { cultural: "AGES_35", economic: "AGES_32", military: "AGES_33", scientific: "AGES_34" } }
	];

	constructor() {
		VictoryManager.victoryManagerUpdateEvent.on(this.onVictoryManagerUpdate.bind(this));
		this.updateGate.call('constructor');
	}

	set updateCallback(callback: (model: AdvisorProgressModel) => void) {
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

	getActiveQuest(advisorType: AdvisorType): QuestItem | undefined {
		const quests = this.getQuestsByAdvisor(advisorType);
		for (const quest of quests) {
			const memoryState = QuestTracker.readQuestVictory(quest.id).state;
			if (memoryState != VictoryQuestState.QUEST_COMPLETED) {
				return quest;
			}
		}
		// If no available victory quests, return undefined
		return undefined;
	}

	/**
	 * @param {AdvisorType} type Category to filter Victory Quests.
	 * @returns An ordered list of quests by advisor
	 */
	getQuestsByAdvisor(type: AdvisorType): QuestItem[] {
		const items: QuestItem[] = Array.from(QuestTracker.getItems());
		const advisorItems = items.filter(item => item.victory && item.victory.type == type);

		const orderedItems = advisorItems.sort((itemA, itemB) => {
			if (itemA.victory && itemB.victory) {
				return itemA.victory.order - itemB.victory.order
			}
			return 0;
		});

		return orderedItems;
	}

	isQuestTracked(quest: QuestItem): boolean {
		if (!quest) {
			return false;
		}
		const isQuestTracked: boolean = QuestTracker.isQuestVictoryInProgress(quest.id);
		if (isQuestTracked) {
			QuestTracker.updateQuestList(quest.id);
		}
		return isQuestTracked;
	}

	updateQuestTracking(quest: QuestItem, isTracked: boolean): void {
		if (!quest) {
			return;
		}

		let tutorialData: TutorialData = {
			FtueEvent: "Tutorial Quest Tracking",
			TutorialDefinitionId: "",
			AdvisorType: "",
			AdvisorWarningType: "",
			QuestLine: quest.id,
			IsTracked: isTracked,
		};
		Telemetry.sendTutorial(tutorialData);

		if (isTracked) {
			QuestTracker.setQuestVictoryState(quest, VictoryQuestState.QUEST_IN_PROGRESS);
		} else {
			QuestTracker.setQuestVictoryState(quest, VictoryQuestState.QUEST_UNSTARTED);
			if (quest.victory) {
				QuestTracker.setPathTracked(false, quest.victory.type);
			}
		}

		QuestTracker.writeQuestVictory(quest);
	}

	getLegacyPathClassTypeByAdvisorType(advisorType: AdvisorType): string | undefined {
		return AdvisorLegacyPathClasses.get(advisorType);
	}

	getAdvisorStringByAdvisorType(advisorType: AdvisorType): string {
		switch (advisorType) {
			case AdvisorTypes.SCIENCE:
				return 'ADVISOR_SCIENCE';
			case AdvisorTypes.MILITARY:
				return 'ADVISOR_MILITARY';
			case AdvisorTypes.CULTURE:
				return 'ADVISOR_CULTURE';
			case AdvisorTypes.ECONOMIC:
				return 'ADVISOR_ECONOMIC';
			default:
				return '';
		}
	}

	getAdvisorVictoryLoc(advisorType: AdvisorType): string {
		// TODO probably should use differnt loc strings from the cinematic ones
		switch (advisorType) {
			case AdvisorTypes.SCIENCE:
				return 'LOC_UI_CINEMATIC_FIRST_SPACE_FLIGHT';
			case AdvisorTypes.MILITARY:
				return 'LOC_UI_CINEMATIC_OPERATION_IVY_TITLE';
			case AdvisorTypes.CULTURE:
				return 'LOC_UI_CINEMATIC_WORLDS_FAIR';
			case AdvisorTypes.ECONOMIC:
				return 'LOC_UI_CINEMATIC_WORLD_BANK';
			default:
				return '';
		}
	}

	getCivilopediaVictorySearchByAdvisor(advisorType: AdvisorType): string {
		const definition: AgeDefinition | null = GameInfo.Ages.lookup(Game.age);
		if (!definition) {
			console.error(`ERROR: No age definition found for ${Game.age} in model-advisor-victory.ts`);
		}
		const ageData: ageInfo | undefined = this.ageInfoList.find(ageInfo => {
			return definition?.AgeType == ageInfo.age;
		});
		if (!ageData) {
			console.error(`ERROR - getCivilopediaVictorySearchByAdvisor(advisorType: AdvisorType) - No ageData found while looking up advisorType (${advisorType}) for civilopedia page id!`);
			return '';
		}
		switch (advisorType) {
			case AdvisorTypes.CULTURE:
				return ageData.pediaPageIds.cultural;
			case AdvisorTypes.ECONOMIC:
				return ageData.pediaPageIds.economic;
			case AdvisorTypes.MILITARY:
				return ageData.pediaPageIds.military;
			case AdvisorTypes.SCIENCE:
				return ageData.pediaPageIds.scientific;
			default:
				return '';
		}
	}

	getAdvisorPortrait(advisorType: AdvisorType): string {
		return UI.getIconURL(this.getAdvisorStringByAdvisorType(advisorType), 'ADVISOR');
	}

	getAdvisorProgressBar(advisorType: AdvisorType): string {
		const iconString: string = this.getAdvisorStringByAdvisorType(advisorType) + "_BAR";
		return UI.getIconURL(iconString, 'ADVISOR');
	}

	getAdvisorVictoryIcon(advisorType: AdvisorType, isModernAge: boolean = false): string {
		let iconString: string = '';
		if (isModernAge) {
			iconString = this.getAdvisorStringByAdvisorType(advisorType) + "_VICTORY";
		} else {
			iconString = this.getAdvisorStringByAdvisorType(advisorType) + "_GOLDEN_AGE";
		}
		return UI.getIconURL(iconString, 'ADVISOR');
	}

	getRewardGrantIcon(rewardType: string | undefined): string {
		return UI.getIconURL(rewardType || '');
	}

	getPlayerProgress(advisor: AdvisorType, currentAge: string): PlayerData | null {
		const progressData = this.victoryData.get(currentAge);
		if (progressData) {
			const progress = progressData.find(victory => victory.ClassType == AdvisorProgress.getLegacyPathClassTypeByAdvisorType(advisor));
			if (progress) {
				for (const [_index, player] of progress.playerData.entries()) {
					if (player.isLocalPlayer) {
						return player;
					}
				}
			}
		}
		return null;
	}

	private getLegacyPathFromAdvisor(advisorType: AdvisorType): LegacyPathDefinition | null {
		const classType = AdvisorProgress.getLegacyPathClassTypeByAdvisorType(advisorType);
		for (const legacyPath of GameInfo.LegacyPaths) {
			if (legacyPath.LegacyPathClassType == classType && legacyPath.EnabledByDefault) {
				return legacyPath;
			}
		}

		return null;
	}

	getAdvisorMileStones(advisorType: AdvisorType) {
		const definition: AgeDefinition | null = GameInfo.Ages.lookup(Game.age);
		if (!definition) {
			console.warn("model-advisor-victory: getAdvisorMileStones(): No current definition for Age: " + Game.age);
		}
		const legacyPath = this.getLegacyPathFromAdvisor(advisorType);
		if (legacyPath) {
			const progressMileStones = GameInfo.AgeProgressionMilestones.filter(milestone => milestone.LegacyPathType == legacyPath.LegacyPathType);

			// TODO - Shouldn't this be sorted?
			return progressMileStones;

		}
		else {
			return [];
		}
	}

	getAgeStringByType(ageType: string): string | undefined {
		return AgeStrings.get(ageType);
	}

	getMaxScoreForAdvisorType(advisor: AdvisorType): number {
		const milestones = this.getAdvisorMileStones(advisor);
		for (const stone of milestones) {
			if (stone.FinalMilestone) {
				return stone.RequiredPathPoints;
			}
		}
		return 0;
	}

	getDarkAgeIcon(advisor: AdvisorType, playerProgress: number, darkAgeIcon?: string) {
		const availbleIconToUse = darkAgeIcon ? darkAgeIcon : 'fs://game/leg_pro_darka_available.png';
		const milestones = this.getAdvisorMileStones(advisor);
		// dark age is locked if the first milestone is not met
		if (milestones[0] && milestones[0].RequiredPathPoints <= playerProgress) {
			return 'fs://game/leg_pro_darka_locked.png';
		} else {
			return availbleIconToUse;
		}
	}

	getDarkAgeBarPercent(advisor: AdvisorType): number {
		const milestones = this.getAdvisorMileStones(advisor);
		const maxScore = this.getMaxScoreForAdvisorType(advisor);
		if (milestones[0] && milestones[0].RequiredPathPoints) {
			// 0.04 is to account for the 4% ofset of the darkage icon
			const offSet = window.innerHeight > Layout.pixelsToScreenPixels(1000) ? 0.04 : 0
			return (milestones[0].RequiredPathPoints / maxScore) + offSet;
		} else {
			return 0;
		}
	}

	isRewardMileStone(advisor: AdvisorType, pip: number): boolean {
		const milestones = this.getAdvisorMileStones(advisor);
		for (const stone of milestones) {
			if (stone.RequiredPathPoints === pip) {
				return true;
			}
		}
		return false;
	}

	getMilestoneRewards(advisor: AdvisorType, pip: number): AgeProgressionRewardDefinition[] {
		const milestones = this.getAdvisorMileStones(advisor);
		const rewardDef: AgeProgressionRewardDefinition[] = [];
		for (const stone of milestones) {
			if (stone.RequiredPathPoints === pip) {
				const milestoneRewards = GameInfo.AgeProgressionMilestoneRewards.filter(reward => reward.AgeProgressionMilestoneType === stone.AgeProgressionMilestoneType);
				for (const reward of milestoneRewards) {
					const ageReward = GameInfo.AgeProgressionRewards.lookup(reward.AgeProgressionRewardType);
					if (ageReward) {
						rewardDef.push(ageReward);
					}
				}
			}
		}
		return rewardDef;
	}

	isMilestoneComplete(advisor: AdvisorType, pip: number): boolean {
		const milestones = this.getAdvisorMileStones(advisor);
		for (const stone of milestones) {
			if (stone.RequiredPathPoints === pip) {
				return Game.AgeProgressManager.isMilestoneComplete(stone.AgeProgressionMilestoneType);
			}
		}
		return false;
	}

	/**
	 * Determine the milestone progress amount given for an advisor
	 * @param advisor Which advisor this is for
	 * @param milestoneRewardNum The milestone reward number this represents
	 * @returns The associate reward amount with the milestone or 0 if one can't be found.
	 */
	getMilestoneProgressAmount(advisor: AdvisorType, milestoneRewardNum: number): number {
		const milestones = this.getAdvisorMileStones(advisor);
		for (const stone of milestones) {
			// Milestone rewards have a suffix of "_#" where # starts at 1 and increases per reward.
			// This extracts the number portion at the end of the string for later comparison.
			const index = stone.AgeProgressionMilestoneType.lastIndexOf("_");
			if (index == -1) {	// Check if no # was found at the end, which means it should be malformed (or someone changed the spec)
				console.warn(`Unable to determine the # for a milestone reward.  AgeProgressionMilestone table entry is: ${stone.AgeProgressionMilestoneType}`);
				continue;
			}
			const num = stone.AgeProgressionMilestoneType.substring(index + 1);
			// Compare the number in the database row to the number passed in, if it's a match, this is the row to return the amount.
			if (Number(num) == milestoneRewardNum) {
				// Need to adjust this value for game speed, as this also happens on the GameCore side
				return Game.EconomicRules.adjustForGameSpeed(stone.AgeProgressionAmount);
			}
		}
		return 0;	// No match found, return 0 (assume no entry exists for it)
	}

	getDarkAgeReward(advisor: AdvisorType): AgeProgressionDarkAgeRewardInfoDefinition | undefined {
		const legacyPath = this.getLegacyPathFromAdvisor(advisor);
		if (legacyPath) {
			return GameInfo.AgeProgressionDarkAgeRewardInfos.find(reward => reward.LegacyPathType == legacyPath.LegacyPathType);
		}
		return undefined;
	}
}

const AdvisorProgress = new AdvisorProgressModel();
engine.whenReady.then(() => {

	const updateModel = () => {
		engine.updateWholeModel(AdvisorProgress);
	}

	engine.createJSModel('g_AdvisorProgressModel', AdvisorProgress);
	AdvisorProgress.updateCallback = updateModel;
});

export { AdvisorProgress as default };