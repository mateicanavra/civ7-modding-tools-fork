import { BaseNode } from './BaseNode';

export type TUnitAbilityModifierNode = {
    unitAbilityType: string;
    modifierId: string;
}

export class UnitAbilityModifierNode extends BaseNode<TUnitAbilityModifierNode> {
    unitAbilityType: string;
    modifierId: string;

    constructor(options: Partial<TUnitAbilityModifierNode> = {}) {
        super(options);
        this.unitAbilityType = options.unitAbilityType || '';
        this.modifierId = options.modifierId || '';
    }
} 