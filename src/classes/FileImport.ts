import * as fs from 'node:fs';
import * as path from 'node:path';

import { ACTION_GROUP_ACTION, ACTION_GROUP } from "../constants";
import { TClassProperties } from "../types";

import { FileBase } from "./FileBase";
import { Icon } from "./Icon";

type TXmlFile = TClassProperties<FileImport>;

export class FileImport extends FileBase<FileImport> implements TXmlFile {
    path = '/imports/';
    content = '';

    constructor(payload: Partial<TXmlFile> = {}) {
        super();
        this.fill(payload);
    }

    static from(item: Icon) {
        if(item instanceof Icon && item.isExternal){
            return new FileImport({
                content: item.content,
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