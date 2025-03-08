import { BaseNode } from "./BaseNode";
export type TConstructibleWarehouseYieldNode = Pick<ConstructibleWarehouseYieldNode, "constructibleType" | "requiresActivation" | "yieldChangeId">;
export declare class ConstructibleWarehouseYieldNode extends BaseNode<TConstructibleWarehouseYieldNode> {
    constructibleType: string | null;
    requiresActivation: boolean | null;
    yieldChangeId: string | null;
    constructor(payload?: Partial<TConstructibleWarehouseYieldNode>);
}
