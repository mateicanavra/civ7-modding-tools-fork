import { TObjectValues } from "../types";
import { AGE, SYSTEM } from "../constants";

import { BaseNode } from "./BaseNode";

export type TProgressionTreeNode = Pick<ProgressionTreeNode,
    "progressionTreeType" |
    "ageType" |
    "systemType" |
    "name"
>;

export class ProgressionTreeNode extends BaseNode<TProgressionTreeNode> {
    progressionTreeType: `TREE_${string}` | null = 'TREE_'
    ageType: TObjectValues<typeof AGE> | null = AGE.ANTIQUITY;
    systemType: TObjectValues<typeof SYSTEM> | null = SYSTEM.CULTURE;
    name: string | null = null;

    constructor(payload: Partial<TProgressionTreeNode> = {}) {
        super();
        this.fill(payload);
    }
}
