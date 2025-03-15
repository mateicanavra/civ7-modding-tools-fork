import { BaseNode } from "./BaseNode";
export type TUnlockRewardNode = Pick<UnlockRewardNode, "unlockType" | "name" | "description" | "icon" | "civUnlock">;
export declare class UnlockRewardNode extends BaseNode<TUnlockRewardNode> {
    unlockType: string | null;
    name: string | null;
    description: string | null;
    icon: string | null;
    civUnlock: boolean | null;
    constructor(payload?: Partial<TUnlockRewardNode>);
}
