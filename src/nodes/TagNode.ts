import { BaseNode } from "./BaseNode";

export type TTagNode = Pick<TagNode,
    "tag" |
    "category"
>;

export class TagNode extends BaseNode<TTagNode> {
    tag: string | null = 'TAG';
    category: string | null = 'CATEGORY';

    constructor(payload: Partial<TTagNode> = {}) {
        super();
        this.fill(payload);
    }
}
