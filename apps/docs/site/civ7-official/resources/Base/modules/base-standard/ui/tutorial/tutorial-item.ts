/**
 * @file tutorial-item.ts
 * @copyright 2020-2024, Firaxis Games
 * @description What makes up the pieces of a tutorial item, one "unit" of tutorial content.
 * 
 * @notes Common between activation and completion 
 * 		Event (or turn)?
 * 		(optional) Script condition
 *      (optional) Script to run if conditions are true
 *      (optional) Player(s) involved in event
 *      (optional) eval on all turns or just local?
 */

import { QuestItem } from '/base-standard/ui/quest-tracker/quest-item.js';
import { Tutorial } from '/base-standard/ui/tutorial/tutorial-highlighter.js';
import { DisplayRequestCategory, IDisplayRequestBase } from '/core/ui/context-manager/display-handler.js';
import { InputFilter } from '/core/ui/input/input-filter.js';

/**
 * @description The state of a tutorial item.
 * 
 * ! IMPORTANT !
 * These enums are serialized to the save game so adding new values should only
 * be added on the end or previously existing saves will break.
 */
export enum TutorialItemState {
	Unseen = 0,		// Not shown to player
	Active = 1,		// Item being shown to player; these are modal and expire at the end of the player's turn
	Completed = 2,	// No longer shown	
	Persistent = 3	// Item is "active" but lasts across turns and doens't block other items
}

/**
 * Tutorial items are associated with a particular level.
 * 0 = off, and the higher the # generally the more messages will be seen.
 */
export enum TutorialLevel {
	None = 0,		// Off - used for turning of the tutorial system
	// 1 reserved
	WarningsOnly = 2,	// Only Warnings - tutorial doesn't run (only advisor warnings)	
	// 3 reserved
	TutorialOn = 4,	// Tutorials - all tutorials active
}

/**
 * How the item behaves.
 */
export enum ItemType {
	PerTurn = 0,	// Item only exists for the turn, auto-completes when next turn starts
	Persistent = 1,	// Item stays persistent across turns
	Tracked = 2,	// Not only stays persistent but shown in Quest Tracker
	Legacy = 3		// The quest is added (to the Quest Tracker) even if the Tutorial Manager doesn't process the added items
}

export enum TutorialAnchorPosition {
	TopLeft = "top-left",
	TopCenter = "top-center",
	TopRight = "top-right",
	MiddleLeft = "middle-left",
	MiddleCenter = "middle-center",
	MiddleRight = "middle-right",
	BottomLeft = "bottom-left",
	BottomCenter = "bottom-center",
	BottomRight = "bottom-right"
}

export enum NextItemStatus {
	Canceled = "NextItemCanceled"
}

export enum TutorialAdvisorType {
	Default = "advisor-default",
	Military = "advisor-military",
	Culture = "advisor-culture",
	Science = "advisor-science",
	Economic = "advisor-economic"
}

/**
 * Subset of the QuestItem that is specific for a tutorial define.
 * Certain fields (e.g., ID) are omitted as they are provided from the tutorial item itself
 * when generating the actual QuestItem.
 */
export interface TutorialQuestItem extends Pick<QuestItem, 'title' | 'description' | 'getDescriptionLocParams' | 'getCurrentProgress' | 'goal' | 'victory'> {
	progressType?: string;

	/** If true adds a cancel quest option for the triggering callout */
	cancelable?: boolean;
}


type HTMLSelector = string;
type NamedSystems = "city-banners" | "unit-flags" | "world-input" | "world-unit-input" | "world-city-input";	// TODO:  village-banner


/**
 * TODO: implement
 * A common block used in tutorial items.
 * Used for: activate, complete, obsolete
 */
export interface TutorialTrigger {
	events?: string[];											// Event name(s) that trigger this block
	triggered?: (item: TutorialItem) => boolean;				// Script to check situation, returns true if trigger should occur
	onTriggered: (item: TutorialItem) => void;					// Script that is called when trigger occurs.
	players?: PlayerId[];										// If specified, a player ID must exist in the environment for this to trigger
	localTurnOnly?: boolean;									// (true) Only run on the local player's turn, if false, can trigger on other player's turn
	nextStates?: { id: string, state: TutorialItemState }[];	// If trigger becomes true, move the items to the next state.
	chainID?: string;											// another tutorial ID to evaluate for activation when this trigger occurs
}

