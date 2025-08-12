/**
 * @file tutorial-support
 * @copyright 2022, Firaxis Games
 * @description Helper functions for tutorial items. (Any functions here should not maintain state!)
 *
 */

import { ComponentID } from '/core/ui/utilities/utilities-component-id.js'
import TutorialManager from '/base-standard/ui/tutorial/tutorial-manager.js'
import TutorialItem, { CalloutShortOptionCallback, NextItemStatus, TutorialActionPrompt, TutorialCalloutOptionDefinition, TutorialLevel } from '/base-standard/ui/tutorial/tutorial-item.js'
import FxsNavHelp from '/core/ui/components/fxs-nav-help.js';
import ActionHandler from '/core/ui/input/action-handler.js';
import Databind from '/core/ui/utilities/utilities-core-databinding.js';
import QuestTracker from '/base-standard/ui/quest-tracker/quest-tracker.js';
import { QuestItem, VictoryQuestState } from '/base-standard/ui/quest-tracker/quest-item.js';

// TODO: Consider if all tutorial helper functions should be wrapped in "Tutorial" namepsace.

// ---------------------------------------------------------------------------
//	Common callout button defines.
// ---------------------------------------------------------------------------

/**
 * Helper for common callouts
 * Affirmative button press (A) on consoles
 * @param {CalloutShortOptionCallback} params (optional) object containing text and/or nextID of tutorial
 * @returns An object that can be passed to a callout to set one of it's options.
 */
function accept(params?: CalloutShortOptionCallback): TutorialCalloutOptionDefinition {
	const text: string = (params) ? (params.text ?? "LOC_TUTORIAL_CALLOUT_CONTINUE") : "LOC_TUTORIAL_CALLOUT_CONTINUE";
	const nextID: string | undefined = (params) ? params.nextID : undefined;
	return {
		callback: () => { },
		text: text,
		actionKey: "inline-accept",
		closes: true,
		nextID: nextID
	};
}

/**
 * Helper for common callouts
 * Negative button press (B) on consoles
 * @param {CalloutShortOptionCallback} params (optional) object containing text and/or nextID of tutorial
 * @returns An object that can be passed to a callout to set one of it's options.
 */
function cancel(params?: CalloutShortOptionCallback): TutorialCalloutOptionDefinition {
	const text: string = (params) ? (params.text ?? "LOC_TUTORIAL_CALLOUT_CLOSE") : "LOC_TUTORIAL_CALLOUT_CLOSE";
	const nextID: string | undefined = (params) ? params.nextID : undefined;
	return {
		callback: () => { },
		text: text,
		actionKey: "inline-cancel",
		closes: true,
		nextID: nextID
	};
}

export function calloutAcceptNext(nextID: string): TutorialCalloutOptionDefinition {
	return accept({ text: "LOC_TUTORIAL_CALLOUT_ACCEPT", nextID: nextID });
}

export function calloutBeginNext(nextID: string): TutorialCalloutOptionDefinition {
	return accept({ text: "LOC_TUTORIAL_CALLOUT_BEGIN", nextID: nextID });
}

export function calloutCloseNext(nextID: string): TutorialCalloutOptionDefinition {
	return cancel({ text: "LOC_TUTORIAL_CALLOUT_CLOSE", nextID: nextID });
}

export function calloutContinueNext(nextID: string): TutorialCalloutOptionDefinition {
	return accept({ text: "LOC_TUTORIAL_CALLOUT_CONTINUE", nextID: nextID });
}

export function calloutExploreNext(nextID: string): TutorialCalloutOptionDefinition {
	return accept({ text: "LOC_TUTORIAL_CALLOUT_EXPLORE", nextID: nextID });
}

export function calloutCancelQuest(): TutorialCalloutOptionDefinition {
	return cancel({ text: "LOC_TUTORIAL_CALLOUT_CANCEL_QUEST", nextID: NextItemStatus.Canceled });
}

/**
 * Ensure that an object has 1 or more series of properties on it.
 * @param {Object} obj The object to query.
 * @param {Array<string>} properties Array of strings with the names of properties.
 * @returns true if all properties exist on the object.
 */
export function ensurePropertiesExist(obj: any, properties: Array<string>): boolean {
	return properties.every((property) => {
		return obj[property] != undefined;
	})
}

/**
 * Callout helper function for opening the Civilopedia to a desired page
 * @param searchTerm string parameter indicating the name of the page to open to
 */
export function OpenCivilopediaAt(searchTerm: string) {
	return engine.trigger('open-civilopedia', searchTerm);
}

