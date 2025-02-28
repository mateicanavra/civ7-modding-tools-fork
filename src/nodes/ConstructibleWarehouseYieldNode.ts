import { BaseNode } from "./BaseNode";

export type TConstructibleWarehouseYieldNode = Pick<ConstructibleWarehouseYieldNode,
    "constructibleType" |
    "requiresActivation" |
    "yieldChangeId"
>;

export class ConstructibleWarehouseYieldNode extends BaseNode<TConstructibleWarehouseYieldNode> {
    constructibleType = 'BUILDING_';
    requiresActivation: boolean | null = null;
    yieldChangeId = '';

    constructor(payload: Partial<TConstructibleWarehouseYieldNode> = {}) {
        super();
        this.fill(payload);
    }
}
