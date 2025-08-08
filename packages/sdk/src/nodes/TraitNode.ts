import { BaseNode } from "./BaseNode";

export type TTraitNode = Pick<TraitNode,
    "traitType" |
    "name" |
    "description" |
    "internalOnly"
>;

export class TraitNode extends BaseNode<TTraitNode> {
    traitType: string | null = 'TRAIT_';
    name: string | null = null;
    description: string | null = null;
    internalOnly: boolean | null = null;

    constructor(payload: Partial<TTraitNode> = {}) {
        super();
        this.fill(payload);
    }
}