/// Scan entire tech and civics trees to see if a wonder has unlocked
/// Don't just look at most recently researched, may be auto-unlocked through some other game rules.
export function hasAnyWondersUnlocked(_TutorialItem: TutorialItem): boolean {
	const playerId: PlayerId = TutorialManager.playerId;
	const player: PlayerLibrary | null = Players.get(playerId);
	if (!player) {
		console.error("Tutorial's hasAnyWondersUnlocked is unable to get a player object for player: ", playerId);
		return false;
	}

	// Callback used to traverse (tech or civic) trees.
	const isWonderInTreeUnlocksCallback: any = (progressionNode: ProgressionTreeNode) => {
		if (progressionNode.state != ProgressionTreeNodeState.NODE_STATE_UNLOCKED &&
			progressionNode.state != ProgressionTreeNodeState.NODE_STATE_FULLY_UNLOCKED) {
			return false; 	// Node not full researched.
		}
		for (const i of progressionNode.unlockIndices) {
			const unlockInfo: ProgressionTreeNodeUnlockDefinition = GameInfo.ProgressionTreeNodeUnlocks[i];
			if (!unlockInfo || unlockInfo.Hidden) {
				continue;	// skip no node or hidden information
			}
			if (unlockInfo.UnlockDepth != progressionNode.depthUnlocked) {
				continue;	// not researched deep enough
			}
			if (unlockInfo.TargetKind != "KIND_CONSTRUCTIBLE") {
				continue; 	// not a building
			}
			const building = GameInfo.Constructibles.lookup(unlockInfo.TargetType);
			if (!building) {
				console.warn("Tutorial's hasAnyWondersUnlocked failed to get a building for a constructable while looking at tech nodes. Player: ", playerId, ", target: ", unlockInfo.TargetType);
				continue;
			}
			if (building.ConstructibleClass == 'WONDER') {
				return true;
			}
		}
		return false;
	};

	// Exist in the tech tree?

	const techs: PlayerTechs | undefined = player.Techs;
	if (!techs) {
		console.error("Tutorial's hasAnyWondersUnlocked is unable to get a techs object for player: ", playerId);
		return false;
	}
	const techTreeType: ProgressionTreeType = techs.getTreeType();
	const techTree: ProgressionTree | null = Game.ProgressionTrees.getTree(playerId, techTreeType);
	if (!techTree) {
		console.error("Tutorial's hasAnyWondersUnlocked is unable to get a tech tree for player: ", playerId, ", techTreeType: ", techTreeType);
		return false;
	}

	let isWonderUnlocked: boolean = techTree.nodes.some(isWonderInTreeUnlocksCallback);
	if (isWonderUnlocked) {
		return true;
	}

	// Exist in the civic tree?

	const civics: PlayerTechs | undefined = player.Techs;
	if (!civics) {
		console.error("Tutorial's hasAnyWondersUnlocked is unable to get a civic object for player: ", playerId);
		return false;
	}
	const civicTreeType: ProgressionTreeType = civics.getTreeType();
	const civicsTree: ProgressionTree | null = Game.ProgressionTrees.getTree(playerId, civicTreeType);
	if (!civicsTree) {
		console.error("Tutorial's hasAnyWondersUnlocked is unable to get a civics tree for player: ", playerId, ", civicTreeType: ", civicTreeType);
		return false;
	}
	isWonderUnlocked = civicsTree.nodes.some(isWonderInTreeUnlocksCallback);
	return isWonderUnlocked;
}


/**
 * Did a specific tech unlock for the local player? (Typically raised with a 'TechNodeCompleted' engine event.)
 * @param node the tutorial item that raised this function
 * @param techName the NodeType to match
 * @param depth required depth
 * @returns true if the tech node that just unlocked matched the techname
 */
export function didTechUnlock(node: TutorialItem, techName: string, depth: number = 1): boolean {
	const event: any | null = TutorialManager.activatingEvent;
	if (!event) {
		console.error("Cannot check if tech unlocked as no custom event is set in manager. id: ", node.ID, ", techName:", techName);
		return false;
	}
	if (!ensurePropertiesExist(event, ["player", "tree", "activeNode"])) {
		console.warn("Skipping didTechUnlock. id: ", node.ID);
		return false;
	}
	const player: PlayerLibrary | null = Players.get(event.player);
	if (!player) {
		console.error("Tutorial is unable to get player object for tech unknock. id: ", node.ID, ", techName: ", techName, ", player: ", event.player);
		return false;
	}
	const techs: PlayerTechs | undefined = player.Techs;
	if (!techs) {
		console.error("Tutorial is unable to get tech object for tech unknock. id: ", node.ID, ", techName: ", techName, ", player: ", event.player);
		return false;
	}
	let recentResearchNodeType: ProgressionTreeNodeType | undefined = techs.getLastCompletedNodeType();
	if (!recentResearchNodeType) {
		console.error("Tutorial is unable to get a tech tree for tech unknock. id: ", node.ID, ", techName: ", techName, ", player: ", event.player, ", techs: ", techs);
		return false;
	}
	const nodeInfo: ProgressionTreeNodeDefinition | null = GameInfo.ProgressionTreeNodes.lookup(recentResearchNodeType);
	if (!nodeInfo) {
		console.error("Tutorial is unable to get the nodeInfofor tech unknock. id: ", node.ID, ", techName: ", techName, ", player: ", event.player, ", recentResearchNodeType: ", recentResearchNodeType);
		return false;
	}

	let isMatch: boolean = (nodeInfo.ProgressionTreeNodeType == techName);
	if (depth != 1 && isMatch) {
		const progressionNode: ProgressionTreeNode | null = Game.ProgressionTrees.getNode(event.player, recentResearchNodeType);
		isMatch = (progressionNode?.depthUnlocked == depth);
	}
	return isMatch;
}


