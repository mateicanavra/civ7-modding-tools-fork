import * as fs from 'node:fs';
import { toXML, XmlElement } from "jstoxml";

import { TClassProperties } from "../types";

import { Base } from "./Base";
import { ActionGroup } from "./ActionGroup";

type TXmlFile = TClassProperties<XmlFile>;

export class XmlFile extends Base<TXmlFile> implements TXmlFile {
    filepath: string = '/';
    filename: string = 'file.xml';
    content: XmlElement | XmlElement[] = [];
    actionGroups: ActionGroup[] = []

    constructor(payload: Partial<TXmlFile> = {}) {
        super();
        this.fill(payload);
    }

    get modInfoFilepath(){
        return `${this.filepath.slice(1)}${this.filename}`;
    }

    write(dist: string) {
        try {
            const data = toXML(this.content, {
                header: true,
                indent: '    '
            });
            console.log(`${dist}${this.filepath}${this.filename}`);
            fs.mkdir(`${dist}${this.filepath}`, { recursive: true }, (err) => {
                fs.writeFileSync(`${dist}${this.filepath}${this.filename}`, data + `\n<!-- generated with https://github.com/izica/civ7-modding-tool -->`);
            });
        } catch (err) {
            console.error(err);
        }
    }
}