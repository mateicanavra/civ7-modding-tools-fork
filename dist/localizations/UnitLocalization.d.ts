import { BaseLocalization } from "./BaseLocalization";
import { TClassProperties } from "../types";
export type TUnitLocalization = TClassProperties<UnitLocalization>;
export declare class UnitLocalization extends BaseLocalization<TUnitLocalization> {
    name: string;
    description: string;
    constructor(payload?: Partial<TUnitLocalization>);
}
