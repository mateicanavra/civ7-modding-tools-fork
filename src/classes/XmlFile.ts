import * as fs from 'node:fs';
import { toXML, XmlElement } from "jstoxml";

import { Criteria } from "./Criteria";
import { Base } from "./Base";

type TXmlFile = {
    filename: string;
    filepath: string;
    content: XmlElement | XmlElement[];
    criterias: Criteria[]
}

export class XmlFile extends Base<TXmlFile> implements TXmlFile {
    filepath: string = '/';
    filename: string = 'file.xml';
    content: XmlElement | XmlElement[] = [];
    criterias: Criteria[] = []

    constructor(payload: Partial<TXmlFile> = {}) {
        super();
        this.fill(payload);
    }

    write(dist: string) {
        try {
            const data = toXML(this.content, {
                header: true,
                indent: '    '
            });
            console.log(`${dist}${this.filepath}${this.filename}`, data)
            fs.mkdir(`${dist}${this.filepath}`, { recursive: true }, (err) => {
                fs.writeFileSync(`${dist}${this.filepath}${this.filename}`, data);
            });
        } catch (err) {
            console.error(err);
        }
    }
}