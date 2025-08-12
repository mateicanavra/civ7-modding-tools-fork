/**
 * @file tutorial-quest-items-modern.ts
 * @copyright 2020-2024, Firaxis Games
 * @description Defines the sequence of tutorial quest items for the modern age.
 *
 * @example To skip a welcome tutorial:  skip: ((): boolean => { return (Configuration.getUser().skipEraWelcomeTutorial == 1); })(),		// evaluated immediately when added bank
 */
import { VictoryQuestState } from '/base-standard/ui/quest-tracker/quest-item.js';
import { TutorialAdvisorType, TutorialAnchorPosition } from '/base-standard/ui/tutorial/tutorial-item.js';
import TutorialManager from '/base-standard/ui/tutorial/tutorial-manager.js';
import * as TutorialSupport from '/base-standard/ui/tutorial/tutorial-support.js';
import QuestTracker, { QuestCompletedEventName } from '/base-standard/ui/quest-tracker/quest-tracker.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
// ---------------------------------------------------------------------------
// Defines for option buttons
//
const calloutClose = { callback: () => { }, text: "LOC_TUTORIAL_CALLOUT_CLOSE", actionKey: "inline-cancel", closes: true };
const calloutDeclineQuest = { callback: () => { }, text: "LOC_TUTORIAL_CALLOUT_DECLINE_QUEST", actionKey: "inline-cancel", closes: true };
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "advisor_quest_panel",
    questPanel: {
        title: "LOC_TUTORIAL_QUEST_SELECTION_TITLE",
        description: {
            text: "LOC_TUTORIAL_QUEST_SELECTION_BODY",
            getLocParams: (_item) => {
                let civAdj = "null";
                const player = Players.get(GameContext.localPlayerID);
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
    onObsoleteCheck: (item) => {
        if (!item.questPanel) {
            return false;
        }
        const trackedPaths = [];
        item.questPanel.advisors.forEach(advisor => {
            const advisorPath = QuestTracker.readQuestVictory(advisor.button.questID);
            if (advisorPath.state == VictoryQuestState.QUEST_IN_PROGRESS || advisorPath.state == VictoryQuestState.QUEST_COMPLETED) {
                // Path tracked
                trackedPaths.push(true);
            }
            else {
                trackedPaths.push(false);
            }
        });
        return trackedPaths.every(path => path);
    },
    hiders: [".tut-action-button", ".tut-action-text"],
    inputFilters: [{ inputName: "next-action" }]
});
// ------------------------------------------------------------------
// VICTORY QUEST LINE - SCIENCE
// ------------------------------------------------------------------
const scienceVictoryContent1 = {
    title: "LOC_TUTORIAL_SCIENCE_QUEST_1_TITLE",
    advisor: {
        text: "LOC_TUTORIAL_SCIENCE_QUEST_1_ADVISOR_BODY",
    },
    body: {
        text: "LOC_TUTORIAL_SCIENCE_QUEST_1_BODY",
        getLocParams: () => {
            let playerPathText = "";
            if (Game.AgeProgressManager.isFinalAge) {
                playerPathText = "LOC_TUTORIAL_SCIENCE_QUEST_1_BODY_FINAL_AGE";
            }
            else {
                playerPathText = "LOC_TUTORIAL_SCIENCE_QUEST_1_BODY_NOT_FINAL_AGE";
            }
            return [playerPathText];
        },
    }
};
// SCIENCE QUEST 1
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
    onObsoleteCheck: (_item) => {
        return QuestTracker.isQuestVictoryInProgress("science_victory_quest_1_tracking");
    },
    hiders: [".tut-action-button", ".tut-action-text"],
    inputFilters: [{ inputName: "next-action" }]
});
// ------------------------------------------------------------------
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
            let flightResearched = "[icon:QUEST_ITEM_OPEN]";
            const player = Players.get(GameContext.localPlayerID);
            if (player) {
                if (player.Techs?.isNodeUnlocked("NODE_TECH_MO_FLIGHT")) {
                    flightResearched = "[icon:QUEST_ITEM_COMPLETED]";
                }
            }
            return [flightResearched];
        },
    },
    runAllTurns: true,
    activationCustomEvents: ["user-interface-loaded-and-ready"],
    completionEngineEvents: ["TechNodeCompleted"],
    onCleanUp: (item) => {
        TutorialSupport.activateNextTrackedQuest(item);
    },
    onCompleteCheck: (_item) => {
        const player = Players.get(GameContext.localPlayerID);
        if (player) {
            if (player.Techs?.isNodeUnlocked("NODE_TECH_MO_FLIGHT")) {
                return true;
            }
        }
        return false;
    }
});
const scienceVictoryContent2 = {
    title: "LOC_TUTORIAL_SCIENCE_QUEST_2_TITLE",
    advisor: {
        text: "LOC_TUTORIAL_SCIENCE_QUEST_2_ADVISOR_BODY",
    },
    body: {
        text: Locale.compose("LOC_TUTORIAL_SCIENCE_QUEST_2_BODY"),
    }
};
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
    onActivateCheck: (_item) => {
        return TutorialSupport.canQuestActivate("science_victory_quest_1_tracking", "science_victory_quest_2_tracking");
    },
    onObsoleteCheck: (_item) => {
        return QuestTracker.isQuestVictoryInProgress("science_victory_quest_2_tracking");
    }
});
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "science_victory_quest_2_tracking",
    quest: {
        title: Locale.compose("LOC_TUTORIAL_SCIENCE_QUEST_2_TRACKING_TITLE"),
        description: "LOC_TUTORIAL_SCIENCE_QUEST_2_TRACKING_BODY",
        getDescriptionLocParams: () => {
            let aerodromeBuilt = "[icon:QUEST_ITEM_OPEN]";
            let projectComplete = "[icon:QUEST_ITEM_OPEN]";
            const player = Players.get(GameContext.localPlayerID);
            if (player) {
                let playerCities = player.Cities?.getCities();
                if (playerCities) {
                    for (let i = 0; i < playerCities.length; ++i) {
                        let city = playerCities[i];
                        if (city) {
                            if (city.Constructibles?.hasConstructible("BUILDING_AIRFIELD", false)) {
                                aerodromeBuilt = "[icon:QUEST_ITEM_COMPLETED]";
                                break;
                            }
                        }
                    }
                }
                const projectStatus = player.Stats?.getNumProjectsAdvanced("PROJECT_TRANS_OCEANIC_FLIGHT");
                if (projectStatus && projectStatus >= 1) {
                    projectComplete = "[icon:QUEST_ITEM_COMPLETED]";
                }
            }
            return [aerodromeBuilt, projectComplete];
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
    completionEngineEvents: ["CityProductionCompleted", "ConstructibleAddedToMap", "ConstructibleBuildCompleted"],
    onCleanUp: (item) => {
        TutorialSupport.activateNextTrackedQuest(item);
    },
    onCompleteCheck: (_item) => {
        const player = Players.get(GameContext.localPlayerID);
        if (player && TutorialManager.activatingEventName == "CityProductionCompleted") {
            const activationEventData = TutorialManager.activatingEvent;
            if (activationEventData.cityID.owner == player.id && activationEventData.productionKind == ProductionKind.PROJECT) {
                let prodItem = activationEventData.productionItem;
                let projDef = GameInfo.Projects.lookup(prodItem);
                if (projDef != null && projDef.ProjectType == "PROJECT_TRANS_OCEANIC_FLIGHT") {
                    return true;
                }
            }
        }
        return false;
    }
});
const scienceVictoryContent3 = {
    title: "LOC_TUTORIAL_SCIENCE_QUEST_3_TITLE",
    advisor: {
        text: "LOC_TUTORIAL_SCIENCE_QUEST_3_ADVISOR_BODY",
    },
    body: {
        text: Locale.compose("LOC_TUTORIAL_SCIENCE_QUEST_3_BODY"),
    }
};
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
    onActivateCheck: (_item) => {
        return TutorialSupport.canQuestActivate("science_victory_quest_2_tracking", "science_victory_quest_3_tracking");
    },
    onObsoleteCheck: (_item) => {
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
            let aerodynamicsResearched = "[icon:QUEST_ITEM_OPEN]";
            let soundBarrierProjectComplete = "[icon:QUEST_ITEM_OPEN]";
            const player = Players.get(GameContext.localPlayerID);
            if (player) {
                if (player.Techs?.isNodeUnlocked("NODE_TECH_MO_AERODYNAMICS")) {
                    aerodynamicsResearched = "[icon:QUEST_ITEM_COMPLETED]";
                }
                const projectStatus = player.Stats?.getNumProjectsAdvanced("PROJECT_BREAK_SOUND_BARRIER");
                if (projectStatus && projectStatus >= 1) {
                    soundBarrierProjectComplete = "[icon:QUEST_ITEM_COMPLETED]";
                }
            }
            return [aerodynamicsResearched, soundBarrierProjectComplete];
        },
    },
    runAllTurns: true,
    activationCustomEvents: ["user-interface-loaded-and-ready"],
    completionEngineEvents: ["CityProductionCompleted", "TechNodeCompleted"],
    onCleanUp: (item) => {
        TutorialSupport.activateNextTrackedQuest(item);
    },
    onCompleteCheck: (_item) => {
        const player = Players.get(GameContext.localPlayerID);
        if (player && TutorialManager.activatingEventName == "CityProductionCompleted") {
            const activationEventData = TutorialManager.activatingEvent;
            if (activationEventData.cityID.owner == player.id && activationEventData.productionKind == ProductionKind.PROJECT) {
                let prodItem = activationEventData.productionItem;
                let projDef = GameInfo.Projects.lookup(prodItem);
                if (projDef != null && projDef.ProjectType == "PROJECT_BREAK_SOUND_BARRIER") {
                    return true;
                }
            }
        }
        return false;
    }
});
const scienceVictoryContent4 = {
    title: "LOC_TUTORIAL_SCIENCE_QUEST_4_TITLE",
    advisor: {
        text: "LOC_TUTORIAL_SCIENCE_QUEST_4_ADVISOR_BODY",
    },
    body: {
        text: Locale.compose("LOC_TUTORIAL_SCIENCE_QUEST_4_BODY"),
    }
};
// ------------------------------------------------------------------
// SCIENCE QUEST 4
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
    onObsoleteCheck: (_item) => {
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
            let rocketryResearched = "[icon:QUEST_ITEM_OPEN]";
            let launchPadBuilt = "[icon:QUEST_ITEM_OPEN]";
            let launchSatelliteProjectComplete = "[icon:QUEST_ITEM_OPEN]";
            const player = Players.get(GameContext.localPlayerID);
            if (player) {
                if (player.Techs?.isNodeUnlocked("NODE_TECH_MO_ROCKETRY")) {
                    rocketryResearched = "[icon:QUEST_ITEM_COMPLETED]";
                }
                let playerCities = player.Cities?.getCities();
                if (playerCities) {
                    for (let i = 0; i < playerCities.length; ++i) {
                        let city = playerCities[i];
                        if (city) {
                            if (city.Constructibles?.hasConstructible("BUILDING_LAUNCH_PAD", false)) {
                                launchPadBuilt = "[icon:QUEST_ITEM_COMPLETED]";
                                break;
                            }
                        }
                    }
                }
            }
            return [rocketryResearched, launchPadBuilt, launchSatelliteProjectComplete];
        },
    },
    runAllTurns: true,
    activationCustomEvents: ["user-interface-loaded-and-ready"],
    completionEngineEvents: ["CityProductionCompleted", "TechNodeCompleted", "ConstructibleAddedToMap", "VPChanged"],
    onCleanUp: (item) => {
        TutorialSupport.activateNextTrackedQuest(item);
    },
    onCompleteCheck: (_item) => {
        let projectComplete = false;
        const player = Players.get(GameContext.localPlayerID);
        if (player && TutorialManager.activatingEventName == "CityProductionCompleted") {
            const activationEventData = TutorialManager.activatingEvent;
            if (activationEventData.cityID.owner == player.id && activationEventData.productionKind == ProductionKind.PROJECT) {
                let prodItem = activationEventData.productionItem;
                let projDef = GameInfo.Projects.lookup(prodItem);
                if (projDef != null && projDef.ProjectType == "PROJECT_LAUNCH_SATELLITE") {
                    projectComplete = true;
                }
            }
        }
        //note: this is an extra check to make sure the player has completed all other projects.
        let iPointsGoal = 3;
        if (player && projectComplete == true) {
            const score = player.LegacyPaths?.getScore("LEGACY_PATH_MODERN_SCIENCE");
            if (score) {
                if (score >= iPointsGoal) {
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
            getLocParams: (_item) => {
                let civAdj = "";
                const player = Players.get(GameContext.localPlayerID);
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
        //if not final age, show this popup. Otherwise show the Victory popup at the bottom of this file.
        if (!Game.AgeProgressManager.isFinalAge) {
            return QuestTracker.isQuestVictoryCompleted("science_victory_quest_4_tracking");
        }
        return false;
    }
});
// ------------------------------------------------------------------
// VICTORY QUEST LINE - CULTURE
// ------------------------------------------------------------------
const cultureVictoryContent1 = {
    title: "LOC_TUTORIAL_CULTURE_QUEST_1_TITLE",
    advisor: {
        text: "LOC_TUTORIAL_CULTURE_QUEST_1_ADVISOR_BODY",
    },
    body: {
        text: "LOC_TUTORIAL_CULTURE_QUEST_1_BODY",
        getLocParams: () => {
            let explorerName = "NO_NAME";
            let explorerIcon = "NO_ICON";
            const player = Players.get(GameContext.localPlayerID);
            if (player) {
                if (player.Units) {
                    const explorer = player.Units.getBuildUnit("UNIT_EXPLORER");
                    const explorerDef = GameInfo.Units.lookup(explorer);
                    if (explorerDef) {
                        explorerIcon = "[icon:" + explorerDef.UnitType + "]";
                        explorerName = explorerDef.Name;
                    }
                }
            }
            let playerPathText = "";
            if (Game.AgeProgressManager.isFinalAge) {
                playerPathText = Locale.compose("LOC_TUTORIAL_CULTURE_QUEST_1_BODY_FINAL_AGE", explorerIcon, explorerName);
            }
            else {
                playerPathText = Locale.compose("LOC_TUTORIAL_CULTURE_QUEST_1_BODY_NOT_FINAL_AGE", explorerIcon, explorerName);
            }
            return [playerPathText];
        },
    }
};
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
    onObsoleteCheck: (_item) => {
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
        getDescriptionLocParams: () => {
            let naturalHistoryMastered = "[icon:QUEST_ITEM_OPEN]";
            let explorerTrained = "[icon:QUEST_ITEM_OPEN]";
            let explorerName = "NO_NAME";
            let explorerIcon = "NO_ICON";
            const player = Players.get(GameContext.localPlayerID);
            if (player) {
                const playerculture = player.Culture;
                if (playerculture) {
                    const eTree = playerculture.getLastCompletedNodeTreeType();
                    const treeObject = Game.ProgressionTrees.getTree(player.id, eTree);
                    if (treeObject) {
                        for (let i = 0; i < treeObject.nodes.length; ++i) {
                            const node = treeObject.nodes[i];
                            const nodeInfo = GameInfo.ProgressionTreeNodes.lookup(node.nodeType);
                            if (nodeInfo?.ProgressionTreeNodeType == "NODE_CIVIC_MO_MAIN_NATURAL_HISTORY") {
                                naturalHistoryMastered = "[icon:QUEST_ITEM_COMPLETED]";
                                break;
                            }
                        }
                    }
                }
                if (player.Units) {
                    const explorer = player.Units.getBuildUnit("UNIT_EXPLORER");
                    const explorerDef = GameInfo.Units.lookup(explorer);
                    if (explorerDef) {
                        explorerIcon = "[icon:" + explorerDef.UnitType + "]";
                        explorerName = explorerDef.Name;
                    }
                    const units = player.Units?.getUnitIds();
                    if (units) {
                        for (let i = 0; i < units.length; ++i) {
                            const unit = Units.get(units[i]);
                            if (unit) {
                                const unitDef = GameInfo.Units.lookup(unit.type);
                                if (unitDef) {
                                    if (unitDef.UnitType == explorerDef?.UnitType) {
                                        explorerTrained = "[icon:QUEST_ITEM_COMPLETED]";
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            return [naturalHistoryMastered, explorerIcon, explorerName, explorerTrained];
        },
        victory: {
            type: AdvisorTypes.CULTURE,
            order: 1,
            state: VictoryQuestState.QUEST_UNSTARTED,
            content: cultureVictoryContent1
        },
    },
    runAllTurns: true,
    activationCustomEvents: ["user-interface-loaded-and-ready"],
    completionEngineEvents: ["UnitAddedToMap", "CultureNodeCompleted"],
    onCleanUp: (item) => {
        TutorialSupport.activateNextTrackedQuest(item);
    },
    onCompleteCheck: (_item) => {
        let bHasCivic = false;
        let bHasUnit = false;
        const player = Players.get(GameContext.localPlayerID);
        if (player) {
            if (player.Units) {
                const explorer = player.Units.getBuildUnit("UNIT_EXPLORER");
                const explorerDef = GameInfo.Units.lookup(explorer);
                if (explorerDef) {
                    const units = player.Units.getUnitIds();
                    if (units) {
                        for (let i = 0; i < units.length; ++i) {
                            const unit = Units.get(units[i]);
                            if (unit) {
                                const unitDef = GameInfo.Units.lookup(unit.type);
                                if (unitDef) {
                                    if (unitDef.UnitType == explorerDef.UnitType) {
                                        bHasUnit = true;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            const playerculture = player.Culture;
            if (playerculture) {
                const eTree = playerculture.getLastCompletedNodeTreeType();
                const treeObject = Game.ProgressionTrees.getTree(player.id, eTree);
                if (treeObject) {
                    for (let i = 0; i < treeObject.nodes.length; ++i) {
                        const node = treeObject.nodes[i];
                        const nodeInfo = GameInfo.ProgressionTreeNodes.lookup(node.nodeType);
                        if (nodeInfo?.ProgressionTreeNodeType == "NODE_CIVIC_MO_MAIN_NATURAL_HISTORY") {
                            bHasCivic = true;
                            break;
                        }
                    }
                }
            }
        }
        if (bHasUnit && bHasCivic) {
            return true;
        }
        return false;
    },
});
const cultureVictoryContent2 = {
    title: "LOC_TUTORIAL_CULTURE_QUEST_2_TITLE",
    advisor: {
        text: "LOC_TUTORIAL_CULTURE_QUEST_2_ADVISOR_BODY",
    },
    body: {
        text: "LOC_TUTORIAL_CULTURE_QUEST_2_BODY",
        getLocParams: (_item) => {
            let explorerName = "NO_NAME";
            let explorerIcon = "NO_ICON";
            const player = Players.get(GameContext.localPlayerID);
            if (player) {
                if (player.Units) {
                    const explorer = player.Units.getBuildUnit("UNIT_EXPLORER");
                    const explorerDef = GameInfo.Units.lookup(explorer);
                    if (explorerDef) {
                        explorerIcon = "[icon:" + explorerDef.UnitType + "]";
                        explorerName = explorerDef.Name;
                    }
                }
            }
            return [explorerIcon, explorerName];
        }
    }
};
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
    onActivateCheck: (_item) => {
        return TutorialSupport.canQuestActivate("culture_victory_quest_1_tracking", "culture_victory_quest_2_tracking");
    },
    onObsoleteCheck: (_item) => {
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
            let universityOrMuseum = "[icon:QUEST_ITEM_OPEN]";
            let explorerResearch = "[icon:QUEST_ITEM_OPEN]";
            let explorerName = "NO_NAME";
            let explorerIcon = "NO_ICON";
            const player = Players.get(GameContext.localPlayerID);
            if (player) {
                if (player.Units) {
                    const explorer = player.Units.getBuildUnit("UNIT_EXPLORER");
                    const explorerDef = GameInfo.Units.lookup(explorer);
                    if (explorerDef) {
                        explorerIcon = "[icon:" + explorerDef.UnitType + "]";
                        explorerName = explorerDef.Name;
                    }
                    let playerCities = player.Cities?.getCities();
                    if (playerCities) {
                        for (let i = 0; i < playerCities.length; ++i) {
                            let city = playerCities[i];
                            if (city) {
                                if (city.Constructibles?.hasConstructible("BUILDING_MUSEUM", false) || city.Constructibles?.hasConstructible("BUILDING_UNIVERSITY", false)) {
                                    universityOrMuseum = "[icon:QUEST_ITEM_COMPLETED]";
                                    break;
                                }
                            }
                        }
                    }
                }
            }
            return [universityOrMuseum, explorerIcon, explorerName, explorerResearch];
        },
        victory: {
            type: AdvisorTypes.CULTURE,
            order: 2,
            state: VictoryQuestState.QUEST_UNSTARTED,
            content: cultureVictoryContent2
        },
    },
    runAllTurns: true,
    activationCustomEvents: ["user-interface-loaded-and-ready"],
    completionEngineEvents: ["RuinSitesResearched", "ConstructibleBuildCompleted", "ConstructibleAddedtoMap"],
    onCleanUp: (item) => {
        TutorialSupport.activateNextTrackedQuest(item);
    },
    onCompleteCheck: (_item) => {
        if (TutorialManager.activatingEventName == "RuinSitesResearched") {
            return true;
        }
        return false;
    }
});
const cultureVictoryContent3 = {
    title: "LOC_TUTORIAL_CULTURE_QUEST_3_TITLE",
    advisor: {
        text: "LOC_TUTORIAL_CULTURE_QUEST_3_ADVISOR_BODY",
    },
    body: {
        text: "LOC_TUTORIAL_CULTURE_QUEST_3_BODY",
        getLocParams: (_item) => {
            let explorerName = "NO_NAME";
            let explorerIcon = "NO_ICON";
            const player = Players.get(GameContext.localPlayerID);
            if (player) {
                if (player.Units) {
                    const explorer = player.Units.getBuildUnit("UNIT_EXPLORER");
                    const explorerDef = GameInfo.Units.lookup(explorer);
                    if (explorerDef) {
                        explorerIcon = "[icon:" + explorerDef.UnitType + "]";
                        explorerName = explorerDef.Name;
                    }
                }
            }
            return [explorerIcon, explorerName];
        }
    }
};
// ------------------------------------------------------------------
// CULTURE QUEST 3
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
    onActivateCheck: (_item) => {
        return TutorialSupport.canQuestActivate("culture_victory_quest_2_tracking", "culture_victory_quest_3_tracking");
    },
    onObsoleteCheck: (_item) => {
        return QuestTracker.isQuestVictoryInProgress("culture_victory_quest_3_tracking");
    }
});
// ------------------------------------------------------------------
const CULTURE_QUEST_3_PTS_REQUIRED = 1;
TutorialManager.add({
    ID: "culture_victory_quest_3_tracking",
    quest: {
        title: Locale.compose("LOC_TUTORIAL_CULTURE_QUEST_3_TRACKING_TITLE"),
        description: "LOC_TUTORIAL_CULTURE_QUEST_3_TRACKING_BODY",
        victory: {
            type: AdvisorTypes.CULTURE,
            order: 3,
            state: VictoryQuestState.QUEST_UNSTARTED,
            content: cultureVictoryContent3
        },
        getDescriptionLocParams: () => {
            const player = Players.get(GameContext.localPlayerID);
            let iPointsCurrent = 0;
            let iPointsGoal = CULTURE_QUEST_3_PTS_REQUIRED;
            if (player) {
                const score = player.LegacyPaths?.getScore("LEGACY_PATH_MODERN_CULTURE");
                if (score) {
                    iPointsCurrent = score;
                }
            }
            return [iPointsCurrent, iPointsGoal];
        },
    },
    runAllTurns: true,
    activationCustomEvents: ["user-interface-loaded-and-ready"],
    completionEngineEvents: ["VPChanged"],
    onCleanUp: (item) => {
        TutorialSupport.activateNextTrackedQuest(item);
    },
    onCompleteCheck: (_item) => {
        const player = Players.get(GameContext.localPlayerID);
        let iPointsCurrent = 0;
        let iPointsGoal = CULTURE_QUEST_3_PTS_REQUIRED;
        if (player) {
            const score = player.LegacyPaths?.getScore("LEGACY_PATH_MODERN_CULTURE");
            if (score) {
                iPointsCurrent = score;
            }
        }
        if (iPointsCurrent >= iPointsGoal) {
            return true;
        }
        return false;
    }
});
const cultureVictoryContent4 = {
    title: "LOC_TUTORIAL_CULTURE_QUEST_4_TITLE",
    advisor: {
        text: "LOC_TUTORIAL_CULTURE_QUEST_4_ADVISOR_BODY",
    },
    body: {
        text: "LOC_TUTORIAL_CULTURE_QUEST_4_BODY",
        getLocParams: (_item) => {
            let ArtifactGoal = CULTURE_QUEST_4_PTS_REQUIRED;
            return [ArtifactGoal];
        }
    }
};
// ------------------------------------------------------------------
// CULTURE QUEST 4
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
    onActivateCheck: (_item) => {
        return TutorialSupport.canQuestActivate("culture_victory_quest_3_tracking", "culture_victory_quest_4_tracking");
    },
    onObsoleteCheck: (_item) => {
        return QuestTracker.isQuestVictoryInProgress("culture_victory_quest_4_tracking");
    }
});
// ------------------------------------------------------------------
const CULTURE_QUEST_4_PTS_REQUIRED = 5;
TutorialManager.add({
    ID: "culture_victory_quest_4_tracking",
    quest: {
        title: Locale.compose("LOC_TUTORIAL_CULTURE_QUEST_4_TRACKING_TITLE"),
        description: "LOC_TUTORIAL_CULTURE_QUEST_4_TRACKING_BODY",
        victory: {
            type: AdvisorTypes.CULTURE,
            order: 4,
            state: VictoryQuestState.QUEST_UNSTARTED,
            content: cultureVictoryContent4
        },
        getDescriptionLocParams: () => {
            const player = Players.get(GameContext.localPlayerID);
            let reqCivicUnlocked = "[icon:QUEST_ITEM_OPEN]";
            let iPointsCurrent = 0;
            let iPointsGoal = CULTURE_QUEST_4_PTS_REQUIRED;
            if (player) {
                const score = player.LegacyPaths?.getScore("LEGACY_PATH_MODERN_CULTURE");
                if (score) {
                    iPointsCurrent = score;
                }
                if (player.Culture?.isNodeUnlocked("NODE_CIVIC_MO_MAIN_HEGEMONY")) {
                    reqCivicUnlocked = "[icon:QUEST_ITEM_COMPLETED]";
                }
            }
            return [reqCivicUnlocked, iPointsCurrent, iPointsGoal];
        },
    },
    runAllTurns: true,
    activationCustomEvents: ["user-interface-loaded-and-ready"],
    completionEngineEvents: ["VPChanged", "CultureNodeCompleted"],
    onCleanUp: (item) => {
        TutorialSupport.activateNextTrackedQuest(item);
    },
    onCompleteCheck: (_item) => {
        let reqCivicUnlocked = false;
        const player = Players.get(GameContext.localPlayerID);
        let iPointsCurrent = 0;
        let iPointsGoal = CULTURE_QUEST_4_PTS_REQUIRED;
        if (player && player.Culture) {
            reqCivicUnlocked = player.Culture.isNodeUnlocked("NODE_CIVIC_MO_MAIN_HEGEMONY");
            const score = player.LegacyPaths?.getScore("LEGACY_PATH_MODERN_CULTURE");
            if (score) {
                iPointsCurrent = score;
            }
        }
        if (iPointsCurrent >= iPointsGoal && reqCivicUnlocked == true) {
            return true;
        }
        return false;
    }
});
const cultureVictoryContent5 = {
    title: "LOC_TUTORIAL_CULTURE_QUEST_5_TITLE",
    advisor: {
        text: "LOC_TUTORIAL_CULTURE_QUEST_5_ADVISOR_BODY",
    },
    body: {
        text: "LOC_TUTORIAL_CULTURE_QUEST_5_BODY",
        getLocParams: (_item) => {
            const player = Players.get(GameContext.localPlayerID);
            let ArtifactCount = 0;
            if (player) {
                const score = player.LegacyPaths?.getScore("LEGACY_PATH_MODERN_CULTURE");
                if (score) {
                    ArtifactCount = score;
                }
            }
            let ArtifactGoal = CULTURE_QUEST_5_PTS_REQUIRED;
            return [ArtifactCount, ArtifactGoal];
        }
    }
};
// ------------------------------------------------------------------
// CULTURE QUEST 5
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
    onActivateCheck: (_item) => {
        return TutorialSupport.canQuestActivate("culture_victory_quest_4_tracking", "culture_victory_quest_5_tracking");
    },
    onObsoleteCheck: (_item) => {
        return QuestTracker.isQuestVictoryInProgress("culture_victory_quest_5_tracking");
    }
});
// ------------------------------------------------------------------
const CULTURE_QUEST_5_PTS_REQUIRED = 10;
TutorialManager.add({
    ID: "culture_victory_quest_5_tracking",
    quest: {
        title: Locale.compose("LOC_TUTORIAL_CULTURE_QUEST_5_TRACKING_TITLE"),
        description: "LOC_TUTORIAL_CULTURE_QUEST_5_TRACKING_BODY",
        victory: {
            type: AdvisorTypes.CULTURE,
            order: 5,
            state: VictoryQuestState.QUEST_UNSTARTED,
            content: cultureVictoryContent5
        },
        getDescriptionLocParams: () => {
            const player = Players.get(GameContext.localPlayerID);
            let iPointsCurrent = 0;
            let iPointsGoal = CULTURE_QUEST_5_PTS_REQUIRED;
            if (player) {
                const score = player.LegacyPaths?.getScore("LEGACY_PATH_MODERN_CULTURE");
                if (score) {
                    iPointsCurrent = score;
                }
            }
            return [iPointsCurrent, iPointsGoal];
        },
    },
    runAllTurns: true,
    activationCustomEvents: ["user-interface-loaded-and-ready"],
    completionEngineEvents: ["VPChanged"],
    onCleanUp: (item) => {
        TutorialSupport.activateNextTrackedQuest(item);
    },
    onCompleteCheck: (_item) => {
        const player = Players.get(GameContext.localPlayerID);
        let iPointsCurrent = 0;
        let iPointsGoal = CULTURE_QUEST_5_PTS_REQUIRED;
        if (player) {
            const score = player.LegacyPaths?.getScore("LEGACY_PATH_MODERN_CULTURE");
            if (score) {
                iPointsCurrent = score;
            }
        }
        if (iPointsCurrent >= iPointsGoal) {
            return true;
        }
        return false;
    }
});
const cultureVictoryContent6 = {
    title: "LOC_TUTORIAL_CULTURE_QUEST_6_TITLE",
    advisor: {
        text: "LOC_TUTORIAL_CULTURE_QUEST_6_ADVISOR_BODY",
    },
    body: {
        text: "LOC_TUTORIAL_CULTURE_QUEST_6_BODY",
        getLocParams: (_item) => {
            const player = Players.get(GameContext.localPlayerID);
            let ArtifactCount = 0;
            if (player) {
                const score = player.LegacyPaths?.getScore("LEGACY_PATH_MODERN_CULTURE");
                if (score) {
                    ArtifactCount = score;
                }
            }
            let ArtifactGoal = CULTURE_QUEST_6_PTS_REQUIRED;
            return [ArtifactCount, ArtifactGoal];
        }
    }
};
// ------------------------------------------------------------------
// CULTURE QUEST 6
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
    onActivateCheck: (_item) => {
        return TutorialSupport.canQuestActivate("culture_victory_quest_5_tracking", "culture_victory_quest_6_tracking");
    },
    onObsoleteCheck: (_item) => {
        return QuestTracker.isQuestVictoryInProgress("culture_victory_quest_6_tracking");
    }
});
// ------------------------------------------------------------------
const CULTURE_QUEST_6_PTS_REQUIRED = 15;
TutorialManager.add({
    ID: "culture_victory_quest_6_tracking",
    quest: {
        title: Locale.compose("LOC_TUTORIAL_CULTURE_QUEST_6_TRACKING_TITLE"),
        description: "LOC_TUTORIAL_CULTURE_QUEST_6_TRACKING_BODY",
        victory: {
            type: AdvisorTypes.CULTURE,
            order: 6,
            state: VictoryQuestState.QUEST_UNSTARTED,
            content: cultureVictoryContent6
        },
        getDescriptionLocParams: () => {
            const player = Players.get(GameContext.localPlayerID);
            let iPointsCurrent = 0;
            let iPointsGoal = CULTURE_QUEST_6_PTS_REQUIRED;
            if (player) {
                const score = player.LegacyPaths?.getScore("LEGACY_PATH_MODERN_CULTURE");
                if (score) {
                    iPointsCurrent = score;
                }
            }
            return [iPointsCurrent, iPointsGoal];
        },
    },
    runAllTurns: true,
    activationCustomEvents: ["user-interface-loaded-and-ready"],
    completionEngineEvents: ["VPChanged"],
    onCleanUp: (item) => {
        TutorialSupport.activateNextTrackedQuest(item);
    },
    onCompleteCheck: (_item) => {
        const player = Players.get(GameContext.localPlayerID);
        let iPointsCurrent = 0;
        let iPointsGoal = CULTURE_QUEST_6_PTS_REQUIRED;
        if (player) {
            const score = player.LegacyPaths?.getScore("LEGACY_PATH_MODERN_CULTURE");
            if (score) {
                iPointsCurrent = score;
            }
        }
        if (iPointsCurrent >= iPointsGoal) {
            return true;
        }
        return false;
    }
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
            getLocParams: (_item) => {
                let civAdj = "";
                const player = Players.get(GameContext.localPlayerID);
                if (player) {
                    civAdj = player.civilizationAdjective;
                }
                return [civAdj];
            }
        },
        body: {
            text: "LOC_TUTORIAL_CULTURE_QUEST_LINE_COMPLETED_BODY",
            getLocParams: (_item) => {
                const player = Players.get(GameContext.localPlayerID);
                let ArtifactCount = 0;
                if (player) {
                    const score = player.LegacyPaths?.getScore("LEGACY_PATH_MODERN_CULTURE");
                    if (score) {
                        ArtifactCount = score;
                    }
                }
                return [ArtifactCount];
            }
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
        //if not final age, show this popup. Otherwise show the Victory popup at the bottom of this file.
        if (!Game.AgeProgressManager.isFinalAge) {
            return QuestTracker.isQuestVictoryCompleted("culture_victory_quest_6_tracking");
        }
        return false;
    },
});
// ------------------------------------------------------------------
// VICTORY QUEST LINE - ECONOMIC
// ------------------------------------------------------------------
const economicVictoryContent1 = {
    title: "LOC_TUTORIAL_ECONOMIC_QUEST_1_TITLE",
    advisor: {
        text: "LOC_TUTORIAL_ECONOMIC_QUEST_1_ADVISOR_BODY",
    },
    body: {
        text: "LOC_TUTORIAL_ECONOMIC_QUEST_1_BODY",
        getLocParams: () => {
            let playerPathText = "";
            if (Game.AgeProgressManager.isFinalAge) {
                playerPathText = "LOC_TUTORIAL_ECONOMIC_QUEST_1_BODY_FINAL_AGE";
            }
            else {
                playerPathText = "LOC_TUTORIAL_ECONOMIC_QUEST_1_BODY_NOT_FINAL_AGE";
            }
            return [playerPathText];
        },
    }
};
// ECONOMIC QUEST 1
TutorialManager.add({
    ID: "economic_victory_quest_1_start",
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleCenter,
        advisorType: TutorialAdvisorType.Economic,
        ...economicVictoryContent1,
        option1: {
            callback: () => {
                QuestTracker.setQuestVictoryStateById("economic_victory_quest_1_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
            }, text: "LOC_TUTORIAL_CALLOUT_ACCEPT_QUEST", actionKey: "inline-accept", closes: true
        },
        option2: calloutDeclineQuest,
    },
    onObsoleteCheck: (_item) => {
        return QuestTracker.isQuestVictoryInProgress("economic_victory_quest_1_tracking");
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
            let combustionResearched = "[icon:QUEST_ITEM_OPEN]";
            let railStationBuilt = "[icon:QUEST_ITEM_OPEN]";
            const player = Players.get(GameContext.localPlayerID);
            if (player) {
                if (player.Techs?.isNodeUnlocked("NODE_TECH_MO_INDUSTRIALIZATION")) {
                    combustionResearched = "[icon:QUEST_ITEM_COMPLETED]";
                }
                let playerCities = player.Cities?.getCities();
                if (playerCities) {
                    for (let i = 0; i < playerCities.length; ++i) {
                        let city = playerCities[i];
                        if (city) {
                            if (city.Constructibles?.hasConstructible("BUILDING_RAIL_STATION", false)) {
                                combustionResearched = "[icon:QUEST_ITEM_COMPLETED]";
                                break;
                            }
                        }
                    }
                }
            }
            return [combustionResearched, railStationBuilt];
        },
    },
    runAllTurns: true,
    activationCustomEvents: ["user-interface-loaded-and-ready"],
    completionEngineEvents: ["TechNodeCompleted", "ConstructibleAddedToMap", "ConstructibleBuildCompleted"],
    onCleanUp: (item) => {
        TutorialSupport.activateNextTrackedQuest(item);
    },
    onCompleteCheck: (_item) => {
        const player = Players.get(GameContext.localPlayerID);
        if (player) {
            if (player.Techs?.isNodeUnlocked("NODE_TECH_MO_INDUSTRIALIZATION")) {
                let playerCities = player.Cities?.getCities();
                if (playerCities) {
                    for (let i = 0; i < playerCities.length; ++i) {
                        let city = playerCities[i];
                        if (city) {
                            if (city.Constructibles?.hasConstructible("BUILDING_RAIL_STATION", false)) {
                                return true;
                            }
                        }
                    }
                }
            }
        }
        return false;
    }
});
// ------------------------------------------------------------------
const ECONOMIC_QUEST_2_PTS_REQUIRED = 3;
const economicVictoryContent2 = {
    title: "LOC_TUTORIAL_ECONOMIC_QUEST_2_TITLE",
    advisor: {
        text: "LOC_TUTORIAL_ECONOMIC_QUEST_2_ADVISOR_BODY",
    },
    body: {
        text: Locale.compose("LOC_TUTORIAL_ECONOMIC_QUEST_2_BODY", ECONOMIC_QUEST_2_PTS_REQUIRED),
    }
};
// ECONOMIC QUEST 2
TutorialManager.add({
    ID: "economic_victory_quest_2_start",
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleCenter,
        advisorType: TutorialAdvisorType.Economic,
        ...economicVictoryContent2,
        option1: {
            callback: () => {
                QuestTracker.setQuestVictoryStateById("economic_victory_quest_2_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
            }, text: "LOC_TUTORIAL_CALLOUT_ACCEPT_QUEST", actionKey: "inline-accept", closes: true
        },
        option2: calloutDeclineQuest,
    },
    activationCustomEvents: [QuestCompletedEventName],
    onActivateCheck: (_item) => {
        return TutorialSupport.canQuestActivate("economic_victory_quest_1_tracking", "economic_victory_quest_2_tracking");
    },
    onObsoleteCheck: (_item) => {
        return QuestTracker.isQuestVictoryInProgress("economic_victory_quest_2_tracking");
    }
});
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "economic_victory_quest_2_tracking",
    quest: {
        title: Locale.compose("LOC_TUTORIAL_ECONOMIC_QUEST_2_TRACKING_TITLE"),
        description: "LOC_TUTORIAL_ECONOMIC_QUEST_2_TRACKING_BODY",
        getDescriptionLocParams: () => {
            let massProductionResearched = "[icon:QUEST_ITEM_OPEN]";
            let connectedByRailCurrent = 0;
            let connectedByRailGoal = ECONOMIC_QUEST_2_PTS_REQUIRED;
            const player = Players.get(GameContext.localPlayerID);
            if (player) {
                if (player.Techs?.isNodeUnlocked("NODE_TECH_MO_MASS_PRODUCTION")) {
                    massProductionResearched = "[icon:QUEST_ITEM_COMPLETED]";
                }
                let playerCities = player.Cities?.getCities();
                if (playerCities) {
                    for (let i = 0; i < playerCities.length; ++i) {
                        let city = playerCities[i];
                        if (city.Trade && city.Trade.isInRailNetwork()) {
                            connectedByRailCurrent++;
                        }
                    }
                }
            }
            return [massProductionResearched, connectedByRailCurrent, connectedByRailGoal];
        },
        victory: {
            type: AdvisorTypes.ECONOMIC,
            order: 2,
            state: VictoryQuestState.QUEST_UNSTARTED,
            content: economicVictoryContent2
        },
    },
    runAllTurns: true,
    activationCustomEvents: ["user-interface-loaded-and-ready"],
    completionEngineEvents: ["ConstructibleAddedToMap", "ConstructibleBuildCompleted", "TechNodeCompleted"],
    onCleanUp: (item) => {
        TutorialSupport.activateNextTrackedQuest(item);
    },
    onCompleteCheck: (_item) => {
        let massProductionResearched = false;
        let connectedByRailCurrent = 0;
        let connectedByRailGoal = ECONOMIC_QUEST_2_PTS_REQUIRED;
        const player = Players.get(GameContext.localPlayerID);
        if (player) {
            if (player.Techs?.isNodeUnlocked("NODE_TECH_MO_MASS_PRODUCTION")) {
                massProductionResearched = true;
            }
            let playerCities = player.Cities?.getCities();
            if (playerCities) {
                for (let i = 0; i < playerCities.length; ++i) {
                    let city = playerCities[i];
                    if (city.Trade && city.Trade.isInRailNetwork()) {
                        connectedByRailCurrent++;
                    }
                }
            }
        }
        if (massProductionResearched && connectedByRailCurrent >= connectedByRailGoal) {
            return true;
        }
        return false;
    }
});
// ------------------------------------------------------------------
const ECONOMIC_QUEST_3_VP_PTS_REQUIRED = 20;
const ECONOMIC_QUEST_3_RESOURCES_REQUIRED = 5;
const economicVictoryContent3 = {
    title: "LOC_TUTORIAL_ECONOMIC_QUEST_3_TITLE",
    advisor: {
        text: "LOC_TUTORIAL_ECONOMIC_QUEST_3_ADVISOR_BODY",
    },
    body: {
        text: Locale.compose("LOC_TUTORIAL_ECONOMIC_QUEST_3_BODY", ECONOMIC_QUEST_3_RESOURCES_REQUIRED, ECONOMIC_QUEST_3_VP_PTS_REQUIRED),
    }
};
// ECONOMIC QUEST 3
TutorialManager.add({
    ID: "economic_victory_quest_3_start",
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleCenter,
        advisorType: TutorialAdvisorType.Economic,
        ...economicVictoryContent3,
        option1: {
            callback: () => {
                QuestTracker.setQuestVictoryStateById("economic_victory_quest_3_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
            }, text: "LOC_TUTORIAL_CALLOUT_ACCEPT_QUEST", actionKey: "inline-accept", closes: true
        },
        option2: calloutDeclineQuest,
    },
    activationCustomEvents: [QuestCompletedEventName],
    onActivateCheck: (_item) => {
        return TutorialSupport.canQuestActivate("economic_victory_quest_2_tracking", "economic_victory_quest_3_tracking");
    },
    onObsoleteCheck: (_item) => {
        return QuestTracker.isQuestVictoryInProgress("economic_victory_quest_3_tracking");
    }
});
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "economic_victory_quest_3_tracking",
    quest: {
        title: Locale.compose("LOC_TUTORIAL_ECONOMIC_QUEST_3_TRACKING_TITLE"),
        description: "LOC_TUTORIAL_ECONOMIC_QUEST_3_TRACKING_BODY",
        getDescriptionLocParams: () => {
            let settlementWithRailAndFactory = "[icon:QUEST_ITEM_OPEN]";
            let resourceCurrent = 0;
            let resourceGoal = ECONOMIC_QUEST_3_RESOURCES_REQUIRED;
            let VPCurrent = 0;
            let VPGoal = ECONOMIC_QUEST_3_VP_PTS_REQUIRED;
            const player = Players.get(GameContext.localPlayerID);
            if (player) {
                const score = player.LegacyPaths?.getScore("LEGACY_PATH_MODERN_ECONOMIC");
                if (score) {
                    VPCurrent = score;
                }
                let playerCities = player.Cities?.getCities();
                if (playerCities) {
                    for (let i = 0; i < playerCities.length; ++i) {
                        let city = playerCities[i];
                        if (city.Trade && city.Trade.isInRailNetwork()) {
                            if (city.Constructibles?.hasConstructible("BUILDING_FACTORY", false)) {
                                settlementWithRailAndFactory = "[icon:QUEST_ITEM_COMPLETED]";
                            }
                        }
                        if (city.Resources) {
                            resourceCurrent += city.Resources.getNumFactoryResources();
                        }
                    }
                }
            }
            return [settlementWithRailAndFactory, resourceCurrent, resourceGoal, VPCurrent, VPGoal];
        },
        victory: {
            type: AdvisorTypes.ECONOMIC,
            order: 3,
            state: VictoryQuestState.QUEST_UNSTARTED,
            content: economicVictoryContent3
        },
    },
    runAllTurns: true,
    activationCustomEvents: ["user-interface-loaded-and-ready"],
    completionEngineEvents: ["ResourceAssigned", "ConstructibleAddedToMap", "ConstructibleBuildCompleted", "VPChanged"],
    onCleanUp: (item) => {
        TutorialSupport.activateNextTrackedQuest(item);
    },
    onCompleteCheck: (_item) => {
        let settlementWithRailAndFactory = false;
        let resourceCurrent = 0;
        let resourceGoal = ECONOMIC_QUEST_3_RESOURCES_REQUIRED;
        let VPCurrent = 0;
        let VPGoal = ECONOMIC_QUEST_3_VP_PTS_REQUIRED;
        const player = Players.get(GameContext.localPlayerID);
        if (player) {
            const score = player.LegacyPaths?.getScore("LEGACY_PATH_MODERN_ECONOMIC");
            if (score) {
                VPCurrent = score;
            }
            let playerCities = player.Cities?.getCities();
            if (playerCities) {
                for (let i = 0; i < playerCities.length; ++i) {
                    let city = playerCities[i];
                    if (city.Trade && city.Trade.isInRailNetwork()) {
                        if (city.Constructibles?.hasConstructible("BUILDING_RAIL_STATION", false)) {
                            settlementWithRailAndFactory = true;
                        }
                    }
                    if (city.Resources) {
                        resourceCurrent += city.Resources.getNumFactoryResources();
                    }
                }
            }
        }
        if (settlementWithRailAndFactory && resourceCurrent >= resourceGoal && VPCurrent >= VPGoal) {
            return true;
        }
        return false;
    }
});
// ------------------------------------------------------------------
// ECONOMIC QUEST 4
const ECONOMIC_QUEST_4_PTS_REQUIRED = 150;
const economicVictoryContent4 = {
    title: "LOC_TUTORIAL_ECONOMIC_QUEST_4_TITLE",
    advisor: {
        text: "LOC_TUTORIAL_ECONOMIC_QUEST_4_ADVISOR_BODY",
    },
    body: {
        text: Locale.compose("LOC_TUTORIAL_ECONOMIC_QUEST_4_BODY", ECONOMIC_QUEST_4_PTS_REQUIRED),
    }
};
TutorialManager.add({
    ID: "economic_victory_quest_4_start",
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleCenter,
        advisorType: TutorialAdvisorType.Economic,
        ...economicVictoryContent4,
        option1: {
            callback: () => {
                QuestTracker.setQuestVictoryStateById("economic_victory_quest_4_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
            }, text: "LOC_TUTORIAL_CALLOUT_ACCEPT_QUEST", actionKey: "inline-accept", closes: true
        },
        option2: calloutDeclineQuest,
    },
    activationCustomEvents: [QuestCompletedEventName],
    onActivateCheck: (_item) => {
        return TutorialSupport.canQuestActivate("economic_victory_quest_3_tracking", "economic_victory_quest_4_tracking");
    },
    onObsoleteCheck: (_item) => {
        return QuestTracker.isQuestVictoryInProgress("economic_victory_quest_4_tracking");
    }
});
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "economic_victory_quest_4_tracking",
    quest: {
        title: Locale.compose("LOC_TUTORIAL_ECONOMIC_QUEST_4_TRACKING_TITLE"),
        description: "LOC_TUTORIAL_ECONOMIC_QUEST_4_TRACKING_BODY",
        victory: {
            type: AdvisorTypes.ECONOMIC,
            order: 4,
            state: VictoryQuestState.QUEST_UNSTARTED,
            content: economicVictoryContent4
        },
        getDescriptionLocParams: () => {
            const player = Players.get(GameContext.localPlayerID);
            let iPointsCurrent = 0;
            let iPointsGoal = ECONOMIC_QUEST_4_PTS_REQUIRED;
            if (player) {
                const score = player.LegacyPaths?.getScore("LEGACY_PATH_MODERN_ECONOMIC");
                if (score) {
                    iPointsCurrent = score;
                }
            }
            return [iPointsCurrent, iPointsGoal];
        },
    },
    runAllTurns: true,
    activationCustomEvents: ["user-interface-loaded-and-ready"],
    completionEngineEvents: ["VPChanged"],
    onCleanUp: (item) => {
        TutorialSupport.activateNextTrackedQuest(item);
    },
    onCompleteCheck: (_item) => {
        const player = Players.get(GameContext.localPlayerID);
        let iPointsCurrent = 0;
        let iPointsGoal = ECONOMIC_QUEST_4_PTS_REQUIRED;
        if (player) {
            const score = player.LegacyPaths?.getScore("LEGACY_PATH_MODERN_ECONOMIC");
            if (score) {
                iPointsCurrent = score;
            }
        }
        if (iPointsCurrent >= iPointsGoal) {
            return true;
        }
        return false;
    }
});
// ------------------------------------------------------------------
// ECONOMIC QUEST 5
const ECONOMIC_QUEST_5_PTS_REQUIRED = 300;
const economicVictoryContent5 = {
    title: "LOC_TUTORIAL_ECONOMIC_QUEST_5_TITLE",
    advisor: {
        text: "LOC_TUTORIAL_ECONOMIC_QUEST_5_ADVISOR_BODY",
    },
    body: {
        text: Locale.compose("LOC_TUTORIAL_ECONOMIC_QUEST_5_BODY", ECONOMIC_QUEST_5_PTS_REQUIRED),
    }
};
TutorialManager.add({
    ID: "economic_victory_quest_5_start",
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleCenter,
        advisorType: TutorialAdvisorType.Economic,
        ...economicVictoryContent5,
        option1: {
            callback: () => {
                QuestTracker.setQuestVictoryStateById("economic_victory_quest_5_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
            }, text: "LOC_TUTORIAL_CALLOUT_ACCEPT_QUEST", actionKey: "inline-accept", closes: true
        },
        option2: calloutDeclineQuest,
    },
    activationCustomEvents: [QuestCompletedEventName],
    onActivateCheck: (_item) => {
        return TutorialSupport.canQuestActivate("economic_victory_quest_4_tracking", "economic_victory_quest_5_tracking");
    },
    onObsoleteCheck: (_item) => {
        return QuestTracker.isQuestVictoryInProgress("economic_victory_quest_5_tracking");
    }
});
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "economic_victory_quest_5_tracking",
    quest: {
        title: Locale.compose("LOC_TUTORIAL_ECONOMIC_QUEST_5_TRACKING_TITLE"),
        description: "LOC_TUTORIAL_ECONOMIC_QUEST_5_TRACKING_BODY",
        victory: {
            type: AdvisorTypes.ECONOMIC,
            order: 5,
            state: VictoryQuestState.QUEST_UNSTARTED,
            content: economicVictoryContent5
        },
        getDescriptionLocParams: () => {
            const player = Players.get(GameContext.localPlayerID);
            let iPointsCurrent = 0;
            let iPointsGoal = ECONOMIC_QUEST_5_PTS_REQUIRED;
            if (player) {
                const score = player.LegacyPaths?.getScore("LEGACY_PATH_MODERN_ECONOMIC");
                if (score) {
                    iPointsCurrent = score;
                }
            }
            return [iPointsCurrent, iPointsGoal];
        },
    },
    runAllTurns: true,
    activationCustomEvents: ["user-interface-loaded-and-ready"],
    completionEngineEvents: ["VPChanged"],
    onCleanUp: (item) => {
        TutorialSupport.activateNextTrackedQuest(item);
    },
    onCompleteCheck: (_item) => {
        const player = Players.get(GameContext.localPlayerID);
        let iPointsCurrent = 0;
        let iPointsGoal = ECONOMIC_QUEST_5_PTS_REQUIRED;
        if (player) {
            const score = player.LegacyPaths?.getScore("LEGACY_PATH_MODERN_ECONOMIC");
            if (score) {
                iPointsCurrent = score;
            }
        }
        if (iPointsCurrent >= iPointsGoal) {
            return true;
        }
        return false;
    }
});
// ------------------------------------------------------------------
// ECONOMIC QUEST 6
const ECONOMIC_QUEST_6_PTS_REQUIRED = 500;
const economicVictoryContent6 = {
    title: "LOC_TUTORIAL_ECONOMIC_QUEST_6_TITLE",
    advisor: {
        text: "LOC_TUTORIAL_ECONOMIC_QUEST_6_ADVISOR_BODY",
    },
    body: {
        text: Locale.compose("LOC_TUTORIAL_ECONOMIC_QUEST_6_BODY", ECONOMIC_QUEST_6_PTS_REQUIRED),
    }
};
TutorialManager.add({
    ID: "economic_victory_quest_6_start",
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleCenter,
        advisorType: TutorialAdvisorType.Economic,
        ...economicVictoryContent6,
        option1: {
            callback: () => {
                QuestTracker.setQuestVictoryStateById("economic_victory_quest_6_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
            }, text: "LOC_TUTORIAL_CALLOUT_ACCEPT_QUEST", actionKey: "inline-accept", closes: true
        },
        option2: calloutDeclineQuest,
    },
    activationCustomEvents: [QuestCompletedEventName],
    onActivateCheck: (_item) => {
        return TutorialSupport.canQuestActivate("economic_victory_quest_5_tracking", "economic_victory_quest_6_tracking");
    },
    onObsoleteCheck: (_item) => {
        return QuestTracker.isQuestVictoryInProgress("economic_victory_quest_6_tracking");
    }
});
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "economic_victory_quest_6_tracking",
    quest: {
        title: Locale.compose("LOC_TUTORIAL_ECONOMIC_QUEST_6_TRACKING_TITLE"),
        description: "LOC_TUTORIAL_ECONOMIC_QUEST_6_TRACKING_BODY",
        victory: {
            type: AdvisorTypes.ECONOMIC,
            order: 6,
            state: VictoryQuestState.QUEST_UNSTARTED,
            content: economicVictoryContent6
        },
        getDescriptionLocParams: () => {
            const player = Players.get(GameContext.localPlayerID);
            let iPointsCurrent = 0;
            let iPointsGoal = ECONOMIC_QUEST_6_PTS_REQUIRED;
            if (player) {
                const score = player.LegacyPaths?.getScore("LEGACY_PATH_MODERN_ECONOMIC");
                if (score) {
                    iPointsCurrent = score;
                }
            }
            return [iPointsCurrent, iPointsGoal];
        },
    },
    runAllTurns: true,
    activationCustomEvents: ["user-interface-loaded-and-ready"],
    completionEngineEvents: ["VPChanged"],
    onCleanUp: (item) => {
        TutorialSupport.activateNextTrackedQuest(item);
    },
    onCompleteCheck: (_item) => {
        const player = Players.get(GameContext.localPlayerID);
        let iPointsCurrent = 0;
        let iPointsGoal = ECONOMIC_QUEST_6_PTS_REQUIRED;
        if (player) {
            const score = player.LegacyPaths?.getScore("LEGACY_PATH_MODERN_ECONOMIC");
            if (score) {
                iPointsCurrent = score;
            }
        }
        if (iPointsCurrent >= iPointsGoal) {
            return true;
        }
        return false;
    }
});
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "economic_victory_quest_line_completed",
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleCenter,
        advisorType: TutorialAdvisorType.Economic,
        title: "LOC_TUTORIAL_ECONOMIC_QUEST_LINE_COMPLETED_TITLE",
        advisor: {
            text: "LOC_TUTORIAL_ECONOMIC_QUEST_LINE_COMPLETED_ADVISOR_BODY",
            getLocParams: (_item) => {
                let civAdj = "";
                const player = Players.get(GameContext.localPlayerID);
                if (player) {
                    civAdj = player.civilizationAdjective;
                }
                return [civAdj];
            }
        },
        body: {
            text: "LOC_TUTORIAL_ECONOMIC_QUEST_LINE_COMPLETED_BODY"
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
        //if not final age, show this popup. Otherwise show the Victory popup at the bottom of this file.
        if (!Game.AgeProgressManager.isFinalAge) {
            return QuestTracker.isQuestVictoryCompleted("economic_victory_quest_6_tracking");
        }
        return false;
    }
});
// ------------------------------------------------------------------
// VICTORY QUEST LINE - MILITARY
// ------------------------------------------------------------------
const militaryVictoryContent1 = {
    title: "LOC_TUTORIAL_MILITARY_QUEST_1_TITLE",
    advisor: {
        text: "LOC_TUTORIAL_MILITARY_QUEST_1_ADVISOR_BODY",
    },
    body: {
        text: "LOC_TUTORIAL_MILITARY_QUEST_1_BODY",
        getLocParams: () => {
            let playerPathText = "";
            if (Game.AgeProgressManager.isFinalAge) {
                playerPathText = "LOC_TUTORIAL_MILITARY_QUEST_1_BODY_FINAL_AGE";
            }
            else {
                playerPathText = "LOC_TUTORIAL_MILITARY_QUEST_1_BODY_NOT_FINAL_AGE";
            }
            return [playerPathText];
        }
    }
};
// MILITARY QUEST 1
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
    onObsoleteCheck: (_item) => {
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
            let civicStudied = "[icon:QUEST_ITEM_OPEN]";
            return [civicStudied];
        },
    },
    runAllTurns: true,
    activationCustomEvents: ["user-interface-loaded-and-ready"],
    completionEngineEvents: ["CultureNodeCompleted"],
    onCleanUp: (item) => {
        TutorialSupport.activateNextTrackedQuest(item);
    },
    onCompleteCheck: (_item) => {
        const player = Players.get(GameContext.localPlayerID);
        if (player) {
            if (player.Culture?.isNodeUnlocked("NODE_CIVIC_MO_MAIN_POLITICAL_THEORY")) {
                return true;
            }
        }
        return false;
    }
});
const militaryVictoryContent2 = {
    title: "LOC_TUTORIAL_MILITARY_QUEST_2_TITLE",
    advisor: {
        text: "LOC_TUTORIAL_MILITARY_QUEST_2_ADVISOR_BODY",
    },
    body: {
        text: Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_2_BODY"),
    }
};
// ------------------------------------------------------------------
// MILITARY QUEST 2
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
    onActivateCheck: (_item) => {
        return TutorialSupport.canQuestActivate("military_victory_quest_1_tracking", "military_victory_quest_2_tracking");
    },
    onObsoleteCheck: (_item) => {
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
            order: 2,
            state: VictoryQuestState.QUEST_UNSTARTED,
            content: militaryVictoryContent2
        },
        getDescriptionLocParams: () => {
            let techCompleteIcon = "[icon:QUEST_ITEM_OPEN]";
            let ideologyCompleteIcon = "[icon:QUEST_ITEM_OPEN]";
            const player = Players.get(GameContext.localPlayerID);
            if (player) {
                if (player.Culture?.isNodeUnlocked("NODE_CIVIC_MO_BRANCH_DEMOCRACY")) {
                    ideologyCompleteIcon = "[icon:QUEST_ITEM_COMPLETED]";
                }
                if (player.Culture?.isNodeUnlocked("NODE_CIVIC_MO_BRANCH_FASCISM")) {
                    ideologyCompleteIcon = "[icon:QUEST_ITEM_COMPLETED]";
                }
                if (player.Culture?.isNodeUnlocked("NODE_CIVIC_MO_BRANCH_COMMUNISM")) {
                    ideologyCompleteIcon = "[icon:QUEST_ITEM_COMPLETED]";
                }
                if (player.Techs?.isNodeUnlocked("NODE_TECH_MO_COMBUSTION")) {
                    techCompleteIcon = "[icon:QUEST_ITEM_COMPLETED]";
                }
            }
            return [ideologyCompleteIcon, techCompleteIcon];
        },
    },
    runAllTurns: true,
    activationCustomEvents: ["user-interface-loaded-and-ready"],
    completionEngineEvents: ["CultureNodeCompleted", "TechNodeCompleted"],
    onCleanUp: (item) => {
        TutorialSupport.activateNextTrackedQuest(item);
    },
    onCompleteCheck: (_item) => {
        let bTechComplete = false;
        let bIdeologyComplete = false;
        const player = Players.get(GameContext.localPlayerID);
        if (player) {
            if (player.Culture?.isNodeUnlocked("NODE_CIVIC_MO_BRANCH_DEMOCRACY")) {
                bIdeologyComplete = true;
            }
            if (player.Culture?.isNodeUnlocked("NODE_CIVIC_MO_BRANCH_FASCISM")) {
                bIdeologyComplete = true;
            }
            if (player.Culture?.isNodeUnlocked("NODE_CIVIC_MO_BRANCH_COMMUNISM")) {
                bIdeologyComplete = true;
            }
            if (player.Techs?.isNodeUnlocked("NODE_TECH_MO_COMBUSTION")) {
                bTechComplete = true;
            }
        }
        if (bTechComplete && bIdeologyComplete) {
            return true;
        }
        return false;
    }
});
const militaryVictoryContent3 = {
    title: "LOC_TUTORIAL_MILITARY_QUEST_3_TITLE",
    advisor: {
        text: "LOC_TUTORIAL_MILITARY_QUEST_3_ADVISOR_BODY",
    },
    body: {
        text: Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_3_BODY"),
    }
};
// ------------------------------------------------------------------
// MILITARY QUEST 3
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
    onActivateCheck: (_item) => {
        return TutorialSupport.canQuestActivate("military_victory_quest_2_tracking", "military_victory_quest_3_tracking");
    },
    onObsoleteCheck: (_item) => {
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
            let techCompleteIcon = "[icon:QUEST_ITEM_OPEN]";
            let conquestCompleteIcon = "[icon:QUEST_ITEM_OPEN]";
            const player = Players.get(GameContext.localPlayerID);
            if (player) {
                if (player.Techs?.isNodeUnlocked("NODE_TECH_MO_COMBUSTION")) {
                    techCompleteIcon = "[icon:QUEST_ITEM_COMPLETED]";
                }
                let playerCities = player.Cities?.getCities();
                if (playerCities) {
                    for (let i = 0; i < playerCities.length; ++i) {
                        let city = playerCities[i];
                        if (city.originalOwner != player.id) {
                            conquestCompleteIcon = "[icon:QUEST_ITEM_COMPLETED]";
                        }
                    }
                }
            }
            return [techCompleteIcon, conquestCompleteIcon];
        },
    },
    runAllTurns: true,
    activationCustomEvents: ["user-interface-loaded-and-ready"],
    completionEngineEvents: ["TechNodeCompleted", "CityTransfered", "PlayerTurnActivated"],
    onCleanUp: (item) => {
        TutorialSupport.activateNextTrackedQuest(item);
    },
    onCompleteCheck: (_item) => {
        let bTechComplete = false;
        let bConquestComplete = false;
        const player = Players.get(GameContext.localPlayerID);
        if (player) {
            if (player.Techs?.isNodeUnlocked("NODE_TECH_MO_COMBUSTION")) {
                bTechComplete = true;
            }
            let playerCities = player.Cities?.getCities();
            if (playerCities) {
                for (let i = 0; i < playerCities.length; ++i) {
                    let city = playerCities[i];
                    if (city.originalOwner != player.id) {
                        bConquestComplete = true;
                    }
                }
            }
        }
        if (bTechComplete && bConquestComplete) {
            return true;
        }
        return false;
    }
});
// ------------------------------------------------------------------
// MILITARY QUEST 4
const MILITARY_QUEST_4_PTS_REQUIRED = 10;
const militaryVictoryContent4 = {
    title: "LOC_TUTORIAL_MILITARY_QUEST_4_TITLE",
    advisor: {
        text: "LOC_TUTORIAL_MILITARY_QUEST_4_ADVISOR_BODY",
    },
    body: {
        text: Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_4_BODY", MILITARY_QUEST_4_PTS_REQUIRED),
    }
};
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
    onActivateCheck: (_item) => {
        return TutorialSupport.canQuestActivate("military_victory_quest_4_tracking", "military_victory_quest_4_tracking");
    },
    onObsoleteCheck: (_item) => {
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
            const player = Players.get(GameContext.localPlayerID);
            let iPointsCurrent = 0;
            let iPointsGoal = MILITARY_QUEST_4_PTS_REQUIRED;
            if (player) {
                const score = player.LegacyPaths?.getScore("LEGACY_PATH_MODERN_MILITARY");
                if (score) {
                    iPointsCurrent = score;
                }
            }
            return [iPointsCurrent, iPointsGoal];
        },
    },
    runAllTurns: true,
    activationCustomEvents: ["user-interface-loaded-and-ready"],
    completionEngineEvents: ["VPChanged"],
    onCleanUp: (item) => {
        TutorialSupport.activateNextTrackedQuest(item);
    },
    onCompleteCheck: (_item) => {
        const player = Players.get(GameContext.localPlayerID);
        let iPointsCurrent = 0;
        let iPointsGoal = MILITARY_QUEST_4_PTS_REQUIRED;
        if (player) {
            const score = player.LegacyPaths?.getScore("LEGACY_PATH_MODERN_MILITARY");
            if (score) {
                iPointsCurrent = score;
            }
        }
        if (iPointsCurrent >= iPointsGoal) {
            return true;
        }
        return false;
    }
});
// ------------------------------------------------------------------
// MILITARY QUEST 5
const MILITARY_QUEST_5_PTS_REQUIRED = 15;
const militaryVictoryContent5 = {
    title: "LOC_TUTORIAL_MILITARY_QUEST_5_TITLE",
    advisor: {
        text: "LOC_TUTORIAL_MILITARY_QUEST_5_ADVISOR_BODY",
    },
    body: {
        text: Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_5_BODY", MILITARY_QUEST_5_PTS_REQUIRED),
    }
};
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
    onActivateCheck: (_item) => {
        return TutorialSupport.canQuestActivate("military_victory_quest_3_tracking", "military_victory_quest_5_tracking");
    },
    onObsoleteCheck: (_item) => {
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
            order: 5,
            state: VictoryQuestState.QUEST_UNSTARTED,
            content: militaryVictoryContent5
        },
        getDescriptionLocParams: () => {
            const player = Players.get(GameContext.localPlayerID);
            let iPointsCurrent = 0;
            let iPointsGoal = MILITARY_QUEST_5_PTS_REQUIRED;
            if (player) {
                const score = player.LegacyPaths?.getScore("LEGACY_PATH_MODERN_MILITARY");
                if (score) {
                    iPointsCurrent = score;
                }
            }
            return [iPointsCurrent, iPointsGoal];
        },
    },
    runAllTurns: true,
    activationCustomEvents: ["user-interface-loaded-and-ready"],
    completionEngineEvents: ["VPChanged"],
    onCleanUp: (item) => {
        TutorialSupport.activateNextTrackedQuest(item);
    },
    onCompleteCheck: (_item) => {
        const player = Players.get(GameContext.localPlayerID);
        let iPointsCurrent = 0;
        let iPointsGoal = MILITARY_QUEST_5_PTS_REQUIRED;
        if (player) {
            const score = player.LegacyPaths?.getScore("LEGACY_PATH_MODERN_MILITARY");
            if (score) {
                iPointsCurrent = score;
            }
        }
        if (iPointsCurrent >= iPointsGoal) {
            return true;
        }
        return false;
    }
});
// ------------------------------------------------------------------
// MILITARY QUEST 6
const MILITARY_QUEST_6_PTS_REQUIRED = 20;
const militaryVictoryContent6 = {
    title: "LOC_TUTORIAL_MILITARY_QUEST_6_TITLE",
    advisor: {
        text: "LOC_TUTORIAL_MILITARY_QUEST_6_ADVISOR_BODY",
    },
    body: {
        text: Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_6_BODY", MILITARY_QUEST_6_PTS_REQUIRED),
    }
};
TutorialManager.add({
    ID: "military_victory_quest_6_start",
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleCenter,
        advisorType: TutorialAdvisorType.Military,
        ...militaryVictoryContent6,
        option1: {
            callback: () => {
                QuestTracker.setQuestVictoryStateById("military_victory_quest_6_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
            }, text: "LOC_TUTORIAL_CALLOUT_ACCEPT_QUEST", actionKey: "inline-accept", closes: true
        },
        option2: calloutDeclineQuest,
    },
    activationCustomEvents: [QuestCompletedEventName],
    onActivateCheck: (_item) => {
        return TutorialSupport.canQuestActivate("military_victory_quest_5_tracking", "military_victory_quest_6_tracking");
    },
    onObsoleteCheck: (_item) => {
        return QuestTracker.isQuestVictoryInProgress("military_victory_quest_6_tracking");
    }
});
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "military_victory_quest_6_tracking",
    quest: {
        title: Locale.compose("LOC_TUTORIAL_MILITARY_QUEST_6_TRACKING_TITLE"),
        description: "LOC_TUTORIAL_MILITARY_QUEST_6_TRACKING_BODY",
        victory: {
            type: AdvisorTypes.MILITARY,
            order: 6,
            state: VictoryQuestState.QUEST_UNSTARTED,
            content: militaryVictoryContent6
        },
        getDescriptionLocParams: () => {
            const player = Players.get(GameContext.localPlayerID);
            let iPointsCurrent = 0;
            let iPointsGoal = MILITARY_QUEST_6_PTS_REQUIRED;
            if (player) {
                const score = player.LegacyPaths?.getScore("LEGACY_PATH_MODERN_MILITARY");
                if (score) {
                    iPointsCurrent = score;
                }
            }
            return [iPointsCurrent, iPointsGoal];
        },
    },
    runAllTurns: true,
    activationCustomEvents: ["user-interface-loaded-and-ready"],
    completionEngineEvents: ["VPChanged"],
    onCleanUp: (item) => {
        TutorialSupport.activateNextTrackedQuest(item);
    },
    onCompleteCheck: (_item) => {
        const player = Players.get(GameContext.localPlayerID);
        let iPointsCurrent = 0;
        let iPointsGoal = MILITARY_QUEST_6_PTS_REQUIRED;
        if (player) {
            const score = player.LegacyPaths?.getScore("LEGACY_PATH_MODERN_MILITARY");
            if (score) {
                iPointsCurrent = score;
            }
        }
        if (iPointsCurrent >= iPointsGoal) {
            return true;
        }
        return false;
    }
});
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "military_victory_quest_line_completed",
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleCenter,
        advisorType: TutorialAdvisorType.Military,
        title: "LOC_TUTORIAL_MILITARY_QUEST_LINE_COMPLETED_TITLE",
        advisor: {
            text: "LOC_TUTORIAL_MILITARY_QUEST_LINE_COMPLETED_ADVISOR_BODY",
            getLocParams: (_item) => {
                let civAdj = "";
                const player = Players.get(GameContext.localPlayerID);
                if (player) {
                    civAdj = player.civilizationAdjective;
                }
                return [civAdj];
            }
        },
        body: {
            text: "LOC_TUTORIAL_MILITARY_QUEST_LINE_COMPLETED_BODY"
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
        //if not final age, show this popup. Otherwise show the Victory popup at the bottom of this file.
        if (!Game.AgeProgressManager.isFinalAge) {
            return QuestTracker.isQuestVictoryCompleted("military_victory_quest_6_tracking");
        }
        return false;
    }
});
// ------------------------------------------------------------------
//					COMPLETE VICTORIES
// ------------------------------------------------------------------
// CULTURE VICTORY
TutorialManager.add({
    ID: "culture_victory_available",
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleCenter,
        title: "LOC_TUTORIAL_CULTURE_VICTORY_AVAILABLE_TITLE",
        body: {
            text: Locale.compose("LOC_TUTORIAL_CULTURE_VICTORY_AVAILABLE_BODY"),
        },
        option1: {
            callback: () => {
                QuestTracker.setQuestVictoryStateById("culture_victory_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
            }, text: "LOC_TUTORIAL_CALLOUT_CONTINUE", actionKey: "inline-accept", closes: true
        },
    },
    activationCustomEvents: [QuestCompletedEventName],
    onActivateCheck: (_item) => {
        // Make sure the quest before this quest is completed
        if (Game.AgeProgressManager.isFinalAge) {
            return QuestTracker.isQuestVictoryCompleted("culture_victory_quest_6_tracking");
        }
        return false;
    },
    onObsoleteCheck: (_item) => {
        return QuestTracker.isQuestVictoryInProgress("culture_victory_tracking");
    },
    nextID: "culture_victory_tracking"
});
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "culture_victory_tracking",
    quest: {
        title: Locale.compose("LOC_TUTORIAL_CULTURE_VICTORY_TRACKER_TITLE"),
        description: "LOC_TUTORIAL_CULTURE_VICTORY_TRACKER_BODY",
        getDescriptionLocParams: () => {
            let wonderBuilt = "[icon:QUEST_ITEM_OPEN]";
            return [wonderBuilt];
        },
    },
    runAllTurns: true,
    completionEngineEvents: ["TeamVictory"],
});
// ------------------------------------------------------------------
// MILITARY VICTORY
TutorialManager.add({
    ID: "military_victory_available",
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleCenter,
        title: "LOC_TUTORIAL_MILITARY_VICTORY_AVAILABLE_TITLE",
        body: {
            text: Locale.compose("LOC_TUTORIAL_MILITARY_VICTORY_AVAILABLE_BODY"),
        },
        option1: {
            callback: () => {
                QuestTracker.setQuestVictoryStateById("military_victory_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
            }, text: "LOC_TUTORIAL_CALLOUT_CONTINUE", actionKey: "inline-accept", closes: true
        },
    },
    activationCustomEvents: [QuestCompletedEventName],
    onActivateCheck: (_item) => {
        // Make sure the quest before this quest is completed
        if (Game.AgeProgressManager.isFinalAge) {
            return QuestTracker.isQuestVictoryCompleted("military_victory_quest_6_tracking");
        }
        return false;
    },
    onObsoleteCheck: (_item) => {
        return QuestTracker.isQuestVictoryInProgress("military_victory_tracking");
    },
    nextID: "military_victory_tracking"
});
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "military_victory_tracking",
    quest: {
        title: Locale.compose("LOC_TUTORIAL_MILITARY_VICTORY_TRACKER_TITLE"),
        description: "LOC_TUTORIAL_MILITARY_VICTORY_TRACKER_BODY",
        getDescriptionLocParams: () => {
            let ivyProjectComplete = "[icon:QUEST_ITEM_OPEN]";
            return [ivyProjectComplete];
        },
    },
    runAllTurns: true,
    completionEngineEvents: ["TeamVictory"],
});
// ------------------------------------------------------------------
// SCIENCE VICTORY
TutorialManager.add({
    ID: "science_victory_available",
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleCenter,
        title: "LOC_TUTORIAL_SCIENCE_VICTORY_AVAILABLE_TITLE",
        body: {
            text: Locale.compose("LOC_TUTORIAL_SCIENCE_VICTORY_AVAILABLE_BODY"),
        },
        option1: {
            callback: () => {
                QuestTracker.setQuestVictoryStateById("science_victory_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
            }, text: "LOC_TUTORIAL_CALLOUT_CONTINUE", actionKey: "inline-accept", closes: true
        },
    },
    activationCustomEvents: [QuestCompletedEventName],
    onActivateCheck: (_item) => {
        // Make sure the quest before this quest is completed
        if (Game.AgeProgressManager.isFinalAge) {
            return QuestTracker.isQuestVictoryCompleted("science_victory_quest_4_tracking");
        }
        return false;
    },
    onObsoleteCheck: (_item) => {
        return QuestTracker.isQuestVictoryInProgress("science_victory_tracking");
    },
    nextID: "science_victory_tracking"
});
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "science_victory_tracking",
    quest: {
        title: Locale.compose("LOC_TUTORIAL_SCIENCE_VICTORY_TRACKER_TITLE"),
        description: "LOC_TUTORIAL_SCIENCE_VICTORY_TRACKER_BODY",
        getDescriptionLocParams: () => {
            let projectComplete = "[icon:QUEST_ITEM_OPEN]";
            return [projectComplete];
        },
    },
    runAllTurns: true,
    completionEngineEvents: ["TeamVictory"],
});
// ------------------------------------------------------------------
// ECONOMIC VICTORY
TutorialManager.add({
    ID: "economic_victory_available",
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleCenter,
        title: "LOC_TUTORIAL_ECONOMIC_VICTORY_AVAILABLE_TITLE",
        body: {
            text: Locale.compose("LOC_TUTORIAL_ECONOMIC_VICTORY_AVAILABLE_BODY"),
        },
        option1: {
            callback: () => {
                QuestTracker.setQuestVictoryStateById("economic_victory_tracking", VictoryQuestState.QUEST_IN_PROGRESS);
            }, text: "LOC_TUTORIAL_CALLOUT_CONTINUE", actionKey: "inline-accept", closes: true
        },
    },
    activationCustomEvents: [QuestCompletedEventName],
    onActivateCheck: (_item) => {
        // Make sure the quest before this quest is completed
        if (Game.AgeProgressManager.isFinalAge) {
            return QuestTracker.isQuestVictoryCompleted("economic_victory_quest_6_tracking");
        }
        return false;
    },
    onObsoleteCheck: (_item) => {
        return QuestTracker.isQuestVictoryInProgress("economic_victory_tracking");
    },
    nextID: "economic_victory_tracking"
});
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "economic_victory_tracking",
    quest: {
        title: Locale.compose("LOC_TUTORIAL_ECONOMIC_VICTORY_TRACKER_TITLE"),
        description: "LOC_TUTORIAL_ECONOMIC_VICTORY_TRACKER_BODY",
        getDescriptionLocParams: () => {
            let KeyenesAction = 0;
            let KeyenesActionGoal = 0;
            let targetVictory = GameInfo.Victories.lookup("VICTORY_MODERN_ECONOMIC");
            const player = Players.get(GameContext.localPlayerID);
            if (player && targetVictory && player.LegacyPaths) {
                for (let thisPlayer of Players.getAlive()) {
                    if (thisPlayer.isAlive && thisPlayer.isMajor && thisPlayer.id != player.id) {
                        KeyenesActionGoal++;
                    }
                }
                for (let thisPlayer of Players.getAlive()) {
                    KeyenesAction += player.LegacyPaths.getVictoryPointsFromPlayer(targetVictory.$hash, thisPlayer.id);
                }
            }
            return [KeyenesAction, KeyenesActionGoal];
        },
    },
    runAllTurns: true,
    completionEngineEvents: ["TeamVictory"],
    onCompleteCheck: (_item) => {
        if (TutorialManager.activatingEventName == "TeamVictory") {
            return true;
        }
        return false;
    }
});
// ------------------------------------------------------------------
TutorialManager.process("modern quest items"); // Must appear at end of item bank!

//# sourceMappingURL=file:///age-modern/ui/tutorial/tutorial-quest-items-modern.js.map
