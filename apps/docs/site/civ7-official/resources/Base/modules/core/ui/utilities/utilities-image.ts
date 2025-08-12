/**
 * @file utilities-image.ts
 * @copyright 2021-2022, Firaxis Games
 * @description Provides commonly use functions for images / icons.
 */

import { ComponentID } from '/core/ui/utilities/utilities-component-id.js'


export namespace Icon {

	/** @returns the image to use for when an icon image cannot be located */
	export function missingUnitImage(): string {
		return 'unitflag_missingicon.png'
	}

	export function getUnitIconFromID(componentID: ComponentID): string {
		const missingIcon: string = Icon.missingUnitImage();
		const unit: Unit | null = Units.get(componentID);
		if (!unit) {
			console.error("Failed attempt to get a unit icon for unit cid: ", ComponentID.toLogString(componentID));
			return missingIcon;
		}

		const unitDefinition: UnitDefinition | null = GameInfo.Units.lookup(unit.type);
		if (!unitDefinition) {
			console.error("Cannot get a unit icon due to a missing Unit Definition. type: ", unit.type, "  cid: ", ComponentID.toLogString(componentID));
			return missingIcon;
		}

		const iconURL: string = UI.getIconURL(unitDefinition.UnitType, "UNIT_FLAG");
		return iconURL;
	}

	export function getUnitIconFromDefinition(unitDefinition: UnitDefinition | null): string {
		if (!unitDefinition) {
			console.error("Cannot get a unit icon due to a missing Unit Definition.");
			return Icon.missingUnitImage();
		}
		const iconURL: string = UI.getIconURL(unitDefinition.UnitType, "UNIT_FLAG");
		return iconURL;
	}

	export function getBuildingIconFromDefinition(buildingDefinition: BuildingDefinition): string {
		const iconURL: string = UI.getIconURL(buildingDefinition.ConstructibleType, "BUILDING");
		return iconURL;
	}

	export function getConstructibleIconFromDefinition(constructibleDefinition: ConstructibleDefinition): string {
		const iconURL: string = UI.getIconURL(constructibleDefinition.ConstructibleType, constructibleDefinition.ConstructibleClass);
		return iconURL;
	}

	export function getTraditionIconFromDefinition(traditionDefinition: TraditionDefinition): string {
		const iconURL: string = UI.getIconURL(traditionDefinition.TraditionType, "TRADITION");
		return iconURL;
	}

	export function getModifierIconFromDefinition(modifierDefinition: ModifierDefinition): string {
		const iconURL: string = UI.getIconURL(modifierDefinition.ModifierType);
		return iconURL;
	}

	export function getProjectIconFromDefinition(projectDefinition: ProjectDefinition): string {
		const iconURL: string = UI.getIconURL(projectDefinition.ProjectType, "PROJECT");
		return iconURL;
	}

	export function getImprovementIconFromDefinition(improvementDefinition: ImprovementDefinition): string {
		return UI.getIconURL(improvementDefinition.ConstructibleType, "IMPROVEMENT");
	}

	export function getWonderIconFromDefinition(wonderDefinition: WonderDefinition): string {
		return UI.getIconURL(wonderDefinition.ConstructibleType, "WONDER");
	}

	export function getTechIconFromProgressionTreeNodeDefinition(_techDefinition: ProgressionTreeNodeDefinition): string {
		const nodeInfo: ProgressionTreeNodeDefinition | null = GameInfo.ProgressionTreeNodes.lookup(_techDefinition.ProgressionTreeNodeType);
		if (nodeInfo) {
			return `fs://game/base-standard/ui/icons/tech_icons/${nodeInfo.IconString}.png`;
		}
		else {
			return `fs://game/base-standard/ui/icons/culture_icons/unknown_complete.png`; //TODO: update with unknown tech icon 
		}
	}

	export function getCultureIconFromProgressionTreeNodeDefinition(_cultureDefinition: ProgressionTreeNodeDefinition): string {
		const nodeInfo: ProgressionTreeNodeDefinition | null = GameInfo.ProgressionTreeNodes.lookup(_cultureDefinition.ProgressionTreeNodeType);
		if (nodeInfo && nodeInfo.IconString) {
			return `fs://game/base-standard/ui/icons/culture_icons/${nodeInfo.IconString}.png`;
		}
		else {
			return `fs://game/base-standard/ui/icons/culture_icons/unknown_complete.png`;
		}
	}

