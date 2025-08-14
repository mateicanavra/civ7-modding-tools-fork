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
import { Tutorial } from '/base-standard/ui/tutorial/tutorial-highlighter.js';
/**
 * @description The state of a tutorial item.
 *
 * ! IMPORTANT !
 * These enums are serialized to the save game so adding new values should only
 * be added on the end or previously existing saves will break.
 */
export var TutorialItemState;
(function (TutorialItemState) {
    TutorialItemState[TutorialItemState["Unseen"] = 0] = "Unseen";
    TutorialItemState[TutorialItemState["Active"] = 1] = "Active";
    TutorialItemState[TutorialItemState["Completed"] = 2] = "Completed";
    TutorialItemState[TutorialItemState["Persistent"] = 3] = "Persistent"; // Item is "active" but lasts across turns and doens't block other items
})(TutorialItemState || (TutorialItemState = {}));
/**
 * Tutorial items are associated with a particular level.
 * 0 = off, and the higher the # generally the more messages will be seen.
 */
export var TutorialLevel;
(function (TutorialLevel) {
    TutorialLevel[TutorialLevel["None"] = 0] = "None";
    // 1 reserved
    TutorialLevel[TutorialLevel["WarningsOnly"] = 2] = "WarningsOnly";
    // 3 reserved
    TutorialLevel[TutorialLevel["TutorialOn"] = 4] = "TutorialOn";
})(TutorialLevel || (TutorialLevel = {}));
/**
 * How the item behaves.
 */
export var ItemType;
(function (ItemType) {
    ItemType[ItemType["PerTurn"] = 0] = "PerTurn";
    ItemType[ItemType["Persistent"] = 1] = "Persistent";
    ItemType[ItemType["Tracked"] = 2] = "Tracked";
    ItemType[ItemType["Legacy"] = 3] = "Legacy"; // The quest is added (to the Quest Tracker) even if the Tutorial Manager doesn't process the added items
})(ItemType || (ItemType = {}));
export var TutorialAnchorPosition;
(function (TutorialAnchorPosition) {
    TutorialAnchorPosition["TopLeft"] = "top-left";
    TutorialAnchorPosition["TopCenter"] = "top-center";
    TutorialAnchorPosition["TopRight"] = "top-right";
    TutorialAnchorPosition["MiddleLeft"] = "middle-left";
    TutorialAnchorPosition["MiddleCenter"] = "middle-center";
    TutorialAnchorPosition["MiddleRight"] = "middle-right";
    TutorialAnchorPosition["BottomLeft"] = "bottom-left";
    TutorialAnchorPosition["BottomCenter"] = "bottom-center";
    TutorialAnchorPosition["BottomRight"] = "bottom-right";
})(TutorialAnchorPosition || (TutorialAnchorPosition = {}));
export var NextItemStatus;
(function (NextItemStatus) {
    NextItemStatus["Canceled"] = "NextItemCanceled";
})(NextItemStatus || (NextItemStatus = {}));
export var TutorialAdvisorType;
(function (TutorialAdvisorType) {
    TutorialAdvisorType["Default"] = "advisor-default";
    TutorialAdvisorType["Military"] = "advisor-military";
    TutorialAdvisorType["Culture"] = "advisor-culture";
    TutorialAdvisorType["Science"] = "advisor-science";
    TutorialAdvisorType["Economic"] = "advisor-economic";
})(TutorialAdvisorType || (TutorialAdvisorType = {}));
export var TutorialCalloutType;
(function (TutorialCalloutType) {
    TutorialCalloutType[TutorialCalloutType["BASE"] = 0] = "BASE";
    TutorialCalloutType[TutorialCalloutType["NOTIFICATION"] = 1] = "NOTIFICATION";
})(TutorialCalloutType || (TutorialCalloutType = {}));
const UnsetProperties = { eventName: "!", event: "@", playerId: -2, altPlayerId: -3, isLocalPlayerTurn: false };
/**
 * This is the internal information object that the TutorialManager uses.
 */
