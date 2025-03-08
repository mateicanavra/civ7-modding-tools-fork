import { BaseNode } from "./BaseNode";
export type TTraitNode = Pick<TraitNode, "traitType" | "name" | "description" | "internalOnly">;
export declare class TraitNode extends BaseNode<TTraitNode> {
    traitType: string | null;
    name: string | null;
    description: string | null;
    internalOnly: boolean | null;
    constructor(payload?: Partial<TTraitNode>);
}
