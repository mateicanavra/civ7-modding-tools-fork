import { BaseLocalization } from "./BaseLocalization";

import { TClassProperties } from "../types";

export type TUnitLocalization = TClassProperties<UnitLocalization>;
export class UnitLocalization extends BaseLocalization<TUnitLocalization>{
    name = '';
    description = '';

    constructor(payload: Partial<TUnitLocalization> = {}) {
        super();
        this.fill(payload);
    }
}