	export function getCultureIconFromProgressionTreeDefinition(_cultureDefinition: ProgressionTreeDefinition): string {
		let icon: string | undefined = _cultureDefinition.IconString;
		if (icon) {
			return `fs://game/base-standard/ui/icons/culture_icons/${icon}.png`;
		}
		else {
			return `fs://game/base-standard/ui/icons/culture_icons/unknown_complete.png`;
		}
	}

	export function getDiplomaticActionIconFromDefinition(diploActionInfo: DiplomacyActionDefinition): string {
		return diploActionInfo.UIIconPath;
	}

	/**
	 * @param label Lookup key 
	 * @param bLocal Used to change the styling of the icon 
	 * @returns File path to specified image or, if not found, a question mark image 
	 */
	export function getYieldIcon(yieldType: YieldType, bLocal: boolean = true): string {

		let icon: string = '';
		const yieldDefinition = GameInfo.Yields.lookup(yieldType);
		if (yieldDefinition) {
			icon = UI.getIconURL(yieldDefinition.YieldType, (bLocal ? "YIELD" : "YIELD_G"));
		}

		if (icon) {
			return icon;
		}
		else {
			//Using an unknown icon with question mark for visibility. 			
			return `fs://game/base-standard/ui/icons/culture_icons/unknown_complete.png`;
		}
	}

	export function getProductionIconFromHash(hash: number): string {
		const unitDefinition: UnitDefinition | null = GameInfo.Units.lookup(hash);
		if (unitDefinition) {
			return getUnitIconFromDefinition(unitDefinition);
		}
		const buildingDefinition: BuildingDefinition | null = GameInfo.Buildings.lookup(hash);
		if (buildingDefinition) {
			return getBuildingIconFromDefinition(buildingDefinition);
		}
		const projectDefinition: ProjectDefinition | null = GameInfo.Projects.lookup(hash);
		if (projectDefinition) {
			return getProjectIconFromDefinition(projectDefinition);
		}
		const improvementDefinition: ImprovementDefinition | null = GameInfo.Improvements.lookup(hash);
		if (improvementDefinition) {
			return getImprovementIconFromDefinition(improvementDefinition);
		}
		const wonderDefinition: WonderDefinition | null = GameInfo.Wonders.lookup(hash);
		if (wonderDefinition) {
			return getWonderIconFromDefinition(wonderDefinition);
		}

		return Icon.missingUnitImage();	// TODO: Change to missing techtree icon
	}

	export function getLeaderPortraitIcon(leaderType: LeaderType, size?: number, relationship?: DiplomacyPlayerRelationships): string {

		const missingIcon: string = "fs://game/base-standard/leader_portrait_unknown.png"
		const leader: LeaderDefinition | null = GameInfo.Leaders.lookup(leaderType);  				//TODO: Remove: GameInfo.LeaderInfo.lookup(leaderType);		
		if (!leader) {
			console.error("Failed attempt to get a leader icon for leaderType: ", leaderType.toString());
			return missingIcon;
		}

		const sizeSuffix: string = (size == undefined) ? "" : ("_" + size.toString());
		let relationshipSuffix: string = "";
		if (relationship) {
			switch (relationship) {
				case DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_HOSTILE:
				case DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_UNFRIENDLY:
					relationshipSuffix = "_a";
					break;
				case DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_FRIENDLY:
				case DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_HELPFUL:
					relationshipSuffix = "_h"
					break;
				default:
					break;
			}
		}
		const iconName: string = UI.getIconURL(leader.LeaderType, "LEADER") + sizeSuffix + relationshipSuffix + ".png";

		return iconName.toLowerCase();
	}

