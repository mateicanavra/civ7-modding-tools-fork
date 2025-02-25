import { XmlElement } from "jstoxml";
import * as lodash from "lodash";

import { TClassProperties, TObjectValues } from "../types";
import { ACTION_GROUP_ACTION, AGE, CONSTRUCTIBLE_CLASS, CONSTRUCTIBLE_TYPE_TAG, DISTRICT, KIND } from "../constants";
import { ConstructibleLocalization } from "../localizations";
import { locale } from "../utils";

import { ActionGroupBundle } from "./ActionGroupBundle";
import { Base } from "./Base";
import { ConstructibleMaintenance } from "./ConstructibleMaintenance";
import { ConstructibleYieldChange } from "./ConstructibleYieldChange";
import { FileXml } from "./FileXml";
import { randomUUID } from "node:crypto";

type TConstructible = TClassProperties<Constructible>;

export class Constructible extends Base<TConstructible> implements TConstructible {
    name: string = randomUUID();
    type: string = '';
    kind: (typeof KIND)['CONSTRUCTIBLE'] | (typeof KIND)['QUARTER'] = KIND.CONSTRUCTIBLE;
    cost: number = 10;
    population: number = 1;
    isDistrictDefense = false;
    traitType: string = '';
    icon: string = '';

    age: TObjectValues<typeof AGE> = AGE.ANTIQUITY;
    constructibleClass: TObjectValues<typeof CONSTRUCTIBLE_CLASS> = CONSTRUCTIBLE_CLASS.BUILDING;
    constructibleValidDistricts: TObjectValues<typeof DISTRICT>[] = [
        DISTRICT.URBAN,
        DISTRICT.CITY_CENTER,
    ];
    typeTags: TObjectValues<typeof CONSTRUCTIBLE_TYPE_TAG>[] = [];

    actionGroupBundle = new ActionGroupBundle();
    constructibleYieldChanges: ConstructibleYieldChange[] = [];
    constructibleMaintenances: ConstructibleMaintenance[] = [];
    localizations: ConstructibleLocalization[] = [];

    constructor(payload: Partial<TConstructible> = {}) {
        super();
        this.fill(payload);

        const typeName = lodash.snakeCase(this.name).toLocaleUpperCase()
        const typePrefix = 'BUILDING_';
        if (!this.type) {
            this.type = `${typePrefix}${typeName}`;
        }
        if (!this.type.startsWith(typePrefix)) {
            this.type = `${typePrefix}${this.type}`;
        }
    }

    private toLocalization(): XmlElement {
        if(!this.localizations){
            return null
        }
        return {
            Database: this.localizations.map(localization => {
                return localization.fill({ prefix: this.type }).toXmlElement();
            })
        }
    }

    private toGame() {
        return {
            Database: {
                Types: [{
                    _name: 'Row',
                    _attrs: {
                        Type: this.type,
                        Kind: this.kind
                    }
                }],
                Buildings: [{
                    _name: 'Row',
                    _attrs: {
                        ConstructibleType: this.type,
                        Movable: "false",
                        TraitType: this.traitType
                    }
                }],
                TypeTags: this.typeTags.map(typeTag => {
                    return {
                        _name: 'Row',
                        _attrs: {
                            Type: this.type,
                            Tag: typeTag
                        }
                    }
                }),
                Constructibles: [{
                    _name: 'Row',
                    _attrs: {
                        ConstructibleType: this.type,
                        Name: locale(this.type, 'Name'),
                        Description: locale(this.type, 'Description'),
                        Tooltip: locale(this.type, 'Tooltip'),
                        ConstructibleClass: this.constructibleClass,
                        Cost: this.cost,
                        Population: this.population,
                        DistrictDefense: this.isDistrictDefense ? 'true' : 'false',
                        Age: this.age,
                    }
                }],
                Constructible_ValidDistricts: this.constructibleValidDistricts.map(constructibleValidDistrict => {
                    return {
                        _name: 'Row',
                        _attrs: {
                            ConstructibleType: this.type,
                            DistrictType: constructibleValidDistrict
                        }
                    }
                }),
                Constructible_YieldChanges: this.constructibleYieldChanges.map(constructibleYieldChange => {
                    return constructibleYieldChange.fill({
                        constructibleType: this.type
                    }).toXmlElement()
                }),
                Constructible_Maintenances: this.constructibleMaintenances.map(constructibleMaintenance => {
                    return constructibleMaintenance.fill({
                        constructibleType: this.type
                    }).toXmlElement()
                }),
            }
        };
    }

    getFiles() {
        const directory = `/constructibles/${lodash.kebabCase(this.name)}/`;

        return [
            new FileXml({
                name: `game.xml`,
                path: directory,
                content: this.toGame(),
                actionGroups: [this.actionGroupBundle.game],
                actionGroupActions: [ACTION_GROUP_ACTION.UPDATE_DATABASE]
            }),
            new FileXml({
                name: `localization.xml`,
                path: directory,
                content: this.toLocalization(),
                actionGroups: [this.actionGroupBundle.shell, this.actionGroupBundle.game],
                actionGroupActions: [ACTION_GROUP_ACTION.UPDATE_TEXT]
            })
        ];
    }
}