"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbilityBuilder = void 0;
const core_1 = require("../core");
const BaseBuilder_1 = require("./BaseBuilder");
const files_1 = require("../files");
const nodes_1 = require("../nodes");
const constants_1 = require("../constants");
const UnitBuilder_1 = require("./UnitBuilder");
class AbilityBuilder extends BaseBuilder_1.BaseBuilder {
    constructor(payload = {}) {
        var _a;
        super();
        this.actionGroupBundle = new core_1.ActionGroupBundle();
        this.abilityType = '';
        this.abilityName = '';
        this.abilityDescription = '';
        this.hasChargedAbility = false;
        this.chargedAbilityType = '';
        this.rechargeTurns = 5;
        this.boundUnits = [];
        this.boundUnitBuilders = [];
        this.boundModifiers = [];
        this.fill(payload);
        // Set default values
        if (payload.ability) {
            this.abilityType = payload.ability.abilityType;
            this.abilityName = payload.ability.name || this.abilityType;
            this.abilityDescription = payload.ability.description || '';
            // Setup charged ability if enabled
            if ((_a = payload.chargedAbility) === null || _a === void 0 ? void 0 : _a.enabled) {
                this.hasChargedAbility = true;
                this.chargedAbilityType = `CHARGED_${this.abilityType}`;
                this.rechargeTurns = payload.chargedAbility.rechargeTurns || 5;
            }
        }
    }
    // Standard bind method that follows toolkit pattern
    bind(entities) {
        entities.forEach(entity => {
            if (entity instanceof UnitBuilder_1.UnitBuilder) {
                this.bindToUnitBuilder(entity);
            }
        });
        return this;
    }
    // Bind this ability to a unit builder
    bindToUnitBuilder(unitBuilder) {
        // Store the unit builder reference
        this.boundUnitBuilders.push(unitBuilder);
        // Get the unit type from the builder
        const unitType = unitBuilder.unit.unitType;
        // Also add the unit type to our boundUnits array
        if (!this.boundUnits.includes(unitType)) {
            this.boundUnits.push(unitType);
        }
        return this;
    }
    // Bind this ability to a unit type directly (for backward compatibility)
    bindToUnit(unitType) {
        if (!this.boundUnits.includes(unitType)) {
            this.boundUnits.push(unitType);
        }
        return this;
    }
    // Add a method to bind modifiers to this ability
    bindModifiers(modifiers) {
        modifiers.forEach(modifier => {
            if (!this.boundModifiers.includes(modifier)) {
                this.boundModifiers.push(modifier);
            }
        });
        return this;
    }
    // Helper method to create the localization tag for the ability
    getNameLocTag() {
        return `LOC_${this.abilityType}_NAME`;
    }
    // Helper method to create the localization tag for the ability description
    getDescriptionLocTag() {
        return `LOC_${this.abilityType}_DESCRIPTION`;
    }
    // Generate all files for this ability
    build() {
        const files = [];
        // Create type nodes for ability types
        const abilityTypeNode = new nodes_1.TypeNode({
            type: this.abilityType,
            kind: constants_1.KIND.ABILITY
        });
        const typeNodes = [abilityTypeNode];
        // Add charged ability type if needed
        if (this.hasChargedAbility) {
            const chargedTypeNode = new nodes_1.TypeNode({
                type: this.chargedAbilityType,
                kind: constants_1.KIND.ABILITY
            });
            typeNodes.push(chargedTypeNode);
        }
        // Create the ability types file
        const typesDatabase = new nodes_1.DatabaseNode({
            types: typeNodes
        });
        const typesFile = new files_1.XmlFile({
            path: `/abilities/${this.abilityType.toLowerCase()}-types.xml`,
            name: `${this.abilityType.toLowerCase()}-types.xml`,
            content: typesDatabase.toXmlElement(),
            actionGroups: [this.actionGroupBundle.current],
            actionGroupActions: [constants_1.ACTION_GROUP_ACTION.UPDATE_DATABASE]
        });
        files.push(typesFile);
        // Create the unit ability definition
        const unitAbilityNode = new nodes_1.UnitAbilityNode({
            unitAbilityType: this.abilityType,
            name: this.getNameLocTag(),
            description: this.getDescriptionLocTag()
        });
        const unitAbilityDatabase = new nodes_1.DatabaseNode({
            unitAbilities: [unitAbilityNode]
        });
        const unitAbilityFile = new files_1.XmlFile({
            path: `/abilities/${this.abilityType.toLowerCase()}.xml`,
            name: `${this.abilityType.toLowerCase()}.xml`,
            content: unitAbilityDatabase.toXmlElement(),
            actionGroups: [this.actionGroupBundle.current],
            actionGroupActions: [constants_1.ACTION_GROUP_ACTION.UPDATE_DATABASE]
        });
        files.push(unitAbilityFile);
        // Create charged ability file if needed
        if (this.hasChargedAbility) {
            const chargedAbilityNode = new nodes_1.ChargedUnitAbilityNode({
                unitAbilityType: this.chargedAbilityType,
                rechargeTurns: this.rechargeTurns
            });
            const chargedAbilityDatabase = new nodes_1.DatabaseNode({
                chargedUnitAbilities: [chargedAbilityNode]
            });
            const chargedAbilityFile = new files_1.XmlFile({
                path: `/abilities/${this.chargedAbilityType.toLowerCase()}.xml`,
                name: `${this.chargedAbilityType.toLowerCase()}.xml`,
                content: chargedAbilityDatabase.toXmlElement(),
                actionGroups: [this.actionGroupBundle.current],
                actionGroupActions: [constants_1.ACTION_GROUP_ACTION.UPDATE_DATABASE]
            });
            files.push(chargedAbilityFile);
        }
        // Generate UnitAbilityModifiers for each bound modifier
        if (this.boundModifiers.length > 0) {
            const unitAbilityModifierNodes = [];
            for (const modifier of this.boundModifiers) {
                const unitAbilityModifierNode = new nodes_1.UnitAbilityModifierNode({
                    unitAbilityType: this.abilityType,
                    modifierId: modifier.modifier.id
                });
                unitAbilityModifierNodes.push(unitAbilityModifierNode);
            }
            const unitAbilityModifiersDatabase = new nodes_1.DatabaseNode({
                unitAbilityModifiers: unitAbilityModifierNodes
            });
            const unitAbilityModifiersFile = new files_1.XmlFile({
                path: `/abilities/${this.abilityType.toLowerCase()}-modifiers.xml`,
                name: `${this.abilityType.toLowerCase()}-modifiers.xml`,
                content: unitAbilityModifiersDatabase.toXmlElement(),
                actionGroups: [this.actionGroupBundle.current],
                actionGroupActions: [constants_1.ACTION_GROUP_ACTION.UPDATE_DATABASE]
            });
            files.push(unitAbilityModifiersFile);
        }
        // Create unit bindings for each bound unit
        for (const unitType of this.boundUnits) {
            const unitBindingNode = new nodes_1.Unit_AbilityNode({
                unitType: unitType,
                unitAbilityType: this.abilityType
            });
            const unitBindingDatabase = new nodes_1.DatabaseNode({
                unit_Abilities: [unitBindingNode]
            });
            const unitBindingFile = new files_1.XmlFile({
                path: `/units/${unitType.toLowerCase()}-abilities.xml`,
                name: `${unitType.toLowerCase()}-abilities.xml`,
                content: unitBindingDatabase.toXmlElement(),
                actionGroups: [this.actionGroupBundle.current],
                actionGroupActions: [constants_1.ACTION_GROUP_ACTION.UPDATE_DATABASE]
            });
            files.push(unitBindingFile);
        }
        // Create the localization file
        const localizationFile = this.createLocalizationFile();
        files.push(localizationFile);
        return files;
    }
    // Create the localization file for this ability
    createLocalizationFile() {
        const elements = [
            {
                Tag: this.getNameLocTag(),
                Language: "en_US",
                Text: this.abilityName
            },
            {
                Tag: this.getDescriptionLocTag(),
                Language: "en_US",
                Text: this.abilityDescription
            }
        ];
        return new files_1.XmlFile({
            path: `/text/en_US/${this.abilityType.toLowerCase()}_text.xml`,
            name: `${this.abilityType.toLowerCase()}_text.xml`,
            content: {
                GameData: {
                    LocalizedText: elements.map(element => ({ Row: element }))
                }
            },
            actionGroups: [this.actionGroupBundle.current],
            actionGroupActions: [constants_1.ACTION_GROUP_ACTION.UPDATE_TEXT]
        });
    }
}
exports.AbilityBuilder = AbilityBuilder;
//# sourceMappingURL=AbilityBuilder.js.map