import { TObjectValues } from "../types";
import { KIND } from "../constants";
import { BaseNode } from "./BaseNode";
export type TProgressionTreeNodeUnlockNode = Pick<ProgressionTreeNodeUnlockNode, "progressionTreeNodeType" | "targetKind" | "targetType" | "unlockDepth" | "aIIgnoreUnlockValue" | "hidden">;
export declare class ProgressionTreeNodeUnlockNode extends BaseNode<TProgressionTreeNodeUnlockNode> {
    progressionTreeNodeType: `NODE_${string}` | null;
    targetKind: TObjectValues<typeof KIND>;
    targetType: string | null;
    unlockDepth: number | null;
    hidden: boolean | null;
    aIIgnoreUnlockValue: boolean | null;
    constructor(payload?: Partial<TProgressionTreeNodeUnlockNode>);
}
