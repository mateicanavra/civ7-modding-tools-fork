import { TObjectValues } from "../types";
import { KIND } from "../constants";
import { BaseNode } from "./BaseNode";
export type TTypeNode = Pick<TypeNode, "type" | "kind">;
export declare class TypeNode extends BaseNode<TTypeNode> {
    type: string | null;
    kind: TObjectValues<typeof KIND> | null;
    constructor(payload?: Partial<TTypeNode>);
}
