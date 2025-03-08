import { BaseNode } from "./BaseNode";

export type TCivilizationTraitNode = Pick<CivilizationTraitNode,
    "traitType" |
    "civilizationType"
>;

export class CivilizationTraitNode extends BaseNode<TCivilizationTraitNode> {
    traitType: string | null = 'TRAIT_';
    civilizationType: string | null = 'CIVILIZATION_';

    constructor(payload: Partial<TCivilizationTraitNode> = {}) {
        super();
        this.fill(payload);
    }
}
