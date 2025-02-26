import * as lodash from "lodash";

import { TClassProperties, TObjectValues } from "../types";
import {
    CivilizationNode,
    CivilizationTagNode,
    DatabaseNode, IconDefinitionNode,
    LegacyCivilizationNode,
    LegacyCivilizationTraitNode, ShellCivilizationNode,
    TCivilizationNode,
    TLegacyCivilizationNode,
    TraitNode,
    TypeNode
} from "../nodes";
import { ACTION_GROUP_ACTION, AGE, KIND, TAG_TRAIT, TRAIT } from "../constants";
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
    _icons: DatabaseNode = new DatabaseNode();

    trait: TPartialWithRequired<TraitNode, 'traitType'> = { traitType: 'TRAIT_' };
    traitAbility: TPartialWithRequired<TraitNode, 'traitType'> = { traitType: 'TRAIT_ABILITY_' };
    civilization: TPartialWithRequired<TCivilizationNode, 'civilizationType' | 'domain'> = {
        civilizationType: 'CIVILIZATION_CUSTOM',
        domain: 'AntiquityAgeCivilizations'
    }
    civilizationLegacy: TPartialWithRequired<TLegacyCivilizationNode, 'age'> = { age: AGE.ANTIQUITY }
    civilizationTraits: (TObjectValues<typeof TRAIT> | string)[] = [];
    civilizationTags: TObjectValues<typeof TAG_TRAIT>[] = [];
    localizations: Partial<TCivilizationLocalization>[] = [];
    icon: TPartialWithRequired<IconDefinitionNode, 'path'> = { path: 'fs://game/civ_sym_han' }

    constructor(payload: Partial<TCivilizationBuilder> = {}) {
        super();
        this.fill(payload);
    }

    migrate() {
        if (this.trait.traitType === 'TRAIT_') {
            this.trait = {
                traitType: this.civilization.civilizationType.replace('CIVILIZATION_', 'TRAIT_'),
            }
        }
        if (this.traitAbility.traitType === 'TRAIT_ABILITY_') {
            this.traitAbility = {
                traitType: this.trait.traitType + '_ABILITY',
            }
        }

        this._game.fill({
            types: [
                new TypeNode({
                    kind: KIND.TRAIT,
                    type: this.trait.traitType
                }),
                new TypeNode({
                    kind: KIND.TRAIT,
                    type: this.traitAbility.traitType
                }),
            ],
            traits: [
                new TraitNode({
                    internalOnly: true,
                    ...this.trait
                }),
                new TraitNode({
                    name: locale(this.civilization.civilizationType + '_ABILITY', 'name'),
                    description: locale(this.civilization.civilizationType + '_ABILITY', 'description'),
                    internalOnly: true,
                    ...this.traitAbility
                })
            ],
            civilizations: [
                new CivilizationNode({
                    adjective: locale(this.civilization.civilizationType, 'adjective'),
                    capitalName: locale(this.civilization.civilizationType, 'cityName_1'),
                    description: locale(this.civilization.civilizationType, 'description'),
                    fullName: locale(this.civilization.civilizationType, 'fullName'),
                    name: locale(this.civilization.civilizationType, 'name'),
                    ...this.civilization,
                })
            ],
        });
        this._shell.fill({
            civilizations: [
                ShellCivilizationNode.from(new CivilizationNode({
                    adjective: locale(this.civilization.civilizationType, 'adjective'),
                    capitalName: locale(this.civilization.civilizationType, 'cityName_1'),
                    description: locale(this.civilization.civilizationType, 'description'),
                    fullName: locale(this.civilization.civilizationType, 'fullName'),
                    name: locale(this.civilization.civilizationType, 'name'),
                    ...this.civilization,
                }))
            ],
            civilizationTags: this.civilizationTags.map(item => {
                return new CivilizationTagNode({
                    civilizationDomain: this.civilization.domain,
                    tagType: item,
                    ...this.civilization,
                })
            })
        })

        this._legacy.fill({
            types: [
                new TypeNode({ type: this.civilization.civilizationType, kind: KIND.CIVILIZATION }),
            ],
            legacyCivilizations: [
                new LegacyCivilizationNode({
                    adjective: locale(this.civilization.civilizationType, 'adjective'),
                    capitalName: locale(this.civilization.civilizationType, 'cityName_1'),
                    description: locale(this.civilization.civilizationType, 'description'),
                    fullName: locale(this.civilization.civilizationType, 'fullName'),
                    name: locale(this.civilization.civilizationType, 'name'),
                    ...this.civilization,
                    ...this.civilizationLegacy
                })
            ],
            legacyCivilizationTraits: [
                new LegacyCivilizationTraitNode({
                    ...this.civilization,
                    ...this.trait
                })
            ]
        });

        this._icons.fill({
            iconDefinitions: [new IconDefinitionNode({
                id: this.civilization.civilizationType,
                ...this.icon,
            })]
        });

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
                name: 'icons.xml',
                content: this._icons.toXmlElement(),
                actionGroups: [this.actionGroupBundle.shell, this.actionGroupBundle.always],
                actionGroupActions: [ACTION_GROUP_ACTION.UPDATE_ICONS]
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
