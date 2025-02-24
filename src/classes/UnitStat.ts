import { TClassProperties } from "../types";

import { Base } from "./Base";

type TUnitStat = TClassProperties<UnitStat>;

export class UnitStat extends Base<TUnitStat> implements TUnitStat {
    unitType: string = '';
    combat: number = 0;
    rangedCombat: number = 0;
    bombard: number = 0;
    range: number = 0;

    constructor(payload: Partial<TUnitStat> = {}) {
        super();
        this.fill(payload);
    }

    toXmlElement() {
        return {
            _name: 'UnitStat',
            _attrs: {
                UnitType: this.unitType,
                Combat: this.combat,
                RangedCombat: this.rangedCombat,
                Bombard: this.bombard,
                Range: this.range,
            },
        };
    }
}