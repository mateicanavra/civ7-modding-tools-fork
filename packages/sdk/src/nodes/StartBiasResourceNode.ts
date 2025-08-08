import { TObjectValues } from "../types";
import { RESOURCE } from "../constants";

import { BaseNode } from "./BaseNode";

export type TStartBiasResourceNode = Pick<StartBiasResourceNode,
    "civilizationType" |
    "resourceType" |
    "leaderType" |
    "score"
>;

export class StartBiasResourceNode extends BaseNode<TStartBiasResourceNode> {
    civilizationType: string | null = null;
    leaderType: `LEADER_${string}` | null = null;
    resourceType: TObjectValues<typeof RESOURCE> | null = RESOURCE.HORSES;
    score: number | null = 5;

    constructor(payload: Partial<TStartBiasResourceNode> = {}) {
        super();
        this.fill(payload);
    }
}
