import { BaseNode } from "./BaseNode";
export type TUnlockRequirementNode = Pick<UnlockRequirementNode, "unlockType" | "requirementSetId" | "description" | "tooltip">;
export declare class UnlockRequirementNode extends BaseNode<TUnlockRequirementNode> {
    unlockType: `UNLOCK_${string}` | null;
    requirementSetId: string | null;
    description: string | null;
    tooltip: string | null;
    constructor(payload?: Partial<TUnlockRequirementNode>);
}
