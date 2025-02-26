import { BaseNode } from "./BaseNode";

type TTypeTagNode = Pick<TypeTagNode, "tag" | "type">;

export class TypeTagNode extends BaseNode<TTypeTagNode> {
    tag = 'TAG';
    type = 'TYPE';

    constructor(payload: Partial<TTypeTagNode> = {}) {
        super();
        this.fill(payload);
    }
}