import { BaseNode } from "./BaseNode";

export type TUniqueQuarterModifierNode = Pick<UniqueQuarterModifierNode,
    "uniqueQuarterType" |
    "modifierId"
>;

export class UniqueQuarterModifierNode extends BaseNode<TUniqueQuarterModifierNode> {
    uniqueQuarterType: `QUARTER_${string}` | null = 'QUARTER_';
    modifierId: string | null = null;

    constructor(payload: Partial<TUniqueQuarterModifierNode> = {}) {
        super();
        this.fill(payload);
    }
}
