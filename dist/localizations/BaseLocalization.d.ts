import { TObjectValues } from "../types";
import { LANGUAGE } from "../constants";
import { EnglishTextNode } from "../nodes";
export declare class BaseLocalization<T> {
    locale?: TObjectValues<typeof LANGUAGE> | null;
    prefix?: string | null;
    constructor(payload?: Partial<T>);
    fill<T>(payload?: Partial<T>): this;
    getNodes(): EnglishTextNode[];
}
