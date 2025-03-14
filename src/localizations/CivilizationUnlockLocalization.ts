import { BaseLocalization } from "./BaseLocalization";

import { TClassProperties } from "../types";

export type TCivilizationUnlockLocalization = TClassProperties<CivilizationUnlockLocalization>;
export class CivilizationUnlockLocalization extends BaseLocalization<TCivilizationUnlockLocalization>{
    playAs: string = 'Play as [B]Something[/B].';

    constructor(payload: Partial<TCivilizationUnlockLocalization> = {}) {
        super();
        this.fill(payload);
    }
}
