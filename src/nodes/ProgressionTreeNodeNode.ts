import { BaseNode } from "./BaseNode";

export type TProgressionTreeNodeNode = Pick<ProgressionTreeNodeNode,
    "progressionTreeNodeType" |
    "progressionTree" |
    "cost" |
    "iconString" |
    "name"
>;

export class ProgressionTreeNodeNode extends BaseNode<TProgressionTreeNodeNode> {
    progressionTreeNodeType: `NODE_${string}` = 'NODE_'
    progressionTree: `TREE_${string}` = 'TREE_'
    cost = 150;
    name: string = 'LOC_CIVIC_PERIPLUS_OF_THE_ERYTHRAEAN_SEA_NAME';
    iconString: string = 'cult_aksum';

    constructor(payload: Partial<TProgressionTreeNodeNode> = {}) {
        super();
        this.fill(payload);
    }
}
