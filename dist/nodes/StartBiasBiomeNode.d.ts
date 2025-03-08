import { TObjectValues } from "../types";
import { BIOME } from "../constants";
import { BaseNode } from "./BaseNode";
export type TStartBiasBiomeNode = Pick<StartBiasBiomeNode, "civilizationType" | "leaderType" | "biomeType" | "score">;
export declare class StartBiasBiomeNode extends BaseNode<TStartBiasBiomeNode> {
    civilizationType: `CIVILIZATION_${string}` | null;
    leaderType: `LEADER_${string}` | null;
    biomeType: TObjectValues<typeof BIOME> | null;
    score: number | null;
    constructor(payload?: Partial<TStartBiasBiomeNode>);
}
