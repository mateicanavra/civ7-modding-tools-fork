import { ActionGroupBundle } from "../core";
import { BaseFile } from "../files";

export class BaseBuilder<T extends Object = object> {
    actionGroupBundle: ActionGroupBundle = new ActionGroupBundle();

    constructor() {
    }

    fill<T>(payload: Partial<T> = {}) {
        for (const [key, value] of Object.entries(payload)) {
            if (this.hasOwnProperty(key)) {
                this[key] = value;
            }
        }

        this.migrate();
        return this;
    }

    migrate() {
        return this;
    }

    // this should return files
    build(): BaseFile[] {
        return [];
    }
}