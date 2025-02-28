import { BaseLocalization } from "./BaseLocalization";

import { TClassProperties } from "../types";

export type TProgressionTreeNodeLocalization = TClassProperties<ProgressionTreeNodeLocalization>;
export class ProgressionTreeNodeLocalization extends BaseLocalization<TProgressionTreeNodeLocalization>{
    name = '';

    constructor(payload: Partial<TProgressionTreeNodeLocalization> = {}) {
        super();
        this.fill(payload);
    }
}
