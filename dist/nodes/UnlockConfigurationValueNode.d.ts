import { BaseNode } from "./BaseNode";
export type TUnlockConfigurationValueNode = Pick<UnlockConfigurationValueNode, "unlockType" | "configurationValue">;
export declare class UnlockConfigurationValueNode extends BaseNode<TUnlockConfigurationValueNode> {
    unlockType: string | null;
    configurationValue: string | null;
    constructor(payload?: Partial<TUnlockConfigurationValueNode>);
}
