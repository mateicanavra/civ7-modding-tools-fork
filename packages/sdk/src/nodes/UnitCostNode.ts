import { TObjectValues } from "../types";
import { YIELD } from "../constants";

import { BaseNode } from "./BaseNode";

export type TUnitCostNode = Pick<UnitCostNode,
    "unitType" |
    "yieldType" |
    "cost"
>;

export class UnitCostNode extends BaseNode<TUnitCostNode> {
    unitType: string | null = 'UNIT_TYPE';
    yieldType: TObjectValues<typeof YIELD> | null = YIELD.PRODUCTION;
    cost: number | null = 1;

    constructor(payload: Partial<TUnitCostNode> = {}) {
        super();
        this.fill(payload);
    }
}
