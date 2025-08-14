/**
 * @file quest-tracker.ts
 * @copyright 2023, Firaxis Games
 * @description Tracks "quests" from narrative, tutorial, etc... loaded via modinfo.
 *
 */
import { VictoryQuestState } from "/base-standard/ui/quest-tracker/quest-item.js";
import { Catalog } from '/core/ui/utilities/utility-serialize.js';
export const QuestListUpdatedEventName = 'quest-list-update';
export class QuestListUpdatedEvent extends CustomEvent {
    constructor(name) {
        super(QuestListUpdatedEventName, { bubbles: false, detail: { name } });
    }
}
export const QuestCompletedEventName = 'quest-completed';
export class QuestCompletedEvent extends CustomEvent {
    constructor(name) {
        super(QuestCompletedEventName, { bubbles: false, detail: { name } });
    }
}
/**
 * Holds the data for all "quest items" that come in from various source.
 * This is data-only, with no displayable values.
 */
class QuestTrackerClass {
    set selectedQuest(value) {
        this._listSelectedQuest = value;
    }
    ;
    get selectedQuest() {
        return this._listSelectedQuest;
    }
    constructor() {
        this.items = new Map();
        this.trackerItemAddedLiteEvent = new LiteEvent();
        this.trackerItemRemovedLiteEvent = new LiteEvent();
        this.questCatalogName = "QuestTrackerCatalog";
        this._listSelectedQuest = "";
        if (QuestTrackerClass.instance) {
            console.error("Attempt to create more than one quest manager class; ignoring call.");
        }
        else {
            QuestTrackerClass.instance = this;
        }
        this.catalog = new Catalog(this.questCatalogName);
    }
    get AddEvent() {
        return this.trackerItemAddedLiteEvent.expose();
    }
    get RemoveEvent() {
        return this.trackerItemRemovedLiteEvent.expose();
    }
    /**
     * Items should not be manipulated when handed out.
     */
    getItems() {
        return this.items.values();
    }
    /**
     * Check if the tracker has a specific item.
     * @param id The id of the item to check for.
     * @param system An optional parameter to match against
     */
    has(id, system) {
        const item = this.items.get(id);
        return item !== undefined && (system === undefined || item.system === system);
    }
    /**
     * Check if the tracker is empty.
     */
    get empty() {
        return this.items.size === 0;
    }
    /**
     * Get a specific item from the tracker.
     * @param id The id of the item to get.
     */
    get(id) {
        return this.items.get(id);
    }
    /**
     * Add (or update) an item to the quest tracker.
     */
    add(item) {
        const existing = this.items.get(item.id);
        // If one already exists, assume it's being updated.
        if (existing) {
            if ((item.getCurrentProgress == undefined || existing.progress == item.getCurrentProgress()) && item.getCurrentProgress && existing.progress == item.progress) {
                //ignore updating if all of the fields are the same
                console.warn(`Quest tracker item '${existing.id}' update occurred but nothing changed!`);
                return;
            }
            if (item.getCurrentProgress != undefined) {
                existing.progress = item.getCurrentProgress();
            }
            else {
                existing.progress = item.progress;
            }
            if ((item.getCurrentGoal == undefined || existing.goal == item.getCurrentGoal()) && item.getCurrentGoal && existing.goal == item.goal) {
                //ignore updating if all of the fields are the same
                console.warn(`Quest tracker item '${existing.id}' update occurred but nothing changed!`);
                return;
            }
            if (item.getCurrentGoal != undefined) {
                existing.goal = item.getCurrentGoal();
            }
            else {
                existing.goal = item.goal;
            }
        }
        else {
            if (item.progress == null && item.getCurrentProgress != null) {
                item.progress = item.getCurrentProgress();
            }
            if (item.goal == null && item.getCurrentGoal != null) {
                item.goal = item.getCurrentGoal();
            }
            this.items.set(item.id, item);
        }
        this.trackerItemAddedLiteEvent.trigger(item); // Entire item is sent but really is a signal to read one
    }
    /**
     * Remove item from quest tracker.
     * @param {string} id The item ID to remove.
     * @param {string} system The system the item belongs to.
     * @param {object} params.force If not used, the tracker makes Legacy Quests to appear as completed instead of removed.
     */
    remove(id, system, params) {
        const existing = this.items.get(id);
        if (!existing || existing.system != system) {
            console.error(`Attempt to remove quest tracked item '${id}' origin '${system}' but it doesn't exist in tracker.`);
            return;
        }
        if (params && params.forceRemove) {
            this.items.delete(id);
            this.trackerItemRemovedLiteEvent.trigger(existing);
            return;
        }
        // if has a victory don't delete from container, just dehydrate it to still be accesible.
        if (existing.victory) {
            // Dehydrate it
            this.setQuestVictoryState(existing, VictoryQuestState.QUEST_COMPLETED);
            this.writeQuestVictory(existing);
            window.dispatchEvent(new QuestCompletedEvent(id));
        }
        else {
            this.items.delete(id);
            this.trackerItemRemovedLiteEvent.trigger(existing); // Entire item is sent but really is a signal to read one
        }
    }
    /**
     * Writes a Quest's Victory in memory
    */
    writeQuestVictory(quest) {
        if (!quest.victory) {
            console.error("quest-tracker: writeQuestVictory(): Passing a quest with no victory definition");
            return;
        }
        // Don't write content,  only state
        const { content: _, ...victoryWithoutContent } = quest.victory;
        const victoryEntries = Object.entries(victoryWithoutContent);
        for (const [key, value] of victoryEntries) {
            const object = this.catalog.getObject(quest.id);
            object.write(key, value);
        }
        this.updateQuestList(quest.id);
    }
    /**
     * Reads a Quest's Victory from memory
     */
    readQuestVictory(id) {
        const object = this.catalog.getObject(id);
        let victoryQuest = {};
        for (const key of object.getKeys()) {
            const value = object.read(key);
            victoryQuest[key] = value;
        }
        return victoryQuest;
    }
    /**
     * Sets state for a quest object
     * @returns true if the state was set
     */
    setQuestVictoryState(quest, state) {
        if (!quest.victory) {
            console.error("quest-tracker: setQuestVictoryState(): Passing a quest with no victory definition. Quest id: " + quest.id);
            return false;
        }
        quest.victory.state = state;
        if (quest.victory.state == VictoryQuestState.QUEST_IN_PROGRESS) {
            this.setPathTracked(true, quest.victory.type);
        }
        return true;
    }
    setQuestVictoryStateById(id, state) {
        const trackedQuest = this.get(id);
        if (!trackedQuest) {
            console.error("quest-tracker: setQuestVictoryState: No tracked quest available for activation with id: " + id);
            return false;
        }
        const canWrite = this.setQuestVictoryState(trackedQuest, state);
        if (canWrite) {
            this.writeQuestVictory(trackedQuest);
            return true;
        }
        return false;
    }
    isQuestVictoryUnstarted(id) {
        return this.readQuestVictory(id).state == VictoryQuestState.QUEST_UNSTARTED;
    }
    isQuestVictoryInProgress(id) {
        return this.readQuestVictory(id).state == VictoryQuestState.QUEST_IN_PROGRESS;
    }
    isQuestVictoryCompleted(id) {
        return this.readQuestVictory(id).state == VictoryQuestState.QUEST_COMPLETED;
    }
    setPathTracked(isTracked, pathType) {
        const object = this.catalog.getObject(`path-${pathType}`);
        object.write("tracked", isTracked);
    }
    isPathTracked(pathType) {
        const object = this.catalog.getObject(`path-${pathType}`);
        return object.read("tracked");
    }
    /**
     * Handy utility to update quest-list
     */
    updateQuestList(questName) {
        window.dispatchEvent(new QuestListUpdatedEvent(questName));
    }
}
QuestTrackerClass.instance = null;
const QuestTracker = new QuestTrackerClass();
export { QuestTracker as default };

//# sourceMappingURL=file:///base-standard/ui/quest-tracker/quest-tracker.js.map
