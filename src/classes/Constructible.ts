import { v4 as uuid } from 'uuid';
import { XmlElement } from "jstoxml";
import * as lodash from "lodash";

import { TClassProperties, TObjectValues } from "../types";
import { ACTIONS_GROUPS_ACTION, AGE, CONSTRUCTIBLE_CLASS, CONSTRUCTIBLE_TYPE_TAG, KIND } from "../constants";
import { ConstructibleLocalization } from "../localizations";
import { locale } from "../utils";

import { ActionGroupBundle } from "./ActionGroupBundle";
import { Base } from "./Base";
import { Civilization } from "./Civilization";
import { ConstructibleMaintenance } from "./ConstructibleMaintenance";
import { ConstructibleYieldChange } from "./ConstructibleYieldChange";
import { XmlFile } from "./XmlFile";

type TConstructible = TClassProperties<Constructible>;

export class Constructible extends Base<TConstructible> implements TConstructible {
    name: string = uuid();
    type: string = '';
    kind: (typeof KIND)['CONSTRUCTIBLE'] | (typeof KIND)['QUARTER'] = KIND.CONSTRUCTIBLE;
    cost: number = 10;
    population: number = 1;
    isDistrictDefense = false;
    traitType: string = '';
    icon: string = '';

    age: TObjectValues<typeof AGE> = AGE.ANTIQUITY;
    constructibleClass: TObjectValues<typeof CONSTRUCTIBLE_CLASS> = CONSTRUCTIBLE_CLASS.BUILDING;
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

    bindToCivilization(civilization: Civilization) {
        this.traitType = civilization.trait;
        return this;
    }


    private toLocalization(): XmlElement {
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

    build() {
        const directory = `/constructibles/${lodash.kebabCase(this.name)}/`;

        const files: XmlFile[] = [(
            new XmlFile({
                filename: `game.xml`,
                filepath: directory,
                content: this.toGame(),
                actionGroups: [
                    this.actionGroupBundle.game.clone().fill({
                        actions: [ACTIONS_GROUPS_ACTION.UPDATE_DATABASE]
                    })
                ]
            })
        )];

        if (this.localizations.length > 0) {
            files.push(new XmlFile({
                filename: `localization.xml`,
                filepath: directory,
                content: this.toLocalization(),
                actionGroups: [
                    this.actionGroupBundle.shell.clone().fill({
                        actions: [ACTIONS_GROUPS_ACTION.UPDATE_TEXT]
                    }),
                    this.actionGroupBundle.game.clone().fill({
                        actions: [ACTIONS_GROUPS_ACTION.UPDATE_TEXT]
                    })
                ]
            }));
        }

        return files;
    }
}