/**
 * Did a specific civic unlock for the local player? (Typically paired with 'CultureNodeCompleted' engine event)
 * @param node the tutorial item that raised this function
 * @param civicName the NodeType to match
 * @param depth required depth
 * @returns true if the civic node that just unlocked matched the culture name
 */
export function didCivicUnlock(node: TutorialItem, civicName: string, depth: number = 1): boolean {
	const event: any | null = TutorialManager.activatingEvent;
	if (!event) {
		console.error("Cannot check if culture unlocked as no custom event is set in manager. id: ", node.ID, ", civicName:", civicName);
		return false;
	}
	if (!ensurePropertiesExist(event, ["player", "tree", "activeNode"])) {
		console.warn("Skipping didCultureUnlock. id: ", node.ID);
		return false;
	}
	const player: PlayerLibrary | null = Players.get(event.player);
	if (!player) {
		console.error("Tutorial is unable to get player object for culture unknock. id: ", node.ID, ", civicName: ", civicName, ", player: ", event.player);
		return false;
	}
	const culture: PlayerCulture | undefined = player.Culture;
	if (!culture) {
		console.error("Tutorial is unable to get culture object for culture unknock. id: ", node.ID, ", civicName: ", civicName, ", player: ", event.player);
		return false;
	}
	let recentResearchNodeType: ProgressionTreeNodeType | undefined = culture.getLastCompletedNodeType();
	if (!recentResearchNodeType) {
		console.error("Tutorial is unable to get a culture tree for culture unknock. id: ", node.ID, ", civicName: ", civicName, ", player: ", event.player, ", culture: ", culture);
		return false;
	}
	const nodeInfo: ProgressionTreeNodeDefinition | null = GameInfo.ProgressionTreeNodes.lookup(recentResearchNodeType);
	if (!nodeInfo) {
		console.error("Tutorial is unable to get the nodeInfofor culture unknock. id: ", node.ID, ", civicName: ", civicName, ", player: ", event.player, ", recentResearchNodeType: ", recentResearchNodeType);
		return false;
	}

	let isMatch: boolean = (nodeInfo.ProgressionTreeNodeType == civicName);
	if (depth != 1 && isMatch) {
		const progressionNode: ProgressionTreeNode | null = Game.ProgressionTrees.getNode(event.player, recentResearchNodeType);
		isMatch = (progressionNode?.depthUnlocked == depth);
	}
	return isMatch;
}


/**
 * Obtain a player and it's correspond event raised from a tech or civic tree 
 * @param errorMsg A string to show in the log if it fails. 
 * @returns player, event
 */
function getPlayerAndTreeEvent(errorMsg: string = "none"): [PlayerLibrary | null, any | null] {
	const event: any | null = TutorialManager.activatingEvent;
	if (!event) {
		console.error("Tutorial helper failed obtaining activating event. msg: ", errorMsg);
		return [null, null];
	}
	if (!ensurePropertiesExist(event, ["player", "tree", "activeNode"])) {
		console.error("Tutorial helper failed to find tree properties on node. msg: ", errorMsg);
		return [null, event];
	}
	return [Players.get(event.player), event];
}

/**
 * Obtain the unit related to the active tutorial event.
 * @param errorMsg A string to show in the log if it fails. 
 * @returns {Unit} Unit object or null if not found.
 */
export function getUnitFromEvent(errorMsg: string = "none"): Unit | null {
	const event: any | null = TutorialManager.activatingEvent;
	if (!event) {
		console.error("Tutorial helper failed obtaining an event to return player and unit. msg: ", errorMsg);
		return null;
	}
	if (!ensurePropertiesExist(event, ["unit", "unitState", "unitType"])) {
		console.error("Tutorial helper failed to find unit properties on node. msg: ", errorMsg);
		console.log("values: ", Object.values(event));
		return null;
	}
	const unit: Unit | null = Units.get(event.unit);	// componentID
	if (!unit) {
		console.error("Tutorial helper unable to get unit for componentID: ", ComponentID.toLogString(event.unit))
		return null;
	}
	return unit;

}

