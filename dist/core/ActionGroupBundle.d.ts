import { ActionGroupNode } from "../nodes";
import { TClassProperties } from "../types";
type TActionGroupBundleActionGroupBundle = TClassProperties<ActionGroupBundle>;
export declare class ActionGroupBundle {
    shell: ActionGroupNode;
    always: ActionGroupNode;
    current: ActionGroupNode;
    exist: ActionGroupNode;
    constructor(payload?: Partial<TActionGroupBundleActionGroupBundle>);
    fill: (this: any, payload?: Partial<TClassProperties<ActionGroupBundle>>) => any;
}
export {};
