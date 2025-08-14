/**
 * @file narrative-quest-manager
 * @copyright 2023, Firaxis Games
 * @description Intermediary script that handles the events for narrative quests and translates them to the quest tracker
 * 
 */

import QuestTracker from "/base-standard/ui/quest-tracker/quest-tracker.js";
import { QuestItem } from "/base-standard/ui/quest-tracker/quest-item.js";

class NarrativeQuestManagerClass {
	private static instance: NarrativeQuestManagerClass | null = null;

	private narrativeQuestUpdateListener = (event: NarrativeQuestUpdate_EventData) => { this.onNarrativeQuestUpdate(event); };
	private narrativeQuestCompleteListener = (event: NarrativeQuestComplete_EventData) => { this.onNarrativeQuestComplete(event); };

	constructor() {
		if (NarrativeQuestManagerClass.instance) {
			console.error("Attempt to create more than one narrative quest manager class; ignoring call.")
		} else {
			NarrativeQuestManagerClass.instance = this;
			this.initializeListeners();
			this.initializeActiveNarrativeQuests();
		}
	}

	private initializeListeners() {
		engine.on('NarrativeQuestUpdated', this.narrativeQuestUpdateListener);
		engine.on('NarrativeQuestCompleted', this.narrativeQuestCompleteListener);
	}

	//Query any quests already active (loading a game, hotloading)
	private initializeActiveNarrativeQuests() {
		//TODO: finish implementing once Justin adds a way to query the actual active quests instead of the static data objects
		const playerStories: PlayerStories | undefined = Players.get(GameContext.localObserverID)?.Stories;
		if (!playerStories) {
			console.error("narrative-quest-manager: No valid PlayerStories object attached to player with id: " + GameContext.localObserverID.toString());
			return;
		}

		const activeQuests: NarrativeQuest[] | null = playerStories.getActiveQuests();
		if (!activeQuests) {
			return;
		}
		activeQuests.forEach(quest => {
			const storyDef: NarrativeStoryDefinition | null = GameInfo.NarrativeStories.lookup(quest.story);
			if (!storyDef) {
				console.error("narrative-quest-manager: No valid story definition for NarrativeStoryType of " + quest.story.toString());
				return;
			}

			var variableText = playerStories.determineNarrativeInjectionStoryType(quest.story, StoryTextTypes.IMPERATIVE);
			if (variableText === "") {
				variableText = playerStories.determineNarrativeInjectionStoryType(quest.story, StoryTextTypes.REWARD);
			}
			const questItem: QuestItem = {
				id: quest.storyId.toString(),
				system: "narrative",
				title: storyDef.StoryTitle ? Locale.compose(storyDef.StoryTitle) : Locale.compose(storyDef.Name),
				description: Locale.stylize(variableText),
				progressType: "", //TODO: Implement once data includes this
				progress: quest.progress != -1 ? quest.progress.toString() : undefined,
				goal: quest.goal != -1 ? quest.goal.toString() : undefined,
				endTurn: quest.endTurn
			}
			QuestTracker.add(questItem);
		});
	}

	private onNarrativeQuestUpdate(event: NarrativeQuestUpdate_EventData) {
		const playerStories: PlayerStories | undefined = Players.get(GameContext.localObserverID)?.Stories;
		if (!playerStories) {
			console.error("narrative-quest-manager: No valid PlayerStories object attached to player with id: " + GameContext.localObserverID.toString());
			return;
		}

		if (event.player != GameContext.localObserverID) {
			return;
		}

		const storyDef: NarrativeStoryDefinition | null = GameInfo.NarrativeStories.lookup(event.story);
		if (!storyDef) {
			console.error("narrative-quest-manager: No valid story definition for NarrativeStoryType of " + event.story.toString());
			return;
		}

		if (storyDef.Imperative == undefined) {
			console.error("narrative-quest-manager: No valid Imperative variable (quest objective) for story definition with NarrativeStoryType of " + event.story.toString());
			//TODO: Eventually we will want to early out here if there is no Imperative text as that is the "description" (quest objective) we want to show. For now we can fall back to the description field untiul Imperitive is implemented fully
		}

		console.error("**********");
		console.error("**********");
		console.error("**********");
		console.error("**********");
		console.error("**********");
		console.error("**********");
		console.error(event.story.toString());
		var variableText = playerStories.determineNarrativeInjectionStoryType(event.story, StoryTextTypes.IMPERATIVE);
		if (variableText === "") {
			variableText = playerStories.determineNarrativeInjectionStoryType(event.story, StoryTextTypes.REWARD);
		}

		console.error("**********");
		console.error("**********");
		console.error("**********");
		console.error("**********");
		console.error("**********");
		console.error("**********");
		console.error(variableText);
		console.error(event.story.toString());

		const questItem: QuestItem = {
			id: event.storyId.toString(),
			system: "narrative",
			title: storyDef.StoryTitle ? Locale.compose(storyDef.StoryTitle) : Locale.compose(storyDef.Name),
			description: Locale.stylize(variableText),
			progressType: "", //TODO: Implement once data includes this
			progress: event.progress != -1 ? event.progress.toString() : undefined,
			goal: event.goal != -1 ? event.goal.toString() : undefined,
			endTurn: event.endTurn
		}

		QuestTracker.add(questItem);
	}

	private onNarrativeQuestComplete(event: NarrativeQuestComplete_EventData) {
		if (event.player != GameContext.localObserverID) {
			return;
		}
		//TODO: Should we do anything else to notify the player that this quest is complete? Popup? Notification? High-five?
		QuestTracker.remove(event.storyId.toString(), "narrative");
	}
}

const NarrativeQuestManager: NarrativeQuestManagerClass = new NarrativeQuestManagerClass();
export { NarrativeQuestManager as default };