	/**
	 * Get the associated background image for a given player
	 * @param {PlayerID} playerID
	 * @returns {string} URL of the background image
	 */
	export function getPlayerBackgroundImage(playerID: PlayerId): string {
		const player = Players.get(playerID);
		if (player) {
			let locator: string = player.civilizationFullName;
			if (locator) {
				let slice1: string = locator.slice(17, locator.indexOf("_FULLNAME"));
				if (slice1) {
					// Fix up the case of the filename for case-sensitive ports.
					// Get the first letter as-is...
					let firstchar: string = slice1.slice(0, 1);
					// then the rest of the name...
					let slice2: string = slice1.slice(1);
					// and turn the rest into lower case
					slice2 = slice2.toLowerCase();

					let filename: string = `fs://game/base-standard/ui/images/backgrounds/${firstchar}${slice2}_HeaderImage.png`;
					return filename;
				}
			}
		}

		return "fs://game/base-standard/ui/images/backgrounds/Default_HeaderImage.png";
	}

	/**
	 * Get the associated leader icon for a given player
	 * @param {PlayerID} playerID 
	 * @param {number} (size) - A size representing width x height.
	 * @returns {string} URL of the leader
	 */
	export function getPlayerLeaderIcon(playerID: PlayerId, size?: number): string {
		const playerList: PlayerLibrary[] = Players.getEverAlive();
		const player: PlayerLibrary | undefined = playerList.find(p => p.id == playerID);
		if (player) {
			return getLeaderPortraitIcon(player.leaderType, size);
		}
		return "fs://game/base-standard/ui/diplo-ribbon/img/TEMP_leader_portrait_confucius.png";	// TODO: Better deafult placeholder
	}

	export function getNotificationIconFromID(notificationID: ComponentID, context: string = "NOTIFICATION"): string {
		const notification = Game.Notifications.find(notificationID);
		if (!notification) {
			console.error("Failed attempt to get a notification for notificationID: ", notificationID.toString());
			return "fs://game/base-standard/ui/icons/notifications/default.png";
		}

		const notificationTypeName = Game.Notifications.getTypeName(notification.Type);
		if (!notificationTypeName) {
			console.error("Failed to get the type name for a notification type ID ", notification.Type);
			return "fs://game/base-standard/ui/icons/notifications/default.png";
		}

		let iconURL = UI.getIconURL(notificationTypeName, context);
		if (!iconURL) {
			iconURL = UI.getIconURL("DEFAULT_NOTIFICATION");
		}

		return iconURL;
	}

	export function getIconFromActionName(actionName: string | undefined, inputDevice?: InputDeviceType, inputContext?: InputContext, hasPrefix?: boolean): string | null {
		if (!actionName) {
			return null;
		}

		const defInputDevice = inputDevice != undefined ? inputDevice : InputDeviceType.Controller;
		const actionID: InputActionID | null = Input.getActionIdByName(actionName);

		if (actionID) {
			return getIconFromActionID(actionID, defInputDevice, inputContext, hasPrefix);
		}

		//TODO: handle action with no assigned key. Use a default "missing key" icon ?
		console.warn(`Icon: Cannot find icon for action name "${actionName}"`);
		return null;
	}

	export function getIconFromActionID(actionID: InputActionID, inputDevice: InputDeviceType, inputContext?: InputContext, hasPrefix?: boolean): string | null {
		// TODO: handle action with multiple gestures 
		// Some gesture could have priority depending on the platform (eg display touch pinch in for zoom_in action on touch only device)
		const actionIconsName: string[] = Input.getGestureDisplayIcons(actionID, 0, inputDevice, inputContext ?? 0, hasPrefix ?? true); // in the active context

		// TODO: handle action with multiple keys 
		// Some gesture can have key combination such as SHIFT+T
		if (actionIconsName[0]) {
			return actionIconsName[0];
		}

		//TODO: handle action with no assigned key. Use a default "missing key" icon ?
		console.warn(`Icon: Cannot find icon for action id "${actionID}"`);
		return null;
	}

	export function getCivSymbolFromCivilizationType(civilization: CivilizationType): string {
		const civDef: CivilizationDefinition | null = GameInfo.Civilizations.lookup(civilization);
		if (civDef) {
			return "fs://game/core/ui/civ_sym_" + civDef.CivilizationType.slice(13).toLowerCase();
		}

		return "";
	}

