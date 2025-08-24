/**
 * @file tutorial-manager.ts
 * @copyright 2021-2024, Firaxis Games
 * @description Main coordinator for tutorial content.
 *
 *  Tutorial items are added via "add()" and the "item bank" they are defined in is specified
 *  in the appropriate .modinfo files.
 *	When outputting debug log content it will be prefixed with "TutorialDebug:".
 *	Log messages prefixed with "Tutorial:" are due to a warning or error condition.
 */
import ContextManager, { ContextManagerEvents } from '/core/ui/context-manager/context-manager.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import ViewManager from '/core/ui/views/view-manager.js';
import QuestTracker from '/base-standard/ui/quest-tracker/quest-tracker.js';
import TutorialItem, { TutorialItemState, TutorialLevel, NextItemStatus, TutorialAdvisorType, TutorialAnchorPosition } from '/base-standard/ui/tutorial/tutorial-item.js';
import { LowerCalloutEvent, LowerQuestPanelEvent } from '/base-standard/ui/tutorial/tutorial-events.js';
import InputFilterManager from '/core/ui/input/input-filter.js';
import { DisplayHandlerBase, DisplayHideReason } from '/core/ui/context-manager/display-handler.js';
import { DisplayQueueManager } from '/core/ui/context-manager/display-queue-manager.js';
import { VictoryQuestState } from '/base-standard/ui/quest-tracker/quest-item.js';
/// BEGIN Debug switches
const DEBUG_LOG_AUTO_PLAY = false; // (false) Log when auto-play related actions occur
const DEBUG_LOG_CALLOUTS = false; // (false) Log events related to raising/lowering callouts.
const DEBUG_LOG_ENGINE_EVENT = false; // (false) Log the engine events as they occur.
const DEBUG_LOG_LOCKS = false; // (false) Log when elements are locked down
const DEBUG_LOG_READ_WRITES = false; // (false) Log out read/writes to file.
const DEBUG_LOG_COMPLETE_CALLS = false; // (false) Log out when a tutorial item is completed (and it's environment at that time)
const DEBUG_LOG_OBSOLETE_CALLS = false; // (false) Log out when a tutorial item is obsoleted (set immediately to complete because of some condition, usually environmental and not due to the player)
/// END Debug switches
const DATA_VERSION = 3; // Version to write out to the save file when serialized.
export const TutorialCalloutMinimizeEventName = 'callout-minimize';
export class TutorialCalloutMinimizeEvent extends CustomEvent {
    constructor(bubbles) {
        super(TutorialCalloutMinimizeEventName, { bubbles: false, cancelable: true, detail: { bubbles } });
    }
}
/**
 * The main class of the tutorial engine.
 */