export function getUnitFromOnly(errorMsg: string = "none"): Unit | null {
	const event: any | null = TutorialManager.activatingEvent;
	if (!event) {
		console.error("Tutorial helper failed obtaining an event to return player and unit. msg: ", errorMsg);
		return null;
	}
	if (!ensurePropertiesExist(event, ["unit"])) {
		console.error("Tutorial helper failed to find unit properties on node. msg: ", errorMsg);
		console.log("values: ", Object.values(event));
		return null;
	}
	const unit: Unit | null = Units.get(event.unit);	// componentID
	if (!unit) {
		console.error("Tutorial helper unable to get unit for componentID: ", ComponentID.toLogString(event.unit))
		return null;
	}
	return unit;

}


/// Does the most recent reserached item from a tree have an unlock
export function hasTreeUnlocks(node: TutorialItem): boolean {
	const [player, event] = getPlayerAndTreeEvent("hasUnlocks for " + node.ID);
	if (!player || !event) {
		console.warn("Tutorial hasUnlock unable to be determined for id: ", node.ID);
		return false;
	}
	let recentResearchNodeType: ProgressionTreeNodeType | undefined = undefined;
	if (TutorialManager.activatingEventName == "CultureNodeCompleted") {
		const culture: PlayerCulture | undefined = player.Culture;
		if (!culture) {
			console.error("Tutorial failed getting culture in hasTreeUnlocks. id: ", node.ID);
			return false;
		}
		recentResearchNodeType = culture.getLastCompletedNodeType();
	} else if (TutorialManager.activatingEventName == "TechNodeCompleted") {
		const tech: PlayerTechs | undefined = player.Techs;
		if (!tech) {
			console.error("Tutorial failed getting tech in hasTreeUnlocks. id: ", node.ID);
			return false;
		}
		recentResearchNodeType = tech.getLastCompletedNodeType();
	}
	if (!recentResearchNodeType) {
		console.error("Tutorial hasTreeUnlocks unable to get last researched node. id: ", node.ID);
		return false;
	}
	const progressionNode: ProgressionTreeNode | null = Game.ProgressionTrees.getNode(event.player, recentResearchNodeType);
	return (progressionNode != undefined && (progressionNode.maxDepth > 1));
}

/**
 * Is a unit of a certain type?
 * @param {TutorialItem} node The tutorial node making this call.
 * @param {string[]} unitTypeNames An array of unit type names to check against.
 * @returns true if match, false otherwise.
 */
export function isUnitOfType(node: TutorialItem, unitTypeNames: string[]): boolean {
	const unit: Unit | null = getUnitFromEvent("isUnitOfType");
	if (!unit) {
		console.error("Tutorial unable to get unit for id: ", node.ID, " unitTypeNames: ", unitTypeNames.toString());
		return false;
	}
	const unitDefinition: UnitDefinition | null = GameInfo.Units.lookup(unit.type);
	if (!unitDefinition) {
		console.error("Tutorial could not find a unit defintition for unit.type: ", unit.type);
		return false;
	}
	const isMatch: boolean = unitTypeNames.some((name) => {
		return (name == unitDefinition?.UnitType);
	})
	return isMatch;
}

/**
 * Is a unit of a certain domain?
 * @param {TutorialItem} node The tutorial node making this call.
 * @param {string} eDomain the domain to look up
 * @returns true if match, false otherwise.
 */
export function isUnitOfDomain(node: TutorialItem, domain: string): boolean {
	const unit: Unit | null = getUnitFromOnly("isUnitOfDomain");
	if (!unit) {
		console.error("Tutorial unable to get unit for id: ", node.ID, " unitTypeNames: ", domain);
		return false;
	}
	const unitDefinition: UnitDefinition | null = GameInfo.Units.lookup(unit.type);
	if (!unitDefinition) {
		console.error("Tutorial could not find a unit defintition for unit.type: ", unit.type);
		return false;
	}
	let isMatch: boolean = false;
	if (domain == unitDefinition?.Domain) {
		isMatch = true;
	}
	return isMatch;
}

/**
 * Is a resource a treasure reource?
 * @param {TutorialItem} node The tutorial node making this call.
 * @returns true if match, false otherwise.
 */
