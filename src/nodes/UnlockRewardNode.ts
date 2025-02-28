import { BaseNode } from "./BaseNode";

export type TUnlockRewardNode = Pick<UnlockRewardNode,
    "unlockType" |
    "name" |
    "description" |
    "icon" |
    "civUnlock"
>;

export class UnlockRewardNode extends BaseNode<TUnlockRewardNode> {
    unlockType: `UNLOCK_${string}` = 'UNLOCK_';
    name: string = '';
    description: string = '';
    icon: string = '';
    civUnlock: boolean | null = null;

    constructor(payload: Partial<TUnlockRewardNode> = {}) {
        super();
        this.fill(payload);
    }
}
