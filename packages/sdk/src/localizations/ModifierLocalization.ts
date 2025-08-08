import { BaseLocalization } from "./BaseLocalization";

import { TClassProperties } from "../types";

export type TModifierLocalization = TClassProperties<ModifierLocalization>;
export class ModifierLocalization extends BaseLocalization<TModifierLocalization>{
    description = '';

    constructor(payload: Partial<TModifierLocalization> = {}) {
        super();
        this.fill(payload);
    }
}
