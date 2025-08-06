import { BaseNode } from './BaseNode';
export type TUnitAbilityModifierNode = {
    unitAbilityType: string;
    modifierId: string;
};
export declare class UnitAbilityModifierNode extends BaseNode<TUnitAbilityModifierNode> {
    unitAbilityType: string;
    modifierId: string;
    constructor(options?: Partial<TUnitAbilityModifierNode>);
}
