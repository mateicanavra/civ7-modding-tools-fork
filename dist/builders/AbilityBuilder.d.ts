import { ActionGroupBundle } from "../core";
import { BaseBuilder } from "./BaseBuilder";
import { BaseFile } from "../files";
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
};
export declare class AbilityBuilder extends BaseBuilder<TAbilityBuilderOptions> {
    actionGroupBundle: ActionGroupBundle;
    abilityType: string;
    abilityName: string;
    abilityDescription: string;
    hasChargedAbility: boolean;
    chargedAbilityType: string;
    rechargeTurns: number;
    boundUnits: string[];
    boundUnitBuilders: UnitBuilder[];
    boundModifiers: ModifierBuilder[];
    constructor(payload?: Partial<TAbilityBuilderOptions>);
    bind(entities: BaseBuilder[]): AbilityBuilder;
    private bindToUnitBuilder;
    bindToUnit(unitType: string): AbilityBuilder;
    bindModifiers(modifiers: ModifierBuilder[]): AbilityBuilder;
    private getNameLocTag;
    private getDescriptionLocTag;
    build(): BaseFile[];
    private createLocalizationFile;
}
