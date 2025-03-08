import { BaseNode } from "./BaseNode";
export type TUniqueQuarterNode = Pick<UniqueQuarterNode, "uniqueQuarterType" | "buildingType1" | "buildingType2" | "name" | "description" | "traitType">;
export declare class UniqueQuarterNode extends BaseNode<TUniqueQuarterNode> {
    uniqueQuarterType: `QUARTER_${string}` | null;
    buildingType1: string | null;
    buildingType2: string | null;
    name: string | null;
    description: string | null;
    traitType: string | null;
    constructor(payload?: Partial<TUniqueQuarterNode>);
}
