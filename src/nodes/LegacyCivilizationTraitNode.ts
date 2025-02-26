import { BaseNode } from "./BaseNode";

export type TLegacyCivilizationTraitNode = Pick<LegacyCivilizationTraitNode, "traitType" | "civilizationType">;

export class LegacyCivilizationTraitNode extends BaseNode<TLegacyCivilizationTraitNode> {
    traitType = 'TRAIT_';
    civilizationType = 'CIVILIZATION_';

    constructor(payload: Partial<TLegacyCivilizationTraitNode> = {}) {
        super();
        this.fill(payload);
    }
}