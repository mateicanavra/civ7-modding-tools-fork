import { TObjectValues } from "../types";
import { YIELD } from "../constants";

import { BaseNode } from "./BaseNode";

export type TUnitCostNode = Pick<UnitCostNode,
    "unitType" |
    "yieldType" |
    "cost"
>;

export class UnitCostNode extends BaseNode<TUnitCostNode> {
    unitType: string = 'UNIT_TYPE';
    yieldType: TObjectValues<typeof YIELD> = YIELD.PRODUCTION;
    cost: number = 1;

    constructor(payload: Partial<TUnitCostNode> = {}) {
        super();
        this.fill(payload);
    }
}