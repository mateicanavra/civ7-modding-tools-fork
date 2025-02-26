import * as fs from "node:fs";

import { TClassProperties } from "../types";
import { ImportFile } from "../files";
import { ACTION_GROUP_ACTION } from "../constants";

import { BaseBuilder } from "./BaseBuilder";

type TImportFileBuilder = TClassProperties<ImportFileBuilder>

export class ImportFileBuilder extends BaseBuilder<TImportFileBuilder> {
    content: string = '';
    name: string = '';

    constructor(payload: Partial<TImportFileBuilder> = {}) {
        super();
        this.fill(payload);
    }

    build() {
        if (!fs.existsSync(this.content)) {
            return [];
        }

        return [
            new ImportFile({
                name: this.name,
                content: this.content,
                actionGroups: [this.actionGroupBundle.shell, this.actionGroupBundle.always],
                actionGroupActions: [ACTION_GROUP_ACTION.IMPORT_FILES]
            }),
        ]
    }
}