export function isTreasureResource(node: TutorialItem): boolean {
	const event: any | null = TutorialManager.activatingEvent;
	if (!event) {
		console.error("Tutorial helper failed obtaining an event to return player and unit. msg: ");
		return false;
	}

	const resource = GameplayMap.getResourceType(event.location.x, event.location.y);
	const resourceDefinition: ResourceDefinition | null = GameInfo.Resources.lookup(resource);
	if (!resourceDefinition) {
		console.error("Tutorial could not find a resource defintition for resource ", node.ID);
		return false;
	}
	let isMatch: boolean = false;
	if (resourceDefinition?.ResourceClassType == "RESOURCECLASS_TREASURE") {
		isMatch = true;
	}
	return isMatch;
}


/**
 * Gets the unit name from the last event
 * @returns The unit name, NO_UNIT otherwise.
 */
export function getUnitName(): string {
	const unit: Unit | null = getUnitFromEvent("isUnitOfType");
	if (!unit) {
		return "NO_UNIT";
	}
	const unitDefinition: UnitDefinition | null = GameInfo.Units.lookup(unit.type);
	if (!unitDefinition) {
		return "NO_UNIT";
	}
	return unitDefinition.Name;
}

/**
 * Gets the name of a unit that has the specified tag
 * @param tag the tag to search for
 * @returns The unit name, NO_UNIT otherwise.
 */
export function getNameOfFirstUnitWithTag(tag: string): string {
	const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
	if (player && player.Units) {
		const units: UnitType[] = player.Units.getUnitTypesWithTag(tag);
		if (units.length > 0) {
			const eUnit: UnitType = units[0];
			const unitDefinition: UnitDefinition | null = GameInfo.Units.lookup(eUnit);
			if (unitDefinition) {
				return unitDefinition.Name;
			}
		}
	}
	return "NO_UNIT";
}

/**
 * Gets the name of an unlocked unit that has the specified tag
 * @param tag the tag to search for
 * @returns The unit name, NO_UNIT otherwise.
 */
export function getNameOfFirstUnlockedUnitWithTag(tag: string): string {
	const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
	if (player && player.Units) {
		const units: UnitType[] = player.Units.getUnitTypesUnlockedWithTag(tag, false);
		if (units.length > 0) {
			const eUnit: UnitType = units[0];
			const unitDefinition: UnitDefinition | null = GameInfo.Units.lookup(eUnit);
			if (unitDefinition) {
				return unitDefinition.Name;
			}
		}
	}
	return "NO_UNIT";
}

/**
 * Gets the text prompts from a the action prompts definition
 * @param actionPrompts An array of tutorial action prompts definitions in the tutorial items.
 * @returns Text prompts for each action prompt
 */
export function getTutorialPrompts(actionPrompts: TutorialActionPrompt[]): string[] {
	const actionTextPrompts: string[] = actionPrompts.map(prompt => {
		const actionName = (ActionHandler.isGamepadActive
			? FxsNavHelp.getGamepadActionName(prompt.actionName ?? "")
			: prompt.actionName) ?? "";

		let promptText = prompt.kbm;

		if (ActionHandler.isGamepadActive) {
			promptText = prompt.gamepad;
		} else if (ActionHandler.deviceType == InputDeviceType.Touch) {
			promptText = prompt.touch ?? prompt.kbm;
		} else if (ActionHandler.deviceType == InputDeviceType.Hybrid) {
			promptText = prompt.hybrid ?? prompt.kbm;
		}

		return Locale.compose(promptText ?? "", actionName);
	});

	return actionTextPrompts;
}

/**
 * Gets the player's current turn blocking notification
 * @param playerID Player for the current turn blocking notification.
 * @returns The found notification
 */
export function getCurrentTurnBlockingNotification(playerID: PlayerId): Notification | undefined {
	if (!Players.isValid(playerID)) {
		console.error("tutorial-support: getCurrentTurnBlockingNotification(): Invalid PlayerId: " + playerID);
		return;
	}

	const player: PlayerLibrary | null = Players.get(playerID);
	if (!player) {
		console.error("tutorial-support: getCurrentTurnBlockingNotification(): No player found with valid id: " + playerID);
		return;
	}

	const endTurnBlockingType: EndTurnBlockingType = Game.Notifications.getEndTurnBlockingType(playerID);
	const endTurnBlockingNotificationId: ComponentID | null = Game.Notifications.findEndTurnBlocking(playerID, endTurnBlockingType);
	if (!endTurnBlockingNotificationId || ComponentID.isInvalid(endTurnBlockingNotificationId)) {
		console.error("tutorial-support: getCurrentTurnBlockingNotification(): No valid notification found with type: " + endTurnBlockingType);
		return;
	}

	const endTurnBlockingNotification: Notification | null = Game.Notifications.find(endTurnBlockingNotificationId);
	if (!endTurnBlockingNotification) {
		console.error("tutorial-support: getCurrentTurnBlockingNotification(): No notification found with id: " + endTurnBlockingNotificationId);
		return;
	}

	return endTurnBlockingNotification;
}

