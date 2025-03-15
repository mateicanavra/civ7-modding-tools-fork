import { TObjectValues } from "../types";
import { TERRAIN } from "../constants";
import { BaseNode } from "./BaseNode";
export type TStartBiasTerrainNode = Pick<StartBiasTerrainNode, "civilizationType" | "leaderType" | "terrainType" | "score">;
export declare class StartBiasTerrainNode extends BaseNode<TStartBiasTerrainNode> {
    civilizationType: string | null;
    leaderType: `LEADER_${string}` | null;
    terrainType: TObjectValues<typeof TERRAIN> | null;
    score: number | null;
    constructor(payload?: Partial<TStartBiasTerrainNode>);
}
