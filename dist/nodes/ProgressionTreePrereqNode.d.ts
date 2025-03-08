import { BaseNode } from "./BaseNode";
export type TProgressionTreePrereqNode = Pick<ProgressionTreePrereqNode, "node" | "prereqNode">;
export declare class ProgressionTreePrereqNode extends BaseNode<TProgressionTreePrereqNode> {
    node: `NODE_${string}` | null;
    prereqNode: `NODE_${string}` | null;
    constructor(payload?: Partial<TProgressionTreePrereqNode>);
}
