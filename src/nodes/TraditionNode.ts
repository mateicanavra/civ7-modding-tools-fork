import { BaseNode } from "./BaseNode";

export type TTraditionNode = Pick<TraditionNode, "traditionType" | "name" | "description">;

export class TraditionNode extends BaseNode<TTraditionNode> {
    traditionType: `TRADITION_${string}` = 'TRADITION_';
    name = 'Name';
    description = 'Description';
    isCrisis: boolean | null = null;

    constructor(payload: Partial<TTraditionNode> = {}) {
        super();
        this.fill(payload);
    }
}
