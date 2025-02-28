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
    progressionTreeType: `TREE_${string}` = 'TREE_'
    ageType: TObjectValues<typeof AGE> = AGE.ANTIQUITY;
    systemType: TObjectValues<typeof SYSTEM> = SYSTEM.CULTURE;
    name: string = '';

    constructor(payload: Partial<TProgressionTreeNode> = {}) {
        super();
        this.fill(payload);
    }
}
