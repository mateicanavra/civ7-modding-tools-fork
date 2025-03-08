import { BaseNode } from "./BaseNode";
import { TObjectValues } from "../types";
import { YIELD } from "../constants";
export type TConstructibleMaintenanceNode = Pick<ConstructibleMaintenanceNode, "constructibleType" | "yieldType" | "amount">;
export declare class ConstructibleMaintenanceNode extends BaseNode<TConstructibleMaintenanceNode> {
    constructibleType: string;
    yieldType: TObjectValues<typeof YIELD>;
    amount: number;
    constructor(payload?: Partial<TConstructibleMaintenanceNode>);
}
