import * as lodash from "lodash";

import { TClassProperties, TObjectValues } from "../types";
import { CivilizationNode, CivilizationTagNode, DatabaseNode, TCivilizationNode, TypeNode } from "../nodes";
import { ACTION_GROUP_ACTION, KIND, TAG_TRAIT, TRAIT } from "../constants";
import { locale } from "../utils";
import { XmlFile } from "../files";

import { BaseBuilder } from "./BaseBuilder";
import { TPartialWithRequired } from "../types/TWithRequired";
import { CivilizationLocalization, TCivilizationLocalization } from "../localizations";

type TCivilizationBuilder = TClassProperties<CivilizationBuilder>

export class CivilizationBuilder extends BaseBuilder<TCivilizationBuilder> {
    _game: DatabaseNode = new DatabaseNode();
    _shell: DatabaseNode = new DatabaseNode();
    _legacy: DatabaseNode = new DatabaseNode();
    _localizations: DatabaseNode = new DatabaseNode();

    civilization: TPartialWithRequired<TCivilizationNode, 'civilizationType'> = { civilizationType: 'CIVILIZATION_CUSTOM' }
    civilizationTraits: (TObjectValues<typeof TRAIT> | string)[] = [];
    civilizationTags: TObjectValues<typeof TAG_TRAIT>[] = [];
    localizations: Partial<TCivilizationLocalization>[] = [];

    constructor(payload: Partial<TCivilizationBuilder> = {}) {
        super();
        this.fill(payload);
    }

    migrate() {
        this._game.fill({
            types: [
                new TypeNode({
                    type: this.civilization.civilizationType,
                    kind: KIND.TRAIT
                }),
                new TypeNode({
                    type: `${this.civilization.civilizationType}_ABILITY`,
                    kind: KIND.TRAIT
                }),
            ],
            traits: [

            ],
            civilizations: [
                new CivilizationNode({
                    capitalName: locale(this.civilization.civilizationType, 'cityName_1'),
                    name: locale(this.civilization.civilizationType, 'name'),
                    description: locale(this.civilization.civilizationType, 'description'),
                    adjective: locale(this.civilization.civilizationType, 'adjective'),
                    ...this.civilization,
                })
            ],
        });

        this._shell.fill({
            civilizations: [
                new CivilizationNode({
                    name: locale(this.civilization.civilizationType, 'name'),
                    description: locale(this.civilization.civilizationType, 'description'),
                    adjective: locale(this.civilization.civilizationType, 'adjective'),
                    ...this.civilization
                })
            ],
            civilizationTags: this.civilizationTags.map(item => {
                return new CivilizationTagNode({
                    civilizationDomain: this.civilization.domain,
                    civilizationType: this.civilization.civilizationType,
                    tagType: item
                })
            })
        })

        this._localizations.fill({
            englishText: this.localizations.map(item => {
                return new CivilizationLocalization({
                    prefix: this.civilization.civilizationType,
                    ...item
                });
            }).flatMap(item => item.getNodes())
        });

        return this;
    }


    build() {
        const path = `/civilizations/${lodash.kebabCase(this.civilization.civilizationType.replace('CIVILIZATION_', ''))}/`;
        return [
            new XmlFile({
                path,
                name: 'current.xml',
                content: this._game.toXmlElement(),
                actionGroups: [this.actionGroupBundle.current],
                actionGroupActions: [ACTION_GROUP_ACTION.UPDATE_DATABASE]
            }),
            new XmlFile({
                path,
                name: 'legacy.xml',
                content: this._legacy.toXmlElement(),
                actionGroups: [this.actionGroupBundle.always],
                actionGroupActions: [ACTION_GROUP_ACTION.UPDATE_DATABASE]
            }),
            new XmlFile({
                path,
                name: 'shell.xml',
                content: this._shell.toXmlElement(),
                actionGroups: [this.actionGroupBundle.shell],
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