/**
 * Helper function to indicate the next item to be activated. 
 * This should be used in "onCompleteCheck" to activate based in the user interaction.
 * @param {TutorialItem} item - Item to change the nextID.
 * @param nextID - An ID to activate the next item. If not provided, the next item will be canceled.
 * @returns true after the process is complete. Can be used as a return value for "onCompleteCheck".
*/
export function setNextItemActivation(item: TutorialItem, nextID?: string): boolean {
	if (!nextID) {
		console.warn(`tutorial-support: Next item "${item.nextID}" is canceled by previous "${item.ID}".`);
		item.nextID = NextItemStatus.Canceled;
	}

	if (item.nextID != undefined) {
		console.warn(`tutorial-support: Item "${item.ID}" currently has a nextID "${item.nextID}". Are you sure you want to overwrite it with "${nextID}"?`);
	}

	item.nextID = nextID;
	return true;
}

/**
 * Helper function to check state for previous and next quest to activate current triggering tutorial item
 * @param prevQuestTracking: Previous tracking item quest
 * @param currQuestTracking: Current tracking item quest
*/
export function canQuestActivate(prevQuestTracking: string, currQuestTracking: string) {
	const eventDetailName: string = TutorialManager.activatingEvent.detail.name;
	if (eventDetailName != prevQuestTracking) {
		return false;
	}
	const currentQuest = QuestTracker.get(currQuestTracking);
	const currentPathType: AdvisorType | undefined = currentQuest?.victory?.type;
	if (currentPathType == undefined) {
		console.warn("tutorial-support: canQuestActivate(): No advisor type for currentQuest: " + currQuestTracking);
		return false;
	}
	const items: QuestItem[] = Array.from(QuestTracker.getItems());
	const firstQuestInPath: QuestItem | undefined = items.find(item => item.victory?.type == currentPathType && item.victory.order == 1);
	if (firstQuestInPath == undefined) {
		console.warn("tutorial-support: canQuestActivate(): No path starting item found (order 1)");
		return false;
	}

	const isPathTracked = QuestTracker.isPathTracked(currentPathType);
	if (!isPathTracked) {
		return false;
	}
	// Make sure the quest before this quest is completed
	const isTrackedUnstarted = QuestTracker.isQuestVictoryUnstarted(currQuestTracking);
	const isPreviousCompleted = QuestTracker.isQuestVictoryCompleted(prevQuestTracking);
	return isTrackedUnstarted && isPreviousCompleted;
}

/**
 * Helper function to activate the next tracking quest in a legacy path. This is only to be used on a disabled tutorial state
 * @param item: current tutorial item (victory quest)
*/
export function activateNextTrackedQuest(item: TutorialItem) {
	// Only activate next tracking item this way when the tutorial is disabled
	const isTutorialDisabled = (Online.LiveEvent.getLiveEventGameFlag()) || (Configuration.getUser().tutorialLevel <= TutorialLevel.WarningsOnly) || Configuration.getGame().isAnyMultiplayer;
	if (!isTutorialDisabled) {
		return;
	}

	if (item.quest?.victory == undefined) {
		console.warn("activateNextTrackedQuest(): Cannot activate a next quest for " + item.ID + " as it's not a quest victory");
		return;
	}

	const isCurrentCompleted = QuestTracker.isQuestVictoryCompleted(item.ID);
	if (!isCurrentCompleted) {
		console.warn("activateNextTrackedQuest(): Trying to activate a next quest when the previous is not tracked!. Previous ID: " + item.ID);
		return;
	}

	const currentQuest = QuestTracker.get(item.ID);
	const currentType: AdvisorType | undefined = currentQuest?.victory?.type;
	if (currentType == undefined) {
		console.warn("tutorial-support: activateNextTrackedQuest(): No advisor type for currentQuest: " + item.ID);
		return;
	}

	const currentOrder: number | undefined = currentQuest?.victory?.order;
	if (currentOrder == undefined) {
		console.warn("tutorial-support: activateNextTrackedQuest(): No order for currentQuest: " + item.ID);
		return;
	}

	const isPathTracked = QuestTracker.isPathTracked(currentType);
	if (!isPathTracked) {
		console.warn("tutorial-support: activateNextTrackedQuest(): The path for this quest is not tracked! Item ID: " + item.ID);
		return;
	}

	const nextQuestOrder = currentOrder + 1;
	const items: QuestItem[] = Array.from(QuestTracker.getItems());
	const nextQuestItem: QuestItem | undefined = items.find(item => item.victory?.type == currentType && item.victory.order == nextQuestOrder);

	if (nextQuestItem == undefined) {
		console.warn(`tutorial-support: activateNextTrackedQuest(): No next quest found with order: ${nextQuestOrder} in legacy path: ${currentType}`);
		return;
	}

	QuestTracker.setQuestVictoryStateById(nextQuestItem.id, VictoryQuestState.QUEST_IN_PROGRESS);
}

