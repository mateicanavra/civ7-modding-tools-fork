/**
 * @file tutorial-quest-items-exploration.ts
 * @copyright 2024, Firaxis Games
 * @description Defines the sequence of tutorial quest items for the exploration age.
 */

import { VictoryQuestState } from '/base-standard/ui/quest-tracker/quest-item.js';
import TutorialItem, { TutorialAdvisorType, TutorialQuestContent, TutorialAnchorPosition } from '/base-standard/ui/tutorial/tutorial-item.js';
import TutorialManager from '/base-standard/ui/tutorial/tutorial-manager.js';
import * as TutorialSupport from '/base-standard/ui/tutorial/tutorial-support.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
import QuestTracker, { QuestCompletedEventName } from '/base-standard/ui/quest-tracker/quest-tracker.js';

// ---------------------------------------------------------------------------
// Defines for option buttons
//
const calloutClose = { callback: () => { }, text: "LOC_TUTORIAL_CALLOUT_CLOSE", actionKey: "inline-cancel", closes: true };
const calloutBegin = { callback: () => { }, text: "LOC_TUTORIAL_CALLOUT_BEGIN", actionKey: "inline-accept", closes: true };
const calloutDeclineQuest = { callback: () => { }, text: "LOC_TUTORIAL_CALLOUT_DECLINE_QUEST", actionKey: "inline-cancel", closes: true };
// ---------------------------------------------------------------------------
// Defines for version validation
//
const isLiveEventPlayer: boolean = (() => {
	return Online.Metaprogression.isPlayingActiveEvent();
})();

