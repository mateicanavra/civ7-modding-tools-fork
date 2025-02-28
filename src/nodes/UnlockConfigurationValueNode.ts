import { BaseNode } from "./BaseNode";

export type TUnlockConfigurationValueNode = Pick<UnlockConfigurationValueNode,
    "unlockType" |
    "configurationValue"
>;

export class UnlockConfigurationValueNode extends BaseNode<TUnlockConfigurationValueNode> {
    unlockType: `UNLOCK_${string}`= 'UNLOCK_';
    configurationValue: string= '';

    constructor(payload: Partial<TUnlockConfigurationValueNode> = {}) {
        super();
        this.fill(payload);
    }
}