/**
 * Defines a way to select a specific element using element attributes. 
 * Indicates a container where you can look the specific item. 
 * This is useful for the scenario where there are two identical items but in different containers.
 * Then you can highlight the item you are looking for
 */
export interface TutorialDynamicHighlight {
	containerSelector: ElementAttributeSelector;
	itemSelector: ElementAttributeSelector
}

export interface ElementAttributeSelector {
	baseSelector: HTMLSelector;
	attributeSelector?: AttributeSelector;
}

export interface AttributeSelector {
	attributeName: string;
	attributeValue: string;
}

/**
 * Defines what pieces exist in a tutorial item definition.
 */
export type TutorialDefinition = {
	ID: string;
	nextID?: string | undefined;				// ID of the next tutorial item to auto-deliver after this one
	alsoActivateID?: string;					// optional ID to also activate once this one has been finished activating
	level?: TutorialLevel;						// Minimum level of experience for this item to be displayed
	isPersistent?: boolean;						// Does the item exist past the turn it is activated?
	onActivate?: (item: TutorialItem) => void;	// Activates directly before a tutorial item is activated. 
	onCleanUp?: (item: TutorialItem) => void;	// Activates after tutorial item is removed from active.
	skip?: boolean;								// Should this item be skipped (auto-seen)	
	runAllTurns?: boolean;						// Can the tutorial event be evaluated to active when it's not during the player's turn
	filterPlayers?: PlayerId[];					// Which players is this item valid for? (If unset, assumes localplayer. If empty array assume any player)
	activationCustomEvents?: string[];			// A (custom) event that will activate this tutorial item
	activationEngineEvents?: string[];			//TODO: these events need to be reworked to allow for the updated ContextManager carrying the screen in the detail payload, as opposed to encoded in the string. 
	completionEngineEvents?: string[];			//TODO: these events need to be reworked to allow for the updated ContextManager carrying the screen in the detail payload, as opposed to encoded in the string. 
	completionCustomEvents?: string[];			//A (custom) event that will start the completion check for this tutorial item
	onActivateCheck?: (item: TutorialItem) => boolean;			// additional criteria to be met if an event is raising
	onCompleteCheck?: (item: TutorialItem) => boolean;			// When activated, will check if this condition is true to close.
	onObsoleteCheck?: (item: TutorialItem) => boolean;			// If true, will automatically complete an unseen item without activating it.
	shouldCalloutHide?: () => boolean;							// check if tutorial item should be hidden
	inputContext?: InputContext;								// item can only be seen in this inputContext
	dialog?: TutorialDialogDefinition;
	callout?: TutorialCalloutDefinition;
	questPanel?: TutorialQuestPanelDefinition;
	highlights?: HTMLSelector[];								// Elements to highlight when this tutorial item is active.
	dynamicHighlights?: TutorialDynamicHighlight[];				// Specific elements to highlight when this tutorial item is active.
	enabled2d?: HTMLSelector[];									// If set, the only content enabled on the screen (except for Pause menu, which is always available)
	disable?: NamedSystems[];									// Either false (to disable all 3D systems) or a list of names of 3D-subsystems to disable.
	hiders?: HTMLSelector[];									// Elements to hide when this tutorial item is active.
	quest?: TutorialQuestItem;									// Contents for a tracked quest item. (Essentially makes item persistent).
	highlightPlots?: PlotIndex[];								// Which plots todraw attention to for a certain tutorial step
	inputFilters?: InputFilter[];								// Filters for input manager. Pass an empty array to remove all filters.
	// TODO: Implement trigger processing below, and remove explicit items above:
	//activateTrigger? :TutorialTrigger;
	//completeTrigger? :TutorialTrigger;
}

/**
 * Meta data that can be applied to any tutorial item.
 */
export type TutorialItemModifiers = {
	isWelcomeInstructions?: boolean;	// Is a tutorial item labeled to auto-show at age startup for instructions?
	version?: number;					// Version # for overwrite functionality
	canDeliver?: (item: TutorialItem) => boolean; // is a tutorial item valid to be added into the Manager?
}


export type CalloutShortOptionCallback = {
	text?: string,
	nextID?: string
} & ({ text: string } | { nextID: string });


/**
 * A button that appears on a callout.
 */
export type TutorialCalloutOptionDefinition = {
	/** After effect when a callout is lowered by activating a button */
	callback: () => void;
	/** Label on the button */
	text: string;
	/** Associated keyboard or gamepad button to activate the button */
	actionKey: string;
	/** Does pressing this button close the callout? */
	closes?: boolean;
	/** Set to activate a tutorial item after this button is pressed */
	nextID?: string;
}

