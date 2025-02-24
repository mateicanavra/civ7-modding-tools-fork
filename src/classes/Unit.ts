import { v4 as uuid } from 'uuid';

import { Base } from "./Base";
import { AGES, KINDS } from "../constants";
import { Criteria } from "./Criteria";
import { toXML, XmlElement } from "jstoxml";
import { locale } from "../utils";
import { XMLFile } from "./XMLFile";

type TUnit = {
    type: string;
}

export class Unit extends Base<TUnit> implements TUnit {
    type: string = `unit-${uuid()}`;

    constructor(payload: Partial<TUnit> = {}) {
        super();
        this.fill(payload);
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

    build(){
        return [
            new XMLFile({
                path: `${this.type}.xml`,
                content: this.toUnit()
            })
        ];
    }
}