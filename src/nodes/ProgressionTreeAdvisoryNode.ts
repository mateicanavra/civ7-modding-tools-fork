import { TObjectValues } from "../types";
import { ADVISORY } from "../constants";

import { BaseNode } from "./BaseNode";

export type TProgressionTreeAdvisoryNode = Pick<ProgressionTreeAdvisoryNode,
    "progressionTreeNodeType" |
    "advisoryClassType"
>;

export class ProgressionTreeAdvisoryNode extends BaseNode<TProgressionTreeAdvisoryNode> {
    progressionTreeNodeType: `NODE_${string}` | null = 'NODE_'
    advisoryClassType: TObjectValues<typeof ADVISORY> | null = ADVISORY.CLASS_FOOD;

    constructor(payload: Partial<TProgressionTreeAdvisoryNode> = {}) {
        super();
        this.fill(payload);
    }
}
