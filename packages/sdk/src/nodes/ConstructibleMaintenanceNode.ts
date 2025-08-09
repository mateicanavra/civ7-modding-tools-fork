import { BaseNode } from "./BaseNode";
import { TObjectValues } from "../types";
import { YIELD } from "../constants";

export type TConstructibleMaintenanceNode = Pick<ConstructibleMaintenanceNode,
    "constructibleType" |
    "yieldType" |
    "amount"
>;

export class ConstructibleMaintenanceNode extends BaseNode<TConstructibleMaintenanceNode> {
    constructibleType = 'BUILDING_';
    yieldType: TObjectValues<typeof YIELD> = YIELD.GOLD;
    amount = 1;

    constructor(payload: Partial<TConstructibleMaintenanceNode> = {}) {
        super();
        this.fill(payload);
    }
}
