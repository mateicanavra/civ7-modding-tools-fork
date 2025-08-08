import { BaseLocalization } from "./BaseLocalization";

import { TClassProperties } from "../types";

export type TTraditionLocalization = TClassProperties<TraditionLocalization>;
export class TraditionLocalization extends BaseLocalization<TTraditionLocalization>{
    name = '';
    description = '';

    constructor(payload: Partial<TTraditionLocalization> = {}) {
        super();
        this.fill(payload);
    }
}
