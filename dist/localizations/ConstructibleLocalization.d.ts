import { BaseLocalization } from "./BaseLocalization";
import { TClassProperties } from "../types";
export type TConstructibleLocalization = TClassProperties<ConstructibleLocalization>;
export declare class ConstructibleLocalization extends BaseLocalization<TConstructibleLocalization> {
    name: string;
    description: string;
    tooltip: string;
    constructor(payload?: Partial<TConstructibleLocalization>);
}
