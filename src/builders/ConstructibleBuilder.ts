import * as lodash from "lodash";

import { TClassProperties, TObjectValues, TPartialWithRequired } from "../types";
import {
    BuildingNode,
    ConstructibleMaintenanceNode,
    ConstructibleNode,
    ConstructibleValidDistrictNode,
    ConstructibleYieldChangeNode,
    DatabaseNode,
    IconDefinitionNode,
    TBuildingNode,
    TConstructibleMaintenanceNode,
    TConstructibleNode,
    TConstructibleYieldChangeNode,
    TIconDefinitionNode,
    TypeNode,
    TypeTagNode
} from "../nodes";
import { ACTION_GROUP_ACTION, CONSTRUCTIBLE_TYPE_TAG, DISTRICT, KIND } from "../constants";
import { XmlFile } from "../files";
import { ConstructibleLocalization, TConstructibleLocalization } from "../localizations";
import { locale } from "../utils";

import { BaseBuilder } from "./BaseBuilder";

type TConstructibleBuilder = TClassProperties<ConstructibleBuilder>

export class ConstructibleBuilder extends BaseBuilder<TConstructibleBuilder> {
    _always: DatabaseNode = new DatabaseNode();
    _localizations: DatabaseNode = new DatabaseNode();
    _icons: DatabaseNode = new DatabaseNode();

    typeTags: TObjectValues<typeof CONSTRUCTIBLE_TYPE_TAG>[] = [];
    constructibleValidDistricts: TObjectValues<typeof DISTRICT>[] = [];

    building: Partial<TBuildingNode> | null = null;
    constructible: TPartialWithRequired<TConstructibleNode, 'constructibleType'> = {
        constructibleType: 'BUILDING_CUSTOM',
    }
    constructibleYieldChanges: Partial<TConstructibleYieldChangeNode>[] = [];
    constructibleMaintenances: Partial<TConstructibleMaintenanceNode>[] = [];
    icon: TPartialWithRequired<TIconDefinitionNode, 'path'> = {
        path: 'fs://game/civ_sym_han'
    }
    localizations: TConstructibleLocalization[] = [];

    constructor(payload: Partial<TConstructibleBuilder> = {}) {
        super();
        this.fill(payload);
    }

    migrate() {
        this._always.fill({
            types: [new TypeNode({
                type: this.constructible.constructibleType,
                kind: KIND.CONSTRUCTIBLE
            })],
            buildings: this.building ? [new BuildingNode({
                ...this.constructible,
                ...this.building
            })] : [],
            typeTags: this.typeTags.map(item => new TypeTagNode({
                type: this.constructible.constructibleType,
                tag: item
            })),
            constructibles: [new ConstructibleNode({
                name: locale(this.constructible.constructibleType, 'name'),
                description: locale(this.constructible.constructibleType, 'description'),
                tooltip: locale(this.constructible.constructibleType, 'tooltip'),
                ...this.constructible
            })],
            constructibleValidDistricts: this.constructibleValidDistricts.map(item => {
                return new ConstructibleValidDistrictNode({
                    ...this.constructible,
                    districtType: item
                })
            }),
            constructibleMaintenances: this.constructibleMaintenances.map(item => {
                return new ConstructibleMaintenanceNode({
                    ...this.constructible,
                    ...item
                })
            }),
            constructibleYieldChanges: this.constructibleYieldChanges.map(item => {
                return new ConstructibleYieldChangeNode({
                    ...this.constructible,
                    ...item
                })
            })
        });

        this._icons.fill({
            iconDefinitions: [new IconDefinitionNode({
                id: this.constructible.constructibleType,
                ...this.icon,
            })]
        })

        this._localizations.fill({
            englishText: this.localizations.map(item => {
                return new ConstructibleLocalization({
                    prefix: this.constructible.constructibleType,
                    ...item
                });
            }).flatMap(item => item.getNodes())
        });

        return this;
    }


    build() {
        const path = `/constructibles/${lodash.kebabCase(this.constructible.constructibleType.replace('CONSTRUCTIBLE_', ''))}/`;
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
            new XmlFile({
                path,
                name: 'icons.xml',
                content: this._icons.toXmlElement(),
                actionGroups: [this.actionGroupBundle.shell, this.actionGroupBundle.current],
                actionGroupActions: [ACTION_GROUP_ACTION.UPDATE_ICONS]
            }),
        ]
    }
}