export default class TutorialItem {
    get isUnseen() { return this.eState == TutorialItemState.Unseen; }
    ;
    get isActive() { return this.eState == TutorialItemState.Active; }
    ;
    get isResident() { return this.eState == TutorialItemState.Persistent; }
    ;
    get isCompleted() { return this.eState == TutorialItemState.Completed; }
    ;
    get skip() { return this._skip; }
    get isPersistent() { return this.type == ItemType.Persistent || this.type == ItemType.Tracked || this.type == ItemType.Legacy; }
    ;
    get isTracked() { return this.type == ItemType.Tracked || this.type == ItemType.Legacy; }
    ;
    get isLegacy() { return this.type == ItemType.Legacy; }
    ;
    get isHidden() { return this.hidden; }
    ;
    constructor(def) {
        this.ID = "DEFAULT_TUTORIAL_NODE";
        this.group = -1; // hash of processed label
        this.version = 0; // higher versions overwrite same ID with lower ones
        this.properties = UnsetProperties; // The tutorial environment properties that were used to activate this item (written out)
        this.level = TutorialLevel.TutorialOn;
        this.type = ItemType.PerTurn;
        this.category = "TutorialManager";
        this.activationCustomEvents = [];
        this.activationEngineEvents = [];
        this.completionEngineEvents = [];
        this.completionCustomEvents = [];
        this.filterPlayers = [GameContext.localPlayerID];
        this.runAllTurns = false; // default: only evalute the tutorial item during the player's turn 
        this._skip = false;
        // the reference to the tutorial-callout pop up element 
        this.calloutElement = null;
        this.eState = TutorialItemState.Unseen;
        this.hidden = false;
        // Once the item has been added and "processed" for delivery by the tutorial manager.
        this._processed = false;
        this.activateHighlights = () => { this.doHighlights(Tutorial.highlightElement); };
        this.deactivateHighlights = () => { this.doHighlights(Tutorial.unhighlightElement); };
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
            }
            else {
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
            };
        }
        else {
            this.type = (def.isPersistent) ? ItemType.Persistent : ItemType.PerTurn;
        }
        if (def.highlightPlots != undefined) {
            this.highlightPlots = def.highlightPlots;
        }
        if (def.inputFilters != undefined) {
            this.inputFilters = def.inputFilters;
        }
        this.warnRepeatedActionKeys();
    }
    warnRepeatedActionKeys() {
        const optionsActionKeys = [];
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
    get processed() { return this._processed; }
    set processed(value) { this._processed = true; if (value == false) {
        console.error("Attempt to unprocess a tutorial item: ", this.ID);
    } }
    /**
     * Helper to turn on/off any associate highlights with the tutorial item.
     * @param {Tutorial.HighlightFunc} The function to call which highlights or unhighlights all nodes in the selector.
     */
    doHighlights(highlightFunc) {
        this.highlights?.forEach((selector) => {
            // waiting due to document may not be ready (interface changed, hotloading, etc)
            waitUntilValue(() => {
                const nodes = document.querySelectorAll(selector);
                return nodes.length > 0 ? true : null;
            }).then(() => {
                const nodes = document.querySelectorAll(selector);
                nodes.forEach((node) => {
                    highlightFunc(node);
                });
            }).catch((exception) => {
                // We only care for the exceptions thrown when the tutorial is active, when unhighlights happen we don't care the selector wasn't found
                if (this.isCompleted) {
                    return;
                }
                if (exception) {
                    console.error(`Badly formatted selector when setting tutorial item to be (un)highlighed. item: ${this.ID}, selector: '${selector}'.`);
                    return;
                }
                console.warn(`Promise rejected for tutorial (un)highlights. No selector ${selector} found for tutorial item: ${this.ID} in the DOM`);
            });
        });
        this.dynamicHighlights?.forEach((highlight) => {
            const getQueryString = (item) => {
                const baseSelector = item.baseSelector;
                const attributeSelector = item.attributeSelector;
                const attributeQueryString = `${baseSelector}[${attributeSelector?.attributeName}="${attributeSelector?.attributeValue}"]`;
                const queryString = attributeSelector ? attributeQueryString : baseSelector;
                return queryString;
            };
            try {
                const containerQueryString = getQueryString(highlight.containerSelector);
                const container = document.querySelector(containerQueryString);
                if (!container) {
                    console.error(`Container not found, cannot set the highlight. item: ${this.ID}, selector: '${highlight.containerSelector}'.`);
                    return;
                }
                const itemQueryString = getQueryString(highlight.itemSelector);
                const node = container.querySelector(itemQueryString);
                if (!node) {
                    console.error(`Item not found, cannot set the highlight. item: ${this.ID} ,attribute name: ${highlight.itemSelector.attributeSelector?.attributeName}, atribute value: '${highlight.itemSelector.attributeSelector?.attributeValue}'.`);
                    return;
                }
                highlightFunc(node);
            }
            catch (exception) {
                if (exception) {
                    console.error(`Invalid selector on dynamic highlight. item: ${this.ID}, selector: '${highlight.containerSelector}'.`);
                    return;
                }
                console.error(`Unhandled non-DOMException occurred when setting tutorial item to be (un)highlighed. item: ${this.ID}, exception: ${exception.name}.`);
            }
        });
    }
    markActive() {
        if (this.isActive) {
            return false;
        }
        this.eState = (this.isPersistent ? TutorialItemState.Persistent : TutorialItemState.Active);
        if (this.onActivate) {
            this.onActivate(this);
        }
        return true;
    }
    markComplete() {
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
    markUnseen() {
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
    runsInEnvironment(properties) {
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
            return true; // no raising events at all, likelyt this is a chained item
        }
        return false;
    }
    /**
     * Writes a value for the current tutorial item to the current save files.
     */
    writeMem(value) {
        const hash = Database.makeHash("__MEM-" + this.ID);
        GameTutorial.setProperty(hash, value);
    }
    /**
     * Reads a value for a given tutorial item from the current save files.
     * @param {string} ID Optional ID for a different tutorial item that we want to check the storage of.
     */
    readMem(ID) {
        const key = ID ? ID : this.ID;
        const hash = Database.makeHash("__MEM-" + key);
        const value = GameTutorial.getProperty(hash);
        if (value === undefined) {
            console.error("tutorial-item: Could not get hashed value for tutorial item with ID: " + key);
        }
        return value;
    }
}

//# sourceMappingURL=file:///base-standard/ui/tutorial/tutorial-item.js.map
