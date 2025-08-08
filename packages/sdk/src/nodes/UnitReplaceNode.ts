import { BaseNode } from "./BaseNode";

export type TUnitReplaceNode = Pick<UnitReplaceNode,
    "civUniqueUnitType" |
    "replacesUnitType"
>;

export class UnitReplaceNode extends BaseNode<TUnitReplaceNode> {
    civUniqueUnitType: string | null = 'UNIT_TYPE';
    replacesUnitType: string | null = 'UNIT_TYPE';

    constructor(payload: Partial<TUnitReplaceNode> = {}) {
        super();
        this.fill(payload);
    }
}
