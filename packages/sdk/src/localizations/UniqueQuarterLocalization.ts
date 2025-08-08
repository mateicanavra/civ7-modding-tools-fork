import { BaseLocalization } from "./BaseLocalization";

import { TClassProperties } from "../types";

export type TUniqueQuarterLocalization = TClassProperties<UniqueQuarterLocalization>;
export class UniqueQuarterLocalization extends BaseLocalization<TUniqueQuarterLocalization>{
    name = '';
    description = '';

    constructor(payload: Partial<TUniqueQuarterLocalization> = {}) {
        super();
        this.fill(payload);
    }
}
