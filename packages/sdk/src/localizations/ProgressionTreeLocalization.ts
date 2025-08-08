import { BaseLocalization } from "./BaseLocalization";

import { TClassProperties } from "../types";

export type TProgressionTreeLocalization = TClassProperties<ProgressionTreeLocalization>;
export class ProgressionTreeLocalization extends BaseLocalization<TProgressionTreeLocalization>{
    name = '';

    constructor(payload: Partial<TProgressionTreeLocalization> = {}) {
        super();
        this.fill(payload);
    }
}
