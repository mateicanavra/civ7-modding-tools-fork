import { BaseNode } from "./BaseNode";
import { AGE } from "../constants";
import { TObjectValues } from "../types";
export type TLeaderUnlockNode = Pick<LeaderUnlockNode, "leaderDomain" | "leaderType" | "ageDomain" | "ageType" | "type" | "kind" | "name" | "description" | "icon">;
export declare class LeaderUnlockNode extends BaseNode<TLeaderUnlockNode> {
    leaderDomain: string | null;
    leaderType: string | null;
    ageDomain: string | null;
    ageType: TObjectValues<typeof AGE>;
    type: string | null;
    kind: string | null;
    name: string | null;
    description: string | null;
    icon: string | null;
    constructor(payload?: Partial<TLeaderUnlockNode>);
}
