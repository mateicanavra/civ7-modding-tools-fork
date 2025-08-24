/**
 * @file utilities-textprovider.ts			// TODO: Re-evaluate what is a generic text provider and what is specific for a type of file (e.g., trees), break out functions.
 * @copyright 2020-2022, Firaxis Games
 *
 * Helpers for finding, composing, and formatting text for all purposes.
 */
import { composeConstructibleDescription, getModifierTextByContext } from '/core/ui/utilities/utilities-core-textprovider.js';
import { Icon } from '/core/ui/utilities/utilities-image.js';
/** ================================================================
 *  Unlock Name/Desc Helpers
 * =============================================================== */
export function getUnlockTargetName(targetType, targetKind) {
    // Target is a MODIFIER
    if (targetKind == "KIND_MODIFIER") {
        const modInfo = GameInfo.Modifiers.find(o => o.ModifierId == targetType);
        if (modInfo) {
            let modifierName = getModifierTextByContext(modInfo.ModifierId, "Name");
            return Locale.compose(modifierName) ?? "";
        }
    }
    // Target is a CONSTRUCTIBLE
    if (targetKind == "KIND_CONSTRUCTIBLE") {
        const constructibleInfo = GameInfo.Constructibles.find(o => o.ConstructibleType == targetType);
        if (constructibleInfo) {
            return Locale.compose(constructibleInfo.Name);
        }
    }
    // Target is a UNIT
    if (targetKind == "KIND_UNIT") {
        const unitInfo = GameInfo.Units.find(o => o.UnitType == targetType);
        if (unitInfo) {
            return Locale.compose(unitInfo.Name);
        }
    }
    // Target is a TRADITION
    if (targetKind == "KIND_TRADITION") {
        const traditionInfo = GameInfo.Traditions.find(o => o.TraditionType == targetType);
        if (traditionInfo) {
            return Locale.compose(traditionInfo.Name);
        }
    }
    // Target is a DIPLOMATIC ACTION
    if (targetKind == "KIND_DIPLOMATIC_ACTION") {
        const diploActionInfo = GameInfo.DiplomacyActions.find(o => o.DiplomacyActionType == targetType);
        if (diploActionInfo) {
            return Locale.compose(diploActionInfo.Name);
        }
    }
    if (targetKind == "KIND_PROJECT") {
        const projectInfo = GameInfo.Projects.find(o => o.ProjectType == targetType);
        if (projectInfo) {
            return Locale.compose(projectInfo.Name);
        }
    }
    // Error case: this target is unhandled or the target did not match the kind
    return targetType;
}
//TODO: Move into utilties-image
//TODO: Does not need to be so specific by type, kind, etc
export function getUnlockTargetIcon(targetType, targetKind) {
    // Target is a CONSTRUCTIBLE
    if (targetKind == "KIND_CONSTRUCTIBLE") {
        const constructibleInfo = GameInfo.Constructibles.find(o => o.ConstructibleType == targetType);
        if (constructibleInfo) {
            return Icon.getConstructibleIconFromDefinition(constructibleInfo);
        }
    }
    // Target is a UNIT
    if (targetKind == "KIND_UNIT") {
        const unitInfo = GameInfo.Units.find(o => o.UnitType == targetType);
        if (unitInfo) {
            return Icon.getUnitIconFromDefinition(unitInfo);
        }
    }
    let iconURL = UI.getIcon(targetKind + "_UNLOCK");
    if (iconURL != "") {
        return iconURL;
    }
    else {
        iconURL = UI.getIconURL(targetType);
        if (iconURL != "") {
            return iconURL;
        }
    }
    if (targetKind == "KIND_MODIFIER") {
        return UI.getIconURL("MOD_GENERIC_BONUS");
    }
    console.warn("cannot get icon for unhandled targetType: ", targetType, ",  target kind: ", targetKind);
    return UI.getIconURL("MOD_GENERIC_BONUS");
}
export function getUnlockTargetDescriptions(targetType, targetKind) {
    let locStrings = [];
    // Target is a MODIFIER
    if (targetKind == "KIND_MODIFIER") {
        const modInfo = GameInfo.Modifiers.find(o => o.ModifierId == targetType);
        if (modInfo) {
            const modifierDesc = getModifierTextByContext(modInfo.ModifierId, "Description");
            if (modifierDesc) {
                locStrings.push(modifierDesc);
            }
        }
    }
    // Target is a CONSTRUCTIBLE
    else if (targetKind == "KIND_CONSTRUCTIBLE") {
        const desc = composeConstructibleDescription(targetType);
        if (desc) {
            locStrings.push(desc);
        }
    }
    // Target is a UNIT
    else if (targetKind == "KIND_UNIT") {
        const unitInfo = GameInfo.Units.find(o => o.UnitType == targetType);
        if (unitInfo) {
            if (unitInfo.Description) {
                locStrings.push(Locale.compose(unitInfo.Description));
            }
        }
    }
    // Target is a TRADITION
    else if (targetKind == "KIND_TRADITION") {
        locStrings = getTraditionDescriptions(targetType);
    }
    // Target is a DIPLOMATIC ACTION
    else if (targetKind == "KIND_DIPLOMATIC_ACTION") {
        const diploActionInfo = GameInfo.DiplomacyActions.find(o => o.DiplomacyActionType == targetType);
        if (diploActionInfo) {
            locStrings.push(Locale.compose(diploActionInfo.Description));
        }
    }
    else if (targetKind == "KIND_PROJECT") {
        const projectInfo = GameInfo.Projects.find(o => o.ProjectType == targetType);
        if (projectInfo) {
            locStrings.push(Locale.compose(projectInfo.Description));
        }
    }
    return locStrings;
}
// Traditions can have 1+ modifiers associated with them, return all modifier descriptions as the Tradition description
export function getTraditionDescriptions(traditionType) {
    let descStrings = [];
    const traditionInfo = GameInfo.Traditions.lookup(traditionType);
    if (traditionInfo) {
        for (let modifier of GameInfo.TraditionModifiers) {
            if (modifier.TraditionType == traditionInfo.TraditionType) {
                const modifierDesc = getModifierTextByContext(modifier.ModifierId, "Description");
                if (modifierDesc) {
                    descStrings.push(modifierDesc);
                }
            }
        }
        // No descriptions from modifiers on this tradition, use the tradition's own description instead
        if (descStrings.length == 0) {
            if (traditionInfo.Description) {
                descStrings.push(Locale.compose(traditionInfo.Description));
            }
        }
    }
    return descStrings;
}
export function getNodeName(nodeData) {
    if (!nodeData) {
        return "";
    }
    const nodeInfo = GameInfo.ProgressionTreeNodes.lookup(nodeData.nodeType);
    if (!nodeInfo) {
        return "";
    }
    let nodeName = Locale.compose(nodeInfo.Name ?? nodeInfo.ProgressionTreeNodeType);
    if (nodeData.depthUnlocked >= 1) {
        let depthNumeral = Locale.toRomanNumeral(nodeData.depthUnlocked + 1);
        if (depthNumeral) {
            nodeName += " " + depthNumeral;
        }
    }
    return nodeName;
}
export function getUnlockDepthPrefix(iCurDepth, iMaxDepth) {
    // If all unlocks are at base depth, no prefix required
    if (iMaxDepth <= 1) {
        return "";
    }
    return (iCurDepth + 1) + "/" + iMaxDepth;
}

//# sourceMappingURL=file:///base-standard/ui/utilities/utilities-textprovider.js.map
