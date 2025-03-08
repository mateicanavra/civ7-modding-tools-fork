import { BaseLocalization } from "./BaseLocalization";
import { TClassProperties } from "../types";
export type TModifierLocalization = TClassProperties<ModifierLocalization>;
export declare class ModifierLocalization extends BaseLocalization<TModifierLocalization> {
    description: string;
    constructor(payload?: Partial<TModifierLocalization>);
}
