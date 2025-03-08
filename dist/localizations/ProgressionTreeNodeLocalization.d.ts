import { BaseLocalization } from "./BaseLocalization";
import { TClassProperties } from "../types";
export type TProgressionTreeNodeLocalization = TClassProperties<ProgressionTreeNodeLocalization>;
export declare class ProgressionTreeNodeLocalization extends BaseLocalization<TProgressionTreeNodeLocalization> {
    name: string;
    constructor(payload?: Partial<TProgressionTreeNodeLocalization>);
}
