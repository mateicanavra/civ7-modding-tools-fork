import { TClassProperties, TObjectValues } from "../types";
import { CivilizationUnlockNode, DatabaseNode } from "../nodes";
import { TCivilizationUnlockLocalization } from "../localizations";
import { XmlFile } from "../files";
import { ACTION_GROUP_ACTION, AGE, CIVILIZATION_DOMAIN, KIND } from "../constants";

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
