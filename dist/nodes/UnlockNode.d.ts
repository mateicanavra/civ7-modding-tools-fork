import { BaseNode } from "./BaseNode";
export type TUnlockNode = Pick<UnlockNode, "unlockType">;
export declare class UnlockNode extends BaseNode<TUnlockNode> {
    unlockType: string | null;
    constructor(payload?: Partial<TUnlockNode>);
}
