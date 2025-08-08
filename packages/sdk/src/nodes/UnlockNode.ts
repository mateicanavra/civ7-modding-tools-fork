import { BaseNode } from "./BaseNode";

export type TUnlockNode = Pick<UnlockNode, "unlockType">;

export class UnlockNode extends BaseNode<TUnlockNode> {
    unlockType: string | null = 'UNLOCK_';

    constructor(payload: Partial<TUnlockNode> = {}) {
        super();
        this.fill(payload);
    }
}