const isNotLiveEventPlayer = (_item: TutorialItem) => {
	return !isLiveEventPlayer;
}
// ------------------------------------------------------------------
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
					nextID: "economic_victory_quest_1_start",
					questID: "economic_victory_quest_1_tracking"
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
					nextID: "military_victory_quest_1_start",
					questID: "military_victory_quest_1_tracking"
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
					nextID: "culture_victory_quest_1_start",
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
					nextID: "science_victory_quest_1_start",
					questID: "science_victory_quest_1_tracking"
				},
				legacyPathClassType: "LEGACY_PATH_CLASS_SCIENCE"
			},
		]
	},
	activationEngineEvents: ["PlayerTurnActivated"],
	onObsoleteCheck: (item: TutorialItem) => {
		if (Online.Metaprogression.isPlayingActiveEvent()) {
			return true;
		}

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
		return trackedPaths.every(path => path);
	},
	hiders: [".tut-action-button", ".tut-action-text"],
	inputFilters: [{ inputName: "next-action" }]
});
// ------------------------------------------------------------------
// VICTORY QUEST LINE - MILITARY
// ------------------------------------------------------------------
const militaryVictoryContent1: TutorialQuestContent = {
	title: "LOC_TUTORIAL_MILITARY_QUEST_1_TITLE",
	advisor: {
		text: "LOC_TUTORIAL_MILITARY_QUEST_1_ADVISOR_BODY",
		getLocParams: () => {
			let playerPathText: string = "";
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				let playercivDef = GameInfo.Civilizations.lookup(player.civilizationType)
				if (playercivDef != null && playercivDef.CivilizationType == "CIVILIZATION_MONGOLIA") {
					playerPathText = "LOC_TUTORIAL_MILITARY_QUEST_1_ADVISOR_BODY_MONGOLIA_PATH";
				}
				else {
					playerPathText = "LOC_TUTORIAL_MILITARY_QUEST_1_ADVISOR_BODY_GENERIC_PATH";
				}
			}
			return [playerPathText];
		}
	},
	body: {
		text: "LOC_TUTORIAL_MILITARY_QUEST_1_BODY",
		getLocParams: () => {
			let playerPathText: string = "";
			let commanderIcon: string = "";
			let commanderName: string = "";
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player && player.Units) {
				let playercivDef = GameInfo.Civilizations.lookup(player.civilizationType)
				if (playercivDef != null && playercivDef.CivilizationType == "CIVILIZATION_MONGOLIA") {
					const fleetCommander = player.Units.getBuildUnit("UNIT_ARMY_COMMANDER");
					const commanderDef = GameInfo.Units.lookup(fleetCommander);
					if (commanderDef) {
						commanderIcon = "[icon:" + commanderDef.UnitType + "]";
						commanderName = commanderDef.Name;
					}
					playerPathText = Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_1_BODY_MONGOLIA_PATH", commanderIcon, commanderName);
				}
				else {
					const fleetCommander = player.Units.getBuildUnit("UNIT_FLEET_COMMANDER");
					const commanderDef = GameInfo.Units.lookup(fleetCommander);
					if (commanderDef) {
						commanderIcon = "[icon:" + commanderDef.UnitType + "]";
						commanderName = commanderDef.Name;
					}
					playerPathText = Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_1_BODY_GENERIC_PATH", commanderIcon, commanderName);
				}
			}
			return [playerPathText];
		}
	}
}
TutorialManager.add({
	ID: "military_victory_quest_1_start",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Military,
		...militaryVictoryContent1,
		option1: {
			callback: () => {
				QuestTracker.setQuestVictoryStateById("military_victory_quest_1_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
			}, text: "LOC_TUTORIAL_CALLOUT_ACCEPT_QUEST", actionKey: "inline-accept", closes: true
		},
		option2: calloutDeclineQuest,
	},
	onObsoleteCheck: (_item: TutorialItem) => {
		if (Online.Metaprogression.isPlayingActiveEvent()) {
			return true;
		}
		return QuestTracker.isQuestVictoryInProgress("military_victory_quest_1_tracking");
	},
	hiders: [".tut-action-button", ".tut-action-text"],
	inputFilters: [{ inputName: "next-action" }]
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "military_victory_quest_1_tracking",
	quest: {
		title: Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_1_TRACKING_TITLE"),
		description: "LOC_TUTORIAL_MILITARY_QUEST_1_TRACKING_BODY",
		victory: {
			type: AdvisorTypes.MILITARY,
			order: 1,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: militaryVictoryContent1
		},
		getDescriptionLocParams: () => {
			let playerPathText: string = "";
			//generic path goals: study cartography and astronomy
			let cartographyResearched: string = "[icon:QUEST_ITEM_OPEN]";
			let astronomyResearched: string = "[icon:QUEST_ITEM_OPEN]";
			//mongol path goal: take settlement.
			let settlementCaptured: number = 0;
			let settlementGoal: number = 1;
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				let playercivDef = GameInfo.Civilizations.lookup(player.civilizationType)
				//mongol path
				if (playercivDef != null && playercivDef.CivilizationType == "CIVILIZATION_MONGOLIA") {
					let playerCities = player.Cities?.getCities();
					if (player.Units && playerCities) {
						for (let i = 0; i < playerCities.length; ++i) {
							let city: City = playerCities[i];
							if (city != null) {
								if (city.originalOwner != player.id) {
									settlementCaptured++;
								}
							}
						}
					}
					playerPathText = Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_1_TRACKING_BODY_MONGOLIA_PATH", settlementCaptured, settlementGoal);
				}
				//generic path
				else {
					if (player.Techs?.isNodeUnlocked("NODE_TECH_EX_CARTOGRAPHY")) {
						cartographyResearched = "[icon:QUEST_ITEM_COMPLETED]";
					}
					if (player.Techs?.isNodeUnlocked("NODE_TECH_EX_ASTRONOMY")) {
						astronomyResearched = "[icon:QUEST_ITEM_COMPLETED]";
					}
					playerPathText = Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_1_TRACKING_BODY_GENERIC_PATH", cartographyResearched, astronomyResearched);
				}
			}
			return [playerPathText];
		},
		cancelable: true,
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["TechNodeCompleted", "UnitAddedToArmy", "UnitRemovedFromArmy", "CityAddedToMap"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		let settlementCaptured = 0;
		if (player) {
			let playercivDef = GameInfo.Civilizations.lookup(player.civilizationType)
			if (playercivDef != null && playercivDef.CivilizationType == "CIVILIZATION_MONGOLIA") {
				let playerCities = player.Cities?.getCities();
				if (playerCities) {
					for (let i = 0; i < playerCities.length; ++i) {
						let city: City = playerCities[i];
						if (city != null) {
							if (city.originalOwner != player.id) {
								settlementCaptured++;
							}
						}
					}
				}
				if (settlementCaptured > 0) {
					return true;
				}
			}
			else {
				if (player.Techs?.isNodeUnlocked("NODE_TECH_EX_CARTOGRAPHY") && player.Techs?.isNodeUnlocked("NODE_TECH_EX_ASTRONOMY")) {
					return true;
				}
			}
		}
		return false;
	},
});
const militaryVictoryContent2: TutorialQuestContent = {
	title: "LOC_TUTORIAL_MILITARY_QUEST_2_TITLE",
	advisor: {
		text: "LOC_TUTORIAL_MILITARY_QUEST_2_ADVISOR_BODY",
		getLocParams: (_item: TutorialItem) => {
			let playerPathText: string = "";
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				let playercivDef = GameInfo.Civilizations.lookup(player.civilizationType)
				if (playercivDef != null && playercivDef.CivilizationType == "CIVILIZATION_MONGOLIA") {
					playerPathText = "LOC_TUTORIAL_MILITARY_QUEST_2_ADVISOR_BODY_MONGOLIA_PATH";
				}
				else {
					playerPathText = "LOC_TUTORIAL_MILITARY_QUEST_2_ADVISOR_BODY_GENERIC_PATH";
				}
			}
			return [playerPathText];
		}
	},
	body: {
		text: "LOC_TUTORIAL_MILITARY_QUEST_2_BODY",
		getLocParams: () => {
			let playerPathText: string = "";
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				let playercivDef = GameInfo.Civilizations.lookup(player.civilizationType)
				if (playercivDef != null && playercivDef.CivilizationType == "CIVILIZATION_MONGOLIA") {
					playerPathText = "LOC_TUTORIAL_MILITARY_QUEST_2_BODY_MONGOLIA_PATH";
				}
				else {
					let commanderIcon: string = "";
					let commanderName: string = "";
					const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
					if (player && player.Units) {
						const fleetCommander = player.Units.getBuildUnit("UNIT_FLEET_COMMANDER");
						const commanderDef = GameInfo.Units.lookup(fleetCommander);
						if (commanderDef) {
							commanderIcon = "[icon:" + commanderDef.UnitType + "]";
							commanderName = commanderDef.Name;
						}
					}
					playerPathText = Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_2_BODY_GENERIC_PATH", commanderIcon, commanderName);
				}
			}
			return [playerPathText];
		}
	}
}
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "military_victory_quest_2_start",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Military,
		...militaryVictoryContent2,
		option1: {
			callback: () => {
				QuestTracker.setQuestVictoryStateById("military_victory_quest_2_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
			}, text: "LOC_TUTORIAL_CALLOUT_ACCEPT_QUEST", actionKey: "inline-accept", closes: true
		},
		option2: calloutDeclineQuest,
	},
	activationCustomEvents: [QuestCompletedEventName],
	onActivateCheck: (_item: TutorialItem) => {
		return TutorialSupport.canQuestActivate("military_victory_quest_1_tracking", "military_victory_quest_2_tracking");
	},
	onObsoleteCheck: (_item: TutorialItem) => {
		if (Online.Metaprogression.isPlayingActiveEvent()) {
			return true;
		}
		return QuestTracker.isQuestVictoryInProgress("military_victory_quest_2_tracking");
	}
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "military_victory_quest_2_tracking",
	quest: {
		title: Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_2_TRACKING_TITLE"),
		description: "LOC_TUTORIAL_MILITARY_QUEST_2_TRACKING_BODY",
		getDescriptionLocParams: () => {
			let playerPathText: string = "";
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			let settlementCaptured: number = 0;
			let settlementGoal: number = 2;
			if (player) {
				let playercivDef = GameInfo.Civilizations.lookup(player.civilizationType)
				//mongol path
				if (playercivDef != null && playercivDef.CivilizationType == "CIVILIZATION_MONGOLIA") {
					let playerCities = player.Cities?.getCities();
					if (player.Units && playerCities) {
						for (let i = 0; i < playerCities.length; ++i) {
							let city: City = playerCities[i];
							if (city != null) {
								if (city.originalOwner != player.id) {
									settlementCaptured++;
								}
							}
						}
						playerPathText = Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_2_TRACKING_BODY_MONGOLIA_PATH", settlementCaptured, settlementGoal);
					}
				}
				else {
					let commanderIcon: string = "";
					let commanderName: string = "";
					let settlementInDistantLands: string = "[icon:QUEST_ITEM_OPEN]";
					if (player.Units) {
						let playerCities: City[] | undefined = player.Cities?.getCities();
						if (playerCities) {
							for (let i = 0; i < playerCities.length; ++i) {
								let city: City = playerCities[i];
								if (city != null && city.isDistantLands) {
									settlementInDistantLands = "[icon:QUEST_ITEM_COMPLETED]";
								}
							}
						}
						const fleetCommander = player.Units.getBuildUnit("UNIT_FLEET_COMMANDER");
						const commanderDef = GameInfo.Units.lookup(fleetCommander);
						if (commanderDef) {
							commanderIcon = "[icon:" + commanderDef.UnitType + "]";
							commanderName = commanderDef.Name;
						}
					}
					playerPathText = Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_2_TRACKING_BODY_GENERIC_PATH", settlementInDistantLands, commanderIcon, commanderName);
				}
			}
			return [playerPathText];
		},
		cancelable: true,
		victory: {
			type: AdvisorTypes.MILITARY,
			order: 2,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: militaryVictoryContent2
		},
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["CityAddedToMap"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item: TutorialItem) => {
		let bQuestComplete = false;
		let iCitiesCaptured = 0;
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player && player.Cities) {
			let playercivDef = GameInfo.Civilizations.lookup(player.civilizationType)
			if (playercivDef != null && playercivDef.CivilizationType == "CIVILIZATION_MONGOLIA") {
				let playerCities = player.Cities.getCities();
				for (const city of playerCities) {
					if (city.originalOwner != player.id) {
						iCitiesCaptured++;
					}
				}
				if (iCitiesCaptured >= 2) {
					bQuestComplete = true;
				}
			}
			else {
				let playerCities = player.Cities.getCities();
				for (const city of playerCities) {
					if (city.isDistantLands) {
						bQuestComplete = true;
						break;
					}
				}
			}
		}
		return bQuestComplete;
	},
});
const militaryVictoryContent3: TutorialQuestContent = {
	title: Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_3_TITLE"),
	advisor: {
		text: "LOC_TUTORIAL_MILITARY_QUEST_3_ADVISOR_BODY",
		getLocParams: (_item: TutorialItem) => {
			let civAdj: string = "";
			let playerPathText: string = "";
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				civAdj = player.civilizationAdjective;
				let playercivDef = GameInfo.Civilizations.lookup(player.civilizationType)
				if (playercivDef != null && playercivDef.CivilizationType == "CIVILIZATION_MONGOLIA") {
					playerPathText = Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_3_ADVISOR_BODY_MONGOLIA_PATH", civAdj);
				}
				else {
					playerPathText = "LOC_TUTORIAL_MILITARY_QUEST_3_ADVISOR_BODY_GENERIC_PATH";
				}
			}
			return [playerPathText];
		}
	},
	body: {
		text: "LOC_TUTORIAL_MILITARY_QUEST_3_BODY",
		getLocParams: (_item: TutorialItem) => {
			let playerPathText: string = "";
			let pointGoal = MILITARY_QUEST_3_PTS_REQUIRED;
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				let playercivDef = GameInfo.Civilizations.lookup(player.civilizationType)
				if (playercivDef != null && playercivDef.CivilizationType == "CIVILIZATION_MONGOLIA") {
					playerPathText = Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_3_BODY_MONGOLIA_PATH", pointGoal);
				}
				else {
					playerPathText = Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_3_BODY_GENERIC_PATH", pointGoal);
				}
			}
			return [playerPathText];
		}
	}
}
// ------------------------------------------------------------------
const MILITARY_QUEST_3_PTS_REQUIRED: number = 4;
TutorialManager.add({
	ID: "military_victory_quest_3_start",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Military,
		...militaryVictoryContent3,
		option1: {
			callback: () => {
				QuestTracker.setQuestVictoryStateById("military_victory_quest_3_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
			}, text: "LOC_TUTORIAL_CALLOUT_ACCEPT_QUEST", actionKey: "inline-accept", closes: true
		},
		option2: calloutDeclineQuest,
	},
	activationCustomEvents: [QuestCompletedEventName],
	onActivateCheck: (_item: TutorialItem) => {
		return TutorialSupport.canQuestActivate("military_victory_quest_2_tracking", "military_victory_quest_3_tracking");
	},
	onObsoleteCheck: (_item: TutorialItem) => {
		if (Online.Metaprogression.isPlayingActiveEvent()) {
			return true;
		}
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
			order: 3,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: militaryVictoryContent3
		},
		getDescriptionLocParams: () => {
			let playerPathText: string = "";
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			let iPointsCurrent = 0;
			let iPointsGoal = MILITARY_QUEST_3_PTS_REQUIRED;
			if (player) {
				const score = player.LegacyPaths?.getScore("LEGACY_PATH_EXPLORATION_MILITARY")
				if (score) {
					iPointsCurrent = score;
				}
				let playercivDef = GameInfo.Civilizations.lookup(player.civilizationType)
				if (playercivDef != null && playercivDef.CivilizationType == "CIVILIZATION_MONGOLIA") {
					playerPathText = Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_3_TRACKING_BODY_MONGOLIA_PATH", iPointsCurrent, iPointsGoal);
				}
				else {
					playerPathText = Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_3_TRACKING_BODY_GENERIC_PATH", iPointsCurrent, iPointsGoal);
				}
			}
			return [playerPathText];
		},
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["VPChanged"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		let iPointsCurrent = 0;
		let iPointsGoal = MILITARY_QUEST_3_PTS_REQUIRED;
		if (player) {
			const score = player.LegacyPaths?.getScore("LEGACY_PATH_EXPLORATION_MILITARY")
			if (score) {
				iPointsCurrent = score;
			}
		}
		if (iPointsCurrent >= iPointsGoal) {
			return true;
		}
		return false;
	},
});
const militaryVictoryContent4: TutorialQuestContent = {
	title: Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_4_TITLE"),
	advisor: {
		text: "LOC_TUTORIAL_MILITARY_QUEST_4_ADVISOR_BODY",
		getLocParams: (_item: TutorialItem) => {
			let civAdj: string = "";
			let playerPathText: string = "";
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				civAdj = player.civilizationAdjective;
				let playercivDef = GameInfo.Civilizations.lookup(player.civilizationType)
				if (playercivDef != null && playercivDef.CivilizationType == "CIVILIZATION_MONGOLIA") {
					playerPathText = Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_4_ADVISOR_BODY_MONGOLIA_PATH", civAdj);
				}
				else {
					playerPathText = Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_4_ADVISOR_BODY_GENERIC_PATH", civAdj);
				}
			}
			return [playerPathText];
		}
	},
	body: {
		text: "LOC_TUTORIAL_MILITARY_QUEST_4_BODY",
		getLocParams: (_item: TutorialItem) => {
			let playerPathText: string = "";
			let pointGoal = MILITARY_QUEST_4_PTS_REQUIRED;
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				let playercivDef = GameInfo.Civilizations.lookup(player.civilizationType)
				if (playercivDef != null && playercivDef.CivilizationType == "CIVILIZATION_MONGOLIA") {
					playerPathText = Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_4_BODY_MONGOLIA_PATH", pointGoal);
				}
				else {
					playerPathText = Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_4_BODY_GENERIC_PATH", pointGoal);
				}
			}
			return [playerPathText];
		}
	}
}
// ------------------------------------------------------------------
const MILITARY_QUEST_4_PTS_REQUIRED: number = 8;
TutorialManager.add({
	ID: "military_victory_quest_4_start",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Military,
		...militaryVictoryContent4,
		option1: {
			callback: () => {
				QuestTracker.setQuestVictoryStateById("military_victory_quest_4_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
			}, text: "LOC_TUTORIAL_CALLOUT_ACCEPT_QUEST", actionKey: "inline-accept", closes: true
		},
		option2: calloutDeclineQuest,
	},
	activationCustomEvents: [QuestCompletedEventName],
	onActivateCheck: (_item: TutorialItem) => {
		return TutorialSupport.canQuestActivate("military_victory_quest_3_tracking", "military_victory_quest_4_tracking");
	},
	onObsoleteCheck: (_item: TutorialItem) => {
		if (Online.Metaprogression.isPlayingActiveEvent()) {
			return true;
		}
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
			order: 4,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: militaryVictoryContent4
		},
		getDescriptionLocParams: () => {
			let playerPathText: string = "";
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			let iPointsCurrent = 0;
			let iPointsGoal = MILITARY_QUEST_4_PTS_REQUIRED;
			if (player) {
				const score = player.LegacyPaths?.getScore("LEGACY_PATH_EXPLORATION_MILITARY")
				if (score) {
					iPointsCurrent = score;
				}
				let playercivDef = GameInfo.Civilizations.lookup(player.civilizationType)
				if (playercivDef != null && playercivDef.CivilizationType == "CIVILIZATION_MONGOLIA") {
					playerPathText = Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_4_TRACKING_BODY_MONGOLIA_PATH", iPointsCurrent, iPointsGoal);
				}
				else {
					playerPathText = Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_4_TRACKING_BODY_GENERIC_PATH", iPointsCurrent, iPointsGoal);
				}
			}
			return [playerPathText];
		},
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["VPChanged"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		let iPointsCurrent = 0;
		let iPointsGoal = MILITARY_QUEST_4_PTS_REQUIRED;
		if (player) {
			const score = player.LegacyPaths?.getScore("LEGACY_PATH_EXPLORATION_MILITARY")
			if (score) {
				iPointsCurrent = score;
			}
		}
		if (iPointsCurrent >= iPointsGoal) {
			return true;
		}
		return false;
	},
});
const militaryVictoryContent5: TutorialQuestContent = {
	title: Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_5_TITLE"),
	advisor: {
		text: "LOC_TUTORIAL_MILITARY_QUEST_5_ADVISOR_BODY",
		getLocParams: (_item: TutorialItem) => {
			let civAdj: string = "";
			let playerPathText: string = "";
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				civAdj = player.civilizationAdjective;
				let playercivDef = GameInfo.Civilizations.lookup(player.civilizationType)
				if (playercivDef != null && playercivDef.CivilizationType == "CIVILIZATION_MONGOLIA") {
					playerPathText = Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_5_ADVISOR_BODY_MONGOLIA_PATH", civAdj);
				}
				else {
					playerPathText = Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_5_ADVISOR_BODY_GENERIC_PATH", civAdj);
				}
			}
			return [playerPathText];
		}
	},
	body: {
		text: "LOC_TUTORIAL_MILITARY_QUEST_5_BODY",
		getLocParams: (_item: TutorialItem) => {
			let playerPathText: string = "";
			let pointGoal = MILITARY_QUEST_5_PTS_REQUIRED;
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				let playercivDef = GameInfo.Civilizations.lookup(player.civilizationType)
				if (playercivDef != null && playercivDef.CivilizationType == "CIVILIZATION_MONGOLIA") {
					playerPathText = Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_5_BODY_MONGOLIA_PATH", pointGoal);
				}
				else {
					playerPathText = Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_5_BODY_GENERIC_PATH", pointGoal);
				}
			}
			return [playerPathText];
		}
	}
}
// ------------------------------------------------------------------
const MILITARY_QUEST_5_PTS_REQUIRED: number = 12;
TutorialManager.add({
	ID: "military_victory_quest_5_start",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Military,
		...militaryVictoryContent5,
		option1: {
			callback: () => {
				QuestTracker.setQuestVictoryStateById("military_victory_quest_5_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
			}, text: "LOC_TUTORIAL_CALLOUT_ACCEPT_QUEST", actionKey: "inline-accept", closes: true
		},
		option2: calloutDeclineQuest,
	},
	activationCustomEvents: [QuestCompletedEventName],
	onActivateCheck: (_item: TutorialItem) => {
		return TutorialSupport.canQuestActivate("military_victory_quest_4_tracking", "military_victory_quest_5_tracking");
	},
	onObsoleteCheck: (_item: TutorialItem) => {
		if (Online.Metaprogression.isPlayingActiveEvent()) {
			return true;
		}
		return QuestTracker.isQuestVictoryInProgress("military_victory_quest_5_tracking");
	}
}, { version: 0, canDeliver: isNotLiveEventPlayer });
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "military_victory_quest_5_tracking",
	quest: {
		title: Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_5_TRACKING_TITLE"),
		description: "LOC_TUTORIAL_MILITARY_QUEST_5_TRACKING_BODY",
		victory: {
			type: AdvisorTypes.MILITARY,
			order: 5,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: militaryVictoryContent5
		},
		getDescriptionLocParams: () => {
			let playerPathText: string = "";
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			let iPointsCurrent = 0;
			let iPointsGoal = MILITARY_QUEST_5_PTS_REQUIRED;
			if (player) {
				const score = player.LegacyPaths?.getScore("LEGACY_PATH_EXPLORATION_MILITARY")
				if (score) {
					iPointsCurrent = score;
				}
				let playercivDef = GameInfo.Civilizations.lookup(player.civilizationType)
				if (playercivDef != null && playercivDef.CivilizationType == "CIVILIZATION_MONGOLIA") {
					playerPathText = Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_5_TRACKING_BODY_MONGOLIA_PATH", iPointsCurrent, iPointsGoal);
				}
				else {
					playerPathText = Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_5_TRACKING_BODY_GENERIC_PATH", iPointsCurrent, iPointsGoal);
				}
			}
			return [playerPathText];
		},
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["VPChanged"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		let iPointsCurrent = 0;
		let iPointsGoal = MILITARY_QUEST_5_PTS_REQUIRED;
		if (player) {
			const score = player.LegacyPaths?.getScore("LEGACY_PATH_EXPLORATION_MILITARY")
			if (score) {
				iPointsCurrent = score;
			}
		}
		if (iPointsCurrent >= iPointsGoal) {
			return true;
		}
		return false;
	},
}, { version: 0, canDeliver: isNotLiveEventPlayer });
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "military_victory_quest_line_completed",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Military,
		title: Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_LINE_COMPLETE_TITLE"),
		advisor: {
			text: "LOC_TUTORIAL_MILITARY_QUEST_LINE_COMPLETE_ADVISOR_BODY",
			getLocParams: (_item: TutorialItem) => {
				let civAdj: string = "";
				let playerPathText: string = "";
				const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
				if (player) {
					civAdj = player.civilizationAdjective;
					let playercivDef = GameInfo.Civilizations.lookup(player.civilizationType)
					if (playercivDef != null && playercivDef.CivilizationType == "CIVILIZATION_MONGOLIA") {
						playerPathText = Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_LINE_COMPLETE_ADVISOR_BODY_GENERIC_PATH", civAdj);
					}
					else {
						playerPathText = Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_LINE_COMPLETE_ADVISOR_BODY_MONGOLIA_PATH", civAdj);
					}
				}
				return [playerPathText];
			}
		},
		body: {
			text: Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_LINE_COMPLETE_BODY")
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
	}
});
// ------------------------------------------------------------------
// VICTORY QUEST LINE - SCIENCE
// ------------------------------------------------------------------

