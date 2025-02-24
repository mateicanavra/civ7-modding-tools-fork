import { BaseLocalization } from "./BaseLocalization";

import { TClassProperties } from "../types";

type TUnitLocalization = TClassProperties<UnitLocalization>;
export class UnitLocalization extends BaseLocalization<TUnitLocalization>{
    name = 'test';
    description = 'text';

    constructor(payload: Partial<TUnitLocalization> = {}) {
        super();
        this.fill(payload);
    }
}