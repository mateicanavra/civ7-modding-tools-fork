import { BaseLocalization } from "./BaseLocalization";
import { TClassProperties } from "../types";
export type TLeaderUnlockLocalization = TClassProperties<LeaderUnlockLocalization>;
export declare class LeaderUnlockLocalization extends BaseLocalization<TLeaderUnlockLocalization> {
    tooltip: string;
    constructor(payload?: Partial<TLeaderUnlockLocalization>);
}
