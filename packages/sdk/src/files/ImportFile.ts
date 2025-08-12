import * as fs from 'node:fs';

import { TClassProperties } from "../types";

import { BaseFile } from "./BaseFile";

type TXmlFile = TClassProperties<ImportFile>;

export class ImportFile extends BaseFile<ImportFile> implements TXmlFile {
    path = '/imports/';
    content = '';

    constructor(payload: Partial<TXmlFile> = {}) {
        super();
        this.fill(payload);
    }

    write(dist: string) {
        try {
            console.log(`${dist}${this.path}${this.name}`);
            fs.mkdir(`${dist}${this.path}`, { recursive: true }, (err) => {
                fs.cpSync(this.content, `${dist}${this.path}${this.name}`);
            });
        } catch (err) {
            console.error(err);
        }
    }
}
