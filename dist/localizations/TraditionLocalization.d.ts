import { BaseLocalization } from "./BaseLocalization";
import { TClassProperties } from "../types";
export type TTraditionLocalization = TClassProperties<TraditionLocalization>;
export declare class TraditionLocalization extends BaseLocalization<TTraditionLocalization> {
    name: string;
    description: string;
    constructor(payload?: Partial<TTraditionLocalization>);
}
