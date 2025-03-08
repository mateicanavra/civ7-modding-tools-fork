import { BaseNode } from "./BaseNode";
export type TCityNameNode = Pick<CityNameNode, "cityName" | "civilizationType">;
export declare class CityNameNode extends BaseNode<TCityNameNode> {
    civilizationType: string | null;
    cityName: string | null;
    constructor(payload?: Partial<TCityNameNode>);
}
