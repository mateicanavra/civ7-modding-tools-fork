import { TObjectValues } from "../types";
import { TERRAIN } from "../constants";

import { BaseNode } from "./BaseNode";

export type TStartBiasTerrainNode = Pick<StartBiasTerrainNode,
    "civilizationType" |
    "leaderType" |
    "terrainType" |
    "score"
>;

export class StartBiasTerrainNode extends BaseNode<TStartBiasTerrainNode> {
    civilizationType: `CIVILIZATION_${string}` | null = null;
    leaderType: `LEADER_${string}` | null = null;
    terrainType: TObjectValues<typeof TERRAIN> | null = TERRAIN.FLAT;
    score: number | null = 5;

    constructor(payload: Partial<TStartBiasTerrainNode> = {}) {
        super();
        this.fill(payload);
    }
}
