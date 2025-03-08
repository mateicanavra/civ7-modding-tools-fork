import { TObjectValues } from "../types";
import { ACTION_GROUP_ACTION } from "../constants";
import { ActionGroupNode } from "../nodes";
export declare class BaseFile<T = any> {
    path: string;
    name: string;
    content: any;
    actionGroups: ActionGroupNode[];
    actionGroupActions: TObjectValues<typeof ACTION_GROUP_ACTION>[];
    constructor(payload?: Partial<T>);
    fill: (this: any, payload?: Partial<T>) => any;
    get modInfoPath(): string;
    write(dist: string): void;
}
