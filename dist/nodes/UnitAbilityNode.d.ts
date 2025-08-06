import { BaseNode } from './BaseNode';
export type TUnitAbilityNode = {
    unitAbilityType: string;
    name: string;
    description: string;
};
export declare class UnitAbilityNode extends BaseNode<TUnitAbilityNode> {
    unitAbilityType: string;
    name: string;
    description: string;
    constructor(options?: Partial<TUnitAbilityNode>);
    toXmlElement(): import("jstoxml").XmlElement | import("jstoxml").XmlElement[] | null;
}
