import * as fs from 'node:fs';
import { toXML, XmlElement } from "jstoxml";

import { TClassProperties } from "../types";

import { BaseFile } from "./BaseFile";

type TXmlFile = TClassProperties<XmlFile>;

export class XmlFile extends BaseFile<XmlFile> implements TXmlFile {
    content: XmlElement | XmlElement[] | null | undefined = null;

    constructor(payload: Partial<TXmlFile> = {}) {
        super();
        this.fill(payload);
    }

    write(dist: string) {
        if (!this.content) {
            return;
        }

        try {
            const data = toXML(this.content, {
                header: true,
                indent: '    '
            });
            console.log(`${dist}${this.path}${this.name}`);
            fs.mkdir(`${dist}${this.path}`, { recursive: true }, (err) => {
                fs.writeFileSync(`${dist}${this.path}${this.name}`, data + `\n<!-- generated with https://github.com/izica/civ7-modding-tools -->`);
            });
        } catch (err) {
            console.error(err);
        }
    }
}