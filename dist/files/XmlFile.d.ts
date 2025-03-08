import { XmlElement } from "jstoxml";
import { TClassProperties } from "../types";
import { BaseFile } from "./BaseFile";
type TXmlFile = TClassProperties<XmlFile>;
export declare class XmlFile extends BaseFile<XmlFile> implements TXmlFile {
    content: XmlElement | XmlElement[] | null | undefined;
    constructor(payload?: Partial<TXmlFile>);
    write(dist: string): void;
}
export {};
