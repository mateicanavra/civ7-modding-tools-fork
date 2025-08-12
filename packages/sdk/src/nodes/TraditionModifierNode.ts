import { BaseNode } from "./BaseNode";

export type TTraditionModifierNode = Pick<TraditionModifierNode,
    "traditionType" |
    "modifierId"
>;

export class TraditionModifierNode extends BaseNode<TTraditionModifierNode> {
    traditionType: `TRADITION_${string}` | null = 'TRADITION_';
    modifierId: string | null = 'Name';

    constructor(payload: Partial<TTraditionModifierNode> = {}) {
        super();
        this.fill(payload);
    }
}