class TutorialManagerClass extends DisplayHandlerBase {
    set calloutBodyParams(value) {
        this._calloutBodyParams = value;
    }
    get calloutBodyParams() {
        return this._calloutBodyParams;
    }
    set calloutAdvisorParams(value) {
        this._calloutAdvisorParams = value;
    }
    get calloutAdvisorParams() {
        return this._calloutAdvisorParams;
    }
    get currentContextScreen() {
        return ContextManager.getCurrentTarget()?.nodeName.toLocaleLowerCase() || ViewManager.current.getName();
    }
    get activatingEvent() { return this._activatingEvent; }
    get activatingEventName() { return this._activatingEventName; }
    get playerId() { return this._playerId; }
    get altPlayerId() { return this._altPlayerId; }
    /**
     * CTOR
     */
    constructor() {
        super("TutorialManager", 9000);
        this.MAX_CALLOUT_CHECKBOX = 5; // max times the checkbox for deactivation is showing
        this.dataVersion = DATA_VERSION;
        this.tutorialLevel = Configuration.getGame().isAnyMultiplayer ? TutorialLevel.None : Configuration.getUser().tutorialLevel;
        this.envRefCount = 0; // track number of nested settings of a tutorial item's "environment" (most should just be 1 deep)
        this.groups = new Map(); // group items
        this.items = [];
        this.unseenItems = [];
        this.activeItems = [];
        this.completedItems = [];
        this.persistentItems = [];
        this.overwriteItems = [];
        this.welcomeInstructionsNode = null;
        this.callouts = [];
        this.activationEngineEventNames = []; // The name of engine events registered for activation
        this.completionEngineEventNames = []; // The name of engine events registered for cleanup
        this.autoplayStartedListener = () => { this.onAutoplayStarted(); };
        this.beforeUnloadListener = () => { this.onUnload(); };
        this.turnBeginListener = () => { this.onTurnBegin(); };
        this.turnEndListener = () => { this.onTurnEnd(); };
        this.activeContextChangedListener = this.onActiveContextChanged.bind(this);
        this.lowerTutorialDialogListener = (event) => { this.onLowerTutorialDialog(event); };
        this.lowerTutorialCalloutListener = (event) => { this.onLowerTutorialCallout(event); };
        this.lowerTutorialQuestPanelListener = (event) => { this.onLowerTutorialQuestPanel(event); };
        this.viewChangedListener = (event) => { this.onViewChanged(event); };
        this.statusChangedLiteEvent = new LiteEvent();
        this.customEventNames = [];
        this.dialogData = null;
        this.isLocalPlayerTurn = false; /// Track when it's the local player's turn.
        this.queued = [];
        this.currentTutorialPopupData = null;
        this.inputContext = Input.getActiveContext();
        this.screenContext = undefined;
        this.wasSuspended = false;
        this.isPendingShow = false;
        this.lastItemID = "";
        this._calloutBodyParams = [];
        this._calloutAdvisorParams = [];
        /// Decorating plots that tutorial items want to call attention to.
        this.tutorialPlotFxGroup = WorldUI.createModelGroup("TutorialPlotFxGroup");
        /// The current event that occurred in the system to activate a tutorial item(s)
        this._activatingEvent = null;
        /// Name of the event that activated
        this._activatingEventName = "";
        /// Name of the player associate with the event
        this._playerId = PlayerIds.NO_PLAYER;
        /// Name of the alternative player associate with the event
        this._altPlayerId = PlayerIds.NO_PLAYER;
        this.panelAction = undefined;
        // Instance of the tutorial dialog
        this.tutorialDialog = null;
        // Tutorial display element used as default parent for tutorial callouts and dialogs
        this.tutorialDisplay = null;
        /** @description Elements that were already disabled before a mass-disabling occurred by the tutorial item. */
        this.alreadyDisabledElements = [];
        this.versionChecks();
        if (Online.Metaprogression.isPlayingActiveEvent()) {
            this.tutorialLevel = TutorialLevel.None;
        }
        engine.whenReady.then(() => {
            this.initializeListeners();
            this.process("internal");
            // If any changing of values have to occur between version #s, perform that here.
            engine.on('update-tutorial-level', this.onUpdateTutorialLevel, this);
        });
        // Determine if it's the player's turn.
        if (GameContext.localPlayerID != PlayerIds.NO_PLAYER) {
            const player = Players.get(GameContext.localPlayerID);
            if (player) {
                this.isLocalPlayerTurn = player.isTurnActive;
            }
        }
        if (this.tutorialLevel > TutorialLevel.None) {
            // Activate filters check
            InputFilterManager.allowFilters = true;
        }
    }
    /**
     * @param {InputEngineEvent} inputEvent An input event
     * @returns true if the input is still "live" and not yet cancelled.
     * @implements InputEngineEvent
    */
    handleInput(inputEvent) {
        const status = inputEvent.detail.status;
        if (status == InputActionStatuses.FINISH) {
            const name = inputEvent.detail.name;
            switch (name) {
                // TODO use another action for this because we shoudl be able to open the notifications without preventing the tutorials
                case "shell-action-1":
                case "notification":
                    if (this.isShowing() && this.totalCompletedItems() <= this.MAX_CALLOUT_CHECKBOX) {
                        document.querySelector("tutorial-callout")?.querySelector("fxs-checkbox")?.setAttribute("selected", "true");
                        return false;
                    }
                    break;
                case "center-plot-cursor":
                case "shell-action-3":
                    if (this.currentTutorialPopupData) {
                        window.dispatchEvent(new TutorialCalloutMinimizeEvent(true));
                        return false;
                    }
                    break;
            }
        }
        return true;
    }
    /**
     * Tutorial manager doesn't handle navigation input events
     * @returns true if the input is still "live" and not yet cancelled.
     * @implements InputEngineEvent
     */
    handleNavigation() {
        return true;
    }
    /**  Read/Write version information */
    versionChecks() {
        // Read (or store) the first "tutorial version number" that is associated when the file was created.
        const firstVersionKey = "__TUTORIAL_FIRST_VERSION";
        let firstVersion = this.readValue(firstVersionKey, "") ?? 0;
        if (firstVersion == 0) {
            this.writeValue(firstVersionKey, DATA_VERSION, "");
        }
        console.log(`Tutorial: File first version #${firstVersion}` + ((firstVersion == 0) ? ` (new file writing out #${DATA_VERSION})` : ""));
        const dataVersionKey = "__TUTORIAL_DATA_VERSION";
        this.dataVersion = this.readValue(dataVersionKey, "") ?? 0; // If coming in from a save read the verison.
        // ...any conversion between incompatible save formats should be done here.
        if (this.dataVersion > DATA_VERSION) {
            console.error(`Tutorial Manager has data version lower than saved game! this game=#${DATA_VERSION} file=${this.dataVersion}`);
        }
        console.log(`Tutorial:  File last version #${this.dataVersion}`);
        if (this.dataVersion == 0) { // Only change the version to the latest if this is a fresh file....
            this.dataVersion = DATA_VERSION;
        }
        // Write out the current version; updates the version to the latest.
        this.writeValue(dataVersionKey, DATA_VERSION, "");
        console.log(`Tutorial:    Current version #${DATA_VERSION}`);
    }
    /**
     * Process (newly added) items for any missed events that may have occurred.
     * @param itemBankName Name of the item bank being processed, or "internal" if direct call from the manager itself.
     */
    process(itemBankName) {
        if (this.groups.has(itemBankName)) {
            console.error(`Tutorial: Attempting to TutorialManager.process('${itemBankName}') but a group with that name has already been proceeded.  You may have duplicated labels across files!`);
            return;
        }
        const group = Game.getHash(itemBankName);
        this.groups.set(itemBankName, group);
        let didProcessingOccur = false;
        // Does overwrites need to occur (from DLC, etc..)
        if (this.overwriteItems.length > 0) {
            this.replaceOverwritesByCollection("unseen", this.unseenItems);
            this.replaceOverwritesByCollection("persistent", this.persistentItems);
            this.replaceOverwritesByCollection("global", this.items);
        }
        for (let index = this.unseenItems.length - 1; index > -1; index--) {
            const item = this.unseenItems[index];
            if (item.processed) {
                continue; // Ignore if item has already been processed.
            }
            // Set group hash; maybe one day something will use (e.g., overwrites if version # isn't sufficient with multiple DLCs)
            if (item.group == -1) {
                item.group = group;
            }
            item.activationEngineEvents.forEach(engineEventName => {
                if (this.activationEngineEventNames.find(name => (name == engineEventName)) == undefined) { // only add once
                    this.activationEngineEventNames.push(engineEventName);
                    engine.on(engineEventName, (data) => {
                        this.onEngineEvent(engineEventName, data);
                    });
                }
            });
            item.completionEngineEvents.forEach(engineEventName => {
                if (this.completionEngineEventNames.find(name => (name == engineEventName)) == undefined) { // only add once
                    this.completionEngineEventNames.push(engineEventName);
                    // Check activating events to ensure listener wasn't added earlier.
                    if (this.activationEngineEventNames.find(name => (name == engineEventName)) == undefined) {
                        engine.on(engineEventName, (data) => {
                            this.onEngineEvent(engineEventName, data);
                        });
                    }
                }
            });
            if (this.dataVersion < 3) { // If a version 2 or earler file...
                const value = this.readValue(item.ID, ""); // Force empty "prefix" for item's key
                this.writeValue(item.ID, value); // Write it back out, will use default prefix				
            }
            const itemState = this.readValue(item.ID);
            switch (itemState) {
                // Completed items are moved over into the correct collection.
                case TutorialItemState.Completed:
                    this.unseenItems.splice(index, 1);
                    this.completedItems.push(item);
                    // Never complete Victory Quests, just set state to completed
                    if (item.quest && item.quest.victory) {
                        QuestTracker.setQuestVictoryState(item.quest, VictoryQuestState.QUEST_COMPLETED);
                        QuestTracker.writeQuestVictory(item.quest);
                        QuestTracker.add(item.quest);
                    }
                    item.eState = TutorialItemState.Completed; // Use this instead of node's markComplete, to avoid any adverse side-effects caused by it's "cleanup"
                    break;
                // Items that were persistent need to again be persistent.
                case TutorialItemState.Persistent:
                    if (((this.tutorialLevel >= item.level || item.isLegacy) && !Autoplay.isActive)) {
                        this.executeInEnvironment(item.properties, () => {
                            this.activate(item);
                        });
                    }
                    else {
                        // Tutorial level doesn't match and/or auto-play is active, so force to complete.
                        this.unseenItems.splice(index, 1);
                        this.completedItems.push(item);
                        item.eState = TutorialItemState.Completed; // Use this instead of node's markComplete, to avoid any adverse side-effects caused by it's "cleanup"
                    }
                    break;
                default:
                    // nothing to do otherwise
                    break;
            }
            item.processed = true;
            didProcessingOccur = true;
        }
        if (didProcessingOccur) { // If at least one item was processed signal (to the tutorial inspector, anyone else?) that status may have changed.
            this.statusChangedLiteEvent.trigger("ALL");
        }
        this.activateLateItems();
    }
    /**
     * Removes items from a collection if the item is overwritten (it's in the overwriteItems array)
     * @param {string} name Name of the collection
     * @param {Array<TutorialItem>} collection The collection to search an overwrite item
     */
    replaceOverwritesByCollection(name, collection) {
        for (let i = collection.length - 1; i >= 0; i--) {
            const item = collection[i];
            const overwriteItem = this.overwriteItems.find(overwrite => overwrite.ID === item.ID);
            if (overwriteItem !== undefined && overwriteItem != item) {
                if (item.version < overwriteItem.version) {
                    collection.splice(i, 1);
                }
                else if (item.version == overwriteItem.version) {
                    console.error(`Tutorial: Two or more items '${item.ID}' have version ${item.version} in ${name} collection.`);
                }
            }
        }
    }
    /// Listeners for system events.
    initializeListeners() {
        // TODO: Consider Refactoring to just sending custom javascript events via ContextManager instead of round-tripping through engine.
        engine.on(ContextManagerEvents.OnChanged, (event) => {
            // Only call if the input context hasn't changed, will be managed by the listener otherwise
            if (this.inputContext == Input.getActiveContext()) {
                this.onActiveContextChanged();
            }
            if (event && event.detail.activatedElement != undefined) {
                const name = event.detail.activatedElement.nodeName.toLowerCase();
                this.onEngineEvent(ContextManagerEvents.OnChanged + "_" + name, event);
            }
            if (event && event.detail.deactivatedElement != undefined) {
                const name = event.detail.deactivatedElement.nodeName.toLowerCase();
                this.onEngineEvent(ContextManagerEvents.OnChanged + "_" + name, event);
            }
        });
        engine.on(ContextManagerEvents.OnOpen, (event) => {
            if (event && event.detail.activatedElement != undefined) {
                const name = event.detail.activatedElement.nodeName.toLowerCase();
                this.onEngineEvent(ContextManagerEvents.OnOpen + "_" + name, event);
            }
        });
        engine.on(ContextManagerEvents.OnClose, (event) => {
            if (event && event.detail.deactivatedElement != undefined) {
                const name = event.detail.deactivatedElement.nodeName.toLowerCase();
                this.onEngineEvent(ContextManagerEvents.OnClose + "_" + name, event);
            }
        });
        engine.on('AutoplayStarted', this.autoplayStartedListener);
        engine.on("BeforeUnload", this.beforeUnloadListener);
        engine.on('LocalPlayerTurnBegin', this.turnBeginListener);
        engine.on("LocalPlayerTurnEnd", this.turnEndListener);
        engine.on('InputContextChanged', this.activeContextChangedListener, this);
        window.addEventListener(LowerCalloutEvent.name, this.lowerTutorialCalloutListener);
        window.addEventListener(LowerQuestPanelEvent.name, this.lowerTutorialQuestPanelListener);
        window.addEventListener("lower-tutorial-dialog-event", this.lowerTutorialDialogListener);
        window.addEventListener("view-changed", this.viewChangedListener);
    }
    onUnload() {
        this.cleanup();
    }
    cleanup() {
        window.removeEventListener(LowerCalloutEvent.name, this.lowerTutorialCalloutListener);
        window.removeEventListener(LowerQuestPanelEvent.name, this.lowerTutorialQuestPanelListener);
        window.removeEventListener("lower-tutorial-dialog-event", this.lowerTutorialDialogListener);
        window.removeEventListener("view-changed", this.viewChangedListener);
        engine.off('InputContextChanged', this.activeContextChangedListener, this);
        engine.off('LocalPlayerTurnBegin', this.turnBeginListener);
        engine.off("LocalPlayerTurnEnd", this.turnEndListener);
        engine.off('AutoplayStarted', this.autoplayStartedListener);
        // Deactivate filters check
        InputFilterManager.allowFilters = false;
        this.activationEngineEventNames = [];
        this.completionEngineEventNames = [];
    }
    isShowing() {
        if (this.callouts.length == 0) {
            return false; // the tutorial callout was not raised or lowered before checking show state
        }
        const hasElementContent = !!(this.callouts?.[0]?.calloutElement?.firstElementChild);
        return (hasElementContent || this.dialogData != null);
    }
    isSuspended() {
        return DisplayQueueManager.isSuspended();
    }
    /**
      * @implements {IDisplayQueue}
    */
    show(request) {
        this.currentTutorialPopupData = request;
        this.lastItemID = request.ID;
        if (GameContext.hasSentRetire()) {
            this.resetTutorialQueue();
            console.warn("tutorial-manager: Tutorial is inactive due to retire action");
            return;
        }
        if (this._activatingEvent == null) {
            // the tutorial was queued so restore the activating event
            this._activatingEvent = request.properties.event;
            this._activatingEventName = request.properties.eventName;
        }
        if (request.dialog) {
            this.raiseDialog(request);
        }
        if (request.callout) {
            this.raiseCallout(request);
        }
        if (request.questPanel) {
            this.raiseQuestPanel(request);
        }
        if (request.highlights) {
            request.activateHighlights();
        }
        this.hide2d(request);
        if (!this.wasSuspended) {
            this.inputContext = Input.getActiveContext();
            if (this.screenContext == undefined) {
                this.screenContext = TutorialManager.currentContextScreen;
            }
        }
        this.isPendingShow = false;
    }
    /**
      * @implements {IDisplayQueue}
    */
    hide(request, options) {
        // Return the current displaying item data to its queue
        let currentItem = this.currentTutorialPopupData;
        if (!currentItem) {
            if (this.activeItems.length > 0) {
                currentItem = this.activeItems[0];
            }
        }
        if (options && options.reason === DisplayHideReason.Suspend) {
            this.wasSuspended = true;
            if (this.currentTutorialPopupData) {
                this.currentTutorialPopupData = null;
            }
        }
        if (!currentItem) {
            console.warn("tutorial-manager: Tutorial queue doesn't have a item to hide.");
            return;
        }
        // lower popup
        if (currentItem.callout) {
            this.lowerCallout(currentItem);
        }
        if (currentItem.dialog) {
            this.lowerDialog(currentItem);
        }
        if (currentItem.questPanel) {
            this.lowerQuestPanel(currentItem);
        }
        this.show2d(request);
        if (request.highlights) {
            request.deactivateHighlights();
        }
    }
    /**
      * @implements {IDisplayQueue}
      */
    addDialogBoxToQueue(data) {
        if (!data.title) {
            console.error("Cannot add a dialog box to queue if it doesn't have a title.");
            return;
        }
        const dialogTutorialDef = {
            ID: data.title,
            nextID: this.currentTutorialPopupData?.ID
        };
        const tutorialDialogData = new TutorialItem(dialogTutorialDef);
        this.addDisplayRequest(tutorialDialogData);
    }
    /**
     * Returns the panel action component.
    */
    getPanelActionComponent() {
        const componentRoot = document.querySelector(".action-panel");
        return componentRoot?.maybeComponent; // TODO: change maybeComponent to component
    }
    /**
     * Auto-play is kicking off, auto-complete active and persistent items.
    */
    onAutoplayStarted() {
        console.warn("Tutorial: Autoplay started, auto-marking complete any active items.");
        // Backwards indexing to ensure when there are multiple items and an item is removed, the loop won't skip the next item (which is why foreach is not used.)		
        for (let i = this.activeItems.length - 1; i > -1; i--) {
            const item = this.activeItems[i];
            this.complete(item.ID);
        }
    }
    /// Listen when a new turn starts (for local player)
    onTurnBegin() {
        this.isLocalPlayerTurn = true;
    }
    /// Listen when a new turn starts
    onTurnEnd() {
        this.activeItems.forEach((item) => {
            if (item.isPersistent) {
                return; // Don't auto-end if persistent
            }
            this.complete(item.ID); // Will complete the item: will raise anything in chain!
        });
        // Ensure there are no queued items that were still waiting to be presented.
        if (this.queued.length > 0) {
            this.queued.forEach((item) => {
                console.error(`Tutorial: Item '${item.ID}' triggered by '${item.properties.eventName}' never got presented; thrown out due to advancing to next turn.`);
            });
            this.queued = [];
        }
        this.isLocalPlayerTurn = false;
    }
    /// Activate tutorial items that should have been signaled but weren't loaded yet to receive the signal.
    activateLateItems() {
        if (!Loading.isFinished) {
            return;
        }
        for (let i = this.unseenItems.length - 1; i > -1; i--) {
            const item = this.unseenItems[i];
            item.activationCustomEvents.some((eventName) => {
                if (eventName == "user-interface-loaded-and-ready") {
                    return this.tryActivating(item, {
                        eventName: eventName,
                        event: {},
                        playerId: GameContext.localPlayerID,
                        altPlayerId: PlayerIds.NO_PLAYER,
                        isLocalPlayerTurn: true
                    });
                }
                return false;
            });
        }
    }
    /// If a tutorial item exists within a tutorial item array.
    isItemExist(itemOrID, collection) {
        let exists = false;
        const id = typeof itemOrID == 'string' ? itemOrID : itemOrID.ID;
        collection.some(element => {
            return exists = (element.ID == id);
        });
        return exists;
    }
    /**
     * Add a tutorial items to the manager.
     * @param def The definition of the tutorial item.
     * @param modifiers (optional) modifications for the tutorial item.
     */
    add(def, modifiers) {
        const item = new TutorialItem(def);
        // If multiplayer, exclude adding any tutorial items except for victory quests.
        if (Configuration.getGame().isAnyMultiplayer) {
            if (!item || !item.isLegacy) {
                return;
            }
        }
        // if validation exists and it's not valid, exclude adding the item
        if (modifiers?.canDeliver && !modifiers.canDeliver(item)) {
            return;
        }
        // If there are any custom events from the UI, add it to manager's listeners
        if (def.activationCustomEvents) {
            def.activationCustomEvents.forEach((customEventName) => {
                // Only add custom event listener if not already added since multiple tutorial items may key off of the same custom event.
                if (!this.customEventNames.some((name) => { return name == customEventName; })) {
                    this.customEventNames.push(customEventName);
                    window.addEventListener(customEventName, (event) => { this.onCustomEvent(event); });
                }
            });
        }
        if (def.completionCustomEvents) {
            def.completionCustomEvents.forEach((customEventName) => {
                if (!this.customEventNames.some((name) => { return name == customEventName; })) {
                    this.customEventNames.push(customEventName);
                    window.addEventListener(customEventName, (event) => { this.onCustomEvent(event); });
                }
            });
        }
        // Check if overwrite tracking needs to occur based on if a version # is set.
        if (modifiers?.version) {
            item.version = modifiers.version;
            // If this item has a higher version than whats in the overwrite, then overwrite it.
            const index = this.overwriteItems.findIndex(prior => prior.ID === item.ID);
            if (index === -1 || item.version > this.overwriteItems[index].version) {
                if (index !== -1) {
                    this.overwriteItems.splice(index, 1);
                }
                this.overwriteItems.push(item);
            }
        }
        this.unseenItems.push(item);
        this.items.push(item);
        // Any special properties to this tutorial definition?
        if (modifiers?.isWelcomeInstructions) {
            this.setWelcomeInstructions(item);
        }
    }
    /**
     * Determine the player ID for the associate game engine event.
     * @param {any} engineEvent An object that represents properties from the game engine. (It is not a typescript event!)
     * @returns {[PlayerId],[PlayerId]} The id(s) of the player(s) involved in thie event, or NO_PLAYER if they cannot be determined.
     * The first returned value is the playerId and the second is the alternative playerId.
     */
    extractPlayers(engineEvent) {
        if (engineEvent == undefined) {
            return [GameContext.localPlayerID, PlayerIds.NO_PLAYER];
        }
        if (engineEvent.player != undefined) {
            return [engineEvent.player, PlayerIds.NO_PLAYER];
        }
        if (engineEvent.initialPlayer != undefined) {
            if (engineEvent.targetPlayer != undefined) {
                return [engineEvent.initialPlayer, engineEvent.targetPlayer];
            }
            return [engineEvent.initialPlayer, PlayerIds.NO_PLAYER];
        }
        if ((engineEvent.unit != undefined) && (engineEvent.unit.owner != undefined)) {
            return [engineEvent.unit.owner, PlayerIds.NO_PLAYER];
        }
        if (engineEvent.owningPlayer != undefined) {
            return [engineEvent.owningPlayer, PlayerIds.NO_PLAYER];
        }
        if (engineEvent.player1 != undefined) {
            if (engineEvent.player2 != undefined) {
                return [engineEvent.player1, engineEvent.player2];
            }
            else {
                return [engineEvent.player1, PlayerIds.NO_PLAYER];
            }
        }
        if (engineEvent.actingPlayer != undefined) {
            if (engineEvent.reactingPlayer != undefined) {
                return [engineEvent.actingPlayer, engineEvent.reactingPlayer];
            }
            else {
                return [engineEvent.actingPlayer, PlayerIds.NO_PLAYER];
            }
        }
        if (engineEvent instanceof CustomEvent) { // A CustomEvent from the UI, assume local player.
            return [GameContext.localPlayerID, PlayerIds.NO_PLAYER];
        }
        // No player passed in, try finding playerId from a componentID
        if (engineEvent.changedBy != undefined) {
            return [engineEvent.changedBy.owner, PlayerIds.NO_PLAYER]; // usually a visibility event
        }
        if (engineEvent.cityID != undefined) { // via city
            return [engineEvent.cityID.owner, PlayerIds.NO_PLAYER];
        }
        if (engineEvent.unitID != undefined) { // via unit
            return [engineEvent.unitID.owner, PlayerIds.NO_PLAYER];
        }
        if (engineEvent.district != undefined) {
            return [engineEvent.district.owner, PlayerIds.NO_PLAYER];
        }
        return [PlayerIds.NO_PLAYER, PlayerIds.NO_PLAYER];
    }
    /**
     * Respond to an event fired through engine.
     * @param {string} engineEventName Name of the event, will typically be the name of
     * a context manager event with an underscore and then the panel name.
     * 	e.g., "OnContextManagerOpen_screen-victory-progress"
     * Note, any engine event can be listened to though, it doesn't have to be
     * from the context manager.
     * @param {any} data Some custom payload of data from the game engine
     */
    onEngineEvent(engineEventName, data) {
        this.handleEvent(engineEventName, data);
    }
    /**
     * Handle script based custom events and use to activate a item.
     * @param event
     */
    onCustomEvent(event) {
        this.handleEvent(event.type, event);
    }
    /**
     * THE HANDLER! - This is where all events flow eventually flow to in
     * the tutorial system to see if they can be marked complete or activated.
     *
     * @param {string} name of the event
     * @param {any|CustomEvent} eventData either the data from an HTML custom
     * event or some unique object based on the event name.
     */
    handleEvent(name, eventData) {
        // Purposely "handling" events even if the tutorial is disabled so
        // items are marked complete.  Why? ...
        // This allows for the case where a save game can be made with the
        // tutorial system off, and then loaded later with tutorial items
        // back on - the player will only receive relevant items from that
        // point on in the game.
        // Get the environment; supports calls made by tutorial items.		
        const [playerId, altPlayerId] = this.extractPlayers(eventData);
        const props = {
            eventName: name,
            event: eventData,
            playerId: playerId,
            altPlayerId: altPlayerId,
            isLocalPlayerTurn: this.isLocalPlayerTurn // TODO: reconsider if capturing this is a good idea vs have the item look up the manager state for real
        };
        if (DEBUG_LOG_ENGINE_EVENT) {
            let debugMessage = `TutorialDebug: '${props.eventName}', player: ${props.playerId.toString()}, altPlayer: ${props.altPlayerId.toString()}`;
            if (!eventData) {
                debugMessage += ", (no event payload)";
            }
            else if (eventData.detail && eventData.detail.activatedElement) {
                debugMessage += ", activatedElement: " + eventData.detail.activatedElement + ", via: " + props.eventName;
            }
            else {
                debugMessage += ", (non-tutorial event payload), via: " + props.eventName;
            }
            console.log(debugMessage);
        }
        // If an active item is looking for this event, complete it.
        this.executeInEnvironment(props, () => {
            this.activeItems.forEach((item) => {
                if (item.completionEngineEvents.find(completeEventName => completeEventName == props.eventName) != undefined
                    || item.completionCustomEvents.find(completeCustomEventName => completeCustomEventName == props.eventName) != undefined) {
                    if (DEBUG_LOG_ENGINE_EVENT) {
                        console.log(`TutorialDebug: lowering active item '${item.ID}' due to engine completion event met!`);
                    }
                    if (item.onCompleteCheck == undefined || item.onCompleteCheck(item)) {
                        this.complete(item.ID);
                    }
                }
            });
        }, "Error catched on complete item for active items.");
        // If a persistent item is looking for this event, complete it. (Back to front since items can be removed from a collection while iterating.)
        this.executeInEnvironment(props, () => {
            for (let index = this.persistentItems.length - 1; index > -1; index--) {
                const item = this.persistentItems[index];
                if (item.completionEngineEvents.find(completeEventName => completeEventName == props.eventName) != undefined
                    || item.completionCustomEvents.find(completeCustomEventName => completeCustomEventName == props.eventName) != undefined) {
                    if (DEBUG_LOG_ENGINE_EVENT) {
                        console.log(`TutorialDebug: lowering persistent item '${item.ID}' due to engine completion event met!`);
                    }
                    this.addQuest(item);
                    if (item.onCompleteCheck == undefined || item.onCompleteCheck(item)) {
                        this.complete(item.ID);
                    }
                }
            }
            // Second pass on passive items for obsoleted; done after complete check since some items may obsolete based 
            for (let index = this.persistentItems.length - 1; index > -1; index--) {
                const item = this.persistentItems[index];
                if (item.onObsoleteCheck && item.onObsoleteCheck(item)) {
                    // While item is obsoleted, because item is already 'activated' in
                    // a persistent state, it should run through the full complete pipeline
                    // to ensure proper clean-up and side-effects.
                    if (DEBUG_LOG_OBSOLETE_CALLS) {
                        console.log(`TutorialDebug: Persistant item obsoleted '${item.ID}'.`);
                    }
                    if (item.hiders && item.hiders.length > 0) {
                        console.error(`Tutorial: Persistent item made obsolete '${item.ID}' but had set hiders: ${item.hiders.join(",")}`);
                    }
                    if (item.enabled2d && item.enabled2d.length > 0) {
                        console.error(`Tutorial: Persistent item made obsolete '${item.ID}' but had set enabled2d: ${item.enabled2d.join(",")}`);
                    }
                    this.persistentItems.splice(index, 1);
                    this.completedItems.push(item);
                    item.eState = TutorialItemState.Completed; // Use this instead of node's markComplete, to avoid any adverse side-effects caused by it's "cleanup"
                }
            }
        }, "Error catched on complete item for persistent items.");
        // One special case event is GameStarted - need to account for welcome message vs possibly queued events
        // Without this check, a welcome item set to trigger may properly come up first but it's going to depend on what order was added vs any other items listening for that event.  
        // This guarantees it will be activated first and other items will be queued in the loop afterwards.
        if (props.eventName == "GameStarted") {
            if (this.welcomeInstructionsNode) {
                this.tryActivating(this.welcomeInstructionsNode, props);
            }
        }
        // If an unseen item is looking for this event, activate it. (Back to front since items can be removed from a collection while iterating.)
        let numActivated = 0;
        for (let index = this.unseenItems.length - 1; index > -1; index--) {
            const item = this.unseenItems[index];
            if (this.queued.find(queuedItem => queuedItem.ID == item.ID)) {
                continue; // If item is already queued to be activated, skip.
            }
            if (item.runsInEnvironment(props)) {
                if (this.tryActivating(item, props)) {
                    numActivated++;
                }
            }
            else if (item.onObsoleteCheck?.(item)) {
                if (DEBUG_LOG_OBSOLETE_CALLS) {
                    console.log(`TutorialDebug: Unseen item obsoleted '${item.ID}'.`);
                }
                this.unseenItems.splice(index, 1);
                this.completedItems.push(item);
                item.eState = TutorialItemState.Completed; // Use this instead of node's markComplete, to avoid any adverse side-effects caused by it's "cleanup"		
            }
        }
        //hide any tutorial callouts that shouldn't be around and might be blocking parts of the screen
        for (let index = 0; index < this.callouts.length; index++) {
            const callout = this.callouts[index];
            if (callout.shouldCalloutHide != undefined && callout.calloutElement && callout.calloutElement.tagName.toLowerCase() == "tutorial-callout") {
                const shouldHide = callout.shouldCalloutHide();
                callout.calloutElement?.classList.toggle("hidden", shouldHide);
                callout.hidden = shouldHide;
                this.statusChangedLiteEvent.trigger(callout.ID);
            }
        }
        // While an active item is shown (tutorial-callout) the events are still handled in the background.
        // If an event is handled in the background and sets/clears environment we might lose the activating event used in the current active item. 
        // Setting again the current active item environment is needed so the 'getLocParams' and tutorial support can access the data
        const currentActiveItem = this.getCurrentActive();
        if (currentActiveItem) {
            this._activatingEvent = currentActiveItem.properties.event;
            this._activatingEventName = currentActiveItem.properties.eventName;
            [this._playerId, this._altPlayerId] = [currentActiveItem.properties.playerId, currentActiveItem.properties.altPlayerId];
        }
        if (DEBUG_LOG_ENGINE_EVENT) {
            console.log(`TutorialDebug: Activated ${numActivated} tutorial items from event '${props.eventName}'.`);
        }
    }
    /**
     * Catches errors from the authoring item callbacks. If we don't catch them then it would halt the items life cycle.
     * @param properties Environment properties for the executable version
     * @param executeFn Delimits the execution for an environment
     * @param customErrorMessage Optional. Pass a custom error to log when an error is caught
     */
    executeInEnvironment(properties, executeFn, customErrorMessage) {
        this.setEnvironmentProperties(properties);
        try {
            executeFn();
        }
        catch (error) {
            const result = error.message;
            console.error("Tutorial: " + typeof customErrorMessage == 'string' ? customErrorMessage : "" + "Message: " + result);
        }
        this.clearEnvironmentProperties();
    }
    /**
     * Sets up the environment for item scripts to evaluate against.
     * This includes the event name that triggered the event, the playerID(s), etc...
     * @param {TutorialEnvironmentProperties} properties
     */
    setEnvironmentProperties(properties) {
        this.envRefCount = this.envRefCount + 1;
        if (this.envRefCount > 5) {
            console.error(`Tutorial: Environment reference count went above 5. Leak? Last event '${this._activatingEventName}'. New one '${properties.eventName}'.`);
        }
        this._activatingEvent = properties.event; // copy event so items have option to inspect it
        this._activatingEventName = properties.eventName;
        [this._playerId, this._altPlayerId] = [properties.playerId, properties.altPlayerId];
    }
    clearEnvironmentProperties() {
        this.envRefCount = this.envRefCount - 1;
        if (this.envRefCount < 0) {
            console.error(`Tutorial: Environment reference count went below 0. Last event '${this._activatingEventName}'.`);
        }
        this._playerId = PlayerIds.NO_PLAYER;
        this._altPlayerId = PlayerIds.NO_PLAYER;
        this._activatingEventName = "";
        this._activatingEvent = null;
    }
    /**
    * Gets a tutorial the player hasn't seen via the ID
    * @param {string} id The ID of the tutorial
    */
    getUnseenNode(id) {
        let item = null;
        this.unseenItems.some((inspectNode) => {
            if (inspectNode.ID != id) {
                return false;
            }
            item = inspectNode;
            return true;
        });
        return item;
    }
    /**
    * Gets a tutorial persistent item via the ID
    * @param {string} id The ID of the tutorial
    */
    getPersistentNode(id) {
        let item = null;
        this.persistentItems.some((inspectNode) => {
            if (inspectNode.ID != id) {
                return false;
            }
            item = inspectNode;
            return true;
        });
        return item;
    }
    /**
     * Gets a completed tutorial via the ID
     * @param {string} id The ID of the tutorial
     */
    getCompletedNode(id) {
        let item = null;
        this.completedItems.some((inspectNode) => {
            if (inspectNode.ID != id) {
                return false;
            }
            item = inspectNode;
            return true;
        });
        return item;
    }
    /// Obtain a tutorial item by ID which is currently active
    getActivatedNode(id) {
        let item = null;
        this.activeItems.some((inspectNode) => {
            if (inspectNode.ID != id) {
                return false;
            }
            item = inspectNode;
            return true;
        });
        return item;
    }
    /// Raise up a tutorial dialog (sequence) associated with a tutorial item.
    raiseDialog(item) {
        const dialogData = item.dialog;
        // Don't show dialogs if in auto-play.
        if (Autoplay.isActive) {
            console.log(`Tutorial: An attempt to raise a dialog occured for '${item.ID}' but auto-play is active.`);
            return;
        }
        // Don't show dialogs in multiplayer.
        if (Configuration.getGame().isAnyMultiplayer) {
            console.warn(`Tutorial: An attempt to raise a dialog occured for '${item.ID}' but it's an MP game; item shouldn't have loaded in the first place.`);
            return;
        }
        // TODO: Support more than just a series of pages.
        if (!(dialogData?.series)) {
            console.error("Tutorial dialog currently only supports a series of pages! id: " + item.ID);
            return;
        }
        // Find item in DOM to host dialog and ensure one isn't alread up.
        const dialogDisplay = this.getTutorialDisplay();
        if (!dialogDisplay) {
            console.error("Tutorial: Unable to find 'tutorial-display' container in DOM to raise dialog.");
            return;
        }
        const existingTutorialDialogs = dialogDisplay.getElementsByTagName("tutorial-dialog");
        if (existingTutorialDialogs.length > 0) {
            console.warn("Attempting to raise a tutorial dialog but one is already attached to the DOM!");
            existingTutorialDialogs[0].parentNode?.removeChild(existingTutorialDialogs[0]);
        }
        this.dialogData = dialogData; // Checks are done, set the current dialog data for the tutorial dialog to request.
        this.tutorialDialog = document.createElement("tutorial-dialog");
        this.tutorialDialog.setAttribute("value", JSON.stringify(dialogData)); // TODO: Have tutorial dialog query manager for this after it loads so a HUGE string doesn't need to be hanging out on the DOM just so it can be picked apart later.
        this.tutorialDialog.setAttribute("itemID", item.ID);
        dialogDisplay.appendChild(this.tutorialDialog);
    }
    /// Internal event signaled to lower a dialog. 
    lowerDialog(item) {
        const dialogData = item.dialog;
        if (!(dialogData?.series)) {
            console.warn("Tutorial: item with a dialog is told to lower but the data isn't for a tutorial dialog. id: " + item.ID);
            return;
        }
        this.dialogData = null;
        // This is responsible for removing from DOM (likely as quick as possible if this is called)
        if (this.tutorialDialog) {
            this.tutorialDialog.parentElement?.removeChild(this.tutorialDialog);
            this.tutorialDialog = null;
        }
    }
    /// Lower the dialog in response to a user request; dialog is responsible for removing from DOM (e.g., play out animation.)
    onLowerTutorialDialog(event) {
        const itemID = event.detail.itemID;
        if (!itemID) {
            console.error("Tutorial: Manager received a lower tutorial dialog event but no item ID! Activated item 0 is: " + this.activeItems[0].ID);
            return;
        }
        const item = this.getActivatedNode(itemID);
        if (item) {
            // If not isn't already marked completed, this action of lowering the dialog will mark it complete.
            if (!item.isCompleted) {
                this.complete(item.ID);
            }
        }
        else {
            console.error("Tutorial: Manager received a lower tutorial dialog event for " + itemID + " but there is no active item with that ID.");
            return;
        }
    }
    raiseCallout(item) {
        const calloutDefine = item.callout;
        if (!calloutDefine) {
            console.error("Tutorial: Callout data missing; cannot raise. id: ", item.ID);
            return;
        }
        const existingCallout = this.callouts.find(existing => (existing.ID == item.ID));
        if (existingCallout) {
            console.error("Attempt to raise a tutorial callout but one with that id is already raised, id: ", item.ID);
            return;
        }
        // Find node in DOM to host dialog and ensure one isn't already up.
        let definitionCalloutHost = null;
        if (calloutDefine.anchorHost) {
            definitionCalloutHost = document.querySelector(calloutDefine.anchorHost);
        }
        const defaultCalloutHost = this.getTutorialDisplay();
        const calloutHost = definitionCalloutHost || defaultCalloutHost;
        if (!calloutHost) {
            console.error("Unable to find 'tutorial-display'(default host) container in DOM to raise callout.");
            return;
        }
        // (may be more than one callout?)
        this.callouts.push(item); // track as an active callout
        const callout = document.createElement("tutorial-callout");
        item.calloutElement = callout;
        callout.setAttribute("value", JSON.stringify(calloutDefine));
        callout.setAttribute("itemID", item.ID);
        if (item.callout?.anchorPosition && !item.callout?.anchorHost) {
            callout.classList.add(item.callout.anchorPosition);
        }
        else {
            callout.classList.add(TutorialAnchorPosition.TopCenter);
        }
        if (definitionCalloutHost) {
            this.realizeCalloutPosition(calloutHost, callout);
        }
        calloutHost.appendChild(callout);
    }
    /**
     * Lower all callout(s) associated with the item ID.
     * If no ID is provided, then all callouts are lowered.
     * @param {TutorialItem} item (optional) Item to match for the raised callout(s).  If undefined, all callouts are lowered.
     */
    lowerCallout(item) {
        if (this.callouts.length < 1) { // no callouts, early bail
            return;
        }
        let isRemoved = false;
        for (let index = this.callouts.length - 1; index > -1; index--) {
            const callout = this.callouts[index];
            if (item == undefined || callout.ID == item.ID) { // all or look for id match
                if (callout.calloutElement && callout.calloutElement.tagName.toLowerCase() == "tutorial-callout") {
                    FocusManager.unlockFocus(callout.calloutElement, "tutorial-callout");
                    if (!FocusManager.isWorldFocused()) {
                        ViewManager.getHarness()?.classList.add("trigger-nav-help");
                    }
                    callout.calloutElement.parentElement?.removeChild(callout.calloutElement);
                    callout.calloutElement = null;
                    this.callouts.splice(index, 1);
                    this.currentTutorialPopupData = null;
                    isRemoved = true;
                }
            }
        }
        if (!isRemoved) {
            console.warn(`Tutorial: Unable to find callout to lower for item id '${item ? item.ID : "undefined(all)"}'`);
        }
    }
    onLowerTutorialCallout(event) {
        const itemID = event.detail.itemID;
        if (itemID) {
            const item = this.getActivatedNode(itemID);
            if (item) {
                // If callout is from "closing" the item, mark complete.
                const isClosed = event.detail.closed;
                if (isClosed && !item.isCompleted) {
                    let nextID = event.detail.nextID; // If callout is requesting a nextID...
                    if (nextID) {
                        if (DEBUG_LOG_CALLOUTS && item.nextID) {
                            console.log(`TutorialDebug: Item '${item.ID}' is overriding nextID '${item.nextID}' from callout response nextID '${nextID}'.`);
                        }
                        item.nextID = nextID;
                    }
                    this.complete(item.ID);
                }
                else {
                    this.lowerCallout(item); // manually call lower
                }
                const idx = event.detail.optionNum;
                const key = 'option' + idx;
                item.callout?.[key]?.callback?.();
                if (DEBUG_LOG_CALLOUTS) {
                    console.log(`TutorialDebug: Lowered callout for '${itemID}'.`);
                }
                return;
            }
            else {
                console.warn(`Tutorial manager received a lower callout event for '${itemID}' but there is no active item with that ID.`);
            }
        }
        else {
            if (DEBUG_LOG_CALLOUTS) {
                console.log(`TutorialDebug: Lowered ALL callouts in response to custom event.`);
            }
        }
        this.lowerCallout(); // lower all callouts to prevent input lock				
    }
    /**
     * Calculates the best position relative to the host
     * @param host: Callout parent element
     * @param callout: Element to position
     */
    realizeCalloutPosition(host, callout) {
        // makes the callout container the same size as host and then positions its content
        callout.classList.add("tutorial-callout__anchor-position");
        host.style.position = 'relative';
        delayByFrame(() => {
            const content = callout.firstElementChild;
            if (!content) {
                console.error("No content for tutorial-callout");
                return;
            }
            const contentRect = content.getBoundingClientRect(); // actual popup content
            const contentHeight = contentRect.height;
            const contentWidth = contentRect.width;
            const contentTop = contentRect.top;
            const contentLeft = contentRect.left;
            // ensure the callout is inside the screen
            const screenInnerHeight = window.innerHeight;
            const screenInnerWidth = window.innerWidth;
            // default position is center relative to the host/callout container
            if (contentLeft + contentWidth > screenInnerWidth) {
                callout.classList.add("anchor-position--left");
            }
            if (contentLeft < 0) {
                callout.classList.add("anchor-position--right");
            }
            if (contentTop + contentHeight > screenInnerHeight) {
                callout.classList.add("anchor-position--top");
            }
            if (contentTop < 0) {
                callout.classList.add("anchor-position--bottom");
            }
        }, 3);
    }
    getTutorialDisplay() {
        if (!this.tutorialDisplay || !this.tutorialDisplay.isConnected) {
            this.tutorialDisplay = document.querySelector("tutorial-display");
        }
        return this.tutorialDisplay;
    }
    raiseQuestPanel(item) {
        const calloutDefine = item.questPanel;
        if (!calloutDefine) {
            console.error("Tutorial: Callout data missing; cannot raise. id: ", item.ID);
            return;
        }
        const existingCallout = this.callouts.find(existing => (existing.ID == item.ID));
        if (existingCallout) {
            console.error("Attempt to raise a tutorial callout but one with that id is already raised, id: ", item.ID);
            return;
        }
        // Find node in DOM to host dialog and ensure one isn't already up.		
        const defaultCalloutHost = this.getTutorialDisplay();
        if (!defaultCalloutHost) {
            console.error("Unable to find 'tutorial-display'(default host) container in DOM to raise callout.");
            return;
        }
        this.callouts.push(item); // track as an active callout
        // Using context manager to make this a hard-blocker with a mouseguard
        const panelAttributes = {
            "itemID": item.ID,
            "value": JSON.stringify(calloutDefine)
        };
        ContextManager.push("tutorial-quest-panel", { singleton: true, createMouseGuard: true, targetParent: defaultCalloutHost, attributes: panelAttributes });
    }
    /**
     * Lower all callout(s) associated with the item ID.
     * If no ID is provided, then all callouts are lowered.
     * @param {TutorialItem} item (optional) Item to match for the raised callout(s).  If undefined, all callouts are lowered.
     */
    lowerQuestPanel(item) {
        if (this.callouts.length < 1) { // no callouts, early bail
            return;
        }
        let isRemoved = false;
        const questPanels = document.querySelectorAll("tutorial-quest-panel");
        for (let index = questPanels.length - 1; index > -1; index--) {
            const questPanel = questPanels[index];
            const ID = questPanel.getAttribute("itemID");
            if (item == undefined || (ID && ID == item.ID)) { // all or look for id match
                FocusManager.unlockFocus(questPanel, "tutorial-quest-panel");
                ContextManager.pop("tutorial-quest-panel");
                this.callouts.splice(index, 1);
                this.currentTutorialPopupData = null;
                isRemoved = true;
            }
        }
        if (!isRemoved) {
            console.warn(`Tutorial: Unable to find callout to lower for item id '${item ? item.ID : "undefined(all)"}'`);
        }
    }
    onLowerTutorialQuestPanel(event) {
        const itemID = event.detail.itemID;
        if (itemID) {
            const item = this.getActivatedNode(itemID);
            if (item) {
                // If callout is from "closing" the item, mark complete.
                const isClosed = event.detail.closed;
                if (isClosed && !item.isCompleted) {
                    const nextID = event.detail.nextID; // If callout is requesting a nextID...
                    if (nextID) {
                        if (DEBUG_LOG_CALLOUTS && item.nextID) {
                            console.log(`TutorialDebug: Item '${item.ID}' is overriding nextID '${item.nextID}' from callout response nextID '${nextID}'.`);
                        }
                        item.nextID = nextID;
                    }
                    this.complete(item.ID);
                }
                else {
                    this.lowerQuestPanel(item); // manually call lower
                }
                const advisorPath = event.detail.advisorPath;
                const advisor = item.questPanel?.advisors.find(advisor => advisor.type == advisorPath);
                advisor?.button.callback();
                if (DEBUG_LOG_CALLOUTS) {
                    console.log(`TutorialDebug: Lowered callout for '${itemID}'.`);
                }
                return;
            }
            else {
                console.error(`Tutorial manager received a lower callout event for '${itemID}' but there is no active item with that ID.`);
            }
        }
        else {
            if (DEBUG_LOG_CALLOUTS) {
                console.log(`TutorialDebug: Lowered ALL callouts in response to custom event.`);
            }
        }
        this.lowerQuestPanel(); // lower all callouts to prevent input lock				
    }
    /**
     * Ensure that if a view changes that the proper display and interactivity exists on an item.
     * This includes locked items and the actual displaying of items
     * @param _event
     */
    onViewChanged(_event) {
        if (this.isSuspended()) {
            return;
        }
        const isLocked = this.activeItems.some((item) => {
            return (item.enabled2d && item.enabled2d.length > 0) || (item.hiders && item.hiders.length > 0);
        });
        if (isLocked && this.isShowing()) { // Active tutorial items have enable selectors so UI must be "locked".
            this.activeItems.forEach((item) => {
                this.hide2d(item);
                this.lock2d(item);
                this.disableSystems(item);
                this.applyInputFilters(item);
                item.activateHighlights();
            });
        }
        this.persistentItems.forEach((item) => {
            this.hide2d(item);
            this.lock2d(item);
            this.disableSystems(item);
            this.applyInputFilters(item);
            item.activateHighlights();
        });
    }
    /**
     * Gets the current shown item from the activeItems list or from the persistentItems list.
     * @returns The current active tutorial item
     */
    getCurrentActive() {
        return this.activeItems[0] != undefined ? this.activeItems[0] : this.getPersistentNode(this.lastItemID);
    }
    onActiveContextChanged() {
        if (this.isSuspended()) {
            return;
        }
        if (this.wasSuspended) {
            this.wasSuspended = false;
            return;
        }
        const currentActiveItem = this.getCurrentActive();
        // There's no current active item, early out.
        if (!currentActiveItem) {
            return;
        }
        // The dialog component sets its own input context, this is an exception from the normal ContextManager flow.
        if (currentActiveItem.dialog || currentActiveItem.questPanel) {
            return;
        }
        const currentContext = Input.getActiveContext();
        const isDistinctContext = this.inputContext != currentContext;
        const currentScreen = TutorialManager.currentContextScreen;
        const isDistinctScreen = this.screenContext != currentScreen;
        const isWorldToUnitContext = this.inputContext == InputContext.World && currentContext == InputContext.Unit;
        const isUnitToWorldContext = this.inputContext == InputContext.Unit && currentContext == InputContext.World;
        const isAllowedContextChange = isWorldToUnitContext || isUnitToWorldContext;
        let isItemContextCurrent = true;
        if (currentActiveItem.inputContext) {
            isItemContextCurrent = currentActiveItem.inputContext == currentContext;
        }
        if (!isItemContextCurrent || ((isDistinctContext || isDistinctScreen) && !isAllowedContextChange)) {
            if (this.isShowing() || this.isPendingShow) {
                if (this.isPendingShow) {
                    this.isPendingShow = false;
                }
                DisplayQueueManager.closeMatching(this.getCategory());
            }
        }
        else {
            this.isPendingShow = true;
            this.addDisplayRequest(currentActiveItem);
        }
    }
    recurseDisableChildren(element) {
        for (let i = 0; i < element.childNodes.length; i++) {
            const child = element.childNodes.item(i);
            if (child.nodeType == Node.ELEMENT_NODE // ignore other nodes like TEXT_NODEs
                && child.classList != undefined) { // nodes with name "<UNKNOWN>" but limited functionality are breaking through TODO: Determine if these are components.
                this.recurseDisableChildren(child);
            }
        }
        if (!element.classList.contains("disabled")) {
            element.classList.add("disabled");
        }
        else {
            this.alreadyDisabledElements.push(element);
        }
    }
    recurseEnableChildren(element) {
        for (let i = 0; i < element.childNodes.length; i++) {
            const child = element.childNodes.item(i);
            if (child.nodeType == Node.ELEMENT_NODE // ignore other nodes like TEXT_NODEs
                && child.classList != undefined) { // nodes with name "<UNKNOWN>" but limited functionality are breaking through TODO: Determine if these are components.
                this.recurseEnableChildren(child);
            }
        }
        element.classList.remove("disabled");
    }
    recurseEnableToRoot(element) {
        element.classList.remove("disabled");
        if (element.parentElement && element.parentElement != document.body) {
            this.recurseEnableToRoot(element.parentElement);
        }
    }
    /**
     * Hide 2d item(s).
     * Commonly used with a persistent item to keep systems "hidden" until the
     * player is ready for them.
     * @param {TutorialItem} item
     * @returns {boolean} true if one ore more items are hidden
     */
    hide2d(item) {
        if (this.isSuspended()) {
            return false;
        }
        if (!item.hiders) {
            return false;
        }
        item.hiders.forEach((selector) => {
            try {
                const nodes = document.querySelectorAll(selector);
                nodes.forEach((node) => {
                    node.style.visibility = "hidden";
                    node.classList.add("tutorial-hidden");
                });
            }
            catch (exception) {
                // TODO: Evalute if any message should show, as selectors will fail if a different view is shown when applied.
                if (exception) {
                    console.warn(`Tutorial: Badly formatted selector when setting tutorial item to hide. item: ${item.ID}, selector: '${selector}'.`);
                    return;
                }
                console.warn(`Unhandled non-DOMException occurred when setting tutorial item to hide. item: ${item.ID}, exception: ${exception.name}.`);
            }
        });
        return true;
    }
    /**
     * Show 2d item(s).
     * Commonly used with a persistent item to keep systems "hidden" until the
     * player is ready for them to be shown
     * @param {TutorialItem} item
     * @returns {boolean} true if one ore more items are shown
     */
    show2d(item) {
        if (!item.hiders) {
            return false;
        }
        item.hiders.forEach((selector) => {
            try {
                const nodes = document.querySelectorAll(selector);
                nodes.forEach((node) => {
                    node.style.visibility = "visible";
                    node.classList.remove("tutorial-hidden");
                });
            }
            catch (exception) {
                // TODO: Evalute if any message should show, as selectors will fail if a different view is shown when applied.
                if (exception) {
                    console.warn(`Tutorial: Badly formatted selector when setting tutorial item to show. item: ${item.ID}, selector: '${selector}'.`);
                    return;
                }
                console.warn(`Unhandled non-DOMException occurred when setting tutorial item to show. item: ${item.ID}, exception: ${exception.name}.`);
            }
        });
        return true;
    }
    /**
     * Lock input to all of the UI except for those items listed (and parents to those items)
     * @param {TutorialItem} item
     * @returns {boolean} true if (new) 2D user interface items are locked down by being set disabled
     */
    lock2d(item) {
        if (this.isSuspended()) {
            return false;
        }
        if (!item.enabled2d) {
            return false;
        }
        // Step 1: get system-bar
        // System bar (with access to "pause menu") is always active, first ensure it's disabled.
        const systemBarElement = document.querySelector(".panel-system-bar");
        if (!systemBarElement) {
            console.error("Tutorial: lock2d(): Missing systemBarElement with '.panel-system-bar'");
            return false;
        }
        // Step 2: disable all slots in the harness
        const harness = ViewManager.getHarness();
        if (!harness) {
            console.error(`No harness found when attempting to disable elements for tutorial input locking. item: ${item.ID}`);
            return false;
        }
        harness.childNodes.forEach((node) => {
            this.recurseDisableChildren(node);
        });
        // Step 3: Re-enable the system-bar
        this.recurseEnableToRoot(systemBarElement);
        this.recurseEnableChildren(systemBarElement); // If it's in the system bar, it can be clicked!
        // Step 4: Enable elements, going up to root from each selector.
        item.enabled2d.forEach((selector) => {
            try {
                const nodes = document.querySelectorAll(selector);
                nodes.forEach((node) => {
                    this.recurseEnableToRoot(node);
                });
            }
            catch (exception) {
                if (exception) {
                    console.error(`Badly formatted selector when setting tutorial item input locking. item: ${item.ID}, selector: '${selector}'.`);
                    return;
                }
                console.error(`Unhandled non-DOMException occurred when setting tutorial item input locking. item: ${item.ID}, exception: ${exception.name}.`);
            }
        });
        return true; // Locking occurred
    }
    /// Unlock items except for those that were locked (disabled) beforehand.
    unlock2d(item) {
        if (!item.enabled2d) {
            return;
        }
        // disable all slots in the harness
        const harness = ViewManager.getHarness();
        if (!harness) {
            console.error(`No harness found when attempting to disable elements for tutorial input unlocking. (Happen during locking too?) item: ${item.ID}`);
            return;
        }
        harness.childNodes.forEach((node) => {
            this.recurseEnableChildren(node);
        });
        // Re-disable items that were already marked disabled before tutorial locked down UI
        this.alreadyDisabledElements.forEach((node) => {
            node.classList.add("disabled");
        });
        this.alreadyDisabledElements = [];
        item.enabled2d.forEach((selector) => {
            try {
            }
            catch (exception) {
                if (exception) {
                    console.error(`Badly formatted selector when setting tutorial item input unlocking. (Happen during locking too?) item: ${item.ID}, selector: '${selector}'.`);
                    return;
                }
                console.error(`Unhandled non-DOMException occurred when setting tutorial item input unlocking. (Happen during locking too?) item: ${item.ID}, exception: ${exception.name}.`);
            }
        });
    }
    /**
     * Prevent input from occuring in one or more systems.
     * @param {TutorialItem} item
     */
    disableSystems(item) {
        if (this.isSuspended()) {
            return;
        }
        if (!item.disable) {
            return; // No disabling of systems for this item
        }
        if (DEBUG_LOG_LOCKS) {
            console.log(`TutorialDebug: Disabling: ${item.disable.join(",")}`);
        }
        if (item.disable.includes("city-banners")) {
            window.dispatchEvent(new CustomEvent("ui-disable-city-banners", { detail: { who: "tutorial-manager", item: item } }));
        }
        if (item.disable.includes("unit-flags")) {
            window.dispatchEvent(new CustomEvent("ui-disable-unit-flags", { detail: { who: "tutorial-manager", item: item } }));
        }
        if (item.disable.includes("world-input")) {
            window.dispatchEvent(new CustomEvent("ui-disable-world-input", { detail: { who: "tutorial-manager", item: item } }));
        }
        if (item.disable.includes("world-unit-input")) {
            window.dispatchEvent(new CustomEvent("ui-disable-world-unit-input", { detail: { who: "tutorial-manager", item: item } }));
        }
        if (item.disable.includes("world-city-input")) {
            window.dispatchEvent(new CustomEvent("ui-disable-world-city-input", { detail: { who: "tutorial-manager", item: item } }));
        }
    }
    applyInputFilters(item) {
        if (this.isSuspended()) {
            return;
        }
        if (item.inputFilters == undefined) {
            return;
        }
        // if is an empty array remove all filters 
        if (item.inputFilters.length <= 0) {
            InputFilterManager.removeAllInputFilters();
        }
        // add defined filters for this element
        item.inputFilters.forEach(filter => {
            InputFilterManager.addInputFilter(filter);
        });
    }
    clearInputFilters(item) {
        if (item.inputFilters == undefined) {
            return;
        }
        item.inputFilters.forEach(filter => {
            InputFilterManager.removeInputFilter({ inputName: filter.inputName });
        });
    }
    /**
     * Restore input to systems that were previously disabled.
     * @param {TutorialItem} item
     */
    enableSystems(item) {
        if (!item.disable) {
            return; // No 3D (un)locking for this item
        }
        if (DEBUG_LOG_LOCKS) {
            console.log(`TutorialDebug:  Enabling: ${item.disable.join(",")}`);
        }
        if (item.disable.includes("city-banners")) {
            window.dispatchEvent(new CustomEvent("ui-enable-city-banners", { detail: { who: "tutorial-manager", item: item } }));
        }
        if (item.disable.includes("unit-flags")) {
            window.dispatchEvent(new CustomEvent("ui-enable-unit-flags", { detail: { who: "tutorial-manager", item: item } }));
        }
        if (item.disable.includes("world-input")) {
            window.dispatchEvent(new CustomEvent("ui-enable-world-input", { detail: { who: "tutorial-manager", item: item } }));
        }
        if (item.disable.includes("world-unit-input")) {
            window.dispatchEvent(new CustomEvent("ui-enable-world-unit-input", { detail: { who: "tutorial-manager", item: item } }));
        }
        if (item.disable.includes("world-city-input")) {
            window.dispatchEvent(new CustomEvent("ui-enable-world-city-input", { detail: { who: "tutorial-manager", item: item } }));
        }
    }
    /**
     * Attempt to activate a item but may fail for a variety of reasons:
     * Such as it may be skippable or the tutorial manager has another item taking it's attention
     * @param {TutorialItem} item - The item to activate
     * @param {TutorialEnvironmentProperties} props Properties representing the environment that raised this
     * @returns if activated
     */
    tryActivating(item, props) {
        // If item has been marked to be skipped, ignore it forever.
        if (item.skip) {
            console.warn("Tutorial is skipping '" + item.ID + "' because it's marked to be skipped.");
            this.skip(item.ID);
            return false;
        }
        let canActivate = true;
        this.executeInEnvironment(props, () => {
            // Filter by local player (or all players or a specific player id)
            if (item.filterPlayers.length > 0) {
                const playerId = this.playerId;
                canActivate = item.filterPlayers.some(id => { return id == playerId; });
                if (!canActivate) {
                    const altPlayerId = this.altPlayerId;
                    canActivate = item.filterPlayers.some(id => { return id == altPlayerId; });
                }
            }
            // Is there an additional activation check?
            if (canActivate && item.onActivateCheck) {
                canActivate = item.onActivateCheck(item);
            }
            if (canActivate) {
                if (Autoplay.isActive) {
                    this.complete(item.ID); // auto-complete instead of activating as auto-play is occurring.
                }
                else {
                    // If item isn't "persistent" and there is already an "active" item, add this in the queue.
                    if (!item.isPersistent && this.activeItems.length > 0) {
                        this.queued.push(item);
                        canActivate = false;
                    }
                    else {
                        this.activate(item);
                    } // END else not persistent and not active
                } // END else autoplay
            }
        }, "Error catched on trying activate item body.");
        return canActivate;
    }
    forceActivate(id) {
        const itemUnseen = this.getUnseenNode(id);
        // Tutorial Inspector: Unsee previous active items. 
        for (let index = this.activeItems.length - 1; index > -1; index--) {
            const item = this.activeItems[index];
            this.unsee(item.ID);
        }
        // Tutorial Inspector: Lower any previous callout
        this.lowerCallout();
        this.resetTutorialQueue();
        if (itemUnseen) {
            this.activate(itemUnseen);
        }
        else {
            const itemCompleted = this.getCompletedNode(id);
            if (itemCompleted) {
                this.reactivate(itemCompleted);
            }
            else {
                console.error(`Tutorial: No tutorial item with ID '${id}' exists so it cannot be activate!`);
            }
        }
    }
    forceComplete(id) {
        const itemActive = this.getActivatedNode(id);
        this.lowerCallout();
        if (itemActive) {
            this.complete(itemActive.ID);
        }
        else {
            const itemCompleted = this.getPersistentNode(id);
            if (itemCompleted) {
                this.complete(itemCompleted.ID);
            }
            else {
                console.error(`Tutorial: No tutorial item with ID '${id}' is active so it cannot be completed!`);
            }
        }
    }
    /**
    * Complete current item and next item. Complete also the persistent items.
    * @param {TutorialItem} activeItem current active item, could also be persistent
    */
    forceCompleteNextPersistent(activeItem) {
        if (activeItem) {
            this.complete(activeItem.ID);
        }
        this.resetTutorialQueue();
        // Complete all persistent items (hideTech, hideCulture, etc)
        for (let index = this.persistentItems.length - 1; index > -1; index--) {
            const item = this.persistentItems[index];
            if (!item.isLegacy) {
                this.complete(item.ID);
            }
        }
    }
    /**
    * Cleans the tutorial queue on breaking flow scenarios
    */
    resetTutorialQueue() {
        this.currentTutorialPopupData = null;
        DisplayQueueManager.closeMatching(this.getCategory());
    }
    /**
    * Activate a completed tutorial item. (REACTIVATE IS DEBUG ONLY)
    * @param {TutorialItem} item to be set active.
    * @param {TutorialItemState} state to find the tutorial in
    */
    activate(item) {
        this.activateInternal(item, this.unseenItems);
    }
    reactivate(item) {
        this.activateInternal(item, this.completedItems);
    }
    activateInternal(item, container) {
        container.some((targetItem, index) => {
            if (targetItem.ID != item.ID) {
                return false;
            }
            const removedNode = container.splice(index, 1)[0];
            if (!removedNode) {
                console.warn(`When activating item '${item.ID}', matched IDs but no item from container array was returned.`);
                return false;
            }
            // If the tutorial level is below this (or off, or autoplaying) 
            // then instead immediately set as completed instead of active.
            // Tracked legacy items are activated and completed as always
            if (((this.tutorialLevel < item.level && !item.isLegacy) || Autoplay.isActive)) {
                this.completed(item);
                return true;
            }
            // If a diferent item was activated, reset the pending show.
            if (this.isPendingShow) {
                this.isPendingShow = false;
                DisplayQueueManager.closeMatching(this.getCategory());
            }
            // Activation sequence...
            if (item.isTracked) {
                this.addQuest(item);
            }
            if (item.isPersistent) { // Silently and "tracked" items can be persistent.
                this.persistentItems.push(item);
                this.writeValue(item.ID, TutorialItemState.Persistent);
            }
            else {
                this.activeItems.push(item);
            }
            item.markActive();
            this.hide2d(item);
            this.lock2d(item);
            this.disableSystems(item);
            this.applyInputFilters(item);
            if (item.dialog || item.callout || item.questPanel) {
                this.addDisplayRequest(item);
            }
            if (item.highlightPlots) {
                this.highlightPlots(item.highlightPlots);
            }
            this.statusChangedLiteEvent.trigger(item.ID);
            this.alsoItemActivate(item); // Another item explicitly activate with this?
            let tutorialData = {
                FtueEvent: "Tutorial Item Triggered",
                TutorialDefinitionId: item.ID,
                AdvisorType: item.callout?.advisorType?.toString() ?? "",
                AdvisorWarningType: "",
                QuestLine: "",
                IsTracked: false,
            };
            Telemetry.sendTutorial(tutorialData);
            return true;
        });
    }
    /**
     * Only used for Debug!  This is not part of gameplay flow.
     * Unsee a previously shown item
     * @param {string} id The tutorial item identifier to unsee.
     */
    unsee(id) {
        // Helper to traverse a tutorial array, remove if matching ID an put back into unseen
        const markUnseen = (possibleNode, index, array) => {
            if (possibleNode.ID == id) {
                let item = array.slice(index, 1)[0];
                if (array != this.items) {
                    item = array.splice(index, 1)[0];
                }
                if (item) {
                    if (item.isActive || item.isResident || this.callouts.length > 0) {
                        if (item.dialog) {
                            this.lowerDialog(item);
                        }
                        if (item.callout) {
                            this.lowerCallout(item);
                        }
                        if (item.questPanel) {
                            this.lowerQuestPanel(item);
                        }
                        this.resetTutorialQueue();
                        this.hide2d(item);
                        this.unlock2d(item);
                        this.enableSystems(item);
                    }
                    if (!this.isItemExist(item, this.unseenItems)) {
                        this.unseenItems.push(item);
                    }
                    item.markUnseen();
                    this.statusChangedLiteEvent.trigger(item.ID);
                    return true;
                }
            }
            return false;
        };
        if (this.completedItems.some(markUnseen)) {
            return; //  Found in completed items, no more searching to perform.
        }
        if (this.activeItems.some(markUnseen)) {
            return; //  Found in activated items, no more searching to perform.
        }
        if (this.persistentItems.some(markUnseen)) {
            return; //  Found in persistent items, no more searching to perform.
        }
        this.items.some(markUnseen); //  Check main items, could be welcome skipped and now explicitly being shown.
    }
    /**
     * Debug only - helper to get name of advisor for log file
     * @param advisorType Type of tutorial advisor.
     * @returns log file friendly name of advisor
     */
    getAdvisorTypeName(advisorType) {
        switch (advisorType) {
            case TutorialAdvisorType.Culture: return "culture";
            case TutorialAdvisorType.Default: return "default";
            case TutorialAdvisorType.Economic: return "economic";
            case TutorialAdvisorType.Military: return "military";
            case TutorialAdvisorType.Science: return "science";
            default: return "n/a";
        }
    }
    /**
     * Debug only
     * @returns An array of debug output about the items (CSV)
     */
    getDebugLogOutput() {
        const lines = [];
        lines.push("id, title, advisor, quest"); // header
        this.items.forEach(item => {
            const id = item.ID;
            const title = item.callout?.title ? Locale.compose(item.callout.title) : "n/a";
            const advisorTypeName = this.getAdvisorTypeName(item.callout?.advisorType);
            const quest = item.quest ? "y" : "n";
            lines.push(id + "," + title + "," + advisorTypeName + "," + quest);
        });
        return lines;
    }
    /**
     * Writes a value for a given key to the current save files.
     * This is how tutorial items save their status.
     * @param {string} key	Typically the name of the tutorial item to save out.
     * @param {any} value		A value representing a tutorial item's status
     * @param {string} prefix	What prefix to write out content with; default is for item writing.
     */
    writeValue(key, value, prefix = "__ITEM-") {
        const hash = (this.dataVersion == 2) ? Database.makeHash(key) : Database.makeHash(prefix + key); // Early version didn't have prefix
        GameTutorial.setProperty(hash, value);
        if (DEBUG_LOG_READ_WRITES)
            console.log(`TutorialDebug: writeValue('${key}', '${value}', '${prefix}')`);
    }
    /**
     * Reads a value for a given key from the current save files.
     * @param {string} key	Typically the name of the tutorial item to read from.
     * @param {string} prefix	What prefix on the key to use when reading in content; default is for item reading.
     * @returns {any} 			Whatever was stored at that value.
     */
    readValue(key, prefix = "__ITEM-") {
        const hash = (this.dataVersion == 2) ? Database.makeHash(key) : Database.makeHash(prefix + key); // Early version didn't have prefix
        if (DEBUG_LOG_READ_WRITES)
            console.log(`TutorialDebug:  readValue('${key}', '${prefix}') = '${GameTutorial.getProperty(hash)}'`);
        return GameTutorial.getProperty(hash);
    }
    /**
     * Marking an item completed
     * @param item
     */
    completed(item) {
        if (DEBUG_LOG_AUTO_PLAY && Autoplay.isActive) {
            console.log(`TutorialDebug: item '${item.ID}' automatically set to complete during autoplay.`);
        }
        if (item.callout) {
            this.lowerCallout(item);
            if (this.tutorialLevel >= item.level && !Autoplay.isActive) {
                DisplayQueueManager.closeMatching((request) => request.ID === item.ID);
            }
        }
        if (item.dialog) {
            this.lowerDialog(item);
            if (this.tutorialLevel >= item.level && !Autoplay.isActive) {
                DisplayQueueManager.closeMatching((request) => request.ID === item.ID);
            }
        }
        if (item.questPanel) {
            this.lowerQuestPanel(item);
            if (this.tutorialLevel >= item.level && !Autoplay.isActive) {
                DisplayQueueManager.closeMatching((request) => request.ID === item.ID);
            }
        }
        if (item.quest) {
            QuestTracker.remove(item.quest.id, item.quest.system);
        }
        if (item.highlightPlots) {
            this.clearHighlights();
        }
        this.completedItems.push(item);
        item.markComplete();
        this.show2d(item);
        this.unlock2d(item);
        this.enableSystems(item);
        this.clearInputFilters(item);
        this.writeValue(item.ID, TutorialItemState.Completed);
        this.statusChangedLiteEvent.trigger(item.ID);
    }
    /**
     * Set a tutorial item to be completed.
     * If some additional checks need to be performed to ensure this tutorial
     * item can be completed, it should be done earlier.
     * @param {string} id is the identifier of the tutorial item item to mark completed.
     */
    complete(id) {
        if (DEBUG_LOG_COMPLETE_CALLS) {
            console.log(`TutorialDebug: '${id}' complete / ENV, evt: ${this._activatingEventName}, p: ${this._playerId}, ap: ${this._altPlayerId}, (cnt: ${this.envRefCount})`);
        }
        /**
         * Encapsulated helper function used to move item out of a collection
         * and follow the completion rules.
         * @param {string} id The ID of a tutorial item to look for.
         * @param {Array<TutorialItem>} collection Which collection to look in.
         * @returns
         */
        const completeItemFromCollection = (id, collection) => {
            let result = false;
            result = collection.some((possibleItem, index) => {
                if (possibleItem.ID != id) {
                    return false; // continue some()
                }
                const item = collection.splice(index, 1)[0];
                if (!item) {
                    console.error(`Tutorial: The item '${id}' matched an tutorial item but failed to return from a splice.  This should be impossible!`);
                    return true; // end some()
                }
                this.completed(item);
                // If there is a chained item, activate it...
                if (item.nextID) {
                    if (Autoplay.isActive) { // ...unless auto-play is active, in which case chained items are also marked complete.
                        this.complete(item.nextID);
                    }
                    else {
                        this.nextItemActivate(item);
                    }
                }
                return true; // end some()
            });
            return result;
        };
        let isDone = completeItemFromCollection(id, this.activeItems);
        this.calloutBodyParams = [];
        this.calloutAdvisorParams = [];
        this.screenContext = undefined;
        if (Autoplay.isActive) { // if auto-playing, and queued items are left
            if (this.queued.length > 0) {
                this.complete(this.queued.splice(0, 1)[0].ID); // recurses (with one item taken out of queue)
            }
        }
        if (!this.panelAction) {
            this.panelAction = this.getPanelActionComponent();
        }
        this.panelAction?.enableActionButton();
        // Even if a chain activate above, it may be a persistent item and so look to see if the next active item can be started.
        if ((this.activeItems.length < 1) && this.queued.length > 0) {
            for (let isQueuedItemActivated = false; !isQueuedItemActivated && this.queued.length > 0;) {
                const queuedItem = this.queued.splice(0, 1)[0];
                isQueuedItemActivated = this.tryActivating(queuedItem, queuedItem.properties);
                // if there is a queued item showing and the next action is 'next turn', disable the action button until complete
                if (isQueuedItemActivated && this.panelAction?.canEndTurn()) {
                    this.panelAction?.disableActionButton();
                }
                if (!isQueuedItemActivated) {
                    console.warn(`Tutorial: Failed to activate queued item '${queuedItem.ID}'.`);
                }
            }
        }
        if (!isDone) {
            isDone = completeItemFromCollection(id, this.persistentItems);
            if (!isDone) {
                isDone = completeItemFromCollection(id, this.unseenItems);
            }
        }
    }
    /**
     * Advanced a next item to activated state.
     * @param {TutorialItem} item, The (prior) item which has the next item's ID set.
     */
    nextItemActivate(item) {
        if (item.eState != TutorialItemState.Completed) {
            console.warn(`Tutorial: Setting the nextID '${item.nextID}' active without prior '${item.ID}' being completed.`);
        }
        if (item.nextID == NextItemStatus.Canceled) {
            console.warn(`Tutorial: The next quest item was canceled by '${item.ID}'`);
            return;
        }
        if (this.tutorialLevel < item.level) {
            console.warn(`Tutorial: The tutorial is not active for this item, cannot activate next item '${item.ID}'`);
            return;
        }
        const nextItem = this.unseenItems.find((nextItem) => { return item.nextID == nextItem.ID; });
        if (nextItem) {
            this.activate(nextItem); // Chained item, gets immediate next activation.
        }
        else {
            let errorMessage = `Tutorial: Unable to active next item with nextID '${item.nextID}' from item '${item.ID}' as its not in the unseen collection. `;
            const existItem = this.items.find((nextItem) => { item.nextID == nextItem.nextID; });
            errorMessage += (existItem) ? `Item was found in global pool though with state '${existItem.eState}'.` : "None found with that id in in global pool either.";
            console.error(errorMessage);
        }
    }
    /**
     * Item that may be activated as another item has just activated (and not completed)
     * This is assuming one of these items (at least) is a "persistent" item.
     * @param item
     */
    alsoItemActivate(item) {
        if (!item.alsoActivateID) {
            return;
        }
        const alsoItem = this.getUnseenNode(item.alsoActivateID);
        if (alsoItem) {
            this.activate(alsoItem);
        }
        else {
            // Not found, just to be safe, make sure it was already delivered.
            if (!this.isItemExist(item.alsoActivateID, this.completedItems) &&
                !this.isItemExist(item.alsoActivateID, this.persistentItems)) {
                console.error(`Tutorial: The item '${item.ID}' attempted to also activate '${item.alsoActivateID}' but no tutorial item has that ID.`);
            }
        }
    }
    onUpdateTutorialLevel() {
        this.tutorialLevel = Configuration.getGame().isAnyMultiplayer ? TutorialLevel.None : Configuration.getUser().tutorialLevel;
        if (Online.Metaprogression.isPlayingActiveEvent()) {
            this.tutorialLevel = TutorialLevel.None;
        }
        let currentItem = this.activeItems[0];
        if (!currentItem && this.isSuspended()) {
            const foundItem = this.items.find(item => item.ID == this.lastItemID);
            if (foundItem) {
                currentItem = foundItem;
            }
        }
        if ((currentItem && this.tutorialLevel < currentItem.level) || this.tutorialLevel == TutorialLevel.None) {
            // should be only one active item at a time
            this.forceCompleteNextPersistent(currentItem);
        }
    }
    /// Tutorial item will not be shown.
    skip(id) {
        let skipped = false;
        let item;
        // If already activated, skip.
        this.activeItems.some((possibleNode, index) => {
            if (possibleNode.ID == id) {
                item = this.activeItems.splice(index, 1)[0];
                if (item && item.ID == id) {
                    this.complete(id); // Run full "complete" to ensure it cleans up.
                    skipped = true;
                    return true;
                }
            }
            return false;
        });
        if (skipped) {
            return;
        }
        // If not yet activate, skip.
        this.unseenItems.some((possibleNode, index) => {
            if (possibleNode.ID == id) {
                item = this.unseenItems.splice(index, 1)[0];
                if (item && item.ID == id) {
                    item.markComplete();
                    return true;
                }
            }
            return false;
        });
    }
    /**
     * (DEBUG Only) Attempt to force a tutorial item activation.
     * @param id the identification of the item
     * @returns true if activation occurred, false otherwise.
     */
    forceActivation(id) {
        return this.items.some((item) => {
            if (item.ID != id) {
                return false;
            }
            if (item.activationEngineEvents) {
                item.activationEngineEvents.forEach((engineEventName) => {
                    engine.trigger(engineEventName);
                });
                return true;
            }
            if (item.activationCustomEvents) {
                item.activationCustomEvents.forEach((customEventName) => {
                    window.dispatchEvent(new CustomEvent(customEventName, { bubbles: true, cancelable: false }));
                });
                return true;
            }
            return false;
        });
    }
    /**
     * Triggered when the tutorial has changed
     */
    get statusChanged() {
        return this.statusChangedLiteEvent.expose();
    }
    /// A clean slate...
    reset() {
        this.unseenItems.length = 0;
        this.activeItems.length = 0;
        this.completedItems.length = 0;
        // Tutorial Inspector: Lower any previous callout
        this.lowerCallout();
        DisplayQueueManager.closeMatching(this.getCategory());
        this.items.forEach(item => {
            item.markUnseen();
            this.unseenItems.push(item);
            this.writeValue(item.ID, TutorialItemState.Unseen);
        });
        this.statusChangedLiteEvent.trigger("ALL");
    }
    /// Set a tutorial item to be associated with showing welcome instructions
    setWelcomeInstructions(item) {
        // If a node is already set for welcome instructions, the version will
        // determine if it replaces the existing one or is ignored.
        if (this.welcomeInstructionsNode) {
            if (item.version <= this.welcomeInstructionsNode.version) {
                return; // Just ignore as order isn't deterministic so no error check can be done which came first.
            }
        }
        this.welcomeInstructionsNode = item;
    }
    /**
     * Add a quest on the Quest Tracker
     * @param item element that contains the quest
     * @returns true if the quest was added, false otherwise.
     */
    addQuest(item) {
        if (!item.isTracked) {
            return false;
        }
        if (item.quest) {
            if (item.quest.victory) {
                // Overwrite, in-place QuestTracker items.
                const overwriteItem = this.overwriteItems.find(overwrite => overwrite.ID === item.ID);
                if (overwriteItem !== undefined && overwriteItem.quest != undefined) {
                    // Remove the old tracked item if there's an overwrite
                    QuestTracker.remove(item.ID, item.quest.system, { forceRemove: true });
                }
                const oldQuest = QuestTracker.readQuestVictory(item.quest.id);
                const oldState = oldQuest.state;
                // Assign state from memory, if no state is saved default to unstarted
                if (oldState) {
                    QuestTracker.setQuestVictoryState(item.quest, oldState);
                }
                else {
                    QuestTracker.setQuestVictoryState(item.quest, VictoryQuestState.QUEST_UNSTARTED);
                }
                QuestTracker.writeQuestVictory(item.quest);
            }
            QuestTracker.add(item.quest);
            return true;
        }
        console.error(`Tutorial: Item '${item.ID}' is set as tracked but has no quest tracker payload or couldn't be added.`);
        return false;
    }
    // Does this tutorial sequence include a set of welcome instruction(s)?
    get hasWelcomeInstructions() {
        return (this.welcomeInstructionsNode != null);
    }
    /// Run the welcome instructions tutorial item; typically the tutorial dialog
    runWelcomeInstructions() {
        if (this.welcomeInstructionsNode == null) {
            console.warn("Tutorial Manager attempt to run welcome instructions but there are none!");
            return;
        }
        // If not in an unseen state, it will be now so it can activate without issue.
        if (!this.welcomeInstructionsNode.isUnseen) {
            this.unsee(this.welcomeInstructionsNode.ID);
        }
        this.activate(this.welcomeInstructionsNode);
    }
    isItemCompleted(id) {
        return this.completedItems.find(item => item.ID == id) != undefined;
    }
    isItemExistInAll(id) {
        return this.items.find(item => item.ID == id) != undefined;
    }
    totalCompletedItems() {
        return this.completedItems.length;
    }
    highlightPlots(plots) {
        if (!this.tutorialPlotFxGroup) {
            console.error(`Tutorial Manager cannot highlight plots because FxGroup is invalid.`);
            return;
        }
        const offset = { x: 0, y: 0, z: 0 };
        const params = { placement: PlacementMode.TERRAIN };
        for (let i = 0; i < plots.length; i++) {
            const loc = GameplayMap.getLocationFromIndex(plots[i]);
            this.tutorialPlotFxGroup.addVFXAtPlot("VFX_3dUI_Tut_SelectThis_01", loc, offset, params); //hard coded effect, we may want to map this somewhere else
        }
    }
    clearHighlights() {
        this.tutorialPlotFxGroup.clear();
    }
    getCalloutItem(itemID) {
        return this.callouts.find(item => item.ID == itemID);
    }
}
const TutorialManager = new TutorialManagerClass();
export { TutorialManager as default };
DisplayQueueManager.registerHandler(TutorialManager);

//# sourceMappingURL=file:///base-standard/ui/tutorial/tutorial-manager.js.map
