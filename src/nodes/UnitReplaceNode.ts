import { BaseNode } from "./BaseNode";

export type TUnitReplaceNode = Pick<UnitReplaceNode,
    "civUniqueUnitType" |
    "replacesUnitType"
>;

export class UnitReplaceNode extends BaseNode<TUnitReplaceNode> {
    civUniqueUnitType: string = 'UNIT_TYPE';
    replacesUnitType: string = 'UNIT_TYPE';

    constructor(payload: Partial<TUnitReplaceNode> = {}) {
        super();
        this.fill(payload);
    }
}