// TODO: Replace this enum with a .d.ts defined enum when the backend implementation is done
export enum AdvisorRecommendations {
	NO_ADVISOR = "recommendation-none",
	CULTURAL = "recommendation-cultural",
	ECONOMIC = "recommendation-economic",
	MILITARY = "recommendation-military",
	SCIENTIFIC = "recommendation-scientific"
}

export namespace AdvisorUtilities {

	export type AdvisorClassObject = {
		class: AdvisorRecommendations
	}

	function getTextForAdvisorRecommendation(type: AdvisorRecommendations): string {
		switch (type) {
			case AdvisorRecommendations.CULTURAL:
				return "LOC_UI_RECOMMENDATION_CULTURAL";
			case AdvisorRecommendations.ECONOMIC:
				return "LOC_UI_RECOMMENDATION_ECONOMIC";
			case AdvisorRecommendations.MILITARY:
				return "LOC_UI_RECOMMENDATION_MILITARY";
			case AdvisorRecommendations.SCIENTIFIC:
				return "LOC_UI_RECOMMENDATION_SCIENCE";
			default:
				return "LOC_UI_RECOMMENDATION_DEFAULT"
		}
	}

	export function createAdvisorRecommendationTooltip(elements: Array<AdvisorRecommendations>) {
		const advisorRecommendationContainer = document.createElement("div");
		advisorRecommendationContainer.classList.add("advisor-recommendation__container", "flex-col", "items-start", "font-body");

		for (const rec of elements) {
			const recomendationElement = document.createElement("div");
			recomendationElement.classList.add("flex", "flex-auto", "items-center", "my-1");

			const advisorRecommendationIcon = document.createElement("div");
			advisorRecommendationIcon.classList.add("advisor-recommendation__icon", "mr-2", "flex");
			advisorRecommendationIcon.classList.add(rec);
			recomendationElement.appendChild(advisorRecommendationIcon);

			const advisorRecommendationText = document.createElement("div");
			advisorRecommendationText.classList.add("flex", "flex-auto", "flex-wrap");
			advisorRecommendationText.setAttribute("data-l10n-id", getTextForAdvisorRecommendation(rec));

			recomendationElement.appendChild(advisorRecommendationText);

			advisorRecommendationContainer.appendChild(recomendationElement);
		}
		return advisorRecommendationContainer;
	}

	/**
	 * Helper function to create recommendation icons. Can be used from binding models or manually
	 * @returns elements with respective icons or icons bind to a container
	*/
	export function createAdvisorRecommendation(elements: string, container: HTMLElement): void;
	export function createAdvisorRecommendation(elements: Array<AdvisorRecommendations>): HTMLElement;
	export function createAdvisorRecommendation(elements: string | Array<AdvisorRecommendations>, container?: HTMLElement): HTMLElement | void {
		const advisorRecommendationContainer = document.createElement("div");
		advisorRecommendationContainer.classList.add("advisor-recommendation__container");
		// We're binding if the elements param is a string, else we return the container and append it manually
		if (typeof elements == "string") {
			if (!container) {
				console.error(`tutorial-support: No container to attach advisor recommendation icons.`);
				return;
			}
			const advisorRecommendationIconDiv = document.createElement("div");
			Databind.for(advisorRecommendationIconDiv, elements, "recommendation");
			{
				const advisorRecommendationIcon = document.createElement("div");
				advisorRecommendationIcon.classList.add("advisor-recommendation__icon", "m-0\\.5");

				advisorRecommendationIcon.setAttribute('data-bind-class', '{{recommendation.class}}');
				advisorRecommendationIconDiv.appendChild(advisorRecommendationIcon);
			}
			advisorRecommendationContainer.appendChild(advisorRecommendationIconDiv);
			container.appendChild(advisorRecommendationContainer);
		} else {
			advisorRecommendationContainer.classList.add("hidden");
			if (elements.length > 0) {
				advisorRecommendationContainer.classList.remove("hidden");
			}
			for (const rec of elements) {
				const advisorRecommendationIcon = document.createElement("div");
				advisorRecommendationIcon.classList.add("advisor-recommendation__icon", "m-0\\.5");
				advisorRecommendationIcon.classList.add(rec);
				advisorRecommendationContainer.appendChild(advisorRecommendationIcon);
			}
			return advisorRecommendationContainer;
		}
	}

