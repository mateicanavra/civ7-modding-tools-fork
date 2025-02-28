import { BaseNode } from "./BaseNode";

export type TUnlockRequirementNode = Pick<UnlockRequirementNode,
    "unlockType" |
    "requirementSetId" |
    "description" |
    "tooltip"
>;

export class UnlockRequirementNode extends BaseNode<TUnlockRequirementNode> {
    unlockType: `UNLOCK_${string}`= 'UNLOCK_';
    requirementSetId: string= '';
    description: string= '';
    tooltip: string= '';

    constructor(payload: Partial<TUnlockRequirementNode> = {}) {
        super();
        this.fill(payload);
    }
}
