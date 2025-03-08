import { BaseNode } from "./BaseNode";

export type TUnlockConfigurationValueNode = Pick<UnlockConfigurationValueNode,
    "unlockType" |
    "configurationValue"
>;

export class UnlockConfigurationValueNode extends BaseNode<TUnlockConfigurationValueNode> {
    unlockType: `UNLOCK_${string}` | null = 'UNLOCK_';
    configurationValue: string | null = null;

    constructor(payload: Partial<TUnlockConfigurationValueNode> = {}) {
        super();
        this.fill(payload);
    }
}
