/**
 * @file quest-item.ts
 * @copyright 2023, Firaxis Games
 * @description A single item to be tracked in the quest tracker.
 */
export var VictoryQuestState;
(function (VictoryQuestState) {
    VictoryQuestState[VictoryQuestState["QUEST_UNSTARTED"] = 0] = "QUEST_UNSTARTED";
    VictoryQuestState[VictoryQuestState["QUEST_IN_PROGRESS"] = 1] = "QUEST_IN_PROGRESS";
    VictoryQuestState[VictoryQuestState["QUEST_COMPLETED"] = 2] = "QUEST_COMPLETED";
})(VictoryQuestState || (VictoryQuestState = {}));

//# sourceMappingURL=file:///base-standard/ui/quest-tracker/quest-item.js.map
