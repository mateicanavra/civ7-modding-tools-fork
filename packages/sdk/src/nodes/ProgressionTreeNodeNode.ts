import { BaseNode } from "./BaseNode";

export type TProgressionTreeNodeNode = Pick<ProgressionTreeNodeNode,
    "progressionTreeNodeType" |
    "progressionTree" |
    "cost" |
    "iconString" |
    "name"
>;

export class ProgressionTreeNodeNode extends BaseNode<TProgressionTreeNodeNode> {
    progressionTreeNodeType: `NODE_${string}` | null = 'NODE_'
    progressionTree: `TREE_${string}` | null = 'TREE_'
    cost: number | null = 150;
    name: string | null = 'LOC_CIVIC__NAME';
    iconString: string | null = 'cult_aksum';

    constructor(payload: Partial<TProgressionTreeNodeNode> = {}) {
        super();
        this.fill(payload);
    }
}
