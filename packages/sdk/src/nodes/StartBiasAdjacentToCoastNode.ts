import { BaseNode } from "./BaseNode";

export type TStartBiasAdjacentToCoastNode = Pick<StartBiasAdjacentToCoastNode,
    "civilizationType" |
    "leaderType" |
    "score"
>;

export class StartBiasAdjacentToCoastNode extends BaseNode<TStartBiasAdjacentToCoastNode> {
    civilizationType: string | null = null;
    leaderType: `LEADER_${string}` | null = null;
    score: number | null = 5;

    constructor(payload: Partial<TStartBiasAdjacentToCoastNode> = {}) {
        super();
        this.fill(payload);
    }
}
