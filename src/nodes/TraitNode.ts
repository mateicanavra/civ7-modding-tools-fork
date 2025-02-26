import { BaseNode } from "./BaseNode";

export type TTraitNode = Pick<TraitNode, "traitType" | "name" | "description" | "internalOnly">;

export class TraitNode extends BaseNode<TTraitNode> {
    traitType = 'TRAIT_';
    name = 'name';
    description = 'description';
    internalOnly: boolean | null = null;

    constructor(payload: Partial<TTraitNode> = {}) {
        super();
        this.fill(payload);
    }
}