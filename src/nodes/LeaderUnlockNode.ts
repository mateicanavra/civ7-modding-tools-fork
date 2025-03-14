import { BaseNode } from "./BaseNode";
import { AGE, KIND } from "../constants";
import { TObjectValues } from "../types";

export type TLeaderUnlockNode = Pick<LeaderUnlockNode,
    "leaderDomain" |
    "leaderType" |
    "ageDomain" |
    "ageType" |
    "type" |
    "kind" |
    "name" |
    "description" |
    "icon"
>;

export class LeaderUnlockNode extends BaseNode<TLeaderUnlockNode> {
    leaderDomain: string | null = 'StandardLeaders';
    leaderType: string | null = null;
    ageDomain: string | null = 'StandardAges';
    ageType: TObjectValues<typeof AGE> = AGE.ANTIQUITY;
    type: string | null = null;
    kind: string | null = KIND.CIVILIZATION;
    name: string | null = null;
    description: string | null = null;
    icon: string | null = null;

    constructor(payload: Partial<TLeaderUnlockNode> = {}) {
        super();
        this.fill(payload);
    }
}
