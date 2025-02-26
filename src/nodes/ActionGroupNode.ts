import { randomUUID } from "node:crypto";

import { BaseNode } from "./BaseNode";
import { CriteriaNode } from "./CriteriaNode";

export type TActionGroupNode = Pick<ActionGroupNode, "id" | "scope" | "criteria">

export class ActionGroupNode extends BaseNode<TActionGroupNode> {
    id: string = randomUUID();
    scope: "game" | "shell" = 'game';
    criteria: CriteriaNode = new CriteriaNode();

    constructor(payload: Partial<TActionGroupNode> = {}) {
        super();
        this.fill(payload);
    }
}