	/**
	 * Helper function to get the icon CSS classes for advisor recommendation gems
	 * @returns array with CSS classes for gems
	*/
	export function getBuildRecommendationIcons(recommendations: BuildRecommendation[], type: string): AdvisorClassObject[] {
		for (const recommendation of recommendations) {
			// get the recommendation subject to know in what collection to lookup the recommendedType (index)
			const advisorySubject = GameInfo.AdvisorySubjects.lookup(recommendation.subject);

			let definition: UnitDefinition | ConstructibleDefinition | ProjectDefinition | null = null;
			let definitionType: string | undefined = undefined;

			switch (advisorySubject?.AdvisorySubjectType) {
				case "ADVISORY_SUBJECT_PRODUCE_UNITS":
					definition = GameInfo.Units.lookup(recommendation.recommendedType);
					definitionType = definition?.UnitType;
					break;
				case "ADVISORY_SUBJECT_PRODUCE_CONSTRUCTIBLES":
					definition = GameInfo.Constructibles.lookup(recommendation.recommendedType);
					definitionType = definition?.ConstructibleType;
					break;
				case "ADVISORY_SUBJECT_PRODUCE_PROJECTS":
					definition = GameInfo.Projects.lookup(recommendation.recommendedType);
					definitionType = definition?.ProjectType;
					break;
			}

			if (!definition || recommendation.whichAdvisors == undefined) {
				continue;
			}

			// the definitionType is how we link the object in AdvisorySubjects with the actual definition we want
			if (definitionType == type) {
				// transform the dynamic AdvisorType into a collection of CSS classes
				const objectTypes: AdvisorClassObject[] = recommendation.whichAdvisors.map(type => {
					let cssClass: AdvisorRecommendations = AdvisorRecommendations.NO_ADVISOR;
					switch (type) {
						case AdvisorTypes.CULTURE:
							cssClass = AdvisorRecommendations.CULTURAL;
							break;
						case AdvisorTypes.ECONOMIC:
							cssClass = AdvisorRecommendations.ECONOMIC;
							break;
						case AdvisorTypes.MILITARY:
							cssClass = AdvisorRecommendations.MILITARY;
							break;
						case AdvisorTypes.SCIENCE:
							cssClass = AdvisorRecommendations.SCIENTIFIC;
							break;
						default:
							break;
					}
					const classObject: AdvisorClassObject = {
						class: cssClass
					}
					return classObject
				});
				// return back the transformed CSS classes
				return objectTypes;
			}
		}

		// return a empty array for the databinding to show nothing
		return [];
	}

	/**
	 * Helper function to get the icon CSS classes for advisor recommendation gems
	 * @returns array with CSS classes for gems
	*/
	export function getTreeRecommendationIcons(recommendations: TreeRecommendation[], nodeType: ProgressionTreeNodeType): AdvisorClassObject[] {
		for (const recommendation of recommendations) {

			if (!recommendation.whichAdvisors?.length) {
				continue;
			}
			const treeNode = GameInfo.ProgressionTreeNodes.lookup(recommendation.recommendedType);
			if (!treeNode) {
				continue;
			}
			const nodeData = Game.ProgressionTrees.getNode(GameContext.localPlayerID, treeNode.ProgressionTreeNodeType);
			if (nodeData?.nodeType != nodeType) {
				continue;
			}

			const objectTypes: AdvisorClassObject[] = recommendation.whichAdvisors.map(type => {
				let cssClass: AdvisorRecommendations = AdvisorRecommendations.NO_ADVISOR;
				switch (type) {
					case AdvisorTypes.CULTURE:
						cssClass = AdvisorRecommendations.CULTURAL;
						break;
					case AdvisorTypes.ECONOMIC:
						cssClass = AdvisorRecommendations.ECONOMIC;
						break;
					case AdvisorTypes.MILITARY:
						cssClass = AdvisorRecommendations.MILITARY;
						break;
					case AdvisorTypes.SCIENCE:
						cssClass = AdvisorRecommendations.SCIENTIFIC;
						break;
					default:
						break;
				}
				const classObject: AdvisorClassObject = {
					class: cssClass
				}
				return classObject
			});
			// return back the transformed CSS classes
			return objectTypes;

		}

		// return a empty array for the databinding to show nothing
		return [];
	}

	export const getTreeRecommendations = (subject: typeof AdvisorySubjectTypes.CHOOSE_TECH | typeof AdvisorySubjectTypes.CHOOSE_CULTURE): TreeRecommendation[] => {
		const localPlayer = GameContext.localPlayerID;

		const recommendationParams: TreeRecommendationParameters = {
			playerId: localPlayer,
			subject: subject,
			maxReturnedEntries: 0,
		}

		return Players.Advisory.get(localPlayer)?.getTreeRecommendations(recommendationParams) ?? [];
	}
}