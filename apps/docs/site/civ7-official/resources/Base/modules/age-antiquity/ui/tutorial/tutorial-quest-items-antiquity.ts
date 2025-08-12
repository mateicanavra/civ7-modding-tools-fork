/**
 * @file tutorial-quest-items-antiquity.ts
 * @copyright 2024, Firaxis Games
 * @description Defines the sequence of tutorial quest items for the antiquity age.
 * 
*/

import TutorialItem, { TutorialAdvisorType, TutorialQuestContent, TutorialAnchorPosition } from '/base-standard/ui/tutorial/tutorial-item.js';
import TutorialManager from '/base-standard/ui/tutorial/tutorial-manager.js';
import * as TutorialSupport from '/base-standard/ui/tutorial/tutorial-support.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
import QuestTracker, { QuestCompletedEventName } from '/base-standard/ui/quest-tracker/quest-tracker.js';
import { VictoryQuestState } from '/base-standard/ui/quest-tracker/quest-item.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';

// ---------------------------------------------------------------------------
// Defines for option buttons
//
const calloutBegin = { callback: () => { }, text: "LOC_TUTORIAL_CALLOUT_BEGIN", actionKey: "inline-accept", closes: true };
const calloutContinue = { callback: () => { }, text: "LOC_TUTORIAL_CALLOUT_CONTINUE", actionKey: "inline-accept", closes: true };
const calloutClose = { callback: () => { }, text: "LOC_TUTORIAL_CALLOUT_CLOSE", actionKey: "inline-cancel", closes: true };
const calloutDeclineQuest = { callback: () => { }, text: "LOC_TUTORIAL_CALLOUT_DECLINE_QUEST", actionKey: "inline-cancel", closes: true };

