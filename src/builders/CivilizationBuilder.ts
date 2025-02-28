import * as lodash from "lodash";

import { TClassProperties, TObjectValues, TPartialWithRequired } from "../types";
import {
    CivilizationItemNode,
    CivilizationNode,
    CivilizationTagNode,
    CivilizationTraitNode,
    CivilizationUnlockNode,
    DatabaseNode,
    GameCivilizationNodeSlice,
    GameEffectNode,
    IconDefinitionNode,
    KindNode,
    LegacyCivilizationNode,
    LegacyCivilizationTraitNode,
    ModifierNode,
    ShellCivilizationNodeSlice,
    TCivilizationItemNode,
    TCivilizationNode,
    TCivilizationUnlockNode,
    TIconDefinitionNode,
    TLegacyCivilizationNode,
    TModifierNode,
    TraitModifierNode,
    TraitNode,
    TTraitNode,
    TypeNode, UnlockNode, UnlockRewardNode
} from "../nodes";
import { ACTION_GROUP_ACTION, AGE, KIND, TAG_TRAIT, TRAIT } from "../constants";
import { locale } from "../utils";
import { XmlFile } from "../files";
import { CivilizationLocalization, TCivilizationLocalization } from "../localizations";

import { BaseBuilder } from "./BaseBuilder";
import { UnitBuilder } from "./UnitBuilder";
import { ConstructibleBuilder } from "./ConstructibleBuilder";

type TCivilizationBuilder = TClassProperties<CivilizationBuilder>

export class CivilizationBuilder extends BaseBuilder<TCivilizationBuilder> {
    _current: DatabaseNode = new DatabaseNode();
    _shell: DatabaseNode = new DatabaseNode();
    _legacy: DatabaseNode = new DatabaseNode();
    _localizations: DatabaseNode = new DatabaseNode();
    _icons: DatabaseNode = new DatabaseNode();
    _unlocks: DatabaseNode = new DatabaseNode();
    _gameEffects: GameEffectNode | null = null;

    civilizationTraits: (TObjectValues<typeof TRAIT> | string)[] = [];
    civilizationTags: TObjectValues<typeof TAG_TRAIT>[] = [];

    trait: TPartialWithRequired<TTraitNode, 'traitType'> = { traitType: 'TRAIT_' };
    traitAbility: TPartialWithRequired<TraitNode, 'traitType'> = { traitType: 'TRAIT_ABILITY_' };
    civilization: TPartialWithRequired<TCivilizationNode, 'civilizationType' | 'domain'> = {
        civilizationType: 'CIVILIZATION_CUSTOM',
        domain: 'AntiquityAgeCivilizations'
    }
    civilizationLegacy: TPartialWithRequired<TLegacyCivilizationNode, 'age'> = { age: AGE.ANTIQUITY }
    localizations: Partial<TCivilizationLocalization>[] = [];
    icon: TPartialWithRequired<TIconDefinitionNode, 'path'> = { path: 'fs://game/civ_sym_han' }
    civilizationItems: TPartialWithRequired<TCivilizationItemNode, "type" | "kind">[] = [];
    civilizationUnlocks: TPartialWithRequired<TCivilizationUnlockNode, "type">[] = [];
    modifiers: Partial<TModifierNode>[] = [];

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

        const civilization = new CivilizationNode({
            adjective: locale(this.civilization.civilizationType, 'adjective'),
            capitalName: locale(this.civilization.civilizationType, 'cityNames_1'),
            description: locale(this.civilization.civilizationType, 'description'),
            fullName: locale(this.civilization.civilizationType, 'fullName'),
            name: locale(this.civilization.civilizationType, 'name'),
            ...this.civilization,
        });

        const trait = new TraitNode({
            internalOnly: true,
            ...this.trait
        });

        const traitAbility = new TraitNode({
            name: locale(this.civilization.civilizationType + '_ABILITY', 'name'),
            description: locale(this.civilization.civilizationType + '_ABILITY', 'description'),
            internalOnly: true,
            ...this.traitAbility
        });

        this._current.fill({
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
            traits: [trait, traitAbility],
            civilizations: [GameCivilizationNodeSlice.from(civilization)],
            civilizationTraits: [
                new CivilizationTraitNode({
                    ...civilization,
                    ...this.trait
                }),
                new CivilizationTraitNode({
                    ...civilization,
                    ...this.traitAbility
                }),
                ...this.civilizationTraits.map(item => {
                    return new CivilizationTraitNode({
                        ...civilization,
                        traitType: item,
                    })
                })
            ]
        });

