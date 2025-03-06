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
    uniqueQuarterType: `QUARTER_${string}` = 'QUARTER_';
    buildingType1 = '';
    buildingType2 = '';
    name = '';
    description = '';
    traitType: string | null = null;

    constructor(payload: Partial<TUniqueQuarterNode> = {}) {
        super();
        this.fill(payload);
    }
}
