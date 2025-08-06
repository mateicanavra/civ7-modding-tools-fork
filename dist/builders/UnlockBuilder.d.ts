import { TClassProperties, TPartialRequired } from "../types";
import { ActionGroupNode, DatabaseNode, TRequirementArgumentNode, TRequirementNode, TRequirementSetNode, TUnlockConfigurationValueNode, TUnlockRewardNode } from "../nodes";
import { TLeaderUnlockLocalization } from "../localizations";
import { BaseBuilder } from "./BaseBuilder";
import { XmlFile } from "../files";
type TUnlockRewardBuilder = TClassProperties<UnlockBuilder>;
export declare class UnlockBuilder extends BaseBuilder<TUnlockRewardBuilder> {
    _database: DatabaseNode;
    _localizations: DatabaseNode;
    actionGroups: ActionGroupNode[];
    unlockConfigurationValue: TPartialRequired<TUnlockConfigurationValueNode, 'configurationValue'>;
    unlockReward: Partial<TUnlockRewardNode>;
    requirementSet: TPartialRequired<TRequirementSetNode, 'requirementSetType'> & {
        requirements?: (TPartialRequired<TRequirementNode, 'requirementType'> & {
            requirementArguments?: TPartialRequired<TRequirementArgumentNode, 'name'>[];
        })[];
    };
    localizations: Partial<TLeaderUnlockLocalization>[];
    constructor(payload?: Partial<TUnlockRewardBuilder>);
    migrate(): this;
    build(): XmlFile[];
}
export {};
