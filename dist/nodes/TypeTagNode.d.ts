import { BaseNode } from "./BaseNode";
export type TTypeTagNode = Pick<TypeTagNode, "tag" | "type">;
export declare class TypeTagNode extends BaseNode<TTypeTagNode> {
    tag: string | null;
    type: string | null;
    constructor(payload?: Partial<TTypeTagNode>);
}
