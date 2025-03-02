import { BaseNode } from "./BaseNode";

export type TTraitModifierNode = Pick<TraitModifierNode,
    "traitType" |
    "modifierId"
>;

export class TraitModifierNode extends BaseNode<TTraitModifierNode> {
    traitType = 'TRAIT_';
    modifierId = 'MOD_';

    constructor(payload: Partial<TTraitModifierNode> = {}) {
        super();
        this.fill(payload);
    }
}
