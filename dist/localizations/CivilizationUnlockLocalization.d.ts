import { BaseLocalization } from "./BaseLocalization";
import { TClassProperties } from "../types";
export type TCivilizationUnlockLocalization = TClassProperties<CivilizationUnlockLocalization>;
export declare class CivilizationUnlockLocalization extends BaseLocalization<TCivilizationUnlockLocalization> {
    description: string;
    tooltip: string;
    constructor(payload?: Partial<TCivilizationUnlockLocalization>);
}
