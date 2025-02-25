import * as fs from 'node:fs';
import * as path from 'node:path';
import { toXML, XmlElement } from "jstoxml";

import { TClassProperties } from "../types";

import { File } from "./File";
import { Icon } from "./Icon";
import { ACTION_GROUP_ACTION } from "../constants";
import { ACTION_GROUP } from "../constants/ACTION_GROUP";

type TXmlFile = TClassProperties<FileImport>;

export class FileImport extends File<FileImport> implements TXmlFile {
    path = '/imports/';
    content = '';

    constructor(payload: Partial<TXmlFile> = {}) {
        super();
        this.fill(payload);
    }

    static from(item: Icon) {
        if(item instanceof Icon){
            return new FileImport({
                content: item.path,
                name: path.basename(item.path),
                actionGroupActions: [ACTION_GROUP_ACTION.IMPORT_FILES],
                actionGroups: [ACTION_GROUP.SHELL, ACTION_GROUP.GAME]
            });
        }
        return new FileImport();
    }

    write(dist: string) {
        if(!this.content){
            return;
        }

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