// SCIENCE QUEST 1
const TARGET_NUM_SPECIALISTS: number = 4;
const scienceVictoryContent1: TutorialQuestContent = {
	title: "LOC_TUTORIAL_SCIENCE_QUEST_1_TITLE",
	advisor: {
		text: "LOC_TUTORIAL_SCIENCE_QUEST_1_ADVISOR_BODY",
	},
	body: {
		text: Locale.compose("LOC_TUTORIAL_SCIENCE_QUEST_1_BODY", TARGET_NUM_SPECIALISTS)
	}
}
TutorialManager.add({
	ID: "science_victory_quest_1_start",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Science,
		...scienceVictoryContent1,
		option1: {
			callback: () => {
				QuestTracker.setQuestVictoryStateById("science_victory_quest_1_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
			}, text: "LOC_TUTORIAL_CALLOUT_ACCEPT_QUEST", actionKey: "inline-accept", closes: true
		},
		option2: calloutDeclineQuest,
	},
	onObsoleteCheck: (_item: TutorialItem) => {
		if (Online.Metaprogression.isPlayingActiveEvent()) {
			return true;
		}
		return QuestTracker.isQuestVictoryInProgress("science_victory_quest_1_tracking");
	},
	hiders: [".tut-action-button", ".tut-action-text"],
	inputFilters: [{ inputName: "next-action" }]
});
// ------------------------------------------------------------------