export type TutorialQuestPanelOptionDefinition = TutorialCalloutOptionDefinition & {
	questID: string;
	pathDesc: string;
}

/**
* Action prompt texts used for tutorial callouts
*/
export type TutorialActionPrompt = {
	kbm?: string;				// Keyboard and mouse prompt
	gamepad?: string;     		// Gamepad prompt. Be careful with the length of the prompt. If overflowing gives us strange behavior is better to break line [n]
	hybrid?: string;            // Hybrid gamepad + mouse prompt
	touch?: string;				// Touch prompt
	actionName?: string;		// Action icon for gamepad prompt
}

type CalloutDefinitionText<T extends string | undefined = string> = {
	text: T;                                                                   // html (can just be text or full HTML) to display in the callout
	getLocParams?: T extends string ? ((item: object) => LocalizedTextArgument[]) : never;    // function run just before raising callout; the return values are passed to Locale.compose as parameters to the body
}

type TutorialContentBody = {
	body: CalloutDefinitionText             // Body of text that is stylized for tutorial.
}

type TutorialContentAdvisor = {
	advisor: CalloutDefinitionText 			// Body of text that is stylized as-if it was from an advisor.
}

type TutorialCalloutContent = {
	body?: CalloutDefinitionText
	advisor?: CalloutDefinitionText
} & (TutorialContentBody | TutorialContentAdvisor) // One of two (body or advisorBody) has to be present at definition time

export enum TutorialCalloutType {
	BASE,
	NOTIFICATION
}
/**
 * Informational box that persists on top of the UI (modal) until a button is
 * pressed on it and/or a condition is met, such as openning a certain panel.
 */
export type TutorialCalloutDefinition = TutorialCalloutContent & {
	title?: string;												// optional title to display on the callout
	actionPrompts?: TutorialActionPrompt[],						// Action prompts for keyboard/mouse and gamepad
	anchorHost?: string;										// node in DOM to host callout, if undefined (or not found) "tutorial-display"
	option1?: TutorialCalloutOptionDefinition;
	option2?: TutorialCalloutOptionDefinition;
	option3?: TutorialCalloutOptionDefinition;
	anchorPosition?: TutorialAnchorPosition;  			// position to anchor a tutorial callout when no anchor host is defined, if undefined (or not found) top-center
	advisorType?: TutorialAdvisorType;
	type?: TutorialCalloutType;
}

export type TutorialQuestContent = TutorialCalloutContent & {
	title?: string;
}

export type AdvisorQuestPanel = {
	type: AdvisorType;
	quote?: string;
	button: TutorialQuestPanelOptionDefinition;
	legacyPathClassType: string;
}

export type TutorialQuestPanelDefinition = {
	title: string;
	description: CalloutDefinitionText;
	actionPrompts?: TutorialActionPrompt[],
	advisors: Array<AdvisorQuestPanel>;
	altNoAdvisorsDescription: CalloutDefinitionText;
}

export interface TutorialDialogDefinition {
	series?: TutorialDialogPageData[];	// Present an ordered series of pages to player
}

export interface TutorialDialogImageData {
	image: string | undefined;
	width?: string | number;
	height?: string | number;
	x?: string | number;
	y?: string | number;
}

export interface TutorialDialogPageData {
	images: TutorialDialogImageData[] | undefined;
	title: string | undefined;
	subtitle: string | undefined;
	body: string;
	backgroundImages: string[] | undefined;
}

/// Immediate information for a tutorial item about the running environment
export interface TutorialEnvironmentProperties {
	eventName: string;			// Name of a custom event that fired.
	event: any;					// Event object itself
	playerId: PlayerId;			// ID of the player that initiated the event
	altPlayerId: PlayerId;		// ID of the other player (if any) involved in the event
	isLocalPlayerTurn: boolean;	// Is it the player's turn or an opponent
}
const UnsetProperties: TutorialEnvironmentProperties = { eventName: "!", event: "@", playerId: -2, altPlayerId: -3, isLocalPlayerTurn: false };

/**
 * This is the internal information object that the TutorialManager uses.
 */
export default class TutorialItem implements IDisplayRequestBase {
	ID: string = "DEFAULT_TUTORIAL_NODE";
	group: number = -1;				// hash of processed label
	version: number = 0;			// higher versions overwrite same ID with lower ones
	nextID: string | undefined;
	alsoActivateID: string | undefined;
	properties: TutorialEnvironmentProperties = UnsetProperties;	// The tutorial environment properties that were used to activate this item (written out)
	level: TutorialLevel = TutorialLevel.TutorialOn;
	type: ItemType = ItemType.PerTurn;

