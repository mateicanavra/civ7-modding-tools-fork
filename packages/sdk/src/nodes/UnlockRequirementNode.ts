import { BaseNode } from "./BaseNode";

export type TUnlockRequirementNode = Pick<UnlockRequirementNode,
    "unlockType" |
    "requirementSetId" |
    "description" |
    "narrativeText" |
    "tooltip"
>;

export class UnlockRequirementNode extends BaseNode<TUnlockRequirementNode> {
    unlockType: string | null = 'UNLOCK_';
    requirementSetId: string | null = null;
    description: string | null = null;
    tooltip: string | null = null;
    narrativeText: string | null = null;

    constructor(payload: Partial<TUnlockRequirementNode> = {}) {
        super();
        this.fill(payload);
    }
}
