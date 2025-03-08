import { TClassProperties } from "../types";
import { BaseBuilder } from "../builders";
import { BaseFile } from "../files";
type TMod = TClassProperties<Mod>;
export declare class Mod {
    id: string;
    name: string;
    version: string | number;
    description: string;
    authors: string;
    affectsSavedGames: boolean;
    private builders;
    private files;
    constructor(payload?: Partial<TMod>);
    fill: (this: any, payload?: Partial<TClassProperties<Mod>>) => any;
    /**
     * @description add/link builders to mod
     * @param data
     */
    add(data: BaseBuilder | BaseBuilder[]): this;
    addFiles(data: BaseFile | BaseFile[]): this;
    build(dist?: string, clear?: boolean): never[];
}
export {};
