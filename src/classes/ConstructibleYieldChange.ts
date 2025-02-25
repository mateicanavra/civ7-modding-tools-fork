import { TClassProperties, TObjectValues } from "../types";
import { YIELD } from "../constants";

import { Base } from "./Base";

type TConstructibleYieldChange = TClassProperties<ConstructibleYieldChange>;

export class ConstructibleYieldChange extends Base<TConstructibleYieldChange> implements TConstructibleYieldChange {
    constructibleType: string = '';
    yieldType: TObjectValues<typeof YIELD> = YIELD.FOOD;
    yieldChange: number = 0;

    constructor(payload: Partial<TConstructibleYieldChange> = {}) {
        super();
        this.fill(payload);
    }

    toXmlElement() {
        return {
            _name: 'Row',
            _attrs: {
                ConstructibleType: this.constructibleType,
                YieldType: this.yieldType,
                YieldChange: this.yieldChange,
            },
        }
    }
}