const SCIENCE_QUEST_1_SPECIALISTS_NEEDED = 4;
TutorialManager.add({
	ID: "science_victory_quest_1_tracking",
	quest: {
		title: Locale.compose("LOC_TUTORIAL_SCIENCE_QUEST_1_TRACKING_TITLE"),
		description: "LOC_TUTORIAL_SCIENCE_QUEST_1_TRACKING_BODY",
		victory: {
			type: AdvisorTypes.SCIENCE,
			order: 1,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: scienceVictoryContent1
		},
		getDescriptionLocParams: () => {
			let educationIcon: string = "[icon:QUEST_ITEM_OPEN]";
			let specialistsIcon: string = "[icon:QUEST_ITEM_OPEN]";
			let iSpecialistsCurrent: number = 0;
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				const playerTechs = player.Techs;
				if (playerTechs) {
					if (playerTechs?.isNodeUnlocked("NODE_TECH_EX_EDUCATION")) {
						educationIcon = "[icon:QUEST_ITEM_COMPLETED]"
					}
				}
				const playerCities: City[] | undefined = player.Cities?.getCities();
				if (playerCities) {
					for (let i = 0; i < playerCities.length; ++i) {
						let city = playerCities[i];
						if (city) {
							if (city.Workers) {
								iSpecialistsCurrent += city.Workers.getNumWorkers(true);
							}
						}
					}
					if (iSpecialistsCurrent >= SCIENCE_QUEST_1_SPECIALISTS_NEEDED) {
						specialistsIcon = "[icon:QUEST_ITEM_COMPLETED]"
					}
				}
			}
			return [educationIcon, iSpecialistsCurrent, SCIENCE_QUEST_1_SPECIALISTS_NEEDED, specialistsIcon];
		},
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["TechNodeCompleted", "WorkerAdded", "WorkerRemoved"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item: TutorialItem) => {
		let bHasTech: boolean = false;
		let bHasSpecialists: boolean = false;
		let iSpecialistsCurrent: number = 0;
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			const playerTechs = player.Techs;
			if (playerTechs) {
				if (playerTechs?.isNodeUnlocked("NODE_TECH_EX_EDUCATION")) {
					bHasTech = true;
				}
			}
			let playerCities: City[] | undefined = player.Cities?.getCities();
			if (playerCities) {
				for (let i = 0; i < playerCities.length; ++i) {
					let city = playerCities[i];
					if (city) {
						if (city.Workers) {
							iSpecialistsCurrent += city.Workers.getNumWorkers(true);
						}
					}
				}
				if (iSpecialistsCurrent >= SCIENCE_QUEST_1_SPECIALISTS_NEEDED) {
					bHasSpecialists = true;
				}
			}
		}
		if (bHasTech && bHasSpecialists) {
			return true;
		}
		return false;
	}
});
// ------------------------------------------------------------------
// SCIENCE QUEST 2
const SCIENCE_QUEST_2_SPECIALISTS_NEEDED: number = 2;
const SCIENCE_QUEST_2_YIELD_NEEDED: number = 20;
const scienceVictoryContent2: TutorialQuestContent = {
	title: "LOC_TUTORIAL_SCIENCE_QUEST_2_TITLE",
	advisor: {
		text: "LOC_TUTORIAL_SCIENCE_QUEST_2_ADVISOR_BODY",
	},
	body: {
		text: Locale.compose("LOC_TUTORIAL_SCIENCE_QUEST_2_BODY", SCIENCE_QUEST_2_YIELD_NEEDED, SCIENCE_QUEST_2_SPECIALISTS_NEEDED),
	}
}
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
	onObsoleteCheck: (_item: TutorialItem) => {
		if (Online.Metaprogression.isPlayingActiveEvent()) {
			return true;
		}
		return QuestTracker.isQuestVictoryInProgress("science_victory_quest_2_tracking");
	}
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
			let iCurrentYield: number = 0;
			let yieldNeededIcon: string = "[icon:QUEST_ITEM_OPEN]";
			let specialistsIcon: string = "[icon:QUEST_ITEM_OPEN]";
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				const playerStats = player?.Stats;
				if (playerStats) {
					iCurrentYield = playerStats.getHighestDistrictYield(DistrictTypes.URBAN);
					if (iCurrentYield >= SCIENCE_QUEST_2_YIELD_NEEDED) {
						yieldNeededIcon = "[icon:QUEST_ITEM_COMPLETED]";
					}
				}
				let playerCities: City[] | undefined = player.Cities?.getCities();
				if (playerCities) {
					for (let i = 0; i < playerCities.length; ++i) {
						let city = playerCities[i];
						if (city && city.Workers) {
							let cityplots: PlotIndex[] = city.getPurchasedPlots();
							for (let i = 0; i < cityplots.length; ++i) {
								if (city.Workers.getNumWorkersAtPlot(cityplots[i]) >= SCIENCE_QUEST_2_SPECIALISTS_NEEDED) {
									specialistsIcon = "[icon:QUEST_ITEM_COMPLETED]";
								}
							}
						}
					}
				}
			}
			return [iCurrentYield, SCIENCE_QUEST_2_YIELD_NEEDED, yieldNeededIcon, SCIENCE_QUEST_2_SPECIALISTS_NEEDED, specialistsIcon];
		},
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["PlayerTurnActivated", "WorkerAdded", "WorkerRemoved"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item: TutorialItem) => {
		let bHasYield: boolean = false;
		let bHasSpecialists: boolean = false;
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			const playerStats = player?.Stats;
			if (playerStats) {
				if (playerStats.getNumDistrictWithXValue(SCIENCE_QUEST_2_YIELD_NEEDED, DistrictTypes.URBAN) >= 1) {
					bHasYield = true;
				}
			}
			let playerCities: City[] | undefined = player.Cities?.getCities();
			if (playerCities) {
				for (let i = 0; i < playerCities.length; ++i) {
					let city = playerCities[i];
					if (city && city.Workers) {
						let cityplots: PlotIndex[] = city.getPurchasedPlots();
						for (let i = 0; i < cityplots.length; ++i) {
							if (city.Workers.getNumWorkersAtPlot(cityplots[i]) >= SCIENCE_QUEST_2_SPECIALISTS_NEEDED) {
								bHasSpecialists = true;
							}
						}
					}
				}
			}
		}
		if (bHasYield && bHasSpecialists) {
			return true;
		}
		return false;
	},
});
// ------------------------------------------------------------------
// SCIENCE QUEST 3
const SCIENCE_QUEST_3_YIELD_NEEDED: number = 40;
const scienceVictoryContent3: TutorialQuestContent = {
	title: "LOC_TUTORIAL_SCIENCE_QUEST_3_TITLE",
	advisor: {
		text: "LOC_TUTORIAL_SCIENCE_QUEST_3_ADVISOR_BODY",
	},
	body: {
		text: Locale.compose("LOC_TUTORIAL_SCIENCE_QUEST_3_BODY", SCIENCE_QUEST_3_YIELD_NEEDED),
	}
}
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
	onObsoleteCheck: (_item: TutorialItem) => {
		if (Online.Metaprogression.isPlayingActiveEvent()) {
			return true;
		}
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
			let iYieldCurrent: number = 0;
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				const playerStats = player?.Stats;
				if (playerStats) {
					iYieldCurrent = playerStats.getHighestDistrictYield(DistrictTypes.URBAN)
				}
			}
			return [iYieldCurrent, SCIENCE_QUEST_3_YIELD_NEEDED];
		},
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["PlayerTurnActivated", "WorkerAdded", "WorkerRemoved"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item: TutorialItem) => {
		let iYieldCurrent: number = 0;
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			const playerStats = player?.Stats;
			if (playerStats) {
				iYieldCurrent = playerStats.getHighestDistrictYield(DistrictTypes.URBAN)
			}
		}
		if (iYieldCurrent >= SCIENCE_QUEST_3_YIELD_NEEDED) {
			return true;
		}
		return false;
	}
});
// ------------------------------------------------------------------
// SCIENCE QUEST 4
const SCIENCE_QUEST_4_YIELD_NEEDED: number = 40;
const SCIENCE_QUEST_4_TILES_NEEDED: number = 3;
const scienceVictoryContent4: TutorialQuestContent = {
	title: "LOC_TUTORIAL_SCIENCE_QUEST_4_TITLE",
	advisor: {
		text: "LOC_TUTORIAL_SCIENCE_QUEST_4_ADVISOR_BODY",
	},
	body: {
		text: Locale.compose("LOC_TUTORIAL_SCIENCE_QUEST_4_BODY", SCIENCE_QUEST_4_YIELD_NEEDED, SCIENCE_QUEST_4_TILES_NEEDED),
	}
}
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
		if (Online.Metaprogression.isPlayingActiveEvent()) {
			return true;
		}
		return QuestTracker.isQuestVictoryInProgress("science_victory_quest_4_tracking");
	}
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "science_victory_quest_4_tracking",
	quest: {
		title: Locale.compose("LOC_TUTORIAL_SCIENCE_QUEST_4_TRACKING_TITLE"),
		description: "LOC_TUTORIAL_SCIENCE_QUEST_4_TRACKING_BODY",
		victory: {
			type: AdvisorTypes.SCIENCE,
			order: 4,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: scienceVictoryContent4
		},
		getDescriptionLocParams: () => {
			let iNumCurrentTiles: number = 0;
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				const playerStats = player?.Stats;
				if (playerStats) {
					iNumCurrentTiles = playerStats.getNumDistrictWithXValue(SCIENCE_QUEST_4_YIELD_NEEDED, DistrictTypes.URBAN);
				}
			}
			return [SCIENCE_QUEST_4_YIELD_NEEDED, iNumCurrentTiles, SCIENCE_QUEST_4_TILES_NEEDED];
		},
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["PlayerTurnActivated", "WorkerAdded", "WorkerRemoved"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			const playerStats = player?.Stats;
			if (playerStats) {
				if (playerStats.getNumDistrictWithXValue(SCIENCE_QUEST_4_YIELD_NEEDED, DistrictTypes.URBAN) >= SCIENCE_QUEST_4_TILES_NEEDED) {
					return true;
				}
			}
		}
		return false;
	}
});
// ------------------------------------------------------------------
// SCIENCE QUEST 4
const SCIENCE_QUEST_5_YIELD_NEEDED: number = 40;
const SCIENCE_QUEST_5_TILES_NEEDED: number = 5;
const scienceVictoryContent5: TutorialQuestContent = {
	title: "LOC_TUTORIAL_SCIENCE_QUEST_5_TITLE",
	advisor: {
		text: "LOC_TUTORIAL_SCIENCE_QUEST_5_ADVISOR_BODY",
	},
	body: {
		text: Locale.compose("LOC_TUTORIAL_SCIENCE_QUEST_5_BODY", SCIENCE_QUEST_5_YIELD_NEEDED, SCIENCE_QUEST_5_TILES_NEEDED),
	}
}
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
		if (Online.Metaprogression.isPlayingActiveEvent()) {
			return true;
		}
		return QuestTracker.isQuestVictoryInProgress("science_victory_quest_5_tracking");
	}
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "science_victory_quest_5_tracking",
	quest: {
		title: Locale.compose("LOC_TUTORIAL_SCIENCE_QUEST_5_TRACKING_TITLE"),
		description: "LOC_TUTORIAL_SCIENCE_QUEST_5_TRACKING_BODY",
		victory: {
			type: AdvisorTypes.SCIENCE,
			order: 5,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: scienceVictoryContent5
		},
		getDescriptionLocParams: () => {
			let iNumCurrentTiles: number = 0;
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				const playerStats = player?.Stats;
				if (playerStats) {
					iNumCurrentTiles = playerStats.getNumDistrictWithXValue(SCIENCE_QUEST_5_YIELD_NEEDED, DistrictTypes.URBAN);
				}
			}
			return [SCIENCE_QUEST_5_YIELD_NEEDED, iNumCurrentTiles, SCIENCE_QUEST_5_TILES_NEEDED];
		},
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["PlayerTurnActivated", "WorkerAdded", "WorkerRemoved"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			const playerStats = player?.Stats;
			if (playerStats) {
				if (playerStats.getNumDistrictWithXValue(SCIENCE_QUEST_5_YIELD_NEEDED, DistrictTypes.URBAN) >= SCIENCE_QUEST_5_TILES_NEEDED) {
					return true;
				}
			}
		}
		return false;
	}
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "science_victory_quest_line_completed",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Science,
		title: "LOC_TUTORIAL_SCIENCE_QUEST_LINE_COMPLETED_TITLE",
		advisor: {
			text: "LOC_TUTORIAL_SCIENCE_QUEST_LINE_COMPLETED_ADVISOR_BODY",
			getLocParams: (_item: TutorialItem) => {
				let civAdj: string = "";
				const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
				if (player) {
					civAdj = player.civilizationAdjective;
				}
				return [civAdj];
			}
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
		return QuestTracker.isQuestVictoryCompleted("science_victory_quest_5_tracking");
	}
});
// ------------------------------------------------------------------
// VICTORY QUEST LINE - CULTURE
// ------------------------------------------------------------------
const cultureVictoryContent1: TutorialQuestContent = {
	title: "LOC_TUTORIAL_CULTURE_QUEST_1_TITLE",
	advisor: {
		text: "LOC_TUTORIAL_CULTURE_QUEST_1_ADVISOR_BODY",
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
		text: "LOC_TUTORIAL_CULTURE_QUEST_1_BODY",
	}
}
// CULTURE QUEST 1
TutorialManager.add({
	ID: "culture_victory_quest_1_start",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Culture,
		...cultureVictoryContent1,
		option1: {
			callback: () => {
				QuestTracker.setQuestVictoryStateById("culture_victory_quest_1_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
			}, text: "LOC_TUTORIAL_CALLOUT_ACCEPT_QUEST", actionKey: "inline-accept", closes: true
		},
		option2: calloutDeclineQuest,
	},
	onObsoleteCheck: (_item: TutorialItem) => {
		if (Online.Metaprogression.isPlayingActiveEvent()) {
			return true;
		}
		return QuestTracker.isQuestVictoryInProgress("culture_victory_quest_1_tracking");
	},
	hiders: [".tut-action-button", ".tut-action-text"],
	inputFilters: [{ inputName: "next-action" }]
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
			let pietyStudied: string = "[icon:QUEST_ITEM_OPEN]";
			let templeComplete: string = "[icon:QUEST_ITEM_OPEN]";
			let religionFounded: string = "[icon:QUEST_ITEM_OPEN]";
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				let playerCities: City[] | undefined = player.Cities?.getCities();
				if (playerCities) {
					for (let i = 0; i < playerCities.length; ++i) {
						let city = playerCities[i];
						if (city) {
							if (city.Constructibles?.hasConstructible("BUILDING_TEMPLE", false)) {
								templeComplete = "[icon:QUEST_ITEM_COMPLETED]";
								break;
							}
						}
					}
				}
				if (player.Culture?.isNodeUnlocked("NODE_CIVIC_EX_MAIN_PIETY")) {
					pietyStudied = "[icon:QUEST_ITEM_COMPLETED]";
				}
				let playerReligion: PlayerReligion | undefined = player.Religion;
				if (playerReligion != undefined && playerReligion.hasCreatedReligion() == true) {
					religionFounded = "[icon:QUEST_ITEM_COMPLETED]";
				}
			}
			return [pietyStudied, templeComplete, religionFounded];
		},
		cancelable: true,
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["ConstructibleBuildCompleted", "ConstructibleAddedtoMap", "ReligionFounded", "CultureNodeCompleted"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item: TutorialItem) => {
		if (TutorialManager.activatingEventName == "ReligionFounded") {
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				let playerReligion: PlayerReligion | undefined = player.Religion;
				if (playerReligion != undefined) {
					return true;
				}
			}
		}
		return false;
	},
});
const cultureVictoryContent2: TutorialQuestContent = {
	title: "LOC_TUTORIAL_CULTURE_QUEST_2_TITLE",
	advisor: {
		text: "LOC_TUTORIAL_CULTURE_QUEST_2_ADVISOR_BODY",
	},
	body: {
		text: "LOC_TUTORIAL_CULTURE_QUEST_2_BODY",
		getLocParams: () => {
			let missionaryName: string = "NO_UNIT";
			let missionaryIcon: string = "NO_ICON";
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player && player.Units) {
				const missionary = player.Units.getBuildUnit("UNIT_MISSIONARY");
				const missionaryDef = GameInfo.Units.lookup(missionary);
				if (missionaryDef) {
					missionaryIcon = "[icon:" + missionaryDef.UnitType + "]";
					missionaryName = missionaryDef.Name;
				}
			}
			return [missionaryIcon, missionaryName];
		},
	}
}
// ------------------------------------------------------------------
// CULTURE QUEST 2
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
		if (Online.Metaprogression.isPlayingActiveEvent()) {
			return true;
		}
		return QuestTracker.isQuestVictoryInProgress("culture_victory_quest_2_tracking");
	}
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "culture_victory_quest_2_tracking",
	quest: {
		title: Locale.compose("LOC_TUTORIAL_CULTURE_QUEST_2_TRACKING_TITLE"),
		description: "LOC_TUTORIAL_CULTURE_QUEST_2_TRACKING_BODY",
		getDescriptionLocParams: () => {
			let missionaryName: string = "";
			let missionaryIcon: string = "";
			let missionaryTrained: string = "[icon:QUEST_ITEM_OPEN]";
			let settlementConverted: string = "[icon:QUEST_ITEM_OPEN]";
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player && player.Units) {
				const missionary = player.Units.getBuildUnit("UNIT_MISSIONARY");
				const missionaryDef = GameInfo.Units.lookup(missionary);
				if (missionaryDef) {
					missionaryIcon = "[icon:" + missionaryDef.UnitType + "]";
					missionaryName = missionaryDef.Name;
					let missionaryCount = player.Units.getNumUnitsOfType(missionaryDef.UnitType);
					if (missionaryCount > 0) {
						missionaryTrained = "[icon:QUEST_ITEM_COMPLETED]";
					}
				}
				if (QuestTracker.isQuestVictoryCompleted("culture_victory_quest_2_tracking")) {
					settlementConverted = "[icon:QUEST_ITEM_COMPLETED]";
				}
			}
			return [missionaryIcon, missionaryName, missionaryTrained, settlementConverted];
		},
		victory: {
			type: AdvisorTypes.CULTURE,
			order: 2,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: cultureVictoryContent2
		},
		cancelable: true,
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["UnitAddedToMap", "CityReligionChanged"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player && TutorialManager.activatingEventName == "CityReligionChanged") {
			const activationEventData = (TutorialManager.activatingEvent as CityReligionChanged_EventData);
			if (activationEventData) {
				let thisCity = Cities.get(activationEventData.cityID);
				if (thisCity?.Religion?.majorityReligion == player.Religion?.getReligionType() && thisCity?.owner != player.id) {
					return true;
				}
			}
		}
		return false;
	},
});
// ------------------------------------------------------------------
// CULTURE QUEST 3
const CULTURE_QUEST_3_RELIC_GOAL = 1;
const cultureVictoryContent3: TutorialQuestContent = {
	title: "LOC_TUTORIAL_CULTURE_QUEST_3_TITLE",
	advisor: {
		text: "LOC_TUTORIAL_CULTURE_QUEST_3_ADVISOR_BODY",
	},
	body: {
		text: "LOC_TUTORIAL_CULTURE_QUEST_3_BODY",
		getLocParams: (_item: TutorialItem) => {
			return [CULTURE_QUEST_3_RELIC_GOAL];
		},
	},
}
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
		if (Online.Metaprogression.isPlayingActiveEvent()) {
			return true;
		}
		return QuestTracker.isQuestVictoryInProgress("culture_victory_quest_3_tracking");
	}
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "culture_victory_quest_3_tracking",
	quest: {
		title: Locale.compose("LOC_TUTORIAL_CULTURE_QUEST_3_TRACKING_TITLE"),
		description: "LOC_TUTORIAL_CULTURE_QUEST_3_TRACKING_BODY",
		getDescriptionLocParams: () => {
			let theologyStudied: string = "[icon:QUEST_ITEM_OPEN]";
			let hasEnhancerBelief: string = "[icon:QUEST_ITEM_OPEN]";
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				if (player.Culture?.isNodeUnlocked("NODE_CIVIC_EX_BRANCH_THEOLOGY")) {
					theologyStudied = "[icon:QUEST_ITEM_COMPLETED]";
				}
				let playerBeliefs = player.Religion?.getBeliefs();
				if (playerBeliefs) {
					for (const belief of playerBeliefs) {
						const beliefDef: BeliefDefinition | null = GameInfo.Beliefs.lookup(belief);
						if (beliefDef?.BeliefClassType == "BELIEF_CLASS_ENHANCER") {
							hasEnhancerBelief = "[icon:QUEST_ITEM_COMPLETED]";
							break;
						}
					}
				}

			}
			return [theologyStudied, hasEnhancerBelief];
		},
		victory: {
			type: AdvisorTypes.CULTURE,
			order: 3,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: cultureVictoryContent3
		},
		cancelable: true,
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["CultureNodeCompleted", "interface-mode-changed", "OnContextManagerClose"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			let playerBeliefs = player.Religion?.getBeliefs();
			if (playerBeliefs) {
				for (const belief of playerBeliefs) {
					const beliefDef: BeliefDefinition | null = GameInfo.Beliefs.lookup(belief);
					if (beliefDef?.BeliefClassType == "BELIEF_CLASS_ENHANCER") {
						return true;
					}
				}
			}

		}
		return false;
	},
});
// ------------------------------------------------------------------
// CULTURE QUEST 4
const CULTURE_QUEST_4_RELIC_GOAL = 6;
const cultureVictoryContent4: TutorialQuestContent = {
	title: Locale.compose("LOC_TUTORIAL_CULTURE_QUEST_4_TITLE"),
	advisor: {
		text: "LOC_TUTORIAL_CULTURE_QUEST_4_ADVISOR_BODY",
	},
	body: {
		text: "LOC_TUTORIAL_CULTURE_QUEST_4_BODY",
	}
}
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
		if (Online.Metaprogression.isPlayingActiveEvent()) {
			return true;
		}
		return QuestTracker.isQuestVictoryInProgress("culture_victory_quest_4_tracking");
	}
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "culture_victory_quest_4_tracking",
	quest: {
		title: Locale.compose("LOC_TUTORIAL_CULTURE_QUEST_4_TRACKING_TITLE"),
		description: "LOC_TUTORIAL_CULTURE_QUEST_4_TRACKING_BODY",
		getDescriptionLocParams: () => {
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			let iRelicCurrent = 0;
			let iRelicGoal = CULTURE_QUEST_4_RELIC_GOAL;
			if (player) {
				const score = player.LegacyPaths?.getScore("LEGACY_PATH_EXPLORATION_CULTURE")
				if (score) {
					iRelicCurrent = score;
				}
			}
			return [iRelicCurrent, iRelicGoal];
		},
		cancelable: true,
		victory: {
			type: AdvisorTypes.CULTURE,
			order: 4,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: cultureVictoryContent4
		},
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["GreatWorkMoved", "GreatWorkCreated", "VPChanged"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		let questMet = false;
		let iRelicCurrent = 0;
		let iRelicGoal = CULTURE_QUEST_4_RELIC_GOAL;
		if (player) {
			const score = player.LegacyPaths?.getScore("LEGACY_PATH_EXPLORATION_CULTURE")
			if (score) {
				iRelicCurrent = score;
			}
		}
		if (iRelicCurrent >= iRelicGoal) {
			questMet = true;
		}
		return questMet;
	},
});
// ------------------------------------------------------------------
// CULTURE QUEST 5
const CULTURE_QUEST_5_RELIC_GOAL = 9;
const cultureVictoryContent5: TutorialQuestContent = {
	title: Locale.compose("LOC_TUTORIAL_CULTURE_QUEST_5_TITLE"),
	advisor: {
		text: "LOC_TUTORIAL_CULTURE_QUEST_5_ADVISOR_BODY",
	},
	body: {
		text: "LOC_TUTORIAL_CULTURE_QUEST_5_BODY",
	}
}
TutorialManager.add({
	ID: "culture_victory_quest_5_start",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Culture,
		...cultureVictoryContent5,
		option1: {
			callback: () => {
				QuestTracker.setQuestVictoryStateById("culture_victory_quest_5_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
			}, text: "LOC_TUTORIAL_CALLOUT_ACCEPT_QUEST", actionKey: "inline-accept", closes: true
		},
		option2: calloutDeclineQuest,
	},
	activationCustomEvents: [QuestCompletedEventName],
	onActivateCheck: (_item: TutorialItem) => {
		return TutorialSupport.canQuestActivate("culture_victory_quest_4_tracking", "culture_victory_quest_5_tracking");
	},
	onObsoleteCheck: (_item: TutorialItem) => {
		if (Online.Metaprogression.isPlayingActiveEvent()) {
			return true;
		}
		return QuestTracker.isQuestVictoryInProgress("culture_victory_quest_5_tracking");
	}
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "culture_victory_quest_5_tracking",
	quest: {
		title: Locale.compose("LOC_TUTORIAL_CULTURE_QUEST_5_TRACKING_TITLE"),
		description: "LOC_TUTORIAL_CULTURE_QUEST_5_TRACKING_BODY",
		cancelable: true,
		victory: {
			type: AdvisorTypes.CULTURE,
			order: 5,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: cultureVictoryContent5
		},
		getDescriptionLocParams: () => {
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			let iRelicCurrent = 0;
			let iRelicGoal = CULTURE_QUEST_5_RELIC_GOAL;
			if (player) {
				const score = player.LegacyPaths?.getScore("LEGACY_PATH_EXPLORATION_CULTURE")
				if (score) {
					iRelicCurrent = score;
				}
			}
			return [iRelicCurrent, iRelicGoal];
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
		let iRelicCurrent = 0;
		let iRelicGoal = CULTURE_QUEST_5_RELIC_GOAL;
		if (player) {
			const score = player.LegacyPaths?.getScore("LEGACY_PATH_EXPLORATION_CULTURE")
			if (score) {
				iRelicCurrent = score;
			}
		}
		if (iRelicCurrent >= iRelicGoal) {
			questMet = true;
		}
		return questMet;
	},
});
// ------------------------------------------------------------------
// CULTURE QUEST 6
const CULTURE_QUEST_6_RELIC_GOAL = 12;
const cultureVictoryContent6: TutorialQuestContent = {
	title: Locale.compose("LOC_TUTORIAL_CULTURE_QUEST_6_TITLE"),
	advisor: {
		text: "LOC_TUTORIAL_CULTURE_QUEST_6_ADVISOR_BODY",
	},
	body: {
		text: "LOC_TUTORIAL_CULTURE_QUEST_6_BODY",
	}
}
TutorialManager.add({
	ID: "culture_victory_quest_6_start",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Culture,
		...cultureVictoryContent6,
		option1: {
			callback: () => {
				QuestTracker.setQuestVictoryStateById("culture_victory_quest_6_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
			}, text: "LOC_TUTORIAL_CALLOUT_ACCEPT_QUEST", actionKey: "inline-accept", closes: true
		},
		option2: calloutDeclineQuest,
	},
	activationCustomEvents: [QuestCompletedEventName],
	onActivateCheck: (_item: TutorialItem) => {
		return TutorialSupport.canQuestActivate("culture_victory_quest_5_tracking", "culture_victory_quest_6_tracking");
	},
	onObsoleteCheck: (_item: TutorialItem) => {
		if (Online.Metaprogression.isPlayingActiveEvent()) {
			return true;
		}
		return QuestTracker.isQuestVictoryInProgress("culture_victory_quest_6_tracking");
	}
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "culture_victory_quest_6_tracking",
	quest: {
		title: Locale.compose("LOC_TUTORIAL_CULTURE_QUEST_6_TRACKING_TITLE"),
		description: "LOC_TUTORIAL_CULTURE_QUEST_6_TRACKING_BODY",
		cancelable: true,
		victory: {
			type: AdvisorTypes.CULTURE,
			order: 6,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: cultureVictoryContent6
		},
		getDescriptionLocParams: () => {
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			let iRelicCurrent = 0;
			let iRelicGoal = CULTURE_QUEST_6_RELIC_GOAL;
			if (player) {
				const score = player.LegacyPaths?.getScore("LEGACY_PATH_EXPLORATION_CULTURE")
				if (score) {
					iRelicCurrent = score;
				}
			}
			return [iRelicCurrent, iRelicGoal];
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
		let iRelicCurrent = 0;
		let iRelicGoal = CULTURE_QUEST_6_RELIC_GOAL;
		if (player) {
			const score = player.LegacyPaths?.getScore("LEGACY_PATH_EXPLORATION_CULTURE")
			if (score) {
				iRelicCurrent = score;
			}
		}
		if (iRelicCurrent >= iRelicGoal) {
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
		return QuestTracker.isQuestVictoryCompleted("culture_victory_quest_6_tracking");
	}
});
// ------------------------------------------------------------------
// VICTORY QUEST LINE - ECONOMIC
// ------------------------------------------------------------------
// ECONOMIC ADVISOR QUEST 1
const economicVictoryContent1: TutorialQuestContent = {
	title: "LOC_TUTORIAL_ECONOMIC_QUEST_1_TITLE",
	advisor: {
		text: "LOC_TUTORIAL_ECONOMIC_QUEST_1_ADVISOR_BODY",
	},
	body: {
		text: "LOC_TUTORIAL_ECONOMIC_QUEST_1_BODY",
		getLocParams: () => {
			let commanderIcon: string = "";
			let commanderName: string = "";
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player && player.Units) {
				const fleetCommander = player.Units.getBuildUnit("UNIT_FLEET_COMMANDER");
				const commanderDef = GameInfo.Units.lookup(fleetCommander);
				if (commanderDef) {
					commanderIcon = "[icon:" + commanderDef.UnitType + "]";
					commanderName = commanderDef.Name;
				}
			}
			return [commanderIcon, commanderName];
		},
	}
}
TutorialManager.add({
	ID: "economic_victory_quest_1_start",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Economic,
		...economicVictoryContent1,
		option1: { callback: () => { }, text: "LOC_TUTORIAL_CALLOUT_ACCEPT_QUEST", actionKey: "inline-accept", closes: true, nextID: "economic_victory_quest_1_tracking" },
		option2: calloutDeclineQuest,
	},
	onObsoleteCheck: (_item: TutorialItem) => {
		if (Online.Metaprogression.isPlayingActiveEvent()) {
			return true;
		}
		return QuestTracker.isQuestVictoryInProgress("economic_victory_quest_1_tracking");
	},
	onCleanUp: () => {
		QuestTracker.setQuestVictoryStateById("economic_victory_quest_1_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
	},
	hiders: [".tut-action-button", ".tut-action-text"],
	inputFilters: [{ inputName: "next-action" }]
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "economic_victory_quest_1_tracking",
	quest: {
		title: Locale.compose("LOC_TUTORIAL_ECONOMIC_QUEST_1_TRACKING_TITLE"),
		description: "LOC_TUTORIAL_ECONOMIC_QUEST_1_TRACKING_BODY",
		victory: {
			type: AdvisorTypes.ECONOMIC,
			order: 1,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: economicVictoryContent1
		},
		getDescriptionLocParams: () => {
			let cartographyResearched: string = "[icon:QUEST_ITEM_OPEN]";
			let astronomyResearched: string = "[icon:QUEST_ITEM_OPEN]";
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				if (player.Techs?.isNodeUnlocked("NODE_TECH_EX_CARTOGRAPHY")) {
					cartographyResearched = "[icon:QUEST_ITEM_COMPLETED]";
				}
				if (player.Techs?.isNodeUnlocked("NODE_TECH_EX_ASTRONOMY")) {
					astronomyResearched = "[icon:QUEST_ITEM_COMPLETED]";
				}
			}
			return [cartographyResearched, astronomyResearched];
		},
		cancelable: true,
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["TechNodeCompleted"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			if (player.Techs?.isNodeUnlocked("NODE_TECH_EX_CARTOGRAPHY") && player.Techs?.isNodeUnlocked("NODE_TECH_EX_ASTRONOMY")) {
				return true;
			}
		}
		return false;
	},
});
// ------------------------------------------------------------------
const economicVictoryContent2: TutorialQuestContent = {
	title: "LOC_TUTORIAL_ECONOMIC_QUEST_2_TITLE",
	advisor: {
		text: "LOC_TUTORIAL_ECONOMIC_QUEST_2_ADVISOR_BODY",
	},
	body: {
		text: "LOC_TUTORIAL_ECONOMIC_QUEST_2_BODY",
		getLocParams: () => {
			let commanderIcon: string = "";
			let commanderName: string = "";
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player && player.Units) {
				const fleetCommander = player.Units.getBuildUnit("UNIT_FLEET_COMMANDER");
				const commanderDef = GameInfo.Units.lookup(fleetCommander);
				if (commanderDef) {
					commanderIcon = "[icon:" + commanderDef.UnitType + "]";
					commanderName = commanderDef.Name;
				}
			}
			return [commanderIcon, commanderName];
		}
	}
}
TutorialManager.add({
	ID: "economic_victory_quest_2_start",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Economic,
		...economicVictoryContent2,
		option1: calloutBegin,
	},
	onCleanUp: () => {
		QuestTracker.setQuestVictoryStateById("economic_victory_quest_2_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
	},
	activationCustomEvents: [QuestCompletedEventName],
	onActivateCheck: (_item: TutorialItem) => {
		return TutorialSupport.canQuestActivate("economic_victory_quest_1_tracking", "economic_victory_quest_2_tracking");
	},
	onObsoleteCheck: (_item: TutorialItem) => {
		if (Online.Metaprogression.isPlayingActiveEvent()) {
			return true;
		}
		return QuestTracker.isQuestVictoryInProgress("economic_victory_quest_2_tracking");
	}
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "economic_victory_quest_2_tracking",
	quest: {
		title: Locale.compose("LOC_TUTORIAL_ECONOMIC_QUEST_2_TRACKING_TITLE"),
		description: "LOC_TUTORIAL_ECONOMIC_QUEST_2_TRACKING_BODY",
		victory: {
			type: AdvisorTypes.ECONOMIC,
			order: 2,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: economicVictoryContent2
		},
		getDescriptionLocParams: () => {
			let commanderIcon: string = "";
			let commanderName: string = "";
			let settlementInDistantLands: string = "[icon:QUEST_ITEM_OPEN]";
			let treasureResource: string = "[icon:QUEST_ITEM_OPEN]";
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player && player.Units) {
				let playerCities: City[] | undefined = player.Cities?.getCities();
				if (playerCities) {
					for (let i = 0; i < playerCities.length; ++i) {
						let city: City = playerCities[i];
						if (city != null && city.isDistantLands) {
							settlementInDistantLands = "[icon:QUEST_ITEM_COMPLETED]";
							if (city.Resources != null) {
								if (city.Resources.getNumTreasureFleetResources() > 0) {
									treasureResource = "[icon:QUEST_ITEM_COMPLETED]";
								}
							}
						}
					}
				}
				const fleetCommander = player.Units.getBuildUnit("UNIT_FLEET_COMMANDER");
				const commanderDef = GameInfo.Units.lookup(fleetCommander);
				if (commanderDef) {
					commanderIcon = "[icon:" + commanderDef.UnitType + "]";
					commanderName = commanderDef.Name;
				}
			}
			return [settlementInDistantLands, treasureResource, commanderIcon, commanderName];
		},
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["ConstructibleAddedToMap", "CityProductionCompleted", "CityAddedToMap", "UnitPromoted"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			let playerCities: City[] | undefined = player.Cities?.getCities();
			if (playerCities) {
				for (let i = 0; i < playerCities.length; ++i) {
					let city: City = playerCities[i];
					if (city != null && city.isDistantLands) {
						if (city.Resources != null) {
							if (city.Resources.getNumTreasureFleetResources() > 0) {
								return true;
							}
						}
					}
				}
			}
		}
		return false;
	},
});
const economicVictoryContent3: TutorialQuestContent = {
	title: "LOC_TUTORIAL_ECONOMIC_QUEST_3_TITLE",
	advisor: {
		text: "LOC_TUTORIAL_ECONOMIC_QUEST_3_ADVISOR_BODY",
	},
	body: {
		text: "LOC_TUTORIAL_ECONOMIC_QUEST_3_BODY",
	}
}
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "economic_victory_quest_3_start",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Economic,
		...economicVictoryContent3,
		option1: calloutBegin,
	},
	onCleanUp: () => {
		QuestTracker.setQuestVictoryStateById("economic_victory_quest_3_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
	},
	activationCustomEvents: [QuestCompletedEventName],
	onActivateCheck: (_item: TutorialItem) => {
		return TutorialSupport.canQuestActivate("economic_victory_quest_2_tracking", "economic_victory_quest_3_tracking");
	},
	onObsoleteCheck: (_item: TutorialItem) => {
		if (Online.Metaprogression.isPlayingActiveEvent()) {
			return true;
		}
		return QuestTracker.isQuestVictoryInProgress("economic_victory_quest_3_tracking");
	}
});
// ------------------------------------------------------------------
const ECONOMIC_QUEST_4_RESOURCE_GOAL = 5;
TutorialManager.add({
	ID: "economic_victory_quest_3_tracking",
	quest: {
		title: Locale.compose("LOC_TUTORIAL_ECONOMIC_QUEST_3_TRACKING_TITLE"),
		description: "LOC_TUTORIAL_ECONOMIC_QUEST_3_TRACKING_BODY",
		victory: {
			type: AdvisorTypes.ECONOMIC,
			order: 3,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: economicVictoryContent3
		},
		getDescriptionLocParams: () => {
			let itreasureResourcesImproved: number = 0;
			let itreasureResourcesGoal: number = ECONOMIC_QUEST_4_RESOURCE_GOAL;
			let treasureFleetCreated: string = "[icon:QUEST_ITEM_OPEN]";
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player && player.Units) {
				let playerCities: City[] | undefined = player.Cities?.getCities();
				if (playerCities) {
					for (let i = 0; i < playerCities.length; ++i) {
						let city: City = playerCities[i];
						if (city != null && city.isDistantLands && city.Resources)
							itreasureResourcesImproved += city.Resources.getNumTreasureFleetResources();
					}
				}
			}
			return [itreasureResourcesImproved, itreasureResourcesGoal, treasureFleetCreated];
		},
		cancelable: true,
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["UnitAddedToMap", "CityTileOwnershipChanged"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item: TutorialItem) => {
		const player = Players.get(GameContext.localPlayerID);
		if (player && player.Units) {
			let playerUnits = player.Units.getUnits();
			for (let i = 0; i < playerUnits.length; ++i) {
				let thisUnit: Unit = playerUnits[i];
				const unitDefinition: UnitDefinition | null = GameInfo.Units.lookup(thisUnit.type); //this part seems redundant but sometimes the type isn't easy to find
				if (thisUnit != null && unitDefinition != null && unitDefinition.UnitType == "UNIT_TREASURE_FLEET") {
					return true;
					break;
				}
			}
		}
		return false;
	},
});
const economicVictoryContent4: TutorialQuestContent = {
	title: Locale.compose("LOC_TUTORIAL_ECONOMIC_QUEST_4_TITLE"),
	advisor: {
		text: "LOC_TUTORIAL_ECONOMIC_QUEST_4_ADVISOR_BODY",
	},
	body: {
		text: "LOC_TUTORIAL_ECONOMIC_QUEST_4_BODY",
	}
}
// ------------------------------------------------------------------
// ------------------------------------------------------------------
// ECONOMIC QUEST 4
const ECONOMIC_QUEST_4_TREASURE_GOAL = 10;
TutorialManager.add({
	ID: "economic_victory_quest_4_start",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Culture,
		...economicVictoryContent4,
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
		if (Online.Metaprogression.isPlayingActiveEvent()) {
			return true;
		}
		return QuestTracker.isQuestVictoryInProgress("economic_victory_quest_4_tracking");
	}
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "economic_victory_quest_4_tracking",
	quest: {
		title: Locale.compose("LOC_TUTORIAL_ECONOMIC_QUEST_4_TRACKING_TITLE"),
		description: "LOC_TUTORIAL_ECONOMIC_QUEST_4_TRACKING_BODY",
		getDescriptionLocParams: () => {
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			let iTreasureVPCurrent = 0;
			let iTreasureVPGoal = ECONOMIC_QUEST_4_TREASURE_GOAL;
			if (player) {
				const score = player.LegacyPaths?.getScore("LEGACY_PATH_EXPLORATION_ECONOMIC")
				if (score) {
					iTreasureVPCurrent = score;
				}
			}
			return [iTreasureVPCurrent, iTreasureVPGoal];
		},
		cancelable: true,
		victory: {
			type: AdvisorTypes.ECONOMIC,
			order: 4,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: economicVictoryContent4
		},
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["VPChanged"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		let questMet = false;
		let iTreasureVPCurrent = 0;
		let iTreasureVPGoal = ECONOMIC_QUEST_4_TREASURE_GOAL;
		if (player) {
			const score = player.LegacyPaths?.getScore("LEGACY_PATH_EXPLORATION_ECONOMIC")
			if (score) {
				iTreasureVPCurrent = score;
			}
		}
		if (iTreasureVPCurrent >= iTreasureVPGoal) {
			questMet = true;
		}
		return questMet;
	},
});
// ------------------------------------------------------------------
// ECONOMIC QUEST 5
const ECONOMIC_QUEST_5_TREASURE_GOAL = 20;
const economicVictoryContent5: TutorialQuestContent = {
	title: Locale.compose("LOC_TUTORIAL_ECONOMIC_QUEST_5_TITLE"),
	advisor: {
		text: "LOC_TUTORIAL_ECONOMIC_QUEST_5_ADVISOR_BODY",
	},
	body: {
		text: "LOC_TUTORIAL_ECONOMIC_QUEST_5_BODY",
	}
}
TutorialManager.add({
	ID: "economic_victory_quest_5_start",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Culture,
		...economicVictoryContent5,
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
		if (Online.Metaprogression.isPlayingActiveEvent()) {
			return true;
		}
		return QuestTracker.isQuestVictoryInProgress("economic_victory_quest_5_tracking");
	}
}, { version: 0, canDeliver: isNotLiveEventPlayer });
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "economic_victory_quest_5_tracking",
	quest: {
		title: Locale.compose("LOC_TUTORIAL_ECONOMIC_QUEST_5_TRACKING_TITLE"),
		description: "LOC_TUTORIAL_ECONOMIC_QUEST_5_TRACKING_BODY",
		cancelable: true,
		victory: {
			type: AdvisorTypes.ECONOMIC,
			order: 5,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: economicVictoryContent5
		},
		getDescriptionLocParams: () => {
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			let iTreasureVPCurrent = 0;
			let iTreasureVPGoal = ECONOMIC_QUEST_5_TREASURE_GOAL;
			if (player) {
				const score = player.LegacyPaths?.getScore("LEGACY_PATH_EXPLORATION_ECONOMIC")
				if (score) {
					iTreasureVPCurrent = score;
				}
			}
			return [iTreasureVPCurrent, iTreasureVPGoal];
		},
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["VPChanged"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		let questMet = false;
		let iTreasureVPCurrent = 0;
		let iTreasureVPGoal = ECONOMIC_QUEST_5_TREASURE_GOAL;
		if (player) {
			const score = player.LegacyPaths?.getScore("LEGACY_PATH_EXPLORATION_ECONOMIC")
			if (score) {
				iTreasureVPCurrent = score;
			}
		}
		if (iTreasureVPCurrent >= iTreasureVPGoal) {
			questMet = true;
		}
		return questMet;
	},
}, { version: 0, canDeliver: isNotLiveEventPlayer });
// ------------------------------------------------------------------
// ECONOMIC QUEST 6
const ECONOMIC_QUEST_6_TREASURE_GOAL = 30;
const economicVictoryContent6: TutorialQuestContent = {
	title: Locale.compose("LOC_TUTORIAL_ECONOMIC_QUEST_6_TITLE"),
	advisor: {
		text: "LOC_TUTORIAL_ECONOMIC_QUEST_6_ADVISOR_BODY",
	},
	body: {
		text: "LOC_TUTORIAL_ECONOMIC_QUEST_6_BODY",
	}
}
TutorialManager.add({
	ID: "economic_victory_quest_6_start",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Culture,
		...economicVictoryContent6,
		option1: {
			callback: () => {
				QuestTracker.setQuestVictoryStateById("economic_victory_quest_6_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
			}, text: "LOC_TUTORIAL_CALLOUT_ACCEPT_QUEST", actionKey: "inline-accept", closes: true
		},
		option2: calloutDeclineQuest,
	},
	activationCustomEvents: [QuestCompletedEventName],
	onActivateCheck: (_item: TutorialItem) => {
		return TutorialSupport.canQuestActivate("economic_victory_quest_5_tracking", "economic_victory_quest_6_tracking");
	},
	onObsoleteCheck: (_item: TutorialItem) => {
		if (Online.Metaprogression.isPlayingActiveEvent()) {
			return true;
		}
		return QuestTracker.isQuestVictoryInProgress("economic_victory_quest_6_tracking");
	}
}, { version: 0, canDeliver: isNotLiveEventPlayer });
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "economic_victory_quest_6_tracking",
	quest: {
		title: Locale.compose("LOC_TUTORIAL_ECONOMIC_QUEST_6_TRACKING_TITLE"),
		description: "LOC_TUTORIAL_ECONOMIC_QUEST_6_TRACKING_BODY",
		cancelable: true,
		victory: {
			type: AdvisorTypes.ECONOMIC,
			order: 6,
			state: VictoryQuestState.QUEST_UNSTARTED,
			content: economicVictoryContent6
		},
		getDescriptionLocParams: () => {
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			let iTreasureVPCurrent = 0;
			let iTreasureVPGoal = ECONOMIC_QUEST_6_TREASURE_GOAL;
			if (player) {
				const score = player.LegacyPaths?.getScore("LEGACY_PATH_EXPLORATION_ECONOMIC")
				if (score) {
					iTreasureVPCurrent = score;
				}
			}
			return [iTreasureVPCurrent, iTreasureVPGoal];
		},
	},
	runAllTurns: true,
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["VPChanged"],
	onCleanUp: (item: TutorialItem) => {
		TutorialSupport.activateNextTrackedQuest(item);
	},
	onCompleteCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		let questMet = false;
		let iTreasureVPCurrent = 0;
		let iTreasureVPGoal = ECONOMIC_QUEST_6_TREASURE_GOAL;
		if (player) {
			const score = player.LegacyPaths?.getScore("LEGACY_PATH_EXPLORATION_ECONOMIC")
			if (score) {
				iTreasureVPCurrent = score;
			}
		}
		if (iTreasureVPCurrent >= iTreasureVPGoal) {
			questMet = true;
		}
		return questMet;
	},
}, { version: 0, canDeliver: isNotLiveEventPlayer });
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "economic_victory_quest_line_completed",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		advisorType: TutorialAdvisorType.Economic,
		title: "LOC_TUTORIAL_ECONOMIC_QUEST_LINE_COMPLETED_TITLE",
		advisor: {
			text: "LOC_TUTORIAL_ECONOMIC_QUEST_LINE_COMPLETED_ADVISOR_BODY",
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
		return QuestTracker.isQuestVictoryCompleted("economic_victory_quest_6_tracking");
	}
});

// ------------------------------------------------------------------
TutorialManager.process("exploration quest items");		// Must appear at end