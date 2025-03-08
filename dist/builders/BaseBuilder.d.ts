import { ActionGroupBundle } from "../core";
import { BaseFile } from "../files";
export declare class BaseBuilder<T extends Object = object> {
    actionGroupBundle: ActionGroupBundle;
    constructor();
    fill<T>(payload?: Partial<T>): this;
    migrate(): this;
    build(): BaseFile[];
}
