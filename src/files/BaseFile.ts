import { TObjectValues } from "../types";
import { fill } from "../utils";
import { ACTION_GROUP_ACTION } from "../constants";
import { ActionGroupNode } from "../nodes";

export class BaseFile<T = any> {
    path: string = '/';
    name: string = 'file.txt';
    content: any = null;
    actionGroups: ActionGroupNode[] = [];
    actionGroupActions: TObjectValues<typeof ACTION_GROUP_ACTION>[] = [ACTION_GROUP_ACTION.UPDATE_DATABASE];

    constructor(payload: Partial<T> = {}) {
        this.fill(payload);
    }

    fill = fill<T>;

    get modInfoPath() {
        if (this.path.startsWith('/')) {
            return `${this.path}${this.name}`.slice(1);
        }
        return `${this.path}${this.name}`;
    }

    write(dist: string) {
    }
}