import { BaseNode } from "./BaseNode";
export type TLeaderCivilizationBiasNode = Pick<LeaderCivilizationBiasNode, "civilizationDomain" | "civilizationType" | "leaderDomain" | "leaderType" | "bias" | "reasonType" | "choiceType">;
export declare class LeaderCivilizationBiasNode extends BaseNode<TLeaderCivilizationBiasNode> {
    civilizationDomain: string | null;
    civilizationType: string | null;
    leaderDomain: string | null;
    leaderType: string | null;
    bias: number | null;
    reasonType: string | null;
    choiceType: 'LOC_CREATE_GAME_HISTORICAL_CHOICE' | 'LOC_CREATE_GAME_STRATEGIC_CHOICE' | string | null;
    constructor(payload?: Partial<TLeaderCivilizationBiasNode>);
}
