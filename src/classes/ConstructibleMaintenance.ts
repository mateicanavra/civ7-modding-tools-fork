import { TClassProperties, TObjectValues } from "../types";
import { YIELD } from "../constants";

import { Base } from "./Base";

type TConstructibleMaintenance = TClassProperties<ConstructibleMaintenance>;

export class ConstructibleMaintenance extends Base<TConstructibleMaintenance> implements TConstructibleMaintenance {
    constructibleType: string = '';
    yieldType: TObjectValues<typeof YIELD> = YIELD.GOLD;
    amount: number = 0;

    constructor(payload: Partial<TConstructibleMaintenance> = {}) {
        super();
        this.fill(payload);
    }

    toXmlElement() {
        return {
            _name: 'Row',
            _attrs: {
                ConstructibleType: this.constructibleType,
                YieldType: this.yieldType,
                Amount: this.amount,
            },
        }
    }
}