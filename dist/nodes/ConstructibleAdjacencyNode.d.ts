import { BaseNode } from "./BaseNode";
export type TConstructibleAdjacencyNode = Pick<ConstructibleAdjacencyNode, "constructibleType" | "requiresActivation" | "yieldChangeId">;
export declare class ConstructibleAdjacencyNode extends BaseNode<TConstructibleAdjacencyNode> {
    constructibleType: string;
    requiresActivation: boolean | null;
    yieldChangeId: string | null;
    constructor(payload?: Partial<TConstructibleAdjacencyNode>);
}
