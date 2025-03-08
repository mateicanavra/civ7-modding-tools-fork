import { TClassProperties, TObjectValues } from "../types";
import { ImportFile } from "../files";
import { ACTION_GROUP_ACTION } from "../constants";
import { BaseBuilder } from "./BaseBuilder";
import { ActionGroupNode } from "../nodes";
type TImportFileBuilder = TClassProperties<ImportFileBuilder>;
export declare class ImportFileBuilder extends BaseBuilder<TImportFileBuilder> {
    content: string;
    name: string;
    actionGroups: ActionGroupNode[];
    actionGroupActions: TObjectValues<typeof ACTION_GROUP_ACTION>[];
    constructor(payload?: Partial<TImportFileBuilder>);
    build(): ImportFile[];
}
export {};
