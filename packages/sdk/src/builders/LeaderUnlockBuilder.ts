import { kebabCase } from "lodash";

import { TClassProperties, TPartialRequired } from "../types";
import {
    DatabaseNode,
    KindNode,
    RequirementArgumentNode,
    RequirementNode,
    RequirementSetNode,
    RequirementSetRequirementNode,
    TLeaderCivilizationBiasNode,
    TLeaderUnlockNode,
    TypeNode,
    UnlockConfigurationValueNode,
    UnlockNode,
    UnlockRequirementNode,
    UnlockRewardNode
} from "../nodes";
import { LeaderUnlockLocalization, TLeaderUnlockLocalization } from "../localizations";
import { ACTION_GROUP_ACTION, AGE, KIND, REQUIREMENT, REQUIREMENT_SET } from "../constants";

import { BaseBuilder } from "./BaseBuilder";
import { XmlFile } from "../files";
import { locale, trim } from "../utils";

type TLeaderUnlockBuilder = TClassProperties<LeaderUnlockBuilder>;

export class LeaderUnlockBuilder extends BaseBuilder<TLeaderUnlockBuilder> {
    _always: DatabaseNode = new DatabaseNode();
    _localizations: DatabaseNode = new DatabaseNode();

    leaderUnlock: TPartialRequired<TLeaderUnlockNode, "leaderType" | "type" | "ageType"> = {
        leaderType: 'LEADER_',
        type: 'CIVILIZATION_',
        ageType: AGE.ANTIQUITY,
    };

    leaderCivilizationBias: Partial<TLeaderCivilizationBiasNode> = {}

    localizations: Partial<TLeaderUnlockLocalization>[] = [];

    constructor(payload: Partial<TLeaderUnlockBuilder> = {}) {
        super();
        this.fill(payload);
    }

    migrate() {
        this._localizations.fill({
            englishText: this.localizations.map(item => {
                return new LeaderUnlockLocalization({
                    prefix: `PLAY_AS_${trim(this.leaderUnlock.leaderType)}_${trim(this.leaderUnlock.type)}`,
                    ...item
                });
            }).flatMap(item => item.getNodes())
        });

        const unlockType = `UNLOCK_${this.leaderUnlock.type}`;
        const requirementSetId = `REQSET_LEADER_IS_${trim(this.leaderUnlock.leaderType)}`;
        const requirementId = `REQ_LEADER_IS_${trim(this.leaderUnlock.leaderType)}`;
        this._always.fill({
            kinds: [new KindNode({ kind: KIND.UNLOCK }).insertOrIgnore()],
            types: [new TypeNode({ kind: KIND.UNLOCK, type: unlockType }).insertOrIgnore()],
            unlocks: [new UnlockNode({ unlockType }).insertOrIgnore()],
            unlockRewards: [new UnlockRewardNode({
                unlockType,
                civUnlock: true,
                name: locale(this.leaderUnlock.type, 'name'),
                description: locale(this.leaderUnlock.type, 'description'),
                icon: this.leaderUnlock.type,
            }).insertOrIgnore()],
            unlockRequirements: [new UnlockRequirementNode({
                unlockType,
                requirementSetId,
                description: locale(`UNLOCK_PLAY_AS_${trim(this.leaderUnlock.leaderType)}_${trim(this.leaderUnlock.type)}`, 'description'),
                tooltip: locale(`UNLOCK_PLAY_AS_${trim(this.leaderUnlock.leaderType)}_${trim(this.leaderUnlock.type)}`, 'tooltip'),
            }).insertOrIgnore()],
            unlockConfigurationValues: [new UnlockConfigurationValueNode({
                unlockType,
                configurationValue: this.leaderUnlock.type
            }).insertOrIgnore()],
            requirementSets: [new RequirementSetNode({
                requirementSetId,
                requirementSetType: REQUIREMENT_SET.TEST_ALL,
            }).insertOrIgnore()],
            requirementSetRequirements: [new RequirementSetRequirementNode({
                requirementSetId,
                requirementId,
            }).insertOrIgnore()],
            requirements: [new RequirementNode({
                requirementId,
                requirementType: REQUIREMENT.PLAYER_LEADER_TYPE_MATCHES,
            }).insertOrIgnore()],
            requirementArguments: [new RequirementArgumentNode({
                requirementId,
                name: 'LeaderType',
                value: this.leaderUnlock.leaderType
            }).insertOrIgnore()]
        })

        return this;
    }

    build() {
        const name = `${kebabCase(trim(this.leaderUnlock.leaderType))}-${kebabCase(trim(this.leaderUnlock.type))}`;
        const path = `/unlocks/${name}/`;
        return [
            new XmlFile({
                path,
                name: 'always.xml',
                content: this._always.toXmlElement(),
                actionGroups: [this.actionGroupBundle.always],
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
