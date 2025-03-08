import { TObjectValues } from "../types";
import { YIELD } from "../constants";
import { BaseNode } from "./BaseNode";
export type TUnitCostNode = Pick<UnitCostNode, "unitType" | "yieldType" | "cost">;
export declare class UnitCostNode extends BaseNode<TUnitCostNode> {
    unitType: string | null;
    yieldType: TObjectValues<typeof YIELD> | null;
    cost: number | null;
    constructor(payload?: Partial<TUnitCostNode>);
}
