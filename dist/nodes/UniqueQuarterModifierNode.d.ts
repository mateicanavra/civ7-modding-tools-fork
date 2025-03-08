import { BaseNode } from "./BaseNode";
export type TUniqueQuarterModifierNode = Pick<UniqueQuarterModifierNode, "uniqueQuarterType" | "modifierId">;
export declare class UniqueQuarterModifierNode extends BaseNode<TUniqueQuarterModifierNode> {
    uniqueQuarterType: `QUARTER_${string}` | null;
    modifierId: string | null;
    constructor(payload?: Partial<TUniqueQuarterModifierNode>);
}
