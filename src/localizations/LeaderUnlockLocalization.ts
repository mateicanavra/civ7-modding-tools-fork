import { BaseLocalization } from "./BaseLocalization";

import { TClassProperties } from "../types";

export type TLeaderUnlockLocalization = TClassProperties<LeaderUnlockLocalization>;
export class LeaderUnlockLocalization extends BaseLocalization<TLeaderUnlockLocalization>{
    tooltip: string = '[B]Benjamin Franklin[/B] was a statesman in [B]America[/B].';

    constructor(payload: Partial<TLeaderUnlockLocalization> = {}) {
        super();
        this.fill(payload);
    }
}
