import { v4 as uuid } from 'uuid';
import * as lodash from 'lodash';
import { XmlElement } from "jstoxml";

import { KINDS } from "../constants";
import { locale } from "../utils";

import { Base } from "./Base";
import { XmlFile } from "./XmlFile";
import { CriteriaBundle } from "./CriteriaBundle";

type TUnit = {
    type: string;
    criteriaBundle: CriteriaBundle
}

export class Unit extends Base<TUnit> implements TUnit {
    type: string = `unit-${uuid()}`;
    criteriaBundle = new CriteriaBundle();

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
        return [
            new XmlFile({
                filename: `${lodash.kebabCase(this.type)}.xml`,
                filepath: `/units/`,
                content: this.toUnit(),
                criterias: this.criteriaBundle.values()
            })
        ];
    }
}