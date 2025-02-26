import { BaseNode } from "./BaseNode";

type TTagNode = Pick<TagNode, "tag" | "category">;

export class TagNode extends BaseNode<TTagNode> {
    tag = 'TAG';
    category= 'CATEGORY';

    constructor(payload: Partial<TTagNode> = {}) {
        super();
        this.fill(payload);
    }
}