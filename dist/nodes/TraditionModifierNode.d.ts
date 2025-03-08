import { BaseNode } from "./BaseNode";
export type TTraditionModifierNode = Pick<TraditionModifierNode, "traditionType" | "modifierId">;
export declare class TraditionModifierNode extends BaseNode<TTraditionModifierNode> {
    traditionType: `TRADITION_${string}` | null;
    modifierId: string | null;
    constructor(payload?: Partial<TTraditionModifierNode>);
}
