import { BaseNode } from "./BaseNode";
import { CriteriaNode } from "./CriteriaNode";
export type TActionGroupNode = Pick<ActionGroupNode, "id" | "scope" | "criteria">;
export declare class ActionGroupNode extends BaseNode<TActionGroupNode> {
    id: string;
    scope: "game" | "shell";
    criteria: CriteriaNode;
    constructor(payload?: Partial<TActionGroupNode>);
}
