import { TObjectValues } from "../types";
import { FEATURE_CLASS } from "../constants";
import { BaseNode } from "./BaseNode";
export type TStartBiasFeatureClassNode = Pick<StartBiasFeatureClassNode, "civilizationType" | "leaderType" | "featureClassType" | "score">;
export declare class StartBiasFeatureClassNode extends BaseNode<TStartBiasFeatureClassNode> {
    civilizationType: string | null;
    leaderType: `LEADER_${string}` | null;
    featureClassType: TObjectValues<typeof FEATURE_CLASS> | null;
    score: number | null;
    constructor(payload?: Partial<TStartBiasFeatureClassNode>);
}
