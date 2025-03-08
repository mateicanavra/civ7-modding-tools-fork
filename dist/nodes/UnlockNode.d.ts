import { BaseNode } from "./BaseNode";
export type TUnlockNode = Pick<UnlockNode, "unlockType">;
export declare class UnlockNode extends BaseNode<TUnlockNode> {
    unlockType: `UNLOCK_${string}` | null;
    constructor(payload?: Partial<TUnlockNode>);
}
