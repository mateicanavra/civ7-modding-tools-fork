import { TClassProperties, TObjectValues } from "../types";
import {
    CivilizationUnlockNode,
    DatabaseNode,
    KindNode,
    RequirementArgumentNode,
    RequirementNode,
    RequirementSetNode,
    RequirementSetRequirementNode,
    TypeNode,
    UnlockConfigurationValueNode,
    UnlockNode,
    UnlockRequirementNode,
    UnlockRewardNode
} from "../nodes";
import { TCivilizationUnlockLocalization } from "../localizations";
import { XmlFile } from "../files";
import { ACTION_GROUP_ACTION, AGE, CIVILIZATION_DOMAIN, KIND, REQUIREMENT, REQUIREMENT_SET } from "../constants";

import { BaseBuilder } from "./BaseBuilder";
import { locale } from "../utils";

type TCivilizationUnlockBuilder = TClassProperties<CivilizationUnlockBuilder>;

export class CivilizationUnlockBuilder extends BaseBuilder<TCivilizationUnlockBuilder> {
    _current: DatabaseNode = new DatabaseNode();
    _shell: DatabaseNode = new DatabaseNode();

    /** @description if true - add to existing civilization to new civilization */
    isAdditive: boolean = false;

    from: { civilizationType: string, ageType: TObjectValues<typeof AGE> } = {
        civilizationType: 'CIVILIZATION_FROM',
        ageType: AGE.ANTIQUITY,
    };

    to: { civilizationType: string, ageType: TObjectValues<typeof AGE> } = {
        civilizationType: 'CIVILIZATION_TO',
        ageType: AGE.EXPLORATION,
    }

    localizations: Partial<TCivilizationUnlockLocalization>[] = [];

    constructor(payload: Partial<TCivilizationUnlockBuilder> = {}) {
        super();
        this.fill(payload);
    }

    migrate() {
        this._shell.fill({
            civilizationUnlocks: [new CivilizationUnlockNode({
                ageDomain: 'StandardAges',
                civilizationDomain: CIVILIZATION_DOMAIN.from(this.from.ageType),
                civilizationType: this.from.civilizationType,
                type: this.to.civilizationType,
                ageType: this.to.ageType,
                kind: KIND.CIVILIZATION,
                name: locale(this.to.civilizationType, 'NAME'),
                description: locale(this.to.civilizationType, 'DESCRIPTION'),
                icon: this.to.civilizationType
            })]
        });

        const unlockType = `UNLOCK_${this.to.civilizationType}`;
        const requirementSetId = `REQSET_CIV_IS_${this.from.civilizationType.replace('CIVILIZATION_', '')}`;
        const requirementId = `REQ_CIV_IS_${this.from.civilizationType.replace('CIVILIZATION_', '')}`;

        this._current.fill({
            kinds: [new KindNode({ kind: KIND.UNLOCK }).insertOrIgnore()],
            types: [new TypeNode({ type: unlockType }).insertOrIgnore()],
            unlocks: [new UnlockNode({ unlockType }).insertOrIgnore()],
            unlockRewards: [new UnlockRewardNode({
                unlockType,
                civUnlock: true,
                name: locale(this.to.civilizationType, 'NAME'),
                description: locale(this.to.civilizationType, 'DESCRIPTION'),
                icon: this.to.civilizationType,
            }).insertOrIgnore()],
            requirementSets: [new RequirementSetNode({
                requirementSetId,
                requirementSetType: REQUIREMENT_SET.TEST_ALL
            }).insertOrIgnore()],
            requirements: [new RequirementNode({
                requirementId,
                requirementType: REQUIREMENT.PLAYER_CIVILIZATION_TYPE_MATCHES
            }).insertOrIgnore()],
            requirementArguments: [new RequirementArgumentNode({
                requirementId,
                name: 'CivilizationType',
                value: this.from.civilizationType,
            }).insertOrIgnore()],
            requirementSetRequirements: [new RequirementSetRequirementNode({
                requirementSetId,
                requirementId,
            }).insertOrIgnore()],
            unlockRequirements: [new UnlockRequirementNode({
                unlockType,
                requirementSetId,
                description: locale(`UNLOCK_${this.from.civilizationType}_${this.to.civilizationType}`, 'description'),
                tooltip: locale(`UNLOCK_${this.from.civilizationType}_${this.to.civilizationType}`, 'tooltip'),
            }).insertOrIgnore()],
            unlockConfigurationValues: [new UnlockConfigurationValueNode({
                unlockType,
                configurationValue: this.to.civilizationType
            }).insertOrIgnore()]
        });

        if (this.isAdditive) {

        }

        return this;
    }

    build() {
        const name = `${this.from.civilizationType.replace('CIVILIZATION_', '').replace('_', '-').toLocaleLowerCase()}-${this.to.civilizationType.replace('CIVILIZATION_', '').replace('_', '-').toLocaleLowerCase()}`;
        const path = `/civilization-unlocks/${name}/`;
        return [
            new XmlFile({
                path,
                name: `shell.xml`,
                content: this._shell.toXmlElement(),
                actionGroups: [this.actionGroupBundle.shell],
                actionGroupActions: [ACTION_GROUP_ACTION.UPDATE_DATABASE]
            }),
            new XmlFile({
                path,
                name: `current.xml`,
                content: this._current.toXmlElement(),
                actionGroups: [this.actionGroupBundle.current],
                actionGroupActions: [ACTION_GROUP_ACTION.UPDATE_DATABASE]
            }),
        ]
    }
}
