import { BaseNode } from "./BaseNode";

export type TProgressionTreePrereqNode = Pick<ProgressionTreePrereqNode,
    "node" |
    "prereqNode"
>;

export class ProgressionTreePrereqNode extends BaseNode<TProgressionTreePrereqNode> {
    node: `NODE_${string}` | null = 'NODE_';
    prereqNode: `NODE_${string}` | null = 'NODE_';

    constructor(payload: Partial<TProgressionTreePrereqNode> = {}) {
        super();
        this.fill(payload);
    }
}
