import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

import { TClassProperties } from "../types";

import { Base } from "./Base";

type TIcon = TClassProperties<Icon>;

export class Icon extends Base<TIcon> implements TIcon {
    id = randomUUID();
    path: string = '';
    modId: string = '';

    get isExternal() {
        return fs.existsSync(this.path);
    }

    constructor(payload: Partial<TIcon> = {}) {
        super();
        this.fill(payload);
    }

    toXmlElement() {
        return {
            Row: {
                ID: this.id,
                Path: this.isExternal ? `fs://game/${this.modId}/${path.basename(this.path)}` : this.path,
            }
        }
    }
}