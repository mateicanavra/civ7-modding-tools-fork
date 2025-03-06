import { BaseNode } from "./BaseNode";

export type TUniqueQuarterModifierNode = Pick<UniqueQuarterModifierNode,
    "uniqueQuarterType" |
    "modifierId"
>;

export class UniqueQuarterModifierNode extends BaseNode<TUniqueQuarterModifierNode> {
    uniqueQuarterType: `QUARTER_${string}` = 'QUARTER_';
    modifierId = '';

    constructor(payload: Partial<TUniqueQuarterModifierNode> = {}) {
        super();
        this.fill(payload);
    }
}
