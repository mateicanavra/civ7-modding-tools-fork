import { ActionGroupBundle } from "../core";
import { BaseBuilder } from "./BaseBuilder";
import { BaseFile, XmlFile } from "../files";
import { ChargedUnitAbilityNode, DatabaseNode, TypeNode, UnitAbilityNode, Unit_AbilityNode, UnitAbilityModifierNode } from "../nodes";
import { TClassProperties } from "../types";
import { ACTION_GROUP_ACTION, KIND } from "../constants";
import { locale } from "../utils";
import { UnitBuilder } from "./UnitBuilder";
import { ModifierBuilder } from "./ModifierBuilder";

export type TAbilityBuilderOptions = {
    actionGroupBundle: ActionGroupBundle;
    ability: {
        abilityType: string;
        name?: string;
        description?: string;
    };
    chargedAbility?: {
        enabled: boolean;
        rechargeTurns?: number;
    };
}

export class AbilityBuilder extends BaseBuilder<TAbilityBuilderOptions> {
    actionGroupBundle: ActionGroupBundle = new ActionGroupBundle();
    abilityType: string = '';
    abilityName: string = '';
    abilityDescription: string = '';
    
    hasChargedAbility: boolean = false;
    chargedAbilityType: string = '';
    rechargeTurns: number = 5;
    
    boundUnits: string[] = [];
    boundUnitBuilders: UnitBuilder[] = [];
    boundModifiers: ModifierBuilder[] = [];
    
    constructor(payload: Partial<TAbilityBuilderOptions> = {}) {
        super();
        this.fill(payload);
        
        // Set default values
        if (payload.ability) {
            this.abilityType = payload.ability.abilityType;
            this.abilityName = payload.ability.name || this.abilityType;
            this.abilityDescription = payload.ability.description || '';
            
            // Setup charged ability if enabled
            if (payload.chargedAbility?.enabled) {
                this.hasChargedAbility = true;
                this.chargedAbilityType = `CHARGED_${this.abilityType}`;
                this.rechargeTurns = payload.chargedAbility.rechargeTurns || 5;
            }
        }
    }
    
    // Standard bind method that follows toolkit pattern
    bind(entities: BaseBuilder[]): AbilityBuilder {
        entities.forEach(entity => {
            if (entity instanceof UnitBuilder) {
                this.bindToUnitBuilder(entity);
            }
        });
        return this;
    }
    
