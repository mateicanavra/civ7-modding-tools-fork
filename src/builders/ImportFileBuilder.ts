import * as fs from "node:fs";
import * as path from "node:path";

import { TClassProperties, TObjectValues } from "../types";
import { ImportFile } from "../files";
import { ACTION_GROUP_ACTION } from "../constants";

import { BaseBuilder } from "./BaseBuilder";
import { ActionGroupNode } from "../nodes";

type TImportFileBuilder = TClassProperties<ImportFileBuilder>

export class ImportFileBuilder extends BaseBuilder<TImportFileBuilder> {
    content: string = '';
    name: string = '';
    actionGroups: ActionGroupNode[] = [this.actionGroupBundle.shell, this.actionGroupBundle.always];
    actionGroupActions: TObjectValues<typeof ACTION_GROUP_ACTION>[] = [ACTION_GROUP_ACTION.IMPORT_FILES];

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
                name: this.name ? this.name : path.basename(this.content),
                content: this.content,
                actionGroups: this.actionGroups.length > 0 ? this.actionGroups : [this.actionGroupBundle.shell, this.actionGroupBundle.always],
                actionGroupActions: this.actionGroupActions.length > 0 ? this.actionGroupActions : [ACTION_GROUP_ACTION.IMPORT_FILES]
            }),
        ]
    }
}
