import { BaseNode } from "./BaseNode";
export type TStartBiasAdjacentToCoastNode = Pick<StartBiasAdjacentToCoastNode, "civilizationType" | "leaderType" | "score">;
export declare class StartBiasAdjacentToCoastNode extends BaseNode<TStartBiasAdjacentToCoastNode> {
    civilizationType: string | null;
    leaderType: `LEADER_${string}` | null;
    score: number | null;
    constructor(payload?: Partial<TStartBiasAdjacentToCoastNode>);
}
