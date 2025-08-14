/**
 * @file tutorial-events
 * @copyright 2024, Firaxis Games
 * @description Events related to the tutorial system
 * 
 */
/// <reference path="../../../core/ui/component-support.ts" />

/**
 * Details type in the custom event signaled when the callout is closed
 */
export type LowerCalloutDetails = {
	itemID: string,			// tutorial ID associated with this callout
	optionNum: 1 | 2 | 3,	// option number 0-num (or -1 if auto-closed) selected
	nextID?: string,		// if a next tutorial ID is associated with a button, the ID name
	closed: boolean			// should the callout consider to be closed?
} | { closed: boolean };

export class LowerCalloutEvent extends CustomEvent<LowerCalloutDetails> {
	constructor(detail: LowerCalloutDetails) {
		super('LowerCalloutEvent', { bubbles: false, cancelable: true, detail });
	}
}

/**
 * Details type in the custom event signaled when the callout is closed
 */
export type LowerQuestPanelDetails = {
	itemID: string,				// tutorial ID associated with this callout
	advisorPath: AdvisorType,	// advisor path selected (triggers next quest items)
	nextID?: string,			// if a next tutorial ID is associated with a button, the ID name
	closed: boolean				// should the callout consider to be closed?
}

export class LowerQuestPanelEvent extends CustomEvent<LowerQuestPanelDetails> {
	constructor(detail: LowerQuestPanelDetails) {
		super('LowerQuestPanelEvent', { bubbles: false, cancelable: true, detail });
	}
}