import * as lodash from 'lodash';

import { TClassProperties, TObjectValues } from "../types";

import { Base } from "./Base";
import { YIELD } from "../constants";

type TUnitCost = TClassProperties<UnitCost>;

export class UnitCost extends Base<TUnitCost> implements TUnitCost {
    unitType: string = '';
    yieldType: TObjectValues<typeof YIELD> = YIELD.PRODUCTION;
    cost: number = 10;

    constructor(payload: Partial<TUnitCost> = {}) {
        super();
        this.fill(payload);
    }

    toXmlElement() {
        return {
            _name: 'Row',
            _attrs: {
                UnitType: this.unitType,
                Cost: this.cost,
                YieldType: this.yieldType,
            },
        };
    }
}