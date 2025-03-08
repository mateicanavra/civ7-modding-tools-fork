import { TClassProperties } from "../types";
import { BaseFile } from "./BaseFile";
type TXmlFile = TClassProperties<ImportFile>;
export declare class ImportFile extends BaseFile<ImportFile> implements TXmlFile {
    path: string;
    content: string;
    constructor(payload?: Partial<TXmlFile>);
    write(dist: string): void;
}
export {};
