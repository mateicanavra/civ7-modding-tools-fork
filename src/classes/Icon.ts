import { randomUUID } from "node:crypto";
import * as fs from "node:fs";

import { TClassProperties } from "../types";

import { Base } from "./Base";

type TIcon = TClassProperties<Icon>;

export class Icon extends Base<TIcon> implements TIcon {
    id = randomUUID();
    path: string = '';

    // checks if the file exists
    get isExternal() {
        return fs.existsSync(this.path);
    }

    constructor(payload: Partial<TIcon> = {}) {
        super();
        this.fill(payload);
    }
}