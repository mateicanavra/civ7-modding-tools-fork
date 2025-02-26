import { fill } from "../utils";
import { ActionGroupBundle } from "../core";
import { BaseFile } from "../files/BaseFile";

export class BaseBuilder<T extends Object = object> {
    actionGroupBundle: ActionGroupBundle = new ActionGroupBundle();

    constructor(payload: Partial<T> = {}) {
        this.fill(payload);
    }

    fill = fill<T>;

    migrate() {
        return this;
    }

    // this should return files
    build(): BaseFile[] {
        return [];
    }
}