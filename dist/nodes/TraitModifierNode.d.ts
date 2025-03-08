import { BaseNode } from "./BaseNode";
export type TTraitModifierNode = Pick<TraitModifierNode, "traitType" | "modifierId">;
export declare class TraitModifierNode extends BaseNode<TTraitModifierNode> {
    traitType: string | null;
    modifierId: string | null;
    constructor(payload?: Partial<TTraitModifierNode>);
}
