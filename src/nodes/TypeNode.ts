import { TObjectValues } from "../types";
import { KIND } from "../constants";

import { BaseNode } from "./BaseNode";

type TTypeNode = Pick<TypeNode, "type" | "kind">;

export class TypeNode extends BaseNode<TTypeNode> {
    type = 'TYPE';
    kind: TObjectValues<typeof KIND> = KIND.CONSTRUCTIBLE;

    constructor(payload: Partial<TTypeNode> = {}) {
        super();
        this.fill(payload);
    }
}