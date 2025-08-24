/**
 * @file tutorial-quest-items-antiquity.ts
 * @copyright 2024, Firaxis Games
 * @description Defines the sequence of tutorial quest items for the antiquity age.
 *
*/
import { TutorialAdvisorType, TutorialAnchorPosition } from '/base-standard/ui/tutorial/tutorial-item.js';
import TutorialManager from '/base-standard/ui/tutorial/tutorial-manager.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
import * as TutorialSupport from '/base-standard/ui/tutorial/tutorial-support.js';
import QuestTracker, { QuestCompletedEventName } from '/base-standard/ui/quest-tracker/quest-tracker.js';
import { VictoryQuestState } from '/base-standard/ui/quest-tracker/quest-item.js';
// ---------------------------------------------------------------------------
// Defines for option buttons
//
const calloutBegin = { callback: () => { }, text: "LOC_TUTORIAL_CALLOUT_BEGIN", actionKey: "inline-accept", closes: true };
const calloutDeclineQuest = { callback: () => { }, text: "LOC_TUTORIAL_CALLOUT_DECLINE_QUEST", actionKey: "inline-cancel", closes: true };
const calloutClose = { callback: () => { }, text: "LOC_TUTORIAL_CALLOUT_CLOSE", actionKey: "inline-cancel", closes: true };
// ---------------------------------------------------------------------------
// Defines for version validation
//
const isAssyrianPlayer = (() => {
    const player = Players.get(GameContext.localPlayerID);
    if (!player) {
        console.error("assyria-quest-items: isValidAssyrianPlayer(): No local player available.");
        return false;
    }
    const playerCiv = GameInfo.Civilizations.lookup(player.civilizationType);
    const assyriaCiv = GameInfo.Civilizations.lookup("CIVILIZATION_ASSYRIA");
    if (!playerCiv || !assyriaCiv) {
        return false;
    }
    if (playerCiv.CivilizationType == assyriaCiv.CivilizationType) {
        return true;
    }
    return false;
})();
const isValidAssyrianPlayer = (_item) => {
    return isAssyrianPlayer;
};
// ------------------------------------------------------------------
// ALT VICTORY QUEST LINE - SCIENCE
// ------------------------------------------------------------------
const scienceVictoryContent1 = {
    title: "LOC_TUTORIAL_SCIENCE_QUEST_1_ACCEPTED_TITLE",
    advisor: {
        text: "LOC_TUTORIAL_SCIENCE_QUEST_1_ACCEPTED_ADVISOR_BODY_ASSYRIA",
    },
    body: {
        text: "LOC_TUTORIAL_SCIENCE_QUEST_1_ACCEPTED_BODY_ASSYRIA",
    }
};
// ------------------------------------------------------------------------------------------------------------------------------------
TutorialManager.add({
    ID: "science_victory_quest_1_accepted",
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleCenter,
        advisorType: TutorialAdvisorType.Science,
        ...scienceVictoryContent1,
        option1: calloutBegin,
    },
    onCleanUp: (_item) => {
        QuestTracker.setQuestVictoryStateById("science_victory_quest_1_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
    },
    onObsoleteCheck: (_item) => {
        return QuestTracker.isQuestVictoryInProgress("science_victory_quest_1_tracking");
    },
    nextID: "legacy_quest_tracker",
}, { version: 1, canDeliver: isValidAssyrianPlayer });
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "science_victory_quest_1_tracking",
    quest: {
        title: Locale.compose("LOC_TUTORIAL_SCIENCE_QUEST_1_TRACKING_TITLE"),
        description: "LOC_TUTORIAL_SCIENCE_QUEST_1_TRACKING_BODY_ASSYRIA",
        getDescriptionLocParams: () => {
            let birtutuStudied = "[icon:QUEST_ITEM_OPEN]";
            let disciplineStudied = "[icon:QUEST_ITEM_OPEN]";
            const player = Players.get(GameContext.localPlayerID);
            if (player) {
                let playerCivics = player.Culture;
                if (playerCivics?.isNodeUnlocked("NODE_CIVIC_AQ_MAIN_DISCIPLINE")) {
                    disciplineStudied = "[icon:QUEST_ITEM_COMPLETED]";
                }
                if (playerCivics?.isNodeUnlocked("NODE_CIVIC_AQ_ASSYRIA_BIRTUTU")) {
                    birtutuStudied = "[icon:QUEST_ITEM_COMPLETED]";
                }
            }
            return [birtutuStudied, disciplineStudied];
        },
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
    completionEngineEvents: ["CultureNodeCompleted"],
    onCleanUp: (item) => {
        TutorialSupport.activateNextTrackedQuest(item);
    },
    onCompleteCheck: (_item) => {
        let birtutuStudied = false;
        let disciplineStudied = false;
        const player = Players.get(GameContext.localPlayerID);
        if (player) {
            let playerCivics = player.Culture;
            if (playerCivics?.isNodeUnlocked("NODE_CIVIC_AQ_MAIN_DISCIPLINE")) {
                disciplineStudied = true;
            }
            if (playerCivics?.isNodeUnlocked("NODE_CIVIC_AQ_ASSYRIA_BIRTUTU")) {
                birtutuStudied = true;
            }
        }
        if (birtutuStudied && disciplineStudied) {
            return true;
        }
        return false;
    },
}, { version: 1, canDeliver: isValidAssyrianPlayer });
// ------------------------------------------------------------------------------------------------------------------------------------
// SCIENCE QUEST 2
const TARGET_NUM_UNITS_IN_ARMY_ASSYRIA = 4;
const scienceVictoryContent2 = {
    title: Locale.compose("LOC_TUTORIAL_SCIENCE_QUEST_2_TITLE"),
    advisor: {
        text: Locale.compose("LOC_TUTORIAL_SCIENCE_QUEST_2_ADVISOR_BODY_ASSYRIA"),
    },
    body: {
        text: "LOC_TUTORIAL_SCIENCE_QUEST_2_BODY_ASSYRIA",
        getLocParams: (_item) => {
            let commanderName = "null";
            let commanderIcon = "null";
            const player = Players.get(GameContext.localPlayerID);
            if (player && player.Units) {
                const armyCommander = player.Units.getBuildUnit("UNIT_ARMY_COMMANDER");
                const commanderDefinition = GameInfo.Units.lookup(armyCommander);
                if (commanderDefinition) {
                    commanderIcon = "[icon:" + commanderDefinition.UnitType + "]";
                    commanderName = commanderDefinition.Name;
                }
            }
            return [commanderIcon, commanderName];
        }
    }
};
// ------------------------------------------------------------------
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
    onActivateCheck: (_item) => {
        return TutorialSupport.canQuestActivate("science_victory_quest_1_tracking", "science_victory_quest_2_tracking");
    },
    onCleanUp: (_item) => {
        QuestTracker.setQuestVictoryStateById("science_victory_quest_2_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
    },
    onObsoleteCheck: (_item) => {
        return QuestTracker.isQuestVictoryInProgress("science_victory_quest_2_tracking");
    },
}, { version: 1, canDeliver: isValidAssyrianPlayer });
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "science_victory_quest_2_tracking",
    quest: {
        title: Locale.compose("LOC_TUTORIAL_SCIENCE_QUEST_2_TRACKING_TITLE"),
        description: "LOC_TUTORIAL_SCIENCE_QUEST_2_TRACKING_BODY_ASSYRIA",
        getDescriptionLocParams: () => {
            let tupsarrutuStudied = "[icon:QUEST_ITEM_OPEN]";
            let numberTrained = 0;
            let numberPacked = 0;
            const player = Players.get(GameContext.localPlayerID);
            if (player && player.Units) {
                let playerCivics = player.Culture;
                if (playerCivics?.isNodeUnlocked("NODE_CIVIC_AQ_ASSYRIA_TUPSARRUTU")) {
                    tupsarrutuStudied = "[icon:QUEST_ITEM_COMPLETED]";
                }
                const unitList = player.Units.getUnits();
                if (unitList != null) {
                    let numCombatUnits = 0;
                    let maxArmyCount = 0;
                    for (let i = 0; i < unitList.length; ++i) {
                        let unit = unitList[i];
                        if (unit.Combat?.canAttack) {
                            numCombatUnits++;
                        }
                        const army = Armies.get(unit.armyId);
                        if (army) {
                            if (army.unitCount > maxArmyCount) {
                                maxArmyCount = army.unitCount;
                            }
                        }
                    }
                    numberTrained = numCombatUnits;
                    numberPacked = maxArmyCount;
                }
            }
            return [tupsarrutuStudied, TARGET_NUM_UNITS_IN_ARMY_ASSYRIA, numberTrained, numberPacked];
        },
        victory: {
            type: AdvisorTypes.SCIENCE,
            order: 2,
            state: VictoryQuestState.QUEST_UNSTARTED,
            content: scienceVictoryContent2
        },
    },
    runAllTurns: true,
    activationCustomEvents: ["user-interface-loaded-and-ready"],
    completionEngineEvents: ["UnitAddedToArmy", "UnitRemovedFromArmy", "CultureNodeCompleted"],
    onCompleteCheck: (_item) => {
        let hasUnitsPacked = false;
        let tupsarrutuStudied = false;
        const player = Players.get(GameContext.localPlayerID);
        if (player && player.Units) {
            let playerCivics = player.Culture;
            if (playerCivics?.isNodeUnlocked("NODE_CIVIC_AQ_ASSYRIA_TUPSARRUTU")) {
                tupsarrutuStudied = true;
            }
            const unitList = player.Units.getUnits();
            if (unitList != null) {
                for (let i = 0; i < unitList.length; ++i) {
                    const army = Armies.get(unitList[i].armyId);
                    if (army) {
                        let unitCount = army.unitCount;
                        if (unitCount >= TARGET_NUM_UNITS_IN_ARMY_ASSYRIA) {
                            hasUnitsPacked = true;
                        }
                    }
                }
            }
        }
        return hasUnitsPacked && tupsarrutuStudied;
    },
}, { version: 1, canDeliver: isValidAssyrianPlayer });
// ------------------------------------------------------------------------------------------------------------------------------------
// SCIENCE QUEST 3
const scienceVictoryContent3 = {
    title: Locale.compose("LOC_TUTORIAL_SCIENCE_QUEST_3_TITLE"),
    advisor: {
        text: Locale.compose("LOC_TUTORIAL_SCIENCE_QUEST_3_ADVISOR_BODY_ASSYRIA"),
    },
    body: {
        text: "LOC_TUTORIAL_SCIENCE_QUEST_3_BODY_ASSYRIA",
    }
};
// ------------------------------------------------------------------
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
    onActivateCheck: (_item) => {
        return TutorialSupport.canQuestActivate("science_victory_quest_2_tracking", "science_victory_quest_3_tracking");
    },
    onCleanUp: (_item) => {
        QuestTracker.setQuestVictoryStateById("science_victory_quest_3_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
    },
    onObsoleteCheck: (_item) => {
        return QuestTracker.isQuestVictoryInProgress("science_victory_quest_3_tracking");
    },
}, { version: 1, canDeliver: isValidAssyrianPlayer });
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "science_victory_quest_3_tracking",
    quest: {
        title: Locale.compose("LOC_TUTORIAL_SCIENCE_QUEST_3_TRACKING_TITLE"),
        description: "LOC_TUTORIAL_SCIENCE_QUEST_3_TRACKING_BODY_ASSYRIA",
        getDescriptionLocParams: () => {
            let settlementTaken = 0;
            let settlementTarget = 1;
            const player = Players.get(GameContext.localPlayerID);
            if (player) {
                let playerCities = player.Cities?.getCities();
                if (playerCities) {
                    settlementTaken = 0;
                    for (let i = 0; i < playerCities.length; ++i) {
                        let city = playerCities[i];
                        if (city != null) {
                            if (city.originalOwner != player.id) {
                                settlementTaken++;
                            }
                        }
                    }
                }
            }
            return [settlementTaken, settlementTarget];
        },
        victory: {
            type: AdvisorTypes.SCIENCE,
            order: 3,
            state: VictoryQuestState.QUEST_UNSTARTED,
            content: scienceVictoryContent3
        },
    },
    runAllTurns: true,
    activationCustomEvents: ["user-interface-loaded-and-ready"],
    completionEngineEvents: ["CityAddedToMap"],
    onCompleteCheck: (_item) => {
        const player = Players.get(GameContext.localPlayerID);
        if (player) {
            let playerCities = player.Cities?.getCities();
            if (playerCities) {
                for (let i = 0; i < playerCities.length; ++i) {
                    let city = playerCities[i];
                    if (city != null) {
                        if (city.originalOwner != player.id) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    },
}, { version: 1, canDeliver: isValidAssyrianPlayer });
// ------------------------------------------------------------------
// SCIENCE QUEST 4
const SCIENCE_QUEST_4_CODEX_GOAL_ASSYRIA = 3;
const scienceVictoryContent4 = {
    title: Locale.compose("LOC_TUTORIAL_SCIENCE_QUEST_4_TITLE"),
    advisor: {
        text: Locale.compose("LOC_TUTORIAL_SCIENCE_QUEST_4_ADVISOR_BODY_ASSYRIA"),
    },
    body: {
        text: "LOC_TUTORIAL_SCIENCE_QUEST_4_BODY_ASSYRIA",
        getLocParams: (_item) => {
            return [SCIENCE_QUEST_4_CODEX_GOAL_ASSYRIA];
        }
    }
};
// ------------------------------------------------------------------
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
    onActivateCheck: (_item) => {
        return TutorialSupport.canQuestActivate("science_victory_quest_3_tracking", "science_victory_quest_4_tracking");
    },
    onCleanUp: (_item) => {
        QuestTracker.setQuestVictoryStateById("science_victory_quest_4_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
    },
    onObsoleteCheck: (_item) => {
        return QuestTracker.isQuestVictoryInProgress("science_victory_quest_4_tracking");
    },
}, { version: 1, canDeliver: isValidAssyrianPlayer });
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "science_victory_quest_4_tracking",
    quest: {
        title: Locale.compose("LOC_TUTORIAL_SCIENCE_QUEST_4_TRACKING_TITLE"),
        description: "LOC_TUTORIAL_SCIENCE_QUEST_4_TRACKING_BODY_ASSYRIA",
        getDescriptionLocParams: () => {
            let iCodexCurrent = 0;
            let iCodexGoal = SCIENCE_QUEST_4_CODEX_GOAL_ASSYRIA;
            let royalLibraryComplete = "[icon:QUEST_ITEM_OPEN]";
            const player = Players.get(GameContext.localPlayerID);
            if (player) {
                const playerCities = player.Cities?.getCities();
                if (playerCities) {
                    for (let i = 0; i < playerCities.length; ++i) {
                        let city = playerCities[i];
                        if (city) {
                            if (city.Constructibles?.hasConstructible("BUILDING_ROYAL_LIBRARY", false)) {
                                royalLibraryComplete = "[icon:QUEST_ITEM_COMPLETED]";
                            }
                        }
                    }
                }
                const score = player.LegacyPaths?.getScore("LEGACY_PATH_ANTIQUITY_SCIENCE");
                if (score) {
                    iCodexCurrent = score;
                }
            }
            return [royalLibraryComplete, iCodexCurrent, iCodexGoal];
        },
        victory: {
            type: AdvisorTypes.SCIENCE,
            order: 4,
            state: VictoryQuestState.QUEST_UNSTARTED,
            content: scienceVictoryContent4
        },
    },
    runAllTurns: true,
    activationCustomEvents: ["user-interface-loaded-and-ready"],
    completionEngineEvents: ["ConstructibleBuildCompleted", "ConstructibleAddedToMap", "LegacyPathMilestoneCompleted"],
    onCompleteCheck: (_item) => {
        let hasRoyalLibrary = false;
        let iCodexCurrent = 0;
        let iCodexGoal = SCIENCE_QUEST_4_CODEX_GOAL_ASSYRIA;
        const player = Players.get(GameContext.localPlayerID);
        if (player) {
            const playerCities = player.Cities?.getCities();
            if (playerCities) {
                for (let i = 0; i < playerCities.length; ++i) {
                    let city = playerCities[i];
                    if (city) {
                        if (city.Constructibles?.hasConstructible("BUILDING_ROYAL_LIBRARY", false)) {
                            hasRoyalLibrary = true;
                        }
                    }
                }
            }
            const score = player.LegacyPaths?.getScore("LEGACY_PATH_ANTIQUITY_SCIENCE");
            if (score) {
                iCodexCurrent = score;
            }
        }
        if (hasRoyalLibrary && iCodexCurrent >= iCodexGoal) {
            return true;
        }
        return false;
    },
}, { version: 1, canDeliver: isValidAssyrianPlayer });
// ------------------------------------------------------------------
// SCIENCE QUEST 5
const SCIENCE_QUEST_5_CODEX_GOAL_ASSYRIA = 6;
const scienceVictoryContent5 = {
    title: Locale.compose("LOC_TUTORIAL_SCIENCE_QUEST_5_TITLE"),
    advisor: {
        text: "LOC_TUTORIAL_SCIENCE_QUEST_5_ADVISOR_BODY_ASSYRIA",
        getLocParams: () => {
            let iCodexCurrent = 0;
            const player = Players.get(GameContext.localPlayerID);
            if (player) {
                const score = player.LegacyPaths?.getScore("LEGACY_PATH_ANTIQUITY_SCIENCE");
                if (score) {
                    iCodexCurrent = score;
                }
            }
            return [iCodexCurrent];
        },
    },
    body: {
        text: "LOC_TUTORIAL_SCIENCE_QUEST_5_BODY_ASSYRIA",
        getLocParams: (_item) => {
            return [SCIENCE_QUEST_5_CODEX_GOAL_ASSYRIA];
        }
    }
};
// ------------------------------------------------------------------
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
    onActivateCheck: (_item) => {
        return TutorialSupport.canQuestActivate("science_victory_quest_4_tracking", "science_victory_quest_5_tracking");
    },
    onCleanUp: (_item) => {
        QuestTracker.setQuestVictoryStateById("science_victory_quest_5_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
    },
    onObsoleteCheck: (_item) => {
        return QuestTracker.isQuestVictoryInProgress("science_victory_quest_5_tracking");
    },
}, { version: 1, canDeliver: isValidAssyrianPlayer });
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "science_victory_quest_5_tracking",
    quest: {
        title: Locale.compose("LOC_TUTORIAL_SCIENCE_QUEST_5_TRACKING_TITLE"),
        description: "LOC_TUTORIAL_SCIENCE_QUEST_5_TRACKING_BODY_ASSYRIA",
        getDescriptionLocParams: () => {
            let iCodexCurrent = 0;
            let iCodexGoal = SCIENCE_QUEST_5_CODEX_GOAL_ASSYRIA;
            let royalLibraryCount = 0;
            let secondRoyalLibraryComplete = "[icon:QUEST_ITEM_OPEN]";
            const player = Players.get(GameContext.localPlayerID);
            if (player) {
                const playerCities = player.Cities?.getCities();
                if (playerCities) {
                    royalLibraryCount = 0;
                    for (let i = 0; i < playerCities.length; ++i) {
                        let city = playerCities[i];
                        if (city) {
                            if (city.Constructibles?.hasConstructible("BUILDING_ROYAL_LIBRARY", false)) {
                                royalLibraryCount++;
                            }
                        }
                    }
                }
                if (royalLibraryCount >= 2) {
                    secondRoyalLibraryComplete = "[icon:QUEST_ITEM_COMPLETED]";
                }
                const score = player.LegacyPaths?.getScore("LEGACY_PATH_ANTIQUITY_SCIENCE");
                if (score) {
                    iCodexCurrent = score;
                }
            }
            return [secondRoyalLibraryComplete, iCodexCurrent, iCodexGoal];
        },
        victory: {
            type: AdvisorTypes.SCIENCE,
            order: 5,
            state: VictoryQuestState.QUEST_UNSTARTED,
            content: scienceVictoryContent5
        },
    },
    runAllTurns: true,
    activationCustomEvents: ["user-interface-loaded-and-ready"],
    completionEngineEvents: ["ConstructibleBuildCompleted", "ConstructibleAddedToMap", "LegacyPathMilestoneCompleted"],
    onCompleteCheck: (_item) => {
        let secondRoyalLibraryComplete = false;
        let iCodexCurrent = 0;
        let royalLibraryCount = 0;
        let iCodexGoal = SCIENCE_QUEST_5_CODEX_GOAL_ASSYRIA;
        const player = Players.get(GameContext.localPlayerID);
        if (player) {
            const playerCities = player.Cities?.getCities();
            if (playerCities) {
                royalLibraryCount = 0;
                for (let i = 0; i < playerCities.length; ++i) {
                    let city = playerCities[i];
                    if (city) {
                        if (city.Constructibles?.hasConstructible("BUILDING_ROYAL_LIBRARY", false)) {
                            royalLibraryCount++;
                        }
                    }
                }
            }
            if (royalLibraryCount >= 2) {
                secondRoyalLibraryComplete = true;
            }
            const score = player.LegacyPaths?.getScore("LEGACY_PATH_ANTIQUITY_SCIENCE");
            if (score) {
                iCodexCurrent = score;
            }
        }
        if (secondRoyalLibraryComplete && iCodexCurrent >= iCodexGoal) {
            return true;
        }
        return false;
    },
}, { version: 1, canDeliver: isValidAssyrianPlayer });
// ------------------------------------------------------------------
// SCIENCE QUEST 6
const SCIENCE_QUEST_6_CODEX_GOAL_ASSYRIA = 10;
const scienceVictoryContent6 = {
    title: Locale.compose("LOC_TUTORIAL_SCIENCE_QUEST_6_TITLE"),
    advisor: {
        text: "LOC_TUTORIAL_SCIENCE_QUEST_6_ADVISOR_BODY_ASSYRIA",
        getLocParams: () => {
            let iCodexCurrent = 0;
            const player = Players.get(GameContext.localPlayerID);
            if (player) {
                const score = player.LegacyPaths?.getScore("LEGACY_PATH_ANTIQUITY_SCIENCE");
                if (score) {
                    iCodexCurrent = score;
                }
            }
            return [iCodexCurrent];
        },
    },
    body: {
        text: "LOC_TUTORIAL_SCIENCE_QUEST_6_BODY_ASSYRIA",
        getLocParams: (_item) => {
            return [SCIENCE_QUEST_6_CODEX_GOAL_ASSYRIA];
        },
    }
};
// ------------------------------------------------------------------
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
    onActivateCheck: (_item) => {
        return TutorialSupport.canQuestActivate("science_victory_quest_5_tracking", "science_victory_quest_6_tracking");
    },
    onCleanUp: (_item) => {
        QuestTracker.setQuestVictoryStateById("science_victory_quest_6_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
    },
    onObsoleteCheck: (_item) => {
        return QuestTracker.isQuestVictoryInProgress("science_victory_quest_6_tracking");
    },
}, { version: 1, canDeliver: isValidAssyrianPlayer });
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "science_victory_quest_6_tracking",
    quest: {
        title: Locale.compose("LOC_TUTORIAL_SCIENCE_QUEST_6_TRACKING_TITLE"),
        description: "LOC_TUTORIAL_SCIENCE_QUEST_6_TRACKING_BODY_ASSYRIA",
        getDescriptionLocParams: () => {
            const player = Players.get(GameContext.localPlayerID);
            let iCodexCurrent = 0;
            let iCodexGoal = SCIENCE_QUEST_6_CODEX_GOAL_ASSYRIA;
            if (player) {
                const score = player.LegacyPaths?.getScore("LEGACY_PATH_ANTIQUITY_SCIENCE");
                if (score) {
                    iCodexCurrent = score;
                }
            }
            return [iCodexCurrent, iCodexGoal];
        },
        victory: {
            type: AdvisorTypes.SCIENCE,
            order: 6,
            state: VictoryQuestState.QUEST_UNSTARTED,
            content: scienceVictoryContent6
        },
    },
    runAllTurns: true,
    activationCustomEvents: ["user-interface-loaded-and-ready"],
    completionEngineEvents: ["GreatWorkMoved", "GreatWorkCreated"],
    onCleanUp: (item) => {
        TutorialSupport.activateNextTrackedQuest(item);
    },
    onCompleteCheck: (_item) => {
        const player = Players.get(GameContext.localPlayerID);
        let questMet = false;
        let iCodexCurrent = 0;
        let iCodexGoal = SCIENCE_QUEST_6_CODEX_GOAL_ASSYRIA;
        if (player) {
            const score = player.LegacyPaths?.getScore("LEGACY_PATH_ANTIQUITY_SCIENCE");
            if (score) {
                iCodexCurrent = score;
            }
        }
        if (iCodexCurrent >= iCodexGoal) {
            questMet = true;
        }
        return questMet;
    },
}, { version: 1, canDeliver: isValidAssyrianPlayer });
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "science_victory_quest_line_completed",
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleCenter,
        title: "LOC_TUTORIAL_SCIENCE_QUEST_LINE_COMPLETED_TITLE",
        advisorType: TutorialAdvisorType.Science,
        advisor: {
            text: "LOC_TUTORIAL_SCIENCE_QUEST_LINE_COMPLETED_ADVISOR_BODY_ASSYRIA",
        },
        body: {
            text: "LOC_TUTORIAL_SCIENCE_QUEST_LINE_COMPLETED_BODY_ASSYRIA",
            getLocParams: () => {
                const player = Players.get(GameContext.localPlayerID);
                let iCodexCurrent = 0;
                if (player) {
                    const score = player.LegacyPaths?.getScore("LEGACY_PATH_ANTIQUITY_SCIENCE");
                    if (score) {
                        iCodexCurrent = score;
                    }
                }
                return [iCodexCurrent];
            },
        },
        option1: calloutClose,
        option2: {
            callback: () => {
                ContextManager.push("screen-victory-progress", { singleton: true, createMouseGuard: true });
            },
            text: "LOC_TUTORIAL_CALLOUT_VICTORIES",
            actionKey: "inline-accept",
            closes: true
        },
    },
    activationCustomEvents: [QuestCompletedEventName],
    onActivateCheck: (_item) => {
        // Make sure the quest before this quest is completed
        return QuestTracker.isQuestVictoryCompleted("science_victory_quest_6_tracking");
    }
}, { version: 1, canDeliver: isValidAssyrianPlayer });
// ------------------------------------------------------------------
TutorialManager.process("assyrian quest items"); // Must appear at end of item bank!

//# sourceMappingURL=file:///assyria/ui/tutorial/tutorial-quest-items-antiquity.js.map