	addToFront?: boolean | undefined;
	category: DisplayRequestCategory = "TutorialManager";
	priority?: number | undefined;
	subpriority?: number | undefined;

	/** If defined will attempt to override the default IDisplayQueue category for this tutorial item  */
	queueToOverride: DisplayRequestCategory | undefined;

	activationCustomEvents: string[] = [];
	activationEngineEvents: string[] = [];
	completionEngineEvents: string[] = [];
	completionCustomEvents: string[] = [];

	filterPlayers: PlayerId[] = [GameContext.localPlayerID];
	runAllTurns: boolean = false;		// default: only evalute the tutorial item during the player's turn 
	_skip: boolean = false;
	dialog?: TutorialDialogDefinition;
	callout?: TutorialCalloutDefinition;
	questPanel?: TutorialQuestPanelDefinition;
	highlights?: HTMLSelector[];
	dynamicHighlights?: TutorialDynamicHighlight[];
	enabled2d?: HTMLSelector[];
	disable?: NamedSystems[];
	hiders?: HTMLSelector[];
	inputContext?: InputContext;
	quest?: QuestItem;
	highlightPlots?: PlotIndex[];
	inputFilters?: InputFilter[];
	disablesPausing?: boolean | undefined;

	// the reference to the tutorial-callout pop up element 
	calloutElement: HTMLElement | null = null;

	onActivate?: (item: TutorialItem) => void;
	onCleanUp?: (item: TutorialItem) => void;
	onActivateCheck?: (item: TutorialItem) => boolean;	// If function set, must resolve to true to active.
	onCompleteCheck?: (item: TutorialItem) => boolean;	// Condition that is run when tutorial item is up, if ever true it completes and closes the tutorial item
	onObsoleteCheck?: (item: TutorialItem) => boolean;	// Condition that is run on unseen items to determine if item should be "obsoleted" which immediately completes without side-effects (does not chain activate, etc...)
	shouldCalloutHide?: () => boolean;					// check if tutorial item should be hidden

	eState: TutorialItemState = TutorialItemState.Unseen;
	hidden: boolean = false;
	get isUnseen(): boolean { return this.eState == TutorialItemState.Unseen; };
	get isActive(): boolean { return this.eState == TutorialItemState.Active; };
	get isResident(): boolean { return this.eState == TutorialItemState.Persistent; };
	get isCompleted(): boolean { return this.eState == TutorialItemState.Completed; };
	get skip(): boolean { return this._skip; }
	get isPersistent(): Readonly<boolean> { return this.type == ItemType.Persistent || this.type == ItemType.Tracked || this.type == ItemType.Legacy; };
	get isTracked(): Readonly<boolean> { return this.type == ItemType.Tracked || this.type == ItemType.Legacy; };
	get isLegacy(): Readonly<boolean> { return this.type == ItemType.Legacy; };
	get isHidden(): boolean { return this.hidden; };


