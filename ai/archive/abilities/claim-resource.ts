import { TypeNode, DatabaseNode } from "civ7-modding-tools";
import { XmlFile } from "civ7-modding-tools";
import { ACTION_GROUP, ACTION_GROUP_ACTION, KIND } from "civ7-modding-tools";
// import { ACTION_GROUP_BUNDLE } from "../config";
import { XmlElement } from "jstoxml";

export function createClaimResourceAbilities() {
    // Create type nodes for our abilities
    const abilityType = new TypeNode({
        type: "ABILITY_CLAIM_RESOURCE",
        kind: "KIND_ABILITY" as any // Cast to any since KIND.ABILITY doesn't exist
    });
    
    const chargedAbilityType = new TypeNode({
        type: "CHARGED_ABILITY_CLAIM_RESOURCE",
        kind: "KIND_ABILITY" as any // Cast to any since KIND.ABILITY doesn't exist
    });
    
    // Create database node with our types
    const database = new DatabaseNode({
        types: [abilityType, chargedAbilityType]
    });
    
    // Create the file with DB element and action groups
    const file = new XmlFile({
        path: `/abilities/claim-resource-abilities.xml`,
        name: "claim-resource-abilities.xml",
        content: database.toXmlElement(),
        actionGroups: [ACTION_GROUP.AGE_ANTIQUITY_CURRENT],
        actionGroupActions: [ACTION_GROUP_ACTION.UPDATE_DATABASE]
    });
    
    // We'll also need to create separate files for the unit abilities and charged abilities
    // Since these aren't supported in the DatabaseNode
    
    // Create Unit Abilities file
    const unitAbilitiesFile = createUnitAbilitiesFile();
    
    // Create Charged Unit Abilities file
    const chargedAbilitiesFile = createChargedUnitAbilitiesFile();
    
    return [file, unitAbilitiesFile, chargedAbilitiesFile];
}

// Helper function to create XmlElement objects from raw XML strings
function createXmlElementFromString(xmlString: string): XmlElement {
    // Based on examination of XmlElement from jstoxml, it's essentially any object
    // Define a simpler direct object structure
    
    // Parse the XML string
    const rootMatch = xmlString.match(/<Database>([\s\S]*)<\/Database>/);
    if (!rootMatch) {
        throw new Error("Invalid XML string - no Database element found");
    }
    
    const databaseContent = rootMatch[1].trim();
    // Create the object structure directly matching jstoxml's expected format
    const rootElement: any = { Database: {} };
    
    // Parse UnitAbilities section
    const unitAbilitiesMatch = databaseContent.match(/<UnitAbilities>([\s\S]*?)<\/UnitAbilities>/);
    if (unitAbilitiesMatch) {
        rootElement.Database.UnitAbilities = [];
        const rowMatches = unitAbilitiesMatch[1].match(/<Row[^>]*\/>/g);
        if (rowMatches) {
            rowMatches.forEach(rowString => {
                const attributes: Record<string, string> = {};
                const attrMatches = rowString.matchAll(/(\w+)="([^"]*)"/g);
                for (const match of attrMatches) {
                    attributes[match[1]] = match[2];
                }
                rootElement.Database.UnitAbilities.push({ Row: attributes });
            });
        }
    }
    
    // Parse ChargedUnitAbilities section
    const chargedUnitAbilitiesMatch = databaseContent.match(/<ChargedUnitAbilities>([\s\S]*?)<\/ChargedUnitAbilities>/);
    if (chargedUnitAbilitiesMatch) {
        rootElement.Database.ChargedUnitAbilities = [];
        const rowMatches = chargedUnitAbilitiesMatch[1].match(/<Row[^>]*\/>/g);
        if (rowMatches) {
            rowMatches.forEach(rowString => {
                const attributes: Record<string, string> = {};
                const attrMatches = rowString.matchAll(/(\w+)="([^"]*)"/g);
                for (const match of attrMatches) {
                    attributes[match[1]] = match[2];
                }
                rootElement.Database.ChargedUnitAbilities.push({ Row: attributes });
            });
        }
    }
    
    // Parse Unit_Abilities section
    const unitAbilitiesBindingMatch = databaseContent.match(/<Unit_Abilities>([\s\S]*?)<\/Unit_Abilities>/);
    if (unitAbilitiesBindingMatch) {
        rootElement.Database.Unit_Abilities = [];
        const rowMatches = unitAbilitiesBindingMatch[1].match(/<Row[^>]*\/>/g);
        if (rowMatches) {
            rowMatches.forEach(rowString => {
                const attributes: Record<string, string> = {};
                const attrMatches = rowString.matchAll(/(\w+)="([^"]*)"/g);
                for (const match of attrMatches) {
                    attributes[match[1]] = match[2];
                }
                rootElement.Database.Unit_Abilities.push({ Row: attributes });
            });
        }
    }
    
    // Parse LocalizedText section
    const localizedTextMatch = databaseContent.match(/<LocalizedText>([\s\S]*?)<\/LocalizedText>/);
    if (localizedTextMatch) {
        rootElement.Database.LocalizedText = [];
        const rowMatches = localizedTextMatch[1].match(/<Row[^>]*>[\s\S]*?<\/Row>/g);
        if (rowMatches) {
            rowMatches.forEach(rowString => {
                const rowObj: Record<string, any> = {};
                
                const tagMatch = rowString.match(/Tag="([^"]*)"/);
                if (tagMatch) rowObj.Tag = tagMatch[1];
                
                const langMatch = rowString.match(/Language="([^"]*)"/);
                if (langMatch) rowObj.Language = langMatch[1];
                
                const textMatch = rowString.match(/<Text>([\s\S]*?)<\/Text>/);
                if (textMatch) rowObj.Text = textMatch[1];
                
                rootElement.Database.LocalizedText.push({ Row: rowObj });
            });
        }
    }
    
    return rootElement as XmlElement;
}

