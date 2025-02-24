import { v4 as uuid } from 'uuid';
import * as lodash from 'lodash';
import { XmlElement } from "jstoxml";

import { ACTIONS_GROUPS_ACTION, CORE_CLASS, DOMAIN, KIND, UNIT_CLASS, UNIT_MOVEMENT_CLASS } from "../constants";
import { locale } from "../utils";
import { TClassProperties, TObjectValues } from "../types";

import { Base } from "./Base";
import { XmlFile } from "./XmlFile";
import { ActionGroupBundle } from "./ActionGroupBundle";
import { UnitStat } from "./UnitStat";
import { UnitCost } from "./UnitCost";

type TUnit = TClassProperties<Unit>;

export class Unit extends Base<TUnit> implements TUnit {
    actionGroupBundle = new ActionGroupBundle();
    type: string = `unit-${uuid()}`;
    tag = '';
    baseSightRange: number = 2;
    baseMoves: number = 2;
    combat: number = 20;
    unitMovementClass: TObjectValues<typeof UNIT_MOVEMENT_CLASS> = UNIT_MOVEMENT_CLASS.FOOT;
    domain: TObjectValues<typeof DOMAIN> = DOMAIN.LAND;
    coreClass: TObjectValues<typeof CORE_CLASS> = CORE_CLASS.MILITARY;
    zoneOfControl: boolean = true;
    unitStat = new UnitStat();
    unitCost = new UnitCost();
    unitReplace: string = '';
    typeTags: TObjectValues<typeof UNIT_CLASS>[] = [];

    constructor(payload: Partial<TUnit> = {}) {
        super();
        this.fill(payload);
        this.type = lodash.snakeCase(this.type).toLocaleUpperCase();
        if (!this.tag) {
            this.tag = this.type.replace('UNIT_', 'UNIT_CLASS_');
        }
    }

    private toUnit(): XmlElement {
        return {
            Database: {
                Types: {
                    _name: 'Row',
                    _attrs: {
                        Type: this.type,
                        Kind: KIND.UNIT,
                    },
                },
                Units: {
                    _name: 'Row',
                    _attrs: {
                        ...locale(this.type, ['Name', 'Description']),
                        UnitType: this.type,
                        Kind: KIND.UNIT,
                        BaseSightRange: this.baseSightRange,
                        BaseMoves: this.baseMoves,
                        UnitMovementClass: this.unitMovementClass,
                        Domain: this.domain,
                        CoreClass: this.coreClass,
                        ZoneOfControl: this.zoneOfControl ? "true" : "false"
                    },
                },
                Tags: [{
                    _name: 'Row',
                    _attrs: {
                        Tag: this.tag,
                        Category: 'UNIT_CLASS',
                    }
                }],
                TypeTags: [{
                    _name: 'Row',
                    _attrs: {
                        Type: this.type,
                        Tag: this.tag,
                    }
                }, ...this.typeTags.map(typeTag => ({
                    _name: 'Row',
                    _attrs: {
                        Type: this.type,
                        Tag: typeTag,
                    }
                }))],
                Unit_Stats: [this.unitStat.fill({ unitType: this.type }).toXmlElement()],
                Unit_Costs: [this.unitCost.fill({ unitType: this.type }).toXmlElement()],
                ...(this.unitReplace ? {
                    UnitReplaces: {
                        _name: 'Row',
                        _attrs: {
                            CivUniqueUnitType: this.type,
                            ReplacesUnitType: this.unitReplace,
                        }
                    }
                } : {})
            }
        }
    }

    build() {
        const unitName = lodash.kebabCase(this.type.replace('UNIT_', ''));
        return [
            new XmlFile({
                filename: `unit.xml`,
                filepath: `/units/${unitName}/`,
                content: this.toUnit(),
                actionGroups: [
                    this.actionGroupBundle.current.fill({
                        actions: [ACTIONS_GROUPS_ACTION.UPDATE_DATABASE]
                    })
                ]
            })
        ];
    }
}