	constructor(def: TutorialDefinition) {
		this.ID = def.ID ? def.ID : TutorialItem.prototype.ID;
		this.group = -1; // needs to be set by process
		this.nextID = def.nextID;
		this.alsoActivateID = def.alsoActivateID;
		this.onActivate = def.onActivate;
		this.onCleanUp = def.onCleanUp;
		this.onActivateCheck = def.onActivateCheck;
		this.onCompleteCheck = def.onCompleteCheck;
		this.onObsoleteCheck = def.onObsoleteCheck;
		this.shouldCalloutHide = def.shouldCalloutHide;

		// The following lines could be set via null coalescing but it's handy
		// using a traditional "if" check when debugging as it allows for 
		// setting break-points inside the assignment when true.

		if (def.level != undefined) {
			this.level = def.level;
		}
		if (def.runAllTurns != undefined) {
			this.runAllTurns = def.runAllTurns;
		}
		if (def.filterPlayers != undefined) {
			this.filterPlayers = def.filterPlayers;
		}
		if (def.activationCustomEvents != undefined) {
			this.activationCustomEvents = def.activationCustomEvents;
		}
		if (def.activationEngineEvents != undefined) {
			this.activationEngineEvents = def.activationEngineEvents;
		}
		if (def.completionEngineEvents != undefined) {
			this.completionEngineEvents = def.completionEngineEvents;
		}
		if (def.completionCustomEvents != undefined) {
			this.completionCustomEvents = def.completionCustomEvents;
		}

		if (def.skip != undefined) {
			this._skip = def.skip;
		}
		if (def.dialog != undefined) {
			this.dialog = def.dialog;
			this.disablesPausing = true;
		}
		if (def.callout != undefined) {
			this.callout = def.callout;
		}
		if (def.questPanel != undefined) {
			this.questPanel = def.questPanel;
		}
		if (def.highlights != undefined) {
			this.highlights = def.highlights;
		}
		if (def.dynamicHighlights != undefined) {
			this.dynamicHighlights = def.dynamicHighlights;
		}
		if (def.enabled2d != undefined) {
			this.enabled2d = def.enabled2d;
		}
		if (def.disable != undefined) {
			this.disable = def.disable;
		}
		if (def.hiders != undefined) {
			this.hiders = def.hiders;
		}
		if (def.inputContext != undefined) {
			this.inputContext = def.inputContext;
		}

		// Set type of item, if a tracked item, build full quest item.
		if (def.quest != undefined) {
			if (def.quest.victory != undefined) {
				this.type = ItemType.Legacy;
			} else {
				this.type = ItemType.Tracked;
			}
			this.quest = {
				id: this.ID,
				system: "tutorial",
				title: def.quest.title,
				description: def.quest.description,
				getDescriptionLocParams: def.quest.getDescriptionLocParams,
				getCurrentProgress: def.quest.getCurrentProgress,
				progressType: def.quest.progressType ? def.quest.progressType : "",
				goal: def.quest.goal,
				cancelable: def.quest.cancelable,
				victory: def.quest.victory
			}
		} else {
			this.type = (def.isPersistent) ? ItemType.Persistent : ItemType.PerTurn
		}

		if (def.highlightPlots != undefined) {
			this.highlightPlots = def.highlightPlots;
		}

		if (def.inputFilters != undefined) {
			this.inputFilters = def.inputFilters;
		}

		this.warnRepeatedActionKeys();
	}

	private warnRepeatedActionKeys() {
		const optionsActionKeys: Array<string> = [];
		if (this.callout) {
			if (this.callout.option1) {
				optionsActionKeys.push(this.callout.option1.actionKey);
			}
			if (this.callout.option2) {
				optionsActionKeys.push(this.callout.option2.actionKey);
			}
			if (this.callout.option3) {
				optionsActionKeys.push(this.callout.option3.actionKey);
			}
		}

		if ((new Set(optionsActionKeys)).size !== optionsActionKeys.length) {
			console.warn(`tutorial-item: Tutorial item with ID: ${this.ID} has duplicated "actionKeys". Current actionKeys: ${optionsActionKeys}`);
		}
	}

	// Once the item has been added and "processed" for delivery by the tutorial manager.
	private _processed: boolean = false;
	get processed(): boolean { return this._processed; }
	set processed(value: boolean) { this._processed = true; if (value == false) { console.error("Attempt to unprocess a tutorial item: ", this.ID) } }

