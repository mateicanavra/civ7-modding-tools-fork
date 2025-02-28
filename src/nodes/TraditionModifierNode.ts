import { BaseNode } from "./BaseNode";

export type TTraditionModifierNode = Pick<TraditionModifierNode, "traditionType" | "modifierId">;

export class TraditionModifierNode extends BaseNode<TTraditionModifierNode> {
    traditionType: `TRADITION_${string}` = 'TRADITION_';
    modifierId= 'Name';

    constructor(payload: Partial<TTraditionModifierNode> = {}) {
        super();
        this.fill(payload);
    }
}
