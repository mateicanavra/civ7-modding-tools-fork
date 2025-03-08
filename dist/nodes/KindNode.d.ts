import { BaseNode } from "./BaseNode";
export type TKindNode = Pick<KindNode, "kind">;
export declare class KindNode extends BaseNode<TKindNode> {
    kind: `KIND_${string}` | null;
    constructor(payload?: Partial<TKindNode>);
}