	/**
	 * Helper to turn on/off any associate highlights with the tutorial item.
	 * @param {Tutorial.HighlightFunc} The function to call which highlights or unhighlights all nodes in the selector.
	 */
	private doHighlights(highlightFunc: Tutorial.HighlightFunc) {
		this.highlights?.forEach((selector: HTMLSelector) => {
			// waiting due to document may not be ready (interface changed, hotloading, etc)
			waitUntilValue(() => {
				const nodes: NodeListOf<HTMLElement> = document.querySelectorAll<HTMLElement>(selector);
				return nodes.length > 0 ? true : null;
			}).then(() => {
				const nodes: NodeListOf<HTMLElement> = document.querySelectorAll<HTMLElement>(selector);
				nodes.forEach((node: HTMLElement) => {
					highlightFunc(node);
				});
			}).catch((exception) => {
				// We only care for the exceptions thrown when the tutorial is active, when unhighlights happen we don't care the selector wasn't found
				if (this.isCompleted) {
					return;
				}
				if (exception as DOMException) {
					console.error(`Badly formatted selector when setting tutorial item to be (un)highlighed. item: ${this.ID}, selector: '${selector}'.`);
					return;
				}
				console.warn(`Promise rejected for tutorial (un)highlights. No selector ${selector} found for tutorial item: ${this.ID} in the DOM`);
			});
		});

		this.dynamicHighlights?.forEach((highlight: TutorialDynamicHighlight) => {

			const getQueryString = (item: ElementAttributeSelector): string => {
				const baseSelector: string = item.baseSelector;
				const attributeSelector: AttributeSelector | undefined = item.attributeSelector;
				const attributeQueryString: string = `${baseSelector}[${attributeSelector?.attributeName}="${attributeSelector?.attributeValue}"]`;
				const queryString: string = attributeSelector ? attributeQueryString : baseSelector;
				return queryString;
			}

			try {
				const containerQueryString: string = getQueryString(highlight.containerSelector);
				const container: HTMLElement | null = document.querySelector<HTMLElement>(containerQueryString);
				if (!container) {
					console.error(`Container not found, cannot set the highlight. item: ${this.ID}, selector: '${highlight.containerSelector}'.`);
					return;
				}

				const itemQueryString: string = getQueryString(highlight.itemSelector);
				const node: HTMLElement | null = container.querySelector(itemQueryString);
				if (!node) {
					console.error(`Item not found, cannot set the highlight. item: ${this.ID} ,attribute name: ${highlight.itemSelector.attributeSelector?.attributeName}, atribute value: '${highlight.itemSelector.attributeSelector?.attributeValue}'.`);
					return;
				}

				highlightFunc(node);
			}
			catch (exception: any) {
				if (exception as DOMException) {
					console.error(`Invalid selector on dynamic highlight. item: ${this.ID}, selector: '${highlight.containerSelector}'.`);
					return;
				}
				console.error(`Unhandled non-DOMException occurred when setting tutorial item to be (un)highlighed. item: ${this.ID}, exception: ${exception!.name}.`);
			}
		});
	}
	activateHighlights = () => { this.doHighlights(Tutorial.highlightElement); }
	deactivateHighlights = () => { this.doHighlights(Tutorial.unhighlightElement); }

	markActive(): boolean {
		if (this.isActive) {
			return false;
		}
		this.eState = (this.isPersistent ? TutorialItemState.Persistent : TutorialItemState.Active);
		if (this.onActivate) {
			this.onActivate(this);
		}
		return true;
	}

	markComplete(): boolean {
		if (this.isCompleted) {
			return false;
		}
		this.eState = TutorialItemState.Completed;
		this.deactivateHighlights();
		if (this.onCleanUp) {
			this.onCleanUp(this);
		}
		return true;
	}

	markUnseen(): boolean {
		if (this.isUnseen) {
			return false;
		}
		this.eState = TutorialItemState.Unseen;
		this.deactivateHighlights();
		if (this.onCleanUp) {
			this.onCleanUp(this);
		}
		return true;
	}

	/**
	 * Is the environment compatible with the item's expected environment?
	 * @param {TutorialEnvironmentProperties} properties that describe the environment the item is running in.
	 * @returns {boolean} true if properties are a match.
	 */
	runsInEnvironment(properties: TutorialEnvironmentProperties): boolean {

		// Only activate if it's the players turn or if checks are allowed past player's turn
		if (!properties.isLocalPlayerTurn && !this.runAllTurns) {
			return false;
		}
		if (this.activationEngineEvents && this.activationEngineEvents.length > 0) {
			if (this.activationEngineEvents?.find(name => name == properties.eventName)) {
				this.properties = properties;
				return true;
			}
		}
		if (this.activationCustomEvents && this.activationCustomEvents.length > 0) {
			if (this.activationCustomEvents?.find(name => name == properties.eventName)) {
				this.properties = properties;
				return true;
			}
		}
		if (this.activationEngineEvents == undefined && this.activationCustomEvents == undefined) {
			this.properties = properties;
			return true;	// no raising events at all, likelyt this is a chained item
		}
		return false;
	}

	/**
	 * Writes a value for the current tutorial item to the current save files.
	 */
	writeMem(value: any): void {
		const hash: HashId = Database.makeHash("__MEM-" + this.ID);
		GameTutorial.setProperty(hash, value);
	}

	/**
	 * Reads a value for a given tutorial item from the current save files.
	 * @param {string} ID Optional ID for a different tutorial item that we want to check the storage of.
	 */
	readMem(ID?: string): any {
		const key: string = ID ? ID : this.ID;
		const hash: HashId = Database.makeHash("__MEM-" + key);
		const value: any = GameTutorial.getProperty(hash);
		if (value === undefined) {
			console.error("tutorial-item: Could not get hashed value for tutorial item with ID: " + key);
		}
		return value;
	}
}