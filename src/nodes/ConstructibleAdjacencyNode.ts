import { BaseNode } from "./BaseNode";

export type TConstructibleAdjacencyNode = Pick<ConstructibleAdjacencyNode,
    "constructibleType" |
    "requiresActivation" |
    "yieldChangeId"
>;

export class ConstructibleAdjacencyNode extends BaseNode<TConstructibleAdjacencyNode> {
    constructibleType = 'BUILDING_';
    requiresActivation: boolean | null = null;
    yieldChangeId = '';

    constructor(payload: Partial<TConstructibleAdjacencyNode> = {}) {
        super();
        this.fill(payload);
    }
}