function createUnitAbilitiesFile() {
    // Use direct XML generation
    let xmlContent = '<?xml version="1.0" encoding="utf-8"?>\n';
    xmlContent += '<Database>\n';
    xmlContent += '  <UnitAbilities>\n';
    xmlContent += '    <Row UnitAbilityType="ABILITY_CLAIM_RESOURCE" Name="LOC_ABILITY_CLAIM_RESOURCE_NAME" Description="LOC_ABILITY_CLAIM_RESOURCE_DESCRIPTION"/>\n';
    xmlContent += '  </UnitAbilities>\n';
    xmlContent += '</Database>';
    
    const element = createXmlElementFromString(xmlContent);
    
    return new XmlFile({
        path: `/abilities/claim-resource-ability.xml`,
        name: "claim-resource-ability.xml",
        content: element,
        actionGroups: [ACTION_GROUP.AGE_ANTIQUITY_CURRENT],
        actionGroupActions: [ACTION_GROUP_ACTION.UPDATE_DATABASE]
    });
}

function createChargedUnitAbilitiesFile() {
    // Use direct XML generation
    let xmlContent = '<?xml version="1.0" encoding="utf-8"?>\n';
    xmlContent += '<Database>\n';
    xmlContent += '  <ChargedUnitAbilities>\n';
    xmlContent += '    <Row UnitAbilityType="CHARGED_ABILITY_CLAIM_RESOURCE" RechargeTurns="5"/>\n';
    xmlContent += '  </ChargedUnitAbilities>\n';
    xmlContent += '</Database>';
    
    const element = createXmlElementFromString(xmlContent);
    
    return new XmlFile({
        path: `/abilities/charged-claim-resource-ability.xml`,
        name: "charged-claim-resource-ability.xml",
        content: element,
        actionGroups: [ACTION_GROUP.AGE_ANTIQUITY_CURRENT],
        actionGroupActions: [ACTION_GROUP_ACTION.UPDATE_DATABASE]
    });
}

export function createUnitAbilityBinding(unitType: string) {
    // Use direct XML generation
    let xmlContent = '<?xml version="1.0" encoding="utf-8"?>\n';
    xmlContent += '<Database>\n';
    xmlContent += '  <Unit_Abilities>\n';
    xmlContent += `    <Row UnitType="${unitType}" UnitAbilityType="ABILITY_CLAIM_RESOURCE"/>\n`;
    xmlContent += '  </Unit_Abilities>\n';
    xmlContent += '</Database>';
    
    const element = createXmlElementFromString(xmlContent);
    
    return new XmlFile({
        path: `/units/${unitType.toLowerCase()}-abilities.xml`,
        name: `${unitType.toLowerCase()}-abilities.xml`,
        content: element,
        actionGroups: [ACTION_GROUP.AGE_ANTIQUITY_CURRENT],
        actionGroupActions: [ACTION_GROUP_ACTION.UPDATE_DATABASE]
    });
}

export function createClaimResourceLocalizations() {
    // For GameData, we use a direct structure rather than parsing
    const element: XmlElement = {
        GameData: {
            LocalizedText: [
                {
                    Row: {
                        Tag: "LOC_ABILITY_CLAIM_RESOURCE_NAME",
                        Language: "en_US",
                        Text: "Claim Resource"
                    }
                },
                {
                    Row: {
                        Tag: "LOC_ABILITY_CLAIM_RESOURCE_DESCRIPTION",
                        Language: "en_US", 
                        Text: "Claim an unclaimed resource, adding it to your civilization."
                    }
                }
            ]
        }
    };
    
    return new XmlFile({
        path: `/text/en_US/abilities_text.xml`,
        name: "abilities_text.xml",
        content: element,
        actionGroups: [ACTION_GROUP.AGE_ANTIQUITY_CURRENT],
        actionGroupActions: [ACTION_GROUP_ACTION.UPDATE_TEXT]
    });
} 