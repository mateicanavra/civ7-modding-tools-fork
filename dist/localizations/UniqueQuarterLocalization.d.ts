import { BaseLocalization } from "./BaseLocalization";
import { TClassProperties } from "../types";
export type TUniqueQuarterLocalization = TClassProperties<UniqueQuarterLocalization>;
export declare class UniqueQuarterLocalization extends BaseLocalization<TUniqueQuarterLocalization> {
    name: string;
    description: string;
    constructor(payload?: Partial<TUniqueQuarterLocalization>);
}
