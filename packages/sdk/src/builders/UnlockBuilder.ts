import { kebabCase } from "lodash";

import { TClassProperties, TPartialRequired } from "../types";
import {
    ActionGroupNode,
    DatabaseNode,
    KindNode,
    RequirementArgumentNode,
    RequirementNode,
    RequirementSetNode,
    RequirementSetRequirementNode,
    TRequirementArgumentNode,
    TRequirementNode,
    TRequirementSetNode,
    TUnlockConfigurationValueNode, TUnlockRewardNode,
    TypeNode,
    UnlockConfigurationValueNode,
    UnlockNode,
    UnlockRequirementNode,
    UnlockRewardNode
} from "../nodes";
import { TLeaderUnlockLocalization } from "../localizations";
import { ACTION_GROUP_ACTION, KIND, REQUIREMENT_SET } from "../constants";

import { BaseBuilder } from "./BaseBuilder";
import { XmlFile } from "../files";
import { locale, trim } from "../utils";

type TUnlockRewardBuilder = TClassProperties<UnlockBuilder>;

export class UnlockBuilder extends BaseBuilder<TUnlockRewardBuilder> {
    _database: DatabaseNode = new DatabaseNode();
    _localizations: DatabaseNode = new DatabaseNode();

    actionGroups: ActionGroupNode[] = [];

    unlockConfigurationValue: TPartialRequired<TUnlockConfigurationValueNode, 'configurationValue'> = {
        configurationValue: 'CIVILIZATION_'
    }
    unlockReward:Partial<TUnlockRewardNode> = {}
    requirementSet: TPartialRequired<TRequirementSetNode, 'requirementSetType'> & {
        requirements?: (TPartialRequired<TRequirementNode, 'requirementType'> & {
            requirementArguments?: TPartialRequired<TRequirementArgumentNode, 'name'>[]
        })[]
    } = {
        requirementSetType: REQUIREMENT_SET.TEST_ALL,
    }


    localizations: Partial<TLeaderUnlockLocalization>[] = [];

    constructor(payload: Partial<TUnlockRewardBuilder> = {}) {
        super();
        this.fill(payload);
    }

    migrate() {
        if (this.actionGroups.length === 0) {
            this.actionGroups = [this.actionGroupBundle.always];
        }
        if (!this.unlockConfigurationValue.unlockType) {
            this.unlockConfigurationValue.unlockType = `UNLOCK_${this.unlockConfigurationValue.configurationValue}`;
        }

        this._database.fill({
            kinds: [new KindNode({ kind: KIND.UNLOCK }).insertOrIgnore()],
            types: [new TypeNode({ kind: KIND.UNLOCK, type: this.unlockConfigurationValue.unlockType }).insertOrIgnore()],
            unlocks: [new UnlockNode({ unlockType: this.unlockConfigurationValue.unlockType }).insertOrIgnore()],
            unlockRewards: [new UnlockRewardNode({
                name: locale(this.unlockConfigurationValue.configurationValue, 'name'),
                description: locale(this.unlockConfigurationValue.configurationValue, 'description'),
                icon: this.unlockConfigurationValue.configurationValue,
                ...this.unlockConfigurationValue,
                ...this.unlockReward
            }).insertOrIgnore()],
            unlockConfigurationValues: [new UnlockConfigurationValueNode({
                ...this.unlockConfigurationValue
            }).insertOrIgnore()],
        });

        const requirementSet = new RequirementSetNode(this.requirementSet).insertOrIgnore()
        this._database.requirementSets.push(requirementSet);

        this.requirementSet.requirements?.forEach(req => {
            const requirement = new RequirementNode(req).insertOrIgnore();
            this._database.requirements.push(requirement);

            this._database.requirementSetRequirements.push(
                new RequirementSetRequirementNode({
                    ...requirementSet,
                    ...requirement
                }).insertOrIgnore()
            );

            this._database.unlockRequirements.push(
                new UnlockRequirementNode({
                    ...requirementSet,
                    ...this.unlockConfigurationValue,
                    description: locale(this.unlockConfigurationValue.unlockType, 'description'),
                    tooltip: locale(this.unlockConfigurationValue.unlockType, 'tooltip'),
                    narrativeText: locale(this.unlockConfigurationValue.unlockType, 'narrative'),
                }).insertOrIgnore()
            )

            req.requirementArguments?.forEach(arg => {
                this._database.requirementArguments.push(
                    new RequirementArgumentNode({
                        ...requirement,
                        ...arg,
                    }).insertOrIgnore()
                );
            })
        });

        // this._localizations.fill({
        //     englishText: this.localizations.map(item => {
        //         return new LeaderUnlockLocalization({
        //             prefix: `PLAY_AS_${trim(this.leaderUnlock.leaderType)}_${trim(this.leaderUnlock.type)}`,
        //             ...item
        //         });
        //     }).flatMap(item => item.getNodes())
        // });
        return this;
    }

    build() {
        const name = `${kebabCase(trim(this.unlockConfigurationValue.configurationValue))}`;
        const path = `/unlocks/${name}/`;
        return [
            new XmlFile({
                path,
                name: 'unlock.xml',
                content: this._database.toXmlElement(),
                actionGroups: this.actionGroups,
                actionGroupActions: [ACTION_GROUP_ACTION.UPDATE_DATABASE]
            }),
            new XmlFile({
                path,
                name: 'localization.xml',
                content: this._localizations.toXmlElement(),
                actionGroups: [this.actionGroupBundle.shell, this.actionGroupBundle.always],
                actionGroupActions: [ACTION_GROUP_ACTION.UPDATE_TEXT]
            }),
        ]
    }
}
