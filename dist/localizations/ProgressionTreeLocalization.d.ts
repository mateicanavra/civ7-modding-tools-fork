import { BaseLocalization } from "./BaseLocalization";
import { TClassProperties } from "../types";
export type TProgressionTreeLocalization = TClassProperties<ProgressionTreeLocalization>;
export declare class ProgressionTreeLocalization extends BaseLocalization<TProgressionTreeLocalization> {
    name: string;
    constructor(payload?: Partial<TProgressionTreeLocalization>);
}
