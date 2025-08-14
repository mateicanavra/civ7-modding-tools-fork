/**
 * @file utilities-image.ts
 * @copyright 2021-2022, Firaxis Games
 * @description Provides commonly use functions for images / icons.
 */
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
export var Icon;
(function (Icon) {
    /** @returns the image to use for when an icon image cannot be located */
    function missingUnitImage() {
        return 'unitflag_missingicon.png';
    }
    Icon.missingUnitImage = missingUnitImage;
    function getUnitIconFromID(componentID) {
        const missingIcon = Icon.missingUnitImage();
        const unit = Units.get(componentID);
        if (!unit) {
            console.error("Failed attempt to get a unit icon for unit cid: ", ComponentID.toLogString(componentID));
            return missingIcon;
        }
        const unitDefinition = GameInfo.Units.lookup(unit.type);
        if (!unitDefinition) {
            console.error("Cannot get a unit icon due to a missing Unit Definition. type: ", unit.type, "  cid: ", ComponentID.toLogString(componentID));
            return missingIcon;
        }
        const iconURL = UI.getIconURL(unitDefinition.UnitType, "UNIT_FLAG");
        return iconURL;
    }
    Icon.getUnitIconFromID = getUnitIconFromID;
    function getUnitIconFromDefinition(unitDefinition) {
        if (!unitDefinition) {
            console.error("Cannot get a unit icon due to a missing Unit Definition.");
            return Icon.missingUnitImage();
        }
        const iconURL = UI.getIconURL(unitDefinition.UnitType, "UNIT_FLAG");
        return iconURL;
    }
    Icon.getUnitIconFromDefinition = getUnitIconFromDefinition;
    function getBuildingIconFromDefinition(buildingDefinition) {
        const iconURL = UI.getIconURL(buildingDefinition.ConstructibleType, "BUILDING");
        return iconURL;
    }
    Icon.getBuildingIconFromDefinition = getBuildingIconFromDefinition;
    function getConstructibleIconFromDefinition(constructibleDefinition) {
        const iconURL = UI.getIconURL(constructibleDefinition.ConstructibleType, constructibleDefinition.ConstructibleClass);
        return iconURL;
    }
    Icon.getConstructibleIconFromDefinition = getConstructibleIconFromDefinition;
    function getTraditionIconFromDefinition(traditionDefinition) {
        const iconURL = UI.getIconURL(traditionDefinition.TraditionType, "TRADITION");
        return iconURL;
    }
    Icon.getTraditionIconFromDefinition = getTraditionIconFromDefinition;
    function getModifierIconFromDefinition(modifierDefinition) {
        const iconURL = UI.getIconURL(modifierDefinition.ModifierType);
        return iconURL;
    }
    Icon.getModifierIconFromDefinition = getModifierIconFromDefinition;
    function getProjectIconFromDefinition(projectDefinition) {
        const iconURL = UI.getIconURL(projectDefinition.ProjectType, "PROJECT");
        return iconURL;
    }
    Icon.getProjectIconFromDefinition = getProjectIconFromDefinition;
    function getImprovementIconFromDefinition(improvementDefinition) {
        return UI.getIconURL(improvementDefinition.ConstructibleType, "IMPROVEMENT");
    }
    Icon.getImprovementIconFromDefinition = getImprovementIconFromDefinition;
    function getWonderIconFromDefinition(wonderDefinition) {
        return UI.getIconURL(wonderDefinition.ConstructibleType, "WONDER");
    }
    Icon.getWonderIconFromDefinition = getWonderIconFromDefinition;
    function getTechIconFromProgressionTreeNodeDefinition(_techDefinition) {
        const nodeInfo = GameInfo.ProgressionTreeNodes.lookup(_techDefinition.ProgressionTreeNodeType);
        if (nodeInfo) {
            return `fs://game/base-standard/ui/icons/tech_icons/${nodeInfo.IconString}.png`;
        }
        else {
            return `fs://game/base-standard/ui/icons/culture_icons/unknown_complete.png`; //TODO: update with unknown tech icon 
        }
    }
    Icon.getTechIconFromProgressionTreeNodeDefinition = getTechIconFromProgressionTreeNodeDefinition;
    function getCultureIconFromProgressionTreeNodeDefinition(_cultureDefinition) {
        const nodeInfo = GameInfo.ProgressionTreeNodes.lookup(_cultureDefinition.ProgressionTreeNodeType);
        if (nodeInfo && nodeInfo.IconString) {
            return `fs://game/base-standard/ui/icons/culture_icons/${nodeInfo.IconString}.png`;
        }
        else {
            return `fs://game/base-standard/ui/icons/culture_icons/unknown_complete.png`;
        }
    }
    Icon.getCultureIconFromProgressionTreeNodeDefinition = getCultureIconFromProgressionTreeNodeDefinition;
    function getCultureIconFromProgressionTreeDefinition(_cultureDefinition) {
        let icon = _cultureDefinition.IconString;
        if (icon) {
            return `fs://game/base-standard/ui/icons/culture_icons/${icon}.png`;
        }
        else {
            return `fs://game/base-standard/ui/icons/culture_icons/unknown_complete.png`;
        }
    }
    Icon.getCultureIconFromProgressionTreeDefinition = getCultureIconFromProgressionTreeDefinition;
    function getDiplomaticActionIconFromDefinition(diploActionInfo) {
        return diploActionInfo.UIIconPath;
    }
    Icon.getDiplomaticActionIconFromDefinition = getDiplomaticActionIconFromDefinition;
    /**
     * @param label Lookup key
     * @param bLocal Used to change the styling of the icon
     * @returns File path to specified image or, if not found, a question mark image
     */
    function getYieldIcon(yieldType, bLocal = true) {
        let icon = '';
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
    Icon.getYieldIcon = getYieldIcon;
    function getProductionIconFromHash(hash) {
        const unitDefinition = GameInfo.Units.lookup(hash);
        if (unitDefinition) {
            return getUnitIconFromDefinition(unitDefinition);
        }
        const buildingDefinition = GameInfo.Buildings.lookup(hash);
        if (buildingDefinition) {
            return getBuildingIconFromDefinition(buildingDefinition);
        }
        const projectDefinition = GameInfo.Projects.lookup(hash);
        if (projectDefinition) {
            return getProjectIconFromDefinition(projectDefinition);
        }
        const improvementDefinition = GameInfo.Improvements.lookup(hash);
        if (improvementDefinition) {
            return getImprovementIconFromDefinition(improvementDefinition);
        }
        const wonderDefinition = GameInfo.Wonders.lookup(hash);
        if (wonderDefinition) {
            return getWonderIconFromDefinition(wonderDefinition);
        }
        return Icon.missingUnitImage(); // TODO: Change to missing techtree icon
    }
    Icon.getProductionIconFromHash = getProductionIconFromHash;
    function getLeaderPortraitIcon(leaderType, size, relationship) {
        const missingIcon = "fs://game/base-standard/leader_portrait_unknown.png";
        const leader = GameInfo.Leaders.lookup(leaderType); //TODO: Remove: GameInfo.LeaderInfo.lookup(leaderType);		
        if (!leader) {
            console.error("Failed attempt to get a leader icon for leaderType: ", leaderType.toString());
            return missingIcon;
        }
        const sizeSuffix = (size == undefined) ? "" : ("_" + size.toString());
        let relationshipSuffix = "";
        if (relationship) {
            switch (relationship) {
                case DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_HOSTILE:
                case DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_UNFRIENDLY:
                    relationshipSuffix = "_a";
                    break;
                case DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_FRIENDLY:
                case DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_HELPFUL:
                    relationshipSuffix = "_h";
                    break;
                default:
                    break;
            }
        }
        const iconName = UI.getIconURL(leader.LeaderType, "LEADER") + sizeSuffix + relationshipSuffix + ".png";
        return iconName.toLowerCase();
    }
    Icon.getLeaderPortraitIcon = getLeaderPortraitIcon;
    /**
     * Get the associated background image for a given player
     * @param {PlayerID} playerID
     * @returns {string} URL of the background image
     */
    function getPlayerBackgroundImage(playerID) {
        const player = Players.get(playerID);
        if (player) {
            let locator = player.civilizationFullName;
            if (locator) {
                let slice1 = locator.slice(17, locator.indexOf("_FULLNAME"));
                if (slice1) {
                    // Fix up the case of the filename for case-sensitive ports.
                    // Get the first letter as-is...
                    let firstchar = slice1.slice(0, 1);
                    // then the rest of the name...
                    let slice2 = slice1.slice(1);
                    // and turn the rest into lower case
                    slice2 = slice2.toLowerCase();
                    let filename = `fs://game/base-standard/ui/images/backgrounds/${firstchar}${slice2}_HeaderImage.png`;
                    return filename;
                }
            }
        }
        return "fs://game/base-standard/ui/images/backgrounds/Default_HeaderImage.png";
    }
    Icon.getPlayerBackgroundImage = getPlayerBackgroundImage;
    /**
     * Get the associated leader icon for a given player
     * @param {PlayerID} playerID
     * @param {number} (size) - A size representing width x height.
     * @returns {string} URL of the leader
     */
    function getPlayerLeaderIcon(playerID, size) {
        const playerList = Players.getEverAlive();
        const player = playerList.find(p => p.id == playerID);
        if (player) {
            return getLeaderPortraitIcon(player.leaderType, size);
        }
        return "fs://game/base-standard/ui/diplo-ribbon/img/TEMP_leader_portrait_confucius.png"; // TODO: Better deafult placeholder
    }
    Icon.getPlayerLeaderIcon = getPlayerLeaderIcon;
    function getNotificationIconFromID(notificationID, context = "NOTIFICATION") {
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
    Icon.getNotificationIconFromID = getNotificationIconFromID;
    function getIconFromActionName(actionName, inputDevice, inputContext, hasPrefix) {
        if (!actionName) {
            return null;
        }
        const defInputDevice = inputDevice != undefined ? inputDevice : InputDeviceType.Controller;
        const actionID = Input.getActionIdByName(actionName);
        if (actionID) {
            return getIconFromActionID(actionID, defInputDevice, inputContext, hasPrefix);
        }
        //TODO: handle action with no assigned key. Use a default "missing key" icon ?
        console.warn(`Icon: Cannot find icon for action name "${actionName}"`);
        return null;
    }
    Icon.getIconFromActionName = getIconFromActionName;
    function getIconFromActionID(actionID, inputDevice, inputContext, hasPrefix) {
        // TODO: handle action with multiple gestures 
        // Some gesture could have priority depending on the platform (eg display touch pinch in for zoom_in action on touch only device)
        const actionIconsName = Input.getGestureDisplayIcons(actionID, 0, inputDevice, inputContext ?? 0, hasPrefix ?? true); // in the active context
        // TODO: handle action with multiple keys 
        // Some gesture can have key combination such as SHIFT+T
        if (actionIconsName[0]) {
            return actionIconsName[0];
        }
        //TODO: handle action with no assigned key. Use a default "missing key" icon ?
        console.warn(`Icon: Cannot find icon for action id "${actionID}"`);
        return null;
    }
    Icon.getIconFromActionID = getIconFromActionID;
    function getCivSymbolFromCivilizationType(civilization) {
        const civDef = GameInfo.Civilizations.lookup(civilization);
        if (civDef) {
            return "fs://game/core/ui/civ_sym_" + civDef.CivilizationType.slice(13).toLowerCase();
        }
        return "";
    }
    Icon.getCivSymbolFromCivilizationType = getCivSymbolFromCivilizationType;
    function getCivLineFromCivilizationType(civilization) {
        const civDef = GameInfo.Civilizations.lookup(civilization);
        if (civDef) {
            return "fs://game/core/ui/civ_line_" + civDef.CivilizationType.slice(13).toLowerCase();
        }
        console.error(`Couldn't look up civ line for civilization ${civilization}`);
        return "";
    }
    Icon.getCivLineFromCivilizationType = getCivLineFromCivilizationType;
    function getCivSymbolCSSFromCivilizationType(civilization) {
        const url = getCivSymbolFromCivilizationType(civilization);
        return (url) ? `url('${url}')` : '';
    }
    Icon.getCivSymbolCSSFromCivilizationType = getCivSymbolCSSFromCivilizationType;
    function getCivLineCSSFromCivilizationType(civilization) {
        const url = getCivLineFromCivilizationType(civilization);
        return (url) ? `url('${url}')` : '';
    }
    Icon.getCivLineCSSFromCivilizationType = getCivLineCSSFromCivilizationType;
    function getCivSymbolCSSFromPlayer(playerComponent) {
        const localPlayer = Players.get(playerComponent.owner);
        if (!localPlayer) {
            return '';
        }
        return getCivSymbolCSSFromCivilizationType(localPlayer.civilizationType);
    }
    Icon.getCivSymbolCSSFromPlayer = getCivSymbolCSSFromPlayer;
    function getCivLineCSSFromPlayer(playerComponent) {
        const localPlayer = Players.get(playerComponent.owner);
        if (!localPlayer) {
            return '';
        }
        return getCivLineCSSFromCivilizationType(localPlayer.civilizationType);
    }
    Icon.getCivLineCSSFromPlayer = getCivLineCSSFromPlayer;
    function getLegacyPathIcon(legacyPath) {
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
    Icon.getLegacyPathIcon = getLegacyPathIcon;
    function getVictoryIcon(victoryDefinition) {
        return UI.getIconURL(victoryDefinition.VictoryClassType);
    }
    Icon.getVictoryIcon = getVictoryIcon;
    function getTechIconForCivilopedia(techName) {
        if (techName) {
            let newTechName = (techName.split("NODE_TECH_").pop())?.substring(3).toLowerCase();
            newTechName = newTechName?.replace('_', '');
            return `url('fs://game/tech_${newTechName}')`;
        }
        else {
            return `fs://game/base-standard/ui/icons/culture_icons/unknown_complete.png`;
        }
    }
    Icon.getTechIconForCivilopedia = getTechIconForCivilopedia;
    function getCivicsIconForCivilopedia(civicName) {
        if (civicName) {
            let newCivicName = (civicName.split("NODE_CIVIC_").pop())?.substring(3).toLowerCase();
            if (newCivicName) {
                if (newCivicName.startsWith("branch_")) {
                    newCivicName = newCivicName.substring(6);
                }
                if (newCivicName.startsWith("main_")) {
                    newCivicName = newCivicName.substring(5);
                }
            }
            newCivicName = newCivicName?.replace('_', '');
            return `url('fs://game/cult_${newCivicName}')`;
        }
        else {
            return `fs://game/base-standard/ui/icons/culture_icons/unknown_complete.png`;
        }
    }
    Icon.getCivicsIconForCivilopedia = getCivicsIconForCivilopedia;
    function getCivIconForCivilopedia(civName) {
        if (civName) {
            let newCivName = (civName.split("CIVILIZATION_").pop())?.toLowerCase();
            return `url('fs://game/civ_sym_${newCivName}')`;
        }
        else {
            return `fs://game/base-standard/ui/icons/culture_icons/unknown_complete.png`;
        }
    }
    Icon.getCivIconForCivilopedia = getCivIconForCivilopedia;
    function getCivIconForDiplomacyHeader(civType) {
        const civDef = GameInfo.Civilizations.lookup(civType);
        if (civDef) {
            return "fs://game/core/ui/dip_cs_" + civDef.CivilizationType.slice(13).toLowerCase();
        }
        else {
            return `fs://game/core/ui/dip_cs_abbasid`;
        }
    }
    Icon.getCivIconForDiplomacyHeader = getCivIconForDiplomacyHeader;
})(Icon || (Icon = {}));

//# sourceMappingURL=file:///core/ui/utilities/utilities-image.js.map
