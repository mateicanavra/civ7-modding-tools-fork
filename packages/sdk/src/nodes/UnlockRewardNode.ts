import { BaseNode } from "./BaseNode";

export type TUnlockRewardNode = Pick<UnlockRewardNode,
    "unlockType" |
    "name" |
    "description" |
    "icon" |
    "civUnlock"
>;

export class UnlockRewardNode extends BaseNode<TUnlockRewardNode> {
    unlockType: string | null = 'UNLOCK_';
    name: string | null = null;
    description: string | null = null;
    icon: string | null = null;
    civUnlock: boolean | null = null;

    constructor(payload: Partial<TUnlockRewardNode> = {}) {
        super();
        this.fill(payload);
    }
}
