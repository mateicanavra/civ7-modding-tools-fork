import { TObjectValues } from "../types";
import { RESOURCE } from "../constants";
import { BaseNode } from "./BaseNode";
export type TStartBiasResourceNode = Pick<StartBiasResourceNode, "civilizationType" | "resourceType" | "leaderType" | "score">;
export declare class StartBiasResourceNode extends BaseNode<TStartBiasResourceNode> {
    civilizationType: `CIVILIZATION_${string}` | null;
    leaderType: `LEADER_${string}` | null;
    resourceType: TObjectValues<typeof RESOURCE> | null;
    score: number | null;
    constructor(payload?: Partial<TStartBiasResourceNode>);
}
