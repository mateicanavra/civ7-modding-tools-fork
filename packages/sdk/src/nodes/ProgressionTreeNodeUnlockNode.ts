import { TObjectValues } from "../types";
import { KIND } from "../constants";

import { BaseNode } from "./BaseNode";

export type TProgressionTreeNodeUnlockNode = Pick<ProgressionTreeNodeUnlockNode,
    "progressionTreeNodeType" |
    "targetKind" |
    "targetType" |
    "unlockDepth" |
    "aIIgnoreUnlockValue" |
    "hidden"
>;

export class ProgressionTreeNodeUnlockNode extends BaseNode<TProgressionTreeNodeUnlockNode> {
    progressionTreeNodeType: `NODE_${string}` | null = 'NODE_'
    targetKind: TObjectValues<typeof KIND> = KIND.MODIFIER;
    targetType: string | null = 'MOD_'
    unlockDepth: number | null = 1;
    hidden: boolean | null = null;
    aIIgnoreUnlockValue: boolean | null = null;

    constructor(payload: Partial<TProgressionTreeNodeUnlockNode> = {}) {
        super();
        this.fill(payload);
    }
}