    // Bind this ability to a unit builder
    private bindToUnitBuilder(unitBuilder: UnitBuilder): AbilityBuilder {
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
    bindToUnit(unitType: string): AbilityBuilder {
        if (!this.boundUnits.includes(unitType)) {
            this.boundUnits.push(unitType);
        }
        return this;
    }
    
    // Add a method to bind modifiers to this ability
    bindModifiers(modifiers: ModifierBuilder[]): AbilityBuilder {
        modifiers.forEach(modifier => {
            if (!this.boundModifiers.includes(modifier)) {
                this.boundModifiers.push(modifier);
            }
        });
        return this;
    }
    
    // Helper method to create the localization tag for the ability
    private getNameLocTag(): string {
        return `LOC_${this.abilityType}_NAME`;
    }
    
    // Helper method to create the localization tag for the ability description
    private getDescriptionLocTag(): string {
        return `LOC_${this.abilityType}_DESCRIPTION`;
    }
    
    // Generate all files for this ability
    build(): BaseFile[] {
        const files: BaseFile[] = [];
        
        // Create type nodes for ability types
        const abilityTypeNode = new TypeNode({
            type: this.abilityType,
            kind: KIND.ABILITY
        });
        
        const typeNodes = [abilityTypeNode];
        
        // Add charged ability type if needed
        if (this.hasChargedAbility) {
            const chargedTypeNode = new TypeNode({
                type: this.chargedAbilityType,
                kind: KIND.ABILITY
            });
            typeNodes.push(chargedTypeNode);
        }
        
        // Create the ability types file
        const typesDatabase = new DatabaseNode({
            types: typeNodes
        });
        
        const typesFile = new XmlFile({
            path: `/abilities/${this.abilityType.toLowerCase()}-types.xml`,
            name: `${this.abilityType.toLowerCase()}-types.xml`,
            content: typesDatabase.toXmlElement(),
            actionGroups: [this.actionGroupBundle.current],
            actionGroupActions: [ACTION_GROUP_ACTION.UPDATE_DATABASE]
        });
        
        files.push(typesFile);
        
        // Create the unit ability definition
        const unitAbilityNode = new UnitAbilityNode({
            unitAbilityType: this.abilityType,
            name: this.getNameLocTag(),
            description: this.getDescriptionLocTag()
        });
        
        const unitAbilityDatabase = new DatabaseNode({
            unitAbilities: [unitAbilityNode]
        });
        
        const unitAbilityFile = new XmlFile({
            path: `/abilities/${this.abilityType.toLowerCase()}.xml`,
            name: `${this.abilityType.toLowerCase()}.xml`,
            content: unitAbilityDatabase.toXmlElement(),
            actionGroups: [this.actionGroupBundle.current],
            actionGroupActions: [ACTION_GROUP_ACTION.UPDATE_DATABASE]
        });
        
        files.push(unitAbilityFile);
        
        // Create charged ability file if needed
        if (this.hasChargedAbility) {
            const chargedAbilityNode = new ChargedUnitAbilityNode({
                unitAbilityType: this.chargedAbilityType,
                rechargeTurns: this.rechargeTurns
            });
            
            const chargedAbilityDatabase = new DatabaseNode({
                chargedUnitAbilities: [chargedAbilityNode]
            });
            
            const chargedAbilityFile = new XmlFile({
                path: `/abilities/${this.chargedAbilityType.toLowerCase()}.xml`,
                name: `${this.chargedAbilityType.toLowerCase()}.xml`,
                content: chargedAbilityDatabase.toXmlElement(),
                actionGroups: [this.actionGroupBundle.current],
                actionGroupActions: [ACTION_GROUP_ACTION.UPDATE_DATABASE]
            });
            
            files.push(chargedAbilityFile);
        }
        
        // Generate UnitAbilityModifiers for each bound modifier
        if (this.boundModifiers.length > 0) {
            const unitAbilityModifierNodes: UnitAbilityModifierNode[] = [];
            
            for (const modifier of this.boundModifiers) {
                const unitAbilityModifierNode = new UnitAbilityModifierNode({
                    unitAbilityType: this.abilityType,
                    modifierId: modifier.modifier.id
                });
                
                unitAbilityModifierNodes.push(unitAbilityModifierNode);
            }
            
            const unitAbilityModifiersDatabase = new DatabaseNode({
                unitAbilityModifiers: unitAbilityModifierNodes
            });
            
            const unitAbilityModifiersFile = new XmlFile({
                path: `/abilities/${this.abilityType.toLowerCase()}-modifiers.xml`,
                name: `${this.abilityType.toLowerCase()}-modifiers.xml`,
                content: unitAbilityModifiersDatabase.toXmlElement(),
                actionGroups: [this.actionGroupBundle.current],
                actionGroupActions: [ACTION_GROUP_ACTION.UPDATE_DATABASE]
            });
            
            files.push(unitAbilityModifiersFile);
        }
        
        // Create unit bindings for each bound unit
        for (const unitType of this.boundUnits) {
            const unitBindingNode = new Unit_AbilityNode({
                unitType: unitType,
                unitAbilityType: this.abilityType
            });
            
            const unitBindingDatabase = new DatabaseNode({
                unit_Abilities: [unitBindingNode]
            });
            
            const unitBindingFile = new XmlFile({
                path: `/units/${unitType.toLowerCase()}-abilities.xml`,
                name: `${unitType.toLowerCase()}-abilities.xml`,
                content: unitBindingDatabase.toXmlElement(),
                actionGroups: [this.actionGroupBundle.current],
                actionGroupActions: [ACTION_GROUP_ACTION.UPDATE_DATABASE]
            });
            
            files.push(unitBindingFile);
        }
        
        // Create the localization file
        const localizationFile = this.createLocalizationFile();
        files.push(localizationFile);
        
        return files;
    }
    
    // Create the localization file for this ability
    private createLocalizationFile(): XmlFile {
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
        
        return new XmlFile({
            path: `/text/en_US/${this.abilityType.toLowerCase()}_text.xml`,
            name: `${this.abilityType.toLowerCase()}_text.xml`,
            content: {
                GameData: {
                    LocalizedText: elements.map(element => ({ Row: element }))
                }
            },
            actionGroups: [this.actionGroupBundle.current],
            actionGroupActions: [ACTION_GROUP_ACTION.UPDATE_TEXT]
        });
    }
} 