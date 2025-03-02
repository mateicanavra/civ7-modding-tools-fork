import { TObjectValues } from "../types";
import { BIOME } from "../constants";

import { BaseNode } from "./BaseNode";

export type TStartBiasBiomeNode = Pick<StartBiasBiomeNode,
    "civilizationType" |
    "leaderType" |
    "biomeType" |
    "score"
>;

export class StartBiasBiomeNode extends BaseNode<TStartBiasBiomeNode> {
    civilizationType: `CIVILIZATION_${string}` | null = null;
    leaderType: `LEADER_${string}` | null = null;
    biomeType: TObjectValues<typeof BIOME> = BIOME.GRASSLAND;
    score: number = 5;

    constructor(payload: Partial<TStartBiasBiomeNode> = {}) {
        super();
        this.fill(payload);
    }
}
