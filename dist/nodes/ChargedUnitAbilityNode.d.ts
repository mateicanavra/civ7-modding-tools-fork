import { BaseNode } from './BaseNode';
export type TChargedUnitAbilityNode = {
    unitAbilityType: string;
    rechargeTurns: number;
};
export declare class ChargedUnitAbilityNode extends BaseNode<TChargedUnitAbilityNode> {
    unitAbilityType: string;
    rechargeTurns: number;
    constructor(options?: Partial<TChargedUnitAbilityNode>);
    toXmlElement(): import("jstoxml").XmlElement | import("jstoxml").XmlElement[] | null;
}
