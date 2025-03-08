import { BaseNode } from "./BaseNode";

export type TUnlockRequirementNode = Pick<UnlockRequirementNode,
    "unlockType" |
    "requirementSetId" |
    "description" |
    "tooltip"
>;

export class UnlockRequirementNode extends BaseNode<TUnlockRequirementNode> {
    unlockType: `UNLOCK_${string}` | null = 'UNLOCK_';
    requirementSetId: string | null = null;
    description: string | null = null;
    tooltip: string | null = null;

    constructor(payload: Partial<TUnlockRequirementNode> = {}) {
        super();
        this.fill(payload);
    }
}
