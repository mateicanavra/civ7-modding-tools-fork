/**
 * @file quest-item.ts
 * @copyright 2023, Firaxis Games
 * @description A single item to be tracked in the quest tracker.
 */

import { TutorialQuestContent } from "/base-standard/ui/tutorial/tutorial-item.js";

type SystemType = "tutorial" | "narrative" | "ageless";

/**
 * Tracked item by quest system.
 */
export type QuestItem = {

	/** Unique identifier, at least within it's own system. */
	id: string;

	/** which system (e.g., "tutorial", "narrative", etc..) this comes from. */
	system: SystemType;

	/** Title to display for the item. */
	title: string;

	/** Details on the quest item; what to do. */
	description: string;

	/** Callback to get additional params for a description loc string */
	getDescriptionLocParams?: () => LocalizedTextArgument[];

	/** How far the player has progressed in completing the quest. */
	progress?: string;

	/** Callback to figure out how far along the quest the player is */
	getCurrentProgress?: () => string;

	/** How to display the progress */
	progressType: string;

	/** How far the player has to progress to complete the quest */
	goal?: string;

	/** Callback to figure out goal for the quest */
	getCurrentGoal?: () => string;

	/** How many turns the player has to complete this quest */
	endTurn?: number;

	/** Can the player cancel this quest? */
	cancelable?: boolean;

	/** Data for Victory Advisor Quests (miscelaneous or milestones) */
	victory?: VictoryQuest;
}

export enum VictoryQuestState {
	QUEST_UNSTARTED,
	QUEST_IN_PROGRESS,
	QUEST_COMPLETED,
}

export type VictoryQuest = {
	type: AdvisorType;
	order: number;
	state: VictoryQuestState;
	/** A detailed content for a Victory to show  */
	content?: TutorialQuestContent;
}