import { TObjectValues } from "../types";
import { FEATURE_CLASS } from "../constants";

import { BaseNode } from "./BaseNode";

export type TStartBiasFeatureClassNode = Pick<StartBiasFeatureClassNode,
    "civilizationType" |
    "leaderType" |
    "featureClassType" |
    "score"
>;

export class StartBiasFeatureClassNode extends BaseNode<TStartBiasFeatureClassNode> {
    civilizationType: string | null = null;
    leaderType: `LEADER_${string}` | null = null;
    featureClassType: TObjectValues<typeof FEATURE_CLASS> | null = FEATURE_CLASS.VEGETATED;
    score: number | null = 5;

    constructor(payload: Partial<TStartBiasFeatureClassNode> = {}) {
        super();
        this.fill(payload);
    }
}
