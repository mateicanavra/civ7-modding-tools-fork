import { TClassProperties, TObjectValues } from "../types";
import { ACTION_GROUP_ACTION } from "../constants";

import { Base } from "./Base";
import { ActionGroup } from "./ActionGroup";


export class BaseFile<T> {
    path: string = '/';
    name: string = 'file.txt';
    content: any = null;
    actionGroups: ActionGroup[] = [];
    actionGroupActions: TObjectValues<typeof ACTION_GROUP_ACTION>[] = [ACTION_GROUP_ACTION.UPDATE_DATABASE];

    constructor(payload: Partial<T> = {}) {
        this.fill(payload);
    }

    fill(payload: Partial<T> = {}) {
        for (const [key, value] of Object.entries(payload)) {
            if (this.hasOwnProperty(key)) {
                this[key] = value;
            }
        }
        return this;
    }

    get modInfoPath(){
        if(this.path.startsWith('/')){
            return `${this.path}${this.name}`.slice(1);
        }
        return `${this.path}${this.name}`;
    }

    write(dist: string) {
    }
}