	export function getCivLineFromCivilizationType(civilization: CivilizationType): string {
		const civDef: CivilizationDefinition | null = GameInfo.Civilizations.lookup(civilization);
		if (civDef) {
			return "fs://game/core/ui/civ_line_" + civDef.CivilizationType.slice(13).toLowerCase();
		}

		console.error(`Couldn't look up civ line for civilization ${civilization}`);
		return "";
	}

	export function getCivSymbolCSSFromCivilizationType(civilization: CivilizationType): string {
		const url: string = getCivSymbolFromCivilizationType(civilization);
		return (url) ? `url('${url}')` : '';
	}

	export function getCivLineCSSFromCivilizationType(civilization: CivilizationType): string {
		const url: string = getCivLineFromCivilizationType(civilization);
		return (url) ? `url('${url}')` : '';
	}

	export function getCivSymbolCSSFromPlayer(playerComponent: ComponentID): string {
		const localPlayer: PlayerLibrary | null = Players.get(playerComponent.owner);
		if (!localPlayer) {
			return '';
		}

		return getCivSymbolCSSFromCivilizationType(localPlayer.civilizationType);
	}

	export function getCivLineCSSFromPlayer(playerComponent: ComponentID): string {
		const localPlayer: PlayerLibrary | null = Players.get(playerComponent.owner);
		if (!localPlayer) {
			return '';
		}
		return getCivLineCSSFromCivilizationType(localPlayer.civilizationType);
	}

	export function getLegacyPathIcon(legacyPath: LegacyPathDefinition): string {
		// TODO: Refactor to use LegacyPathType, LegacyPathClassType 
		// KLUDGE!
		switch (legacyPath.LegacyPathClassType) {
			case 'LEGACY_PATH_CLASS_MILITARY':
				return UI.getIconURL('VICTORY_CLASS_MILITARY');
			case 'LEGACY_PATH_CLASS_CULTURE':
				return UI.getIconURL('VICTORY_CLASS_CULTURE');
			case 'LEGACY_PATH_CLASS_ECONOMIC':
				return UI.getIconURL('VICTORY_CLASS_ECONOMIC');
			case 'LEGACY_PATH_CLASS_SCIENCE':
				return UI.getIconURL('VICTORY_CLASS_SCIENCE');
		}

		return '';
	}

	export function getVictoryIcon(victoryDefinition: VictoryDefinition): string {
		return UI.getIconURL(victoryDefinition.VictoryClassType);
	}

	export function getTechIconForCivilopedia(techName: string): string {
		if (techName) {
			let newTechName = (techName.split("NODE_TECH_").pop())?.substring(3).toLowerCase();
			newTechName = newTechName?.replace('_', '');

			return `url('fs://game/tech_${newTechName}')`;
		}
		else {
			return `fs://game/base-standard/ui/icons/culture_icons/unknown_complete.png`;
		}
	}

	export function getCivicsIconForCivilopedia(civicName: string): string {
		if (civicName) {
			let newCivicName = (civicName.split("NODE_CIVIC_").pop())?.substring(3).toLowerCase();
			if (newCivicName) {
				if (newCivicName.startsWith("branch_")) {
					newCivicName = newCivicName.substring(6)
				}
				if (newCivicName.startsWith("main_")) {
					newCivicName = newCivicName.substring(5)
				}
			}
			newCivicName = newCivicName?.replace('_', '');
			return `url('fs://game/cult_${newCivicName}')`;
		}
		else {
			return `fs://game/base-standard/ui/icons/culture_icons/unknown_complete.png`;
		}
	}

	export function getCivIconForCivilopedia(civName: string): string {
		if (civName) {
			let newCivName = (civName.split("CIVILIZATION_").pop())?.toLowerCase();
			return `url('fs://game/civ_sym_${newCivName}')`;
		}
		else {
			return `fs://game/base-standard/ui/icons/culture_icons/unknown_complete.png`;
		}
	}

	export function getCivIconForDiplomacyHeader(civType: CivilizationType): string {
		const civDef: CivilizationDefinition | null = GameInfo.Civilizations.lookup(civType);
		if (civDef) {
			return "fs://game/core/ui/dip_cs_" + civDef.CivilizationType.slice(13).toLowerCase();
		}
		else {
			return `fs://game/core/ui/dip_cs_abbasid`;
		}
	}
}

