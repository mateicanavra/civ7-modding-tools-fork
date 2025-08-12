import { BaseNode } from "./BaseNode";

export type TLeaderCivilizationBiasNode = Pick<LeaderCivilizationBiasNode,
    "civilizationDomain" |
    "civilizationType" |
    "leaderDomain" |
    "leaderType" |
    "bias" |
    "reasonType" |
    "choiceType"
>;

export class LeaderCivilizationBiasNode extends BaseNode<TLeaderCivilizationBiasNode> {
    civilizationDomain: string | null = null;
    civilizationType: string | null = null;
    leaderDomain: string | null = 'StandardLeaders';
    leaderType: string | null = null;
    bias: number | null = 4;
    reasonType: string | null = null;
    choiceType: 'LOC_CREATE_GAME_HISTORICAL_CHOICE' | 'LOC_CREATE_GAME_STRATEGIC_CHOICE' | string | null = 'LOC_CREATE_GAME_HISTORICAL_CHOICE';

    constructor(payload: Partial<TLeaderCivilizationBiasNode> = {}) {
        super();
        this.fill(payload);
    }
}
