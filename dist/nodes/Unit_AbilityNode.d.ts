import { BaseNode } from './BaseNode';
export type TUnit_AbilityNode = {
    unitType: string;
    unitAbilityType: string;
};
export declare class Unit_AbilityNode extends BaseNode<TUnit_AbilityNode> {
    unitType: string;
    unitAbilityType: string;
    constructor(options?: Partial<TUnit_AbilityNode>);
}
