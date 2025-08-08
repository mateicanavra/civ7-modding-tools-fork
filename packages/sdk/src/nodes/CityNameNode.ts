import { BaseNode } from "./BaseNode";

export type TCityNameNode = Pick<CityNameNode,
    "cityName" |
    "civilizationType"
>;

export class CityNameNode extends BaseNode<TCityNameNode> {
    civilizationType: string | null = 'CIVILIZATION_';
    cityName: string | null = null;

    constructor(payload: Partial<TCityNameNode> = {}) {
        super();
        this.fill(payload);
    }
}
