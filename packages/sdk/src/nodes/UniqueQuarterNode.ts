import { BaseNode } from "./BaseNode";

export type TUniqueQuarterNode = Pick<UniqueQuarterNode,
    "uniqueQuarterType" |
    "buildingType1" |
    "buildingType2" |
    "name" |
    "description" |
    "traitType"
>;

export class UniqueQuarterNode extends BaseNode<TUniqueQuarterNode> {
    uniqueQuarterType: `QUARTER_${string}` | null = 'QUARTER_';
    buildingType1: string | null = null;
    buildingType2: string | null = null;
    name: string | null = null;
    description: string | null = null;
    traitType: string | null = null;

    constructor(payload: Partial<TUniqueQuarterNode> = {}) {
        super();
        this.fill(payload);
    }
}
