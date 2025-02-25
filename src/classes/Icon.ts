import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

import { TClassProperties } from "../types";

import { Base } from "./Base";

type TIcon = TClassProperties<Icon>;

export class Icon extends Base<TIcon> implements TIcon {
    id: string = randomUUID();
    modId: string = '';
    path: string = '';
    content: string = '';

    get isExternal() {
        return fs.existsSync(this.content);
    }

    constructor(payload: Partial<TIcon> = {}) {
        super();
        this.fill(payload);
    }

    fill(payload: Partial<TIcon> = {}) {
        super.fill(payload);

        if(this.isExternal && !this.path) {
            this.path =`fs://game/${this.modId}/${path.basename(this.content)}`;
            return this;
        }

        if(this.isExternal && !this.path.startsWith('fs:')) {
            this.path = `fs://game/${this.modId}/${this.path}`;
        }

        return this;
    }

    toXmlElement() {
        return {
            Row: {
                ID: this.id,
                Path: this.path,
            }
        }
    }
}