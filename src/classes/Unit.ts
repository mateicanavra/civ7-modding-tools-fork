import { v4 as uuid } from 'uuid';
import * as lodash from 'lodash';
import { XmlElement } from "jstoxml";

import { ACTIONS_GROUPS_ACTIONS, KINDS } from "../constants";
import { locale } from "../utils";
import { TClassProperties } from "../types";

import { Base } from "./Base";
import { XmlFile } from "./XmlFile";
import { ActionGroupBundle } from "./ActionGroupBundle";

type TUnit = TClassProperties<Unit>;

export class Unit extends Base<TUnit> implements TUnit {
    type: string = `unit-${uuid()}`;
    actionGroupBundle = new ActionGroupBundle();

    constructor(payload: Partial<TUnit> = {}) {
        super();
        this.fill(payload);
        this.type = lodash.snakeCase(this.type).toLocaleUpperCase();
    }

    private toUnit(): XmlElement {
        return {
            Database: {
                Types: {
                    _name: 'Row',
                    _attrs: {
                        Type: this.type,
                        Kind: KINDS.KIND_UNIT,
                    },
                },
                Units: {
                    _name: 'Row',
                    _attrs: {
                        ...locale(this.type, ['Name', 'Description']),
                        UnitType: this.type,
                        Kind: KINDS.KIND_UNIT,
                        BaseSightRange: 2,
                        BaseMoves: 2
                    },
                }
            }
        }
    }

    build() {
        const unitName = lodash.kebabCase(this.type);
        return [
            new XmlFile({
                filename: `unit.xml`,
                filepath: `/units/${unitName}/`,
                content: this.toUnit(),
                actionGroups: [
                    this.actionGroupBundle.current.fill({
                        actions: [ACTIONS_GROUPS_ACTIONS.UPDATE_DATABASE]
                    })
                ]
            })
        ];
    }
}