import * as fs from 'node:fs';
import { toXML, XmlElement } from "jstoxml";

import { TClassProperties } from "../types";

import { Base } from "./Base";
import { ActionGroup } from "./ActionGroup";
import { File } from "./File";

type TXmlFile = TClassProperties<FileXml>;

export class FileXml extends File<FileXml> implements TXmlFile {
    content: XmlElement | XmlElement[] | null = null;

    constructor(payload: Partial<TXmlFile> = {}) {
        super();
        this.fill(payload);
    }

    write(dist: string) {
        if(!this.content){
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