import { BaseNode } from "./BaseNode";
export type TStartBiasRiverNode = Pick<StartBiasRiverNode, "civilizationType" | "leaderType" | "score">;
export declare class StartBiasRiverNode extends BaseNode<TStartBiasRiverNode> {
    civilizationType: string | null;
    leaderType: `LEADER_${string}` | null;
    score: number | null;
    constructor(payload?: Partial<TStartBiasRiverNode>);
}
