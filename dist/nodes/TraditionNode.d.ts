import { BaseNode } from "./BaseNode";
export type TTraditionNode = Pick<TraditionNode, "traditionType" | "name" | "description">;
export declare class TraditionNode extends BaseNode<TTraditionNode> {
    traditionType: `TRADITION_${string}` | null;
    name: string | null;
    description: string | null;
    isCrisis: boolean | null;
    constructor(payload?: Partial<TTraditionNode>);
}
