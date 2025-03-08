import { BaseNode } from "./BaseNode";
export type TTagNode = Pick<TagNode, "tag" | "category">;
export declare class TagNode extends BaseNode<TTagNode> {
    tag: string | null;
    category: string | null;
    constructor(payload?: Partial<TTagNode>);
}
