import * as lodash from "lodash";

import { TClassProperties, TObjectValues } from "../types";
import {
    DatabaseNode,
    TagNode,
    TUnitCostNode,
    TUnitNode, TUnitReplaceNode,
    TUnitStatNode,
    TypeNode,
    TypeTagNode, UnitCostNode,
    UnitNode, UnitReplaceNode,
    UnitStatNode,
    VisualRemapNode,
    TVisualRemapNode
} from "../nodes";
import { ACTION_GROUP_ACTION, KIND, UNIT_CLASS } from "../constants";
import { locale } from "../utils";
import { XmlFile } from "../files";

import { BaseBuilder } from "./BaseBuilder";
import { TPartialWithRequired } from "../types/TWithRequired";
import { TUnitLocalization, UnitLocalization } from "../localizations";

type TUnitBuilder = TClassProperties<UnitBuilder>

export class UnitBuilder extends BaseBuilder<TUnitBuilder> {
    _game: DatabaseNode = new DatabaseNode();
    _localizations: DatabaseNode = new DatabaseNode();
    _visualRemap: DatabaseNode | null = null;

    unit: TPartialWithRequired<TUnitNode, 'unitType'> = { unitType: 'UNIT_CUSTOM' }
    unitStat: Partial<TUnitStatNode> = {};
    unitCost: Partial<TUnitCostNode> = {};
    unitReplace: Partial<TUnitReplaceNode> = {};
    visualRemap: TPartialWithRequired<TVisualRemapNode, 'to'> | null = null;
    localizations: TUnitLocalization[] = [];

    typeTags: TObjectValues<typeof UNIT_CLASS>[] = [];

    constructor(payload: Partial<TUnitBuilder> = {}) {
        super();
        this.fill(payload);
    }

    migrate() {
        this._game.fill({
            types: [
                new TypeNode({
                    type: this.unit.unitType,
                    kind: KIND.UNIT
                })
            ],
            units: [
                new UnitNode({
                    name: locale(this.unit.unitType, 'name'),
                    description: locale(this.unit.unitType, 'description'),
                    ...this.unit,
                })
            ],
            tags: [
                new TagNode({
                    category: this.unit.unitType,
                    tag: this.unit.unitType.replace('UNIT_', 'UNIT_CLASS_')
                })
            ],
            typeTags: [
                new TypeTagNode({
                    type: this.unit.unitType,
                    tag: this.unit.unitType.replace('UNIT_', 'UNIT_CLASS_')
                }),
                ...this.typeTags.map(item => new TypeTagNode({
                    type: this.unit.unitType,
                    tag: item
                }))
            ],
            unitStats: [new UnitStatNode(this.unitStat)],
            unitCosts: [new UnitCostNode(this.unitCost)],
            unitReplaces: [new UnitReplaceNode({
                civUniqueUnitType: this.unit.unitType,
                ...this.unitReplace
            })]
        })

        if(this.visualRemap){
            this._visualRemap = new DatabaseNode({
                visualRemaps: [
                    new VisualRemapNode({
                        id: `REMAP_${this.unit.unitType}`,
                        displayName: locale(this.unit.unitType, 'name'),
                        kind: KIND.UNIT,
                        from: this.unit.unitType,
                        ...this.visualRemap
                    })
                ]
            })
        }

        this._localizations.fill({
            englishText: this.localizations.map(item => {
                return new UnitLocalization({
                    prefix: this.unit.unitType,
                    ...item
                });
            }).flatMap(item => item.getNodes())
        });

        return this;
    }


    build() {
        const path = `/units/${lodash.kebabCase(this.unit.unitType.replace('UNIT_', ''))}/`;
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
                name: 'visual-remap.xml',
                content: this._visualRemap?.toXmlElement(),
                actionGroups: [this.actionGroupBundle.current],
                actionGroupActions: [ACTION_GROUP_ACTION.UPDATE_VISUAL_REMAPS]
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
