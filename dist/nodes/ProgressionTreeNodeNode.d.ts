import { BaseNode } from "./BaseNode";
export type TProgressionTreeNodeNode = Pick<ProgressionTreeNodeNode, "progressionTreeNodeType" | "progressionTree" | "cost" | "iconString" | "name">;
export declare class ProgressionTreeNodeNode extends BaseNode<TProgressionTreeNodeNode> {
    progressionTreeNodeType: `NODE_${string}` | null;
    progressionTree: `TREE_${string}` | null;
    cost: number | null;
    name: string | null;
    iconString: string | null;
    constructor(payload?: Partial<TProgressionTreeNodeNode>);
}