// ------------------------------------------------------------------
// VICTORY QUEST LINE - SCIENCE
// ------------------------------------------------------------------
// SCIENCE QUEST 1
TutorialManager.add({
	ID: "advisor_quest_panel",
	questPanel: {
		title: "LOC_TUTORIAL_QUEST_SELECTION_TITLE",
		description: {
			text: "LOC_TUTORIAL_QUEST_SELECTION_BODY",
			getLocParams: (_item: TutorialItem) => {
				let civAdj: string = "null";
				const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
				if (player) {
					civAdj = player.civilizationAdjective;
				}
				return [civAdj];
			}
		},
		altNoAdvisorsDescription: {
			text: "LOC_TUTORIAL_QUEST_SELECTION_BODY_NO_ADVISORS"
		},
		advisors: [
			//! No 'nextID' elements chained to buttons need a 'activationCustomEvents'
			{
				type: AdvisorTypes.ECONOMIC,
				quote: "LOC_TUTORIAL_QUEST_QUOTE_ECONOMIC",
				button: {
					callback: () => { },
					text: "LOC_ADVISOR_ECONOMIC_NAME",
					pathDesc: "LOC_TUTORIAL_LEGACY_PATH_ECONOMIC_DESCRIPTION",
					closes: true,
					actionKey: "",
					nextID: "economic_victory_quest_A",
					questID: "economic_victory_quest_A_tracking"
				},
				legacyPathClassType: "LEGACY_PATH_CLASS_ECONOMIC"
			},
			{
				type: AdvisorTypes.MILITARY,
				quote: "LOC_TUTORIAL_QUEST_QUOTE_MILITARY",
				button: {
					callback: () => { },
					text: "LOC_ADVISOR_MILITARY_NAME",
					pathDesc: "LOC_TUTORIAL_LEGACY_PATH_MILITARY_DESCRIPTION",
					closes: true,
					actionKey: "",
					nextID: "military_victory_quest_line_start_hint_A", //This is a hint turned into a first-step quest. 
					questID: "military_victory_quest_A_tracking" //TODO: bring this into the standard 1,2,3 count after UT
				},
				legacyPathClassType: "LEGACY_PATH_CLASS_MILITARY"
			},
			{
				type: AdvisorTypes.CULTURE,
				quote: "LOC_TUTORIAL_QUEST_QUOTE_CULTURE",
				button: {
					callback: () => { },
					text: "LOC_ADVISOR_CULTURE_NAME",
					pathDesc: "LOC_TUTORIAL_LEGACY_PATH_CULTURE_DESCRIPTION",
					closes: true,
					actionKey: "",
					nextID: "culture_victory_quest_1_accepted",
					questID: "culture_victory_quest_1_tracking"
				},
				legacyPathClassType: "LEGACY_PATH_CLASS_CULTURE"
			},
			{
				type: AdvisorTypes.SCIENCE,
				quote: "LOC_TUTORIAL_QUEST_QUOTE_SCIENCE",
				button: {
					callback: () => { },
					text: "LOC_ADVISOR_SCIENCE_NAME",
					pathDesc: "LOC_TUTORIAL_LEGACY_PATH_SCIENCE_DESCRIPTION",
					closes: true,
					actionKey: "",
					nextID: "science_victory_quest_1_accepted",
					questID: "science_victory_quest_1_tracking"
				},
				legacyPathClassType: "LEGACY_PATH_CLASS_SCIENCE"
			},
		]
	},
	activationEngineEvents: ["TechNodeCompleted"],
	onActivateCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			let playerTechs = player.Techs;
			if (playerTechs && playerTechs.getNumTechsUnlocked() > 1) {
				return true;
			}
		}
		return false;
	},
	onObsoleteCheck: (item: TutorialItem) => {
		if (!item.questPanel) {
			return false;
		}
		const trackedPaths: Array<boolean> = [];
		item.questPanel.advisors.forEach(advisor => {
			const advisorPath = QuestTracker.readQuestVictory(advisor.button.questID);
			if (advisorPath.state == VictoryQuestState.QUEST_IN_PROGRESS || advisorPath.state == VictoryQuestState.QUEST_COMPLETED) {
				// Path tracked
				trackedPaths.push(true);
			} else {
				trackedPaths.push(false);
			}
		});
		if (TutorialManager.isItemCompleted("legacy_quest_tracker")) {
			return true;
		}
		return trackedPaths.every(path => path);
	},
	hiders: [".tut-action-button", ".tut-action-text"],
	inputFilters: [{ inputName: "next-action" }]
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "legacy_quest_tracker",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: "LOC_TUTORIAL_LEGACY_QUEST_TRACKER_TITLE",
		body: {
			text: "LOC_TUTORIAL_LEGACY_QUEST_TRACKER_BODY",
		},
		option1: calloutContinue,
	},
	onActivate: (_item: TutorialItem) => {
		// TODO: highlight quest tracker panel entry if possible
	},
	onCleanUp: () => {
		InterfaceMode.switchToDefault();
	},
	highlights: [".quest-item-container .quest-list__highlight"],
	nextID: "open_legacy_progress_screen"
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "open_legacy_progress_screen",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: "LOC_TUTORIAL_OPEN_LEGACY_PROGRESS_SCREEN_TITLE",
		body: {
			text: "LOC_TUTORIAL_OPEN_LEGACY_PROGRESS_SCREEN_BODY",
		},
		actionPrompts: [
			{
				kbm: "LOC_TUTORIAL_OPEN_LEGACY_PROGRESS_SCREEN_KBM",
				gamepad: "LOC_TUTORIAL_OPEN_LEGACY_PROGRESS_SCREEN_GAMEPAD",
				hybrid: "LOC_TUTORIAL_OPEN_LEGACY_PROGRESS_SCREEN_KBM",
				touch: "LOC_TUTORIAL_OPEN_LEGACY_PROGRESS_SCREEN_TOUCH",
				actionName: "inline-toggle-radial-menu"
			}
		],
		option1: calloutClose,
	},
	inputContext: InputContext.World,
	highlights: [".ssb__element.tut-age .ssb-button__highlight"],
	completionCustomEvents: ["OnContextManagerOpen_screen-victory-progress"],
});
const scienceVictoryContent1: TutorialQuestContent = {
	title: "LOC_TUTORIAL_SCIENCE_QUEST_1_ACCEPTED_TITLE",
	advisor: {
		text: "LOC_TUTORIAL_SCIENCE_QUEST_1_ACCEPTED_ADVISOR_BODY",
	},
	body: {
		text: "LOC_TUTORIAL_SCIENCE_QUEST_1_ACCEPTED_BODY",
	}
}
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "science_victory_quest_1_accepted",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Science,
		...scienceVictoryContent1,
		option1: calloutBegin,
	},
	onCleanUp: (_item) => {
		QuestTracker.setQuestVictoryStateById("science_victory_quest_1_tracking", VictoryQuestState.QUEST_IN_PROGRESS)
	},
	onObsoleteCheck: (_item: TutorialItem) => {
		return QuestTracker.isQuestVictoryInProgress("science_victory_quest_1_tracking");
	},
	nextID: "legacy_quest_tracker",
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "science_victory_quest_1_tracking",
	quest: {
		title: Locale.compose("LOC_TUTORIAL_SCIENCE_QUEST_1_TRACKING_TITLE"),
		description: Locale.compose("LOC_TUTORIAL_SCIENCE_QUEST_1_TRACKING_BODY"),
		cancelable: true,
		victory: {
			type: AdvisorTypes.SCIENCE,
			order: 1,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: scienceVictoryContent1
		}
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["TechNodeCompleted"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			let playerTechs = player.Techs;
			if (playerTechs?.isNodeUnlocked("NODE_TECH_AQ_WRITING")) {
				return true;
			}
		}
		return false;
	},
});
const scienceVictoryContent2: TutorialQuestContent = {
	title: Locale.compose("LOC_TUTORIAL_SCIENCE_QUEST_2_TITLE"),
	advisor: {
		text: Locale.compose("LOC_TUTORIAL_SCIENCE_QUEST_2_ADVISOR_BODY"),
	},
	body: {
		text: Locale.compose("LOC_TUTORIAL_SCIENCE_QUEST_2_BODY"),
	}
}
// ------------------------------------------------------------------
// SCIENCE QUEST 2
TutorialManager.add({
	ID: "science_victory_quest_2_start",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Science,
		...scienceVictoryContent2,
		option1: {
			callback: () => {
				QuestTracker.setQuestVictoryStateById("science_victory_quest_2_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
			}, text: "LOC_TUTORIAL_CALLOUT_ACCEPT_QUEST", actionKey: "inline-accept", closes: true
		},
		option2: calloutDeclineQuest,
	},
	activationCustomEvents: [QuestCompletedEventName],
	onActivateCheck: (_item: TutorialItem) => {
		return TutorialSupport.canQuestActivate("science_victory_quest_1_tracking", "science_victory_quest_2_tracking");
	},
	onCleanUp: (_item) => {
		QuestTracker.setQuestVictoryStateById("science_victory_quest_2_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
	},
	onObsoleteCheck: (_item: TutorialItem) => {
		return QuestTracker.isQuestVictoryInProgress("science_victory_quest_2_tracking");
	},
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "science_victory_quest_2_tracking",
	quest: {
		title: Locale.compose("LOC_TUTORIAL_SCIENCE_QUEST_2_TRACKING_TITLE"),
		description: "LOC_TUTORIAL_SCIENCE_QUEST_2_TRACKING_BODY",
		victory: {
			type: AdvisorTypes.SCIENCE,
			order: 2,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: scienceVictoryContent2
		},
		getDescriptionLocParams: () => {
			let libraryIcon: string = "[icon:QUEST_ITEM_OPEN]";
			let writing2icon: string = "[icon:QUEST_ITEM_OPEN]";
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				const playerCities = player.Cities?.getCities();
				if (playerCities) {
					for (let i = 0; i < playerCities.length; ++i) {
						let city = playerCities[i];
						if (city) {
							if (city.Constructibles?.hasConstructible("BUILDING_LIBRARY", false)) {
								libraryIcon = "[icon:QUEST_ITEM_COMPLETED]";
							}
						}
					}
				}
				// We need to know if a player has the mastery unlocked regardless if it just happened or not
				// If there's an easier way to determine this let me know.
				const playerTechs = player.Techs;
				if (playerTechs) {
					const eTree = playerTechs.getTreeType();
					const treeObject = Game.ProgressionTrees.getTree(player.id, eTree);
					if (treeObject) {
						for (let i = 0; i < treeObject.nodes.length; ++i) {
							const node: ProgressionTreeNode = treeObject.nodes[i];
							const nodeInfo = GameInfo.ProgressionTreeNodes.lookup(node.nodeType);
							if (nodeInfo?.ProgressionTreeNodeType == "NODE_TECH_AQ_WRITING") {
								if (node.depthUnlocked == 2) {
									writing2icon = "[icon:QUEST_ITEM_COMPLETED]";
									break;
								}
							}
						}
					}
				}
			}
			return [libraryIcon, writing2icon];
		},
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["TechNodeCompleted", "ConstructibleBuildCompleted", "ConstructibleAddedToMap"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item: TutorialItem) => {
		const activationEventData = TutorialManager.activatingEvent;
		if (TutorialManager.activatingEventName == "ConstructibleBuildCompleted" || TutorialManager.activatingEventName == "ConstructibleAddedToMap" && activationEventData.constructible?.owner != GameContext.localPlayerID) {
			return false;
		}
		let libraryComplete: boolean = false;
		let writingIIComplete: boolean = false;
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			const playerCities = player.Cities?.getCities();
			if (playerCities) {
				//this needs to be a forloop since the actiating event could be TechNodeCompleted
				for (let i = 0; i < playerCities.length; ++i) {
					let city = playerCities[i];
					if (city) {
						if (city.Constructibles?.hasConstructible("BUILDING_LIBRARY", false)) {
							libraryComplete = true;
						}
					}
				}
			}
			// We need to know if a player has the mastery unlocked regardless if it just happened or not
			// If there's an easier way to determine this let me know.
			const playerTechs = player.Techs;
			if (playerTechs) {
				const eTree = playerTechs.getTreeType();
				const treeObject = Game.ProgressionTrees.getTree(player.id, eTree);
				if (treeObject) {
					for (let i = 0; i < treeObject.nodes.length; ++i) {
						const node: ProgressionTreeNode = treeObject.nodes[i];
						const nodeInfo = GameInfo.ProgressionTreeNodes.lookup(node.nodeType);
						if (nodeInfo?.ProgressionTreeNodeType == "NODE_TECH_AQ_WRITING") {
							if (node.depthUnlocked == 2) {
								writingIIComplete = true;
								break;
							}
						}
					}
				}
			}
		}
		if (libraryComplete && writingIIComplete) {
			return true;
		}
		return false;
	},
});
const scienceVictoryContent3: TutorialQuestContent = {
	title: Locale.compose("LOC_TUTORIAL_SCIENCE_QUEST_3_TITLE"),
	advisor: {
		text: "LOC_TUTORIAL_SCIENCE_QUEST_3_ADVISOR_BODY",
	},
	body: {
		text: "LOC_TUTORIAL_SCIENCE_QUEST_3_BODY",
		getLocParams: (_item: TutorialItem) => {
			let sCivAdj: string = "null";
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				sCivAdj = player.civilizationAdjective;
			}
			return [sCivAdj];
		}
	}
}
// ------------------------------------------------------------------
// SCIENCE QUEST 3
TutorialManager.add({
	ID: "science_victory_quest_3_start",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Science,
		...scienceVictoryContent3,
		option1: {
			callback: () => {
				QuestTracker.setQuestVictoryStateById("science_victory_quest_3_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
			}, text: "LOC_TUTORIAL_CALLOUT_ACCEPT_QUEST", actionKey: "inline-accept", closes: true
		},
		option2: calloutDeclineQuest,
	},
	activationCustomEvents: [QuestCompletedEventName],
	onActivateCheck: (_item: TutorialItem) => {
		return TutorialSupport.canQuestActivate("science_victory_quest_2_tracking", "science_victory_quest_3_tracking");
	},
	onCleanUp: (_item) => {
		QuestTracker.setQuestVictoryStateById("science_victory_quest_3_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
	},
	onObsoleteCheck: (_item: TutorialItem) => {
		return QuestTracker.isQuestVictoryInProgress("science_victory_quest_3_tracking");
	}
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "science_victory_quest_3_tracking",
	quest: {
		title: Locale.compose("LOC_TUTORIAL_SCIENCE_QUEST_3_TRACKING_TITLE"),
		description: "LOC_TUTORIAL_SCIENCE_QUEST_3_TRACKING_BODY",
		victory: {
			type: AdvisorTypes.SCIENCE,
			order: 3,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: scienceVictoryContent3
		},
		getDescriptionLocParams: () => {
			let mathematicsComplete: string = "[icon:QUEST_ITEM_OPEN]";
			let academyComplete: string = "[icon:QUEST_ITEM_OPEN]";
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				let playerTechs = player.Techs;
				if (playerTechs?.isNodeUnlocked("NODE_TECH_AQ_MATHEMATICS")) {
					mathematicsComplete = "[icon:QUEST_ITEM_COMPLETED]";
				}
			}
			return [mathematicsComplete, academyComplete];
		},
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["TechNodeCompleted", "ConstructibleBuildCompleted", "ConstructibleAddedToMap"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item: TutorialItem) => {
		const activationEventData = (TutorialManager.activatingEvent as ConstructibleBuildCompleted_EventData);
		if (activationEventData.constructible?.owner != GameContext.localPlayerID) {
			return false;
		}
		let academyDef = GameInfo.Constructibles.lookup("BUILDING_ACADEMY");
		let thisBuildingDef = GameInfo.Constructibles.lookup(activationEventData.constructibleType);
		if (thisBuildingDef?.ConstructibleType == academyDef?.ConstructibleType && activationEventData.percentComplete == 100) {
			return true;
		}
		return false;
	},
});
const scienceVictoryContent4: TutorialQuestContent = {
	title: Locale.compose("LOC_TUTORIAL_SCIENCE_QUEST_4_TITLE"),
	advisor: {
		text: "LOC_TUTORIAL_SCIENCE_QUEST_4_ADVISOR_BODY",
		getLocParams: (_item: TutorialItem) => {
			let sCivAdj: string = "null";
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				sCivAdj = player.civilizationAdjective;
			}
			return [sCivAdj];
		}
	},
	body: {
		text: "LOC_TUTORIAL_SCIENCE_QUEST_4_BODY",
		getLocParams: (_item: TutorialItem) => {
			let sCivAdj: string = "null";
			let iCodexGoal = SCIENCE_QUEST_4_CODEX_GOAL;
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				sCivAdj = player.civilizationAdjective;
			}
			return [sCivAdj, iCodexGoal];
		}
	}
}
// ------------------------------------------------------------------
// SCIENCE QUEST 4
const SCIENCE_QUEST_4_CODEX_GOAL = 3;
TutorialManager.add({
	ID: "science_victory_quest_4_start",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Science,
		...scienceVictoryContent4,
		option1: {
			callback: () => {
				QuestTracker.setQuestVictoryStateById("science_victory_quest_4_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
			}, text: "LOC_TUTORIAL_CALLOUT_ACCEPT_QUEST", actionKey: "inline-accept", closes: true
		},
		option2: calloutDeclineQuest,
	},
	activationCustomEvents: [QuestCompletedEventName],
	onActivateCheck: (_item: TutorialItem) => {
		return TutorialSupport.canQuestActivate("science_victory_quest_3_tracking", "science_victory_quest_4_tracking");
	},
	onObsoleteCheck: (_item: TutorialItem) => {
		return QuestTracker.isQuestVictoryInProgress("science_victory_quest_4_tracking");
	}
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "science_victory_quest_4_tracking",
	quest: {
		title: Locale.compose("LOC_TUTORIAL_SCIENCE_QUEST_4_TRACKING_TITLE"),
		description: "LOC_TUTORIAL_SCIENCE_QUEST_4_TRACKING_BODY",
		cancelable: true,
		victory: {
			type: AdvisorTypes.SCIENCE,
			order: 4,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: scienceVictoryContent4
		},
		getDescriptionLocParams: () => {
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			let iCodexCurrent = 0;
			let iCodexGoal = SCIENCE_QUEST_4_CODEX_GOAL;
			if (player) {
				const score = player.LegacyPaths?.getScore("LEGACY_PATH_ANTIQUITY_SCIENCE")
				if (score) {
					iCodexCurrent = score;
				}
			}
			return [iCodexCurrent, iCodexGoal];
		},
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["GreatWorkMoved", "GreatWorkCreated"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		let questMet = false;
		let iCodexCurrent = 0;
		let iCodexGoal = SCIENCE_QUEST_4_CODEX_GOAL;
		if (player) {
			const score = player.LegacyPaths?.getScore("LEGACY_PATH_ANTIQUITY_SCIENCE")
			if (score) {
				iCodexCurrent = score;
			}
		}
		if (iCodexCurrent >= iCodexGoal) {
			questMet = true;
		}
		return questMet;
	},
});
const scienceVictoryContent5: TutorialQuestContent = {
	title: Locale.compose("LOC_TUTORIAL_SCIENCE_QUEST_5_TITLE"),
	advisor: {
		text: "LOC_TUTORIAL_SCIENCE_QUEST_5_ADVISOR_BODY",
		getLocParams: (_item: TutorialItem) => {
			let sCivAdj: string = "null";
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				sCivAdj = player.civilizationAdjective;
			}
			return [sCivAdj];
		}
	},
	body: {
		text: "LOC_TUTORIAL_SCIENCE_QUEST_5_BODY",
		getLocParams: (_item: TutorialItem) => {
			let sCivAdj: string = "null";
			let iCodexGoal = SCIENCE_QUEST_5_CODEX_GOAL;
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				sCivAdj = player.civilizationAdjective;
			}
			return [sCivAdj, iCodexGoal];
		}
	}
}
// ------------------------------------------------------------------
// SCIENCE QUEST 5
const SCIENCE_QUEST_5_CODEX_GOAL = 6;
TutorialManager.add({
	ID: "science_victory_quest_5_start",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Science,
		...scienceVictoryContent5,
		option1: {
			callback: () => {
				QuestTracker.setQuestVictoryStateById("science_victory_quest_5_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
			}, text: "LOC_TUTORIAL_CALLOUT_ACCEPT_QUEST", actionKey: "inline-accept", closes: true
		},
		option2: calloutDeclineQuest,
	},
	activationCustomEvents: [QuestCompletedEventName],
	onActivateCheck: (_item: TutorialItem) => {
		return TutorialSupport.canQuestActivate("science_victory_quest_4_tracking", "science_victory_quest_5_tracking");
	},
	onObsoleteCheck: (_item: TutorialItem) => {
		return QuestTracker.isQuestVictoryInProgress("science_victory_quest_5_tracking");
	}
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "science_victory_quest_5_tracking",
	quest: {
		title: Locale.compose("LOC_TUTORIAL_SCIENCE_QUEST_5_TRACKING_TITLE"),
		description: "LOC_TUTORIAL_SCIENCE_QUEST_5_TRACKING_BODY",
		cancelable: true,
		victory: {
			type: AdvisorTypes.SCIENCE,
			order: 5,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: scienceVictoryContent5
		},
		getDescriptionLocParams: () => {
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			let iCodexCurrent = 0;
			let iCodexGoal = SCIENCE_QUEST_5_CODEX_GOAL;
			if (player) {
				const score = player.LegacyPaths?.getScore("LEGACY_PATH_ANTIQUITY_SCIENCE")
				if (score) {
					iCodexCurrent = score;
				}
			}
			return [iCodexCurrent, iCodexGoal];
		},
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["GreatWorkMoved", "GreatWorkCreated"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		let questMet = false;
		let iCodexCurrent = 0;
		let iCodexGoal = SCIENCE_QUEST_5_CODEX_GOAL;
		if (player) {
			const score = player.LegacyPaths?.getScore("LEGACY_PATH_ANTIQUITY_SCIENCE")
			if (score) {
				iCodexCurrent = score;
			}
		}
		if (iCodexCurrent >= iCodexGoal) {
			questMet = true;
		}
		return questMet;
	},
});
const scienceVictoryContent6: TutorialQuestContent = {
	title: Locale.compose("LOC_TUTORIAL_SCIENCE_QUEST_6_TITLE"),
	advisor: {
		text: "LOC_TUTORIAL_SCIENCE_QUEST_6_ADVISOR_BODY",
		getLocParams: (_item: TutorialItem) => {
			let sCivAdj: string = "null";
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				sCivAdj = player.civilizationAdjective;
			}
			return [sCivAdj];
		}
	},
	body: {
		text: "LOC_TUTORIAL_SCIENCE_QUEST_6_BODY",
		getLocParams: (_item: TutorialItem) => {
			let sCivAdj: string = "null";
			let iCodexGoal = SCIENCE_QUEST_6_CODEX_GOAL;
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				sCivAdj = player.civilizationAdjective;
			}
			return [sCivAdj, iCodexGoal];
		}
	}
}
// ------------------------------------------------------------------
// SCIENCE QUEST 6
const SCIENCE_QUEST_6_CODEX_GOAL = 10;
TutorialManager.add({
	ID: "science_victory_quest_6_start",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Science,
		...scienceVictoryContent6,
		option1: {
			callback: () => {
				QuestTracker.setQuestVictoryStateById("science_victory_quest_6_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
			}, text: "LOC_TUTORIAL_CALLOUT_ACCEPT_QUEST", actionKey: "inline-accept", closes: true
		},
		option2: calloutDeclineQuest,
	},
	activationCustomEvents: [QuestCompletedEventName],
	onActivateCheck: (_item: TutorialItem) => {
		return TutorialSupport.canQuestActivate("science_victory_quest_5_tracking", "science_victory_quest_6_tracking");
	},
	onObsoleteCheck: (_item: TutorialItem) => {
		return QuestTracker.isQuestVictoryInProgress("science_victory_quest_6_tracking");
	}
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "science_victory_quest_6_tracking",
	quest: {
		title: Locale.compose("LOC_TUTORIAL_SCIENCE_QUEST_6_TRACKING_TITLE"),
		description: "LOC_TUTORIAL_SCIENCE_QUEST_6_TRACKING_BODY",
		cancelable: true,
		victory: {
			type: AdvisorTypes.SCIENCE,
			order: 6,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: scienceVictoryContent6
		},
		getDescriptionLocParams: () => {
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			let iCodexCurrent = 0;
			let iCodexGoal = SCIENCE_QUEST_6_CODEX_GOAL;
			if (player) {
				const score = player.LegacyPaths?.getScore("LEGACY_PATH_ANTIQUITY_SCIENCE")
				if (score) {
					iCodexCurrent = score;
				}
			}
			return [iCodexCurrent, iCodexGoal];
		},
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["GreatWorkMoved", "GreatWorkCreated"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		let questMet = false;
		let iCodexCurrent = 0;
		let iCodexGoal = SCIENCE_QUEST_6_CODEX_GOAL;
		if (player) {
			const score = player.LegacyPaths?.getScore("LEGACY_PATH_ANTIQUITY_SCIENCE")
			if (score) {
				iCodexCurrent = score;
			}
		}
		if (iCodexCurrent >= iCodexGoal) {
			questMet = true;
		}
		return questMet;
	},
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "science_victory_quest_line_completed",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: "LOC_TUTORIAL_SCIENCE_QUEST_LINE_COMPLETED_TITLE",
		advisorType: TutorialAdvisorType.Science,
		advisor: {
			text: "LOC_TUTORIAL_SCIENCE_QUEST_LINE_COMPLETED_ADVISOR_BODY",
			getLocParams: (_item: TutorialItem) => {
				let civAdj: string = "null";
				const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
				if (player) {
					civAdj = player.civilizationAdjective;
				}
				return [civAdj];
			},
		},
		body: {
			text: "LOC_TUTORIAL_SCIENCE_QUEST_LINE_COMPLETED_BODY"
		},
		option1: calloutClose,
		option2: {
			callback: () => {
				ContextManager.push("screen-victory-progress", { singleton: true, createMouseGuard: true })
			},
			text: "LOC_TUTORIAL_CALLOUT_VICTORIES",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationCustomEvents: [QuestCompletedEventName],
	onActivateCheck: (_item: TutorialItem) => {
		// Make sure the quest before this quest is completed
		return QuestTracker.isQuestVictoryCompleted("science_victory_quest_6_tracking");
	}
});

const cultureVictoryContent1: TutorialQuestContent = {
	title: "LOC_TUTORIAL_CULTURE_QUEST_1_ACCEPTED_TITLE",
	advisor: {
		text: "LOC_TUTORIAL_CULTURE_QUEST_1_ACCEPTED_ADVISOR_BODY",
	},
	body: {
		text: "LOC_TUTORIAL_CULTURE_QUEST_1_ACCEPTED_BODY",
	}
}

// ------------------------------------------------------------------
// VICTORY QUEST LINE - CULTURE
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "culture_victory_quest_1_accepted",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Culture,
		...cultureVictoryContent1,
		option1: calloutBegin,
	},
	onCleanUp: (_item) => {
		QuestTracker.setQuestVictoryStateById("culture_victory_quest_1_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
	},
	onObsoleteCheck: (_item: TutorialItem) => {
		return QuestTracker.isQuestVictoryInProgress("culture_victory_quest_1_tracking");
	},
	nextID: "legacy_quest_tracker",
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "culture_victory_quest_1_tracking",
	quest: {
		title: Locale.compose("LOC_TUTORIAL_CULTURE_QUEST_1_TRACKING_TITLE"),
		description: "LOC_TUTORIAL_CULTURE_QUEST_1_TRACKING_BODY",
		victory: {
			type: AdvisorTypes.CULTURE,
			order: 1,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: cultureVictoryContent1
		},
		getDescriptionLocParams: () => {
			let sWonderComplete: string = "[icon:QUEST_ITEM_OPEN]";
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				const score = player.LegacyPaths?.getScore("LEGACY_PATH_ANTIQUITY_CULTURE")
				if (score && score >= 1) {
					sWonderComplete = "[icon:QUEST_ITEM_COMPLETED]"
				}
			}
			return [sWonderComplete];
		},
		cancelable: true,
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["WonderCompleted"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		let questMet = false;
		let currentVictoryPoints = 0;
		let targetVictoryPoints = 1;
		if (player) {
			const score = player.LegacyPaths?.getScore("LEGACY_PATH_ANTIQUITY_CULTURE")
			if (score) {
				currentVictoryPoints = score;
			}
		}
		if (currentVictoryPoints >= targetVictoryPoints) {
			questMet = true;
		}
		return questMet;
	}
});
const cultureVictoryContent2: TutorialQuestContent = {
	title: "LOC_TUTORIAL_CULTURE_QUEST_2_TITLE",
	advisor: {
		text: "LOC_TUTORIAL_CULTURE_QUEST_2_ADVISOR_BODY",
	},
	body: {
		text: "LOC_TUTORIAL_CULTURE_QUEST_2_BODY",
		getLocParams: (_item: TutorialItem) => {
			let sCivAdj: string = "null";
			let iWonderGoal = CULTURE_QUEST_2_WONDER_GOAL;
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				sCivAdj = player.civilizationAdjective;
			}
			return [sCivAdj, iWonderGoal];
		}
	}
}
// ------------------------------------------------------------------
// CULTURE QUEST 2
const CULTURE_QUEST_2_WONDER_GOAL = 2;
TutorialManager.add({
	ID: "culture_victory_quest_2_start",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Culture,
		...cultureVictoryContent2,
		option1: {
			callback: () => {
				QuestTracker.setQuestVictoryStateById("culture_victory_quest_2_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
			}, text: "LOC_TUTORIAL_CALLOUT_ACCEPT_QUEST", actionKey: "inline-accept", closes: true
		},
		option2: calloutDeclineQuest,
	},
	activationCustomEvents: [QuestCompletedEventName],
	onActivateCheck: (_item: TutorialItem) => {
		return TutorialSupport.canQuestActivate("culture_victory_quest_1_tracking", "culture_victory_quest_2_tracking");
	},
	onObsoleteCheck: (_item: TutorialItem) => {
		return QuestTracker.isQuestVictoryInProgress("culture_victory_quest_2_tracking");
	}
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "culture_victory_quest_2_tracking",
	quest: {
		title: Locale.compose("LOC_TUTORIAL_CULTURE_QUEST_2_TRACKING_TITLE"),
		description: "LOC_TUTORIAL_CULTURE_QUEST_2_TRACKING_BODY",
		victory: {
			type: AdvisorTypes.CULTURE,
			order: 2,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: cultureVictoryContent2
		},
		getDescriptionLocParams: () => {
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			let iWondersCurrent = 0;
			let iWondersGoal = CULTURE_QUEST_2_WONDER_GOAL;
			if (player) {
				const score = player.LegacyPaths?.getScore("LEGACY_PATH_ANTIQUITY_CULTURE")
				if (score) {
					iWondersCurrent = score;
				}
			}
			return [iWondersCurrent, iWondersGoal];
		},
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["WonderCompleted"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		let questMet = false;
		let currentVictoryPoints = 0;
		let targetVictoryPoints = CULTURE_QUEST_2_WONDER_GOAL;
		if (player) {
			const score = player.LegacyPaths?.getScore("LEGACY_PATH_ANTIQUITY_CULTURE")
			if (score) {
				currentVictoryPoints = score;
			}
		}
		if (currentVictoryPoints >= targetVictoryPoints) {
			questMet = true;
		}
		return questMet;
	},
});
const cultureVictoryContent3: TutorialQuestContent = {
	title: Locale.compose("LOC_TUTORIAL_CULTURE_QUEST_3_TITLE"),
	advisor: {
		text: "LOC_TUTORIAL_CULTURE_QUEST_3_ADVISOR_BODY",
		getLocParams: (_item: TutorialItem) => {
			let sCivAdj: string = "null";
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				sCivAdj = player.civilizationAdjective;
			}
			return [sCivAdj];
		}
	},
	body: {
		text: "LOC_TUTORIAL_CULTURE_QUEST_3_BODY",
		getLocParams: (_item: TutorialItem) => {
			let sCivAdj: string = "null";
			let iWondersGoal = CULTURE_QUEST_3_WONDER_GOAL;
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				sCivAdj = player.civilizationAdjective;
			}
			return [sCivAdj, iWondersGoal];
		}
	}
}
// ------------------------------------------------------------------
// CULTURE QUEST 3
const CULTURE_QUEST_3_WONDER_GOAL = 4;
TutorialManager.add({
	ID: "culture_victory_quest_3_start",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Culture,
		...cultureVictoryContent3,
		option1: {
			callback: () => {
				QuestTracker.setQuestVictoryStateById("culture_victory_quest_3_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
			}, text: "LOC_TUTORIAL_CALLOUT_ACCEPT_QUEST", actionKey: "inline-accept", closes: true
		},
		option2: calloutDeclineQuest,
	},
	activationCustomEvents: [QuestCompletedEventName],
	onActivateCheck: (_item: TutorialItem) => {
		return TutorialSupport.canQuestActivate("culture_victory_quest_2_tracking", "culture_victory_quest_3_tracking");
	},
	onObsoleteCheck: (_item: TutorialItem) => {
		return QuestTracker.isQuestVictoryInProgress("culture_victory_quest_3_tracking");
	}
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "culture_victory_quest_3_tracking",
	quest: {
		title: Locale.compose("LOC_TUTORIAL_CULTURE_QUEST_3_TRACKING_TITLE"),
		description: "LOC_TUTORIAL_CULTURE_QUEST_3_TRACKING_BODY",
		cancelable: true,
		victory: {
			type: AdvisorTypes.CULTURE,
			order: 3,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: cultureVictoryContent3
		},
		getDescriptionLocParams: () => {
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			let iWondersCurrent = 0;
			let iWondersGoal = CULTURE_QUEST_3_WONDER_GOAL;
			if (player) {
				const score = player.LegacyPaths?.getScore("LEGACY_PATH_ANTIQUITY_CULTURE")
				if (score) {
					iWondersCurrent = score;
				}
			}
			return [iWondersCurrent, iWondersGoal];
		},
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["WonderCompleted"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		let questMet = false;
		let currentVictoryPoints = 0;
		let targetVictoryPoints = CULTURE_QUEST_3_WONDER_GOAL;
		if (player) {
			const score = player.LegacyPaths?.getScore("LEGACY_PATH_ANTIQUITY_CULTURE")
			if (score) {
				currentVictoryPoints = score;
			}
		}
		if (currentVictoryPoints >= targetVictoryPoints) {
			questMet = true;
		}
		return questMet;
	},
});
const cultureVictoryContent4: TutorialQuestContent = {
	title: Locale.compose("LOC_TUTORIAL_CULTURE_QUEST_4_TITLE"),
	advisor: {
		text: "LOC_TUTORIAL_CULTURE_QUEST_4_ADVISOR_BODY",
		getLocParams: (_item: TutorialItem) => {
			let sCivAdj: string = "null";
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				sCivAdj = player.civilizationAdjective;
			}
			return [sCivAdj];
		}
	},
	body: {
		text: "LOC_TUTORIAL_CULTURE_QUEST_4_BODY",
		getLocParams: (_item: TutorialItem) => {
			let sCivAdj: string = "null";
			let iWondersGoal = CULTURE_QUEST_4_WONDER_GOAL;
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				sCivAdj = player.civilizationAdjective;
			}
			return [sCivAdj, iWondersGoal];
		}
	}
}
// ------------------------------------------------------------------
// CULTURE QUEST 4
const CULTURE_QUEST_4_WONDER_GOAL = 7;
TutorialManager.add({
	ID: "culture_victory_quest_4_start",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Culture,
		...cultureVictoryContent4,
		option1: {
			callback: () => {
				QuestTracker.setQuestVictoryStateById("culture_victory_quest_4_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
			}, text: "LOC_TUTORIAL_CALLOUT_ACCEPT_QUEST", actionKey: "inline-accept", closes: true
		},
		option2: calloutDeclineQuest,
	},
	activationCustomEvents: [QuestCompletedEventName],
	onActivateCheck: (_item: TutorialItem) => {
		return TutorialSupport.canQuestActivate("culture_victory_quest_3_tracking", "culture_victory_quest_4_tracking");
	},
	onObsoleteCheck: (_item: TutorialItem) => {
		return QuestTracker.isQuestVictoryInProgress("culture_victory_quest_4_tracking");
	}
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "culture_victory_quest_4_tracking",
	quest: {
		title: Locale.compose("LOC_TUTORIAL_CULTURE_QUEST_4_TRACKING_TITLE"),
		description: "LOC_TUTORIAL_CULTURE_QUEST_4_TRACKING_BODY",
		cancelable: true,
		victory: {
			type: AdvisorTypes.CULTURE,
			order: 4,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: cultureVictoryContent4
		},
		getDescriptionLocParams: () => {
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			let iWondersCurrent = 0;
			let iWondersGoal = CULTURE_QUEST_4_WONDER_GOAL;
			if (player) {
				const score = player.LegacyPaths?.getScore("LEGACY_PATH_ANTIQUITY_CULTURE")
				if (score) {
					iWondersCurrent = score;
				}
			}
			return [iWondersCurrent, iWondersGoal];
		},
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["WonderCompleted"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		let questMet = false;
		let currentVictoryPoints = 0;
		let targetVictoryPoints = CULTURE_QUEST_4_WONDER_GOAL;
		if (player) {
			const score = player.LegacyPaths?.getScore("LEGACY_PATH_ANTIQUITY_CULTURE")
			if (score) {
				currentVictoryPoints = score;
			}
		}
		if (currentVictoryPoints >= targetVictoryPoints) {
			questMet = true;
		}
		return questMet;
	},
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "culture_victory_quest_line_completed",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Culture,
		title: "LOC_TUTORIAL_CULTURE_QUEST_LINE_COMPLETED_TITLE",
		advisor: {
			text: "LOC_TUTORIAL_CULTURE_QUEST_LINE_COMPLETED_ADVISOR_BODY",
			getLocParams: (_item: TutorialItem) => {
				let civAdj: string = "null";
				const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
				if (player) {
					civAdj = player.civilizationAdjective;
				}
				return [civAdj];
			},
		},
		body: {
			text: "LOC_TUTORIAL_CULTURE_QUEST_LINE_COMPLETED_BODY",
		},
		option1: calloutClose,
		option2: {
			callback: () => {
				ContextManager.push("screen-victory-progress", { singleton: true, createMouseGuard: true })
			},
			text: "LOC_TUTORIAL_CALLOUT_VICTORIES",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationCustomEvents: [QuestCompletedEventName],
	onActivateCheck: (_item: TutorialItem) => {
		// Make sure the quest before this quest is completed
		return QuestTracker.isQuestVictoryCompleted("culture_victory_quest_4_tracking");
	}
});

const militaryVictoryContent1: TutorialQuestContent = {
	title: "LOC_TUTORIAL_MILITARY_QUEST_LINE_HINT_A_TITLE",
	advisor: {
		text: "LOC_TUTORIAL_MILITARY_QUEST_LINE_HINT_A_ADVISOR_BODY"
	},
	body: {
		text: "LOC_TUTORIAL_MILITARY_QUEST_LINE_HINT_A_BODY",
	}
}

// ------------------------------------------------------------------
// VICTORY QUEST LINE - MILITARY
// ------------------------------------------------------------------
// A 'hint' tutorial quest for the military victory quest line guiding the player toward the Discipline civic
TutorialManager.add({
	ID: "military_victory_quest_line_start_hint_A",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Military,
		...militaryVictoryContent1,
		option1: calloutContinue,
	},
	// This should trigger when the player unlocks the ability to train a Settler which is currently unlocked through population
	//DEACTIVATED DUE TO NEW ADVISOR FLOW
	/*activationEngineEvents: ["CityPopulationChanged"],
	onActivateCheck: (_item: TutorialItem) => {
		let bCanTrain: boolean = false;
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			let playerCities: City[] | undefined = player.Cities?.getCities();
			if (playerCities) {
				for (let i = 0; i < playerCities.length; ++i) {
					let city: City = playerCities[i];
					if (city != null) {
						for (let i = 0; i < GameInfo.Units.length; ++i) {
							if (GameInfo.Units[i].FoundCity == true) {
								let result: OperationResult | null = null;
								result = Game.CityOperations.canStart(city.id, CityOperationTypes.BUILD, { UnitType: i }, false);
								if (result.Success) {
									bCanTrain = true;
									break;
								}
							}
						}
					}
				}
			}
			if (bCanTrain) {
				// make sure discipline isn't already being researched or is already completed
				if (player.Culture?.isNodeUnlocked("NODE_CIVIC_AQ_MAIN_DISCIPLINE")) {
					return false;
				}
				const disciplineHash = Database.makeHash("NODE_CIVIC_AQ_MAIN_DISCIPLINE");
				const nodeId: ProgressionTreeNodeType | undefined = player.Culture?.getResearching().type;
				if (nodeId && nodeId == disciplineHash) {
					return false;
				}
			}
		};
		return bCanTrain;
	}*/
	onCleanUp: (_item) => {
		QuestTracker.setQuestVictoryStateById("military_victory_quest_A_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
	},
	onObsoleteCheck: (_item: TutorialItem) => {
		return QuestTracker.isQuestVictoryInProgress("military_victory_quest_A_tracking");
	},
	nextID: "legacy_quest_tracker",
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "military_victory_quest_A_tracking",
	quest: {
		title: Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_LINE_HINT_A_TRACKING_TITLE"),
		description: Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_LINE_HINT_A_TRACKING_BODY"),
		cancelable: true,
		victory: {
			type: AdvisorTypes.MILITARY,
			order: 1,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: militaryVictoryContent1
		},
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["CultureNodeCompleted"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			let playerCulture = player.Culture;
			if (playerCulture?.isNodeUnlocked("NODE_CIVIC_AQ_MAIN_DISCIPLINE")) {
				return true;
			}
		}
		return false;
	},
});

const militaryVictoryContent2: TutorialQuestContent = {
	title: Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_1_TITLE"),
	advisor: {
		text: "LOC_TUTORIAL_MILITARY_QUEST_1_ADVISOR_BODY",
		getLocParams: (_item: TutorialItem) => {
			let commanderName: string = "null";
			let commanderIcon: string = "null";
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player && player.Units) {
				const armyCommander = player.Units.getBuildUnit("UNIT_ARMY_COMMANDER");
				const commanderDefinition: UnitDefinition | null = GameInfo.Units.lookup(armyCommander);
				if (commanderDefinition) {
					commanderIcon = "[icon:" + commanderDefinition.UnitType + "]";
					commanderName = commanderDefinition.Name;
				}
			}
			return [commanderIcon, commanderName];
		},
	},
	body: {
		text: "LOC_TUTORIAL_MILITARY_QUEST_1_BODY",
		getLocParams: (_item: TutorialItem) => {
			let commanderName: string = "null";
			let commanderIcon: string = "null";
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player && player.Units) {
				const armyCommander = player.Units.getBuildUnit("UNIT_ARMY_COMMANDER");
				const commanderDefinition: UnitDefinition | null = GameInfo.Units.lookup(armyCommander);
				if (commanderDefinition) {
					commanderIcon = "[icon:" + commanderDefinition.UnitType + "]";
					commanderName = commanderDefinition.Name;
				}
			}
			return [commanderIcon, commanderName];
		}
	}
}
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "military_victory_quest_1",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Military,
		...militaryVictoryContent2,
		option1: calloutBegin,
	},
	//DEACTIVATED DUE TO NEW ADVISOR FLOW
	/*activationEngineEvents: ["UnitAddedToMap"],
	onActivateCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(TutorialManager.playerId);
		if (player && player.Units) {
			const unit: Unit | null = TutorialSupport.getUnitFromEvent("isUnitOfType");
			if (unit && unit.type != UnitType.NO_UNIT) {
				const armyCommander = player.Units.getBuildUnit("UNIT_ARMY_COMMANDER");
				const fleetCommander = player.Units.getBuildUnit("UNIT_FLEET_COMMANDER");
				if (armyCommander == unit.type || fleetCommander == unit.type) {
					return true;
				}
			}
		}
		return false;
	},*/
	activationCustomEvents: [QuestCompletedEventName],
	onActivateCheck: (_item: TutorialItem) => {
		return TutorialSupport.canQuestActivate("military_victory_quest_A_tracking", "military_victory_quest_1_tracking");
	},
	onCleanUp: (_item) => {
		QuestTracker.setQuestVictoryStateById("military_victory_quest_1_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
	},
	onObsoleteCheck: (_item: TutorialItem) => {
		return QuestTracker.isQuestVictoryInProgress("military_victory_quest_1_tracking");
	},

});
// ------------------------------------------------------------------
const TARGET_NUM_UNITS_IN_ARMY: number = 4;
TutorialManager.add({
	ID: "military_victory_quest_1_tracking",
	quest: {
		title: Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_1_TRACKING_TITLE"),
		description: "LOC_TUTORIAL_MILITARY_QUEST_1_TRACKING_BODY",
		victory: {
			type: AdvisorTypes.MILITARY,
			order: 2,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: militaryVictoryContent2
		},
		getDescriptionLocParams: () => {
			let numberTrained: LocalizedTextArgument = 0;
			let numberPacked: LocalizedTextArgument = 0;
			let trainingCompleteIcon: string = "[icon:QUEST_ITEM_OPEN]";
			let armyCompleteIcon: string = "[icon:QUEST_ITEM_OPEN]";
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player && player.Units) {
				const unitList: Unit[] | null = player.Units.getUnits();
				if (unitList != null) {
					let numCombatUnits: number = 0;
					let maxArmyCount: number = 0;
					for (let i = 0; i < unitList.length; ++i) {
						let unit: Unit = unitList[i];
						if (unit.Combat?.canAttack) {
							numCombatUnits++;
						}
						const army: Army | null = Armies.get(unit.armyId);
						if (army) {
							if (army.unitCount > maxArmyCount) {
								maxArmyCount = army.unitCount;
							}
						}
					}
					numberTrained = numCombatUnits;
					if (numCombatUnits >= TARGET_NUM_UNITS_IN_ARMY) {
						trainingCompleteIcon = "[icon:QUEST_ITEM_COMPLETED]";
					}
					numberPacked = maxArmyCount;
				}
			}
			return [numberTrained, TARGET_NUM_UNITS_IN_ARMY, trainingCompleteIcon, numberPacked, armyCompleteIcon];
		},
		cancelable: true,
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["UnitAddedToArmy", "UnitRemovedFromArmy"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player && player.Units) {
			const unitList: Unit[] | null = player.Units.getUnits();
			if (unitList != null) {
				for (let i = 0; i < unitList.length; ++i) {
					const army: Army | null = Armies.get(unitList[i].armyId);
					if (army) {
						let unitCount: number = army.unitCount;
						if (unitCount >= TARGET_NUM_UNITS_IN_ARMY) {
							return true;
						}
					}
				}
			}
		}
		return false;
	},
});
const militaryVictoryContent3: TutorialQuestContent = {
	title: "LOC_TUTORIAL_MILITARY_QUEST_2_TITLE",
	advisor: {
		text: "LOC_TUTORIAL_MILITARY_QUEST_2_ADVISOR_BODY"
	},
	body: {
		text: "LOC_TUTORIAL_MILITARY_QUEST_2_BODY"
	}
}
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "military_victory_quest_2",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Military,
		...militaryVictoryContent3,
		option1: {
			callback: () => {
				QuestTracker.setQuestVictoryStateById("military_victory_quest_2_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
			},
			text: "LOC_TUTORIAL_CALLOUT_ACCEPT_QUEST",
			actionKey: "inline-accept",
			closes: true,
		},
		option2: calloutDeclineQuest,
	},
	activationCustomEvents: [QuestCompletedEventName],
	onActivateCheck: (_item: TutorialItem) => {
		return TutorialSupport.canQuestActivate("military_victory_quest_1_tracking", "military_victory_quest_2_tracking");
	},
	onObsoleteCheck: (_item: TutorialItem) => {
		return QuestTracker.isQuestVictoryInProgress("military_victory_quest_2_tracking");
	}
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "military_victory_quest_2_tracking",
	quest: {
		title: Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_2_TRACKING_TITLE"),
		description: "LOC_TUTORIAL_MILITARY_QUEST_2_TRACKING_BODY",
		victory: {
			type: AdvisorTypes.MILITARY,
			order: 3,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: militaryVictoryContent3
		},
		getDescriptionLocParams: () => {
			let siegeTrained: LocalizedTextArgument = 0;
			let siegeTarget: LocalizedTextArgument = 1;
			let settlementTaken: LocalizedTextArgument = 0;
			let settlementTarget: LocalizedTextArgument = 1;
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player && player.Units) {
				const unitList: Unit[] | null = player.Units.getUnits();
				if (unitList != null) {
					let numSiegeUnits: number = 0;
					for (let i = 0; i < unitList.length; ++i) {
						if (Units.hasTag(unitList[i].id, "UNIT_CLASS_SIEGE")) {
							numSiegeUnits++;
						}
					}
					siegeTrained = numSiegeUnits;
					let playerCities: City[] | undefined = player.Cities?.getCities();
					if (playerCities) {
						settlementTaken = 0;
						for (let i = 0; i < playerCities.length; ++i) {
							let city: City = playerCities[i];
							if (city != null) {
								if (city.originalOwner != player.id) {
									settlementTaken++;
								}
							}
						}
					}
				}
			}
			return [siegeTrained, siegeTarget, settlementTaken, settlementTarget];
		},
		cancelable: true,
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["UnitAddedToMap", "CityTransfered"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(TutorialManager.playerId);
		if (player) {
			let eventInvolvesPlayer = false; //this is to prevent all these checks from running every event.
			if (TutorialManager.activatingEventName == "UnitAddedToMap") {
				let activationEventData = TutorialManager.activatingEvent as UnitAddedToMap_EventData;
				if (activationEventData.unit.owner == player.id) {
					eventInvolvesPlayer = true;
				}
			}
			else {
				let activationEventData = TutorialManager.activatingEvent as CityTransfered_EventData;
				if (activationEventData.cityID.owner == player.id) {
					eventInvolvesPlayer = true;
				}
			}
			if (eventInvolvesPlayer) {
				let bSiegeTrained: boolean = false;
				if (player.Units) {
					const unitList: Unit[] | null = player.Units.getUnits();
					if (unitList != null) {
						for (let i = 0; i < unitList.length; ++i) {
							if (Units.hasTag(unitList[i].id, "UNIT_CLASS_SIEGE")) {
								bSiegeTrained = true;
								break;
							}
						}
					}
				}
				let bCityCaptured: boolean = false;
				let playerCities: City[] | undefined = player.Cities?.getCities();
				if (playerCities && bSiegeTrained) {
					for (let i = 0; i < playerCities.length; ++i) {
						let city: City = playerCities[i];
						if (city != null) {
							if (city.originalOwner != player.id) {
								bCityCaptured = true;
							}
						}
					}
				}
				if (bCityCaptured == true) {
					return true;
				}
			}
		}
		return false;
	},
});
const militaryVictoryContent4: TutorialQuestContent = {
	title: "LOC_TUTORIAL_MILITARY_QUEST_3_TITLE",
	advisor: {
		text: "LOC_TUTORIAL_MILITARY_QUEST_3_ADVISOR_BODY",
	},
	body: {
		text: "LOC_TUTORIAL_MILITARY_QUEST_3_BODY",
		getLocParams: (_item: TutorialItem) => {
			return [MILITARY_QUEST_3_VICTORY_POINTS];
		}
	},
}
// ------------------------------------------------------------------
const MILITARY_QUEST_3_VICTORY_POINTS = 6;
TutorialManager.add({
	ID: "military_victory_quest_3",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Military,
		...militaryVictoryContent4,
		option1: {
			callback: () => {
				QuestTracker.setQuestVictoryStateById("military_victory_quest_3_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
			},
			text: "LOC_TUTORIAL_CALLOUT_ACCEPT_QUEST",
			actionKey: "inline-accept",
			closes: true,
		},
		option2: calloutDeclineQuest,
	},
	activationCustomEvents: [QuestCompletedEventName],
	onActivateCheck: (_item: TutorialItem) => {
		return TutorialSupport.canQuestActivate("military_victory_quest_2_tracking", "military_victory_quest_3_tracking");
	},
	onObsoleteCheck: (_item: TutorialItem) => {
		return QuestTracker.isQuestVictoryInProgress("military_victory_quest_3_tracking");
	}
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "military_victory_quest_3_tracking",
	quest: {
		title: Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_3_TRACKING_TITLE"),
		description: "LOC_TUTORIAL_MILITARY_QUEST_3_TRACKING_BODY",
		victory: {
			type: AdvisorTypes.MILITARY,
			order: 4,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: militaryVictoryContent4
		},
		getDescriptionLocParams: () => {
			let currentVictoryPoints = 0;
			let targetVictoryPoints = MILITARY_QUEST_3_VICTORY_POINTS;
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				const score = player.LegacyPaths?.getScore("LEGACY_PATH_ANTIQUITY_MILITARY")
				if (score) {
					currentVictoryPoints = score;
				}
			}
			return [currentVictoryPoints, targetVictoryPoints];
		},
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["CityAddedToMap", "CityTransfered"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		let questMet = false;
		let currentVictoryPoints = 0;
		let targetVictoryPoints = MILITARY_QUEST_3_VICTORY_POINTS;
		if (player) {
			const score = player.LegacyPaths?.getScore("LEGACY_PATH_ANTIQUITY_MILITARY")
			if (score) {
				currentVictoryPoints = score;
			}
		}
		if (currentVictoryPoints >= targetVictoryPoints) {
			questMet = true;
		}
		return questMet;
	},
});
const militaryVictoryContent5: TutorialQuestContent = {
	title: "LOC_TUTORIAL_MILITARY_QUEST_4_TITLE",
	advisor: {
		text: "LOC_TUTORIAL_MILITARY_QUEST_4_ADVISOR_BODY",
		getLocParams: (_item: TutorialItem) => {
			let civAdj: string = "null";
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				civAdj = player.civilizationAdjective;
			}
			return [civAdj];
		}
	},
	body: {
		text: "LOC_TUTORIAL_MILITARY_QUEST_4_BODY",
		getLocParams: (_item: TutorialItem) => {
			let civAdj: string = "null";
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				civAdj = player.civilizationAdjective;
			}
			return [civAdj, MILITARY_QUEST_4_VICTORY_POINTS];
		}
	}
}
// ------------------------------------------------------------------
const MILITARY_QUEST_4_VICTORY_POINTS = 9;
TutorialManager.add({
	ID: "military_victory_quest_4_start",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Military,
		...militaryVictoryContent5,
		option1: {
			callback: () => {
				QuestTracker.setQuestVictoryStateById("military_victory_quest_4_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
			},
			text: "LOC_TUTORIAL_CALLOUT_ACCEPT_QUEST",
			actionKey: "inline-accept",
			closes: true,
		},
		option2: calloutDeclineQuest,
	},
	activationCustomEvents: [QuestCompletedEventName],
	onActivateCheck: (_item: TutorialItem) => {
		return TutorialSupport.canQuestActivate("military_victory_quest_3_tracking", "military_victory_quest_4_tracking");
	},
	onObsoleteCheck: (_item: TutorialItem) => {
		return QuestTracker.isQuestVictoryInProgress("military_victory_quest_4_tracking");
	}
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "military_victory_quest_4_tracking",
	quest: {
		title: Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_4_TRACKING_TITLE"),
		description: "LOC_TUTORIAL_MILITARY_QUEST_4_TRACKING_BODY",
		victory: {
			type: AdvisorTypes.MILITARY,
			order: 5,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: militaryVictoryContent5
		},
		getDescriptionLocParams: () => {
			let currentVictoryPoints = 0;
			let targetVictoryPoints = MILITARY_QUEST_4_VICTORY_POINTS;
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				const score = player.LegacyPaths?.getScore("LEGACY_PATH_ANTIQUITY_MILITARY")
				if (score) {
					currentVictoryPoints = score;
				}
			}
			return [currentVictoryPoints, targetVictoryPoints];
		},
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["CityAddedToMap", "CityTransfered"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		let questMet = false;
		let currentVictoryPoints = 0;
		let targetVictoryPoints = MILITARY_QUEST_4_VICTORY_POINTS;
		if (player) {
			const score = player.LegacyPaths?.getScore("LEGACY_PATH_ANTIQUITY_MILITARY")
			if (score) {
				currentVictoryPoints = score;
			}
		}
		if (currentVictoryPoints >= targetVictoryPoints) {
			questMet = true;
		}
		return questMet;
	},
});
const militaryVictoryContent6: TutorialQuestContent = {
	title: "LOC_TUTORIAL_MILITARY_QUEST_5_TITLE",
	advisor: {
		text: "LOC_TUTORIAL_MILITARY_QUEST_5_ADVISOR_BODY",
		getLocParams: (_item: TutorialItem) => {
			let civAdj: string = "null";
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				civAdj = player.civilizationAdjective;
			}
			return [civAdj];
		}
	},
	body: {
		text: "LOC_TUTORIAL_MILITARY_QUEST_5_BODY",
		getLocParams: (_item: TutorialItem) => {
			return [MILITARY_QUEST_5_VICTORY_POINTS];
		}
	}
}
// ------------------------------------------------------------------
const MILITARY_QUEST_5_VICTORY_POINTS = 12;
TutorialManager.add({
	ID: "military_victory_quest_5_start",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Military,
		...militaryVictoryContent6,
		option1: {
			callback: () => {
				QuestTracker.setQuestVictoryStateById("military_victory_quest_5_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
			},
			text: "LOC_TUTORIAL_CALLOUT_ACCEPT_QUEST",
			actionKey: "inline-accept",
			closes: true,
		},
		option2: calloutDeclineQuest,
	},
	activationCustomEvents: [QuestCompletedEventName],
	onActivateCheck: (_item: TutorialItem) => {
		return TutorialSupport.canQuestActivate("military_victory_quest_4_tracking", "military_victory_quest_5_tracking");
	},
	onObsoleteCheck: (_item: TutorialItem) => {
		return QuestTracker.isQuestVictoryInProgress("military_victory_quest_5_tracking");
	}
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "military_victory_quest_5_tracking",
	quest: {
		title: Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_5_TRACKING_TITLE"),
		description: "LOC_TUTORIAL_MILITARY_QUEST_5_TRACKING_BODY",
		victory: {
			type: AdvisorTypes.MILITARY,
			order: 6,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: militaryVictoryContent6
		},
		getDescriptionLocParams: () => {
			let currentVictoryPoints = 0;
			let targetVictoryPoints = MILITARY_QUEST_5_VICTORY_POINTS;
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				const score = player.LegacyPaths?.getScore("LEGACY_PATH_ANTIQUITY_MILITARY")
				if (score) {
					currentVictoryPoints = score;
				}
			}
			return [currentVictoryPoints, targetVictoryPoints];
		},
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["CityAddedToMap", "CityTransfered"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		let questMet = false;
		let currentVictoryPoints = 0;
		let targetVictoryPoints = MILITARY_QUEST_5_VICTORY_POINTS;
		if (player) {
			const score = player.LegacyPaths?.getScore("LEGACY_PATH_ANTIQUITY_MILITARY")
			if (score) {
				currentVictoryPoints = score;
			}
		}
		if (currentVictoryPoints >= targetVictoryPoints) {
			questMet = true;
		}
		return questMet;
	},
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "military_victory_quest_line_completed",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Military,
		title: "LOC_TUTORIAL_MILITARY_QUEST_VICTORY_TITLE",
		advisor: {
			text: "LOC_TUTORIAL_MILITARY_QUEST_VICTORY_ADVISOR_BODY",
		},
		body: {
			text: "LOC_TUTORIAL_MILITARY_QUEST_VICTORY_BODY",
		},
		option1: calloutClose,
		option2: {
			callback: () => {
				ContextManager.push("screen-victory-progress", { singleton: true, createMouseGuard: true })
			},
			text: "LOC_TUTORIAL_CALLOUT_VICTORIES",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationCustomEvents: [QuestCompletedEventName],
	onActivateCheck: (_item: TutorialItem) => {
		// Make sure the quest before this quest is completed
		return QuestTracker.isQuestVictoryCompleted("military_victory_quest_5_tracking");
	},
});
const economicVictoryContent1: TutorialQuestContent = {
	title: Locale.compose("LOC_TUTORIAL_ECONOMIC_INTRO_TITLE"),
	advisor: {
		text: "LOC_TUTORIAL_ECONOMIC_INTRO_ADVISOR_BODY"
	},
	body: {
		text: "LOC_TUTORIAL_ECONOMIC_INTRO_BODY",
		getLocParams: (_item: TutorialItem) => {
			return [TutorialSupport.getNameOfFirstUnitWithTag("UNIT_CLASS_MAKE_TRADE_ROUTE")];
		}
	}
}
// ------------------------------------------------------------------
// VICTORY QUEST LINE - ECONOMIC
// ------------------------------------------------------------------
// ECONOMIC ADVISOR INTRO
//This hint is now the first quest in the Economic Questline.
TutorialManager.add({
	ID: "economic_victory_quest_A",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Economic,
		...economicVictoryContent1,
		option1: calloutContinue,
	},
	onCleanUp: () => {
		QuestTracker.setQuestVictoryStateById("economic_victory_quest_A_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
	},
	onObsoleteCheck: (_item: TutorialItem) => {
		return QuestTracker.isQuestVictoryInProgress("economic_victory_quest_A_tracking");
	},
	nextID: "legacy_quest_tracker",
});
//------------------------------------------------------------------
TutorialManager.add({
	ID: "economic_victory_quest_A_tracking",
	quest: {
		title: Locale.compose("LOC_TUTORIAL_ECONOMIC_QUEST_A_TRACKING_TITLE"),
		description: Locale.compose("LOC_TUTORIAL_ECONOMIC_QUEST_A_TRACKING_BODY"),
		victory: {
			type: AdvisorTypes.ECONOMIC,
			order: 1,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: economicVictoryContent1
		},
		cancelable: true,
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["CultureNodeCompleted"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			let playerCulture = player.Culture;
			if (playerCulture?.isNodeUnlocked("NODE_CIVIC_AQ_MAIN_CODE_OF_LAWS")) {
				return true;
			}
		}
		return false;
	},
});
const economicVictoryContent2: TutorialQuestContent = {
	title: "LOC_TUTORIAL_ECONOMIC_QUEST_1_TITLE",
	advisor: {
		text: "LOC_TUTORIAL_ECONOMIC_QUEST_1_ADVISOR_BODY",
		getLocParams: (_item: TutorialItem) => {
			return [TutorialSupport.getNameOfFirstUnitWithTag("UNIT_CLASS_MAKE_TRADE_ROUTE")];
		}
	},
	body: {
		text: "LOC_TUTORIAL_ECONOMIC_QUEST_1_BODY",
		getLocParams: (_item: TutorialItem) => {
			return [TutorialSupport.getNameOfFirstUnitWithTag("UNIT_CLASS_MAKE_TRADE_ROUTE")];
		}
	}
}
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "economic_victory_quest_1_accepted",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Economic,
		...economicVictoryContent2,
		option1: calloutBegin,
	},
	activationCustomEvents: [QuestCompletedEventName],
	onActivateCheck: (_item: TutorialItem) => {
		return TutorialSupport.canQuestActivate("economic_victory_quest_A_tracking", "economic_victory_quest_1_tracking");
	},
	onCleanUp: () => {
		QuestTracker.setQuestVictoryStateById("economic_victory_quest_1_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
	},
	onObsoleteCheck: (_item: TutorialItem) => {
		return QuestTracker.isQuestVictoryInProgress("economic_victory_quest_1_tracking");
	},
});
//------------------------------------------------------------------
TutorialManager.add({
	ID: "economic_victory_quest_1_tracking",
	quest: {
		title: Locale.compose("LOC_TUTORIAL_ECONOMIC_QUEST_1_TRACKING_TITLE"),
		description: "LOC_TUTORIAL_ECONOMIC_QUEST_1_TRACKING_BODY",
		victory: {
			type: AdvisorTypes.ECONOMIC,
			order: 2,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: economicVictoryContent2
		},
		getDescriptionLocParams: () => {
			let moveMerchantComplete = "[icon:QUEST_ITEM_OPEN]";
			let merchantDef = GameInfo.Units.lookup("UNIT_MERCHANT");
			let playerMerchantType: UnitType = UnitType.NO_UNIT;
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				if (merchantDef) {
					let buildMerchantType: UnitType | undefined = player?.Units?.getBuildUnit(merchantDef.UnitType);
					if (buildMerchantType != undefined) {
						let merchantDef = GameInfo.Units.lookup(buildMerchantType);
						if (merchantDef) {
							playerMerchantType = merchantDef.UnitType;
						}
					}
				}
				const unitId: ComponentID | null = UI.Player.getHeadSelectedUnit();
				if (unitId) {
					let unitFound: boolean = false;
					const unit: Unit | null = Units.get(unitId);
					if (player.Units && unit) {
						if (unit.type == playerMerchantType) {
							unitFound = true;
						}
					}
					if (unitFound) {
						let result: OperationResult;
						result = Game.UnitCommands.canStart(unitId, UnitCommandTypes.MAKE_TRADE_ROUTE, { unitId }, false);
						if (result.Success) {
							moveMerchantComplete = "[icon:QUEST_ITEM_COMPLETED]";
						}
					}
				}
			}
			let merchantName: string = "NO_UNIT";
			let playerMerchantDef = GameInfo.Units.lookup(playerMerchantType);
			if (playerMerchantDef) {
				merchantName = playerMerchantDef.Name;
			}
			return [merchantName, moveMerchantComplete, "[icon:QUEST_ITEM_OPEN]"];
		},
		cancelable: true,
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["UnitSelectionChanged", "TradeRouteAddedToMap"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player && player.Trade) {
			if (player.Trade.countPlayerTradeRoutes() > 0) {
				return true;
			}
		}
		return false;
	},
});
const economicVictoryContent3: TutorialQuestContent = {
	title: "LOC_TUTORIAL_ECONOMIC_QUEST_2_TITLE",
	advisor: {
		text: "LOC_TUTORIAL_ECONOMIC_QUEST_2_ADVISOR_BODY",
	},
	body: {
		text: Locale.compose("LOC_TUTORIAL_ECONOMIC_QUEST_2_BODY"),
	}
}
// ------------------------------------------------------------------
// ECONOMIC QUEST 2
TutorialManager.add({
	ID: "economic_victory_quest_2_start",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Economic,
		...economicVictoryContent3,
		option1: {
			callback: () => {
				QuestTracker.setQuestVictoryStateById("economic_victory_quest_2_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
			}, text: "LOC_TUTORIAL_CALLOUT_ACCEPT_QUEST", actionKey: "inline-accept", closes: true
		},
		option2: calloutDeclineQuest,
	},
	activationCustomEvents: [QuestCompletedEventName],
	onActivateCheck: (_item: TutorialItem) => {
		return TutorialSupport.canQuestActivate("economic_victory_quest_1_tracking", "economic_victory_quest_2_tracking");
	},
	onObsoleteCheck: (_item: TutorialItem) => {
		return QuestTracker.isQuestVictoryInProgress("economic_victory_quest_2_tracking");
	}
});
//------------------------------------------------------------------
TutorialManager.add({
	ID: "economic_victory_quest_2_tracking",
	quest: {
		title: Locale.compose("LOC_TUTORIAL_ECONOMIC_QUEST_2_TRACKING_TITLE"),
		description: "LOC_TUTORIAL_ECONOMIC_QUEST_2_TRACKING_BODY",
		victory: {
			type: AdvisorTypes.ECONOMIC,
			order: 3,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: economicVictoryContent3
		},
		getDescriptionLocParams: () => {
			return ["[icon:QUEST_ITEM_OPEN]"];
		},
		cancelable: true,
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["DiplomacyEventStarted"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			const diplomacyEventData = (TutorialManager.activatingEvent as DiplomacyEvent_EventData);
			if (diplomacyEventData.initialPlayer == GameContext.localPlayerID && diplomacyEventData.actionType == DiplomacyActionTypes.DIPLOMACY_ACTION_IMPROVE_TRADE_RELATIONS) {
				return true;
			}
		}
		return false;
	},
});
const economicVictoryContent4: TutorialQuestContent = {
	title: "LOC_TUTORIAL_ECONOMIC_QUEST_3_TITLE",
	advisor: {
		text: "LOC_TUTORIAL_ECONOMIC_QUEST_3_ADVISOR_BODY",
	},
	body: {
		text: Locale.compose("LOC_TUTORIAL_ECONOMIC_QUEST_3_BODY"),
	}
}
// ------------------------------------------------------------------
// ECONOMIC QUEST 3
TutorialManager.add({
	ID: "economic_victory_quest_3_start",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Economic,
		...economicVictoryContent4,
		option1: {
			callback: () => {
				QuestTracker.setQuestVictoryStateById("economic_victory_quest_3_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
			}, text: "LOC_TUTORIAL_CALLOUT_ACCEPT_QUEST", actionKey: "inline-accept", closes: true
		},
		option2: calloutDeclineQuest,
	},
	/*activationEngineEvents: ["DiplomacyEventStarted"],
	onActivateCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			const diplomacyEventData = (TutorialManager.activatingEvent as DiplomacyEvent_EventData);
			if (diplomacyEventData.initialPlayer == GameContext.localPlayerID && diplomacyEventData.actionType == DiplomacyActionTypes.DIPLOMACY_ACTION_IMPROVE_TRADE_RELATIONS) {
				return true;
			}
		}
		return false;
	},*/
	activationCustomEvents: [QuestCompletedEventName],
	onActivateCheck: (_item: TutorialItem) => {
		return TutorialSupport.canQuestActivate("economic_victory_quest_2_tracking", "economic_victory_quest_3_tracking");
	},
	onObsoleteCheck: (_item: TutorialItem) => {
		return QuestTracker.isQuestVictoryInProgress("economic_victory_quest_3_tracking");
	}
});
//------------------------------------------------------------------
let ECONOMIC_QUEST_3_RESOURCE_GOAL = 7;
TutorialManager.add({
	ID: "economic_victory_quest_3_tracking",
	quest: {
		title: Locale.compose("LOC_TUTORIAL_ECONOMIC_QUEST_3_TRACKING_TITLE"),
		description: "LOC_TUTORIAL_ECONOMIC_QUEST_3_TRACKING_BODY",
		victory: {
			type: AdvisorTypes.ECONOMIC,
			order: 4,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: economicVictoryContent4
		},
		getDescriptionLocParams: () => {
			return ["[icon:QUEST_ITEM_OPEN]"];
		},
		cancelable: true,
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["LegacyPathMilestoneCompleted"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			let iCount: number = 0;
			if (player) {
				const score = player.LegacyPaths?.getScore("LEGACY_PATH_ANTIQUITY_ECONOMIC")
				if (score) {
					iCount = score;
				}
			}
			if (iCount >= ECONOMIC_QUEST_3_RESOURCE_GOAL) {
				return true;
			}
		}
		return false;
	},
});
const economicVictoryContent5: TutorialQuestContent = {
	title: "LOC_TUTORIAL_ECONOMIC_QUEST_4_TITLE",
	advisor: {
		text: "LOC_TUTORIAL_ECONOMIC_QUEST_4_ADVISOR_BODY",
	},
	body: {
		text: Locale.compose("LOC_TUTORIAL_ECONOMIC_QUEST_4_BODY"),
	}
}
//------------------------------------------------------------------
// ECONOMIC QUEST 4
TutorialManager.add({
	ID: "economic_victory_quest_4_start",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Economic,
		...economicVictoryContent5,
		option1: {
			callback: () => {
				QuestTracker.setQuestVictoryStateById("economic_victory_quest_4_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
			}, text: "LOC_TUTORIAL_CALLOUT_ACCEPT_QUEST", actionKey: "inline-accept", closes: true
		},
		option2: calloutDeclineQuest,
	},
	activationCustomEvents: [QuestCompletedEventName],
	onActivateCheck: (_item: TutorialItem) => {
		return TutorialSupport.canQuestActivate("economic_victory_quest_3_tracking", "economic_victory_quest_4_tracking");
	},
	onObsoleteCheck: (_item: TutorialItem) => {
		return QuestTracker.isQuestVictoryInProgress("economic_victory_quest_4_tracking");
	}
});
//------------------------------------------------------------------
let ECONOMIC_QUEST_4_RESOURCE_GOAL = 14;
TutorialManager.add({
	ID: "economic_victory_quest_4_tracking",
	quest: {
		title: Locale.compose("LOC_TUTORIAL_ECONOMIC_QUEST_4_TRACKING_TITLE"),
		description: "LOC_TUTORIAL_ECONOMIC_QUEST_4_TRACKING_BODY",
		victory: {
			type: AdvisorTypes.ECONOMIC,
			order: 5,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: economicVictoryContent5
		},
		getDescriptionLocParams: () => {
			return ["[icon:QUEST_ITEM_OPEN]"];
		},
		cancelable: true,
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["LegacyPathMilestoneCompleted"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			let iCount: number = 0;
			if (player) {
				const score = player.LegacyPaths?.getScore("LEGACY_PATH_ANTIQUITY_ECONOMIC")
				if (score) {
					iCount = score;
				}
			}
			if (iCount >= ECONOMIC_QUEST_4_RESOURCE_GOAL) {
				return true;
			}
		}
		return false;
	},
});
const economicVictoryContent6: TutorialQuestContent = {
	title: "LOC_TUTORIAL_ECONOMIC_QUEST_5_TITLE",
	advisor: {
		text: "LOC_TUTORIAL_ECONOMIC_QUEST_5_ADVISOR_BODY",
	},
	body: {
		text: Locale.compose("LOC_TUTORIAL_ECONOMIC_QUEST_5_BODY"),
	},
}
//------------------------------------------------------------------
// ECONOMIC QUEST 5
TutorialManager.add({
	ID: "economic_victory_quest_5_start",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Economic,
		...economicVictoryContent6,
		option1: {
			callback: () => {
				QuestTracker.setQuestVictoryStateById("economic_victory_quest_5_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
			}, text: "LOC_TUTORIAL_CALLOUT_ACCEPT_QUEST", actionKey: "inline-accept", closes: true
		},
		option2: calloutDeclineQuest,
	},
	activationCustomEvents: [QuestCompletedEventName],
	onActivateCheck: (_item: TutorialItem) => {
		return TutorialSupport.canQuestActivate("economic_victory_quest_4_tracking", "economic_victory_quest_5_tracking");
	},
	onObsoleteCheck: (_item: TutorialItem) => {
		return QuestTracker.isQuestVictoryInProgress("economic_victory_quest_5_tracking");
	}
});
//------------------------------------------------------------------
let ECONOMIC_QUEST_5_RESOURCE_GOAL = 20;
TutorialManager.add({
	ID: "economic_victory_quest_5_tracking",
	quest: {
		title: Locale.compose("LOC_TUTORIAL_ECONOMIC_QUEST_5_TRACKING_TITLE"),
		description: "LOC_TUTORIAL_ECONOMIC_QUEST_5_TRACKING_BODY",
		victory: {
			type: AdvisorTypes.ECONOMIC,
			order: 6,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: economicVictoryContent6
		},
		getDescriptionLocParams: () => {
			return ["[icon:QUEST_ITEM_OPEN]"];
		},
		cancelable: true,
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["LegacyPathMilestoneCompleted"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			let iCount: number = 0;
			if (player) {
				const score = player.LegacyPaths?.getScore("LEGACY_PATH_ANTIQUITY_ECONOMIC")
				if (score) {
					iCount = score;
				}
			}
			if (iCount >= ECONOMIC_QUEST_5_RESOURCE_GOAL) {
				return true;
			}
		}
		return false;
	},
});
//------------------------------------------------------------------
TutorialManager.add({
	ID: "economic_victory_quest_line_completed",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Economic,
		title: "LOC_TUTORIAL_ECONOMIC_QUEST_LINE_COMPLETED_TITLE",
		advisor: {
			text: "LOC_TUTORIAL_ECONOMIC_QUEST_LINE_COMPLETED_ADVISOR_BODY",
			getLocParams: (_item: TutorialItem) => {
				let civAdj: string = "null";
				const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
				if (player) {
					civAdj = player.civilizationAdjective;
				}
				return [civAdj];
			},
		},
		body: {
			text: "LOC_TUTORIAL_ECONOMIC_QUEST_LINE_COMPLETED_BODY",
		},
		option1: calloutClose,
		option2: {
			callback: () => {
				ContextManager.push("screen-victory-progress", { singleton: true, createMouseGuard: true })
			},
			text: "LOC_TUTORIAL_CALLOUT_VICTORIES",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationCustomEvents: [QuestCompletedEventName],
	onActivateCheck: (_item: TutorialItem) => {
		// Make sure the quest before this quest is completed
		return QuestTracker.isQuestVictoryCompleted("economic_victory_quest_5_tracking");
	},
});

// ------------------------------------------------------------------
TutorialManager.process("antiquity quest items");		// Must appear at end of item bank!