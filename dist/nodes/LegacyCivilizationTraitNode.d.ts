import { BaseNode } from "./BaseNode";
export type TLegacyCivilizationTraitNode = Pick<LegacyCivilizationTraitNode, "traitType" | "civilizationType">;
export declare class LegacyCivilizationTraitNode extends BaseNode<TLegacyCivilizationTraitNode> {
    traitType: string | null;
    civilizationType: string | null;
    constructor(payload?: Partial<TLegacyCivilizationTraitNode>);
}
