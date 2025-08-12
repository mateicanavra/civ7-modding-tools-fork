import { BaseNode } from "./BaseNode";

export type TUnitStatNode = Pick<UnitStatNode,
    "unitType" |
    "bombard" |
    "combat" |
    "range" |
    "rangedCombat"
>;

export class UnitStatNode extends BaseNode<TUnitStatNode> {
    unitType: string | null = 'UNIT_TYPE';
    bombard: number | null = null;
    combat: number | null = null;
    range: number | null = null;
    rangedCombat: number | null = null;

    constructor(payload: Partial<TUnitStatNode> = {}) {
        super();
        this.fill(payload);
    }
}