        this._shell.fill({
            civilizations: [ShellCivilizationNodeSlice.from(civilization)],
            civilizationTags: this.civilizationTags.map(item => {
                return new CivilizationTagNode({
                    civilizationDomain: this.civilization.domain,
                    tagType: item,
                    ...civilization,
                })
            }),
            civilizationItems: [
                new CivilizationItemNode({
                    ...civilization,
                    ...traitAbility,
                    civilizationDomain: civilization.domain,
                    type: this.traitAbility.traitType,
                    kind: KIND.TRAIT,
                }),
                ...this.civilizationItems.map(item => {
                    return new CivilizationItemNode({
                        civilizationDomain: civilization.domain,
                        ...civilization,
                        ...item
                    })
                })
            ],
            civilizationUnlocks: this.civilizationUnlocks.map(item => {
                return new CivilizationUnlockNode({
                    ...civilization,
                    civilizationDomain: civilization.domain,
                    name: locale(item.type, 'name'),
                    description: locale(item.type, 'description'),
                    icon: item.type,
                    ...item
                })
            })
        })

        this._unlocks.fill({
            kinds: [new KindNode({ kind: KIND.UNLOCK }).insertOrIgnore()],
            types: this.civilizationUnlocks.map(item => {
                return new TypeNode({
                    type: `UNLOCK_${item.type}`,
                    kind: KIND.UNLOCK
                }).insertOrIgnore();
            }),
            unlocks: this.civilizationUnlocks.map(item => {
                return new UnlockNode({
                    unlockType: `UNLOCK_${item.type}`,
                }).insertOrIgnore();
            }),
            unlockRewards: this.civilizationUnlocks.map(item => {
                return new UnlockRewardNode({
                    unlockType: `UNLOCK_${item.type}`,
                    name: locale(item.type, 'name'),
                    description: 'LOC_UNLOCK_EXPLORATION_CIV_DESCRIPTION', // TODO what is the best way to do it?,
                    icon: item.type,
                    civUnlock: true
                }).insertOrIgnore();
            })
        });

        this._legacy.fill({
            types: [
                new TypeNode({ type: this.civilization.civilizationType, kind: KIND.CIVILIZATION }),
            ],
            legacyCivilizations: [
                new LegacyCivilizationNode({
                    ...civilization,
                    ...this.civilizationLegacy
                })
            ],
            legacyCivilizationTraits: [
                new LegacyCivilizationTraitNode({
                    ...civilization,
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

        if (this.modifiers.length > 0) {
            const modifiers = this.modifiers.map(item => {
                return new ModifierNode(item);
            });
            this._current.fill({
                traitModifiers: modifiers.map(item => {
                    return new TraitModifierNode({
                        traitType: this.traitAbility.traitType,
                        modifierId: item.id
                    });
                })
            })
            this._gameEffects = new GameEffectNode({ modifiers });
        }
        return this;
    }

    /**
     * @description Bind entity as unique to this civilization
     * @param items
     */
    bind(items: (UnitBuilder | ConstructibleBuilder)[] = []) {
        items.forEach(item => {
            if (item instanceof UnitBuilder) {
                item._current.units.forEach(unit => {
                    unit.traitType = this.trait.traitType;

                    this._shell.civilizationItems.push(
                        new CivilizationItemNode({
                            civilizationDomain: this.civilization.domain,
                            civilizationType: this.civilization.civilizationType,
                            type: unit.unitType,
                            kind: KIND.UNIT,
                            icon: unit.unitType,
                            ...unit,
                        })
                    )
                });
            }

            if (item instanceof ConstructibleBuilder) {
                item._always.buildings.forEach(building => {
                    building.traitType = this.trait.traitType;
                });
                item._always.constructibles.forEach(constructible => {
                    this._shell.civilizationItems.push(
                        new CivilizationItemNode({
                            civilizationDomain: this.civilization.domain,
                            civilizationType: this.civilization.civilizationType,
                            type: constructible.constructibleType,
                            kind: KIND.IMPROVEMENT,
                            icon: '',
                            ...constructible,
                        })
                    )
                });
            }
        });
        return this;
    }

    build() {
        const path = `/civilizations/${lodash.kebabCase(this.civilization.civilizationType.replace('CIVILIZATION_', ''))}/`;
        return [
            new XmlFile({
                path,
                name: 'current.xml',
                content: this._current.toXmlElement(),
                actionGroups: [this.actionGroupBundle.current],
                actionGroupActions: [ACTION_GROUP_ACTION.UPDATE_DATABASE]
            }),
            new XmlFile({
                path,
                name: 'unlocks.xml',
                content: this._unlocks.toXmlElement(),
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
            new XmlFile({
                path,
                name: 'game-effects.xml',
                content: this._gameEffects?.toXmlElement(),
                actionGroups: [this.actionGroupBundle.current],
                actionGroupActions: [ACTION_GROUP_ACTION.UPDATE_DATABASE]
            }),
        ]
    }
}
